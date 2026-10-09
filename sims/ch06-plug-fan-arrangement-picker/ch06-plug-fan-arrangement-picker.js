// Plug Fan Arrangement Picker - p5.js MicroSim (Chapter 6: Industrial Fans and Application Product Lines)
// CANVAS_HEIGHT: 610
// Eight illustrative jobs, fixed order, one scored attempt each: the learner picks one of the six
// plug fan arrangements (4, 4P, 8, 8P, 9, 9P). After Check the sim shows the reason, the three
// decision rules with the deciding rule marked, and a side-view sketch of the correct arrangement.
// Reference cards for all six arrangements can be opened at any time (exploration, not scored).
// Built on the FanPedia kit: FP.CardDeck (scenarios, score, mastery, wording), FP.p5 (layout,
// text, buttons, keys). Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js.

const K = FP.p5;
const SIM_ID = 'ch06-plug-fan-arrangement-picker';

let canvasWidth = 800;
const drawHeight = 460;
const controlHeight = K.controlHeightFor(4);   // 150: choices (1-2 rows), navigation (1-2 rows)
const canvasHeight = drawHeight + controlHeight;
const MASTERY = 6;

// Reference cards (FanPedia pp. 171-172, Technical Descriptions, plug arrangements)
const ARRS = [
  { code: '4', drive: 'Direct, impeller on motor shaft', carried: "Customer's wall",
    text: 'Compact; no fan shaft, bearings or belts. High airstream temperatures may limit use.' },
  { code: '4P', drive: 'Direct, impeller on motor shaft', carried: 'Grade',
    text: 'Arrangement 4 mounted to grade, for walls that cannot carry the fan or lower vibration requirements. Mounting panel optional.' },
  { code: '8', drive: 'Direct, motor coupled to fan shaft', carried: "Customer's wall",
    text: 'Least common plug arrangement because of assembly length.' },
  { code: '8P', drive: 'Direct, motor coupled to fan shaft', carried: 'Grade',
    text: 'Arrangement 8 mounted to grade; larger fans and larger-HP motors. Mounting panel optional.' },
  { code: '9', drive: 'Belt', carried: "Customer's wall",
    text: 'Most common plug arrangement.' },
  { code: '9P', drive: 'Belt', carried: 'Grade',
    text: 'Arrangement 9 mounted to grade; larger fans and larger-HP motors. Mounting panel optional.' }
];
const CODES = ARRS.map(a => a.code);
const SHORT_DRIVE = { 'Direct, impeller on motor shaft': 'direct, impeller on motor shaft',
  'Direct, motor coupled to fan shaft': 'direct, coupled to fan shaft', Belt: 'belt' };

// Decision rules (spec Rules), in order
const RULES = [
  { n: 1, name: 'Drive', q: 'Direct drive or belt drive?' },
  { n: 2, name: 'Temperature', q: 'Direct drive with a hot airstream? Then not 4/4P: use 8/8P.' },
  { n: 3, name: 'Support', q: 'Wall not sufficient, or a low-vibration requirement? Then the P version.' }
];

