// Fan Law Calculator - p5.js MicroSim (Chapter 25: Fan Laws, System Effect and Sound)
// CANVAS_HEIGHT: 640
// Four fan-law challenges (speed, power, pressure, size change) answered by typing a number,
// then Explore mode: speed, diameter and density ratios applied to illustrative Curve A.
// Built on the FanPedia kit: FP.ChallengeRunner (challenge flow, wording, score, mastery),
// FP.models (fan laws, model answers), FP.curves (Curve A, fan-law mapping), FP.p5 (layout,
// text, controls, keys). Fan laws (geometrically similar fans, corresponding points):
//   Q2 = Q1 (N2/N1)(D2/D1)^3   P2 = P1 (N2/N1)^2 (D2/D1)^2 (rho2/rho1)
//   BHP2 = BHP1 (N2/N1)^3 (D2/D1)^5 (rho2/rho1); static efficiency unchanged.
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js, fan-models.js,
// fan-curves.js (load them before this file, also in the p5.js editor).

const K = FP.p5;
const SIM_ID = 'ch25-fan-law-calculator';

// ---------- Canvas layout ----------
let canvasWidth = 800;
const drawHeight = 455;
const controlHeight = K.controlHeightFor(5);   // answer row, Start over row, 3 slider rows
const canvasHeight = drawHeight + controlHeight;
const defaultTextSize = 16;

// ---------- Base fan: Curve A (illustrative, standard air, 1,380 RPM) ----------
const CURVE = FP.curves.A;
const BASE_RPM = CURVE.rpm;                 // 1,380
const BASE_OP = FP.curves.BASE_OP;          // 10,000 CFM, 4.0 in. wg, 9.0 BHP, 70%
const BASE = { cfm: BASE_OP.q, inWg: BASE_OP.p, bhp: BASE_OP.bhp, rpm: BASE_RPM };
const SYSTEM_K = FP.curves.kThrough(BASE_OP.q, BASE_OP.p);   // P = 4.0 (Q / 10,000)^2
const DATA_NOTE = FP.msg.note(FP.msg.ILLUSTRATIVE, 'Curve A, Chapter 10');

// Model answers are rounded as the spec's Rules say (whole RPM, two decimals for in. wg and BHP).
const R = FP.models.round;
const law = (change) => FP.models.fanLaws(BASE, change);

// ---------- Challenges (fixed order, two attempts each; spec feedback text) ----------
const CHALLENGE_DATA = [
  {
    id: 'speed-for-airflow',
    prompt: 'The same system needs 11,500 CFM. What speed?',
    unit: 'RPM', decimals: 0,
    model: R(FP.models.speedForAirflow(BASE_RPM, BASE_OP.q, 11500), 0),
    ratios: { speed: 1.15, diameter: 1.00, density: 1.00 },
    wrong: 'Airflow goes with speed: 1,380 × 11,500 ÷ 10,000 = 1,587 RPM.'
  },
  {
    id: 'bhp-at-speed',
    prompt: 'At 1,587 RPM, what BHP?',
    unit: 'BHP', decimals: 2,
    model: R(law({ speedRatio: 1.15 }).bhp, 2),
    ratios: { speed: 1.15, diameter: 1.00, density: 1.00 },
    wrong: 'Power goes with speed cubed: 9.0 × 1.15³ = 13.69 BHP, not 9.0 × 1.15.'
  },
  {
    id: 'pressure-slowed',
    prompt: 'The fan is slowed to 1,104 RPM. What static pressure (in. wg)?',
    unit: 'in. wg', decimals: 2,
    model: R(law({ speedRatio: 0.80 }).inWg, 2),
    ratios: { speed: 0.80, diameter: 1.00, density: 1.00 },
    wrong: 'Pressure goes with speed squared: 4.0 × 0.8² = 2.56 in. wg.'
  },
  {
    id: 'size-change-bhp',
    prompt: 'The next size up has a diameter ratio of 1.12 and runs at 1,380 RPM. ' +
            'What BHP at the corresponding point?',
    unit: 'BHP', decimals: 2,
    model: R(law({ sizeRatio: 1.12 }).bhp, 2),
    ratios: { speed: 1.00, diameter: 1.12, density: 1.00 },
    wrong: 'Power goes with diameter to the fifth power: 9.0 × 1.12⁵ = 9.0 × 1.762 = 15.86 BHP.'
  }
];
// Spec feedback: correct shows only "Correct: <model answer>."; a wrong answer shows the
// "Feedback when wrong" text (retry hint, and again with the model answer when missed).
const ITEMS = CHALLENGE_DATA.map(c => Object.assign({}, c, {
  hint: c.wrong,
  why: (value, item) => (FP.check.numeric(value, item.model, { rel: 0.02 }) ? '' : item.wrong)
}));

