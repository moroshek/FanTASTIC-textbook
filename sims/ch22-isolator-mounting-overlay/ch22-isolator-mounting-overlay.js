// Isolator Mounting Methods - FP.Overlay (grid engine) on a FanPedia drawing
// CANVAS_HEIGHT: 824
// Explore: point at or select a numbered drawing to see what it shows (never scored). Quiz: 5
// prompts in a seeded shuffle, two attempts each, the first wrong answer shows a hint, a second
// wrong answer reveals the drawing; mastery is 4 of 5 on the first attempt.
// Drawing: FanPedia, Twin City Fan, p. 133 (Vibration Isolation: Overview and Mounting; directly
// under fan, isolation rails in RIS and spring versions, mounting angle, isolation base and
// isolation hangers), captions removed and the six drawings rearranged into two rows. Zones are
// percent of the image (x1, y1 = top left; x2, y2 = bottom right). Recalibrate with
// main.html?calibrate=1.

(function () {
  'use strict';

  var DATA = {
    id: 'ch22-isolator-mounting-overlay',
    title: 'Isolator Mounting Methods',
    engine: 'grid',
    image: '../../img/overlays/ch22-isolator-mounting-overlay.png',
    width: 1364,
    height: 830,
    alt: 'Six drawings of centrifugal fans set on green isolators in different ways: four standing on the floor in the top row, and in the bottom row one standing fan and one hung from rods',
    credit: 'Drawing: FanPedia, Twin City Fan, p. 133',
    mastery: 4,
    scoreNoun: 'Drawings',
    zones: [
      {
        id: 'direct', label: 'Directly under the fan',
        x1: 0.7, y1: 3.1, x2: 31.7, y2: 45.3,
        summary: 'Isolators mounted under the foundation holes in the fan structure.',
        facts: ['Springs, RIS or neoprene pads.', 'Usually limited to impellers 36.5 in in diameter or less.', 'Exception: swingout housed centrifugal fans of any impeller size, with flat pads only.'],
        hint: 'Top left: the green pads touch the fan\'s own frame.',
        prompt: 'Which drawing has nothing between the fan\'s own foundation holes and its isolators?'
      },
      {
        id: 'rails', label: 'Isolation rails',
        x1: 34.5, y1: 2.2, x2: 68.8, y2: 36.0,
        summary: 'Isolators between two flat bars: the top bar bolted to the fan\'s foundation holes, the bottom bar to the floor.',
        facts: ['Springs or RIS.', 'Shown in two versions: RIS pads and springs.'],
        hint: 'Top middle pair: look for purple bars running along both sides.',
        prompt: 'Which drawings put the isolators between two flat bars?'
      },
      {
        id: 'angle', label: 'Mounting angle',
        x1: 71.1, y1: 1.0, x2: 99.3, y2: 47.7,
        summary: 'An angle mounted between the fan and its isolators.',
        facts: ['Usually used when the fan inlet does not have a structural support.', 'Springs or RIS.'],
        hint: 'Top right: a purple member runs along under the inlet side.',
        prompt: 'Which drawing adds a member because the fan\'s inlet side has no structural support?'
      },
      {
        id: 'base', label: 'Isolation base',
        x1: 15.4, y1: 50.8, x2: 44.3, y2: 98.7,
        summary: 'The fan, possibly the motor and other components, on a structural base with isolators under the base\'s mounting brackets.',
        facts: ['Springs, RIS or pads (p. 133).', 'The base-type page (p. 131) says an isolation base requires spring or RIS isolators, so use pads only where the factory confirms them.'],
        hint: 'Bottom left: the fan and the motor share one purple frame.',
        prompt: 'Which drawing carries the fan and its motor on one frame set on isolators?'
      },
      {
        id: 'hangers', label: 'Isolation hangers',
        x1: 53.5, y1: 54.7, x2: 76.8, y2: 92.3,
        summary: 'The fan suspended from an overhead structure with isolators between the structure and the fan.',
        facts: ['Spring or RIS hangers.', 'The threaded rod is supplied by others.'],
        hint: 'Bottom right: look up for the green rods.',
        prompt: 'Which drawing suspends the fan from structure overhead?'
      }
    ]
  };

  FP.Overlay.mount({ root: '#overlay', data: DATA });
})();
