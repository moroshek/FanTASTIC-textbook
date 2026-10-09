// Duct Airflow and Velocity Calculator
// CANVAS_HEIGHT: 670
// Chapter 1 (Air, Pressure and the Fan): practice Q = V x A for rectangular and round ducts.
// Four fixed challenges (two attempts each, +/-2% tolerance), then Explore mode.
// Rules: rectangular A = (W x H) / 144 ft^2; round A = pi x D^2 / 576 ft^2; V = Q / A; Q = V x A.
// Built on the FanPedia kit (../shared-libs): FP.ChallengeRunner, FP.p5, FP.models, FD.ductSection.

const K = FP.p5;
const M = FP.models;
const SIM_ID = 'ch01-duct-airflow-velocity-calculator';

// Canvas dimensions
let canvasWidth = 800;
const drawHeight = 520;
const controlHeight = K.controlHeightFor(4);   // 4 control rows: 150
const canvasHeight = drawHeight + controlHeight;
const sliderLeftMargin = 200;

// Controls
let answerInput, checkButton, nextButton, startOverButton;
let shapeSelect, flowSlider, widthSlider, heightSlider, diameterSlider;

// Challenges, in the spec's fixed order. Model values come from FP.models and
// are rounded as the spec's Rules say (1 ft/min, 1 CFM, 0.01 ft^2).
const challenges = [
  {
    id: 'c1',
    source: "Values from the chapter's machine-shop worked example",
    given: '2,400 CFM in a 16 in × 12 in rectangular duct.',
    question: 'How fast is the air moving?',
    asked: 'Velocity', unit: 'ft/min', decimals: 0,
    model: M.round(M.ductVelocityFpm(2400, M.ductAreaRectFt2(16, 12)), 0),        // 1,800
    duct: { shape: 'rect', w: 16, h: 12 }, flowLabel: '2,400 CFM',
    why: 'Area is (16 × 12) ÷ 144 = 1.333 ft²; V = 2,400 ÷ 1.333 = 1,800 ft/min. Did you forget to divide by 144?',
    rule: 'Convert the duct size to square feet first (W × H ÷ 144), then solve V = Q ÷ A.',
    steps: [
      'Step 1. Convert the duct size to square feet: A = (16 × 12) ÷ 144 = 1.333 ft²',
      'Step 2. Solve for velocity: V = Q ÷ A = 2,400 ÷ 1.333 = 1,800 ft/min'
    ],
    slips: [
      { value: 2400 / 192, step: 0, note: 'You divided by 192 square inches. Convert the area to square feet (÷ 144) first.' },
      { value: 2400 / 16, step: 0, note: 'You divided by 12 instead of 144. One square foot is 144 square inches.' },
      { value: 2400 * M.ductAreaRectFt2(16, 12), step: 1, note: 'You multiplied Q by A. Velocity is Q ÷ A.' }
    ]
  },
  {
    id: 'c2',
    source: FP.msg.ILLUSTRATIVE,
    given: '5,000 CFM in a 24 in round duct.',
    question: 'How fast is the air moving?',
    asked: 'Velocity', unit: 'ft/min', decimals: 0,
    model: M.round(M.ductVelocityFpm(5000, M.ductAreaRoundFt2(24)), 0),            // 1,592
    duct: { shape: 'round', d: 24 }, flowLabel: '5,000 CFM',
    why: 'Round area is π × 24² ÷ 576 = 3.142 ft², not 24 × 24 ÷ 144; V = 5,000 ÷ 3.142 = 1,592 ft/min.',
    rule: 'A round duct of diameter D has a flow area of π × D² ÷ 576 ft² (not D × D ÷ 144); then solve V = Q ÷ A.',
    steps: [
      'Step 1. Round duct area in square feet: A = π × 24² ÷ 576 = 3.142 ft²',
      'Step 2. Solve for velocity: V = Q ÷ A = 5,000 ÷ 3.142 = 1,592 ft/min'
    ],
    slips: [
      { value: 5000 / M.ductAreaRectFt2(24, 24), step: 0, note: 'You used a 24 in square (4.000 ft²). A round duct of diameter D has area π × D² ÷ 576.' },
      { value: 5000 / (Math.PI * 576 / 144), step: 0, note: 'You used π × D² ÷ 144, which treats the diameter as a radius. Use π × D² ÷ 576.' },
      { value: 5000 / (Math.PI * 576 / 4), step: 0, note: 'You left the area in square inches. Divide by 144 (π × D² ÷ 576 in one step).' },
      { value: 5000 * M.ductAreaRoundFt2(24), step: 1, note: 'You multiplied Q by A. Velocity is Q ÷ A.' }
    ]
  },
  {
    id: 'c3',
    source: FP.msg.ILLUSTRATIVE,
    given: 'A 20 in × 10 in rectangular duct with air moving at 1,500 ft/min.',
    question: 'How much air is flowing (CFM)?',
    asked: 'Airflow', unit: 'CFM', decimals: 0,
    model: M.round(M.ductFlowCfm(1500, M.ductAreaRectFt2(20, 10)), 0),             // 2,083
    duct: { shape: 'rect', w: 20, h: 10 }, flowLabel: '1,500 ft/min',
    why: 'Area is 200 ÷ 144 = 1.389 ft²; Q = V × A = 1,500 × 1.389 = 2,083 CFM.',
    rule: 'Convert the duct size to square feet first (W × H ÷ 144), then airflow is Q = V × A.',
    steps: [
      'Step 1. Convert the duct size to square feet: A = (20 × 10) ÷ 144 = 1.389 ft²',
      'Step 2. Solve for airflow: Q = V × A = 1,500 × 1.389 = 2,083 CFM'
    ],
    slips: [
      { value: 1500 * 200, step: 0, note: 'You multiplied by 200 square inches. Convert the area to square feet (÷ 144) first.' },
      { value: 1500 / M.ductAreaRectFt2(20, 10), step: 1, note: 'You divided V by A. Airflow is Q = V × A.' }
    ]
  },
  {
    id: 'c4', label: 'challenge 4',
    source: FP.msg.ILLUSTRATIVE,
    given: '10,000 CFM, and the velocity must be no higher than 2,000 ft/min.',
    question: 'What is the minimum flow area (ft²)?',
    asked: 'Minimum flow area', unit: 'ft²', decimals: 2,
    model: M.round(10000 / 2000, 2),                                               // 5.00
    duct: { shape: 'unknown' }, flowLabel: '10,000 CFM',
    why: 'A = Q ÷ V = 10,000 ÷ 2,000 = 5.00 ft². A larger area lowers the velocity further.',
    rule: 'Rearrange Q = V × A to solve for the area, and give it in square feet.',
    steps: [
      'Step 1. Solve for area: A = Q ÷ V = 10,000 ÷ 2,000 = 5.00 ft² (a larger area lowers velocity further)'
    ],
    slips: [
      { value: 720, step: 0, note: 'That is the area in square inches. The question asks for square feet (÷ 144).' },
      { value: 2000 / 10000, step: 0, note: 'You divided V by Q. Area is A = Q ÷ V.' },
      { value: 10000 * 2000, step: 0, note: 'You multiplied. Area is A = Q ÷ V.' }
    ]
  }
];
// First wrong attempt: a hint (the slip the learner's number matches, or the challenge's rule),
// never the model value or the worked numbers. The final miss shows the spec's "Feedback when
// wrong" text (why) with the model value and the worked calculation.
function matchSlip(c, v) { return c.slips.find(s => FP.check.numeric(v, s.value, { rel: 0.02 })) || null; }
challenges.forEach(c => {
  c.hint = v => { const s = matchSlip(c, v); return s ? s.note : c.rule; };
  c.stepTitles = c.steps.map(t => t.split(':')[0]);   // "Step 1. Convert the duct size to square feet"
});

