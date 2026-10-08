// Duct Airflow and Velocity Calculator
// CANVAS_HEIGHT: 670
// Chapter 1 (Air, Pressure and the Fan): practice Q = V x A for rectangular and round ducts.
// Four fixed challenges (two attempts each, +/-2% tolerance), then a free-mode calculator.
// Rules: rectangular A = (W x H) / 144 ft^2; round A = pi x D^2 / 576 ft^2; V = Q / A; Q = V x A.

// Canvas dimensions - REQUIRED structure
let canvasWidth = 400;
let drawHeight = 520;
let controlHeight = 150;          // 4 control rows x 35 + 10
let canvasHeight = drawHeight + controlHeight;
let margin = 25;
let sliderLeftMargin = 200;
let defaultTextSize = 16;

// Controls
let answerInput, checkButton, nextButton;
let shapeSelect, flowSlider, widthSlider, heightSlider, diameterSlider;

// ---------- Model ----------
function rectArea(w, h) { return (w * h) / 144; }          // ft^2 from inches
function roundArea(d) { return (Math.PI * d * d) / 576; }  // ft^2 from inches
function fmt(x, decimals) {
  const d = decimals || 0;
  return Number(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtLearner(x) {
  return Number(x).toLocaleString('en-US', { maximumFractionDigits: 3 });
}

// Challenges, in the spec's fixed order. Model values are computed from the rules.
const challenges = [
  {
    source: "values from the chapter's machine-shop worked example",
    given: '2,400 CFM in a 16 in × 12 in rectangular duct.',
    question: 'How fast is the air moving?',
    asked: 'Velocity', unit: 'ft/min', decimals: 0,
    model: Math.round(2400 / rectArea(16, 12)),                 // 1,800
    duct: { shape: 'rect', w: 16, h: 12 }, flowLabel: '2,400 CFM',
    wrongText: 'Area is (16 × 12) ÷ 144 = 1.333 ft²; V = 2,400 ÷ 1.333 = 1,800 ft/min. Did you forget to divide by 144?',
    steps: [
      'Step 1. Convert the duct size to square feet: A = (16 × 12) ÷ 144 = 1.333 ft²',
      'Step 2. Solve for velocity: V = Q ÷ A = 2,400 ÷ 1.333 = 1,800 ft/min'
    ],
    slips: [
      { value: 2400 / 192, step: 0, note: 'You divided by 192 square inches. Convert the area to square feet (÷ 144) first.' },
      { value: 2400 / 16, step: 0, note: 'You divided by 12 instead of 144. One square foot is 144 square inches.' },
      { value: 2400 * rectArea(16, 12), step: 1, note: 'You multiplied Q by A. Velocity is Q ÷ A.' }
    ]
  },
  {
    source: 'illustrative values',
    given: '5,000 CFM in a 24 in round duct.',
    question: 'How fast is the air moving?',
    asked: 'Velocity', unit: 'ft/min', decimals: 0,
    model: Math.round(5000 / roundArea(24)),                    // 1,592
    duct: { shape: 'round', d: 24 }, flowLabel: '5,000 CFM',
    wrongText: 'Round area is π × 24² ÷ 576 = 3.142 ft², not 24 × 24 ÷ 144; V = 5,000 ÷ 3.142 = 1,592 ft/min.',
    steps: [
      'Step 1. Round duct area in square feet: A = π × 24² ÷ 576 = 3.142 ft²',
      'Step 2. Solve for velocity: V = Q ÷ A = 5,000 ÷ 3.142 = 1,592 ft/min'
    ],
    slips: [
      { value: 5000 / rectArea(24, 24), step: 0, note: 'You used a 24 in square (4.000 ft²). A round duct of diameter D has area π × D² ÷ 576.' },
      { value: 5000 / (Math.PI * 576 / 144), step: 0, note: 'You used π × D² ÷ 144, which treats the diameter as a radius. Use π × D² ÷ 576.' },
      { value: 5000 / (Math.PI * 576 / 4), step: 0, note: 'You left the area in square inches. Divide by 144 (π × D² ÷ 576 in one step).' },
      { value: 5000 * roundArea(24), step: 1, note: 'You multiplied Q by A. Velocity is Q ÷ A.' }
    ]
  },
  {
    source: 'illustrative values',
    given: 'A 20 in × 10 in rectangular duct with air moving at 1,500 ft/min.',
    question: 'How much air is flowing (CFM)?',
    asked: 'Airflow', unit: 'CFM', decimals: 0,
    model: Math.round(1500 * rectArea(20, 10)),                 // 2,083
    duct: { shape: 'rect', w: 20, h: 10 }, flowLabel: '1,500 ft/min',
    wrongText: 'Area is 200 ÷ 144 = 1.389 ft²; Q = V × A = 1,500 × 1.389 = 2,083 CFM.',
    steps: [
      'Step 1. Convert the duct size to square feet: A = (20 × 10) ÷ 144 = 1.389 ft²',
      'Step 2. Solve for airflow: Q = V × A = 1,500 × 1.389 = 2,083 CFM'
    ],
    slips: [
      { value: 1500 * 200, step: 0, note: 'You multiplied by 200 square inches. Convert the area to square feet (÷ 144) first.' },
      { value: 1500 / rectArea(20, 10), step: 1, note: 'You divided V by A. Airflow is Q = V × A.' }
    ]
  },
  {
    source: 'illustrative values',
    given: '10,000 CFM, and the velocity must be no higher than 2,000 ft/min.',
    question: 'What is the minimum flow area (ft²)?',
    asked: 'Minimum flow area', unit: 'ft²', decimals: 2,
    model: Math.round((10000 / 2000) * 100) / 100,              // 5.00
    duct: { shape: 'unknown' }, flowLabel: '10,000 CFM',
    wrongText: 'A = Q ÷ V = 10,000 ÷ 2,000 = 5.00 ft². A larger area lowers the velocity further.',
    steps: [
      'Step 1. Solve for area: A = Q ÷ V = 10,000 ÷ 2,000 = 5.00 ft² (a larger area lowers velocity further)'
    ],
    slips: [
      { value: 720, step: 0, note: 'That is the area in square inches (5.00 × 144). The question asks for square feet.' },
      { value: 2000 / 10000, step: 0, note: 'You divided V by Q. Area is A = Q ÷ V.' },
      { value: 10000 * 2000, step: 0, note: 'You multiplied. Area is A = Q ÷ V.' }
    ]
  }
];

// ---------- State ----------
let mode = 'challenge';          // 'challenge' or 'free'
let current = 0;                 // challenge index 0..3
let attemptsUsed = 0;
let correctCount = 0;
let results = [null, null, null, null];   // 'correct' | 'missed'
let feedback = null;   // { kind: 'correct'|'wrong'|'missed', text, answer, highlightStep, stepNote }
let invalidMsg = '';
let committed = null;  // last committed free-mode state, for the once-only note
let noteText = '';
let noteShown = false;
let dryRun = false;     // true while measuring text layout without drawing

function within2pct(x, model) { return Math.abs(x - model) <= 0.02 * Math.abs(model); }

// ---------- Setup ----------
function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  const main = document.querySelector('main');

  // Challenge controls
  answerInput = createInput('');
  answerInput.parent(main);
  answerInput.size(110);
  answerInput.attribute('inputmode', 'decimal');
  answerInput.attribute('aria-label', 'Your answer');
  answerInput.elt.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkAnswer(); });

  checkButton = createButton('Check');
  checkButton.parent(main);
  checkButton.mousePressed(checkAnswer);

  nextButton = createButton('Next challenge');
  nextButton.parent(main);
  nextButton.mousePressed(nextChallenge);
  nextButton.hide();

  // Free-mode controls (hidden until challenge 4 is finished)
  shapeSelect = createSelect();
  shapeSelect.parent(main);
  shapeSelect.option('Rectangular', 'rect');
  shapeSelect.option('Round', 'round');
  shapeSelect.selected('rect');
  shapeSelect.changed(onShapeChanged);

  flowSlider = createSlider(200, 20000, 2400, 100);
  flowSlider.parent(main);
  widthSlider = createSlider(6, 48, 16, 2);
  widthSlider.parent(main);
  heightSlider = createSlider(6, 48, 12, 2);
  heightSlider.parent(main);
  diameterSlider = createSlider(6, 60, 18, 2);
  diameterSlider.parent(main);
  [flowSlider, widthSlider, heightSlider, diameterSlider].forEach(s => s.changed(commitFree));

  positionControls();
  showFreeControls(false);

  describe('Duct airflow calculator. Four challenges ask the learner to type a velocity, an airflow or a flow area, ' +
    'then check it against the model value within 2 percent. After the challenges, free mode lets the learner change duct shape, ' +
    'size and airflow and see flow area, velocity and the substituted equation Q = V times A.', LABEL);
}

