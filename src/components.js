import { component_create } from './entity.js';

export var intervalComponent_create = (duration, callback) => {
  var time = 0;

  return component_create((component, dt) => {
    time += dt;

    if (time > duration) {
      callback();
      time -= duration;
    }
  });
};
