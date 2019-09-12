/* global c */

import { boxGeom_create } from './boxGeom.js';
import { light_create } from './directionalLight.js';
import { component_create, entity_add } from './entity.js';
import { keys_create } from './keys.js';
import { material_create } from './material.js';
import { mesh_create } from './mesh.js';
import { object3d_add, object3d_create } from './object3d.js';
import {
  BODY_DYNAMIC,
  BODY_STATIC,
  get_physics_component,
  physics_add,
  physics_bodies,
  physics_update,
} from './physics.js';
import { player_create, player_update } from './player.js';
import { ray_create, ray_intersectObjects } from './ray.js';
import { shadowMesh_create } from './shadowMesh.js';
import { turret_create } from './turret.js';
import {
  vec3_applyQuaternion,
  vec3_create,
  vec3_cross,
  vec3_fromArray,
  vec3_normalize,
  vec3_set,
} from './vec3.js';

export var map0 = (gl, scene, camera) => {
  var fogColor = [0, 0, 0];
  gl.clearColor(...fogColor, 1);
  vec3_fromArray(scene.fogColor, fogColor);

  var map = object3d_create();
  object3d_add(scene, map);

  var keys = keys_create();

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

  var groundMesh = physics_add(
    mesh_create(boxGeom_create(2048, 64, 2048), material_create()),
    BODY_STATIC,
  );
  vec3_set(groundMesh.material.color, 0.5, 0.5, 0.5);
  groundMesh.position.y -= 32;
  object3d_add(map, groundMesh);

  var createShadow = mesh => {
    var shadowMesh = shadowMesh_create(mesh);
    shadowMesh.position.y = 0.1;
    shadowMesh.light = light0;
    mesh.shadow = shadowMesh;
  };

  var createBlock = ([dimensions, position]) => {
    var mesh = physics_add(
      mesh_create(boxGeom_create(...dimensions), material_create()),
      BODY_STATIC,
    );
    vec3_set(mesh.position, ...position);
    createShadow(mesh);
    object3d_add(map, mesh);
  };

  // Pillars
  [
    [[128, 1024, 128], [256, 512, -512]],
    [[128, 1024, 128], [-256, 512, -512]],
    [[128, 1024, 128], [256, 512, 0]],
    [[128, 1024, 128], [-256, 512, 0]],
  ].map(createBlock);

  // Stairs
  var createStairs = ([width, height, depth], [x, y, z], count, dz) => {
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

  createStairs([96, 8, 16], [0, 0, -100], 10, -1);
  createStairs([96, 8, 16], [-208, 80, -244], 10, 1);

  [
    [[512, 80, 128], [0, 80 - 40, -100 + 8 - 160 - 64]],
    [[96, 80, 160], [-208, 80 - 40, -172]],
  ].map(createBlock);

  var turret = turret_create(player);
  turret.position.z -= 50;
  createShadow(turret);
  object3d_add(map, turret);

  var turret2 = turret_create(player);
  vec3_set(turret2.position, 160, 80, -320);
  createShadow(turret2);
  object3d_add(map, turret2);

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

  entity_add(
    map,
    component_create({
      update(component, dt) {
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
      },
    }),
  );

  return {
    ambient,
    directional,
  };
};
