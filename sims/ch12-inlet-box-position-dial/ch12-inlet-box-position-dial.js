// Inlet Box Position Dial - p5.js MicroSim (Chapter 12: Discharge Positions and Rotation)
// CANVAS_HEIGHT: 600
// Explore mode first: move an inlet box around a drive-side view of a centrifugal housing (eight
// positions, 45..360 clockwise from the top) and switch the drawn rotation; the number and the
// FanPedia description never follow rotation. Then eight duct-approach challenges: move the box
// to meet the duct and press Check; two attempts each, first-attempt score, mastery 7 of 8.
// Rules (chapter 12, FanPedia p. 144): positions are measured clockwise from the top as seen from
// the drive side, 360 is the top, and the position does not depend on the fan's rotation.
// Built on the FanPedia kit: FP.ChallengeRunner (items, attempts, score, mastery), FP.codes
// (inlet box positions and descriptions), FD.inletBoxEnd / FD.scrollHousing (drive-side view),
// FP.p5 (layout, text, controls, keys).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js, fan-codes.js,
// fan-drawings.js (load them before this file, also in the p5.js editor).

const K = FP.p5;
const C = FP.codes;
const SIM_ID = 'ch12-inlet-box-position-dial';

// ---------- Canvas layout ----------
let canvasWidth = 800;
const canvasHeight = 600;
const controlHeight = K.controlHeightFor(3);
const drawHeight = canvasHeight - controlHeight;
const WIDE_MIN = 600;
const MASTERY = 7;
const POSITIONS = [45, 90, 135, 180, 225, 270, 315, 360];
const DISCHARGE_ANGLE = 90;   // the housing is drawn as THD (the chapter's worked example)

const EXPLORE_PROMPT = 'Move the box. Which positions share a description?';
const CHALLENGE_PROMPT = 'Move the box to meet the duct, then press Check.';

// ---------- Challenge items (spec table, fixed order) ----------
const ITEM_DATA = [
  { rot: 'CW', duct: 'The inlet duct runs horizontally and arrives from the right of the drive-side observer.', pos: 90,
    why: 'A box opening facing right is Horizontal Right Intake, position 90.' },
  { rot: 'CW', duct: 'The inlet duct drops vertically from the roof directly above the fan.', pos: 360,
    why: 'Air entering downward from the top is Top Down Intake, position 360.' },
  { rot: 'CW', duct: 'The inlet duct rises from a trench directly below the fan.', pos: 180,
    why: 'Air entering upward from the bottom is Bottom Up Intake, position 180.' },
  { rot: 'CW', duct: 'The inlet duct runs horizontally and arrives from the left of the drive-side observer.', pos: 270,
    why: 'A box opening facing left is Horizontal Left Intake, position 270.' },
  { rot: 'CW', duct: 'The inlet duct comes down at 45 degrees from the upper right.', pos: 45,
    why: 'Angular Down Intake on the upper right is 45; the upper-left one is 315.' },
  { rot: 'CW', duct: 'The inlet duct comes down at 45 degrees from the upper left.', pos: 315,
    why: 'Angular Down Intake on the upper left is 315, counted clockwise from the top.' },
  { rot: 'CW', duct: 'The inlet duct rises at 45 degrees from the lower left.', pos: 225,
    why: 'Angular Up Intake on the lower left is 225; the lower-right one is 135.' },
  { rot: 'CCW', duct: 'The inlet duct rises at 45 degrees from the lower right.', pos: 135,
    why: 'The inlet box angle always runs clockwise from the top, whatever the rotation, so lower right is 135.' }
];
const desc = p => C.inletBoxByPosition(p).description;
const posText = p => 'position ' + p + ', ' + desc(p);

// Spec first-attempt hints: the item-8 rotation trap first, then the mirror (same description),
// then the general pointer.
function hintFor(v, it, i) {
  const ccw = (360 - it.pos) % 360 || 360;
  if (i === 7 && v === ccw) return 'The inlet box angle does not follow rotation; count clockwise from the top.';
  if (v === ccw && desc(v) === desc(it.pos) && v !== it.pos) {
    return 'Same description, other side: the angle counts clockwise from the top as seen from the drive side.';
  }
  return 'Find where the duct arrives, then read that position\'s number.';
}

