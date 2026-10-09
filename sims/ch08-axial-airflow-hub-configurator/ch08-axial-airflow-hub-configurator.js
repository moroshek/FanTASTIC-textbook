// Axial Airflow and Hub Position Configurator - p5.js MicroSim (Chapter 8)
// CANVAS_HEIGHT: 587
// Eight axial fan orders: the learner commits a hub position (intake or discharge side)
// and a hub bore (standard or reverse) before the fan is drawn and animated. After order 8
// a free model unlocks: airflow code PM/MP and correct/reversed rotation.
// Rules (FanPedia PDF pp. 36-43, chapter "Hub on Intake Side and Hub on Discharge Side"):
//   PM = air through the impeller, then over the motor = hub on intake side = reverse bore hub
//   MP = air over the motor, then through the impeller = hub on discharge side = standard bore hub
//   Impeller hand and pitch type do not change the rule; reversible: standard flow MP, reverse flow PM.
//   Rotation is viewed from the discharge side; wrong rotation gives no airflow in the proper direction.
// Built on the FanPedia kit: FP.CardDeck (orders, score, mastery, wording), FP.p5 (layout,
// text, controls, keys), FD (airflow arrows, rotation arc, leader labels, part palette).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js, fan-drawings.js.

const K = FP.p5;
const SIM_ID = 'ch08-axial-airflow-hub-configurator';

let canvasWidth = 800;
const drawHeight = 472;
const controlHeight = K.controlHeightFor(3);   // hub side | hub bore | Check, Next, Start over
const canvasHeight = drawHeight + controlHeight;
const MASTERY = 7;

const HUB = { intake: 'Intake side', discharge: 'Discharge side' };
const BORE = { standard: 'Standard bore', reverse: 'Reverse bore' };
const QUESTION = 'Which side does the hub face, and which hub bore does this build use?';
const NO_FLOW = 'Wrong rotation: no airflow in the proper direction (FanPedia note 2).';
const SOURCE = 'Source: FanPedia PDF pp. 36–43';
const KEYS_HINT = 'Keys: I/D hub side, S/R bore, Enter check or next';

// The 8 orders, fixed order (spec table).
const ORDERS = [
  { text: 'Airflow = PM, adjustable pitch', hub: 'intake', bore: 'reverse',
    why: 'PM is air through the impeller then over the motor, also called hub on intake, built with a reverse bore hub.' },
  { text: 'Airflow = MP, fixed pitch cast', hub: 'discharge', bore: 'standard',
    why: 'MP is air over the motor then through the impeller, also called hub on discharge, built with a standard bore hub.' },
  { text: 'Air passes over the motor first, then through the impeller', hub: 'discharge', bore: 'standard',
    why: 'Motor first is MP, which is hub on discharge with a standard bore hub.' },
  { text: 'Air passes through the impeller first, then over the motor', hub: 'intake', bore: 'reverse',
    why: 'Impeller first is PM, which is hub on intake with a reverse bore hub.' },
  { text: 'Reversible impeller, standard flow', hub: 'discharge', bore: 'standard',
    why: 'FanPedia shows standard flow as MP, hub on discharge.' },
  { text: 'Reversible impeller, reverse flow', hub: 'intake', bore: 'reverse',
    why: 'FanPedia shows reverse flow as PM, hub on intake.' },
  { text: 'Right hand adjustable pitch impeller, airflow = MP', hub: 'discharge', bore: 'standard',
    why: 'Impeller hand does not change the rule: MP is a standard bore hub on the discharge side.' },
  { text: 'Left hand fixed cast impeller, airflow = PM', hub: 'intake', bore: 'reverse',
    why: 'Impeller hand does not change the rule: PM is a reverse bore hub on the intake side.' }
].map((o, i) => Object.assign(o, {
  id: 'order-' + (i + 1), number: i + 1,
  code: o.hub === 'intake' ? 'PM' : 'MP',
  answerText: HUB[o.hub] + ', ' + BORE[o.bore].toLowerCase()
}));

const CODE_INFO = {
  PM: { path: 'air through the impeller, then over the motor', hub: 'intake', bore: 'reverse' },
  MP: { path: 'air over the motor, then through the impeller', hub: 'discharge', bore: 'standard' }
};

