// Arrangement Variant Decoder - p5.js MicroSim (Chapter 24: Advanced Arrangements and
// Configuration Variants)
// CANVAS_HEIGHT: 545
// Twelve written fan descriptions, shuffled once per session. For each, the learner picks one
// arrangement code from a fixed list of 20 and presses Check: one scored attempt, then the Why
// text. A feature hint (drive, impeller, support, motor) may be revealed first; it is never
// scored. Mastery 10 of 12. Retry missed re-presents only the missed items, unscored.
// Built on the FanPedia kit: FP.CardDeck (deal, lock, score, mastery, retry missed),
// FP.p5 (layout, text, panels, controls, keys, focus), FP.msg / FP.announce (wording, live region).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js (load them
// before this file, also in the p5.js editor).

const K = FP.p5;
const SIM_ID = 'ch24-arrangement-variant-decoder';
let canvasWidth = 800;
const drawHeight = 500;
const controlHeight = K.controlHeightFor(1);   // Hint, Check, Next | Start over (Retry missed in the summary)
const canvasHeight = drawHeight + controlHeight;
const MASTERY = 10;
const PROMPT = 'Which arrangement code matches this fan?';

// Answer list, shown for every item (spec "Content"); it never changes between items.
const CODES = ['8', '9F', '9H', '10', '3F', '4', '4VI', '7DI', '3HS', '3HA', '3SM',
  '3VS', '4V', '1P', '4P', '8P', '9P', '9ST', '9SS', '4SO', '9SO', '9CS'];

// Chapter 24 spec, "Content" table. hint: the description's features by category.
// wrong: the spec's added messages for specific wrong codes ('4' and '4P' on item 1, '9F' on item 3,
// '9P' on item 9, '9SO' on item 12). Arrangement 4 and the axial/inline swingout 9SO are real
// FanPedia codes (pp. 20, 164, 173), included in the answer list so these messages can appear.
const ITEMS = [
  { id: 1, answer: '8',
    text: 'Housed SWSI fan, overhung impeller, two bearings on a long pedestal, motor coupled to the fan shaft at the end of the pedestal',
    why: 'An Arrangement 1 pedestal extended for a coupled motor is Arrangement 8.',
    hint: { drive: 'direct, coupled to the fan shaft', impeller: 'overhung on a fan shaft with two bearings',
      support: 'a long pedestal', motor: 'at the end of the pedestal' },
    wrong: { '4P': 'There is a coupling and a separate fan shaft, so the impeller is not on the motor shaft.',
      '4': 'There is a coupling and a separate fan shaft, so the impeller is not on the motor shaft.' } },
  { id: 2, answer: '9F',
    text: 'Housed SWSI fan, belt driven, motor too large for the pedestal, carried on an extended structural frame',
    why: 'The F is the extended frame that carries a motor too large for the pedestal.',
    hint: { drive: 'belt', impeller: 'housed SWSI', support: 'pedestal plus an extended structural frame',
      motor: 'on the frame (too large for the pedestal)' } },
  { id: 3, answer: '10',
    text: 'Housed SWSI fan, belt driven, motor inside the bearing pedestal, sold as a ventilating set',
    why: 'Arrangement 10 puts the motor inside the pedestal; small Class I and II sizes are vent sets.',
    hint: { drive: 'belt', impeller: 'housed SWSI', support: 'bearing pedestal', motor: 'inside the bearing pedestal' },
    wrong: { '9F': 'The motor is inside the pedestal, not on a frame.' } },
  { id: 4, answer: '4VI',
    text: 'Direct drive SWSI fan hung entirely from its inlet flange, vertical motor shaft',
    why: 'VI is vertical inlet-mounted; the inlet flange carries the whole fan.',
    hint: { drive: 'direct', impeller: 'SWSI, on the motor shaft', support: 'the inlet flange only',
      motor: 'vertical shaft' } },
  { id: 5, answer: '7DI',
    text: 'Direct drive DWDI fan, impeller between bearings, integral inlet boxes, motor coupled on a pedestal',
    why: 'A coupled double width fan with integral inlet boxes is 7DI.',
    hint: { drive: 'direct, coupled', impeller: 'DWDI, between the bearings', support: 'pedestal; integral inlet boxes',
      motor: 'coupled, on the pedestal' } },
  { id: 6, answer: '3HA',
    text: 'Horizontal belt driven plenum fan, motor on top on an adjustable motor base, size smaller than 182',
    why: 'Top-mounted motor with an adjustable base is 3HA; the 3HS slide base starts at size 182.',
    hint: { drive: 'belt', impeller: 'plenum fan, horizontal', support: 'fan frame; size smaller than 182',
      motor: 'on top, adjustable motor base' } },
  { id: 7, answer: '3SM',
    text: 'Horizontal belt driven plenum fan, motor on the side of the fan frame on a slide base',
    why: 'SM is side-mounted motor on a slide base.',
    hint: { drive: 'belt', impeller: 'plenum fan, horizontal', support: 'fan frame',
      motor: 'side of the fan frame, slide base' } },
  { id: 8, answer: '4V',
    text: 'Vertical direct drive plenum fan, impeller on the motor shaft, inlet under the motor',
    why: '4V is the vertical direct drive plenum fan, offered for up or down airflow.',
    hint: { drive: 'direct', impeller: 'on the motor shaft', support: 'plenum fan, vertical; inlet under the motor',
      motor: 'carries the impeller' } },
  { id: 9, answer: '1P',
    text: 'Belt driven plug fan on a pedestal at grade, motor on its own base beside the fan',
    why: 'The motor is separate from the fan pedestal, so this is 1P, not 9P.',
    hint: { drive: 'belt', impeller: 'plug fan', support: 'pedestal at grade', motor: 'own base beside the fan' },
    wrong: { '9P': 'In 9P the motor sits on the fan pedestal; here it stands apart.' } },
  { id: 10, answer: '4P',
    text: 'Direct drive plug fan, impeller on the motor shaft, fan floor mounted',
    why: 'Arrangement 4 mounted to grade is 4P; the P does not change the drive.',
    hint: { drive: 'direct', impeller: 'plug fan, on the motor shaft', support: 'floor mounted (at grade)',
      motor: 'carries the impeller' } },
  { id: 11, answer: '9SS',
    text: 'Belt driven housed SWSI fan, rotor on a hinged door, motor on the side of the pedestal on a pivot base',
    why: 'ST is top-mounted motor; SS is side-mounted motor on a pivot base.',
    hint: { drive: 'belt', impeller: 'housed SWSI, rotor on a hinged door', support: 'pedestal on the swingout door',
      motor: 'side of the pedestal, pivot base' } },
  { id: 12, answer: '9CS',
    text: 'Belt driven inline fan, casing opens on a door while the rotor stays in place',
    why: 'The casing opens and the rotor stays put: that is clamshell, not swingout.',
    hint: { drive: 'belt', impeller: 'inline fan; the rotor stays in place', support: 'casing that opens on a door',
      motor: 'not stated' },
    wrong: { '9SO': 'In a swingout fan the rotor moves; here only the casing opens.' } }
];

