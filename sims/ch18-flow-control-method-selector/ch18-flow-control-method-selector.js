// Flow Control Method Selector - p5.js MicroSim (Chapter 18: Inlets, Outlets and Flow Control)
// CANVAS_HEIGHT: 600
// Ten job cards in a shuffled order. For each, the learner recommends one of ten flow-control or
// backdraft devices, then picks the deciding job condition from three; a card is correct only when
// both match. Two attempts; wrong devices get a misconception hint chosen by the wrong answer.
// After card 10, a summary lists every card with the learner's device, the correct device and the
// Why text, and marks cards where the device was right but the condition was wrong.
// Built on the FanPedia kit: FP.CardDeck (shuffled cards, two attempts, wording, score, mastery),
// FP.rng (condition order), FP.p5 (layout, text, controls, keys).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js.

const K = FP.p5;
const SIM_ID = 'ch18-flow-control-method-selector';

let canvasWidth = 800;
const drawHeight = 485;
const controlHeight = K.controlHeightFor(3);
const canvasHeight = drawHeight + controlHeight;
const MASTERY = 8;

// ---------- Devices (the same ten for every card) ----------
const DEVICES = [
  ['A', 'Butterfly gravity damper'], ['B', 'Wall or ceiling gravity damper'], ['C', 'Manual damper'],
  ['D', 'Motorized damper'], ['E', 'Parallel blade outlet damper'], ['F', 'Opposed blade outlet damper'],
  ['G', 'Parallel blade inlet box damper'], ['H', 'External variable inlet vanes'],
  ['I', 'Speed control with a VFD'], ['J', 'EC motor speed controller']
];
const DEVICE_NAME = Object.fromEntries(DEVICES);

// ---------- Job cards (spec Content; illustrative) ----------
// ctrl: the job needs airflow changed while the fan runs (for the gravity/manual-damper hint)
const CARD_DATA = [
  { short: 'Roof upblast exhaust fan, off', device: 'A', ctrl: false,
    job: 'A roof-mounted upblast exhaust fan lets rain and outside air in when it is off.',
    cond: 'Upblast fan needs backdraft and weather protection when off',
    wrong: ['Needs airflow reduced while running', 'Needs a set balance point'],
    why: 'FanPedia describes the butterfly gravity damper as integral to roof-mounted upblast fans, preventing backdraft and providing weather protection when off.' },
  { short: 'Warehouse wall exhaust fans', device: 'B', ctrl: false,
    job: 'Wall exhaust fans in a warehouse let cold wind and snow blow in during winter, when they are off. Full airflow whenever they run.',
    cond: 'Backdraft and weather exclusion on a wall fan, no wiring wanted',
    wrong: ['Continuous modulation', 'Low-flow flutter'],
    why: 'Wall type gravity dampers open when the fan runs, close by gravity when it stops, and exclude rain and snow.' },
  { short: 'Supply fan set at commissioning', device: 'C', ctrl: false,
    job: 'A supply fan must be set to the airflow the balancer measured at commissioning and left there.',
    cond: 'Airflow set once and not changed in operation',
    wrong: ['Frequent reduction', 'Hot, dirty air'],
    why: 'Manual dampers are typically used to balance a system.' },
  { short: 'Outlet damper flutters at low flow', device: 'D', ctrl: false,
    job: 'An exhaust outlet damper opens only partway at low airflow, flutters and is noisy.',
    cond: 'Blades must be powered open at low flow',
    wrong: ['Infrequent modest reduction', 'Fan has an inlet box'],
    why: 'Motorized dampers power the blades open instead of relying on airflow, avoiding partial opening, flutter and noise at low flow.' },
  { short: 'Hot, dirty process fan, monthly trim', device: 'E', ctrl: true,
    job: 'A hot, particulate-laden process fan on a constant-speed motor needs modest trimming, between full open and about 80% open, a few times a month.',
    cond: 'Infrequent, modest reduction within full open to about 75% open, dirty hot air',
    wrong: ['Modulation across the full range', 'Reduced operation most hours'],
    why: 'FanPedia recommends outlet dampers for infrequent reduced operation and dirty or hot air, and parallel blades for modulation from full open to about 75% open, at the lowest cost.' },
  { short: 'Dryer, full-range modulation, no drive', device: 'F', ctrl: true,
    job: 'A drying process on a constant-speed fan needs a controller to vary airflow continuously from full flow to a small fraction. The owner has ruled out a drive.',
    cond: 'Modulation over the entire range with airflow following the actuator',
    wrong: ['Infrequent reduction only', 'Airflow set once'],
    why: 'Opposed blade dampers are recommended for modulation over the entire range and reduce volume in closer relationship to control arm movement, for about 10% more cost.' },
  { short: 'Fan with inlet box, reduced load', device: 'G', ctrl: true,
    job: 'A large centrifugal fan that already has an inlet box runs at reduced load often. The owner wants horsepower savings without changing the constant-speed motor.',
    cond: 'Fan already has an inlet box; pre-spin saves horsepower',
    wrong: ['Backdraft prevention', 'Airflow set once'],
    why: 'The inlet box damper pre-spins air in the direction of rotation, saving horsepower at reduced loads, and it fits the existing inlet box.' },
  { short: 'Contaminated 400°F air, open inlet', device: 'H', ctrl: true,
    job: 'An open-inlet fan handling a contaminated airstream at 400°F runs at reduced flow most of the day; the constant-speed motor must stay.',
    cond: 'Frequent reduction, contaminated air under 600°F, constant-speed motor',
    wrong: ['Airflow set once', 'Backdraft prevention'],
    why: 'External inlet vanes are used for contaminated or high-temperature airstreams up to 600°F and save horsepower by pre-spin.' },
  { short: 'Inverter-duty fan at 60-80% flow', device: 'I', ctrl: true,
    job: 'A large induction-motor fan with an inverter-duty motor runs at 60% to 80% flow for most of the year, and energy cost is the owner\'s top concern.',
    cond: 'Frequent large reductions; lowest power wanted; motor suits drive operation',
    wrong: ['Infrequent modest reduction', 'Backdraft prevention'],
    why: 'Speed control uses the least power at reduced flow, and power falls with roughly the cube of airflow.' },
  { short: 'EC exhaust fans, 0-10V control', device: 'J', ctrl: true,
    job: 'Small direct-drive exhaust fans with second-generation EC motors must be set to design airflow at start-up, then follow a 0-10V signal from the building controls.',
    cond: 'EC motor; set speed and maximum speed, then switch to 0-10V mode',
    wrong: ['Hot dirty air', 'Fan has an inlet box'],
    why: 'The GridPoint EC motor controller switches between constant speed and 0-10V modes and sets operating and maximum speed.' }
];
const CARDS = CARD_DATA.map((c, i) => Object.assign({}, c, { id: i + 1, answer: c.device,
  answerText: DEVICE_NAME[c.device] }));

