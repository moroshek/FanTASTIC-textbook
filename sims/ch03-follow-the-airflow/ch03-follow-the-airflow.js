// Follow the Airflow Through a Centrifugal Fan - p5.js MicroSim (Chapter 3: Basic Fan Anatomy)
// CANVAS_HEIGHT: 820
// Eleven part cards: eight go into numbered air-path slots 1-8 on a side view of a belt-driven
// Arrangement 9 SWSI centrifugal fan, three go into "Not in the air path". Two submissions:
// correct cards lock, wrong cards return to the pile with their feedback; after the second
// submission every position is revealed and the air path animates once from slot 1 to slot 8.
// Built on the FanPedia kit: FP.Score (first/any-attempt scoring, mastery lines), FP.msg
// (wording), FP.rng (shuffle), FP.events, FP.announce, FP.p5 (layout, text, keys, focus),
// FD.arrangement and FD side-view parts (the fan drawing).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js, fan-drawings.js
// (load them before this file, also in the p5.js editor).

const K = FP.p5;
const SIM_ID = 'ch03-follow-the-airflow';

// ---------- Canvas layout ----------
let canvasWidth = 800;
const drawHeight = 775;
const controlHeight = K.controlHeightFor(1);   // Submit · Back to pile · Replay · Start over
const canvasHeight = drawHeight + controlHeight;
const PROMPT = 'A cubic foot of air enters the inlet duct. In what order does it meet the fan\'s parts?';
const BIN = 'bin';
const DATA_NOTE = ['Belt-driven SWSI fan, Arrangement 9 (FanPedia p. 10)',
  'Keys: 1-8 slot, 0 not in air path, P pile, Esc deselect'];

// ---------- Content (chapter specification) ----------
const CARDS = [
  { id: 'inlet-duct', label: 'Inlet ductwork', place: 1, why: 'Air arrives from the upstream duct.' },
  { id: 'inlet-flange', label: 'Inlet flange (with companion flange)', place: 2,
    why: 'The bolted joint where the duct meets the fan inlet.' },
  { id: 'inlet-funnel', label: 'Inlet funnel', place: 3, why: 'Funnels the air smoothly into the eye of the impeller.' },
  { id: 'impeller', label: 'Impeller', place: 4,
    why: 'The only part that adds energy to the air; air enters at the center and is thrown outward between the blades.' },
  { id: 'scroll', label: 'Housing scroll', place: 5, why: 'Collects the air leaving the impeller and guides it toward the outlet.' },
  { id: 'cutoff', label: 'Cutoff', place: 6,
    why: 'The point of the scroll closest to the impeller, just before the outlet; it separates leaving air from circling air.' },
  { id: 'outlet-flange', label: 'Outlet flange', place: 7, why: 'The bolted joint where the fan outlet meets the downstream duct.' },
  { id: 'outlet-duct', label: 'Outlet ductwork', place: 8, why: 'Air leaves the fan system through the downstream duct.' },
  { id: 'shaft', label: 'Shaft', place: BIN,
    why: 'It passes through the housing side to carry the impeller, but it is not a stage the air flows through.' },
  { id: 'bearings', label: 'Bearings', place: BIN,
    why: 'In an Arrangement 9 fan the bearings sit on the pedestal outside the airstream.' },
  { id: 'motor', label: 'Motor', place: BIN,
    why: 'In a belt-driven Arrangement 9 fan the motor is mounted outside the housing and drives through belts.' }
];
CARDS.forEach((c, i) => { c.index = i; });

