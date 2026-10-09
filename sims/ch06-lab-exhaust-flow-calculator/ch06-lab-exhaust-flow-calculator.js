// Lab Exhaust Flow Calculator - p5.js MicroSim (Chapter 6: Industrial Fans and Application Product Lines)
// CANVAS_HEIGHT: 640
// Three challenges, fixed order, two attempts each: from given contaminated, bypass and entrained
// flows the learner types the fan flow, the total flow (CFM) and the contaminated share (%). The
// stack diagram fills in every stream once a challenge resolves. Then Explore mode: three sliders.
// Rules (chapter 6): fan flow = contaminated + bypass; total = fan flow + entrained;
// share = contaminated / total x 100 (judged within 1 percentage point; "not defined" at 0 total).
// Built on the FanPedia kit: FP.ChallengeRunner (flow, wording, score, mastery), FP.models.labExhaustMix
// (the model), FD.airflowArrow (stream arrows), FP.p5 (layout, text, controls, keys).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js, fan-models.js, fan-drawings.js.

const K = FP.p5;
const SIM_ID = 'ch06-lab-exhaust-flow-calculator';

let canvasWidth = 800;
const drawHeight = 490;
const controlHeight = K.controlHeightFor(4);   // challenges: answers + buttons; Explore: 3 sliders + Start over
const canvasHeight = drawHeight + controlHeight;

const mix = (c, b, e) => FP.models.labExhaustMix({ contaminatedCfm: c, bypassCfm: b, entrainedCfm: e });
const cfm = x => FP.fmt.num(x, 0) + ' CFM';

// Challenges (illustrative values), fixed order; "wrong" is the spec's feedback when wrong
const CHALLENGE_DATA = [
  { c: 6000, b: 0, e: 9000,
    wrong: 'With no bypass, fan flow equals contaminated flow; entrained air is added after the fan: 6,000 + 9,000 = 15,000 CFM.' },
  { c: 5000, b: 5000, e: 10000,
    wrong: 'Bypass air goes through the fan: 5,000 + 5,000 = 10,000 CFM fan flow, then 10,000 + 10,000 = 20,000 CFM total.' },
  { c: 12000, b: 3000, e: 15000,
    wrong: 'Fan flow is 12,000 + 3,000 = 15,000 CFM; total is 15,000 + 15,000 = 30,000 CFM; share is 12,000 / 30,000 = 40%.' }
];

// Per-field verdicts for an answer {fan, total, share} against challenge item
function fieldMarks(v, item) {
  return {
    fan: v.fan === item.m.fanCfm,
    total: v.total === item.m.totalCfm,
    share: Math.abs(v.share - item.m.sharePct) <= 1 + 1e-9
  };
}

const ITEMS = CHALLENGE_DATA.map((d, i) => {
  const m = mix(d.c, d.b, d.e);
  const answerText = 'fan flow ' + cfm(m.fanCfm) + ', total flow ' + cfm(m.totalCfm) +
    ', contaminated share ' + FP.fmt.num(Math.round(m.sharePct), 0) + '%';
  return Object.assign({}, d, {
    id: 'challenge-' + (i + 1), label: 'challenge ' + (i + 1), m, answerText,
    hint: d.wrong, why: d.wrong,
    check: (v, item) => { const f = fieldMarks(v, item); return f.fan && f.total && f.share; }
  });
});

const runner = new FP.ChallengeRunner({
  items: ITEMS, attempts: 2, noun: 'Challenges', mastery: ITEMS.length,
  reviewPointer: 'Review "Laboratory Exhaust: Dilute, Then Throw It High", then press Start over',
  // Spec wording: "Correct: fan flow <n> CFM, total flow <n> CFM, contaminated share <n>%."
  messages: { correct: res => FP.msg.correct(res.item.answerText) },
  id: SIM_ID
});

const PROMPT = 'How much air passes through the fan, and how much leaves the stack?';
const ENTRAINED_SHORT = "Entrained flow is a free input here; a real fan's comes from the manufacturer's rating.";
const ENTRAINED_NOTE = 'In a real fan, entrained flow depends on the fan flow and the nozzle design and comes from the ' +
  "manufacturer's rating; here it is an independent input for practice.";