// Mastery (spec): 4 of 4 correct within +/-2%, at most two attempts each.
const MASTERY = challenges.length;
const REVIEW_POINTER = 'Review the area step (÷ 144 for rectangular, π × D² ÷ 576 for round), then press Start over.';

const runner = new FP.ChallengeRunner({
  items: challenges, attempts: 2, tolerance: { rel: 0.02 },
  noun: 'Challenges', mastery: MASTERY, id: SIM_ID,
  onUnlockExplore: enterExplore
});

// ---------- State (display only; scoring lives in the runner) ----------
let feedback = null;   // {status, kind, text, answer, highlightStep, stepNote}
let invalidMsg = '';
let committed = null;  // last committed explore-mode state, for the once-only note
let noteText = '';
let noteShown = false;

function answerText(c) { return FP.fmt.num(c.model, c.decimals) + ' ' + c.unit; }
function nearest10(v) { return Math.round(v / 10) * 10; }   // spec: velocity to the nearest 10 ft/min in Explore mode
function learnerNum(x) { return Number(x).toLocaleString('en-US', { maximumFractionDigits: 3 }); }
function mastered() { return runner.summary().correct >= MASTERY; }
function masteryLine() {
  return mastered() ? FP.msg.masteryReached(MASTERY, challenges.length)
    : 'Mastery needs ' + MASTERY + ' of ' + challenges.length + ' correct, with at most two attempts each. ' + REVIEW_POINTER;
}

