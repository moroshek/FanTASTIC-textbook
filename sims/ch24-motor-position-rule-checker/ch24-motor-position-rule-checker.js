// Motor Position Rule Checker - p5.js MicroSim (Chapter 24: Advanced Arrangements and
// Configuration Variants)
// CANVAS_HEIGHT: 625
// Ten order lines in a fixed order (pedestal arrangements, swingout, plenum and inline). For
// each, the learner judges Standard, Allowed with condition or Not allowed and, for Not allowed,
// picks the correction. One scored attempt; then a sketch of the fan in its reference view
// (drive side, or discharge view for the inline item) shows the motor in the correct position.
// Mastery 8 of 10 on the first attempt.
// Built on the FanPedia kit: FP.codes.checkMotorLine (verdict and correction for every line),
// FP.CardDeck (order, lock, score, mastery), FD (scroll housing, arrows), FP.p5 (layout,
// text, panels, controls, keys, focus), FP.msg / FP.announce (wording, live region).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js, fan-codes.js,
// fan-drawings.js (load them before this file, also in the p5.js editor).

const K = FP.p5;
const SIM_ID = 'ch24-motor-position-rule-checker';
let canvasWidth = 800;
const drawHeight = 580;
const controlHeight = K.controlHeightFor(1);   // Check, Next | Start over
const canvasHeight = drawHeight + controlHeight;
const MASTERY = 8;
const PROMPT = 'Would this order line ship as written?';

const VERDICTS = [
  { id: 'standard', name: 'Standard' },
  { id: 'condition', name: 'Allowed with condition' },
  { id: 'not-allowed', name: 'Not allowed' }
];
const VERDICT_NAME = Object.fromEntries(VERDICTS.map(v => [v.id, v.name]));
// Correction ids are FP.codes.checkMotorLine's correction values.
const CORRECTIONS = [
  { id: 'L', name: 'change motor to (L)' },
  { id: 'R', name: 'change motor to (R)' },
  { id: 'F2', name: 'change to F2 conduit box' },
  { id: 'TC', name: 'change to Top Center (TC)' },
  { id: 'none', name: 'remove motor position (none applies)' },
  { id: 'floor-positions', name: 'choose a position from G, H, A, B or C' }
];
const CORR_NAME = Object.fromEntries(CORRECTIONS.map(c => [c.id, c.name]));

// Chapter 24 spec, "Content" table. line: the order line for FP.codes.checkMotorLine;
// kind/show: what the sketch draws (show = the correct motor position after Check).
const ITEMS = [
  { id: 1, code: '9', text: 'Arr. 9, CW, motor (L), F1', kind: 'pedestal',
    line: { arrangement: '9', rotation: 'CW', position: 'L', conduitBox: 'F1' },
    show: { pos: 'L', box: 'F1' }, why: 'CW (L) is the standard; (L) is normally ordered with F1.' },
  { id: 2, code: '9F', text: 'Arr. 9F, CCW, motor (R)', kind: 'pedestal',
    line: { arrangement: '9F', rotation: 'CCW', position: 'R' },
    show: { pos: 'R' }, why: '9F follows CW (L) / CCW (R).' },
  { id: 3, code: '9', text: 'Arr. 9, CW, motor (L), F2, wall close to conduit side', kind: 'pedestal',
    line: { arrangement: '9', rotation: 'CW', position: 'L', conduitBox: 'F2', clearanceIssue: true },
    show: { pos: 'L', box: 'F2', wall: true }, why: 'FanPedia: select F2 for (L) if there are clearance issues.' },
  { id: 4, code: '9SS', text: 'Arr. 9SS right swing, CW, motor (R)', kind: 'pedestal',
    line: { arrangement: '9SS', swing: 'right', rotation: 'CW', position: 'R' },
    show: { pos: 'L', swing: 'Right swing' }, why: 'A right swing 9SS is CW and (L) only.' },
  { id: 5, code: '9SS', text: 'Arr. 9SS left swing, CCW, motor (R), F1', kind: 'pedestal',
    line: { arrangement: '9SS', swing: 'left', rotation: 'CCW', position: 'R', conduitBox: 'F1' },
    show: { pos: 'R', box: 'F2', swing: 'Left swing' }, why: 'Left swing 9SS must have the F2 conduit box.' },
  { id: 6, code: '9ST', text: 'Arr. 9ST left swing, motor (L)', kind: 'pedestal',
    line: { arrangement: '9ST', swing: 'left', position: 'L' },
    show: { pos: 'L', swing: 'Left swing' }, why: '9ST left swing standard is (L).' },
  { id: 7, code: '10', text: 'Arr. 10, CW, motor (L)', kind: 'pedestal',
    line: { arrangement: '10', rotation: 'CW', position: 'L' },
    show: { pos: 'inside' }, why: 'Arrangement 10 motor position is unique to the pedestal, no options.' },
  { id: 8, code: '3SM', text: 'Plenum 3SM, motor (R)', kind: 'plenum',
    line: { arrangement: '3SM', position: 'R' },
    show: { pos: 'R' }, why: '3SM standard motor position is (R).' },
  { id: 9, code: '9 inline', text: 'Arr. 9 inline, horizontal, floor mount, motor position E', kind: 'inline',
    line: { arrangement: '9 inline horizontal', mount: 'floor', position: 'E' },
    show: { pos: 'floor' }, why: 'Floor supports block the lower positions; floor mount shows G, H, A, B, C.' },
  { id: 10, code: '3HA', text: 'Plenum 3HA, motor (L)', kind: 'plenum',
    line: { arrangement: '3HA', position: 'L' },
    show: { pos: 'TC' }, why: 'A top-mounted motor on an adjustable base has one position, Top Center.' }
].map(it => {
  const r = FP.codes.checkMotorLine(it.line);   // the kit rule table decides verdict and fix
  return Object.assign(it, { answer: r.verdict, fix: r.verdict === 'not-allowed' ? r.correction : null });
});

