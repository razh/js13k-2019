import { boxGeom_create } from './boxGeom.js';
import { $setX, $setY } from './boxTransforms.js';
import { clone, geom_create, merge, translate } from './geom.js';
import { material_create } from './material.js';
import { mesh_create } from './mesh.js';
import { BODY_STATIC, physics_add } from './physics.js';
import { compose } from './utils.js';
import { vec3_setScalar } from './vec3.js';

export var reflector_create = () => {
  var size = 48;
  var segmentWidth = 4;
  var depth = 1;
  var gap = 8;
  var physicalDepth = 8;

  var segmentLength = (size - segmentWidth) / 2;
  var segmentY = (segmentLength + gap) / 2;
  var gapX = gap / 2;
  var gapY = size / 2 - segmentWidth;

  var segmentGeometry = boxGeom_create(segmentWidth, segmentLength, depth);

  var material = material_create();
  vec3_setScalar(material.emissive, 1);

  var reflector = physics_add(
    mesh_create(boxGeom_create(size, size, physicalDepth), material),
    BODY_STATIC,
  );

  reflector.geometry = compose(
    // Top-left
    merge(
      compose(
        clone(),
        translate(-segmentLength, segmentY, 0),
        $setX({ nx_py: -gapX, px_py: -gapX }),
        $setY({ px_py: gapY }),
      )(segmentGeometry),
    ),

    // Top-right
    merge(
      compose(
        clone(),
        translate(segmentLength, segmentY, 0),
        $setX({ nx_py: gapX, px_py: gapX }),
        $setY({ nx_py: gapY }),
      )(segmentGeometry),
    ),

    // Bottom-right
    merge(
      compose(
        clone(),
        translate(segmentLength, -segmentY, 0),
        $setX({ nx_ny: gapX, px_ny: gapX }),
        $setY({ nx_ny: -gapY }),
      )(segmentGeometry),
    ),

    // Bottom-left
    merge(
      compose(
        clone(),
        translate(-segmentLength, -segmentY, 0),
        $setX({ nx_ny: -gapX, px_ny: -gapX }),
        $setY({ px_ny: -gapY }),
      )(segmentGeometry),
    ),
  )(geom_create());

  return reflector;
};
