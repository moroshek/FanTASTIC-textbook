// Belt Drive Speed Calculator - p5.js MicroSim (Chapter 11: Drives and Standard Fan Arrangements)
// CANVAS_HEIGHT: 740
// Four V-belt drive challenges: the learner types the fan speed (rpm) and the number of belts,
// judged separately (fan rpm within ±5 rpm, belt count exact), two attempts each. After
// challenge 4, Explore mode unlocks six sliders and every output updates at once.
// Built on the FanPedia kit: FP.ChallengeRunner (challenge flow, wording, score, mastery),
// FP.models.beltDrive (fan rpm, belt speed, design hp, belts), FD.sheavePair (sheaves to scale,
// each turning at its own speed), FP.p5 (layout, text, controls, keys).
// Rules (chapter 11): fan rpm = motor rpm × motor sheave ÷ fan sheave;
//   belt speed (ft/min) = π × motor sheave (in) × motor rpm ÷ 12;
//   design hp = motor hp × drive service factor; belts = ceiling(design hp ÷ hp per belt),
//   a whole-number quotient is not rounded up.
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js, fan-models.js,
// fan-drawings.js (load them before this file, also in the p5.js editor).

const K = FP.p5;
const SIM_ID = 'ch11-belt-drive-speed-calculator';

// ---------- Canvas layout ----------
let canvasWidth = 800;
const drawHeight = 450;
const controlHeight = K.controlHeightFor(8);   // answers, Start over, six sliders
const canvasHeight = drawHeight + controlHeight;
const WIDE_MIN = 620;

const PROMPT = 'How fast will the fan turn, and how many belts does this drive need?';
const DATA_NOTE = 'Motor speeds, per-belt ratings and service factors are illustrative. ' +
  'Use the current drive manufacturer\'s tables for real selections.';
const HIGH_BELT_SPEED = 6500;   // ft/min
const RPM_TOL = 5;              // ± rpm

// ---------- Explore quantities (spec table) ----------
const QUANTITIES = [
  { key: 'motorRpm', label: 'Motor speed', short: 'Motor', min: 860, max: 3540, step: 10, def: 1760, d: 0, unit: 'rpm' },
  { key: 'motorSheaveIn', label: 'Motor sheave', short: 'Motor sheave', min: 3.0, max: 12.0, step: 0.2, def: 5.0, d: 1, unit: 'in' },
  { key: 'fanSheaveIn', label: 'Fan sheave', short: 'Fan sheave', min: 3.0, max: 24.0, step: 0.2, def: 8.0, d: 1, unit: 'in' },
  { key: 'motorHp', label: 'Motor power', short: 'Motor', min: 1, max: 100, step: 0.5, def: 15, d: -1, unit: 'hp' },
  { key: 'driveSF', label: 'Drive service factor', short: 'Drive SF', min: 1.0, max: 1.8, step: 0.1, def: 1.3, d: 1, unit: '' },
  { key: 'hpPerBelt', label: 'Rating per belt', short: 'Per belt', min: 1.0, max: 20.0, step: 0.5, def: 6.0, d: 1, unit: 'hp' }
];
// d = -1: show up to one decimal (15 hp, 7.5 hp)
function fmtQ(q, v) {
  const s = q.d < 0 ? FP.fmt.numUpTo(v, 1) : FP.fmt.num(v, q.d);
  return q.unit ? s + ' ' + q.unit : s;
}

