/* global c, h, o, r, s */

import './audio.js';

import { boxGeom_create } from './boxGeom.js';
import { align } from './boxTransforms.js';
import { light_create } from './directionalLight.js';
import { component_create, entity_add } from './entity.js';
import { keys_create } from './keys.js';
import { material_create } from './material.js';
import { mesh_create } from './mesh.js';
import {
  object3d_add,
  object3d_create,
  object3d_translateZ,
} from './object3d.js';
import {
  BODY_DYNAMIC,
  BODY_STATIC,
  get_physics_component,
  physics_add,
  physics_bodies,
  physics_update,
} from './physics.js';
import { player_create, player_update } from './player.js';
import { quat_slerp } from './quat.js';
import { ray_create, ray_intersectObjects } from './ray.js';
import { reflector_create } from './reflector.js';
import { shadowMesh_create } from './shadowMesh.js';
import { turret_create } from './turret.js';
import {
  vec3_applyQuaternion,
  vec3_create,
  vec3_cross,
  vec3_fromArray,
  vec3_lerp,
  vec3_normalize,
  vec3_set,
} from './vec3.js';

var _object = object3d_create();
var isMouseDown = false;

var DEBUG = false;

var keys = keys_create();

export var map0 = (gl, scene, camera) => {
  var fogColor = [0, 0, 0];
  gl.clearColor(...fogColor, 1);
  vec3_fromArray(scene.fogColor, fogColor);

  var map = object3d_create();
  object3d_add(scene, map);

  // Lights
  var ambient = vec3_create(0.2, 0.2, 0.2);

  var light0 = light_create(vec3_create(0.6, 0.5, 1.3));
  light0.intensity = 3;
  vec3_set(light0.position, 512, 1024, 256);

  var directional = [light0];
  directional.map(light => object3d_add(map, light));

  // Camera
  var cameraObject = object3d_create();
  object3d_add(cameraObject, camera);
  object3d_add(map, cameraObject);

  // Action
  var playerMesh = physics_add(
    mesh_create(boxGeom_create(30, 56, 30), material_create()),
    BODY_DYNAMIC,
  );
  playerMesh.position.y += 28;
  playerMesh.visible = false;
  Object.assign(cameraObject.position, playerMesh.position);
  object3d_add(map, playerMesh);

  var playerPhysics = get_physics_component(playerMesh);
  playerPhysics.update = () => {};
  var player = player_create(playerMesh, playerPhysics);
  player.scene = map;

  var alignTop = align('py');

  var createGround = ([dimensions, position, transform = alignTop]) => {
    var mesh = physics_add(
      mesh_create(transform(boxGeom_create(...dimensions)), material_create()),
      BODY_STATIC,
    );
    vec3_set(mesh.position, ...position);
    vec3_set(mesh.material.color, 0.5, 0.5, 0.5);
    object3d_add(map, mesh);
  };

  // Ground
  [
    [[128, 16, 1536], [0, 0, -640]],
    [[512, 16, 256], [-64, 0, -1280], align('px_py')],
    [[256, 16, 256], [-192, 0, -1408], align('px_py_pz')],

    // Arena
    [[2048, 64, 2048], [-192, 0, -1408], align('px_py_pz')],
  ].map(createGround);

  var createShadow = mesh => {
    var shadowMesh = shadowMesh_create(mesh);
    shadowMesh.position.y = 0.1;
    shadowMesh.light = light0;
    mesh.shadow = shadowMesh;
  };

  var alignBottom = align('ny');

  var createBlock = ([dimensions, position, transform = alignBottom]) => {
    var mesh = physics_add(
      mesh_create(transform(boxGeom_create(...dimensions)), material_create()),
      BODY_STATIC,
    );
    vec3_set(mesh.position, ...position);
    createShadow(mesh);
    object3d_add(map, mesh);
  };

  // Blocks
  [
    // Buildings
    // Pillars
    [[256, 1024, 256], [192, 0, -512]],
    [[256, 1024, 256], [-256, 0, -480]],
    [[256, 1024, 256], [-256, 0, 0]],
    [[256, 1024, 256], [-1152, 0, -1576]],

    // Walls
    [[128, 64, 128], [0, 0, -284]],
    [[96, 64, 160], [-208, 0, -172]],

    // Intro walls
    [[16, 128, 1280], [-64, 0, -512]],
    [[16, 128, 1536], [64, 0, -640]],
    [[128, 128, 16], [0, 0, 128]],

    [[256, 128, 16], [64, 0, -1400], align('px_ny')],
    [[512, 128, 16], [-56, 0, -1148], align('px_ny')],

    // Stairs
    [[16, 128, 256], [-192, 0, -1392], align('px_ny_pz')],
    [[16, 128, 256], [-560, 0, -1120], align('px_ny_pz')],

    // Stair block
    [[16, 128, 256], [-560, 0, -1120], align('px_ny_pz')],
    [[128, 64, 256], [-200, 0, -1720], align('px_ny_pz')],

    // Arena
    [[128, 64, 256], [-760, 0, -1600], align('px_ny_pz')],
    [[256, 64, 384], [-320, 0, -1792], align('px_ny_pz')],
    [[512, 32, 64], [-386, 128, -1728], align('px_ny_pz')],
    [[512, 128, 64], [-920, 0, -2240], align('px_ny_pz')],
    [[256, 32, 256], [-1240, 0, -2400], align('px_ny_pz')],
  ].map(createBlock);

  // Stairs
  var createStairs = ([[width, height, depth], [x, y, z], count, dz]) => {
    for (var i = 0; i < count; i++) {
      var stepY = (i + 1) * height;
      var mesh = physics_add(
        mesh_create(boxGeom_create(width, stepY, depth), material_create()),
        BODY_STATIC,
      );
      vec3_set(mesh.position, x, y + stepY / 2, dz * i * depth + z);
      createShadow(mesh);
      object3d_add(map, mesh);
    }
  };

  [
    [[128, 8, 16], [0, 0, -100], 8, -1],
    // [[128, 8, 16], [-208, 80, -244], 8, 1],
    [[128, 8, 16], [-264, 0, -1600], 8, -1],
    [[128, 8, 16], [-824, 0, -1484], 8, -1],
    [[128, 8, 16], [-450, 64, -1976], 12, 1],
  ].map(createStairs);

  var createTurret = position => {
    var turret = turret_create(player);
    vec3_set(turret.position, ...position);
    createShadow(turret);
    object3d_add(map, turret);
  };

  // [[-50, 0, -50], [160, 80, -320]].map(createTurret);
  [
    [0, 0, -768],
    [-280, 64, -1720],
    [-800, 64, -1640],
    [-1000, 0, -1920],
    [-860, 160, -1760],
    [-1320, 32, -2500],
  ].map(createTurret);

  var reflector = reflector_create();
  vec3_set(reflector.position, 0, 512, -512);
  object3d_add(map, reflector);

  var health = 100;
  var shieldEnergy = 100;

  playerPhysics.collide = bullet => {
    if (bullet.alive) {
      health -= 2;
      bullet.alive = false;

      if (health <= 0) {
        o.hidden = false;
        document.exitPointerLock();
      }
    }
  };

  if (DEBUG) {
    c.addEventListener('click', () => {
      var bodies = physics_bodies(map).filter(body => body !== player.body);
      var ray = ray_create();
      Object.assign(ray.origin, playerMesh.position);
      vec3_set(ray.direction, 0, 0, -1);
      vec3_applyQuaternion(ray.direction, camera.quaternion);
      var intersections = ray_intersectObjects(
        ray,
        bodies.map(body => body.parent).filter(object => object !== playerMesh),
      );
      if (intersections.length) {
        console.log(intersections[0].point);
      }
    });
  }

  entity_add(
    map,
    component_create((component, dt) => {
      if (health <= 0) {
        return;
      }

      var bodies = physics_bodies(map);
      physics_update(bodies);

      player.dt = dt;

      player.command.forward = 0;
      player.command.right = 0;
      player.command.up = 0;

      if (keys.KeyW || keys.ArrowUp) player.command.forward++;
      if (keys.KeyS || keys.ArrowDown) player.command.forward--;
      if (keys.KeyA || keys.ArrowLeft) player.command.right--;
      if (keys.KeyD || keys.ArrowRight) player.command.right++;
      if (keys.Space) player.command.up++;

      var movespeed = 127;
      player.command.forward *= movespeed;
      player.command.right *= movespeed;
      player.command.up *= movespeed;

      vec3_applyQuaternion(
        vec3_set(player.viewForward, 0, 0, -1),
        camera.quaternion,
      );
      vec3_normalize(
        vec3_cross(vec3_set(player.viewRight, 0, -1, 0), player.viewForward),
      );

      player_update(player);
      player.time = performance.now();

      // CG_EntityEvent
      var STEP_TIME = 200;
      if (player.dy) {
        var oldStep;
        var MAX_STEP_CHANGE = 32;
        // check for stepping up before a previous step is complete
        var delta = player.time - player.stepTime;
        if (delta < STEP_TIME) {
          oldStep = (player.stepChange * (STEP_TIME - delta)) / STEP_TIME;
        } else {
          oldStep = 0;
        }
        // add this amount
        player.stepChange = Math.min(oldStep + player.dy, MAX_STEP_CHANGE);
        player.stepTime = player.time;
        player.dy = 0;
      }
      Object.assign(cameraObject.position, playerMesh.position);

      // CG_StepOffset
      // smooth out stair climbing
      var timeDelta = player.time - player.stepTime;
      if (!Number.isNaN(timeDelta) && timeDelta < STEP_TIME) {
        cameraObject.position.y -=
          (player.stepChange * (STEP_TIME - timeDelta)) / STEP_TIME;
      }

      h.style.setProperty('--h', `${health}%`);
      s.style.setProperty('--h', `${shieldEnergy}%`);

      // reflector behavior
      if (isMouseDown && shieldEnergy > 0 && playerMesh.position.z < -256) {
        shieldEnergy = Math.max(shieldEnergy - 50 * dt, 0);
        Object.assign(_object.position, player.object.position);
        Object.assign(_object.quaternion, camera.quaternion);
        object3d_translateZ(_object, -48);
        var stiffness = 16;
        vec3_lerp(reflector.position, _object.position, stiffness * dt);
        quat_slerp(reflector.quaternion, _object.quaternion, stiffness * dt);
      } else {
        shieldEnergy = Math.min(shieldEnergy + 10 * dt, 100);
      }

      health = Math.min(health + 1 * dt, 100);
    }),
  );

  return {
    ambient,
    directional,
  };
};

c.addEventListener('mousedown', () => (isMouseDown = true));
c.addEventListener('mouseup', () => (isMouseDown = false));
r.addEventListener('click', () => window.location.reload());
