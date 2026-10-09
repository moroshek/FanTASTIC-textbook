// Inlet Box Position Trainer - p5.js MicroSim (Chapter 18: Inlets, Outlets and Flow Control)
// CANVAS_HEIGHT: 645
// Eight installations (drive-side views, inlet-side views and one text-only item): the learner picks
// the inlet box position (45 ... 360) and checks it; the drive-side dial is then overlaid, and an
// inlet-side picture first flips to the drive side. After item 8, free practice: drag the box around
// the housing in 45 degree steps and switch the viewpoint.
// Rules (FanPedia p. 144): the position is the dial angle of the box opening, clockwise from the top
// as seen from the drive side, with the top written 360; from the inlet side, position = 360 - p.
// Built on the FanPedia kit: FP.CardDeck (items, wording, score, mastery), FP.codes (positions,
// descriptions, inlet-side rule), FD (scroll housing, inlet box, rotation-free end views), FP.p5.
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js, fan-codes.js, fan-drawings.js.

const K = FP.p5;
const C = FP.codes;
const SIM_ID = 'ch18-inlet-box-position-trainer';

let canvasWidth = 800;
const drawHeight = 530;
const controlHeight = K.controlHeightFor(3);
const canvasHeight = drawHeight + controlHeight;
const MASTERY = 7;
const POSITIONS = [45, 90, 135, 180, 225, 270, 315, 360];
const desc = p => C.inletBoxByPosition(p).description.toLowerCase();

// ---------- Installations (fixed order; spec Content table, illustrative) ----------
// shown = the dial angle where the opening appears on the picture (for an inlet-side view that is
// the inlet-side reading); answer = drive-side position.
const ITEM_DATA = [
  { view: 'drive', shown: 360, appears: 'Top, air entering downward',
    why: 'Viewed from the drive side, an opening at the top is position 360, top down intake.' },
  { view: 'drive', shown: 90, appears: 'Right, air entering horizontally',
    why: 'Viewed from the drive side, an opening on the right is position 90, horizontal right intake.' },
  { view: 'drive', shown: 315, appears: 'Upper left, air entering downward at an angle',
    why: 'Upper left on the drive-side dial is 315; 45 is the upper right.' },
  { view: 'drive', shown: 180, appears: 'Bottom, air entering upward',
    why: 'The opening is at the bottom, so the position is 180, bottom up intake; the number names where the opening is, not the air direction.' },
  { view: 'inlet', shown: 90, appears: 'Right, air entering horizontally',
    why: 'From the inlet side, left and right are mirrored. An opening that appears on the right from the inlet side is on the left from the drive side: 270.' },
  { view: 'inlet', shown: 225, appears: 'Lower left, air entering upward at an angle',
    why: 'Mirror the view: lower left from the inlet side is lower right from the drive side, which is 135.' },
  { view: 'text', text: 'The duct rises from a floor trench and turns straight up into the box.', answer: 180,
    why: 'Air entering from below means the opening faces down at the bottom of the box: 180, bottom up intake.' },
  { view: 'inlet', shown: 315, appears: 'Upper left, air entering downward at an angle',
    why: 'Mirror the view: upper left from the inlet side is upper right from the drive side, which is 45.' }
];
const ITEMS = ITEM_DATA.map((d, i) => {
  const answer = d.view === 'text' ? d.answer : (d.view === 'inlet' ? C.inletBoxFromInletSide(d.shown) : d.shown);
  return Object.assign({}, d, { id: i + 1, answer, answerText: 'position ' + answer + ', ' + desc(answer) });
});

