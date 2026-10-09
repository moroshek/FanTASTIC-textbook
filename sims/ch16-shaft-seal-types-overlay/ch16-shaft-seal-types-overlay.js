// Contact and Carbon Ring Shaft Seals - FP.Overlay (grid engine) on a FanPedia drawing
// CANVAS_HEIGHT: 823
// Explore: point at or select a numbered drawing to see what it shows (never scored). Quiz: 5
// prompts in a seeded shuffle, two attempts each, the first wrong answer shows a hint, a second
// wrong answer reveals the drawing; mastery is 4 of 5 on the first attempt.
// Drawing: FanPedia, Twin City Fan, pp. 149-153 (Shaft Seals: exploded views of the friction,
// V-ring, lip, single ring mechanical and double ring mechanical shaft seals), labels removed and
// the five views set in two rows. Zones are percent of the image (x1, y1 = top left; x2, y2 =
// bottom right). Recalibrate with main.html?calibrate=1.

(function () {
  'use strict';

  var DATA = {
    id: 'ch16-shaft-seal-types-overlay',
    title: 'Contact and Carbon Ring Shaft Seals',
    engine: 'grid',
    image: '../../img/overlays/ch16-shaft-seal-types-overlay.png',
    width: 1600,
    height: 937,
    alt: 'Five exploded views of the seal where a fan shaft passes through the housing wall: three in the top row and two in the bottom row',
    credit: 'Drawing: FanPedia, Twin City Fan, pp. 149-153',
    mastery: 4,
    scoreNoun: 'Drawings',
    zones: [
      {
        id: "friction", label: "Friction shaft seal",
        x1: 0.6, y1: 1.0, x2: 32.5, y2: 50.1,
        summary: "FanPedia's standard type: soft seal material clamped by a cover plate (typically aluminum) against the housing so that it rubs lightly on the shaft.",
        facts: ["Also called a tacky cloth seal.", "Materials: tacky cloth, Teflon, Viton, Nomex mineral wool, silicone sheet, Fiber Frax (ceramic felt)."],
        hint: "Top left: two flat rectangular sheets, one red and one blue.",
        prompt: "Which drawing clamps a sheet of soft material against the housing with a flat cover plate?"
      },
      {
        id: "v-ring", label: "V-ring shaft seal",
        x1: 34.1, y1: 1.0, x2: 66.1, y2: 49.0,
        summary: "A Teflon plate design and a close relative of the friction seal; also called an axial shaft seal.",
        facts: ["Teflon plate with Chekseal and PTFE joint sealant.", "Washers and nuts on mounting studs welded inside the housing."],
        hint: "Top middle: a round blue plate with rows of washers and nuts.",
        prompt: "Which drawing seals with a round Teflon plate held by washers and nuts on the mounting studs?"
      },
      {
        id: "lip", label: "Lip shaft seal",
        x1: 68.3, y1: 2.1, x2: 97.2, y2: 48.0,
        summary: "An elastomer lip, held in a seal housing on the fan housing wall, that presses against the turning shaft.",
        facts: ["Buna-N standard, Viton special; a double lip version is available.", "The seal housing carries a grease fitting, so it is also called a grease seal or grease purge seal."],
        hint: "Top right: red rings on both sides of the blue housing.",
        prompt: "Which drawing presses an elastomer edge against the shaft from a housing with a grease fitting?"
      },
      {
        id: "single", label: "Single carbon ring seal",
        x1: 17.7, y1: 52.1, x2: 47.7, y2: 99.2,
        summary: "One split carbon ring in a seal housing behind a cover plate; vendor supplied.",
        facts: ["FanPedia calls it a single ring mechanical shaft seal.", "Also called a floating circumferential carbon ring seal or labyrinth shaft seal."],
        hint: "Bottom left: one red ring, then a green plate.",
        prompt: "Which drawing has one split ring held behind a green cover plate?"
      },
      {
        id: "double", label: "Double carbon ring seal",
        x1: 53.0, y1: 54.2, x2: 86.0, y2: 96.4,
        summary: "Two split carbon rings with a lantern ring between them at a purge hole; vendor supplied.",
        facts: ["Purge gas fed to the lantern ring slightly above fan pressure means any leakage is purge gas flowing in.", "The purge supply is the customer's."],
        hint: "Bottom right: a purple ring between two red ones.",
        prompt: "Which drawing has a lantern ring between two rings, for a purge?"
      }
    ]
  };

  FP.Overlay.mount({ root: '#overlay', data: DATA });
})();
