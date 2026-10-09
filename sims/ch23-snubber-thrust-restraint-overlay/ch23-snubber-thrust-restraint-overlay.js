// Snubbers and Thrust Restraints - FP.Overlay (callout engine) on a FanPedia drawing
// CANVAS_HEIGHT: 794
// Explore: point at or select a numbered marker to see the part (never scored). Quiz: 9
// prompts in a seeded shuffle, two attempts each, the first wrong answer shows a hint, a second
// wrong answer reveals the part; mastery is 8 of 9 on the first attempt.
// Drawing: FanPedia, Twin City Fan, p. 135 (Vibration Isolation: Isolator Types; snubbers on
// an isolation base with a detail inset, left, and thrust restraints, right), labels removed.
// Positions are % of the image; (x, y) is the point on the part, (mx, my) where the numbered
// marker sits. Recalibrate with main.html?calibrate=1.

(function () {
  'use strict';

  var DATA = {
    id: 'ch23-snubber-thrust-restraint-overlay',
    title: 'Snubbers and Thrust Restraints',
    engine: 'callout',
    layout: 'top-bottom',
    image: '../../img/overlays/ch23-snubber-thrust-restraint-overlay.png',
    width: 1374,
    height: 626,
    alt: 'FanPedia drawings of a steel isolation base fitted with corner stops, with a close-up inset of one stop at lower left, and of a fan-to-duct joint held by two spring-and-rod assemblies mounted above and below it',
    credit: 'Drawing: FanPedia, Twin City Fan, p. 135',
    mastery: 8,
    parts: [
      {
        id: 'snubber-fan-bracket', label: 'Snubber bracket (attached to the fan or base)', x: 13, y: 70,
        description: 'One of the two brackets of a snubber; it is attached to the fan or base.',
        hint: 'Green plate bolted to the steel frame in the lower-left inset.',
        prompt: 'Select the half of the shock-absorbing stop that is fixed to the fan or base.'
      },
      {
        id: 'snubber-floor-bracket', label: 'Snubber bracket (attached to the floor)', x: 5, y: 85,
        description: 'The other snubber bracket, attached to the floor.',
        hint: 'Blue plate bolted down at the bottom of the lower-left inset.',
        prompt: 'Select the half of the shock-absorbing stop that is fixed to the floor.'
      },
      {
        id: 'elastomeric', label: 'Elastomeric (rubberized) material', x: 10.5, y: 87, mx: 21, my: 88,
        description: 'Sits between the two snubber brackets and prevents metal-to-metal contact.',
        hint: 'Red strip between the green and blue plates in the inset.',
        prompt: 'Select the material that prevents metal-to-metal contact.'
      },
      {
        id: 'isolator', label: 'Isolators', x: 14.5, y: 52,
        description: 'Let the fan float; the snubber engages only when an unusual load, such as an earthquake, tries to move the fan too far.',
        hint: 'Small purple boxes along the sides of the steel frame.',
        prompt: 'Select one of the mounts the base floats on in normal running.'
      },
      {
        id: 'discharge-duct', label: 'Discharge duct', x: 64, y: 28,
        description: 'The duct side of the joint; each thrust restraint is attached to it with threaded rod.',
        hint: 'Red cylinder at the left of the right-hand drawing.',
        prompt: 'Select the ductwork on the far side of the joint from the fan.'
      },
      {
        id: 'flex-connector', label: 'Flex connector', x: 84, y: 40,
        description: 'Joins the fan to the duct; on soft springs the fan moves at every start and this part takes the strain.',
        hint: 'Yellow corrugated sleeve.',
        prompt: 'Select the connector that takes the strain when the fan moves.'
      },
      {
        id: 'fan-discharge', label: 'Fan discharge', x: 98, y: 28, mx: 96.5, my: 5,
        description: 'The fan side of the joint; each thrust restraint is attached here too.',
        hint: 'Grey section at the right edge.',
        prompt: 'Select the fan side of the joint.'
      },
      {
        id: 'restraint-isolator', label: 'Ceiling hung type isolator', x: 83, y: 6.5,
        description: 'The spring element of a thrust restraint (a spring or a spring/RIS pad combination). Two restraints are used per fan, mounted 180 degrees apart.',
        hint: 'Purple spring housing on the rod across the top.',
        prompt: 'Select the spring element of a thrust restraint.'
      },
      {
        id: 'threaded-rod', label: 'Threaded rod', x: 77, y: 80,
        description: 'Connects the restraint isolator to the fan discharge and the discharge duct; it is adjusted to prevent horizontal motion.',
        hint: 'Thin green bar along the bottom, between the blue end plates.',
        prompt: 'Select the part that is adjusted to prevent horizontal motion.'
      }
    ]
  };

  FP.Overlay.mount({ root: '#overlay', data: DATA });
})();
