// VFD Frequency and Fan Law Calculator
// CANVAS_HEIGHT: 660
// Three challenge frequencies (45, 30, 50 Hz), fixed order, two attempts each: the learner types
// the airflow, static pressure and brake horsepower the fan will have when the VFD is turned down,
// and all three are checked together (each within 2% of the model). Explore mode then unlocks the
// frequency slider (20-60 Hz) and a plot of percent airflow, pressure and power against frequency.
// Model (Chapter 15 spec Rules): r = f / 60; sync speed = 120 f / 4; Q = 10,000 r; P = 2.00 r^2;
// H = 8.0 r^3. Base duty is illustrative. No slip, drive losses or fixed system pressure.
// Built on the FanPedia kit: FP.ChallengeRunner (challenge flow, two attempts, score, mastery,
// spec wording via `messages`), FP.models.vfd (fan laws on a VFD), FP.p5 (layout, text, controls).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js, fan-models.js.

const K = FP.p5;
const SIM_ID = 'ch15-vfd-fan-law-calculator';
const BASE = { baseCfm: 10000, baseInWg: 2.0, baseBhp: 8.0, baseHz: 60, poles: 4 };
const F_MIN = 20, F_MAX = 60;

let canvasWidth = 800;
const drawHeight = 545;
const controlHeight = K.controlHeightFor(3);   // answer boxes, Check/Start over, frequency slider
const canvasHeight = drawHeight + controlHeight;

// ---------- Model and display rounding (spec Rules) ----------
function vfdAt(hz) { return FP.models.vfd(Object.assign({ hz }, BASE)); }
const fmtCfm = x => FP.fmt.num(x, 0) + ' CFM';
const fmtInWg = x => FP.fmt.num(x, 2) + ' in. wg';
const fmtBhp = x => FP.fmt.num(x, 2) + ' bhp';
const pct = x => FP.fmt.num(x * 100, 1) + '%';
const near = (v, m) => FP.check.numeric(v, m, { rel: 0.02 });

// ---------- Challenges (spec "Challenge frequencies", fixed order) ----------
const CHALLENGE_DATA = [
  { id: 'f45', hz: 45, wrong: 'Ratio 45/60 = 0.75. Airflow × 0.75; pressure × 0.75² = 0.5625; power × 0.75³ = 0.4219.' },
  { id: 'f30', hz: 30, wrong: 'Ratio 0.5. Pressure × 0.25 and power × 0.125: half the speed needs one eighth of the power.' },
  { id: 'f50', hz: 50, wrong: 'Ratio 50/60 = 0.8333. Pressure × 0.6944; power × 0.5787.' }
];
const FIELDS = [
  { key: 'cfm', name: 'Airflow', unit: 'CFM', fmt: fmtCfm },
  { key: 'inWg', name: 'Static pressure', unit: 'in. wg', fmt: fmtInWg },
  { key: 'bhp', name: 'Brake horsepower', unit: 'bhp', fmt: fmtBhp }
];

const ITEMS = CHALLENGE_DATA.map((c, i) => {
  const m = vfdAt(c.hz);
  const r = m.ratio;
  return Object.assign({}, c, {
    label: 'challenge ' + (i + 1),
    m,
    answer: m,
    answerText: fmtCfm(m.cfm) + ', ' + fmtInWg(m.inWg) + ' and ' + fmtBhp(m.bhp),
    prompt: (i === 0 ? 'The drive is turned down to ' : 'Now the drive is set to ') + c.hz +
      ' Hz. What will the fan deliver, and what will it draw?',
    worked: 'Worked: r = ' + c.hz + '/60 = ' + FP.fmt.num(r, 4) + '; ' +
      '10,000 × ' + FP.fmt.num(r, 4) + ' = ' + fmtCfm(m.cfm) + '; ' +
      '2.00 × ' + FP.fmt.num(r * r, 4) + ' = ' + fmtInWg(m.inWg) + '; ' +
      '8.0 × ' + FP.fmt.num(r * r * r, 4) + ' = ' + fmtBhp(m.bhp) + '.',
    // All three values within ±2% of the model (inclusive).
    check: (v, item) => FIELDS.every(f => near(v[f.key], item.m[f.key]))
  });
});