// ---------- State ----------
let feedback = null;      // {kind, message}
let marks = null;         // per-field verdicts of the last checked answer
let lastAnswer = null;    // {fan, total, share} as typed (numbers)
let constantNote = false; // Explore: "fan flow stayed constant" shown
let anchor = null;        // Explore: {c, b} before the learner traded contaminated for bypass

// ---------- Controls ----------
let fanInput, totalInput, shareInput, checkButton, nextButton, startOverButton;
let cSlider, bSlider, eSlider;

const keys = K.keys.bind({ Enter: onEnter });
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textFont('Arial');
  const main = document.querySelector('main');

  const mk = (aria) => {
    const inp = createInput('');
    inp.parent(main);
    inp.attribute('inputmode', 'decimal');
    inp.attribute('autocomplete', 'off');
    inp.attribute('aria-label', aria);
    return inp;
  };
  fanInput = mk('Fan flow, CFM');
  totalInput = mk('Total flow, CFM');
  shareInput = mk('Contaminated share, percent');
  checkButton = K.button(FP.msg.CHECK, checkAnswer);
  nextButton = K.button('Next challenge', nextChallenge);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  const mkSlider = (max, def, aria) => {
    const s = createSlider(0, max, def, 500);
    s.parent(main);
    s.attribute('aria-label', aria);
    s.input(onSlider);
    return s;
  };
  cSlider = mkSlider(20000, 8000, 'Contaminated air, CFM');
  bSlider = mkSlider(10000, 2000, 'Bypass flow, CFM');
  eSlider = mkSlider(30000, 10000, 'Entrained flow, CFM');

  syncControls();

  describe('Lab exhaust flow calculator. A schematic lab exhaust fan shows contaminated air from the ' +
    'fume hood duct and bypass air from the bypass air plenum joining before the fan, the fan flow ' +
    'through the impeller, entrained air joining at the nozzle after the fan, and the total flow ' +
    'leaving the stack. Three challenges give contaminated, bypass and entrained flows; type the fan ' +
    'flow, total flow and contaminated share and press Check. Afterwards, sliders change the three ' +
    'given flows and every stream updates.');
}

// ---------- Controls: state and layout ----------
function narrow() { return canvasWidth < 560; }

function syncControls() {
  const st = runner.state();
  const exp = st.explore;
  for (const inp of [fanInput, totalInput, shareInput]) {
    if (exp) inp.hide(); else inp.show();
    K.setEnabled(inp, st.phase === 'question');
  }
  if (exp) { checkButton.hide(); nextButton.hide(); }
  else if (st.phase === 'question') { checkButton.show(); nextButton.hide(); }
  else { checkButton.hide(); nextButton.show(); }
  nextButton.html(st.isLast ? 'Start exploring' : 'Next challenge');
  for (const s of [cSlider, bSlider, eSlider]) { if (exp) s.show(); else s.hide(); }
  positionControls();
}

function inputLayout() {
  // [label, input] pairs; wide: one row; narrow: two rows (fan + total, then share)
  const nw = narrow();
  const iw = nw ? 74 : 92;
  return nw
    ? [{ inp: fanInput, label: 'Fan flow', x: 10, row: 0, lw: 62 }, { inp: totalInput, label: 'Total flow', x: 160, row: 0, lw: 74 },
       { inp: shareInput, label: 'Share %', x: 10, row: 1, lw: 62 }].map(o => Object.assign(o, { iw }))
    : [{ inp: fanInput, label: 'Fan flow (CFM)', x: 10, row: 0, lw: 112 }, { inp: totalInput, label: 'Total flow (CFM)', x: 230, row: 0, lw: 124 },
       { inp: shareInput, label: 'Share (%)', x: 466, row: 0, lw: 74 }].map(o => Object.assign(o, { iw }));
}

function sliderLeft() { return narrow() ? 150 : 250; }