// ---------- Challenges (fixed order; spec "Feedback when wrong" text) ----------
const CHALLENGE_DATA = [
  { motorRpm: 1760, motorSheaveIn: 5.0, fanSheaveIn: 8.0, motorHp: 15, driveSF: 1.3, hpPerBelt: 6.0,
    wrong: 'Fan rpm = 1,760 × 5.0 / 8.0 = 1,100. Design hp = 15 × 1.3 = 19.5; 19.5 / 6.0 = 3.25 belts, rounded up to 4.' },
  { motorRpm: 1760, motorSheaveIn: 6.0, fanSheaveIn: 8.4, motorHp: 10, driveSF: 1.2, hpPerBelt: 5.0,
    wrong: 'Fan rpm = 1,760 × 6.0 / 8.4 = 1,257. Design hp = 10 × 1.2 = 12.0; 12.0 / 5.0 = 2.4, rounded up to 3.' },
  { motorRpm: 1170, motorSheaveIn: 9.0, fanSheaveIn: 6.0, motorHp: 20, driveSF: 1.4, hpPerBelt: 8.5,
    wrong: 'The motor sheave is larger, so the fan runs faster than the motor: 1,170 × 9.0 / 6.0 = 1,755. ' +
      'Design hp = 20 × 1.4 = 28.0; 28.0 / 8.5 = 3.29, rounded up to 4.' },
  { motorRpm: 3500, motorSheaveIn: 4.0, fanSheaveIn: 10.0, motorHp: 7.5, driveSF: 1.2, hpPerBelt: 4.5,
    wrong: 'Fan rpm = 3,500 × 4.0 / 10.0 = 1,400. Design hp = 7.5 × 1.2 = 9.0; 9.0 / 4.5 = 2.0 exactly, so 2 belts.' }
];

function rpmOk(v, item) { return Math.abs(v - item.drive.fanRpm) <= RPM_TOL + 1e-9; }
function beltsOk(v, item) { return v === item.drive.belts; }

// Spec feedback: names the wrong field, gives the challenge's worked calculation, and adds the
// inverted-ratio and rounded-down notes when they apply.
function explain(v, item) {
  const r = rpmOk(v.rpm, item), b = beltsOk(v.belts, item);
  const parts = [];
  if (r && !b) parts.push('Your fan speed is right; the belt count is not.');
  else if (!r && b) parts.push('Your belt count is right; the fan speed is not.');
  else parts.push('Both the fan speed and the belt count are off.');
  parts.push(item.wrong);
  const inverted = item.motorRpm * item.fanSheaveIn / item.motorSheaveIn;
  if (!r && Math.abs(v.rpm - inverted) <= RPM_TOL + 1e-9) {
    parts.push('Your ratio is inverted: the larger sheave turns slower.');
  }
  if (!b && v.belts === Math.floor(item.drive.beltsExact)) {
    parts.push('Round belt counts up; a partial belt cannot carry its share.');
  }
  return parts.join(' ');
}

// First wrong attempt: names the wrong field, the rule for it and the slip the answer shows,
// never the model fan speed, belt count or worked sums (those come with the final miss).
function retryHint(v, item) {
  const r = rpmOk(v.rpm, item), b = beltsOk(v.belts, item);
  const parts = [];
  if (r && !b) parts.push('Your fan speed is right; the belt count is not.');
  else if (!r && b) parts.push('Your belt count is right; the fan speed is not.');
  else parts.push('Both the fan speed and the belt count are off.');
  if (!r) {
    const inverted = item.motorRpm * item.fanSheaveIn / item.motorSheaveIn;
    if (Math.abs(v.rpm - inverted) <= RPM_TOL + 1e-9) parts.push('Your ratio is inverted: the larger sheave turns slower.');
    else parts.push('Fan rpm = motor rpm × motor sheave ÷ fan sheave.');
    if (item.motorSheaveIn > item.fanSheaveIn) parts.push('Here the motor sheave is the larger one.');
  }
  if (!b) {
    const d = item.drive;
    if (v.belts === Math.floor(d.beltsExact) && v.belts !== d.belts) parts.push('Round belt counts up; a partial belt cannot carry its share.');
    else if (v.belts === d.belts + 1 && Number.isInteger(FP.models.round(d.beltsExact, 6))) parts.push('A whole-number quotient is not rounded up.');
    else parts.push('Belts = design hp (motor hp × drive service factor) ÷ rating per belt, rounded up.');
  }
  return parts.join(' ');
}

const ITEMS = CHALLENGE_DATA.map((c, i) => {
  const drive = FP.models.beltDrive(c);
  const item = Object.assign({}, c, {
    id: 'drive-' + (i + 1),
    drive,
    prompt: PROMPT,
    answerText: FP.fmt.num(drive.fanRpm, 0) + ' rpm and ' + drive.belts + ' belt' + (drive.belts === 1 ? '' : 's'),
    check: (v, it) => rpmOk(v.rpm, it) && beltsOk(v.belts, it),
    hint: (v, it) => retryHint(v, it),
    why: (v, it) => (rpmOk(v.rpm, it) && beltsOk(v.belts, it) ? '' : explain(v, it))
  });
  return item;
});

