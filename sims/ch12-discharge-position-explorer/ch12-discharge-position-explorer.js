// Discharge Position Explorer - p5.js MicroSim (Chapter 12: Discharge Positions and Rotation)
// CANVAS_HEIGHT: 640
// Explore mode first: set rotation (CW/CCW), discharge angle (45..360 in 45° steps) and viewpoint
// (drive side / inlet side) and watch an SWSI housing redraw with its name, designation, "also
// known as" form and the direction the air leaves. Then a ten-drawing challenge: name the rotation
// and the discharge abbreviation as seen from the drive side; two attempts each, first-attempt
// score, mastery 8 of 10.
// Rules (chapter 12): theta = N for CW, 360 − N for CCW; the outlet sits at theta − 90 (CW) or
// theta + 90 (CCW); an inlet-side view is the mirror image (d → 360 − d, arrow reversed), and
// the correct name does not change.
// Built on the FanPedia kit: FP.ChallengeRunner (items, attempts, score, mastery), FP.codes
// (discharge table, designations, directions), FD.scrollHousing / FD.angleDial (drive-side and
// inlet-side housings), FP.p5 (layout, text, controls, keys).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js, fan-codes.js,
// fan-drawings.js (load them before this file, also in the p5.js editor).

const K = FP.p5;
const C = FP.codes;
const SIM_ID = 'ch12-discharge-position-explorer';

// ---------- Canvas layout: fixed height; the drawing region gives way to wrapped controls ----------
let canvasWidth = 800;
const canvasHeight = 640;
let controlHeight = K.controlHeightFor(4);
let drawHeight = canvasHeight - controlHeight;
const WIDE_MIN = 600;
const MASTERY = 8;

const EXPLORE_PROMPT = 'Step the angle and predict where the outlet will go before it moves.';
const INLET_NOTE = 'You are looking from the inlet side. The fan\'s rotation and discharge are still named as seen from the drive side.';
const CHALLENGE_PROMPT = 'Name the fan\'s rotation and discharge position as seen from the drive side.';
const VIEW_LABEL = { drive: 'Viewed from the drive side', inlet: 'Viewed from the inlet side (opposite the drive)' };

// ---------- Challenge drawings (spec table, fixed order) ----------
// rot + code is the answer; view is what the drawing shows (FD mirrors an inlet view).
const ITEM_DATA = [
  { view: 'drive', rot: 'CW', code: 'THD', why: 'From upblast, 90 degrees clockwise is top horizontal, and a CW wheel throws air to the right at the top.' },
  { view: 'drive', rot: 'CCW', code: 'UBD', why: 'Straight up is upblast; it sits on the right because air on the right of a CCW wheel moves upward.' },
  { view: 'drive', rot: 'CW', code: 'BHD', why: '270 degrees clockwise from upblast is bottom horizontal; a CW wheel moves air to the left at the bottom.' },
  { view: 'drive', rot: 'CCW', code: 'DBD', why: 'Straight down is downblast; it sits on the left because air on the left of a CCW wheel moves downward.' },
  { view: 'drive', rot: 'CW', code: 'TAU', why: 'One 45-degree step clockwise from upblast is top angular up.' },
  { view: 'drive', rot: 'CCW', code: 'TAD', why: 'Three 45-degree steps counterclockwise from upblast is top angular down; the air heads down and left.' },
  { view: 'drive', rot: 'CW', code: 'BAU', why: 'Seven 45-degree steps clockwise from upblast is bottom angular up.' },
  { view: 'inlet', rot: 'CW', code: 'THD', why: 'From the inlet side everything is mirrored; from the drive side the wheel is CW and the top outlet points right.' },
  { view: 'inlet', rot: 'CCW', code: 'UBD', why: 'Mirror the inlet-side view: from the drive side the wheel is CCW and the upblast outlet is on the right.' },
  { view: 'drive', rot: 'CCW', code: 'BHD', why: '270 degrees counterclockwise from upblast is bottom horizontal; a CCW wheel moves air to the right at the bottom.' }
];
const ITEMS = ITEM_DATA.map((d, i) => Object.assign({}, d, {
  id: 'drawing-' + (i + 1),
  angle: C.dischargeByCode(d.code).angle,
  answerText: C.designation(d.rot, d.code),            // "CW THD (CW 90)"
  check: (v, it) => v.rot === it.rot && v.code === it.code,
  // Spec first-attempt hints: rotation wrong (by viewpoint) first, then abbreviation
  hint: (v, it) => (v.rot !== it.rot
    ? (it.view === 'inlet'
      ? 'Check the viewpoint: this drawing is from the inlet side, so mirror it before naming the rotation.'
      : 'Read the arrow as drawn: this view is from the drive side.')
    : 'Count 45-degree steps from upblast in the direction of rotation.'),
  why: (v, it) => (v.rot === it.rot && v.code === it.code ? '' : d.why)
}));

