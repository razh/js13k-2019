import { remove } from './utils';

var Listeners = new WeakMap();

export var on = (object, type, listener) => {
  if (!Listeners.get(object)) {
    Listeners.set(object, {});
  }
  var listeners = Listeners.get(object);
  if (!listeners[type]) {
    listeners[type] = [];
  }
  listeners[type].push(listener);
  return object;
};

export var off = (object, type, listener) => {
  var listeners = Listeners.get(object);
  if (listeners && listeners[type]) {
    remove(listeners[type], listener);
  }
  return object;
};

export var trigger = (object, event) => {
  var listeners = Listeners.get(object);
  if (listeners && listeners[event.type]) {
    event.target = object;
    listeners[event.type].map(listener => listener(event));
  }
  return object;
};
