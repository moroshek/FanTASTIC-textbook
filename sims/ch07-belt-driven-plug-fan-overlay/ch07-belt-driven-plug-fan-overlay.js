// Belt Driven Plug Fan Parts - FP.Overlay (callout engine) on a FanPedia drawing
// CANVAS_HEIGHT: 636
// Explore: point at or select a numbered marker to see the part (never scored). Quiz: 10
// prompts in a seeded shuffle, two attempts each, the first wrong answer shows a hint, a second
// wrong answer reveals the part; mastery is 8 of 10 on the first attempt.
// Drawing: FanPedia, Twin City Fan, p. 14 (Exploded Views: Plug Fans, 'Belt Driven Plug Fans',
// Arr. 9P fan), labels and the 'Arr. 9P Fan' tag removed. Positions are % of the image;
// (x, y) is the point on the part, (mx, my) where the numbered marker sits. Recalibrate with
// main.html?calibrate=1.

(function () {
  'use strict';

  var DATA = {
    id: 'ch07-belt-driven-plug-fan-overlay',
    title: 'Belt Driven Plug Fan Parts',
    engine: 'callout',
    layout: 'side-panel',
    image: '../../img/overlays/ch07-belt-driven-plug-fan-overlay.png',
    width: 1272,
    height: 796,
    alt: 'Exploded view of an Arrangement 9P plug fan, with its drive parts laid out to the left of the fan',
    credit: 'Drawing: FanPedia, Twin City Fan, p. 14',
    mastery: 8,
    parts: [
      {
        id: 'impeller', label: 'Impeller', x: 90, y: 22,
        description: 'Hangs inside the plenum, on the process side of the wall.',
        hint: 'Wheel with blades, upper right.',
        prompt: 'Select the part that hangs inside the plenum.'
      },
      {
        id: 'insulation-plug', label: 'Insulation plug', x: 80, y: 41,
        description: 'An insulated section mounted with the panel that fills the opening in the plenum wall around the fan, so the wall keeps its insulating value.',
        hint: 'Box-shaped section behind the flat plate.',
        prompt: 'Select the insulated section that fills the wall opening.'
      },
      {
        id: 'mounting-panel', label: 'Mounting panel', x: 67, y: 12,
        description: 'The flat plate that fastens the fan to the customer\'s wall; the impeller is inside the plenum and the shaft, bearings and motor stay outside.',
        hint: 'Large flat plate with a row of bolt holes along its edge.',
        prompt: 'Select the plate that fastens the fan to the customer\'s wall.'
      },
      {
        id: 'pedestal', label: 'Pedestal', x: 52, y: 60,
        description: 'On the grade-mounted versions the fan stands on the foundation on a pedestal.',
        hint: 'Sloped support box below the flat plate.',
        prompt: 'Select the support that stands on the foundation.'
      },
      {
        id: 'motor-slide-base', label: 'Motor slide base', x: 64.5, y: 62,
        description: 'The motor bolts to it and slides to tension the belts.',
        hint: 'Plate with four long slots on the face of the sloped support box.',
        prompt: 'Select the slotted plate the motor slides on to tension the belts.'
      },
      {
        id: 'motor', label: 'Motor', x: 34, y: 80,
        description: 'Stays outside the process airstream on a plug fan.',
        hint: 'Blue finned machine, lower middle.',
        prompt: 'Select the machine that turns the fan through the drive, outside the airstream.'
      },
      {
        id: 'belt', label: 'Belt', x: 8.3, y: 80,
        description: 'V-belts run in the sheave grooves between the motor and the fan shaft.',
        hint: 'Long dark loop between the two grooved wheels, lower left.',
        prompt: 'Select the loop that carries the drive from the motor to the fan shaft.'
      },
      {
        id: 'sheave', label: 'Sheave', x: 4, y: 53, mx: 4, my: 40,
        description: 'A grooved wheel on a shaft; the ratio of the two sheaves sets fan speed.',
        hint: 'Small grooved wheel at the top end of the dark loop.',
        prompt: 'Select a grooved wheel whose size ratio sets the fan speed.'
      },
      {
        id: 'bearings', label: 'Bearings', x: 18, y: 53.5, mx: 17, my: 36,
        description: 'Support and locate the shaft outside the process airstream.',
        hint: 'Two small blue blocks on the long rod.',
        prompt: 'Select the parts that support and locate the shaft outside the airstream.'
      },
      {
        id: 'shaft', label: 'Shaft', x: 40, y: 40, mx: 37, my: 27,
        description: 'Carries the impeller through the mounting panel.',
        hint: 'Long thin rod running through the two blue blocks.',
        prompt: 'Select the rod that carries the impeller through the mounting panel.'
      }
    ]
  };

  FP.Overlay.mount({ root: '#overlay', data: DATA });
})();