// Shuffled once per session: one random seed, reused by Start over.
const SESSION_SEED = Math.floor(Math.random() * 1e9);

// Spec feedback: Correct "Correct: Arrangement <code>."; Incorrect "This is Arrangement
// <correct>. <Why>." with the added message for that wrong code first.
const deck = new FP.CardDeck({
  cards: ITEMS, seed: SESSION_SEED, attempts: 1, retryMissed: true,
  noun: 'Items', mastery: MASTERY, id: SIM_ID,
  label: a => 'Arrangement ' + a,
  reviewPointer: 'Press Retry missed to practise the missed items, or reread the sections on each arrangement',
  messages: {
    correct: res => FP.msg.OK + ' Correct: Arrangement ' + res.card.answer + '.',
    missed: res => {
      const extra = res.card.wrong && res.card.wrong[res.chosen];
      return FP.msg.BAD + ' This is Arrangement ' + res.card.answer + '. ' + (extra ? extra + ' ' : '') + res.card.why;
    }
  },
  onComplete: () => { scoredMisses = deck.misses(); }
});

let pending = null;       // code selected, not checked
let showHint = false;
let feedback = null;      // {kind, message}
let notice = '';
let scoredMisses = [];
let codeButtons = [], hintButton, checkButton, nextButton, retryButton, startOverButton;
let gridTop = 0, gridRows = 1;

