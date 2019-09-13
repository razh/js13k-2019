import { boxGeom_create } from './boxGeom.js';
import { component_create, entity_add } from './entity.js';
import { explosion_create } from './explosion.js';
import { material_create } from './material.js';
import { mesh_create } from './mesh.js';
import { object3d_add, object3d_lookAt, object3d_remove } from './object3d.js';
import { BODY_BULLET, get_physics_component, physics_add } from './physics.js';
import {
  vec3_create,
  vec3_dot,
  vec3_negate,
  vec3_reflect,
  vec3_setScalar,
} from './vec3.js';

var _vector = vec3_create();

export var bullet_create = () => {
  var bulletLifeTime = 4;
  var time = 0;

  var material = material_create();
  material.emissive.x = 1;

  var collided = false;

  var body;
  var bullet = entity_add(
    physics_add(mesh_create(boxGeom_create(1, 1, 4), material), BODY_BULLET),
    component_create((component, dt) => {
      // Look in direction of velocity
      Object.assign(_vector, bullet.position);
      vec3_setScalar(bullet.position, 0);
      object3d_lookAt(bullet, body.velocity);
      Object.assign(bullet.position, _vector);

      time += dt;
      if (time > bulletLifeTime) {
        object3d_remove(bullet.parent, bullet);
        return;
      }

      if (collided) {
        object3d_remove(bullet.parent, bullet);
        var explosion = explosion_create(4);
        object3d_add(bullet.parent, explosion);
        Object.assign(explosion.position, bullet.position);
        return;
      }
    }),
  );

  bullet.alive = true;
  bullet.reflected = false;

  body = get_physics_component(bullet);
  body.collide = object => {
    if (!bullet.alive) {
      return false;
    }

    // Don't hurt turrets unless the bullet has been reflected.
    if (object.iT && !bullet.reflected) {
      return false;
    }

    if (object.iR) {
      bullet.reflected = true;
      material.emissive.y = 1;
      Object.assign(_vector, object.normal);
      if (vec3_dot(body.velocity, _vector) < 0) vec3_negate(_vector);
      vec3_reflect(body.velocity, _vector);
      return false;
    }

    collided = true;
  };

  return bullet;
};
