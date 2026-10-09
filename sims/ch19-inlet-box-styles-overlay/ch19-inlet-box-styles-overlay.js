// Inlet Box Styles - FP.Overlay (grid engine) on a FanPedia drawing
// CANVAS_HEIGHT: 989
// Explore: point at or select a numbered drawing to see what it shows (never scored). Quiz: 4
// prompts in a seeded shuffle, two attempts each, the first wrong answer shows a hint, a second
// wrong answer reveals the drawing; mastery is 4 of 4 on the first attempt.
// Drawing: FanPedia, Twin City Fan, pp. 141-142 (integral inlet box without and with horn, top
// row, p. 141; detached bolt-on and free-standing inlet boxes, bottom row, p. 142), captions and
// callouts removed. Zones are percent of the image (x1, y1 = top left; x2, y2 = bottom right).
// Recalibrate with main.html?calibrate=1.

(function () {
  'use strict';

  var DATA = {
    id: 'ch19-inlet-box-styles-overlay',
    title: 'Inlet Box Styles',
    engine: 'grid',
    image: '../../img/overlays/ch19-inlet-box-styles-overlay.png',
    width: 1200,
    height: 1085,
    alt: 'Four drawings of a centrifugal fan, each with a green box that turns the air into its inlet, two in the top row and two in the bottom row',
    credit: 'Drawing: FanPedia, Twin City Fan, pp. 141-142',
    mastery: 4,
    scoreNoun: 'Drawings',
    zones: [
      {
        id: 'integral', label: 'Integral inlet box without horn',
        x1: 0.9, y1: 1.0, x2: 43.6, y2: 53.0,
        summary: 'Integrated into the inlet side of the fan housing and supported by the fan.',
        facts: ['Common plate with the fan inlet housing sideplate.', 'The standard attached box when there is no duct interference.'],
        hint: 'Top row: the green box sits beside the housing, with nothing reaching out over it.',
        prompt: 'Which drawing shows an attached box with no extension carried out past the fan?'
      },
      {
        id: 'horn', label: 'Integral inlet box with horn',
        x1: 45.7, y1: 4.3, x2: 88.4, y2: 53.4,
        summary: 'An integral box with an extension that carries the inlet connection out past the fan.',
        facts: ['Used when the inlet and discharge airflows would intersect.', 'Lets ductwork be connected without interference.'],
        hint: "Top row: the box's top opening reaches out over the housing.",
        prompt: 'Which drawing lets the inlet duct connect without interfering with the discharge?'
      },
      {
        id: 'bolt-on', label: 'Bolt-on inlet box',
        x1: 0.9, y1: 56.1, x2: 48.6, y2: 99.5,
        summary: "A detached box bolted directly to the inlet flange of the fan; TCF's preferred inlet box design.",
        facts: ['Rectangular inlet flange to the ductwork, round outlet flange to the fan inlet flange.', 'Mounting structure: a single base angle, gussets and a reinforcement plate.', 'Straight or flared connection.'],
        hint: 'Bottom row: a ring of bolts joins the green box to the fan.',
        prompt: "Which drawing shows the detached box FanPedia names TCF's preferred design?"
      },
      {
        id: 'free-standing', label: 'Free-standing inlet box',
        x1: 50.7, y1: 56.1, x2: 99.1, y2: 98.8,
        summary: 'A detached box mounted separately from the fan and fully supported at the floor.',
        facts: ['Connects by a round outlet flange (bolted) or an outlet collar with a rubber sleeve and clamps (slip, shown).', 'Mounting structure: a base plate (foot), gussets and a reinforcement plate.'],
        hint: 'Bottom row: look for a ribbed sleeve joint between the green box and the fan.',
        prompt: 'Which drawing shows a detached box fully supported at the floor?'
      }
    ]
  };

  FP.Overlay.mount({ root: '#overlay', data: DATA });
})();