// First wrong attempt: a hint per wrong value that names the slip (wrong exponent, divided instead of
// multiplied, value left at 60 Hz) and never a ratio value, a multiplier or a model value.
const EXP_WORD = ['unchanged', 'the ratio itself', 'the ratio squared', 'the ratio cubed'];
const LAW = { cfm: 1, inWg: 2, bhp: 3 };
function slipHint(f, v, item) {
  const n = LAW[f.key], base = vfdAt(60)[f.key], r = item.m.ratio;
  const what = f.name;
  const rule = what + ' goes with ' + EXP_WORD[n] + ' (r' + (n > 1 ? (n === 2 ? '²' : '³') : '') + ').';
  if (near(v, base)) return what + ' still shows the 60 Hz value; scale it to the new frequency. ' + rule;
  for (let k = 1; k <= 3; k++) {
    if (near(v, base / Math.pow(r, k))) return what + ': you divided by the ratio; a lower frequency means a smaller value, so multiply. ' + rule;
  }
  for (let k = 1; k <= 3; k++) {
    if (k !== n && near(v, base * Math.pow(r, k))) return what + ': you used ' + EXP_WORD[k] + '. ' + rule;
  }
  return 'Recheck the ' + what.toLowerCase() + ' arithmetic: r = f / 60, then ' + rule.charAt(0).toLowerCase() + rule.slice(1);
}
function hintText(res) {
  const v = res.value, item = res.item;
  return FIELDS.filter(f => !near(v[f.key], item.m[f.key])).map(f => slipHint(f, v[f.key], item)).join(' ');
}

// Spec feedback: Correct "Correct: <value> at <f> Hz." First wrong: the slip hint above. After the second
// wrong attempt the model values, the "Feedback when wrong" text and the worked calculation are shown.
const runner = new FP.ChallengeRunner({
  items: ITEMS,
  attempts: 2,
  noun: 'Challenges',
  mastery: ITEMS.length,
  masteryOn: 'any',              // spec: all nine values correct within two attempts
  reviewPointer: 'Reread the 45 Hz worked example in "Variable Frequency Drive", then press Start over',
  messages: {
    correct: res => FP.msg.correct(res.item.answerText + ' at ' + res.item.hz + ' Hz'),
    retry: res => FP.msg.tryAgain(hintText(res), res.attemptsLeft),
    missed: res => FP.msg.missed(res.item.answerText, res.item.wrong + ' ' + res.item.worked)
  },
  id: SIM_ID
});

// ---------- State ----------
let feedback = null;            // {kind, message}
let marks = null;               // {cfm: true|false, ...} for the last checked attempt
let inputs = {}, checkButton, nextButton, startOverButton, fSlider;

const keys = K.keys.bind({ Enter: onEnter });
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  const main = document.querySelector('main');
  FIELDS.forEach(f => {
    const inp = createInput('');
    inp.parent(main);
    inp.attribute('inputmode', 'decimal');
    inp.attribute('aria-label', 'Predicted ' + f.name.toLowerCase() + ' in ' + (f.unit === 'in. wg' ? 'inches water gauge' : f.unit));
    inp.input(() => { marks = null; styleInputs(); });
    inputs[f.key] = inp;
  });
  checkButton = K.button(FP.msg.CHECK, checkAnswer);
  nextButton = K.button('Next challenge', nextChallenge);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });
  fSlider = createSlider(F_MIN, F_MAX, 60, 1);
  fSlider.parent(main);
  fSlider.attribute('aria-label', 'Drive frequency in hertz, 20 to 60');
  fSlider.input(() => FP.announce(readoutText(vfdAt(fSlider.value()))));
  syncControls();
  describe('VFD frequency and fan law calculator. A fan selected for 10,000 CFM at 2.00 in. wg and 8.0 bhp ' +
    'on 60 Hz power (illustrative) runs on a variable frequency drive. For three challenge frequencies ' +
    '(45, 30 and 50 Hz) type the airflow, static pressure and brake horsepower and press Check; each value ' +
    'must be within 2 percent of the fan-law model. Afterwards a frequency slider from 20 to 60 Hz updates ' +
    'every value and a plot of percent airflow, pressure and power against frequency.');
}