const runner = new FP.ChallengeRunner({
  items: ITEMS, attempts: 2, noun: 'Items', mastery: MASTERY, explore: false,
  reviewPointer: 'Explore the angles that you missed, then press Start over to try the ten drawings again',
  id: SIM_ID
});

// ---------- State ----------
let mode = 'explore';           // 'explore' | 'challenge'
let started = false;            // the challenge has been started at least once
let ex = { rot: 'CW', angle: 360, view: 'drive' };
let ans = { rot: null, code: null };
let feedback = null;            // {kind, message}
let notice = '';

// ---------- Controls ----------
let exRot = {}, exView = {}, angleDown, angleUp, angleSlider, startButton;
let chRot = {}, chCode = {}, checkButton, nextButton, startOverButton, exploreButton;
let labelCol = 100;
let rows = {};                  // control row of each labelled group

const keys = K.keys.bind({ Enter: onEnter });
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  const main = document.querySelector('main');

  // Explore controls
  for (const r of ['CW', 'CCW']) exRot[r] = toggle(r, () => setExplore({ rot: r }), 'Explore rotation ' + r);
  angleDown = K.button('− 45°', () => stepAngle(-45), { variant: 'secondary' });
  angleDown.attribute('aria-label', 'Step the discharge angle back 45 degrees');
  angleSlider = createSlider(45, 360, 360, 45);
  angleSlider.parent(main);
  angleSlider.attribute('aria-label', 'Discharge angle, degrees');
  angleSlider.input(() => setExplore({ angle: Number(angleSlider.value()) }));
  angleUp = K.button('+ 45°', () => stepAngle(45), { variant: 'secondary' });
  angleUp.attribute('aria-label', 'Step the discharge angle forward 45 degrees');
  for (const v of ['drive', 'inlet']) {
    exView[v] = toggle(v === 'drive' ? 'Drive side' : 'Inlet side', () => setExplore({ view: v }),
      'Viewpoint: ' + (v === 'drive' ? 'drive side' : 'inlet side, opposite the drive'));
  }
  startButton = K.button('Start challenge', startChallenge);

  // Challenge controls
  for (const r of ['CW', 'CCW']) chRot[r] = toggle(r, () => choose('rot', r), 'Your rotation: ' + r);
  for (const d of C.DISCHARGES) chCode[d.code] = toggle(d.code, () => choose('code', d.code), 'Your discharge: ' + d.code + ', ' + d.name);
  checkButton = K.button(FP.msg.CHECK, checkItem);
  nextButton = K.button('Next drawing', nextItem);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });
  exploreButton = K.button(FP.msg.EXPLORE, toExplore, { variant: 'secondary' });

  measureControls();
  syncControls();
  describe('Discharge position explorer. A drive-side or inlet-side view of a single width centrifugal ' +
    'fan housing with a rotation arrow and an outlet. In Explore mode the learner sets the rotation, the ' +
    'discharge angle in 45 degree steps and the viewpoint, and reads the position name, the designation, ' +
    'the also-known-as form and the direction the air leaves. In the challenge the learner names the ' +
    'rotation and discharge of ten drawings as seen from the drive side.');
}

function toggle(label, onPress, aria) {
  const b = K.button(label, onPress);
  b.addClass('choice');
  b.attribute('aria-pressed', 'false');
  b.attribute('aria-label', aria);
  // Space (or a click) picks an option; Enter checks or goes on, as everywhere in the sim
  b.elt.addEventListener('keydown', e => {
    if (e.key === 'Enter' && mode === 'challenge') { e.preventDefault(); e.stopPropagation(); onEnter(); }
  });
  return b;
}

