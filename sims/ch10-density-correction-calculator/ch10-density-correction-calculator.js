// Density Correction Calculator - p5.js MicroSim (Chapter 10: Fan Performance, Curves and Ratings)
// CANVAS_HEIGHT: 640
// Three challenge jobs: the learner types the combined density correction factor (and, for job 3,
// the standard-air pressure for catalog selection) before the model values are shown. Explore mode
// then unlocks temperature, elevation, actual static pressure and catalog BHP sliders.
// Built on the FanPedia kit: FP.ChallengeRunner (answer flow, attempts, spec wording via
// `messages`), FP.Score (challenge-level score: job 3 has two answers), FP.models (temperature,
// altitude and density factors, catalog conversions), FP.p5 (layout, text, controls, keys).
//   Kt = 530 / (T + 460)   Ka = (1 - 6.875e-6 h)^5.2559   Kd = Kt x Ka
//   Standard-air pressure = actual pressure / Kd    Actual BHP = catalog BHP x Kd
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js, fan-models.js
// (load them before this file, also in the p5.js editor).

const K = FP.p5;
const M = FP.models;
const SIM_ID = 'ch10-density-correction-calculator';
const ALT = { coef: 6.875e-6 };        // the coefficient Chapter 10 prints
const DATA_NOTE = FP.msg.note(FP.msg.ILLUSTRATIVE, 'standard air 0.075 lb/ft³ at 70°F, sea level');

// ---------- Canvas layout ----------
let canvasWidth = 800;
const drawHeight = 420;
const controlHeight = K.controlHeightFor(6);   // answer row, Start over row, 4 slider rows
const canvasHeight = drawHeight + controlHeight;
const defaultTextSize = 16;

// ---------- Model (FP.models), rounded as the spec's Rules say ----------
const R = M.round;
function factors(t, h) {
  const kt = M.temperatureFactor(t), ka = M.altitudeFactor(h, ALT);
  return { kt, ka, kd: kt * ka };
}

// ---------- Challenge jobs (fixed order) ----------
// Job 3 has two answers (factor, then pressure); the runner sees four answer items and the
// challenge-level score below counts job 3 as one challenge, correct only when both parts are.
const JOBS = [
  { t: 200, h: 0, label: '200°F air at sea level (0 ft)' },
  { t: 70, h: 5000, label: '70°F air at 5,000 ft' },
  { t: 200, h: 5000, sp: 3.0, cfm: 10000,
    label: '200°F air at 5,000 ft, 3.0 in. wg actual static pressure, 10,000 CFM' }
];
const PROMPT_1 = 'This fan handles 200°F air at sea level. By what factor do its pressure and ' +
  'horsepower change from the catalog?';
const FACTOR_Q = 'What is the combined density correction factor Kd?';

const near = (v, x) => Math.abs(v - x) <= 0.01;   // the factor tolerance