// Scenarios (illustrative jobs), fixed order. r1-r3: how each rule reads for this job;
// decides: the rule numbers that settle the answer (highlighted after Check).
const SCENARIOS = [
  { id: 1, answer: '4',
    text: 'Recirculating fan for a warm (not hot) process enclosure. Customer wants no belts or fan bearings to maintain. Wall is stiff enough to carry the fan.',
    r: ['Direct: no belts or fan bearings wanted', 'Warm, not hot: the impeller can sit on the motor shaft (4)', 'Wall can carry the fan: wall-mounted'],
    decides: [1],
    why: 'Direct drive with the impeller on the motor shaft removes belts and fan bearings, and the wall can carry it.' },
  { id: 2, answer: '4P',
    text: 'Same job as #1, but the customer\'s engineer says the enclosure wall cannot carry the fan by itself.',
    r: ['Direct: no belts or fan bearings wanted', 'Warm, not hot: impeller on the motor shaft (4)', 'Wall not sufficient: P version'],
    decides: [3],
    why: 'Same direct-drive choice, mounted to grade because the wall is not sufficient.' },
  { id: 3, answer: '9',
    text: 'General belt-driven recirculation fan; the wall is adequate and nothing unusual is required.',
    r: ['Belt drive', 'Belt drive: the temperature rule does not apply', 'Wall adequate, no vibration limit: wall-mounted'],
    decides: [1],
    why: 'Belt drive on a wall that can carry it is the most common plug arrangement.' },
  { id: 4, answer: '9P',
    text: 'Large belt-driven fan with a large-HP motor; the wall cannot carry it.',
    r: ['Belt drive', 'Belt drive: the temperature rule does not apply', 'Wall cannot carry it: P version'],
    decides: [3],
    why: 'Belt drive plus a wall that is not sufficient points to the grade-mounted 9P.' },
  { id: 5, answer: '8',
    text: 'Customer wants direct drive, but the airstream is hot, so the impeller should not sit on the motor shaft. The wall is adequate and there is room for a long assembly.',
    r: ['Direct drive', 'Hot airstream: not 4, use 8 (separate fan shaft)', 'Wall adequate: wall-mounted'],
    decides: [2],
    why: 'High airstream temperature may limit Arrangement 4; Arrangement 8 is the direct-drive alternative with a separate fan shaft.' },
  { id: 6, answer: '8P',
    text: 'Direct drive with the motor coupled to a fan shaft, large-HP motor, the wall is not sufficient by itself.',
    r: ['Direct drive, motor coupled to a fan shaft', 'Coupled to a fan shaft: the 8 family', 'Wall not sufficient: P version'],
    decides: [3],
    why: 'Coupled direct drive on a weak wall calls for the grade-mounted 8P.' },
  { id: 7, answer: '9P',
    text: 'Belt-driven fan; the wall could carry it, but the project has a strict low-vibration requirement.',
    r: ['Belt drive', 'Belt drive: the temperature rule does not apply', 'Low-vibration requirement: P version'],
    decides: [3],
    why: 'FanPedia notes that mounting to the foundation helps meet lower vibration requirements.' },
  { id: 8, answer: '4',
    text: 'Customer wants the most compact, lowest-maintenance plug fan possible, the airstream is near room temperature, and the wall is adequate.',
    r: ['Direct: most compact, lowest maintenance', 'Near room temperature: 4 is not ruled out', 'Wall adequate: wall-mounted'],
    decides: [1, 2],
    why: 'Arrangement 4 is the compact, low-maintenance choice when temperature does not rule it out.' }
].map(s => Object.assign(s, { answerText: 'Arrangement ' + s.answer }));

const deck = new FP.CardDeck({
  cards: SCENARIOS, shuffle: false, attempts: 1, retryMissed: false,
  noun: 'Scenarios', mastery: MASTERY,
  reviewPointer: 'Review "Plug Fans: The Impeller Goes In, the Drive Stays Out" and the reference cards, then press Start over',
  // Spec wording: "Not quite. The answer is Arrangement <n>. <Why>"
  messages: { missed: res => FP.msg.BAD + ' Not quite. The answer is ' + res.card.answerText + '. ' + res.card.why },
  id: SIM_ID
});

const PROMPT = 'Which plug fan arrangement fits this job?';
const DATA_NOTE_WIDE = ['Illustrative scenarios', 'Source: FanPedia pp. 171–172', 'Keys: 1–6 choose, Enter checks or goes on'];
const DATA_NOTE_NARROW = ['Illustrative scenarios', 'FanPedia pp. 171–172', 'Keys 1–6, Enter'];

// ---------- State ----------
let selected = null;        // arrangement code chosen for the current scenario (before Check)
let records = [];           // per scenario index: {chosen, kind, message}
let viewIdx = null;         // reviewing an earlier scenario (null = the live one or the summary)
let showCards = false;      // reference cards open
let notice = '';            // "Choose an arrangement first."

// ---------- Controls ----------
let choiceButtons = [];
let checkButton, backButton, nextButton, cardsButton, startOverButton;

