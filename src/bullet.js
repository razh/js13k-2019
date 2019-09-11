import { boxGeom_create } from './boxGeom.js';
import { component_create, entity_add } from './entity.js';
import { material_create } from './material.js';
import { mesh_create } from './mesh.js';
import { object3d_remove } from './object3d.js';
import { BODY_DYNAMIC, physics_add } from './physics.js';

export var bullet_create = () => {
  var time = 0;

  var material = material_create();
  material.emissive.x = 1;

  return entity_add(
    physics_add(mesh_create(boxGeom_create(1, 1, 4), material), BODY_DYNAMIC),
    component_create({
      update(component, dt) {
        time += dt;
        if (time > 5 && component.parent.parent) {
          object3d_remove(component.parent.parent, component.parent);
        }
      },
    }),
  );
};