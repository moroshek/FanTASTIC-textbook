// Inlet Box Features - FP.Overlay (callout engine) on a FanPedia drawing
// CANVAS_HEIGHT: 824
// Explore: point at or select a numbered marker to see the feature (never scored). Quiz: 7
// prompts in a seeded shuffle, two attempts each, the first wrong answer shows a hint, a second
// wrong answer reveals the feature; mastery is 6 of 7 on the first attempt.
// Drawing: FanPedia, Twin City Fan, p. 145 (Inlet Boxes: Features and Accessories, main
// colour-coded drawing), legend and captions removed; the FGR, insulated and damper-flow insets
// are not shown. Positions are % of the image; (x, y) is the point on the part, (mx, my) where
// the numbered marker sits. Recalibrate with main.html?calibrate=1.

(function () {
  'use strict';

  var DATA = {
    id: 'ch18-inlet-box-overlay',
    title: 'Inlet Box Features',
    engine: 'callout',
    layout: 'side',
    image: '../../img/overlays/ch18-inlet-box-overlay.png',
    width: 1200,
    height: 1219,
    alt: 'Colour-coded drawing of a centrifugal fan on a steel base, fed from above through a sheet-metal enclosure on its inlet side, with each feature of that enclosure in its own colour',
    credit: 'Drawing: FanPedia, Twin City Fan, p. 145',
    mastery: 6,
    parts: [
      {
        id: 'inlet-box', label: 'Inlet box', x: 34, y: 40,
        description: 'A sheet-metal enclosure on the fan inlet that receives air from the side, at an angle, or from above or below, and turns it into the fan inlet.',
        hint: 'Large grey sheet-metal enclosure below the green unit.',
        prompt: 'Select the enclosure that turns the air into the fan inlet.'
      },
      {
        id: 'damper', label: 'Inlet box damper', x: 30, y: 20,
        description: 'A parallel blade damper mounted in the inlet box; partly closed, it pre-spins the air in the direction of impeller rotation.',
        hint: 'Green louvered unit on top.',
        prompt: 'Select the device that pre-spins the air before the impeller.'
      },
      {
        id: 'flange-at-inlet', label: 'Flange at inlet', x: 38, y: 28.5,
        description: 'Connects the box to the customer\'s ductwork.',
        hint: 'Orange strip where the green unit meets the box.',
        prompt: 'Select the connection that joins the box to the customer\'s duct.'
      },
      {
        id: 'access-door', label: 'Access door', x: 21, y: 45,
        description: 'Standard on most inlet boxes; allows inspection without dismantling the duct.',
        hint: 'Blue panel on the side of the box.',
        prompt: 'Select the panel that opens so the box can be inspected.'
      },
      {
        id: 'flange-or-collar', label: 'Flange or collar', x: 44, y: 45,
        description: 'The connection from the inlet box to the fan.',
        hint: 'Yellow ring where the box meets the fan.',
        prompt: 'Select the connection between the box and the fan.'
      },
      {
        id: 'drain', label: 'Drain connection', x: 26.5, y: 60, mx: 13, my: 63,
        description: 'Standard on most inlet boxes; handles condensation.',
        hint: 'Small red fitting low on the box.',
        prompt: 'Select the fitting that lets condensation out of the box.'
      },
      {
        id: 'housing', label: 'Fan housing', x: 68, y: 30,
        description: 'The scroll-shaped shell of the fan that the inlet box feeds.',
        hint: 'Large grey scroll behind the box.',
        prompt: 'Select the shell the box delivers its air into.'
      }
    ]
  };

  FP.Overlay.mount({ root: '#overlay', data: DATA });
})();