// Misconceptions from the spec, matched to the kind of wrong placement.
const MIS = {
  center: 'Air does not enter the impeller at the blade tips; it enters at the center, through the inlet funnel.',
  cutoff: 'The cutoff is not at the inlet; it is just upstream of the outlet.',
  outside: 'Not every part of a fan touches the air: in a belt-driven Arrangement 9 fan the bearings and motor sit outside the airstream.',
  inside: 'This part is in the air path: the air passes through it on the way from the inlet duct to the outlet duct.'
};
function misconception(card, where) {
  if (where === BIN) { return card.place === BIN ? '' : MIS.inside; }
  if (card.place === BIN) { return MIS.outside; }
  if (card.id === 'cutoff' && where <= 3) { return MIS.cutoff; }
  if ((card.id === 'impeller' && where < 4) || (card.id === 'inlet-funnel' && where > 4)) { return MIS.center; }
  return '';
}
const placeText = (pl) => (pl === BIN ? 'Not in the air path' : 'Slot ' + pl);

// Slot anchors on the side view (local units of FD's side-view frame) and marker offsets.
// Marker (mx, my) is where the numbered slot button sits; (ax, ay) is the part it points at.
const SLOTS = [
  null,
  { ax: 50, ay: 110, mx: 50, my: 110 },     // 1 inlet duct
  { ax: 96, ay: 156, mx: 74, my: 196 },     // 2 inlet flange
  { ax: 110, ay: 80, mx: 72, my: 30 },      // 3 inlet funnel
  { ax: 159, ay: 110, mx: 159, my: 110 },   // 4 impeller
  { ax: 160, ay: 196, mx: 160, my: 196 },   // 5 housing scroll (wrap below the impeller)
  { ax: 186, ay: 30, mx: 236, my: 40 },     // 6 cutoff
  { ax: 120, ay: 15, mx: 82, my: -12 },     // 7 outlet flange
  { ax: 160, ay: -45, mx: 160, my: -45 }    // 8 outlet duct
];
const LOCAL = { w: 450, top: -80, bottom: 240 };

// ---------- State ----------
const score = new FP.Score({ total: CARDS.length, mastery: CARDS.length, masteryOn: 'any', noun: 'Cards' });
let order = [];            // tray order (shuffled)
let loc = {};              // card id -> null (pile) | 1..8 | 'bin'
let locked = {};           // card id -> true once correct
let mark = {};             // card id -> 'ok' | 'bad' | null (result of the last submission)
let msg = {};              // card id -> feedback text for that card
let selected = null;       // selected card id
let submissions = 0;
let done = false;
let general = null;        // {kind, text} shown when no selected card has its own message
let anim = null;           // {start} while the air path animates
let roundNo = 0;
let L = null;              // layout from relayout()

// ---------- Controls ----------
let cardButtons = {}, slotButtons = [], binButton, submitButton, pileButton, replayButton, startOverButton;

const keys = K.keys.bind({
  '1': () => placeSelected(1), '2': () => placeSelected(2), '3': () => placeSelected(3), '4': () => placeSelected(4),
  '5': () => placeSelected(5), '6': () => placeSelected(6), '7': () => placeSelected(7), '8': () => placeSelected(8),
  '0': () => placeSelected(BIN), 'n': () => placeSelected(BIN), 'p': () => placeSelected(null),
  Escape: () => { selected = null; refresh(); }
});
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));

  for (const c of CARDS) {
    const b = K.button(c.label, () => clickCard(c.id));
    b.addClass('choice'); b.addClass('hfa-card');
    cardButtons[c.id] = b;
  }
  for (let n = 1; n <= 8; n++) {
    const b = K.button(String(n), () => clickSlot(n));
    b.addClass('hfa-slot');
    slotButtons[n] = b;
  }
  binButton = K.button('Not in the air path', () => clickSlot(BIN));
  binButton.addClass('hfa-bin');
  submitButton = K.button('Submit', submit);
  pileButton = K.button('Back to pile', () => placeSelected(null), { variant: 'secondary' });
  pileButton.addClass('secondary');
  replayButton = K.button('Replay airflow', () => { anim = { start: millis() }; }, { variant: 'secondary' });
  replayButton.addClass('secondary');
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });
  startOverButton.addClass('secondary');

  newRound();
  describe('Follow the airflow. A side view of a belt-driven Arrangement 9 centrifugal fan has eight ' +
    'numbered slot buttons along the air path, from the inlet duct on the left, through the inlet ' +
    'flange, inlet funnel, impeller, housing scroll and cutoff, to the outlet flange and outlet duct ' +
    'at the top. Eleven part cards sit in a pile. The learner selects a card, then a slot or the ' +
    '"Not in the air path" bin, and submits; correct cards lock and wrong cards return to the pile ' +
    'with feedback. Two submissions, then the air path animates from slot 1 to slot 8.');
}