// Spec hints for a wrong device, chosen by the wrong answer
const HINT_GRAVITY = 'Gravity and manual dampers cannot change airflow while the fan runs.';
const HINT_SPEED = 'Speed control saves the most power, but this reduction is infrequent; the least expensive device that fits is the answer.';
const HINT_RANGE = 'Check how far the airflow must be modulated: parallel blades are recommended from full open to about 75% open, opposed blades over the entire range.';
function deviceHint(card, device) {
  if (card.ctrl && ['A', 'B', 'C'].indexOf(device) >= 0) { return HINT_GRAVITY; }
  if (card.id === 5 && device === 'I') { return HINT_SPEED; }
  if ((card.id === 6 && device === 'E') || (card.id === 5 && device === 'F')) { return HINT_RANGE; }
  return card.why;
}
const HINT_CONDITION = 'Your device is right, but that is not the condition that decides it. Which job condition makes this device the fit?';

const isRight = (card, ch) => ch.device === card.device && ch.cond === card.cond;
const deck = new FP.CardDeck({
  cards: CARDS, shuffle: true, attempts: 2, retryMissed: false,
  noun: 'Recommendations', mastery: MASTERY,
  check: isRight,
  reviewPointer: 'Read the Why text for the missed cards, then press Start over',
  messages: {
    correct: res => FP.msg.OK + ' Recommended: ' + res.card.answerText + '. ' + res.card.why,
    retry: res => FP.msg.tryAgain(res.chosen.device === res.card.device ? HINT_CONDITION
      : deviceHint(res.card, res.chosen.device), res.attemptsLeft),
    missed: res => FP.msg.BAD + ' Not quite. Recommended: ' + res.card.answerText + '; deciding condition: ' +
      res.card.cond + '. ' + res.card.why + ' This one counts as missed.'
  },
  id: SIM_ID
});

