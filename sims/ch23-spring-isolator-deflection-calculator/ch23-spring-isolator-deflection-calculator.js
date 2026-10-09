// Spring Isolator Deflection Calculator - p5.js MicroSim (Chapter 23: Spring Isolators,
// Restraints and Field Measurement)
// CANVAS_HEIGHT: 700
// Three deflection challenges (W, n, k given; the learner types the static deflection), then
// Explore mode: weight, isolator count, spring rate and fan speed sliders update every result.
// Built on the FanPedia kit: FP.ChallengeRunner (challenge flow, wording, score, mastery),
// FP.models.isolator (load per isolator, deflection, natural and running frequency, ratio,
// transmissibility, isolation, status), FD.spring (free and loaded springs), FP.p5 (layout,
// text, controls, keys). Rules: delta = (W / n) / k; fn = 3.13 / sqrt(delta);
// f = rpm / 60; r = f / fn; isolating above r = 1.41; resonance within 0.02 of r = 1.
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js, fan-models.js,
// fan-drawings.js (load them before this file, also in the p5.js editor).

const K = FP.p5;
const SIM_ID = 'ch23-spring-isolator-deflection-calculator';

// ---------- Canvas layout ----------
let canvasWidth = 800;
const drawHeight = 480;
const controlHeight = K.controlHeightFor(6);   // answer row, Start over row, 4 slider rows
const canvasHeight = drawHeight + controlHeight;

// ---------- Model options (chapter 23 rules) ----------
const ISO_OPTS = { threshold: 1.41, resonanceTol: 0.02 };
const DEFAULTS = { W: 2400, n: 4, k: 600, rpm: 1180 };
const TYPICAL_MAX_IN = 2.00;
const HIGH_DEFLECTION_NOTE = 'Above the typical 2-inch deflection; higher deflection requires ' +
  'engineering review (FanPedia p. 134).';
const DATA_NOTE = FP.msg.note('Illustrative values', 'Typical deflections: FanPedia p. 134');

// Spring drawing scale: an illustrative 4-inch free height, drawn to scale with its deflection.
const FREE_IN = 4.0;
const MAX_DRAWN_IN = 3.4;     // beyond this the loaded coil is drawn at the limit and labelled

// ---------- Challenges (fixed order, two attempts each; spec feedback text) ----------
const CHALLENGES = [
  { id: 'four-isolators', W: 2400, n: 4, k: 600,
    wrong: 'Divide the weight among the isolators first: 2,400 / 4 = 600 lb, then 600 / 600 = 1.00 in.' },
  { id: 'six-isolators', W: 3600, n: 6, k: 300,
    wrong: 'Six isolators share 3,600 lb, so each carries 600 lb; 600 / 300 = 2.00 in.' },
  { id: 'stiff-spring', W: 1600, n: 4, k: 1600,
    wrong: 'Each isolator carries 400 lb; a stiff 1,600 lb/in spring compresses only 400 / 1,600 = 0.25 in.' }
];
const ITEMS = CHALLENGES.map((c, i) => ({
  id: c.id, W: c.W, n: c.n, k: c.k,
  label: 'challenge ' + (i + 1),
  prompt: 'W = ' + FP.fmt.num(c.W) + ' lb on n = ' + c.n + ' isolators, k = ' + FP.fmt.num(c.k) +
    ' lb/in each. How far will each spring compress?',
  model: FP.models.springDeflectionIn(c.W, c.n, c.k),
  tolerance: { abs: 0.02 },
  unit: 'in.', decimals: 2,
  hint: c.wrong,
  why: c.wrong
}));

const runner = new FP.ChallengeRunner({
  items: ITEMS,
  attempts: 2,
  noun: 'Challenges',
  mastery: ITEMS.length,
  reviewPointer: 'Press Start over to try the three challenges again',
  id: SIM_ID,
  // Spec: Correct: "Correct: δ = <model value> in."; wrong answers keep the kit wording
  // around the spec's "Feedback when wrong" text (retry hint, then the missed reveal).
  messages: {
    correct: res => FP.msg.OK + ' Correct: δ = ' + FP.fmt.num(res.item.model, 2) + ' in.'
  }
});

// ---------- State ----------
let feedback = null;          // {kind, message}
let answerLine = '';