const answerText = c => VERDICT_NAME[c.answer] + (c.fix ? '; ' + CORR_NAME[c.fix] : '');

// Spec feedback: Correct "Correct. <Why>."; incorrect verdict "Check the rule for Arr. <code>:
// <Why>."; right verdict, wrong fix "Right verdict; the fix is <correction>." The answer is
// then revealed.
const deck = new FP.CardDeck({
  cards: ITEMS, shuffle: false, attempts: 1, retryMissed: false,
  noun: 'Lines', mastery: MASTERY, id: SIM_ID,
  check: (card, ch) => ch.verdict === card.answer && (card.answer !== 'not-allowed' || ch.fix === card.fix),
  label: (a, card) => answerText(card),
  reviewPointer: 'Reread "Motor Positions for Arrangement Variants" (FanPedia pp. 52-56), then press Start over',
  messages: {
    correct: res => FP.msg.OK + ' Correct. ' + res.card.why,
    missed: res => {
      const c = res.card;
      const head = res.chosen.verdict === c.answer
        ? 'Right verdict; the fix is ' + CORR_NAME[c.fix] + '.'
        : 'Check the rule for Arr. ' + c.code + ': ' + c.why;
      return FP.msg.BAD + ' ' + head + ' Answer: ' + answerText(c) + '.';
    }
  }
});

let verdict = null;       // chosen verdict id, not checked
let feedback = null;      // {kind, message}
let notice = '';
let verdictButtons = [], fixSelect, checkButton, nextButton, startOverButton;
let L = null;             // layout

const keys = K.keys.bind({ '1': () => chooseVerdict(0), '2': () => chooseVerdict(1), '3': () => chooseVerdict(2),
  Enter: enterKey });
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  verdictButtons = VERDICTS.map((v, i) => {
    const b = K.button((i + 1) + ' ' + v.name, () => chooseVerdict(i));
    b.addClass('choice');
    b.addClass('mprc-verdict');
    b.attribute('aria-pressed', 'false');
    b.attribute('aria-label', v.name + ' (key ' + (i + 1) + ')');
    return b;
  });
  fixSelect = createSelect();
  fixSelect.parent(document.querySelector('main'));
  fixSelect.option('Choose the correction…', '');
  CORRECTIONS.forEach(c => fixSelect.option(c.name, c.id));
  fixSelect.attribute('aria-label', 'Correction for a Not allowed line');
  fixSelect.changed(() => { notice = ''; FP.announce('Correction: ' + (CORR_NAME[fixSelect.value()] || 'none chosen') + '.'); });
  checkButton = K.button(FP.msg.CHECK, checkLine);
  nextButton = K.button('Next line', nextLine);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });
  updateControls();
  describe('Motor position rule checker. Ten order lines for Arrangements 9, 9F, 9SS, 9ST, 10, plenum 3SM ' +
    'and 3HA, and a horizontal inline fan are shown one at a time. For each, choose Standard, Allowed with ' +
    'condition or Not allowed and, for Not allowed, choose the correction, then press Check. A sketch of the ' +
    'fan in its reference view then shows the motor in the correct position, with the FanPedia rule.');
}