const runner = new FP.ChallengeRunner({
  items: ITEMS,
  attempts: 2,
  noun: 'Challenges fully',          // running line: "Challenges fully correct: n of 4"
  mastery: ITEMS.length,
  reviewPointer: 'Press Start over to try the four drives again',
  id: SIM_ID
});

// ---------- State ----------
let feedback = null;          // {kind: 'ok'|'bad'|'info', message}
let answerLine = '';          // "You: ... · Model: ..." after a challenge resolves
let locked = { rpm: false, belts: false };   // a field judged right on attempt 1 stays fixed
let revealAt = 0;             // millis() when the sheaves started turning
let biggerFanShown = false;
let lastFanSheave = null;
const reduceMotion = typeof window !== 'undefined' && window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Controls ----------
let rpmInput, beltsInput, checkButton, nextButton, defaultsButton, startOverButton;
const sliders = {};
let ctrlX = { rpmLabel: 10, rpmInput: 150, beltsLabel: 250, beltsInput: 300, button: 370 };

const keys = K.keys.bind({ Enter: onEnter });
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  const main = document.querySelector('main');

  rpmInput = createInput('');
  rpmInput.parent(main);
  rpmInput.attribute('inputmode', 'decimal');
  rpmInput.attribute('aria-label', 'Your fan speed, rpm');
  beltsInput = createInput('');
  beltsInput.parent(main);
  beltsInput.attribute('inputmode', 'numeric');
  beltsInput.attribute('aria-label', 'Your number of belts');

  checkButton = K.button(FP.msg.CHECK, checkAnswer);
  nextButton = K.button('Next challenge', nextChallenge);
  defaultsButton = K.button('Reset to defaults', resetDefaults, { variant: 'secondary' });
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  for (const q of QUANTITIES) {
    const s = createSlider(q.min, q.max, q.def, q.step);
    s.parent(main);
    s.attribute('aria-label', q.label + (q.unit ? ', ' + q.unit : ''));
    s.input(onSlider);
    sliders[q.key] = s;
  }

  setSliders(ITEMS[0]);
  syncControls();

  describe('Belt drive speed calculator. A motor sheave and a fan sheave are drawn to scale, joined ' +
    'by a V-belt. Four challenge drives give the motor speed, both sheave pitch diameters, the motor ' +
    'horsepower, the drive service factor and the rating per belt; the learner types the fan speed ' +
    'in rpm and the number of belts and presses Check. The sheaves then turn at their own speeds and ' +
    'the fan speed, speed ratio, belt speed, design horsepower and belt count appear. After challenge ' +
    '4, Explore mode unlocks six sliders and every output updates at once.');
}

// ---------- Values ----------
function sliderVal(q) {
  const v = Number(sliders[q.key].value());
  return Math.round(v / q.step) * q.step;
}
function roundTo(v, d) { return FP.models.round(v, d); }
function exploreValues() {
  const o = {};
  for (const q of QUANTITIES) o[q.key] = roundTo(sliderVal(q), 2);
  return o;
}
function setSliders(v) { for (const q of QUANTITIES) sliders[q.key].value(v[q.key]); }
function currentDrive() {
  const st = runner.state();
  if (st.explore) return FP.models.beltDrive(exploreValues());
  return st.item.drive;
}
function currentInputs() {
  const st = runner.state();
  return st.explore ? exploreValues() : st.item;
}
function revealed() {
  const st = runner.state();
  return st.explore || st.phase === 'resolved';
}

// ---------- Control state and layout ----------
function narrow() { return canvasWidth < 480; }
function sliderLeft() { return narrow() ? 172 : 262; }

function syncControls() {
  const st = runner.state();
  const asking = st.phase === 'question';
  if (st.explore) {
    for (const c of [rpmInput, beltsInput, checkButton, nextButton]) c.hide();
    defaultsButton.show();
  } else {
    rpmInput.show(); beltsInput.show(); defaultsButton.hide();
    K.setEnabled(rpmInput, asking && !locked.rpm);
    K.setEnabled(beltsInput, asking && !locked.belts);
    if (asking) { checkButton.show(); nextButton.hide(); } else { checkButton.hide(); nextButton.show(); }
    const nextLabel = st.isLast ? 'Start exploring' : 'Next challenge';
    nextButton.html(narrow() ? (st.isLast ? 'Explore' : 'Next') : nextLabel);
    nextButton.attribute('aria-label', nextLabel);
  }
  for (const q of QUANTITIES) K.setEnabled(sliders[q.key], st.explore);
  positionControls();
}

