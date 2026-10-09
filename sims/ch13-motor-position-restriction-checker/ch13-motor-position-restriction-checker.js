// Motor Position Restriction Checker - HTML/SVG verdict sorter
// CANVAS_HEIGHT: 716
// Learners judge ten illustrative order lines (arrangement, rotation, discharge, motor
// position) as Allowed, Not allowed or Height check needed, one scored attempt each.
// Built on the FanPedia kit: FP.CardDeck (line flow, score, mastery), FP.codes
// (checkMotorPosition, MOTOR_RESTRICTIONS, discharge table), FD.geom + FD.palette
// (drive-side scroll geometry and part colours, drawn here as SVG), FP.msg, FP.ui, FP.announce.
(function () {
  'use strict';

  const SIM_ID = 'ch13-motor-position-restriction-checker';
  const C = FP.codes;
  const MASTERY = 9;
  const PROMPT = 'Can this line be ordered as written?';

  const VERDICTS = [
    { id: 'allowed', label: 'Allowed', short: 'Allowed' },
    { id: 'not-allowed', label: 'Not allowed', short: 'Not allowed' },
    { id: 'height-check', label: 'Height check needed', short: 'Height check' }
  ];
  const VERDICT = {};
  VERDICTS.forEach(v => { VERDICT[v.id] = v; });

  // Order lines (illustrative), fixed order. `spec` is the chapter's Verdict column; the
  // answer the deck scores comes from FP.codes.checkMotorPosition and is checked against it.
  const LINES = [
    { arr: '3', fan: 'SWSI', rot: 'CW', dis: 'BHD', pos: 'Z', spec: 'not-allowed',
      why: 'For CW BHD the motor in Z interferes with the outlet opening.' },
    { arr: '3', fan: 'SWSI', rot: 'CW', dis: 'BHD', pos: 'W', spec: 'allowed',
      why: 'For CW BHD only Z is restricted; W is available.' },
    { arr: '1', fan: 'SWSI', rot: 'CCW', dis: 'BHD', pos: 'W', spec: 'not-allowed',
      why: 'The mirror rule: for CCW BHD the restricted position is W.' },
    { arr: '1', fan: 'SWSI', rot: 'CW', dis: 'TAD', pos: 'W', spec: 'not-allowed',
      why: 'For CW TAD the motor in W interferes with the outlet opening.' },
    { arr: '3F', fan: 'SWSI', rot: 'CCW', dis: 'TAD', pos: 'Z', spec: 'not-allowed',
      why: 'For CCW TAD the restricted position is Z, on Arrangement 3F as on 1 and 3.' },
    { arr: '3', fan: 'SWSI', rot: 'CCW', dis: 'TAD', pos: 'W', spec: 'allowed',
      why: 'For CCW TAD only Z is restricted.' },
    { arr: '1', fan: 'SWSI', rot: 'CW', dis: 'THD', pos: 'W', spec: 'height-check',
      why: 'The motor may not fit below a CW THD outlet in W; on Arrangement 1 a lengthened pedestal makes it fit.' },
    { arr: '3', fan: 'SWSI', rot: 'CCW', dis: 'THD', pos: 'Z', spec: 'height-check',
      why: 'For CCW THD the height restriction applies to Z.' },
    { arr: '3', fan: 'SWSI', rot: 'CW', dis: 'UBD', pos: 'Y', spec: 'allowed',
      why: 'FanPedia lists no motor position restriction for UBD.' },
    { arr: '9SS', fan: null, rot: 'CCW', dis: 'UBD', pos: 'L', spec: 'not-allowed',
      why: 'Arrangement 9SS is built CW with (L) or CCW with (R) only.' }
  ].map((l, i) => {
    const answer = C.checkMotorPosition({ arrangement: l.arr, rotation: l.rot, discharge: l.dis, position: l.pos }).verdict;
    if (answer !== l.spec) console.warn(SIM_ID + ': line ' + (i + 1) + ' kit verdict ' + answer + ' differs from the chapter (' + l.spec + ')');
    const is9 = l.arr === '9SS';
    const posText = is9 ? '(' + l.pos + ')' : l.pos;
    return Object.assign(l, {
      id: 'line-' + (i + 1),
      answer: answer,
      text: (is9 ? 'Arrangement 9SS swingout' : l.fan + ' Arrangement ' + l.arr) + ', ' + l.rot + ', ' + l.dis +
        ', motor position ' + posText,
      short: (is9 ? 'Arr. 9SS' : 'Arr. ' + l.arr) + ', ' + l.rot + ' ' + l.dis + ', ' + posText,
      compact: l.arr + ' ' + l.rot + ' ' + l.dis + ' ' + posText
    });
  });

  const $ = id => document.getElementById(id);
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const pal = FD.palette();

  const deck = new FP.CardDeck({
    cards: LINES, shuffle: false, attempts: 1, retryMissed: false,
    noun: 'Verdicts', mastery: MASTERY, id: SIM_ID,
    reviewPointer: 'Open the rule card, recheck the missed lines, then press Start over.',
    label: answer => VERDICT[answer].label,
    // Spec wording: Correct "Correct: <verdict>."; incorrect "Not quite: <verdict>." then the Why.
    messages: {
      correct: res => FP.msg.correct(VERDICT[res.card.answer].label, res.card.why),
      missed: res => FP.msg.BAD + ' Not quite: ' + VERDICT[res.card.answer].label + '. ' + res.card.why
    }
  });

  let chosen = null;        // verdict id picked for the current line
  let picks = [];           // learner's scored verdict per line (for the summary)
  let lastRes = null;       // result of the latest submission

  // ------------------------------------------------------------------ SVG helpers
  function el(tag, attrs, parent, text) {
    const e = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  const pts = arr => arr.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');

  function arrow(g, x1, y1, x2, y2, color, width, dashed) {
    el('line', { x1, y1, x2, y2, stroke: color, 'stroke-width': width, 'stroke-linecap': 'round',
      'stroke-dasharray': dashed ? '6 4' : 'none' }, g);
    const a = Math.atan2(y2 - y1, x2 - x1), h = 9;
    el('polygon', { points: pts([[x2 + Math.cos(a) * 3, y2 + Math.sin(a) * 3],
      [x2 - h * Math.cos(a - 0.45), y2 - h * Math.sin(a - 0.45)],
      [x2 - h * Math.cos(a + 0.45), y2 - h * Math.sin(a + 0.45)]]), fill: color }, g);
  }

  // Drive-side scroll housing (same geometry as FD.scrollHousing), outlet air path and rotation arc.
  function housing(g, cx, cy, s, rot, angle, opts) {
    const o = opts || {};
    const geo = FD.geom.scrollGeometry(cx, cy, s, rot, C.dischargeByCode(angle).angle);
    el('polygon', { points: pts(geo.spiral.concat([geo.outerEnd, geo.innerEnd])), fill: pal.metal,
      stroke: pal.edge, 'stroke-width': 2, 'stroke-linejoin': 'round' }, g);
    const rw = geo.R0 * 0.78;
    el('circle', { cx, cy, r: rw, fill: pal.white, stroke: pal.hub, 'stroke-width': 1.5 }, g);
    for (let k = 0; k < 10; k++) {
      const b = k * Math.PI / 5;
      el('line', { x1: cx + rw * 0.45 * Math.cos(b), y1: cy + rw * 0.45 * Math.sin(b),
        x2: cx + rw * 0.95 * Math.cos(b + geo.dir * 0.35), y2: cy + rw * 0.95 * Math.sin(b + geo.dir * 0.35),
        stroke: pal.hub, 'stroke-width': 1.2 }, g);
    }
    el('circle', { cx, cy, r: rw * 0.18, fill: pal.hub }, g);
    // air leaving the outlet, extended as a dashed path to show where the discharge goes
    // (clamped to the box {x0, y0, x1, y1} so it never leaves the sketch)
    const m = geo.mouth, d = geo.dvec, b = o.box || { x0: 4, y0: 4, x1: 356, y1: 222 };
    let run = o.airRun || s * 0.45;
    if (d.x > 0) run = Math.min(run, (b.x1 - 6 - m[0]) / d.x);
    if (d.x < 0) run = Math.min(run, (b.x0 + 6 - m[0]) / d.x);
    if (d.y > 0) run = Math.min(run, (b.y1 - 6 - m[1]) / d.y);
    if (d.y < 0) run = Math.min(run, (b.y0 + 6 - m[1]) / d.y);
    arrow(g, m[0], m[1], m[0] + d.x * run, m[1] + d.y * run, pal.air, 3, true);
    // rotation arc with arrowhead and label
    const ra = geo.R1 + s * 0.07, start = geo.alpha + geo.dir * 0.6, sweep = geo.dir * Math.PI * 1.2;
    const arc = FD.geom.arcPoints(cx, cy, ra, start, sweep, 40);
    el('polyline', { points: pts(arc), fill: 'none', stroke: pal.accent, 'stroke-width': 2.5 }, g);
    const e1 = arc[arc.length - 2], e2 = arc[arc.length - 1];
    arrow(g, e1[0], e1[1], e2[0], e2[1], pal.accent, 2.5, false);
    if (o.rotLabel === 'corner') {
      el('text', { x: 8, y: 18, 'font-size': 15, 'font-weight': 'bold', fill: pal.accentText }, g,
        'Rotation: ' + rot + (rot === 'CW' ? ' ↻' : ' ↺'));
    } else if (o.rotLabel !== false) {
      const mid = arc[Math.floor(arc.length / 2)];
      const lx = cx + (mid[0] - cx) * 1.28, ly = cy + (mid[1] - cy) * 1.28;
      el('text', { x: lx, y: ly + 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 'bold',
        fill: pal.accentText }, g, rot);
    }
    return geo;
  }

  // Motor box. state: 'motor' (the proposed position) | 'blocked' | 'height' | 'plain'
  function motorBox(g, x, yTop, w, h, label, state) {
    const bg = el('g', {}, g);
    const blocked = state === 'blocked', height = state === 'height';
    el('rect', { x: x - w / 2, y: yTop, width: w, height: h, rx: 4,
      fill: blocked || height ? pal.white : (state === 'plain' ? pal.metal : pal.motor),
      stroke: blocked ? pal.incorrect : height ? pal.accentText : (state === 'plain' ? pal.edge : pal.motorEdge),
      'stroke-width': blocked || height ? 2.5 : 1.5, 'stroke-dasharray': blocked || height ? '5 3' : 'none' }, bg);
    if (blocked) bg.appendChild(FP.svg.mark('bad', { x, y: yTop + h / 2, size: Math.min(w, h) * 0.7, width: 3 }));
    if (height) {
      // vertical double arrow: "check the height"
      const c = pal.accentText;
      el('line', { x1: x, y1: yTop + 4, x2: x, y2: yTop + h - 4, stroke: c, 'stroke-width': 2 }, bg);
      el('polygon', { points: pts([[x, yTop + 2], [x - 5, yTop + 9], [x + 5, yTop + 9]]), fill: c }, bg);
      el('polygon', { points: pts([[x, yTop + h - 2], [x - 5, yTop + h - 9], [x + 5, yTop + h - 9]]), fill: c }, bg);
    }
    el('text', { x, y: yTop + h + 16, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 'bold',
      fill: pal.text }, bg, label);
    return bg;
  }

  function proposedRing(g, x, yTop, w, h) {
    el('rect', { x: x - w / 2 - 5, y: yTop - 5, width: w + 10, height: h + 10, rx: 7, fill: 'none',
      stroke: pal.primary, 'stroke-width': 3 }, g);
    // white halo keeps the label readable where the air path crosses it
    el('text', { x, y: yTop - 10, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 'bold',
      fill: pal.primary, stroke: pal.white, 'stroke-width': 4, 'paint-order': 'stroke' }, g, 'proposed');
  }

  // Positions in the drive-side view (FD.motorPositions layout): W and Z beside the
  // housing, X and Y further out; W, X on the right and Y, Z on the left.
  const PLACE = { Y: 38, Z: 102, W: 258, X: 322 };

  function drawSWSI(svg, line, revealed) {
    const g = el('g', {}, svg);
    const cx = 180, cy = 92, s = 186, floorY = 190, mw = 46, mh = 32;
    el('line', { x1: 8, y1: floorY, x2: 352, y2: floorY, stroke: pal.floor, 'stroke-width': 2 }, g);
    // housing support down to the floor
    el('rect', { x: cx - 32, y: cy + 54, width: 64, height: floorY - cy - 54, fill: pal.metalSide,
      stroke: pal.edge, 'stroke-width': 1.5 }, g);
    housing(g, cx, cy, s, line.rot, line.dis, { airRun: s * 0.6, rotLabel: 'corner', box: { x0: 4, y0: 4, x1: 356, y1: floorY } });
    const restr = C.MOTOR_RESTRICTIONS.filter(r => r.discharge === line.dis && r.rotation === line.rot);
    ['Y', 'Z', 'W', 'X'].forEach(p => {
      const r = restr.find(q => q.position === p);
      let state = p === line.pos ? 'motor' : 'plain';
      if (revealed && r) state = r.verdict === 'not-allowed' ? 'blocked' : 'height';
      motorBox(g, PLACE[p], floorY - mh, mw, mh, p, state);
    });
    proposedRing(g, PLACE[line.pos], floorY - mh, mw, mh);
    el('text', { x: 8, y: 222, 'font-size': 12.5, fill: pal.muted }, g,
      'Schematic, not to scale · W, Z beside the housing; X, Y beyond');
  }

  // 9SS: the two buildable pairings side by side, with the proposed combination marked.
  function draw9SS(svg, line, revealed) {
    const g = el('g', {}, svg);
    const panes = [
      { x: 92, rot: 'CW', pos: 'L', head: 'Right swing' },
      { x: 268, rot: 'CCW', pos: 'R', head: 'Left swing' }
    ];
    panes.forEach(p => {
      el('text', { x: p.x, y: 22, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 'bold', fill: pal.text }, g, p.head);
      housing(g, p.x, 96, 120, p.rot, 'UBD', { airRun: 30 });
      el('text', { x: p.x, y: 172, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 'bold', fill: pal.text }, g,
        p.rot + ' with (' + p.pos + ')');
      if (revealed) {
        g.appendChild(FP.svg.mark('ok', { x: p.x, y: 190, size: 14, width: 3 }));
      }
    });
    const ok = panes.some(p => p.rot === line.rot && p.pos === line.pos);
    el('text', { x: 180, y: 218, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 'bold',
      fill: revealed && !ok ? pal.incorrect : pal.primary }, g,
      'Proposed: ' + line.rot + ' with (' + line.pos + ')' + (revealed && !ok ? ': not a 9SS pairing' : ''));
  }

  function drawSketch() {
    const svg = $('sketch');
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const st = deck.state();
    const line = st.card;
    const revealed = st.phase === 'feedback';
    if (line.arr === '9SS') draw9SS(svg, line, revealed); else drawSWSI(svg, line, revealed);
    $('sketchHead').textContent = 'Drive-side view: ' + line.short;
    $('sketchCaption').textContent = captionFor(line, revealed);
  }

  function captionFor(line, revealed) {
    if (line.arr === '9SS') {
      return revealed ? 'Arrangement 9SS has two fixed pairings: CW with (L), CCW with (R).'
        : 'Arrangement 9SS swingout, ' + line.rot + ', motor position (' + line.pos + ').';
    }
    const where = line.rot + ' ' + line.dis + ' outlet points ' +
      C.directionWords(C.airDirection(line.rot, C.dischargeByCode(line.dis).angle)) + '; proposed motor in ' + line.pos + '.';
    if (!revealed) return where;
    const restr = C.MOTOR_RESTRICTIONS.filter(r => r.discharge === line.dis && r.rotation === line.rot);
    if (!restr.length) return line.rot + ' ' + line.dis + ': no restricted position. All of W, X, Y, Z are available.';
    return restr.map(r => line.rot + ' ' + line.dis + ': ' + r.position +
      (r.verdict === 'not-allowed' ? ' not allowed (✗ dashed box), motor interferes with the outlet.'
        : ' needs a height check (↕ dashed box).')).join(' ');
  }

  // ------------------------------------------------------------------ rule card
  // One row per restricted discharge: the code, then the CW and CCW restriction and the reason.
  function buildRuleCard() {
    const body = $('ruleRows');
    ['BHD', 'TAD', 'THD'].forEach(dis => {
      const tr = document.createElement('tr');
      tr.dataset.dis = dis;
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = dis;
      th.title = C.dischargeByCode(dis).name;
      tr.appendChild(th);
      const td = document.createElement('td');
      const rs = rot => C.MOTOR_RESTRICTIONS.find(r => r.discharge === dis && r.rotation === rot);
      const txt = r => r.verdict === 'not-allowed' ? r.position + ' not allowed' : r.position + ', height check';
      ['CW', 'CCW'].forEach((rot, i) => {
        if (i) td.appendChild(document.createTextNode(' · '));
        const sp = document.createElement('span');
        sp.dataset.rot = rot;
        sp.textContent = rot + ': ' + txt(rs(rot));
        td.appendChild(sp);
      });
      const why = document.createElement('div');
      why.className = 'mpc-rules-why';
      why.textContent = dis === 'THD' ? 'Motor may not fit below the discharge; Arrangement 1 pedestal can be lengthened.'
        : 'Motor interferes with the outlet opening.';
      td.appendChild(why);
      tr.appendChild(td);
      body.appendChild(tr);
    });
  }

  function clearRuleHighlight() {
    document.querySelectorAll('#ruleCard .mpc-hl').forEach(e => e.classList.remove('mpc-hl'));
    document.querySelectorAll('#ruleCard .mpc-hl-cell').forEach(e => e.classList.remove('mpc-hl-cell'));
  }

  // Highlights the rule that decides the line; returns a short pointer for the feedback.
  function highlightRule(line) {
    clearRuleHighlight();
    if (line.arr === '9SS') {
      $('rule9ss').classList.add('mpc-hl');
      return 'Rule card: Arrangement 9SS line highlighted.';
    }
    const tr = document.querySelector('#ruleRows tr[data-dis="' + line.dis + '"]');
    if (!tr) return 'Rule card: no row applies to ' + line.dis + '.';
    tr.classList.add('mpc-hl');
    tr.querySelector('span[data-rot="' + line.rot + '"]').classList.add('mpc-hl-cell');
    return 'Rule card: ' + line.dis + ' row, ' + line.rot + ' restriction highlighted.';
  }

  // ------------------------------------------------------------------ activity
  function buildChoices() {
    const host = $('choices');
    VERDICTS.forEach((v, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice';
      b.dataset.verdict = v.id;
      b.setAttribute('aria-pressed', 'false');
      b.textContent = (i + 1) + ' · ' + v.label;
      b.setAttribute('aria-label', v.label + ' (key ' + (i + 1) + ')');
      b.addEventListener('click', () => choose(v.id));
      host.appendChild(b);
    });
  }

  function choose(id) {
    if (deck.state().phase !== 'choose') return;
    chosen = id;
    render();
  }

  function render() {
    const st = deck.state();
    const summary = st.phase === 'summary';
    $('score').textContent = st.scoreLabel;
    FP.ui.progress($('progress'), st.results, summary ? -1 : st.index, 'Line');
    $('lineNum').textContent = 'Order line ' + (st.index + 1) + ' of ' + LINES.length + ' (illustrative)';
    $('lineText').textContent = st.card.text;
    $('prompt').textContent = PROMPT;
    $('prompt').hidden = summary;
    document.querySelector('.mpc-line').hidden = summary;
    document.querySelectorAll('#choices button').forEach(b => {
      // pressed (with the kit's ✓ prefix) only while choosing; afterwards "You chose" names the pick
      b.setAttribute('aria-pressed', String(st.phase === 'choose' && b.dataset.verdict === chosen));
      b.disabled = st.phase !== 'choose';
      b.hidden = summary;
    });
    $('submitBtn').hidden = summary;
    $('chose').hidden = summary;
    $('submitBtn').disabled = st.phase !== 'choose' || !chosen;
    $('nextBtn').hidden = st.phase !== 'feedback';
    $('nextBtn').textContent = st.isLast ? 'Show summary' : 'Next line';
    if (!summary) drawSketch();
    else $('sketchCaption').textContent = 'Notice: every restriction flips between W and Z when the rotation flips ' +
      '(CW BHD forbids Z, CCW BHD forbids W).';
  }

  function submit() {
    const st = deck.state();
    if (st.phase !== 'choose' || !chosen) return;
    const line = st.card;
    const res = deck.place(chosen);
    if (res.status === 'ignored') return;
    lastRes = res;
    picks[st.index] = chosen;
    $('chose').textContent = 'You chose: ' + VERDICT[chosen].label + '.';
    $('ruleCard').open = true;
    const pointer = highlightRule(line);
    FP.ui.feedback($('feedback'), res.kind, res.message, { announce: false });
    FP.announce('You chose ' + VERDICT[chosen].label + '. ' + res.message + ' ' + pointer);
    render();
    $('nextBtn').focus();
  }

  function next() {
    const st = deck.state();
    if (st.phase !== 'feedback') return;
    deck.next();
    if (deck.state().phase === 'summary') return showSummary();
    chosen = null;
    $('chose').textContent = '';
    $('feedback').className = 'fp-feedback';
    $('feedback').textContent = '';
    clearRuleHighlight();
    render();
    const nst = deck.state();
    FP.announce('Order line ' + (nst.index + 1) + ' of ' + LINES.length + ': ' + nst.card.text + '. ' + PROMPT);
    const first = document.querySelector('#choices button');
    if (first) first.focus();
  }

  function showSummary() {
    const s = deck.summary();
    clearRuleHighlight();
    $('chose').textContent = '';
    // Side-by-side table in the activity column (the sketch keeps the last line).
    const host = $('sumHost');
    let tbl = $('sumTable');
    if (tbl) tbl.remove();
    tbl = document.createElement('table');
    tbl.id = 'sumTable';
    tbl.className = 'mpc-sum';
    tbl.setAttribute('aria-label', 'Your verdict and the correct verdict for each line');
    const head = tbl.createTHead().insertRow();
    ['#', 'Arr. rot. disch. pos.', 'Your verdict', 'Correct'].forEach(h => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = h;
      head.appendChild(th);
    });
    const body = tbl.createTBody();
    LINES.forEach((l, i) => {
      const tr = body.insertRow();
      const ok = picks[i] === l.answer;
      tr.insertCell().textContent = String(i + 1);
      tr.insertCell().textContent = l.compact;
      const you = tr.insertCell();
      you.textContent = (ok ? FP.msg.OK : FP.msg.BAD) + ' ' + (picks[i] ? VERDICT[picks[i]].short : '—');
      you.className = ok ? 'ok' : 'bad';
      tr.insertCell().textContent = VERDICT[l.answer].short;
    });
    host.appendChild(tbl);
    // Final feedback: first-attempt score and the mastery line.
    const fb = $('feedback');
    fb.className = 'fp-feedback final';
    fb.textContent = '';
    s.lines.forEach(t => { const d = document.createElement('div'); d.textContent = t; fb.appendChild(d); });
    FP.announce(s.lines.join(' '));
    render();
    $('startOver').focus();
  }

  function startOver() {
    deck.newRound();
    chosen = null;
    picks = [];
    lastRes = null;
    const tbl = $('sumTable');
    if (tbl) tbl.remove();
    $('chose').textContent = '';
    $('feedback').className = 'fp-feedback';
    $('feedback').textContent = '';
    clearRuleHighlight();
    $('ruleCard').open = false;
    render();
    FP.announce('Started over. Order line 1 of ' + LINES.length + ': ' + LINES[0].text + '. ' + PROMPT);
  }

  function setupKeys() {
    document.addEventListener('keydown', e => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const st = deck.state();
      const t = e.target;
      const onButton = t && (t.tagName === 'BUTTON' || t.tagName === 'SUMMARY' || t.tagName === 'A');
      if (e.key >= '1' && e.key <= '3') {
        if (st.phase === 'choose') { e.preventDefault(); choose(VERDICTS[+e.key - 1].id); }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        $('ruleCard').open = !$('ruleCard').open;
      } else if (e.key === 'Enter' && !onButton) {
        if (st.phase === 'choose' && chosen) { e.preventDefault(); submit(); }
        else if (st.phase === 'feedback') { e.preventDefault(); next(); }
      } else if (e.key === 'Enter' && t && t.dataset && t.dataset.verdict && st.phase === 'choose') {
        // Enter on a verdict button picks it and submits in one step.
        e.preventDefault();
        choose(t.dataset.verdict);
        submit();
      }
    });
  }

  function init() {
    buildRuleCard();
    buildChoices();
    $('submitBtn').addEventListener('click', submit);
    $('nextBtn').addEventListener('click', next);
    $('startOver').addEventListener('click', startOver);
    setupKeys();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