function positionControls() {
  const r1 = drawHeight + 8, r2 = drawHeight + 43, r3 = drawHeight + 78, r4 = drawHeight + 113;
  answerInput.position(115, r1);
  checkButton.position(300, r1);
  nextButton.position(10, r2);

  shapeSelect.position(sliderLeftMargin, r1);
  flowSlider.position(sliderLeftMargin, r2);
  widthSlider.position(sliderLeftMargin, r3);
  diameterSlider.position(sliderLeftMargin, r3);
  heightSlider.position(sliderLeftMargin, r4);
  const sw = canvasWidth - sliderLeftMargin - margin;
  [flowSlider, widthSlider, heightSlider, diameterSlider].forEach(s => s.size(sw));
}

function showFreeControls(on) {
  if (on) {
    shapeSelect.show();
    flowSlider.show();
    const round = shapeSelect.value() === 'round';
    if (round) { widthSlider.hide(); heightSlider.hide(); diameterSlider.show(); }
    else { widthSlider.show(); heightSlider.show(); diameterSlider.hide(); }
  } else {
    [shapeSelect, flowSlider, widthSlider, heightSlider, diameterSlider].forEach(c => c.hide());
  }
}

// ---------- Challenge logic ----------
function checkAnswer() {
  if (mode !== 'challenge' || results[current] !== null) return;
  const raw = String(answerInput.value()).replace(/,/g, '').trim();
  const x = raw === '' ? NaN : Number(raw);
  if (!isFinite(x)) {           // Non-numeric or empty input does not use an attempt
    invalidMsg = 'Enter a number';
    return;
  }
  invalidMsg = '';
  const c = challenges[current];
  attemptsUsed++;
  if (within2pct(x, c.model)) {
    results[current] = 'correct';
    correctCount++;
    feedback = { kind: 'correct', text: 'Correct: model value is ' + fmt(c.model, c.decimals) + ' ' + c.unit + '.',
      answer: x, highlightStep: -1, stepNote: '' };
    lockChallenge();
    return;
  }
  // Wrong: find the step where the learner's number departs from the worked calculation
  let hs = c.steps.length - 1;
  let note = 'Recheck the area you used and the arithmetic in this step.';
  for (const s of c.slips) {
    if (within2pct(x, s.value)) { hs = s.step; note = s.note; break; }
  }
  if (attemptsUsed >= 2) {
    results[current] = 'missed';
    feedback = { kind: 'missed',
      text: c.wrongText + ' This challenge counts as missed; the model value is ' + fmt(c.model, c.decimals) + ' ' + c.unit + '.',
      answer: x, highlightStep: hs, stepNote: note };
    lockChallenge();
  } else {
    feedback = { kind: 'wrong', text: c.wrongText, answer: x, highlightStep: hs, stepNote: note };
    answerInput.value('');
  }
}

