// Vaneaxial Fan Parts - FP.Overlay (callout engine) on a FanPedia drawing
// CANVAS_HEIGHT: 990
// Explore: point at or select a numbered marker to see the part (never scored). Quiz: 11
// prompts in a seeded shuffle, two attempts each, the first wrong answer shows a hint, a second
// wrong answer reveals the part; mastery is 9 of 11 on the first attempt.
// Drawing: FanPedia, Twin City Fan, p. 16 (Exploded Views: Axial Fans, direct drive vaneaxial
// fans on the left, belt driven vaneaxial fans on the right), labels removed. Positions are % of
// the image; (x, y) is the point on the part, (mx, my) where the numbered marker sits.
// Recalibrate with main.html?calibrate=1.

(function () {
  'use strict';

  var DATA = {
    id: 'ch04-vaneaxial-fan-overlay',
    title: 'Vaneaxial Fan Parts',
    engine: 'callout',
    layout: 'dual-panel',
    image: '../../img/overlays/ch04-vaneaxial-fan-overlay.png',
    width: 1200,
    height: 972,
    alt: 'Four views of vaneaxial fans: two direct drive fans on the left and two belt driven fans on the right, the upper pair pulled apart to show the inside',
    credit: 'Drawing: FanPedia, Twin City Fan, p. 16',
    mastery: 9,
    parts: [
      {
        id: 'housing', label: 'Tubular housing', x: 10, y: 20,
        description: 'A round, straight-through cylinder that holds the impeller and lets air enter one end and leave the other, in line with the duct.',
        hint: 'Plain cylinder, upper left.',
        prompt: 'Select the straight-through cylinder that holds the impeller.'
      },
      {
        id: 'guide-vanes', label: 'Guide vanes', x: 27, y: 14,
        description: 'Fixed, curved blades in the housing downstream of an axial impeller that turn the swirling air to flow straight along the duct.',
        hint: 'Fixed curved blades inside the rim of the tube.',
        prompt: 'Select the fixed blades that take the swirl out of the air.'
      },
      {
        id: 'shaft', label: 'Shaft', x: 21.6, y: 21, mx: 20, my: 3.5,
        description: 'Carries the impeller on the axis of the tube.',
        hint: 'Short rod end in the centre of the vane hub, upper left.',
        prompt: 'Select the rod the impeller mounts on.'
      },
      {
        id: 'impeller', label: 'Impeller', x: 38, y: 24,
        description: 'Blades attached to a central hub that push air along the axis of rotation.',
        hint: 'Propeller-like blades around a large hub.',
        prompt: 'Select the propeller-like part that pushes the air.'
      },
      {
        id: 'motor', label: 'Motor', x: 28, y: 69,
        description: 'On a direct drive axial fan the motor sits inside the tube, in the airstream, with the impeller on its shaft.',
        hint: 'Blue finned machine inside the tube, lower left.',
        prompt: 'Select the machine that turns the impeller from inside the airstream.'
      },
      {
        id: 'motor-support', label: 'Motor support', x: 28, y: 80,
        description: 'Holds a direct drive motor inside the tubular housing.',
        hint: 'Bracket under the blue machine inside the tube, lower left.',
        prompt: 'Select the part that holds the motor inside the tube.'
      },
      {
        id: 'motor-base', label: 'Motor base', x: 74.2, y: 16,
        description: 'On a belt driven tubular fan the motor sits outside the tube on a motor base.',
        hint: 'Adjustable frame on top of the tube, upper right.',
        prompt: 'Select the frame that carries the motor outside the tube.'
      },
      {
        id: 'access-door', label: 'Impeller access door', x: 84, y: 35,
        description: 'A door in the tubular housing that lets a technician look at or reach the impeller with the fan locked out.',
        hint: 'Small rectangular panel on the side of the tube.',
        prompt: 'Select the opening a technician uses to look at the impeller.'
      },
      {
        id: 'sheave', label: 'Sheave', x: 69.2, y: 63, mx: 76, my: 58.5,
        description: 'A grooved wheel on the motor shaft; belts run from it to a sheave on the fan shaft.',
        hint: 'Small dark wheel beside the blue machine on top of the lower right fan, where the belt starts.',
        prompt: 'Select the grooved wheel on the motor shaft.'
      },
      {
        id: 'belt-tube', label: 'Belt tube', x: 71, y: 75,
        description: 'Also called a belt fairing: it shelters the belt as it passes through the airstream to the shaft.',
        hint: 'Enclosed passage crossing the inside of the tube.',
        prompt: 'Select the passage that shelters the belt in the airstream.'
      },
      {
        id: 'bearing-housing', label: 'Bearing housing', x: 72, y: 85,
        description: 'Holds the fan shaft bearings in the middle of the tube on a belt driven axial fan.',
        hint: 'Round hub at the centre of the lower right tube, behind the belt.',
        prompt: 'Select the part that holds the fan shaft bearings.'
      }
    ]
  };

  FP.Overlay.mount({ root: '#overlay', data: DATA });
})();
