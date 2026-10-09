// High Temperature Fan Heat Path - HTML + inline SVG on the FanPedia kit
// CANVAS_HEIGHT: 848
// Ten labeled parts on two illustrative side views (a belt-driven centrifugal fan on a high
// temperature style pedestal, and an Arrangement 9 plug fan through an insulated wall).
// For each part the learner commits a job (Block, Shed or Allow) before its description is
// revealed: any order, one attempt each, mastery 8 of 10 on the first attempt.
// Engine: FP.CalloutQuiz (choose prompts, free order). This file draws the SVG and adds the
// post-quiz Block / Shed / Allow filter (a gap the engine leaves to the sim).

(function () {
  'use strict';

  var SIM_ID = 'ch21-high-temp-heat-path';
  var MASTERY = 8;

  // ---------- Content (chapter 21 specification, "Content" table) ----------
  var JOBS = [
    { id: 'block', name: 'Block', label: 'Block: blocks heat from reaching the bearings' },
    { id: 'shed', name: 'Shed', label: 'Shed: sheds heat that has already reached the shaft' },
    { id: 'allow', name: 'Allow', label: 'Allow: allows parts to grow without binding' }
  ];
  var JOB_NAME = { block: 'Block', shed: 'Shed', allow: 'Allow' };

  var PARTS = [
    { n: 1, id: 'cooler', label: 'Shaft cooler', job: 'shed',
      text: 'A cast aluminum wheel on the shaft that throws off heat conducted from the airstream; recommended over 300°F.' },
    { n: 2, id: 'recess', label: 'Recess cone', job: 'shed',
      text: 'A cone-shaped pocket in the insulated plug or wall that gives the shaft cooler room and outside air.' },
    { n: 3, id: 'coolerBox', label: 'Cooler box', job: 'shed',
      text: 'An uninsulated open area around the shaft cooler, so insulation does not smother it.' },
    { n: 4, id: 'pins', label: 'Insulation pins', job: 'block', plural: true,
      text: 'Pins that hold the housing insulation, which blocks heat leaving the housing surface.' },
    { n: 5, id: 'floating', label: 'Floating bearing', job: 'allow',
      text: 'The non-locating bearing, which lets the shaft grow axially as it heats.' },
    { n: 6, id: 'separated', label: 'Separated pedestal', job: 'block',
      text: 'A gap of up to 3 in. between housing and pedestal reduces heat conducted into the pedestal and bearings.' },
    { n: 7, id: 'angle', label: 'High temp angle', job: 'block',
      text: 'An angle (also called heat angle, inverted angle or spacer angle) that spaces the pedestal from the housing on a high temperature style pedestal.' },
    { n: 8, id: 'shield', label: 'Motor heat shield', job: 'block',
      text: 'A shield on the pedestal between the hot housing and the motor.' },
    { n: 9, id: 'plug', label: 'Insulated plug', job: 'block',
      text: 'Insulation in the plug or wall that limits heat passing from the hot side to the drive side.' },
    { n: 10, id: 'fixed', label: 'Fixed bearing', job: 'allow',
      text: 'The locating bearing; it fixes one end so all growth goes toward the floating bearing.' }
  ];
  var BY_ID = {};
  PARTS.forEach(function (p) { BY_ID[p.id] = p; });

  // One choose prompt per part, in the spec's table order (answered in any order).
  var PROMPTS = PARTS.map(function (p) {
    return {
      id: p.n, target: p.id, answer: p.job, why: p.text, choices: JOBS,
      prompt: 'What job ' + (p.plural ? 'do' : 'does') + ' the ' + p.label.toLowerCase() + ' do: block, shed or allow?'
    };
  });

  // Spec feedback wording: Correct: "Correct: <description>." Incorrect: "Not quite. <description>."
  // The incorrect line also names the right job, so it reaches screen readers (the → glyph on the
  // choice button shows it visually).
  var MSG = {
    correct: function (c) { return '✓ Correct: ' + c.answerText; },
    missed: function (c) { return '✗ Not quite. ' + c.answerText + ' Its job: ' + JOB_NAME[c.prompt.answer] + '.'; },
    score: function (noun, n, N) { return n + ' of ' + N + ' correct'; },
    freeIntro: 'Select any part that is not answered yet, then choose its job.',
    reviewPointer: 'Select a part you missed to reread its description, then press Start over.',
    next: 'Next part'
  };
  var EXPLORE_PROMPT = 'Select any part to reread its description. Use Show to see only the Block, Shed or Allow parts.';

  // ---------- SVG drawing (viewBox units; 880 x 462) ----------
  var NS = 'http://www.w3.org/2000/svg';
  var VBW = 880, VBH = 462;
  var C = {
    metal: 'var(--fp-metal)', side: 'var(--fp-metal-side)', edge: 'var(--fp-edge)', motor: 'var(--fp-motor)',
    bearing: 'var(--fp-bearing)', belt: 'var(--fp-belt)', hot: 'var(--fp-accent)', white: '#ffffff'
  };
  function r(x, y, w, h, fill, extra) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill +
      '" stroke="' + C.edge + '" stroke-width="1.5"' + (extra || '') + '/>';
  }
  function poly(pts, fill, extra) {
    return '<polygon points="' + pts + '" fill="' + fill + '" stroke="' + C.edge + '" stroke-width="1.5"' + (extra || '') + '/>';
  }
  function ln(x1, y1, x2, y2, stroke, w, extra) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + stroke +
      '" stroke-width="' + w + '"' + (extra || '') + '/>';
  }
  function txt(x, y, s, cls, anchor) {
    return '<text x="' + x + '" y="' + y + '" class="' + cls + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + s + '</text>';
  }
  function arrow(x1, y, x2) {
    // hot-gas arrow, left to right
    return ln(x1, y, x2 - 8, y, C.hot, 4) + poly((x2 - 10) + ',' + (y - 7) + ' ' + x2 + ',' + y + ' ' + (x2 - 10) + ',' + (y + 7), C.hot, ' stroke="none"');
  }

  // Context drawing (not selectable): housings, shafts, impellers, belts, motors, wall
  function contextSvg() {
    var s = '';
    // ---- A: belt-driven centrifugal fan ----
    s += ln(0, 362, 590, 362, C.edge, 2);                                     // floor
    s += r(50, 334, 140, 28, C.side);                                         // housing support
    s += r(30, 96, 176, 238, 'url(#hp-insul)');                               // housing insulation
    s += r(42, 108, 152, 214, C.metal);                                       // housing
    s += r(8, 168, 34, 74, C.metal);                                          // inlet collar
    s += r(100, 130, 58, 164, 'none', ' stroke-dasharray="6 4"');             // impeller (hidden)
    s += arrow(0, 205, 92);
    s += txt(58, 128, 'Hot airstream', 'hp-hot hp-wide') + txt(50, 132, 'Hot gas', 'hp-hot hp-narrow');
    s += ln(120, 180, 566, 180, C.edge, 7, ' stroke-linecap="round"');      // shaft
    s += txt(10, 454, 'A. Belt-driven fan on a high temperature style pedestal', 'hp-cap hp-wide') +
      txt(10, 456, 'A. Belt-driven fan', 'hp-cap hp-narrow');
    // ---- B: Arrangement 9 plug fan through an insulated wall ----
    s += ln(610, 362, 880, 362, C.edge, 2);
    s += r(700, 40, 48, 70, C.side);                                          // wall above the plug
    s += r(700, 300, 48, 62, C.side);                                         // wall below the plug
    s += r(626, 120, 8, 170, C.metal);                                        // inlet cone side
    s += r(640, 128, 34, 154, C.metal);                                       // plug fan impeller
    s += ln(646, 140, 668, 270, C.edge, 1.5) + ln(668, 140, 646, 270, C.edge, 1.5);
    s += r(674, 124, 6, 162, C.side);                                         // backplate
    s += arrow(608, 205, 632);
    s += ln(660, 205, 872, 205, C.edge, 7, ' stroke-linecap="round"');      // shaft
    s += r(760, 222, 104, 10, C.side);                                        // bearing base on the wall
    s += r(780, 188, 24, 34, C.bearing) + r(830, 188, 24, 34, C.bearing);    // bearings
    s += r(862, 180, 10, 50, C.side);                                         // fan sheave
    s += r(863, 190, 8, 110, C.belt, ' stroke="none"');
    s += r(782, 284, 70, 44, C.motor) + r(760, 328, 104, 8, C.side);         // motor and shelf
    s += r(862, 290, 10, 30, C.side);
    s += ln(852, 305, 862, 305, C.edge, 4);
    s += txt(664, 104, 'Hot side', 'hp-side hp-wide', 'middle') + txt(654, 106, 'Hot', 'hp-side hp-narrow', 'middle');
    s += txt(812, 104, 'Drive side', 'hp-side hp-wide', 'middle') + txt(812, 106, 'Drive', 'hp-side hp-narrow', 'middle');
    s += txt(612, 454, 'B. Arr. 9 plug fan, insulated wall', 'hp-cap hp-wide') +
      txt(612, 456, 'B. Arr. 9 plug fan', 'hp-cap hp-narrow');
    return s;
  }

  // Context drawn in front of the parts (the motor sits on the side of the pedestal)
  function frontSvg() {
    var s = '';
    s += r(548, 150, 14, 60, C.side);                                         // fan sheave
    s += r(549, 160, 12, 160, C.belt, ' stroke="none"');                      // belts
    s += r(548, 286, 14, 40, C.side);                                         // motor sheave
    s += r(400, 276, 128, 58, C.motor);                                       // motor
    s += ln(528, 305, 548, 305, C.edge, 5);
    s += r(410, 334, 108, 8, C.side);                                         // motor mount
    s += txt(464, 311, 'Motor', 'hp-motor', 'middle');
    s += r(728, 182, 10, 46, C.side);                                         // shaft cooler in the recess cone
    return s;
  }

  // Selectable parts: id -> SVG markup
  var DRAW = {
    pins: function () {
      var s = '';
      [64, 100, 136, 172].forEach(function (x) {
        s += ln(x, 108, x, 90, C.edge, 3) + r(x - 6, 86, 12, 4, C.edge);
      });
      [140, 270].forEach(function (y) { s += ln(42, y, 24, y, C.edge, 3) + r(20, y - 6, 4, 12, C.edge); });
      // transparent hit area so the thin pins are easy to select
      s += '<rect x="16" y="80" width="170" height="14" fill="transparent"/>';
      return s;
    },
    coolerBox: function () {
      return r(208, 120, 62, 92, 'transparent', ' stroke-dasharray="7 4" stroke-width="2.5"');
    },
    cooler: function () {
      var s = r(232, 150, 14, 60, C.side);
      for (var y = 156; y <= 204; y += 8) s += ln(232, y, 246, y, C.edge, 1);
      return s;
    },
    separated: function () {
      // pedestal frame, set apart from the housing by a gap
      return poly('240,220 524,220 532,362 240,362', C.side) +
        ln(208, 352, 238, 352, C.edge, 1.5) + poly('208,352 214,348 214,356', C.edge) + poly('238,352 232,348 232,356', C.edge);
    },
    angle: function () {
      return poly('194,234 250,234 250,256 244,256 244,240 194,240', C.edge) +
        poly('194,300 250,300 250,322 244,322 244,306 194,306', C.edge);
    },
    fixed: function () { return r(298, 158, 40, 52, C.bearing) + r(290, 208, 56, 12, C.bearing) + r(340, 172, 6, 16, C.edge); },
    floating: function () { return r(450, 158, 40, 52, C.bearing) + r(442, 208, 56, 12, C.bearing); },
    shield: function () { return r(366, 250, 8, 104, C.edge) + r(358, 352, 24, 6, C.edge); },
    recess: function () { return poly('748,150 722,178 722,232 748,260', C.white, ' stroke-width="2.5"'); },
    plug: function () {
      return r(700, 110, 48, 190, 'url(#hp-insul)', ' stroke-width="2"');
    }
  };
  // Paint order: the plug before the recess cone and cooler, pedestal before bearings and shield.
  var PAINT = ['plug', 'recess', 'separated', 'angle', 'coolerBox', 'cooler', 'pins', 'fixed', 'floating', 'shield'];

  // Label boxes: [x of box left, baseline row y, anchor x, anchor y]
  var LABELS = {
    pins: [16, 30, 90, 88],
    coolerBox: [186, 30, 258, 122],
    fixed: [270, 66, 318, 158],
    floating: [420, 30, 470, 158],
    cooler: [116, 66, 239, 152],
    recess: [700, 30, 734, 166],
    angle: [40, 418, 222, 318],
    shield: [214, 418, 370, 330],
    separated: [392, 418, 500, 352],
    plug: [636, 418, 724, 292]
  };

  var root, svg, quiz, filterBtns = {}, filterNote, current = 'all', labelLayer, compact = null;

  // Narrow frames (drawing under 560 px wide): the SVG scales down, so labels shrink to their
  // part number in a larger font (the prompt and infobox still name the part) and the
  // captions shorten; the label boxes are re-sized for the new text.
  function applyCompact() {
    var c = svg.getBoundingClientRect().width < 560;
    if (c === compact) return;
    compact = c;
    root.classList.toggle('hp-compact', c);
    PARTS.forEach(function (p) {
      labelLayer.querySelector('[data-label-for="' + p.id + '"] text').textContent = c ? String(p.n) : p.n + '. ' + p.label;
    });
    sizeLabels(labelLayer);
  }

  function build() {
    root = document.getElementById('drawing');
    filterNote = document.getElementById('filterNote');
    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + VBW + ' ' + VBH);
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', 'Side views of a belt-driven high temperature fan and an Arrangement 9 plug fan, with ten labeled parts');
    svg.innerHTML =
      '<defs><pattern id="hp-insul" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<rect width="10" height="10" fill="#ffffff"/><line x1="0" y1="0" x2="0" y2="10" stroke="var(--fp-text-muted)" stroke-width="1.2"/></pattern></defs>' +
      '<g class="hp-ctx" aria-hidden="true">' + contextSvg() + '</g>';
    var partsLayer = document.createElementNS(NS, 'g');
    var labelsLayer = document.createElementNS(NS, 'g');
    var front = document.createElementNS(NS, 'g');
    front.setAttribute('class', 'hp-ctx');
    front.setAttribute('aria-hidden', 'true');
    front.innerHTML = frontSvg();
    svg.appendChild(partsLayer);
    svg.appendChild(front);
    svg.appendChild(labelsLayer);
    root.insertBefore(svg, root.firstChild);

    PAINT.forEach(function (id) {
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'hp-part');
      g.setAttribute('data-part', id);
      g.innerHTML = DRAW[id]();
      partsLayer.appendChild(g);
    });
    PARTS.forEach(function (p) {
      var lg = document.createElementNS(NS, 'g');
      lg.setAttribute('class', 'hp-lbl');
      lg.setAttribute('data-label-for', p.id);
      lg.setAttribute('aria-hidden', 'true');
      lg.innerHTML = '<line/><circle r="2.6"/><rect rx="3"/><text></text>';
      labelsLayer.appendChild(lg);
    });
    labelLayer = labelsLayer;
    applyCompact();
    window.addEventListener('resize', applyCompact);

    quiz = FP.CalloutQuiz.mount({
      root: root,
      id: SIM_ID,
      parts: PARTS.map(function (p) { return { id: p.id, label: p.label, text: p.text }; }),
      prompts: PROMPTS,
      attempts: 1,
      mastery: MASTERY,
      order: 'free',
      explore: 'after',
      hideLabels: false,
      scoreNoun: 'Parts',
      explorePrompt: EXPLORE_PROMPT,
      exploreEmpty: 'No part selected. Select a part on the drawing to reread its description.',
      tabOrder: PARTS.map(function (p) { return p.id; }),
      infoHeight: 178,
      msg: MSG,
      onAnswer: function () { markLabels(); },
      onModeChange: function () { markLabels(); updateFilter(); },
      onComplete: function () { markLabels(); updateFilter(); }
    });
    quiz.ui.btnQuiz.title = 'Quiz mode. Pressing it again clears every answer and starts the ten parts over';
    buildFilter();
    markLabels();
    updateFilter();
  }

  // Size the label boxes to their text and draw the leader lines.
  function sizeLabels(layer) {
    PARTS.forEach(function (p) {
      var lg = layer.querySelector('[data-label-for="' + p.id + '"]'), L = LABELS[p.id];
      var t = lg.querySelector('text'), bx = lg.querySelector('rect'), line = lg.querySelector('line'), dot = lg.querySelector('circle');
      var w = t.getComputedTextLength ? t.getComputedTextLength() : 0;
      if (!w) w = t.textContent.length * 8.5;
      var x = Math.max(4, Math.min(compact ? L[2] - w / 2 - 7 : L[0], VBW - w - 18));
      var hh = compact ? 19 : 13;
      t.setAttribute('x', x + 7);
      t.setAttribute('y', L[1] + (compact ? 9 : 6));
      bx.setAttribute('x', x);
      bx.setAttribute('y', L[1] - hh);
      bx.setAttribute('width', Math.round(w + 14));
      bx.setAttribute('height', 2 * hh);
      var ax = L[2], ay = L[3];
      var cx = Math.max(x + 6, Math.min(ax, x + w + 8)), cy = ay < L[1] ? L[1] - hh : L[1] + hh;
      line.setAttribute('x1', ax); line.setAttribute('y1', ay);
      line.setAttribute('x2', cx); line.setAttribute('y2', cy);
      dot.setAttribute('cx', ax); dot.setAttribute('cy', ay);
    });
  }

  // Answered labels get a solid (correct) or dashed (missed) border; the engine's ✓/✗ badge
  // on the part carries the verdict too.
  function markLabels() {
    var st = quiz.state;
    PARTS.forEach(function (p, i) {
      var lg = svg.querySelector('[data-label-for="' + p.id + '"]');
      var res = st.results[i];
      lg.classList.toggle('hp-done', res !== undefined);
      lg.classList.toggle('hp-ok', res === 'first' || res === 'later');
      lg.classList.toggle('hp-bad', res === 'missed');
    });
  }

  // ---------- Post-quiz filter: show only the Block, Shed or Allow parts ----------
  function buildFilter() {
    var box = document.getElementById('filter');
    var lab = document.createElement('span');
    lab.className = 'hp-filter-lbl';
    lab.textContent = 'Show:';
    box.appendChild(lab);
    [['all', 'All parts']].concat(JOBS.map(function (j) { return [j.id, j.name]; })).forEach(function (f) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'fp-btn choice';
      b.textContent = f[1];
      b.addEventListener('click', function () { applyFilter(f[0], true); });
      filterBtns[f[0]] = b;
      box.appendChild(b);
    });
  }

  function filterUnlocked() { return quiz.state.everCompleted && quiz.state.mode !== 'quiz'; }

  function updateFilter() {
    var on = filterUnlocked();
    Object.keys(filterBtns).forEach(function (k) { filterBtns[k].disabled = !on; });
    if (!on) {
      applyFilter('all', false);
      filterNote.textContent = 'The Block / Shed / Allow filter unlocks after all 10 parts are answered.';
    } else if (current === 'all') {
      filterNote.textContent = 'Filter the drawing by job. Count the parts that block, shed and allow.';
    }
  }

  function applyFilter(job, speak) {
    current = job;
    Object.keys(filterBtns).forEach(function (k) {
      filterBtns[k].setAttribute('aria-pressed', k === job ? 'true' : 'false');
    });
    PARTS.forEach(function (p) {
      var dim = job !== 'all' && p.job !== job;
      Array.prototype.forEach.call(svg.querySelectorAll('[data-part="' + p.id + '"], [data-label-for="' + p.id + '"]'), function (e) {
        e.classList.toggle('hp-dim', dim);
      });
    });
    if (!speak) return;
    var text;
    if (job === 'all') text = 'All 10 parts: 5 block, 3 shed and 2 allow.';
    else {
      var list = PARTS.filter(function (p) { return p.job === job; });
      text = JOB_NAME[job] + ': ' + list.length + ' part' + (list.length === 1 ? '' : 's') + ' (' +
        list.map(function (p) { return p.label.toLowerCase(); }).join(', ') + ').';
      if (job === 'allow') text += ' Only the two bearings allow growth.';
    }
    filterNote.textContent = text;
    FP.announce(text);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