function lockChallenge() {
  answerInput.attribute('disabled', '');
  checkButton.hide();
  nextButton.html(current < challenges.length - 1 ? 'Next challenge' : 'Start free mode');
  nextButton.show();
}

function nextChallenge() {
  if (results[current] === null) return;
  nextButton.hide();
  feedback = null;
  invalidMsg = '';
  attemptsUsed = 0;
  if (current < challenges.length - 1) {
    current++;
    answerInput.value('');
    answerInput.removeAttribute('disabled');
    checkButton.show();
  } else {
    mode = 'free';
    answerInput.hide();
    checkButton.hide();
    showFreeControls(true);
    committed = freeState();
  }
}

// ---------- Free-mode logic ----------
function freeState() {
  const shape = shapeSelect.value();
  const Q = flowSlider.value();
  const A = shape === 'round' ? roundArea(diameterSlider.value()) : rectArea(widthSlider.value(), heightSlider.value());
  return { shape, Q, A, V: Q / A };
}

function onShapeChanged() {
  showFreeControls(mode === 'free');
  commitFree();
}

// Called when a free-mode control is released; shows the once-only note when
// the duct grows while CFM stays fixed (misconception 2).
function commitFree() {
  if (mode !== 'free') return;
  const s = freeState();
  if (committed && !noteShown && s.Q === committed.Q && s.A > committed.A + 1e-9) {
    noteText = 'Airflow unchanged at ' + fmt(s.Q) + ' CFM; velocity fell from ' +
      fmt(Math.round(committed.V / 10) * 10) + ' to ' + fmt(Math.round(s.V / 10) * 10) + ' ft/min.';
    noteShown = true;
  }
  committed = s;
}

