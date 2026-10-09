// Fan Power and Efficiency Calculator - p5.js MicroSim (Chapter 10: Fan Performance, Curves and Ratings)
// CANVAS_HEIGHT: 640
// Three challenges (BHP, BHP, static efficiency) answered by typing a number, then Explore mode:
// airflow, fan static pressure and static efficiency sliders with live air power and BHP readouts.
// Built on the FanPedia kit: FP.ChallengeRunner (challenge flow, score, mastery; spec wording via
// `messages`), FP.models (air power, BHP, efficiency), FP.p5 (layout, text, controls, keys).
//   Air power (hp) = Q x FSP / 6356     BHP = air power / (static efficiency / 100)
//   Static efficiency (%) = 100 x air power / BHP
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js, fan-models.js
// (load them before this file, also in the p5.js editor).

const K = FP.p5;
const M = FP.models;
const SIM_ID = 'ch10-fan-power-efficiency-calculator';

// ---------- Canvas layout ----------
let canvasWidth = 800;
const drawHeight = 455;
const controlHeight = K.controlHeightFor(5);   // answer row, Start over row, 3 slider rows
const canvasHeight = drawHeight + controlHeight;
const defaultTextSize = 16;
const DATA_NOTE = FP.msg.note(FP.msg.ILLUSTRATIVE, 'standard US fan units, constant 6,356');

// ---------- Challenges (fixed order, two attempts each; spec feedback text) ----------
// Model answers are rounded as the spec's Rules say: two decimals for hp, one for percent.
const R = M.round;
const CHALLENGE_DATA = [
  {
    id: 'bhp-10000-cfm',
    prompt: 'A fan moves 10,000 CFM at 4.0 in. wg with 70% static efficiency. ' +
            'How much power does its shaft need?',
    q: 10000, p: 4.0, eff: 70, asked: 'bhp',
    unit: 'BHP', decimals: 2,
    model: R(M.brakeHp(10000, 4.0, 0.70), 2),
    wrong: 'Air power is 10,000 × 4.0 ÷ 6356 = 6.29 hp; divide by 0.70 to get 8.99 BHP. ' +
           'BHP is larger than air power.'
  },
  {
    id: 'bhp-20000-cfm',
    prompt: 'A fan moves 20,000 CFM at 6.0 in. wg with 75% static efficiency. ' +
            'How much power does its shaft need?',
    q: 20000, p: 6.0, eff: 75, asked: 'bhp',
    unit: 'BHP', decimals: 2,
    model: R(M.brakeHp(20000, 6.0, 0.75), 2),
    wrong: 'Air power is 20,000 × 6.0 ÷ 6356 = 18.88 hp; divide by 0.75 to get 25.17 BHP. ' +
           'Enter efficiency as a decimal.'
  },
  {
    id: 'efficiency-5000-cfm',
    prompt: 'A fan moves 5,000 CFM at 2.0 in. wg and its shaft takes 2.5 BHP. ' +
            'What is its static efficiency, in percent?',
    q: 5000, p: 2.0, bhp: 2.5, asked: 'eff',
    unit: '%', decimals: 1, answerText: null,
    model: R(100 * M.efficiency(5000, 2.0, 2.5), 1),
    wrong: 'Air power is 5,000 × 2.0 ÷ 6356 = 1.57 hp; 1.57 ÷ 2.5 = 0.629, or 62.9%.'
  }
];

// "Correct: <model value>." uses the model value with its unit (62.9% has no space).
function modelText(item) {
  return item.unit === '%' ? FP.fmt.num(item.model, item.decimals) + '%'
    : FP.fmt.num(item.model, item.decimals) + ' ' + item.unit;
}

// Extra line for misconception 2: an answer about 100 times too small.
function slipHint(value, item) {
  if (!(value > 0) || Math.abs(value * 100 - item.model) / item.model > 0.05) { return ''; }
  return item.asked === 'eff'
    ? ' Give the efficiency in percent (62.9, not 0.629).'
    : ' Check that efficiency was entered as a decimal (0.70, not 70).';
}

const ITEMS = CHALLENGE_DATA.map(c => Object.assign({}, c, { answerText: modelText(c), why: c.wrong }));

const runner = new FP.ChallengeRunner({
  items: ITEMS,
  attempts: 2,
  tolerance: { rel: 0.02 },
  noun: 'Challenges',
  mastery: ITEMS.length,
  reviewPointer: 'Press Start over to try the three challenges again',
  messages: {
    correct: res => FP.msg.correct(res.item.answerText),
    retry: res => FP.msg.tryAgain(res.item.wrong + slipHint(res.value, res.item), res.attemptsLeft),
    missed: res => FP.msg.missed(res.item.answerText, res.item.wrong + slipHint(res.value, res.item))
  },
  id: SIM_ID
});