const ITEM_DATA = [
  { id: 'job1-factor', job: 0, kind: 'factor', prompt: PROMPT_1,
    model: R(factors(200, 0).kd, 3),
    wrong: 'Use absolute temperatures: 530 ÷ (200 + 460) = 0.803. Sea level has an altitude factor of 1.000.',
    hint: 'Use absolute temperatures: Kt = 530 ÷ (T + 460). Sea level has an altitude factor of 1.000.',
    slip: v => (Math.abs(v - 0.35) <= 0.02 ? ' Add 460 to each temperature first.' : ''),
    hintSlip: v => (near(v, 660 / 530) ? ' Hot air is lighter than standard air, so the factor is below 1: put 530 on top.' : '') },
  { id: 'job2-factor', job: 1, kind: 'factor', prompt: 'This fan handles 70°F air at a site 5,000 ft above sea level. ' + FACTOR_Q,
    model: R(factors(70, 5000).kd, 3),
    wrong: 'At 70°F the temperature factor is 1.000; the altitude factor at 5,000 ft is 0.832.',
    hint: 'At 70°F the temperature factor is 1.000, so Kd is the altitude factor: Ka = (1 − 6.875 × 10⁻⁶ × h)^5.2559, with h in feet.',
    hintSlip: v => (near(v, 1 - ALT.coef * 5000) ? ' Raise (1 − 6.875 × 10⁻⁶ × h) to the 5.2559 power.'
      : near(v, 1 / factors(70, 5000).ka) ? ' Thinner air at altitude is lighter, so the factor is below 1.' : '') },
  { id: 'job3-factor', job: 2, kind: 'factor', part: 1,
    prompt: 'A dryer exhaust fan handles 200°F air at 5,000 ft: 10,000 CFM against 3.0 in. wg actual static pressure. ' +
      'Part 1 of 2: ' + FACTOR_Q,
    model: R(factors(200, 5000).kd, 3),
    wrong: 'Multiply the two factors: 0.803 × 0.832 = 0.668.',
    hint: 'Kd = Kt × Ka: multiply the temperature factor for 200°F by the altitude factor for 5,000 ft.',
    hintSlip: v => (near(v, factors(200, 0).kt) || near(v, factors(70, 5000).ka) ? ' That is only one of the two factors.'
      : near(v, factors(200, 0).kt + factors(70, 5000).ka) ? ' Multiply the factors; do not add them.' : '') },
  { id: 'job3-pressure', job: 2, kind: 'pressure', part: 2,
    prompt: 'Part 2 of 2: What standard-air static pressure do you look up in the catalog (in. wg)?',
    model: R(M.catalogFromActual(3.0, factors(200, 5000).kd), 2),
    wrong: 'Divide the actual pressure by the factor: 3.0 ÷ 0.668 = 4.49 in. wg. The CFM does not change.',
    hint: 'Standard-air pressure = actual pressure ÷ Kd, using the Kd from part 1. The CFM does not change.',
    slip: v => (Math.abs(v - 2.00) <= 0.05 ? ' That multiplies by the factor; to enter a standard-air catalog, divide by it.' : '') }
];

function answerText(item) {
  return item.kind === 'factor' ? FP.fmt.num(item.model, 3) : FP.fmt.inwg(item.model, 2);
}
const ITEMS = ITEM_DATA.map(d => Object.assign({}, d, {
  unit: d.kind === 'factor' ? '' : 'in. wg',
  decimals: d.kind === 'factor' ? 3 : 2,
  tolerance: d.kind === 'factor' ? { abs: 0.01 } : { abs: 0.05 },
  answerText: answerText(d),
  why: d.wrong,
  label: d.kind === 'pressure' ? 'challenge 3' : undefined
}));
const extra = (item, v) => (item.slip ? item.slip(v) : '');
// First wrong attempt: the rule plus any slip note, never the model value or the finished sum.
const retryHint = (item, v) => item.hint + extra(item, v) + (item.hintSlip ? item.hintSlip(v) : '');

const runner = new FP.ChallengeRunner({
  items: ITEMS,
  attempts: 2,
  noun: 'Answers',
  mastery: ITEMS.length,
  messages: {
    correct: res => FP.msg.correct(res.item.answerText),
    retry: res => FP.msg.tryAgain(retryHint(res.item, res.value), res.attemptsLeft),
    missed: res => FP.msg.missed(res.item.answerText, res.item.wrong + extra(res.item, res.value))
  },
  id: SIM_ID
});

// Challenge-level score: "Challenges correct: n of 3"; mastery 3 of 3 fully correct on the first attempt.
const score = new FP.Score({ total: JOBS.length, mastery: JOBS.length, noun: 'Challenges' });
const REVIEW = 'Press Start over to try the three jobs again';
let partResults = [];          // per answer item: {correct, attempts}

// ---------- State ----------
let feedback = null;           // {kind: 'ok'|'bad'|'info', message}
let answerLine = '';           // "Your answer ... · Model ..." after an answer resolves

