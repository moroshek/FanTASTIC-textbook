// Impeller Balance Calculator - p5.js MicroSim (Chapter 8: Impeller Balancing)
// CANVAS_HEIGHT: 640
// Three challenges: type the permissible residual unbalance U (oz·in) and the correction
// mass m (oz) for an illustrative impeller; both must be within ±2% of the model.
// Then Explore mode: weight, speed, correction radius and balance grade update U, m and F.
// Model (chapter section "Impeller Balancing"; ISO 21940-11 grade converted to US units):
//   U = 6.015 × G × W / N   (G mm/s, W lb, N rpm, U oz·in)
//   m = U / r               (r in, m oz)
//   F = 1.77 × U × (N/1000)²  (lbf)
// Built on the FanPedia kit: FP.ChallengeRunner (challenge flow, score, mastery, wording),
// FP.p5 (layout, text, controls, keys), FD (part palette, rotation arc).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js, fan-drawings.js.

const K = FP.p5;
const SIM_ID = 'ch08-impeller-balance-calculator';

let canvasWidth = 800;
const drawHeight = 455;
const controlHeight = K.controlHeightFor(5);   // answers | Start over + grade | W | N | r
const canvasHeight = drawHeight + controlHeight;

// ---------- Balance model (the kit's FP.models has no balancing functions) ----------
const BALANCE = {
  U_CONST: 6.015,
  F_CONST: 1.77,
  permissibleUnbalance: (G, W, N) => BALANCE.U_CONST * G * W / N,          // oz·in
  correctionMass: (U, r) => U / r,                                          // oz
  force: (U, N) => BALANCE.F_CONST * U * Math.pow(N / 1000, 2),             // lbf
  N_MIN: 300, N_MAX: 3600
};
const GRADES = [16, 6.3, 2.5, 1.0];
const gradeName = g => 'G' + (g === 1 ? '1.0' : String(g));
const f2 = x => FP.fmt.num(x, 2);

// ---------- Challenges (fixed order, two attempts, spec "Feedback when wrong") ----------
const CHALLENGES = [
  { id: 'c1', W: 200, N: 1200, G: 6.3, r: 15,
    wrong: 'U = 6.015 × 6.3 × 200 / 1200 = 6.32 oz·in; m = 6.32 / 15 = 0.42 oz.' },
  { id: 'c2', W: 200, N: 1200, G: 2.5, r: 15,
    wrong: 'A tighter grade lowers the limit: U = 6.015 × 2.5 × 200 / 1200 = 2.51 oz·in; m = 2.51 / 15 = 0.17 oz.' },
  { id: 'c3', W: 600, N: 1800, G: 6.3, r: 20,
    wrong: 'U = 6.015 × 6.3 × 600 / 1800 = 12.63 oz·in; m = 12.63 / 20 = 0.63 oz.' }
].map((c, i) => {
  const U = BALANCE.permissibleUnbalance(c.G, c.W, c.N);
  const m = BALANCE.correctionMass(U, c.r);
  return Object.assign(c, {
    U, m, label: 'challenge ' + (i + 1),
    prompt: 'How much unbalance may this ' + FP.fmt.num(c.W) + ' lb impeller keep at ' + FP.fmt.num(c.N) +
      ' rpm and grade ' + gradeName(c.G) + '?',
    answerText: 'U = ' + f2(U) + ' oz·in, m = ' + f2(m) + ' oz',
    calc: 'U = 6.015 × ' + c.G + ' × ' + c.W + ' / ' + c.N + ' = ' + f2(U) + ' oz·in; m = ' + f2(U) + ' / ' +
      c.r + ' = ' + f2(m) + ' oz.'
  });
});

const TOL = { rel: 0.02 };
function judge(value, item) {
  return { u: FP.check.numeric(value.u, item.U, TOL), m: FP.check.numeric(value.m, item.m, TOL) };
}
function partNote(value, item) {
  const j = judge(value, item);
  if (j.u && !j.m) return 'Your U is within 2%; your m is not. ';
  if (!j.u && j.m) return 'Your m is within 2%; your U is not. ';
  return '';
}

