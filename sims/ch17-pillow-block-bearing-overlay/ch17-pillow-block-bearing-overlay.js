// Pillow Block Bearings and Shaft Mounts - FP.Overlay (grid engine) on a FanPedia drawing
// CANVAS_HEIGHT: 702
// Explore: point at or select a numbered drawing to see what it shows (never scored). Quiz: 6
// prompts in a seeded shuffle, two attempts each, the first wrong answer shows a hint, a second
// wrong answer reveals the drawing; mastery is 5 of 6 on the first attempt.
// Drawing: FanPedia, Twin City Fan, p. 92 (pillow block bearings, top row; how bearings connect
// to the shaft, bottom row), captions removed. Zones are percent of the image (x1, y1 = top
// left; x2, y2 = bottom right). Recalibrate with main.html?calibrate=1.

(function () {
  'use strict';

  var DATA = {
    id: 'ch17-pillow-block-bearing-overlay',
    title: 'Pillow Block Bearings and Shaft Mounts',
    engine: 'grid',
    image: '../../img/overlays/ch17-pillow-block-bearing-overlay.png',
    width: 1468,
    height: 556,
    alt: 'Six drawings of mounted bearings: three housing styles in the top row and three ways of locking the bearing to the shaft in the bottom row',
    credit: 'Drawing: FanPedia, Twin City Fan, p. 92',
    mastery: 5,
    scoreNoun: 'Drawings',
    zones: [
      {
        id: "solid-ball", label: "Solid pillow block bearing, ball type",
        x1: 0.2, y1: 0.8, x2: 32.5, y2: 49.4,
        summary: "One-piece cast housing with ball rolling elements.",
        facts: ["The common choice on standard fans.", "Bolt holes usually slotted for adjustment.", "To replace it, slide it off the end of the shaft."],
        hint: "Top row: look for round rolling elements in a one-piece housing.",
        prompt: "Which drawing shows a solid pillow block bearing with ball rolling elements?"
      },
      {
        id: "solid-roller", label: "Solid pillow block bearing, spherical roller type",
        x1: 36.7, y1: 0.8, x2: 69.2, y2: 49.4,
        summary: "One-piece housing with crowned (spherical) rollers.",
        facts: ["Rollers carry high and shock loads.", "Same one-piece housing as the ball type."],
        hint: "Top row: the rolling elements are barrel-shaped and the housing is one piece.",
        prompt: "Which drawing shows spherical roller elements in a one-piece housing?"
      },
      {
        id: "split", label: "Split pillow block bearing",
        x1: 74.4, y1: 0.6, x2: 99.7, y2: 49.2,
        summary: "Housing split horizontally through the shaft centerline; the top cap lifts off.",
        facts: ["For easy bearing replacement and inspection.", "Offered with ball or spherical roller elements.", "Common on larger, heavy-duty fans."],
        hint: "Top row: look for a housing cap lifted off its base.",
        prompt: "Which drawing shows a housing whose cap lifts off?"
      },
      {
        id: "set-screw", label: "Set screw mount",
        x1: 0.1, y1: 53.4, x2: 33.5, y2: 99.1,
        summary: "Two set screws in the inner ring tighten onto the shaft.",
        facts: ["Two set screws are always required.", "The angle between them varies by manufacturer, 65 to 120 degrees."],
        hint: "Bottom row: look for two small screws through the inner ring and the angle marks between them.",
        prompt: "Which drawing shows the mount that grips the shaft with two screws?"
      },
      {
        id: "d-lok", label: "D-Lok / Skwezloc style (concentric)",
        x1: 38.8, y1: 59.2, x2: 73.4, y2: 97.3,
        summary: "A split locking collar tightened with a cap screw squeezes the segmented inner ring onto the shaft.",
        facts: ["A concentric bearing mount.", "FanPedia shows it on solid pillow blocks."],
        hint: "Bottom row: the green collar is slit, with one screw across the slit.",
        prompt: "Which drawing shows a split locking collar tightened with a cap screw?"
      },
      {
        id: "adapter", label: "Adapter mount (concentric)",
        x1: 78.6, y1: 59.2, x2: 97.5, y2: 96.2,
        summary: "The locking collar is tightened with a spanner wrench.",
        facts: ["A concentric bearing mount.", "Used for both solid and split pillow block bearings."],
        hint: "Bottom row, far right: a tool is fitted on the collar.",
        prompt: "Which drawing shows a collar tightened with a spanner wrench?"
      }
    ]
  };

  FP.Overlay.mount({ root: '#overlay', data: DATA });
})();