// ---------- State ----------
let condOrder = [];          // the three conditions for the current card, shuffled
let feedback = null;         // {kind, message, chosen}
let notice = '';
let firstTry = {};           // card id -> {device, cond, deviceOk, condOk} on the first attempt
let reviewId = null;         // summary: card whose Why is shown

// ---------- Controls ----------
let deviceSelect, condSelect, checkButton, nextButton, startOverButton, reviewSelect;

const keys = K.keys.bind({ Enter: onEnter });
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  const main = document.querySelector('main');

  deviceSelect = createSelect();
  deviceSelect.option('Choose a device…', '');
  for (const d of DEVICES) { deviceSelect.option(d[0] + '. ' + d[1], d[0]); }
  deviceSelect.parent(main);
  deviceSelect.attribute('aria-label', 'Recommended device');
  deviceSelect.changed(onDevice);

  condSelect = createSelect();
  condSelect.parent(main);
  condSelect.attribute('aria-label', 'Deciding condition');
  condSelect.changed(() => { notice = ''; FP.announce('Deciding condition: ' + condSelect.value() + '.'); });

  checkButton = K.button(FP.msg.CHECK, check);
  nextButton = K.button('Next card', nextCard);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  reviewSelect = createSelect();
  reviewSelect.parent(main);
  reviewSelect.attribute('aria-label', 'Review a card');
  reviewSelect.changed(() => {
    reviewId = Number(reviewSelect.value());
    const c = CARDS[reviewId - 1];
    FP.announce('Card ' + c.id + ': ' + c.short + '. Recommended: ' + c.answerText + '. ' + c.why);
  });

  newCard();
  updateControls();

  describe('Flow control method selector. Ten illustrative job cards, in a shuffled order, describe a fan ' +
    'and an airflow need. The learner recommends one of ten devices, from gravity dampers to a VFD or EC motor ' +
    'controller, then chooses the deciding job condition from three, and presses Check. Device and condition ' +
    'are marked separately. After card 10 a summary lists every card with the learner device, the correct ' +
    'device and the reason, and marks cards where the device was right but the condition was wrong.');
}

// ---------- Flow ----------
function newCard() {
  const c = deck.state().card;
  condOrder = FP.rng.shuffle([c.cond].concat(c.wrong));
  deviceSelect.selected('');
  fillConditions();
}

function fillConditions() {
  condSelect.elt.innerHTML = '';
  condSelect.option('Choose the deciding condition…', '');
  condOrder.forEach((t, i) => condSelect.option('abc'[i] + '. ' + t, t));
  condSelect.selected('');
}

function onDevice() {
  const st = deck.state();
  if (st.phase !== 'choose') { return; }
  notice = '';
  updateControls();
  const d = deviceSelect.value();
  if (d) {
    FP.announce('Device ' + d + ', ' + DEVICE_NAME[d] + '. Now choose the deciding condition: ' +
      condOrder.map((t, i) => 'abc'[i] + ', ' + t).join('; ') + '.');
  }
}

function check() {
  const st = deck.state();
  if (st.phase !== 'choose') { return; }
  const choice = { device: deviceSelect.value(), cond: condSelect.value() };
  if (!choice.device) { notice = 'Choose a device first.'; FP.announce(notice); return; }
  if (!choice.cond) { notice = 'Choose the deciding condition.'; FP.announce(notice); return; }
  notice = '';
  const card = st.card;
  if (st.attempt === 1) {
    firstTry[card.id] = { device: choice.device, cond: choice.cond,
      deviceOk: choice.device === card.device, condOk: choice.cond === card.cond };
  }
  const res = deck.place(choice);
  feedback = { kind: res.kind, message: res.message, chosen: choice, status: res.status };
  updateControls();
  const marks = 'Device ' + (choice.device === card.device ? 'right' : 'wrong') + ', condition ' +
    (choice.cond === card.cond ? 'right' : 'wrong') + '. ';
  FP.announce(marks + res.message);
  if (res.locked) { nextButton.elt.focus(); }
}

function nextCard() {
  if (deck.state().phase !== 'feedback') { return; }
  deck.next();
  feedback = null;
  notice = '';
  const st = deck.state();
  if (st.phase === 'summary') {
    reviewId = deck.order[0].id;
    fillReview();
    updateControls();
    const s = deck.summary();
    FP.announce(scoreLabel() + '. ' + s.lines.join(' ') + ' Use Review card to read the reason for any card.');
    reviewSelect.elt.focus();
  } else {
    newCard();
    updateControls();
    FP.announce('Card ' + (st.index + 1) + ' of ' + CARDS.length + '. ' + st.card.job +
      ' Which device would you recommend for this job?');
    deviceSelect.elt.focus();
  }
}