// First wrong attempt: a hint that names the rule or the slip, never the model values.
const near = (v, x) => x > 0 && v > 0 && Math.abs(v - x) / x <= 0.03;
function retryHint(value, item) {
  const j = judge(value, item);
  const tips = [];
  if (!j.u) {
    if (near(value.u, item.G * item.W / item.N)) tips.push('Multiply by the 6.015 unit-conversion factor as well.');
    else if (near(value.u, BALANCE.U_CONST * item.G * item.N / item.W)) tips.push('A heavier impeller is allowed more unbalance: W goes on top and N underneath.');
    else if (near(value.u, BALANCE.U_CONST * item.W / (item.G * item.N))) tips.push('Multiply by the grade G; do not divide by it.');
    else tips.push('Use U = 6.015 × G × W / N, with G in mm/s, W in lb and N in rpm.');
    if (item.id === 'c2') tips.push('A tighter grade (a smaller G) lowers the limit.');
  }
  if (!j.m) {
    if (near(value.m, value.u * item.r)) tips.push('m = U / r: divide by the correction radius, do not multiply.');
    else if (!j.u && near(value.m, value.u / item.r)) tips.push('Your m follows from your U, so fixing U fixes m.');
    else tips.push('The correction mass is m = U / r, with r in inches.');
  }
  return tips.join(' ');
}

const runner = new FP.ChallengeRunner({
  items: CHALLENGES,
  attempts: 2,
  noun: 'Challenges',
  mastery: CHALLENGES.length,
  reviewPointer: 'Review the worked example in "Impeller Balancing", then press Start over',
  check: (value, item) => { const j = judge(value, item); return j.u && j.m; },
  messages: {
    correct: res => FP.msg.OK + ' Correct: ' + res.item.answerText + '.',
    retry: res => FP.msg.BAD + ' Not quite. ' + partNote(res.value, res.item) + retryHint(res.value, res.item) +
      ' Try again (1 attempt left).',
    missed: res => FP.msg.BAD + ' Not quite. The answer is ' + res.item.answerText + '. ' + res.item.wrong +
      ' This one counts as missed.'
  },
  id: SIM_ID
});

// ---------- State ----------
let feedback = null;      // {kind, message}
let answerLine = '';
let notice = '';

let uInput, mInput, checkButton, nextButton, startOverButton, gradeSelect;
let wSlider, nSlider, rSlider;

const keys = K.keys.bind({ Enter: onEnter });
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  const mainEl = document.querySelector('main');

  uInput = createInput('');
  uInput.parent(mainEl);
  uInput.attribute('inputmode', 'decimal');
  uInput.attribute('aria-label', 'Permissible residual unbalance U, ounce-inches');
  mInput = createInput('');
  mInput.parent(mainEl);
  mInput.attribute('inputmode', 'decimal');
  mInput.attribute('aria-label', 'Correction mass m, ounces');
  checkButton = K.button(FP.msg.CHECK, checkAnswer);
  nextButton = K.button('Next challenge', nextChallenge);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  gradeSelect = createSelect();
  for (const g of GRADES) gradeSelect.option(gradeName(g), String(g));
  gradeSelect.parent(mainEl);
  gradeSelect.attribute('aria-label', 'Balance grade G');
  wSlider = createSlider(20, 2000, 200, 10);
  wSlider.parent(mainEl);
  wSlider.attribute('aria-label', 'Impeller weight W, pounds');
  nSlider = createSlider(BALANCE.N_MIN, BALANCE.N_MAX, 1200, 50);
  nSlider.parent(mainEl);
  nSlider.attribute('aria-label', 'Maximum service speed N, rpm');
  rSlider = createSlider(4, 40, 15, 1);
  rSlider.parent(mainEl);
  rSlider.attribute('aria-label', 'Correction radius r, inches');

  setInputs(CHALLENGES[0]);
  syncControls();

  describe('Impeller balance calculator. Three illustrative challenge impellers give a weight, ' +
    'speed, balance grade and correction radius; the learner types the permissible residual ' +
    'unbalance U in ounce-inches and the correction mass m in ounces and presses Check. An end ' +
    'view of the impeller shows the correction mass at its radius, and a bar chart compares the ' +
    'rotating force at half, the selected and double speed. After the challenges, sliders for ' +
    'weight, speed and radius and a grade menu update U, m and the force at once.');
}

