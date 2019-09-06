import {
  box3_copy,
  box3_create,
  box3_overlapsBox,
  box3_translate,
} from './box3.js';
import { physics_bodies } from './physics.js';
import {
  OVERCLIP,
  pm_clipVelocity,
  vec3_addScaledVector,
  vec3_create,
  vec3_dot,
  vec3_length,
  vec3_multiplyScalar,
  vec3_normalize,
  vec3_setScalar,
  vec3_Y,
} from './vec3.js';

// bg_public.h
// movement flags
var PMF_JUMP_HELD = 2;

// bg_local.h
var STEPSIZE = 18;

var JUMP_VELOCITY = 270;

// movement parameters
var pm_stopspeed = 100;

var pm_accelerate = 10;
var pm_airaccelerate = 1;

var pm_friction = 6;

var g_speed = 320;
var g_gravity = 800;

export var player_create = (object, body) => {
  return {
    object,
    body,

    scene: undefined,

    // player input
    command: {
      forward: 0,
      right: 0,
      up: 0,
      hook: 0,
    },

    // run-time variables
    dt: 0,
    gravity: g_gravity,
    speed: g_speed,
    viewForward: vec3_create(),
    viewRight: vec3_create(),

    // walk movement
    movementFlags: 0,
    walking: false,
    groundPlane: false,
    groundTrace: {
      normal: vec3_create(0, 1, 0),
    },
  };
};

export var player_update = player => {
  if (player.command.up < 10) {
    // not holding jump
    player.movementFlags &= ~PMF_JUMP_HELD;
  }

  player_checkGround(player);

  if (player.walking) {
    // walking on ground
    player_walkMove(player);
  } else {
    // airborne
    player_airMove(player);
  }

  player_checkGround(player);
};

var player_overlapsBodies = (() => {
  var boxA = box3_create();
  var boxB = box3_create();

  return (player, position, bodies) => {
    box3_translate(box3_copy(boxA, player.body.boundingBox), position);

    for (var i = 0; i < bodies.length; i++) {
      var body = bodies[i];
      box3_translate(box3_copy(boxB, body.boundingBox), body.parent.position);

      if (box3_overlapsBox(boxA, boxB)) {
        return true;
      }
    }

    return false;
  };
})();

var player_stepSlideMove = (() => {
  var start_o = vec3_create();
  var start_v = vec3_create();
  var down_o = vec3_create();
  var down_v = vec3_create();
  var up = vec3_create();
  var down = vec3_create();

  return player => {
    Object.assign(start_o, player.object.position);
    Object.assign(start_v, player.body.velocity);

    // TODO: Check if we're colliding with anything.
    // we got exactly where we wantd to go first try

    Object.assign(down, start_o);
    down.y -= STEPSIZE;
    // pm->trace (&trace, start_o, pm->mins, pm->maxs, down, pm->ps->clientNum, pm->tracemask);
    Object.assign(up, vec3_Y);
    // never step up when you have up velocity
    if (
      player.body.velocity.y > 0 &&
      (trace.fraction === 1 || vec3_dot(trace.plane.normal, up) < 0.7)
    ) {
      return;
    }

    Object.assign(up, start_o);
    up.y += STEPSIZE;

    // test the player position if they were a stepheight higher
    // pm->trace (&trace, start_o, pm->mins, pm->maxs, up, pm->ps->clientNum, pm->tracemask);
    if (trace.allsolid) {
      return;
    }
  };
})();

var player_checkJump = player => {
  if (player.command.up < 10) {
    // not holding jump
    return false;
  }

  if (player.movementFlags & PMF_JUMP_HELD) {
    player.command.up = 0;
    return false;
  }

  player.groundPlane = false;
  player.walking = false;
  player.movementFlags |= PMF_JUMP_HELD;

  player.body.velocity.y = JUMP_VELOCITY;

  return true;
};