const keyMap = { Enter: onEnter };
CODES.forEach((c, i) => { keyMap[String(i + 1)] = () => choose(c); });
const keys = K.keys.bind(keyMap);
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textFont('Arial');

  choiceButtons = CODES.map(c => {
    const b = K.button('Arr. ' + c, () => choose(c));
    b.addClass('choice');
    b.attribute('aria-label', 'Arrangement ' + c);
    b.attribute('aria-pressed', 'false');
    return b;
  });
  checkButton = K.button(FP.msg.CHECK, checkAnswer);
  backButton = K.button('Back', goBack, { variant: 'secondary' });
  nextButton = K.button('Next scenario', goNext);
  cardsButton = K.button('Reference cards', toggleCards, { variant: 'secondary' });
  cardsButton.attribute('aria-pressed', 'false');
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  // Fixed width for the six choices (room for the ✓ of the selected one), so the rows never jump
  choiceButtons.forEach(b => b.attribute('aria-pressed', 'true'));
  const cw = Math.max(...choiceButtons.map(b => b.elt.offsetWidth)) + 2;
  choiceButtons.forEach(b => { b.style('width', cw + 'px'); b.attribute('aria-pressed', 'false'); });

  updateControls();

  describe('Plug fan arrangement picker. Eight illustrative jobs are shown one at a time. For each, ' +
    'choose one of six plug fan arrangements (4, 4P, 8, 8P, 9 or 9P) and press Check. The sim says ' +
    'whether the choice is correct, gives the reason, lists the three decision rules (drive, ' +
    'temperature, support) with the deciding rule marked, and sketches the correct arrangement. ' +
    'Reference cards describing all six arrangements can be opened at any time.');
}

// ---------- Flow ----------
function liveIndex() { return deck.state().index; }
function reviewing() { return viewIdx !== null; }

function choose(code) {
  const st = deck.state();
  if (reviewing() || st.phase !== 'choose') return;
  selected = code;
  notice = '';
  updateControls();
  FP.announce('Selected Arrangement ' + code + '. Press Check.');
}

function checkAnswer() {
  const st = deck.state();
  if (reviewing() || st.phase !== 'choose') return;
  if (!selected) {
    notice = 'Choose an arrangement first (buttons or keys 1–6).';
    FP.announce(notice);
    return;
  }
  const res = deck.place(selected);
  records[st.index] = { chosen: selected, kind: res.kind, message: res.message };
  notice = '';
  FP.announce('You chose Arrangement ' + selected + '. ' + res.message);
  updateControls();
  nextButton.elt.focus();
}

function goNext() {
  const st = deck.state();
  if (reviewing()) {
    viewIdx++;
    const live = st.phase === 'summary' ? SCENARIOS.length : st.index;
    if (viewIdx >= live || (st.phase === 'feedback' && viewIdx === st.index)) viewIdx = null;
    afterMove();
    return;
  }
  if (st.phase !== 'feedback') return;
  deck.next();
  selected = null;
  afterMove();
}

function goBack() {
  const st = deck.state();
  const live = st.phase === 'summary' ? SCENARIOS.length : st.index;
  const from = reviewing() ? viewIdx : live;
  if (from <= 0) return;
  viewIdx = from - 1;
  afterMove();
}

function afterMove() {
  notice = '';
  updateControls();
  const st = deck.state();
  // Keep Enter meaningful: Check on a live scenario, Forward while reviewing, Back on the summary
  if (reviewing()) nextButton.elt.focus();
  else if (st.phase === 'choose') checkButton.elt.focus();
  else if (st.phase === 'summary') backButton.elt.focus();
  if (reviewing()) {
    const s = SCENARIOS[viewIdx];
    FP.announce('Reviewing scenario ' + s.id + ' (already checked, not re-scored). ' + records[viewIdx].message);
  } else if (st.phase === 'summary') {
    FP.announce(summaryText().join(' '));
  } else {
    FP.announce('Scenario ' + (st.index + 1) + ' of ' + SCENARIOS.length + '. ' + st.card.text + ' ' + PROMPT);
  }
}

function onEnter() {
  if (showCards) { toggleCards(); return; }
  const st = deck.state();
  if (reviewing()) { goNext(); return; }
  if (st.phase === 'choose') checkAnswer();
  else if (st.phase === 'feedback') goNext();
}

function toggleCards() {
  showCards = !showCards;
  updateControls();
  FP.announce(showCards ? 'Reference cards open: six plug fan arrangements.' : 'Reference cards closed.');
}

