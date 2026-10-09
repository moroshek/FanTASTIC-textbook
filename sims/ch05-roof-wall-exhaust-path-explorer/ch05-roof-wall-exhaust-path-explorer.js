// Roof and Wall Exhaust Path Explorer
// CANVAS_HEIGHT: 650
// Seven roof and wall ventilation units are shown one at a time (shuffled once per
// session) as schematic cutaways with the discharge hidden. The learner predicts the
// discharge path (Straight up / Up, then down and out / Straight out from the wall),
// then the sim reveals the path with airflow arrows. A yes/no gravity question
// follows; a summary table lets the learner reopen any unit without changing the score.
// Built on the FanPedia kit: FP.CardDeck (items, score, mastery, wording), FP.p5
// (layout, text, controls, keys), FD (palette, airflow arrows, roof deck), FP.announce.
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js,
// fan-drawings.js (load them before this file, also in the p5.js editor).

const K = FP.p5;
const SIM_ID = 'ch05-roof-wall-exhaust-path-explorer';

let canvasWidth = 800;
const drawHeight = 500;
const controlHeight = K.controlHeightFor(4);   // 150: choices, buttons, part reader (wraps at 320-400 px)
const canvasHeight = drawHeight + controlHeight;

// ---------- Content (chapter 5 spec) ----------
const PATHS = {
  up: 'Straight up',
  down: 'Up, then down and out',
  wall: 'Straight out from the wall'
};
const PATH_IDS = ['up', 'down', 'wall'];

// Part definitions revealed on click (spec list). The impeller line names the wheel
// of the unit on screen, because the shuffled order makes the spec's item numbers moot.
const PART_DEFS = {
  impeller: { label: 'Impeller', text: 'the rotating wheel that moves the air' },
  motor: { label: 'Motor', text: 'drives the impeller, directly or through a belt.' },
  motorCover: { label: 'Motor cover', text: 'the dome over the motor that also turns the discharge downward on a downblast unit.' },
  shroud: { label: 'Shroud', text: 'the spun aluminum surround that guides air into and around the impeller.' },
  skirt: { label: 'Skirt', text: 'the lower edge of the downblast unit, around which the air spills out.' },
  birdScreen: { label: 'Bird screen', text: 'a mesh that keeps birds and debris out of the discharge.' },
  curbCap: { label: 'Curb cap', text: 'the base plate that covers the roof curb and carries the fan.' },
  roofCurb: { label: 'Roof curb', text: 'the raised frame on the roof that supports the unit above the roof surface.' },
  damper: { label: 'Butterfly gravity damper', text: 'hinged blades that open when the fan runs and close by gravity when it stops, blocking backdraft and weather.' },
  weatherhood: { label: 'Weatherhood', text: 'a hood over the discharge that turns air downward and sheds rain and snow.' },
  penthouse: { label: 'Louvered penthouse', text: 'a box with fixed weather louvers on its sides.' },
  shortStack: { label: 'Short stack', text: 'a low discharge collar on a low profile unit.' },
  wallPlate: { label: 'Wall mounting plate', text: 'the plate that fixes the exhauster to an exterior wall.' },
  opening: { label: 'Opening', text: 'the weather-protected roof penetration that air passes through without a fan.' }
};

const UNITS = [
  { id: 1, name: 'Upblast centrifugal roof exhauster', short: 'Upblast roof exhauster',
    parts: ['impeller', 'motor', 'damper', 'roofCurb'], wheel: 'centrifugal', answer: 'up',
    why: 'The outlet faces the sky, so the plume goes up and away from the roof surface.' },
  { id: 2, name: 'Downblast centrifugal roof exhauster', short: 'Downblast roof exhauster',
    parts: ['impeller', 'motor', 'motorCover', 'shroud', 'skirt', 'birdScreen', 'curbCap', 'roofCurb'],
    wheel: 'centrifugal', answer: 'down',
    why: 'The motor cover turns the rising air back down so it spills out around the base.' },
  { id: 3, name: 'Hooded roof exhauster', short: 'Hooded roof exhauster',
    parts: ['impeller', 'motor', 'weatherhood', 'roofCurb'], wheel: 'centrifugal', answer: 'down',
    why: 'The hood deflects the air downward and outward, as the downblast cover does.' },
  { id: 4, name: 'Louvered roof exhauster', short: 'Louvered roof exhauster',
    parts: ['impeller', 'motor', 'penthouse', 'roofCurb'], wheel: 'centrifugal', answer: 'down',
    why: 'The air rises into the penthouse and the louvers deflect it down and outward; louvers change the look, not the path.' },
  { id: 5, name: 'Low profile roof ventilator, upblast version', short: 'Low profile ventilator (upblast)',
    parts: ['impeller', 'motor', 'shortStack', 'roofCurb'], wheel: 'axial', answer: 'up',
    why: 'It is an upblast unit built close to the deck; the profile changes, not the path.' },
  { id: 6, name: 'Centrifugal wall exhauster', short: 'Centrifugal wall exhauster',
    parts: ['impeller', 'motor', 'wallPlate'], wheel: 'centrifugal', answer: 'wall',
    why: 'It is the side-wall version of the upblast exhauster, so air leaves in a straight line away from the wall.' },
  { id: 7, name: 'Gravity relief ventilator', short: 'Gravity relief ventilator',
    parts: ['weatherhood', 'opening', 'roofCurb'], wheel: null, answer: 'down',
    why: 'Relief air rises through the opening and the hood turns it down and out; the gravity question asks whether a fan moves it.' }
];
const GRAVITY_UNIT = UNITS[6];

const QUESTION = 'Where does the exhaust air go when it leaves this unit?';
const GRAVITY_Q = 'Does this unit need a fan to move air?';
const POINTER = 'Review "On the Roof and Through the Wall", then press Start over';

