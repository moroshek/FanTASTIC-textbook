// High Temperature Fan Construction - FP.Overlay (callout engine) on a FanPedia drawing
// CANVAS_HEIGHT: 803
// Explore: point at or select a numbered marker to see the part (never scored). Quiz: 7
// prompts in a seeded shuffle, two attempts each, the first wrong answer shows a hint, a second
// wrong answer reveals the part; mastery is 6 of 7 on the first attempt.
// Drawing: FanPedia, Twin City Fan, p. 110 (Special Construction: High Temperature, centrifugal
// fans, general construction, with the high temp style pedestal insets), labels removed.
// Positions are % of the image; (x, y) is the point on the part, (mx, my) where the numbered
// marker sits. Recalibrate with main.html?calibrate=1.

(function () {
  'use strict';

  var DATA = {
    id: 'ch21-high-temp-construction-overlay',
    title: 'High Temperature Fan Construction',
    engine: 'callout',
    layout: 'side-panel',
    image: '../../img/overlays/ch21-high-temp-construction-overlay.png',
    width: 1200,
    height: 1167,
    alt: 'A belt driven centrifugal fan built for high temperature service, beside three close-up views of the drive end where the shaft leaves the housing',
    credit: 'Drawing: FanPedia, Twin City Fan, p. 110',
    mastery: 6,
    parts: [
      {
        id: 'shaft-seal', label: 'Shaft seal', x: 22.7, y: 9.5,
        description: 'A seal mounted on the fan housing around the shaft where it passes through the housing wall, to reduce leakage of air or gas along the shaft. The high temperature style pedestal comes with a standard shaft seal and shaft cooler (FanPedia p. 90).',
        hint: 'Red plate bolted over the shaft opening, top inset.',
        prompt: 'Select the part that reduces leakage along the shaft where it leaves the housing.'
      },
      {
        id: 'shaft-cooler', label: 'Shaft cooler', x: 17.7, y: 17.5,
        description: 'A cast aluminum wheel clamped on the shaft between the housing and the inboard bearing. It dissipates the heat transferred to the shaft from the airstream, protecting the bearings; FanPedia recommends it for applications over 300°F (p. 192).',
        hint: 'Orange finned wheel on the shaft just outside the housing, top inset.',
        prompt: 'Select the part that sheds heat from the shaft before it reaches the bearings.'
      },
      {
        id: 'bearing', label: 'Bearing', x: 9.1, y: 11.2,
        description: 'The pillow block on the high temperature style pedestal. At 301°F and above the fan has one fixed and one floating bearing, with high temperature grease.',
        hint: 'Teal block that carries the shaft, top inset.',
        prompt: 'Select the part the cooler on the shaft is there to protect.'
      },
      {
        id: 'cooler-box', label: 'Cooler box', x: 20.4, y: 86,
        description: 'An uninsulated open area built around the shaft cooler so it can dissipate heat. FanPedia (p. 110) makes it standard on fans with aluminum clad insulation and on housings with insulation pins.',
        hint: 'Purple frame around the opening, bottom inset.',
        prompt: 'Select the uninsulated open area that keeps the insulation from burying the shaft cooler.'
      },
      {
        id: 'safety-screen', label: 'Safety screen', x: 13.5, y: 77,
        description: 'A safety screen guards an opening against a person\'s hand, tools, or loose objects. High-temperature centrifugal fans include a safety screen as part of their general construction (FanPedia p. 110); here it covers the opening around the spinning shaft cooler.',
        hint: 'Yellow perforated sheet across the opening, bottom inset.',
        prompt: 'Select the guard that keeps hands out of the open area around the shaft cooler.'
      },
      {
        id: 'insulation-pins', label: 'Insulation pins', x: 44.5, y: 32.3,
        description: 'Pins attached to the outside of the housing that hold field- or vendor-applied insulation in place. They are optional on high temperature centrifugal fans (FanPedia p. 110).',
        hint: 'Short green studs all over the housing.',
        prompt: 'Select the parts that hold the housing insulation in place.'
      },
      {
        id: 'raised-access-door', label: 'Raised access door', x: 73, y: 48,
        description: 'An access door built up above the housing surface. On insulated fans FanPedia notes it is usually raised 2 inches above the insulation (p. 117), so it can be opened without cutting through the insulation; it is optional on high temperature centrifugal fans (p. 110).',
        hint: 'Blue rectangular panel on the side of the housing.',
        prompt: 'Select the part that lets someone open the housing without cutting through the insulation.'
      }
    ]
  };

  FP.Overlay.mount({ root: '#overlay', data: DATA });
})();