// Spec wording: correct "Correct." + Why; incorrect "Not quite." + correct hub position and bore + Why.
const deck = new FP.CardDeck({
  cards: ORDERS, shuffle: false, attempts: 1, retryMissed: false,
  noun: 'Orders', mastery: MASTERY,
  reviewPointer: 'Reread "Hub on Intake Side and Hub on Discharge Side", then press Start over',
  check: (card, choice) => choice.hub === card.hub && choice.bore === card.bore,
  messages: {
    correct: res => FP.msg.OK + ' Correct. ' + res.card.why,
    missed: res => FP.msg.BAD + ' Not quite. The hub faces the ' + HUB[res.card.hub].toLowerCase() +
      ' and the build uses a ' + BORE[res.card.bore].toLowerCase() + ' hub. ' + res.card.why
  },
  id: SIM_ID
});

let mode = 'orders';           // 'orders' | 'free'
let choice = { hub: null, bore: null };
let feedback = null;           // {kind, message, chose}
let notice = '';

let hubButtons = {}, boreButtons = {};
let checkButton, nextButton, startOverButton;
let airflowSelect, rotationSelect;

const keys = K.keys.bind({
  i: () => pick('hub', 'intake'),
  d: () => pick('hub', 'discharge'),
  s: () => pick('bore', 'standard'),
  r: () => pick('bore', 'reverse'),
  Enter: onEnter
});
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  const mainEl = document.querySelector('main');

  for (const k of Object.keys(HUB)) {
    hubButtons[k] = K.button(HUB[k], () => pick('hub', k));
    hubButtons[k].addClass('choice');
    hubButtons[k].attribute('aria-pressed', 'false');
    hubButtons[k].attribute('aria-keyshortcuts', k === 'intake' ? 'I' : 'D');
  }
  for (const k of Object.keys(BORE)) {
    boreButtons[k] = K.button(BORE[k], () => pick('bore', k));
    boreButtons[k].addClass('choice');
    boreButtons[k].attribute('aria-pressed', 'false');
    boreButtons[k].attribute('aria-keyshortcuts', k === 'standard' ? 'S' : 'R');
  }
  checkButton = K.button(FP.msg.CHECK, checkOrder);
  nextButton = K.button('Next order', nextOrder);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  airflowSelect = createSelect();
  airflowSelect.option('PM: impeller, then motor', 'PM');
  airflowSelect.option('MP: motor, then impeller', 'MP');
  airflowSelect.parent(mainEl);
  airflowSelect.attribute('aria-label', 'Free model airflow code');
  airflowSelect.changed(announceFree);
  rotationSelect = createSelect();
  rotationSelect.option('Correct for the impeller', 'correct');
  rotationSelect.option('Reversed', 'reversed');
  rotationSelect.parent(mainEl);
  rotationSelect.attribute('aria-label', 'Free model rotation, viewed from the discharge side');
  rotationSelect.changed(announceFree);

  updateControls();

  describe('Axial airflow and hub position configurator. A side view of a direct-drive axial fan ' +
    'shows the tube, the motor and the impeller blades. For each of eight orders, choose whether the ' +
    'hub faces the intake side or the discharge side and whether the build uses a standard bore or a ' +
    'reverse bore hub, then press Check. The fan is then drawn with its hub and animated with air ' +
    'moving from intake to discharge, and feedback explains the rule. After order 8 a free model ' +
    'lets you switch the airflow code between PM and MP and reverse the rotation.');
}

// ---------- Controls ----------
function narrow() { return canvasWidth < 480; }
function labelCol() { return narrow() ? 52 : 110; }

function positionControls() {
  const x = labelCol();
  K.flowButtons(0, [hubButtons.intake, hubButtons.discharge], { x });
  K.flowButtons(1, [boreButtons.standard, boreButtons.reverse], { x });
  K.flowButtons(2, [checkButton, nextButton, '|', startOverButton]);
  const sx = narrow() ? 78 : 110;
  const sw = Math.max(150, Math.min(260, canvasWidth - sx - 10));
  airflowSelect.style('width', sw + 'px');
  rotationSelect.style('width', sw + 'px');
  airflowSelect.position(sx, K.controlRow(0));
  rotationSelect.position(sx, K.controlRow(1));
}