// ---------- Controls ----------
let answerInput, checkButton, nextButton, startOverButton;
let tSlider, hSlider, spSlider, bhpSlider;

const keys = K.keys.bind({ Enter: onEnter });
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textSize(defaultTextSize);
  const main = document.querySelector('main');

  answerInput = createInput('');
  answerInput.parent(main);
  answerInput.attribute('inputmode', 'decimal');
  answerInput.attribute('aria-label', 'Your answer');

  checkButton = K.button(FP.msg.CHECK, checkAnswer);
  nextButton = K.button('Next', nextItem);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  tSlider = createSlider(0, 800, 70, 10);
  tSlider.parent(main);
  tSlider.attribute('aria-label', 'Air temperature at fan inlet in degrees Fahrenheit');
  hSlider = createSlider(0, 10000, 0, 500);
  hSlider.parent(main);
  hSlider.attribute('aria-label', 'Site elevation in feet');
  spSlider = createSlider(0.5, 15.0, 3.0, 0.1);
  spSlider.parent(main);
  spSlider.attribute('aria-label', 'Actual static pressure in inches water gauge');
  bhpSlider = createSlider(1.0, 200.0, 11.0, 0.5);
  bhpSlider.parent(main);
  bhpSlider.attribute('aria-label', 'Catalog BHP at the standard-air point');

  syncControls();

  describe('Density correction calculator. Three challenge jobs give an air temperature and a site ' +
    'elevation; the learner types the combined density correction factor and, for the third job, the ' +
    'standard-air static pressure used to select from the catalog. After each answer the sim shows the ' +
    'temperature, altitude and combined factors and the one-line calculation. After the challenges, ' +
    'Explore mode unlocks sliders for temperature, elevation, actual static pressure and catalog BHP, ' +
    'with live factor, catalog pressure and actual BHP readouts.');
}

// ---------- Control state and layout ----------
function exploring() { return runner.state().explore; }
function sliders() { return [tSlider, hSlider, spSlider, bhpSlider]; }

function nextLabel(st) {
  const short = canvasWidth < 400;   // keep the button on one line beside the answer box
  if (st.isLast) { return short ? 'Explore' : 'Start exploring'; }
  if (ITEMS[st.index].part === 1) { return short ? 'Part 2' : 'Next: part 2'; }
  return short ? 'Next' : 'Next challenge';
}

function syncControls() {
  const st = runner.state();
  const asking = st.phase === 'question';
  if (st.explore) {
    answerInput.hide(); checkButton.hide(); nextButton.hide();
  } else {
    answerInput.show();
    K.setEnabled(answerInput, asking);
    if (asking) { checkButton.show(); nextButton.hide(); } else { checkButton.hide(); nextButton.show(); }
    nextButton.html(nextLabel(st));
  }
  for (const s of sliders()) { K.setEnabled(s, st.explore); }
  positionControls();
}

function narrowControls() { return canvasWidth < 480; }
function sliderLeft() { return narrowControls() ? 168 : 300; }
function inputX() { return narrowControls() ? 102 : 120; }

function positionControls() {
  const narrow = narrowControls();
  answerInput.size(narrow ? 76 : 110);
  answerInput.position(inputX(), K.controlRow(0));
  const st = runner.state();
  const unitRoom = !st.explore && st.item.unit ? 56 : 8;            // room for "in. wg"
  const bx = inputX() + (answerInput.elt.offsetWidth || 110) + unitRoom;
  checkButton.position(bx, K.controlRow(0));
  nextButton.position(bx, K.controlRow(0));
  startOverButton.position(10, K.controlRow(1));
  const sw = K.sliderWidth(canvasWidth, sliderLeft(), 15);
  sliders().forEach((s, i) => {
    s.position(sliderLeft(), K.controlRow(2 + i));
    s.size(sw);
  });
}