// ---------- Engines ----------
// Shuffled once per session: the same seed is reused by Start over.
const SESSION_SEED = Math.floor(Math.random() * 1e9);
const deck = new FP.CardDeck({
  cards: UNITS.map(u => ({ id: u.id, answer: u.answer, answerText: PATHS[u.answer], why: u.why, unit: u })),
  seed: SESSION_SEED, attempts: 1, retryMissed: false,
  noun: 'Paths', mastery: 6, reviewPointer: POINTER, id: SIM_ID,
  // Spec wording. Correct keeps the kit default: "✓ Correct: <path>. <why>"
  messages: {
    missed: r => FP.msg.BAD + ' Not quite: this unit\'s air goes ' +
      PATHS[r.card.answer].charAt(0).toLowerCase() + PATHS[r.card.answer].slice(1) + '. ' + r.card.why
  }
});
const gravityDeck = new FP.CardDeck({
  cards: [{ id: 'gravity-fan', answer: 'no', answerText: 'No', why: '' }],
  shuffle: false, attempts: 1, retryMissed: false, noun: 'Gravity question', mastery: 1,
  id: SIM_ID + '-gravity',
  messages: {
    correct: FP.msg.OK + ' Correct: a gravity relief ventilator relies on natural pressure differences, ' +
      'such as warm air rising or supply fans pressurizing the building.',
    missed: FP.msg.BAD + ' Look for the impeller: there is none. A gravity relief ventilator moves air ' +
      'only by natural pressure differences.'
  }
});

// ---------- State ----------
let mode = 'paths';         // 'paths' | 'gravity' | 'summary'
let choice = null;          // 'up' | 'down' | 'wall' | 'yes' | 'no'
let feedback = null;        // {kind, message, chose}
let gravityFeedback = null;
let predictions = {};       // unit id -> {chosen, correct}
let gravityResult = null;   // {chosen, correct}
let selectedPart = null;
let hoverPart = null;
let reviewIndex = -1;       // summary: -1 = the table, else index into deck.order
let hits = [];              // clickable part rectangles of the last frame (screen units)
let partRow = 2, labelW = 110;

let choiceBtns = [], commitBtn, nextBtn, startOverBtn, partSelect, reviewSelect;

const keys = K.keys.bind({
  '1': () => pick(0), '2': () => pick(1), '3': () => pick(2),
  Enter: enterKey
});
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  const main = document.querySelector('main');

  for (let i = 0; i < 3; i++) {
    const b = K.button(PATHS[PATH_IDS[i]], () => pick(i));
    b.addClass('choice');
    b.attribute('aria-pressed', 'false');
    choiceBtns.push(b);
  }
  commitBtn = K.button('Commit', commit);
  nextBtn = K.button('Next unit', nextItem);
  startOverBtn = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  partSelect = createSelect();
  partSelect.parent(main);
  partSelect.attribute('aria-label', 'Read a part of the cutaway (not scored)');
  partSelect.changed(() => selectPart(partSelect.value() || null, true));

  reviewSelect = createSelect();
  reviewSelect.parent(main);
  reviewSelect.attribute('aria-label', 'Review a unit (does not change the score)');
  reviewSelect.changed(() => setReview(Number(reviewSelect.value())));

  syncControls();

  describe('Roof and wall exhaust path explorer. A schematic cutaway shows one of seven roof or wall ' +
    'ventilation units with its discharge hidden. Click a part, or use the Read a part list, to read its ' +
    'definition. Choose Straight up, Up then down and out, or Straight out from the wall and commit; the ' +
    'sim reveals the airflow path with arrows and explains it. After seven units a yes or no question asks ' +
    'whether a gravity relief ventilator needs a fan, then a summary table lists every unit and its path.');
}

// ---------- Current view ----------
function currentUnit() {
  if (mode === 'paths') return deck.state().card.unit;
  if (mode === 'gravity') return GRAVITY_UNIT;
  return reviewIndex >= 0 ? deck.order[reviewIndex].unit : null;
}
function revealed() {
  if (mode === 'paths') return deck.state().phase === 'feedback';
  return true;
}

// ---------- Controls ----------
function choiceIds() { return mode === 'gravity' ? ['yes', 'no'] : PATH_IDS; }

function syncControls() {
  const had = document.activeElement;
  const st = deck.state();
  const answering = mode === 'paths' ? st.phase === 'choose' : mode === 'gravity' ? gravityDeck.state().phase === 'choose' : false;
  const ids = choiceIds();
  choiceBtns.forEach((b, i) => {
    if (mode === 'summary' || i >= ids.length) { b.hide(); return; }
    b.show();
    const label = mode === 'gravity' ? (ids[i] === 'yes' ? 'Yes, it needs a fan' : 'No, no fan') : PATHS[ids[i]];
    b.html(label);
    b.attribute('aria-label', (i + 1) + ': ' + label);
    b.attribute('aria-pressed', choice === ids[i] ? 'true' : 'false');
    K.setEnabled(b, answering);
  });
  if (mode === 'summary') { commitBtn.hide(); nextBtn.hide(); } else { commitBtn.show(); nextBtn.show(); }
  K.setEnabled(commitBtn, answering && choice !== null);
  const resolved = mode === 'paths' ? st.phase === 'feedback' : mode === 'gravity' && gravityDeck.state().phase === 'feedback';
  K.setEnabled(nextBtn, resolved);
  const nextLabel = mode === 'gravity' ? 'Show summary' : (st.isLast ? 'Gravity question' : 'Next unit');
  nextBtn.html(nextLabel);
  if (mode === 'summary') reviewSelect.show(); else reviewSelect.hide();
  rebuildPartSelect();
  positionControls();
  K.keepFocus(had, choiceBtns.concat([commitBtn, nextBtn, startOverBtn]));
}