function startOver() {
  deck.newRound();
  records = [];
  selected = null;
  viewIdx = null;
  showCards = false;
  notice = '';
  updateControls();
  checkButton.elt.focus();
  FP.announce('Started over. Scenario 1 of ' + SCENARIOS.length + '. ' + SCENARIOS[0].text + ' ' + PROMPT);
}

function summaryText() {
  const s = deck.summary();
  return s.lines;
}

// ---------- Controls: state and layout ----------
function narrow() { return canvasWidth < 520; }

function updateControls() {
  const had = document.activeElement;
  const st = deck.state();
  const live = !reviewing() && st.phase === 'choose';
  choiceButtons.forEach((b, i) => {
    const code = CODES[i];
    let pressed = false;
    if (reviewing()) pressed = records[viewIdx] && records[viewIdx].chosen === code;
    else if (st.phase === 'feedback') pressed = records[st.index] && records[st.index].chosen === code;
    else if (st.phase === 'choose') pressed = selected === code;
    b.attribute('aria-pressed', pressed ? 'true' : 'false');
    K.setEnabled(b, live);
  });
  K.setEnabled(checkButton, live);
  const liveIdx = st.phase === 'summary' ? SCENARIOS.length : st.index;
  K.setEnabled(backButton, (reviewing() ? viewIdx : liveIdx) > 0);
  const nextOn = reviewing() || st.phase === 'feedback';
  K.setEnabled(nextButton, nextOn);
  let nextLabel = 'Next scenario';
  if (reviewing()) nextLabel = 'Forward';
  else if (st.phase === 'feedback' && st.isLast) nextLabel = 'See summary';
  nextButton.html(narrow() && nextLabel === 'Next scenario' ? 'Next' : nextLabel);
  nextButton.attribute('aria-label', nextLabel);
  cardsButton.html(narrow() ? 'Cards' : (showCards ? 'Hide reference cards' : 'Reference cards'));
  cardsButton.attribute('aria-label', showCards ? 'Hide reference cards' : 'Show reference cards');
  cardsButton.attribute('aria-pressed', showCards ? 'true' : 'false');
  positionControls();
  K.keepFocus(had, [...choiceButtons, checkButton, backButton, nextButton, cardsButton, startOverButton]);
}

function positionControls() {
  const x = narrow() ? 10 : 112;
  const row = K.flowButtons(0, choiceButtons, { x, gap: 6 });
  K.flowButtons(row, [checkButton, backButton, nextButton, null, cardsButton, null, startOverButton],
    { x: 10, gap: 8, groupGap: narrow() ? 8 : 16 });
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  let y = K.title('Plug Fan Arrangement Picker');
  const st = deck.state();
  let right;
  if (reviewing()) right = 'Reviewing scenario ' + (viewIdx + 1) + ' of ' + SCENARIOS.length;
  else if (st.phase === 'summary') right = 'Summary';
  else right = 'Scenario ' + (st.index + 1) + ' of ' + SCENARIOS.length;
  y = K.statusLine(st.scoreLabel, right, null, { y: y - 4 });
  K.note(narrow() ? DATA_NOTE_NARROW : DATA_NOTE_WIDE);

  const top = y + 2, bottom = drawHeight - 22;
  if (showCards) drawCards(10, top, canvasWidth - 20, bottom - top);
  else if (!reviewing() && st.phase === 'summary') drawSummary(10, top, canvasWidth - 20, bottom - top);
  else drawScenario(top, bottom);
  drawControlLabel();
}

function drawControlLabel() {
  if (narrow()) return;
  noStroke();
  fill(FP.tok('text'));
  textStyle(BOLD);
  textSize(15);
  textAlign(LEFT, CENTER);
  text('Your choice:', 10, K.controlRow(0) + 14);
  textStyle(NORMAL);
}

// Paragraph list {t, bold, color, size(+/-), gap}; returns the y below
function paras(list, x, y, w, ts, dry) {
  for (const p of list) {
    const s = Math.max(12, ts + (p.size || 0));
    textSize(s);
    textStyle(p.bold ? BOLD : NORMAL);
    fill(p.color || FP.tok('text'));
    y += p.gap || 0;
    y = K.wrapText(p.t, x, y, w, Math.round(s * 1.3), { dryRun: dry, maxLines: p.maxLines });
  }
  textStyle(NORMAL);
  return y;
}