// ---------- State ----------
let feedback = null;          // {kind: 'ok'|'bad'|'info', message}
let answerLine = '';          // "Your answer ... · Model ..." after a challenge resolves

// ---------- Controls ----------
let answerInput, checkButton, nextButton, startOverButton;
let qSlider, pSlider, effSlider;

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
  nextButton = K.button('Next challenge', nextChallenge);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  qSlider = createSlider(1000, 50000, 10000, 500);
  qSlider.parent(main);
  qSlider.attribute('aria-label', 'Airflow volume Q in CFM');
  pSlider = createSlider(0.5, 15.0, 4.0, 0.1);
  pSlider.parent(main);
  pSlider.attribute('aria-label', 'Fan static pressure in inches water gauge');
  effSlider = createSlider(40, 90, 70, 1);
  effSlider.parent(main);
  effSlider.attribute('aria-label', 'Static efficiency in percent');

  syncControls();

  describe('Fan power and efficiency calculator. Three challenges give an airflow, a fan static ' +
    'pressure and either a static efficiency or a brake horsepower; the learner types the brake ' +
    'horsepower or the static efficiency and presses Check. After each answer the sim shows the ' +
    'model value, the three-line calculation and two bars comparing air power with brake horsepower. ' +
    'After the challenges, Explore mode unlocks sliders for airflow, static pressure and static ' +
    'efficiency with live air power and BHP readouts.');
}

// ---------- Control state and layout ----------
function exploring() { return runner.state().explore; }

function syncControls() {
  const st = runner.state();
  const asking = st.phase === 'question';
  const resolved = st.phase === 'resolved';
  if (st.explore) {
    answerInput.hide(); checkButton.hide(); nextButton.hide();
  } else {
    answerInput.show();
    K.setEnabled(answerInput, asking);
    if (asking) { checkButton.show(); nextButton.hide(); } else { checkButton.hide(); nextButton.show(); }
    const short = canvasWidth < 400;   // keep the button on one line beside the answer box
    nextButton.html(resolved && st.isLast ? (short ? 'Explore' : 'Start exploring') : (short ? 'Next' : 'Next challenge'));
  }
  for (const s of [qSlider, pSlider, effSlider]) { K.setEnabled(s, st.explore); }
  positionControls();
}

function narrowControls() { return canvasWidth < 480; }
function sliderLeft() { return narrowControls() ? 160 : 270; }
function inputX() { return narrowControls() ? 102 : 120; }
function unitGap() { return 44; }   // room for the "BHP" / "%" unit after the answer box

function positionControls() {
  const narrow = narrowControls();
  answerInput.size(narrow ? 76 : 110);
  answerInput.position(inputX(), K.controlRow(0));
  const bx = inputX() + (answerInput.elt.offsetWidth || 110) + unitGap();
  checkButton.position(bx, K.controlRow(0));
  nextButton.position(bx, K.controlRow(0));   // shares the Check slot; Check hides once resolved
  startOverButton.position(10, K.controlRow(1));
  const sw = K.sliderWidth(canvasWidth, sliderLeft(), 15);
  [qSlider, pSlider, effSlider].forEach((s, i) => {
    s.position(sliderLeft(), K.controlRow(2 + i));
    s.size(sw);
  });
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
    const raw = String(answerInput.value()).replace(/,/g, '').trim();
    const typedDecimals = Math.min(4, (raw.split('.')[1] || '').length);
    answerLine = 'Your answer: ' + FP.fmt.num(res.value, typedDecimals) + (item.unit === '%' ? '%' : ' ' + item.unit) +
      '  ·  Model: ' + item.answerText;
    syncControls();
    nextButton.elt.focus();
  }
}