// ---------- Drawing ----------
function draw() {
  updateCanvasSize();

  fill('aliceblue');
  stroke('silver');
  strokeWeight(1);
  rect(0, 0, canvasWidth, drawHeight);
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  // Title
  fill('black');
  noStroke();
  textAlign(CENTER, TOP);
  textSize(canvasWidth < 520 ? 19 : 24);
  textStyle(BOLD);
  text('Duct Airflow and Velocity Calculator', canvasWidth / 2, 8);
  textStyle(NORMAL);
  textSize(defaultTextSize);

  if (mode === 'challenge') drawChallenge(); else drawFree();
  drawControlLabels();
}

function leftPanelWidth() { return constrain(canvasWidth * 0.36, 140, 240); }

function drawStatusLine(label, tag) {
  textAlign(LEFT, TOP);
  textSize(16);
  noStroke();
  fill('black');
  textStyle(BOLD);
  text(label, 12, 40);
  const w = textWidth(label);
  textStyle(NORMAL);
  fill('darkslategray');
  text('Challenges correct: ' + correctCount + ' of 4', 12 + w + 14, 40);
  if (tag) {
    textStyle(ITALIC);
    fill('sienna');
    textAlign(RIGHT, TOP);
    if (12 + w + 14 + textWidth('Challenges correct: 0 of 4') + textWidth(tag) + 30 < canvasWidth) {
      text(tag, canvasWidth - 12, 40);
    } else {
      textAlign(LEFT, TOP);
      text(tag, 12, 60);
      textStyle(NORMAL);
      return 84;
    }
    textStyle(NORMAL);
  }
  return 66;
}

function drawChallenge() {
  const c = challenges[current];
  const top = drawStatusLine('Challenge ' + (current + 1) + ' of 4', c.source);

  // Upper area: duct drawing (left) and the problem (right)
  const upperH = canvasWidth < 600 ? 160 : 200;
  const lw = leftPanelWidth();
  drawPanel(10, top, lw, upperH);
  drawDuctFigure(10, top, lw, upperH, c.duct, null, c.flowLabel);

  const rx = lw + 22, rw = canvasWidth - rx - 12;
  textAlign(LEFT, TOP);
  noStroke();
  fill('black');
  textSize(16);
  let y = top + 4;
  y = wrapText('Given: ' + c.given, rx, y, rw, 20) + 6;
  textStyle(BOLD);
  textSize(18);
  y = wrapText(c.question, rx, y, rw, 23) + 6;
  textStyle(NORMAL);
  textSize(16);
  fill('darkslategray');
  y = wrapText('Answer as ' + c.asked.toLowerCase() + ' in ' + c.unit + '.', rx, y, rw, 20);
  const left = results[current] === null ? 2 - attemptsUsed : 0;
  text('Attempts left: ' + left + ' of 2', rx, y + 2);

  // Lower area: feedback and worked calculation. Measure first; use 14px text
  // only when the 16px layout would not fit (narrow screens).
  const ly = top + upperH + 10;
  drawPanel(10, ly, canvasWidth - 20, drawHeight - ly - 10);
  dryRun = true;
  let ts = 16, lh = 20;
  if (drawChallengeLower(c, ly, ts, lh) > drawHeight - 14) { ts = 14; lh = 17; }
  dryRun = false;
  drawChallengeLower(c, ly, ts, lh);
}