function shownScenario() {
  const st = deck.state();
  const idx = reviewing() ? viewIdx : st.index;
  const rec = reviewing() ? records[viewIdx] : (st.phase === 'feedback' ? records[st.index] : null);
  return { idx, s: SCENARIOS[idx], rec };
}

function drawScenario(top, bottom) {
  const wide = canvasWidth >= 600;
  const { idx, s, rec } = shownScenario();
  let left, right;
  if (wide) {
    const lw = Math.round((canvasWidth - 30) * 0.52);
    left = [10, top, lw, bottom - top];
    right = [20 + lw, top, canvasWidth - 30 - lw, bottom - top];
  } else {
    const rh = Math.round((bottom - top) * 0.43);
    left = [10, top, canvasWidth - 20, bottom - top - rh - 6];
    right = [10, bottom - rh, canvasWidth - 20, rh];
  }
  K.panel(...left);
  K.panel(...right);
  drawScenarioText(left[0] + 10, left[1] + 8, left[2] - 20, left[3] - 16, idx, s, rec);
  drawRules(right[0] + 10, right[1] + 8, right[2] - 20, right[3] - 16, s, rec, wide);
}

function drawScenarioText(x, y, w, h, idx, s, rec) {
  noStroke();
  textAlign(LEFT, TOP);
  const head = [{ t: 'Scenario ' + s.id + ' of ' + SCENARIOS.length +
    (reviewing() ? '  (already checked; not re-scored)' : ''), bold: true, size: 1 }];
  const body = [{ t: s.text, gap: 6 }, { t: PROMPT, bold: true, gap: 8 }];
  if (!rec && selected) body.push({ t: 'Selected: Arrangement ' + selected + '. Press Check.', color: FP.tok('primary-dark'), gap: 6 });
  if (!rec && !selected && !notice) body.push({ t: 'Pick one of the six arrangements below, then press Check.', color: FP.tok('text-muted'), gap: 6 });
  if (notice) body.push({ t: 'ℹ ' + notice, color: FP.tok('primary-dark'), gap: 6 });
  const fb = rec ? [{ t: 'You chose: Arrangement ' + rec.chosen, color: FP.tok('text-muted') },
    { t: rec.message, color: FP.tok(rec.kind === 'ok' ? 'correct' : 'incorrect'), gap: 2 }] : [];
  const pad = 8;
  const layout = (ts, dry) => {
    let yy = paras(head.concat(body), x, y, w, ts, dry);
    if (fb.length) yy = paras(fb, x + pad, yy + 10 + pad, w - 2 * pad, ts, true) + pad;
    return yy - y;
  };
  const ts = K.fitTextSize(t => layout(t, true), h, 16, 12);
  let yy = paras(head.concat(body), x, y, w, ts, false);
  if (fb.length) {
    const fbTop = yy + 10;
    const fbH = paras(fb, x + pad, fbTop + pad, w - 2 * pad, ts, true) + pad - fbTop;
    const ok = rec.kind === 'ok';
    K.panel(x - 2, fbTop, w + 4, fbH, {
      fill: ok ? '--fp-correct-bg' : '--fp-incorrect-bg', stroke: ok ? '--fp-correct' : '--fp-incorrect',
      dashed: !ok, weight: 2, radius: 6
    });
    paras(fb, x + pad, fbTop + pad, w - 2 * pad, ts, false);
  }
}

function ruleParas(r, i, s, rec, wide) {
  const decided = rec && s.decides.includes(r.n);
  const label = r.n + '. ' + r.name + (decided ? '  ◆ deciding rule' : '');
  const detail = rec ? s.r[i] : r.q;
  const head = { t: label, bold: true, color: decided ? FP.tok('primary-dark') : FP.tok('text') };
  const body = { t: detail, gap: 1, color: rec ? FP.tok('text') : FP.tok('text-muted') };
  if (wide) return [head, body];
  return [{ t: label + ': ' + detail, bold: false, color: decided ? FP.tok('primary-dark') : FP.tok('text') }];
}