// First-wrong-attempt hint: names the slip (unmirrored inlet view, left/right swap, air direction
// read as the position) or the rule, never the correct position.
function positionHint(card, chosen) {
  if (card.view === 'inlet' && chosen === card.shown) {
    return 'That is the position as read on this picture, but it is drawn from the inlet side. ' +
      'Mirror left and right first, then read the drive-side dial.';
  }
  if (card.answer === 180 && chosen === 360) {
    return 'The number names where the opening is, not the direction the air moves.';
  }
  if (card.view === 'drive' && chosen === 360 - card.answer) {
    return 'Left and right are swapped. Seen from the drive side, the positions run clockwise.';
  }
  if (card.view === 'inlet') {
    return 'This picture is drawn from the inlet side. Mirror it left to right, then read the drive-side dial.';
  }
  if (card.view === 'text') {
    return 'Follow the air path: where must the opening be for air to enter the box that way?';
  }
  return 'Read where the opening is on the drive-side dial: the positions run clockwise in 45° steps.';
}

const deck = new FP.CardDeck({
  cards: ITEMS, shuffle: false, attempts: 2, retryMissed: false,
  noun: 'Positions', mastery: MASTERY,
  reviewPointer: 'Review the drive-side rule, then press Start over',
  // Spec: correct reads "Correct: position <n>, <description>."; a first wrong answer gets a hint
  // (no position number), the final miss gets the item's Why text with the answer
  messages: {
    correct: res => FP.msg.correct(res.card.answerText),
    retry: res => FP.msg.tryAgain(positionHint(res.card, res.chosen), res.attemptsLeft)
  },
  id: SIM_ID
});

// ---------- State ----------
let selected = null;           // chosen position before Check
let feedback = null;           // {kind, message}
let notice = '';
let flipStart = -1;            // millis() when an inlet-side item started flipping to the drive side
const FLIP_MS = 900;
const reduceMotion = typeof window !== 'undefined' && window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let practicePos = 360;         // free practice: drive-side position
let practiceView = 'drive';
let dragging = false;
let housing = null;            // {x, y, size} of the current drawing, for dragging

// ---------- Controls ----------
let posButtons = [], checkButton, nextButton, startOverButton, ccwButton, cwButton, viewButton;

const keyMap = { Enter: onEnter, ArrowLeft: () => turn(-1), ArrowRight: () => turn(1), v: toggleView };
POSITIONS.forEach((p, i) => { keyMap[String(i + 1)] = () => choose(p); });
const keys = K.keys.bind(keyMap);
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));

  posButtons = POSITIONS.map(p => {
    const b = K.button(String(p), () => choose(p));
    b.addClass('choice');
    b.attribute('aria-pressed', 'false');
    b.attribute('aria-label', 'Position ' + p + ', ' + desc(p));
    return b;
  });
  checkButton = K.button(FP.msg.CHECK, check);
  nextButton = K.button('Next installation', nextItem);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });
  ccwButton = K.button('◀ Turn', () => turn(-1));
  ccwButton.attribute('aria-label', 'Move the box opening 45 degrees counterclockwise on screen');
  cwButton = K.button('Turn ▶', () => turn(1));
  cwButton.attribute('aria-label', 'Move the box opening 45 degrees clockwise on screen');
  viewButton = K.button('View: drive side', toggleView, { variant: 'secondary' });

  updateControls();

  describe('Inlet box position trainer. Eight installations show a fan housing end view with an inlet box ' +
    'and an air arrow, labeled as viewed from the drive side or from the inlet side; one is text only. ' +
    'The learner chooses one of the eight positions 45 to 360 and presses Check. After an item is ' +
    'resolved, the drive-side position dial is overlaid; inlet-side pictures first flip to the drive ' +
    'side. After item 8, free practice lets the learner move the box in 45 degree steps and switch ' +
    'between drive-side and inlet-side views while the position and description update.');
}

function practicing() { return deck.state().phase === 'summary'; }

// ---------- Flow ----------
function choose(p) {
  if (deck.state().phase !== 'choose') { return; }
  selected = p;
  notice = '';
  updateControls();
  FP.announce('Selected position ' + p + '.');
}