let partOptionsKey = '';
function rebuildPartSelect() {
  const u = currentUnit();
  const key = u ? u.id + ':' + mode : 'none';
  if (key === partOptionsKey) return;
  partOptionsKey = key;
  partSelect.elt.innerHTML = '';
  if (!u) {
    partSelect.option('Choose a unit to review first', '');
    K.setEnabled(partSelect, false);
    return;
  }
  partSelect.option('Choose a part…', '');
  for (const id of u.parts) partSelect.option(PART_DEFS[id].label, id);
  partSelect.selected(selectedPart && u.parts.includes(selectedPart) ? selectedPart : '');
  K.setEnabled(partSelect, true);
}

function rebuildReviewSelect() {
  reviewSelect.elt.innerHTML = '';
  reviewSelect.option('Summary table', '-1');
  deck.order.forEach((c, i) => reviewSelect.option('Unit ' + (i + 1) + ': ' + c.unit.short, String(i)));
  reviewSelect.selected(String(reviewIndex));
}

function positionControls() {
  const narrow = canvasWidth < 480;
  const pad = K.layout.margin;
  labelW = narrow ? 96 : 110;
  let row;
  if (mode === 'summary') {
    reviewSelect.position(labelW - 30, K.controlRow(0));
    reviewSelect.style('max-width', Math.max(120, canvasWidth - labelW + 30 - pad) + 'px');
    row = K.flowButtons(1, [startOverBtn]);
  } else {
    row = K.flowButtons(0, choiceBtns.concat(['|', commitBtn, nextBtn, '|', startOverBtn]),
      { groupGap: narrow ? 8 : 16 });
  }
  partRow = row;
  partSelect.position(labelW, K.controlRow(partRow));
  partSelect.style('max-width', Math.max(120, canvasWidth - labelW - pad) + 'px');
}

// ---------- Actions ----------
function pick(i) {
  const ids = choiceIds();
  if (mode === 'summary' || i >= ids.length) return;
  const phase = mode === 'paths' ? deck.state().phase : gravityDeck.state().phase;
  if (phase !== 'choose') return;
  choice = ids[i];
  syncControls();
  commitBtn.elt.focus();   // Enter now commits (a focused choice button would take Enter itself)
  FP.announce('Selected: ' + choiceBtns[i].html().replace(/^\s+/, '') + '. Press Commit or Enter.');
}

function commit() {
  if (choice === null) return;
  if (mode === 'paths') {
    const st = deck.state();
    if (st.phase !== 'choose') return;
    const res = deck.place(choice);
    if (res.status === 'ignored') return;
    predictions[st.card.unit.id] = { chosen: choice, correct: res.status === 'correct' };
    feedback = { kind: res.kind, message: res.message, chose: PATHS[choice] };
    FP.announce('You chose ' + PATHS[choice] + '. ' + res.message + ' This unit is the ' + st.card.unit.name + '.');
  } else if (mode === 'gravity') {
    const res = gravityDeck.place(choice);
    if (res.status === 'ignored') return;
    gravityResult = { chosen: choice, correct: res.status === 'correct' };
    gravityFeedback = { kind: res.kind, message: res.message, chose: choice === 'yes' ? 'Yes' : 'No' };
    FP.announce('You chose ' + gravityFeedback.chose + '. ' + res.message);
  }
  syncControls();
  nextBtn.elt.focus();
}

function nextItem() {
  if (mode === 'paths') {
    const st = deck.state();
    if (st.phase !== 'feedback') return;
    deck.next();   // after the last unit the deck closes its round (summary, events)
    choice = null; feedback = null; selectedPart = null;
    if (deck.state().phase === 'summary') {
      mode = 'gravity';
      syncControls();
      FP.announce('Gravity question. The gravity relief ventilator is shown again. ' + GRAVITY_Q);
    } else {
      syncControls();
      FP.announce('Unit ' + (deck.state().index + 1) + ' of ' + UNITS.length + '. ' + QUESTION);
    }
    choiceBtns[0].elt.focus();
  } else if (mode === 'gravity') {
    if (gravityDeck.state().phase !== 'feedback') return;
    gravityDeck.next();
    mode = 'summary';
    choice = null; selectedPart = null; reviewIndex = -1;
    rebuildReviewSelect();
    syncControls();
    FP.announce('Summary. ' + summaryLines().join(' ') + ' Use the Review list to reopen any unit.');
    reviewSelect.elt.focus();
  }
}

function setReview(i) {
  reviewIndex = isNaN(i) ? -1 : i;
  selectedPart = null;
  syncControls();
  if (reviewIndex >= 0) {
    const u = deck.order[reviewIndex].unit;
    FP.announce('Reviewing unit ' + (reviewIndex + 1) + ', ' + u.name + ': ' + PATHS[u.answer] + '. ' + u.why +
      ' Reviewing does not change the score.');
  } else {
    FP.announce('Summary table. ' + summaryLines().join(' '));
  }
}

function startOver() {
  deck.newRound(SESSION_SEED);   // same session order
  gravityDeck.newRound();
  mode = 'paths';
  choice = null; feedback = null; gravityFeedback = null; gravityResult = null;
  predictions = {}; selectedPart = null; reviewIndex = -1;
  partOptionsKey = '';
  syncControls();
  FP.announce('Started over. Unit 1 of ' + UNITS.length + '. ' + QUESTION);
  choiceBtns[0].elt.focus();
}

function enterKey() {
  if (mode === 'summary') return;
  const phase = mode === 'paths' ? deck.state().phase : gravityDeck.state().phase;
  if (phase === 'choose') { if (choice !== null) commit(); else FP.announce('Choose a path first: keys 1 to ' + choiceIds().length + '.'); }
  else if (phase === 'feedback') nextItem();
}