const runner = new FP.ChallengeRunner({
  items: ITEMS,
  attempts: 2,
  tolerance: { rel: 0.02 },
  noun: 'Challenges',
  mastery: ITEMS.length,
  reviewPointer: 'Press Start over to try the four challenges again',
  id: SIM_ID
});

// ---------- State ----------
let feedback = null;          // {kind: 'ok'|'bad'|'info', message}
let answerLine = '';          // "Your answer ... Model ..." after a challenge resolves
let densityNoticeShown = false;
let lastDensity = 1.0;

// ---------- Controls ----------
let answerInput, checkButton, nextButton, resetButton, startOverButton;
let speedSlider, diameterSlider, densitySlider;

const keys = K.keys.bind({ Enter: onEnter });
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  K.canvas(canvasWidth, canvasHeight);
  textSize(defaultTextSize);
  const main = document.querySelector('main');

  answerInput = createInput('');
  answerInput.parent(main);
  answerInput.attribute('inputmode', 'decimal');
  answerInput.attribute('aria-label', 'Your answer');

  // FP.p5.button presses on 'click', so Enter/Space on a focused button work too
  checkButton = K.button(FP.msg.CHECK, checkAnswer);
  nextButton = K.button('Next challenge', nextChallenge);
  resetButton = K.button('Reset ratios to 1.00', resetRatios, { variant: 'secondary' });
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  speedSlider = createSlider(0.50, 1.50, 1.00, 0.01);
  speedSlider.parent(main);
  speedSlider.attribute('aria-label', 'Speed ratio N2/N1');
  diameterSlider = createSlider(0.80, 1.25, 1.00, 0.01);
  diameterSlider.parent(main);
  diameterSlider.attribute('aria-label', 'Diameter ratio D2/D1');
  densitySlider = createSlider(0.40, 1.30, 1.00, 0.01);
  densitySlider.parent(main);
  densitySlider.attribute('aria-label', 'Density ratio rho2/rho1');

  syncControls();

  describe('Fan law calculator. A chart plots illustrative fan Curve A at 1,380 RPM with its ' +
    'system curve and operating point at 10,000 CFM and 4.0 inches water gauge. Four challenges ask ' +
    'for a new speed, brake horsepower or static pressure; the learner types a number and presses ' +
    'Check, then the new fan curve and readouts appear. After the challenges, Explore mode unlocks ' +
    'sliders for speed, diameter and density ratio that redraw the new curve and readouts.');
}

// ---------- Control state and layout ----------
function exploring() { return runner.state().explore; }

function syncControls() {
  const st = runner.state();
  const asking = st.phase === 'question';
  const resolved = st.phase === 'resolved';
  if (st.explore) {
    answerInput.hide(); checkButton.hide(); nextButton.hide(); resetButton.show();
  } else {
    answerInput.show(); resetButton.hide();
    K.setEnabled(answerInput, asking);
    if (asking) { checkButton.show(); nextButton.hide(); } else { checkButton.hide(); nextButton.show(); }
    nextButton.html(resolved && st.isLast ? 'Start exploring' : 'Next challenge');
  }
  for (const s of [speedSlider, diameterSlider, densitySlider]) { K.setEnabled(s, st.explore); }
  positionControls();
}

function narrowControls() { return canvasWidth < 480; }
function sliderLeft() { return narrowControls() ? 195 : 250; }

function positionControls() {
  const narrow = narrowControls();
  const inputX = narrow ? 102 : 120;
  answerInput.size(narrow ? 76 : 110);
  answerInput.position(inputX, K.controlRow(0));
  const bx = inputX + (answerInput.elt.offsetWidth || 110) + 8;
  checkButton.position(bx, K.controlRow(0));
  nextButton.position(bx, K.controlRow(0));   // shares the Check slot; Check hides once resolved
  resetButton.position(10, K.controlRow(0));
  startOverButton.position(10, K.controlRow(1));
  const sw = K.sliderWidth(canvasWidth, sliderLeft(), 15);
  [speedSlider, diameterSlider, densitySlider].forEach((s, i) => {
    s.position(sliderLeft(), K.controlRow(2 + i));
    s.size(sw);
  });
}

