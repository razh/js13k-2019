import { boxGeom_create } from './boxGeom.js';
import { light_create } from './directionalLight.js';
import { material_create } from './material.js';
import { mesh_create } from './mesh.js';
import { object3d_add, object3d_create } from './object3d.js';
import { vec3_create, vec3_fromArray, vec3_set } from './vec3.js';

export var map0 = (gl, scene, camera) => {
  var fogColor = [0, 0, 0];
  gl.clearColor(...fogColor, 1);
  vec3_fromArray(scene.fogColor, fogColor);

  var map = object3d_create();
  object3d_add(scene, map);

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
  var boxMesh = mesh_create(boxGeom_create(8, 8, 8), material_create());
  vec3_set(boxMesh.position, 0, 4, -12);
  object3d_add(map, boxMesh);

  return {
    ambient,
    directional,
  };
};
