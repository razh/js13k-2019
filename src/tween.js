import { ease_linear } from './easings.js';

export var tween_create = (options = {}) => {
  var { delay = 0, duration = 0, ease = ease_linear } = options;

  return {
    duration,
    delay,
    ease,
  };
};