function drawRules(x, y, w, h, s, rec, wide) {
  noStroke();
  textAlign(LEFT, TOP);
  fill(FP.tok('text'));
  textStyle(BOLD);
  textSize(wide ? 16 : 15);
  text('Decision rules, in order', x, y);
  textStyle(NORMAL);
  const yy = y + (wide ? 24 : 21);
  const sketchH = wide ? Math.min(165, h * 0.45) : 0;
  const avail = h - (yy - y) - (sketchH ? sketchH + 8 : 0);
  const gap = 5, pad = 5;
  // One text size for all three boxes
  const measure = ts => RULES.reduce((sum, r, i) =>
    sum + paras(ruleParas(r, i, s, rec, wide), 0, 0, w - 16, ts, true) + 2 * pad + gap, -gap);
  const ts = K.fitTextSize(t => measure(t), avail, 15, 12);
  let by = yy;
  RULES.forEach((r, i) => {
    const decided = rec && s.decides.includes(r.n);
    const list = ruleParas(r, i, s, rec, wide);
    const bh = paras(list, 0, 0, w - 16, ts, true) + 2 * pad;
    K.panel(x, by, w, bh, {
      fill: decided ? '--fp-primary-bg' : '--fp-ctrl-bg',
      stroke: decided ? '--fp-primary' : '--fp-border', weight: decided ? 2.5 : 1, radius: 6
    });
    paras(list, x + 8, by + pad, w - 16, ts, false);
    by += bh + gap;
  });
  if (sketchH) {
    const sy = y + h - sketchH;
    if (rec) {
      drawPlugFan(x, sy, w, sketchH, s.answer);
    } else {
      noStroke();
      fill(FP.tok('text-muted'));
      textSize(14);
      textAlign(CENTER, TOP);
      K.wrapText('Press Check to see the reason, the deciding rule and a sketch of the correct arrangement.',
        x + w / 2, sy + sketchH / 2 - 18, w - 20, 18, { align: CENTER });
      textAlign(LEFT, TOP);
    }
  }
}