const ITEMS = ITEM_DATA.map((d, i) => Object.assign({}, d, {
  id: 'duct-' + (i + 1),
  answer: d.pos,
  answerText: posText(d.pos),
  hint: (v, it) => hintFor(v, it, i),
  why: (v, it) => (v === it.pos ? '' : d.why)
}));

const runner = new FP.ChallengeRunner({
  items: ITEMS, attempts: 2, noun: 'Items', mastery: MASTERY, explore: false,
  reviewPointer: 'Move the box around in Explore mode, then press Start over to try the eight ducts again',
  id: SIM_ID
});

// ---------- State ----------
let mode = 'explore';           // 'explore' | 'challenge'
let started = false;
let boxPos = 360;
let exRot = 'CW';
let feedback = null;
let seenShared = { 'Angular Down Intake': new Set(), 'Angular Up Intake': new Set() };

// ---------- Controls ----------
let ccwButton, cwButton, rotButtons = {}, startButton;
let checkButton, nextButton, startOverButton, exploreButton;
let dial = null;                // {cx, cy, size} of the last drawing, for clicks

const keys = K.keys.bind({
  ArrowLeft: () => moveBox(-45), ArrowRight: () => moveBox(45), Enter: onEnter
});
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));

  ccwButton = K.button('⟲ Counterclockwise', () => moveBox(-45), { variant: 'secondary' });
  ccwButton.attribute('aria-label', 'Move the box one position counterclockwise (Left arrow)');
  cwButton = K.button('Clockwise ⟳', () => moveBox(45), { variant: 'secondary' });
  cwButton.attribute('aria-label', 'Move the box one position clockwise (Right arrow)');
  // Space (or a click) moves the box; Enter checks or goes on, as everywhere in the challenge
  for (const mb of [ccwButton, cwButton]) {
    mb.elt.addEventListener('keydown', e => {
      if (e.key === 'Enter' && mode === 'challenge') { e.preventDefault(); e.stopPropagation(); onEnter(); }
    });
  }
  for (const r of ['CW', 'CCW']) {
    const b = K.button(r, () => setRotation(r));
    b.addClass('choice');
    b.attribute('aria-pressed', 'false');
    b.attribute('aria-label', 'Drawn fan rotation ' + r);
    rotButtons[r] = b;
  }
  startButton = K.button('Start challenge', startChallenge);
  checkButton = K.button(FP.msg.CHECK, checkItem);
  nextButton = K.button('Next duct', nextItem);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });
  exploreButton = K.button(FP.msg.EXPLORE, toExplore, { variant: 'secondary' });

  markSeen();
  syncControls();
  describe('Inlet box position dial. A drive-side view of a centrifugal fan housing with an inlet box ' +
    'that moves in 45 degree steps around the housing. In Explore mode the sim shows the position ' +
    'number (45 to 360, clockwise from the top) and the FanPedia description, and the rotation can be ' +
    'switched between clockwise and counterclockwise without changing the number. In the challenge, ' +
    'eight duct descriptions each ask the learner to move the box to meet the duct and press Check.');
}

// ---------- Box and rotation ----------
function boxMovable() {
  return mode === 'explore' || (runner.state().phase === 'question');
}
function moveBox(delta) {
  if (!boxMovable()) return;
  setBox(boxPos + delta);
}
function wrap(p) { let q = p % 360; if (q <= 0) q += 360; return q; }
function setBox(p) {
  boxPos = wrap(p);
  markSeen();
  if (mode === 'explore') {
    FP.announce('Position ' + boxPos + ', ' + desc(boxPos) + ', ' + C.inletBoxByPosition(boxPos).location.toLowerCase() + '.');
  } else {
    FP.announce('Box at the ' + C.inletBoxByPosition(boxPos).location.toLowerCase() + '.');
  }
}
function markSeen() {
  const d = desc(boxPos);
  if (mode === 'explore' && seenShared[d]) seenShared[d].add(boxPos);
}
function setRotation(r) {
  if (mode !== 'explore') return;
  exRot = r;
  syncControls();
  FP.announce('Drawn rotation ' + r + '. The box is still at position ' + boxPos + ', ' + desc(boxPos) + '.');
}

