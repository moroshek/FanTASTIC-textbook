// Fan Law Calculator - p5.js MicroSim (Chapter 25: Fan Laws, System Effect and Sound)
// CANVAS_HEIGHT: 590
// Four fan-law challenges (speed, power, pressure, size change) answered by typing a number,
// then free exploration of speed, diameter and density ratios applied to illustrative Curve A.
// Fan laws used (geometrically similar fans, corresponding points):
//   Q2 = Q1 * (N2/N1) * (D2/D1)^3
//   P2 = P1 * (N2/N1)^2 * (D2/D1)^2 * (rho2/rho1)
//   BHP2 = BHP1 * (N2/N1)^3 * (D2/D1)^5 * (rho2/rho1)
// Static efficiency is unchanged at corresponding points.

// ---------- Canvas layout ----------
let canvasWidth = 800;
let drawHeight = 440;
let controlHeight = 150;          // 4 control rows x 35 + 10
let canvasHeight = drawHeight + controlHeight;
let margin = 25;
let sliderLeftMargin = 250;
let defaultTextSize = 16;

// ---------- Base fan: Curve A (illustrative, standard air, 1,380 RPM) ----------
const BASE_RPM = 1380;
const CURVE_Q = [0, 2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000];
const CURVE_P = [4.6, 4.8, 4.9, 4.8, 4.5, 4.0, 3.2, 2.0, 0.4];
const CURVE_BHP = [4.0, 5.0, 6.0, 7.0, 8.1, 9.0, 9.5, 9.4, 8.8];
const BASE_OP = { q: 10000, p: 4.0, bhp: 9.0, eff: 70.0 };
const TOLERANCE = 0.02;

// ---------- Challenges (fixed order, two attempts each) ----------
const CHALLENGES = [
  {
    question: 'The same system needs 11,500 CFM. What speed?',
    unit: 'RPM', model: 1587, decimals: 0,
    ratios: { speed: 1.15, diameter: 1.00, density: 1.00 },
    wrong: 'Airflow goes with speed: 1,380 × 11,500 ÷ 10,000 = 1,587 RPM.'
  },
  {
    question: 'At 1,587 RPM, what BHP?',
    unit: 'BHP', model: 13.69, decimals: 2,
    ratios: { speed: 1.15, diameter: 1.00, density: 1.00 },
    wrong: 'Power goes with speed cubed: 9.0 × 1.15³ = 13.69 BHP, not 9.0 × 1.15.'
  },
  {
    question: 'The fan is slowed to 1,104 RPM. What static pressure (in. wg)?',
    unit: 'in. wg', model: 2.56, decimals: 2,
    ratios: { speed: 0.80, diameter: 1.00, density: 1.00 },
    wrong: 'Pressure goes with speed squared: 4.0 × 0.8² = 2.56 in. wg.'
  },
  {
    question: 'The next size up has a diameter ratio of 1.12 and runs at 1,380 RPM. ' +
              'What BHP at the corresponding point?',
    unit: 'BHP', model: 15.86, decimals: 2,
    ratios: { speed: 1.00, diameter: 1.12, density: 1.00 },
    wrong: 'Power goes with diameter to the fifth power: 9.0 × 1.12⁵ = 9.0 × 1.762 = 15.86 BHP.'
  }
];

// ---------- State ----------
let challengeIndex = 0;      // 0..3, or 4 when exploration is unlocked
let attempts = 0;            // attempts used on the current challenge
let resolved = false;        // current challenge answered correctly or missed
let correctCount = 0;
let feedbackText = '';
let feedbackColor = 'black';
let answerLine = '';         // "Your answer ... Model ..." line after resolution
let densityNoticeShown = false;
let lastDensity = 1.0;