function selectPart(id, fromSelect) {
  const u = currentUnit();
  if (!u || (id && !u.parts.includes(id))) return;
  selectedPart = id;
  if (!fromSelect) partSelect.selected(id || '');
  if (id) FP.announce(partSentence(id, u) + ' Reading parts is not scored.');
}

function partSentence(id, u) {
  const d = PART_DEFS[id];
  let t = d.label + ': ' + d.text;
  if (id === 'impeller') t += u.wheel === 'axial' ? ' (in this unit, an axial propeller).' : ' (in this unit, a centrifugal wheel).';
  return t;
}

function mousePressed() {
  if (mouseY < 0 || mouseY > drawHeight || mouseX < 0 || mouseX > width) return;
  for (let i = hits.length - 1; i >= 0; i--) {
    const h = hits[i];
    if (mouseX >= h.x && mouseX <= h.x + h.w && mouseY >= h.y && mouseY <= h.y + h.h) {
      selectPart(h.id, false);
      return;
    }
  }
}

function hitAt(x, y) {
  for (let i = hits.length - 1; i >= 0; i--) {
    const h = hits[i];
    if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h.id;
  }
  return null;
}

// ---------- Summary ----------
function masteryReached() {
  return deck.summary().mastered && gravityResult && gravityResult.correct;
}
function summaryLines() {
  const s = deck.summary();
  const g = gravityResult ? (gravityResult.correct ? FP.msg.OK + ' correct (No)' : FP.msg.BAD + ' missed (the answer is No)') : 'not answered';
  return [
    s.lines[0] + ' (paths)',
    'Gravity question: ' + g + '.',
    masteryReached() ? 'Mastery reached (6 of 7 paths plus the gravity question needed).'
      : 'Mastery needs 6 of 7 paths plus the gravity question on the first attempt. ' + POINTER + '.'
  ];
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  hits = [];
  let y = K.title('Roof and Wall Exhaust Path Explorer');
  const st = deck.state();
  const right = mode === 'paths' ? 'Unit ' + (st.index + 1) + ' of ' + UNITS.length + ' · one attempt'
    : mode === 'gravity' ? 'Gravity question · one attempt' : 'Summary · review is not scored';
  y = K.statusLine(st.scoreLabel, right, null, { y: y - 4 });
  K.note(canvasWidth >= 560
    ? ['Schematic cutaways, not to scale', 'Source: FanPedia pp. 5, 19, 181', 'Keys: 1–3 choose, Enter commits or goes on']
    : ['Schematic cutaways', 'FanPedia pp. 5, 19', 'Keys 1–3, Enter']);

  const top = y + 2, bottom = drawHeight - 24, wide = canvasWidth >= 600;
  if (mode === 'summary' && reviewIndex < 0) {
    K.panel(10, top, canvasWidth - 20, bottom - top);
    drawSummary(20, top + 8, canvasWidth - 40, bottom - top - 16);
  } else {
    let cut, txt;
    if (wide) {
      const cw = Math.round(canvasWidth * 0.5);
      cut = { x: 10, y: top, w: cw - 15, h: bottom - top };
      txt = { x: cw + 5, y: top, w: canvasWidth - cw - 15, h: bottom - top };
    } else {
      const ch = Math.min(220, Math.round((bottom - top) * 0.47));
      cut = { x: 10, y: top, w: canvasWidth - 20, h: ch };
      txt = { x: 10, y: top + ch + 6, w: canvasWidth - 20, h: bottom - top - ch - 6 };
    }
    K.panel(cut.x, cut.y, cut.w, cut.h);
    K.panel(txt.x, txt.y, txt.w, txt.h);
    drawCutawayPanel(cut);
    drawTextPanel(txt.x + 10, txt.y + 8, txt.w - 20, txt.h - 16);
  }
  drawControlLabels();
  const h = mouseY >= 0 && mouseY <= drawHeight ? hitAt(mouseX, mouseY) : null;
  hoverPart = h;
  cursor(h ? HAND : ARROW);
}

function drawControlLabels() {
  noStroke();
  fill(FP.tok('text'));
  textStyle(BOLD);
  textSize(canvasWidth < 480 ? 14 : 15);
  textAlign(LEFT, CENTER);
  text(canvasWidth < 480 ? 'Read part:' : 'Read a part:', 10, K.controlLabel(partRow));
  if (mode === 'summary') text('Review:', 10, K.controlLabel(0));
  textStyle(NORMAL);
}

// Paragraph renderer: [{t, bold, muted, color, gap, size}] → y below. dry = measure only.
function paras(list, x, y, w, ts, dry) {
  for (const p of list) {
    const s = p.size ? Math.max(12, ts + p.size) : ts;
    textSize(s);
    textStyle(p.bold ? BOLD : NORMAL);
    fill(p.color || FP.tok(p.muted ? 'text-muted' : 'text'));
    y += p.gap || 0;
    y = K.wrapText(p.t, x, y, w, Math.round(s * 1.3), { dryRun: dry });
  }
  textStyle(NORMAL);
  return y;
}

// Blocks: {paras: [...]} or {box: 'ok'|'bad'|'info', paras: [...]} drawn in a bordered panel.
function blocks(list, x, y, w, ts, dry) {
  const pad = 8;
  for (const b of list) {
    y += b.gap || 0;
    if (!b.box) { y = paras(b.paras, x, y, w, ts, dry); continue; }
    const h = paras(b.paras, x + pad, y + pad, w - 2 * pad, ts, true) + pad - y;
    if (!dry) {
      const st = b.box === 'ok' ? { fill: '--fp-correct-bg', stroke: '--fp-correct', weight: 2 }
        : b.box === 'bad' ? { fill: '--fp-incorrect-bg', stroke: '--fp-incorrect', weight: 2, dashed: true }
        : { fill: '--fp-primary-bg', stroke: '--fp-primary', weight: 1 };
      K.panel(x - 2, y, w + 4, h, st);
      paras(b.paras, x + pad, y + pad, w - 2 * pad, ts, false);
    }
    y += h;
  }
  return y;
}