const keys = K.keys.bind({ Enter: onEnter });
function keyPressed() { return keys(); }

// ---------- Setup ----------
function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  K.canvas(canvasWidth, canvasHeight);
  const main = document.querySelector('main');

  // Challenge controls
  answerInput = createInput('');
  answerInput.parent(main);
  answerInput.size(90);
  answerInput.attribute('inputmode', 'decimal');
  answerInput.attribute('aria-label', 'Your answer');

  // Kit buttons press on 'click', so Enter and Space on a focused button work.
  checkButton = K.button(FP.msg.CHECK, checkAnswer);
  nextButton = K.button('Next challenge', nextChallenge);
  nextButton.hide();
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  // Explore-mode controls (hidden until challenge 4 is finished)
  shapeSelect = createSelect();
  shapeSelect.parent(main);
  shapeSelect.option('Rectangular', 'rect');
  shapeSelect.option('Round', 'round');
  shapeSelect.selected('rect');
  shapeSelect.attribute('aria-label', 'Duct shape');
  shapeSelect.changed(onShapeChanged);

  flowSlider = createSlider(200, 20000, 2400, 100);
  widthSlider = createSlider(6, 48, 16, 2);
  heightSlider = createSlider(6, 48, 12, 2);
  diameterSlider = createSlider(6, 60, 18, 2);
  [[flowSlider, 'Airflow Q in CFM'], [widthSlider, 'Width in inches'],
    [heightSlider, 'Height in inches'], [diameterSlider, 'Diameter in inches']].forEach(([s, name]) => {
    s.parent(main);
    s.attribute('aria-label', name);
    s.changed(commitFree);
  });

  showFreeControls(false);
  startOverButton.hide();
  positionControls();

  describe('Duct airflow calculator. Four challenges ask the learner to type a velocity, an airflow or a flow area, ' +
    'then check it against the model value within 2 percent, with two attempts each. After the challenges, Explore mode lets the learner ' +
    'change duct shape, size and airflow and see flow area, velocity and the substituted equation Q = V times A.');
}