function setRatios(r) {
  speedSlider.value(r.speed);
  diameterSlider.value(r.diameter);
  densitySlider.value(r.density);
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
  FP.announce(res.message);
  if (res.status === 'correct' || res.status === 'missed') {
    const item = res.item;
    setRatios(item.ratios);
    const raw = String(answerInput.value()).replace(/,/g, '').trim();
    const typedDecimals = Math.min(4, (raw.split('.')[1] || '').length);
    answerLine = 'Your answer: ' + FP.fmt.num(res.value, typedDecimals) + ' · Model: ' +
      FP.fmt.num(item.model, item.decimals) + ' ' + item.unit;
    syncControls();
    nextButton.elt.focus();
  }
}

function nextChallenge() {
  if (!runner.next()) { return; }
  feedback = null;
  answerLine = '';
  setRatios({ speed: 1.00, diameter: 1.00, density: 1.00 });
  const st = runner.state();
  if (st.explore) {
    lastDensity = 1.0;
    syncControls();
    const s = runner.summary();
    FP.announce(s.lines.join(' ') + ' ' + FP.msg.EXPLORE + ': the ratio sliders are unlocked.');
    speedSlider.elt.focus();
  } else {
    answerInput.value('');
    syncControls();
    FP.announce('Challenge ' + (st.index + 1) + ' of ' + ITEMS.length + ': ' + st.item.prompt);
    answerInput.elt.focus();
  }
}

function resetRatios() {
  setRatios({ speed: 1.00, diameter: 1.00, density: 1.00 });
}

function startOver() {
  runner.restart();
  feedback = null;
  answerLine = '';
  densityNoticeShown = false;
  lastDensity = 1.0;
  setRatios({ speed: 1.00, diameter: 1.00, density: 1.00 });
  answerInput.value('');
  syncControls();
  FP.announce('Started over. Challenge 1 of ' + ITEMS.length + ': ' + ITEMS[0].prompt);
  answerInput.elt.focus();
}

// ---------- Fan-law model (FP.curves) ----------
function getRatios() {
  return { speed: speedSlider.value(), diameter: diameterSlider.value(), density: densitySlider.value() };
}

// True when the new curve should be revealed (Explore mode, or a resolved challenge)
function showNew() {
  const st = runner.state();
  return st.explore || st.phase === 'resolved';
}

// ---------- Drawing ----------
function draw() {
  // Track the first density change in Explore mode
  if (exploring()) {
    const d = densitySlider.value();
    if (abs(d - lastDensity) > 0.0001) { densityNoticeShown = true; }
    lastDensity = d;
  }

  K.regions(drawHeight, controlHeight);

  const r = getRatios();
  const f = FP.curves.fanLawFactors(r);
  const reveal = showNew();
  const wide = canvasWidth >= 640;

  let chart, panel;
  if (wide) {
    const panelW = max(340, canvasWidth * 0.45);
    chart = { x: 0, y: 40, w: canvasWidth - panelW - 10, h: drawHeight - 62 };
    panel = { x: canvasWidth - panelW - 5, y: 42, w: panelW - 5 };
  } else {
    chart = { x: 0, y: 38, w: canvasWidth, h: 142 };
    panel = { x: 5, y: 182, w: canvasWidth - 10 };
  }

  drawChart(chart, f, reveal, r);
  K.title('Fan Law Calculator');
  drawPanels(panel, f, reveal, r, wide);
  K.note(DATA_NOTE);
  drawControlLabels(r);
}

function niceStep(maxVal, ticks) {
  const raw = maxVal / ticks;
  const mag = pow(10, floor(Math.log10(raw)));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (raw <= m * mag) { return m * mag; }
  }
  return 10 * mag;
}

