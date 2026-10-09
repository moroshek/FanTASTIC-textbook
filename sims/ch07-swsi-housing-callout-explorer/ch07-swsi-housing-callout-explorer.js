// SWSI Housing Callout Explorer - HTML + inline SVG on the FanPedia kit
// CANVAS_HEIGHT: 762
// Explore mode: click a callout to read what the part does (never scored).
// Quiz mode: labels hidden; the 10 descriptions appear once each in shuffled order,
// one attempt each; mastery is 8 of 10 on the first attempt.
// The explore/quiz engine is FP.CalloutQuiz (../shared-libs/callout-quiz.js). This file draws
// a cabinet-oblique line drawing of an SWSI housing with its inlet parts pulled off along the
// shaft line (based on FanPedia p. 60, not to scale) and lays out the callouts.

(function () {
  'use strict';

  var SIM_ID = 'ch07-swsi-housing-callout-explorer';

  // ---------- Content (chapter 7 specification, "Content" table) ----------
  var PARTS = [
    { id: 'side', label: 'Housing Side', text: 'One of the two flat sides of the scroll housing; on an SWSI fan the inlet side carries the round inlet opening.' },
    { id: 'scroll', label: 'Housing Scroll', text: 'The curved wrapper between the side plates that collects air from the impeller and carries it to the outlet.' },
    { id: 'cutoff', label: 'Cutoff', text: 'The tongue near the outlet where the scroll comes closest to the impeller, separating discharged air from air that would keep circling.' },
    { id: 'wiper', label: 'Wiper Bar', text: 'A bar near the inlet funnel area that helps direct air through the housing to reduce turbulence.' },
    { id: 'collar', label: 'Inlet Collar', text: 'A short cylinder at the inlet opening that the inlet hardware mounts to.' },
    { id: 'funnel', label: 'Inlet Funnel', text: 'The shaped piece that guides air smoothly into the impeller eye.' },
    { id: 'inletFlange', label: 'Inlet Flange', text: 'The bolting rim at the inlet that connects the fan to inlet ductwork.' },
    { id: 'outletFlange', label: 'Outlet (Discharge) Flange', text: 'The bolting rim at the outlet that connects the fan to discharge ductwork.' },
    { id: 'framing', label: 'Framing', text: 'Angles or channels fastened to the housing that stiffen it and support it on its base.' },
    { id: 'pedestal', label: 'Pedestal', text: 'The stand that carries the bearings and, on some arrangements, the motor.' }
  ];
  var TAB_ORDER = PARTS.map(function (p) { return p.id; });
  var MASTERY = 8;
  var PAIR_NOTE = 'The cutoff sits at the outlet end of the scroll; the wiper bar sits near the inlet funnel.';

  // Quiz: each description is the prompt (FP.CalloutQuiz.promptsFromParts with '{text}').
  // Misconception 1: the cutoff/wiper bar pair gets the spec's extra note either way.
  var PROMPTS = FP.CalloutQuiz.promptsFromParts(PARTS, { template: '{text}', why: false });
  PROMPTS.forEach(function (q) {
    q.id = q.answer;
    if (q.answer === 'cutoff') q.wrong = { wiper: PAIR_NOTE };
    if (q.answer === 'wiper') q.wrong = { cutoff: PAIR_NOTE };
  });

  function lower(s) { return String(s).toLowerCase(); }
  function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function sentence(s) { return s ? ' ' + s : ''; }

  // Spec feedback wording, passed to the engine as overrides:
  // Correct: "Correct: <part>."  Incorrect: "That is the <clicked part>. The <correct part> is <description>."
  var MSG = {
    correct: function (c) { return '✓ Correct: ' + c.answerLabel + '.'; },
    missed: function (c) {
      return '✗ That is the ' + lower(c.clickedLabel) + '. The ' + lower(c.answerLabel) + ' is ' +
        lowerFirst(c.answerText) + sentence(c.wrongNote);
    },
    score: function (noun, n, N) { return 'Correct: ' + n + ' of ' + N; },
    quizIntro: function () {
      return 'Labels are hidden. Read each description and click the part it fits. One attempt per description.';
    },
    next: 'Next description',
    firstAttempt: function (n, N) { return 'First-attempt score: ' + n + ' of ' + N; },
    reviewPointer: 'Review the missed parts in Explore mode, then press Start over for a new shuffle.'
  };

  // ---------- Geometry: cabinet oblique. Front (inlet) plane z = 0; +z runs toward the drive side ----------
  var VBW = 900, VBH = 470;
  var CX = 520, CY = 228;                 // inlet centre on the inlet side plate
  var DX = 0.85, DY = -0.3;               // screen offset per unit of depth
  var W = 100;                            // housing width (side plate to side plate)
  var TOP = CY - 170;                     // outlet top
  var A0 = -15, A1 = 270, R0 = 88, R1 = 150;   // scroll: cutoff angle/radius to outer-wall angle/radius
  var FLOOR = 380;

  function P(x, y, z) { return [x + DX * z, y + DY * z]; }
  function f(n) { return Math.round(n * 10) / 10; }
  function path(pts, close) {
    var s = '';
    for (var i = 0; i < pts.length; i++) s += (i ? 'L' : 'M') + f(pts[i][0]) + ' ' + f(pts[i][1]);
    return s + (close === false ? '' : 'Z');
  }
  function rad(a) { return a * Math.PI / 180; }
  function scrollR(a) { return R0 + (R1 - R0) * (a - A0) / (A1 - A0); }
  function polar(a, r) { return [CX + r * Math.sin(rad(a)), CY - r * Math.cos(rad(a))]; }
  var X_IN = CX + R0 * Math.sin(rad(A0));   // inner (cutoff-side) outlet wall
  var X_OUT = CX - R1;                       // outer outlet wall
  var CUT = polar(A0, R0);                   // cutoff point on the front plate

  // Scroll outline in the front plane: cutoff -> spiral -> outer wall -> outlet top -> inner wall.
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
  function line(a, b, stroke, sw, extra) {
    return '<line x1="' + f(a[0]) + '" y1="' + f(a[1]) + '" x2="' + f(b[0]) + '" y2="' + f(b[1]) +
      '" stroke="' + stroke + '" stroke-width="' + (sw || 1) + '"' + (extra || '') + '/>';
  }
  function circle(c, r, fill, stroke, sw) {
    return '<circle cx="' + f(c[0]) + '" cy="' + f(c[1]) + '" r="' + f(r) + '" fill="' + fill +
      '" stroke="' + (stroke || 'none') + '" stroke-width="' + (sw || 1) + '"/>';
  }
  // A ring or disc in a plane of constant z (true circles in cabinet oblique).
  function ringPath(x, y, z, ro, ri) {
    var d = path(circlePts(x, y, z, ro));
    if (ri) d += path(circlePts(x, y, z, ri));
    return d;
  }
  // A box with its front (z1), top (y1) and right (x2) faces visible. y1 < y2 on screen.
  function box(x1, x2, y1, y2, z1, z2, cTop, cFront, cSide, stroke) {
    var front = [P(x1, y1, z1), P(x2, y1, z1), P(x2, y2, z1), P(x1, y2, z1)];
    var top = [P(x1, y1, z1), P(x2, y1, z1), P(x2, y1, z2), P(x1, y1, z2)];
    var side = [P(x2, y1, z1), P(x2, y1, z2), P(x2, y2, z2), P(x2, y2, z1)];
    return el(path(side), cSide, stroke, 1.1) + el(path(top), cTop, stroke, 1.1) + el(path(front), cFront, stroke, 1.1);
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
      hole: shade(edge, -0.25), holeIn: shade(edge, 0.15), bearing: bearing, frame: shade(side, -0.08),
      tongue: shade(edge, 0.05), wiper: shade(edge, -0.1), centre: hex('text-muted')
    };
  })();

  // ---------- Part drawings (each returns SVG markup) ----------
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
    // outlet mouth (open), looking down into the housing
    s += el(path([[X_OUT, TOP], [X_IN, TOP], P(X_IN, TOP, W), P(X_OUT, TOP, W)]), C.hole, C.edge, 1.2);
    // silhouette edges of the wrapper
    var tan = 180 + Math.atan2(DY, DX) * 180 / Math.PI;   // where the wrapper turns away from view
    var t = polar(tan, scrollR(tan));
    s += line(t, P(t[0], t[1], W), C.edge, 1.3);
    s += line([X_IN, TOP], P(X_IN, TOP, W), C.edge, 1.3);
    return s;
  };
  DRAW.side = function () {
    var o = outline(), s = '';
    s += el(path(o) + ringPath(CX, CY, 0, 50), C.plate, C.edge, 1.6, ' fill-rule="evenodd"');
    // the inlet opening, with the impeller blades seen through it (not labeled)
    s += el(ringPath(CX, CY, 0, 50), C.hole, C.edge, 1.4);
    var inner = '';
    for (var k = 0; k < 12; k++) {
      var t = 2 * Math.PI * k / 12;
      var a = [CX + 4 + 18 * Math.cos(t), CY - 2 + 18 * Math.sin(t)];
      var b = [CX + 4 + 40 * Math.cos(t + 0.35), CY - 2 + 40 * Math.sin(t + 0.35)];
      inner += line(a, b, C.holeIn, 2);
    }
    s += inner + circle([CX + 4, CY - 2], 16, C.holeIn, 'none');
    // weld seam / edge highlight just inside the outline
    return s;
  };
  DRAW.cutoff = function () {
    var a = CUT, b = P(CUT[0], CUT[1], W);
    var s = '';
    // the tongue: a rounded lip running across the housing width at the cutoff
    s += line([a[0] + 3, a[1] - 2], [b[0] + 3, b[1] - 2], C.tongue, 11, ' stroke-linecap="round"');
    s += line([a[0] + 1, a[1] - 4], [b[0] + 1, b[1] - 4], C.metal, 3, ' stroke-linecap="round"');
    s += line(a, b, 'transparent', 20, ' stroke-linecap="round"');   // generous hit area
    return s;
  };
  DRAW.wiper = function () {
    var r = 66, pts = [];
    for (var a = 112; a <= 160; a += 4) pts.push(polar(a, r));
    var d = path(pts, false);
    return '<path d="' + d + '" fill="none" stroke="' + C.wiper + '" stroke-width="8" stroke-linecap="round"/>' +
      '<path d="' + d + '" fill="none" stroke="transparent" stroke-width="20" stroke-linecap="round"/>';
  };
  DRAW.outletFlange = function () {
    var e = 13;
    var inner = [[X_OUT, TOP], [X_IN, TOP], P(X_IN, TOP, W), P(X_OUT, TOP, W)];
    var outer = [P(X_OUT - e, TOP, -e), P(X_IN + e, TOP, -e), P(X_IN + e, TOP, W + e), P(X_OUT - e, TOP, W + e)];
    var lip = [outer[0], outer[1], [outer[1][0], outer[1][1] + 6], [outer[0][0], outer[0][1] + 6]];
    var lipR = [outer[1], outer[2], [outer[2][0], outer[2][1] + 6], [outer[1][0], outer[1][1] + 6]];
    var s = el(path(lip), C.side, C.edge, 1) + el(path(lipR), C.dark, C.edge, 1);
    s += el(path(outer) + path(inner.slice().reverse()), C.metal, C.edge, 1.3, ' fill-rule="evenodd"');
    // bolt holes
    var holes = [[0.15, -0.5], [0.5, -0.5], [0.85, -0.5], [0.15, 1.5], [0.5, 1.5], [0.85, 1.5]];
    holes.forEach(function (h) {
      var x = X_OUT + (X_IN - X_OUT) * h[0];
      var z = h[1] < 0 ? -e / 2 : W + e / 2;
      s += circle(P(x, TOP, z), 2.4, C.hole, 'none');
    });
    [[-0.5, 0.3], [-0.5, 0.7], [1.5, 0.3], [1.5, 0.7]].forEach(function (h) {
      var x = h[0] < 0 ? X_OUT - e / 2 : X_IN + e / 2;
      s += circle(P(x, TOP, W * h[1]), 2.4, C.hole, 'none');
    });
    return s;
  };
  DRAW.framing = function () {
    var s = '';
    // two vertical angles fastened to the side plate, down to the base frame
    [CX - 95, CX + 70].forEach(function (x) {
      var dx = x - CX;
      var a = 180 + Math.asin(Math.max(-1, Math.min(1, -dx / 128))) * 180 / Math.PI;
      var yTop = polar(a, scrollR(a))[1] - 26;
      s += box(x - 7, x + 7, yTop, FLOOR - 16, -4, 6, C.metal, C.frame, C.dark, C.edge);
    });
    // base frame (channel) under the housing, running side plate to side plate
    s += box(CX - 140, CX + 112, FLOOR - 16, FLOOR, -12, W + 12, C.metal, C.frame, C.dark, C.edge);
    return s;
  };
  DRAW.pedestal = function () {
    var z1 = W + 120, z2 = W + 215, x1 = CX - 34, x2 = CX + 34, yTop = CY + 22;
    var s = '';
    // shaft and bearings (drawn with the pedestal; not labeled)
    s += line(P(CX, CY, W), P(CX, CY, W + 245), C.dark, 9, ' stroke-linecap="round"');
    s += box(x1, x2, yTop, FLOOR, z1, z2, C.metal, C.frame, C.side, C.edge);
    [W + 140, W + 195].forEach(function (z) {
      s += box(CX - 22, CX + 22, CY - 14, yTop, z - 9, z + 9, shade(C.bearing, 0.25), C.bearing, shade(C.bearing, -0.2), C.edge);
      var c = P(CX, CY, z - 9);
      s += circle(c, 6, C.dark, C.edge, 1);
    });
    return s;
  };
  // Inlet hardware, pulled off along the shaft line toward the viewer (negative z).
  function cylinder(z1, z2, r1, r2, sideFill) {
    return el(path(hull(circlePts(CX, CY, z1, r1).concat(circlePts(CX, CY, z2, r2)))), sideFill, C.edge, 1.2);
  }
  DRAW.funnel = function () {
    var zf = -175, zb = -110, s = '';
    s += cylinder(zf, zb, 64, 34, C.side);
    s += el(ringPath(CX, CY, zf, 64, 50), C.metal, C.edge, 1.3, ' fill-rule="evenodd"');
    s += el(ringPath(CX, CY, zf, 50), C.holeIn, C.edge, 1);
    // the throat, seen through the bell
    var c = P(CX, CY, zf), b = P(CX, CY, zb);
    s += circle([c[0] + (b[0] - c[0]) * 0.3, c[1] + (b[1] - c[1]) * 0.3], 30, C.hole, 'none');
    return s;
  };
  DRAW.collar = function () {
    var zf = -300, zb = -252, s = '';
    s += cylinder(zf, zb, 50, 50, C.side);
    s += el(ringPath(CX, CY, zf, 50, 44), C.metal, C.edge, 1.3, ' fill-rule="evenodd"');
    s += el(ringPath(CX, CY, zf, 44), C.hole, C.edge, 1);
    return s;
  };
  DRAW.inletFlange = function () {
    var zf = -410, zb = -400, s = '';
    s += cylinder(zf, zb, 66, 66, C.side);
    s += el(ringPath(CX, CY, zf, 66, 50), C.metal, C.edge, 1.3, ' fill-rule="evenodd"');
    s += el(ringPath(CX, CY, zf, 50), C.hole, C.edge, 1);
    var c = P(CX, CY, zf);
    for (var k = 0; k < 8; k++) {
      var t = 2 * Math.PI * (k + 0.5) / 8;
      s += circle([c[0] + 58 * Math.cos(t), c[1] + 58 * Math.sin(t)], 2.8, C.hole, 'none');
    }
    return s;
  };

  // Paint order, back to front.
  var ORDER = ['pedestal', 'scroll', 'side', 'cutoff', 'wiper', 'framing', 'outletFlange', 'funnel', 'collar', 'inletFlange'];

  // Callouts: [label x (left edge), label y (centre), anchor x, anchor y].
  function anchors() {
    var tA = polar(62, scrollR(62));
    return {
      outletFlange: [18, 34, X_OUT + 20, TOP + 6 - 0.3 * -6],
      wiper: [560, 446, polar(136, 66)[0], polar(136, 66)[1]],
      funnel: [18, 166, CX - 0.85 * 175, CY + 0.3 * 175 - 62],
      collar: [18, 236, CX - 0.85 * 300 - 30, CY + 0.3 * 300 - 38],
      inletFlange: [18, 446, CX - 0.85 * 410 + 10, CY + 0.3 * 410 + 64],
      framing: [300, 446, CX - 40, FLOOR - 8],
      side: [18, 100, CX - 70, CY - 100],
      cutoff: [700, 34, CUT[0] + DX * W * 0.55 + 4, CUT[1] + DY * W * 0.55 - 3],
      scroll: [700, 100, tA[0] + DX * W * 0.5, tA[1] + DY * W * 0.5],
      pedestal: [770, 362, CX + 34 + DX * (W + 168), (CY + 22 + FLOOR) / 2 + DY * (W + 168)]
    };
  }

  // ---------- Build ----------
  var NS = 'http://www.w3.org/2000/svg';
  var root, svg, labelsLayer, quiz, btnStart, narrow = null;

  function build() {
    root = document.getElementById('drawing');
    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + VBW + ' ' + VBH);
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', 'Single width, single inlet centrifugal fan housing with ten callouts');
    var partsLayer = document.createElementNS(NS, 'g');
    labelsLayer = document.createElementNS(NS, 'g');
    svg.appendChild(partsLayer);
    svg.appendChild(labelsLayer);
    root.insertBefore(svg, root.firstChild);

    ORDER.forEach(function (id) {
      if (id === 'framing') {
        // centre line drawn above the housing, under the pulled-off inlet parts
        var cl = document.createElementNS(NS, 'g');
        cl.setAttribute('aria-hidden', 'true');
        cl.innerHTML = line(P(CX, CY, -470), P(CX, CY, 0), C.centre, 1.4, ' stroke-dasharray="14 4 3 4"');
        partsLayer.appendChild(cl);
      }
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('data-part', id);
      g.innerHTML = DRAW[id]();
      partsLayer.appendChild(g);
    });

    var key = document.getElementById('key');
    PARTS.forEach(function (p, i) {
      var lg = document.createElementNS(NS, 'g');
      lg.setAttribute('class', 'shc-lbl');
      lg.setAttribute('data-label-for', p.id);
      lg.setAttribute('aria-hidden', 'true');
      lg.innerHTML = '<line/><circle r="2.6"/><rect rx="3"/><text><tspan class="shc-full"></tspan><tspan class="shc-num"></tspan></text>';
      lg.querySelector('.shc-full').textContent = p.label;
      lg.querySelector('.shc-num').textContent = String(i + 1);
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
      id: SIM_ID,
      parts: PARTS,
      prompts: PROMPTS,
      attempts: 1,
      mastery: MASTERY,
      order: 'shuffle',
      scoreNoun: 'Parts',
      explorePrompt: 'Click any part to see what it does.',
      exploreEmpty: 'No part selected. Parts you have opened get a ✓ mark and a shaded label. When you are ready, press Quiz.',
      infoHeight: 150,
      tabOrder: TAB_ORDER,
      msg: MSG
    });

    btnStart = document.createElement('button');
    btnStart.type = 'button';
    btnStart.className = 'fp-btn secondary';
    btnStart.textContent = FP.msg.START_OVER;
    btnStart.title = 'Clear visited parts and the quiz, and return to explore mode';
    btnStart.addEventListener('click', startOver);
    quiz.ui.toolbar.insertBefore(btnStart, quiz.ui.status);

    window.addEventListener('resize', layoutLabels);
  }

  // Full-text callouts on wide drawings; numbered callouts plus the key list when the drawing is
  // narrow, so callout text stays at 12 px or more on screen.
  function layoutLabels() {
    var w = svg.getBoundingClientRect().width || VBW;
    var isNarrow = w < 650;
    if (isNarrow === narrow) return;
    narrow = isNarrow;
    root.classList.toggle('shc-narrow', narrow);
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
      if (narrow) x = Math.max(4, Math.min(L[0] + (L[0] > VBW / 2 ? 30 : 10), VBW - bw - 4));
      t.setAttribute('x', x + padX);
      t.setAttribute('y', L[1] + (narrow ? 10.5 : 6));
      r.setAttribute('x', x);
      r.setAttribute('y', L[1] - h / 2);
      r.setAttribute('width', bw);
      r.setAttribute('height', h);
      var ex = Math.max(x, Math.min(L[2], x + bw)), ey = Math.max(L[1] - h / 2, Math.min(L[3], L[1] + h / 2));
      ln.setAttribute('x1', f(L[2]));
      ln.setAttribute('y1', f(L[3]));
      ln.setAttribute('x2', f(ex));
      ln.setAttribute('y2', f(ey));
      dot.setAttribute('cx', f(L[2]));
      dot.setAttribute('cy', f(L[3]));
    });
  }

  // Start over: clear visited parts and the quiz, return to explore mode.
  function startOver() {
    quiz.resetVisited();
    quiz.setMode('explore');
    quiz.render();
    FP.announce('Started over. Explore mode. Click any part to see what it does.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