const keys = K.keys.bind({
  Enter: enterKey, h: toggleHint,
  ArrowRight: () => moveCode(1), ArrowLeft: () => moveCode(-1),
  ArrowDown: () => moveCode(gridCols()), ArrowUp: () => moveCode(-gridCols())
});
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  codeButtons = CODES.map((c, i) => {
    const b = K.button(c, () => selectCode(i));
    b.addClass('choice');
    b.addClass('avd-code');
    b.attribute('aria-pressed', 'false');
    b.attribute('aria-label', 'Arrangement ' + c);
    // A focused button handles Enter natively (a click, which would only re-select). Route
    // Enter to the Check/Next flow once this code is already the selected one.
    b.elt.addEventListener('keydown', ev => {
      if (ev.key !== 'Enter') return;
      const ph = deck.state().phase;
      if (ph === 'choose' && pending === c) { ev.preventDefault(); checkAnswer(); }
      else if (ph === 'feedback') { ev.preventDefault(); nextItem(); }
    });
    return b;
  });
  checkButton = K.button(FP.msg.CHECK, checkAnswer);
  hintButton = K.button('Show hint', toggleHint, { variant: 'secondary' });
  nextButton = K.button('Next item', nextItem);
  retryButton = K.button(FP.msg.RETRY_MISSED, retryMissed, { variant: 'secondary' });
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });
  updateControls();
  describe('Arrangement variant decoder. Twelve written fan descriptions are shown one at a time in a ' +
    'shuffled order. For each, choose one arrangement code from a list of 20 (8, 9F, 9H, 10, 3F, 4VI, 7DI, ' +
    '3HS, 3HA, 3SM, 3VS, 4V, 1P, 4P, 8P, 9P, 9ST, 9SS, 4SO, 9CS) and press Check. A feature hint can be ' +
    'shown first. One scored attempt per item; the summary lists the missed items with their codes, and ' +
    'Retry missed practises them without scoring.');
}

// ---------- Flow ----------
function selectCode(i) {
  if (deck.state().phase !== 'choose') return;
  pending = CODES[i];
  notice = '';
  updateControls();
  codeButtons[i].elt.focus();
  FP.announce('Arrangement ' + CODES[i] + ' selected. Press Check.');
}

function moveCode(step) {
  const a = document.activeElement;
  const at = codeButtons.findIndex(b => b.elt === a);
  if (at < 0 || deck.state().phase !== 'choose') return;
  const j = Math.max(0, Math.min(CODES.length - 1, at + step));
  selectCode(j);
}

function toggleHint() {
  if (deck.state().phase === 'summary') return;
  showHint = !showHint;
  updateControls();
  const h = deck.state().card.hint;
  FP.announce(showHint ? 'Feature hint. Drive: ' + h.drive + '. Impeller: ' + h.impeller + '. Support: ' +
    h.support + '. Motor: ' + h.motor + '.' : 'Hint hidden.');
}

function checkAnswer() {
  if (deck.state().phase !== 'choose') return;
  if (!pending) { notice = 'Choose a code first.'; FP.announce(notice); return; }
  const res = deck.place(pending);
  feedback = { kind: res.kind, message: res.message };
  FP.announce(res.message);
  updateControls();
}

function nextItem() {
  if (deck.state().phase !== 'feedback') return;
  deck.next();
  pending = null; feedback = null; notice = ''; showHint = false;
  updateControls();
  const s = deck.state();
  if (s.phase === 'summary') {
    FP.announce(summaryLines().join(' '));
  } else {
    FP.announce('Item ' + (s.index + 1) + ' of ' + s.count + '. ' + s.card.text + '. ' + PROMPT);
  }
}

function retryMissed() {
  if (!deck.retryMissed()) return;
  pending = null; feedback = null; notice = ''; showHint = false;
  updateControls();
  const s = deck.state();
  FP.announce('Practice round, not scored. Item 1 of ' + s.count + '. ' + s.card.text + '.');
}

function startOver() {
  deck.newRound(SESSION_SEED);
  scoredMisses = [];
  pending = null; feedback = null; notice = ''; showHint = false;
  updateControls();
  FP.announce('Started over. Item 1 of 12. ' + deck.state().card.text + '. ' + PROMPT);
}

function enterKey() {
  const ph = deck.state().phase;
  if (ph === 'choose') checkAnswer();
  else if (ph === 'feedback') nextItem();
}

function scoreLine() { return 'Correct: ' + deck.score.correct() + ' of ' + ITEMS.length; }

function summaryLines() {
  const s = deck.summary();
  const lines = s.lines.slice();
  if (s.practice) {
    const right = deck.placements.filter(p => p.correct).length;
    lines.push('Practice round (not scored): ' + right + ' of ' + deck.placements.length + ' right.');
  }
  return lines;
}

