// Induction Motor Parts - FP.Overlay (callout engine) on a FanPedia drawing
// CANVAS_HEIGHT: 683
// Explore: point at or select a numbered marker to see the part (never scored). Quiz: 10
// prompts in a seeded shuffle, two attempts each, the first wrong answer shows a hint, a second
// wrong answer reveals the part; mastery is 8 of 10 on the first attempt.
// Drawing: FanPedia, Twin City Fan, p. 69 (Motors: 'Typical Electric Induction Motor
// Components', exploded view of a TEFC motor), labels removed. Positions are % of the image;
// (x, y) is the point on the part, (mx, my) where the numbered marker sits. Recalibrate with
// main.html?calibrate=1.

(function () {
  'use strict';

  var DATA = {
    id: 'ch03-induction-motor-overlay',
    title: 'Induction Motor Parts',
    engine: 'callout',
    layout: 'top-bottom',
    image: '../../img/overlays/ch03-induction-motor-overlay.png',
    width: 1300,
    height: 538,
    alt: 'Exploded view of an electric induction motor, with its pieces pulled apart from left to right',
    credit: 'Drawing: FanPedia, Twin City Fan, p. 69',
    mastery: 8,
    parts: [
      {
        id: 'fan-cover', label: 'Fan cover', x: 9, y: 25,
        description: 'On a TEFC motor the external fan pulls air in through the fan cover and blows it over the outside of the motor (Chapter 14).',
        hint: 'Blue dome with a grille of triangular holes, far left.',
        prompt: 'Select the grille the cooling air enters through on a TEFC motor.'
      },
      {
        id: 'external-fan', label: 'External fan', x: 17, y: 48,
        description: 'On a TEFC motor, a fan on the back of the motor shaft that blows air over the outside surface of the motor only (Chapter 14).',
        hint: 'Dark bladed wheel just right of the grille.',
        prompt: 'Select the part that blows cooling air over the outside of the frame.'
      },
      {
        id: 'endplate-rear', label: 'Endplates', x: 25, y: 21,
        description: 'The covers at each end of the frame. The motor bearings support the rotor at each end, inside the endplates; the second one is the blue disk at the far right.',
        hint: 'Dark disk with a central hub, between the bladed wheel and the ribbed body (its twin is the blue disk at the far right).',
        prompt: 'Select the part that holds a motor bearing at the end of the frame.'
      },
      {
        id: 'nameplate', label: 'Nameplate', x: 44, y: 30,
        description: 'Identifies the manufacturer, serial number and ratings of the motor.',
        hint: 'Silver sheet with printed rows, on top of the ribbed body.',
        prompt: 'Select the part that identifies the motor\'s manufacturer, serial number and ratings.'
      },
      {
        id: 'conduit-box', label: 'Conduit box', x: 34, y: 59,
        description: 'Where the power wiring connects to the motor, usually in position F1 or F2.',
        hint: 'Square lidded enclosure on the side of the ribbed body.',
        prompt: 'Select where the power wiring connects.'
      },
      {
        id: 'frame', label: 'Frame', x: 47, y: 82,
        description: 'The motor body that holds the stator; its feet bolt to a base. Ribs on a TEFC frame give the cooling air more surface.',
        hint: 'Ribbed blue body with mounting feet.',
        prompt: 'Select the motor body that carries the feet.'
      },
      {
        id: 'stator', label: 'Stator', x: 55, y: 38,
        description: 'The stationary part; its windings carry current and produce the magnetic field.',
        hint: 'Copper windings inside the open end of the ribbed body.',
        prompt: 'Select the stationary windings that produce the magnetic field.'
      },
      {
        id: 'motor-bearings', label: 'Motor bearings', x: 82, y: 57, mx: 77, my: 91,
        description: 'Support the rotor at each end, inside the endplates.',
        hint: 'Steel ring on the rod between the tan cylinder and the blue disk at the right (its twin sits at the cylinder\'s other end).',
        prompt: 'Select a part that supports the rotor at one end.'
      },
      {
        id: 'rotor', label: 'Rotor assembly', x: 70, y: 45,
        description: 'The rotor and motor shaft together: the rotating part that delivers power to the fan.',
        hint: 'Tan cylinder on a steel rod.',
        prompt: 'Select the rotating part that delivers power to the fan.'
      },
      {
        id: 'shaft', label: 'Motor shaft', x: 87, y: 64, mx: 83.5, my: 79,
        description: 'Part of the rotor assembly; it carries the drive (sheave, coupling or impeller hub).',
        hint: 'Thin steel rod sticking out to the right of the tan cylinder.',
        prompt: 'Select the steel rod that carries the drive: a sheave, coupling or impeller hub.'
      }
    ]
  };

  FP.Overlay.mount({ root: '#overlay', data: DATA });
})();
