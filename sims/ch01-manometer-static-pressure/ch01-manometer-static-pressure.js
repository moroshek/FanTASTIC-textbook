// Reading Static Pressure with a Manometer
// CANVAS_HEIGHT: 660
// Chapter 1 (Air, Pressure and the Fan): read a U-tube manometer at six points of a
// supply system (louver, filter, coil, fan, ductwork, diffuser, room) as a signed static
// pressure, then infer the fan's static pressure rise. Seven items, fixed order, one
// scored attempt each, plus one unscored retry after a miss. Mastery: 6 of 7 first try.
// Values: the chapter's worked example "Adding Up a System's Resistance" (illustrative).
// Built on the FanPedia kit (../shared-libs): FP.ChallengeRunner, FP.p5, FD.ductRun.

const K = FP.p5;
const SIM_ID = 'ch01-manometer-static-pressure';

// Canvas dimensions
let canvasWidth = 800;
const drawHeight = 510;
const controlHeight = K.controlHeightFor(4);   // 150: sign | reading + buttons | wrap row | hints
const canvasHeight = drawHeight + controlHeight;
const margin = 10;
const TOL = { abs: 0.05 };                      // spec: |entered - correct| <= 0.05 in. wg
const MINUS = '−';

// The system, left to right, with the chapter's pressure drops (in. wg at design airflow).
const COMPONENTS = [
  { type: 'louver', name: 'Intake louver', short: 'Louver', drop: 0.15 },
  { type: 'filter', name: 'Filter', short: 'Filter', drop: 0.50 },
  { type: 'coil', name: 'Coil', short: 'Coil', drop: 0.75 },
  { type: 'fan', name: 'Fan', short: 'Fan' },
  { type: 'duct', name: 'Ductwork', short: 'Duct', drop: 0.95 },
  { type: 'diffuser', name: 'Diffuser', short: 'Diffuser', drop: 0.15 },
  { type: 'room', name: 'Room', short: 'Room' }
];

// Readings follow from the drops: suction builds through the inlet-side parts; the fan
// outlet must cover every discharge-side drop; the room is the reference.
const r2 = x => Math.round(x * 100) / 100;
const P1 = r2(-COMPONENTS[0].drop);
const P2 = r2(P1 - COMPONENTS[1].drop);
const P3 = r2(P2 - COMPONENTS[2].drop);
const P5 = r2(COMPONENTS[5].drop);
const P4 = r2(P5 + COMPONENTS[4].drop);
const RISE = r2(P4 - P3);

// Items in the spec's fixed order. `at` is the run boundary the probe sits on
// (after component `at`), or 'room' for the room point.
const ITEMS = [
  { id: 'p1', name: 'After the intake louver', at: 0, model: P1, column: 'up',
    prompt: 'The air has just passed the intake louver. Is the duct above or below room pressure, and by how much?',
    why: 'The louver used 0.15 in. wg, so the duct is below room pressure and the room pushes the water toward the duct leg.' },
  { id: 'p2', name: 'After the filter', at: 1, model: P2, column: 'up',
    prompt: 'The air has now passed the filter as well. Is the duct above or below room pressure, and by how much?',
    why: 'Suction grows as each inlet component adds its drop: 0.15 + 0.50.' },
  { id: 'p3', name: 'Fan inlet, after the coil', at: 2, model: P3, column: 'up',
    prompt: 'The probe is at the fan inlet, just after the coil. Is the duct above or below room pressure, and by how much?',
    why: 'All three inlet-side drops add up: 0.15 + 0.50 + 0.75 = 1.40.' },
  { id: 'p4', name: 'Fan outlet', at: 3, model: P4, column: 'down',
    prompt: 'The probe is at the fan outlet. Is the duct above or below room pressure, and by how much?',
    why: 'The fan must push hard enough to overcome everything downstream: 0.95 + 0.15.' },
  { id: 'p5', name: 'Before the diffuser', at: 4, model: P5, column: 'down',
    prompt: 'The air has passed the ductwork and is about to enter the diffuser. Is the duct above or below room pressure, and by how much?',
    why: 'The ductwork has used 0.95 of the 1.10, leaving 0.15 for the diffuser.' },
  { id: 'p6', name: 'In the room', at: 'room', model: 0, column: 'level',
    prompt: 'The duct leg is now open to the room the diffuser feeds. What does the manometer read?',
    why: 'The room is the reference; both legs see the same pressure.' },
  { id: 'q7', name: 'Fan static pressure rise', rise: true, model: RISE, label: 'question 7',
    prompt: 'How much static pressure must the fan add?',
    why: 'The fan raises the air from ' + MINUS + '1.40 to +1.10: 1.10 ' + MINUS + ' (' + MINUS +
      '1.40) = 2.50 in. wg. The suction on the inlet side counts.' }
];
ITEMS.forEach(it => { it.tolerance = TOL; it.unit = 'in. wg'; it.decimals = 2; it.answerText = reading(it) + ' in. wg'; });

const MASTERY = 6;
const REVIEW_POINTER = 'Review the section "Static Pressure": readings are negative (suction) on the inlet side, ' +
  'positive on the discharge side, and the fan rise is outlet minus inlet';