// ---------- Explore ----------
function setExplore(change) {
  Object.assign(ex, change);
  angleSlider.value(ex.angle);
  syncControls();
  const d = C.dischargeByAngle(ex.angle);
  FP.announce(C.designation(ex.rot, d.code) + ', ' + d.name + '. Air leaves ' +
    C.directionWords(C.airDirection(ex.rot, ex.angle), true).toLowerCase() + ' as seen from the drive side. ' +
    VIEW_LABEL[ex.view] + '.');
}
function stepAngle(delta) {
  let a = ex.angle + delta;
  if (a > 360) a -= 360;
  if (a < 45) a += 360;
  setExplore({ angle: a });
}

// ---------- Challenge flow (FP.ChallengeRunner) ----------
function startChallenge() {
  if (!started || runner.state().phase === 'done') runner.restart();
  started = true;
  mode = 'challenge';
  resetItem();
  syncControls();
  announceItem();
  chRot.CW.elt.focus();
}
function startOver() {
  runner.restart();
  started = true;
  mode = 'challenge';
  resetItem();
  syncControls();
  announceItem();
  chRot.CW.elt.focus();
}
function toExplore() {
  mode = 'explore';
  feedback = null; notice = '';
  syncControls();
  FP.announce(FP.msg.EXPLORE + '. ' + EXPLORE_PROMPT);
  exRot.CW.elt.focus();
}
function resetItem() { ans = { rot: null, code: null }; feedback = null; notice = ''; }
function announceItem() {
  const st = runner.state();
  FP.announce('Drawing ' + (st.index + 1) + ' of ' + ITEMS.length + '. ' + VIEW_LABEL[st.item.view] + '. ' +
    'The arrow is drawn ' + (drawnRotation(st.item) === 'CW' ? 'clockwise' : 'counterclockwise') + '. ' + CHALLENGE_PROMPT);
}
function drawnRotation(item) { return item.view === 'inlet' ? (item.rot === 'CW' ? 'CCW' : 'CW') : item.rot; }

function choose(field, value) {
  if (mode !== 'challenge' || runner.state().phase !== 'question') return;
  ans[field] = value;
  notice = '';
  syncControls();
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
  if (!ans.rot || !ans.code) {
    notice = 'Choose a rotation and a discharge position, then press Check.';
    FP.announce(notice);
    return;
  }
  const res = runner.submit({ rot: ans.rot, code: ans.code });
  if (res.status === 'ignored') return;
  feedback = { kind: res.kind, message: res.message };
  FP.announce(res.message);
  if (res.status === 'retry') ans = { rot: null, code: null };
  syncControls();
  if (res.status === 'retry') chRot.CW.elt.focus(); else nextButton.elt.focus();
}

function nextItem() {
  if (!runner.next()) return;
  resetItem();
  syncControls();
  const st = runner.state();
  if (st.phase === 'done') {
    const s = runner.summary();
    FP.announce('Challenge done. ' + summaryLines(s).join(' ') +
      (s.misses.length ? ' Missed: drawing ' + s.misses.map(m => m.index + 1).join(', ') + '.' : ''));
    exploreButton.elt.focus();
  } else {
    announceItem();
    chRot.CW.elt.focus();
  }
}

function summaryLines(s) {
  return ['Correct on first attempt: ' + s.firstAttempt + ' of ' + s.total, s.lines[1]];
}

// ---------- Control state and layout ----------
function syncControls() {
  const had = document.activeElement;
  const st = runner.state();
  const exploreOn = mode === 'explore';
  const asking = !exploreOn && st.phase === 'question';
  const exCtrls = [exRot.CW, exRot.CCW, angleDown, angleSlider, angleUp, exView.drive, exView.inlet, startButton];
  const chCtrls = [chRot.CW, chRot.CCW, ...Object.values(chCode), checkButton, nextButton, startOverButton, exploreButton];
  for (const c of exCtrls) { if (exploreOn) c.show(); else c.hide(); }
  for (const c of chCtrls) { if (exploreOn) c.hide(); else c.show(); }
  for (const r of ['CW', 'CCW']) exRot[r].attribute('aria-pressed', String(ex.rot === r));
  for (const v of ['drive', 'inlet']) exView[v].attribute('aria-pressed', String(ex.view === v));
  startButton.html(started && st.phase !== 'done' ? 'Resume challenge' : (started ? 'Start the challenge again' : 'Start challenge'));
  // challenge choices: after a verdict, show what was submitted
  const shown = st.phase === 'resolved' && st.last ? st.last.value : ans;
  for (const r of ['CW', 'CCW']) { chRot[r].attribute('aria-pressed', String(shown.rot === r)); K.setEnabled(chRot[r], asking); }
  for (const d of C.DISCHARGES) { chCode[d.code].attribute('aria-pressed', String(shown.code === d.code)); K.setEnabled(chCode[d.code], asking); }
  K.setEnabled(checkButton, asking && !!ans.rot && !!ans.code);
  K.setEnabled(nextButton, st.phase === 'resolved');
  nextButton.html(st.isLast ? 'See results' : 'Next drawing');
  if (st.phase === 'done') { checkButton.hide(); nextButton.hide(); }
  if (st.phase !== 'done' && !exploreOn) exploreButton.hide();
  if (st.phase === 'done' && !exploreOn) { for (const c of [chRot.CW, chRot.CCW, ...Object.values(chCode)]) c.hide(); }
  positionControls();
  K.keepFocus(had, exploreOn ? exCtrls : chCtrls);
}

