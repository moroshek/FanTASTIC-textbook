// Operating Point Finder - p5.js MicroSim (Chapter 10: Fan Performance, Curves and Ratings)
// CANVAS_HEIGHT: 605
// Three challenge systems: the learner predicts where illustrative Curve A crosses the system
// curve (airflow and pressure, typed or clicked on the chart) before the intersection is shown.
// Explore mode then unlocks the system resistance at 10,000 CFM (1.0-35.0 in. wg).
// Built on the FanPedia kit: FP.ChallengeRunner (challenge flow, score, mastery; spec wording via
// `messages`), FP.curves (Curve A, system curve, operating point search, BHP, stall), FP.p5
// (layout, text, controls, keys).
//   System curve: P = R x (Q / 10,000)^2. Operating point: the airflow, searched in 1 CFM steps
//   from 0 to 16,000 CFM, where |fan pressure - system pressure| is smallest.
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js, fan-curves.js
// (load them before this file, also in the p5.js editor).

const K = FP.p5;
const C = FP.curves;
const SIM_ID = 'ch10-operating-point-finder';
const FAN = C.A;                       // illustrative backward inclined fan, one fixed speed
const Q_MAX = 16000, P_MAX = 6;        // chart axes
const DATA_NOTE = FP.msg.note('Illustrative fan curve', 'Curve A, standard air, one fixed speed');

// ---------- Canvas layout ----------
let canvasWidth = 800;
const drawHeight = 490;
const controlHeight = K.controlHeightFor(3);   // prediction row, Check/Start over row, slider row
const canvasHeight = drawHeight + controlHeight;
const defaultTextSize = 16;

// ---------- Model ----------
// The operating point for "R in. wg at 10,000 CFM", with the spec's rounding for readouts.
function solve(R) {
  const op = C.operatingPoint(FAN, C.kFromR(R), { step: 1, qMin: 0, qMax: Q_MAX });
  return { R, q: Math.round(op.q / 10) * 10, p: Math.round(op.p * 100) / 100, bhp: op.bhp,
    stall: op.stall, rawQ: op.q, rawP: op.p };
}

// ---------- Challenges (fixed order, two attempts each; spec feedback text) ----------
const CHALLENGE_DATA = [
  { id: 'as-designed', R: 4.0, system: 'As designed: 4.0 in. wg at 10,000 CFM.',
    wrong: 'The fan curve passes through 4.0 in. wg at 10,000 CFM, exactly where the system needs ' +
           '4.0 in. wg, so the curves cross at the design point.' },
  { id: 'filters-loaded', R: 6.25, system: 'Filters loaded: 4.0 in. wg at 8,000 CFM.',
    wrong: 'A steeper system curve crosses the fan curve further left. At 8,000 CFM the fan offers ' +
           '4.5 in. wg and the system needs 4.0, so the fan pushes on until about 8,390 CFM.' },
  { id: 'resistance-overestimated', R: 2.5, system: 'Resistance overestimated: 2.5 in. wg at 10,000 CFM.',
    wrong: 'A flatter system curve crosses further right. The fan moves more air than designed, and ' +
           'BHP rises toward its 9.5 maximum.' }
];
const PROMPT = 'Where will this fan actually run in this system?';
const pointText = op => FP.fmt.cfm(op.q) + ' and ' + FP.fmt.inwg(op.p);

const ITEMS = CHALLENGE_DATA.map(c => {
  const op = solve(c.R);
  return Object.assign({}, c, {
    prompt: PROMPT + ' ' + c.system,
    op,
    answer: op,
    answerText: pointText(op),
    why: c.wrong,
    // Correct when within ±300 CFM and ±0.15 in. wg of the model intersection (inclusive).
    check: (v, item) => Math.abs(v.q - item.op.q) <= 300 + 1e-9 && Math.abs(v.p - item.op.p) <= 0.15 + 1e-9
  });
});

