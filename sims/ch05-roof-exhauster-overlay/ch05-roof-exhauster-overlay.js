// Centrifugal Roof Exhauster Parts - FP.Overlay (callout engine) on a FanPedia drawing
// CANVAS_HEIGHT: 1078
// Explore: point at or select a numbered marker to see the part (never scored). Quiz: 9
// prompts in a seeded shuffle, two attempts each, the first wrong answer shows a hint, a second
// wrong answer reveals the part; mastery is 8 of 9 on the first attempt.
// Drawing: FanPedia, Twin City Fan, p. 19 (Exploded Views: Centrifugal Roof Exhausters,
// upblast in the left column, downblast in the right column), labels removed. Positions are %
// of the image; (x, y) is the point on the part, (mx, my) where the numbered marker sits.
// Recalibrate with main.html?calibrate=1.

(function () {
  'use strict';

  var DATA = {
    id: 'ch05-roof-exhauster-overlay',
    title: 'Centrifugal Roof Exhauster Parts',
    engine: 'callout',
    layout: 'dual-panel',
    image: '../../img/overlays/ch05-roof-exhauster-overlay.png',
    width: 1200,
    height: 1157,
    alt: 'Exploded views of two centrifugal roof exhausters with their parts stacked top to bottom, an upblast unit on the left and a downblast unit on the right',
    credit: 'Drawing: FanPedia, Twin City Fan, p. 19',
    mastery: 8,
    parts: [
      {
        id: 'motor-cover', label: 'Motor cover', x: 76, y: 4,
        description: 'On the downblast unit the mushroom-shaped motor cover turns the rising air back down so it spills out around the base.',
        hint: 'Flat disk at the top of the right column.',
        prompt: 'Select the cover that turns the rising air back down on a downblast unit.'
      },
      {
        id: 'motor-housing', label: 'Motor housing', x: 76, y: 16,
        description: 'The drum that encloses the motor above the impeller.',
        hint: 'Tall open cylinder under the cover.',
        prompt: 'Select the drum that encloses the motor.'
      },
      {
        id: 'motor', label: 'Motor', x: 10, y: 26.5, mx: 4.5, my: 20.5,
        description: 'Turns the impeller on a vertical shaft; FanPedia shows direct drive and belt driven versions.',
        hint: 'Small upright cylinder standing on a round plate, upper left.',
        prompt: 'Select the machine that turns the impeller on a vertical shaft.'
      },
      {
        id: 'bird-screen', label: 'Bird screen', x: 16, y: 36.5,
        description: 'A mesh that keeps birds and debris out of the discharge.',
        hint: 'Wire ring, upper left.',
        prompt: 'Select the mesh that keeps birds out.'
      },
      {
        id: 'impeller', label: 'Impeller', x: 76, y: 42,
        description: 'Air rises through the wheel and is thrown outward.',
        hint: 'Wheel with blades, right column.',
        prompt: 'Select the wheel the air rises through.'
      },
      {
        id: 'shroud', label: 'Shroud', x: 18, y: 57,
        description: 'The sheet-metal shell around the impeller of a centrifugal roof exhauster that guides the air the impeller throws off.',
        hint: 'Large bowl-shaped shell, left column (upblast).',
        prompt: 'Select the shell around the impeller of the upblast unit.'
      },
      {
        id: 'skirt', label: 'Skirt', x: 70, y: 56,
        description: 'The lower edge of the downblast unit, around which the air spills out.',
        hint: 'Flared ring with a perforated band, right column.',
        prompt: 'Select the lower edge the air spills out around on a downblast unit.'
      },
      {
        id: 'curb-cap', label: 'Curb cap', x: 80, y: 73,
        description: 'The flat base plate at the bottom of the fan that rests on and covers the roof curb.',
        hint: 'Square plate with a round collar, right column.',
        prompt: 'Select the base plate that sits on the roof curb.'
      },
      {
        id: 'roof-curb', label: 'Roof curb', x: 17, y: 93,
        description: 'A raised frame built into the roof around the opening, flashed into the roofing, on which the fan sits.',
        hint: 'Square frame at the bottom, left column.',
        prompt: 'Select the raised frame built into the roof.'
      }
    ]
  };

  FP.Overlay.mount({ root: '#overlay', data: DATA });
})();
