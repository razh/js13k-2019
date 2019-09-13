import { boxGeom_create } from './boxGeom.js';
import { component_create, entity_add } from './entity.js';
import { material_create } from './material.js';
import { randFloat, randFloatSpread } from './math.js';
import { mesh_create } from './mesh.js';
import { object3d_add, object3d_create, object3d_remove } from './object3d.js';
import { sample } from './utils.js';
import {
  vec3_addScaledVector,
  vec3_clone,
  vec3_create,
  vec3_fromArray,
  vec3_length,
  vec3_multiplyScalar,
  vec3_set,
  vec3_setLength,
  vec3_setScalar,
} from './vec3.js';

var EPSILON = 1e-2;

var gravity = vec3_create(0, -800, 0);
var geometry = boxGeom_create(1, 1, 2);

var materials = [[1, 0.5, 0.2], [1, 1, 0.8], [1, 1, 1]].map(color => {
  var material = material_create();
  vec3_fromArray(material.color, color);
  vec3_fromArray(material.emissive, color);
  return material;
});

export var explosion_create = count => {
  var explosion = object3d_create();

  var decay = 4;
  var velocities = [];

  var i = count;
  while (i--) {
    var sprite = mesh_create(geometry, sample(materials));
    vec3_setScalar(sprite.scale, randFloat(1, 8));

    vec3_set(
      sprite.position,
      randFloatSpread(1),
      randFloatSpread(1),
      randFloatSpread(1),
    );

    object3d_add(explosion, sprite);
    var velocity = vec3_setLength(
      vec3_clone(sprite.position),
      randFloat(64, 128),
    );
    velocities.push(velocity);
  }

  explosion = entity_add(
    explosion,
    component_create((component, dt) => {
      var drag = Math.exp(-decay * dt);
      var visibleCount = 0;

      explosion.children.map((sprite, index) => {
        vec3_addScaledVector(
          sprite.position,
          vec3_addScaledVector(velocities[index], gravity, dt),
          dt,
        );
        vec3_multiplyScalar(sprite.scale, drag);

        if (vec3_length(sprite.scale) > EPSILON) {
          visibleCount++;
        }
      });

      if (!visibleCount) {
        object3d_remove(explosion.parent, explosion);
      }
    }),
  );

  return explosion;
};