// ---------- Flow ----------
function chooseVerdict(i) {
  if (deck.state().phase !== 'choose') return;
  verdict = VERDICTS[i].id;
  notice = '';
  if (verdict !== 'not-allowed') fixSelect.selected('');
  updateControls();
  if (verdict === 'not-allowed') fixSelect.elt.focus();   // arrows pick the fix, Enter checks
  FP.announce(VERDICTS[i].name + ' selected.' + (verdict === 'not-allowed'
    ? ' Choose the correction from the list, then press Check.' : ' Press Check.'));
}

function checkLine() {
  if (deck.state().phase !== 'choose') return;
  if (!verdict) return setNotice('Choose a verdict first (keys 1-3).');
  const fix = verdict === 'not-allowed' ? fixSelect.value() : null;
  if (verdict === 'not-allowed' && !fix) return setNotice('Choose the correction for a Not allowed line.');
  const res = deck.place({ verdict, fix });
  feedback = { kind: res.kind, message: res.message };
  FP.announce(res.message);
  updateControls();
}

function nextLine() {
  if (deck.state().phase !== 'feedback') return;
  deck.next();
  verdict = null; feedback = null; notice = '';
  fixSelect.selected('');
  updateControls();
  const s = deck.state();
  if (s.phase === 'summary') FP.announce(deck.summary().lines.join(' '));
  else FP.announce('Order line ' + (s.index + 1) + ' of 10: ' + s.card.text + '. ' + PROMPT);
}

function startOver() {
  deck.newRound();
  verdict = null; feedback = null; notice = '';
  fixSelect.selected('');
  updateControls();
  FP.announce('Started over. Order line 1 of 10: ' + deck.state().card.text + '. ' + PROMPT);
}

function setNotice(t) { notice = t; FP.announce(t); }

function enterKey() {
  const ph = deck.state().phase;
  if (ph === 'choose') checkLine();
  else if (ph === 'feedback') nextLine();
}

function scoreLine() { return 'Correct: ' + deck.score.correct() + ' of ' + ITEMS.length; }

// ---------- Layout ----------
function computeLayout() {
  const wide = canvasWidth >= 700;
  const top = wide ? 70 : 88;
  const bottom = drawHeight - 24;
  if (wide) {
    const lw = Math.round((canvasWidth - 30) * 0.56);
    const left = { x: 10, w: lw };
    const order = { x: 10, y: top, w: lw, h: 92 };
    const vY = order.y + order.h + 8;
    const fixY = vY + 40;
    const fb = { x: 10, y: fixY + 40, w: lw, h: bottom - (fixY + 40) };
    const sketch = { x: 20 + lw, y: top, w: canvasWidth - 30 - lw, h: bottom - top };
    return { wide, top, bottom, left, order, vY, vRows: 1, fixY, fb, sketch };
  }
  const order = { x: 10, y: top, w: canvasWidth - 20, h: 74 };
  const sketch = { x: 10, y: order.y + order.h + 6, w: canvasWidth - 20, h: 180 };
  const vY = sketch.y + sketch.h + 8;
  const vRows = canvasWidth >= 380 ? 1 : 2;
  const fixY = vY + vRows * 36 + 2;
  const fb = { x: 10, y: fixY + 38, w: canvasWidth - 20, h: bottom - (fixY + 38) };
  return { wide, top, bottom, order, vY, vRows, fixY, fb, sketch };
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  if (!L) L = computeLayout();
  const st = deck.state();
  const y = K.title('Motor Position Rule Checker');
  const right = st.phase === 'summary' ? 'All 10 lines checked' : 'Order line ' + (st.index + 1) + ' of 10';
  K.statusLine(scoreLine(), right, null, { y: y - 4 });
  K.note(canvasWidth >= 560 ? ['Source: FanPedia pp. 52, 53, 55, 56', 'Item 3 clearance is illustrative', 'Keys: 1-3 verdict, Enter checks or goes on']
    : ['FanPedia pp. 52-56', 'Keys 1-3, Enter'], { y: drawHeight - 6 });
  if (st.phase === 'summary') { drawSummary(10, L.top, canvasWidth - 20, L.bottom - L.top); return; }
  drawOrder(L.order, st);
  drawSketch(L.sketch, st.card, st.phase === 'feedback');
  noStroke();
  fill(FP.tok(verdict === 'not-allowed' && st.phase === 'choose' ? 'text' : 'text-muted'));
  textSize(14);
  textAlign(LEFT, CENTER);
  text('Fix:', L.order.x + 2, L.fixY + 14);
  drawFeedback(L.fb, st);
}