function choiceWidth(b) {
  return (b.elt.offsetWidth || 0) + (b.elt.getAttribute('aria-pressed') === 'true' ? 0 : 16);
}

// Unpressed width of every button, measured while shown (hidden buttons report 0)
function measureControls() {
  const all = [...Object.values(chCode), chRot.CW, chRot.CCW, checkButton, nextButton, startOverButton, exploreButton];
  for (const b of all) {
    const d = b.elt.style.display;
    b.elt.style.display = '';
    b._w = (b.elt.offsetWidth || 0) - (b.elt.getAttribute('aria-pressed') === 'true' ? 16 : 0);
    b.elt.style.display = d;
  }
}

// Rows the controls need at this width in either mode (the larger), so the drawing never jumps
function rowsNeeded() {
  const avail = canvasWidth - 10 - labelCol;
  const raw = b => b._w || 0;
  const fit = (list, extra, width) => {
    let r = 1, x = 0;
    for (const b of list) {
      const w = raw(b) + extra;
      if (x > 0 && x + w > width) { r++; x = 0; }
      x += w + 8;
    }
    return r;
  };
  const explore = 1 + 1 + 1 + 1;   // rotation, angle, view, start
  const codes = fit(Object.values(chCode), 16, avail);
  const actW = [checkButton, nextButton, startOverButton].reduce((s, b) => s + raw(b) + 8, 16);
  const challenge = 1 + codes + (actW > canvasWidth - 20 ? 2 : 1);
  return Math.max(explore, challenge);
}

function positionControls() {
  const narrow = canvasWidth < WIDE_MIN;
  labelCol = narrow ? 92 : 104;
  controlHeight = K.controlHeightFor(rowsNeeded());
  drawHeight = canvasHeight - controlHeight;
  K.config({ drawHeight, controlHeight });
  const opt = { x: labelCol, measure: choiceWidth };
  // Explore rows
  rows.exRot = 0;
  K.flowButtons(0, [exRot.CW, exRot.CCW], opt);
  rows.angle = 1;
  angleDown.position(labelCol, K.controlRow(1));
  const dw = angleDown.elt.offsetWidth || 60, uw = angleUp.elt.offsetWidth || 60;
  const sx = labelCol + dw + 10;
  const sw = Math.max(80, canvasWidth - 10 - uw - 10 - sx);
  angleSlider.position(sx, K.controlRow(1) + 4);
  angleSlider.size(sw);
  angleUp.position(sx + sw + 10, K.controlRow(1));
  rows.view = 2;
  K.flowButtons(2, [exView.drive, exView.inlet], opt);
  K.flowButtons(3, [startButton], { x: 10 });
  // Challenge rows
  const done = runner.state().phase === 'done';
  rows.chRot = 0;
  rows.code = done ? 0 : K.flowButtons(0, [chRot.CW, chRot.CCW], opt);
  const after = done ? 0 : K.flowButtons(rows.code, Object.values(chCode), opt);
  K.flowButtons(after, [checkButton, nextButton, null, startOverButton, exploreButton],
    { x: narrow || done ? 10 : labelCol, groupGap: narrow ? 8 : 16 });
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  const st = runner.state();
  let y = K.title('Discharge Position Explorer');
  let left, right;
  if (mode === 'explore') {
    left = started && st.phase === 'done' ? 'Correct on first attempt: ' + runner.score.firstAttempt() + ' of ' + ITEMS.length
      : FP.msg.EXPLORE + ' (not scored)';
    right = started && st.phase === 'done' ? FP.msg.EXPLORE : null;
  } else {
    left = 'Correct on first attempt: ' + runner.score.firstAttempt() + ' of ' + ITEMS.length;
    right = st.phase === 'done' ? 'Challenge done' : 'Drawing ' + (st.index + 1) + ' of ' + ITEMS.length;
  }
  y = K.statusLine(left, right, null, { y: y - 4 });
  const wide = canvasWidth >= WIDE_MIN;
  K.note(wide ? ['Source: FanPedia pp. 46–47', 'Directions as seen from the drive side', 'Enter: check or next']
    : ['FanPedia pp. 46–47', 'Enter: check or next']);
  const top = y + 2, bottom = drawHeight - 26;

  if (!currentView()) {
    // challenge summary: the whole drawing area is the summary
    drawInfoPanel(10, top, canvasWidth - 20, bottom - top);
  } else if (wide) {
    const lw = Math.min(Math.round(canvasWidth * 0.5), bottom - top + 40);
    drawHousingPanel(10, top, lw, bottom - top);
    drawInfoPanel(10 + lw + 8, top, canvasWidth - 28 - lw, bottom - top);
  } else {
    const hh = Math.round((bottom - top) * 0.46);
    drawHousingPanel(10, top, canvasWidth - 20, hh);
    drawInfoPanel(10, top + hh + 6, canvasWidth - 20, bottom - top - hh - 6);
  }
  drawControlLabels();
}