// ---------- Flow ----------
function newRound() {
  roundNo++;
  order = FP.rng.shuffle(CARDS.map(c => c.id), 'ch03-follow-the-airflow ' + roundNo);
  loc = {}; locked = {}; mark = {}; msg = {};
  CARDS.forEach(c => { loc[c.id] = null; });
  selected = null; submissions = 0; done = false; anim = null;
  general = { kind: 'info', text: 'Select a card, then a numbered slot or "Not in the air path". Place all 11 cards, then press Submit (2 submissions).' };
  score.reset();
  refresh();
}

function startOver() {
  newRound();
  FP.announce('Started over. ' + PROMPT);
  cardButtons[order[0]].elt.focus();
}

function cardAt(slot) { return CARDS.find(c => loc[c.id] === slot && slot !== BIN && slot !== null) || null; }

function clickCard(id) {
  // Locked cards (and every card once done) can still be selected to read their feedback.
  selected = selected === id ? null : id;
  const c = byId(id);
  if (selected) { FP.announce(c.label + ' selected' + (msg[id] ? '. ' + msg[id] : '. Choose a slot.')); }
  refresh();
}

function clickSlot(slot) {
  if (done) { return; }
  if (selected) { placeSelected(slot); return; }
  // No card selected: pick up the card in this slot.
  const c = slot === BIN ? null : cardAt(slot);
  if (c && !locked[c.id]) { selected = c.id; FP.announce(c.label + ' selected from slot ' + slot + '.'); refresh(); }
  else if (!c) { FP.announce('Select a card first.'); }
}

function placeSelected(slot) {
  if (done || !selected || locked[selected]) { return; }
  const c = byId(selected);
  if (slot !== null && slot !== BIN) {
    const there = cardAt(slot);
    if (there && locked[there.id]) {
      general = { kind: 'info', text: 'Slot ' + slot + ' already holds a correct card, locked in place.' };
      FP.announce(general.text); selected = null; refresh(); return;
    }
    if (there && there.id !== c.id) { loc[there.id] = null; }   // the previous card returns to the pile
  }
  loc[c.id] = slot;
  mark[c.id] = null;
  msg[c.id] = null;
  selected = null;
  general = null;
  FP.announce(c.label + (slot === null ? ' back in the pile.' : ' placed: ' + placeText(slot) + '.'));
  const had = document.activeElement;
  refresh();
  K.keepFocus(had, focusOrder());
}

function placedCount() { return CARDS.filter(c => loc[c.id] !== null).length; }

function submit() {
  if (done) { return; }
  const n = placedCount();
  if (n < CARDS.length) {
    general = { kind: 'info', text: 'Place all 11 cards before you submit (' + n + ' of 11 placed).' };
    FP.announce(general.text); refresh(); return;
  }
  submissions++;
  const last = submissions >= 2;
  let returned = 0;
  for (const c of CARDS) {
    if (locked[c.id]) { continue; }
    const where = loc[c.id];
    const ok = where === c.place;
    if (ok) {
      locked[c.id] = true; mark[c.id] = 'ok';
      msg[c.id] = FP.msg.correct(c.why);                       // spec: "Correct:" + Why
      score.record(c.index, true, submissions);
    } else if (!last) {
      returned++;
      mark[c.id] = 'bad';
      msg[c.id] = FP.msg.tryAgain((where === BIN ? '' : c.label + ' does not belong in slot ' + where + '. ') +
        c.why + ' ' + misconception(c, where), 1);
      loc[c.id] = null;                                          // back to the pile
    } else {
      mark[c.id] = 'bad';
      msg[c.id] = FP.msg.missed(placeText(c.place), c.why + ' ' + misconception(c, where));
      score.record(c.index, false, submissions);
      loc[c.id] = c.place;                                       // reveal the correct position
    }
    FP.events.emit('answered', { source: SIM_ID, itemId: c.id, index: c.index, value: where, correct: ok,
      attempt: submissions, final: ok || last, scored: true });
  }
  selected = null;
  const label = score.label();
  if (returned === 0 || last) {
    finish();
  } else {
    general = { kind: 'bad', text: 'Submission 1 of 2. ' + label + '. ' + returned + ' card' + (returned === 1 ? '' : 's') +
      ' went back to the pile, marked ✗; select one to read why, place it again and submit.' };
    FP.announce(general.text);
    refresh();
    cardButtons[CARDS.find(c => !locked[c.id]).id].elt.focus();
  }
}