function startOver() {
  deck.newRound();
  feedback = null;
  notice = '';
  firstTry = {};
  reviewId = null;
  newCard();
  updateControls();
  const st = deck.state();
  FP.announce('Started over. Card 1 of ' + CARDS.length + '. ' + st.card.job);
  deviceSelect.elt.focus();
}

function onEnter() {
  const st = deck.state();
  if (st.phase === 'choose') { check(); } else if (st.phase === 'feedback') { nextCard(); }
}

function fillReview() {
  reviewSelect.elt.innerHTML = '';
  deck.order.forEach((c, i) => reviewSelect.option('Review card ' + (i + 1) + ': ' + c.short, String(c.id)));
  reviewSelect.selected(String(reviewId));
}

// "Recommendations correct: n of 10" counts first-attempt cards with both selections right (spec)
function scoreLabel() { return FP.msg.score('Recommendations', deck.score.firstAttempt(), CARDS.length); }

// ---------- Controls ----------
function updateControls() {
  const st = deck.state();
  const summary = st.phase === 'summary';
  const choosing = st.phase === 'choose';
  for (const c of [deviceSelect, condSelect, checkButton, nextButton]) { if (summary) { c.hide(); } else { c.show(); } }
  if (summary) { reviewSelect.show(); } else { reviewSelect.hide(); }
  K.setEnabled(deviceSelect, choosing);
  // the condition choices appear only after a device is chosen
  if (!summary && !deviceSelect.value()) { condSelect.hide(); }
  K.setEnabled(condSelect, choosing);
  K.setEnabled(checkButton, choosing);
  K.setEnabled(nextButton, st.phase === 'feedback');
  const label = st.isLast ? 'See summary' : 'Next card';
  nextButton.html(label);
  positionControls();
}

function positionControls() {
  const narrow = canvasWidth < 480;
  const lx = narrow ? 10 : 110;
  const w = canvasWidth - lx - 10;
  for (const s of [deviceSelect, condSelect, reviewSelect]) { s.style('width', w + 'px'); }
  deviceSelect.position(lx, K.controlRow(0));
  condSelect.position(lx, K.controlRow(1));
  reviewSelect.position(lx, K.controlRow(0));
  K.flowButtons(2, [checkButton, nextButton, null, startOverButton], { x: lx });
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  let y = K.title('Flow Control Method Selector');
  const st = deck.state();
  const summary = st.phase === 'summary';
  const right = summary ? 'Summary' : 'Card ' + (st.index + 1) + ' of ' + CARDS.length +
    (st.phase === 'choose' ? ' · ' + st.attemptLabel : '');
  y = K.statusLine(scoreLabel(), right, null, { y: y - 4 });
  K.note(canvasWidth >= 560 ? ['Illustrative job cards', 'Source: FanPedia pp. 68, 70, 139, 181–183, 188',
    'Enter checks or goes on'] : ['Illustrative', 'Source: FanPedia pp. 139, 181–183']);

  const top = y + 2, bottom = drawHeight - 24;
  const wide = canvasWidth >= 640;
  let A, B = null;
  if (wide) {
    const leftW = Math.round(canvasWidth * (summary ? 0.58 : 0.62));
    A = { x: 10, y: top, w: leftW - 15, h: bottom - top };
    B = { x: leftW + 5, y: top, w: canvasWidth - leftW - 15, h: bottom - top };
  } else if (summary) {
    const bh = 160;
    A = { x: 8, y: top, w: canvasWidth - 16, h: bottom - top - bh - 6 };
    B = { x: 8, y: bottom - bh, w: canvasWidth - 16, h: bh };
  } else {
    A = { x: 8, y: top, w: canvasWidth - 16, h: bottom - top };
  }
  K.panel(A.x, A.y, A.w, A.h);
  if (B) { K.panel(B.x, B.y, B.w, B.h); }
  if (summary) { drawSummary(A); drawReview(B); } else { drawCard(A, st); if (B) { drawDevices(B, st); } }
  drawControlLabels(summary);
}