// ---------- Control state and layout ----------
function exploring() { return runner.state().explore; }

function syncControls() {
  const st = runner.state();
  const asking = st.phase === 'question';
  if (st.explore) {
    FIELDS.forEach(f => inputs[f.key].hide());
    checkButton.hide(); nextButton.hide();
  } else {
    FIELDS.forEach(f => { inputs[f.key].show(); K.setEnabled(inputs[f.key], asking); });
    if (asking) { checkButton.show(); nextButton.hide(); } else { checkButton.hide(); nextButton.show(); }
    nextButton.html(st.isLast ? (wide() ? 'Start exploring' : 'Explore') : (wide() ? 'Next challenge' : 'Next'));
  }
  K.setEnabled(fSlider, st.explore);
  if (!st.explore) fSlider.value(60);
  styleInputs();
  positionControls();
}

function wide() { return canvasWidth >= 600; }

// Wide: row 0 = three boxes with labels; narrow: CFM and in. wg on row 0, bhp on row 1 beside the buttons.
function rowLayout() {
  if (wide()) {
    const w = 84, gap = 12;
    const lab = [62, 28, 46], unit = [36, 46, 30];
    let x = 10;
    const pos = FIELDS.map((f, i) => {
      x += lab[i];
      const p = { x, row: 0, w, labelX: x - lab[i] + 0, unitX: x + w + 5 };
      x += w + unit[i] + gap;
      return p;
    });
    return { pos, buttonsRow: 1, buttonsX: 10, labels: ['Airflow', 'SP', 'Power'] };
  }
  const w = canvasWidth < 380 ? 72 : 84;
  const p0 = { x: 10, row: 0, w, unitX: 10 + w + 5 };
  const p1 = { x: p0.unitX + 50, row: 0, w: w - 12, unitX: p0.unitX + 50 + w - 12 + 5 };
  const p2 = { x: 10, row: 1, w: w - 16, unitX: 10 + w - 16 + 5 };
  return { pos: [p0, p1, p2], buttonsRow: 1, buttonsX: p2.unitX + 46, labels: null };
}

function positionControls() {
  const L = rowLayout();
  FIELDS.forEach((f, i) => {
    inputs[f.key].size(L.pos[i].w);
    inputs[f.key].position(L.pos[i].x, K.controlRow(L.pos[i].row));
  });
  const st = runner.state();
  if (st.explore) {
    startOverButton.position(10, K.controlRow(1));
  } else {
    K.flowButtons(L.buttonsRow, [checkButton, nextButton, startOverButton], { x: L.buttonsX });
  }
  const sl = wide() ? 310 : 150;
  fSlider.position(sl, K.controlRow(2));
  fSlider.size(K.sliderWidth(canvasWidth, sl, 15));
}

// Solid green border for a value within 2%, dashed red for one that is not (✓/✗ drawn beside it).
function styleInputs() {
  FIELDS.forEach(f => {
    const e = inputs[f.key].elt;
    const m = marks ? marks[f.key] : null;
    e.style.borderColor = m == null ? '' : FP.tok(m ? 'correct' : 'incorrect');
    e.style.borderStyle = m == null ? '' : (m ? 'solid' : 'dashed');
    e.style.borderWidth = m == null ? '' : '2px';
  });
}