function finish() {
  done = true;
  const lines = score.summaryLines('Missed cards show ✗ in their correct place; select one to read why, then press Start over');
  general = { kind: score.mastered() ? 'ok' : 'final', text: lines[0] + '. ' + lines[1] + ' Watch the air move from slot 1 to slot 8.' };
  FP.events.emit('completed', { source: SIM_ID, firstAttempt: score.firstAttempt(), correct: score.correct(),
    total: CARDS.length, mastered: score.mastered() });
  if (score.mastered()) { FP.events.emit('mastery', { source: SIM_ID, total: CARDS.length }); }
  FP.announce(general.text);
  anim = { start: millis() };
  refresh();
  replayButton.elt.focus();
}

function byId(id) { return CARDS.find(c => c.id === id); }

// ---------- Controls: state and layout ----------
function focusOrder() {
  return order.map(id => cardButtons[id]).concat(slotButtons.slice(1), [binButton, submitButton, pileButton,
    replayButton, startOverButton]);
}

function refresh() {
  for (const c of CARDS) {
    const b = cardButtons[c.id];
    const where = loc[c.id];
    const prefix = mark[c.id] === 'ok' ? '✓ ' : (mark[c.id] === 'bad' ? '✗ ' : '');
    const pos = where === null ? '' : (where === BIN ? 'Out · ' : where + ' · ');
    b.html(prefix + pos + c.label);
    b.attribute('aria-pressed', selected === c.id ? 'true' : 'false');
    b.attribute('aria-label', c.label + ': ' + (where === null ? 'in the pile' : placeText(where)) +
      (mark[c.id] === 'ok' ? ', correct, locked' : (mark[c.id] === 'bad' ? ', incorrect' : '')) +
      (selected === c.id ? ', selected' : ''));
    b.removeClass('hfa-ok'); b.removeClass('hfa-bad'); b.removeClass('hfa-placed');
    if (mark[c.id] === 'ok') { b.addClass('hfa-ok'); } else if (mark[c.id] === 'bad') { b.addClass('hfa-bad'); }
    else if (where !== null) { b.addClass('hfa-placed'); }
  }
  for (let n = 1; n <= 8; n++) {
    const c = cardAt(n);
    const b = slotButtons[n];
    b.html(String(n));
    b.removeClass('hfa-filled'); b.removeClass('hfa-ok'); b.removeClass('hfa-bad');
    if (c && mark[c.id] === 'ok') { b.addClass('hfa-ok'); } else if (c && mark[c.id] === 'bad') { b.addClass('hfa-bad'); }
    else if (c) { b.addClass('hfa-filled'); }
    b.attribute('aria-label', 'Slot ' + n + ': ' + (c ? c.label + (locked[c.id] ? ', locked' : '') : 'empty'));
    K.setEnabled(b, !done);
  }
  const nBin = CARDS.filter(c => loc[c.id] === BIN).length;
  binButton.html('Not in the air path (' + nBin + ')');
  binButton.attribute('aria-label', 'Not in the air path bin, ' + nBin + ' card' + (nBin === 1 ? '' : 's'));
  K.setEnabled(binButton, !done);
  K.setEnabled(submitButton, !done);
  submitButton.html(submissions === 0 ? 'Submit' : 'Submit (2 of 2)');
  if (selected && loc[selected] !== null && !locked[selected] && !done) { pileButton.show(); } else { pileButton.hide(); }
  if (done) { replayButton.show(); submitButton.hide(); } else { replayButton.hide(); submitButton.show(); }
  relayout();
}