function check() {
  const st = deck.state();
  if (st.phase !== 'choose') { return; }
  if (selected === null) {
    notice = 'Choose a position first.';
    FP.announce(notice);
    return;
  }
  const res = deck.place(selected);
  feedback = { kind: res.kind, message: res.message, chosen: selected, status: res.status };
  if (res.locked) {
    flipStart = res.card.view === 'inlet' && !reduceMotion ? millis() : -1;
    const extra = res.card.view === 'inlet' ? ' The picture flips to the drive side and the drive-side dial is shown.'
      : ' The drive-side dial is shown.';
    FP.announce('You chose ' + selected + '. ' + res.message + extra);
    selected = null;
    updateControls();
    if (nextButton.elt) { nextButton.elt.focus(); }
  } else {
    FP.announce('You chose ' + selected + '. ' + res.message);
    selected = null;
    updateControls();
  }
}

function nextItem() {
  if (deck.state().phase !== 'feedback') { return; }
  deck.next();
  feedback = null;
  notice = '';
  selected = null;
  flipStart = -1;
  const st = deck.state();
  if (st.phase === 'summary') {
    practicePos = 360;
    practiceView = 'drive';
    updateControls();
    const s = deck.summary();
    FP.announce(scoreLabel() + '. ' + s.lines.join(' ') + ' Free practice: move the box with the Turn buttons, ' +
      'the arrow keys or by dragging, and switch the view.');
    cwButton.elt.focus();
  } else {
    updateControls();
    FP.announce('Installation ' + (st.index + 1) + ' of ' + ITEMS.length + '. ' + itemSentence(st.card) +
      ' Which inlet box position is this?');
    checkButton.elt.focus();
  }
}

function startOver() {
  deck.newRound();
  feedback = null;
  notice = '';
  selected = null;
  flipStart = -1;
  updateControls();
  FP.announce('Started over. Installation 1 of ' + ITEMS.length + '. ' + itemSentence(ITEMS[0]));
  checkButton.elt.focus();
}

function onEnter() {
  const st = deck.state();
  if (st.phase === 'choose') { check(); } else if (st.phase === 'feedback') { nextItem(); }
}

function itemSentence(it) {
  if (it.view === 'text') { return 'Text only: ' + it.text; }
  return 'Viewed from ' + (it.view === 'drive' ? 'drive' : 'inlet') + ' side. Box opening appears at the ' +
    it.appears.charAt(0).toLowerCase() + it.appears.slice(1) + '.';
}

// "Positions correct: n of 8" counts first-attempt answers only (spec)
function scoreLabel() { return FP.msg.score('Positions', deck.score.firstAttempt(), ITEMS.length); }

// ---------- Free practice ----------
function turn(dir) {
  if (!practicing()) { return; }
  // dir is on screen: +1 clockwise. On an inlet-side view the drive-side number runs the other way.
  const step = practiceView === 'drive' ? dir : -dir;
  practicePos = ((practicePos + 45 * step) % 360 + 360) % 360 || 360;
  announcePractice();
}

function toggleView() {
  if (!practicing()) { return; }
  practiceView = practiceView === 'drive' ? 'inlet' : 'drive';
  updateControls();
  announcePractice();
}

function announcePractice() {
  const read = practiceView === 'drive' ? practicePos : C.inletBoxFromInletSide(practicePos);
  FP.announce('Viewed from the ' + practiceView + ' side' + (practiceView === 'inlet' ? ', the opening reads ' + read +
    ' on the picture' : '') + '. Position ' + practicePos + ', ' + desc(practicePos) + '.');
}