// ---------- Challenge flow ----------
function onEnter() {
  const st = runner.state();
  if (st.phase === 'question') checkAnswer();
  else if (st.phase === 'resolved') nextChallenge();
}

function checkAnswer() {
  const st = runner.state();
  if (st.phase !== 'question') return;
  const v = {};
  FIELDS.forEach(f => { v[f.key] = FP.fmt.parseNumber(inputs[f.key].value()); });
  if (FIELDS.some(f => isNaN(v[f.key]))) {
    // Not graded: all three numbers are needed (no attempt used).
    feedback = { kind: 'info', message: FP.msg.ENTER_NUMBER + ' in all three boxes: airflow (CFM), static pressure (in. wg) and brake horsepower (bhp).' };
    FP.announce(feedback.message);
    return;
  }
  const item = st.item;
  marks = {};
  FIELDS.forEach(f => { marks[f.key] = near(v[f.key], item.m[f.key]); });
  const res = runner.submit(v);
  if (res.status === 'ignored') return;
  feedback = { kind: res.kind, message: res.message };
  syncControls();
  FP.announce(markText() + '. ' + res.message);
  if (res.status !== 'retry') nextButton.elt.focus();
}

function markText() {
  return FIELDS.map(f => f.name + ' ' + (marks[f.key] ? 'within 2 percent' : 'not within 2 percent')).join(', ');
}

function nextChallenge() {
  if (!runner.next()) return;
  feedback = null;
  marks = null;
  FIELDS.forEach(f => inputs[f.key].value(''));
  syncControls();
  const st = runner.state();
  if (st.explore) {
    const s = runner.summary();
    FP.announce(s.lines[0] + '. ' + s.lines[1] + ' ' + FP.msg.EXPLORE + ': the frequency slider is unlocked. ' +
      'At 30 Hz airflow is still 50% while power is 12.5%.');
    fSlider.elt.focus();
  } else {
    FP.announce('Challenge ' + (st.index + 1) + ' of ' + ITEMS.length + '. ' + st.item.prompt);
    inputs.cfm.elt.focus();
  }
}

function startOver() {
  runner.restart();
  feedback = null;
  marks = null;
  FIELDS.forEach(f => inputs[f.key].value(''));
  syncControls();
  FP.announce('Started over. Challenge 1 of ' + ITEMS.length + '. ' + ITEMS[0].prompt);
  inputs.cfm.elt.focus();
}