// Spec feedback: Correct "Correct: <reading> in. wg." Incorrect: the Why text plus the correct reading.
function correctText(it) { return FP.msg.correct(it.answerText); }
function wrongText(it) {
  return it.rise ? FP.msg.BAD + ' Not quite. ' + it.why
    : FP.msg.BAD + ' Not quite. ' + it.why + ' The correct reading is ' + it.answerText + '.';
}

const runner = new FP.ChallengeRunner({
  items: ITEMS, attempts: 1, tolerance: TOL,
  noun: 'First-attempt', mastery: MASTERY, reviewPointer: REVIEW_POINTER, id: SIM_ID,
  messages: { correct: res => correctText(res.item), missed: res => wrongText(res.item) },
  onUnlockExplore: enterReview
});

// ---------- Display state (scoring lives in the runner) ----------
let feedback = null;     // {kind, text, answer, slip}
let practice = null;     // {kind, text} after the unscored retry
let practiceOpen = false;
let infoMsg = '';
let reviewIndex = 0;
let markerHits = [];     // [{i, x, y, r}] for clicks in review mode

// Controls
let signRadio, answerInput, checkButton, nextButton, startOverButton, reviewSelect;

// "+1.10", "−1.40", "0.00"
function reading(it) {
  if (it.rise) return FP.fmt.num(it.model, 2);
  if (Math.abs(it.model) < 1e-9) return '0.00';
  return (it.model > 0 ? '+' : MINUS) + FP.fmt.num(Math.abs(it.model), 2);
}
function signed(v, rise) {
  if (rise) return FP.fmt.numUpTo(v, 3);
  if (Math.abs(v) < 1e-9) return FP.fmt.numUpTo(0, 3);
  return (v > 0 ? '+' : MINUS) + FP.fmt.numUpTo(Math.abs(v), 3);
}

const keys = K.keys.bind({ Enter: onEnter,
  '1': () => review(0), '2': () => review(1), '3': () => review(2), '4': () => review(3),
  '5': () => review(4), '6': () => review(5), '7': () => review(6) });
function keyPressed() { return keys(); }

// ---------- Setup ----------
function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight, margin });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  const main = document.querySelector('main');

  signRadio = K.radio([['+', '+ above room'], ['-', MINUS + ' below room']],
    { name: 'mano-sign', label: 'Sign of the reading', onChange: () => { infoMsg = ''; } });

  answerInput = createInput('');
  answerInput.parent(main);
  answerInput.size(80);
  answerInput.attribute('inputmode', 'decimal');
  answerInput.attribute('autocomplete', 'off');
  answerInput.attribute('aria-label', 'Reading in inches of water gauge');

  checkButton = K.button(FP.msg.CHECK, onCheck);
  nextButton = K.button('Next point', onNext);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  reviewSelect = createSelect();
  reviewSelect.parent(main);
  ITEMS.forEach((it, i) => reviewSelect.option(i < 6 ? 'Point ' + (i + 1) + ': ' + it.name : 'Question 7: fan rise', String(i)));
  reviewSelect.attribute('aria-label', 'Review a point');
  reviewSelect.changed(() => review(Number(reviewSelect.value())));

  updateControls();
  describe('Manometer static pressure sim. A supply system is drawn left to right: intake louver, filter, coil, fan, ' +
    'ductwork, diffuser and room, with each part\'s pressure drop. At six measurement points the learner chooses a sign ' +
    'and types the manometer reading in inches of water gauge, then presses Check; the shutter opens to show the two ' +
    'water levels on a ruler, and the reading is labeled on the system drawing. A seventh question asks for the fan\'s ' +
    'static pressure rise. Verdicts are announced. After question 7 the learner can review any point.');
}

// ---------- Controls ----------
function labelW(str, size, bold) {
  push(); textSize(size); textStyle(bold ? BOLD : NORMAL); const w = textWidth(str); pop(); return w;
}
const INPUT_X = 90;

function updateControls() {
  const st = runner.state();
  const review = st.explore;
  const item = st.item;
  if (review) {
    signRadio.hide(); answerInput.hide(); checkButton.hide(); nextButton.hide();
    reviewSelect.show();
  } else {
    reviewSelect.hide();
    answerInput.show();
    if (item.rise) signRadio.hide(); else signRadio.show();
    const resolved = st.phase === 'resolved';
    if (st.phase === 'question' || practiceOpen) checkButton.show(); else checkButton.hide();
    checkButton.html(resolved ? 'Retry (not scored)' : FP.msg.CHECK);
    if (resolved) nextButton.show(); else nextButton.hide();
    nextButton.html(st.isLast ? 'Show summary' : st.index === 5 ? 'Go to question 7' : 'Next point');
    const open = st.phase === 'question' || practiceOpen;
    if (open) answerInput.removeAttribute('disabled'); else answerInput.attribute('disabled', '');
    signRadio.elt.querySelectorAll('input').forEach(inp => { inp.disabled = !open; });
  }
  positionControls();
}