// Places the answer row (input, unit, Check or Next) and the explore rows.
function positionControls() {
  answerInput.position(115, K.controlRow(0));
  const bx = 115 + answerInput.elt.offsetWidth + 8 + unitWidth() + 10;
  [checkButton, nextButton].forEach(b => {
    if (bx + b.elt.offsetWidth <= canvasWidth - 10) b.position(bx, K.controlRow(0));
    else b.position(10, K.controlRow(1));
  });

  shapeSelect.position(110, K.controlRow(0));
  // Start over sits right of the shape menu (closer to it on a 320 px canvas).
  const sx = Math.min(110 + shapeSelect.elt.offsetWidth + 16, canvasWidth - 10 - startOverButton.elt.offsetWidth);
  startOverButton.position(sx, K.controlRow(0));
  const sw = K.sliderWidth(canvasWidth, sliderLeftMargin, 25, 80);
  flowSlider.position(sliderLeftMargin, K.controlRow(1));
  widthSlider.position(sliderLeftMargin, K.controlRow(2));
  diameterSlider.position(sliderLeftMargin, K.controlRow(2));
  heightSlider.position(sliderLeftMargin, K.controlRow(3));
  [flowSlider, widthSlider, heightSlider, diameterSlider].forEach(s => s.size(sw));
}

// Width of the unit label drawn after the answer box (16 px, as drawn).
function unitWidth() {
  push(); textSize(16); textStyle(NORMAL);
  const w = textWidth(challenges[runner.index].unit);
  pop();
  return w;
}