// ---------- Challenge flow ----------
function startChallenge() {
  if (!started || runner.state().phase === 'done') runner.restart();
  started = true;
  mode = 'challenge';
  feedback = null;
  boxPos = 360;
  syncControls();
  announceItem();
  cwButton.elt.focus();
}
function startOver() {
  runner.restart();
  started = true;
  mode = 'challenge';
  feedback = null;
  boxPos = 360;
  syncControls();
  announceItem();
  cwButton.elt.focus();
}
function toExplore() {
  mode = 'explore';
  feedback = null;
  syncControls();
  FP.announce(FP.msg.EXPLORE + '. ' + EXPLORE_PROMPT);
  ccwButton.elt.focus();
}
function announceItem() {
  const st = runner.state();
  FP.announce('Duct ' + (st.index + 1) + ' of ' + ITEMS.length + '. ' + st.item.rot + ' fan. ' + st.item.duct +
    ' The box starts at the top. ' + CHALLENGE_PROMPT);
}
function onEnter() {
  if (mode !== 'challenge') return;
  const st = runner.state();
  if (st.phase === 'question') checkItem();
  else if (st.phase === 'resolved') nextItem();
}
function checkItem() {
  const st = runner.state();
  if (mode !== 'challenge' || st.phase !== 'question') return;
  const res = runner.submit(boxPos);
  if (res.status === 'ignored') return;
  feedback = { kind: res.kind, message: res.message, value: boxPos };
  FP.announce('You set position ' + boxPos + '. ' + res.message);
  syncControls();
  if (res.status === 'retry') cwButton.elt.focus(); else nextButton.elt.focus();
}
function nextItem() {
  if (!runner.next()) return;
  feedback = null;
  boxPos = 360;
  syncControls();
  const st = runner.state();
  if (st.phase === 'done') {
    const s = runner.summary();
    FP.announce('Challenge done. ' + summaryLines(s).join(' ') +
      (s.misses.length ? ' Missed: duct ' + s.misses.map(m => m.index + 1).join(', ') + '.' : ''));
    exploreButton.elt.focus();
  } else {
    announceItem();
    cwButton.elt.focus();
  }
}
function summaryLines(s) { return ['Correct on first attempt: ' + s.firstAttempt + ' of ' + s.total, s.lines[1]]; }

// ---------- Control state and layout ----------
function syncControls() {
  const had = document.activeElement;
  const st = runner.state();
  const exploreOn = mode === 'explore';
  const done = !exploreOn && st.phase === 'done';
  for (const b of [ccwButton, cwButton]) { if (done) b.hide(); else b.show(); K.setEnabled(b, boxMovable()); }
  for (const r of ['CW', 'CCW']) {
    rotButtons[r].attribute('aria-pressed', String(exRot === r));
    if (exploreOn) rotButtons[r].show(); else rotButtons[r].hide();
  }
  if (exploreOn) startButton.show(); else startButton.hide();
  startButton.html(started && st.phase !== 'done' ? 'Resume challenge' : (started ? 'Start the challenge again' : 'Start challenge'));
  for (const b of [checkButton, nextButton, startOverButton]) { if (exploreOn) b.hide(); else b.show(); }
  if (done) { checkButton.hide(); nextButton.hide(); }
  if (!exploreOn && done) exploreButton.show(); else exploreButton.hide();
  K.setEnabled(checkButton, st.phase === 'question');
  K.setEnabled(nextButton, st.phase === 'resolved');
  nextButton.html(st.isLast ? 'See results' : 'Next duct');
  positionControls();
  K.keepFocus(had, [ccwButton, cwButton, rotButtons.CW, rotButtons.CCW, startButton, checkButton, nextButton, startOverButton, exploreButton]);
}