// ---------- Controls ----------
let answerInput, checkButton, nextButton, resetButton;
let speedSlider, diameterSlider, densitySlider;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);

  // Row 1: answer box, Check, Next (challenge mode) / Reset (exploration mode)
  answerInput = createInput('');
  answerInput.parent(document.querySelector('main'));
  answerInput.size(110);
  answerInput.attribute('inputmode', 'decimal');
  answerInput.attribute('aria-label', 'Your answer');
  answerInput.elt.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { checkAnswer(); }
  });

  checkButton = createButton('Check');
  checkButton.parent(document.querySelector('main'));
  checkButton.mousePressed(checkAnswer);

  nextButton = createButton('Next challenge');
  nextButton.parent(document.querySelector('main'));
  nextButton.mousePressed(nextChallenge);
  nextButton.hide();

  resetButton = createButton('Reset ratios to 1.00');
  resetButton.parent(document.querySelector('main'));
  resetButton.mousePressed(resetRatios);
  resetButton.hide();

  // Rows 2-4: ratio sliders (locked during the challenges)
  speedSlider = createSlider(0.50, 1.50, 1.00, 0.01);
  speedSlider.parent(document.querySelector('main'));
  diameterSlider = createSlider(0.80, 1.25, 1.00, 0.01);
  diameterSlider.parent(document.querySelector('main'));
  densitySlider = createSlider(0.40, 1.30, 1.00, 0.01);
  densitySlider.parent(document.querySelector('main'));
  setSlidersLocked(true);

  positionControls();

  describe('Fan law calculator. A chart plots illustrative fan Curve A at 1,380 RPM with its ' +
    'system curve and operating point at 10,000 CFM and 4.0 inches water gauge. Four challenges ask ' +
    'for a new speed, brake horsepower or static pressure; the learner types a number and presses ' +
    'Check, then the new fan curve and readouts appear. After the challenges, sliders for speed, ' +
    'diameter and density ratio redraw the new curve and readouts.', LABEL);
}

function positionControls() {
  const rowY = (n) => drawHeight + 8 + n * 35;
  answerInput.position(130, rowY(0));
  checkButton.position(255, rowY(0));
  nextButton.position(255, rowY(0));   // shares the Check slot; Check hides once resolved
  resetButton.position(10, rowY(0));
  speedSlider.position(sliderLeftMargin, rowY(1));
  diameterSlider.position(sliderLeftMargin, rowY(2));
  densitySlider.position(sliderLeftMargin, rowY(3));
  const w = max(80, canvasWidth - sliderLeftMargin - margin);
  speedSlider.size(w);
  diameterSlider.size(w);
  densitySlider.size(w);
}

function setSlidersLocked(locked) {
  for (const s of [speedSlider, diameterSlider, densitySlider]) {
    if (locked) { s.attribute('disabled', ''); } else { s.removeAttribute('disabled'); }
  }
}

function setRatios(r) {
  speedSlider.value(r.speed);
  diameterSlider.value(r.diameter);
  densitySlider.value(r.density);
}

