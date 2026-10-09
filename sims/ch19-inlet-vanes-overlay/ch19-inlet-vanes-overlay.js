// External and Nested Inlet Vanes - FP.Overlay (callout engine) on a FanPedia drawing
// CANVAS_HEIGHT: 831
// Explore: point at or select a numbered marker to see the part (never scored). Quiz: 6
// prompts in a seeded shuffle, two attempts each, the first wrong answer shows a hint, a second
// wrong answer reveals the part; mastery is 5 of 6 on the first attempt.
// Drawing: FanPedia, Twin City Fan, p. 139 (Inlet Vanes: Industrial Grade, external inlet vane
// at the top and nested inlet vane at the bottom, each with its close-up photo), labels removed.
// Positions are % of the image; (x, y) is the point on the part, (mx, my) where the numbered
// marker sits. Recalibrate with main.html?calibrate=1.

(function () {
  'use strict';

  var DATA = {
    id: 'ch19-inlet-vanes-overlay',
    title: 'External and Nested Inlet Vanes',
    engine: 'callout',
    layout: 'side',
    image: '../../img/overlays/ch19-inlet-vanes-overlay.png',
    width: 1200,
    height: 1237,
    alt: 'Two centrifugal fans drawn with cut-away housings and red airflow arrows, each beside a close-up photo of its inlet',
    credit: 'Drawing: FanPedia, Twin City Fan, p. 139',
    mastery: 5,
    parts: [
      {
        id: 'external', label: 'External inlet vanes', x: 85, y: 28,
        description: 'Variable inlet vanes built in their own housing and bolted to the fan inlet, rather than nested inside the inlet funnel. Used for contaminated airstreams or for high temperature airstreams up to 600°F (FanPedia p. 139); the vane section can be removed, cleaned or replaced without replacing the funnel.',
        hint: 'Top photo: the radial ring set in its own bolted frame.',
        prompt: 'Select the vanes that can be replaced without replacing the funnel.'
      },
      {
        id: 'nested', label: 'Nested inlet vanes', x: 88, y: 72,
        description: 'The same job as external inlet vanes, but the vanes are built into the inlet funnel instead of a separate housing. Applied to clean airstreams up to 600°F; replacing them requires replacing the inlet funnel assembly (FanPedia pp. 139, 188).',
        hint: 'Bottom photo: the radial ring sits inside the curved entry itself.',
        prompt: 'Select the vanes whose replacement means replacing the whole funnel assembly.'
      },
      {
        id: 'handle', label: 'Manual handle', x: 10, y: 7, mx: 17, my: 3.5,
        description: 'Inlet vanes come standard with a manual handle, but can be provided with an actuator (FanPedia p. 139).',
        hint: 'Long lever sticking up at the top left of the top drawing.',
        prompt: 'Select the operator that comes standard on a vane set, unless an actuator is ordered.'
      },
      {
        id: 'funnel', label: 'Inlet funnel', x: 68.5, y: 75,
        description: 'The shaped ring at the fan inlet that guides air into the impeller. Nested inlet vanes are built into it (FanPedia p. 139).',
        hint: 'Bottom photo: the smooth curved ring that surrounds the radial ring.',
        prompt: 'Select the part the nested vanes are built into.'
      },
      {
        id: 'pre-spin', label: 'Pre-spin', x: 6.5, y: 25.3,
        description: 'The swirl that inlet vanes give the incoming air, turning it in the same direction the impeller rotates (FanPedia pp. 139, 188). The impeller then does less work on each pound of air, which is why vanes save power.',
        hint: 'Red curved arrows at the inlet of the top drawing.',
        prompt: 'Select what shows the entering air being turned before it reaches the wheel.'
      },
      {
        id: 'impeller', label: 'Impeller', x: 40.5, y: 23.5,
        description: 'The rotating wheel inside the housing. Air that arrives already spinning its way needs less added spin, so the impeller does less work on each pound of air: the fan develops less pressure, moves less air and draws less power.',
        hint: 'Seen through the cut-away housing of the top drawing, beside a red arrow.',
        prompt: 'Select the rotating part the swirling air turns with.'
      }
    ]
  };

  FP.Overlay.mount({ root: '#overlay', data: DATA });
})();