function drawTextPanel(x, y, w, h) {
  const u = currentUnit();
  const list = [];
  if (mode === 'paths') {
    const st = deck.state();
    const rev = st.phase === 'feedback';
    list.push({ paras: [{ t: 'Unit ' + (st.index + 1) + ' of ' + UNITS.length + (rev ? ': ' + u.name : ''), bold: true, size: 1 }] });
    list.push({ gap: 4, paras: [{ t: QUESTION, bold: !rev }] });
    if (feedback) {
      list.push({ gap: 6, paras: [{ t: 'You chose: ' + feedback.chose, muted: true }] });
      list.push({ gap: 4, box: feedback.kind, paras: [{ t: feedback.message,
        color: FP.tok(feedback.kind === 'ok' ? 'correct' : 'incorrect') }] });
    } else {
      list.push({ gap: 4, paras: [{ t: 'Choose a path below (keys 1–3), then Commit.', muted: true }] });
    }
  } else if (mode === 'gravity') {
    list.push({ paras: [{ t: 'Gravity question: ' + u.name, bold: true, size: 1 }] });
    list.push({ gap: 4, paras: [{ t: GRAVITY_Q, bold: !gravityFeedback }] });
    if (gravityFeedback) {
      list.push({ gap: 6, paras: [{ t: 'You chose: ' + gravityFeedback.chose, muted: true }] });
      list.push({ gap: 4, box: gravityFeedback.kind, paras: [{ t: gravityFeedback.message,
        color: FP.tok(gravityFeedback.kind === 'ok' ? 'correct' : 'incorrect') }] });
    } else {
      list.push({ gap: 4, paras: [{ t: 'Keys: 1 = Yes, 2 = No, then Enter to commit.', muted: true }] });
    }
  } else {
    const p = predictions[u.id] || {};
    list.push({ paras: [{ t: 'Unit ' + (reviewIndex + 1) + ' of ' + UNITS.length + ': ' + u.name, bold: true, size: 1 }] });
    list.push({ gap: 4, paras: [{ t: 'Your prediction: ' + (p.chosen ? PATHS[p.chosen] + ' ' + (p.correct ? FP.msg.OK : FP.msg.BAD) : '—'),
      color: FP.tok(p.correct ? 'correct' : 'incorrect') }] });
    list.push({ gap: 4, box: 'info', paras: [{ t: 'Path: ' + PATHS[u.answer] + '. ' + u.why }] });
    list.push({ gap: 4, paras: [{ t: 'Reviewing does not change the score. Choose "Summary table" in the Review list to go back.', muted: true }] });
  }
  if (selectedPart) {
    list.push({ gap: 8, box: 'info', paras: [{ t: partSentence(selectedPart, u) }] });
  } else {
    list.push({ gap: 8, paras: [{ t: 'Click a part of the cutaway, or use Read a part, to read its definition (not scored).', muted: true }] });
  }
  const ts = K.fitTextSize(t => blocks(list, x, y, w, t, true) - y, h, 16, 12);
  textAlign(LEFT, TOP);
  blocks(list, x, y, w, ts, false);
}

function drawSummary(x, y, w, h) {
  const lines = summaryLines();
  const wide = w >= 560;
  const rows = deck.order.map((c, i) => {
    const p = predictions[c.unit.id] || {};
    return { i, u: c.unit, chosen: p.chosen ? PATHS[p.chosen] : '—', ok: !!p.correct, path: PATHS[c.unit.answer] };
  });
  const layout = (ts, dry) => {
    let yy = y;
    textSize(ts + 1); textStyle(BOLD); fill(FP.tok('text'));
    if (!dry) text('Summary: seven units and their discharge paths', x, yy);
    yy += Math.round((ts + 1) * 1.4);
    textStyle(NORMAL); textSize(ts);
    const lh = Math.round(ts * 1.3);
    if (wide) {
      const c1 = x, c2 = x + 26, c3 = x + w * 0.44, c4 = x + w * 0.72;
      if (!dry) {
        textStyle(BOLD); fill(FP.tok('text-muted'));
        text('#', c1, yy); text('Unit', c2, yy); text('Your path', c3, yy); text('Correct path', c4, yy);
        textStyle(NORMAL);
      }
      yy += lh + 2;
      for (const r of rows) {
        if (!dry) {
          fill(FP.tok('text'));
          text(String(r.i + 1), c1, yy); text(r.u.short, c2, yy);
          fill(FP.tok(r.ok ? 'correct' : 'incorrect'));
          text((r.ok ? FP.msg.OK : FP.msg.BAD) + ' ' + r.chosen, c3, yy);
          fill(FP.tok('text'));
          text(r.path, c4, yy);
        }
        yy += lh + 2;
      }
    } else {
      for (const r of rows) {
        if (!dry) { fill(FP.tok('text')); textStyle(BOLD); text((r.i + 1) + '. ' + r.u.short, x, yy); textStyle(NORMAL); }
        yy += lh;
        if (!dry) {
          fill(FP.tok(r.ok ? 'correct' : 'incorrect'));
          text((r.ok ? FP.msg.OK + ' ' : FP.msg.BAD + ' You: ' + r.chosen + ' · ') + r.path, x + 12, yy);
        }
        yy += lh + 1;
      }
    }
    yy += 6;
    for (let i = 0; i < lines.length; i++) {
      textStyle(i === 2 ? BOLD : NORMAL);
      fill(FP.tok(i === 2 ? (masteryReached() ? 'correct' : 'text') : 'text'));
      yy = K.wrapText(lines[i], x, yy, w, lh, { dryRun: dry });
    }
    textStyle(NORMAL);
    yy += 4;
    fill(FP.tok('text-muted'));
    yy = K.wrapText('Choose a unit in the Review list to see its cutaway and path again.', x, yy, w, lh, { dryRun: dry });
    return yy - y;
  };
  noStroke();
  textAlign(LEFT, TOP);
  const ts = K.fitTextSize(t => layout(t, true), h, 16, 12);
  layout(ts, false);
}