// ---------- Controls ----------
let answerInput, checkButton, nextButton, startOverButton;
let wSlider, nSlider, kSlider, rpmSlider;

const keys = K.keys.bind({ Enter: onEnter });
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  const main = document.querySelector('main');

  answerInput = createInput('');
  answerInput.parent(main);
  answerInput.attribute('inputmode', 'decimal');
  answerInput.attribute('aria-label', 'Your answer: static deflection in inches');

  checkButton = K.button(FP.msg.CHECK, checkAnswer);
  nextButton = K.button('Next challenge', nextChallenge);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  wSlider = makeSlider(400, 8000, DEFAULTS.W, 100, 'Total supported weight W, pounds');
  nSlider = makeSlider(4, 8, DEFAULTS.n, 2, 'Number of isolators n');
  kSlider = makeSlider(100, 3000, DEFAULTS.k, 50, 'Spring rate k of each isolator, pounds per inch');
  rpmSlider = makeSlider(300, 3600, DEFAULTS.rpm, 10, 'Fan speed, rpm');

  setInputs(ITEMS[0]);
  syncControls();

  describe('Spring isolator deflection calculator. Three challenges give a total weight, a number of ' +
    'spring isolators and a spring rate; the learner types the static deflection of each spring and ' +
    'presses Check. The sim then draws the loaded spring to scale beside a free spring and shows the ' +
    'natural frequency, running frequency, frequency ratio, transmissibility, isolation efficiency and ' +
    'status. After the three challenges, Explore mode unlocks sliders for weight, isolator count, ' +
    'spring rate and fan speed.');
}

function makeSlider(min, max, val, step, label) {
  const s = createSlider(min, max, val, step);
  s.parent(document.querySelector('main'));
  s.attribute('aria-label', label);
  return s;
}

// ---------- Control state and layout ----------
function syncControls() {
  const st = runner.state();
  const asking = st.phase === 'question';
  if (st.explore) {
    answerInput.hide(); checkButton.hide(); nextButton.hide();
  } else {
    answerInput.show();
    K.setEnabled(answerInput, asking);
    if (asking) { checkButton.show(); nextButton.hide(); } else { checkButton.hide(); nextButton.show(); }
    const short = canvasWidth < 380;
    nextButton.html(st.phase === 'resolved' && st.isLast ? (short ? 'Explore' : 'Start exploring')
      : (short ? 'Next' : 'Next challenge'));
    nextButton.attribute('aria-label', st.phase === 'resolved' && st.isLast ? 'Start exploring' : 'Next challenge');
  }
  for (const s of [wSlider, nSlider, kSlider, rpmSlider]) { K.setEnabled(s, st.explore); }
  positionControls();
}

function narrowControls() { return canvasWidth < 480; }
function sliderLeft() { return narrowControls() ? 196 : 250; }

function positionControls() {
  const narrow = narrowControls();
  const inputX = narrow ? 100 : 118;
  const inputW = narrow ? 72 : 100;
  answerInput.size(inputW);
  answerInput.position(inputX, K.controlRow(0));
  const bx = inputX + inputW + 34;               // room for the "in." unit label
  checkButton.position(bx, K.controlRow(0));
  nextButton.position(bx, K.controlRow(0));
  startOverButton.position(10, K.controlRow(1));
  const sw = K.sliderWidth(canvasWidth, sliderLeft(), 15);
  [wSlider, nSlider, kSlider, rpmSlider].forEach((s, i) => {
    s.position(sliderLeft(), K.controlRow(2 + i));
    s.size(sw);
  });
}

function setInputs(v) {
  wSlider.value(v.W);
  nSlider.value(v.n);
  kSlider.value(v.k);
  rpmSlider.value(v.rpm != null ? v.rpm : DEFAULTS.rpm);
}

function inputs() {
  return { W: Number(wSlider.value()), n: Number(nSlider.value()), k: Number(kSlider.value()),
    rpm: Number(rpmSlider.value()) };
}

// ---------- Challenge flow (FP.ChallengeRunner) ----------
function onEnter() {
  const st = runner.state();
  if (st.phase === 'question') { checkAnswer(); } else if (st.phase === 'resolved') { nextChallenge(); }
}