function updateControls() {
  const had = document.activeElement;
  const st = deck.state();
  const orders = mode === 'orders';
  const asking = orders && st.phase === 'choose';
  const answerButtons = [hubButtons.intake, hubButtons.discharge, boreButtons.standard, boreButtons.reverse];
  for (const b of answerButtons.concat([checkButton, nextButton])) { if (orders) b.show(); else b.hide(); }
  for (const s of [airflowSelect, rotationSelect]) { if (orders) s.hide(); else s.show(); }
  for (const k of Object.keys(HUB)) {
    hubButtons[k].attribute('aria-pressed', choice.hub === k ? 'true' : 'false');
    K.setEnabled(hubButtons[k], asking);
  }
  for (const k of Object.keys(BORE)) {
    boreButtons[k].attribute('aria-pressed', choice.bore === k ? 'true' : 'false');
    K.setEnabled(boreButtons[k], asking);
  }
  K.setEnabled(checkButton, asking);
  K.setEnabled(nextButton, orders && st.phase === 'feedback');
  const nextLabel = st.isLast ? 'Open free model' : 'Next order';
  nextButton.html(narrow() && st.isLast ? 'Free model' : nextLabel);
  nextButton.attribute('aria-label', nextLabel);
  positionControls();
  K.keepFocus(had, answerButtons.concat([checkButton, nextButton, airflowSelect, startOverButton]));
}

function pick(kind, value) {
  if (mode !== 'orders' || deck.state().phase !== 'choose') return;
  choice[kind] = value;
  notice = '';
  updateControls();
}

function onEnter() {
  if (mode !== 'orders') return;
  const st = deck.state();
  if (st.phase === 'choose') checkOrder();
  else if (st.phase === 'feedback') nextOrder();
}

function checkOrder() {
  const st = deck.state();
  if (mode !== 'orders' || st.phase !== 'choose') return;
  if (!choice.hub || !choice.bore) {
    notice = !choice.hub && !choice.bore ? 'Choose a hub position and a hub bore first.'
      : !choice.hub ? 'Choose a hub position (intake side or discharge side) first.'
        : 'Choose a hub bore (standard bore or reverse bore) first.';
    FP.announce(notice);
    return;
  }
  const res = deck.place({ hub: choice.hub, bore: choice.bore });
  if (res.status === 'ignored') return;
  feedback = { kind: res.kind, message: res.message,
    chose: 'You chose: ' + HUB[choice.hub] + ', ' + BORE[choice.bore].toLowerCase() + '.' };
  updateControls();
  FP.announce(feedback.chose + ' ' + res.message + ' ' + deck.state().scoreLabel + '.');
  nextButton.elt.focus();
}

function nextOrder() {
  const st = deck.state();
  if (mode !== 'orders' || st.phase !== 'feedback') return;
  deck.next();
  feedback = null;
  notice = '';
  choice = { hub: null, bore: null };
  if (deck.state().phase === 'summary') {
    mode = 'free';
    airflowSelect.selected('PM');
    rotationSelect.selected('correct');
    updateControls();
    const s = deck.summary();
    FP.announce(s.lines.join(' ') + ' Free model unlocked (Explore mode, not scored).');
    airflowSelect.elt.focus();
  } else {
    updateControls();
    const c = deck.state().card;
    FP.announce('Order ' + c.number + ' of ' + ORDERS.length + ': ' + c.text + '. ' + QUESTION);
    hubButtons.intake.elt.focus();
  }
}

function startOver() {
  deck.newRound();
  mode = 'orders';
  feedback = null;
  notice = '';
  choice = { hub: null, bore: null };
  updateControls();
  FP.announce('Started over. Order 1 of ' + ORDERS.length + ': ' + ORDERS[0].text + '. ' + QUESTION);
  hubButtons.intake.elt.focus();
}

function freeState() {
  return { code: airflowSelect.value(), rotation: rotationSelect.value() };
}