function mousePressed() {
  if (!practicing() || !housing) { return; }
  const d = dist(mouseX, mouseY, housing.x, housing.y);
  if (d > housing.size * 0.15 && d < housing.size * 0.95) { dragging = true; dragTo(mouseX, mouseY); }
}
function mouseDragged() { if (dragging) { dragTo(mouseX, mouseY); } }
function mouseReleased() {
  if (dragging) { dragging = false; announcePractice(); }
}
function dragTo(mx, my) {
  let a = degrees(Math.atan2(mx - housing.x, -(my - housing.y)));   // clockwise from the top, on screen
  a = ((Math.round(a / 45) * 45) % 360 + 360) % 360 || 360;
  practicePos = practiceView === 'drive' ? a : C.inletBoxFromInletSide(a);
}

// ---------- Controls ----------
function updateControls() {
  const had = document.activeElement;
  const st = deck.state();
  const practice = st.phase === 'summary';
  const choosing = st.phase === 'choose';
  posButtons.forEach((b, i) => {
    const on = selected === POSITIONS[i];
    b.attribute('aria-pressed', on ? 'true' : 'false');
    if (on) { b.addClass('selected'); } else { b.removeClass('selected'); }
    K.setEnabled(b, choosing);
    if (practice) { b.hide(); } else { b.show(); }
  });
  for (const b of [checkButton, nextButton]) { if (practice) { b.hide(); } else { b.show(); } }
  K.setEnabled(checkButton, choosing);
  K.setEnabled(nextButton, st.phase === 'feedback');
  const label = st.isLast ? 'See score' : 'Next installation';
  nextButton.html(canvasWidth < 400 ? (st.isLast ? 'Score' : 'Next') : label);
  nextButton.attribute('aria-label', label);
  for (const b of [ccwButton, cwButton, viewButton]) { if (practice) { b.show(); } else { b.hide(); } }
  viewButton.html('View: ' + practiceView + ' side');
  viewButton.attribute('aria-pressed', practiceView === 'inlet' ? 'true' : 'false');
  positionControls();
  K.keepFocus(had, posButtons.concat([checkButton, nextButton, ccwButton, cwButton, viewButton, startOverButton]));
}