function positionControls() {
  const st = runner.state();
  if (!st.explore) {
    for (const o of inputLayout()) {
      o.inp.size(o.iw);
      o.inp.position(o.x + o.lw, K.controlRow(o.row));
    }
    if (narrow()) {
      const bx = 10 + 62 + 74 + 10;
      checkButton.position(bx, K.controlRow(1));
      nextButton.position(bx, K.controlRow(1));
      startOverButton.position(10, K.controlRow(2));
    } else {
      checkButton.position(10, K.controlRow(1));
      nextButton.position(10, K.controlRow(1));
      startOverButton.position(10 + Math.max(checkButton.elt.offsetWidth, nextButton.elt.offsetWidth, 120) + 16, K.controlRow(1));
    }
  } else {
    const sw = K.sliderWidth(canvasWidth, sliderLeft(), 15);
    [cSlider, bSlider, eSlider].forEach((s, i) => { s.position(sliderLeft(), K.controlRow(i) + 4); s.size(sw); });
    startOverButton.position(10, K.controlRow(3));
  }
}

// ---------- Challenge flow ----------
function onEnter() {
  const st = runner.state();
  if (st.explore) return;
  if (st.phase === 'question') checkAnswer();
  else if (st.phase === 'resolved') nextChallenge();
}

function readNumber(inp, pct) {
  let s = String(inp.value()).trim();
  if (pct) s = s.replace(/%$/, '').trim();
  return FP.fmt.parseNumber(s);
}

function checkAnswer() {
  const st = runner.state();
  if (st.phase !== 'question') return;
  const v = { fan: readNumber(fanInput), total: readNumber(totalInput), share: readNumber(shareInput, true) };
  const blank = [['fan flow', v.fan], ['total flow', v.total], ['contaminated share', v.share]].filter(p => isNaN(p[1]));
  if (blank.length) {
    feedback = { kind: 'info', message: FP.msg.ENTER_NUMBER + ' for ' + blank.map(p => p[0]).join(', ') + ' (no attempt used).' };
    FP.announce(feedback.message);
    return;
  }
  const res = runner.submit(v);
  if (res.status === 'ignored') return;
  lastAnswer = v;
  marks = fieldMarks(v, res.item);
  feedback = { kind: res.kind, message: res.message };
  FP.announce(markText() + ' ' + res.message);
  syncControls();
  if (res.status === 'retry') fanInput.elt.focus();
  else nextButton.elt.focus();
}

function markText() {
  if (!marks) return '';
  const w = ok => ok ? 'correct' : 'incorrect';
  return 'Fan flow ' + w(marks.fan) + ', total flow ' + w(marks.total) + ', share ' + w(marks.share) + '.';
}

function nextChallenge() {
  if (!runner.next()) return;
  feedback = null; marks = null; lastAnswer = null;
  for (const inp of [fanInput, totalInput, shareInput]) inp.value('');
  const st = runner.state();
  syncControls();
  if (st.explore) {
    anchor = { c: cSlider.value(), b: bSlider.value() };
    FP.announce(runner.summary().lines.join(' ') + ' ' + FP.msg.EXPLORE + ': the three flow sliders are unlocked.');
    cSlider.elt.focus();
  } else {
    FP.announce('Challenge ' + (st.index + 1) + ' of ' + ITEMS.length + '. ' + givenText(st.item) + ' ' + PROMPT);
    fanInput.elt.focus();
  }
}

function startOver() {
  runner.restart();
  feedback = null; marks = null; lastAnswer = null;
  constantNote = false; anchor = null;
  for (const inp of [fanInput, totalInput, shareInput]) inp.value('');
  cSlider.value(8000); bSlider.value(2000); eSlider.value(10000);
  syncControls();
  fanInput.elt.focus();
  FP.announce('Started over. Challenge 1 of ' + ITEMS.length + '. ' + givenText(ITEMS[0]) + ' ' + PROMPT);
}

function givenText(item) {
  return 'Given: contaminated ' + cfm(item.c) + ', bypass ' + cfm(item.b) + ', entrained ' + cfm(item.e) + '.';
}

// Explore: the first time contaminated goes down while bypass goes up by the same amount
function onSlider() {
  const c = cSlider.value(), b = bSlider.value();
  if (!anchor) anchor = { c, b };
  if (!constantNote && c < anchor.c && b > anchor.b && c + b === anchor.c + anchor.b) {
    constantNote = true;
    FP.announce('Fan flow stayed constant at ' + cfm(c + b) + ': the bypass air replaced the contaminated air you removed.');
  }
  // A move in the other direction starts a new comparison
  if (c > anchor.c || b < anchor.b) anchor = { c, b };
}