const runner = new FP.ChallengeRunner({
  items: ITEMS,
  attempts: 2,
  noun: 'Challenges',
  mastery: ITEMS.length,
  reviewPointer: 'Press Start over to try the three systems again',
  messages: {
    correct: res => FP.msg.correct('the curves cross at ' + res.item.answerText),
    retry: res => FP.msg.tryAgain(res.item.wrong, res.attemptsLeft),
    missed: res => FP.msg.missed(res.item.answerText, res.item.wrong)
  },
  id: SIM_ID
});

// ---------- State ----------
let feedback = null;          // {kind: 'ok'|'bad'|'info', message}
let prediction = null;        // {q, p} as last typed or clicked
let plot = null;              // plot rectangle and scales, set in draw()

// ---------- Controls ----------
let qInput, pInput, checkButton, nextButton, startOverButton, rSlider;

const keys = K.keys.bind({ Enter: onEnter });
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);
  const main = document.querySelector('main');

  qInput = createInput('');
  qInput.parent(main);
  qInput.attribute('inputmode', 'numeric');
  qInput.attribute('aria-label', 'Predicted operating airflow in CFM');
  qInput.input(readPrediction);
  pInput = createInput('');
  pInput.parent(main);
  pInput.attribute('inputmode', 'decimal');
  pInput.attribute('aria-label', 'Predicted operating pressure in inches water gauge');
  pInput.input(readPrediction);

  checkButton = K.button(FP.msg.CHECK, checkAnswer);
  nextButton = K.button('Next challenge', nextChallenge);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  rSlider = createSlider(1.0, 35.0, 4.0, 0.1);
  rSlider.parent(main);
  rSlider.attribute('aria-label', 'System resistance at 10,000 CFM in inches water gauge');

  syncControls();

  describe('Operating point finder. A chart shows illustrative fan Curve A (static pressure against ' +
    'airflow, 0 to 16,000 CFM) and a dashed parabolic system curve. For three challenge systems the ' +
    'learner types or clicks a predicted operating point and presses Check; the sim then marks the ' +
    'true intersection and shows its airflow, pressure, BHP and whether it is in the stall region left ' +
    'of 4,000 CFM. After the challenges, a slider changes the system resistance at 10,000 CFM and the ' +
    'intersection moves along the fan curve.');
}

// ---------- Control state and layout ----------
function exploring() { return runner.state().explore; }
function currentR() { return exploring() ? rSlider.value() : runner.state().item.R; }

function syncControls() {
  const st = runner.state();
  const asking = st.phase === 'question';
  const resolved = st.phase === 'resolved';
  if (st.explore) {
    qInput.hide(); pInput.hide(); checkButton.hide(); nextButton.hide();
  } else {
    qInput.show(); pInput.show();
    K.setEnabled(qInput, asking);
    K.setEnabled(pInput, asking);
    if (asking) { checkButton.show(); nextButton.hide(); } else { checkButton.hide(); nextButton.show(); }
    nextButton.html(resolved && st.isLast ? 'Start exploring' : 'Next challenge');
  }
  K.setEnabled(rSlider, st.explore);
  positionControls();
}

function narrowControls() { return canvasWidth < 480; }

// Row 0: [label] [CFM box] CFM [pressure box] in. wg; row 1: Check/Next, Start over; row 2: slider.
function rowLayout() {
  const narrow = narrowControls();
  const lx = narrow ? 10 : 110;                  // first box (wide: after "Prediction:")
  const qw = narrow ? 76 : 96, pw = narrow ? 58 : 70;
  const px = lx + qw + (narrow ? 44 : 50);       // after the "CFM" unit
  return { lx, qw, px, pw };
}