function positionControls() {
  const narrow = canvasWidth < WIDE_MIN;
  const lc = narrow ? 52 : 100;
  const done = mode === 'challenge' && runner.state().phase === 'done';
  K.flowButtons(0, [ccwButton, cwButton], { x: lc });
  const choiceW = b => (b.elt.offsetWidth || 0) + (b.elt.getAttribute('aria-pressed') === 'true' ? 0 : 16);
  K.flowButtons(1, [rotButtons.CW, rotButtons.CCW], { x: narrow ? 92 : 100, measure: choiceW });
  K.flowButtons(mode === 'explore' ? 2 : (done ? 0 : 1), [startButton, checkButton, nextButton, null, startOverButton, exploreButton],
    { x: 10, groupGap: narrow ? 8 : 16 });
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  const st = runner.state();
  let y = K.title('Inlet Box Position Dial');
  let left, right = null;
  if (mode === 'explore') {
    left = started && st.phase === 'done' ? 'Correct on first attempt: ' + runner.score.firstAttempt() + ' of ' + ITEMS.length
      : FP.msg.EXPLORE + ' (not scored)';
    if (started && st.phase === 'done') right = FP.msg.EXPLORE;
  } else {
    left = 'Correct on first attempt: ' + runner.score.firstAttempt() + ' of ' + ITEMS.length;
    right = st.phase === 'done' ? 'Challenge done' : 'Duct ' + (st.index + 1) + ' of ' + ITEMS.length;
  }
  y = K.statusLine(left, right, null, { y: y - 4 });
  const wide = canvasWidth >= WIDE_MIN;
  K.note(wide ? ['Source: FanPedia p. 144', 'Positions as seen from the drive side', 'Keys: ← → move, Enter checks or goes on']
    : ['FanPedia p. 144', 'Keys: ← → move, Enter']);
  const top = y + 2, bottom = drawHeight - 26;
  dial = null;
  if (mode === 'challenge' && st.phase === 'done') {
    drawInfoPanel(10, top, canvasWidth - 20, bottom - top);
  } else if (wide) {
    const lw = Math.min(Math.round(canvasWidth * 0.5), bottom - top + 30);
    drawDialPanel(10, top, lw, bottom - top);
    drawInfoPanel(10 + lw + 8, top, canvasWidth - 28 - lw, bottom - top);
  } else {
    const hh = Math.round((bottom - top) * 0.5);
    drawDialPanel(10, top, canvasWidth - 20, hh);
    drawInfoPanel(10, top + hh + 6, canvasWidth - 20, bottom - top - hh - 6);
  }
  drawControlLabels();
}

function drawRotation() {
  if (mode === 'explore') return exRot;
  return runner.state().item.rot;
}

// Show the position numbers? Always in Explore mode; in the challenge only after a verdict.
function numbersShown() {
  const st = runner.state();
  return mode === 'explore' || st.phase === 'resolved';
}