var player_walkMove = (() => {
  var wishvel = vec3_create();
  var wishdir = vec3_create();

  return player => {
    if (player_checkJump(player)) {
      player_airMove(player);
      return;
    }

    player_friction(player);

    var fmove = player.command.forward;
    var smove = player.command.right;

    var scale = player_cmdScale(player);

    // project moves down to flat plane
    player.viewForward.y = 0;
    player.viewRight.y = 0;

    // project the forward and right directions onto the ground plane
    pm_clipVelocity(player.viewForward, player.groundTrace.normal, OVERCLIP);
    pm_clipVelocity(player.viewRight, player.groundTrace.normal, OVERCLIP);
    //
    vec3_normalize(player.viewForward);
    vec3_normalize(player.viewRight);

    vec3_setScalar(wishvel, 0);
    vec3_addScaledVector(wishvel, player.viewForward, fmove);
    vec3_addScaledVector(wishvel, player.viewRight, smove);

    Object.assign(wishdir, wishvel);
    var wishspeed = vec3_length(wishdir);
    vec3_normalize(wishdir);
    wishspeed *= scale;

    player_accelerate(player, wishdir, wishspeed, pm_accelerate);

    pm_clipVelocity(player.body.velocity, player.groundTrace.normal, OVERCLIP);

    // don't do anything if standing still
    if (!player.body.velocity.x && !player.body.velocity.z) {
      return;
    }
  };
})();

var player_airMove = (() => {
  var wishvel = vec3_create();
  var wishdir = vec3_create();

  return player => {
    player_friction(player);

    var fmove = player.command.forward;
    var smove = player.command.right;

    var scale = player_cmdScale(player);

    // project moves down to flat plane
    player.viewForward.y = 0;
    player.viewRight.y = 0;
    vec3_normalize(player.viewForward);
    vec3_normalize(player.viewRight);

    vec3_setScalar(wishvel, 0);
    vec3_addScaledVector(wishvel, player.viewForward, fmove);
    vec3_addScaledVector(wishvel, player.viewRight, smove);
    wishvel.y = 0;

    Object.assign(wishdir, wishvel);
    var wishspeed = vec3_length(wishdir);
    vec3_normalize(wishdir);
    wishspeed *= scale;

    // not on ground, so little effect on velocity
    player_accelerate(player, wishdir, wishspeed, pm_airaccelerate);

    // we may have a ground plane that is very steep, even
    // though we don't have a groundentity
    // slide along the steep plane
    if (player.groundPlane) {
      pm_clipVelocity(
        player.body.velocity,
        player.groundTrace.normal,
        OVERCLIP,
      );
    }

    player.body.velocity.y -= player.gravity * player.dt;
  };
})();

var player_friction = (() => {
  var vec = vec3_create();

  return player => {
    var vel = player.body.velocity;

    Object.assign(vec, vel);
    if (player.walking) {
      vec.y = 0; // ignore slope movement
    }

    var speed = vec3_length(vec);
    if (speed < 1) {
      vel.x = 0;
      vel.z = 0;
      return;
    }

    var drop = 0;

    // apply ground friction
    if (player.walking) {
      var control = speed < pm_stopspeed ? pm_stopspeed : speed;
      drop += control * pm_friction * player.dt;
    }

    // scale the velocity
    var newspeed = speed - drop;
    if (newspeed < 0) {
      newspeed = 0;
    }
    newspeed /= speed;

    vec3_multiplyScalar(vel, newspeed);
  };
})();

var player_cmdScale = player => {
  var max = Math.abs(player.command.forward);
  if (Math.abs(player.command.right) > max) {
    max = Math.abs(player.command.right);
  }

  if (Math.abs(player.command.up) > max) {
    max = Math.abs(player.command.up);
  }

  if (!max) {
    return 0;
  }

  var total = Math.sqrt(
    player.command.forward ** 2 +
      player.command.right ** 2 +
      player.command.up ** 2,
  );
  var scale = (player.speed * max) / (127 * total);

  return scale;
};

var player_accelerate = (player, wishdir, wishspeed, accel) => {
  var currentspeed = vec3_dot(player.body.velocity, wishdir);
  var addspeed = wishspeed - currentspeed;
  if (addspeed <= 0) {
    return;
  }
  var accelspeed = accel * player.dt * wishspeed;
  if (accelspeed > addspeed) {
    accelspeed = addspeed;
  }

  vec3_addScaledVector(player.body.velocity, wishdir, accelspeed);
};

var player_checkGround = (() => {
  var position = vec3_create();

  return player => {
    var bodies = physics_bodies(player.scene).filter(
      body => body !== player.body,
    );

    Object.assign(position, player.object.position);
    position.y -= 0.25;

    if (player_overlapsBodies(player, position, bodies)) {
      player.groundPlane = true;
      player.walking = true;
      return;
    }

    // If we do not overlap anything, we are in free fall.
    player.groundPlane = false;
    player.walking = false;
  };
})();