// ---------- Drawing ----------
function currentFlows() {
  const st = runner.state();
  if (st.explore) {
    const c = cSlider.value(), b = bSlider.value(), e = eSlider.value();
    return Object.assign({ c, b, e, show: true }, mix(c, b, e));
  }
  const it = st.item;
  return Object.assign({ c: it.c, b: it.b, e: it.e, show: st.phase === 'resolved' }, it.m);
}

function draw() {
  K.regions(drawHeight, controlHeight);
  let y = K.title('Lab Exhaust Flow Calculator');
  const st = runner.state();
  y = K.statusLine(st.scoreLabel, st.explore ? FP.msg.EXPLORE + ' (not scored)' : 'Challenge ' + (st.index + 1) + ' of ' + ITEMS.length,
    null, { y: y - 4 });
  K.note(narrow() ? ['Illustrative values', 'FanPedia pp. 4, 6'] : ['Illustrative values', 'Stream names: FanPedia pp. 4, 6, 138', 'Enter checks, then goes on']);

  const top = y + 2, bottom = drawHeight - 22;
  let diag, panel;
  if (!narrow()) {
    const dw = Math.round((canvasWidth - 30) * 0.48);
    diag = [10, top, dw, bottom - top];
    panel = [20 + dw, top, canvasWidth - 30 - dw, bottom - top];
  } else {
    const dh = 204;
    diag = [10, top, canvasWidth - 20, dh];
    panel = [10, top + dh + 6, canvasWidth - 20, bottom - top - dh - 6];
  }
  K.panel(...diag);
  K.panel(...panel);
  drawStack(diag[0], diag[1], diag[2], diag[3], currentFlows());
  if (st.explore) drawExplorePanel(...panel);
  else drawChallengePanel(...panel);
  drawControlLabels();
}