function T(str, x, y) { if (!dryRun) text(str, x, y); }

function drawChallengeLower(c, ly, ts, lh) {
  let yy = ly + 10;
  const tx = 22, tw = canvasWidth - 44;
  textAlign(LEFT, TOP);
  textSize(ts);
  noStroke();
  if (invalidMsg) {
    fill('firebrick');
    textStyle(BOLD);
    T(invalidMsg, tx, yy);
    textStyle(NORMAL);
    yy += lh + 4;
  }
  if (!feedback) {
    fill('darkslategray');
    return wrapText('Type your answer in the box below and press Check (or Enter). ' +
      'Answers within ±2% of the model value count as correct.', tx, yy, tw, lh);
  }
  // Header
  const header = feedback.kind === 'correct' ? 'Correct' :
    (feedback.kind === 'missed' ? 'Missed (second attempt)' : 'Not yet: 1 attempt left');
  fill(feedback.kind === 'correct' ? 'darkgreen' : 'firebrick');
  textStyle(BOLD);
  T(header, tx, yy);
  textStyle(NORMAL);
  yy += lh + 2;
  fill('black');
  yy = wrapText(feedback.text, tx, yy, tw, lh);
  // Learner answer beside the model value
  fill('darkslategray');
  yy = wrapText('Your answer: ' + fmtLearner(feedback.answer) + ' ' + c.unit +
    '     Model value: ' + fmt(c.model, c.decimals) + ' ' + c.unit, tx, yy + 4, tw, lh) + 6;

  // Worked calculation steps, with the departure step highlighted
  for (let i = 0; i < c.steps.length; i++) {
    const hl = i === feedback.highlightStep;
    const ok = feedback.kind === 'correct' || (feedback.highlightStep >= 0 && i < feedback.highlightStep);
    const mark = hl ? '▶ ' : (ok ? '✓ ' : '  ');
    const body = mark + c.steps[i];
    const noteLine = 'Your number departs here: ' + feedback.stepNote;
    const n = countLines(body, tw - 12);
    const extra = hl ? countLines(noteLine, tw - 12) : 0;
    const h = (n + extra) * lh + 8;
    if (hl && !dryRun) {
      fill('lightyellow');
      stroke('darkorange');
      strokeWeight(2);
      rect(tx - 4, yy - 3, tw + 8, h, 6);
      strokeWeight(1);
    }
    noStroke();
    fill(ok ? 'darkgreen' : 'black');
    let ny = wrapText(body, tx + 4, yy, tw - 12, lh);
    if (hl) {
      fill('saddlebrown');
      textStyle(ITALIC);
      ny = wrapText(noteLine, tx + 4, ny, tw - 12, lh);
      textStyle(NORMAL);
    }
    yy = ny + 8;
  }
  textSize(16);
  return yy;
}