// ---------- Controls ----------
function narrow() { return canvasWidth < 480; }
function exploring() { return runner.state().explore; }

function setInputs(c) {
  wSlider.value(c.W); nSlider.value(c.N); rSlider.value(c.r); gradeSelect.selected(String(c.G));
}

function syncControls() {
  const had = document.activeElement;
  const st = runner.state();
  const asking = st.phase === 'question';
  if (st.explore) {
    for (const c of [uInput, mInput, checkButton, nextButton]) c.hide();
  } else {
    uInput.show(); mInput.show();
    K.setEnabled(uInput, asking); K.setEnabled(mInput, asking);
    if (asking) { checkButton.show(); nextButton.hide(); } else { checkButton.hide(); nextButton.show(); }
    const label = st.isLast ? 'Start exploring' : 'Next challenge';
    nextButton.html(narrow() ? (st.isLast ? 'Explore' : 'Next') : label);
    nextButton.attribute('aria-label', label);
  }
  for (const c of [gradeSelect, wSlider, nSlider, rSlider]) K.setEnabled(c, st.explore);
  positionControls();
  K.keepFocus(had, [uInput, mInput, checkButton, nextButton, startOverButton, gradeSelect, wSlider]);
}

function positionControls() {
  const n = narrow();
  const iw = n ? 62 : 90;
  const ux = n ? 30 : 100;
  uInput.size(iw);
  uInput.position(ux, K.controlRow(0));
  const mLabelX = ux + iw + (n ? 10 : 18);
  const mx = mLabelX + (n ? 20 : 66);
  mInput.size(iw);
  mInput.position(mx, K.controlRow(0));
  const bx = mx + iw + 10;
  checkButton.position(bx, K.controlRow(0));
  nextButton.position(bx, K.controlRow(0));
  startOverButton.position(10, K.controlRow(1));
  const gx = 10 + (startOverButton.elt.offsetWidth || 90) + (n ? 62 : 80);
  gradeSelect.position(gx, K.controlRow(1));
  const sl = n ? 150 : 230;
  const sw = K.sliderWidth(canvasWidth, sl, 15);
  [wSlider, nSlider, rSlider].forEach((s, i) => { s.position(sl, K.controlRow(2 + i)); s.size(sw); });
}

function onEnter() {
  const st = runner.state();
  if (st.explore) return;
  if (st.phase === 'question') checkAnswer();
  else if (st.phase === 'resolved') nextChallenge();
}

function checkAnswer() {
  const st = runner.state();
  if (st.explore || st.phase !== 'question') return;
  const u = FP.fmt.parseNumber(uInput.value()), m = FP.fmt.parseNumber(mInput.value());
  if (isNaN(u) || isNaN(m)) {
    notice = FP.msg.ENTER_NUMBER + ' in both boxes (U in oz·in, m in oz).';
    FP.announce(notice);
    return;
  }
  notice = '';
  const res = runner.submit({ u, m });
  if (res.status === 'ignored') return;
  feedback = { kind: res.kind, message: res.message };
  if (res.status === 'correct' || res.status === 'missed') {
    answerLine = 'Your answers: U = ' + FP.fmt.numUpTo(u, 4) + ' oz·in, m = ' + FP.fmt.numUpTo(m, 4) + ' oz';
  }
  syncControls();
  FP.announce(res.message + ' ' + runner.state().scoreLabel + '.');
  if (res.status === 'retry') uInput.elt.focus(); else nextButton.elt.focus();
}