function paras(list, x, y, w, ts, dry) {
  for (const p of list) {
    const s = p.size ? Math.max(12, ts + p.size) : ts;
    const lead = Math.round(s * 1.3);
    y += p.gap || 0;
    textSize(s);
    textStyle(p.bold ? BOLD : NORMAL);
    if (p.box) {
      const pad = 6;
      const h = K.countLines(p.t, w - 2 * pad) * lead + 2 * pad;
      if (!dry) {
        const ok = p.box === 'ok', bad = p.box === 'bad';
        K.panel(x - 2, y, w + 4, h, {
          fill: ok ? '--fp-correct-bg' : (bad ? '--fp-incorrect-bg' : '--fp-info-bg'),
          stroke: ok ? '--fp-correct' : (bad ? '--fp-incorrect' : '--fp-border'),
          dashed: bad, weight: ok || bad ? 2 : 1, radius: 6
        });
        noStroke();
        fill(ok ? FP.tok('correct') : (bad ? FP.tok('incorrect') : FP.tok('text')));
        K.wrapText(p.t, x + pad, y + pad, w - 2 * pad, lead);
      }
      y += h;
    } else {
      if (!dry) { noStroke(); fill(p.color || FP.tok('text')); }
      y = K.wrapText(p.t, x, y, w, lead, { dryRun: dry });
    }
  }
  textStyle(NORMAL);
  return y;
}

function fitParas(list, box, max) {
  const x = box.x + 10, y = box.y + 8, w = box.w - 20, h = box.h - 14;
  textAlign(LEFT, TOP);
  const ts = K.fitTextSize(t => paras(list, x, y, w, t, true) - y, h, max || 16, 12);
  paras(list, x, y, w, ts, false);
}

function mark(ok) { return ok ? FP.msg.OK : FP.msg.BAD; }

function drawCard(box, st) {
  const c = st.card;
  const list = [
    { t: 'Job card ' + (st.index + 1) + ' of ' + CARDS.length, bold: true },
    { t: c.job, gap: 4 },
    { t: 'Which device would you recommend for this job?', bold: true, gap: 8 }
  ];
  const dev = deviceSelect.value();
  const checked = feedback !== null;
  if (dev) {
    const devOk = checked ? feedback.chosen.device === c.device : null;
    const devText = 'Device: ' + dev + '. ' + DEVICE_NAME[dev];
    list.push({ t: (checked && feedback.chosen.device === dev ? mark(devOk) + ' ' : '') + devText, gap: 4,
      color: checked && feedback.chosen.device === dev ? FP.tok(devOk ? 'correct' : 'incorrect') : FP.tok('primary') });
    list.push({ t: 'Which condition decided it?', bold: true, gap: 6 });
    const cond = condSelect.value();
    condOrder.forEach((t, i) => {
      const chosenNow = cond === t;
      const judged = checked && feedback.chosen.cond === t;
      const ok = t === c.cond;
      let prefix = chosenNow ? '▸ ' : '   ';
      if (judged) { prefix = mark(ok) + ' '; }
      if (st.phase === 'feedback' && ok && !judged) { prefix = FP.msg.OK + ' '; }
      list.push({ t: prefix + 'abc'[i] + '. ' + t, gap: 2, bold: chosenNow || judged,
        color: judged ? FP.tok(ok ? 'correct' : 'incorrect') :
          (st.phase === 'feedback' && ok ? FP.tok('correct') : (chosenNow ? FP.tok('primary') : FP.tok('text'))) });
    });
  } else {
    list.push({ t: 'Choose a device in the list below; the three deciding conditions then appear.',
      color: FP.tok('text-muted'), gap: 4 });
  }
  if (notice) { list.push({ t: 'ℹ ' + notice, color: FP.tok('primary-dark'), gap: 6 }); }
  if (feedback) { list.push({ t: feedback.message, box: feedback.kind, gap: 8 }); }
  fitParas(list, box, 16);
}

function drawDevices(box, st) {
  const c = st.card;
  const list = [{ t: 'Devices', bold: true }];
  const locked = st.phase === 'feedback';
  const chosen = feedback ? feedback.chosen.device : deviceSelect.value();
  for (const d of DEVICES) {
    const isChosen = chosen === d[0];
    const isAns = locked && c.device === d[0];
    let prefix = '   ';
    if (isAns) { prefix = FP.msg.OK + ' '; } else if (feedback && isChosen) { prefix = FP.msg.BAD + ' '; } else if (isChosen) { prefix = '▸ '; }
    list.push({ t: prefix + d[0] + '. ' + d[1], gap: 3, bold: isChosen || isAns,
      color: isAns ? FP.tok('correct') : (feedback && isChosen ? FP.tok('incorrect') : (isChosen ? FP.tok('primary') : FP.tok('text'))) });
  }
  fitParas(list, box, 15);
}