function positionControls() {
  const st = runner.state();
  if (st.explore) {
    const sx = 80;
    reviewSelect.position(sx, K.controlRow(0));
    const w = reviewSelect.elt.offsetWidth;
    if (sx + w + 12 + startOverButton.elt.offsetWidth <= canvasWidth - margin) {
      startOverButton.position(sx + w + 12, K.controlRow(0));
    } else {
      startOverButton.position(margin, K.controlRow(1));
    }
    return;
  }
  signRadio.position(INPUT_X - 30, K.controlRow(0) + 4);
  answerInput.position(INPUT_X, K.controlRow(1));
  const bx = INPUT_X + answerInput.elt.offsetWidth + 8 + labelW('in. wg', 16) + 12;
  const btns = [checkButton, nextButton].filter(b => b.elt.style.display !== 'none');
  const need = btns.reduce((s, b) => s + b.elt.offsetWidth + 8, 0);
  if (bx + need <= canvasWidth - margin) {
    K.flowButtons(1, btns, { x: bx });
    startOverButton.position(margin, K.controlRow(2));
  } else {
    K.flowButtons(2, btns.concat(['|', startOverButton]));
  }
}
// Whether the action buttons sit on the reading row (wide) or wrapped below it.
function buttonsWrapped() {
  const btns = [checkButton, nextButton].filter(b => b.elt.style.display !== 'none');
  const bx = INPUT_X + answerInput.elt.offsetWidth + 8 + labelW('in. wg', 16) + 12;
  return bx + btns.reduce((s, b) => s + b.elt.offsetWidth + 8, 0) > canvasWidth - margin;
}

// ---------- Answer logic (FP.ChallengeRunner) ----------
// Reads the sign (radio, or a sign typed in the box) and the magnitude.
// Returns {raw, value} or {error}.
function readAnswer(item) {
  let txt = String(answerInput.value()).trim().replace(/−/g, '-');
  let typedSign = null;
  if (/^[+-]/.test(txt)) { typedSign = txt[0]; txt = txt.slice(1).trim(); }
  const mag = FP.fmt.parseNumber(txt);
  if (isNaN(mag)) return { raw: answerInput.value() };          // runner answers "Enter a number"
  if (item.rise) return { raw: String((typedSign === '-' ? -1 : 1) * mag), value: (typedSign === '-' ? -1 : 1) * mag };
  if (typedSign) signRadio.selected(typedSign);
  const sign = typedSign || signRadio.value();
  if (!sign && Math.abs(mag) > 1e-9) {
    return { error: 'Choose a sign first: + (above room pressure) or ' + MINUS + ' (below room pressure). No attempt was used.' };
  }
  const v = (sign === '-' ? -1 : 1) * Math.abs(mag);
  return { raw: String(v), value: v };
}

// A diagnostic note for the common slips (shown below the spec feedback).
function slipNote(item, v) {
  if (item.rise) {
    if (FP.check.numeric(v, P4, TOL)) return '1.10 is the outlet reading alone. The rise also includes the 1.40 of suction on the inlet side.';
    if (FP.check.numeric(Math.abs(v), r2(P4 + P3) * -1, TOL) || FP.check.numeric(Math.abs(v), 0.30, TOL)) {
      return 'You subtracted the sizes. Subtract the signed readings: 1.10 ' + MINUS + ' (' + MINUS + '1.40) adds the two.';
    }
    if (FP.check.numeric(v, -P3, TOL)) return '1.40 is only the inlet suction. The fan must also build +1.10 at its outlet.';
    if (v < 0) return 'A rise is a positive number: the fan raises the pressure from inlet to outlet.';
    return '';
  }
  if (Math.abs(item.model) > 1e-9 && FP.check.numeric(-v, item.model, TOL)) {
    return item.model < 0
      ? 'The size is right but the sign is not: on the inlet side the fan pulls the duct below room pressure, so the reading is negative (suction).'
      : 'The size is right but the sign is not: on the discharge side the fan pushes the duct above room pressure, so the reading is positive.';
  }
  return '';
}

function onEnter() {
  const st = runner.state();
  if (st.explore) return;
  if (st.phase === 'question') onCheck();
  else if (st.phase === 'resolved') {
    if (practiceOpen && document.activeElement === answerInput.elt) onCheck();
    else onNext();
  }
}

function onCheck() {
  const st = runner.state();
  const item = st.item;
  if (st.phase === 'resolved' && practiceOpen) return practiceCheck(item);
  if (st.phase !== 'question') return;
  const a = readAnswer(item);
  if (a.error) { infoMsg = a.error; FP.announce(a.error); return; }
  const res = runner.submit(a.raw);
  if (res.status === 'invalid') {
    infoMsg = FP.msg.ENTER_NUMBER + '. Type the size of the reading, for example 0.40. No attempt was used.';
    FP.announce(infoMsg);
    return;
  }
  if (res.status === 'ignored') return;
  infoMsg = '';
  feedback = { kind: res.kind, text: res.message, answer: res.value, slip: res.status === 'correct' ? '' : slipNote(item, res.value) };
  practice = null;
  practiceOpen = res.status === 'missed';
  answerInput.value('');
  updateControls();
  FP.announce(res.message + ' Your answer: ' + signed(res.value, item.rise) + ' in. wg.' + (feedback.slip ? ' ' + feedback.slip : '') +
    ' ' + runner.state().scoreLabel + '.' + (practiceOpen ? ' You may retry once; it is not scored.' : ''));
  nextButton.elt.focus();
}