function nextChallenge() {
  if (!runner.next()) return;
  feedback = null; answerLine = ''; notice = '';
  const st = runner.state();
  if (st.explore) {
    setInputs({ W: 200, N: 1200, r: 15, G: 6.3 });
    syncControls();
    FP.announce(runner.summary().lines.join(' ') + ' ' + FP.msg.EXPLORE + ': the sliders and the grade menu are unlocked.');
    wSlider.elt.focus();
  } else {
    uInput.value(''); mInput.value('');
    setInputs(st.item);
    syncControls();
    FP.announce('Challenge ' + (st.index + 1) + ' of ' + CHALLENGES.length + ': ' + st.item.prompt +
      ' Correction radius ' + st.item.r + ' inches.');
    uInput.elt.focus();
  }
}

function startOver() {
  runner.restart();
  feedback = null; answerLine = ''; notice = '';
  uInput.value(''); mInput.value('');
  setInputs(CHALLENGES[0]);
  syncControls();
  FP.announce('Started over. Challenge 1 of ' + CHALLENGES.length + ': ' + CHALLENGES[0].prompt);
  uInput.elt.focus();
}

// ---------- Model values for the drawing ----------
function current() {
  const G = Number(gradeSelect.value()), W = wSlider.value(), N = nSlider.value(), r = rSlider.value();
  const U = BALANCE.permissibleUnbalance(G, W, N);
  return { G, W, N, r, U, m: BALANCE.correctionMass(U, r), F: BALANCE.force(U, N) };
}
function revealed() {
  const st = runner.state();
  return st.explore || st.phase === 'resolved';
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  let y = K.title('Impeller Balance Calculator');
  const st = runner.state();
  const right = st.explore ? FP.msg.EXPLORE + ' (not scored)' : 'Challenge ' + (st.index + 1) + ' of ' + CHALLENGES.length;
  y = K.statusLine(st.scoreLabel, right, null, { y: y - 4 });
  K.note(narrow() ? 'Illustrative values' : FP.msg.note(FP.msg.ILLUSTRATIVE, 'Enter: check or next'));

  const top = y + 2, bottom = drawHeight - 22;
  const v = current();
  let textBox, picBox;
  if (canvasWidth >= 640) {
    const lw = Math.round(canvasWidth * 0.52);
    textBox = { x: 10, y: top, w: lw - 15, h: bottom - top };
    picBox = { x: lw + 5, y: top, w: canvasWidth - lw - 15, h: bottom - top };
  } else {
    const ph = 132;
    textBox = { x: 10, y: top, w: canvasWidth - 20, h: bottom - top - ph - 6 };
    picBox = { x: 10, y: bottom - ph, w: canvasWidth - 20, h: ph };
  }
  K.panel(textBox.x, textBox.y, textBox.w, textBox.h);
  K.panel(picBox.x, picBox.y, picBox.w, picBox.h);
  if (st.explore) drawExplorePanel(textBox, v); else drawChallengePanel(textBox, v);
  drawPicture(picBox, v, revealed());
  drawControlLabels(v);
}