function positionControls() {
  const n = narrow();
  push();
  textSize(n ? 14 : 16);
  textStyle(BOLD);
  const l1 = n ? 'Fan rpm:' : 'Fan speed (rpm):', l2 = 'Belts:';
  const w1 = textWidth(l1), w2 = textWidth(l2);
  pop();
  ctrlX.rpmLabel = 10;
  ctrlX.rpmInput = 10 + w1 + 8;
  rpmInput.size(n ? 62 : 90);
  rpmInput.position(ctrlX.rpmInput, K.controlRow(0));
  ctrlX.beltsLabel = ctrlX.rpmInput + (rpmInput.elt.offsetWidth || 90) + (n ? 10 : 18);
  ctrlX.beltsInput = ctrlX.beltsLabel + w2 + 8;
  beltsInput.size(n ? 40 : 56);
  beltsInput.position(ctrlX.beltsInput, K.controlRow(0));
  ctrlX.button = ctrlX.beltsInput + (beltsInput.elt.offsetWidth || 56) + (n ? 8 : 14);
  checkButton.position(ctrlX.button, K.controlRow(0));
  nextButton.position(ctrlX.button, K.controlRow(0));
  defaultsButton.position(10, K.controlRow(0));
  startOverButton.position(10, K.controlRow(1));
  const sw = K.sliderWidth(canvasWidth, sliderLeft(), 15);
  QUANTITIES.forEach((q, i) => {
    sliders[q.key].position(sliderLeft(), K.controlRow(2 + i) + 4);
    sliders[q.key].size(sw);
  });
}

// ---------- Challenge flow (FP.ChallengeRunner) ----------
function onEnter() {
  const st = runner.state();
  if (st.explore) return;
  if (st.phase === 'question') checkAnswer();
  else if (st.phase === 'resolved') nextChallenge();
}

function parseField(input) { return FP.fmt.parseNumber(input.value()); }

function checkAnswer() {
  const st = runner.state();
  if (st.phase !== 'question') return;
  const rpm = parseField(rpmInput), belts = parseField(beltsInput);
  if (isNaN(rpm) || isNaN(belts)) {
    // Not an attempt: both boxes need a number
    feedback = { kind: 'info', message: FP.msg.ENTER_NUMBER + ' for the fan speed and for the belt count.' };
    FP.announce(feedback.message);
    (isNaN(rpm) ? rpmInput : beltsInput).elt.focus();
    return;
  }
  const res = runner.submit({ rpm, belts });
  if (res.status === 'ignored') return;
  feedback = { kind: res.kind, message: res.message };
  FP.announce(res.message);
  const item = res.item;
  if (res.status === 'retry') {
    // Fields are judged separately: a right field stays fixed for the second attempt
    locked.rpm = rpmOk(rpm, item);
    locked.belts = beltsOk(belts, item);
    if (!locked.rpm) rpmInput.value('');
    if (!locked.belts) beltsInput.value('');
    syncControls();
    (locked.rpm ? beltsInput : rpmInput).elt.focus();
    return;
  }
  answerLine = 'You: ' + FP.fmt.numUpTo(rpm, 1) + ' rpm, ' + FP.fmt.numUpTo(belts, 2) + ' belt' +
    (belts === 1 ? '' : 's') + ' · Model: ' + item.answerText.replace(' and ', ', ');
  revealAt = millis();
  syncControls();
  nextButton.elt.focus();
}

function nextChallenge() {
  if (!runner.next()) return;
  feedback = null;
  answerLine = '';
  locked = { rpm: false, belts: false };
  rpmInput.value('');
  beltsInput.value('');
  const st = runner.state();
  if (st.explore) {
    setSliders(Object.fromEntries(QUANTITIES.map(q => [q.key, q.def])));
    lastFanSheave = sliderVal(QUANTITIES[2]);
    revealAt = millis();
    syncControls();
    const s = runner.summary();
    FP.announce(s.lines.join(' ') + ' ' + FP.msg.EXPLORE + ': the six sliders are unlocked.');
    sliders.motorRpm.elt.focus();
  } else {
    setSliders(st.item);
    syncControls();
    FP.announce('Challenge ' + (st.index + 1) + ' of ' + ITEMS.length + '. ' + givensText(st.item) + ' ' + PROMPT);
    rpmInput.elt.focus();
  }
}