function positionControls() {
  const L = rowLayout();
  qInput.size(L.qw);
  qInput.position(L.lx, K.controlRow(0));
  pInput.size(L.pw);
  pInput.position(L.px, K.controlRow(0));
  checkButton.position(10, K.controlRow(1));
  nextButton.position(10, K.controlRow(1));
  const st = runner.state();
  const firstW = st.explore ? 0 : ((st.phase === 'question' ? checkButton : nextButton).elt.offsetWidth || 70) + 10;
  startOverButton.position(10 + firstW, K.controlRow(1));
  const sl = narrowControls() ? 175 : 330;
  rSlider.position(sl, K.controlRow(2));
  rSlider.size(K.sliderWidth(canvasWidth, sl, 15));
}

// ---------- Prediction input ----------
function readPrediction() {
  const q = FP.fmt.parseNumber(qInput.value()), p = FP.fmt.parseNumber(pInput.value());
  prediction = (isNaN(q) || isNaN(p)) ? null : { q, p };
}

// Clicking the chart places a prediction (snapped to 10 CFM and 0.01 in. wg) in the two boxes.
function mousePressed() {
  const st = runner.state();
  if (!plot || st.explore || st.phase !== 'question') { return; }
  if (mouseX < plot.x0 || mouseX > plot.x1 || mouseY < plot.y0 || mouseY > plot.y1) { return; }
  const q = constrain(Math.round(plot.qOf(mouseX) / 10) * 10, 0, Q_MAX);
  const p = constrain(Math.round(plot.pOf(mouseY) * 100) / 100, 0, P_MAX);
  qInput.value(String(q));
  pInput.value(p.toFixed(2));
  readPrediction();
  FP.announce('Prediction placed: ' + FP.fmt.cfm(q) + ' at ' + FP.fmt.inwg(p) + '. Press Check.');
}

// ---------- Challenge flow (FP.ChallengeRunner) ----------
function onEnter() {
  const st = runner.state();
  if (st.phase === 'question') { checkAnswer(); } else if (st.phase === 'resolved') { nextChallenge(); }
}

function checkAnswer() {
  if (runner.state().phase !== 'question') { return; }
  readPrediction();
  if (!prediction) {
    // Not graded: both numbers are needed (no attempt used).
    feedback = { kind: 'info', message: FP.msg.ENTER_NUMBER + ' for both the airflow (CFM) and the pressure (in. wg).' };
    FP.announce(feedback.message);
    return;
  }
  const res = runner.submit({ q: prediction.q, p: prediction.p });
  if (res.status === 'ignored') { return; }
  feedback = { kind: res.kind, message: res.message };
  FP.announce(res.message + (res.status === 'retry' ? '' : ' ' + readoutText(res.item.op)));
  if (res.status === 'correct' || res.status === 'missed') {
    syncControls();
    nextButton.elt.focus();
  }
}

function nextChallenge() {
  if (!runner.next()) { return; }
  feedback = null;
  prediction = null;
  qInput.value(''); pInput.value('');
  const st = runner.state();
  if (st.explore) {
    rSlider.value(4.0);
    syncControls();
    const s = runner.summary();
    FP.announce(s.lines.join(' ') + ' ' + FP.msg.EXPLORE + ': the system resistance slider is unlocked.');
    rSlider.elt.focus();
  } else {
    syncControls();
    FP.announce('Challenge ' + (st.index + 1) + ' of ' + ITEMS.length + ': ' + st.item.prompt);
    qInput.elt.focus();
  }
}

function startOver() {
  runner.restart();
  feedback = null;
  prediction = null;
  qInput.value(''); pInput.value('');
  rSlider.value(4.0);
  syncControls();
  FP.announce('Started over. Challenge 1 of ' + ITEMS.length + ': ' + ITEMS[0].prompt);
  qInput.elt.focus();
}