function announceFree() {
  const f = freeState();
  const info = CODE_INFO[f.code];
  FP.announce('Airflow ' + f.code + ': ' + info.path + '. Hub on ' + HUB[info.hub].toLowerCase() + ', ' +
    BORE[info.bore].toLowerCase() + ' hub. ' + (f.rotation === 'reversed' ? NO_FLOW
      : 'Rotation correct: air enters at the leading edges and leaves at the discharge.'));
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  const fullTitle = 'Axial Airflow and Hub Position Configurator';
  textStyle(BOLD); textSize(16);
  const fits = textWidth(fullTitle) <= canvasWidth - 20;
  textStyle(NORMAL);
  let y = K.title(fits ? fullTitle : 'Axial Hub Position Configurator');
  const st = deck.state();
  const right = mode === 'free' ? 'Free model (not scored)' : 'Order ' + (st.index + 1) + ' of ' + ORDERS.length;
  y = K.statusLine(st.scoreLabel, right, null, { y: y - 4 });
  textSize(13);
  const both = FP.msg.note(SOURCE, KEYS_HINT);
  K.note(textWidth(both) <= canvasWidth - 20 ? both : SOURCE);

  const top = y + 2, bottom = drawHeight - 22;
  let textBox, fanBox;
  if (canvasWidth >= 640) {
    const lw = Math.round(canvasWidth * 0.46);
    textBox = { x: 10, y: top, w: lw - 15, h: bottom - top };
    fanBox = { x: lw + 5, y: top, w: canvasWidth - lw - 15, h: bottom - top };
  } else {
    const fh = Math.min(158, Math.round((bottom - top) * 0.42));
    textBox = { x: 10, y: top, w: canvasWidth - 20, h: bottom - top - fh - 6 };
    fanBox = { x: 10, y: bottom - fh, w: canvasWidth - 20, h: fh };
  }
  K.panel(textBox.x, textBox.y, textBox.w, textBox.h);
  K.panel(fanBox.x, fanBox.y, fanBox.w, fanBox.h);
  if (mode === 'free') drawFreePanel(textBox); else drawOrderPanel(textBox);
  drawFan(fanBox, currentView());
  drawControlLabels();
}

function currentView() {
  if (mode === 'free') {
    const f = freeState();
    return { code: f.code, hub: true, flow: true, reversed: f.rotation === 'reversed' };
  }
  if (feedback) return { code: deck.state().card.code, hub: true, flow: true, reversed: false };
  return { code: null, hub: false, flow: false, reversed: false };
}

// Lays out [{t, bold, muted, color, gap, big, box}] paragraphs; returns the y below.
function paras(list, x, y, w, ts, dry) {
  textAlign(LEFT, TOP);
  noStroke();
  for (const p of list) {
    const s = p.big ? ts + 2 : p.small ? Math.max(12, ts - 2) : ts;
    textSize(s);
    textStyle(p.bold ? BOLD : NORMAL);
    y += p.gap || 0;
    const lh = Math.round(s * 1.3);
    if (p.box) {
      const pad = 7;
      const h = K.wrapText(p.t, x + pad, y + pad, w - 2 * pad, lh, { dryRun: true }) - y + pad - 2;
      if (!dry) {
        const ok = p.box === 'ok';
        K.panel(x - 2, y, w + 4, h, {
          fill: ok ? '--fp-correct-bg' : '--fp-incorrect-bg', stroke: ok ? '--fp-correct' : '--fp-incorrect',
          dashed: !ok, weight: 2, radius: 6
        });
        fill(FP.tok(ok ? 'correct' : 'incorrect'));
        K.wrapText(p.t, x + pad, y + pad, w - 2 * pad, lh);
      }
      y += h;
    } else {
      if (!dry) fill(p.color || FP.tok(p.muted ? 'text-muted' : 'text'));
      y = K.wrapText(p.t, x, y, w, lh, { dryRun: dry });
    }
  }
  textStyle(NORMAL);
  return y;
}

// Fits the paragraphs in the box (16 px down to 12 px); paragraphs marked {opt: true}
// are dropped, last first, when even 12 px does not fit.
function fitParas(list, box) {
  const x = box.x + 10, y = box.y + 8, w = box.w - 20, h = box.h - 14;
  let items = list.slice();
  const height = (l, t) => paras(l, x, y, w, t, true) - y;
  while (height(items, 12) > h && items.some(p => p.opt)) {
    const i = items.map(p => !!p.opt).lastIndexOf(true);
    items.splice(i, 1);
  }
  const ts = K.fitTextSize(t => height(items, t), h, 16, 12);
  paras(items, x, y, w, ts, false);
}