// ---------- Layout ----------
function gridCols() {
  const w = canvasWidth - 20;
  return Math.max(4, Math.min(11, Math.floor((w + 5) / (52 + 5))));   // 22 codes: two rows at desktop width
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  const st = deck.state();
  let y = K.title('Arrangement Variant Decoder');
  const right = st.phase === 'summary' ? (st.practice ? 'Practice round done' : 'All 12 items answered')
    : (st.practice ? 'Practice (not scored) · ' : '') + 'Item ' + (st.index + 1) + ' of ' + st.count;
  y = K.statusLine(scoreLine(), right, null, { y: y - 4 });
  K.note(canvasWidth >= 560
    ? ['Source: FanPedia pp. 20-28, 163-173', 'Keys: arrows pick a code, Enter checks or goes on, H hint']
    : ['FanPedia pp. 20-28, 163-173', 'Arrows, Enter, H'], { y: drawHeight - 6 });
  const top = y + 2;
  if (st.phase === 'summary') {
    drawSummary(10, top, canvasWidth - 20, drawHeight - 26 - top);
    return;
  }
  const cardBottom = gridTop - 26;
  K.panel(10, top, canvasWidth - 20, cardBottom - top);
  drawCard(20, top + 7, canvasWidth - 40, cardBottom - top - 12);
  noStroke();
  fill(FP.tok('text'));
  textStyle(BOLD);
  textSize(14);
  textAlign(LEFT, BOTTOM);
  text('Answer list', 12, gridTop - 4);
  textStyle(NORMAL);
}

function paras(list, x, y, w, ts, dry) {
  for (const p of list) {
    const s = p.big ? ts + 1 : (p.small ? Math.max(12, ts - 2) : ts);
    textSize(s);
    textStyle(p.bold ? BOLD : NORMAL);
    noStroke();
    fill(p.color || FP.tok(p.muted ? 'text-muted' : 'text'));
    y += p.gap || 0;
    y = K.wrapText(p.t, x + (p.indent || 0), y, w - (p.indent || 0), Math.round(s * 1.3), { dryRun: dry, maxLines: p.maxLines });
  }
  textStyle(NORMAL);
  return y;
}

function drawCard(x, y, w, h) {
  const st = deck.state();
  const c = st.card;
  const body = [
    { t: (st.practice ? 'Practice (not scored) · ' : '') + 'Description ' + (st.index + 1) + ' of ' + st.count,
      muted: true, small: true },
    { t: c.text + '.', bold: true, big: true, gap: 2 },
    { t: PROMPT, gap: 4 }
  ];
  const hint = showHint ? [
    { t: 'Feature hint (not scored)', bold: true, small: true, color: FP.tok('primary-dark') },
    { t: 'Drive: ' + c.hint.drive, small: true, indent: 8 },
    { t: 'Impeller: ' + c.hint.impeller, small: true, indent: 8 },
    { t: 'Support: ' + c.hint.support, small: true, indent: 8 },
    { t: 'Motor: ' + c.hint.motor, small: true, indent: 8 }
  ] : [];
  const tail = [];
  if (pending && st.phase === 'choose') {
    tail.push({ t: 'Selected: ' + pending + '. Press Check (Enter).', color: FP.tok('primary-dark'), gap: 4 });
  }
  if (notice) tail.push({ t: 'ℹ ' + notice, color: FP.tok('primary-dark'), gap: 4 });
  const fb = feedback ? [{ t: feedback.message, color: FP.tok(feedback.kind === 'ok' ? 'correct' : 'incorrect') }] : [];
  const pad = 6;
  const layout = (ts, dry) => {
    let yy = paras(body, x, y, w, ts, dry);
    if (hint.length) {
      const hy = yy + 6;
      const hh = paras(hint, x + pad, hy + 4, w - 2 * pad, ts, true) + 4 - hy;
      if (!dry) {
        K.panel(x - 3, hy, w + 6, hh, { fill: '--fp-primary-bg', stroke: '--fp-primary', weight: 1, radius: 6 });
        paras(hint, x + pad, hy + 4, w - 2 * pad, ts, false);
      }
      yy = hy + hh;
    }
    yy = paras(tail, x, yy, w, ts, dry);
    if (fb.length) {
      const fy = yy + 6;
      const fh = paras(fb, x + pad, fy + pad, w - 2 * pad, ts, true) + pad - fy;
      if (!dry) {
        const ok = feedback.kind === 'ok';
        K.panel(x - 3, fy, w + 6, fh, { fill: ok ? '--fp-correct-bg' : '--fp-incorrect-bg',
          stroke: ok ? '--fp-correct' : '--fp-incorrect', dashed: !ok, weight: 2, radius: 6 });
        paras(fb, x + pad, fy + pad, w - 2 * pad, ts, false);
      }
      yy = fy + fh;
    }
    return yy - y;
  };
  const ts = K.fitTextSize(t => layout(t, true), h, 16, 12);
  layout(ts, false);
}