// What the housing panel shows: {rot (drive side), angle, view, label, dial}
function currentView() {
  const st = runner.state();
  if (mode === 'explore') return { rot: ex.rot, angle: ex.angle, view: ex.view, rotationLabel: ex.view === 'drive', dial: ex.view === 'drive' };
  if (st.phase === 'done') return null;
  const it = st.item;
  return { rot: it.rot, angle: it.angle, view: it.view, rotationLabel: false, dial: st.phase === 'resolved' };
}

function drawHousingPanel(x, y, w, h) {
  K.panel(x, y, w, h);
  const v = currentView();
  noStroke();
  textAlign(CENTER, TOP);
  if (!v) {
    fill(FP.tok('text-muted'));
    textSize(14);
    K.wrapText('Press Explore to set any rotation, angle and viewpoint, or Start over to try the ten drawings again.',
      x + w / 2, y + h / 2 - 20, w - 40, 18, { align: CENTER });
    textAlign(LEFT, TOP);
    return;
  }
  textStyle(BOLD);
  textSize(w < 330 ? 13 : 14);
  fill(v.view === 'inlet' ? FP.tok('accent-text') : FP.tok('text'));
  K.wrapText((v.view === 'inlet' ? '⇄ ' : '') + VIEW_LABEL[v.view], x + w / 2, y + 6, w - 16, 17, { align: CENTER, maxLines: 2 });
  textStyle(NORMAL);
  const capH = textWidth(VIEW_LABEL[v.view]) + 20 > w - 16 ? 40 : 24;
  const avail = { x: x + 4, y: y + capH, w: w - 8, h: h - capH - 4 };
  const size = Math.min(avail.w / 1.45, avail.h / 1.35);
  const cx = avail.x + avail.w / 2, cy = avail.y + avail.h / 2 + size * 0.04;
  FD.scrollHousing(null, { x: cx, y: cy, size, rotation: v.rot, angle: v.angle, view: v.view,
    rotationLabel: v.rotationLabel ? v.rot : false });
  if (v.dial && w >= 220) {
    // In the challenge the dial is the answer, always as seen from the drive side
    const dy = mode === 'challenge' ? 18 : 0;
    if (dy) {
      fill(FP.tok('text-muted')); textSize(12); textAlign(CENTER, TOP);
      text('Drive side', x + w - 38, y + capH + 2);
    }
    FD.angleDial(null, { x: x + w - 38, y: y + capH + 30 + dy, r: 20, rotation: v.rot, angle: v.angle });
  }
  textAlign(LEFT, TOP);
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
    const d = C.dischargeByAngle(ex.angle);
    const list = [
      { t: d.code + ' · ' + d.name, bold: true, size: 4, color: FP.tok('primary-dark') },
      { t: 'Designation: ' + ex.rot + ' ' + ex.angle + '  (' + ex.rot + ' ' + d.code + ')', gap: 6 },
      { t: 'Also known as: ' + C.alsoKnownAs(ex.rot, ex.angle), gap: 2 },
      { t: 'Air leaves toward (drive side): ' + C.directionWords(C.airDirection(ex.rot, ex.angle), true), gap: 2, bold: true }
    ];
    if (ex.view === 'inlet') list.push({ t: 'ℹ ' + INLET_NOTE, color: FP.tok('accent-text'), gap: 8 });
    list.push({ t: EXPLORE_PROMPT, muted: true, gap: 10 });
    if (started && st.phase === 'done') {
      const s = runner.summary();
      list.push({ t: summaryLines(s)[0], bold: true, gap: 10 });
      list.push({ t: s.lines[1], color: s.mastered ? FP.tok('primary') : FP.tok('text'), bold: s.mastered });
    } else if (!started) {
      list.push({ t: 'When you are ready, press Start challenge: ten drawings, two attempts each.', gap: 8 });
    }
    return { list, fb: null };
  }
  if (st.phase === 'done') {
    const s = runner.summary();
    const list = [
      { t: 'Challenge complete', bold: true, size: 2 },
      { t: summaryLines(s)[0], bold: true, gap: 6 },
      { t: s.lines[1], color: s.mastered ? FP.tok('primary') : FP.tok('text'), bold: s.mastered }
    ];
    if (s.misses.length) {
      list.push({ t: 'Missed drawings:', bold: true, gap: 8 });
      for (const m of s.misses) list.push({ t: '✗ Drawing ' + (m.index + 1) + ' (' + m.item.view + ' side): ' + m.answer + '. ' + ITEM_DATA[m.index].why, gap: 3 });
    } else {
      list.push({ t: '✓ No missed drawings.', gap: 8 });
    }
    list.push({ t: 'Press Explore to try any setting, or Start over for the ten drawings again.', muted: true, gap: 8 });
    return { list, fb: null };
  }
  const it = st.item;
  const list = [
    { t: 'Drawing ' + (st.index + 1) + ' of ' + ITEMS.length + (st.phase === 'question' ? ' · ' + st.attemptLabel : ''), bold: true },
    { t: 'Viewpoint shown: ' + (it.view === 'inlet' ? 'Inlet side (opposite the drive)' : 'Drive side'), gap: 4,
      color: it.view === 'inlet' ? FP.tok('accent-text') : FP.tok('text'), bold: it.view === 'inlet' },
    { t: CHALLENGE_PROMPT, gap: 4 }
  ];
  if (notice) list.push({ t: 'ℹ ' + notice, color: FP.tok('primary-dark'), gap: 6 });
  if (st.phase === 'resolved') {
    const d = C.dischargeByCode(it.code);
    list.push({ t: 'Air leaves toward (drive side): ' + C.directionWords(C.airDirection(it.rot, d.angle), true) + '.', muted: true, gap: 6 });
  }
  return { list, fb: feedback };
}

