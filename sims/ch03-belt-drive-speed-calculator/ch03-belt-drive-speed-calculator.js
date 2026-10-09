// Belt Drive Speed Calculator - p5.js MicroSim (Chapter 3: Basic Fan Anatomy)
// CANVAS_HEIGHT: 715
// Three belt-drive challenges (type the fan speed before the drive turns), then Explore mode:
// motor speed and both sheave pitch diameters change the drawing, ratio, label and fan speed.
// Built on the FanPedia kit: FP.ChallengeRunner (challenge flow, wording, score, mastery),
// FP.models.beltDrive (fan speed, ratio, slower/same/faster label), FD.sheavePair (sheaves and
// belt to scale), FP.p5 (layout, text, controls, keys).
// Rule: N_fan = N_motor x D_motor / D_fan (ideal; belt slip is not modeled).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js, fan-models.js,
// fan-drawings.js (load them before this file, also in the p5.js editor).

const K = FP.p5;
const SIM_ID = 'ch03-belt-drive-speed-calculator';

// ---------- Canvas layout ----------
let canvasWidth = 800;
const drawHeight = 530;
const controlHeight = K.controlHeightFor(5);   // answer, Start over, motor speed, 2 sheave sliders
const canvasHeight = drawHeight + controlHeight;
const defaultTextSize = 16;

// ---------- Content (chapter specification) ----------
const MOTOR_SPEEDS = [1160, 1760, 3500];      // illustrative nominal motor speeds, RPM
const MOTOR_SHEAVE = { min: 3.0, max: 12.0, step: 0.2, def: 5.0 };
const FAN_SHEAVE = { min: 4.0, max: 24.0, step: 0.2, def: 8.0 };
const DEFAULT_DRIVE = { motorRpm: 1760, motorIn: 5.0, fanIn: 8.0 };
const DATA_NOTE = ['Illustrative nominal motor speeds', 'Belt slip not modeled',
  'Keys: Enter checks, then next'];

const CHALLENGE_DATA = [
  { id: 'drive-1', motorRpm: 1760, motorIn: 5.0, fanIn: 8.0,
    prompt: 'The motor turns at 1,760 RPM with a 5.0-inch sheave driving an 8.0-inch fan sheave. ' +
      'How fast does the fan turn?',
    wrong: 'Multiply motor speed by motor sheave over fan sheave: 1,760 × 5.0 / 8.0 = 1,100 RPM.' },
  { id: 'drive-2', motorRpm: 1760, motorIn: 6.0, fanIn: 12.0,
    prompt: 'The motor turns at 1,760 RPM with a 6.0-inch sheave driving a 12.0-inch fan sheave. ' +
      'How fast does the fan turn?',
    wrong: 'The fan sheave is twice the motor sheave, so the fan turns at half the motor speed: ' +
      '1,760 / 2 = 880 RPM.' },
  { id: 'drive-3', motorRpm: 1160, motorIn: 9.0, fanIn: 6.0,
    prompt: 'The motor turns at 1,160 RPM with a 9.0-inch sheave driving a 6.0-inch fan sheave. ' +
      'How fast does the fan turn?',
    wrong: 'Here the motor sheave is larger, so the fan turns faster than the motor: ' +
      '1,160 × 9.0 / 6.0 = 1,740 RPM.' }
];
const TOL = { abs: 10 };                       // ±10 RPM
// Spec feedback: correct shows only "Correct: <model value> RPM."; a first wrong answer shows a
// hint (the rule or the slip, no fan speed and no worked numbers); the final miss shows the
// "Feedback when wrong" text with the model value.
const RULE = 'Fan speed = motor speed × motor sheave ÷ fan sheave.';
function driveHint(v, c) {
  const near = t => FP.check.numeric(v, t, TOL);
  let slip = '';
  if (near(c.motorRpm * c.fanIn / c.motorIn)) slip = 'You inverted the ratio. A larger fan sheave makes the fan turn slower. ';
  else if (near(c.motorRpm)) slip = 'That is the motor speed. Unequal sheaves change the speed. ';
  const bigger = c.motorIn > c.fanIn ? 'Here the motor sheave is the larger one: does the fan turn faster or slower than the motor? ' : '';
  return slip + bigger + RULE;
}
const ITEMS = CHALLENGE_DATA.map(c => Object.assign({}, c, {
  model: FP.models.fanRpm(c.motorRpm, c.motorIn, c.fanIn),
  unit: 'RPM', decimals: 0, tolerance: TOL,
  label: 'challenge 3',
  hint: v => driveHint(v, c),
  why: (value, item) => (FP.check.numeric(value, item.model, TOL) ? '' : item.wrong)
}));