function stallText(op) {
  return op.stall ? 'In the stall region: select a different fan.'
    : 'Stable: right of the 4,000 CFM pressure peak.';
}
function readoutText(op) {
  return 'Operating point ' + FP.fmt.cfm(op.q) + ' at ' + FP.fmt.inwg(op.p) + ', ' +
    FP.fmt.bhp(op.bhp) + '. ' + stallText(op);
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  const wide = canvasWidth >= 640;
  const st = runner.state();
  const reveal = st.explore || st.phase === 'resolved';
  const R = currentR();
  const op = st.explore ? solve(R) : st.item.op;

  let chart, panel;
  if (wide) {
    const panelW = max(300, floor(canvasWidth * 0.40));
    chart = { x: 0, y: 40, w: canvasWidth - panelW - 10, h: drawHeight - 62 };
    panel = { x: canvasWidth - panelW - 5, y: 42, w: panelW - 5, h: drawHeight - 42 - 24 };
  } else {
    chart = { x: 0, y: 34, w: canvasWidth, h: 196 };
    panel = { x: 5, y: 232, w: canvasWidth - 10, h: drawHeight - 232 - 24 };
  }

  drawChart(chart, R, op, reveal, wide);
  K.title('Operating Point Finder');
  drawPanel(panel, op, reveal, wide);
  K.note(canvasWidth < 420 ? 'Illustrative fan curve · Curve A' : DATA_NOTE);
  drawControlLabels(R);
}