// Schematic: hood duct and bypass plenum feed the fan; entrained air joins at the windband.
function drawStack(x, y, w, h, f) {
  const air = FP.tok('air'), dirty = FP.tok('series-4'), plume = FP.tok('series-1');
  const edge = FP.tok('edge'), metal = FP.tok('metal'), side = FP.tok('metal-side');
  const wt = q => 2 + 7 * Math.min(1, q / 30000);   // arrow weight grows with flow once values show
  const val = q => f.show ? cfm(q) : '? CFM';
  const nw = narrow();
  const cx = x + w * 0.50;
  const tubeW = Math.min(46, w * 0.12);
  const plTop = y + h * (nw ? 0.60 : 0.66), plBot = y + h * (nw ? 0.76 : 0.86);   // bypass air plenum
  const fanTop = y + h * (nw ? 0.34 : 0.36);                   // fan tube top
  const nozTop = y + h * (nw ? 0.26 : 0.27);                   // nozzle exit
  const roofY = plBot + 6;
  push();
  // Roof line
  stroke(edge); strokeWeight(2);
  line(x + 6, roofY, x + w - 6, roofY);
  noStroke(); fill(FP.tok('text-muted')); textSize(12); textAlign(LEFT, TOP);
  text('Roof', nw ? cx + tubeW * 1.5 + 6 : x + w - 40, roofY + 3);
  // Plenum, fan tube, nozzle, windband
  stroke(edge); strokeWeight(1.5);
  fill(side);
  rect(cx - tubeW * 1.5, plTop, tubeW * 3.0, plBot - plTop, 3);
  fill(metal);
  rect(cx - tubeW / 2, fanTop, tubeW, plTop - fanTop);
  quad(cx - tubeW / 2, fanTop, cx + tubeW / 2, fanTop, cx + tubeW * 0.3, nozTop, cx - tubeW * 0.3, nozTop);
  noFill(); strokeWeight(2);
  line(cx - tubeW * 0.75, nozTop - h * 0.06, cx - tubeW * 0.75, nozTop + h * 0.05);
  line(cx + tubeW * 0.75, nozTop - h * 0.06, cx + tubeW * 0.75, nozTop + h * 0.05);
  noStroke(); fill(FP.tok('text')); textSize(12); textAlign(CENTER, CENTER);
  text(nw ? 'Plenum' : 'Bypass air plenum', cx, (plTop + plBot) / 2);
  stroke(edge); strokeWeight(1.5);
  // Impeller (mark inside the tube)
  strokeWeight(1.5); fill(FP.tok('motor'));
  const iy = (fanTop + plTop) / 2;
  rect(cx - tubeW * 0.38, iy - 6, tubeW * 0.76, 12, 2);
  pop();

  const lbl = (str, v, lx, ly, align, col) => {
    push();
    noStroke(); textAlign(align, TOP);
    textSize(nw ? 12 : 13); textStyle(BOLD); fill(col || FP.tok('text'));
    text(str, lx, ly);
    textStyle(NORMAL); fill(f.show ? FP.tok('text') : FP.tok('text-muted'));
    text(v, lx, ly + (nw ? 14 : 16));
    pop();
  };
  // Contaminated air from the hood duct (left, into the plenum)
  const py = (plTop + plBot) / 2;
  FD.airflowArrow(null, { x1: x + 8, y1: py, x2: cx - tubeW * 1.5 - 2, y2: py, color: dirty, weight: f.show ? wt(f.c) : 3 });
  lbl('Contaminated air', val(f.c), x + 8, plBot + (nw ? 8 : 10), LEFT, dirty);
  // Bypass flow (right, through the bypass damper into the plenum)
  FD.airflowArrow(null, { x1: x + w - 8, y1: py, x2: cx + tubeW * 1.5 + 2, y2: py, color: air, weight: f.show ? wt(f.b) : 3, dashed: true });
  if (nw) lbl('Bypass flow', val(f.b), x + w - 8, plBot + 8, RIGHT, air);
  else lbl('Bypass flow', val(f.b), x + w - 8, plTop - 38, RIGHT, air);
  push(); stroke(FP.tok('edge')); strokeWeight(2);
  const dx = cx + tubeW * 1.5 + (x + w - 8 - cx - tubeW * 1.5) * 0.35;
  line(dx - 6, py - 12, dx + 6, py + 12);                       // damper blade
  pop();
  // Fan flow through the impeller (label beside the tube)
  FD.airflowArrow(null, { x1: cx, y1: plTop - 4, x2: cx, y2: fanTop + 8, color: plume, weight: f.show ? wt(f.fanCfm) : 3 });
  lbl('Fan flow', val(f.fanCfm), cx + tubeW * 0.75 + 8, fanTop + (plTop - fanTop) * 0.3, LEFT, plume);
  // Entrained flow (both sides into the windband, after the fan)
  const ey = nozTop + h * 0.02;
  FD.airflowArrow(null, { x1: cx - tubeW * 0.75 - w * 0.17, y1: ey + h * 0.05, x2: cx - tubeW * 0.75 - 3, y2: ey, color: air, weight: f.show ? 1 + wt(f.e) / 2 : 2.5, dashed: true });
  FD.airflowArrow(null, { x1: cx + tubeW * 0.75 + w * 0.17, y1: ey + h * 0.05, x2: cx + tubeW * 0.75 + 3, y2: ey, color: air, weight: f.show ? 1 + wt(f.e) / 2 : 2.5, dashed: true });
  lbl('Entrained flow', val(f.e), x + 8, ey + h * 0.06, LEFT, air);
  // Total flow: the plume
  const plumeOn = !f.show || f.totalCfm > 0;
  if (plumeOn) {
    FD.airflowArrow(null, { x1: cx, y1: nozTop - h * 0.06, x2: cx, y2: y + 12, color: plume, weight: f.show ? wt(f.totalCfm) : 3 });
  }
  const share = !f.show ? 'share ?' : (f.sharePct === null ? 'share not defined' : 'share ' + FP.fmt.num(Math.round(f.sharePct), 0) + '%');
  lbl('Total flow', val(f.totalCfm) + (f.show && f.totalCfm === 0 ? ' (no plume)' : ''), cx + tubeW * 0.75 + 8, y + 8, LEFT, plume);
  push(); noStroke(); textSize(nw ? 12 : 13); fill(FP.tok('text')); textAlign(LEFT, TOP);
  if (nw) K.wrapText('Contaminated ' + share, x + 8, y + 8, cx - tubeW - x - 16, 15, { maxLines: 2 });
  else K.wrapText('Contaminated ' + share, cx + tubeW * 0.75 + 8, y + 40, x + w - 6 - (cx + tubeW * 0.75 + 8), 16, { maxLines: 2 });
  pop();
}

