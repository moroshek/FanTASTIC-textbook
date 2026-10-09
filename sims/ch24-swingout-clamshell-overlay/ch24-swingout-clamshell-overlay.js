// Swingout and Clamshell Fans - FP.Overlay (grid engine) on a FanPedia drawing
// CANVAS_HEIGHT: 757
// Explore: point at or select a numbered drawing to see what it shows (never scored). Quiz: 5
// prompts in a seeded shuffle, two attempts each, the first wrong answer shows a hint, a second
// wrong answer reveals the drawing; mastery is 4 of 5 on the first attempt.
// Drawing: FanPedia, Twin City Fan, p. 123 (Special Construction: Swingout & Clamshell; three
// swingout fans, top row; double door and single door clamshell fans, bottom row), titles and
// captions removed and the bottom row moved up. Positions are % of the image (x1, y1 = top
// left; x2, y2 = bottom right); recalibrate with main.html?calibrate=1.

(function () {
  'use strict';

  var DATA = {
    id: 'ch24-swingout-clamshell-overlay',
    title: 'Swingout and Clamshell Fans',
    engine: 'grid',
    image: '../../img/overlays/ch24-swingout-clamshell-overlay.png',
    width: 1500,
    height: 572,
    alt: 'Seven fans opened for maintenance: three in the top row with the rotating assembly moved out of the fan, and four in the bottom row with the casing opened around the rotor',
    credit: 'Drawing: FanPedia, Twin City Fan, p. 123',
    mastery: 4,
    scoreNoun: 'Drawings',
    zones: [
      {
        id: "centrifugal-swingout", label: "Centrifugal swingout fan (Arrangements 4S, 9ST, 9SS)",
        x1: 1.9, y1: 1.2, x2: 25.5, y2: 49.6,
        summary: "The impeller, shaft and bearing assembly swings out of the housed centrifugal fan on a large door.",
        facts: ["4S is direct drive; 9ST and 9SS are belt driven.", "Duct connections and housing stay in place."],
        hint: "Top row: look for a square, boxy housing rather than a round casing.",
        prompt: "Which drawing shows a housed centrifugal fan with its rotor swung out?"
      },
      {
        id: "axial-swingout", label: "Axial swingout fan (Arrangements 4SO, 9SO)",
        x1: 36.6, y1: 0.4, x2: 65.3, y2: 49.9,
        summary: "The rotor assembly is built onto a swingout door of an axial fan.",
        facts: ["Inspect, clean or repair out of the airstream."],
        hint: "Top row: the round casing is open and the door carries open, propeller-like blades around a cylinder.",
        prompt: "Which drawing shows an axial fan whose rotor swings out on a door?"
      },
      {
        id: "inline-swingout", label: "Inline centrifugal swingout fan (Arrangements 4SO, 9SO)",
        x1: 75.6, y1: 0.6, x2: 98.3, y2: 49.9,
        summary: "Same swingout door idea on an inline centrifugal fan.",
        facts: ["Same arrangements as the axial version, different impeller."],
        hint: "Top row: the door carries a tall drum with a wheel at its base, not open propeller blades.",
        prompt: "Which drawing shows an inline centrifugal fan with its rotor swung out?"
      },
      {
        id: "double-door", label: "Double door clamshell fans (Arrangements 4CS, 9CS)",
        x1: 0.2, y1: 54.0, x2: 48.9, y2: 99.1,
        summary: "The casing opens on two doors around a rotor that stays in place.",
        facts: ["One of the two doors is wide enough for impeller removal.", "Axial and inline centrifugal versions."],
        hint: "Bottom row: each casing in the pair has a door hinged on each side.",
        prompt: "Which drawings show a casing that opens on two doors?"
      },
      {
        id: "single-door", label: "Single door clamshell fans (Arrangements 4CS, 9CS)",
        x1: 55.4, y1: 53.0, x2: 99.7, y2: 99.2,
        summary: "The casing opens on one hinged door; the rotor stays in place.",
        facts: ["Clamshell fans are typically used in vertical mount applications."],
        hint: "Bottom row: each casing in the pair has a door on one side only.",
        prompt: "Which drawings show a casing that opens on one door?"
      }
    ]
  };

  FP.Overlay.mount({ root: '#overlay', data: DATA });
})();