// ---------- Cutaway drawings (local units: 320 × 270, roof deck at y = 232) ----------
const LW = 320, LH = 270, ROOF = 232;

function drawCutawayPanel(box) {
  const u = currentUnit();
  noStroke();
  fill(FP.tok('text-muted'));
  textSize(13);
  textAlign(LEFT, TOP);
  text('Cutaway (schematic)', box.x + 8, box.y + 6);
  const inner = { x: box.x + 6, y: box.y + 22, w: box.w - 12, h: box.h - 28 };
  const f = FD.frame(inner, LW, 0, LH);
  const show = revealed();
  drawUnit(u, f, show, box);
  // Selected part name tag (the definition is in the text panel)
  if (selectedPart) {
    const hb = hits.filter(h => h.id === selectedPart);
    if (hb.length) {
      const b = hb[0];
      textSize(13);
      textStyle(BOLD);
      const label = PART_DEFS[selectedPart].label;
      const tw = textWidth(label) + 10;
      let lx = Math.max(box.x + 4, Math.min(box.x + box.w - tw - 4, b.x + b.w / 2 - tw / 2));
      let ly = b.y - 22 < box.y + 20 ? b.y + b.h + 4 : b.y - 22;
      ly = Math.min(ly, box.y + box.h - 22);
      stroke(FP.tok('accent'));
      strokeWeight(1.5);
      fill(255);
      rect(lx, ly, tw, 19, 4);
      noStroke();
      fill(FP.tok('text'));
      textAlign(LEFT, TOP);
      text(label, lx + 5, ly + 3);
      textStyle(NORMAL);
    }
  }
}

// One clickable part: styles the stroke (selected: accent glow, heavier; hover: primary),
// runs the shapes and records its hit boxes [[x0, y0, x1, y1], ...] in local units.
function part(f, id, fillC, shapes, boxes) {
  const pal = FD.palette();
  push();
  if (id === selectedPart) {
    drawingContext.shadowColor = pal.accent;
    drawingContext.shadowBlur = 12;
    stroke(pal.accent);
    strokeWeight(3);
  } else if (id === hoverPart) {
    stroke(pal.primary);
    strokeWeight(2.5);
  } else {
    stroke(pal.edge);
    strokeWeight(1.5);
  }
  if (fillC) fill(fillC); else noFill();
  shapes();
  pop();
  for (const b of boxes) {
    hits.push({ id, x: f.X(b[0]), y: f.Y(b[1]), w: f.S(b[2] - b[0]), h: f.S(b[3] - b[1]) });
  }
}
function R(f, x0, y0, x1, y1, r) { rect(f.X(x0), f.Y(y0), f.S(x1 - x0), f.S(y1 - y0), f.S(r || 0)); }
function PL(f, pts, close) {
  beginShape();
  for (const p of pts) vertex(f.X(p[0]), f.Y(p[1]));
  if (close) endShape(CLOSE); else endShape();
}
function LN(f, x1, y1, x2, y2) { line(f.X(x1), f.Y(y1), f.X(x2), f.Y(y2)); }
function mirror(pts) { return pts.map(p => [LW - p[0], p[1]]); }

function deco(f, fn) {   // non-clickable unit body
  const pal = FD.palette();
  push();
  stroke(pal.edge);
  strokeWeight(1.5);
  fill(pal.metal);
  fn(pal);
  pop();
}

function sceneLabels(f, wall, box) {
  noStroke();
  fill(FP.tok('text-muted'));
  textSize(13);
  textStyle(NORMAL);
  if (wall) {
    textAlign(RIGHT, TOP);
    text('Inside', f.X(48), f.Y(6));
    text('Exterior', f.X(48), f.Y(226));
    text('wall', f.X(48), f.Y(226) + 15);
    text('Outside', f.X(LW - 4), f.Y(6));
  } else {
    // Panel coordinates, so the labels stay left of the unit at every width
    textAlign(LEFT, BOTTOM);
    text('Outside', box.x + 8, f.Y(ROOF) - 4);
    textAlign(LEFT, TOP);
    text(box.w < 440 ? 'Inside' : 'Inside the building', box.x + 8, f.Y(ROOF) + 12);
  }
  textAlign(LEFT, TOP);
}

function roofDeck(f) {
  FD.floor(null, { frame: f, x0: 0, x1: 110, y: ROOF });
  FD.floor(null, { frame: f, x0: 210, x1: LW, y: ROOF });
}

function roofCurb(f) {
  const pal = FD.palette();
  part(f, 'roofCurb', pal.metalSide, () => { R(f, 110, 192, 122, ROOF); R(f, 198, 192, 210, ROOF); },
    [[108, 190, 124, ROOF + 2], [196, 190, 212, ROOF + 2]]);
}

function flange(f, x0, x1, y) { deco(f, pal => { fill(pal.metalSide); R(f, x0, y, x1, y + 7); }); }

function centrifugalWheel(f, x0, y0, x1, y1) {
  const pal = FD.palette();
  part(f, 'impeller', pal.metal, () => {
    R(f, x0, y0, x1, y1, 2);
    strokeWeight(1.2);
    for (let x = x0 + 6; x < x1 - 2; x += 7) LN(f, x, y0 + 3, x, y1 - 3);
    strokeWeight(4);
    LN(f, x0 - 2, y0, x1 + 2, y0);      // back plate
  }, [[x0 - 2, y0 - 3, x1 + 2, y1]]);
  deco(f, () => { strokeWeight(3); LN(f, 160, y0, 160, y0 - 14); });   // shaft to the motor
}