// Paragraph list {t, bold, color, size, gap}; returns the y below
function paras(list, x, y, w, ts, dry) {
  for (const p of list) {
    const s = Math.max(12, ts + (p.size || 0));
    textSize(s);
    textStyle(p.bold ? BOLD : NORMAL);
    fill(p.color || FP.tok('text'));
    y += p.gap || 0;
    y = K.wrapText(p.t, x, y, w, Math.round(s * 1.3), { dryRun: dry });
  }
  textStyle(NORMAL);
  return y;
}

function drawChallengePanel(x, y, w, h) {
  const st = runner.state();
  const it = st.item;
  const ix = x + 10, iw = w - 20, iy = y + 8;
  const nw = narrow();
  const list = [
    { t: 'Challenge ' + (st.index + 1) + ' of ' + ITEMS.length + (st.phase === 'question' ? '  ·  ' + st.attemptLabel : ''), bold: true, size: 1 }
  ].concat(nw ? [
    { t: 'Given: contaminated ' + FP.fmt.num(it.c, 0) + ' · bypass ' + FP.fmt.num(it.b, 0) + ' · entrained ' + cfm(it.e), gap: 4 },
    { t: PROMPT, bold: true, gap: 4 }
  ] : [
    { t: 'Contaminated air: ' + cfm(it.c), gap: 6 },
    { t: 'Bypass flow: ' + cfm(it.b) },
    { t: 'Entrained flow: ' + cfm(it.e) },
    { t: PROMPT, bold: true, gap: 6 },
    { t: 'Type fan flow and total flow in CFM and the contaminated share in %.', color: FP.tok('text-muted') }
  ]);
  if (marks && lastAnswer && nw) {
    const m = (ok, s2) => (ok ? FP.msg.OK : FP.msg.BAD) + ' ' + s2;
    list.push({ t: [m(marks.fan, 'Fan ' + FP.fmt.numUpTo(lastAnswer.fan, 2)), m(marks.total, 'Total ' + FP.fmt.numUpTo(lastAnswer.total, 2)),
      m(marks.share, 'Share ' + FP.fmt.numUpTo(lastAnswer.share, 2) + '%')].join('   '), gap: 4 });
  } else if (marks && lastAnswer) {
    const m = (ok, s) => (ok ? FP.msg.OK + ' ' : FP.msg.BAD + ' ') + s;
    list.push({ t: 'Your answer:', bold: true, gap: 6 });
    list.push({ t: m(marks.fan, 'Fan flow ' + FP.fmt.numUpTo(lastAnswer.fan, 2) + ' CFM'), color: FP.tok(marks.fan ? 'correct' : 'incorrect') });
    list.push({ t: m(marks.total, 'Total flow ' + FP.fmt.numUpTo(lastAnswer.total, 2) + ' CFM'), color: FP.tok(marks.total ? 'correct' : 'incorrect') });
    list.push({ t: m(marks.share, 'Share ' + FP.fmt.numUpTo(lastAnswer.share, 2) + '%'), color: FP.tok(marks.share ? 'correct' : 'incorrect') });
  }
  const fb = feedback ? [{ t: (feedback.kind === 'info' ? 'ℹ ' : '') + feedback.message,
    color: FP.tok(feedback.kind === 'ok' ? 'correct' : feedback.kind === 'bad' ? 'incorrect' : 'text') }] : [];
  const pad = 7;
  const layout = (ts, dry) => {
    let yy = paras(list, ix, iy, iw, ts, dry);
    if (fb.length) yy = paras(fb, ix + pad, yy + 8 + pad, iw - 2 * pad, ts, true) + pad;
    return yy - iy;
  };
  noStroke(); textAlign(LEFT, TOP);
  const ts = K.fitTextSize(t => layout(t, true), h - 16, 15, 12);
  let yy = paras(list, ix, iy, iw, ts, false);
  if (fb.length) {
    const top = yy + 8;
    const fh = paras(fb, ix + pad, top + pad, iw - 2 * pad, ts, true) + pad - top;
    const k = feedback.kind;
    K.panel(ix - 2, top, iw + 4, fh, {
      fill: k === 'ok' ? '--fp-correct-bg' : k === 'bad' ? '--fp-incorrect-bg' : '--fp-info-bg',
      stroke: k === 'ok' ? '--fp-correct' : k === 'bad' ? '--fp-incorrect' : '--fp-border',
      dashed: k === 'bad', weight: k === 'info' ? 1 : 2, radius: 6
    });
    paras(fb, ix + pad, top + pad, iw - 2 * pad, ts, false);
  }
}

