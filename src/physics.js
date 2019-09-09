import {
  box3_copy,
  box3_create,
  box3_overlapsBox,
  box3_setFromObject,
  box3_translate,
} from './box3.js';
import {
  component_create,
  entity_add,
  entity_filter,
  entity_find,
} from './entity.js';
import { object3d_traverse } from './object3d.js';
import {
  OVERCLIP,
  pm_clipVelocity,
  vec3_add,
  vec3_addScaledVector,
  vec3_create,
  vec3_multiplyScalar,
  vec3_normalize,
  vec3_set,
  vec3_sub,
  vec3_subVectors,
} from './vec3.js';

export var BODY_STATIC = 1;
export var BODY_DYNAMIC = 2;

export var physics_create = (entity, physics) => {
  return component_create({
    physics,
    boundingBox: box3_setFromObject(box3_create(), entity),
    velocity: vec3_create(),
    update(component, dt) {
      vec3_addScaledVector(component.parent.position, component.velocity, dt);
    },
  });
};

export var physics_add = (entity, physics) => {
  return entity_add(entity, physics_create(entity, physics));
};

export var get_physics_component = entity => {
  return entity_find(entity, is_physics_component);
};

export var is_physics_component = object => object.physics;

export var physics_bodies = object => {
  var bodies = [];

  object3d_traverse(object, node => {
    bodies.push(...entity_filter(node, is_physics_component));
  });

  return bodies;
};

var narrowPhase = (() => {
  var penetration = vec3_create();

  return (bodyA, bodyB, boxA, boxB) => {
    // Determine overlap.
    // d0 is negative side or 'left' side.
    // d1 is positive or 'right' side.
    var d0x = boxB.max.x - boxA.min.x;
    var d1x = boxA.max.x - boxB.min.x;

    var d0y = boxB.max.y - boxA.min.y;
    var d1y = boxA.max.y - boxB.min.y;

    var d0z = boxB.max.z - boxA.min.z;
    var d1z = boxA.max.z - boxB.min.z;

    // Only overlapping on an axis if both ranges intersect.
    var dx = 0;
    if (d0x > 0 && d1x > 0) {
      dx = d0x < d1x ? d0x : -d1x;
    }

    var dy = 0;
    if (d0y > 0 && d1y > 0) {
      dy = d0y < d1y ? d0y : -d1y;
    }

    var dz = 0;
    if (d0z > 0 && d1z > 0) {
      dz = d0z < d1z ? d0z : -d1z;
    }

    // Determine minimum axis of separation.
    var adx = Math.abs(dx);
    var ady = Math.abs(dy);
    var adz = Math.abs(dz);

    if (adx < ady && adx < adz) {
      vec3_set(penetration, dx, 0, 0);
    } else if (ady < adz) {
      vec3_set(penetration, 0, dy, 0);
    } else {
      vec3_set(penetration, 0, 0, dz);
    }

    var objectA = bodyA.parent;
    var objectB = bodyB.parent;

    if (bodyA.physics === BODY_STATIC) {
      if (bodyA.stairs && dy > 0 && dy < 18) {
        vec3_set(penetration, 0, dy, 0);
        if (dy > 2) {
          window.pdy = dy;
        }
      }
      vec3_addScaledVector(objectB.position, penetration, -OVERCLIP);
      pm_clipVelocity(bodyB.velocity, vec3_normalize(penetration), OVERCLIP);
    } else if (bodyB.physics === BODY_STATIC) {
      if (bodyB.stairs && dy > 0 && dy < 18) {
        vec3_set(penetration, 0, dy, 0);
        if (dy > 2) {
          window.pdy = dy;
        }
      }
      vec3_addScaledVector(objectA.position, penetration, OVERCLIP);
      pm_clipVelocity(bodyA.velocity, vec3_normalize(penetration), OVERCLIP);
    } else {
      vec3_multiplyScalar(penetration, 0.5);
      vec3_add(objectA.position, penetration);
      vec3_sub(objectB.position, penetration);
    }
  };
})();

export var sweptAABB = (() => {
  var velocity = vec3_create();

  return (bodyA, bodyB, boxA, boxB) => {
    if (box3_overlapsBox(boxA, boxB)) {
      return 0;
    }

    vec3_subVectors(velocity, bodyB.velocity, bodyA.velocity);
    var vx = velocity.x;
    var vy = velocity.y;
    var vz = velocity.z;

    // d0 is negative side or 'left' side.
    // d1 is positive or 'right' side.
    var d0x = boxB.max.x - boxA.min.x;
    var d1x = boxA.max.x - boxB.min.x;

    var d0y = boxB.max.y - boxA.min.y;
    var d1y = boxA.max.y - boxB.min.y;

    var d0z = boxB.max.z - boxA.min.z;
    var d1z = boxA.max.z - boxB.min.z;

    var t0 = 0;
    var t1 = Infinity;

    if (vx < 0) {
      if (d0x < 0) return;
      if (d0x > 0) t1 = Math.min(-d0x / vx, t1);
      if (d1x < 0) t0 = Math.max(d1x / vx, t0);
    } else if (vx > 0) {
      if (d1x < 0) return;
      if (d1x > 0) t1 = Math.min(d1x / vx, t1);
      if (d0x < 0) t0 = Math.max(-d0x / vx, t0);
    }

    if (t0 > t1) return;

    if (vy < 0) {
      if (d0y < 0) return;
      if (d0y > 0) t1 = Math.min(-d0y / vy, t1);
      if (d1y < 0) t0 = Math.max(d1y / vx, t0);
    } else if (vy > 0) {
      if (d1y < 0) return;
      if (d1y > 0) t1 = Math.min(d1y / vy, t1);
      if (d0y < 0) t0 = Math.max(-d0y / vy, t0);
    }

    if (t0 > t1) return;

    if (vz < 0) {
      if (d0z < 0) return;
      if (d0z > 0) t1 = Math.min(-d0z / vz, t1);
      if (d1z < 0) t0 = Math.max(d1z / vx, t0);
    } else if (vz > 0) {
      if (d1z < 0) return;
      if (d1z > 0) t1 = Math.min(d1z / vz, t1);
      if (d0z < 0) t0 = Math.max(-d0z / vz, t0);
    }

    if (t0 > t1) return;

    return t0;
  };
})();

var physics_setBoxFromBody = (box, body) => {
  return box3_translate(box3_copy(box, body.boundingBox), body.parent.position);
};

export var physics_update = (() => {
  var boxA = box3_create();
  var boxB = box3_create();

  return bodies => {
    var contacts = [];

    for (var i = 0; i < bodies.length; i++) {
      var bodyA = bodies[i];

      for (var j = i + 1; j < bodies.length; j++) {
        var bodyB = bodies[j];

        // Immovable objects.
        if (bodyA.physics === BODY_STATIC && bodyB.physics === BODY_STATIC) {
          return;
        }

        // Two dynamic bodies, or one static and one dynamic body.
        physics_setBoxFromBody(boxA, bodyA);
        physics_setBoxFromBody(boxB, bodyB);

        if (box3_overlapsBox(boxA, boxB)) {
          var contact = narrowPhase(bodyA, bodyB, boxA, boxB);
          if (contact) {
            contacts.push(contact);
          }
        }
      }
    }

    return contacts;
  };
})();