function nextChallenge() {
  if (!runner.next()) { return; }
  feedback = null;
  answerLine = '';
  const st = runner.state();
  if (st.explore) {
    syncControls();
    const s = runner.summary();
    FP.announce(s.lines.join(' ') + ' ' + FP.msg.EXPLORE + ': the airflow, pressure and efficiency sliders are unlocked.');
    effSlider.elt.focus();
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
  qSlider.value(10000); pSlider.value(4.0); effSlider.value(70);
  answerInput.value('');
  syncControls();
  FP.announce('Started over. Challenge 1 of ' + ITEMS.length + ': ' + ITEMS[0].prompt);
  answerInput.elt.focus();
}

// ---------- Model (FP.models) ----------
// The duty on show: the current challenge, or the Explore sliders.
function currentDuty() {
  const st = runner.state();
  if (st.explore) {
    const q = qSlider.value(), p = pSlider.value(), eff = effSlider.value();
    return { q, p, eff, air: M.airPowerHp(q, p), bhp: M.brakeHp(q, p, eff / 100), asked: null, reveal: true };
  }
  const it = st.item;
  const air = M.airPowerHp(it.q, it.p);
  const bhp = it.asked === 'bhp' ? M.brakeHp(it.q, it.p, it.eff / 100) : it.bhp;
  const eff = it.asked === 'eff' ? 100 * M.efficiency(it.q, it.p, it.bhp) : it.eff;
  return { q: it.q, p: it.p, eff, air, bhp, asked: it.asked, reveal: st.phase === 'resolved' };
}

// The three-line worked calculation shown once a challenge is resolved.
function calcLines(item) {
  const air = M.airPowerHp(item.q, item.p);
  const l1 = 'Air power = ' + FP.fmt.num(item.q) + ' × ' + FP.fmt.num(item.p, 1) + ' ÷ 6356 = ' +
    FP.fmt.num(air, 2) + ' hp';
  if (item.asked === 'bhp') {
    return [l1, 'BHP = ' + FP.fmt.num(air, 2) + ' ÷ ' + (item.eff / 100).toFixed(2) + ' = ' +
      FP.fmt.num(item.model, 2) + ' BHP', 'Result: ' + item.answerText + ' at the fan shaft'];
  }
  return [l1, 'Static efficiency = ' + FP.fmt.num(air, 2) + ' ÷ ' + FP.fmt.num(item.bhp, 1) + ' = ' +
    (item.model / 100).toFixed(3), 'Result: ' + item.answerText + ' static efficiency'];
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  const wide = canvasWidth >= 640;
  const duty = currentDuty();

  let left, right;
  if (wide) {
    const rightW = max(260, floor(canvasWidth * 0.38));
    left = { x: 10, y: 44, w: canvasWidth - rightW - 30, h: drawHeight - 44 - 26 };
    right = { x: canvasWidth - rightW - 10, y: 44, w: rightW, h: drawHeight - 44 - 26 };
  } else {
    left = { x: 8, y: 40, w: canvasWidth - 16, h: 270 };
    right = { x: 8, y: 40 + 270 + 5, w: canvasWidth - 16, h: drawHeight - (40 + 245 + 6) - 24 };
  }

  K.title('Fan Power and Efficiency Calculator');
  drawChallengeBox(left, wide);
  drawDutyPanel(right, duty, wide);
  K.note(canvasWidth < 420 ? FP.msg.ILLUSTRATIVE : DATA_NOTE);
  drawControlLabels(duty);
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
  text(runner.state().scoreLabel, tx, scoreY);
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
    if (answerLine) {
      para(answerLine, FP.tok('text'), { bold: true });
      for (const l of calcLines(st.item)) { para(l, FP.tok('text')); }
    }
  } else {
    para(FP.msg.EXPLORE + ' (not scored)', FP.tok('text'), { bold: true });
    const s = runner.summary();
    para(s.lines[0], FP.tok('text'), { bold: true });
    para(s.lines[1], s.mastered ? FP.tok('primary') : FP.tok('text'), { bold: s.mastered });
    const d = currentDuty();
    para('Static air power: ' + FP.fmt.num(d.air, 2) + ' hp', FP.tok('text'));
    para('BHP: ' + FP.fmt.num(d.bhp, 2) + ' hp', FP.tok('primary'), { bold: true });
    para('Equation: BHP = Q × FSP ÷ (6356 × static efficiency).', FP.tok('text'));
    para('Try it: at 10,000 CFM and 4.0 in. wg, lower the efficiency from 70% to 50% and watch ' +
      'BHP climb from 8.99 to 12.59 hp. A less efficient fan needs more power, not less.', FP.tok('text-muted'));
  }
  return y - gap;
}