function paras(list, x, y, w, ts, dry) {
  for (const p of list) {
    const s = p.big ? ts + 1 : (p.small ? Math.max(12, ts - 2) : ts);
    textSize(s);
    textStyle(p.bold ? BOLD : NORMAL);
    noStroke();
    fill(p.color || FP.tok(p.muted ? 'text-muted' : 'text'));
    y += p.gap || 0;
    y = K.wrapText(p.t, x, y, w, Math.round(s * 1.3), { dryRun: dry, maxLines: p.maxLines });
  }
  textStyle(NORMAL);
  return y;
}

function drawOrder(b, st) {
  K.panel(b.x, b.y, b.w, b.h);
  const list = [
    { t: 'Order line ' + (st.index + 1) + ' of 10', muted: true, small: true },
    { t: st.card.text, bold: true, big: true, gap: 2 },
    { t: PROMPT, gap: 3 }
  ];
  const ts = K.fitTextSize(t => paras(list, b.x + 10, b.y + 6, b.w - 20, t, true) - (b.y + 6), b.h - 10, 16, 12);
  paras(list, b.x + 10, b.y + 6, b.w - 20, ts, false);
}

function drawFeedback(b, st) {
  const list = [];
  if (st.phase === 'choose') {
    if (verdict) {
      list.push({ t: 'Your verdict: ' + VERDICT_NAME[verdict] + (verdict === 'not-allowed'
        ? (fixSelect.value() ? '; ' + CORR_NAME[fixSelect.value()] : '; now choose the fix') : '') + '. Press Check (Enter).',
        color: FP.tok('primary-dark') });
    } else {
      list.push({ t: 'Choose a verdict (keys 1-3). For Not allowed, also choose the fix.', muted: true });
    }
    if (notice) list.push({ t: 'ℹ ' + notice, color: FP.tok('primary-dark'), gap: 4 });
    const ts = K.fitTextSize(t => paras(list, b.x + 2, b.y, b.w - 4, t, true) - b.y, b.h, 15, 12);
    paras(list, b.x + 2, b.y, b.w - 4, ts, false);
    return;
  }
  if (!feedback) return;
  const ok = feedback.kind === 'ok';
  const fb = [{ t: feedback.message, color: FP.tok(ok ? 'correct' : 'incorrect') }];
  const pad = 7;
  const ts = K.fitTextSize(t => paras(fb, b.x + pad, b.y + pad, b.w - 2 * pad, t, true) + pad - b.y, b.h, 16, 12);
  const h = paras(fb, b.x + pad, b.y + pad, b.w - 2 * pad, ts, true) + pad - b.y;
  K.panel(b.x, b.y, b.w, Math.min(h, b.h), { fill: ok ? '--fp-correct-bg' : '--fp-incorrect-bg',
    stroke: ok ? '--fp-correct' : '--fp-incorrect', dashed: !ok, weight: 2, radius: 6 });
  paras(fb, b.x + pad, b.y + pad, b.w - 2 * pad, ts, false);
}