function checkAnswer() {
  const res = runner.submit(answerInput.value());
  if (res.status === 'ignored') { return; }
  feedback = { kind: res.kind, message: res.message };
  if (res.status === 'correct' || res.status === 'missed') {
    const iso = isoModel();
    const raw = String(answerInput.value()).replace(/,/g, '').trim();
    answerLine = 'Your answer: ' + FP.fmt.numUpTo(res.value, 4) + ' in. · Model: δ = ' +
      FP.fmt.num(res.item.model, 2) + ' in.';
    if (!raw) { answerLine = ''; }
    FP.announce(res.message + ' Natural frequency ' + FP.fmt.num(iso.fnHz, 2) + ' hertz.');
    syncControls();
    nextButton.elt.focus();
  } else {
    FP.announce(res.message);
  }
}

function nextChallenge() {
  if (!runner.next()) { return; }
  feedback = null;
  answerLine = '';
  const st = runner.state();
  if (st.explore) {
    setInputs(DEFAULTS);
    syncControls();
    const s = runner.summary();
    FP.announce(s.lines.join(' ') + ' ' + FP.msg.EXPLORE + ': the weight, isolator, spring rate and ' +
      'fan speed sliders are unlocked.');
    wSlider.elt.focus();
  } else {
    setInputs(st.item);
    answerInput.value('');
    syncControls();
    FP.announce('Challenge ' + (st.index + 1) + ' of ' + ITEMS.length + ': ' + st.item.prompt);
    answerInput.elt.focus();
  }
}

function startOver() {
  runner.restart();
  feedback = null;
  answerLine = '';
  setInputs(ITEMS[0]);
  answerInput.value('');
  syncControls();
  FP.announce('Started over. Challenge 1 of ' + ITEMS.length + ': ' + ITEMS[0].prompt);
  answerInput.elt.focus();
}

// ---------- Model (FP.models) ----------
function isoModel() {
  const v = inputs();
  return FP.models.isolator({ rpm: v.rpm, totalLb: v.W, count: v.n, rateLbPerIn: v.k }, ISO_OPTS);
}

// Revealed when exploring or after a challenge resolves; hidden while the learner answers.
function revealed() {
  const st = runner.state();
  return st.explore || st.phase === 'resolved';
}

function statusText(iso) {
  if (iso.status === 'isolating') { return 'Isolating'; }
  if (iso.status === 'resonance') { return 'Resonance'; }
  return 'Amplifying: springs too stiff for this speed';
}

function readouts(iso, show) {
  const q = '?';
  const T = iso.status === 'resonance' ? 'very large' : FP.fmt.num(iso.T, 3);
  const eff = iso.status === 'isolating' ? FP.fmt.num(iso.isolationPct, 1) + '%' : 'none';
  return [
    ['Load per isolator', 'Load each', show ? FP.fmt.num(iso.loadPerIsolatorLb, 0) + ' lb' : q],
    ['Static deflection δ', 'δ', show ? FP.fmt.num(iso.deflectionIn, 2) + ' in' : q],
    ['Natural frequency fₙ', 'fₙ', show ? FP.fmt.num(iso.fnHz, 2) + ' Hz' : q],
    ['Running frequency f', 'f', FP.fmt.num(iso.fHz, 2) + ' Hz'],
    ['Frequency ratio r', 'r', show ? FP.fmt.num(iso.r, 2) : q],
    ['Transmissibility T', 'T', show ? T : q],
    ['Isolation efficiency', 'Isolation', show ? eff : q]
  ];
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  const wide = canvasWidth >= 640;
  const iso = isoModel();
  const show = revealed();
  const top = K.title(canvasWidth >= 420 ? 'Spring Isolator Deflection Calculator' : 'Spring Deflection Calculator');

  if (wide) {
    const lw = Math.round(Math.min(330, canvasWidth * 0.4));
    drawSprings({ x: 10, y: top + 2, w: lw, h: drawHeight - 26 - (top + 2) }, iso, show);
    const rx = 10 + lw + 10, rw = canvasWidth - rx - 10;
    const tableBottom = drawTable({ x: rx, y: top + 2, w: rw }, iso, show, true);
    drawBox({ x: rx, y: tableBottom + 8, w: rw, h: drawHeight - 26 - (tableBottom + 8) }, iso, show, true);
  } else {
    const sh = 160;
    drawSprings({ x: 10, y: top, w: canvasWidth - 20, h: sh }, iso, show);
    const tableBottom = drawTable({ x: 10, y: top + sh + 4, w: canvasWidth - 20 }, iso, show, false);
    drawBox({ x: 10, y: tableBottom + 4, w: canvasWidth - 20, h: drawHeight - 24 - (tableBottom + 4) },
      iso, show, false);
  }
  K.note(canvasWidth >= 560 ? [DATA_NOTE, 'Enter checks or goes on'] : 'Illustrative values · FanPedia p. 134',
    { y: drawHeight - 6 });
  drawControlLabels();
}