function wide() { return canvasWidth >= 560; }

// Lays out the drawing region top-down; the fan drawing takes whatever height is left.
function relayout() {
  const W = canvasWidth, m = 10;
  L = {};
  L.statusY = 40;
  textSize(15);
  textStyle(BOLD);
  const sw = textWidth(score.label());
  textStyle(NORMAL);
  L.statusLines = sw + 16 + textWidth(statusRight()) <= W - 2 * m ? 1 : 2;
  L.promptY = L.statusY + L.statusLines * 21 + 2;
  L.promptSize = wide() ? 16 : 15;
  textSize(L.promptSize); textStyle(BOLD);
  L.promptH = K.countLines(PROMPT, W - 2 * m) * round(L.promptSize * 1.3);
  textStyle(NORMAL);

  // Bottom-up: note, feedback, sequence line, card tray.
  L.noteLines = wide() ? 1 : 2;
  const noteTop = drawHeight - 6 - 13 - (L.noteLines - 1) * 17 - 4;
  L.fbH = wide() ? 84 : 112;
  L.fbY = noteTop - 6 - L.fbH;
  // Card tray: flow the 11 card buttons right to left of the available width
  const gap = 6, rowGap = 6;
  const rows = [];
  let row = [], x = m;
  for (const id of order) {
    const b = cardButtons[id];
    b.style('max-width', (W - 2 * m) + 'px');
    const bw = b.elt.offsetWidth || 120;
    if (row.length && x + bw > W - m) { rows.push(row); row = []; x = m; }
    row.push([b, x]); x += bw + gap;
  }
  if (row.length) { rows.push(row); }
  const rowH = rows.map(r => max(...r.map(e => e[0].elt.offsetHeight || 30)));
  const trayH = rowH.reduce((a, h) => a + h + rowGap, 0) - rowGap;
  L.trayY = L.fbY - 10 - trayH;
  L.trayLabelY = L.trayY - 18;
  let y = L.trayY;
  rows.forEach((r, i) => { r.forEach(e => e[0].position(e[1], y)); y += rowH[i] + rowGap; });

  // Fan drawing box between the prompt and the tray label
  const top = L.promptY + L.promptH + 6;
  L.box = { x: m, y: top, w: W - 2 * m, h: L.trayLabelY - 8 - top };
  L.frame = FD.frame({ x: L.box.x + 4, y: L.box.y + 30, w: L.box.w - 8, h: L.box.h - 34 }, LOCAL.w, LOCAL.top, LOCAL.bottom);
  const f = L.frame;
  for (let n = 1; n <= 8; n++) {
    const b = slotButtons[n], s = SLOTS[n];
    const d = 30;
    b.size(d, d);
    b.position(f.X(s.mx) - d / 2, f.Y(s.my) - d / 2);
  }
  binButton.position(L.box.x + L.box.w - (binButton.elt.offsetWidth || 170) - 6, L.box.y + 4);
  K.flowButtons(0, [submitButton, replayButton, pileButton, '|', startOverButton]);
}

