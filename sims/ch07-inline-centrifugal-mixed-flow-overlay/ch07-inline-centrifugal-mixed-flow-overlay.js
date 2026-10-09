// Inline Centrifugal and Mixed Flow Fan Parts - FP.Overlay (callout engine) on a FanPedia drawing
// CANVAS_HEIGHT: 884
// Explore: point at or select a numbered marker to see the part (never scored). Quiz: 12
// prompts in a seeded shuffle, two attempts each, the first wrong answer shows a hint, a second
// wrong answer reveals the part; mastery is 10 of 12 on the first attempt.
// Drawing: FanPedia, Twin City Fan, p. 17 (Exploded Views: Inline Centrifugal & Mixed Flow
// Fans; direct drive inline centrifugal on the left, belt driven mixed flow on the right),
// labels removed. Positions are % of the image; (x, y) is the point on the part, (mx, my)
// where the numbered marker sits. Recalibrate with main.html?calibrate=1.

(function () {
  'use strict';

  var DATA = {
    id: 'ch07-inline-centrifugal-mixed-flow-overlay',
    title: 'Inline Centrifugal and Mixed Flow Fan Parts',
    engine: 'callout',
    layout: 'dual-panel',
    image: '../../img/overlays/ch07-inline-centrifugal-mixed-flow-overlay.png',
    width: 1440,
    height: 904,
    alt: 'Exploded and assembled views of two inline fans built in round tubes: a direct drive inline centrifugal fan on the left and a belt driven mixed flow fan on the right',
    credit: 'Drawing: FanPedia, Twin City Fan, p. 17',
    mastery: 10,
    parts: [
      {
        id: 'housing', label: 'Tubular housing', x: 11.5, y: 36,
        description: 'Inline centrifugal, mixed flow and axial fans use a tubular housing: a round, straight-through cylinder that holds the impeller in line with the duct.',
        hint: 'Plain cylinder, upper left.',
        prompt: 'Select the round, straight-through shell that holds the impeller in line with the duct.'
      },
      {
        id: 'straightening-vanes', label: 'Straightening vanes', x: 23.4, y: 19.5,
        description: 'Fixed vanes inside a tubular housing, downstream of the impeller, that take the swirl out of the air and turn it back into straight-through flow.',
        hint: 'Fixed blades inside the open end of the plain cylinder, upper left.',
        prompt: 'Select the fixed vanes that turn the air back into straight-through flow.'
      },
      {
        id: 'shaft', label: 'Shaft', x: 18, y: 28, mx: 15, my: 4,
        description: 'Carries the impeller in the tube.',
        hint: 'Short rod end sticking out of the hub, upper left.',
        prompt: 'Select the rod that carries the impeller in the tube.'
      },
      {
        id: 'centrifugal-impeller', label: 'Impeller (inline centrifugal)', x: 32, y: 22,
        description: 'A centrifugal wheel that throws air radially; the straightening vanes then turn it back along the tube.',
        hint: 'Bladed wheel with a flat back plate, between the cylinder and the flared ring, upper left.',
        prompt: 'Select the wheel that throws the air outward.'
      },
      {
        id: 'inlet-funnel', label: 'Inlet funnel', x: 36, y: 45,
        description: 'Feeds the air smoothly into the impeller at the inlet end of the tube.',
        hint: 'Large flared ring at the front of the upper-left stack.',
        prompt: 'Select the bell-mouth ring at the inlet.'
      },
      {
        id: 'motor', label: 'Motor', x: 27.5, y: 81,
        description: 'On the direct drive fan the motor sits inside the tube with the impeller on its shaft.',
        hint: 'Blue machine inside the tube, lower left.',
        prompt: 'Select the machine that drives the impeller from inside the tube.'
      },
      {
        id: 'mixed-flow-impeller', label: 'Impeller (mixed flow)', x: 70.4, y: 27.5,
        description: 'A mixed flow impeller\'s airfoil blades taper from the front plate to the hub end.',
        hint: 'Ring-fronted wheel between the flared ring and the tube, upper right.',
        prompt: 'Select the wheel whose blades taper from the front plate to the hub end.'
      },
      {
        id: 'bearing-housing', label: 'Bearing housing', x: 82, y: 36,
        description: 'Holds the fan shaft bearings inside the tube on a belt driven inline fan.',
        hint: 'Round hub at the centre of the tube, upper right.',
        prompt: 'Select the part at the centre of the tube that holds the fan shaft bearings.'
      },
      {
        id: 'belt-guard', label: 'Belt guard', x: 79.5, y: 60,
        description: 'Encloses the belts and sheaves.',
        hint: 'Yellow cover beside the motor, lower right.',
        prompt: 'Select the part that encloses the belts and sheaves outside the tube.'
      },
      {
        id: 'belt-tube', label: 'Belt tube', x: 80, y: 68.5, mx: 94, my: 64,
        description: 'An enclosed passage through the side of a belt driven tubular housing that shields the belts and sheaves from the moving air.',
        hint: 'Sheet-metal channel inside the tube, around the dark grooved wheel, lower right.',
        prompt: 'Select the passage that shields the belts from the airstream.'
      },
      {
        id: 'sheave', label: 'Sheave', x: 77.6, y: 76.4, mx: 75, my: 95,
        description: 'The fan sheave on the shaft inside the belt tube.',
        hint: 'Dark grooved wheel inside the side passage, lower right.',
        prompt: 'Select the grooved wheel the belts turn on the fan shaft.'
      },
      {
        id: 'discharge-cone', label: 'Discharge cone', x: 86, y: 76,
        description: 'A tapered section at the outlet end of the tubular housing that guides the air leaving the impeller and vanes toward the outlet connection.',
        hint: 'Large rounded piece standing off the right end of the lower-right fan.',
        prompt: 'Select the tapered section at the outlet end.'
      }
    ]
  };

  FP.Overlay.mount({ root: '#overlay', data: DATA });
})();