function drawDialPanel(x, y, w, h) {
  K.panel(x, y, w, h);
  noStroke();
  fill(FP.tok('text'));
  textStyle(BOLD);
  textAlign(CENTER, TOP);
  textSize(14);
  const rot = drawRotation();
  // the rotation is named in the caption, so its label never sits on the box
  text('Drive-side view · ' + rot + ' fan', x + w / 2, y + 6);
  textStyle(NORMAL);
  const top = y + 26;
  const size = Math.min(w, h - 30) / 2 / 0.98;
  const cx = x + w / 2, cy = top + (h - 30) / 2;
  dial = { cx, cy, size };
  const st = runner.state();
  const show = numbersShown();
  // dial ring: ticks at the eight positions, numbers when shown
  push();
  noFill();
  stroke(FP.tok('border'));
  strokeWeight(1);
  drawingContext.setLineDash([3, 4]);
  circle(cx, cy, size * 1.56);
  drawingContext.setLineDash([]);
  for (const p of POSITIONS) {
    const a = radians(p) - HALF_PI;
    const r0 = size * 0.78, r1 = size * 0.82;
    stroke(FP.tok('text-muted'));
    strokeWeight(2);
    line(cx + r0 * cos(a), cy + r0 * sin(a), cx + r1 * cos(a), cy + r1 * sin(a));
    if (show) {
      noStroke();
      fill(p === boxPos ? FP.tok('primary-dark') : FP.tok('text-muted'));
      textStyle(p === boxPos ? BOLD : NORMAL);
      textSize(size < 90 ? 12 : 13);
      textAlign(CENTER, CENTER);
      text(String(p), cx + size * 0.91 * cos(a), cy + size * 0.91 * sin(a));
    }
  }
  pop();
  // correct position after a missed item: dashed marker so it can be compared with the learner's box
  const missed = mode === 'challenge' && st.phase === 'resolved' && st.last && st.last.status === 'missed';
  FD.inletBoxEnd(null, { x: cx, y: cy, size, position: boxPos, highlight: true });
  FD.scrollHousing(null, { x: cx, y: cy, size, rotation: rot, angle: DISCHARGE_ANGLE, rotationLabel: false, showAir: false });
  if (missed) {
    const p = st.item.pos, a = radians(p) - HALF_PI, rr = size * 0.42;
    push();
    noFill();
    stroke(FP.tok('correct'));
    strokeWeight(3);
    drawingContext.setLineDash([6, 4]);
    circle(cx + rr * cos(a), cy + rr * sin(a), size * 0.4);
    drawingContext.setLineDash([]);
    noStroke();
    fill(FP.tok('correct'));
    textStyle(BOLD);
    textSize(13);
    textAlign(CENTER, CENTER);
    text('✓ ' + p, cx + rr * cos(a), cy + rr * sin(a));
    pop();
  }
  textAlign(LEFT, TOP);
}

// Click on the drawing: move the box to the nearest position
function mousePressed() {
  if (!dial || !boxMovable()) return;
  const dx = mouseX - dial.cx, dy = mouseY - dial.cy, d = Math.hypot(dx, dy);
  if (d < dial.size * 0.2 || d > dial.size * 1.0) return;
  let deg = degrees(Math.atan2(dy, dx)) + 90;
  if (deg < 0) deg += 360;
  setBox(Math.round(deg / 45) * 45);
}

// Lays out [{t, bold, muted, color, size, gap}] paragraphs; returns the y below.
function paras(list, x, y, w, ts, dry, yMax) {
  for (const p of list) {
    const s = Math.max(12, ts + (p.size || 0)), ld = Math.round(s * 1.3);
    textSize(s);
    textStyle(p.bold ? BOLD : NORMAL);
    y += p.gap || 0;
    const left = yMax == null ? Infinity : Math.floor((yMax - y) / ld);
    if (left < 1) break;
    if (!dry) fill(p.color || FP.tok(p.muted ? 'text-muted' : 'text'));
    y = K.wrapText(p.t, x, y, w, ld, { dryRun: dry, maxLines: isFinite(left) ? left : undefined });
  }
  textStyle(NORMAL);
  return y;
}

