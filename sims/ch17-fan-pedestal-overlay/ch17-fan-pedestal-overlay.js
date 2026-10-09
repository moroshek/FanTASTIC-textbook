// Fan Pedestal Features - FP.Overlay (callout engine) on a FanPedia drawing
// CANVAS_HEIGHT: 982
// Explore: point at or select a numbered marker to see the feature (never scored). Quiz: 7
// prompts in a seeded shuffle, two attempts each, the first wrong answer shows a hint, a second
// wrong answer reveals the feature; mastery is 6 of 7 on the first attempt.
// Drawing: FanPedia, Twin City Fan, p. 85 (Pedestals: Features, a pedestal on a SWSI fan, with
// the 'Bearing or Motor Pads' inset), labels removed. Positions are % of the image; (x, y) is the
// point on the part, (mx, my) where the numbered marker sits. Recalibrate with
// main.html?calibrate=1.

(function () {
  'use strict';

  var DATA = {
    id: 'ch17-fan-pedestal-overlay',
    title: 'Fan Pedestal Features',
    engine: 'callout',
    layout: 'side',
    image: '../../img/overlays/ch17-fan-pedestal-overlay.png',
    width: 1040,
    height: 1396,
    alt: 'A sheet-metal pedestal beside the housing of a single width centrifugal fan, carrying the fan shaft, with an inset of a bare stepped pedestal below',
    credit: 'Drawing: FanPedia, Twin City Fan, p. 85',
    mastery: 6,
    parts: [
      {
        id: 'top', label: 'Top', x: 66, y: 18.3,
        description: 'The top plate of the pedestal, where the pillow block bearings bolt down. A machined top gives a flat, stiff surface for bearing alignment.',
        hint: 'Flat plate the bearings bolt to.',
        prompt: 'Select the surface the bearings bolt to.'
      },
      {
        id: 'pillow-block', label: 'Pillow block bearing', x: 61, y: 14, mx: 60, my: 6,
        description: 'A bearing insert in a housing that bolts to a surface parallel to the shaft, here the pedestal top. The two of them support the shaft.',
        hint: 'Blue-green housing clamped around the shaft.',
        prompt: 'Select one of the housings that support the shaft and bolt down on the pedestal.'
      },
      {
        id: 'hand-holes', label: 'Hand holes', x: 55.3, y: 25,
        description: 'Openings in the pedestal that give access to the bearing and motor fasteners.',
        hint: 'Square openings high on the large sloped wall.',
        prompt: 'Select the openings that give access to fasteners.'
      },
      {
        id: 'sides', label: 'Sides', x: 54, y: 42,
        description: 'The sloped sheet-metal walls of the pedestal. A typical pedestal has a top, sides, feet, a front and sometimes a back, built from angled, straight or formed sheet metal.',
        hint: 'Large sloped wall facing you, below the square openings.',
        prompt: 'Select one of the sloped walls that run along the shaft.'
      },
      {
        id: 'front', label: 'Front', x: 84, y: 51,
        description: 'The sloped end wall of the pedestal. Some pedestals also have a back.',
        hint: 'Sloped wall at the far right, across the end of the shaft.',
        prompt: 'Select the end wall of the pedestal.'
      },
      {
        id: 'feet', label: 'Feet', x: 72, y: 60.7,
        description: 'The bottom flanges that bolt the pedestal down.',
        hint: 'Flanged edge along the bottom.',
        prompt: 'Select the bottom flanges that bolt the pedestal down.'
      },
      {
        id: 'pads', label: 'Bearing or motor pads', x: 33, y: 72,
        description: 'Plates on the pedestal top that give a flat, stiff surface for bearing alignment; a machined top does the same job.',
        hint: 'Purple strips on the inset pedestal.',
        prompt: 'Select the strips that give a flat, stiff surface for alignment.'
      }
    ]
  };

  FP.Overlay.mount({ root: '#overlay', data: DATA });
})();