function drawSummary(box) {
  const s = deck.summary();
  const wide = canvasWidth >= 640;
  const x = box.x + 10, w = box.w - 20;
  noStroke();
  textAlign(LEFT, TOP);
  fill(FP.tok('text'));
  textStyle(BOLD);
  textSize(wide ? 15 : 13);
  let y = K.wrapText(s.lines[0], x, box.y + 8, w, wide ? 19 : 16);
  fill(s.mastered ? FP.tok('primary') : FP.tok('text'));
  y = K.wrapText(s.lines[1], x, y, w, wide ? 19 : 16, { maxLines: 2 });
  textStyle(NORMAL);
  y += 4;
  const rows = deck.placements;
  const rowH = Math.min(wide ? 30 : 26, (box.y + box.h - 8 - y - 16) / rows.length);
  textSize(12);
  fill(FP.tok('text-muted'));
  text(wide ? '✓ right first time · ½ device right, condition wrong · ✗ device wrong · 2nd = solved on attempt 2'
    : '✓ right · ½ condition wrong · ✗ device wrong', x, y);
  y += 16;
  rows.forEach((p, i) => {
    const c = p.card;
    const f = firstTry[c.id] || {};
    const sym = f.deviceOk && f.condOk ? FP.msg.OK : (f.deviceOk ? '½' : FP.msg.BAD);
    const yy = y + i * rowH;
    if (reviewId === c.id) { fill(FP.tok('primary-bg')); rect(x - 4, yy - 2, w + 8, rowH - 1, 4); }
    const ok = sym === FP.msg.OK;
    fill(ok ? FP.tok('correct') : (sym === '½' ? FP.tok('accent-text') : FP.tok('incorrect')));
    textStyle(BOLD);
    textSize(wide ? 14 : 13);
    text(sym, x, yy);
    fill(FP.tok('text'));
    textSize(wide ? 13 : 12);
    const line1 = (i + 1) + '. ' + c.short;
    const line2 = 'You: ' + f.device + ' (' + DEVICE_NAME[f.device] + ')' + (p.attempts === 2 ? ', 2nd: ' + p.chosen.device : '') +
      ' · Correct: ' + c.device;
    text(fitStr(line1, w - 20), x + 18, yy);
    textStyle(NORMAL);
    fill(FP.tok('text-muted'));
    textSize(12);
    if (rowH >= 24) { text(fitStr(line2, w - 20), x + 18, yy + (wide ? 15 : 13)); }
  });
}

function fitStr(s, w) {
  if (textWidth(s) <= w) { return s; }
  while (s.length > 4 && textWidth(s + '…') > w) { s = s.slice(0, -1); }
  return s + '…';
}

function drawReview(box) {
  const c = CARDS[(reviewId || 1) - 1];
  const f = firstTry[c.id] || {};
  const list = [
    { t: 'Card: ' + c.short, bold: true },
    { t: 'Correct device: ' + c.device + '. ' + c.answerText, color: FP.tok('correct'), gap: 4 },
    { t: 'Your first device: ' + (f.device ? f.device + (canvasWidth >= 640 ? '. ' + DEVICE_NAME[f.device] : '') : '—'), gap: 2 },
    { t: 'Deciding condition: ' + c.cond, gap: 4 },
    { t: 'Why: ' + c.why, gap: 4 }
  ];
  if (f.deviceOk && !f.condOk) {
    list.push({ t: '½ Device right, condition wrong on the first attempt.', color: FP.tok('accent-text'), bold: true, gap: 4 });
  }
  fitParas(list, box, canvasWidth >= 640 ? 15 : 14);
}

function drawControlLabels(summary) {
  if (canvasWidth < 480) { return; }
  noStroke();
  fill(FP.tok('text'));
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(15);
  if (summary) { text('Review:', 10, K.controlRow(0) + 14); }
  else {
    text('Device:', 10, K.controlRow(0) + 14);
    if (deviceSelect.value()) { text('Condition:', 10, K.controlRow(1) + 14); }
  }
  textStyle(NORMAL);
}

// ---------- Responsive sizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