function drawFree() {
  const top = drawStatusLine('Free mode', '');
  const s = freeState();
  const upperH = canvasWidth < 600 ? 160 : 240;
  const lw = leftPanelWidth();
  drawPanel(10, top, lw, upperH);
  const duct = s.shape === 'round' ? { shape: 'round', d: diameterSlider.value() }
    : { shape: 'rect', w: widthSlider.value(), h: heightSlider.value() };
  drawDuctFigure(10, top, lw, upperH, duct, 60, fmt(s.Q) + ' CFM');

  // Right: key numbers and a velocity bar
  const rx = lw + 22, rw = canvasWidth - rx - 12;
  const vR = Math.round(s.V / 10) * 10;
  textAlign(LEFT, TOP);
  noStroke();
  textSize(16);
  fill('black');
  const shapeTxt = s.shape === 'round' ? 'Round, ' + diameterSlider.value() + ' in diameter'
    : 'Rectangular, ' + widthSlider.value() + ' in × ' + heightSlider.value() + ' in';
  let y = top + 4;
  y = wrapText('Duct: ' + shapeTxt, rx, y, rw, 20);
  text('Airflow Q: ' + fmt(s.Q) + ' CFM', rx, y); y += 22;
  text('Flow area A: ' + fmt(s.A, 3) + ' ft²', rx, y); y += 22;
  textStyle(BOLD);
  text('Velocity V: ' + fmt(vR) + ' ft/min', rx, y); y += 28;
  textStyle(NORMAL);

  // Velocity bar, linear 0-6,000 ft/min
  const vmax = 6000, bw = rw - 10, bh = 14;
  stroke('silver');
  fill('white');
  rect(rx, y, bw, bh);
  noStroke();
  fill('steelblue');
  rect(rx, y, bw * Math.min(s.V, vmax) / vmax, bh);
  textSize(14);
  fill('dimgray');
  textAlign(CENTER, TOP);
  const step = bw > 300 ? 1000 : 2000;
  for (let v = 0; v <= vmax; v += step) {
    const x = rx + bw * v / vmax;
    stroke('gray'); line(x, y + bh, x, y + bh + 4); noStroke();
    text(fmt(v), x, y + bh + 5);
  }
  if (s.V > vmax) {
    textAlign(RIGHT, BOTTOM);
    fill('firebrick');
    text('off scale ▶', rx + bw, y - 1);
  }
  textSize(16);

  // Lower area: substituted equations, the note, and challenge results
  const ly = top + upperH + 10;
  drawPanel(10, ly, canvasWidth - 20, drawHeight - ly - 10);
  const tx = 22, tw = canvasWidth - 44;
  let yy = ly + 10;
  textAlign(LEFT, TOP);
  fill('black');
  textStyle(BOLD);
  text('Q = V × A with the current numbers', tx, yy);
  textStyle(NORMAL);
  yy += 24;
  const areaEq = s.shape === 'round'
    ? 'A = π × ' + diameterSlider.value() + '² ÷ 576 = ' + fmt(s.A, 3) + ' ft²'
    : 'A = (' + widthSlider.value() + ' × ' + heightSlider.value() + ') ÷ 144 = ' + fmt(s.A, 3) + ' ft²';
  yy = wrapText('Flow area: ' + areaEq, tx, yy, tw, 20) + 2;
  yy = wrapText('Velocity: V = Q ÷ A = ' + fmt(s.Q) + ' ÷ ' + fmt(s.A, 3) + ' = ' + fmt(vR) + ' ft/min', tx, yy, tw, 20) + 8;
  if (noteText) {
    const h = countLines(noteText, tw - 12) * 20 + 8;
    fill('lightyellow');
    stroke('darkorange');
    rect(tx - 4, yy - 3, tw + 8, h, 6);
    noStroke();
    fill('saddlebrown');
    yy = wrapText(noteText, tx + 4, yy, tw - 12, 20) + 10;
  } else {
    fill('darkslategray');
    yy = wrapText('Try it: keep the airflow fixed and make the duct bigger. What happens to the CFM, and to the velocity?', tx, yy, tw, 20) + 8;
  }
  fill('darkslategray');
  const res = results.map((r, i) => (i + 1) + ': ' + (r === 'correct' ? 'correct ✓' : 'missed ✗')).join('   ');
  wrapText('Challenge results: ' + res, tx, yy, tw, 20);
}