// Right panel: the duty's numbers and two bars (air power, BHP with its losses).
function drawDutyPanel(b, d, wide) {
  K.panel(b.x, b.y, b.w, b.h);
  const ink = FP.tok('text');
  const fs = wide ? 14 : 13;
  const x0 = b.x + 10, x1 = b.x + b.w - 10;
  let y = b.y + 8;
  noStroke();
  fill(ink);
  textSize(fs);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text(exploring() ? 'Explore duty' : 'Challenge duty', x0, y);
  textStyle(NORMAL);
  y += fs + 8;

  const show = (v, txt) => (v ? txt : '?');
  const rows = [
    ['Airflow volume Q', FP.fmt.cfm(d.q)],
    ['Fan static pressure', FP.fmt.inwg(d.p, 1)],
    ['Static efficiency', show(d.asked !== 'eff' || d.reveal, FP.fmt.num(d.eff, 1) + '%')],
    ['Static air power', show(d.reveal, FP.fmt.num(d.air, 2) + ' hp')],
    ['Brake horsepower', show(d.asked !== 'bhp' || d.reveal, FP.fmt.num(d.bhp, 2) + ' BHP')]
  ];
  const rowH = 21;
  for (const r of (wide ? rows : [])) {   // narrow: the prompt already states the duty
    fill(ink);
    textAlign(LEFT, TOP);
    text(r[0], x0, y);
    textAlign(RIGHT, TOP);
    fill(r[1] === '?' ? FP.tok('text-muted') : ink);
    textStyle(r[1] === '?' ? BOLD : NORMAL);
    text(r[1], x1, y);
    textStyle(NORMAL);
    y += rowH;
  }

  // Bars
  y += wide ? 8 : -4;
  const barH = wide ? 22 : 16;
  const barGap = 16;
  const barX = x0, barW = x1 - x0;
  if (y + 2 * (barGap + barH) + 26 > b.y + b.h) { return; }
  if (!d.reveal) {
    fill(FP.tok('text-muted'));
    textAlign(LEFT, TOP);
    textSize(13);
    K.wrapText('The power bars appear after you check your answer.', x0, y, barW, 17);
    return;
  }
  // Fixed scale per duty: the BHP the same air power would need at 40% (the slider minimum),
  // so the BHP bar visibly grows as efficiency falls.
  const scaleMax = max(d.bhp, d.air / 0.40) * 1.02;
  const wAir = barW * d.air / scaleMax, wBhp = barW * d.bhp / scaleMax;
  textSize(13);
  textAlign(LEFT, BOTTOM);
  fill(ink);
  text('Air power (useful work): ' + FP.fmt.num(d.air, 2) + ' hp', barX, y + 14);
  y += 16;
  stroke(FP.tok('primary-dark'));
  fill(FP.tok('series-1'));
  rect(barX, y, wAir, barH);
  y += barH + 6;
  noStroke();
  fill(ink);
  text('BHP at the shaft' + (wide ? ' = air power + losses: ' : ': ') + FP.fmt.num(d.bhp, 2) + ' hp', barX, y + 14);
  y += 16;
  stroke(FP.tok('primary-dark'));
  fill(FP.tok('series-1'));
  rect(barX, y, wAir, barH);
  // Losses: hatched orange, so the split is not shown by colour alone
  fill(FP.tok('accent'));
  rect(barX + wAir, y, wBhp - wAir, barH);
  stroke(255);
  strokeWeight(1.5);
  push();   // p5 push/pop (not a bare context save) keeps p5's cached stroke and fill in step
  drawingContext.beginPath();
  drawingContext.rect(barX + wAir, y, wBhp - wAir, barH);
  drawingContext.clip();
  for (let hx = barX + wAir - barH; hx < barX + wBhp; hx += 7) { line(hx, y + barH, hx + barH, y); }
  pop();
  strokeWeight(1);
  y += barH + 4;
  noStroke();
  fill(ink);
  textAlign(LEFT, TOP);
  text('Losses: ' + FP.fmt.num(d.bhp - d.air, 2) + ' hp (friction, turbulence, leakage)', barX, y, barW);
}

function drawControlLabels(d) {
  const st = runner.state();
  const narrow = narrowControls();
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(narrow ? 14 : defaultTextSize);
  fill(FP.tok('text'));
  const rowMid0 = K.controlRow(0) + (answerInput.elt.offsetHeight || 28) / 2;
  if (!st.explore) {
    text('Your answer:', 10, rowMid0);
    const ux = inputX() + (answerInput.elt.offsetWidth || 110) + 6;
    text(st.item.unit, ux, rowMid0);
  }

  const sx = 10 + (startOverButton.elt.offsetWidth || 90) + 12;
  const options = st.explore ? [FP.msg.EXPLORE + ': sliders unlocked', FP.msg.EXPLORE]
    : [st.exploreLabel, 'Sliders unlock after challenge ' + ITEMS.length + '.'];
  fill(FP.tok('text-muted'));
  textSize(narrow ? 13 : 15);
  const maxW = canvasWidth - sx - 10;
  const rowMid1 = K.controlRow(1) + (startOverButton.elt.offsetHeight || 28) / 2;
  text(options.find(t => textWidth(t) <= maxW) || options[options.length - 1], sx, rowMid1);

  textSize(narrow ? 14 : defaultTextSize);
  fill(st.explore ? FP.tok('text') : FP.tok('text-muted'));
  const q = FP.fmt.num(qSlider.value()), p = FP.fmt.num(pSlider.value(), 1), e = effSlider.value();
  text((narrow ? 'Q: ' : 'Airflow volume Q: ') + q + ' CFM', 10, K.controlLabel(2));
  text((narrow ? 'FSP: ' : 'Fan static pressure: ') + p + ' in. wg', 10, K.controlLabel(3));
  text((narrow ? 'Static eff.: ' : 'Static efficiency: ') + e + '%', 10, K.controlLabel(4));
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