function resetDefaults() {
  setSliders(Object.fromEntries(QUANTITIES.map(q => [q.key, q.def])));
  lastFanSheave = sliderVal(QUANTITIES[2]);
  FP.announce('Defaults restored. ' + outputsText(currentDrive()));
}

function startOver() {
  runner.restart();
  feedback = null;
  answerLine = '';
  locked = { rpm: false, belts: false };
  biggerFanShown = false;
  rpmInput.value('');
  beltsInput.value('');
  setSliders(ITEMS[0]);
  syncControls();
  FP.announce('Started over. Challenge 1 of ' + ITEMS.length + '. ' + givensText(ITEMS[0]) + ' ' + PROMPT);
  rpmInput.elt.focus();
}

function onSlider() {
  if (!runner.state().explore) return;
  const fan = sliderVal(QUANTITIES[2]);
  if (lastFanSheave !== null && fan > lastFanSheave + 1e-9 && !biggerFanShown) {
    biggerFanShown = true;
    FP.announce('Bigger fan sheave, slower fan.');
  }
  lastFanSheave = fan;
}

function givensText(v) {
  return 'Motor ' + FP.fmt.num(v.motorRpm, 0) + ' rpm with a ' + FP.fmt.num(v.motorSheaveIn, 1) +
    ' in sheave; fan sheave ' + FP.fmt.num(v.fanSheaveIn, 1) + ' in; motor ' + FP.fmt.numUpTo(v.motorHp, 1) +
    ' hp; drive service factor ' + FP.fmt.num(v.driveSF, 1) + '; ' + FP.fmt.num(v.hpPerBelt, 1) + ' hp per belt.';
}
function outputsText(d) {
  return 'Fan ' + FP.fmt.num(d.fanRpm, 0) + ' rpm, speed ratio ' + FP.fmt.num(d.speedRatio, 2) +
    ', belt speed ' + FP.fmt.num(d.beltSpeedFpm, 0) + ' ft/min, design ' + FP.fmt.num(d.designHp, 1) +
    ' hp, ' + d.belts + ' belts.';
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  const st = runner.state();
  let y = K.title('Belt Drive Speed Calculator');
  const wide = canvasWidth >= WIDE_MIN;
  let right = st.explore ? (wide ? FP.msg.EXPLORE + ' (not scored)' : FP.msg.EXPLORE)
    : 'Challenge ' + (st.index + 1) + ' of ' + ITEMS.length +
      (st.phase === 'question' && wide ? ' · ' + st.attemptLabel : '');
  if (!wide && !st.explore) {
    // narrow: keep the status on one line; the panel header carries the challenge number
    push(); textSize(15); textStyle(BOLD); const lw = textWidth(st.scoreLabel); textStyle(NORMAL);
    if (lw + 16 + textWidth(right) > canvasWidth - 20) right = null;
    pop();
  }
  y = K.statusLine(st.scoreLabel, right, null, { y: y - 4 });
  const noteLines = K.note(DATA_NOTE, { lines: canvasWidth < 480 ? 3 : 2 });
  const bottom = drawHeight - 10 - noteLines * 17;
  const top = y + 2;

  const d = currentDrive();
  const v = currentInputs();
  const reveal = revealed();
  if (wide) {
    const leftW = Math.round(canvasWidth * 0.44);
    const sheaveH = Math.round((bottom - top) * 0.52);
    drawSheaves(10, top, leftW - 15, sheaveH, v, d, reveal);
    drawReadouts(10, top + sheaveH + 6, leftW - 15, bottom - top - sheaveH - 6, d, reveal, false);
    drawTextPanel(leftW + 5, top, canvasWidth - leftW - 15, bottom - top, v, d);
  } else {
    const sheaveH = 120;
    drawSheaves(10, top, canvasWidth - 20, sheaveH, v, d, reveal);
    let y2 = top + sheaveH + 6;
    if (st.explore) {
      const h = 60;
      drawReadouts(10, y2, canvasWidth - 20, h, d, true, true);
      y2 += h + 6;
    }
    drawTextPanel(10, y2, canvasWidth - 20, bottom - y2, v, d);
  }
  drawControlLabels(v);
}