// ---------- Challenge flow (FP.ChallengeRunner + challenge-level FP.Score) ----------
function onEnter() {
  const st = runner.state();
  if (st.phase === 'question') { checkAnswer(); } else if (st.phase === 'resolved') { nextItem(); }
}

function checkAnswer() {
  const res = runner.submit(answerInput.value());
  if (res.status === 'ignored') { return; }
  feedback = { kind: res.kind, message: res.message };
  FP.announce(res.message);
  if (res.status === 'correct' || res.status === 'missed') {
    const item = res.item;
    partResults[res.index] = { correct: res.status === 'correct', attempts: res.attempt };
    recordChallenge(item.job);
    const raw = String(answerInput.value()).replace(/,/g, '').trim();
    const typedDecimals = Math.min(4, (raw.split('.')[1] || '').length);
    answerLine = 'Your answer: ' + FP.fmt.num(res.value, typedDecimals) + (item.unit ? ' ' + item.unit : '') +
      '  ·  Model: ' + item.answerText;
    syncControls();
    nextButton.elt.focus();
  }
}

// A job counts once all of its answers are resolved: correct when every part is correct, on the
// first attempt when every part was.
function recordChallenge(job) {
  const idx = ITEMS.map((it, i) => (it.job === job ? i : -1)).filter(i => i >= 0);
  if (!idx.every(i => partResults[i])) { return; }
  const correct = idx.every(i => partResults[i].correct);
  const attempts = Math.max(...idx.map(i => partResults[i].attempts));
  score.record(job, correct, attempts);
}

function nextItem() {
  if (!runner.next()) { return; }
  feedback = null;
  answerLine = '';
  const st = runner.state();
  if (st.explore) {
    syncControls();
    FP.announce(score.summaryLines(REVIEW).join(' ') + ' ' + FP.msg.EXPLORE + ': the four sliders are unlocked.');
    tSlider.elt.focus();
  } else {
    answerInput.value('');
    syncControls();
    FP.announce('Challenge ' + (st.item.job + 1) + ' of ' + JOBS.length + ': ' + st.item.prompt);
    answerInput.elt.focus();
  }
}

function startOver() {
  runner.restart();
  score.reset();
  partResults = [];
  feedback = null;
  answerLine = '';
  tSlider.value(70); hSlider.value(0); spSlider.value(3.0); bhpSlider.value(11.0);
  answerInput.value('');
  syncControls();
  FP.announce('Started over. Challenge 1 of ' + JOBS.length + ': ' + ITEMS[0].prompt);
  answerInput.elt.focus();
}

// One-line calculation shown once an answer resolves.
function calcLine(item) {
  const j = JOBS[item.job], f = factors(j.t, j.h);
  const kt = FP.fmt.num(f.kt, 3), ka = FP.fmt.num(f.ka, 3), kd = FP.fmt.num(R(f.kd, 3), 3);
  if (item.id === 'job1-factor') { return 'Kt = 530 ÷ (200 + 460) = ' + kt + '; Ka = ' + ka + ' at sea level; Kd = ' + kd; }
  if (item.id === 'job2-factor') { return 'Kt = 530 ÷ (70 + 460) = ' + kt + '; Ka at 5,000 ft = ' + ka + '; Kd = ' + kd; }
  if (item.kind === 'factor') { return 'Kd = Kt × Ka = ' + kt + ' × ' + ka + ' = ' + kd; }
  return 'Standard-air pressure = ' + FP.fmt.num(j.sp, 1) + ' ÷ ' + kd + ' = ' + FP.fmt.inwg(item.model) +
    '; the airflow stays ' + FP.fmt.cfm(j.cfm) + '.';
}