// One unscored retry after a missed item (spec); never touches the score.
function practiceCheck(item) {
  const a = readAnswer(item);
  if (a.error) { infoMsg = a.error; FP.announce(a.error); return; }
  if (a.value === undefined) { infoMsg = FP.msg.ENTER_NUMBER + '. No retry was used.'; FP.announce(infoMsg); return; }
  infoMsg = '';
  const ok = FP.check.numeric(a.value, item.model, TOL);
  const text = FP.msg.practice(ok ? correctText(item)
    : FP.msg.BAD + ' Not quite. You entered ' + signed(a.value, item.rise) + ' in. wg; the correct reading is ' + item.answerText + '.');
  practice = { kind: ok ? 'ok' : 'bad', text };
  practiceOpen = false;
  FP.events.emit('answered', { source: SIM_ID, itemId: item.id, index: runner.index, value: a.value, correct: ok,
    attempt: 2, final: true, scored: false });
  answerInput.value('');
  updateControls();
  FP.announce(text);
  nextButton.elt.focus();
}

function onNext() {
  if (runner.state().phase !== 'resolved') return;
  feedback = null; practice = null; practiceOpen = false; infoMsg = '';
  runner.next();                       // after question 7 this calls enterReview()
  const st = runner.state();
  if (st.explore) return;
  clearSign();
  answerInput.value('');
  updateControls();
  answerInput.elt.focus();
  FP.announce((st.item.rise ? 'Question 7 of 7. ' : 'Point ' + (st.index + 1) + ' of 6. ') + st.item.prompt);
}

function enterReview(summary) {
  reviewIndex = ITEMS.length - 1;
  reviewSelect.selected(String(reviewIndex));
  updateControls();
  reviewSelect.elt.focus();
  FP.announce('Review mode, not scored. First-attempt correct: ' + summary.firstAttempt + ' of ' + summary.total + '. ' + summary.lines[1]);
}

function review(i) {
  if (!runner.state().explore || i < 0 || i >= ITEMS.length) return;
  reviewIndex = i;
  reviewSelect.selected(String(i));
  const it = ITEMS[i];
  FP.announce((i < 6 ? 'Point ' + (i + 1) + ', ' + it.name : 'Question 7, fan rise') + ': ' + it.answerText + '. ' + it.why);
}

function clearSign() { signRadio.elt.querySelectorAll('input').forEach(inp => { inp.checked = false; }); }

function startOver() {
  runner.restart();
  feedback = null; practice = null; practiceOpen = false; infoMsg = '';
  clearSign();
  answerInput.value('');
  updateControls();
  answerInput.elt.focus();
  FP.announce('Started over. Point 1 of 6. ' + ITEMS[0].prompt);
}

function mousePressed() {
  if (!runner.state().explore) return;
  for (const h of markerHits) {
    if (dist(mouseX, mouseY, h.x, h.y) <= h.r + 4) { review(h.i); return; }
  }
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  const st = runner.state();
  const top = K.title(canvasWidth < 380 ? 'Static Pressure Manometer' : 'Reading Static Pressure with a Manometer');
  const right = st.explore ? 'Review mode (not scored)'
    : (st.item.rise ? 'Question 7 of 7' : 'Point ' + (st.index + 1) + ' of 6');
  let y = K.statusLine(st.scoreLabel, right, null, { y: top });
  y = drawSystem(y + 4, st);
  drawLower(y + 8, st);
  textSize(13);
  const note = FP.msg.note('Illustrative values from the chapter worked example', st.explore ? 'Keys 1-7 or click a point to review' : 'Enter: Check, then Next');
  K.note(textWidth(note) <= canvasWidth - 2 * margin ? note : 'Illustrative values');
  drawControlLabels(st);
}

function revealed(i) { return runner.state().results[i] != null; }
function shownIndex(st) { return st.explore ? reviewIndex : st.index; }