// [{t, bold, muted, color, gap, box: 'ok'|'bad'|'info', opt}] paragraphs; returns the y below.
function paras(list, x, y, w, ts, dry) {
  textAlign(LEFT, TOP);
  noStroke();
  for (const p of list) {
    const s = p.small ? Math.max(12, ts - 2) : p.big ? ts + 1 : ts;
    textSize(s);
    textStyle(p.bold ? BOLD : NORMAL);
    y += p.gap || 0;
    const lh = Math.round(s * 1.3);
    if (p.box) {
      const pad = 7;
      const h = K.wrapText(p.t, x + pad, y + pad, w - 2 * pad, lh, { dryRun: true }) - y + pad - 2;
      if (!dry) {
        const ok = p.box === 'ok', bad = p.box === 'bad';
        K.panel(x - 2, y, w + 4, h, {
          fill: ok ? '--fp-correct-bg' : bad ? '--fp-incorrect-bg' : '--fp-info-bg',
          stroke: ok ? '--fp-correct' : bad ? '--fp-incorrect' : '--fp-border',
          dashed: bad, weight: ok || bad ? 2 : 1, radius: 6
        });
        fill(FP.tok(ok ? 'correct' : bad ? 'incorrect' : 'text'));
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

// Fits paragraphs into the box (16 px down to 12 px), dropping {opt} ones last-first if needed;
// `footer` is drawn bold at the bottom of the box.
function fitParas(list, box, footer) {
  const x = box.x + 10, y = box.y + 8, w = box.w - 20;
  const h = box.h - 14 - (footer ? 24 : 0);
  let items = list.slice();
  const height = (l, t) => paras(l, x, y, w, t, true) - y;
  while (height(items, 12) > h && items.some(p => p.opt)) items.splice(items.map(p => !!p.opt).lastIndexOf(true), 1);
  const ts = K.fitTextSize(t => height(items, t), h, 16, 12);
  paras(items, x, y, w, ts, false);
  if (footer) {
    noStroke(); fill(FP.tok('text')); textStyle(BOLD); textSize(15); textAlign(LEFT, BOTTOM);
    text(footer, x, box.y + box.h - 8);
    textStyle(NORMAL);
  }
}

function givenLine(c) {
  return 'W = ' + FP.fmt.num(c.W) + ' lb · N = ' + FP.fmt.num(c.N) + ' rpm · ' + gradeName(c.G) + ' · r = ' + c.r + ' in';
}

function drawChallengePanel(box) {
  const st = runner.state();
  const c = st.item;
  const list = [
    { t: 'Challenge ' + (st.index + 1) + ' of ' + CHALLENGES.length +
      (st.phase === 'question' ? '  ·  ' + st.attemptLabel : ''), bold: true, small: true, muted: true },
    { t: c.prompt, bold: true, color: FP.tok('primary-dark'), gap: 2 },
    { t: givenLine(c), gap: 4 },
    { t: 'Type U (oz·in) and the correction mass m (oz) at radius r. Both must be within 2%.', muted: true, gap: 4, opt: true }
  ];
  if (notice) list.push({ t: notice, box: 'info', gap: 6 });
  if (feedback) list.push({ t: feedback.message, box: feedback.kind === 'ok' ? 'ok' : 'bad', gap: 6 });
  if (st.phase === 'resolved') {
    list.push({ t: answerLine, gap: 6 });
    list.push({ t: 'Model: ' + c.answerText, bold: true });
    list.push({ t: c.calc, muted: true });
    list.push({ t: 'F = 1.77 × ' + f2(c.U) + ' × (' + FP.fmt.num(c.N) + '/1000)² = ' +
      FP.fmt.num(BALANCE.force(c.U, c.N)) + ' lbf at ' + FP.fmt.num(c.N) + ' rpm.', muted: true, opt: true });
  }
  fitParas(list, box, st.scoreLabel);
}

function drawExplorePanel(box, v) {
  const s = runner.summary();
  const list = [
    { t: FP.msg.EXPLORE + ' (not scored)', bold: true },
    { t: s.lines[0] + '. ' + s.lines[1], small: true, color: s.mastered ? FP.tok('primary-dark') : FP.tok('text') },
    { t: givenLine(v), gap: 6, muted: true },
    { t: 'U = 6.015 × G × W / N = ' + f2(v.U) + ' oz·in', bold: true, gap: 4 },
    { t: 'm = U / r = ' + f2(v.m) + ' oz', bold: true },
    { t: 'F = 1.77 × U × (N/1000)² = ' + FP.fmt.num(v.F) + ' lbf at ' + FP.fmt.num(v.N) + ' rpm', bold: true }
  ];
  const sameU = speedsLine(v);
  if (sameU) list.push({ t: sameU, gap: 4 });
  const dbl = 2 * v.N;
  if (dbl <= BALANCE.N_MAX) {
    list.push({ t: 'Grade limit at ' + FP.fmt.num(dbl) + ' rpm: ' + f2(BALANCE.permissibleUnbalance(v.G, v.W, dbl)) +
      ' oz·in (half of U), so the same impeller must be balanced tighter to run that fast.', muted: true, opt: true });
  }
  list.push({ t: 'Try it: set N to 1,200 and then 2,400 rpm. U halves; for the same impeller, F grows four times.', muted: true, small: true, gap: 4, opt: true });
  fitParas(list, box);
}

// F at half and at double the selected speed, for the same residual unbalance U.
function speedsLine(v) {
  const parts = [];
  if (v.N / 2 >= BALANCE.N_MIN) parts.push(FP.fmt.num(BALANCE.force(v.U, v.N / 2)) + ' lbf at ' + FP.fmt.num(v.N / 2) + ' rpm');
  if (v.N * 2 <= BALANCE.N_MAX) parts.push(FP.fmt.num(BALANCE.force(v.U, v.N * 2)) + ' lbf at ' + FP.fmt.num(v.N * 2) + ' rpm');
  return parts.length ? 'Same impeller, same U: ' + parts.join(' · ') + '.' : '';
}

function drawPicture(box, v, show) {
  const pal = FD.palette();
  const wide = box.w >= 300 && box.h >= 250;
  // End view of the impeller (left/top) and force bars (right/bottom)
  let wheel, bars;
  if (wide) {
    const r0 = Math.min(box.w * 0.3, (box.h - 70) * 0.25);
    wheel = { x: box.x + box.w / 2, y: box.y + 34 + r0, R: r0 };
    bars = { x: box.x + 14, y: wheel.y + r0 + 34, w: box.w - 28, h: box.y + box.h - (wheel.y + r0 + 34) - 10 };
  } else {
    const r0 = Math.min(box.h * 0.36, box.w * 0.18);
    wheel = { x: box.x + 14 + r0, y: box.y + box.h / 2 + 6, R: r0 };
    bars = { x: wheel.x + r0 + 20, y: box.y + 6, w: box.x + box.w - 8 - (wheel.x + r0 + 20), h: box.h - 12 };
  }

  noStroke(); fill(FP.tok('text')); textStyle(BOLD); textAlign(CENTER, TOP);
  textSize(wide ? 15 : 13);
  if (wide) text('End view of the impeller', wheel.x, box.y + 6);
  textStyle(NORMAL);

  // Wheel: back plate, blades, hub; turns at a rate that rises with N (slowed for viewing)
  const ang = (millis() / 1000) * TWO_PI * (0.15 + 0.6 * v.N / BALANCE.N_MAX);
  push();
  translate(wheel.x, wheel.y);
  stroke(pal.edge); strokeWeight(1.5); fill(pal.metal);
  circle(0, 0, wheel.R * 2);
  stroke(pal.metalDark); strokeWeight(2);
  for (let i = 0; i < 10; i++) {
    const a = ang + i * TWO_PI / 10;
    line(cos(a) * wheel.R * 0.32, sin(a) * wheel.R * 0.32, cos(a + 0.35) * wheel.R * 0.95, sin(a + 0.35) * wheel.R * 0.95);
  }
  stroke(pal.hub); strokeWeight(1.5); fill(pal.metalDark);
  circle(0, 0, wheel.R * 0.5);
  fill(pal.shaft); circle(0, 0, wheel.R * 0.16);
  // Correction mass at radius r (scaled: 40 in = the rim)
  const rr = wheel.R * 0.95 * (v.r / 40);
  const mx = cos(ang) * rr, my = sin(ang) * rr;
  if (show) {
    // force direction: outward through the heavy spot
    const fl = wheel.R * 0.55;
    stroke(FP.tok('accent')); strokeWeight(3);
    const ex = cos(ang) * (rr + fl), ey = sin(ang) * (rr + fl);
    line(mx, my, ex, ey);
    FD.arrowHead(null, ex, ey, ang, 10, FP.tok('accent'));
  }
  stroke(FP.tok('text')); strokeWeight(1.5); fill(FP.tok('accent'));
  circle(mx, my, Math.max(8, wheel.R * 0.14));
  pop();
  FD.rotationArc(null, { x: wheel.x, y: wheel.y, r: wheel.R + 8, rotation: 'CW', start: -2.6, sweep: 1.0, weight: 2, head: 8 });

  textSize(12); fill(FP.tok('text-muted')); noStroke(); textAlign(CENTER, TOP);
  if (wide) text('Orange dot: correction mass m at radius r = ' + v.r + ' in', wheel.x, wheel.y + wheel.R + 12);

  // Force bars: same U at half, selected and double speed
  const speeds = [v.N / 2, v.N, v.N * 2];
  const Fs = speeds.map(n => BALANCE.force(v.U, n));
  const inRange = speeds.map(n => n >= BALANCE.N_MIN && n <= BALANCE.N_MAX);
  noStroke(); fill(FP.tok('text')); textAlign(LEFT, TOP); textSize(wide ? 13 : 12); textStyle(BOLD);
  text(wide ? 'Force F from this U at three speeds' : 'Force F, same U', bars.x, bars.y);
  textStyle(NORMAL);
  const top = bars.y + (wide ? 22 : 18), bh = bars.h - (wide ? 22 : 18);
  const rowH = bh / 3;
  const labW = wide ? 82 : 66;
  const maxF = Math.max(...Fs.filter((f, i) => inRange[i]));
  for (let i = 0; i < 3; i++) {
    const yy = top + i * rowH;
    const barH = Math.min(18, rowH - 6);
    fill(FP.tok(i === 1 ? 'text' : 'text-muted')); textAlign(LEFT, CENTER); textSize(12);
    textStyle(i === 1 ? BOLD : NORMAL);
    text(FP.fmt.num(speeds[i]) + ' rpm', bars.x, yy + barH / 2);
    textStyle(NORMAL);
    const x0 = bars.x + labW, wMax = bars.w - labW - (wide ? 70 : 52);
    if (!inRange[i]) {
      fill(FP.tok('text-muted')); text('outside 300–3,600', x0, yy + barH / 2);
      continue;
    }
    if (!show) {
      stroke(FP.tok('border')); strokeWeight(1); noFill();
      drawingContext.setLineDash([4, 3]);
      rect(x0, yy, wMax * 0.3, barH, 3);
      drawingContext.setLineDash([]);
      noStroke(); fill(FP.tok('text-muted')); text('?', x0 + wMax * 0.3 + 6, yy + barH / 2);
      continue;
    }
    const bw = Math.max(2, wMax * Fs[i] / maxF);
    stroke(FP.tok('primary-dark')); strokeWeight(1);
    fill(i === 1 ? FP.tok('primary') : FP.tok('primary-bg'));
    rect(x0, yy, bw, barH, 3);
    noStroke(); fill(FP.tok('text'));
    text(FP.fmt.num(Fs[i]) + ' lbf', x0 + bw + 6, yy + barH / 2);
  }
  if (!show) {
    fill(FP.tok('text-muted')); textSize(12); textAlign(LEFT, TOP);
    if (wide) K.wrapText('Check your answers to see the force.', bars.x, bars.y + bars.h - 16, bars.w, 15, { maxLines: 1 });
  }
}

function drawControlLabels(v) {
  const n = narrow();
  const st = runner.state();
  noStroke(); textAlign(LEFT, CENTER); fill(FP.tok('text'));
  textSize(n ? 14 : 16);
  if (!st.explore) {
    const ux = n ? 30 : 100, iw = n ? 62 : 90;
    text(n ? 'U:' : 'U (oz·in):', 10, K.controlLabel(0));
    text(n ? 'm:' : 'm (oz):', ux + iw + (n ? 10 : 18), K.controlLabel(0));
  }
  const gx = 10 + (startOverButton.elt.offsetWidth || 90) + 12;
  fill(st.explore ? FP.tok('text') : FP.tok('text-muted'));
  text(n ? 'Grade:' : 'Grade G:', gx, K.controlLabel(1));
  textSize(n ? 13 : 15);
  text((n ? 'W: ' : 'Weight W: ') + FP.fmt.num(v.W) + ' lb', 10, K.controlLabel(2));
  text((n ? 'N: ' : 'Speed N: ') + FP.fmt.num(v.N) + ' rpm', 10, K.controlLabel(3));
  text((n ? 'r: ' : 'Radius r: ') + v.r + ' in', 10, K.controlLabel(4));
  if (!st.explore && !n) {
    fill(FP.tok('text-muted')); textSize(13); textAlign(RIGHT, CENTER);
    text('Sliders unlock after challenge 3', canvasWidth - 10, K.controlLabel(1));
  }
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  syncControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