function readoutText(m) {
  return 'At ' + Math.round(m.ratio * 60) + ' Hz: ratio ' + FP.fmt.num(m.ratio, 4) + ', synchronous speed ' +
    FP.fmt.num(m.syncRpm) + ' RPM, ' + fmtCfm(m.cfm) + ' (' + pct(m.ratio) + '), ' + fmtInWg(m.inWg) +
    ' (' + pct(m.ratio * m.ratio) + '), ' + fmtBhp(m.bhp) + ' (' + pct(m.ratio ** 3) + ').';
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  const st = runner.state();
  let y = K.title(canvasWidth >= 470 ? 'VFD Frequency and Fan Law Calculator' : 'VFD Fan Law Calculator');
  const right = st.explore ? FP.msg.EXPLORE
    : 'Challenge ' + (st.index + 1) + ' of ' + ITEMS.length + ' · ' + st.attemptLabel;
  y = K.statusLine(st.scoreLabel, right, null, { y: y - 4 });
  const nl = K.note(canvasWidth >= 560
    ? [FP.msg.ILLUSTRATIVE, 'Base duty 10,000 CFM, 2.00 in. wg, 8.0 bhp at 60 Hz', '4-pole motor']
    : [FP.msg.ILLUSTRATIVE, 'Base 10,000 CFM, 2.00 in. wg, 8.0 bhp at 60 Hz, 4-pole'], { y: drawHeight - 6, lines: 2 });
  const top = y + 2, bottom = drawHeight - 10 - 17 * nl;

  // Which frequency the readout shows: 60 Hz while a challenge is open, the challenge's model once it
  // resolves, the slider in Explore mode.
  const hz = st.explore ? fSlider.value() : (st.phase === 'resolved' ? st.item.hz : 60);
  const m = vfdAt(hz);
  const heading = st.explore ? 'At ' + hz + ' Hz' : (st.phase === 'resolved' ? 'Model at ' + hz + ' Hz' : 'Base duty at 60 Hz');

  if (wide()) {
    const lw = Math.round((canvasWidth - 30) * 0.54);
    const lx = 10, rx = lx + lw + 10, rw = canvasWidth - rx - 10;
    const tH = tableHeight(15, lw);
    const pH = bottom - top - tH - 8;
    drawPromptPanel(lx, top, lw, pH);
    drawTable(lx, bottom - tH, lw, m, heading, 15);
    drawRight(rx, top, rw, bottom - top, m, st);
  } else {
    // Narrow: prompt and feedback first, then the readout table; the plot only in Explore mode
    // (the fan-law formulas shrink to one line under the table while challenges are open).
    const ts = 13, tw = canvasWidth - 20;
    const tH = tableHeight(ts, tw);
    const plotH = st.explore ? Math.max(140, bottom - top - tH - 16 - drawPromptPanel(10, top, tw, 0, 13)) : 0;
    const formulaH = st.explore ? 0 : 20;
    const pH = bottom - top - tH - 8 - (plotH ? plotH + 8 : 0) - formulaH;
    drawPromptPanel(10, top, tw, pH);
    drawTable(10, top + pH + 8, tw, m, heading, ts);
    if (st.explore) drawPlot(10, bottom - plotH, tw, plotH, m);
    else {
      noStroke(); fill(FP.tok('text')); textSize(12); textAlign(LEFT, BOTTOM);
      text('r = f/60:  Q × r,  P × r²,  H × r³', 12, bottom);
    }
  }
  drawControlLabels(st);
}

function paras(list, x, y, w, ts, dry) {
  for (const p of list) {
    const s = p.small ? Math.max(12, ts - 2) : ts;
    textSize(s);
    textStyle(p.bold ? BOLD : NORMAL);
    noStroke();
    fill(p.color || FP.tok(p.muted ? 'text-muted' : 'text'));
    y += p.gap || 0;
    y = K.wrapText(p.t, x, y, w, Math.round(s * 1.3), { dryRun: dry });
  }
  textStyle(NORMAL);
  return y;
}

// With `dryTs`, returns the height the panel needs at that text size and draws nothing.
function drawPromptPanel(x, y, w, h, dryTs) {
  const st = runner.state();
  const pad = 10, iw = w - 2 * pad, fpad = 7;
  let body;
  if (st.explore) {
    body = wide() ? [
      { t: FP.msg.EXPLORE + ': move the frequency slider from 20 to 60 Hz.', bold: true },
      { t: 'Every value updates at once. Find 30 Hz: how much air is still moving, and how much power is the fan drawing?', gap: 4 }
    ] : [
      { t: FP.msg.EXPLORE + ': move the frequency slider (20-60 Hz).', bold: true },
      { t: 'At 30 Hz, how much air still moves, and how much power does the fan draw?', gap: 2 }
    ];
    const s = runner.summary();
    body.push({ t: s.lines[0] + '. ' + s.lines[1], gap: 4, color: FP.tok(s.mastered ? 'correct' : 'text') });
  } else {
    body = [
      { t: 'Challenge ' + (st.index + 1) + ' of ' + ITEMS.length, muted: true, small: true },
      { t: st.item.prompt, bold: true, gap: 2 },
      { t: 'Type the airflow, static pressure and brake horsepower below, then press Check. Each must be within 2% of the model.', gap: 4 }
    ];
  }
  const fb = feedback ? [{ t: feedback.message, color: FP.tok(feedback.kind === 'ok' ? 'correct' : feedback.kind === 'bad' ? 'incorrect' : 'primary-dark') }] : [];
  const layout = ts => {
    let yy = paras(body, 0, 0, iw, ts, true);
    if (fb.length) yy += 6 + paras(fb, 0, 0, iw - 2 * fpad, ts, true) + 2 * fpad;
    return yy + 2 * pad;
  };
  if (dryTs) return layout(dryTs);
  const ts = K.fitTextSize(layout, h, 16, 12);
  K.panel(x, y, w, h);
  let yy = paras(body, x + pad, y + pad, iw, ts, false);
  if (fb.length) {
    const fbH = paras(fb, 0, 0, iw - 2 * fpad, ts, true) + 2 * fpad;
    const k = feedback.kind;
    K.panel(x + pad - 3, yy + 6, iw + 6, fbH, {
      fill: k === 'ok' ? '--fp-correct-bg' : k === 'bad' ? '--fp-incorrect-bg' : '--fp-primary-bg',
      stroke: k === 'ok' ? '--fp-correct' : k === 'bad' ? '--fp-incorrect' : '--fp-primary',
      dashed: k === 'bad', weight: 2
    });
    paras(fb, x + pad + fpad, yy + 6 + fpad, iw - 2 * fpad, ts, false);
  }
}

