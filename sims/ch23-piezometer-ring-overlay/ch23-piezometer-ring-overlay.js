// Piezometer Ring Components - FP.Overlay (callout engine) on a FanPedia drawing
// CANVAS_HEIGHT: 865
// Explore: point at or select a numbered marker to see the part (never scored). Quiz: 10
// prompts in a seeded shuffle, two attempts each, the first wrong answer shows a hint, a second
// wrong answer reveals the part; mastery is 8 of 10 on the first attempt.
// Drawing: FanPedia, Twin City Fan, p. 158 (Piezometer Rings: Overview; the inlet funnel
// components on the main drawing, with the union "T" fitting, fitting tap and coupling
// close-ups below), labels removed. Positions are % of the image; (x, y) is the point on the
// part, (mx, my) where the numbered marker sits. Recalibrate with main.html?calibrate=1.

(function () {
  'use strict';

  var DATA = {
    id: 'ch23-piezometer-ring-overlay',
    title: 'Piezometer Ring Components',
    engine: 'callout',
    layout: 'side',
    image: '../../img/overlays/ch23-piezometer-ring-overlay.png',
    width: 1200,
    height: 1321,
    alt: 'FanPedia drawing of an airflow measuring system of tubes and fittings mounted on a fan\'s flared inlet, with three close-up views of its fittings below',
    credit: 'Drawing: FanPedia, Twin City Fan, p. 158',
    mastery: 8,
    parts: [
      {
        id: 'funnel', label: 'Inlet funnel', x: 46, y: 50,
        description: 'The fan\'s own inlet funnel serves as the flow nozzle. The air speeds up as it enters the throat, so the throat pressure falls, and that pressure difference rises with the square of the airflow (FanPedia p. 158).',
        hint: 'The large flared part everything else mounts on.',
        prompt: 'Select the part the system uses as its flow nozzle.'
      },
      {
        id: 'ring', label: 'Tubing around the throat', x: 57.1, y: 33,
        description: 'Tubing around the throat of the funnel forms the ring and connects to the low-pressure side. It is nylon for temperatures up to 180°F and copper above (FanPedia p. 158).',
        hint: 'Green tube along the edge where the flare meets the straight section.',
        prompt: 'Select the ring that senses the lowered pressure where the air speeds up.'
      },
      {
        id: 'couplings', label: 'Couplings with "T" fittings', x: 80, y: 84.5, mx: 73.5, my: 79,
        description: 'Join the ring tubing at the throat; FanPedia\'s close-up shows one as a fitting tap, four required (p. 158).',
        hint: 'Purple fitting in the right close-up.',
        prompt: 'Select the parts that join the ring tubing at four points around the throat.'
      },
      {
        id: 'tee', label: 'Union tee', x: 15.5, y: 83.5,
        description: 'Joins the ring to the tubing that runs to the low pressure tap; one required (FanPedia p. 158).',
        hint: 'Red fitting in the left close-up, where three tubes meet.',
        prompt: 'Select the single fitting where the ring branches off toward the low pressure tap.'
      },
      {
        id: 'low-tube', label: 'Tubing to low pressure tap', x: 45, y: 18.7,
        description: 'Carries the ring\'s (throat) pressure to the low pressure tap fitting (FanPedia p. 158).',
        hint: 'Green tube climbing from the ring to the top of the flare.',
        prompt: 'Select the tube that carries the throat pressure away from the ring.'
      },
      {
        id: 'high-tube', label: 'Tubing to high pressure tap', x: 19.7, y: 12,
        description: 'Connects the high pressure tap. It is shipped loose on funnel applications (FanPedia p. 158).',
        hint: 'Coiled magenta tube at the top left.',
        prompt: 'Select the tubing that ships loose on funnel applications.'
      },
      {
        id: 'low-fitting', label: 'Low pressure tap fitting', x: 40, y: 85.5, mx: 34.5, my: 86,
        description: 'The tap fitting for the tubing from the ring; the ring connects to the low-pressure side of the pressure-measuring device (FanPedia p. 158).',
        hint: 'Blue fitting in the middle close-up.',
        prompt: 'Select the fitting where the ring\'s pressure leaves the funnel for the instrument.'
      },
      {
        id: 'high-fitting', label: 'High pressure tap fitting', x: 40.5, y: 75, mx: 34.5, my: 74.5,
        description: 'The tap fitting for the high-pressure side. FanPedia (p. 158) shows the face of the funnel on the inlet side as the connection for the high pressure tap when it is mounted on the inlet funnel.',
        hint: 'Brown fitting in the middle close-up.',
        prompt: 'Select the fitting for the tap on the face of the funnel.'
      },
      {
        id: 'clip', label: 'Hanger clip', x: 50, y: 22, mx: 50, my: 28.5,
        description: 'Holds the tubing to the low pressure tap in place on the funnel (FanPedia p. 158).',
        hint: 'Small yellow part on the tube near the top of the flare.',
        prompt: 'Select the part that holds the tubing in place along the flare.'
      },
      {
        id: 'rivnut', label: 'Rivnut', x: 85.3, y: 83.5, mx: 90, my: 90,
        description: 'A threaded insert in the funnel wall; the close-up shows it at a fitting tap on the ring (FanPedia p. 158).',
        hint: 'Small orange ring beside the purple fitting in the right close-up.',
        prompt: 'Select the threaded insert in the funnel wall.'
      }
    ]
  };

  FP.Overlay.mount({ root: '#overlay', data: DATA });
})();