function infoContent() {
  const st = runner.state();
  if (mode === 'explore') {
    const box = C.inletBoxByPosition(boxPos);
    const list = [
      { t: 'Position ' + boxPos, bold: true, size: 6, color: FP.tok('primary-dark') },
      { t: box.description, bold: true, size: 2, gap: 2 },
      { t: 'Box location (drive side): ' + box.location, gap: 6 },
      { t: 'Drawn rotation: ' + exRot + '. Switch it: the box and its number stay put.', gap: 2 }
    ];
    const shared = seenShared[box.description];
    const other = (360 - boxPos) % 360 || 360;
    // answer the prompt only once the learner has visited both positions of the pair
    if (shared && shared.has(other)) {
      list.push({ t: 'ℹ ' + other + ' is also ' + box.description + '. The number, not the description, pins down the side.',
        color: FP.tok('accent-text'), gap: 8 });
    }
    list.push({ t: EXPLORE_PROMPT, muted: true, gap: 10 });
    if (started && st.phase === 'done') {
      const s = runner.summary();
      list.push({ t: summaryLines(s)[0], bold: true, gap: 10 });
      list.push({ t: s.lines[1], color: s.mastered ? FP.tok('primary') : FP.tok('text'), bold: s.mastered });
    } else if (!started) {
      list.push({ t: 'When you are ready, press Start challenge: eight ducts, two attempts each.', gap: 8 });
    }
    return { head: list, fb: null, tail: [] };
  }
  if (st.phase === 'done') {
    const s = runner.summary();
    const list = [
      { t: 'Challenge complete', bold: true, size: 2 },
      { t: summaryLines(s)[0], bold: true, gap: 6 },
      { t: s.lines[1], color: s.mastered ? FP.tok('primary') : FP.tok('text'), bold: s.mastered }
    ];
    if (s.misses.length) {
      list.push({ t: 'Missed ducts:', bold: true, gap: 8 });
      for (const m of s.misses) list.push({ t: '✗ Duct ' + (m.index + 1) + ': ' + m.answer + '. ' + ITEM_DATA[m.index].why, gap: 3 });
    } else {
      list.push({ t: '✓ No missed ducts.', gap: 8 });
    }
    list.push({ t: 'Press Explore mode to move the box freely, or Start over for the eight ducts again.', muted: true, gap: 8 });
    return { head: list, fb: null, tail: [] };
  }
  const it = st.item;
  const head = [
    { t: 'Duct ' + (st.index + 1) + ' of ' + ITEMS.length + (st.phase === 'question' ? ' · ' + st.attemptLabel : ''), bold: true },
    { t: 'Fan rotation: ' + it.rot + ' (as drawn, drive side)', gap: 4, color: it.rot === 'CCW' ? FP.tok('accent-text') : FP.tok('text'), bold: it.rot === 'CCW' },
    { t: it.duct, gap: 4, bold: true },
    { t: CHALLENGE_PROMPT, muted: true, gap: 4 }
  ];
  const tail = [];
  if (st.phase === 'resolved' && feedback) {
    tail.push({ t: 'You set position ' + feedback.value + ' (' + desc(feedback.value) + ').', muted: true, gap: 6 });
  }
  return { head, fb: feedback, tail };
}

function drawInfoPanel(x, y, w, h) {
  K.panel(x, y, w, h);
  const { head, fb, tail } = infoContent();
  const fbList = fb ? [{ t: fb.message, color: FP.tok(fb.kind === 'ok' ? 'correct' : 'incorrect') }] : [];
  const tx = x + 10, tw = w - 20, ty = y + 8, pad = 6;
  const layout = (ts, dry, yMax) => {
    let yy = paras(head, tx, ty, tw, ts, dry, yMax);
    if (fbList.length) {
      const fbTop = yy + 8;
      const fbH = paras(fbList, tx + pad, fbTop + pad, tw - 2 * pad, ts, true) + pad - fbTop;
      const fh = yMax == null ? fbH : Math.min(fbH, yMax - fbTop);
      if (!dry) {
        K.panel(tx - 4, fbTop, tw + 8, fh, {
          fill: fb.kind === 'ok' ? '--fp-correct-bg' : '--fp-incorrect-bg',
          stroke: fb.kind === 'ok' ? '--fp-correct' : '--fp-incorrect',
          dashed: fb.kind !== 'ok', weight: 2, radius: 6
        });
        noStroke();
        paras(fbList, tx + pad, fbTop + pad, tw - 2 * pad, ts, false, fbTop + fh);
      }
      yy = fbTop + fh;
    }
    return paras(tail, tx, yy, tw, ts, dry, yMax) - ty;
  };
  const ts = K.fitTextSize(t => layout(t, true), h - 16, 16, 12);
  noStroke();
  textAlign(LEFT, TOP);
  layout(ts, false, y + h - 6);
}

function drawControlLabels() {
  const st = runner.state();
  noStroke();
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(canvasWidth < WIDE_MIN ? 14 : 16);
  fill(FP.tok('text'));
  const mid = r => K.controlRow(r) + (cwButton.elt.offsetHeight || 30) / 2;
  if (!(mode === 'challenge' && st.phase === 'done')) text('Box:', 10, mid(0));
  if (mode === 'explore') text('Rotation:', 10, mid(1));
  textStyle(NORMAL);
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