// ---------- What the right panel shows ----------
function currentJob() {
  const st = runner.state();
  if (st.explore) {
    const t = tSlider.value(), h = hSlider.value(), sp = spSlider.value(), bhp = bhpSlider.value();
    return { t, h, sp, bhp, cfm: null, f: factors(t, h), showF: true, showP: true, explore: true };
  }
  const it = st.item, j = JOBS[it.job];
  const resolved = st.phase === 'resolved';
  return { t: j.t, h: j.h, sp: j.sp, cfm: j.cfm, f: factors(j.t, j.h),
    showF: resolved || it.kind === 'pressure', showP: resolved && it.kind === 'pressure', explore: false };
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  const wide = canvasWidth >= 640;
  let left, right;
  if (wide) {
    const rightW = max(290, floor(canvasWidth * 0.42));
    left = { x: 10, y: 44, w: canvasWidth - rightW - 30, h: drawHeight - 44 - 26 };
    right = { x: canvasWidth - rightW - 10, y: 44, w: rightW, h: drawHeight - 44 - 26 };
  } else {
    left = { x: 8, y: 40, w: canvasWidth - 16, h: 230 };
    right = { x: 8, y: 40 + 230 + 5, w: canvasWidth - 16, h: drawHeight - (40 + 230 + 5) - 24 };
  }
  K.title('Density Correction Calculator');
  drawChallengeBox(left, wide);
  drawJobPanel(right, currentJob(), wide);
  K.note(canvasWidth < 420 ? FP.msg.ILLUSTRATIVE : DATA_NOTE);
  drawControlLabels();
}

function drawChallengeBox(b, wide) {
  K.panel(b.x, b.y, b.w, b.h);
  const fs = wide ? 15 : 14;
  const tx = b.x + 10, tw = b.w - 20;
  const scoreY = b.y + b.h - 8;
  const avail = scoreY - fs - 6 - (b.y + 8);
  const content = (ts, dry) => boxContent(tx, b.y + 8, tw, ts, wide, dry) - (b.y + 8);
  const ts = K.fitTextSize(t => content(t, true), avail, fs, 12);
  boxContent(tx, b.y + 8, tw, ts, wide, false, avail);

  noStroke();
  fill(FP.tok('text'));
  textStyle(BOLD);
  textSize(fs);
  textAlign(LEFT, BOTTOM);
  text(score.label(), tx, scoreY);
  textStyle(NORMAL);
}

// Draws (or, with dry, measures) the challenge or Explore text; returns the y below it.
function boxContent(x, y, w, ts, wide, dry, maxH) {
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

  if (!st.explore) {
    const it = st.item;
    para('Challenge ' + (it.job + 1) + ' of ' + JOBS.length + (it.part ? ', part ' + it.part + ' of 2' : '') +
      (st.phase === 'question' ? '  ·  ' + st.attemptLabel : ''), FP.tok('text'), { bold: true });
    para(it.prompt, FP.tok('text'));
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
    if (answerLine) {
      para(answerLine, FP.tok('text'), { bold: true });
      para(calcLine(it), FP.tok('text'));
    }
  } else {
    para(FP.msg.EXPLORE + ' (not scored)', FP.tok('text'), { bold: true });
    const lines = score.summaryLines(REVIEW);
    para(lines[0], FP.tok('text'), { bold: true });
    para(lines[1], score.mastered() ? FP.tok('primary') : FP.tok('text'), { bold: score.mastered() });
    para('Airflow volume is the same at any density for a fan at fixed speed.', FP.tok('primary'), { bold: true });
    para('Try it: set 800°F at sea level. The combined factor is 0.421, so the catalog pressure is more ' +
      'than twice the job pressure.', FP.tok('text-muted'));
  }
  return y - gap;
}