function checkRowNarrow() {
  return 115 + answerInput.elt.offsetWidth + 8 + unitWidth() + 10 + checkButton.elt.offsetWidth > canvasWidth - 10;
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

// ---------- Challenge logic (FP.ChallengeRunner) ----------
function onEnter() {
  const ph = runner.state().phase;
  if (ph === 'question') checkAnswer();
  else if (ph === 'resolved') nextChallenge();
}

function checkAnswer() {
  if (runner.state().phase !== 'question') return;
  const res = runner.submit(answerInput.value());
  if (res.status === 'invalid') {           // no attempt used
    invalidMsg = res.message;
    FP.announce(res.message);
    return;
  }
  if (res.status === 'ignored') return;
  invalidMsg = '';
  const c = res.item;
  // Spec wording for a correct answer: "Correct: model value is <value> <unit>."
  const text = res.status === 'correct' ? FP.msg.correct('model value is ' + answerText(c)) : res.message;
  // Find the step where the learner's number departs from the worked calculation.
  let hs = -1, note = '';
  if (res.status !== 'correct') {
    const slip = matchSlip(c, res.value);
    hs = slip ? slip.step : c.steps.length - 1;
    note = slip ? slip.note : 'Recheck the area you used and the arithmetic in this step.';
  }
  feedback = { status: res.status, kind: res.kind, text, answer: res.value, highlightStep: hs, stepNote: note };
  // On a retry the hint already carries the slip note; the step list shows titles only.
  const stepSay = hs < 0 ? '' : res.status === 'retry'
    ? ' Check step ' + (hs + 1) + ': ' + c.stepTitles[hs] + '.'
    : ' Your number departs at step ' + (hs + 1) + ': ' + note;
  FP.announce(text + ' Your answer: ' + learnerNum(res.value) + ' ' + c.unit + '.' + stepSay +
    ' ' + runner.state().scoreLabel + '.');
  if (res.status === 'retry') {
    answerInput.value('');
  } else {
    lockChallenge();
  }
}

function lockChallenge() {
  answerInput.attribute('disabled', '');
  checkButton.hide();
  nextButton.html(runner.state().isLast ? 'Start explore mode' : 'Next challenge');
  nextButton.show();
  positionControls();
  nextButton.elt.focus();
}

function nextChallenge() {
  if (runner.state().phase !== 'resolved') return;
  nextButton.hide();
  feedback = null;
  invalidMsg = '';
  runner.next();                 // after the last item this calls enterExplore()
  if (!runner.state().explore) {
    answerInput.value('');
    answerInput.removeAttribute('disabled');
    checkButton.show();
    positionControls();
    answerInput.elt.focus();
  }
}

function enterExplore() {
  answerInput.hide();
  checkButton.hide();
  showFreeControls(true);
  startOverButton.show();
  positionControls();
  committed = freeState();
  shapeSelect.elt.focus();
  FP.announce(FP.msg.EXPLORE + '. ' + runner.state().scoreLabel + '. ' + masteryLine());
}

function startOver() {
  runner.restart();
  feedback = null;
  invalidMsg = '';
  noteText = '';
  noteShown = false;
  committed = null;
  shapeSelect.selected('rect');
  flowSlider.value(2400); widthSlider.value(16); heightSlider.value(12); diameterSlider.value(18);
  showFreeControls(false);
  startOverButton.hide();
  nextButton.hide();
  answerInput.show();
  answerInput.value('');
  answerInput.removeAttribute('disabled');
  checkButton.show();
  positionControls();
  answerInput.elt.focus();
  FP.announce('Started over. Challenge 1 of ' + challenges.length + '.');
}

// ---------- Explore-mode logic ----------
function freeDuct() {
  return shapeSelect.value() === 'round' ? { shape: 'round', d: diameterSlider.value() }
    : { shape: 'rect', w: widthSlider.value(), h: heightSlider.value() };
}
function freeState() {
  const duct = freeDuct();
  const Q = flowSlider.value();
  const A = M.ductArea(duct);
  return { shape: duct.shape, Q, A, V: M.ductVelocityFpm(Q, A) };
}

function onShapeChanged() {
  showFreeControls(runner.state().explore);
  commitFree();
}

// Called when an explore-mode control is released; shows the once-only note when
// the duct grows while CFM stays fixed (misconception 2).
function commitFree() {
  if (!runner.state().explore) return;
  const s = freeState();
  if (committed && !noteShown && s.Q === committed.Q && s.A > committed.A + 1e-9) {
    noteText = 'Airflow unchanged at ' + FP.fmt.num(s.Q) + ' CFM; velocity fell from ' +
      FP.fmt.num(nearest10(committed.V)) + ' to ' + FP.fmt.num(nearest10(s.V)) + ' ft/min.';
    noteShown = true;
    FP.announce(noteText);
  }
  committed = s;
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  const st = runner.state();
  const top = K.title('Duct Airflow and Velocity Calculator');
  if (st.explore) drawFree(top, st); else drawChallenge(top, st);
  drawControlLabels(st);
}

function leftPanelWidth() { return constrain(canvasWidth * 0.36, 130, 240); }
function noteTop() { return drawHeight - 26; }   // the data-label line sits below this

function drawChallenge(top, st) {
  const c = st.item;
  const y0 = K.statusLine(st.scoreLabel, 'Challenge ' + (st.index + 1) + ' of ' + challenges.length,
    [c.source, 'Enter: Check, then Next']) + 4;

  // Upper area: duct drawing (left) and the problem (right)
  const upperH = canvasWidth < 600 ? 170 : 200;
  const lw = leftPanelWidth();
  K.panel(10, y0, lw, upperH);
  FD.ductSection(null, { x: 10, y: y0, w: lw, h: upperH, shape: c.duct.shape,
    wIn: c.duct.w, hIn: c.duct.h, dIn: c.duct.d, flowLabel: c.flowLabel });

  const rx = lw + 22, rw = canvasWidth - rx - 12;
  const status = st.phase === 'question' ? st.attemptLabel
    : (st.results[st.index] === 'correct' ? FP.msg.OK + ' Answered correctly' : FP.msg.BAD + ' Counts as missed');
  const upper = (ts, dry) => {
    const lh = Math.round(ts * 1.3);
    let y = y0 + 6;
    noStroke();
    textAlign(LEFT, TOP);
    textStyle(NORMAL); textSize(ts); fill(FP.tok('text'));
    y = K.wrapText('Given: ' + c.given, rx, y, rw, lh, { dryRun: dry }) + 6;
    textStyle(BOLD); textSize(ts + 2);
    y = K.wrapText(c.question, rx, y, rw, lh + 3, { dryRun: dry }) + 6;
    textStyle(NORMAL); textSize(ts); fill(FP.tok('text-muted'));
    y = K.wrapText('Answer as ' + c.asked.toLowerCase() + ' in ' + c.unit + '.', rx, y, rw, lh, { dryRun: dry });
    y = K.wrapText(status, rx, y + 2, rw, lh, { dryRun: dry });
    return y - y0;
  };
  const uts = K.fitTextSize(ts => upper(ts, true), upperH - 8, 16, 12);
  upper(uts, false);

  // Lower area: feedback and worked calculation, at the largest size that fits.
  const ly = y0 + upperH + 10;
  const lh = noteTop() - ly;
  const fb = feedback;
  K.panel(10, ly, canvasWidth - 20, lh, fb ? {
    stroke: fb.kind === 'ok' ? '--fp-correct' : '--fp-incorrect', weight: 2, dashed: fb.kind !== 'ok'
  } : {});
  const ts = K.fitTextSize(s => drawChallengeLower(c, ly, s, true) - ly, lh - 6, 16, 12);
  drawChallengeLower(c, ly, ts, false);
}

function drawChallengeLower(c, ly, ts, dry) {
  const lh = Math.round(ts * 1.27);
  let yy = ly + 10;
  const tx = 22, tw = canvasWidth - 44;
  textAlign(LEFT, TOP);
  textSize(ts);
  noStroke();
  if (invalidMsg) {
    fill(FP.tok('text'));
    textStyle(BOLD);
    yy = K.wrapText('ℹ ' + invalidMsg + '. A number is needed; no attempt was used.', tx, yy, tw, lh, { dryRun: dry }) + 4;
    textStyle(NORMAL);
  }
  const fb = feedback;
  if (!fb) {
    fill(FP.tok('text-muted'));
    return K.wrapText('Type your answer in the box below and press Check (or Enter). ' +
      'Answers within ±2% of the model value count as correct.', tx, yy, tw, lh, { dryRun: dry });
  }
  fill(FP.tok(fb.kind === 'ok' ? 'correct' : 'incorrect'));
  textStyle(BOLD);
  yy = K.wrapText(fb.text, tx, yy, tw, lh, { dryRun: dry });
  textStyle(NORMAL);
  // Learner answer, beside the model value once the challenge is resolved (not on a retry)
  const retry = fb.status === 'retry';
  fill(FP.tok('text'));
  yy = K.wrapText('Your answer: ' + learnerNum(fb.answer) + ' ' + c.unit +
    (retry ? '' : ' · Model value: ' + answerText(c)), tx, yy + 4, tw, lh, { dryRun: dry }) + 6;

  // Worked calculation steps, with the departure step highlighted (▶ + outline, not colour alone).
  // On a retry only the step titles show, so the numbers are not given away.
  for (let i = 0; i < c.steps.length; i++) {
    const hl = i === fb.highlightStep;
    const ok = fb.status === 'correct' || (fb.highlightStep >= 0 && i < fb.highlightStep);
    const body = (hl ? '▶ ' : (ok ? FP.msg.OK + ' ' : '   ')) + (retry ? c.stepTitles[i] : c.steps[i]);
    const noteLine = retry ? 'Check this step.' : 'Your number departs here: ' + fb.stepNote;
    if (hl && !dry) {
      const h = (K.countLines(body, tw - 12) + K.countLines(noteLine, tw - 12)) * lh + 8;
      K.panel(tx - 4, yy - 3, tw + 8, h, { fill: '--fp-info-bg', stroke: '--fp-accent', weight: 2, radius: 6 });
    }
    noStroke();
    fill(FP.tok(ok ? 'correct' : 'text'));
    let ny = K.wrapText(body, tx + 4, yy, tw - 12, lh, { dryRun: dry });
    if (hl) {
      fill(FP.tok('accent-text'));
      textStyle(ITALIC);
      ny = K.wrapText(noteLine, tx + 4, ny, tw - 12, lh, { dryRun: dry });
      textStyle(NORMAL);
    }
    yy = ny + 8;
  }
  return yy;
}

function drawFree(top, st) {
  const y0 = K.statusLine(st.scoreLabel, FP.msg.EXPLORE + ' (not scored)',
    ['Formulas from the chapter section "Air Velocity"', 'Arrow keys move a focused slider']) + 4;
  const s = freeState();
  const duct = freeDuct();
  const upperH = canvasWidth < 600 ? 190 : 230;
  const lw = leftPanelWidth();
  K.panel(10, y0, lw, upperH);
  FD.ductSection(null, { x: 10, y: y0, w: lw, h: upperH, shape: duct.shape,
    wIn: duct.w, hIn: duct.h, dIn: duct.d, maxIn: 60, flowLabel: FP.fmt.cfm(s.Q) });

  // Right: key numbers and a velocity bar
  const rx = lw + 22, rw = canvasWidth - rx - 12;
  const vR = nearest10(s.V);
  const shapeTxt = s.shape === 'round' ? 'Round, ' + duct.d + ' in diameter'
    : 'Rectangular, ' + duct.w + ' in × ' + duct.h + ' in';
  const upper = (ts, dry) => {
    const lh = Math.round(ts * 1.3);
    let y = y0 + 6;
    noStroke(); textAlign(LEFT, TOP); textSize(ts); textStyle(NORMAL); fill(FP.tok('text'));
    y = K.wrapText('Duct: ' + shapeTxt, rx, y, rw, lh, { dryRun: dry });
    y = K.wrapText('Airflow Q: ' + FP.fmt.cfm(s.Q), rx, y, rw, lh, { dryRun: dry });
    y = K.wrapText('Flow area A: ' + FP.fmt.ft2(s.A, 3), rx, y, rw, lh, { dryRun: dry });
    textStyle(BOLD);
    y = K.wrapText('Velocity V: ' + FP.fmt.fpm(vR), rx, y, rw, lh, { dryRun: dry });
    textStyle(NORMAL);
    return y + 8 + 14 + 22 - y0;    // + velocity bar and its tick labels
  };
  const uts = K.fitTextSize(ts => upper(ts, true), upperH - 8, 16, 12);
  let y = y0 + upper(uts, false) - 36;

  // Velocity bar, linear 0-6,000 ft/min
  const vmax = 6000, bw = rw - 30, bh = 14, bx = rx + 8;
  stroke(FP.tok('border')); fill(255);
  rect(bx, y, bw, bh);
  noStroke(); fill(FP.tok('primary'));
  rect(bx, y, bw * Math.min(s.V, vmax) / vmax, bh);
  textSize(13); textAlign(CENTER, TOP); fill(FP.tok('text-muted'));
  const step = bw > 300 ? 1000 : (bw > 150 ? 2000 : 3000);
  for (let v = 0; v <= vmax; v += step) {
    const x = bx + bw * v / vmax;
    stroke(FP.tok('text-muted')); line(x, y + bh, x, y + bh + 4); noStroke();
    text(FP.fmt.num(v), x, y + bh + 5);
  }
  if (s.V > vmax) {
    textAlign(RIGHT, BOTTOM);
    fill(FP.tok('accent-text'));
    text('off scale ▶', bx + bw, y - 1);
  }

  // Lower area: substituted equations, the note, results and mastery
  const ly = y0 + upperH + 10;
  const lh = noteTop() - ly;
  K.panel(10, ly, canvasWidth - 20, lh);
  const ts = K.fitTextSize(t => drawFreeLower(s, duct, vR, ly, t, true) - ly, lh - 6, 16, 12);
  drawFreeLower(s, duct, vR, ly, ts, false);
}

function drawFreeLower(s, duct, vR, ly, ts, dry) {
  const lh = Math.round(ts * 1.27);
  const tx = 22, tw = canvasWidth - 44;
  let yy = ly + 10;
  textAlign(LEFT, TOP); textSize(ts); noStroke();
  fill(FP.tok('text'));
  textStyle(BOLD);
  yy = K.wrapText('Q = V × A with the current numbers', tx, yy, tw, lh, { dryRun: dry }) + 4;
  textStyle(NORMAL);
  const areaEq = s.shape === 'round'
    ? 'A = π × ' + duct.d + '² ÷ 576 = ' + FP.fmt.ft2(s.A, 3)
    : 'A = (' + duct.w + ' × ' + duct.h + ') ÷ 144 = ' + FP.fmt.ft2(s.A, 3);
  yy = K.wrapText('Flow area: ' + areaEq, tx, yy, tw, lh, { dryRun: dry }) + 2;
  yy = K.wrapText('Velocity: V = Q ÷ A = ' + FP.fmt.num(s.Q) + ' ÷ ' + FP.fmt.num(s.A, 3) + ' = ' +
    FP.fmt.fpm(vR), tx, yy, tw, lh, { dryRun: dry }) + 8;
  if (noteText) {
    if (!dry) {
      const h = K.countLines('ℹ ' + noteText, tw - 12) * lh + 8;
      K.panel(tx - 4, yy - 3, tw + 8, h, { fill: '--fp-primary-bg', stroke: '--fp-primary', radius: 6 });
    }
    noStroke(); fill(FP.tok('text'));
    yy = K.wrapText('ℹ ' + noteText, tx + 4, yy, tw - 12, lh, { dryRun: dry }) + 10;
  } else {
    fill(FP.tok('text-muted'));
    yy = K.wrapText('Try it: keep the airflow fixed and make the duct bigger. What happens to the CFM, and to the velocity?',
      tx, yy, tw, lh, { dryRun: dry }) + 8;
  }
  fill(FP.tok('text'));
  const res = runner.state().results.map((r, i) => (i + 1) + ': ' +
    (r === 'correct' ? 'correct ' + FP.msg.OK : 'missed ' + FP.msg.BAD)).join(' · ');
  yy = K.wrapText('Challenge results: ' + res, tx, yy, tw, lh, { dryRun: dry }) + 4;
  textStyle(BOLD);
  fill(FP.tok(mastered() ? 'correct' : 'text'));
  yy = K.wrapText((mastered() ? FP.msg.OK + ' ' : '') + masteryLine(), tx, yy, tw, lh, { dryRun: dry });
  textStyle(NORMAL);
  return yy;
}

// Vertical centre of the kit-styled controls (about 29 px tall) in row n.
function rowMid(n) { return K.controlRow(n) + 15; }

function drawControlLabels(st) {
  noStroke();
  fill(FP.tok('text'));
  textSize(16);
  textAlign(LEFT, CENTER);
  if (!st.explore) {
    textStyle(BOLD);
    text('Your answer:', 10, rowMid(0));
    textStyle(NORMAL);
    text(st.item.unit, 115 + answerInput.elt.offsetWidth + 8, rowMid(0));
    textSize(14);
    fill(FP.tok('text-muted'));
    if (st.phase === 'question' && !checkRowNarrow()) text('Two attempts per challenge.', 10, K.controlLabel(1));
    text('Within ±2% of the model value is correct.', 10, K.controlLabel(2));
    text(st.exploreLabel, 10, K.controlLabel(3));
  } else {
    textStyle(BOLD);
    text('Duct shape:', 10, rowMid(0));
    textStyle(NORMAL);
    text('Airflow Q: ' + FP.fmt.cfm(flowSlider.value()), 10, K.controlLabel(1));
    if (shapeSelect.value() === 'round') {
      text('Diameter: ' + diameterSlider.value() + ' in', 10, K.controlLabel(2));
    } else {
      text('Width: ' + widthSlider.value() + ' in', 10, K.controlLabel(2));
      text('Height: ' + heightSlider.value() + ' in', 10, K.controlLabel(3));
    }
  }
}

// ---------- Responsive ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