// The supply system with its pressure drops, the six probe points and the readings found so far.
function drawSystem(top, st) {
  const narrow = canvasWidth < 560;
  const x0 = margin + 4, w = canvasWidth - 2 * margin - 8;
  const ductY = top + 46, ductH = 30;
  const segW = w / COMPONENTS.length;
  const ts = canvasWidth < 380 ? 12 : 13;
  FD.ductRun(null, { x: x0, y: ductY, w, h: ductH, label: false,
    components: COMPONENTS.map(c => ({ type: c.type })) });
  // Part names and pressure drops below the run
  noStroke();
  textAlign(CENTER, TOP);
  COMPONENTS.forEach((c, i) => {
    const cx = x0 + (i + 0.5) * segW;
    const below = ductY + ductH + (c.type === 'diffuser' ? ductH * 0.4 : c.type === 'room' ? ductH * 0.6 : 0) + 6;
    textSize(ts); textStyle(NORMAL); fill(FP.tok('text'));
    text(narrow ? c.short : c.name, cx, below);
    if (c.drop) {
      textStyle(BOLD); fill(FP.tok('primary-dark'));
      text((narrow ? '' : 'drop ') + FP.fmt.num(c.drop, 2), cx, below + ts + 4);
    }
  });
  textStyle(NORMAL);
  // Probe points
  markerHits = [];
  const shown = shownIndex(st);
  for (let i = 0; i < 6; i++) {
    const it = ITEMS[i];
    const px = it.at === 'room' ? x0 + 6.5 * segW : x0 + (it.at + 1) * segW;
    const py = ductY - 14;
    const cur = i === shown && !(st.item.rise && !st.explore);
    stroke(FP.tok('edge')); strokeWeight(1.5);
    line(px, py + 9, px, ductY + (it.at === 'room' ? ductH / 2 : 0));
    if (cur) {
      noFill(); stroke(FP.tok('accent')); strokeWeight(3);
      circle(px, py, 26);
    }
    strokeWeight(1.5); stroke(FP.tok('primary'));
    fill(revealed(i) ? FP.tok('primary') : FP.tok('ctrl-bg'));
    circle(px, py, 19);
    noStroke();
    fill(revealed(i) ? 255 : FP.tok('primary'));
    textAlign(CENTER, CENTER); textSize(12); textStyle(BOLD);
    text(String(i + 1), px, py + 1);
    if (revealed(i)) {
      fill(FP.tok('text')); textSize(ts); textAlign(CENTER, BOTTOM);
      text(reading(it), px, py - 12);
    }
    textStyle(NORMAL);
    markerHits.push({ i, x: px, y: py, r: 10 });
  }
  // Inlet side / discharge side captions
  textSize(12); textAlign(LEFT, TOP); fill(FP.tok('text-muted')); noStroke();
  return ductY + ductH + 6 + 2 * (ts + 4) + 4;
}

function drawLower(top, st) {
  const bottom = drawHeight - 26;
  const lw = constrain(canvasWidth * 0.3, canvasWidth < 380 ? 112 : 128, 230);
  const i = shownIndex(st);
  const it = ITEMS[i];
  const show = st.explore || revealed(i);
  if (it.rise) drawRiseLadder(margin, top, lw, bottom - top, show);
  else drawManometer(margin, top, lw, bottom - top, i, show);
  const rx = margin + lw + 10, rw = canvasWidth - rx - margin;
  if (st.explore) drawReviewText(rx, top, rw, bottom - top, it);
  else drawQuestionText(rx, top, rw, bottom - top, st);
}