// Right panel: the job, the factor chain Kt × Ka = Kd, and the two conversion directions.
function drawJobPanel(b, j, wide) {
  K.panel(b.x, b.y, b.w, b.h);
  const ink = FP.tok('text');
  const fs = wide ? 14 : 13;
  const x0 = b.x + 10, x1 = b.x + b.w - 10;
  let y = b.y + 8;
  noStroke();
  textSize(fs);
  fill(ink);
  if (wide) {   // narrow: the prompt already names the job
    textStyle(BOLD);
    textAlign(LEFT, TOP);
    text(j.explore ? 'Explore job' : 'Challenge job (illustrative)', x0, y);
    textStyle(NORMAL);
    y += fs + 7;
  }

  const rows = [['Air temperature at fan inlet', FP.fmt.degF(j.t)], ['Site elevation', FP.fmt.num(j.h) + ' ft']];
  if (j.sp != null) { rows.push(['Actual static pressure', FP.fmt.inwg(j.sp, 1)]); }
  if (j.explore) { rows.push(['Catalog BHP (standard air)', FP.fmt.num(j.bhp, 1) + ' BHP']); }
  else if (j.cfm) { rows.push(['Airflow volume', FP.fmt.cfm(j.cfm)]); }
  const rowH = wide ? 20 : 17;
  if (wide) {
    for (const r of rows) {
      fill(ink);
      textAlign(LEFT, TOP);
      text(r[0], x0, y);
      textAlign(RIGHT, TOP);
      text(r[1], x1, y);
      y += rowH;
    }
    y += 6;
  }

  // Factor chain: three boxes
  const gapW = wide ? 22 : 18;
  const boxW = (x1 - x0 - 2 * gapW) / 3, boxH = wide ? 50 : 42;
  const vals = [
    ['Kt', j.f.kt, 'temperature'], ['Ka', j.f.ka, 'altitude'], ['Kd', j.f.kd, 'combined']
  ];
  vals.forEach((v, i) => {
    const bx = x0 + i * (boxW + gapW);
    stroke(i === 2 ? FP.tok('primary') : FP.tok('border'));
    strokeWeight(i === 2 ? 2 : 1);
    fill(i === 2 ? FP.tok('primary-bg') : 255);
    rect(bx, y, boxW, boxH, 6);
    strokeWeight(1);
    noStroke();
    fill(ink);
    textAlign(CENTER, TOP);
    textSize(wide ? 13 : 12);
    text(v[0], bx + boxW / 2, y + 5);
    textSize(wide ? 18 : 15);
    textStyle(BOLD);
    fill(j.showF ? ink : FP.tok('text-muted'));
    text(j.showF ? FP.fmt.num(v[1], 3) : '?', bx + boxW / 2, y + (wide ? 23 : 21));
    textStyle(NORMAL);
    fill(FP.tok('text-muted'));
    textSize(12);
    text(v[2], bx + boxW / 2, y + boxH + 2);
    if (i < 2) {
      fill(ink);
      textSize(wide ? 18 : 15);
      textAlign(CENTER, CENTER);
      text(i === 0 ? '×' : '=', bx + boxW + gapW / 2, y + boxH / 2);
    }
  });
  y += boxH + (wide ? 22 : 17);

  // Conversion directions
  textSize(fs);
  textAlign(LEFT, TOP);
  const lineH = wide ? 20 : 17;
  const kd = R(j.f.kd, 3);
  if (!wide) {   // narrow: one line per conversion
    const lines = [];
    if (j.sp != null) {
      lines.push('Catalog SP = ' + FP.fmt.num(j.sp, 1) + ' ÷ Kd = ' +
        (j.showP ? FP.fmt.inwg(M.catalogFromActual(j.sp, j.f.kd)) : '?'));
    } else {
      lines.push('Into the catalog: pressure ÷ Kd');
    }
    lines.push(j.explore ? 'Actual BHP = ' + FP.fmt.num(j.bhp, 1) + ' × Kd = ' +
      FP.fmt.num(M.actualFromCatalog(j.bhp, j.f.kd), 2) : 'Out of the catalog: BHP × Kd');
    for (const l of lines) {
      if (y + lineH > b.y + b.h - 2) { break; }
      fill(ink);
      text(l, x0, y);
      y += lineH;
    }
    return;
  }
  const dirs = [];
  if (j.sp != null) {
    dirs.push(['Into the catalog: pressure ÷ Kd', FP.fmt.num(j.sp, 1) + ' ÷ ' + (j.showF ? FP.fmt.num(kd, 3) : '?') +
      ' = ' + (j.showP ? FP.fmt.inwg(M.catalogFromActual(j.sp, j.f.kd)) : '?') + ' at standard air']);
  } else {
    dirs.push(['Into the catalog: pressure ÷ Kd', 'catalog pressure is larger when Kd < 1']);
  }
  if (j.explore) {
    dirs.push(['Out of the catalog: BHP × Kd', FP.fmt.num(j.bhp, 1) + ' × ' + FP.fmt.num(kd, 3) + ' = ' +
      FP.fmt.num(M.actualFromCatalog(j.bhp, j.f.kd), 2) + ' BHP actual']);
  } else {
    dirs.push(['Out of the catalog: BHP × Kd', 'actual BHP is smaller when Kd < 1']);
  }
  for (const d of dirs) {
    if (y + 2 * lineH > b.y + b.h - 4) { break; }
    fill(FP.tok('primary-dark'));
    textStyle(BOLD);
    text(d[0], x0, y);
    textStyle(NORMAL);
    y += lineH;
    fill(ink);
    text(d[1], x0 + 10, y, x1 - x0 - 10);
    y += lineH + (wide ? 4 : 0);
  }
  if (wide && !j.explore && y + lineH <= b.y + b.h - 4) {
    fill(FP.tok('text-muted'));
    text(j.cfm ? 'Airflow: ' + FP.fmt.cfm(j.cfm) + ' at any density (fixed speed).' :
      'Airflow (CFM) is unchanged by density at fixed speed.', x0, y, x1 - x0);
  }
}