// Side-view sketch of a plug fan arrangement: plenum wall, impeller inside, drive outside;
// "P" codes stand on a pedestal on grade (mounting panel dashed: optional). Illustrative, not to scale.
function drawPlugFan(x, y, w, h, code) {
  const fam = code.charAt(0), grade = code.length > 1;
  const c = { metal: FP.tok('metal'), side: FP.tok('metal-side'), edge: FP.tok('edge'), motor: FP.tok('motor'),
    bearing: FP.tok('bearing'), belt: FP.tok('belt'), text: FP.tok('text'), air: FP.tok('air') };
  push();
  const floorY = y + h - 14;
  const wx = x + w * 0.34;                 // plenum wall
  const sh = y + h * 0.38;                 // shaft centreline
  const mh = h * 0.24;                     // motor height
  strokeWeight(1.5);
  // Plenum wall
  stroke(c.edge); fill(c.side);
  rect(wx - 4, y + 20, 8, floorY - y - 20);
  // Mounting panel
  if (grade) { drawingContext.setLineDash([4, 3]); noFill(); } else fill(c.metal);
  rect(wx + 4, sh - h * 0.26, 6, h * 0.52);
  drawingContext.setLineDash([]);
  // Impeller (side view) and inlet funnel, inside the plenum
  fill(c.metal); stroke(c.edge);
  const i0 = wx - w * 0.16, i1 = wx - w * 0.06;
  rect(i0, sh - h * 0.22, i1 - i0, h * 0.44);
  line(i0, sh - h * 0.22, i1, sh + h * 0.22);
  line(i0, sh + h * 0.22, i1, sh - h * 0.22);
  quad(i0 - w * 0.06, sh - h * 0.18, i0, sh - h * 0.11, i0, sh + h * 0.11, i0 - w * 0.06, sh + h * 0.18);
  // Air into the funnel
  stroke(c.air); strokeWeight(2);
  line(x + 4, sh, i0 - w * 0.08, sh);
  noStroke(); fill(c.air);
  triangle(i0 - w * 0.07, sh, i0 - w * 0.10, sh - 5, i0 - w * 0.10, sh + 5);
  // Drive side
  strokeWeight(1.5); stroke(c.edge);
  const d0 = wx + 12;
  let driveEnd, baseY;
  const bearing = bx => { fill(c.bearing); rect(bx, sh - 9, 12, 18); };
  if (fam === '4') {
    line(i1, sh, d0, sh);
    fill(c.motor); rect(d0, sh - mh / 2, w * 0.24, mh, 3);
    driveEnd = d0 + w * 0.24;
    baseY = sh + mh / 2;
    label('Motor', d0, sh - mh / 2 - 4, c.text, LEFT);
  } else if (fam === '8') {
    line(i1, sh, d0 + w * 0.30, sh);
    baseY = sh + mh / 2;
    fill(c.side);
    rect(d0 + w * 0.02 + 3, sh + 9, 6, baseY - sh - 9);
    rect(d0 + w * 0.15 + 3, sh + 9, 6, baseY - sh - 9);
    bearing(d0 + w * 0.02); bearing(d0 + w * 0.15);
    fill(c.side); rect(d0 + w * 0.25, sh - 7, 10, 14);           // coupling
    fill(c.motor); rect(d0 + w * 0.29, sh - mh / 2, w * 0.24, mh, 3);
    driveEnd = d0 + w * 0.53;
    label('Bearings', d0 + w * 0.02, sh - 13, c.text, LEFT);
    label('Coupling, motor', d0 + w * 0.25, sh - mh / 2 - 4, c.text, LEFT);
  } else {
    line(i1, sh, d0 + w * 0.29, sh);
    const my = sh + h * 0.28;
    baseY = my + mh * 0.4;
    fill(c.side);
    rect(d0 + w * 0.02 + 3, sh + 9, 6, my - mh * 0.4 - sh - 9);
    rect(d0 + w * 0.15 + 3, sh + 9, 6, my - mh * 0.4 - sh - 9);
    bearing(d0 + w * 0.02); bearing(d0 + w * 0.15);
    fill(c.side); rect(d0 + w * 0.25, sh - h * 0.12, 8, h * 0.24);     // fan sheave
    fill(c.motor); rect(d0 + w * 0.06, my - mh * 0.4, w * 0.17, mh * 0.8, 3);
    fill(c.side); rect(d0 + w * 0.25, my - 7, 8, 14);                   // motor sheave
    stroke(c.belt); strokeWeight(2);
    line(d0 + w * 0.25, sh + h * 0.12, d0 + w * 0.25, my - 7);
    line(d0 + w * 0.25 + 8, sh + h * 0.12, d0 + w * 0.25 + 8, my - 7);
    strokeWeight(1.5); stroke(c.edge);
    driveEnd = d0 + w * 0.36;
    label('Bearings', d0 + w * 0.02, sh - 13, c.text, LEFT);
    label('Belts', d0 + w * 0.25 + 14, sh + h * 0.17, c.text, LEFT);
  }
  // Support: wall bracket, or a pedestal on grade
  fill(c.side); stroke(c.edge);
  if (grade) {
    rect(d0 - 2, baseY, driveEnd - d0 + 4, 6);
    rect(d0 + 8, baseY + 6, (driveEnd - d0) - 16, floorY - baseY - 6);
    strokeWeight(2);
    line(x, floorY, x + w, floorY);
    strokeWeight(1);
    for (let hx = x + 8; hx < x + w; hx += 12) line(hx, floorY + 1, hx - 6, floorY + 8);
    label('Pedestal on grade', driveEnd + 6, floorY - 4, c.text, LEFT);
  } else {
    const gy = Math.min(floorY - 4, baseY + 6 + h * 0.16);
    rect(wx + 10, baseY, driveEnd - wx - 10, 6);
    line(wx + 10, gy, wx + 10 + (driveEnd - wx - 10) * 0.6, baseY + 6);   // gusset
    line(wx + 10, baseY + 6, wx + 10, gy);
    label('Carried by the wall', wx + 10 + (driveEnd - wx - 10) * 0.6 + 6, gy, c.text, LEFT);
  }
  label('Process air', x + 4, y + 16, c.text, LEFT);
  label('Plenum wall', wx - 4, y + 16, c.text, LEFT);
  pop();
  noStroke();
  fill(FP.tok('text'));
  textAlign(RIGHT, TOP);
  textStyle(BOLD);
  textSize(14);
  text('Arrangement ' + code, x + w, y);
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
}

// 12 px label; LEFT: text starts at x, otherwise centred on x. by = text baseline area bottom.
function label(str, lx, by, col, align) {
  push();
  noStroke();
  textSize(12);
  textAlign(align === LEFT ? LEFT : CENTER, BOTTOM);
  fill(col);
  text(str, lx, by);
  pop();
}

