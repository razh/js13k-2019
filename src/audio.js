import { randFloatSpread } from './math.js';
import { sample } from './utils.js';

var AudioContext = window.AudioContext || window.webkitAudioContext;
var OfflineAudioContext =
  window.OfflineAudioContext || window.webkitOfflineAudioContext;

var audioContext = new AudioContext();
var { sampleRate } = audioContext;

// A4 is 69.
var toFreq = note => 2 ** ((note - 69) / 12) * 440;

var playSound = (sound, destination = audioContext.destination) => {
  var source = audioContext.createBufferSource();
  source.buffer = sound;
  source.connect(destination);
  source.start();
};

var generateAudioBuffer = (fn, duration, volume) => {
  var length = duration * sampleRate;

  var buffer = audioContext.createBuffer(1, length, sampleRate);
  var channel = buffer.getChannelData(0);
  for (var i = 0; i < length; i++) {
    channel[i] = fn(i / sampleRate, i, channel) * volume;
  }

  return buffer;
};

var noteNames = [
  'c',
  'cs',
  'd',
  'ds',
  'e',
  'f',
  'fs',
  'g',
  'gs',
  'a',
  'as',
  'b',
];

var noteStringRegex = /(\w+)(\d+)/;

var noteStringToFreq = noteString => {
  var match = noteString.match(noteStringRegex);
  if (match) {
    var [, name, octave] = match;
    return 12 * (Number(octave) + 1) + noteNames.indexOf(name);
  }
};

var generateNotes = (fn, duration, volume) => {
  return new Proxy(
    {},
    {
      get(target, property) {
        if (!target[property]) {
          var sound = generateAudioBuffer(
            fn(toFreq(noteStringToFreq(property))),
            duration,
            volume,
          );
          target[property] = sound;
        }

        return target[property];
      },
    },
  );
};

var wet = audioContext.createGain();
wet.gain.value = 0.3;
wet.connect(audioContext.destination);

var dry = audioContext.createGain();
dry.gain.value = 1 - wet.gain.value;
dry.connect(audioContext.destination);

var convolver = audioContext.createConvolver();
convolver.connect(wet);

var master = audioContext.createGain();
master.gain.value = 0.8;
master.connect(dry);
master.connect(convolver);

var impulseResponse = (t, i, a) => {
  return (2 * Math.random() - 1) * Math.pow(a.length, -i / a.length);
};

var impulseResponseBuffer = generateAudioBuffer(impulseResponse, 3, 1);

// Cheap hack for reverb.
var renderLowPassOffline = convolver => {
  var offlineCtx = new OfflineAudioContext(
    1,
    impulseResponseBuffer.length,
    sampleRate,
  );

  var offlineBufferSource = offlineCtx.createBufferSource();
  offlineBufferSource.buffer = impulseResponseBuffer;
  offlineBufferSource.connect(offlineCtx.destination);
  offlineBufferSource.start();

  var render = offlineCtx.startRendering();

  // https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext/startRendering
  if (render !== undefined) {
    // Promises.
    render.then(buffer => (convolver.buffer = buffer));
  } else {
    // Callbacks.
    offlineCtx.oncomplete = event => (convolver.buffer = event.renderedBuffer);
  }
};

// A4 to A3 for four seconds.
renderLowPassOffline(convolver);

// Oscillators
// f: frequency, t: parameter.
var sin = f => t => Math.sin(t * 2 * Math.PI * f);

var saw = f => t => {
  var n = ((t % (1 / f)) * f) % 1;
  return -1 + 2 * n;
};

var tri = f => t => {
  var n = ((t % (1 / f)) * f) % 1;
  return n < 0.5 ? -1 + 2 * (2 * n) : 1 - 2 * (2 * n);
};

var square = f => t => {
  var n = ((t % (1 / f)) * f) % 1;
  return n > 0.5 ? 1 : -1;
};

var decay = d => () => t => Math.exp(-t * d);

// Brown noise.
// https://github.com/Tonejs/Tone.js/blob/master/Tone/source/Noise.js
var noise = () => {
  var lastOut = 0;

  return () => {
    var white = randFloatSpread(1);
    var value = (lastOut + 0.02 * white) / 1.02;
    lastOut = value;
    return value * 3.5;
  };
};

// Operators
var add = (a, b) => f => {
  var af = a(f);
  var bf = b(f);

  return t => af(t) + bf(t);
};

var mul = (a, b) => f => {
  var af = a(f);
  var bf = b(f);

  return t => af(t) * bf(t);
};

var zero = () => () => 0;
var one = () => () => 1;

var scale = (fn, n) => f => {
  var fnf = fn(f);
  return t => n * fnf(t);
};

var steps = (f, d) => f * 2 ** (d / 12);

var detune = (fn, d) => f => fn(steps(f, d));

// Sequencer
var d = ms => new Promise(resolve => setTimeout(resolve, ms));

var W = 1;
var H = W / 2;
var Q = H / 2;
var E = Q / 2;
var S = E / 2;
var T = S / 2;

// Waveforms.
var explosion = mul(add(scale(saw, 0.1), scale(noise, 1)), decay(16));

var explosionNotes = generateNotes(explosion, Q, 1);

var play = sound => playSound(sound, master);

var startPlaying = async () => {
  audioContext.resume();
};

export var fire = () =>
  play(sample([explosionNotes.f2, explosionNotes.gs2, explosionNotes.a2]));

var onClick = () => {
  audioContext.resume();
  startPlaying();
  document.removeEventListener('click', onClick);
};

document.addEventListener('click', onClick);