function drawChart(c, R, op, reveal, wide) {
  const x0 = c.x + (wide ? 62 : 50), x1 = c.x + c.w - 12;
  const y0 = c.y + (wide ? 8 : 24), y1 = c.y + c.h - (wide ? 42 : 38);   // narrow: legend row above
  const sx = q => map(q, 0, Q_MAX, x0, x1);
  const sy = p => map(p, 0, P_MAX, y1, y0);
  plot = { x0, x1, y0, y1, qOf: x => map(x, x0, x1, 0, Q_MAX), pOf: y => map(y, y1, y0, 0, P_MAX) };
  const ink = FP.tok('text');

  stroke(FP.tok('border'));
  strokeWeight(1);
  fill(255);
  rect(x0, y0, x1 - x0, y1 - y0);

  // Stall region: left of Curve A's 4,000 CFM pressure peak (hatched, labelled)
  const xs = sx(FAN.stallBelow);
  noStroke();
  fill(FP.tok('info-bg'));
  rect(x0, y0, xs - x0, y1 - y0);
  stroke(FP.tok('border'));
  push();   // p5 push/pop (not a bare context save) keeps p5's cached stroke and fill in step
  drawingContext.beginPath();
  drawingContext.rect(x0, y0, xs - x0, y1 - y0);
  drawingContext.clip();
  for (let hx = x0 - (y1 - y0); hx < xs; hx += 12) { line(hx, y1, hx + (y1 - y0), y0); }
  pop();

  // Grid and ticks
  textSize(wide ? 13 : 12);
  for (let q = 0; q <= Q_MAX; q += (wide ? 2000 : 4000)) {
    stroke(FP.tok('info-bg'));
    line(sx(q), y0, sx(q), y1);
    noStroke();
    fill(ink);
    textAlign(CENTER, TOP);
    text(q === 0 ? '0' : FP.fmt.num(q / 1000) + 'k', sx(q), y1 + 4);
  }
  for (let p = 0; p <= P_MAX; p += 1) {
    stroke(FP.tok('info-bg'));
    line(x0, sy(p), x1, sy(p));
    noStroke();
    fill(ink);
    textAlign(RIGHT, CENTER);
    text(FP.fmt.num(p), x0 - 5, sy(p));
  }
  noStroke();
  fill(ink);
  textSize(wide ? 14 : 13);
  textAlign(CENTER, TOP);
  text('Airflow (CFM)', (x0 + x1) / 2, y1 + (wide ? 22 : 19));
  push();
  translate(c.x + (wide ? 14 : 11), (y0 + y1) / 2);
  rotate(-HALF_PI);
  textAlign(CENTER, CENTER);
  text(wide ? 'Static pressure (in. wg)' : 'SP (in. wg)', 0, 0);
  pop();

  fill(FP.tok('text-muted'));
  textSize(12);
  textAlign(LEFT, BOTTOM);
  text(wide ? 'Stall region' : 'Stall', x0 + 4, y1 - 4);

  push();   // p5 push/pop (not a bare context save) keeps p5's cached stroke and fill in step
  drawingContext.beginPath();
  drawingContext.rect(x0, y0, x1 - x0, y1 - y0);
  drawingContext.clip();

  // System curve: P = R (Q / 10,000)^2 (dashed, series 2)
  const k = C.kFromR(R);
  stroke(FP.tok('series-2'));
  strokeWeight(2.5);
  noFill();
  drawingContext.setLineDash(FP.SERIES_DASH[1]);
  beginShape();
  for (let i = 0; i <= 80; i++) {
    const q = Q_MAX * i / 80;
    vertex(sx(q), sy(C.systemPressure(k, q)));
  }
  endShape();
  drawingContext.setLineDash([]);

  // Fan curve: Curve A, straight lines between table points (solid, series 1)
  stroke(FP.tok('series-1'));
  strokeWeight(3);
  beginShape();
  for (let i = 0; i < FAN.q.length; i++) { vertex(sx(FAN.q[i]), sy(FAN.p[i])); }
  endShape();
  strokeWeight(1);
  pop();

  // Legend
  const rows = [
    { col: FP.tok('series-1'), w: 3, dash: [], label: wide ? 'Fan curve (Curve A, illustrative)' : 'Curve A' },
    { col: FP.tok('series-2'), w: 2.5, dash: FP.SERIES_DASH[1],
      label: (wide ? 'System curve, R = ' : 'System, R = ') + FP.fmt.numUpTo(R, 2) + ' in. wg' }
  ];
  const lts = wide ? 13 : 12, pitch = wide ? 19 : 16, sample = wide ? 26 : 20;
  textSize(lts);
  const legendW = max(...rows.map(t => textWidth(t.label))) + sample + 24;
  const lx = x1 - legendW - 4, ly = y0 + 4;
  if (wide) { K.panel(lx, ly, legendW, rows.length * pitch + 8, { radius: 6 }); }
  let nx = x0;   // narrow: one row of legend entries between the title and the plot
  rows.forEach((row, i) => {
    let yy = ly + 4 + pitch / 2 + i * pitch;
    if (!wide) {
      yy = y0 - 10;
      row.x = nx;
      nx += sample + 10 + textWidth(row.label) + 14;
    }
    const rx = wide ? lx : row.x - 8;
    stroke(row.col);
    strokeWeight(row.w);
    drawingContext.setLineDash(row.dash);
    line(rx + 8, yy, rx + 8 + sample, yy);
    drawingContext.setLineDash([]);
    strokeWeight(1);
    noStroke();
    fill(ink);
    textAlign(LEFT, CENTER);
    text(row.label, rx + 14 + sample, yy);
  });

  // Prediction marker: hollow ring with a cross-hair, labelled
  const st = runner.state();
  if (prediction && !st.explore) {
    const px = constrain(sx(prediction.q), x0, x1), py = constrain(sy(prediction.p), y0, y1);
    const ok = reveal && st.last && st.last.status === 'correct';
    const bad = reveal && st.last && st.last.status === 'missed';
    stroke(ok ? FP.tok('correct') : (bad ? FP.tok('incorrect') : ink));
    strokeWeight(2);
    noFill();
    circle(px, py, 16);
    line(px - 12, py, px - 5, py); line(px + 5, py, px + 12, py);
    line(px, py - 12, px, py - 5); line(px, py + 5, px, py + 12);
    strokeWeight(1);
    noStroke();
    fill(ok ? FP.tok('correct') : (bad ? FP.tok('incorrect') : ink));
    textSize(12);
    textStyle(BOLD);
    const lab = (ok ? '✓ ' : (bad ? '✗ ' : '')) + 'Your prediction';
    const half = textWidth(lab) / 2 + 2;
    textAlign(CENTER, BOTTOM);
    text(lab, constrain(px, x0 + half, x1 - half), py - 13);   // above the marker
    textStyle(NORMAL);
  }

  // True intersection: filled diamond with guide lines to the axes
  if (reveal) {
    const ox = sx(op.rawQ), oy = sy(op.rawP);
    stroke(FP.tok('text-muted'));
    drawingContext.setLineDash([3, 3]);
    line(ox, oy, ox, y1);
    line(x0, oy, ox, oy);
    drawingContext.setLineDash([]);
    fill(FP.tok('accent'));
    stroke(ink);
    strokeWeight(1.5);
    quad(ox, oy - 9, ox + 9, oy, ox, oy + 9, ox - 9, oy);
    strokeWeight(1);
    noStroke();
    fill(ink);
    textSize(12);
    textStyle(BOLD);
    textAlign(LEFT, TOP);
    // Below the diamond, on the side away from the prediction marker
    const lab = 'Operating point';
    const lw = textWidth(lab);
    const awayLeft = prediction && !st.explore ? prediction.q > op.rawQ : ox + 10 + lw > x1;
    const tx = constrain(awayLeft ? ox - 8 - lw : ox + 8, x0 + 2, x1 - lw - 2);
    text(lab, tx, oy + 10);
    textStyle(NORMAL);
  }
}