function drawOrderPanel(box) {
  const st = deck.state();
  const card = st.card;
  const list = [
    { t: 'Order ' + card.number + ' of ' + ORDERS.length, bold: true, muted: true, small: true },
    { t: card.text, bold: true, big: true, color: FP.tok('primary-dark'), gap: 2 },
    { t: QUESTION, gap: 6 }
  ];
  if (!feedback) {
    const hubTxt = choice.hub ? HUB[choice.hub] : '—';
    const boreTxt = choice.bore ? BORE[choice.bore] : '—';
    list.push({ t: 'Your answer: hub ' + hubTxt.toLowerCase() + ', ' + boreTxt.toLowerCase() + (choice.bore ? ' hub' : ''), muted: true, gap: 8 });
    if (notice) list.push({ t: 'ℹ ' + notice, color: FP.tok('primary-dark'), gap: 6 });
    list.push({ t: 'One scored attempt per order. ' + FP.msg.exploreLocked('order 8'), muted: true, small: true, gap: 8 });
  } else {
    list.push({ t: feedback.chose, muted: true, gap: 8 });
    list.push({ t: feedback.message, box: feedback.kind === 'ok' ? 'ok' : 'bad', gap: 4 });
    list.push({ t: 'Airflow ' + card.code + ': ' + CODE_INFO[card.code].path + '.', muted: true, gap: 6, opt: true });
  }
  fitParas(list, box);
}

function drawFreePanel(box) {
  const s = deck.summary();
  const f = freeState();
  const info = CODE_INFO[f.code];
  const missed = s.misses.map(m => m.card.number);
  const list = [
    { t: FP.msg.EXPLORE + ': free model (not scored)', bold: true },
    { t: s.lines[0], bold: true, gap: 4 },
    { t: s.lines[1], color: s.mastered ? FP.tok('primary-dark') : FP.tok('text') }
  ];
  if (missed.length) list.push({ t: 'Missed orders: ' + missed.join(', ') + '.', muted: true });
  list.push({ t: 'Airflow = ' + f.code + ': ' + info.path + '.', gap: 8, bold: true });
  list.push({ t: 'Hub on ' + HUB[info.hub].toLowerCase() + ', ' + BORE[info.bore].toLowerCase() + ' hub.' });
  if (f.rotation === 'reversed') {
    list.push({ t: FP.msg.BAD + ' ' + NO_FLOW, box: 'bad', gap: 6 });
  } else {
    list.push({ t: 'Rotation correct (viewed from the discharge side): air enters at the leading edges and leaves at the discharge.', gap: 4 });
  }
  list.push({ t: 'Switch PM and MP and watch the intake, discharge and hub labels move; then reverse the rotation.', muted: true, small: true, gap: 6, opt: true });
  fitParas(list, box);
}