// ---------- Challenge logic ----------
function formatNumber(v, decimals) {
  return v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function checkAnswer() {
  if (challengeIndex >= CHALLENGES.length || resolved) { return; }
  const raw = answerInput.value().replace(/,/g, '').trim();
  const answer = parseFloat(raw);
  if (raw === '' || !isFinite(answer)) {
    feedbackText = 'Type a number in the answer box, then press Check.';
    feedbackColor = 'black';
    return;
  }
  const c = CHALLENGES[challengeIndex];
  const modelText = formatNumber(c.model, c.decimals) + ' ' + c.unit;
  const relErr = abs(answer - c.model) / c.model;
  attempts++;
  if (relErr <= TOLERANCE) {
    correctCount++;
    feedbackText = 'Correct: ' + modelText + '.';
    feedbackColor = 'darkgreen';
    resolveChallenge(answer, c);
  } else if (attempts < 2) {
    feedbackText = c.wrong + ' Try again (1 attempt left).';
    feedbackColor = 'firebrick';
  } else {
    feedbackText = c.wrong + ' Model answer: ' + modelText + '. This challenge counts as missed.';
    feedbackColor = 'firebrick';
    resolveChallenge(answer, c);
  }
}

function resolveChallenge(answer, c) {
  resolved = true;
  setRatios(c.ratios);
  answerLine = 'Your answer: ' + answer.toLocaleString('en-US') + '   Model: ' +
    formatNumber(c.model, c.decimals) + ' ' + c.unit;
  answerInput.attribute('disabled', '');
  checkButton.hide();
  nextButton.html(challengeIndex === CHALLENGES.length - 1 ? 'Start exploring' : 'Next challenge');
  nextButton.show();
}

function nextChallenge() {
  if (!resolved) { return; }
  challengeIndex++;
  attempts = 0;
  resolved = false;
  feedbackText = '';
  answerLine = '';
  nextButton.hide();
  setRatios({ speed: 1.00, diameter: 1.00, density: 1.00 });
  if (challengeIndex >= CHALLENGES.length) {
    // Exploration mode
    answerInput.hide();
    checkButton.hide();
    resetButton.show();
    setSlidersLocked(false);
    lastDensity = 1.0;
  } else {
    answerInput.value('');
    answerInput.removeAttribute('disabled');
    checkButton.show();
  }
}

function resetRatios() {
  setRatios({ speed: 1.00, diameter: 1.00, density: 1.00 });
}

// ---------- Fan-law model ----------
function getRatios() {
  return {
    speed: speedSlider.value(),
    diameter: diameterSlider.value(),
    density: densitySlider.value()
  };
}

function lawFactors(r) {
  return {
    q: r.speed * pow(r.diameter, 3),
    p: pow(r.speed, 2) * pow(r.diameter, 2) * r.density,
    bhp: pow(r.speed, 3) * pow(r.diameter, 5) * r.density
  };
}

// Map every point of Curve A through the fan laws
function mappedCurve(f) {
  return CURVE_Q.map((q, i) => ({ q: q * f.q, p: CURVE_P[i] * f.p, bhp: CURVE_BHP[i] * f.bhp }));
}

// True when the new curve should be revealed (exploration, or a resolved challenge)
function showNew() {
  return challengeIndex >= CHALLENGES.length || resolved;
}

// ---------- Drawing ----------
function draw() {
  updateCanvasSize();

  // Track the first density change in exploration mode
  if (challengeIndex >= CHALLENGES.length) {
    const d = densitySlider.value();
    if (abs(d - lastDensity) > 0.0001) { densityNoticeShown = true; }
    lastDensity = d;
  }

  // Required regions
  stroke('silver');
  strokeWeight(1);
  fill('aliceblue');
  rect(0, 0, canvasWidth, drawHeight);
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  const r = getRatios();
  const f = lawFactors(r);
  const reveal = showNew();
  const wide = canvasWidth >= 640;

  // Layout regions
  let chart, panel;
  if (wide) {
    const panelW = max(340, canvasWidth * 0.45);
    chart = { x: 0, y: 40, w: canvasWidth - panelW - 10, h: drawHeight - 45 };
    panel = { x: canvasWidth - panelW - 5, y: 42, w: panelW - 5 };
  } else {
    chart = { x: 0, y: 34, w: canvasWidth, h: 158 };
    panel = { x: 5, y: 194, w: canvasWidth - 10 };
  }

  drawChart(chart, f, reveal, r);

  // Title (drawn after the chart)
  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  textSize(22);
  text('Fan Law Calculator', canvasWidth / 2, 8);

  drawPanels(panel, f, reveal, r, wide);
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
  const base = mappedCurve({ q: 1, p: 1, bhp: 1 });
  const curve = mappedCurve(f);
  let qMax = 16000, pMax = 5.0;
  if (reveal) {
    qMax = max(qMax, curve[curve.length - 1].q);
    pMax = max(pMax, ...curve.map(pt => pt.p));
  }
  const qStep = niceStep(qMax, 5);
  const pStep = niceStep(pMax * 1.05, 5);
  qMax = ceil(qMax / qStep) * qStep;
  pMax = ceil((pMax * 1.05) / pStep) * pStep;

  const x0 = c.x + 62, x1 = c.x + c.w - 12;
  const y0 = c.y + 8, y1 = c.y + c.h - 42;
  const sx = (q) => map(q, 0, qMax, x0, x1);
  const sy = (p) => map(p, 0, pMax, y1, y0);

  // Plot background and grid
  stroke('silver');
  fill('white');
  rect(x0, y0, x1 - x0, y1 - y0);
  textSize(13);
  for (let q = 0; q <= qMax + 1e-6; q += qStep) {
    stroke('gainsboro');
    line(sx(q), y0, sx(q), y1);
    noStroke();
    fill('black');
    textAlign(CENTER, TOP);
    text(q >= 1000 ? formatNumber(q / 1000, q % 1000 === 0 ? 0 : 1) + 'k' : '0', sx(q), y1 + 4);
  }
  for (let p = 0; p <= pMax + 1e-6; p += pStep) {
    stroke('gainsboro');
    line(x0, sy(p), x1, sy(p));
    noStroke();
    fill('black');
    textAlign(RIGHT, CENTER);
    text(formatNumber(p, pStep < 1 ? 1 : 0), x0 - 5, sy(p));
  }
  noStroke();
  fill('black');
  textSize(14);
  textAlign(CENTER, TOP);
  text('Airflow (CFM)', (x0 + x1) / 2, y1 + 22);
  push();
  translate(c.x + 14, (y0 + y1) / 2);
  rotate(-HALF_PI);
  textAlign(CENTER, CENTER);
  text('Static pressure (in. wg)', 0, 0);
  pop();

  // Clip drawing to the plot rectangle
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(x0, y0, x1 - x0, y1 - y0);
  drawingContext.clip();

  // System curve(s): P = 4.0 x (Q/10,000)^2, scaled by density for the new air
  drawSystemCurve(sx, sy, qMax, 1.0, 'gray');
  if (reveal && abs(r.density - 1) > 0.001) {
    drawSystemCurve(sx, sy, qMax, r.density, 'darkorange');
  }

  // Base Curve A
  drawFanCurve(base, sx, sy, 'dimgray', 2);
  // New curve
  if (reveal) { drawFanCurve(curve, sx, sy, 'royalblue', 3); }

  drawingContext.restore();

  // Legend (drawn before the operating points so the markers stay on top)
  const compact = canvasWidth < 640;   // narrow (stacked) layout gets a shorter legend
  const labels = compact ? ['Curve A (illustrative)', 'System curve'] :
    ['Curve A, 1,380 RPM (illustrative)', 'System curve, P = 4.0(Q/10,000)²'];
  if (reveal) { labels.push((compact ? 'New, ' : 'New curve, ') + formatNumber(BASE_RPM * r.speed, 0) + ' RPM'); }
  const densityCurve = reveal && abs(r.density - 1) > 0.001;
  if (densityCurve) { labels.push((compact ? 'System × ' : 'System curve × ρ2/ρ1 = ') + r.density.toFixed(2)); }
  textSize(13);
  const legendW = max(...labels.map(t => textWidth(t))) + 48;
  const lx = x1 - legendW - 6, ly = y0 + 6;
  fill(255, 255, 255, 230);
  stroke(200);
  rect(lx, ly, legendW, labels.length * 19 + 12, 6);
  const legendRow = (yy, col, weight, dashed, label) => {
    stroke(col);
    strokeWeight(weight);
    if (dashed) { drawingContext.setLineDash([6, 4]); }
    line(lx + 8, yy, lx + 32, yy);
    drawingContext.setLineDash([]);
    strokeWeight(1);
    noStroke();
    fill('black');
    textSize(13);
    textAlign(LEFT, CENTER);
    text(label, lx + 38, yy);
  };
  legendRow(ly + 13, 'dimgray', 2, false, labels[0]);
  legendRow(ly + 32, 'gray', 1.5, true, labels[1]);
  if (reveal) { legendRow(ly + 51, 'royalblue', 3, false, labels[2]); }
  if (densityCurve) { legendRow(ly + 70, 'darkorange', 1.5, true, labels[3]); }
  // Operating points
  const bx = sx(BASE_OP.q), by = sy(BASE_OP.p);
  stroke('white');
  strokeWeight(1.5);
  fill('black');
  circle(bx, by, 12);
  if (reveal) {
    const nq = BASE_OP.q * f.q, np = BASE_OP.p * f.p;
    const nx = sx(nq), ny = sy(np);
    fill('darkorange');
    stroke('black');
    // diamond marker for the new operating point
    quad(nx, ny - 8, nx + 8, ny, nx, ny + 8, nx - 8, ny);
  }
  strokeWeight(1);

}

function drawSystemCurve(sx, sy, qMax, densityRatio, col) {
  stroke(col);
  strokeWeight(1.5);
  noFill();
  drawingContext.setLineDash([6, 4]);
  beginShape();
  for (let i = 0; i <= 60; i++) {
    const q = qMax * i / 60;
    vertex(sx(q), sy(4.0 * densityRatio * pow(q / 10000, 2)));
  }
  endShape();
  drawingContext.setLineDash([]);
  strokeWeight(1);
}

function drawFanCurve(pts, sx, sy, col, weight) {
  stroke(col);
  strokeWeight(weight);
  noFill();
  beginShape();
  curveVertex(sx(pts[0].q), sy(pts[0].p));
  for (const pt of pts) { curveVertex(sx(pt.q), sy(pt.p)); }
  const last = pts[pts.length - 1];
  curveVertex(sx(last.q), sy(last.p));
  endShape();
  strokeWeight(1);
}

function drawPanels(p, f, reveal, r, wide) {
  // ----- Readouts table -----
  const rowH = wide ? 22 : 16;
  const tableH = rowH * 6 + 14;
  stroke(200);
  fill(255, 255, 255, 230);
  rect(p.x, p.y, p.w, tableH, 10);

  const colLabel = p.x + 10;
  const colBase = p.x + p.w * 0.62;
  const colNew = p.x + p.w * 0.81;
  const colRatio = p.x + p.w - 10;
  const fs = wide ? 14 : 13;
  const lead = fs + 4;

  const newSpeed = BASE_RPM * r.speed;
  const newQ = round(BASE_OP.q * f.q / 10) * 10;
  const newP = BASE_OP.p * f.p;
  const newBhp = BASE_OP.bhp * f.bhp;
  // Static efficiency at the corresponding point: base efficiency times the change in Q*P/BHP,
  // which the fan laws make exactly 1, so the readout stays at the base value.
  const newEff = BASE_OP.eff * (f.q * f.p / f.bhp);

  const rows = [
    ['Speed (RPM)', formatNumber(BASE_RPM, 0), formatNumber(newSpeed, 0), r.speed],
    ['Airflow (CFM)', formatNumber(BASE_OP.q, 0), formatNumber(newQ, 0), f.q],
    ['Static press. (in. wg)', '4.00', formatNumber(newP, 2), f.p],
    ['BHP', '9.00', formatNumber(newBhp, 2), f.bhp],
    ['Static eff. (%)', '70.0', formatNumber(newEff, 1), null]
  ];

  noStroke();
  textSize(fs);
  let y = p.y + 8 + rowH / 2;
  fill('black');
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
    fill('black');
    textAlign(LEFT, CENTER);
    text(row[0], colLabel, y);
    textAlign(RIGHT, CENTER);
    text(row[1], colBase, y);
    fill(reveal ? 'royalblue' : 'gray');
    text(reveal ? row[2] : '?', colNew, y);
    fill('black');
    text(row[3] === null ? (reveal ? 'same' : '') : (reveal ? formatNumber(row[3], 3) : ''), colRatio, y);
  }

  // ----- Challenge / exploration box -----
  const boxY = p.y + tableH + (wide ? 8 : 4);
  const boxH = drawHeight - boxY - 6;
  stroke(200);
  fill(255, 255, 255, 230);
  rect(p.x, boxY, p.w, boxH, 10);
  noStroke();
  textWrap(WORD);
  textLeading(lead);
  const tx = p.x + 10, tw = p.w - 20;
  let ty = boxY + 8;

  if (challengeIndex < CHALLENGES.length) {
    const c = CHALLENGES[challengeIndex];
    fill('black');
    textStyle(BOLD);
    textSize(fs);
    textAlign(LEFT, TOP);
    text('Challenge ' + (challengeIndex + 1) + ' of 4' +
      (resolved ? '' : '  (attempt ' + (attempts + 1) + ' of 2)'), tx, ty);
    textStyle(NORMAL);
    ty += wide ? 22 : 18;
    text(c.question, tx, ty, tw);
    ty += lineCount(c.question, tw) * lead + (wide ? 6 : 2);
    if (feedbackText) {
      fill(feedbackColor);
      text(feedbackText, tx, ty, tw);
      ty += lineCount(feedbackText, tw) * lead + 4;
    }
    if (answerLine && wide) {
      fill('black');
      text(answerLine, tx, ty, tw);
    }
  } else {
    fill('black');
    textSize(fs);
    textAlign(LEFT, TOP);
    textStyle(BOLD);
    text('Exploration unlocked', tx, ty);
    textStyle(NORMAL);
    ty += wide ? 22 : 18;
    const notes = [];
    if (densityNoticeShown) {
      notes.push(['darkorange', 'A density ratio changes pressure and BHP but never CFM: ' +
        'the fan moves the same volume of lighter or heavier air.']);
    }
    if (abs(r.diameter - 1) > 0.001) {
      notes.push(['firebrick', 'Diameter changed: the orange point is the fan-law corresponding ' +
        'point, which no longer lies on this system curve.']);
    }
    if (notes.length === 0) {
      notes.push(['black', 'Move any ratio slider. With only speed changed, watch the operating ' +
        'point slide along the system curve while efficiency stays at 70.0%.']);
    }
    for (const n of notes) {
      fill(n[0]);
      text(n[1], tx, ty, tw);
      ty += lineCount(n[1], tw) * lead + (wide ? 6 : 2);
    }
  }

  // Running score at the bottom of the box
  if (challengeIndex < CHALLENGES.length && wide) {
    fill('dimgray');
    textAlign(LEFT, BOTTOM);
    text('Ratio sliders unlock after challenge 4.', tx, boxY + boxH - 30);
  }
  fill('black');
  textStyle(BOLD);
  textSize(fs);
  textAlign(LEFT, BOTTOM);
  text('Challenges correct: ' + correctCount + ' of 4', tx, boxY + boxH - 8);
  textStyle(NORMAL);
}