// ---------- Sketch: the fan in its reference view ----------
function drawSketch(b, item, revealed) {
  K.panel(b.x, b.y, b.w, b.h);
  const small = b.h < 200;
  const cap = item.kind === 'inline' ? 'Discharge view' : 'Drive side view';
  noStroke();
  fill(FP.tok('text-muted'));
  textSize(12);
  textAlign(LEFT, TOP);
  text(cap + (small ? '' : ' (schematic, not to scale)'), b.x + 8, b.y + 6);
  const inner = { x: b.x + 8, y: b.y + 22, w: b.w - 16, h: b.h - 30 - (small ? 30 : 36) };
  if (item.kind === 'pedestal') sketchPedestal(inner, item, revealed);
  else if (item.kind === 'plenum') sketchPlenum(inner, item, revealed);
  else sketchInline(inner, item, revealed);
  if (revealed) {
    const s = item.show;
    let t = item.kind === 'inline' ? 'Floor mount: motor at G, H, A, B or C'
      : s.pos === 'inside' ? 'Motor inside the pedestal: no position to choose'
        : s.pos === 'TC' ? 'Motor at Top Center (TC)' : 'Motor (' + s.pos + ')' + (s.box ? ', ' + s.box + ' conduit box' : '');
    if (s.swing) t = s.swing + ' · ' + t;
    noStroke();
    fill(FP.tok('primary-dark'));
    textStyle(BOLD);
    textSize(small ? 12 : 14);
    const lead = small ? 15 : 17;
    const n = Math.min(2, K.countLines(t, b.w - 16));
    K.wrapText(t, b.x + b.w / 2, b.y + b.h - 6 - n * lead, b.w - 16, lead, { align: CENTER, maxLines: 2 });
    textStyle(NORMAL);
  }
}

function motorBox(x, y, w, h, label, opts) {
  opts = opts || {};
  push();
  stroke(FP.tok(opts.ghost ? 'text-muted' : 'edge'));
  strokeWeight(opts.ghost ? 1 : 1.5);
  if (opts.ghost) drawingContext.setLineDash([4, 4]);
  fill(opts.ghost ? 'rgba(255,255,255,0.6)' : FP.tok('motor'));
  rect(x, y, w, h, 4);
  drawingContext.setLineDash([]);
  noStroke();
  fill(opts.ghost ? FP.tok('text-muted') : 255);
  textSize(12);
  textStyle(opts.ghost ? NORMAL : BOLD);
  textAlign(CENTER, CENTER);
  text(label, x + w / 2, y + h / 2);
  pop();
}

function floorLine(x0, x1, y) {
  stroke(FP.tok('text-muted'));
  strokeWeight(1);
  line(x0, y, x1, y);
}

// Pedestal arrangements (9, 9F, 9SS, 9ST, 10): housing seen from the drive side, bearing
// pedestal in front of it, motor on the left (L) or right (R) side of the pedestal.
function sketchPedestal(b, item, revealed) {
  const size = Math.min(b.w * 0.5, b.h * 0.8, 200);
  const cx = b.x + b.w / 2, floorY = Math.min(b.y + b.h - 4, b.y + b.h / 2 + size * 0.7);
  const cy = floorY - size * 0.62;
  FD.scrollHousing(null, { x: cx, y: cy, size, rotation: item.line.rotation || 'CW', angle: 360,
    showRotation: !!item.line.rotation, labels: !!item.line.rotation, showAir: false });
  floorLine(b.x + 4, b.x + b.w - 4, floorY);
  // Bearing pedestal in front of the housing
  const pw = size * 0.34, pTop = cy + size * 0.08;
  push();
  stroke(FP.tok('edge'));
  strokeWeight(1.5);
  fill(FP.tok('metal-side'));
  rect(cx - pw / 2, pTop, pw, floorY - pTop);
  fill(FP.tok('metal'));
  circle(cx, cy, size * 0.12);           // shaft end and bearing
  pop();
  const mw = Math.max(58, size * 0.3), mh = Math.max(26, size * 0.2);
  const my = floorY - mh - size * 0.12;
  const lx = cx - pw / 2 - mw - 6, rx = cx + pw / 2 + 6;
  if (item.show.wall && revealed) {
    push();
    stroke(FP.tok('text'));
    strokeWeight(3);
    line(b.x + 6, b.y + 4, b.x + 6, floorY);
    noStroke();
    fill(FP.tok('text'));
    textSize(12);
    textAlign(LEFT, TOP);
    text('wall', b.x + 10, b.y + 4);
    pop();
  }
  if (!revealed) return;
  const s = item.show;
  if (s.pos === 'inside') {
    motorBox(cx - pw / 2 + 3, my, pw - 6, mh, 'Motor', {});
    return;
  }
  const at = s.pos === 'L' ? lx : rx;
  const other = s.pos === 'L' ? rx : lx;
  motorBox(other, my, mw, mh, s.pos === 'L' ? 'R' : 'L', { ghost: true });
  motorBox(at, my, mw, mh, 'Motor ' + s.pos, {});
  // belt from motor sheave to fan sheave
  push();
  stroke(FP.tok('belt'));
  strokeWeight(3);
  line(at + mw / 2, my + mh / 2, cx, cy);
  pop();
  if (s.box) {
    // conduit box on the motor's outer side
    const bx = s.pos === 'L' ? at - 18 : at + mw + 2;
    push();
    stroke(FP.tok('edge'));
    fill(FP.tok('metal'));
    rect(bx, my + 3, 16, 14, 2);
    noStroke();
    fill(FP.tok('text'));
    textSize(12);
    textAlign(CENTER, TOP);
    text(s.box, bx + 8, my + 19);
    pop();
  }
}