function drawPanel(b, op, reveal, wide) {
  K.panel(b.x, b.y, b.w, b.h);
  const fs = wide ? 15 : 14;
  const tx = b.x + 10, tw = b.w - 20;
  const scoreY = b.y + b.h - 8;
  const avail = scoreY - fs - 6 - (b.y + 8);
  const content = (ts, dry) => boxContent(tx, b.y + 8, tw, ts, wide, op, reveal, dry) - (b.y + 8);
  const ts = K.fitTextSize(t => content(t, true), avail, fs, 12);
  boxContent(tx, b.y + 8, tw, ts, wide, op, reveal, false, avail);

  noStroke();
  fill(FP.tok('text'));
  textStyle(BOLD);
  textSize(fs);
  textAlign(LEFT, BOTTOM);
  text(runner.state().scoreLabel, tx, scoreY);
  textStyle(NORMAL);
}

// Draws (or, with dry, measures) the challenge or Explore text; returns the y below it.
function boxContent(x, y, w, ts, wide, op, reveal, dry, maxH) {
  const st = runner.state();
  const lead = round(ts * 1.3);
  const gap = wide ? 6 : 4;
  const yMax = maxH != null ? y + maxH : Infinity;
  textSize(ts);
  noStroke();
  textAlign(LEFT, TOP);
  const para = (str, col, opts) => {
    opts = opts || {};
    if (opts.bold) { textStyle(BOLD); }
    const left = floor((yMax - y) / lead);
    if (left < 1) { textStyle(NORMAL); return; }
    const maxLines = isFinite(left) ? left : undefined;
    if (!dry) { fill(col); }
    y = K.wrapText(str, x, y, w, lead, { dryRun: dry, maxLines }) + gap;
    textStyle(NORMAL);
  };
  const readouts = () => {
    if (!wide) {   // narrow: one compact line, then the stall flag
      para('Operating point: ' + FP.fmt.cfm(op.q) + ' at ' + FP.fmt.inwg(op.p) + ', ' + FP.fmt.bhp(op.bhp) +
        (op.stall ? '' : '. ✓ Stable (right of the peak).'), FP.tok('text'));
      if (op.stall) { para('✗ ' + stallText(op), FP.tok('incorrect'), { bold: true }); }
      return;
    }
    para('Operating airflow: ' + FP.fmt.cfm(op.q), FP.tok('text'));
    para('Operating pressure: ' + FP.fmt.inwg(op.p), FP.tok('text'));
    para('BHP at that airflow: ' + FP.fmt.num(op.bhp, 1), FP.tok('text'));
    para((op.stall ? '✗ ' : '✓ ') + stallText(op), op.stall ? FP.tok('incorrect') : FP.tok('text'), { bold: op.stall });
  };

  if (!st.explore) {
    para('Challenge ' + (st.index + 1) + ' of ' + ITEMS.length +
      (st.phase === 'question' ? '  ·  ' + st.attemptLabel : ''), FP.tok('text'), { bold: true });
    para(PROMPT, FP.tok('text'));
    para(st.item.system, FP.tok('primary'), { bold: true });
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
    if (reveal) {
      para('Your prediction: ' + FP.fmt.cfm(prediction.q) + ' at ' + FP.fmt.inwg(prediction.p), FP.tok('text'), { bold: true });
      readouts();
    } else if (!feedback) {
      para('Type the airflow and pressure where the two curves cross, or click the chart to place ' +
        'your prediction, then press Check.', FP.tok('text-muted'));
    }
  } else {
    para(FP.msg.EXPLORE + ' (not scored)', FP.tok('text'), { bold: true });
    const s = runner.summary();
    para(s.lines[0], FP.tok('text'), { bold: true });
    para(s.lines[1], s.mastered ? FP.tok('primary') : FP.tok('text'), { bold: s.mastered });
    para('System: ' + FP.fmt.inwg(op.R, 1) + ' at 10,000 CFM', FP.tok('primary'), { bold: true });
    readouts();
    para('Move the slider: a steeper system (higher R) slides the point left along the fan curve; ' +
      'above about R = 30.6 in. wg it falls into the stall region.', FP.tok('text-muted'));
  }
  return y - gap;
}