const TABLE_ROWS = 6;
const NOTE_1 = 'Model ignores motor slip, drive losses and any fixed system pressure.';
const NOTE_2 = 'Above 60 Hz: check the fan\'s maximum safe speed in the current catalog first.';
const NOTE_1S = 'Ignores slip, drive losses, fixed system pressure.';
const NOTE_2S = 'Above 60 Hz: check the catalog max safe speed.';
function notesFor(w) { return w < 400 ? [NOTE_1S, NOTE_2S] : [NOTE_1, NOTE_2]; }
function noteLines(w) {
  textSize(12);
  return notesFor(w).reduce((n, t) => n + K.countLines(t, w - 20), 0);
}
function tableRows(w) { return wide() ? TABLE_ROWS : TABLE_ROWS - 1; }   // narrow: f is in the heading
function tableHeight(ts, w) { return 8 + (ts + 6) + tableRows(w) * (ts + 7) + noteLines(w) * 15 + 12; }

function drawTable(x, y, w, m, heading, ts) {
  const h = tableHeight(ts, w);
  K.panel(x, y, w, h, { fill: '--fp-primary-bg', stroke: '--fp-primary' });
  const pad = 10, rowH = ts + 7;
  const r = m.ratio;
  const rows = [
    ['Drive frequency f', FP.fmt.num(r * 60) + ' Hz', pct(r)],
    ['Frequency ratio f/60', FP.fmt.num(r, 4), ''],
    ['Synchronous speed', FP.fmt.num(m.syncRpm) + ' RPM', pct(r)],
    ['Airflow', fmtCfm(m.cfm), pct(r)],
    ['Static pressure', fmtInWg(m.inWg), pct(r * r)],
    ['Brake horsepower', fmtBhp(m.bhp), pct(r * r * r)]
  ];
  if (tableRows(w) < TABLE_ROWS) rows.shift();
  noStroke();
  textSize(ts);
  const narrow = w < 380;
  const c2 = x + w - pad - (narrow ? 58 : 92), c1 = c2 - (narrow ? 14 : 24);
  fill(FP.tok('text'));
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text(heading, x + pad, y + 8);
  textAlign(RIGHT, TOP);
  textSize(Math.max(12, ts - 2));
  fill(FP.tok('text-muted'));
  text(narrow ? '% of 60 Hz' : '% of 60 Hz value', x + w - pad, y + 10);
  textStyle(NORMAL);
  let yy = y + 8 + ts + 6;
  rows.forEach((row, i) => {
    textSize(ts);
    fill(FP.tok('text'));
    textAlign(LEFT, TOP);
    text(narrow ? row[0].replace('Synchronous', 'Sync.').replace('Brake horsepower', 'Brake hp').replace('Frequency ratio', 'Ratio') : row[0], x + pad, yy);
    textStyle(BOLD);
    textAlign(RIGHT, TOP);
    text(row[1], c1, yy);
    textStyle(NORMAL);
    text(row[2], x + w - pad, yy);
    yy += rowH;
  });
  stroke(FP.tok('border'));
  line(x + pad, yy + 1, x + w - pad, yy + 1);
  noStroke();
  fill(FP.tok('text-muted'));
  textSize(12);
  textAlign(LEFT, TOP);
  const [t1, t2] = notesFor(w);
  const yN = K.wrapText(t1, x + pad, yy + 5, w - 2 * pad, 15);
  K.wrapText(t2, x + pad, yN, w - 2 * pad, 15);
}

