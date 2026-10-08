// Exploded View of a Belt-Driven Centrifugal Fan (Arrangement 9) - HTML + inline SVG on the FanPedia kit
// CANVAS_HEIGHT: 696
// Explore mode: select a part to open its infobox (one at a time); visited parts are marked.
// Quiz mode: labels hidden, 10 fixed prompts, two attempts each, score on first attempt, mastery 9 of 10.
// The explore/quiz engine is FP.CalloutQuiz (../shared-libs/callout-quiz.js); this file draws the
// oblique SVG schematic (modeled on the FanPedia page 10 exploded view, not to scale) and adds the
// Assemble/Explode toggle.

(function () {
  'use strict';

  // ---------- Content (from the chapter specification) ----------
  var PARTS = [
    { id: 'collar', label: 'Inlet collar', text: 'Short sleeve at the inlet for a slip-fit duct connection, clamped, with no bolt holes.' },
    { id: 'flangedInlet', label: 'Flanged inlet (inlet flange)', text: 'Flat ring with a bolt-hole pattern for a bolted duct connection; mates with a companion flange shipped loose.' },
    { id: 'funnel', label: 'Inlet funnel', text: 'Aerodynamically shaped ring that funnels air smoothly into the impeller; also called inlet cone or inlet bell.' },
    { id: 'impeller', label: 'Impeller', text: 'The rotating part that adds energy to the air; air enters at its center and leaves at the blade tips.' },
    { id: 'housing', label: 'Housing', text: 'The scroll-shaped shell that encloses the impeller and guides air to the outlet; also called side, scroll or casing.' },
    { id: 'accessHole', label: 'Access hole for mounting bolts', text: 'Opening in the housing used to reach the bolts that mount the housing.' },
    { id: 'outletFlange', label: 'Outlet flange', text: 'Flat frame around the outlet with a bolt-hole pattern for the downstream duct or accessory.' },
    { id: 'shaft', label: 'Shaft', text: 'Steel bar that carries the impeller and transmits torque from the drive; with the impeller it forms the rotor assembly.' },
    { id: 'bearings', label: 'Bearings', text: 'Two bearings on the pedestal that support and locate the shaft, outside the airstream in Arrangement 9.' },
    { id: 'sheave', label: 'Sheave (pulley)', text: 'Grooved wheel on the fan shaft; with the motor sheave and belts it sets the fan speed.' },
    { id: 'belt', label: 'Belt', text: 'V-belts that carry power from the motor sheave to the fan sheave.' },
    { id: 'motor', label: 'Motor', text: 'Converts electrical energy into rotation; here it sits beside the fan and drives through belts.' },
    { id: 'slideBase', label: 'Motor slide base', text: 'Adjustable base that slides the motor to tension the belts.' },
    { id: 'pedestal', label: 'Pedestal', text: 'Support structure that carries the bearings and shaft, and in Arrangement 9 the motor slide base on its side.' }
  ];

  var QUIZ = [
    { prompt: 'Select the part that adds energy to the air.', answer: 'impeller', why: 'It is the only rotating part in the air path.' },
    { prompt: 'Select the part that funnels air smoothly into the impeller.', answer: 'funnel', why: 'The funnel shapes the inlet air; the collar and flange are duct connections.' },
    { prompt: 'Select the part a duct slips over and is clamped to.', answer: 'collar', why: 'A collar has no bolt holes; a flanged inlet is bolted.' },
    { prompt: 'Select the part that the downstream duct is bolted to.', answer: 'outletFlange', why: 'The outlet flange carries the bolt pattern for the discharge duct.' },
    { prompt: 'Select the part that carries the impeller and transmits torque to it.', answer: 'shaft', why: 'The shaft and impeller form the rotor assembly.' },
    { prompt: 'Select the parts that support and locate the shaft.', answer: 'bearings', why: 'Two bearings on the pedestal hold the shaft radially and axially.' },
    { prompt: 'Select the part that you would change to change fan speed.', answer: 'sheave', why: 'The ratio of the motor and fan sheaves sets fan speed.' },
    { prompt: 'Select the part that moves to tension the belts.', answer: 'slideBase', why: 'Sliding the motor away from the fan tightens the belts.' },
    { prompt: 'Select the part also called the scroll or casing.', answer: 'housing', why: 'Side, scroll and casing are field names for the housing.' },
    { prompt: 'Select the structure that holds the bearings and the motor slide base.', answer: 'pedestal', why: 'The pedestal is a separate support, not part of the housing.' }
  ];

  var START_PROMPT = 'Select any part to see what it does. When you are ready, switch to quiz mode.';
  var ASSEMBLED_PROMPT = 'Assembled view: the funnel and impeller are now inside the housing. Select Explode to pull the parts apart again.';
  var MASTERY = 9;

  function lower1(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

  // Spec feedback wording (chapter "Feedback" rule), passed to the engine as overrides:
  // Correct: "Correct:" + Why. Incorrect: "That is the <part selected>." + the Why of the correct
  // answer; on the second miss the correct part is highlighted and the prompt counts as missed.
  var MSG = {
    correct: function (c) { return '✓ Correct: ' + c.why; },
    retry: function (c) {
      return '✗ That is the ' + lower1(c.clickedLabel) + '. ' + c.why +
        ' Try again (' + c.attemptsLeft + ' attempt' + (c.attemptsLeft === 1 ? '' : 's') + ' left).';
    },
    missed: function (c) {
      return '✗ That is the ' + lower1(c.clickedLabel) + '. ' + c.why + ' The correct part, the ' +
        lower1(c.answerLabel) + ', is highlighted and marked "Answer". This one counts as missed.';
    },
    firstAttempt: function (n, N) { return 'Correct on first attempt: ' + n + ' of ' + N; },
    laterHeading: 'Correct on the second attempt:'
  };

  // ---------- Geometry: oblique projection of (axial a, height y, depth z) ----------
  var VBW = 1000, VBH = 470, CY = 250, KX = -0.38, KY = 0.2;
  function P(a, y, z) { return [a + KX * z, CY - y + KY * z]; }
  function f(n) { return Math.round(n * 10) / 10; }
  function path(pts, close) {
    var s = '';
    for (var i = 0; i < pts.length; i++) s += (i ? 'L' : 'M') + f(pts[i][0]) + ' ' + f(pts[i][1]);
    return s + (close === false ? '' : 'Z');
  }
  // circle in a plane of constant a
  function circ(a, yc, zc, r, n) {
    n = n || 48;
    var pts = [];
    for (var i = 0; i < n; i++) {
      var t = 2 * Math.PI * i / n;
      pts.push(P(a, yc + r * Math.sin(t), zc + r * Math.cos(t)));
    }
    return pts;
  }
  function hull(points) {
    var pts = points.slice().sort(function (p, q) { return p[0] - q[0] || p[1] - q[1]; });
    function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var lower = [], upper = [], i;
    for (i = 0; i < pts.length; i++) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) lower.pop();
      lower.push(pts[i]);
    }
    for (i = pts.length - 1; i >= 0; i--) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0) upper.pop();
      upper.push(pts[i]);
    }
    upper.pop(); lower.pop();
    return lower.concat(upper);
  }
  function el(d, fill, stroke, sw, extra) {
    return '<path d="' + d + '" fill="' + fill + '" stroke="' + (stroke || 'none') + '" stroke-width="' + (sw || 1) + '"' + (extra || '') + '/>';
  }
  // cylinder along the axis from a1 (near, visible cap) to a2
  function cylinder(a1, a2, yc, zc, r, side, cap, stroke) {
    var s = el(path(hull(circ(a1, yc, zc, r).concat(circ(a2, yc, zc, r)))), side, stroke, 1.2);
    s += el(path(circ(a1, yc, zc, r)), cap, stroke, 1.2);
    return s;
  }
  function ring(a, yc, zc, ro, ri, fill, stroke) {
    return el(path(circ(a, yc, zc, ro)) + path(circ(a, yc, zc, ri)), fill, stroke, 1.2, ' fill-rule="evenodd"');
  }
  // axis-aligned box; visible faces: a1 face, top (y2) face and near (z2) face
  function box(a1, a2, y1, y2, z1, z2, cTop, cFront, cSide, stroke) {
    var front = [P(a1, y1, z1), P(a1, y2, z1), P(a1, y2, z2), P(a1, y1, z2)];
    var top = [P(a1, y2, z1), P(a2, y2, z1), P(a2, y2, z2), P(a1, y2, z2)];
    var near = [P(a1, y1, z2), P(a1, y2, z2), P(a2, y2, z2), P(a2, y1, z2)];
    return el(path(near), cSide, stroke, 1.1) + el(path(top), cTop, stroke, 1.1) + el(path(front), cFront, stroke, 1.1);
  }

  // Part palette: the kit's part tokens (--fp-metal, --fp-metal-side, --fp-edge, --fp-motor,
  // --fp-bearing, --fp-belt); the extra shading tones are derived from them, not hard-coded.
  function hex(name) {
    var v = String(FP.tok(name) || '').trim();
    return /^#[0-9a-f]{6}$/i.test(v) ? v : FP.TOKENS[name];
  }
  // f < 0 darkens toward black, f > 0 lightens toward white.
  function shade(h, f) {
    var out = '#';
    for (var i = 1; i < 7; i += 2) {
      var c = parseInt(h.substr(i, 2), 16);
      c = f < 0 ? c * (1 + f) : c + (255 - c) * f;
      out += ('0' + Math.round(c).toString(16)).slice(-2);
    }
    return out;
  }
  var C = (function () {
    var metal = hex('metal'), side = hex('metal-side'), edge = hex('edge'),
        bearing = hex('bearing'), motor = hex('motor');
    return {
      metal: metal, metalSide: side, metalDark: shade(side, -0.18), metalFront: shade(metal, -0.07),
      edge: edge, hole: shade(edge, 0.07), holeDark: shade(edge, -0.25),
      steelSide: shade(side, -0.14), steelCap: shade(metal, -0.07),
      baseTop: shade(side, -0.1), baseFront: shade(side, -0.24), baseDark: shade(side, -0.33),
      teal: bearing, tealSide: shade(bearing, -0.24), tealEdge: shade(bearing, -0.53),
      motor: motor, motorSide: shade(motor, -0.24), motorFeet: shade(motor, -0.38),
      motorFin: shade(motor, -0.32), motorEdge: shade(motor, -0.58),
      sheaveSide: shade(edge, 0.19), sheaveRing: shade(edge, 0.28), sheaveEdge: shade(edge, -0.38),
      belt: hex('belt')
    };
  })();

  // Housing scroll profile in the (z, y) plane, from the cutoff around to the outlet.
  var HA1 = 430, HA2 = 580, OUT_TOP = 125;
  function scrollProfile() {
    var pts = [], p0 = 100, p1 = 360;
    for (var d = p0; d <= p1; d += 5) {
      var r = 90 + 45 * (d - p0) / (p1 - p0), t = d * Math.PI / 180;
      pts.push([r * Math.cos(t), r * Math.sin(t)]); // [z, y]
    }
    var zc = pts[0][0], ze = pts[pts.length - 1][0];
    pts.push([ze, OUT_TOP]);
    pts.push([zc, OUT_TOP]);
    return { pts: pts, zCut: zc, zEnd: ze };
  }
  var SCROLL = scrollProfile();
  function faceAt(a) { return SCROLL.pts.map(function (q) { return P(a, q[1], q[0]); }); }

  // ---------- Part drawings (exploded positions are the drawing positions) ----------
  // Each part: svg markup in its *assembled* location plus an explode offset [dx, dy] in screen units.
  var DRAW = {};
  DRAW.housing = function () {
    var s = '';
    for (var i = 0; i <= 24; i++) {
      var a = HA2 - (HA2 - HA1) * i / 24;
      s += el(path(faceAt(a)), C.metalSide, C.metalSide, 1.6);
    }
    s += el(path(faceAt(HA1)), C.metal, C.edge, 1.4);
    s += el(path(circ(HA1, 0, 0, 62)), C.hole, C.edge, 1.2);
    var zc = SCROLL.zCut, ze = SCROLL.zEnd;
    s += el(path([P(HA1, OUT_TOP, zc), P(HA2, OUT_TOP, zc), P(HA2, OUT_TOP, ze), P(HA1, OUT_TOP, ze)]), C.hole, C.edge, 1.2);
    // base rails
    s += box(HA1 - 10, HA2 + 10, -170, -150, -40, 150, C.metal, C.metalSide, C.metalDark, C.edge);
    s += el(path([P(HA1, -150, 150), P(HA1, -112, 150), P(HA1 + 12, -112, 150), P(HA1 + 12, -150, 150)]), C.metalSide, C.edge, 1);
    s += el(path([P(HA2 - 12, -150, 150), P(HA2 - 12, -112, 150), P(HA2, -112, 150), P(HA2, -150, 150)]), C.metalSide, C.edge, 1);
    return s;
  };
  DRAW.accessHole = function () {
    // small opening on the near wall of the scroll, low on the drive side
    var a1 = 520, a2 = 556, y1 = -62, y2 = -36, z = 130;
    var pts = [P(a1, y1, z), P(a1, y2, z), P(a2, y2, z), P(a2, y1, z)];
    return el(path(pts), C.holeDark, C.edge, 1.2) +
      '<path d="' + path(pts) + '" fill="transparent" stroke="transparent" stroke-width="14"/>';
  };
  DRAW.outletFlange = function () {
    var zc = SCROLL.zCut, ze = SCROLL.zEnd, y = OUT_TOP, m = 14;
    var outer = [P(HA1 - m, y, zc - m), P(HA2 + m, y, zc - m), P(HA2 + m, y, ze + m), P(HA1 - m, y, ze + m)];
    var inner = [P(HA1, y, zc), P(HA2, y, zc), P(HA2, y, ze), P(HA1, y, ze)];
    var lip = [P(HA1 - m, y, ze + m), P(HA2 + m, y, ze + m), P(HA2 + m, y - 6, ze + m), P(HA1 - m, y - 6, ze + m)];
    var lip2 = [P(HA1 - m, y, zc - m), P(HA1 - m, y, ze + m), P(HA1 - m, y - 6, ze + m), P(HA1 - m, y - 6, zc - m)];
    var s = el(path(lip2), C.metalSide, C.edge, 1) + el(path(lip), C.metalSide, C.edge, 1);
    s += el(path(outer) + path(inner), C.metal, C.edge, 1.2, ' fill-rule="evenodd"');
    var holes = [[HA1 - 7, zc + 20], [HA1 - 7, ze - 20], [HA2 + 7, zc + 20], [HA2 + 7, ze - 20], [505, zc - 7], [505, ze + 7]];
    holes.forEach(function (h) { var q = P(h[0], y, h[1]); s += '<circle cx="' + f(q[0]) + '" cy="' + f(q[1]) + '" r="2.4" fill="' + C.edge + '"/>'; });
    return s;
  };
  DRAW.impeller = function () {
    var a1 = 470, a2 = 540, r = 84, s = '';
    s += el(path(circ(a2, 0, 0, r + 2)), C.metalDark, C.edge, 1.2); // back plate
    var blades = '';
    for (var i = 0; i < 24; i++) {
      var t = 2 * Math.PI * i / 24, t2 = t + 0.18;
      var p1 = P(a1 + 6, r * Math.sin(t), r * Math.cos(t));
      var p2 = P(a2 - 2, r * Math.sin(t2), r * Math.cos(t2));
      var p3 = P(a2 - 2, (r - 22) * Math.sin(t2 + 0.25), (r - 22) * Math.cos(t2 + 0.25));
      blades += 'M' + f(p1[0]) + ' ' + f(p1[1]) + 'L' + f(p2[0]) + ' ' + f(p2[1]) + 'L' + f(p3[0]) + ' ' + f(p3[1]);
    }
    s += '<path d="' + blades + '" fill="none" stroke="' + C.edge + '" stroke-width="1.6"/>';
    s += el(path(circ(a2 - 1, 0, 0, 16)), C.metalSide, C.edge, 1);
    s += ring(a1, 0, 0, r, 56, C.metal, C.edge); // front shroud
    return s;
  };
  DRAW.funnel = function () {
    var a1 = 430, a2 = 476, s = '';
    s += el(path(hull(circ(a1, 0, 0, 60).concat(circ(a2, 0, 0, 48)))), C.metalSide, C.edge, 1.2);
    s += ring(a1, 0, 0, 80, 60, C.metal, C.edge);
    s += el(path(circ(a1 + 4, 0, 0, 58)), C.hole, 'none', 1);
    s += ring(a1 + 4, 0, 0, 60, 52, C.metalSide, 'none');
    return s;
  };
  DRAW.collar = function () {
    return cylinder(400, 430, 0, 0, 62, C.metalSide, C.metal, C.edge) + el(path(circ(400, 0, 0, 56)), C.hole, C.edge, 1);
  };
  DRAW.flangedInlet = function () {
    // inset: flat ring with bolt holes (shown as the alternative inlet connection)
    var cx = 110, cy = 395, s = '';
    s += '<g class="xcf-inset"><rect x="22" y="312" width="176" height="150" rx="6"/>' +
      '<text x="32" y="331">Inlet option</text></g>';
    s += '<ellipse cx="' + cx + '" cy="' + (cy + 4) + '" rx="34" ry="56" fill="' + C.metalSide + '" stroke="' + C.edge + '"/>';
    s += '<ellipse cx="' + (cx - 6) + '" cy="' + cy + '" rx="34" ry="56" fill="' + C.metal + '" stroke="' + C.edge + '" stroke-width="1.2"/>';
    s += '<ellipse cx="' + (cx - 6) + '" cy="' + cy + '" rx="22" ry="38" fill="#ffffff" stroke="' + C.edge + '"/>';
    for (var i = 0; i < 12; i++) {
      var t = 2 * Math.PI * i / 12;
      s += '<circle cx="' + f(cx - 6 + 28 * Math.cos(t)) + '" cy="' + f(cy + 47 * Math.sin(t)) + '" r="2.4" fill="' + C.edge + '"/>';
    }
    return s;
  };
  DRAW.shaft = function () {
    return cylinder(498, 842, 0, 0, 7, C.steelSide, C.steelCap, C.edge);
  };
  DRAW.bearings = function () {
    var s = '';
    [626, 700].forEach(function (a) {
      s += box(a - 9, a + 9, -30, -18, -34, 34, C.teal, C.tealSide, C.tealSide, C.tealEdge);
      s += cylinder(a - 9, a + 9, 0, 0, 17, C.tealSide, C.teal, C.tealEdge);
      s += el(path(circ(a - 9, 0, 0, 7)), C.steelCap, C.edge, 1);
    });
    return s;
  };
  DRAW.pedestal = function () {
    var s = box(600, 726, -170, -30, -60, 60, C.metal, C.metalFront, C.metalSide, C.edge);
    s += box(596, 730, -30, -24, -64, 64, C.metal, C.metalSide, C.metalDark, C.edge);
    return s;
  };
  DRAW.slideBase = function () {
    var s = box(668, 812, -176, -164, 66, 156, C.baseTop, C.baseFront, C.baseFront, C.edge);
    [690, 790].forEach(function (a) {
      s += box(a - 6, a + 6, -164, -156, 70, 152, C.baseFront, C.baseDark, C.baseDark, C.edge);
    });
    return s;
  };
  DRAW.motor = function () {
    var yc = -120, zc = 111, s = '';
    s += box(684, 792, -156, -146, 80, 142, C.motorSide, C.motorSide, C.motorFeet, C.motorEdge); // feet
    s += cylinder(690, 790, yc, zc, 34, C.motorSide, C.motor, C.motorEdge);
    var fins = '';
    for (var i = -3; i <= 3; i++) {
      var y = yc + i * 9;
      var p1 = P(700, y, zc + Math.sqrt(34 * 34 - (i * 9) * (i * 9)));
      var p2 = P(785, y, zc + Math.sqrt(34 * 34 - (i * 9) * (i * 9)));
      fins += 'M' + f(p1[0]) + ' ' + f(p1[1]) + 'L' + f(p2[0]) + ' ' + f(p2[1]);
    }
    s += '<path d="' + fins + '" stroke="' + C.motorFin + '" stroke-width="1.2" fill="none"/>';
    s += box(722, 752, yc + 30, yc + 44, zc - 14, zc + 14, C.motor, C.motorSide, C.motorSide, C.motorEdge); // terminal box
    s += cylinder(790, 832, yc, zc, 5, C.steelSide, C.steelCap, C.edge); // motor shaft stub
    s += cylinder(816, 830, yc, zc, 20, C.sheaveSide, C.steelSide, C.sheaveEdge); // motor sheave
    return s;
  };
  DRAW.sheave = function () {
    var a = 822, s = cylinder(a, a + 18, 0, 0, 44, C.sheaveSide, C.steelSide, C.sheaveEdge);
    s += ring(a, 0, 0, 44, 34, C.sheaveRing, C.sheaveEdge);
    var spokes = '';
    for (var i = 0; i < 5; i++) {
      var t = 2 * Math.PI * i / 5 + 0.3, p1 = P(a, 9 * Math.sin(t), 9 * Math.cos(t)), p2 = P(a, 34 * Math.sin(t), 34 * Math.cos(t));
      spokes += 'M' + f(p1[0]) + ' ' + f(p1[1]) + 'L' + f(p2[0]) + ' ' + f(p2[1]);
    }
    s += '<path d="' + spokes + '" stroke="' + C.sheaveEdge + '" stroke-width="5" fill="none"/>';
    s += el(path(circ(a, 0, 0, 10)), C.steelSide, C.sheaveEdge, 1.2);
    return s;
  };
  DRAW.belt = function () {
    // V-belt loop around the fan sheave (y=0, z=0) and the motor sheave (y=-120, z=111)
    var a = 826, pts = circ(a, 0, 0, 46, 64).concat(circ(a, -120, 111, 22, 64));
    var loop = path(hull(pts));
    return '<path d="' + loop + '" fill="none" stroke="' + C.belt + '" stroke-width="5" stroke-linejoin="round"/>' +
      '<path d="' + loop + '" fill="none" stroke="transparent" stroke-width="16"/>';
  };

  // Explode offsets (screen units); [0,0] = assembled drawing position
  var EXPLODE = {
    collar: [-330, 0], funnel: [-262, 0], impeller: [-176, 0], housing: [0, 0], accessHole: [0, 0],
    outletFlange: [0, -58], shaft: [64, -92], bearings: [64, -92], sheave: [138, -92], belt: [138, -92],
    motor: [138, -92], slideBase: [138, -40], pedestal: [64, 8], flangedInlet: [0, 0]
  };
  // Back-to-front draw order (later = in front)
  var ORDER_EXPLODED = ['pedestal', 'slideBase', 'motor', 'belt', 'sheave', 'shaft', 'bearings', 'housing', 'accessHole', 'outletFlange', 'impeller', 'funnel', 'collar', 'flangedInlet'];
  var ORDER_ASSEMBLED = ['pedestal', 'slideBase', 'motor', 'belt', 'sheave', 'shaft', 'bearings', 'impeller', 'funnel', 'housing', 'accessHole', 'outletFlange', 'collar', 'flangedInlet'];

  // Label boxes in the exploded view: [label x, label y, anchor fx, anchor fy]
  // The leader-line anchor is the point (fx, fy) inside the part's bounding box, in its exploded position.
  var LABELS = {
    collar: [18, 120, 0.4, 0.3],
    funnel: [130, 78, 0.45, 0.2],
    impeller: [262, 48, 0.4, 0.15],
    housing: [412, 52, 0.55, 0.25],
    outletFlange: [604, 30, 0.8, 0.5],
    accessHole: [628, 236, 0.5, 0.5],
    shaft: [772, 196, 0.8, 0.5],
    bearings: [652, 100, 0.15, 0.1],
    sheave: [884, 82, 0.6, 0.15],
    belt: [900, 226, 0.93, 0.5],
    motor: [880, 362, 0.75, 0.75],
    slideBase: [826, 438, 0.6, 0.6],
    pedestal: [640, 418, 0.35, 0.8],
    flangedInlet: [212, 440, 0.6, 0.8]
  };

  // ---------- Build the SVG, then hand the parts to FP.CalloutQuiz ----------
  var NS = 'http://www.w3.org/2000/svg';
  var exploded = true, orderTimer = null;
  var root, svg, partsLayer, groups = {}, quiz, btnToggle, btnStart;
  var quizOpts;

  function build() {
    root = document.getElementById('drawing');
    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + VBW + ' ' + VBH);
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', 'Exploded view of a belt-driven centrifugal fan, Arrangement 9');
    partsLayer = document.createElementNS(NS, 'g');
    var labelsLayer = document.createElementNS(NS, 'g');
    svg.appendChild(partsLayer);
    svg.appendChild(labelsLayer);
    root.insertBefore(svg, root.firstChild);

    PARTS.forEach(function (p) {
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'xcf-part');
      g.setAttribute('data-part', p.id);
      g.innerHTML = '<g class="xcf-shape">' + DRAW[p.id]() + '</g>';
      groups[p.id] = g;
      var lg = document.createElementNS(NS, 'g');
      lg.setAttribute('class', 'xcf-lbl');
      lg.setAttribute('data-label-for', p.id);
      lg.setAttribute('aria-hidden', 'true');
      lg.innerHTML = '<line/><rect rx="3"/><text></text>';
      lg.querySelector('text').textContent = p.label;
      labelsLayer.appendChild(lg);
    });
    applyOrder();
    applyPositions();
    sizeLabels(labelsLayer);

    quizOpts = {
      root: root,
      id: 'ch03-exploded-centrifugal-fan',
      parts: PARTS,
      prompts: QUIZ,
      attempts: 2,
      mastery: MASTERY,
      order: 'fixed',
      scoreNoun: 'Prompts',
      explorePrompt: START_PROMPT,
      exploreEmpty: 'No part selected. Parts you have opened get a ✓ mark and a shaded label. Use Assemble to see how the parts fit together.',
      infoHeight: 132,
      msg: MSG,
      onModeChange: function (mode) {
        // Quiz mode always works on the exploded drawing; Assemble is available in explore mode only.
        if (mode !== 'explore') setExploded(true);
        btnToggle.disabled = mode !== 'explore';
      }
    };
    quiz = FP.CalloutQuiz.mount(quizOpts);

    btnToggle = document.createElement('button');
    btnToggle.type = 'button';
    btnToggle.className = 'fp-btn secondary';
    btnToggle.textContent = 'Assemble';
    btnToggle.addEventListener('click', toggleAssembly);
    btnStart = document.createElement('button');
    btnStart.type = 'button';
    btnStart.className = 'fp-btn secondary';
    btnStart.textContent = 'Start over';
    btnStart.title = 'Clear visited parts and the quiz, and return to the exploded view in explore mode';
    btnStart.addEventListener('click', startOver);
    quiz.ui.toolbar.insertBefore(btnToggle, quiz.ui.status);
    quiz.ui.toolbar.insertBefore(btnStart, quiz.ui.status);
  }

  // Size label boxes to their text, keep them inside the drawing, draw the leader lines.
  function sizeLabels(layer) {
    PARTS.forEach(function (p) {
      var lg = layer.querySelector('[data-label-for="' + p.id + '"]'), L = LABELS[p.id];
      var bb = groups[p.id].querySelector('.xcf-shape').getBBox(), o = EXPLODE[p.id];
      var ax = bb.x + L[2] * bb.width + o[0], ay = bb.y + L[3] * bb.height + o[1];
      var t = lg.querySelector('text'), r = lg.querySelector('rect'), ln = lg.querySelector('line');
      var w = t.getComputedTextLength ? t.getComputedTextLength() : 0;
      if (!w) w = p.label.length * 8;
      var x = Math.max(4, Math.min(L[0], VBW - w - 18));
      t.setAttribute('x', x + 7);
      t.setAttribute('y', L[1] + 5);
      r.setAttribute('x', x);
      r.setAttribute('y', L[1] - 12);
      r.setAttribute('width', w + 14);
      r.setAttribute('height', 24);
      // leader line ends at the nearest edge point of the label box
      var cx = Math.max(x, Math.min(ax, x + w + 14)), cyy = Math.max(L[1] - 11, Math.min(ay, L[1] + 11));
      ln.setAttribute('x1', f(ax));
      ln.setAttribute('y1', f(ay));
      ln.setAttribute('x2', cx);
      ln.setAttribute('y2', cyy);
      lg.insertAdjacentHTML('afterbegin', '<circle cx="' + f(ax) + '" cy="' + f(ay) + '" r="2.6"/>');
    });
  }

  function applyOrder() {
    (exploded ? ORDER_EXPLODED : ORDER_ASSEMBLED).forEach(function (id) { partsLayer.appendChild(groups[id]); });
  }
  function applyPositions() {
    PARTS.forEach(function (p) {
      var o = exploded ? EXPLODE[p.id] : [0, 0];
      groups[p.id].style.transform = 'translate(' + o[0] + 'px,' + o[1] + 'px)';
    });
  }

  // Assembled view: inner parts slide into the housing; labels show only when exploded.
  function setExploded(on, animate) {
    if (on === exploded && !animate) return;
    exploded = on;
    btnToggle.textContent = exploded ? 'Assemble' : 'Explode';
    root.classList.toggle('xcf-assembled', !exploded);
    clearTimeout(orderTimer);
    if (exploded || !animate) {
      applyOrder();          // bring inner parts forward as they slide out
      applyPositions();
    } else {
      applyPositions();
      orderTimer = setTimeout(applyOrder, 900); // hide inner parts once they are inside the housing
    }
    quizOpts.explorePrompt = exploded ? START_PROMPT : ASSEMBLED_PROMPT;
    quiz.render();
  }
  function toggleAssembly() {
    if (quiz.state.mode !== 'explore') return;
    setExploded(!exploded, true);
    FP.announce(exploded ? 'Exploded view.' : ASSEMBLED_PROMPT);
  }

  // Start over: clear visited parts and the quiz, return to the exploded view in explore mode.
  function startOver() {
    quiz.state.visited = {};
    quiz.state.selected = null;
    quiz.setMode('explore');   // onModeChange re-enables Assemble
    setExploded(true);
    quiz.render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