const runner = new FP.ChallengeRunner({
  items: ITEMS,
  attempts: 2,
  tolerance: TOL,
  noun: 'Challenges',
  mastery: ITEMS.length,
  reviewPointer: 'Review "Belt Drive Speed Ratio" in the chapter, then press Start over',
  id: SIM_ID
});

// ---------- State ----------
let feedback = null;            // {kind, message}
let answerLine = '';            // "Your answer ... · Fan speed ..." once a challenge resolves
let runStart = null;            // millis() when the drive started turning (null = at rest)
let biggerFanNote = false;      // "Bigger fan sheave: fan speed went down." shown once noticed
let lastFanIn = FAN_SHEAVE.def;

// ---------- Controls ----------
let answerInput, checkButton, nextButton, startOverButton, motorSelect, motorSlider, fanSlider;

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
  answerInput.attribute('autocomplete', 'off');
  answerInput.attribute('aria-label', 'Your answer: fan speed in RPM');

  checkButton = K.button(FP.msg.CHECK, checkAnswer);
  nextButton = K.button('Next challenge', nextChallenge);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  motorSelect = createSelect();
  motorSelect.parent(main);
  for (const rpm of MOTOR_SPEEDS) { motorSelect.option(FP.fmt.rpm(rpm), String(rpm)); }
  motorSelect.selected(String(DEFAULT_DRIVE.motorRpm));
  motorSelect.attribute('aria-label', 'Motor speed (illustrative nominal)');
  motorSelect.changed(onExploreChange);

  motorSlider = createSlider(MOTOR_SHEAVE.min, MOTOR_SHEAVE.max, MOTOR_SHEAVE.def, MOTOR_SHEAVE.step);
  motorSlider.parent(main);
  motorSlider.attribute('aria-label', 'Motor sheave pitch diameter, inches');
  motorSlider.input(onExploreChange);
  fanSlider = createSlider(FAN_SHEAVE.min, FAN_SHEAVE.max, FAN_SHEAVE.def, FAN_SHEAVE.step);
  fanSlider.parent(main);
  fanSlider.attribute('aria-label', 'Fan sheave pitch diameter, inches');
  fanSlider.input(onExploreChange);

  syncControls();
  describe('Belt drive speed calculator. An end view shows the motor sheave on the left and the fan ' +
    'sheave on the right, drawn to scale and joined by a V-belt. Three challenges give the motor speed ' +
    'and both sheave pitch diameters; the learner types the fan speed in RPM and presses Check, then ' +
    'the drive turns and the fan speed, ratio and slower/same/faster label appear. After the challenges, ' +
    'Explore mode unlocks a motor speed menu and sliders for both sheaves.');
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
    nextButton.html(st.phase === 'resolved' && st.isLast ? 'Start exploring' : 'Next challenge');
  }
  for (const c of [motorSelect, motorSlider, fanSlider]) { K.setEnabled(c, st.explore); }
  if (!st.explore && st.item) { setDrive({ motorRpm: st.item.motorRpm, motorIn: st.item.motorIn, fanIn: st.item.fanIn }); }
  positionControls();
}

function narrow() { return canvasWidth < 480; }
function sliderLeft() { return narrow() ? 172 : 230; }