function drawChart(c, f, reveal, r) {
  const curve = FP.curves.mapCurve(CURVE, r);
  let qMax = 16000, pMax = 5.0;
  if (reveal) {
    qMax = max(qMax, curve.q[curve.q.length - 1]);
    pMax = max(pMax, ...curve.p);
  }
  const qStep = niceStep(qMax, 5);
  const pStep = niceStep(pMax * 1.05, 5);
  qMax = ceil(qMax / qStep) * qStep;
  pMax = ceil((pMax * 1.05) / pStep) * pStep;

  const x0 = c.x + 62, x1 = c.x + c.w - 12;
  const y0 = c.y + 8, y1 = c.y + c.h - 42;
  const sx = (q) => map(q, 0, qMax, x0, x1);
  const sy = (p) => map(p, 0, pMax, y1, y0);
  const ink = FP.tok('text');

  // Plot background and grid
  stroke(FP.tok('border'));
  strokeWeight(1);
  fill(255);
  rect(x0, y0, x1 - x0, y1 - y0);
  textSize(13);
  for (let q = 0; q <= qMax + 1e-6; q += qStep) {
    stroke(FP.tok('info-bg'));
    line(sx(q), y0, sx(q), y1);
    noStroke();
    fill(ink);
    textAlign(CENTER, TOP);
    text(q >= 1000 ? FP.fmt.num(q / 1000, q % 1000 === 0 ? 0 : 1) + 'k' : '0', sx(q), y1 + 4);
  }
  for (let p = 0; p <= pMax + 1e-6; p += pStep) {
    stroke(FP.tok('info-bg'));
    line(x0, sy(p), x1, sy(p));
    noStroke();
    fill(ink);
    textAlign(RIGHT, CENTER);
    text(FP.fmt.num(p, pStep < 1 ? 1 : 0), x0 - 5, sy(p));
  }
  noStroke();
  fill(ink);
  textSize(14);
  textAlign(CENTER, TOP);
  text('Airflow (CFM)', (x0 + x1) / 2, y1 + 22);
  push();
  translate(c.x + 14, (y0 + y1) / 2);
  rotate(-HALF_PI);
  textAlign(CENTER, CENTER);
  text(canvasWidth < 640 ? 'SP (in. wg)' : 'Static pressure (in. wg)', 0, 0);
  pop();

  // Clip drawing to the plot rectangle
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(x0, y0, x1 - x0, y1 - y0);
  drawingContext.clip();

  // System curve(s): P = 4.0 x (Q/10,000)^2, scaled by density for the new air
  const densityCurve = reveal && abs(r.density - 1) > 0.001;
  drawSystemCurve(sx, sy, qMax, 1.0, FP.tok('text-muted'), [6, 4]);
  if (densityCurve) { drawSystemCurve(sx, sy, qMax, r.density, FP.tok('series-2'), FP.SERIES_DASH[1]); }

  drawFanCurve(CURVE, sx, sy, FP.tok('text-muted'), 2);                // base Curve A
  if (reveal) { drawFanCurve(curve, sx, sy, FP.tok('series-1'), 3); }  // new curve

  drawingContext.restore();

  // Legend (drawn before the operating points so the markers stay on top)
  const compact = canvasWidth < 640;
  const rows = [
    { col: FP.tok('text-muted'), w: 2, dash: [],
      label: compact ? 'Curve A' : 'Curve A, 1,380 RPM (illustrative)' },
    { col: FP.tok('text-muted'), w: 1.5, dash: [6, 4],
      label: compact ? 'System' : 'System curve, P = 4.0(Q/10,000)²' }
  ];
  if (reveal) {
    rows.push({ col: FP.tok('series-1'), w: 3, dash: [],
      label: (compact ? 'New ' : 'New curve, ') + FP.fmt.rpm(BASE_RPM * r.speed) });
  }
  if (densityCurve) {
    rows.push({ col: FP.tok('series-2'), w: 1.5, dash: FP.SERIES_DASH[1],
      label: (compact ? 'System × ' : 'System curve × ρ2/ρ1 = ') + r.density.toFixed(2) });
  }
  const lts = compact ? 12 : 13, pitch = compact ? 15 : 19, sample = compact ? 18 : 24;
  textSize(lts);
  const legendW = max(...rows.map(t => textWidth(t.label))) + sample + 24;
  const lx = x1 - legendW - (compact ? 3 : 6), ly = y0 + (compact ? 3 : 6);
  K.panel(lx, ly, legendW, rows.length * pitch + (compact ? 6 : 12), { radius: 6 });
  rows.forEach((row, i) => {
    const yy = ly + (compact ? 10 : 13) + i * pitch;
    stroke(row.col);
    strokeWeight(row.w);
    drawingContext.setLineDash(row.dash);
    line(lx + 8, yy, lx + 8 + sample, yy);
    drawingContext.setLineDash([]);
    strokeWeight(1);
    noStroke();
    fill(ink);
    textAlign(LEFT, CENTER);
    text(row.label, lx + 14 + sample, yy);
  });

  // Operating points: base (dot) and new (diamond)
  stroke(255);
  strokeWeight(1.5);
  fill(ink);
  circle(sx(BASE_OP.q), sy(BASE_OP.p), 12);
  if (reveal) {
    const nx = sx(BASE_OP.q * f.q), ny = sy(BASE_OP.p * f.p);
    fill(FP.tok('accent'));
    stroke(ink);
    quad(nx, ny - 8, nx + 8, ny, nx, ny + 8, nx - 8, ny);
  }
  strokeWeight(1);
}

