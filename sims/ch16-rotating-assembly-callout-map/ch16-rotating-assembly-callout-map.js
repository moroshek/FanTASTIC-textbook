// Rotating Assembly Callout Map - HTML + inline SVG on the FanPedia kit
// CANVAS_HEIGHT: 790
// Explore mode: click a callout to read what the part does (never scored).
// Quiz mode: labels hidden; the 10 descriptions appear once each in shuffled order, two attempts
// each; a first wrong click names the clicked part and its job; mastery is 8 of 10 on the first try.
// The explore/quiz engine is FP.CalloutQuiz (../shared-libs/callout-quiz.js). This file draws a
// schematic side cross-section of an overhung (Arrangement 1 style) centrifugal fan and lays out
// the callouts. Schematic, not to scale.

(function () {
  'use strict';

  var SIM_ID = 'ch16-rotating-assembly-callout-map';

  // ---------- Content (chapter 16 specification, "Content" table) ----------
  var PARTS = [
    { id: 'keyway', label: 'Shaft keyway', text: 'A groove cut into the shaft that accepts keystock so torque passes to the hub or sheave.' },
    { id: 'turndown', label: 'Shaft turndown', text: 'A length of shaft machined to a smaller diameter to fit a bearing, seal, hub or coupling.' },
    { id: 'sleeve', label: 'Shaft sleeve', text: 'A tube over the shaft inside the housing that shields the shaft from the airstream when materials differ.' },
    { id: 'collar', label: 'Shaft locking collar', text: 'A ring clamped to the shaft that keeps the shaft from sliding axially into another part.' },
    { id: 'seal', label: 'Shaft seal', text: 'A seal mounted on the housing wall where the shaft passes through, limiting air leakage in or out.' },
    { id: 'inboard', label: 'Non-drive end bearing (inboard)', text: 'The bearing nearer the impeller, farther from the sheave.' },
    { id: 'outboard', label: 'Drive end bearing (outboard)', text: 'The bearing nearer the sheave or coupling.' },
    { id: 'bearingSeal', label: 'Bearing seal', text: 'A seal built into the bearing that keeps dirt out of the bearing.' },
    { id: 'positioner', label: 'Bearing positioner', text: 'A threaded bolt on a bracket beside the bearing, used for fine adjustment of bearing location.' },
    { id: 'tap', label: 'Vibration sensor tap', text: 'A drilled and tapped hole in the bearing housing where a vibration sensor is mounted.' }
  ];
  var TAB_ORDER = ['sleeve', 'seal', 'collar', 'bearingSeal', 'inboard', 'tap', 'outboard', 'positioner', 'turndown', 'keyway'];
  var MASTERY = 8;

  // Quiz: each description is the prompt (FP.CalloutQuiz.promptsFromParts with '{text}').
  var PROMPTS = FP.CalloutQuiz.promptsFromParts(PARTS, { template: '{text}', why: false });
  PROMPTS.forEach(function (q) { q.id = q.answer; });

  function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

  var quiz = null;
  // Spec feedback wording, passed to the engine as overrides:
  //   Correct: "Correct: <label>."  First wrong: "Not quite. That callout is the <clicked label>:
  //   <its infobox text>. Try again."  Second wrong: the answer is highlighted and the item is missed.
  //   Running count: "Correct on first try: n of 10".
  var MSG = {
    correct: function (c) { return '✓ Correct: ' + c.answerLabel + '.'; },
    retry: function (c) {
      return '✗ Not quite. That callout is the ' + lowerFirst(c.clickedLabel) + ': ' + lowerFirst(c.clickedText) +
        ' Try again (1 attempt left).';
    },
    missed: function (c) {
      return '✗ Not quite. That callout is the ' + lowerFirst(c.clickedLabel) + '. The answer, now highlighted, is the ' +
        lowerFirst(c.answerLabel) + '. This one counts as missed.';
    },
    // The engine passes the any-attempt count; the spec's running line counts first tries only.
    score: function (noun, n, N) { return 'Correct on first try: ' + (quiz ? quiz.state.score() : 0) + ' of ' + N; },
    quizIntro: function () {
      return 'Labels are hidden. Read each description and click the part it fits. Two attempts per description.';
    },
    next: 'Next description',
    reviewPointer: 'Review the missed parts in Explore mode, then press Start over for a new shuffle.'
  };

  // ---------- Geometry (viewBox units) ----------
  var VBW = 900, VBH = 500;
  var CY = 200;                     // shaft centre line
  var R = 11;                       // shaft radius
  var RT = 7;                       // turndown radius at the drive end
  var FLOOR = 382;
  var WALL_IN = 64, WALL_DR = 286;  // housing inlet-side and drive-side walls
  var XB1 = 420, XB2 = 640;         // bearing centres (inboard, outboard)
  var XS = 780;                     // sheave centre
  var XT = 742;                     // turndown step
  var XEND = 846;                   // shaft end

  function f(n) { return Math.round(n * 10) / 10; }
  function rect(x, y, w, h, fill, stroke, sw, extra) {
    return '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" fill="' + fill +
      '" stroke="' + (stroke || 'none') + '" stroke-width="' + (sw || 1) + '"' + (extra || '') + '/>';
  }
  function path(d, fill, stroke, sw, extra) {
    return '<path d="' + d + '" fill="' + fill + '" stroke="' + (stroke || 'none') + '" stroke-width="' + (sw || 1) + '"' + (extra || '') + '/>';
  }
  function line(x1, y1, x2, y2, stroke, sw, extra) {
    return '<line x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '" stroke="' + stroke +
      '" stroke-width="' + (sw || 1) + '"' + (extra || '') + '/>';
  }
  function hit(x, y, w, h) { return rect(x, y, w, h, 'transparent', 'none', 0); }

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
      metal: metal, side: side, dark: shade(side, -0.25), edge: edge, shaft: shade(side, -0.08),
      shaftHi: shade(metal, 0.3), bearing: bearing, bearingLt: shade(bearing, 0.45), seal: shade(edge, -0.35),
      sleeve: '#c9a86a', collar: shade(edge, 0.25), air: hex('air'), centre: hex('text-muted'), hole: shade(edge, -0.4)
    };
  })();

  // ---------- Background (not clickable): housing, impeller, shaft, pedestal, sheave ----------
  function background() {
    var s = '';
    // floor
    s += line(20, FLOOR, 880, FLOOR, C.edge, 2);
    // housing section: scroll top and bottom, inlet-side wall with inlet, drive-side wall
    s += path('M' + WALL_IN + ' 120 L' + WALL_IN + ' 70 Q' + WALL_IN + ' 34 100 34 L' + (WALL_DR - 20) + ' 34 Q' + WALL_DR + ' 34 ' + WALL_DR + ' 60 L' + WALL_DR + ' ' + (CY - 30),
      'none', C.edge, 7, ' stroke-linejoin="round"');
    s += path('M' + WALL_IN + ' 280 L' + WALL_IN + ' 340 Q' + WALL_IN + ' 372 100 372 L' + (WALL_DR - 20) + ' 372 Q' + WALL_DR + ' 372 ' + WALL_DR + ' 346 L' + WALL_DR + ' ' + (CY + 30),
      'none', C.edge, 7, ' stroke-linejoin="round"');
    // inlet funnel
    s += path('M' + WALL_IN + ' 120 Q100 128 118 150', 'none', C.edge, 5);
    s += path('M' + WALL_IN + ' 280 Q100 272 118 250', 'none', C.edge, 5);
    // impeller (overhung): backplate, blades, shroud, hub
    s += rect(232, 70, 9, 260, C.side, C.edge, 1.2);
    s += path('M118 150 Q150 92 232 78 L232 92 Q160 104 126 156 Z', C.side, C.edge, 1);
    s += path('M118 250 Q150 308 232 322 L232 308 Q160 296 126 244 Z', C.side, C.edge, 1);
    s += rect(150, 96, 82, 30, C.metal, C.edge, 1);
    s += rect(150, 274, 82, 30, C.metal, C.edge, 1);
    s += rect(240, CY - 26, 18, 52, C.dark, C.edge, 1.2);     // hub
    // airflow into the inlet
    s += line(18, CY, 112, CY, C.air, 3, ' stroke-dasharray="10 6"');
    s += path('M112 ' + CY + ' l-12 -7 l0 14 Z', C.air);
    // shaft: full diameter from the hub to the turndown, turned down to the end
    s += rect(240, CY - R, XT - 240, 2 * R, C.shaft, C.edge, 1.2);
    s += rect(240, CY - R + 3, XT - 240, 3, C.shaftHi, 'none');
    // pedestal
    s += path('M360 ' + FLOOR + ' L372 252 L700 252 L712 ' + FLOOR + ' Z', C.metal, C.edge, 1.5);
    s += line(372, 262, 700, 262, C.side, 2);
    // centre line
    s += line(18, CY, 870, CY, C.centre, 1.2, ' stroke-dasharray="16 4 3 4"');
    // sheave and belt
    s += path('M' + (XS - 18) + ' 128 L' + (XS + 18) + ' 128 L' + (XS + 12) + ' 186 L' + (XS + 12) + ' 214 L' + (XS + 18) + ' 272 L' + (XS - 18) + ' 272 L' + (XS - 12) + ' 214 L' + (XS - 12) + ' 186 Z',
      C.metal, C.edge, 1.4);
    [146, 164, 236, 254].forEach(function (y) { s += line(XS - 15, y, XS + 15, y, C.side, 1.5); });
    s += rect(XS - 9, 106, 18, 22, hex('belt'), 'none');
    return s;
  }

  // ---------- Callout parts (each returns SVG markup) ----------
  function pillowBlock(xc) {
    var s = '';
    s += rect(xc - 52, 238, 104, 14, C.bearing, C.edge, 1.2, ' rx="2"');                // base and feet
    s += path('M' + (xc - 34) + ' 240 L' + (xc - 34) + ' ' + (CY - 6) + ' A34 34 0 0 1 ' + (xc + 34) + ' ' + (CY - 6) + ' L' + (xc + 34) + ' 240 Z',
      C.bearing, C.edge, 1.4);
    s += path('M' + (xc - 20) + ' ' + CY + ' A20 20 0 0 1 ' + (xc + 20) + ' ' + CY + ' A20 20 0 0 1 ' + (xc - 20) + ' ' + CY + ' Z', C.bearingLt, C.edge, 1);
    s += rect(xc - 34, CY - R, 68, 2 * R, C.shaft, C.edge, 1);                          // shaft through the bore
    [-42, 42].forEach(function (dx) {                                                    // hold-down bolts
      s += rect(xc + dx - 4, 230, 8, 8, C.edge, 'none');
    });
    return s;
  }
  var DRAW = {
    inboard: function () { return pillowBlock(XB1) + hit(XB1 - 52, CY - 40, 104, 92); },
    outboard: function () { return pillowBlock(XB2) + hit(XB2 - 52, CY - 30, 104, 82); },
    sleeve: function () {
      return rect(258, CY - R - 5, WALL_DR - 258 + 2, 2 * R + 10, C.sleeve, C.edge, 1.2) + hit(254, CY - 26, 34, 52);
    },
    seal: function () {
      var x = WALL_DR + 4;
      return rect(x, CY - 34, 8, 68, C.seal, C.edge, 1) + rect(x + 8, CY - 22, 10, 44, C.dark, C.edge, 1) +
        rect(x + 18, CY - 34, 5, 68, C.seal, C.edge, 1) + hit(x - 2, CY - 40, 30, 80);
    },
    collar: function () {
      return rect(332, CY - R - 8, 16, 2 * R + 16, C.collar, C.edge, 1.3, ' rx="2"') +
        rect(337, CY - R - 13, 6, 6, C.edge, 'none') + hit(326, CY - 30, 28, 60);
    },
    bearingSeal: function () {
      // the inboard bearing's seals, on both faces where the shaft enters the bearing
      return rect(XB1 - 40, CY - 17, 7, 34, C.seal, C.edge, 1) + rect(XB1 + 33, CY - 17, 7, 34, C.seal, C.edge, 1) +
        hit(XB1 - 46, CY - 22, 14, 44) + hit(XB1 + 32, CY - 22, 14, 44);
    },
    tap: function () {
      var y = CY - 40;
      return rect(XB2 - 7, y - 2, 14, 12, C.hole, 'none') +
        line(XB2 - 7, y + 2, XB2 + 7, y + 2, C.bearingLt, 1) + line(XB2 - 7, y + 6, XB2 + 7, y + 6, C.bearingLt, 1) +
        rect(XB2 - 11, y - 4, 22, 3, C.edge, 'none') + hit(XB2 - 16, y - 12, 32, 26);
    },
    positioner: function () {
      var x = XB2 + 66;
      return path('M' + x + ' 252 L' + x + ' 218 L' + (x + 12) + ' 218 L' + (x + 12) + ' 240 L' + (x + 26) + ' 240 L' + (x + 26) + ' 252 Z', C.metal, C.edge, 1.3) +
        rect(XB2 + 52, 241, x - XB2 - 52 + 20, 6, C.dark, C.edge, 1) +
        rect(x + 14, 237, 9, 14, C.edge, 'none') + hit(XB2 + 50, 214, 46, 40);
    },
    turndown: function () {
      return rect(XT, CY - RT, XEND - XT, 2 * RT, C.shaft, C.edge, 1.2) +
        line(XT, CY - R, XT, CY + R, C.edge, 2) + hit(XT - 8, CY - 18, 22, 36);
    },
    keyway: function () {
      return rect(XS + 16, CY - RT - 1, XEND - XS - 22, 5, C.hole, 'none') + hit(XS + 14, CY - 22, XEND - XS - 12, 22);
    }
  };
  // Paint order, back to front.
  var ORDER = ['sleeve', 'seal', 'collar', 'inboard', 'bearingSeal', 'outboard', 'tap', 'positioner', 'turndown', 'keyway'];

  // Callouts: [label x (left edge), label y (centre), anchor x, anchor y].
  var ANCHORS = {
    sleeve: [24, 410, 272, CY + 14],
    seal: [150, 96, WALL_DR + 14, CY - 30],
    collar: [326, 66, 340, CY - R - 10],
    bearingSeal: [96, 448, XB1 - 37, CY + 14],
    inboard: [262, 448, XB1, 246],
    tap: [500, 66, XB2, CY - 42],
    outboard: [520, 410, XB2 + 20, 246],
    positioner: [610, 448, XB2 + 80, 222],
    turndown: [770, 410, XT + 12, CY + RT],
    keyway: [740, 66, XS + 40, CY - RT]
  };

  // ---------- Build ----------
  var NS = 'http://www.w3.org/2000/svg';
  var root, svg, labelsLayer, narrow = null;

  function build() {
    root = document.getElementById('drawing');
    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + VBW + ' ' + VBH);
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', 'Overhung fan rotating assembly with ten callouts');
    var bg = document.createElementNS(NS, 'g');
    bg.setAttribute('aria-hidden', 'true');
    bg.innerHTML = background();
    svg.appendChild(bg);
    var partsLayer = document.createElementNS(NS, 'g');
    labelsLayer = document.createElementNS(NS, 'g');
    svg.appendChild(partsLayer);
    svg.appendChild(labelsLayer);
    root.insertBefore(svg, root.firstChild);

    ORDER.forEach(function (id) {
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('data-part', id);
      g.innerHTML = DRAW[id]();
      partsLayer.appendChild(g);
    });

    var key = document.getElementById('key');
    PARTS.forEach(function (p, i) {
      var lg = document.createElementNS(NS, 'g');
      lg.setAttribute('class', 'rac-lbl');
      lg.setAttribute('data-label-for', p.id);
      lg.setAttribute('aria-hidden', 'true');
      lg.innerHTML = '<line/><circle r="2.6"/><rect rx="3"/><text><tspan class="rac-full"></tspan><tspan class="rac-num"></tspan></text>';
      lg.querySelector('.rac-full').textContent = p.label;
      lg.querySelector('.rac-num').textContent = String(i + 1);
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
      attempts: 2,
      mastery: MASTERY,
      order: 'shuffle',
      scoreNoun: 'Parts',
      explorePrompt: 'Click any part to see what it does, then start the quiz.',
      exploreEmpty: 'No part selected. Parts you have opened get a ✓ mark and a shaded label. When you are ready, press Quiz.',
      infoHeight: 150,
      tabOrder: TAB_ORDER,
      msg: MSG
    });

    var btnStart = document.createElement('button');
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
    root.classList.toggle('rac-narrow', narrow);
    PARTS.forEach(function (p) {
      var lg = labelsLayer.querySelector('[data-label-for="' + p.id + '"]'), L = ANCHORS[p.id];
      var t = lg.querySelector('text'), r = lg.querySelector('rect'), ln = lg.querySelector('line'),
        dot = lg.querySelector('circle');
      var tw = t.getComputedTextLength ? t.getComputedTextLength() : 0;
      if (!tw) tw = narrow ? 18 : p.label.length * 8.5;
      var h = narrow ? 38 : 26, padX = narrow ? 9 : 7;
      var bw = tw + 2 * padX;
      var lx = L[0], ly = L[1];
      if (narrow) {   // a number box close to its anchor
        lx = L[2] + (L[1] < L[3] ? -bw / 2 : -bw / 2);
        ly = L[1] < L[3] ? Math.min(L[1] + 40, L[3] - 50) : Math.max(L[1] - 20, L[3] + 52);
        if (p.id === 'turndown') { lx = L[2] - 4; ly = 300; }
        if (p.id === 'keyway') { lx = L[2] - 6; ly = 66; }
      }
      var x = Math.max(4, Math.min(lx, VBW - bw - 4));
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

  // Start over: clear visited parts and the quiz, return to explore mode.
  function startOver() {
    quiz.resetVisited();
    quiz.setMode('explore');
    quiz.render();
    FP.announce('Started over. Explore mode. Click any part to see what it does, then start the quiz.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