function positionControls() {
  const narrow = canvasWidth < 480;
  const x = narrow ? 10 : 110;
  if (practicing()) {
    const r = K.flowButtons(0, [ccwButton, cwButton, null, viewButton], { x });
    K.flowButtons(r, [startOverButton], { x });
  } else {
    const r = K.flowButtons(0, posButtons.concat([null, checkButton]), { x, gap: narrow ? 6 : 8, groupGap: narrow ? 10 : 16 });
    K.flowButtons(r, [nextButton, null, startOverButton], { x });
  }
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  let y = K.title('Inlet Box Position Trainer');
  const st = deck.state();
  const practice = st.phase === 'summary';
  const right = practice ? 'Free practice (not scored)'
    : 'Installation ' + (st.index + 1) + ' of ' + ITEMS.length + (st.phase === 'choose' ? ' · ' + st.attemptLabel : '');
  y = K.statusLine(scoreLabel(), right, null, { y: y - 4 });
  K.note(canvasWidth >= 560
    ? ['Illustrative installations', 'Source: FanPedia p. 144',
       practice ? 'Keys: ←/→ turn, V view' : 'Keys: 1–8 choose, Enter checks or goes on']
    : ['Illustrative', 'Source: FanPedia p. 144']);

  const top = y + 2, bottom = drawHeight - 24;
  let A, B;
  if (canvasWidth >= 600) {
    const leftW = Math.round(canvasWidth * 0.5);
    A = { x: 10, y: top, w: leftW - 15, h: bottom - top };
    B = { x: leftW + 5, y: top, w: canvasWidth - leftW - 15, h: bottom - top };
  } else {
    const dh = Math.round((bottom - top) * 0.54);
    A = { x: 8, y: top, w: canvasWidth - 16, h: bottom - top - dh - 6 };
    B = { x: 8, y: bottom - dh, w: canvasWidth - 16, h: dh };
  }
  K.panel(A.x, A.y, A.w, A.h);
  K.panel(B.x, B.y, B.w, B.h);
  if (practice) { drawSummary(A); drawPractice(B); } else { drawItemText(A, st); drawItemPicture(B, st); }
  drawControlLabels();
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

function drawItemText(box, st) {
  const it = st.card;
  const list = [{ t: 'Installation ' + (st.index + 1) + ' of ' + ITEMS.length, bold: true }];
  if (it.view === 'text') {
    list.push({ t: 'Text only (no picture):', color: FP.tok('text-muted'), gap: 4 });
    list.push({ t: '"' + it.text + '"' });
  } else {
    list.push({ t: (it.view === 'drive' ? 'Viewed from drive side' : 'Viewed from inlet side'), bold: true,
      color: it.view === 'inlet' ? FP.tok('accent-text') : FP.tok('primary'), gap: 4 });
    if (canvasWidth >= 600) {
      list.push({ t: 'The picture shows the fan end view, the inlet box and the air entering it.', color: FP.tok('text-muted') });
    }
  }
  list.push({ t: 'Which inlet box position is this?', bold: true, gap: 8 });
  if (selected !== null) { list.push({ t: 'Selected: ' + selected, color: FP.tok('primary'), gap: 4 }); }
  if (notice) { list.push({ t: 'ℹ ' + notice, color: FP.tok('primary-dark'), gap: 4 }); }
  if (feedback) {
    list.push({ t: 'You chose ' + feedback.chosen + '.', color: FP.tok('text-muted'), gap: 8 });
    list.push({ t: feedback.message, box: feedback.kind, gap: 4 });
  }
  fitParas(list, box, 16);
}

function drawSummary(box) {
  const s = deck.summary();
  const list = [
    { t: s.lines[0], bold: true },
    { t: s.lines[1], bold: s.mastered, color: s.mastered ? FP.tok('primary') : FP.tok('text') }
  ];
  if (s.misses.length) {
    list.push({ t: 'Missed: ' + s.misses.map(m => 'item ' + m.card.id + ' (' + m.card.answer + ')').join(', ') + '.',
      color: FP.tok('text-muted'), gap: 4 });
  }
  const read = practiceView === 'drive' ? practicePos : C.inletBoxFromInletSide(practicePos);
  list.push({ t: 'Free practice (not scored)', bold: true, gap: 10 });
  list.push({ t: 'Viewed from the ' + practiceView + ' side' + (practiceView === 'inlet'
    ? ': the opening sits at ' + read + ' on this picture.' : '.') });
  list.push({ t: 'Position ' + practicePos + ', ' + desc(practicePos), bold: true, color: FP.tok('primary-dark'), size: 2 });
  list.push({ t: canvasWidth >= 600 ? 'Drag the box, use Turn or the arrow keys, and switch the view. Switching the view ' +
    'turns 90 into 270 and 45 into 315 on the picture, while 360 and 180 never change.'
    : 'Drag the box or use Turn, and switch the view: 90 reads 270, 45 reads 315; 360 and 180 stay.',
  color: FP.tok('text-muted'), gap: 6 });
  fitParas(list, box, 16);
}

// Discharge angle that keeps the outlet clear of the box (outlet mouth opposite the opening)
function clearAngle(pos) {
  const th = radians(pos);
  const u = { x: Math.sin(th), y: -Math.cos(th) };
  let best = 360, bestDot = Infinity;
  for (const a of [360, 45, 90, 135, 180, 225, 270, 315]) {
    const g = FD.geom.scrollGeometry(0, 0, 1, 'CW', a);
    const tip = [g.mouth[0] + g.dvec.x * 0.1, g.mouth[1] + g.dvec.y * 0.1];
    const len = Math.hypot(tip[0], tip[1]);
    const d = (tip[0] * u.x + tip[1] * u.y) / len;
    if (d < bestDot - 1e-6) { bestDot = d; best = a; }
  }
  return best;
}

// End view: inlet box at drive-side position `pos`, seen from `view`; mirrored horizontally by `sx`
function endView(cx, cy, size, pos, view, sx) {
  push();
  translate(cx, cy);
  scale(sx, 1);
  FD.inletBoxEnd(null, { x: 0, y: 0, size, position: pos, view, air: true });
  FD.scrollHousing(null, { x: 0, y: 0, size: size * 0.95, rotation: 'CW', angle: clearAngle(pos), view,
    showRotation: false, labels: false });
  pop();
}

// Drive-side dial: the eight numbers around the housing (mirrored for an inlet-side view)
function dial(cx, cy, r, view, mark) {
  push();
  noFill();
  stroke(FP.tok('primary'));
  strokeWeight(1.5);
  drawingContext.setLineDash([4, 5]);
  circle(cx, cy, r * 2);
  drawingContext.setLineDash([]);
  textAlign(CENTER, CENTER);
  for (const p of POSITIONS) {
    const shown = view === 'inlet' ? C.inletBoxFromInletSide(p) : p;
    const a = radians(shown);
    const x = cx + r * Math.sin(a), y = cy - r * Math.cos(a);
    const hit = p === mark;
    stroke(hit ? FP.tok('primary') : FP.tok('border'));
    strokeWeight(hit ? 2.5 : 1);
    fill(hit ? FP.tok('primary') : 255);
    const L = dialLabel();
    circle(x, y, hit ? L + 6 : L);
    noStroke();
    fill(hit ? 255 : FP.tok('text'));
    textStyle(BOLD);
    textSize(hit ? 13 : 12);
    text(p, x, y);
  }
  textStyle(NORMAL);
  pop();
}

function dialLabel() { return canvasWidth >= 600 ? 26 : 24; }

function pictureFrame(box) {
  const capH = canvasWidth >= 600 ? 64 : 36;
  const top = canvasWidth >= 600 ? 26 : 22;
  const area = { x: box.x + 8, y: box.y + top, w: box.w - 16, h: box.h - top - capH };
  const lab = dialLabel();
  const size = Math.max(40, (Math.min(area.w, area.h) / 2 - lab / 2 - 4) / 0.86);
  return { cx: area.x + area.w / 2, cy: area.y + area.h / 2, size, capY: area.y + area.h + 4 };
}

function viewBanner(box, view, text2) {
  noStroke();
  textAlign(CENTER, TOP);
  textStyle(BOLD);
  textSize(canvasWidth >= 600 ? 15 : 13);
  fill(view === 'inlet' ? FP.tok('accent-text') : FP.tok('primary'));
  text(text2, box.x + box.w / 2, box.y + 6);
  textStyle(NORMAL);
}

function caption(box, y, str) {
  noStroke();
  fill(FP.tok('text-muted'));
  textSize(canvasWidth >= 600 ? 13 : 12);
  textAlign(CENTER, TOP);
  K.wrapText(str, box.x + box.w / 2, y, box.w - 20, 16, { align: CENTER, maxLines: canvasWidth >= 600 ? 3 : 2 });
  textAlign(LEFT, TOP);
}

function drawItemPicture(box, st) {
  const it = st.card;
  const f = pictureFrame(box);
  housing = null;
  const locked = st.phase === 'feedback';
  if (it.view === 'text') {
    viewBanner(box, 'drive', locked ? 'Drive-side view' : 'Text only');
    if (!locked) {
      push();
      noFill();
      stroke(FP.tok('text-muted'));
      strokeWeight(2);
      drawingContext.setLineDash([6, 6]);
      circle(f.cx, f.cy, f.size * 0.9);
      pop();
      noStroke();
      fill(FP.tok('text-muted'));
      textAlign(CENTER, CENTER);
      textSize(44);
      text('?', f.cx, f.cy);
      caption(box, f.capY, 'No picture for this item: decide where the opening must be from the air path.');
      return;
    }
    endView(f.cx, f.cy, f.size, it.answer, 'drive', 1);
    dial(f.cx, f.cy, f.size * 0.86, 'drive', it.answer);
    caption(box, f.capY, 'Position ' + it.answer + ', ' + desc(it.answer) + ', viewed from the drive side.');
    return;
  }
  if (it.view === 'drive' || !locked) {
    viewBanner(box, it.view, it.view === 'drive' ? 'Viewed from drive side' : 'Viewed from inlet side');
    endView(f.cx, f.cy, f.size, it.answer, it.view, 1);
    if (locked) {
      dial(f.cx, f.cy, f.size * 0.86, 'drive', it.answer);
      caption(box, f.capY, 'Drive-side dial: position ' + it.answer + ', ' + desc(it.answer) + '.');
    } else {
      caption(box, f.capY, it.view === 'inlet' ? 'Careful: this picture is drawn from the inlet side.'
        : 'Numbers run clockwise from 360 at the top, seen from the drive side.');
    }
    return;
  }
  // locked inlet-side item: flip the picture to the drive side, then show the dial
  const t = flipStart < 0 ? 1 : constrain((millis() - flipStart) / FLIP_MS, 0, 1);
  const sx = Math.cos(Math.PI * t);                 // 1 -> -1: inlet view mirrored = drive view
  const done = t >= 1;
  viewBanner(box, done ? 'drive' : 'inlet', done ? 'Mirrored to the drive side' : 'Flipping to the drive side…');
  if (!done) {
    endView(f.cx, f.cy, f.size, it.answer, 'inlet', Math.abs(sx) < 0.02 ? 0.02 : sx);
  } else {
    endView(f.cx, f.cy, f.size, it.answer, 'drive', 1);
    ghostBox(f.cx, f.cy, f.size, it.shown);
    dial(f.cx, f.cy, f.size * 0.86, 'drive', it.answer);
    caption(box, f.capY, canvasWidth >= 600 ? 'Dashed outline: where the box appeared on the inlet-side picture. ' +
      'From the drive side it is ' + it.answer + ', ' + desc(it.answer) + '.'
      : 'Dashed: as drawn from the inlet side. Drive side: ' + it.answer + '.');
  }
}

// Dashed outline of the box where it appeared on the inlet-side picture (same geometry as FD.inletBoxEnd)
function ghostBox(cx, cy, size, shownAngle) {
  const th = radians(shownAngle);
  const ux = Math.sin(th), uy = -Math.cos(th), nx = -uy, ny = ux;
  const at = (d, w) => [cx + ux * d + nx * w, cy + uy * d + ny * w];
  const pts = [at(size * 0.1, -size * 0.17), at(size * 0.5, -size * 0.17), at(size * 0.5, size * 0.17), at(size * 0.1, size * 0.17)];
  push();
  noFill();
  stroke(FP.tok('accent-text'));
  strokeWeight(2.5);
  drawingContext.setLineDash([6, 5]);
  beginShape();
  for (const p of pts) { vertex(p[0], p[1]); }
  endShape(CLOSE);
  pop();
}

function drawPractice(box) {
  const f = pictureFrame(box);
  housing = { x: f.cx, y: f.cy, size: f.size };
  viewBanner(box, practiceView, practiceView === 'drive' ? 'Viewed from drive side' : 'Viewed from inlet side');
  endView(f.cx, f.cy, f.size, practicePos, practiceView, 1);
  dial(f.cx, f.cy, f.size * 0.86, practiceView, practicePos);
  caption(box, f.capY, practiceView === 'drive' ? 'Drive-side dial: numbers run clockwise.'
    : 'Drive-side numbers seen from the inlet side run counterclockwise.');
}

function drawControlLabels() {
  if (canvasWidth < 480) { return; }
  noStroke();
  fill(FP.tok('text'));
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(16);
  text(practicing() ? 'Practice:' : 'Position:', 10, K.controlRow(0) + 15);
  textStyle(NORMAL);
}

// ---------- Responsive sizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  updateControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
