import { boxGeom_create } from './boxGeom.js';
import { $scale, align } from './boxTransforms.js';
import { bullet_create } from './bullet.js';
import { intervalComponent_create } from './components.js';
import { entity_add } from './entity.js';
import { material_create } from './material.js';
import { mesh_create } from './mesh.js';
import {
  object3d_add,
  object3d_lookAt,
  object3d_translateX,
  object3d_translateZ,
} from './object3d.js';
import {
  BODY_STATIC,
  get_physics_component,
  physics_add,
  physics_bodies,
} from './physics.js';
import { ray_create, ray_intersectObjects } from './ray.js';
import { is_reflector } from './reflector.js';
import { compose } from './utils.js';
import {
  vec3_applyQuaternion,
  vec3_setLength,
  vec3_subVectors,
  vec3_Z,
} from './vec3.js';

export var turret_create = player => {
  var turretSize = 24;
  var bulletCount = 0;
  var bulletY = 18;

  var geometry = compose(
    align('ny'),
    $scale({ py: [0.75, 1, 0.75] }),
  )(boxGeom_create(turretSize, turretSize, turretSize));

  var turret = entity_add(
    physics_add(mesh_create(geometry, material_create()), BODY_STATIC),
    intervalComponent_create(0.1, () => {
      var ray = ray_create();
      Object.assign(ray.origin, turret.position);
      ray.origin.y += bulletY;
      vec3_subVectors(ray.direction, player.object.position, turret.position);

      var intersections = ray_intersectObjects(
        ray,
        physics_bodies(player.scene)
          .filter(
            body =>
              body.parent !== turret &&
              !is_reflector(body.parent) &&
              (body === player.body || body.physics === BODY_STATIC),
          )
          .map(body => body.parent),
      );

      if (!intersections.length || intersections[0].object !== player.object) {
        return;
      }

      var bullet = bullet_create(turret);
      Object.assign(bullet.position, turret.position);
      bullet.position.y += bulletY;
      object3d_lookAt(bullet, player.object.position);
      vec3_setLength(
        vec3_applyQuaternion(
          Object.assign(get_physics_component(bullet).velocity, vec3_Z),
          bullet.quaternion,
        ),
        800,
      );
      object3d_translateX(
        bullet,
        (bulletCount % 2 ? -1 : 1) * (turretSize / 2),
      );
      object3d_translateZ(bullet, -Math.SQRT2 * turretSize);
      object3d_add(player.scene, bullet);
      bulletCount = (bulletCount + 1) % 2;
    }),
  );

  return turret;
};