function drawSystemCurve(sx, sy, qMax, densityRatio, col, dash) {
  stroke(col);
  strokeWeight(1.5);
  noFill();
  drawingContext.setLineDash(dash);
  beginShape();
  for (let i = 0; i <= 60; i++) {
    const q = qMax * i / 60;
    vertex(sx(q), sy(densityRatio * FP.curves.systemPressure(SYSTEM_K, q)));
  }
  endShape();
  drawingContext.setLineDash([]);
  strokeWeight(1);
}

function drawFanCurve(c, sx, sy, col, weight) {
  stroke(col);
  strokeWeight(weight);
  noFill();
  beginShape();
  curveVertex(sx(c.q[0]), sy(c.p[0]));
  for (let i = 0; i < c.q.length; i++) { curveVertex(sx(c.q[i]), sy(c.p[i])); }
  curveVertex(sx(c.q[c.q.length - 1]), sy(c.p[c.p.length - 1]));
  endShape();
  strokeWeight(1);
}

function drawPanels(p, f, reveal, r, wide) {
  // ----- Readouts table -----
  const rowH = wide ? 22 : 15;
  const tableH = rowH * 6 + 14;
  K.panel(p.x, p.y, p.w, tableH);

  const colLabel = p.x + 10;
  const colBase = p.x + p.w * 0.62;
  const colNew = p.x + p.w * 0.81;
  const colRatio = p.x + p.w - 10;
  const fs = wide ? 14 : 13;
  const ink = FP.tok('text');

  const newQ = round(BASE_OP.q * f.q / 10) * 10;
  // Static efficiency at the corresponding point: base efficiency times the change in Q*P/BHP,
  // which the fan laws make exactly 1, so the readout stays at the base value.
  const newEff = BASE_OP.eff * (f.q * f.p / f.bhp);
  const rows = [
    ['Speed (RPM)', FP.fmt.num(BASE_RPM, 0), FP.fmt.num(BASE_RPM * r.speed, 0), r.speed],
    ['Airflow (CFM)', FP.fmt.num(BASE_OP.q, 0), FP.fmt.num(newQ, 0), f.q],
    ['Static press. (in. wg)', FP.fmt.num(BASE_OP.p, 2), FP.fmt.num(BASE_OP.p * f.p, 2), f.p],
    ['BHP', FP.fmt.num(BASE_OP.bhp, 2), FP.fmt.num(BASE_OP.bhp * f.bhp, 2), f.bhp],
    ['Static eff. (%)', FP.fmt.num(BASE_OP.eff, 1), FP.fmt.num(newEff, 1), null]
  ];

  noStroke();
  textSize(fs);
  let y = p.y + 8 + rowH / 2;
  fill(ink);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  text('Readout', colLabel, y);
  textAlign(RIGHT, CENTER);
  text('Base', colBase, y);
  text('New', colNew, y);
  text('Ratio', colRatio, y);
  textStyle(NORMAL);
  for (const row of rows) {
    y += rowH;
    fill(ink);
    textAlign(LEFT, CENTER);
    text(row[0], colLabel, y);
    textAlign(RIGHT, CENTER);
    text(row[1], colBase, y);
    fill(reveal ? FP.tok('primary') : FP.tok('text-muted'));
    text(reveal ? row[2] : '?', colNew, y);
    fill(ink);
    text(row[3] === null ? (reveal ? 'same' : '') : (reveal ? FP.fmt.num(row[3], 3) : ''), colRatio, y);
  }

  // ----- Challenge / Explore box -----
  const boxY = p.y + tableH + (wide ? 8 : 4);
  const boxBottom = drawHeight - (wide ? 6 : 24);   // narrow: leave the data label line clear
  K.panel(p.x, boxY, p.w, boxBottom - boxY);
  const tx = p.x + 10, tw = p.w - 20;
  const scoreY = boxBottom - 8;                       // bottom of the score line
  const avail = scoreY - fs - 6 - (boxY + 8);

  const content = (ts, dry) => boxContent(tx, boxY + 8, tw, ts, wide, r, dry) - (boxY + 8);
  const ts = K.fitTextSize(t => content(t, true), avail, fs, 12);
  boxContent(tx, boxY + 8, tw, ts, wide, r, false, avail);

  // Running score at the bottom of the box
  noStroke();
  fill(ink);
  textStyle(BOLD);
  textSize(fs);
  textAlign(LEFT, BOTTOM);
  text(runner.state().scoreLabel, tx, scoreY);
  textStyle(NORMAL);
}

