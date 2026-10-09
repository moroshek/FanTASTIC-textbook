// Direct Drive Centrifugal Fan Parts - FP.Overlay (callout engine) on a FanPedia drawing
// CANVAS_HEIGHT: 708
// Explore: point at or select a numbered marker to see the part (never scored). Quiz: 12
// prompts in a seeded shuffle, two attempts each, the first wrong answer shows a hint, a second
// wrong answer reveals the part; mastery is 10 of 12 on the first attempt.
// Drawing: FanPedia, Twin City Fan, p. 9 (Arrangement 8 direct drive fan, exploded, with the
// flanged-inlet inset), labels removed. Positions are % of the image; (x, y) is the point on
// the part, (mx, my) where the numbered marker sits. Recalibrate with main.html?calibrate=1.

(function () {
  'use strict';

  var DATA = {
    id: 'ch03-direct-drive-centrifugal-overlay',
    title: 'Direct Drive Centrifugal Fan Parts',
    engine: 'callout',
    layout: 'side',
    image: '../../img/overlays/ch03-direct-drive-centrifugal-overlay.png',
    width: 1242,
    height: 888,
    alt: 'Exploded view of an Arrangement 8 direct drive centrifugal fan, with an inset of the inlet side of the assembled fan',
    credit: 'Drawing: FanPedia, Twin City Fan, p. 9',
    mastery: 10,
    parts: [
      {
        id: 'inlet-collar', label: 'Inlet collar', x: 11, y: 50,
        description: 'A short, plain cylindrical sleeve at the fan inlet so a duct or flexible connector can slip over it and be clamped. It has no bolt holes.',
        hint: 'Plain ring with no bolt holes, far left.',
        prompt: 'Select the inlet part that takes a slip-fit duct connection.'
      },
      {
        id: 'inlet-funnel', label: 'Inlet funnel', x: 18, y: 40,
        description: 'An aerodynamically shaped ring that funnels air into the impeller; FanPedia (page 188) says it is flanged on one end to mount to the housing and is also called the inlet cone or inlet bell.',
        hint: 'Flanged bell-shaped ring with a bolt circle.',
        prompt: 'Select the part that shapes the air smoothly into the impeller.'
      },
      {
        id: 'impeller', label: 'Impeller', x: 31, y: 42,
        description: 'The rotating part that does the work on the air. It is the only part of the fan that adds energy to the airstream.',
        hint: 'Wheel with curved blades between two rings.',
        prompt: 'Select the only part that adds energy to the air.'
      },
      {
        id: 'housing', label: 'Housing', x: 55, y: 24,
        description: 'The stationary shell that encloses the impeller and guides the air from the inlet to the outlet. On a housed centrifugal fan it is snail-shaped.',
        hint: 'Large curved scroll shell.',
        prompt: 'Select the stationary shell that guides air from inlet to outlet.'
      },
      {
        id: 'outlet-flange', label: 'Outlet flange', x: 60, y: 71,
        description: 'A flat frame around the fan outlet with a bolt-hole pattern for a bolted connection to the downstream duct or to an outlet accessory.',
        hint: 'Rectangular frame around the front opening.',
        prompt: 'Select the bolted connection at the discharge.'
      },
      {
        id: 'access-hole', label: 'Access hole for mounting bolts', x: 74, y: 44,
        description: 'Opening used to reach the bolts that mount the housing.',
        hint: 'Small square opening in the pedestal side.',
        prompt: 'Select the opening a mechanic reaches through to get at the mounting bolts.'
      },
      {
        id: 'pedestal', label: 'Pedestal', x: 73, y: 55,
        description: 'The separate support structure that carries the bearings and shaft; in Arrangement 8 it is extended to carry the motor as well.',
        hint: 'Sloped box support behind the housing.',
        prompt: 'Select the structure that carries the bearings, the shaft and, in Arrangement 8, the motor.'
      },
      {
        id: 'bearings', label: 'Bearings', x: 74.3, y: 33.5, mx: 70.5, my: 11,
        description: 'The two fan bearings support and locate the shaft both radially and axially; one is fixed and the other is floating.',
        hint: 'Two small blue blocks on the shaft.',
        prompt: 'Select the parts that support and locate the shaft.'
      },
      {
        id: 'shaft', label: 'Shaft', x: 77.7, y: 31.8, mx: 77, my: 14.5,
        description: 'The steel bar that carries the impeller and transmits torque from the drive to it.',
        hint: 'Thin rod running through the bearings.',
        prompt: 'Select the bar that carries the impeller and transmits torque.'
      },
      {
        id: 'coupling', label: 'Coupling', x: 84.5, y: 30.6, mx: 83.5, my: 18,
        description: 'A device that connects two shafts so they turn together. In Arrangement 8 a flexible coupling joins the motor shaft and the fan shaft end to end, so the impeller turns at motor speed.',
        hint: 'Short cylinder between the shaft end and the motor.',
        prompt: 'Select the part that joins the motor shaft to the fan shaft.'
      },
      {
        id: 'motor', label: 'Motor', x: 92, y: 27,
        description: 'The machine that converts electrical energy into the rotation that turns the impeller.',
        hint: 'Blue-green finned machine at the far right.',
        prompt: 'Select the machine that turns electrical energy into rotation.'
      },
      {
        id: 'inlet-flange', label: 'Inlet flange', x: 13.5, y: 84,
        description: 'A flat ring around the fan inlet drilled with a bolt-hole pattern, so a duct or accessory can be bolted to the fan face to face; FanPedia\'s exploded views show it as the flanged inlet option.',
        hint: 'Inset at lower left: bolted ring on the housing inlet.',
        prompt: 'Select the bolted inlet connection shown in the inset.'
      }
    ]
  };

  FP.Overlay.mount({ root: '#overlay', data: DATA });
})();