function drawInfoPanel(x, y, w, h) {
  K.panel(x, y, w, h);
  const { list, fb } = infoContent();
  const fbList = fb ? [{ t: fb.message, color: FP.tok(fb.kind === 'ok' ? 'correct' : (fb.kind === 'bad' ? 'incorrect' : 'text')) }] : [];
  const tx = x + 10, tw = w - 20, ty = y + 8, pad = 6;
  // feedback goes after the drawing number, viewpoint and prompt, before any extra lines
  const head = fb ? list.slice(0, 3 + (notice ? 1 : 0)) : list;
  const tail = fb ? list.slice(head.length) : [];
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
  const mid = r => K.controlRow(r) + (checkButton.elt.offsetHeight || 30) / 2;
  if (mode === 'explore') {
    text('Rotation:', 10, mid(rows.exRot));
    text('Angle: ' + ex.angle + '°', 10, mid(rows.angle));
    text('View:', 10, mid(rows.view));
  } else if (st.phase !== 'done') {
    text('Rotation:', 10, mid(rows.chRot));
    text('Discharge:', 10, mid(rows.code));
  }
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
}

// ---------- Responsive sizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  measureControls();
  syncControls();
}

function updateCanvasSize() {
  canvasWidth = K.updateCanvasSize(320);
}