// Right column (or bottom on narrow screens): the percent plot in Explore mode, the fan-law
// formulas while challenges are open.
function drawRight(x, y, w, h, m, st) {
  if (st.explore) { drawPlot(x, y, w, h, m); return; }
  K.panel(x, y, w, h);
  const pad = 12;
  const lines = [
    { t: 'Fan laws on a VFD', bold: true },
    { t: 'Speed ratio = frequency ratio:  r = f / 60', gap: 6 },
    { t: 'Synchronous speed = 120 × f / 4 poles', gap: 2 },
    { t: 'Airflow  Q₂ = Q₁ × r', gap: 8 },
    { t: 'Pressure  P₂ = P₁ × r²', gap: 2 },
    { t: 'Power  H₂ = H₁ × r³', gap: 2 },
    { t: 'The poles and the sheave ratio do not change; the drive changes only f.', gap: 8, muted: true },
    { t: 'The plot of percent airflow, pressure and power against frequency unlocks after challenge 3.', gap: 8, muted: true }
  ];
  const ts = K.fitTextSize(t => paras(lines, 0, 0, w - 2 * pad, t, true) + 2 * pad, h, 16, 12);
  paras(lines, x + pad, y + pad, w - 2 * pad, ts, false);
}

const SERIES = [
  { key: 'q', label: 'Airflow (r)', fn: r => r, tok: 'series-1', dash: 0 },
  { key: 'p', label: 'Pressure (r²)', fn: r => r * r, tok: 'series-2', dash: 1 },
  { key: 'h', label: 'Power (r³)', fn: r => r * r * r, tok: 'series-3', dash: 2 }
];

