// Fan Base Types - FP.Overlay (callout engine) on a FanPedia drawing
// CANVAS_HEIGHT: 721
// Explore: point at or select a numbered marker to see the part (never scored). Quiz: 6
// prompts in a seeded shuffle, two attempts each, the first wrong answer shows a hint, a second
// wrong answer reveals the part; mastery is 5 of 6 on the first attempt.
// Drawing: FanPedia, Twin City Fan, pp. 131-132 (Base Types: Centrifugal Fans; unitary and
// isolation bases, each also shown under a fan, p. 131; inertia base with optional bottom pan,
// bare and under a fan, p. 132), labels removed and the p. 132 drawings placed below the p. 131
// ones. Positions are % of the image; (x, y) is the point on the part, (mx, my) where the
// numbered marker sits. Recalibrate with main.html?calibrate=1.

(function () {
  'use strict';

  var DATA = {
    id: 'ch22-fan-base-types-overlay',
    title: 'Fan Base Types',
    engine: 'callout',
    layout: 'side',
    image: '../../img/overlays/ch22-fan-base-types-overlay.png',
    width: 1440,
    height: 1154,
    alt: 'Two centrifugal fans at the top, two steel frames each carrying only a motor in the middle row, and at the bottom a deep frame above a flat sheet beside a fan on a deep frame',
    credit: 'Drawing: FanPedia, Twin City Fan, pp. 131-132',
    mastery: 5,
    parts: [
      {
        id: 'unitary', label: 'Unitary base', x: 32, y: 45.5,
        description: 'Also known as a channel base: it uses structural channel to support the fan assembly and is designed for use without isolators (FanPedia pp. 131, 176).',
        hint: 'Middle left: a bare channel frame with a motor and nothing under its corners.',
        prompt: 'Select the base designed for use without isolators.'
      },
      {
        id: 'isolation', label: 'Isolation base', x: 82, y: 32.5,
        description: 'A common support for the fan, motor and drive, including guards, built of heavy-duty structural channel. It sits on spring or rubber-in-shear isolators and requires flexible connectors at the inlet and outlet (FanPedia pp. 131, 176).',
        hint: 'Middle right: a channel frame with a motor, standing on black and red mounts.',
        prompt: 'Select the all-steel base built to sit on spring or rubber-in-shear isolators.'
      },
      {
        id: 'spring-isolators', label: 'Spring isolators', x: 84.5, y: 47,
        description: 'Isolators that limit the forces an operating fan transmits to the support structure. Isolation bases sit on spring or rubber-in-shear isolators; inertia bases sit on springs (FanPedia pp. 131-132).',
        hint: 'Black and red blocks under the frame, middle right.',
        prompt: 'Select a part that limits the force an operating fan passes to the structure.'
      },
      {
        id: 'inertia', label: 'Inertia base', x: 44, y: 75,
        description: 'An isolation base with reinforcing rods (rebar), filled with concrete by the customer. It is typically used on longer, direct-drive fans to mitigate assembly deflection and keep the motor, coupling, shaft and bearings aligned (FanPedia p. 132).',
        hint: 'Bottom left: a deep channel frame with a grid inside it.',
        prompt: 'Select the base the customer fills with concrete.'
      },
      {
        id: 'rebar', label: 'Reinforcing rods (rebar)', x: 33.3, y: 72.3,
        description: 'The rods built into an inertia base; the customer-supplied concrete is poured around them (FanPedia p. 132).',
        hint: 'The grid of thin members across the open top of the bottom-left frame.',
        prompt: 'Select the parts the concrete is poured around.'
      },
      {
        id: 'bottom-pan', label: 'Bottom pan', x: 35, y: 88,
        description: 'An option that makes the concrete easier to pour in the field (FanPedia p. 132).',
        hint: 'Flat grey sheet below the bottom-left frame.',
        prompt: 'Select the optional part that makes filling the base in the field easier.'
      }
    ]
  };

  FP.Overlay.mount({ root: '#overlay', data: DATA });
})();