// U-tube manometer: duct leg on the left, open leg on the right, ruler between them.
function drawManometer(bx, by, bw, bh, i, show) {
  const it = ITEMS[i];
  K.panel(bx, by, bw, bh);
  noStroke(); fill(FP.tok('text')); textAlign(LEFT, TOP); textSize(13); textStyle(BOLD);
  const hy = K.wrapText('Point ' + (i + 1) + ': ' + it.name, bx + 8, by + 6, bw - 16, 16, { maxLines: 2 });
  textStyle(NORMAL);
  const narrow = bw < 220;
  const tw = 12;
  const gap = constrain(bw * 0.3, 44, 70);
  const rulerX = bx + 36;
  const lx = rulerX + 12 + tw / 2, rx = lx + gap, cx = (lx + rx) / 2;
  const mx = bx + bw / 2;
  const tTop = hy + 30;
  const tBot = by + bh - 50;
  const yb = tBot - gap / 2;                      // centre of the U bend
  const mid = tTop + (yb - tTop) * 0.5;           // rest level (zero)
  const ppi = Math.min((mid - tTop - 6) / 0.8, (yb - mid - 4) / 0.8);
  const r = it.model;
  const levelL = mid + (r / 2) * ppi;             // positive pushes the duct leg down
  const levelR = mid - (r / 2) * ppi;

  // leg captions
  fill(FP.tok('text-muted')); textSize(12); textAlign(CENTER, BOTTOM);
  text(narrow ? 'Duct' : 'To duct', lx, tTop - 12);
  text(narrow ? 'Open' : 'Open to room', rx, tTop - 12);
  // hose from the duct leg toward the duct (drawn up and left)
  stroke(FP.tok('edge')); strokeWeight(2); noFill();
  line(lx, tTop, lx, tTop - 8);
  // glass tube
  strokeCap(ROUND);
  stroke(FP.tok('edge')); strokeWeight(tw + 4);
  uPath(lx, rx, cx, tTop, yb, gap);
  stroke(255); strokeWeight(tw);
  uPath(lx, rx, cx, tTop, yb, gap);
  // ruler beside the duct leg: inches above and below the rest level
  stroke(FP.tok('text-muted')); strokeWeight(1);
  line(rulerX, mid - 0.8 * ppi, rulerX, mid + 0.8 * ppi);
  noStroke(); fill(FP.tok('text-muted')); textSize(12); textAlign(RIGHT, CENTER);
  for (let k = -8; k <= 8; k++) {
    const yy = mid - (k / 10) * ppi;
    stroke(FP.tok('text-muted'));
    line(rulerX - (k % 5 === 0 ? 6 : 3), yy, rulerX + (k % 5 === 0 ? 6 : 3), yy);
    noStroke();
    if (k % 5 === 0) text(FP.fmt.num(Math.abs(k / 10), 1), rulerX - 8, yy);
  }
  textAlign(CENTER, TOP);
  text('in.', rulerX, mid + 0.8 * ppi + 4);

  if (show) {
    // water
    strokeCap(SQUARE);
    const water = color(FP.tok('air')); water.setAlpha(170);
    stroke(water); strokeWeight(tw);
    noFill();
    line(lx, levelL, lx, yb);
    arc(cx, yb, gap, gap, 0, PI);
    line(rx, yb, rx, levelR);
    strokeCap(ROUND);
    // level lines and the difference
    stroke(FP.tok('primary-dark')); strokeWeight(1.5);
    line(lx - tw / 2 - 2, levelL, lx + tw / 2 + 2, levelL);
    line(rx - tw / 2 - 2, levelR, rx + tw, levelR);
    const dx = rx + tw + 6;
    drawingContext.setLineDash([3, 3]);
    line(rulerX, levelL, lx - tw / 2 - 2, levelL);
    line(rulerX, levelR, lx - tw / 2, levelR);
    if (Math.abs(r) > 1e-9) {
      line(lx + tw / 2, levelL, dx, levelL);
      drawingContext.setLineDash([]);
      line(dx, levelL, dx, levelR);
      line(dx - 3, levelL, dx + 3, levelL); line(dx - 3, levelR, dx + 3, levelR);
    }
    drawingContext.setLineDash([]);
    noStroke(); fill(FP.tok('text')); textSize(12); textStyle(BOLD);
    if (Math.abs(r) > 1e-9 && dx + 5 + textWidth('0.00 in.') <= bx + bw - 4) {
      textAlign(LEFT, CENTER);
      text(FP.fmt.num(Math.abs(r), 2) + ' in.', dx + 5, (levelL + levelR) / 2);
    }
    textStyle(NORMAL);
  } else {
    // shutter
    K.panel(lx - tw / 2 - 6, tTop - 4, gap + tw + 12, yb + gap / 2 + tw / 2 + 2 - tTop + 4,
      { fill: '--fp-metal-side', stroke: '--fp-edge', dashed: true, radius: 6 });
    noStroke(); fill(FP.tok('text')); textAlign(CENTER, CENTER); textSize(28); textStyle(BOLD);
    text('?', cx, mid - 8);
    textSize(12); textStyle(NORMAL);
    text('Shutter', cx, mid + 18);
    text('closed', cx, mid + 32);
  }
  // reading under the tube
  noStroke(); textAlign(CENTER, TOP);
  const ry = tBot + tw + 4;
  if (show) {
    fill(FP.tok('text')); textStyle(BOLD); textSize(14);
    if (textWidth('Reading: ' + it.answerText) > bw - 8) textSize(12);
    text('Reading: ' + it.answerText, mx, ry);
    textStyle(NORMAL); textSize(12); fill(FP.tok('text-muted'));
    const col = it.column === 'up' ? 'Duct leg: water pulled up' : it.column === 'down' ? 'Duct leg: water pushed down' : 'Legs level';
    text(textWidth(col) <= bw - 8 ? col : col.replace('Duct leg: water ', 'Duct leg '), mx, ry + 18);
  } else {
    fill(FP.tok('text-muted')); textSize(12);
    text('Water levels hidden', mx, ry);
    text('until you check', mx, ry + 16);
  }
}
function uPath(lx, rx, cx, tTop, yb, gap) {
  noFill();
  line(lx, tTop, lx, yb);
  arc(cx, yb, gap, gap, 0, PI);
  line(rx, yb, rx, tTop);
}