// Draws (or, with dry, measures) the challenge or Explore text; returns the y below it.
function boxContent(x, y, w, ts, wide, r, dry, maxH) {
  const st = runner.state();
  const lead = round(ts * 1.3);
  const gap = wide ? 6 : 3;
  const yMax = maxH != null ? y + maxH : Infinity;
  textSize(ts);
  noStroke();
  textAlign(LEFT, TOP);
  const para = (str, col, opts) => {
    opts = opts || {};
    if (opts.bold) { textStyle(BOLD); }
    const left = floor((yMax - y) / lead);
    if (left < 1) { return; }                      // no room left (narrow screens)
    const maxLines = isFinite(left) ? left : undefined;
    if (!dry) { fill(col); }
    y = K.wrapText(str, x, y, w, lead, { dryRun: dry, maxLines }) + gap;
    textStyle(NORMAL);
  };

  if (!st.explore) {
    para('Challenge ' + (st.index + 1) + ' of ' + ITEMS.length +
      (st.phase === 'question' ? '  ·  ' + st.attemptLabel : ''), FP.tok('text'), { bold: true });
    para(st.item.prompt, FP.tok('text'));
    if (feedback && feedback.message) {
      const message = (feedback.kind === 'info' ? 'ℹ ' : '') + feedback.message;
      const lines = K.countLines(message, w - 16);
      const h = lines * lead + 10;
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
  } else {
    para(FP.msg.EXPLORE + ' (not scored)', FP.tok('text'), { bold: true });
    const s = runner.summary();
    para(s.lines[0], FP.tok('text'), { bold: true });
    para(s.lines[1], s.mastered ? FP.tok('primary') : FP.tok('text'), { bold: s.mastered });
    const notes = [];
    if (densityNoticeShown) {
      notes.push([FP.tok('accent-text'), 'A density ratio changes pressure and BHP but never CFM: ' +
        'the fan moves the same volume of lighter or heavier air.']);
    }
    if (abs(r.diameter - 1) > 0.001) {
      notes.push([FP.tok('text'), 'Diameter changed: the orange point is the fan-law corresponding ' +
        'point, which no longer lies on this system curve.']);
    }
    if (notes.length === 0) {
      notes.push([FP.tok('text'), 'Move any ratio slider. With only speed changed, watch the operating ' +
        'point slide along the system curve while efficiency stays at 70.0%.']);
    }
    for (const n of notes) { para(n[1], n[0]); }
  }
  return y - gap;
}

function drawControlLabels(r) {
  const st = runner.state();
  const narrow = narrowControls();
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(narrow ? 14 : defaultTextSize);
  fill(FP.tok('text'));
  if (!st.explore) { text('Your answer:', 10, K.controlRow(0) + (answerInput.elt.offsetHeight || 24) / 2); }

  // Row 1: what Explore mode is doing, beside Start over
  const sx = 10 + (startOverButton.elt.offsetWidth || 90) + 12;
  const options = st.explore ? [FP.msg.EXPLORE + ': ratio sliders unlocked', FP.msg.EXPLORE]
    : [st.exploreLabel, 'Sliders unlock after challenge ' + ITEMS.length + '.'];
  fill(FP.tok('text-muted'));
  textSize(narrow ? 13 : 15);
  const maxW = canvasWidth - sx - 10;
  const rowMid = K.controlRow(1) + (startOverButton.elt.offsetHeight || 24) / 2;
  text(options.find(t => textWidth(t) <= maxW) || options[options.length - 1], sx, rowMid);

  textSize(narrow ? 14 : defaultTextSize);
  fill(st.explore ? FP.tok('text') : FP.tok('text-muted'));
  text('Speed ratio N2/N1: ' + r.speed.toFixed(2), 10, K.controlLabel(2));
  text('Diameter ratio D2/D1: ' + r.diameter.toFixed(2), 10, K.controlLabel(3));
  text('Density ratio ρ2/ρ1: ' + r.density.toFixed(2), 10, K.controlLabel(4));
}

// ---------- Responsive sizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}

function updateCanvasSize() {
  canvasWidth = K.updateCanvasSize(320);
}
