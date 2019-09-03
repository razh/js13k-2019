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
  var ambient = vec3_create(0.5, 0.5, 0.5);

  var light0 = light_create(vec3_create(1, 1, 1));
  vec3_set(light0.position, 128, 48, 0);

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

  var player = player_create(playerMesh, get_physics_component(playerMesh));
  player.scene = map;

  var groundMesh = physics_add(
    mesh_create(boxGeom_create(512, 64, 512), material_create()),
    BODY_STATIC,
  );
  groundMesh.position.y -= 32;
  object3d_add(map, groundMesh);

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
        Object.assign(cameraObject.position, playerMesh.position);
      },
    }),
  );

  return {
    ambient,
    directional,
  };
};