// Question 7: the inlet and outlet readings on one pressure scale, with the rise between them.
function drawRiseLadder(bx, by, bw, bh, show) {
  K.panel(bx, by, bw, bh);
  noStroke(); fill(FP.tok('text')); textAlign(LEFT, TOP); textSize(13); textStyle(BOLD);
  const hy = K.wrapText('Question 7: fan rise', bx + 8, by + 6, bw - 16, 16);
  textStyle(NORMAL);
  const ax = bx + Math.min(46, bw * 0.3);
  const yTop = hy + 16, yBot = by + bh - 44;
  const yOf = v => yTop + (1.5 - v) / 3.0 * (yBot - yTop);
  stroke(FP.tok('text-muted')); strokeWeight(1);
  line(ax, yTop, ax, yBot);
  noStroke(); fill(FP.tok('text-muted')); textSize(12); textAlign(RIGHT, CENTER);
  [1.5, 1.0, 0.5, 0, -0.5, -1.0, -1.5].forEach(v => {
    stroke(FP.tok('text-muted')); line(ax - 4, yOf(v), ax + 4, yOf(v)); noStroke();
    text(v === 0 ? '0' : (v > 0 ? '+' : MINUS) + FP.fmt.num(Math.abs(v), 1), ax - 6, yOf(v));
  });
  // room reference
  stroke(FP.tok('border')); drawingContext.setLineDash([4, 3]);
  line(ax, yOf(0), bx + bw - 8, yOf(0)); drawingContext.setLineDash([]);
  noStroke(); fill(FP.tok('text-muted')); textAlign(RIGHT, BOTTOM); text('room', bx + bw - 8, yOf(0) - 2);
  // inlet and outlet marks
  const mx = ax + 14;
  [[P3, 'inlet'], [P4, 'outlet']].forEach(([v, name]) => {
    stroke(FP.tok('primary')); strokeWeight(2); line(ax, yOf(v), mx + 8, yOf(v));
    noStroke(); fill(FP.tok('text')); textAlign(LEFT, CENTER); textSize(12); textStyle(BOLD);
    const nm = bw < 190 ? name[0].toUpperCase() + name.slice(1) : 'Fan ' + name;
    text(nm + ' ' + (v > 0 ? '+' : MINUS) + FP.fmt.num(Math.abs(v), 2), mx + 12, yOf(v));
    textStyle(NORMAL);
  });
  // the rise
  const rxl = mx + 4;
  stroke(FP.tok('accent')); strokeWeight(2.5);
  line(rxl, yOf(P3) - 2, rxl, yOf(P4) + 8);
  FD.arrowHead(null, rxl, yOf(P4) + 2, -HALF_PI, 8, FP.tok('accent'));
  noStroke(); fill(FP.tok('accent-text')); textAlign(LEFT, CENTER); textSize(13); textStyle(BOLD);
  text(show ? 'Rise ' + FP.fmt.num(RISE, 2) : 'Rise ?', rxl + 8, yOf(-0.75));
  textStyle(NORMAL);
  noStroke(); fill(FP.tok('text-muted')); textSize(12); textAlign(CENTER, TOP);
  text('in. wg', bx + bw / 2, yBot + 12);
}

function fbPanel(x, y, w, h, kind) {
  K.panel(x, y, w, h, {
    fill: kind === 'ok' ? '--fp-correct-bg' : kind === 'bad' ? '--fp-incorrect-bg' : '--fp-info-bg',
    stroke: kind === 'ok' ? '--fp-correct' : kind === 'bad' ? '--fp-incorrect' : '--fp-border',
    dashed: kind === 'bad', weight: kind === 'info' ? 1 : 2, radius: 6 });
}

function drawQuestionText(x, y, w, h, st) {
  const it = st.item;
  const layout = (ts, dry) => {
    const lh = Math.round(ts * 1.3);
    let yy = y + 4;
    noStroke(); textAlign(LEFT, TOP);
    textStyle(BOLD); textSize(ts + 1); fill(FP.tok('text'));
    yy = K.wrapText(it.prompt, x, yy, w, lh + 1, { dryRun: dry }) + 4;
    textStyle(NORMAL); textSize(ts); fill(FP.tok('text-muted'));
    const status = st.phase === 'question'
      ? (it.rise ? 'One scored attempt. Use the readings labeled on the drawing.' : 'One scored attempt. Choose a sign and type the size of the reading.')
      : (st.results[st.index] === 'correct' ? FP.msg.OK + ' Answered correctly' : FP.msg.BAD + ' Counts as missed');
    yy = K.wrapText(status, x, yy, w, lh, { dryRun: dry }) + 8;
    if (infoMsg) {
      const t = 'ℹ ' + infoMsg;
      const hh = K.countLines(t, w - 16) * lh + 10;
      if (!dry) { fbPanel(x, yy - 2, w, hh, 'info'); noStroke(); fill(FP.tok('text')); textSize(ts); }
      yy = K.wrapText(t, x + 8, yy + 3, w - 16, lh, { dryRun: dry }) + 10;
    }
    if (feedback) {
      textSize(ts);
      const ans = 'Your answer: ' + signed(feedback.answer, it.rise) + ' in. wg' + FP.msg.SEP + 'Correct: ' + it.answerText;
      let hh = (K.countLines(feedback.text, w - 16) + K.countLines(ans, w - 16)) * lh + 14;
      if (feedback.slip) hh += K.countLines('▶ ' + feedback.slip, w - 16) * lh + 4;
      if (!dry) { fbPanel(x, yy - 2, w, hh, feedback.kind); }
      noStroke(); textSize(ts); textStyle(BOLD); fill(FP.tok(feedback.kind === 'ok' ? 'correct' : 'incorrect'));
      let fy = K.wrapText(feedback.text, x + 8, yy + 4, w - 16, lh, { dryRun: dry });
      textStyle(NORMAL); fill(FP.tok('text'));
      fy = K.wrapText(ans, x + 8, fy + 2, w - 16, lh, { dryRun: dry });
      if (feedback.slip) {
        fill(FP.tok('accent-text')); textStyle(ITALIC);
        fy = K.wrapText('▶ ' + feedback.slip, x + 8, fy + 4, w - 16, lh, { dryRun: dry });
        textStyle(NORMAL);
      }
      yy = yy + hh + 8;
    }
    if (practice) {
      textSize(ts);
      const hh = K.countLines(practice.text, w - 16) * lh + 10;
      if (!dry) fbPanel(x, yy - 2, w, hh, practice.kind);
      noStroke(); textSize(ts); fill(FP.tok(practice.kind === 'ok' ? 'correct' : 'incorrect'));
      yy = K.wrapText(practice.text, x + 8, yy + 3, w - 16, lh, { dryRun: dry }) + 10;
    } else if (practiceOpen) {
      fill(FP.tok('text-muted')); textSize(ts);
      yy = K.wrapText('Optional: enter the reading again and press Retry (not scored).', x, yy, w, lh, { dryRun: dry });
    }
    return yy - y;
  };
  const ts = K.fitTextSize(s => layout(s, true), h - 4, 15, 12);
  layout(ts, false);
}