function statusRight() {
  if (done) { return 'Done'; }
  return 'Placed ' + placedCount() + ' of 11 · Submission ' + (submissions + 1) + ' of 2';
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  if (!L) { return; }
  const W = canvasWidth;
  K.title(W < 420 ? 'Follow the Airflow' : 'Follow the Airflow Through a Centrifugal Fan');
  K.statusLine(submissions ? score.label() : 'Cards correct: — of 11', statusRight(), null, { y: L.statusY });
  noStroke(); fill(FP.tok('text')); textStyle(BOLD); textSize(L.promptSize); textAlign(LEFT, TOP);
  K.wrapText(PROMPT, 10, L.promptY, W - 20, round(L.promptSize * 1.3));
  textStyle(NORMAL);

  drawFan();
  // Tray label
  noStroke(); fill(FP.tok('text-muted')); textSize(13); textAlign(LEFT, TOP);
  text(done ? 'Cards (final positions):' : (wide() ? 'Cards: select one, then a slot (Out = not in the air path, ✓ locked, ✗ returned):'
    : 'Cards (Out = not in the air path):'), 10, L.trayLabelY);
  drawFeedback();
  K.note(DATA_NOTE, { lines: L.noteLines });
}

function drawFan() {
  const b = L.box, f = L.frame;
  K.panel(b.x, b.y, b.w, b.h, { fill: 255, radius: 6 });
  noStroke(); fill(FP.tok('text-muted')); textSize(13); textAlign(LEFT, TOP);
  if (!anim) { text(wide() ? 'Side view, inlet on the left (drive parts at right)' : 'Side view', b.x + 8, b.y + 8); }

  // Air path parts drawn under the FD arrangement: inlet duct and outlet duct
  const metal = FP.tok('metal'), edge = FP.tok('edge');
  stroke(edge); strokeWeight(2); fill(metal);
  rect(f.X(0), f.Y(70), f.S(90), f.S(80));                    // inlet duct
  rect(f.X(126), f.Y(LOCAL.top + 2), f.S(68), f.S(12 - LOCAL.top - 2));   // outlet duct
  FD.floor(null, { frame: f, x0: 0, x1: LOCAL.w });
  FD.arrangement(null, '9', { frame: f, labels: false, airflow: false, floor: false });
  // Inlet flange (with companion flange) and inlet funnel
  stroke(edge); strokeWeight(2); fill(FP.tok('metal-side'));
  rect(f.X(90), f.Y(62), f.S(10), f.S(96));
  noFill(); stroke(edge); strokeWeight(2.5);
  bezier(f.X(100), f.Y(72), f.X(118), f.Y(72), f.X(122), f.Y(86), f.X(134), f.Y(88));
  bezier(f.X(100), f.Y(148), f.X(118), f.Y(148), f.X(122), f.Y(134), f.X(134), f.Y(132));
  // Outlet flange and cutoff
  stroke(edge); strokeWeight(2); fill(FP.tok('metal-side'));
  rect(f.X(116), f.Y(10), f.S(88), f.S(9));
  noStroke(); fill(edge);
  triangle(f.X(172), f.Y(20), f.X(200), f.Y(20), f.X(200), f.Y(40));
  // Air arrows (air colour), animated only while the air path plays
  const t = anim ? (millis() - anim.start) / 1000 : undefined;
  FD.airflowArrow(null, { frame: f, x1: 6, y1: 110, x2: 40, y2: 110, weight: 3, head: 10 });
  FD.airflowArrow(null, { frame: f, x1: 160, y1: -50, x2: 160, y2: LOCAL.top + 4, weight: 3, head: 10 });

  // Leader lines from markers to their parts
  stroke(FP.tok('text-muted')); strokeWeight(1);
  for (let n = 1; n <= 8; n++) {
    const s = SLOTS[n];
    if (s.mx !== s.ax || s.my !== s.ay) { line(f.X(s.mx), f.Y(s.my), f.X(s.ax), f.Y(s.ay)); noStroke(); fill(FP.tok('text')); circle(f.X(s.ax), f.Y(s.ay), 5); stroke(FP.tok('text-muted')); }
  }
  noStroke();

  // Animated air path after the final submission
  if (anim) { drawAirPath(f, t); }
}