function drawControlLabels(R) {
  const st = runner.state();
  const narrow = narrowControls();
  const L = rowLayout();
  noStroke();
  textAlign(LEFT, CENTER);
  fill(FP.tok('text'));
  textSize(narrow ? 14 : defaultTextSize);
  const mid0 = K.controlRow(0) + (qInput.elt.offsetHeight || 28) / 2;
  if (!st.explore) {
    if (!narrow) { text('Prediction:', 10, mid0); }
    text('CFM', L.lx + (qInput.elt.offsetWidth || L.qw) + 6, mid0);
    text('in. wg', L.px + (pInput.elt.offsetWidth || L.pw) + 6, mid0);
  } else {
    fill(FP.tok('text-muted'));
    textSize(narrow ? 13 : 15);
    text(narrow ? 'Explore: move the R slider.' : 'Explore mode: move the system resistance slider below.', 10, mid0);
  }

  // Row 1: lock/unlock note beside Start over
  const sx = startOverButton.elt.offsetLeft + (startOverButton.elt.offsetWidth || 90) + 12;
  const options = st.explore ? [FP.msg.EXPLORE + ': slider unlocked', FP.msg.EXPLORE]
    : [st.exploreLabel, 'Slider unlocks after challenge ' + ITEMS.length + '.', 'Slider locked.'];
  fill(FP.tok('text-muted'));
  textSize(narrow ? 13 : 15);
  const maxW = canvasWidth - sx - 10;
  const rowMid1 = K.controlRow(1) + (startOverButton.elt.offsetHeight || 28) / 2;
  const t = options.find(o => textWidth(o) <= maxW);
  if (t) { text(t, sx, rowMid1); }

  textSize(narrow ? 14 : defaultTextSize);
  fill(st.explore ? FP.tok('text') : FP.tok('text-muted'));
  text((narrow ? 'R at 10k CFM: ' : 'Resistance at 10,000 CFM: ') + FP.fmt.num(rSlider.value(), 1) +
    (narrow ? '' : ' in. wg'), 10, K.controlLabel(2));
}

// ---------- Responsive sizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  syncControls();   // also positions the controls
}

function updateCanvasSize() {
  canvasWidth = K.updateCanvasSize(320);
}