function drawExplorePanel(x, y, w, h) {
  const f = currentFlows();
  const s = runner.summary();
  const list = [
    { t: FP.msg.EXPLORE + ' (not scored)', bold: true, size: 1 },
    { t: s.lines[0], bold: true, gap: 4 },
    { t: narrow() && !s.mastered ? FP.msg.masteryNeeds(s.mastery, s.total, 'Start over to try again.') : s.lines[1], color: s.mastered ? FP.tok('primary-dark') : FP.tok('text'), bold: s.mastered },
    { t: 'Fan flow = ' + FP.fmt.num(f.c, 0) + ' + ' + FP.fmt.num(f.b, 0) + ' = ' + cfm(f.fanCfm), gap: 8 },
    { t: 'Total flow = ' + FP.fmt.num(f.fanCfm, 0) + ' + ' + FP.fmt.num(f.e, 0) + ' = ' + cfm(f.totalCfm) },
    { t: f.sharePct === null ? 'Contaminated share: not defined (no total flow, no plume)'
      : 'Contaminated share = ' + FP.fmt.num(f.c, 0) + ' / ' + FP.fmt.num(f.totalCfm, 0) + ' = ' + FP.fmt.num(Math.round(f.sharePct), 0) + '%' }
  ];
  if (constantNote) {
    list.push({ t: narrow() ? 'ℹ Fan flow stayed constant: the bypass air replaced the contaminated air you removed.'
      : 'ℹ Fan flow stayed constant: you lowered contaminated air and raised bypass by the same amount, ' +
      'as the bypass damper does when fume hood sashes close.', color: FP.tok('primary-dark'), gap: 8 });
  } else {
    list.push({ t: 'Try it: lower contaminated air (sashes closing) and raise bypass by the same amount.', color: FP.tok('text'), gap: 8 });
  }
  list.push({ t: narrow() ? ENTRAINED_SHORT : ENTRAINED_NOTE, color: FP.tok('text-muted'), gap: 6 });
  noStroke(); textAlign(LEFT, TOP);
  const ts = K.fitTextSize(t => paras(list, x + 10, y + 8, w - 20, t, true) - (y + 8), h - 16, 15, 12);
  paras(list, x + 10, y + 8, w - 20, ts, false);
}

function drawControlLabels() {
  const st = runner.state();
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(narrow() ? 13 : 15);
  fill(FP.tok('text'));
  if (!st.explore) {
    for (const o of inputLayout()) text(o.label, o.x, K.controlLabel(o.row));
    fill(FP.tok('text-muted'));
    textSize(13);
    const r = narrow() ? 3 : 2;
    text(st.exploreLabel.replace('.', '') + ': flow sliders.', 10, K.controlLabel(r));
  } else {
    const names = [['Contaminated air', cSlider], ['Bypass flow', bSlider], ['Entrained flow', eSlider]];
    names.forEach(([n, s], i) => text((narrow() ? n.split(' ')[0] : n) + ': ' + FP.fmt.num(s.value(), 0) + (narrow() ? '' : ' CFM'), 10, K.controlLabel(i)));
  }
}

// ---------- Responsive sizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