function drawAirPath(f, t) {
  const per = 0.8;
  const pts = SLOTS.slice(1).map(s => [f.X(s.ax), f.Y(s.ay)]);
  const total = per * (pts.length - 1);
  const tt = min(t, total + 1.2);
  const k = min(pts.length - 1, floor(tt / per));
  const frac = k >= pts.length - 1 ? 0 : (tt - k * per) / per;
  const p0 = pts[k], p1 = pts[min(k + 1, pts.length - 1)];
  const x = lerp(p0[0], p1[0], frac), y = lerp(p0[1], p1[1], frac);
  // trail
  stroke(FP.tok('air')); strokeWeight(3); noFill();
  drawingContext.setLineDash([6, 4]);
  beginShape();
  for (let i = 0; i <= k; i++) { vertex(pts[i][0], pts[i][1]); }
  vertex(x, y);
  endShape();
  drawingContext.setLineDash([]);
  noStroke(); fill(FP.tok('air')); circle(x, y, 14);
  // highlight the reached slot and name its part
  const reached = frac > 0.5 ? k + 2 : k + 1;   // slot number
  const n = constrain(reached, 1, 8);
  const s = SLOTS[n];
  noFill(); stroke(FP.tok('accent')); strokeWeight(4);
  circle(f.X(s.mx), f.Y(s.my), 40);
  // Name the part at the top-left of the drawing box (DOM slot buttons sit above the canvas,
  // so a label next to a marker could be hidden behind another slot button).
  const c = CARDS.find(cc => cc.place === n);
  const label = 'Air reaches ' + n + ': ' + c.label;
  textSize(14); textStyle(BOLD);
  const besideBin = L.box.w - (binButton.elt.offsetWidth || 170) - 24;
  const fits = textWidth(label) + 14 <= besideBin;
  const ly = fits ? L.box.y + 4 : L.box.y + 38;           // narrow: below the bin button
  const w = min(textWidth(label) + 14, L.box.w - 8);
  K.panel(L.box.x + 4, ly, w, 24, { fill: 255, stroke: '--fp-accent', weight: 2, radius: 5 });
  noStroke(); fill(FP.tok('text')); textAlign(LEFT, TOP);
  K.wrapText(label, L.box.x + 11, ly + 4, w - 10, 16, { maxLines: 1 });
  textStyle(NORMAL);
  if (t > total + 1.2) { anim = null; }
}

function drawFeedback() {
  let kind, txt;
  if (selected && msg[selected]) { kind = mark[selected] === 'ok' ? 'ok' : 'bad'; txt = msg[selected]; }
  else if (selected && (done || locked[selected])) { kind = 'info'; txt = byId(selected).label + '.'; }
  else if (selected) { kind = 'info'; txt = byId(selected).label + ' selected. Choose a slot 1-8, "Not in the air path", or Back to pile.'; }
  else if (general) { kind = general.kind; txt = general.text; }
  else { kind = 'info'; txt = 'Select a card to place, or a placed card to read its feedback.'; }
  const display = (kind === 'info' ? 'ℹ ' : '') + txt;
  const x = 10, y = L.fbY, w = canvasWidth - 20, h = L.fbH;
  const ts = K.fitTextSize(s => K.countLines(display, w - 20) * round(s * 1.3), h - 12, wide() ? 15 : 14, 12);
  const ok = kind === 'ok', bad = kind === 'bad', fin = kind === 'final';
  K.panel(x, y, w, h, {
    fill: ok ? '--fp-correct-bg' : (bad ? '--fp-incorrect-bg' : (fin ? '--fp-primary-bg' : '--fp-info-bg')),
    stroke: ok ? '--fp-correct' : (bad ? '--fp-incorrect' : (fin ? '--fp-primary' : '--fp-border')),
    dashed: bad, weight: ok || bad || fin ? 2 : 1, radius: 6
  });
  noStroke();
  fill(ok ? FP.tok('correct') : (bad ? FP.tok('incorrect') : FP.tok('text')));
  textSize(ts); textAlign(LEFT, TOP);
  K.wrapText(display, x + 10, y + 6, w - 20, round(ts * 1.3), { maxLines: floor((h - 12) / round(ts * 1.3)) });
}

// ---------- Responsive sizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  relayout();
}

function updateCanvasSize() {
  canvasWidth = K.updateCanvasSize(320);
}