// Side view of a direct-drive axial fan. The motor sits at the left of the tube and the
// impeller at the right; the hub boss is on the impeller face away from the motor.
// PM: air enters at the right (impeller first) and leaves at the left, so the hub faces the intake.
// MP: air enters at the left (motor first) and leaves at the right, so the hub faces the discharge.
function drawFan(box, v) {
  const pal = FD.palette();
  const compact = box.h < 200;
  if (!compact) {
    noStroke();
    fill(FP.tok('text'));
    textAlign(CENTER, TOP);
    textSize(15);
    textStyle(BOLD);
    text('Side view, direct-drive axial fan', box.x + box.w / 2, box.y + 6);
    textStyle(NORMAL);
  }

  const L = box.w * 0.7;
  const x0 = box.x + (box.w - L) / 2, x1 = x0 + L;
  const th = Math.min(box.h * (compact ? 0.36 : 0.42), L * 0.55);
  const cy = box.y + (compact ? 26 : 62) + th / 2;
  const wall = Math.max(5, th * 0.07);
  const t = millis() / 1000;
  const toRight = v.code === 'MP';          // air direction on screen
  const intakeX = toRight ? x0 : x1, dischargeX = toRight ? x1 : x0;

  // Tube (cut away: top and bottom walls)
  stroke(pal.edge); strokeWeight(1.5); fill(pal.metal);
  rect(x0, cy - th / 2, L, wall);
  rect(x0, cy + th / 2 - wall, L, wall);

  // Motor (left) with support and shaft to the impeller
  const mx0 = x0 + L * 0.12, mw = L * 0.34, mh = th * 0.42;
  stroke(pal.edge); strokeWeight(2);
  line(mx0 + mw * 0.5, cy + mh / 2, mx0 + mw * 0.5, cy + th / 2 - wall);
  const ix = x0 + L * 0.72;                 // impeller centre line
  stroke(pal.hub); strokeWeight(3);
  line(mx0 + mw, cy, ix - Math.max(10, L * 0.07) / 2, cy);
  stroke(pal.motorEdge); strokeWeight(1.5); fill(pal.motor);
  rect(mx0, cy - mh / 2, mw, mh, 5);
  noStroke(); fill(255); textAlign(CENTER, CENTER); textSize(compact ? 12 : 13);
  text('Motor', mx0 + mw / 2, cy);

  // Blades: top and bottom, leaning so the leading edge (thicker) faces the intake
  const hubH = th * 0.34, hubW = Math.max(10, L * 0.07);
  const tipR = th / 2 - wall - 3;
  const spin = v.flow && !v.reversed ? 1 : (v.flow && v.reversed ? -1 : 0);
  const phase = spin ? Math.floor(t * 6) % 2 : 0;
  const lead = v.code === null ? 0 : (toRight ? -1 : 1);   // leading edge side: -1 left, +1 right
  for (const side of [-1, 1]) {
    fill(phase ? pal.metalDark : pal.metalSide);
    stroke(pal.edge); strokeWeight(1.2);
    const r0 = hubH / 2, r1 = tipR;
    const lean = lead === 0 ? 0 : lead * side * 0.35;
    const w0 = hubW * 0.9, w1 = hubW * 1.3;
    beginShape();
    vertex(ix - w0 / 2, cy + side * r0);
    vertex(ix + w0 / 2, cy + side * r0);
    vertex(ix + w1 / 2 + lean * w1, cy + side * r1);
    vertex(ix - w1 / 2 + lean * w1, cy + side * r1);
    endShape(CLOSE);
    if (lead !== 0) {   // leading edge marked with a heavier line
      stroke(pal.text); strokeWeight(3);
      const ex0 = ix + lead * w0 / 2, ex1 = ix + lead * w1 / 2 + lean * w1;
      line(ex0, cy + side * r0, ex1, cy + side * r1);
    }
  }

  // Hub (with boss) or the empty hub position before the answer
  if (v.hub) {
    const bossDir = 1;                       // boss on the face away from the motor (right)
    stroke(pal.hub); strokeWeight(1.5); fill(pal.metalDark);
    rect(ix - hubW / 2, cy - hubH / 2, hubW, hubH, 3);
    push();
    drawingContext.shadowColor = pal.accent; drawingContext.shadowBlur = 10;
    stroke(pal.accent); strokeWeight(2.5); fill(pal.metalSide);
    arc(ix + bossDir * hubW / 2, cy, hubW * 1.4, hubH * 0.7, -HALF_PI, HALF_PI, CHORD);
    pop();
  } else {
    push();
    stroke(FP.tok('text-muted')); strokeWeight(1.5); noFill();
    drawingContext.setLineDash([4, 3]);
    rect(ix - hubW / 2 - 3, cy - hubH / 2 - 3, hubW + 6, hubH + 6, 4);
    pop();
    noStroke(); fill(FP.tok('text-muted')); textAlign(CENTER, CENTER); textSize(16); textStyle(BOLD);
    text('?', ix, cy);
    textStyle(NORMAL);
  }

  // End labels: Intake / Discharge (or ? before the answer)
  const labelY = cy - th / 2 - (compact ? 5 : 14);
  textSize(compact ? 13 : 14);
  textStyle(BOLD);
  textAlign(CENTER, BOTTOM);
  noStroke();
  if (v.code) {
    fill(FP.tok('primary-dark'));
    text('Intake', intakeX, labelY);
    text('Discharge', dischargeX, labelY);
  } else {
    fill(FP.tok('text-muted'));
    text('?', x0, labelY);
    text('?', x1, labelY);
  }
  textStyle(NORMAL);

  // Air
  const ay = [cy - th * 0.3, cy + th * 0.3];
  const reach = Math.min(40, box.w * 0.12);
  if (v.flow && !v.reversed) {
    for (const yy of ay) {
      if (toRight) {
        FD.airflowArrow(null, { x1: x0 - reach, y1: yy, x2: x0 + L * 0.08, y2: yy, t });
        FD.airflowArrow(null, { x1: x0 + L * 0.5, y1: yy, x2: x0 + L * 0.62, y2: yy, t });
        FD.airflowArrow(null, { x1: x1 - L * 0.08, y1: yy, x2: x1 + reach, y2: yy, t });
      } else {
        FD.airflowArrow(null, { x1: x1 + reach, y1: yy, x2: x1 - L * 0.08, y2: yy, t });
        FD.airflowArrow(null, { x1: x0 + L * 0.62, y1: yy, x2: x0 + L * 0.5, y2: yy, t });
        FD.airflowArrow(null, { x1: x0 + L * 0.08, y1: yy, x2: x0 - reach, y2: yy, t });
      }
    }
  } else if (v.flow && v.reversed) {
    // Intended direction shown dashed in grey and crossed out: no airflow that way
    const yy = cy - th * 0.3;
    FD.airflowArrow(null, { x1: toRight ? x0 - reach : x1 + reach, y1: yy, x2: toRight ? x0 + L * 0.1 : x1 - L * 0.1,
      y2: yy, dashed: true, color: FP.tok('text-muted') });
    const cxm = toRight ? x0 - reach * 0.3 : x1 + reach * 0.3;
    stroke(FP.tok('incorrect')); strokeWeight(3);
    line(cxm - 7, yy - 7, cxm + 7, yy + 7); line(cxm - 7, yy + 7, cxm + 7, yy - 7);
  }

  // Leader label for the hub, rotation, and air path line (below the tube)
  let y = cy + th / 2 + (compact ? 4 : 10);
  if (v.hub && v.code) {
    const info = CODE_INFO[v.code];
    FD.leaderLabel(null, {
      text: 'Hub on ' + (info.hub === 'intake' ? 'intake' : 'discharge') + ' side · ' + BORE[info.bore].toLowerCase(),
      ax: ix + hubW * 1.0, ay: cy + hubH * 0.15,
      lx: box.x + box.w / 2, ly: y + 10, textSize: compact ? 12 : 13,
      bounds: { x0: box.x + 4, x1: box.x + box.w - 4 }, highlight: true
    });
    y += compact ? 22 : 26;
  } else {
    y += 4;
  }
  {
    // Rotation, always viewed from the discharge side
    const r = compact ? 8 : 11;
    const rx = box.x + 20, ry = y + r + (compact ? 2 : 4);
    if (v.code) {
      FD.rotationArc(null, { x: rx, y: ry, r, rotation: v.reversed ? 'CCW' : 'CW', weight: 2, head: 8,
        color: v.reversed ? FP.tok('incorrect') : pal.accent });
    }
    noStroke();
    fill(FP.tok(v.reversed ? 'incorrect' : 'text'));
    textAlign(LEFT, TOP);
    textSize(compact ? 12 : 13);
    const rtxt = !v.code ? 'Rotation is viewed from the discharge side.'
      : v.reversed ? FP.msg.BAD + ' Rotation reversed (viewed from the discharge side)'
        : compact ? 'Rotation correct (viewed from the discharge side)'
          : 'Rotation correct for the impeller (viewed from the discharge side)';
    K.wrapText(rtxt, rx + r + 10, ry - 8, box.x + box.w - (rx + r + 10) - 8, compact ? 15 : 17, { maxLines: compact ? 1 : 2 });
  }
  if (!compact) {
    noStroke(); fill(FP.tok('text-muted')); textSize(13); textAlign(LEFT, BOTTOM);
    const legend = v.code ? 'Heavy blade edge = leading edge (faces the intake) · orange = hub boss'
      : 'Press Check to see the hub and the air path.';
    K.wrapText(legend, box.x + 10, box.y + box.h - 38, box.w - 20, 16, { maxLines: 2 });
  }
}

function drawControlLabels() {
  const n = narrow();
  noStroke();
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(n ? 14 : 16);
  fill(FP.tok('text'));
  if (mode === 'orders') {
    text(n ? 'Hub:' : 'Hub faces:', 10, K.controlLabel(0));
    text(n ? 'Bore:' : 'Hub bore:', 10, K.controlLabel(1));
  } else {
    text('Airflow:', 10, K.controlLabel(0));
    text('Rotation:', 10, K.controlLabel(1));
  }
  textStyle(NORMAL);
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  updateControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
