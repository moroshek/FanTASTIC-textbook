// DWDI Housing Parts Explorer - HTML + inline SVG on the FanPedia kit
// CANVAS_HEIGHT: 856
// Explore phase: all eight labels visible; clicking a part opens its infobox and ticks it off in
// the list below the drawing (never scored). Check phase: labels hidden; eight function
// descriptions in a fixed order, two attempts each; mastery is 7 of 8 on the first attempt.
// The explore/check engine is FP.CalloutQuiz (../shared-libs/callout-quiz.js). This file draws a
// cabinet-oblique exploded view of a DWDI housing: the wiper bar, inlet funnel and bearing
// structural support are pulled away from each inlet along the shaft line, and the setback outlet
// flange is lifted off the outlet (based on FanPedia p. 61; simplified, not to scale).

(function () {
  'use strict';

  var SIM_ID = 'ch09-dwdi-housing-parts-explorer';

  // ---------- Content (chapter 9 specification, "Content" table) ----------
  var PARTS = [
    { id: 'side', label: 'Housing side', text: 'One of the two flat side sheets of the housing; on a DWDI fan each side carries an inlet.' },
    { id: 'scroll', label: 'Housing scroll', text: 'The curved wrapper that collects air leaving the impeller and guides it to the outlet.' },
    { id: 'cutoff', label: 'Cutoff', text: 'The tongue of the scroll at the outlet that separates air leaving the fan from air that would recirculate around the housing.' },
    { id: 'wiper', label: 'Wiper bar', text: 'Helps direct air through the housing in the inlet funnel area to prevent turbulence and increase efficiency. A DWDI housing has one at each inlet.' },
    { id: 'funnel', label: 'Inlet funnel', text: 'Aerodynamically shaped piece that directs air into the impeller. A DWDI housing has one at each inlet.' },
    { id: 'support', label: 'Bearing structural support', text: 'Steel frame that carries a bearing in front of an inlet and transfers rotor weight into the housing; it sits in the airstream. A DWDI housing has one at each inlet.' },
    { id: 'flange', label: 'Setback outlet flange', text: 'Bolted flange frame around the discharge opening; the duct connects here, and its location comes from the dimensional drawing.' },
    { id: 'framing', label: 'Framing', text: 'Structural members that stiffen the housing and carry it to its mounting.' }
  ];
  var MASTERY = 7;

  // Check-phase descriptions, in the spec's fixed order, with its "Feedback when wrong" text.
  var PROMPTS = [
    { id: 'd1', prompt: 'Carries a bearing in front of an inlet, in the airstream.', answer: 'support',
      hint: 'This frame holds the bearing; it is not a motor base, and on a DWDI fan there is one at each inlet.' },
    { id: 'd2', prompt: 'Where the discharge duct is bolted to the fan.', answer: 'flange',
      hint: 'The duct connects at the outlet flange around the discharge opening.' },
    { id: 'd3', prompt: 'Separates air leaving the fan from air that would recirculate.', answer: 'cutoff',
      hint: 'The cutoff is the scroll tongue at the outlet; the wiper bar sits at the inlet funnel.' },
    { id: 'd4', prompt: 'Directs air into the impeller from each side.', answer: 'funnel',
      hint: 'A DWDI fan has an inlet funnel on each side.' },
    { id: 'd5', prompt: 'Collects air leaving the impeller and guides it toward the outlet.', answer: 'scroll',
      hint: 'The scroll is the curved wrapper around the impeller.' },
    { id: 'd6', prompt: 'Reduces turbulence in the inlet funnel area.', answer: 'wiper',
      hint: 'The wiper bar works at the inlet funnel; the cutoff works at the outlet.' },
    { id: 'd7', prompt: 'Flat sheet that carries an inlet.', answer: 'side',
      hint: 'Each side sheet of a DWDI housing carries one inlet.' },
    { id: 'd8', prompt: 'Stiffens the housing and carries it to its mounting.', answer: 'framing',
      hint: 'Framing is the structural steel around the housing, not part of the airflow path.' }
  ];
  PROMPTS.forEach(function (q) {
    var p = PARTS.filter(function (x) { return x.id === q.answer; })[0];
    q.why = p.text;    // listed in the summary for missed parts
  });

  var state = new FP.CalloutQuiz.State({
    id: SIM_ID, parts: PARTS, prompts: PROMPTS, attempts: 2, mastery: MASTERY, order: 'fixed'
  });

  // Spec wording: Correct "Correct: <part name>."; Incorrect: the "Feedback when wrong" text;
  // after a second wrong attempt the correct part is highlighted and the item counts as missed.
  // Running count "Parts identified: n of 8"; "Mastered" at 7 or more first-attempt correct.
  var MSG = {
    exploreLabel: 'Explore',
    visited: function (n, N) { return 'Parts opened: ' + n + ' of ' + N; },
    quizLabel: 'Check',
    correct: function (c) { return '✓ Correct: ' + c.answerLabel + '.'; },
    retry: function (c) { return '✗ ' + c.hint + ' Try again (1 attempt left).'; },
    missed: function (c) {
      return '✗ ' + c.hint + ' The highlighted part is the ' + c.answerLabel.toLowerCase() + '. This one counts as missed.';
    },
    score: function (noun, n, N) {
      return 'Parts identified: ' + n + ' of ' + N + (state.score() >= MASTERY ? ' · ✓ Mastered' : '');
    },
    progress: function (k, N) { return 'Description ' + k + ' of ' + N; },
    quizIntro: 'Labels are hidden. Read the description above and click the part it describes. You have 2 attempts per description; only the first counts toward mastery.',
    next: 'Next description',
    startOver: 'Restart check',
    complete: 'Check complete. Review the summary below.',
    laterHeading: 'Correct on the second attempt (not counted toward mastery):',
    reviewPointer: 'Review the missed parts in Explore mode, then press Restart check.'
  };

  // ---------- Geometry: cabinet oblique, shaft along z; front (near) side sheet at z = 0 ----------
  var VBW = 900, VBH = 492;
  var CX = 360, CY = 272;
  var DX = 0.8, DY = -0.3;
  var W = 110;                              // housing width, side sheet to side sheet
  var A0 = -15, A1 = 270, R0 = 62, R1 = 100;
  var TOP = CY - 125;
  var FLOOR = 402;
  var R_IN = 38;                            // inlet opening radius
  var Z_WIPER = 80, Z_FUNNEL = 190, Z_SUPPORT = 310, LIFT = 46;

  function P(x, y, z) { return [x + DX * z, y + DY * z]; }
  function f(n) { return Math.round(n * 10) / 10; }
  function path(pts, close) {
    var s = '';
    for (var i = 0; i < pts.length; i++) s += (i ? 'L' : 'M') + f(pts[i][0]) + ' ' + f(pts[i][1]);
    return s + (close === false ? '' : 'Z');
  }
  function rad(a) { return a * Math.PI / 180; }
  function scrollR(a) { return R0 + (R1 - R0) * (a - A0) / (A1 - A0); }
  function polar(a, r, cx, cy) { return [(cx == null ? CX : cx) + r * Math.sin(rad(a)), (cy == null ? CY : cy) - r * Math.cos(rad(a))]; }
  var X_IN = CX + R0 * Math.sin(rad(A0));
  var X_OUT = CX - R1;
  var CUT = polar(A0, R0);

  function outline() {
    var pts = [];
    for (var a = A0; a <= A1; a += 5) pts.push(polar(a, scrollR(a)));
    pts.push([X_OUT, TOP]);
    pts.push([X_IN, TOP]);
    return pts;
  }
  function shift(pts, z) { return pts.map(function (p) { return P(p[0], p[1], z); }); }
  function circlePts(x, y, z, r, n) {
    n = n || 48;
    var c = P(x, y, z), out = [];
    for (var i = 0; i < n; i++) {
      var t = 2 * Math.PI * i / n;
      out.push([c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)]);
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
  function el(d, fill, stroke, sw, extra) {
    return '<path d="' + d + '" fill="' + fill + '" stroke="' + (stroke || 'none') + '" stroke-width="' +
      (sw || 1) + '"' + (extra || '') + '/>';
  }
  function hot(d, extra) { return '<path class="dhp-hot" d="' + d + '"' + (extra || '') + '/>'; }
  function line(a, b, stroke, sw, extra) {
    return '<line x1="' + f(a[0]) + '" y1="' + f(a[1]) + '" x2="' + f(b[0]) + '" y2="' + f(b[1]) +
      '" stroke="' + stroke + '" stroke-width="' + (sw || 1) + '"' + (extra || '') + '/>';
  }
  function circle(c, r, fill, stroke, sw) {
    return '<circle cx="' + f(c[0]) + '" cy="' + f(c[1]) + '" r="' + f(r) + '" fill="' + fill +
      '" stroke="' + (stroke || 'none') + '" stroke-width="' + (sw || 1) + '"/>';
  }
  function ringPath(x, y, z, ro, ri) {
    var d = path(circlePts(x, y, z, ro));
    if (ri) d += path(circlePts(x, y, z, ri));
    return d;
  }
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

  // ---------- Colours: kit part tokens plus derived shades ----------
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
      hole: shade(edge, -0.25), holeIn: shade(edge, 0.15), bearing: bearing, frame: shade(side, -0.08),
      tongue: shade(edge, 0.05), wiper: shade(edge, -0.1), centre: hex('text-muted')
    };
  })();

  // ---------- Part drawings ----------
  var DRAW = {};
  DRAW.scroll = function () {
    var o = outline(), back = shift(o, W), s = '';
    for (var i = 0; i < o.length; i++) {
      var j = (i + 1) % o.length;
      if (i === o.length - 2) continue;
      s += el(path([o[i], o[j], back[j], back[i]]), C.side, C.side, 0.6);
    }
    s += el(path(back), 'none', C.edge, 1.3);
    s += el(path([[X_OUT, TOP], [X_IN, TOP], P(X_IN, TOP, W), P(X_OUT, TOP, W)]), C.hole, C.edge, 1.2);
    var tan = 180 + Math.atan2(DY, DX) * 180 / Math.PI;
    var t = polar(tan, scrollR(tan));
    s += line(t, P(t[0], t[1], W), C.edge, 1.3);
    s += line([X_IN, TOP], P(X_IN, TOP, W), C.edge, 1.3);
    s += hot(path(back));
    return s;
  };
  DRAW.side = function () {
    var o = outline(), s = '';
    var hole = ringPath(CX, CY, 0, R_IN);
    s += el(path(o) + hole, C.plate, C.edge, 1.6, ' fill-rule="evenodd"');
    s += el(hole, C.hole, C.edge, 1.4);
    // impeller blades seen through the inlet (not a part)
    for (var k = 0; k < 10; k++) {
      var t = 2 * Math.PI * k / 10;
      s += line([CX + 3 + 13 * Math.cos(t), CY - 1 + 13 * Math.sin(t)], [CX + 3 + 31 * Math.cos(t + 0.35), CY - 1 + 31 * Math.sin(t + 0.35)], C.holeIn, 2);
    }
    s += circle([CX + 3, CY - 1], 11, C.holeIn, 'none');
    s += hot(path(o) + hole, ' fill-rule="evenodd"');
    return s;
  };
  DRAW.cutoff = function () {
    var a = CUT, b = P(CUT[0], CUT[1], W), s = '';
    s += line([a[0] + 3, a[1] - 2], [b[0] + 3, b[1] - 2], C.tongue, 10, ' stroke-linecap="round"');
    s += line([a[0] + 1, a[1] - 4], [b[0] + 1, b[1] - 4], C.metal, 3, ' stroke-linecap="round"');
    var n = 11, ux = b[0] - a[0], uy = b[1] - a[1], L = Math.sqrt(ux * ux + uy * uy);
    var px = -uy / L * n, py = ux / L * n;
    s += hot(path([[a[0] - px - 4, a[1] - py], [b[0] - px + 4, b[1] - py], [b[0] + px + 4, b[1] + py], [a[0] + px - 4, a[1] + py]]));
    return s;
  };
  DRAW.flange = function () {
    var e = 12, y = TOP - LIFT, s = '';
    var inner = [[X_OUT, y], [X_IN, y], P(X_IN, y, W), P(X_OUT, y, W)];
    var outer = [P(X_OUT - e, y, -e), P(X_IN + e, y, -e), P(X_IN + e, y, W + e), P(X_OUT - e, y, W + e)];
    // assembly lines from the outlet mouth up to the lifted flange
    [[X_OUT, 0], [X_IN, 0], [X_IN, W]].forEach(function (c) {
      s += line(P(c[0], TOP, c[1]), P(c[0], y + 6, c[1]), C.centre, 1, ' stroke-dasharray="4 4"');
    });
    var lip = [outer[0], outer[1], [outer[1][0], outer[1][1] + 7], [outer[0][0], outer[0][1] + 7]];
    var lipR = [outer[1], outer[2], [outer[2][0], outer[2][1] + 7], [outer[1][0], outer[1][1] + 7]];
    s += el(path(lip), C.side, C.edge, 1) + el(path(lipR), C.dark, C.edge, 1);
    s += el(path(outer) + path(inner.slice().reverse()), C.metal, C.edge, 1.3, ' fill-rule="evenodd"');
    [[0.15, -0.5], [0.5, -0.5], [0.85, -0.5], [0.15, 1.5], [0.5, 1.5], [0.85, 1.5]].forEach(function (h) {
      var x = X_OUT + (X_IN - X_OUT) * h[0];
      s += circle(P(x, y, h[1] < 0 ? -e / 2 : W + e / 2), 2.3, C.hole, 'none');
    });
    s += hot(path(hull(outer.concat([[outer[0][0], outer[0][1] + 7], [outer[1][0], outer[1][1] + 7], [outer[2][0], outer[2][1] + 7]]))));
    return s;
  };
  DRAW.framing = function () {
    var s = '', hp = '';
    [CX - 78, CX + 62].forEach(function (x) {
      var dx = x - CX;
      var a = 180 + Math.asin(Math.max(-1, Math.min(1, -dx / 86))) * 180 / Math.PI;
      var yTop = polar(a, scrollR(a))[1] - 18;
      s += box(x - 6, x + 6, yTop, FLOOR - 15, -4, 5, C.metal, C.frame, C.dark, C.edge);
      hp += path(boxHull(x - 8, x + 8, yTop - 2, FLOOR - 15, -4, 5));
    });
    s += box(CX - 112, CX + 96, FLOOR - 15, FLOOR, -10, W + 10, C.metal, C.frame, C.dark, C.edge);
    hp += path(boxHull(CX - 112, CX + 96, FLOOR - 15, FLOOR, -10, W + 10));
    return s + hot(hp);
  };
  // Parts that come in pairs, one at each inlet: front (z < 0) and back (z > W).
  function zFront(d) { return -d; }
  function zBack(d) { return W + d; }
  function wiper(z, a0, a1) {
    var r = R_IN + 8, pts = [];
    for (var a = a0; a <= a1; a += 4) pts.push(P(polar(a, r)[0], polar(a, r)[1], z));
    var d = path(pts, false);
    var s = '<path d="' + d + '" fill="none" stroke="' + C.edge + '" stroke-width="10" stroke-linecap="round"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + C.wiper + '" stroke-width="7" stroke-linecap="round"/>';
    var band = [], a;
    for (a = a0 - 6; a <= a1 + 6; a += 4) band.push(P(polar(a, r + 12)[0], polar(a, r + 12)[1], z));
    for (a = a1 + 6; a >= a0 - 6; a -= 4) band.push(P(polar(a, r - 12)[0], polar(a, r - 12)[1], z));
    return s + hot(path(band));
  }
  function funnel(zMouth, zThroat) {
    var s = '';
    s += el(path(hull(circlePts(CX, CY, zMouth, 50).concat(circlePts(CX, CY, zThroat, 32)))), C.side, C.edge, 1.2);
    var near = zMouth < zThroat ? zMouth : zThroat;
    if (near === zMouth) {
      s += el(ringPath(CX, CY, zMouth, 50, 38), C.metal, C.edge, 1.3, ' fill-rule="evenodd"');
      s += el(ringPath(CX, CY, zMouth, 38), C.holeIn, C.edge, 1);
      var c = P(CX, CY, zMouth), b = P(CX, CY, zThroat);
      s += circle([c[0] + (b[0] - c[0]) * 0.3, c[1] + (b[1] - c[1]) * 0.3], 24, C.hole, 'none');
    } else {
      // back funnel: we see the throat end and the outside of the bell
      s += el(ringPath(CX, CY, zThroat, 32, 26), C.metal, C.edge, 1.2, ' fill-rule="evenodd"');
      s += el(ringPath(CX, CY, zThroat, 26), C.hole, C.edge, 1);
    }
    return s + hot(path(hull(circlePts(CX, CY, zMouth, 54).concat(circlePts(CX, CY, zThroat, 36)))));
  }
  function support(z) {
    var s = '', hw = 52, top = CY - 66, bot = CY + 70;
    // two vertical channels, a cross channel at the shaft line, and the bearing on it
    s += box(CX - hw - 8, CX - hw + 4, top, bot, z - 5, z + 5, C.metal, C.frame, C.dark, C.edge);
    s += box(CX + hw - 4, CX + hw + 8, top, bot, z - 5, z + 5, C.metal, C.frame, C.dark, C.edge);
    s += box(CX - hw, CX + hw, CY + 14, CY + 26, z - 5, z + 5, C.metal, C.frame, C.dark, C.edge);
    s += box(CX - hw, CX + hw, top, top + 10, z - 5, z + 5, C.metal, C.frame, C.dark, C.edge);
    s += box(CX - 20, CX + 20, CY - 14, CY + 14, z - 9, z + 9, shade(C.bearing, 0.25), C.bearing, shade(C.bearing, -0.2), C.edge);
    s += circle(P(CX, CY, z - 9), 6, C.dark, C.edge, 1);
    return s + hot(path(boxHull(CX - hw - 10, CX + hw + 10, top - 3, bot + 2, z - 9, z + 9)));
  }

  // Paint order, back to front (larger z is farther away). Ids after '>' are a second element
  // of the same part.
  var LAYERS = [
    ['support', function () { return support(zBack(Z_SUPPORT)); }],
    ['funnel', function () { return funnel(zBack(Z_FUNNEL), zBack(Z_FUNNEL - 40)); }],
    ['wiper', function () { return wiper(zBack(Z_WIPER), 30, 92); }],
    ['scroll', DRAW.scroll],
    ['side', DRAW.side],
    ['cutoff', DRAW.cutoff],
    ['framing', DRAW.framing],
    ['flange', DRAW.flange],
    ['wiper', function () { return wiper(zFront(Z_WIPER), 290, 345); }],
    ['funnel', function () { return funnel(zFront(Z_FUNNEL), zFront(Z_FUNNEL - 40)); }],
    ['support', function () { return support(zFront(Z_SUPPORT)); }]
  ];

  // Callouts: [label x (left edge), label y (centre), anchor x, anchor y].
  function anchors() {
    var sb = P(CX + 52, CY - 66, zBack(Z_SUPPORT)), fw = P(polar(300, R_IN + 8)[0], polar(300, R_IN + 8)[1], zFront(Z_WIPER));
    var fn = P(CX, CY + 50, zFront(Z_FUNNEL)), tA = polar(95, scrollR(95));
    return {
      flange: [12, 26, X_OUT - 4, TOP - LIFT + 4],
      cutoff: [370, 26, CUT[0] + DX * W * 0.5 + 3, CUT[1] + DY * W * 0.5 - 3],
      support: [590, 26, sb[0] + 4, sb[1] + 2],
      side: [12, 150, CX - 70, CY - 50],
      scroll: [640, 300, tA[0] + DX * W * 0.55, tA[1] + DY * W * 0.55],
      funnel: [70, 474, fn[0], fn[1]],
      wiper: [190, 140, fw[0], fw[1]],
      framing: [520, 474, CX + 40, FLOOR - 4]
    };
  }

  // ---------- Build ----------
  var NS = 'http://www.w3.org/2000/svg';
  var root, svg, labelsLayer, quiz, narrow = null, keyHead;

  function build() {
    root = document.getElementById('drawing');
    keyHead = document.getElementById('keyHead');
    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + VBW + ' ' + VBH);
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', 'Exploded double width, double inlet housing with eight labeled parts');
    var partsLayer = document.createElementNS(NS, 'g');
    labelsLayer = document.createElementNS(NS, 'g');
    svg.appendChild(partsLayer);
    svg.appendChild(labelsLayer);
    root.insertBefore(svg, root.firstChild);

    var cl = document.createElementNS(NS, 'g');
    cl.setAttribute('aria-hidden', 'true');
    cl.innerHTML = line(P(CX, CY, -Z_SUPPORT - 60), P(CX, CY, W + Z_SUPPORT + 60), C.centre, 1.3, ' stroke-dasharray="14 4 3 4"');
    partsLayer.appendChild(cl);
    LAYERS.forEach(function (L) {
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('data-part', L[0]);
      g.innerHTML = L[1]();
      partsLayer.appendChild(g);
    });

    var key = document.getElementById('key');
    PARTS.forEach(function (p, i) {
      var lg = document.createElementNS(NS, 'g');
      lg.setAttribute('class', 'dhp-lbl');
      lg.setAttribute('data-label-for', p.id);
      lg.setAttribute('aria-hidden', 'true');
      lg.innerHTML = '<line/><circle r="2.6"/><rect rx="3"/><text><tspan class="dhp-full"></tspan><tspan class="dhp-num"></tspan></text>';
      lg.querySelector('.dhp-full').textContent = p.label;
      lg.querySelector('.dhp-num').textContent = String(i + 1);
      labelsLayer.appendChild(lg);
      var li = document.createElement('li');
      li.setAttribute('data-label-for', p.id);
      li.innerHTML = '<b></b>';
      li.querySelector('b').textContent = String(i + 1);
      li.appendChild(document.createTextNode(p.label));
      key.appendChild(li);
    });
    layoutLabels();

    quiz = FP.CalloutQuiz.mount({
      root: root,
      state: state,
      id: SIM_ID,
      scoreNoun: 'Parts',
      explorePrompt: 'A DWDI housing has parts an SWSI housing does not. Click each one to see what it does.',
      exploreEmpty: 'No part open. Click any labeled part to open its infobox; the list below the drawing ticks off each part you open. Press Check when you have opened all 8, or to skip ahead.',
      infoHeight: 150,
      tabOrder: PARTS.map(function (p) { return p.id; }),
      msg: MSG,
      onModeChange: updateHead,
      onVisit: updateHead,
      onAnswer: updateHead
    });
    updateHead();
    window.addEventListener('resize', layoutLabels);
  }

  function updateHead() {
    var m = state.mode;
    root.classList.toggle('dhp-quiz', m === 'quiz' || m === 'practice');
    root.classList.toggle('dhp-summary', m === 'summary');
    if (m === 'explore') {
      var n = state.visitedCount();
      keyHead.textContent = n === PARTS.length ? 'All 8 parts opened. Press Check when you are ready.' : 'Parts list (opened parts are ticked):';
    } else if (m === 'summary') {
      keyHead.textContent = 'Parts:';
    } else {
      keyHead.textContent = 'Part names are hidden during the check; a name appears once its description is answered.';
    }
  }

  // Full-text callouts on wide drawings; numbered callouts (matching the list) on narrow ones,
  // so callout text stays at 12 px or more on screen.
  function layoutLabels() {
    var w = svg.getBoundingClientRect().width || VBW;
    var isNarrow = w < 640;
    if (isNarrow === narrow) return;
    narrow = isNarrow;
    root.classList.toggle('dhp-narrow', narrow);
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