// Free spring and loaded spring, side by side and to the same scale, with an inch ruler.
function drawSprings(b, iso, show) {
  K.panel(b.x, b.y, b.w, b.h);
  const wide = b.h > 200;
  const ts = wide ? 14 : 12;
  const lead = Math.round(ts * 1.3);
  const floorY = b.y + b.h - (wide ? 30 : 20);
  const base = floorY - 8;                               // top of the base plate
  const freeTop = b.y + 2 * lead + 14;                   // top of the free spring's load plate
  const freeH = base - 8 - freeTop;                      // coil height of the free spring
  const pxPerIn = freeH / FREE_IN;
  const coilW = wide ? 46 : 34;
  const rulerX = b.x + (wide ? 38 : 32);
  const x1 = b.x + b.w * (wide ? 0.40 : 0.37);
  const x2 = b.x + b.w * (wide ? 0.76 : 0.72);

  // Floor line
  stroke(FP.tok('text-muted'));
  strokeWeight(1);
  line(b.x + 8, floorY, b.x + b.w - 8, floorY);

  // Ruler: inches of coil height above the base plate
  stroke(FP.tok('text'));
  line(rulerX, base, rulerX, base - FREE_IN * pxPerIn);
  for (let i = 0; i <= FREE_IN * 2; i++) {
    const yy = base - i * 0.5 * pxPerIn;
    stroke(FP.tok('text'));
    line(rulerX, yy, rulerX + (i % 2 ? 4 : 8), yy);
    noStroke();
    fill(FP.tok('text'));
    textSize(12);
    textAlign(RIGHT, CENTER);
    if (i % 2 === 0 && (wide || i % 4 === 0)) { text((i / 2) + ' in', rulerX - 3, yy); }
  }

  // Free spring
  FD.spring(null, { x: x1, y: floorY, w: coilW, freeH: freeH, coils: 6 });
  noStroke();
  fill(FP.tok('text'));
  textSize(ts);
  textAlign(CENTER, BOTTOM);
  text('Free (no load)', x1, freeTop - 4);

  if (!show) {
    // The loaded spring is hidden until the learner commits an answer
    K.panel(x2 - coilW * 0.8, freeTop, coilW * 1.6, base - freeTop,
      { dashed: true, radius: 4, fill: '--fp-primary-bg', stroke: '--fp-primary' });
    noStroke();
    fill(FP.tok('text'));
    textSize(ts);
    textAlign(CENTER, BOTTOM);
    text('Load W / n', x2, freeTop - 4 - lead);
    textStyle(BOLD);
    text('δ = ? in', x2, freeTop - 4);
    textStyle(NORMAL);
    textSize(wide ? 28 : 20);
    textAlign(CENTER, CENTER);
    fill(FP.tok('primary-dark'));
    text('?', x2, (freeTop + base) / 2);
    return;
  }

  // Loaded spring, to the same scale (the load plate carries W / n)
  const d = iso.deflectionIn;
  const drawn = Math.min(d, MAX_DRAWN_IN);
  FD.spring(null, { x: x2, y: floorY, w: coilW, freeH: freeH, h: freeH - drawn * pxPerIn, coils: 6,
    showDeflection: true });
  noStroke();
  fill(FP.tok('text'));
  textSize(ts);
  textAlign(CENTER, BOTTOM);
  text('Load ' + FP.fmt.num(iso.loadPerIsolatorLb, 0) + ' lb', x2, freeTop - 4 - lead);
  textStyle(BOLD);
  fill(FP.tok('primary-dark'));
  text('δ = ' + FP.fmt.num(d, 2) + ' in' + (d > MAX_DRAWN_IN ? ' (off scale)' : ''), x2, freeTop - 4);
  textStyle(NORMAL);
  fill(FP.tok('text'));
  textAlign(CENTER, TOP);
  text('fₙ = ' + FP.fmt.num(iso.fnHz, 2) + ' Hz', x2, floorY + 4);
}