function drawSheaves(x, y, w, h, v, d, reveal) {
  K.panel(x, y, w, h);
  const t = reveal && !reduceMotion ? (millis() - revealAt) / 1000 : undefined;
  const labelH = 40;
  const g = FD.sheavePair(null, { x: x + 6, y: y + 6, w: w - 12, h: h - 12 - labelH,
    motorIn: v.motorSheaveIn, fanIn: v.fanSheaveIn, motorRpm: v.motorRpm, t, labels: false });
  // Labels: the fan speed stays hidden until the challenge is checked
  const rm = v.motorSheaveIn * g.scale / 2, rf = v.fanSheaveIn * g.scale / 2;
  const ly = g.motorCenter[1] + Math.max(rm, rf) + 8;
  noStroke();
  textAlign(CENTER, TOP);
  textSize(14);
  // Labels sit under each half of the panel, so they never collide when the sheaves are small
  const mx = x + w * 0.27, fx = x + w * 0.73;
  const n = textWidth('Motor sheave 12.0 in') > w * 0.46 - 6;
  if (n) textSize(13);
  fill(FP.tok('text'));
  text((n ? 'Motor ' : 'Motor sheave ') + FP.fmt.num(v.motorSheaveIn, 1) + ' in', mx, ly);
  text((n ? 'Fan ' : 'Fan sheave ') + FP.fmt.num(v.fanSheaveIn, 1) + ' in', fx, ly);
  textStyle(BOLD);
  text(FP.fmt.num(v.motorRpm, 0) + ' rpm', mx, ly + 17);
  fill(reveal ? FP.tok('primary') : FP.tok('text-muted'));
  text(reveal ? FP.fmt.num(d.fanRpm, 0) + ' rpm' : '? rpm', fx, ly + 17);
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
}

function drawReadouts(x, y, w, h, d, reveal, compact) {
  K.panel(x, y, w, h);
  const ink = FP.tok('text');
  const q = (s) => (reveal ? s : '?');
  const rows = [
    [compact ? 'Fan' : 'Fan speed', q(FP.fmt.num(d.fanRpm, 0) + ' rpm')],
    [compact ? 'Ratio' : 'Speed ratio (motor ÷ fan)', q(FP.fmt.num(d.speedRatio, 2))],
    [compact ? 'Belt' : 'Belt speed', q(FP.fmt.num(d.beltSpeedFpm, 0) + ' ft/min')],
    [compact ? 'Design' : 'Design horsepower', q(FP.fmt.num(d.designHp, 1) + ' hp')],
    [compact ? 'Belts' : 'Belts required', q(String(d.belts) + (compact ? '' : '  (' + FP.fmt.num(d.beltsExact, 2) + ' before rounding)'))]
  ];
  noStroke();
  if (compact) {
    // two columns, three rows
    textSize(12);
    const lh = 16;
    rows.forEach((r, i) => {
      const cx = x + 10 + (i % 2) * (w * 0.58 - 10), cy = y + 8 + Math.floor(i / 2) * lh;
      textAlign(LEFT, TOP);
      fill(ink);
      text(r[0] + ': ', cx, cy);
      fill(FP.tok('primary'));
      textStyle(BOLD);
      text(r[1], cx + textWidth(r[0] + ': '), cy);
      textStyle(NORMAL);
    });
    return;
  }
  const lh = Math.min(22, (h - 16) / (rows.length + 1.4));
  const fs = lh >= 20 ? 14 : 13;
  textSize(fs);
  let yy = y + 8;
  fill(ink);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text('Outputs', x + 10, yy);
  textStyle(NORMAL);
  yy += lh + 2;
  for (const r of rows) {
    fill(ink);
    textAlign(LEFT, TOP);
    text(r[0], x + 10, yy);
    textAlign(RIGHT, TOP);
    fill(reveal ? FP.tok('primary') : FP.tok('text-muted'));
    textStyle(BOLD);
    const val = r[1];
    if (textWidth(val) > w * 0.55) {
      textStyle(NORMAL);
      text(val.replace(/\s+\(.*\)$/, ''), x + w - 10, yy);
    } else {
      text(val, x + w - 10, yy);
    }
    textStyle(NORMAL);
    yy += lh;
  }
  if (reveal) {
    fill(FP.tok('text-muted'));
    textAlign(LEFT, TOP);
    textSize(13);
    text(d.label.charAt(0).toUpperCase() + d.label.slice(1) + '.', x + 10, yy + 2);
  }
  textAlign(LEFT, TOP);
}