// Plenum 3SM / 3HA: fan frame and inlet seen from the drive side.
function sketchPlenum(b, item, revealed) {
  const s = Math.min(b.w * 0.42, b.h * 0.62, 150);
  const cx = b.x + b.w / 2, floorY = Math.min(b.y + b.h - 4, b.y + b.h / 2 + s * 0.65);
  const top = floorY - s;
  floorLine(b.x + 4, b.x + b.w - 4, floorY);
  push();
  stroke(FP.tok('edge'));
  strokeWeight(1.5);
  noFill();
  rect(cx - s / 2, top, s, s);                         // fan frame
  fill(FP.tok('metal'));
  circle(cx, top + s / 2, s * 0.7);                    // impeller
  fill(FP.tok('metal-side'));
  circle(cx, top + s / 2, s * 0.18);                   // hub
  pop();
  if (!revealed) return;
  const mw = Math.max(58, s * 0.36), mh = Math.max(24, s * 0.24);
  if (item.show.pos === 'TC') {
    const tcY = top - mh - 4;
    motorBox(cx - mw / 2, tcY, mw, mh, 'Motor TC', {});
    return;
  }
  const lx = cx - s / 2 - mw - 6, rx = cx + s / 2 + 6, my = top + s / 2 - mh / 2;
  const at = item.show.pos === 'L' ? lx : rx, other = item.show.pos === 'L' ? rx : lx;
  motorBox(other, my, mw, mh, item.show.pos === 'L' ? 'R' : 'L', { ghost: true });
  motorBox(at, my, mw, mh, 'Motor ' + item.show.pos, {});
}

// Horizontal inline fan, discharge view: positions A to H around the casing (A at the top);
// a floor mount shows only G, H, A, B and C.
function sketchInline(b, item, revealed) {
  const r = Math.min(b.w * 0.24, b.h * 0.3, 80);
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2 - 4;
  const floorY = Math.min(b.y + b.h - 4, cy + r * 2.2);
  floorLine(b.x + 4, b.x + b.w - 4, floorY);
  push();
  stroke(FP.tok('edge'));
  strokeWeight(2);
  line(cx - r * 0.7, cy + r * 0.7, cx - r * 0.9, floorY);   // floor supports
  line(cx + r * 0.7, cy + r * 0.7, cx + r * 0.9, floorY);
  strokeWeight(1.5);
  fill(FP.tok('metal'));
  circle(cx, cy, 2 * r);
  fill(FP.tok('metal-side'));
  circle(cx, cy, r * 0.5);
  pop();
  const allowed = FP.codes.AXIAL_FLOOR_MOUNT;
  const lr = r + (b.h < 200 ? 14 : 20);
  FP.codes.AXIAL_MOTOR_POSITIONS.forEach(p => {
    const a = p.angle * Math.PI / 180;
    const x = cx + lr * Math.sin(a), y = cy - lr * Math.cos(a);
    const ok = allowed.includes(p.code);
    push();
    textSize(13);
    textAlign(CENTER, CENTER);
    if (revealed) {
      stroke(FP.tok(ok ? 'primary' : 'text-muted'));
      strokeWeight(ok ? 2 : 1);
      if (!ok) drawingContext.setLineDash([3, 3]);
      fill(ok ? FP.tok('primary-bg') : 'rgba(255,255,255,0.7)');
      circle(x, y, 22);
      drawingContext.setLineDash([]);
      noStroke();
      fill(FP.tok(ok ? 'primary-dark' : 'text-muted'));
      textStyle(ok ? BOLD : NORMAL);
      text(ok ? p.code : p.code + '✗', x, y);
    } else {
      noStroke();
      fill(FP.tok('text-muted'));
      text('·', x, y);
    }
    pop();
  });
}