function drawControlLabels() {
  const st = runner.state();
  const narrow = narrowControls();
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(narrow ? 14 : defaultTextSize);
  fill(FP.tok('text'));
  const rowMid0 = K.controlRow(0) + (answerInput.elt.offsetHeight || 28) / 2;
  if (!st.explore) {
    text('Your answer:', 10, rowMid0);
    if (st.item.unit) { text(st.item.unit, inputX() + (answerInput.elt.offsetWidth || 110) + 6, rowMid0); }
  }

  const sx = 10 + (startOverButton.elt.offsetWidth || 90) + 12;
  const options = st.explore ? [FP.msg.EXPLORE + ': sliders unlocked', FP.msg.EXPLORE]
    : [st.exploreLabel, 'Sliders unlock after challenge ' + JOBS.length + '.', 'Sliders locked.'];
  fill(FP.tok('text-muted'));
  textSize(narrow ? 13 : 15);
  const maxW = canvasWidth - sx - 10;
  const rowMid1 = K.controlRow(1) + (startOverButton.elt.offsetHeight || 28) / 2;
  const t = options.find(o => textWidth(o) <= maxW);
  if (t) { text(t, sx, rowMid1); }

  textSize(narrow ? 14 : defaultTextSize);
  fill(st.explore ? FP.tok('text') : FP.tok('text-muted'));
  text((narrow ? 'Temp.: ' : 'Air temperature at fan inlet: ') + FP.fmt.degF(tSlider.value()), 10, K.controlLabel(2));
  text((narrow ? 'Elevation: ' : 'Site elevation: ') + FP.fmt.num(hSlider.value()) + ' ft', 10, K.controlLabel(3));
  text((narrow ? 'Actual SP: ' : 'Actual static pressure: ') + FP.fmt.num(spSlider.value(), 1) + ' in. wg', 10, K.controlLabel(4));
  text((narrow ? 'Catalog BHP: ' : 'Catalog BHP (standard air): ') + FP.fmt.num(bhpSlider.value(), 1), 10, K.controlLabel(5));
}

// ---------- Responsive sizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  syncControls();   // also positions the controls and picks the button labels for the width
}

function updateCanvasSize() {
  canvasWidth = K.updateCanvasSize(320);
}