// Results table. Returns the y below it.
function drawTable(b, iso, show, wide) {
  const rows = readouts(iso, show);
  const ink = FP.tok('text');
  if (wide) {
    const rowH = 21;
    const h = rowH * (rows.length + 1) + 12;
    K.panel(b.x, b.y, b.w, h);
    textSize(14);
    let y = b.y + 8 + rowH / 2;
    for (const row of rows) {
      noStroke();
      fill(ink);
      textAlign(LEFT, CENTER);
      text(row[0], b.x + 10, y);
      textAlign(RIGHT, CENTER);
      fill(row[2] === '?' ? FP.tok('text-muted') : FP.tok('primary-dark'));
      textStyle(BOLD);
      text(row[2], b.x + b.w - 10, y);
      textStyle(NORMAL);
      y += rowH;
    }
    statusRow(b.x + 10, y, b.w - 20, iso, show, 14);
    return b.y + h;
  }
  // Narrow: two columns of short readouts, then the status line
  const rowH = 16;
  const lines = Math.ceil(rows.length / 2);
  const h = rowH * (lines + 1) + 10;
  K.panel(b.x, b.y, b.w, h);
  textSize(12);
  const colW = (b.w - 20) / 2;
  rows.forEach((row, i) => {
    const cx = b.x + 8 + (i % 2) * (colW + 4);
    const cy = b.y + 5 + rowH / 2 + Math.floor(i / 2) * rowH;
    noStroke();
    fill(ink);
    textAlign(LEFT, CENTER);
    text(row[1] + ':', cx, cy);
    fill(row[2] === '?' ? FP.tok('text-muted') : FP.tok('primary-dark'));
    textStyle(BOLD);
    textAlign(RIGHT, CENTER);
    text(row[2], cx + colW - 4, cy);
    textStyle(NORMAL);
  });
  statusRow(b.x + 8, b.y + 5 + rowH / 2 + lines * rowH, b.w - 16, iso, show, 12);
  return b.y + h;
}

function statusRow(x, y, w, iso, show, ts) {
  noStroke();
  textSize(ts);
  textAlign(LEFT, CENTER);
  fill(FP.tok('text'));
  textStyle(BOLD);
  const lead = 'Status: ';
  text(lead, x, y);
  const lw = textWidth(lead);
  let s = show ? statusText(iso) : '?';
  if (show && iso.status !== 'isolating') { fill(FP.tok('accent-text')); s = '▲ ' + s; }
  else { fill(show ? FP.tok('primary-dark') : FP.tok('text-muted')); }
  if (textWidth(s) > w - lw) {
    while (s.length > 3 && textWidth(s + '…') > w - lw) { s = s.slice(0, -1); }
    s += '…';
  }
  text(s, x + lw, y);
  textStyle(NORMAL);
}

// Challenge or Explore box with the running score at the bottom.
function drawBox(b, iso, show, wide) {
  K.panel(b.x, b.y, b.w, b.h);
  const fs = wide ? 15 : 13;
  const tx = b.x + 10, tw = b.w - 20;
  const scoreY = b.y + b.h - 8;
  const avail = scoreY - fs - 6 - (b.y + 8);
  const ts = K.fitTextSize(t => boxContent(tx, b.y + 8, tw, t, wide, iso, show, true) - (b.y + 8), avail, fs, 12);
  boxContent(tx, b.y + 8, tw, ts, wide, iso, show, false, avail);
  noStroke();
  fill(FP.tok('text'));
  textStyle(BOLD);
  textSize(fs);
  textAlign(LEFT, BOTTOM);
  text(runner.state().scoreLabel, tx, scoreY);
  textStyle(NORMAL);
}