// Challenge text, feedback, or the Explore panel, shrunk to fit.
function drawTextPanel(x, y, w, h, v, d) {
  K.panel(x, y, w, h);
  const tx = x + 10, tw = w - 20, avail = h - 16;
  const layout = (ts, dry) => panelContent(tx, y + 8, tw, ts, v, d, dry, dry ? Infinity : avail) - (y + 8);
  const ts = K.fitTextSize(t => layout(t, true), avail, 15, 12);
  layout(ts, false);
}

function panelContent(x, y, w, ts, v, d, dry, maxH) {
  const st = runner.state();
  const lead = Math.round(ts * 1.3);
  const gap = 6;
  const yMax = y + maxH;
  const ink = FP.tok('text');
  noStroke();
  textAlign(LEFT, TOP);
  const para = (str, col, opts) => {
    opts = opts || {};
    const s = opts.size || ts, ld = Math.round(s * 1.3);
    textSize(s);
    textStyle(opts.bold ? BOLD : NORMAL);
    const left = Math.floor((yMax - y) / ld);
    if (left < 1) { textStyle(NORMAL); return; }
    if (!dry) fill(col);
    y = K.wrapText(str, x, y, w, ld, { dryRun: dry, maxLines: isFinite(left) ? left : undefined }) + (opts.gap != null ? opts.gap : gap);
    textStyle(NORMAL);
  };

  if (!st.explore) {
    const item = st.item;
    const narrowPanel = canvasWidth < WIDE_MIN;
    // Narrow: once a verdict is shown, the worked calculation replaces the prompt and givens
    const verdict = narrowPanel && feedback && feedback.kind !== 'info';
    if (narrowPanel) {
      para('Challenge ' + (st.index + 1) + ' of ' + ITEMS.length +
        (st.phase === 'question' ? ' · ' + st.attemptLabel : ''), ink, { bold: true, gap: 2 });
      if (!verdict) para(PROMPT, ink);
    } else {
      para('Challenge ' + (st.index + 1) + ': ' + PROMPT, ink, { bold: true });
    }
    const givens = verdict ? [] : [
      'Motor: ' + FP.fmt.num(item.motorRpm, 0) + ' rpm, ' + FP.fmt.numUpTo(item.motorHp, 1) + ' hp',
      'Motor sheave ' + FP.fmt.num(item.motorSheaveIn, 1) + ' in · fan sheave ' + FP.fmt.num(item.fanSheaveIn, 1) + ' in',
      'Drive service factor ' + FP.fmt.num(item.driveSF, 1) + ' · ' + FP.fmt.num(item.hpPerBelt, 1) + ' hp per belt'
    ];
    for (let i = 0; i < givens.length; i++) para(givens[i], ink, { gap: i === givens.length - 1 ? gap : 1 });
    if ((locked.rpm || locked.belts) && !verdict) {
      para((locked.rpm ? 'Your fan speed is kept; fix the belt count.' : 'Your belt count is kept; fix the fan speed.'),
        FP.tok('text-muted'));
    }
    if (feedback && feedback.message) {
      const message = (feedback.kind === 'info' ? 'ℹ ' : '') + feedback.message;
      textSize(ts);
      const lines = K.countLines(message, w - 16);
      const fitLines = Math.max(1, Math.floor((yMax - y - 10) / lead));
      const fh = Math.min(lines, fitLines) * lead + 10;
      if (!dry) {
        const ok = feedback.kind === 'ok', bad = feedback.kind === 'bad';
        K.panel(x - 4, y - 2, w + 8, fh, {
          fill: ok ? '--fp-correct-bg' : (bad ? '--fp-incorrect-bg' : '--fp-info-bg'),
          stroke: ok ? '--fp-correct' : (bad ? '--fp-incorrect' : '--fp-border'),
          dashed: bad, weight: ok || bad ? 2 : 1, radius: 6
        });
        noStroke();
        fill(ok ? FP.tok('correct') : (bad ? FP.tok('incorrect') : ink));
        K.wrapText(message, x + 4, y + 3, w - 16, lead, { maxLines: fitLines });
      }
      y += fh + gap;
    }
    if (answerLine) para(answerLine, ink, { bold: true });
    if (st.phase === 'resolved' && item.drive.fanRpm > item.motorRpm) {
      para('Notice: the fan turns faster than the motor here, because the motor sheave is the larger one.',
        FP.tok('accent-text'));
    }
  } else {
    if (canvasWidth >= WIDE_MIN) para(FP.msg.EXPLORE + ' (not scored)', ink, { bold: true });
    const s = runner.summary();
    para(s.lines[0], ink, { bold: true, gap: 2 });
    para(s.lines[1], s.mastered ? FP.tok('primary') : ink, { bold: s.mastered });
    if (biggerFanShown) para('Bigger fan sheave, slower fan.', FP.tok('accent-text'), { bold: true });
    if (d.beltSpeedFpm > HIGH_BELT_SPEED) {
      para('ℹ Very high belt speed: check the drive manufacturer\'s limits for this belt section.',
        FP.tok('accent-text'), { bold: true });
    }
    if (s.misses.length) {
      para('Missed: challenge ' + s.misses.map(m => m.index + 1).join(', ') + '.', FP.tok('text-muted'));
    }
    para('Change any quantity with the sliders; every output updates at once.', ink);
    para('Fan rpm = ' + FP.fmt.num(v.motorRpm, 0) + ' × ' + FP.fmt.num(v.motorSheaveIn, 1) + ' ÷ ' +
      FP.fmt.num(v.fanSheaveIn, 1) + ' = ' + FP.fmt.num(d.fanRpm, 0) + '. Design hp = ' +
      FP.fmt.numUpTo(v.motorHp, 1) + ' × ' + FP.fmt.num(v.driveSF, 1) + ' = ' + FP.fmt.num(d.designHp, 1) +
      '; ' + FP.fmt.num(d.designHp, 1) + ' ÷ ' + FP.fmt.num(v.hpPerBelt, 1) + ' = ' + FP.fmt.num(d.beltsExact, 2) +
      ' → ' + d.belts + ' belt' + (d.belts === 1 ? '' : 's') + '.', FP.tok('text-muted'));
  }
  return y - gap;
}