function positionControls() {
  const n = narrow();
  const inputX = n ? 102 : 120;
  answerInput.size(n ? 80 : 110);
  answerInput.position(inputX, K.controlRow(0));
  const bx = inputX + (answerInput.elt.offsetWidth || 110) + 8;
  checkButton.position(bx, K.controlRow(0));
  nextButton.position(bx, K.controlRow(0));       // shares the Check slot
  startOverButton.position(10, K.controlRow(1));
  motorSelect.position(sliderLeft(), K.controlRow(2));
  const sw = K.sliderWidth(canvasWidth, sliderLeft(), 15);
  motorSlider.position(sliderLeft(), K.controlRow(3));
  motorSlider.size(sw);
  fanSlider.position(sliderLeft(), K.controlRow(4));
  fanSlider.size(sw);
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
    answerLine = 'Your answer: ' + FP.fmt.numUpTo(res.value, 1) + ' RPM · Fan speed: ' +
      FP.fmt.rpm(FP.models.round(res.item.model, 0));
    runStart = millis();
    syncControls();
    nextButton.elt.focus();
  }
}

function nextChallenge() {
  if (!runner.next()) { return; }
  feedback = null;
  answerLine = '';
  runStart = null;
  const st = runner.state();
  if (st.explore) {
    setDrive(DEFAULT_DRIVE);
    lastFanIn = fanSlider.value();
    runStart = millis();
    syncControls();
    const s = runner.summary();
    FP.announce(s.lines.join(' ') + ' ' + FP.msg.EXPLORE + ': change the motor speed or either sheave.');
    fanSlider.elt.focus();
  } else {
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
  runStart = null;
  biggerFanNote = false;
  setDrive(DEFAULT_DRIVE);
  lastFanIn = FAN_SHEAVE.def;
  answerInput.value('');
  syncControls();
  FP.announce('Started over. Challenge 1 of ' + ITEMS.length + ': ' + ITEMS[0].prompt);
  answerInput.elt.focus();
}

// ---------- Explore mode ----------
function setDrive(d) {
  motorSelect.selected(String(d.motorRpm));
  motorSlider.value(d.motorIn);
  fanSlider.value(d.fanIn);
}

function onExploreChange() {
  if (!runner.state().explore) { return; }
  const f = fanSlider.value();
  if (f > lastFanIn + 1e-6 && !biggerFanNote) {
    biggerFanNote = true;
    FP.announce('Bigger fan sheave: fan speed went down.');
  }
  lastFanIn = f;
}

// The drive shown now: the current challenge, or the Explore controls.
function currentDrive() {
  const st = runner.state();
  if (st.explore) {
    return { motorRpm: Number(motorSelect.value()), motorIn: round1(motorSlider.value()),
      fanIn: round1(fanSlider.value()) };
  }
  return { motorRpm: st.item.motorRpm, motorIn: st.item.motorIn, fanIn: st.item.fanIn };
}
function round1(v) { return FP.models.round(v, 1); }   // slider steps of 0.2 can carry float noise

function revealed() {
  const st = runner.state();
  return st.explore || st.phase === 'resolved';
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  const st = runner.state();
  const d = currentDrive();
  const bd = FP.models.beltDrive({ motorRpm: d.motorRpm, motorSheaveIn: d.motorIn, fanSheaveIn: d.fanIn });
  const show = revealed();
  const wide = canvasWidth >= 640;

  let y = K.title('Belt Drive Speed Calculator');
  const right = st.explore ? FP.msg.EXPLORE
    : 'Challenge ' + (st.index + 1) + ' of ' + ITEMS.length +
      (st.phase === 'question' ? ' · ' + st.attemptLabel : '');
  y = K.statusLine(st.scoreLabel, right, null, { y: y - 2 });

  let box, panel;
  if (wide) {
    const pw = max(330, canvasWidth * 0.44);
    box = { x: 10, y: y + 4, w: canvasWidth - pw - 30, h: min(330, drawHeight - y - 112) };
    panel = { x: canvasWidth - pw - 10, y: y + 4, w: pw, h: drawHeight - y - 30 };
  } else {
    box = { x: 10, y: y + 2, w: canvasWidth - 20, h: 180 };
    panel = { x: 8, y: box.y + box.h + 74, w: canvasWidth - 16, h: 0 };
    panel.h = drawHeight - panel.y - 38;
  }

  drawDrive(box, d, bd, show);
  drawReadout({ x: box.x, y: box.y + box.h + 6, w: box.w }, d, bd, show, wide);
  drawPanel(panel, st, wide);
  K.note(DATA_NOTE, { lines: wide ? 1 : 2 });
  drawControlLabels(st, d);
}

function drawDrive(b, d, bd, show) {
  K.panel(b.x, b.y, b.w, b.h, { fill: 255, radius: 6 });
  const turning = show && runStart !== null;
  const t = turning ? (millis() - runStart) / 1000 : undefined;
  const maxIn = runner.state().explore ? FAN_SHEAVE.max : 12;
  const labelH = 44;
  const r = FD.sheavePair(null, {
    x: b.x + 8, y: b.y + 8, w: b.w - 16, h: b.h - 16 - labelH,
    motorIn: d.motorIn, fanIn: d.fanIn, motorRpm: turning ? d.motorRpm : undefined,
    t, slow: 60, maxIn, labels: false
  });
  // Our own labels (one decimal, and no fan speed until it is revealed). Centred under each
  // sheave; pushed to the box edges when the two would overlap (very unequal sheaves).
  const ly = b.y + b.h - labelH - 2;
  noStroke();
  textSize(14);
  textStyle(BOLD);
  const mLbl = 'Motor sheave ' + d.motorIn.toFixed(1) + ' in';
  const fLbl = 'Fan sheave ' + d.fanIn.toFixed(1) + ' in';
  const mw = textWidth(mLbl), fw = textWidth(fLbl);
  let mx = r.motorCenter[0], fx = r.fanCenter[0];
  mx = constrain(mx, b.x + 8 + mw / 2, b.x + b.w - 8 - mw / 2);
  fx = constrain(fx, b.x + 8 + fw / 2, b.x + b.w - 8 - fw / 2);
  if (mx + mw / 2 + 12 > fx - fw / 2) {
    const room = b.w - 16 - mw - fw;
    mx = b.x + 8 + mw / 2 + max(0, room / 2 - 6) * 0.5;
    fx = b.x + b.w - 8 - fw / 2 - max(0, room / 2 - 6) * 0.5;
  }
  textAlign(CENTER, TOP);
  fill(FP.tok('text'));
  text(mLbl, mx, ly);
  text(fLbl, fx, ly);
  textStyle(NORMAL);
  fill(FP.tok('text-muted'));
  text(FP.fmt.rpm(d.motorRpm), mx, ly + 20);
  fill(show ? FP.tok('primary') : FP.tok('text-muted'));
  text(show ? FP.fmt.rpm(FP.models.round(bd.fanRpm, 0)) : '? RPM', fx, ly + 20);
  if (!turning) {
    fill(FP.tok('text-muted'));
    textAlign(LEFT, TOP);
    textSize(13);
    text('Drive at rest', b.x + 8, b.y + 6);
  }
}

function drawReadout(r, d, bd, show, wide) {
  const rows = [
    ['Ratio (motor / fan sheave): ', show ? bd.diameterRatio.toFixed(3) : '?'],
    ['Fan speed: ', show ? FP.fmt.rpm(FP.models.round(bd.fanRpm, 0)) : '?'],
    ['Drive: ', show ? bd.label : '?']
  ];
  const ts = wide ? 15 : 14, lh = ts + 4;
  K.panel(r.x, r.y, r.w, rows.length * lh + 10, { fill: '--fp-info-bg', stroke: '--fp-border', radius: 6 });
  noStroke();
  textAlign(LEFT, TOP);
  textSize(ts);
  rows.forEach((row, i) => {
    const yy = r.y + 6 + i * lh;
    fill(FP.tok('text'));
    textStyle(NORMAL);
    text(row[0], r.x + 8, yy);
    textStyle(BOLD);
    fill(show ? FP.tok('primary') : FP.tok('text-muted'));
    text(row[1], r.x + 12 + textWidth(row[0]), yy);
  });
  textStyle(NORMAL);
}

function drawPanel(p, st, wide) {
  K.panel(p.x, p.y, p.w, p.h);
  const tx = p.x + 10, tw = p.w - 20;
  const avail = p.h - 16;
  const content = (ts, dry) => panelContent(tx, p.y + 8, tw, ts, st, dry) - (p.y + 8);
  const ts = K.fitTextSize(t => content(t, true), avail, wide ? 15 : 14, 12);
  panelContent(tx, p.y + 8, tw, ts, st, false, avail);
}

// Draws (or, with dry, measures) the challenge or Explore text; returns the y below it.
function panelContent(x, y, w, ts, st, dry, maxH) {
  const lead = round(ts * 1.3);
  const gap = 6;
  const yMax = maxH != null ? y + maxH : Infinity;
  textSize(ts);
  noStroke();
  textAlign(LEFT, TOP);
  const para = (str, col, bold) => {
    if (bold) { textStyle(BOLD); }
    const left = floor((yMax - y) / lead);
    if (left < 1) { textStyle(NORMAL); return; }
    if (!dry) { fill(col); }
    y = K.wrapText(str, x, y, w, lead, { dryRun: dry, maxLines: isFinite(left) ? left : undefined }) + gap;
    textStyle(NORMAL);
  };
  const box = (msg, kind) => {
    const text2 = (kind === 'info' ? 'ℹ ' : '') + msg;
    const h = K.countLines(text2, w - 12) * lead + 10;
    if (!dry) {
      const ok = kind === 'ok', bad = kind === 'bad';
      K.panel(x - 4, y - 2, w + 8, h, {
        fill: ok ? '--fp-correct-bg' : (bad ? '--fp-incorrect-bg' : '--fp-info-bg'),
        stroke: ok ? '--fp-correct' : (bad ? '--fp-incorrect' : '--fp-border'),
        dashed: bad, weight: ok || bad ? 2 : 1, radius: 6
      });
      fill(ok ? FP.tok('correct') : (bad ? FP.tok('incorrect') : FP.tok('text')));
      K.wrapText(text2, x + 2, y + 3, w - 12, lead);
    }
    y += h + gap;
  };

  if (!st.explore) {
    para('Challenge ' + (st.index + 1) + ' of ' + ITEMS.length, FP.tok('text'), true);
    para(st.item.prompt, FP.tok('text'));
    if (feedback && feedback.message) { box(feedback.message, feedback.kind); }
    if (answerLine) { para(answerLine, FP.tok('text'), true); }
  } else {
    para(FP.msg.EXPLORE + ' (not scored)', FP.tok('text'), true);
    const s = runner.summary();
    para(s.lines[0], FP.tok('text'), true);
    para(s.lines[1], s.mastered ? FP.tok('primary') : FP.tok('text'), s.mastered);
    if (biggerFanNote) {
      box('Bigger fan sheave: fan speed went down.', 'info');
    } else {
      para('Change the motor speed or either sheave. Try enlarging the fan sheave and watch the fan ' +
        'speed, then make the motor sheave larger than the fan sheave.', FP.tok('text'));
    }
  }
  return y - gap;
}

function drawControlLabels(st, d) {
  const n = narrow();
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(n ? 14 : defaultTextSize);
  fill(FP.tok('text'));
  if (!st.explore) { text('Your answer:', 10, K.controlRow(0) + (answerInput.elt.offsetHeight || 28) / 2); }
  else {
    const t0 = n ? 'Change the motor speed or a sheave.' : 'Change the motor speed or either sheave; the drive updates at once.';
    text(t0, 10, K.controlRow(0) + 14);
  }

  const sx = 10 + (startOverButton.elt.offsetWidth || 90) + 12;
  const options = st.explore ? [FP.msg.EXPLORE + ': motor speed and sheaves unlocked', FP.msg.EXPLORE]
    : [st.exploreLabel, 'Controls unlock after challenge 3.'];
  fill(FP.tok('text-muted'));
  textSize(n ? 13 : 15);
  const maxW = canvasWidth - sx - 10;
  const mid = K.controlRow(1) + (startOverButton.elt.offsetHeight || 28) / 2;
  text(options.find(s => textWidth(s) <= maxW) || options[options.length - 1], sx, mid);

  textSize(n ? 14 : defaultTextSize);
  fill(st.explore ? FP.tok('text') : FP.tok('text-muted'));
  text(n ? 'Motor speed:' : 'Motor speed (nominal):', 10, K.controlLabel(2));
  text((n ? 'Motor sheave: ' : 'Motor sheave pitch: ') + round1(motorSlider.value()).toFixed(1) + ' in',
    10, K.controlLabel(3));
  text((n ? 'Fan sheave: ' : 'Fan sheave pitch: ') + round1(fanSlider.value()).toFixed(1) + ' in',
    10, K.controlLabel(4));
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