// Estimate wrapped line count for a string in the current text size
function lineCount(str, w) {
  const words = str.split(' ');
  let lines = 1, cur = '';
  for (const word of words) {
    const test = cur ? cur + ' ' + word : word;
    if (textWidth(test) > w && cur) { lines++; cur = word; } else { cur = test; }
  }
  return lines;
}

function drawControlLabels(r) {
  noStroke();
  fill('black');
  textSize(defaultTextSize);
  textAlign(LEFT, CENTER);
  const rowMid = (n) => drawHeight + 20 + n * 35;
  if (challengeIndex < CHALLENGES.length) {
    text('Your answer:', 10, rowMid(0));
  }
  fill(challengeIndex < CHALLENGES.length ? 'gray' : 'black');
  text('Speed ratio N2/N1: ' + r.speed.toFixed(2), 10, rowMid(1));
  text('Diameter ratio D2/D1: ' + r.diameter.toFixed(2), 10, rowMid(2));
  text('Density ratio ρ2/ρ1: ' + r.density.toFixed(2), 10, rowMid(3));
}

// ---------- Responsive sizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) {
    canvasWidth = container.offsetWidth;
    if (typeof speedSlider !== 'undefined') {
      const w = max(80, canvasWidth - sliderLeftMargin - margin);
      speedSlider.size(w);
      diameterSlider.size(w);
      densitySlider.size(w);
    }
  }
}