function drawCards(x, y, w, h) {
  K.panel(x, y, w, h);
  noStroke();
  fill(FP.tok('text'));
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(16);
  text(w >= 420 ? 'Reference cards: plug fan arrangements' : 'Reference cards', x + 10, y + 8);
  textStyle(NORMAL);
  const cols = w >= 600 ? 3 : 1;
  let top = y + 30;
  if (cols > 1) {
    textSize(13);
    fill(FP.tok('text-muted'));
    top = K.wrapText('Opening the cards is exploration, not scored. Press Hide or Enter to return.',
      x + 10, y + 30, w - 20, 16, { maxLines: 2 }) + 6;
  }
  const rows = Math.ceil(ARRS.length / cols);
  const gx = cols > 1 ? 8 : 4, pad = cols > 1 ? 8 : 5;
  const cw = (w - 20 - gx * (cols - 1)) / cols;
  const list = a => cols > 1 ? [
    { t: 'Arrangement ' + a.code, bold: true, color: FP.tok('primary-dark'), size: 1 },
    { t: 'Drive: ' + a.drive, gap: 2 },
    { t: 'Carried by: ' + a.carried },
    { t: a.text, gap: 3, color: FP.tok('text-muted') }
  ] : [
    { t: 'Arr. ' + a.code + ': ' + SHORT_DRIVE[a.drive] + '; ' + (a.carried === 'Grade' ? 'on grade' : 'on the wall'),
      bold: true, color: FP.tok('primary-dark') },
    { t: a.text, color: FP.tok('text') }
  ];
  const avail = y + h - 8 - top;
  const contentH = (a, t) => paras(list(a), 0, 0, cw - 16, t, true) + 2 * pad;
  let ts = 14, heights;
  for (; ts >= 12; ts--) {
    if (cols > 1) {
      const ch = (avail - gx * (rows - 1)) / rows;
      heights = ARRS.map(() => ch);
      if (ARRS.every(a => contentH(a, ts) <= ch)) break;
    } else {
      // one column: each card as tall as its text
      heights = ARRS.map(a => contentH(a, ts));
      if (heights.reduce((s2, v) => s2 + v, 0) + gx * (ARRS.length - 1) <= avail) break;
    }
  }
  ts = Math.max(12, ts);
  let cy = top;
  ARRS.forEach((a, i) => {
    const cx = x + 10 + (i % cols) * (cw + gx);
    if (cols > 1) cy = top + Math.floor(i / cols) * (heights[0] + gx);
    K.panel(cx, cy, cw, heights[i], { fill: '--fp-ctrl-bg', stroke: '--fp-primary', weight: 1.5, radius: 6 });
    paras(list(a), cx + 8, cy + pad, cw - 16, ts, false);
    if (cols === 1) cy += heights[i] + gx;
  });
}

function drawSummary(x, y, w, h) {
  K.panel(x, y, w, h);
  const s = deck.summary();
  const list = [
    { t: 'All 8 scenarios checked', bold: true, size: 1 },
    { t: s.lines[0], bold: true, gap: 6 },
    { t: s.lines[1], bold: s.mastered, color: s.mastered ? FP.tok('primary-dark') : FP.tok('text') }
  ];
  if (s.misses.length) {
    list.push({ t: 'Missed scenarios:', bold: true, gap: 8 });
    for (const m of s.misses) {
      list.push({ t: FP.msg.BAD + ' Scenario ' + m.card.id + ': you chose ' + m.chosen + '; the answer is ' +
        m.answer + '. ' + m.why, color: FP.tok('incorrect'), gap: 2 });
    }
  } else {
    list.push({ t: FP.msg.OK + ' No missed scenarios.', color: FP.tok('correct'), gap: 8 });
  }
  list.push({ t: 'Press Back to review any scenario, or Start over for a new scored round.', color: FP.tok('text-muted'), gap: 8 });
  noStroke();
  textAlign(LEFT, TOP);
  const ts = K.fitTextSize(t => paras(list, x + 10, y + 8, w - 20, t, true) - (y + 8), h - 16, 16, 12);
  paras(list, x + 10, y + 8, w - 20, ts, false);
}

// ---------- Responsive sizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  updateControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