function drawSummary(x, y, w, h) {
  K.panel(x, y, w, h);
  const s = deck.summary();
  const list = [
    { t: s.lines[0], bold: true, big: true },
    { t: (s.mastered ? FP.msg.OK + ' ' : '') + s.lines[1], color: FP.tok(s.mastered ? 'correct' : 'text'), gap: 2 }
  ];
  const misses = s.misses;
  if (!misses.length) list.push({ t: 'No lines missed.', gap: 8 });
  else list.push({ t: 'Missed (' + misses.length + '):', bold: true, gap: 8 });
  misses.forEach(m => list.push({ t: '• ' + m.card.text + ' → ' + answerText(m.card) + '. ' + m.card.why, gap: 3 }));
  const ts = K.fitTextSize(t => paras(list, x + 10, y + 8, w - 20, t, true) - (y + 8), h - 16, 15, 12);
  paras(list, x + 10, y + 8, w - 20, ts, false);
}

// ---------- Controls ----------
function positionControls() {
  L = computeLayout();
  const narrow = !L.wide;
  const x0 = L.order.x, maxX = L.wide ? L.order.x + L.left.w : canvasWidth - 10;
  // verdict buttons: one row (wide) or wrapping onto two (narrow), inside the drawing region
  let x = x0, y = L.vY;
  verdictButtons.forEach(b => {
    const w = b.elt.offsetWidth || 120;
    if (x > x0 && x + w > maxX) { x = x0; y += 36; }
    b.position(x, y);
    x += w + 8;
  });
  const fx = x0 + 34;
  fixSelect.position(fx, L.fixY);
  fixSelect.style('width', Math.min(320, maxX - fx) + 'px');
  K.flowButtons(0, [checkButton, nextButton, null, startOverButton]);
  if (narrow) { /* labels stay full; the buttons wrap */ }
}

function updateControls() {
  const had = document.activeElement;
  const st = deck.state();
  const done = st.phase === 'summary';
  const choosing = st.phase === 'choose';
  const placed = st.phase === 'feedback' ? deck.placements[deck.placements.length - 1] : null;
  verdictButtons.forEach((b, i) => {
    const v = VERDICTS[i];
    const nm = canvasWidth < 760 && v.id === 'condition' ? 'With condition' : v.name;
    let label = (i + 1) + ' ' + nm;
    if (placed) {
      if (v.id === placed.card.answer) label = (placed.correct ? FP.msg.OK : '→') + ' ' + nm;
      else if (v.id === placed.chosen.verdict) label = FP.msg.BAD + ' ' + nm;
    }
    b.html(label);
    b.attribute('aria-pressed', choosing && verdict === v.id ? 'true' : 'false');
    K.setEnabled(b, choosing);
    if (done) b.hide(); else b.show();
  });
  K.setEnabled(fixSelect, choosing && verdict === 'not-allowed');
  if (done) fixSelect.hide(); else fixSelect.show();
  if (done) { checkButton.hide(); nextButton.hide(); } else { checkButton.show(); nextButton.show(); }
  K.setEnabled(checkButton, choosing);
  K.setEnabled(nextButton, st.phase === 'feedback');
  nextButton.html(st.isLast ? 'Finish' : 'Next line');
  nextButton.attribute('aria-label', st.isLast ? 'Finish and see the summary' : 'Next line');
  positionControls();
  K.keepFocus(had, [checkButton, nextButton, ...verdictButtons, startOverButton]);
  if (st.phase === 'feedback') nextButton.elt.focus();
  if (choosing && (had === nextButton.elt || had === startOverButton.elt || had === document.body)) checkButton.elt.focus();
  if (done && (had === nextButton.elt || had === document.body)) startOverButton.elt.focus();
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  updateControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