function drawReviewText(x, y, w, h, it) {
  const sum = runner.summary();
  const layout = (ts, dry, extra) => {
    const lh = Math.round(ts * 1.3);
    let yy = y + 4;
    noStroke(); textAlign(LEFT, TOP);
    const lines = ['First-attempt correct: ' + sum.firstAttempt + ' of ' + sum.total, sum.lines[1]];
    textStyle(BOLD); textSize(ts + 1);
    let hh = K.countLines(lines[0], w - 16) * lh;
    textSize(ts);
    hh += K.countLines((sum.mastered ? FP.msg.OK + ' ' : '') + lines[1], w - 16) * lh + 14;
    if (!dry) {
      K.panel(x, yy - 2, w, hh, { fill: '--fp-ctrl-bg', stroke: '--fp-primary', weight: 1, radius: 6 });
      noFill(); stroke(FP.tok('primary')); rect(x + 3, yy + 1, w - 6, hh - 6, 4); noStroke();
    }
    textSize(ts + 1); textStyle(BOLD); fill(FP.tok('text'));
    let fy = K.wrapText(lines[0], x + 8, yy + 4, w - 16, lh, { dryRun: dry });
    textSize(ts); fill(FP.tok(sum.mastered ? 'correct' : 'text'));
    K.wrapText((sum.mastered ? FP.msg.OK + ' ' : '') + lines[1], x + 8, fy + 2, w - 16, lh, { dryRun: dry });
    textStyle(NORMAL);
    yy += hh + 6;
    fill(FP.tok('text'));
    const res = runner.state().results.map((r, i) => (i + 1) + ' ' + (r === 'correct' ? FP.msg.OK : FP.msg.BAD)).join(FP.msg.SEP);
    yy = K.wrapText('Results: ' + res, x, yy, w, lh, { dryRun: dry }) + 8;
    textStyle(BOLD); textSize(ts + 1);
    const i = ITEMS.indexOf(it);
    yy = K.wrapText((i < 6 ? 'Point ' + (i + 1) + ': ' + it.name : 'Question 7: fan static pressure rise') + ' = ' + it.answerText,
      x, yy, w, lh + 1, { dryRun: dry }) + 2;
    textStyle(NORMAL); textSize(ts);
    yy = K.wrapText(it.why, x, yy, w, lh, { dryRun: dry }) + 6;
    if (extra) {
      fill(FP.tok('text-muted'));
      yy = K.wrapText('Static pressure is negative on the inlet side and positive on the discharge side. Choose a point to review it; nothing here is scored.',
        x, yy, w, lh, { dryRun: dry });
    }
    return yy - y;
  };
  const extra = layout(12, true, true) <= h - 4;
  const ts = K.fitTextSize(s => layout(s, true, extra), h - 4, 15, 12);
  layout(ts, false, extra);
}

// Vertical centre of a kit-styled control (about 29 px tall) in row n.
function rowMid(n) { return K.controlRow(n) + 15; }

function drawControlLabels(st) {
  noStroke(); fill(FP.tok('text')); textSize(16); textAlign(LEFT, CENTER);
  if (st.explore) {
    textStyle(BOLD); text('Review:', margin, rowMid(0)); textStyle(NORMAL);
    textSize(14); fill(FP.tok('text-muted'));
    text('Keys 1-7 or a click on a point also choose it.', margin, K.controlLabel(2));
    return;
  }
  textStyle(BOLD);
  if (st.item.rise) {
    text('Rise:', margin, rowMid(1));
    textStyle(NORMAL); textSize(14); fill(FP.tok('text-muted'));
    text('No sign needed: a rise is a positive number.', margin, rowMid(0));
  } else {
    text('Sign:', margin, rowMid(0));
    text('Reading:', margin, rowMid(1));
  }
  textStyle(NORMAL); textSize(16); fill(FP.tok('text'));
  text('in. wg', INPUT_X + answerInput.elt.offsetWidth + 8, rowMid(1));
  textSize(14); fill(FP.tok('text-muted'));
  const hintRow = buttonsWrapped() ? 3 : 2;
  const hx = hintRow === 2 ? margin + startOverButton.elt.offsetWidth + 14 : margin;
  const hint = 'Correct within ±0.05 in. wg. Enter checks, then goes on.';
  if (hx + textWidth(hint) <= canvasWidth - margin) text(hint, hx, rowMid(hintRow));
  else text('Correct within ±0.05 in. wg.', hintRow === 2 ? margin : hx, K.controlLabel(3));
}

// ---------- Responsive ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}
function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
