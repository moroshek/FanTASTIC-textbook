// Industrial Grade Dampers - FP.Overlay (grid engine) on a FanPedia drawing
// CANVAS_HEIGHT: 794
// Explore: point at or select a numbered drawing to see what it shows (never scored). Quiz: 5
// prompts in a seeded shuffle, two attempts each, the first wrong answer shows a hint, a second
// wrong answer reveals the drawing; mastery is 4 of 5 on the first attempt.
// Drawing: FanPedia, Twin City Fan, p. 137 (Dampers: Industrial Grade: parallel and opposed
// blade outlet dampers with their Type 1 / Type 2 blade insets, the inlet box damper, the manual
// outlet damper and the outlet damper with actuator), captions and blade tags removed, bottom
// row moved up. Zones are percent of the image (x1, y1 = top left; x2, y2 = bottom right).
// Recalibrate with main.html?calibrate=1.

(function () {
  'use strict';

  var DATA = {
    id: 'ch18-industrial-damper-overlay',
    title: 'Industrial Grade Dampers',
    engine: 'grid',
    image: '../../img/overlays/ch18-industrial-damper-overlay.png',
    width: 1448,
    height: 784,
    alt: 'Five FanPedia drawings of industrial dampers on centrifugal fans: two louvered dampers on fan outlets with close-ups of their blades at the left, a fan fed from above through a set of green blades at the top right, and two fans with green blades on their outlets at the bottom right',
    credit: 'Drawing: FanPedia, Twin City Fan, p. 137',
    mastery: 4,
    scoreNoun: 'Drawings',
    zones: [
      {
        id: 'parallel', label: 'Parallel blade outlet damper',
        x1: 0.3, y1: 6.2, x2: 44.6, y2: 39.9,
        summary: 'All blades rotate in the same direction and stay parallel.',
        facts: ['Recommended for modulation from full open to about 75% open.', 'Type 1 flat blades or Type 2 airfoil blades (insets).', 'Available to 750°F construction.'],
        hint: 'Top row, left: a louvered damper on a fan outlet, with two close-ups of its blades.',
        prompt: 'Which damper\'s blades all turn the same way?'
      },
      {
        id: 'opposed', label: 'Opposed blade outlet damper',
        x1: 0.3, y1: 65.0, x2: 44.7, y2: 97.9,
        summary: 'Neighbouring blades rotate in opposite directions.',
        facts: ['Recommended where volume is modulated over the entire range.', 'Costs about 10% more than parallel blade.', 'Type 1 flat or Type 2 airfoil blades.'],
        hint: 'Bottom row, left: a louvered damper on a fan outlet, with two close-ups of its blades.',
        prompt: 'Which damper suits modulation over the entire range?'
      },
      {
        id: 'inlet-box', label: 'Parallel blade inlet box damper',
        x1: 48.4, y1: 0.6, x2: 77.0, y2: 52.7,
        summary: 'A parallel blade damper in an inlet box that pre-spins the air in the direction of impeller rotation.',
        facts: ['Type 2 (airfoil) only.', 'Saves horsepower at reduced loads.', 'Requires an inlet box.'],
        hint: 'Top row, right: follow the red arrows down through the green blades and into the fan.',
        prompt: 'Which damper pre-spins the air before the impeller?'
      },
      {
        id: 'manual', label: 'Manual outlet damper',
        x1: 49.5, y1: 55.4, x2: 74.2, y2: 99.0,
        summary: 'Positioned by hand with a handle or quadrant.',
        facts: ['Typically used to balance a system.', 'Parallel or opposed blades.'],
        hint: 'Bottom row, middle: green blades on the fan outlet with only a linkage at the side.',
        prompt: 'Which damper is set by hand to balance a system?'
      },
      {
        id: 'actuator', label: 'Outlet damper with actuator',
        x1: 74.8, y1: 54.3, x2: 99.7, y2: 99.4,
        summary: 'An actuator drives the blades.',
        facts: ['Lets a control system position the blades.', 'Pairs with a control loop for continuous modulation.'],
        hint: 'Bottom row, far right: look for the orange unit beside the green blades.',
        prompt: 'Which damper can a control loop position?'
      }
    ]
  };

  FP.Overlay.mount({ root: '#overlay', data: DATA });
})();
