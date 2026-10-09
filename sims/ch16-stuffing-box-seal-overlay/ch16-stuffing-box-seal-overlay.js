// Stuffing Box Seal With Gas Purge - FP.Overlay (callout engine) on a FanPedia drawing
// CANVAS_HEIGHT: 856
// Explore: point at or select a numbered marker to see the part (never scored). Quiz: 10
// prompts in a seeded shuffle, two attempts each, the first wrong answer shows a hint, a second
// wrong answer reveals the part; mastery is 8 of 10 on the first attempt.
// Drawing: FanPedia, Twin City Fan, p. 155 (Shaft Seals: 'Stuffing Box Type Shaft Seal With Gas
// Purge', exploded view with the assembled inset), labels and colour legend removed. Positions
// are % of the image; (x, y) is the point on the part, (mx, my) where the numbered marker sits.
// Recalibrate with main.html?calibrate=1.

(function () {
  'use strict';

  var DATA = {
    id: 'ch16-stuffing-box-seal-overlay',
    title: 'Stuffing Box Seal With Gas Purge',
    engine: 'callout',
    layout: 'side',
    image: '../../img/overlays/ch16-stuffing-box-seal-overlay.png',
    width: 1200,
    height: 1297,
    alt: 'Exploded view of a stuffing box seal with gas purge, with an inset at the upper right showing the seal assembled',
    credit: 'Drawing: FanPedia, Twin City Fan, p. 155',
    mastery: 8,
    parts: [
      {
        id: 'housing-wall', label: 'Fan housing wall', x: 39, y: 38,
        description: 'The seal is mounted on the fan housing around the shaft where it passes through the housing wall.',
        hint: 'Large grey triangular plate on the left.',
        prompt: 'Select the surface the whole seal assembly is mounted on.'
      },
      {
        id: 'shaft', label: 'Shaft', x: 8, y: 40,
        description: 'The shaft passes through the housing wall; the seal around it reduces leakage of air or gas along the shaft.',
        hint: 'Long round steel bar at the far left, passing through the grey plate.',
        prompt: 'Select the rotating part the seal limits leakage along.'
      },
      {
        id: 'mounting-rods', label: 'Threaded mounting rods', x: 34, y: 44,
        description: 'Rods whose nuts are welded inside the housing; the seal assembly bolts to the housing on them, and they draw the outside plate up to press the packing stack.',
        hint: 'Short ridged bars sticking out of the grey plate, above and below the opening.',
        prompt: 'Select the parts the outside plate is drawn up on.'
      },
      {
        id: 'ptfe-sealant', label: 'PTFE joint sealant', x: 31.3, y: 59.7,
        description: 'Seals the seal assembly to the fan housing.',
        hint: 'Thin orange loop just in front of the grey plate.',
        prompt: 'Select what seals the seal assembly to the housing.'
      },
      {
        id: 'inside-plate', label: 'Inside plate with seal housing', x: 39, y: 67,
        description: 'Mounted on the fan housing wall; the rings of packing are stacked in its seal housing around the shaft.',
        hint: 'Green square flange with a round collar, nearest the grey plate.',
        prompt: 'Select the plate whose housing holds the packing stack.'
      },
      {
        id: 'pipe-plug', label: '1/8-inch NPT pipe plug', x: 46, y: 53.5,
        description: 'The fan ships with this plug in the purge hole; it is replaced in the field with the customer-supplied purge line.',
        hint: 'Small yellow knob on top of the green collar.',
        prompt: 'Select the part that is replaced by the customer\'s purge line.'
      },
      {
        id: 'carbon-yarn-packing', label: 'Carbon yarn packing', x: 49.6, y: 66.3, mx: 50, my: 80,
        description: 'The outer rings of the packing stack in Twin City Fan\'s design.',
        hint: 'Red ring nearest the green plate (a second red ring sits further right).',
        prompt: 'Select one of the outer rings of the packing stack.'
      },
      {
        id: 'graphoil-ring', label: 'Graphoil split ring', x: 53.2, y: 69.2, mx: 55.5, my: 84,
        description: 'A flexible graphite split ring, one of the inner rings of the packing stack.',
        hint: 'Yellow-green ring next to the first red ring.',
        prompt: 'Select the flexible graphite ring inside the packing stack.'
      },
      {
        id: 'lantern-ring', label: 'Teflon lantern ring', x: 58.6, y: 71.7, mx: 61, my: 86.5,
        description: 'Sits at the purge hole in the ring stack, between the Graphoil split ring and the carbon yarn packing; a spacer ring with openings that lets purge gas fed in from outside fill the space around the shaft.',
        hint: 'Magenta ring between the yellow-green ring and the second red ring.',
        prompt: 'Select the ring that lets purge gas reach the shaft.'
      },
      {
        id: 'outside-plate', label: 'Outside plate with retaining ring', x: 73, y: 88,
        description: 'Presses the packing stack, drawn up on the threaded mounting rods; because the packing is compressed against the shaft, it can be retightened to take up wear.',
        hint: 'Teal square plate near the right end of the shaft.',
        prompt: 'Select the plate that presses the packing stack.'
      }
    ]
  };

  FP.Overlay.mount({ root: '#overlay', data: DATA });
})();