function motorAt(f, x0, y0, x1, y1) {
  const pal = FD.palette();
  part(f, 'motor', pal.motor, () => {
    R(f, x0, y0, x1, y1, 4);
    strokeWeight(1);
    for (let y = y0 + 7; y < y1 - 4; y += 7) LN(f, x0 + 4, y, x1 - 4, y);
  }, [[x0, y0, x1, y1]]);
}

function hood(f, peak, eave, bottom) {
  const pal = FD.palette();
  part(f, 'weatherhood', pal.metal, () => {
    PL(f, [[64, eave + 4], [160, peak], [256, eave + 4], [256, eave + 12], [160, peak + 8], [64, eave + 12]], true);
    R(f, 70, eave + 8, 78, bottom);
    R(f, 242, eave + 8, 250, bottom);
  }, [[62, peak - 2, 258, eave + 14], [66, eave + 14, 82, bottom], [238, eave + 14, 254, bottom]]);
}

function drawUnit(u, f, show, box) {
  const pal = FD.palette();
  const wallUnit = u.id === 6;
  sceneLabels(f, wallUnit, box);
  if (!wallUnit) roofDeck(f);
  const arrows = [];   // polylines in local units; the last segment gets the arrowhead
  switch (u.id) {
    case 1: {   // Upblast centrifugal roof exhauster
      roofCurb(f);
      flange(f, 100, 220, 185);
      deco(f, () => { R(f, 112, 62, 120, 185); R(f, 200, 62, 208, 185); });   // windband
      centrifugalWheel(f, 126, 150, 194, 180);
      motorAt(f, 143, 96, 177, 136);
      part(f, 'damper', pal.steel, () => {
        if (show) {   // open: the fan is running
          PL(f, [[158, 62], [146, 24], [150, 22], [161, 60]], true);
          PL(f, [[162, 62], [174, 24], [170, 22], [159, 60]], true);
        } else {      // closed by gravity
          R(f, 120, 58, 159, 63);
          R(f, 161, 58, 200, 63);
        }
        fill(pal.edge);
        circle(f.X(160), f.Y(61), f.S(5));
      }, show ? [[140, 18, 180, 66]] : [[118, 54, 202, 67]]);
      arrows.push([[140, 268], [140, 196]], [[180, 268], [180, 196]]);
      arrows.push([[132, 56], [132, 6]], [[188, 56], [188, 6]]);
      break;
    }
    case 2: {   // Downblast centrifugal roof exhauster
      roofCurb(f);
      part(f, 'curbCap', pal.metalSide, () => { R(f, 100, 185, 125, 192); R(f, 195, 185, 220, 192); },
        [[98, 183, 127, 194], [193, 183, 222, 194]]);
      const sh = [[118, 185], [126, 185], [126, 156], [114, 142], [106, 142], [118, 156]];
      part(f, 'shroud', pal.metal, () => { PL(f, sh, true); PL(f, mirror(sh), true); },
        [[104, 140, 128, 186], [192, 140, 216, 186]]);
      part(f, 'birdScreen', null, () => {
        R(f, 80, 140, 104, 185); R(f, 216, 140, 240, 185);
        strokeWeight(0.8);
        for (let yy = 146; yy < 185; yy += 6) { LN(f, 80, yy, 104, yy); LN(f, 216, yy, 240, yy); }
        for (let xx = 86; xx < 104; xx += 6) { LN(f, xx, 140, xx, 185); LN(f, LW - xx, 140, LW - xx, 185); }
      }, [[78, 140, 106, 186], [214, 140, 242, 186]]);
      part(f, 'skirt', pal.metalSide, () => { R(f, 78, 116, 86, 140); R(f, 234, 116, 242, 140); },
        [[76, 114, 88, 141], [232, 114, 244, 141]]);
      const outer = [], inner = [];
      for (let i = 0; i <= 24; i++) {
        const a = Math.PI + Math.PI * i / 24;
        outer.push([160 + 82 * Math.cos(a), 118 + 70 * Math.sin(a)]);
        inner.push([160 + 74 * Math.cos(a), 118 + 62 * Math.sin(a)]);
      }
      part(f, 'motorCover', pal.metal, () => { PL(f, outer.concat(inner.reverse()), true); inner.reverse(); },
        [[76, 44, 244, 70], [76, 70, 96, 116], [224, 70, 244, 116]]);
      centrifugalWheel(f, 128, 146, 192, 176);
      motorAt(f, 143, 96, 177, 132);
      arrows.push([[136, 268], [136, 86], [97, 86], [97, 150], [60, 200]]);
      arrows.push(mirror([[136, 268], [136, 86], [97, 86], [97, 150], [60, 200]]));
      break;
    }
    case 3: {   // Hooded roof exhauster
      roofCurb(f);
      flange(f, 104, 216, 185);
      deco(f, () => { R(f, 118, 140, 124, 185); R(f, 196, 140, 202, 185); });
      hood(f, 40, 78, 150);
      centrifugalWheel(f, 128, 148, 192, 178);
      motorAt(f, 143, 102, 177, 134);
      arrows.push([[136, 268], [136, 92], [94, 92], [94, 160], [56, 200]]);
      arrows.push(mirror([[136, 268], [136, 92], [94, 92], [94, 160], [56, 200]]));
      break;
    }
    case 4: {   // Louvered roof exhauster
      roofCurb(f);
      flange(f, 96, 224, 185);
      deco(f, () => { R(f, 118, 140, 124, 185); R(f, 196, 140, 202, 185); });
      part(f, 'penthouse', pal.metal, () => {
        R(f, 74, 50, 246, 58);
        noFill();
        R(f, 78, 58, 96, 185); R(f, 224, 58, 242, 185);
        strokeWeight(2.5);
        for (let yy = 66; yy < 182; yy += 13) { LN(f, 94, yy, 80, yy + 9); LN(f, 226, yy, 240, yy + 9); }
      }, [[72, 48, 248, 60], [76, 58, 98, 186], [222, 58, 244, 186]]);
      centrifugalWheel(f, 128, 148, 192, 178);
      motorAt(f, 143, 102, 177, 134);
      arrows.push([[136, 268], [136, 86], [108, 94], [60, 124]]);
      arrows.push(mirror([[136, 268], [136, 86], [108, 94], [60, 124]]));
      break;
    }
    case 5: {   // Low profile roof ventilator, upblast
      roofCurb(f);
      flange(f, 100, 220, 185);
      part(f, 'shortStack', pal.metal, () => { R(f, 102, 142, 110, 185); R(f, 210, 142, 218, 185); },
        [[100, 140, 112, 186], [208, 140, 220, 186]]);
      deco(f, () => { strokeWeight(2); LN(f, 110, 150, 146, 140); LN(f, 210, 150, 174, 140); });   // motor struts
      part(f, 'impeller', pal.metal, () => {
        PL(f, [[114, 167], [152, 161], [152, 175], [114, 171]], true);
        PL(f, [[206, 167], [168, 161], [168, 175], [206, 171]], true);
        fill(pal.hub);
        R(f, 152, 158, 168, 178, 3);
      }, [[112, 156, 208, 180]]);
      deco(f, () => { strokeWeight(3); LN(f, 160, 158, 160, 152); });
      motorAt(f, 146, 126, 174, 152);
      arrows.push([[136, 268], [136, 194]], [[184, 268], [184, 194]]);
      arrows.push([[126, 136], [126, 70]], [[194, 136], [194, 70]]);
      break;
    }
    case 6: {   // Centrifugal wall exhauster (horizontal shaft)
      deco(f, p => {
        fill(p.metalSide);
        R(f, 52, 14, 72, 92); R(f, 52, 168, 72, 262);
        strokeWeight(1);
        for (let yy = 20; yy < 262; yy += 12) {
          if (yy > 88 && yy < 168) continue;
          LN(f, 52, yy + 8, 60, yy);
        }
      });
      part(f, 'wallPlate', pal.steel, () => { R(f, 72, 70, 82, 92); R(f, 72, 168, 82, 190); },
        [[70, 68, 84, 94], [70, 166, 84, 192]]);
      deco(f, () => { R(f, 82, 76, 204, 84); R(f, 82, 176, 204, 184); });   // housing walls
      part(f, 'impeller', pal.metal, () => {
        R(f, 92, 98, 122, 162, 2);
        strokeWeight(1.2);
        for (let yy = 104; yy < 160; yy += 7) LN(f, 95, yy, 119, yy);
        strokeWeight(4);
        LN(f, 122, 96, 122, 164);
      }, [[90, 94, 124, 166]]);
      deco(f, () => { strokeWeight(3); LN(f, 122, 130, 148, 130); });
      motorAt(f, 148, 110, 192, 150);
      arrows.push([[8, 130], [86, 130]]);
      arrows.push([[206, 104], [300, 104]], [[206, 156], [300, 156]]);
      break;
    }
    case 7: {   // Gravity relief ventilator (no impeller)
      roofCurb(f);
      flange(f, 104, 216, 185);
      part(f, 'opening', null, () => {
        fill(pal.metalSide);
        R(f, 120, 150, 127, 186); R(f, 193, 150, 200, 186);
        noFill();
        drawingContext.setLineDash([4, 4]);
        R(f, 129, 152, 191, 186);
        drawingContext.setLineDash([]);
      }, [[118, 148, 202, 188]]);
      hood(f, 60, 96, 150);
      arrows.push([[140, 268], [140, 112], [96, 112], [96, 162], [60, 200]]);
      arrows.push(mirror([[140, 268], [140, 112], [96, 112], [96, 162], [60, 200]]));
      break;
    }
  }
  if (show) drawArrows(f, arrows);
  else drawHidden(f, wallUnit);
}