function drawControlLabels() {
  noStroke();
  fill('black');
  textSize(16);
  textAlign(LEFT, CENTER);
  const r1 = drawHeight + 20, r2 = drawHeight + 55, r3 = drawHeight + 90, r4 = drawHeight + 125;
  if (mode === 'challenge') {
    textStyle(BOLD);
    text('Your answer:', 10, r1);
    textStyle(NORMAL);
    text(challenges[current].unit, 240, r1);
    fill('darkslategray');
    if (results[current] === null) text('Two attempts per challenge.', 10, r2);
    text('Answers within ±2% of the model value are correct.', 10, r3);
    text('Free mode unlocks after challenge 4.', 10, r4);
  } else {
    textStyle(BOLD);
    text('Duct shape:', 10, r1);
    textStyle(NORMAL);
    text('Airflow Q: ' + fmt(flowSlider.value()) + ' CFM', 10, r2);
    if (shapeSelect.value() === 'round') {
      text('Diameter: ' + diameterSlider.value() + ' in', 10, r3);
    } else {
      text('Width: ' + widthSlider.value() + ' in', 10, r3);
      text('Height: ' + heightSlider.value() + ' in', 10, r4);
    }
  }
}

function drawPanel(x, y, w, h) {
  fill(255, 255, 255, 230);
  stroke(200);
  strokeWeight(1);
  rect(x, y, w, h, 10);
  noStroke();
}

// Draw a duct cross-section inside a panel. fixedMaxIn: inches that fill the box
// (free mode uses 60 so a bigger duct looks bigger); null fits the duct to the box.
function drawDuctFigure(x, y, w, h, duct, fixedMaxIn, flowLabel) {
  const cx = x + w / 2;
  const boxTop = y + 8, boxH = h - 72;
  const cy = boxTop + boxH / 2;
  const box = Math.min(w - 60, boxH);
  noStroke();
  if (duct.shape === 'unknown') {
    drawingContext.setLineDash([6, 4]);
    stroke('steelblue');
    strokeWeight(2);
    fill('aliceblue');
    rect(cx - box * 0.4, cy - box * 0.4, box * 0.8, box * 0.8);
    drawingContext.setLineDash([]);
    noStroke();
    fill('steelblue');
    textAlign(CENTER, CENTER);
    textSize(18);
    text('A = ?', cx, cy);
  } else {
    const maxIn = fixedMaxIn || (duct.shape === 'round' ? duct.d : Math.max(duct.w, duct.h));
    const ppi = box / maxIn;
    stroke('steelblue');
    strokeWeight(2);
    fill('lightsteelblue');
    textSize(14);
    if (duct.shape === 'round') {
      const r = duct.d * ppi / 2;
      circle(cx, cy, 2 * r);
      stroke('navy');
      strokeWeight(1);
      line(cx - r, cy, cx + r, cy);
      noStroke();
      fill('navy');
      textAlign(CENTER, BOTTOM);
      text('D = ' + duct.d + ' in', cx, r > 40 ? cy - 3 : cy - r - 3);
    } else {
      const rw = duct.w * ppi, rh = duct.h * ppi;
      rect(cx - rw / 2, cy - rh / 2, rw, rh);
      noStroke();
      fill('navy');
      textAlign(CENTER, TOP);
      text(duct.w + ' in', cx, cy + rh / 2 + 2);
      textAlign(RIGHT, CENTER);
      text(duct.h + ' in', cx - rw / 2 - 4, cy);
    }
  }
  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  textSize(16);
  text(flowLabel, cx, y + h - 40);
  fill('dimgray');
  textSize(14);
  text('duct cross-section', cx, y + h - 20);
  textSize(16);
}

// ---------- Text helpers ----------
function splitLines(str, w) {
  const words = String(str).split(' ');
  const lines = [];
  let line = '';
  for (const wd of words) {
    const test = line ? line + ' ' + wd : wd;
    if (textWidth(test) > w && line) { lines.push(line); line = wd; } else { line = test; }
  }
  if (line) lines.push(line);
  return lines;
}
function countLines(str, w) { return splitLines(str, w).length; }
function wrapText(str, x, y, w, lineH) {
  const lines = splitLines(str, w);
  for (const ln of lines) { if (!dryRun) text(ln, x, y); y += lineH; }
  return y;
}

// ---------- Responsive ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) {
    canvasWidth = container.offsetWidth;
    if (typeof flowSlider !== 'undefined') {
      const sw = canvasWidth - sliderLeftMargin - margin;
      flowSlider.size(sw);
      widthSlider.size(sw);
      heightSlider.size(sw);
      diameterSlider.size(sw);
    }
  }
}