function drawControlLabels(v) {
  const st = runner.state();
  const n = narrow();
  noStroke();
  textAlign(LEFT, CENTER);
  if (!st.explore) {
    textStyle(BOLD);
    textSize(n ? 14 : 16);
    fill(FP.tok('text'));
    const mid = K.controlRow(0) + (rpmInput.elt.offsetHeight || 28) / 2;
    text(n ? 'Fan rpm:' : 'Fan speed (rpm):', ctrlX.rpmLabel, mid);
    text('Belts:', ctrlX.beltsLabel, mid);
    textStyle(NORMAL);
  }
  // Row 1: what the sliders are doing, beside Start over
  const sx = 10 + (startOverButton.elt.offsetWidth || 90) + 12;
  const opts = st.explore ? ['Explore mode: the sliders are unlocked', FP.msg.EXPLORE]
    : ['Sliders show the challenge values; ' + st.exploreLabel.charAt(0).toLowerCase() + st.exploreLabel.slice(1),
      st.exploreLabel, 'Sliders unlock after challenge 4.'];
  textSize(n ? 13 : 14);
  fill(FP.tok('text-muted'));
  const maxW = canvasWidth - sx - 10;
  const rowMid = K.controlRow(1) + (startOverButton.elt.offsetHeight || 28) / 2;
  text(opts.find(t => textWidth(t) <= maxW) || opts[opts.length - 1], sx, rowMid);

  textSize(n ? 13 : 15);
  QUANTITIES.forEach((q, i) => {
    fill(st.explore ? FP.tok('text') : FP.tok('text-muted'));
    text((n ? q.short : q.label) + ': ' + fmtQ(q, v[q.key]), 10, K.controlLabel(2 + i));
  });
  textAlign(LEFT, TOP);
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