function drawArrows(f, polylines) {
  const air = FD.palette().air;
  for (const pts of polylines) {
    push();
    stroke(air);
    strokeWeight(Math.max(2, f.S(3)));
    noFill();
    for (let i = 0; i < pts.length - 2; i++) LN(f, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    pop();
    if (pts.length > 2) {   // a mid-segment head shows which way the entering air moves
      const p0 = pts[0], p1 = pts[1];
      const ang = Math.atan2(f.Y(p1[1]) - f.Y(p0[1]), f.X(p1[0]) - f.X(p0[0]));
      FD.arrowHead(null, (f.X(p0[0]) + f.X(p1[0])) / 2, (f.Y(p0[1]) + f.Y(p1[1])) / 2 + 6, ang, Math.max(8, f.S(11)), air);
    }
    const a = pts[pts.length - 2], b = pts[pts.length - 1];
    FD.airflowArrow(null, { frame: f, x1: a[0], y1: a[1], x2: b[0], y2: b[1], weight: Math.max(2, f.S(3)), head: Math.max(8, f.S(12)) });
  }
}

function drawHidden(f, wallUnit) {
  const cx = wallUnit ? 262 : 160, cy = wallUnit ? 130 : 22;
  push();
  stroke(FP.tok('text-muted'));
  strokeWeight(1.5);
  drawingContext.setLineDash([5, 4]);
  fill(255);
  circle(f.X(cx), f.Y(cy), Math.max(26, f.S(30)));
  drawingContext.setLineDash([]);
  noStroke();
  fill(FP.tok('text'));
  textStyle(BOLD);
  textSize(Math.max(14, f.S(20)));
  textAlign(CENTER, CENTER);
  text('?', f.X(cx), f.Y(cy) + 1);
  pop();
  textAlign(LEFT, TOP);
}

// ---------- Resize ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