function drawSummary(x, y, w, h) {
  K.panel(x, y, w, h);
  const s = deck.summary();
  const lines = summaryLines();
  const list = [
    { t: lines[0], bold: true, big: true },
    { t: (s.mastered ? FP.msg.OK + ' ' : '') + lines[1], color: FP.tok(s.mastered ? 'correct' : 'text'), gap: 2 }
  ];
  if (lines[2]) list.push({ t: lines[2], color: FP.tok('primary-dark'), gap: 4 });
  if (!scoredMisses.length) {
    list.push({ t: 'No items missed. Start over runs the same order again.', gap: 8 });
  } else {
    list.push({ t: 'Missed (' + scoredMisses.length + '):', bold: true, gap: 8 });
  }
  const full = scoredMisses.map(m => ({
    t: '• ' + m.card.text + ' → ' + m.card.answer + ' (you chose ' + m.chosen + ')', gap: 3 }));
  // When the full list does not fit (many misses on a phone), each item becomes one line,
  // code first, with the description truncated.
  const compact = scoredMisses.map(m => ({
    t: '• ' + m.card.answer + ' (you chose ' + m.chosen + '): ' + m.card.text, gap: 2, maxLines: 1 }));
  const fits = (items, t) => paras(list.concat(items), x + 10, y + 8, w - 20, t, true) - (y + 8) <= h - 16;
  const items = fits(full, 12) ? full : compact;
  const ts = K.fitTextSize(t => paras(list.concat(items), x + 10, y + 8, w - 20, t, true) - (y + 8), h - 16, 15, 12);
  paras(list.concat(items), x + 10, y + 8, w - 20, ts, false);
}

// ---------- Controls ----------
function positionControls() {
  const cols = gridCols();
  gridRows = Math.ceil(CODES.length / cols);
  const pitchY = 36;
  const gw = cols * 52 + (cols - 1) * 5;
  const gx = 10 + Math.max(0, (canvasWidth - 20 - gw) / 2);
  gridTop = drawHeight - 26 - gridRows * pitchY;
  codeButtons.forEach((b, i) => {
    b.position(gx + (i % cols) * 57, gridTop + Math.floor(i / cols) * pitchY);
  });
  K.flowButtons(0, [hintButton, checkButton, nextButton, null, retryButton, startOverButton]);
}

function updateControls() {
  const had = document.activeElement;
  const st = deck.state();
  const done = st.phase === 'summary';
  const choosing = st.phase === 'choose';
  const placed = st.phase === 'feedback' ? deck.placements[deck.placements.length - 1] : null;
  let rover = CODES.indexOf(pending);
  if (rover < 0) rover = 0;
  codeButtons.forEach((b, i) => {
    const c = CODES[i];
    let label = c, aria = 'Arrangement ' + c;
    if (placed) {
      if (c === placed.card.answer) { label = (placed.correct ? FP.msg.OK : '→') + ' ' + c; aria += placed.correct ? ', your answer, correct' : ', the answer'; }
      else if (c === placed.chosen) { label = FP.msg.BAD + ' ' + c; aria += ', your answer, incorrect'; }
    }
    b.html(label);
    b.attribute('aria-label', aria);
    b.attribute('aria-pressed', choosing && pending === c ? 'true' : 'false');
    b.attribute('tabindex', i === rover ? '0' : '-1');      // roving tab stop: arrows move inside the list
    K.setEnabled(b, choosing);
    if (done) b.hide(); else b.show();
  });
  for (const c of [hintButton, checkButton, nextButton]) { if (done) c.hide(); else c.show(); }
  const narrow = canvasWidth < 480;
  hintButton.html(narrow ? 'Hint' : (showHint ? 'Hide hint' : 'Show hint'));
  hintButton.attribute('aria-label', showHint ? 'Hide hint' : 'Show hint');
  K.setEnabled(checkButton, choosing);
  K.setEnabled(nextButton, st.phase === 'feedback');
  nextButton.html(st.isLast ? 'Finish' : (narrow ? 'Next' : 'Next item'));
  nextButton.attribute('aria-label', st.isLast ? 'Finish and see the summary' : 'Next item');
  const canRetry = done && deck.summary().canRetryMissed;
  if (canRetry) retryButton.show(); else retryButton.hide();
  positionControls();
  K.keepFocus(had, [checkButton, nextButton, hintButton, ...codeButtons, retryButton, startOverButton]);
  if (st.phase === 'feedback') nextButton.elt.focus();
  if (done && (had === nextButton.elt || had === document.body)) (canRetry ? retryButton : startOverButton).elt.focus();
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  updateControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
