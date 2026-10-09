// Parts of a Centrifugal Scroll Housing - HTML + inline SVG on the FanPedia kit
// CANVAS_HEIGHT: 775
// Explore mode: every part is outlined; hovering shows its name, clicking opens its infobox
// (never scored). Quiz mode: labels hidden; "Click the <part>." for all 10 parts in a shuffled
// order, two attempts each; mastery is 9 of 10 on the first attempt. Retake quiz reshuffles.
// The explore/quiz engine is FP.CalloutQuiz (../shared-libs/callout-quiz.js). This file draws a
// cabinet-oblique view of an SWSI housing from the inlet side, with part of the side sheet cut
// away to show the impeller, plus an inset section through the inlet (based on FanPedia
// pp. 59-60; simplified, not to scale).

(function () {
  'use strict';

  var SIM_ID = 'ch04-scroll-housing-parts';

  // ---------- Content (chapter 4 specification, "Content" table) ----------
  var PARTS = [
    { id: 'scroll', label: 'Housing scroll', text: 'The curved wrapper that forms the spiral. Its passage grows from the cutoff to the outlet, slowing the air and recovering static pressure.' },
    { id: 'side', label: 'Housing side', text: 'A flat side sheet that closes the spiral. The inlet opening is cut into it. FanPedia notes the whole housing is also called the side, scroll or casing.' },
    { id: 'cutoff', label: 'Cutoff', text: 'The point near the outlet where the scroll passes closest to the impeller tips; it separates air leaving through the outlet from air that would keep circling.' },
    { id: 'wiper', label: 'Wiper bar', text: 'Helps direct air through the housing in the inlet funnel area to prevent turbulence and increase efficiency.' },
    { id: 'funnel', label: 'Inlet funnel', text: 'Guides air smoothly into the eye of the impeller. Also called the inlet cone.' },
    { id: 'collar', label: 'Inlet collar', text: 'A short round sleeve on the inlet side for connecting duct.' },
    { id: 'inletFlange', label: 'Inlet flange', text: 'A bolting rim on the inlet side for connecting duct or accessories.' },
    { id: 'outletFlange', label: 'Outlet (discharge) flange', text: 'The bolting rim around the outlet, where the discharge duct attaches.' },
    { id: 'framing', label: 'Framing', text: 'Structural members that stiffen and support the housing.' },
    { id: 'pedestal', label: 'Pedestal', text: 'Structure that carries the bearings and drive; present on some arrangements only.' }
  ];
  var TAB_ORDER = ['outletFlange', 'cutoff', 'scroll', 'side', 'wiper', 'framing', 'pedestal', 'inletFlange', 'collar', 'funnel'];
  var MASTERY = 9;

  function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

  // Quiz prompt format (spec): "Click the <part name>." The why is the infobox text, which the
  // summary lists for every missed part.
  var PROMPTS = FP.CalloutQuiz.promptsFromParts(PARTS, {
    template: function (p) { return 'Click the ' + lowerFirst(p.label) + '.'; }
  });
  PROMPTS.forEach(function (q) { q.id = q.answer; });

  // The engine is created first so the running score line can show first-attempt correct answers.
  var state = new FP.CalloutQuiz.State({
    id: SIM_ID, parts: PARTS, prompts: PROMPTS, attempts: 2, mastery: MASTERY, order: 'shuffle'
  });

  // Spec feedback wording, passed to the engine as overrides:
  // Correct "Correct: <part name>."; first wrong "That is the <part clicked>. Try again.";
  // second wrong: the correct part is highlighted with its infobox text and counts as missed.
  var MSG = {
    correct: function (c) { return '✓ Correct: ' + c.answerLabel + '.'; },
    retry: function (c) { return '✗ That is the ' + lowerFirst(c.clickedLabel) + '. Try again.'; },
    missed: function (c) {
      return '✗ That is the ' + lowerFirst(c.clickedLabel) + '. The highlighted part is the ' +
        lowerFirst(c.answerLabel) + ': ' + c.answerText + ' This one counts as missed.';
    },
    score: function () { return 'First-attempt correct: ' + state.score() + ' of ' + state.prompts.length; },
    quizIntro: 'Labels are hidden. Click the part named above. You have 2 attempts per part; only the first counts toward the score.',
    next: 'Next part',
    startOver: 'Retake quiz',
    laterHeading: 'Correct on the second attempt (not counted in the score):',
    reviewPointer: 'Review the missed parts in Explore mode, then press Retake quiz.'
  };

  // ---------- Geometry: cabinet oblique. Front (inlet side) plane z = 0; +z runs to the drive side ----------
  var VBW = 900, VBH = 500;
  var CX = 300, CY = 275;                 // inlet centre on the inlet side sheet
  var DX = 0.8, DY = -0.3;                // screen offset per unit of depth
  var W = 110;                            // housing width (side sheet to side sheet)
  var TOP = CY - 205;                     // outlet top
  var A0 = -15, A1 = 270, R0 = 104, R1 = 168;   // scroll: cutoff angle/radius to outer-wall angle/radius
  var FLOOR = 450;
  var R_IN = 50;                          // inlet opening radius
  var CUT_A0 = 60, CUT_A1 = 174;          // cut-away window in the side sheet (angles)

  function P(x, y, z) { return [x + DX * z, y + DY * z]; }
  function f(n) { return Math.round(n * 10) / 10; }
  function path(pts, close) {
    var s = '';
    for (var i = 0; i < pts.length; i++) s += (i ? 'L' : 'M') + f(pts[i][0]) + ' ' + f(pts[i][1]);
    return s + (close === false ? '' : 'Z');
  }
  function rad(a) { return a * Math.PI / 180; }
  function scrollR(a) { return R0 + (R1 - R0) * (a - A0) / (A1 - A0); }
  function polar(a, r, cx, cy) { return [(cx || CX) + r * Math.sin(rad(a)), (cy || CY) - r * Math.cos(rad(a))]; }
  var X_IN = CX + R0 * Math.sin(rad(A0));   // inner (cutoff-side) outlet wall
  var X_OUT = CX - R1;                       // outer outlet wall
  var CUT = polar(A0, R0);                   // cutoff point on the front sheet

  // Scroll outline in the front plane: cutoff -> spiral -> outer wall -> outlet top -> inner wall.
  function outline() {
    var pts = [];
    for (var a = A0; a <= A1; a += 5) pts.push(polar(a, scrollR(a)));
    pts.push([X_OUT, TOP]);
    pts.push([X_IN, TOP]);
    return pts;
  }
  function shift(pts, z) { return pts.map(function (p) { return P(p[0], p[1], z); }); }
  function circlePts(cx, cy, r, n) {
    n = n || 48;
    var out = [];
    for (var i = 0; i < n; i++) {
      var t = 2 * Math.PI * i / n;
      out.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
    }
    return out;
  }
  function hull(points) {
    var pts = points.slice().sort(function (p, q) { return p[0] - q[0] || p[1] - q[1]; });
    function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var lo = [], up = [], i;
    for (i = 0; i < pts.length; i++) {
      while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], pts[i]) <= 0) lo.pop();
      lo.push(pts[i]);
    }
    for (i = pts.length - 1; i >= 0; i--) {
      while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], pts[i]) <= 0) up.pop();
      up.push(pts[i]);
    }
    up.pop(); lo.pop();
    return lo.concat(up);
  }
  // Annular sector (angles a0..a1, radius r0..r1(a)) around (cx, cy) as a closed point list.
  function sector(a0, a1, r0, r1, cx, cy) {
    var pts = [], a;
    for (a = a0; a <= a1; a += 3) pts.push(polar(a, typeof r1 === 'function' ? r1(a) : r1, cx, cy));
    for (a = a1; a >= a0; a -= 3) pts.push(polar(a, r0, cx, cy));
    return pts;
  }
  function el(d, fill, stroke, sw, extra) {
    return '<path d="' + d + '" fill="' + fill + '" stroke="' + (stroke || 'none') + '" stroke-width="' +
      (sw || 1) + '"' + (extra || '') + '/>';
  }
  function hot(d, extra) { return '<path class="shp-hot" d="' + d + '"' + (extra || '') + '/>'; }
  function line(a, b, stroke, sw, extra) {
    return '<line x1="' + f(a[0]) + '" y1="' + f(a[1]) + '" x2="' + f(b[0]) + '" y2="' + f(b[1]) +
      '" stroke="' + stroke + '" stroke-width="' + (sw || 1) + '"' + (extra || '') + '/>';
  }
  function circle(c, r, fill, stroke, sw) {
    return '<circle cx="' + f(c[0]) + '" cy="' + f(c[1]) + '" r="' + f(r) + '" fill="' + fill +
      '" stroke="' + (stroke || 'none') + '" stroke-width="' + (sw || 1) + '"/>';
  }
  function rectPath(x1, y1, x2, y2) { return path([[x1, y1], [x2, y1], [x2, y2], [x1, y2]]); }
  // A box with its front (z1), top (y1) and right (x2) faces visible. y1 < y2 on screen.
  function box(x1, x2, y1, y2, z1, z2, cTop, cFront, cSide, stroke) {
    var front = [P(x1, y1, z1), P(x2, y1, z1), P(x2, y2, z1), P(x1, y2, z1)];
    var top = [P(x1, y1, z1), P(x2, y1, z1), P(x2, y1, z2), P(x1, y1, z2)];
    var side = [P(x2, y1, z1), P(x2, y1, z2), P(x2, y2, z2), P(x2, y2, z1)];
    return el(path(side), cSide, stroke, 1.1) + el(path(top), cTop, stroke, 1.1) + el(path(front), cFront, stroke, 1.1);
  }
  function boxHull(x1, x2, y1, y2, z1, z2) {
    return hull([P(x1, y1, z1), P(x2, y1, z1), P(x2, y2, z1), P(x1, y2, z1),
      P(x1, y1, z2), P(x2, y1, z2), P(x2, y2, z2), P(x1, y2, z2)]);
  }

  // ---------- Colours: the kit's part tokens, plus shades derived from them ----------
  function hex(name) {
    var v = String(FP.tok(name) || '').trim();
    return /^#[0-9a-f]{6}$/i.test(v) ? v : FP.TOKENS[name];
  }
  function shade(h, k) {
    var out = '#';
    for (var i = 1; i < 7; i += 2) {
      var c = parseInt(h.substr(i, 2), 16);
      c = k < 0 ? c * (1 + k) : c + (255 - c) * k;
      out += ('0' + Math.round(c).toString(16)).slice(-2);
    }
    return out;
  }
  var C = (function () {
    var metal = hex('metal'), side = hex('metal-side'), edge = hex('edge'), bearing = hex('bearing');
    return {
      plate: shade(metal, 0.35), metal: metal, side: side, dark: shade(side, -0.2), edge: edge,
      hole: shade(edge, -0.25), interior: shade(edge, 0.25), blade: shade(metal, -0.15), bearing: bearing,
      frame: shade(side, -0.08), tongue: shade(edge, 0.05), wiper: shade(edge, -0.1), centre: hex('text-muted'),
      white: '#ffffff', muted: hex('text-muted')
    };
  })();

  // ---------- Main view: part drawings (each returns SVG markup) ----------
  var DRAW = {};
  DRAW.scroll = function () {
    var o = outline(), back = shift(o, W), s = '';
    // the curved wrapper: one face per outline edge, except the open outlet top
    for (var i = 0; i < o.length; i++) {
      var j = (i + 1) % o.length;
      if (i === o.length - 2) continue;   // outer wall top -> inner wall top is the outlet mouth
      s += el(path([o[i], o[j], back[j], back[i]]), C.side, C.side, 0.6);
    }
    s += el(path(back), 'none', C.edge, 1.3);
    s += el(path([[X_OUT, TOP], [X_IN, TOP], P(X_IN, TOP, W), P(X_OUT, TOP, W)]), C.hole, C.edge, 1.2);
    var tan = 180 + Math.atan2(DY, DX) * 180 / Math.PI;   // where the wrapper turns away from view
    var t = polar(tan, scrollR(tan));
    s += line(t, P(t[0], t[1], W), C.edge, 1.3);
    s += line([X_IN, TOP], P(X_IN, TOP, W), C.edge, 1.3);
    s += hot(path(back));
    return s;
  };
  // Inside of the housing, seen through the inlet and the cut-away window (decor, not a part).
  function interior() {
    var s = el(path(outline()), C.interior, 'none', 1);
    // impeller: back plate disc and backward inclined blades, centre slightly toward the drive side
    var c = P(CX, CY, W * 0.45);
    s += circle(c, 97, shade(C.metal, -0.05), C.edge, 1.2);
    for (var k = 0; k < 14; k++) {
      var t = 2 * Math.PI * k / 14;
      var a = [c[0] + 44 * Math.cos(t), c[1] + 44 * Math.sin(t)];
      var b = [c[0] + 94 * Math.cos(t - 0.45), c[1] + 94 * Math.sin(t - 0.45)];
      s += line(a, b, C.dark, 6, ' stroke-linecap="round"');
    }
    s += circle(c, 42, shade(C.metal, 0.2), C.edge, 1.2);
    s += circle(c, 14, C.dark, C.edge, 1);
    return '<clipPath id="shp-clip"><path d="' + path(outline()) + '"/></clipPath>' +
      '<g aria-hidden="true" clip-path="url(#shp-clip)">' + s + '</g>';
  }
  DRAW.side = function () {
    var o = outline(), s = '';
    var cutaway = sector(CUT_A0, CUT_A1, R_IN + 24, function (a) { return scrollR(a) - 13; });
    var holes = path(circlePts(CX, CY, R_IN)) + path(cutaway);
    s += el(path(o) + holes, C.plate, C.edge, 1.6, ' fill-rule="evenodd"');
    // torn edge of the cut-away window
    s += el(path(cutaway), 'none', C.dark, 2.2, ' stroke-dasharray="7 3"');
    s += hot(path(o) + holes, ' fill-rule="evenodd"');
    return s;
  };
  // Inlet hardware seen end-on (decor; the parts are picked in the inset).
  function inletEnd() {
    var s = '';
    s += el(path(circlePts(CX, CY, R_IN + 18)) + path(circlePts(CX, CY, R_IN + 6)), C.metal, C.edge, 1.3, ' fill-rule="evenodd"');
    for (var k = 0; k < 8; k++) {
      var t = 2 * Math.PI * (k + 0.5) / 8;
      s += circle([CX + (R_IN + 12) * Math.cos(t), CY + (R_IN + 12) * Math.sin(t)], 2.4, C.hole, 'none');
    }
    s += el(path(circlePts(CX, CY, R_IN + 6)) + path(circlePts(CX, CY, R_IN - 2)), C.side, C.edge, 1, ' fill-rule="evenodd"');
    s += el(path(circlePts(CX, CY, R_IN - 2)) + path(circlePts(CX + 5, CY - 2, 33)), shade(C.metal, 0.15), C.edge, 1, ' fill-rule="evenodd"');
    return '<g aria-hidden="true" pointer-events="none">' + s + '</g>';
  }
  DRAW.cutoff = function () {
    var a = CUT, b = P(CUT[0], CUT[1], W), s = '';
    s += line([a[0] + 3, a[1] - 2], [b[0] + 3, b[1] - 2], C.tongue, 11, ' stroke-linecap="round"');
    s += line([a[0] + 1, a[1] - 4], [b[0] + 1, b[1] - 4], C.metal, 3, ' stroke-linecap="round"');
    var n = 12, ux = (b[0] - a[0]), uy = (b[1] - a[1]), L = Math.sqrt(ux * ux + uy * uy);
    var px = -uy / L * n, py = ux / L * n;
    s += hot(path([[a[0] - px - 4, a[1] - py], [b[0] - px + 4, b[1] - py], [b[0] + px + 4, b[1] + py], [a[0] + px - 4, a[1] + py]]));
    return s;
  };
  DRAW.wiper = function () {
    var r = R_IN + 38, pts = [];
    for (var a = 104; a <= 150; a += 4) pts.push(polar(a, r));
    var s = '<path d="' + path(pts, false) + '" fill="none" stroke="' + C.wiper + '" stroke-width="9" stroke-linecap="round"/>';
    s += hot(path(sector(98, 156, r - 11, r + 11)));
    return s;
  };
  DRAW.outletFlange = function () {
    var e = 13;
    var inner = [[X_OUT, TOP], [X_IN, TOP], P(X_IN, TOP, W), P(X_OUT, TOP, W)];
    var outer = [P(X_OUT - e, TOP, -e), P(X_IN + e, TOP, -e), P(X_IN + e, TOP, W + e), P(X_OUT - e, TOP, W + e)];
    var lip = [outer[0], outer[1], [outer[1][0], outer[1][1] + 6], [outer[0][0], outer[0][1] + 6]];
    var lipR = [outer[1], outer[2], [outer[2][0], outer[2][1] + 6], [outer[1][0], outer[1][1] + 6]];
    var s = el(path(lip), C.side, C.edge, 1) + el(path(lipR), C.dark, C.edge, 1);
    s += el(path(outer) + path(inner.slice().reverse()), C.metal, C.edge, 1.3, ' fill-rule="evenodd"');
    [[0.15, -0.5], [0.5, -0.5], [0.85, -0.5], [0.15, 1.5], [0.5, 1.5], [0.85, 1.5]].forEach(function (h) {
      var x = X_OUT + (X_IN - X_OUT) * h[0];
      s += circle(P(x, TOP, h[1] < 0 ? -e / 2 : W + e / 2), 2.4, C.hole, 'none');
    });
    s += hot(path(hull(outer.concat([[outer[0][0], outer[0][1] + 6], [outer[1][0], outer[1][1] + 6], [outer[2][0], outer[2][1] + 6]]))) + path(inner.slice().reverse()), ' fill-rule="evenodd"');
    return s;
  };
  DRAW.framing = function () {
    var s = '', hp = '';
    [CX - 125, CX + 128].forEach(function (x) {
      var dx = x - CX;
      var a = 180 + Math.asin(Math.max(-1, Math.min(1, -dx / 140))) * 180 / Math.PI;
      var yTop = polar(a, scrollR(a))[1] - 24;
      s += box(x - 7, x + 7, yTop, FLOOR - 18, -4, 6, C.metal, C.frame, C.dark, C.edge);
      hp += path(boxHull(x - 9, x + 9, yTop - 2, FLOOR - 18, -4, 6));
    });
    s += box(CX - 160, CX + 150, FLOOR - 18, FLOOR, -12, W + 12, C.metal, C.frame, C.dark, C.edge);
    hp += path(boxHull(CX - 160, CX + 150, FLOOR - 18, FLOOR, -12, W + 12));
    s += hot(hp);
    return s;
  };
  DRAW.pedestal = function () {
    var z1 = W + 110, z2 = W + 190, x1 = CX - 32, x2 = CX + 32, yTop = CY + 22, s = '';
    s += line(P(CX, CY, W), P(CX, CY, W + 230), C.dark, 9, ' stroke-linecap="round"');   // shaft
    s += box(x1, x2, yTop, FLOOR, z1, z2, C.metal, C.frame, C.side, C.edge);
    [W + 128, W + 172].forEach(function (z) {
      s += box(CX - 22, CX + 22, CY - 14, yTop, z - 9, z + 9, shade(C.bearing, 0.25), C.bearing, shade(C.bearing, -0.2), C.edge);
    });
    s += hot(path(boxHull(x1, x2, CY - 16, FLOOR, z1, z2)));
    return s;
  };

  // ---------- Inset: section through the inlet, shaft horizontal ----------
  var IN = { x: 600, y: 196, w: 292, h: 300, cy: 343, sx: 800, rc: 58, rf: 92, xc: 732, xf: 722 };
  function insetFrame() {
    var s = '<rect x="' + IN.x + '" y="' + IN.y + '" width="' + IN.w + '" height="' + IN.h +
      '" rx="8" fill="' + C.white + '" stroke="' + C.muted + '" stroke-width="1.2"/>';
    s += '<text class="shp-cap shp-cap-b shp-wide" x="' + (IN.x + 10) + '" y="' + (IN.y + 20) + '">Inset: inlet in section</text>';
    s += '<text class="shp-cap shp-cap-b shp-narrow-only" x="' + (IN.x + 10) + '" y="' + (IN.y + 30) + '">Inset: inlet</text>';
    // housing interior beyond the side sheet, impeller front plate and blades (dashed), shaft centre line
    s += '<rect x="' + (IN.sx + 4) + '" y="' + (IN.cy - 112) + '" width="' + (IN.x + IN.w - IN.sx - 10) +
      '" height="224" fill="' + C.interior + '" opacity="0.45"/>';
    [-1, 1].forEach(function (sg) {
      s += line([862, IN.cy + sg * 34], [848, IN.cy + sg * 104], C.blade, 2, ' stroke-dasharray="5 3"');
      s += line([878, IN.cy + sg * 30], [878, IN.cy + sg * 104], C.blade, 2, ' stroke-dasharray="5 3"');
    });
    s += line([IN.x + 14, IN.cy], [IN.x + IN.w - 8, IN.cy], C.centre, 1.3, ' stroke-dasharray="14 4 3 4"');
    s += '<text class="shp-cap shp-wide" x="' + (IN.x + IN.w - 10) + '" y="' + (IN.cy - 6) + '" text-anchor="end">shaft ℄</text>';
    s += '<text class="shp-cap shp-wide" x="' + (IN.x + IN.w - 8) + '" y="' + (IN.cy - 118) + '" text-anchor="end">impeller</text>';
    s += '<text class="shp-cap shp-wide" x="' + (IN.x + 10) + '" y="' + (IN.cy - 6) + '">air in →</text>';
    return '<g aria-hidden="true" pointer-events="none">' + s + '</g>';
  }
  // Each inset part is drawn as a top half and a bottom half (mirror about the shaft centre line).
  function both(fn) { return fn(-1) + fn(1); }
  DRAW.insetSide = function () {
    var s = '', hp = '';
    [[IN.cy - 112, IN.cy - IN.rc + 2], [IN.cy + IN.rc - 2, IN.cy + 112]].forEach(function (r) {
      s += '<rect x="' + (IN.sx - 4) + '" y="' + r[0] + '" width="8" height="' + (r[1] - r[0]) + '" fill="' + C.plate +
        '" stroke="' + C.edge + '" stroke-width="1.3"/>';
      hp += rectPath(IN.sx - 9, r[0] - 2, IN.sx + 9, r[1]);
    });
    return s + hot(hp);
  };
  DRAW.collar = function () {
    return both(function (sg) {
      var y = IN.cy + sg * IN.rc;
      var s = '<rect x="' + IN.xc + '" y="' + f(y - 3) + '" width="' + (IN.sx - 4 - IN.xc) + '" height="6" fill="' + C.metal +
        '" stroke="' + C.edge + '" stroke-width="1.2"/>';
      return s + hot(rectPath(IN.xc + 2, y + (sg < 0 ? -11 : -6), IN.sx - 10, y + (sg < 0 ? 6 : 11)));
    });
  };
  DRAW.inletFlange = function () {
    return both(function (sg) {
      var y1 = IN.cy + sg * (IN.rc - 3), y2 = IN.cy + sg * IN.rf;
      var top = Math.min(y1, y2), h = Math.abs(y2 - y1);
      var s = '<rect x="' + IN.xf + '" y="' + f(top) + '" width="' + (IN.xc - IN.xf) + '" height="' + f(h) + '" fill="' + C.metal +
        '" stroke="' + C.edge + '" stroke-width="1.2"/>';
      s += line([IN.xf - 7, IN.cy + sg * (IN.rf - 12)], [IN.xc + 9, IN.cy + sg * (IN.rf - 12)], C.dark, 3.5);   // bolt
      return s + hot(rectPath(IN.xf - 12, top - 3, IN.xc + 4, top + h + 3));
    });
  };
  DRAW.funnel = function () {
    return both(function (sg) {
      var pts = [];
      pts.push([768, IN.cy + sg * (IN.rc - 13)]);   // rolled lip inside the collar
      pts.push([774, IN.cy + sg * (IN.rc - 6)]);
      for (var x = 780; x <= 850; x += 5) {
        var u = (x - 780) / 70, r = 34 + 18 * (1 - u) * (1 - u);
        pts.push([x, IN.cy + sg * r]);
      }
      var s = '<path d="' + path(pts, false) + '" fill="none" stroke="' + C.edge + '" stroke-width="8" stroke-linecap="round"/>';
      s += '<path d="' + path(pts, false) + '" fill="none" stroke="' + C.metal + '" stroke-width="5" stroke-linecap="round"/>';
      var ys = pts.map(function (p) { return p[1]; });
      return s + hot(rectPath(764, Math.min.apply(null, ys) - 7, 856, Math.max.apply(null, ys) + 7));
    });
  };

  // Paint order, back to front. 'insetSide' is a second drawing of the housing side.
  var ORDER = ['pedestal', 'scroll', '#interior', 'wiper', 'side', '#inletEnd', 'cutoff', 'framing', 'outletFlange',
    '#inset', 'insetSide', 'collar', 'inletFlange', 'funnel'];
  var PART_OF = { insetSide: 'side' };

  // Callouts: [label x (left edge), label y (centre), anchor x, anchor y].
  function anchors() {
    var tA = polar(48, scrollR(48)), w = polar(128, R_IN + 38);
    return {
      outletFlange: [8, 24, X_OUT - 6, TOP + 3],
      cutoff: [372, 66, CUT[0] + DX * W * 0.55 + 4, CUT[1] + DY * W * 0.55 - 3],
      scroll: [470, 132, tA[0] + DX * W * 0.55, tA[1] + DY * W * 0.55],
      side: [8, 236, CX - 132, CY + 10],
      wiper: [330, 484, w[0], w[1]],
      framing: [130, 484, CX - 160 + 20, FLOOR - 4],
      pedestal: [604, 160, CX + 32 + DX * (W + 190) - 8, (CY + 22 + FLOOR) / 2 + DY * (W + 190)],
      inletFlange: [612, 246, IN.xf + 4, IN.cy - IN.rf + 6],
      collar: [612, 476, (IN.xc + IN.sx) / 2, IN.cy + IN.rc + 3],
      funnel: [770, 476, 832, IN.cy + 38]
    };
  }

  // ---------- Build ----------
  var NS = 'http://www.w3.org/2000/svg';
  var root, svg, labelsLayer, quiz, narrow = null;

  function build() {
    root = document.getElementById('drawing');
    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + VBW + ' ' + VBH);
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', 'Scroll housing seen from the inlet side, with ten outlined parts, and an inset section through the inlet');
    var partsLayer = document.createElementNS(NS, 'g');
    labelsLayer = document.createElementNS(NS, 'g');
    svg.appendChild(partsLayer);
    svg.appendChild(labelsLayer);
    root.insertBefore(svg, root.firstChild);

    var DECOR = { '#interior': interior, '#inletEnd': inletEnd, '#inset': insetFrame };
    ORDER.forEach(function (id) {
      var g = document.createElementNS(NS, 'g');
      if (DECOR[id]) {
        g.innerHTML = DECOR[id]();
      } else {
        g.setAttribute('data-part', PART_OF[id] || id);
        g.innerHTML = DRAW[id]();
      }
      partsLayer.appendChild(g);
    });

    var key = document.getElementById('key');
    PARTS.forEach(function (p) {
      var n = TAB_ORDER.indexOf(p.id) + 1;
      var lg = document.createElementNS(NS, 'g');
      lg.setAttribute('class', 'shp-lbl');
      lg.setAttribute('data-label-for', p.id);
      lg.setAttribute('aria-hidden', 'true');
      lg.innerHTML = '<line/><circle r="2.6"/><rect rx="3"/><text><tspan class="shp-full"></tspan><tspan class="shp-num"></tspan></text>';
      lg.querySelector('.shp-full').textContent = p.label;
      lg.querySelector('.shp-num').textContent = String(n);
      labelsLayer.appendChild(lg);
    });
    TAB_ORDER.forEach(function (id, i) {
      var li = document.createElement('li');
      li.setAttribute('data-label-for', id);
      li.innerHTML = '<b></b>';
      li.querySelector('b').textContent = String(i + 1);
      li.appendChild(document.createTextNode(state.byId[id].label));
      key.appendChild(li);
    });
    layoutLabels();

    quiz = FP.CalloutQuiz.mount({
      root: root,
      state: state,
      id: SIM_ID,
      scoreNoun: 'Parts',
      exploreLabels: 'hover',
      explorePrompt: 'Hover over each part of the scroll housing to learn its name, then take the quiz.',
      exploreEmpty: 'No part selected. Click an outlined part to open its infobox. Parts you have opened get a ✓ mark and keep their label. When you are ready, press Quiz.',
      infoHeight: 150,
      tabOrder: TAB_ORDER,
      msg: MSG,
      onModeChange: clearFound,
      onAnswer: function (res) {
        // A part answered correctly stays highlighted (solid outline) with its label for the rest of the quiz.
        if (res.correct && res.scored) markFound(res.answer, true);
      }
    });

    window.addEventListener('resize', layoutLabels);
  }

  function markFound(id, on) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-part="' + id + '"]'), function (e) {
      e.classList.toggle('shp-found', on);
    });
  }
  function clearFound() { PARTS.forEach(function (p) { markFound(p.id, false); }); }

  // Full-text callouts on wide drawings; numbered callouts plus the key list when the drawing is
  // narrow, so callout text stays at 12 px or more on screen.
  function layoutLabels() {
    var w = svg.getBoundingClientRect().width || VBW;
    var isNarrow = w < 640;
    if (isNarrow === narrow) return;
    narrow = isNarrow;
    root.classList.toggle('shp-narrow', narrow);
    var A = anchors();
    PARTS.forEach(function (p) {
      var lg = labelsLayer.querySelector('[data-label-for="' + p.id + '"]'), L = A[p.id];
      var t = lg.querySelector('text'), r = lg.querySelector('rect'), ln = lg.querySelector('line'),
        dot = lg.querySelector('circle');
      var tw = t.getComputedTextLength ? t.getComputedTextLength() : 0;
      if (!tw) tw = narrow ? 18 : p.label.length * 8.5;
      var h = narrow ? 38 : 26, padX = narrow ? 9 : 7;
      var bw = tw + 2 * padX;
      var x = Math.max(4, Math.min(L[0], VBW - bw - 4));
      var ly = Math.max(h / 2 + 2, Math.min(L[1], VBH - h / 2 - 2));
      t.setAttribute('x', x + padX);
      t.setAttribute('y', ly + (narrow ? 10.5 : 6));
      r.setAttribute('x', x);
      r.setAttribute('y', ly - h / 2);
      r.setAttribute('width', bw);
      r.setAttribute('height', h);
      var ex = Math.max(x, Math.min(L[2], x + bw)), ey = Math.max(ly - h / 2, Math.min(L[3], ly + h / 2));
      ln.setAttribute('x1', f(L[2]));
      ln.setAttribute('y1', f(L[3]));
      ln.setAttribute('x2', f(ex));
      ln.setAttribute('y2', f(ey));
      dot.setAttribute('cx', f(L[2]));
      dot.setAttribute('cy', f(L[3]));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