// Draws (or, with dry, measures) the box text; returns the y below it.
function boxContent(x, y, w, ts, wide, iso, show, dry, maxH) {
  const st = runner.state();
  const lead = Math.round(ts * 1.3);
  const gap = wide ? 6 : 3;
  const yMax = maxH != null ? y + maxH : Infinity;
  textSize(ts);
  noStroke();
  textAlign(LEFT, TOP);
  const para = (str, col, opts) => {
    opts = opts || {};
    if (opts.bold) { textStyle(BOLD); }
    const left = Math.floor((yMax - y) / lead);
    if (left < 1) { textStyle(NORMAL); return; }
    if (!dry) { fill(col); }
    y = K.wrapText(str, x, y, w, lead, { dryRun: dry, maxLines: isFinite(left) ? left : undefined }) + gap;
    textStyle(NORMAL);
  };
  const highNote = () => {
    if (iso.deflectionIn > TYPICAL_MAX_IN + 1e-9) { para('ℹ ' + HIGH_DEFLECTION_NOTE, FP.tok('accent-text')); }
  };

  if (!st.explore) {
    para('Challenge ' + (st.index + 1) + ' of ' + ITEMS.length +
      (st.phase === 'question' ? '  ·  ' + st.attemptLabel : ''), FP.tok('text'), { bold: true });
    para(st.item.prompt, FP.tok('text'));
    if (feedback && feedback.message) {
      const message = (feedback.kind === 'info' ? 'ℹ ' : '') + feedback.message;
      const h = K.countLines(message, w - 16) * lead + 10;
      if (!dry) {
        const ok = feedback.kind === 'ok', bad = feedback.kind === 'bad';
        K.panel(x - 4, y - 2, w + 8, h, {
          fill: ok ? '--fp-correct-bg' : (bad ? '--fp-incorrect-bg' : '--fp-info-bg'),
          stroke: ok ? '--fp-correct' : (bad ? '--fp-incorrect' : '--fp-border'),
          dashed: bad, weight: ok || bad ? 2 : 1, radius: 6
        });
        fill(ok ? FP.tok('correct') : (bad ? FP.tok('incorrect') : FP.tok('text')));
        K.wrapText(message, x + 4, y + 3, w - 16, lead);
      }
      y += h + gap;
    }
    if (answerLine) { para(answerLine, FP.tok('text')); }
    if (show) { highNote(); }
  } else {
    para(FP.msg.EXPLORE + ' (not scored)', FP.tok('text'), { bold: true });
    const s = runner.summary();
    para(s.lines[0] + '. ' + s.lines[1], s.mastered ? FP.tok('primary-dark') : FP.tok('text'), { bold: true });
    highNote();
    para('Try: raise n and watch δ fall; raise the fan speed and watch r rise; set W = 1,600, n = 4, ' +
      'k = 1,600 and slow the fan to 300 rpm.', FP.tok('text'));
  }
  return y - gap;
}

function drawControlLabels() {
  const st = runner.state();
  const narrow = narrowControls();
  const v = inputs();
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(narrow ? 14 : 16);
  fill(FP.tok('text'));
  if (!st.explore) {
    const midY = K.controlRow(0) + (answerInput.elt.offsetHeight || 28) / 2;
    text('Your answer:', 10, midY);
    const inputX = narrow ? 100 : 118, inputW = narrow ? 72 : 100;
    text('in.', inputX + inputW + 6, midY);
  }
  const sx = 10 + (startOverButton.elt.offsetWidth || 90) + 12;
  const options = st.explore ? [FP.msg.EXPLORE + ': sliders unlocked', FP.msg.EXPLORE]
    : [st.exploreLabel, 'Sliders unlock after challenge ' + ITEMS.length + '.'];
  fill(FP.tok('text-muted'));
  textSize(narrow ? 13 : 15);
  const maxW = canvasWidth - sx - 10;
  const rowMid = K.controlRow(1) + (startOverButton.elt.offsetHeight || 28) / 2;
  text(options.find(t => textWidth(t) <= maxW) || options[options.length - 1], sx, rowMid);

  textSize(narrow ? 14 : 16);
  fill(st.explore ? FP.tok('text') : FP.tok('text-muted'));
  text((narrow ? 'Weight W: ' : 'Total weight W: ') + FP.fmt.num(v.W) + ' lb', 10, K.controlLabel(2));
  text((narrow ? 'Isolators n: ' : 'Number of isolators n: ') + v.n, 10, K.controlLabel(3));
  text((narrow ? 'Rate k: ' : 'Spring rate k (each): ') + FP.fmt.num(v.k) + ' lb/in', 10, K.controlLabel(4));
  text('Fan speed: ' + FP.fmt.num(v.rpm) + ' rpm', 10, K.controlLabel(5));
}

// ---------- Responsive sizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  syncControls();
}

function updateCanvasSize() {
  canvasWidth = K.updateCanvasSize(320);
}