function drawPlot(x, y, w, h, m) {
  K.panel(x, y, w, h, { fill: '#ffffff' });
  const small = w < 330 || h < 220;
  const shortLegend = w < 440;
  const legendH = small ? 18 : 22;
  const x0 = x + (small ? 40 : 58), x1 = x + w - 12;
  const y0 = y + 10 + legendH, y1 = y + h - (small ? 34 : 40);
  const sx = f => map(f, F_MIN, F_MAX, x0, x1);
  const sy = p => map(p, 0, 100, y1, y0);
  textSize(12);
  for (let f = F_MIN; f <= F_MAX; f += 10) {
    stroke(FP.tok('info-bg')); strokeWeight(1);
    line(sx(f), y0, sx(f), y1);
    noStroke(); fill(FP.tok('text'));
    textAlign(CENTER, TOP);
    text(f, sx(f), y1 + 4);
  }
  for (let p = 0; p <= 100; p += 25) {
    stroke(FP.tok('info-bg'));
    line(x0, sy(p), x1, sy(p));
    noStroke(); fill(FP.tok('text'));
    textAlign(RIGHT, CENTER);
    text(p + '%', x0 - 4, sy(p));
  }
  stroke(FP.tok('border')); noFill();
  rect(x0, y0, x1 - x0, y1 - y0);
  noStroke(); fill(FP.tok('text'));
  textSize(small ? 12 : 13);
  textAlign(CENTER, TOP);
  text('Drive frequency (Hz)', (x0 + x1) / 2, y1 + (small ? 18 : 20));
  if (!small) {
    push();
    translate(x + 13, (y0 + y1) / 2);
    rotate(-HALF_PI);
    textAlign(CENTER, CENTER);
    text('% of 60 Hz value', 0, 0);
    pop();
  }
  // curves
  SERIES.forEach(s => {
    stroke(FP.tok(s.tok)); strokeWeight(2.5); noFill();
    drawingContext.setLineDash(FP.SERIES_DASH[s.dash]);
    beginShape();
    for (let f = F_MIN; f <= F_MAX; f += 0.5) vertex(sx(f), sy(100 * s.fn(f / 60)));
    endShape();
    drawingContext.setLineDash([]);
  });
  // current frequency marker and points
  const f = Math.round(m.ratio * 60);
  stroke(FP.tok('text-muted')); strokeWeight(1);
  drawingContext.setLineDash([3, 3]);
  line(sx(f), y0, sx(f), y1);
  drawingContext.setLineDash([]);
  SERIES.forEach((s, i) => {
    const v = 100 * s.fn(m.ratio);
    stroke(255); strokeWeight(1.5); fill(FP.tok(s.tok));
    const px = sx(f), py = sy(v);
    if (i === 0) circle(px, py, 9);
    else if (i === 1) rect(px - 4, py - 4, 8, 8);
    else triangle(px, py - 5, px - 5, py + 4, px + 5, py + 4);
  });
  // legend (line samples carry the dash pattern)
  textSize(12);
  let lx = x0;
  SERIES.forEach(s => {
    const label = shortLegend ? s.label.replace(/ \(r.?\)/, '') : s.label + ' ' + pct(s.fn(m.ratio));
    stroke(FP.tok(s.tok)); strokeWeight(2.5);
    drawingContext.setLineDash(FP.SERIES_DASH[s.dash]);
    line(lx, y + 10 + legendH / 2, lx + 18, y + 10 + legendH / 2);
    drawingContext.setLineDash([]);
    noStroke(); fill(FP.tok('text'));
    textAlign(LEFT, CENTER);
    text(label, lx + 22, y + 10 + legendH / 2);
    lx += 22 + textWidth(label) + (shortLegend ? 10 : 14);
  });
}

// Labels and ✓/✗ marks in the control region.
function drawControlLabels(st) {
  noStroke();
  textSize(13);
  textAlign(LEFT, CENTER);
  if (!st.explore) {
    const L = rowLayout();
    FIELDS.forEach((f, i) => {
      const p = L.pos[i];
      const cy = K.controlLabel(p.row);
      fill(FP.tok('text'));
      if (L.labels) { textAlign(RIGHT, CENTER); text(L.labels[i], p.x - 5, cy); textAlign(LEFT, CENTER); }
      text(f.unit, p.unitX, cy);
      if (marks) {
        fill(FP.tok(marks[f.key] ? 'correct' : 'incorrect'));
        textStyle(BOLD);
        text(marks[f.key] ? FP.msg.OK : FP.msg.BAD, p.unitX + textWidth(f.unit) + 3, cy);
        textStyle(NORMAL);
      }
    });
  } else {
    fill(FP.tok('text'));
    if (wide()) text('Explore mode: the challenges are done.', 10 + startOverButton.elt.offsetWidth + 12, K.controlLabel(1));
  }
  fill(FP.tok(st.explore ? 'text' : 'text-muted'));
  textAlign(LEFT, CENTER);
  const hz = st.explore ? fSlider.value() : 60;
  const label = wide()
    ? 'Frequency: ' + hz + ' Hz' + (st.explore ? ' (20-60 Hz)' : ' (unlocks after challenge 3)')
    : 'Frequency: ' + hz + ' Hz' + (st.explore ? '' : ' (locked)');
  text(label, 10, K.controlLabel(2));
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  syncControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
