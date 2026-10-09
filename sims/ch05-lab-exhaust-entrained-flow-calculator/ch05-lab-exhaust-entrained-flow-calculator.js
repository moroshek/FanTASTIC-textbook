// Lab Exhaust Entrained Flow Calculator
// CANVAS_HEIGHT: 705
// Three challenge cases: from contaminated (fume hood), bypass and entrained flows the
// learner types fan flow, total flow and plume concentration, checks all three at once
// (two attempts per value), and the flow diagram fills in. After case 3, Explore mode
// unlocks four sliders; the first doubling of entrained flow shows the before and
// after plume concentrations (it does not halve).
//   Q_fan = Q_contaminated + Q_bypass;  Q_total = Q_fan + Q_entrained;
//   C_plume = C_hood × Q_contaminated / Q_total (rounded to 0.1 ppm for the check).
// Built on the FanPedia kit: FP.ChallengeRunner (one per answer box: attempts, wording,
// score, mastery), FP.models.labExhaustMix (the three equations), FP.p5 (layout, text,
// controls, keys), FD (palette, airflow arrows). Needs ../shared-libs/: fanpedia-sim.css,
// fanpedia-core.js, fanpedia-p5.js, fan-models.js, fan-drawings.js (load them before this
// file, also in the p5.js editor).

const K = FP.p5;
const SIM_ID = 'ch05-lab-exhaust-entrained-flow-calculator';

let canvasWidth = 800;
const drawHeight = 520;
const controlHeight = K.controlHeightFor(5);   // 185: three answer rows + buttons + note, or four sliders + buttons
const canvasHeight = drawHeight + controlHeight;

const R = FP.models.round;
const mix = (c, b, e, ppm) => FP.models.labExhaustMix({ contaminatedCfm: c, bypassCfm: b, entrainedCfm: e, hoodPpm: ppm });

// ---------- Challenge cases (fixed order, hood concentration 100 ppm, illustrative) ----------
const CASES = [
  { c: 8000, b: 2000, e: 7000, ppm: 100,
    wrong: 'Fan flow is contaminated plus bypass: 8,000 + 2,000 = 10,000. Total adds entrained: 17,000. Plume: 100 × 8,000 / 17,000 = 47.1 ppm.' },
  { c: 6000, b: 0, e: 9000, ppm: 100,
    wrong: 'With no bypass, fan flow equals the contaminated air, 6,000. Entrained air does not pass through the fan. Total 15,000; plume 100 × 6,000 / 15,000 = 40.0 ppm.' },
  { c: 12000, b: 4000, e: 0, ppm: 100,
    wrong: 'With no entrainment, total flow equals fan flow, 16,000. Bypass air alone still dilutes: 100 × 12,000 / 16,000 = 75.0 ppm.' }
].map(k => Object.assign(k, { m: mix(k.c, k.b, k.e, k.ppm) }));

const QTY = [
  { key: 'fan', name: 'Fan flow', label: 'Fan flow (CFM)', unit: 'CFM', decimals: 0,
    model: k => k.m.fanCfm, tolerance: { abs: 0 } },
  { key: 'total', name: 'Total flow', label: 'Total flow (CFM)', unit: 'CFM', decimals: 0,
    model: k => k.m.totalCfm, tolerance: { abs: 0 } },
  // Spec rule: the model concentration is rounded to 0.1 ppm, then ±0.5 ppm is correct.
  { key: 'ppm', name: 'Plume concentration', label: 'Plume (ppm)', unit: 'ppm', decimals: 1,
    model: k => R(k.m.plumePpm, 1), tolerance: { abs: 0.5 } }
];
const RETRY_LEAD = FP.msg.BAD + ' Not yet.';
const RETRY_FLOW = 'Check which air passes through the impeller.';
// First-wrong hint for one box: the spec's lead line (flow boxes) plus the rule or the slip
// for that quantity. Never a model value or a worked sum; the case's full "Feedback when wrong"
// text comes only with the missed message.
function retryHint(key, v, k) {
  const fan = k.c + k.b, total = fan + k.e;
  const near = (x, y) => Math.abs(x - y) <= 0.5 + 1e-9;
  if (key === 'fan') {
    if (k.e > 0 && v === fan + k.e) return 'Entrained air joins at the nozzle, after the fan, so it is not fan flow.';
    if (k.b > 0 && v === k.c) return 'Bypass air joins before the fan, so it passes through the impeller too.';
    return 'Fan flow is every stream that passes through the impeller.';
  }
  if (key === 'total') {
    if (k.e > 0 && v === fan) return 'Total flow also counts the entrained air that joins at the nozzle.';
    if (k.b > 0 && v === k.c + k.e) return 'The bypass air leaves the stack too.';
    return 'Total flow is the fan flow plus the entrained air.';
  }
  const model = R(k.ppm * k.c / total, 1);
  if (k.e > 0 && near(v, k.ppm * k.c / fan) && !near(model, k.ppm * k.c / fan)) return 'Dilute by the total flow leaving the stack, not by the fan flow.';
  if (near(v, k.c / total)) return 'Multiply the hood concentration by the share of hood air in the total flow.';
  return 'Plume concentration is the hood concentration times hood air, divided by total flow.';
}

// One ChallengeRunner per answer box: the three boxes of a case are checked together,
// each with its own two attempts. masteryOn 'any': mastery is all nine values correct
// with at most two attempts each.
const runners = QTY.map(q => new FP.ChallengeRunner({
  items: CASES.map((k, i) => ({
    id: 'case' + (i + 1) + '-' + q.key, label: 'case ' + (i + 1), model: q.model(k), unit: q.unit,
    decimals: q.decimals, tolerance: q.tolerance, why: '', caseText: k.wrong,
    hint: v => retryHint(q.key, v, k)
  })),
  attempts: 2, noun: 'Values', mastery: CASES.length, masteryOn: 'any', id: SIM_ID + '-' + q.key,
  messages: {
    retry: r => RETRY_LEAD + (q.key === 'ppm' ? '' : ' ' + RETRY_FLOW) + ' ' + r.item.hint(r.value) +
      ' (' + r.attemptsLeft + ' attempt left)',
    missed: r => FP.msg.BAD + ' ' + r.item.caseText + ' The answer is ' +
      FP.fmt.num(r.item.model, r.item.decimals) + ' ' + r.item.unit + '. This one counts as missed.'
  }
}));

// ---------- State ----------
let mode = 'cases';      // 'cases' | 'explore'
let results = [null, null, null];   // last submit result per box for the current case
let notice = '';         // "Enter a number" style notice (no attempt used)
let doubling = null;     // {e1, e2, p1, p2, half} once the entrained flow has been doubled
let doublingShown = false;
let refEntrained = null; // lowest positive entrained flow since another quantity last changed
let lastVals = null;

let inputs = [], checkBtn, nextBtn, startOverBtn, resetBtn, sliders = [];
const SLIDERS = [
  { key: 'c', label: 'Hood air', long: 'Contaminated air (CFM)', min: 2000, max: 20000, step: 500, def: 8000, unit: 'CFM' },
  { key: 'b', label: 'Bypass', long: 'Bypass flow (CFM)', min: 0, max: 10000, step: 500, def: 2000, unit: 'CFM' },
  { key: 'e', label: 'Entrained', long: 'Entrained flow (CFM)', min: 0, max: 20000, step: 500, def: 7000, unit: 'CFM' },
  { key: 'ppm', label: 'Hood conc.', long: 'Hood concentration (ppm)', min: 10, max: 500, step: 10, def: 100, unit: 'ppm' }
];

const keys = K.keys.bind({ Enter: onEnter });
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  const main = document.querySelector('main');

  QTY.forEach(q => {
    const inp = createInput('');
    inp.parent(main);
    inp.attribute('inputmode', 'decimal');
    inp.attribute('aria-label', q.label);
    inputs.push(inp);
  });
  checkBtn = K.button(FP.msg.CHECK, checkAnswers);
  nextBtn = K.button('Next case', nextCase);
  startOverBtn = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });
  resetBtn = K.button('Case 1 values', resetSliders, { variant: 'secondary' });
  resetBtn.attribute('aria-label', 'Reset the sliders to the case 1 values');
  SLIDERS.forEach(s => {
    const sl = createSlider(s.min, s.max, s.def, s.step);
    sl.parent(main);
    sl.attribute('aria-label', s.long);
    sl.input(onSlider);
    sliders.push(sl);
  });

  syncControls();

  describe('Lab exhaust entrained flow calculator. A flow diagram shows fume hood air at a known ' +
    'concentration, bypass air joining before the fan, the fan, the nozzle, and entrained outside air ' +
    'joining the plume. In three illustrative cases the learner types fan flow, total flow and plume ' +
    'concentration and presses Check; each value is marked and the diagram fills in. After case 3, ' +
    'sliders change the four quantities and the results update at once.');
}

// ---------- Controls ----------
function caseIndex() { return runners[0].state().index; }
function caseResolved() { return runners.every(r => r.state().phase !== 'question'); }

function syncControls() {
  const had = document.activeElement;
  const explore = mode === 'explore';
  inputs.forEach((inp, i) => {
    if (explore) { inp.hide(); return; }
    inp.show();
    K.setEnabled(inp, runners[i].state().phase === 'question');
  });
  if (explore) { checkBtn.hide(); nextBtn.hide(); resetBtn.show(); }
  else {
    checkBtn.show(); nextBtn.show(); resetBtn.hide();
    K.setEnabled(checkBtn, !caseResolved());
    K.setEnabled(nextBtn, caseResolved());
    nextBtn.html(caseIndex() === CASES.length - 1 ? 'Start exploring' : 'Next case');
  }
  sliders.forEach(s => { if (explore) s.show(); else s.hide(); });
  positionControls();
  K.keepFocus(had, inputs.concat([checkBtn, nextBtn, startOverBtn]));
}

function labelCol() { return canvasWidth < 480 ? 132 : 150; }

function positionControls() {
  const lc = labelCol();
  const narrow = canvasWidth < 480;
  if (mode === 'explore') {
    const sl = narrow ? 150 : 250;
    sliders.forEach((s, i) => {
      s.position(sl, K.controlRow(i) + 4);
      s.size(K.sliderWidth(canvasWidth, sl, 15));
    });
    K.flowButtons(4, [resetBtn, startOverBtn]);
  } else {
    const iw = canvasWidth < 360 ? 70 : narrow ? 80 : 110;
    inputs.forEach((inp, i) => {
      inp.size(iw);
      inp.position(lc, K.controlRow(i));
    });
    K.flowButtons(3, [checkBtn, nextBtn, '|', startOverBtn]);
  }
}

// ---------- Challenge flow ----------
function onEnter() {
  if (mode !== 'cases') return;
  if (!caseResolved()) checkAnswers(); else nextCase();
}

function checkAnswers() {
  if (mode !== 'cases' || caseResolved()) return;
  const open = runners.map((r, i) => r.state().phase === 'question' ? i : -1).filter(i => i >= 0);
  const blank = open.filter(i => isNaN(FP.fmt.parseNumber(inputs[i].value())));
  if (blank.length) {
    notice = FP.msg.ENTER_NUMBER + ' in every open box: ' + blank.map(i => QTY[i].name.toLowerCase()).join(', ') + '.';
    FP.announce(notice);
    inputs[blank[0]].elt.focus();
    return;
  }
  notice = '';
  for (const i of open) results[i] = runners[i].submit(inputs[i].value());
  const spoken = open.map(i => QTY[i].name + ': ' + results[i].message).join(' ');
  FP.announce(spoken + (caseResolved() ? ' ' + scoreLabel() + '.' : ''));
  syncControls();
  if (caseResolved()) nextBtn.elt.focus();
  else {
    const first = runners.findIndex(r => r.state().phase === 'question');
    inputs[first].elt.focus();
    inputs[first].elt.select();
  }
}

function nextCase() {
  if (mode !== 'cases' || !caseResolved()) return;
  runners.forEach(r => r.next());
  results = [null, null, null];
  notice = '';
  if (runners[0].state().explore) {
    mode = 'explore';
    resetSliders();
    syncControls();
    FP.announce(summaryLines().join(' ') + ' ' + FP.msg.EXPLORE + ': move any slider; the results update at once.');
    sliders[0].elt.focus();
  } else {
    inputs.forEach(inp => inp.value(''));
    syncControls();
    const k = CASES[caseIndex()];
    FP.announce('Case ' + (caseIndex() + 1) + ' of 3. Contaminated air ' + FP.fmt.cfm(k.c) + ', bypass ' +
      FP.fmt.cfm(k.b) + ', entrained ' + FP.fmt.cfm(k.e) + ', hood concentration ' + k.ppm + ' ppm.');
    inputs[0].elt.focus();
  }
}

function startOver() {
  runners.forEach(r => r.restart());
  mode = 'cases';
  results = [null, null, null];
  notice = '';
  doubling = null; doublingShown = false;
  inputs.forEach(inp => inp.value(''));
  resetSliders();
  syncControls();
  FP.announce('Started over. Case 1 of 3. How much air must the fan move, and how much leaves the stack?');
  inputs[0].elt.focus();
}

function resetSliders() {
  SLIDERS.forEach((s, i) => sliders[i].value(s.def));
  lastVals = sliderVals();
  refEntrained = lastVals.e > 0 ? lastVals.e : null;
}

function scoreLabel() {
  const n = runners.reduce((a, r) => a + r.score.correct(), 0);
  return FP.msg.score('Values', n, CASES.length * QTY.length);
}
function mastered() { return runners.every(r => r.score.mastered()); }
function summaryLines() {
  return [scoreLabel(), mastered() ? FP.msg.masteryReached(9, 9)
    : FP.msg.masteryNeeds(9, 9, 'Review "Entrained Flow in Laboratory Exhaust", then press Start over', 'any')];
}

// ---------- Explore ----------
function sliderVals() {
  const v = {};
  SLIDERS.forEach((s, i) => { v[s.key] = Number(sliders[i].value()); });
  return v;
}

// The first time the entrained flow reaches twice an earlier value (with the other three
// quantities unchanged), show the concentrations before and after an exact doubling.
function onSlider() {
  const v = sliderVals();
  if (lastVals && (v.c !== lastVals.c || v.b !== lastVals.b || v.ppm !== lastVals.ppm)) {
    refEntrained = v.e > 0 ? v.e : null;
  } else if (v.e > 0 && (refEntrained === null || v.e < refEntrained)) {
    refEntrained = v.e;
  }
  if (!doublingShown && refEntrained && v.e >= 2 * refEntrained && lastVals && v.e !== lastVals.e) {
    const e1 = refEntrained, e2 = 2 * refEntrained;
    const p1 = mix(v.c, v.b, e1, v.ppm).plumePpm, p2 = mix(v.c, v.b, e2, v.ppm).plumePpm;
    doubling = { e1, e2, p1, p2, half: p1 / 2 };
    doublingShown = true;
    FP.announce(doublingText());
  }
  lastVals = v;
}

function doublingText() {
  const d = doubling;
  return 'Entrained flow doubled from ' + FP.fmt.cfm(d.e1) + ' to ' + FP.fmt.cfm(d.e2) + ': the plume goes from ' +
    FP.fmt.num(d.p1, 1) + ' to ' + FP.fmt.num(d.p2, 1) + ' ppm, not to ' + FP.fmt.num(d.half, 1) +
    ' ppm. Doubling the entrained air does not double the total flow, because the fan flow stays the same.';
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  let y = K.title('Lab Exhaust Entrained Flow Calculator');
  const right = mode === 'explore' ? FP.msg.EXPLORE + ' (not scored)' : 'Case ' + (caseIndex() + 1) + ' of 3 · two attempts per value';
  y = K.statusLine(scoreLabel(), right, null, { y: y - 4 });
  K.note(canvasWidth >= 560
    ? [FP.msg.ILLUSTRATIVE, 'Flow definitions: FanPedia pp. 4, 6', 'Enter checks, then goes to the next case']
    : [FP.msg.ILLUSTRATIVE, 'FanPedia pp. 4, 6', 'Enter checks']);

  const top = y + 2, bottom = drawHeight - 24;
  let dia, txt;
  if (canvasWidth >= 640) {
    const dw = Math.round(canvasWidth * 0.6);
    dia = { x: 10, y: top, w: dw - 15, h: bottom - top };
    txt = { x: dw + 5, y: top, w: canvasWidth - dw - 15, h: bottom - top };
  } else {
    const dh = 196;
    dia = { x: 10, y: top, w: canvasWidth - 20, h: dh };
    txt = { x: 10, y: top + dh + 6, w: canvasWidth - 20, h: bottom - top - dh - 6 };
  }
  K.panel(dia.x, dia.y, dia.w, dia.h);
  K.panel(txt.x, txt.y, txt.w, txt.h);
  drawDiagram(dia);
  drawTextPanel(txt.x + 10, txt.y + 8, txt.w - 20, txt.h - 16);
  drawControlLabels();
}

// What the diagram shows: givens always; fan, total and plume once known (or in Explore).
function diagramValues() {
  if (mode === 'explore') {
    const v = sliderVals();
    const m = mix(v.c, v.b, v.e, v.ppm);
    return { c: v.c, b: v.b, e: v.e, ppm: v.ppm, fan: m.fanCfm, total: m.totalCfm, plume: m.plumePpm };
  }
  const k = CASES[caseIndex()];
  const known = i => runners[i].state().phase !== 'question';
  return { c: k.c, b: k.b, e: k.e, ppm: k.ppm,
    fan: known(0) ? k.m.fanCfm : null, total: known(1) ? k.m.totalCfm : null, plume: known(2) ? k.m.plumePpm : null };
}

const DW = 400, DH = 270;
function drawDiagram(box) {
  const pal = FD.palette();
  const v = diagramValues();
  const f = FD.frame({ x: box.x + 4, y: box.y + 4, w: box.w - 8, h: box.h - 8 }, DW, 0, DH);
  const X = x => f.X(x), Y = y => f.Y(y), S = s => f.S(s);
  const ts = canvasWidth < 480 ? 12 : 13;
  push();
  // roof line under the fan
  stroke(pal.floor); strokeWeight(2);
  line(X(200), Y(224), X(DW), Y(224));
  // fume hood
  stroke(pal.edge); strokeWeight(1.5); fill(pal.metal);
  rect(X(4), Y(150), S(52), S(72), S(3));
  fill(255); rect(X(12), Y(172), S(36), S(42));
  // duct from the hood to the fan
  fill(pal.drawBg);
  rect(X(56), Y(186), S(172), S(22));
  // bypass air plenum with damper blades
  fill(pal.metal);
  rect(X(160), Y(148), S(38), S(38));
  stroke(pal.edge); strokeWeight(2);
  for (let i = 0; i < 3; i++) line(X(166), Y(156 + i * 10), X(192), Y(162 + i * 10));
  // stack with a nozzle, and the fan
  strokeWeight(1.5); fill(pal.metal);
  rect(X(240), Y(100), S(24), S(74));
  quad(X(238), Y(100), X(266), Y(100), X(259), Y(78), X(245), Y(78));
  circle(X(252), Y(197), S(52));
  stroke(pal.hub); strokeWeight(2);
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; line(X(252), Y(197), X(252) + S(21) * Math.cos(a), Y(197) + S(21) * Math.sin(a)); }
  noStroke(); fill(pal.hub); circle(X(252), Y(197), S(9));
  pop();

  const arrow = (x1, y1, x2, y2) => FD.airflowArrow(null, { frame: f, x1, y1, x2, y2,
    weight: Math.max(2, S(3)), head: Math.max(8, S(11)) });
  arrow(62, 197, 118, 197);                 // contaminated air
  arrow(179, 104, 179, 194);                // bypass air in
  arrow(200, 197, 224, 197);                // mixed air to the fan
  arrow(252, 166, 252, 108);                // fan flow up the stack
  arrow(200, 100, 242, 76);                 // entrained air (left)
  arrow(306, 100, 262, 76);                 // entrained air (right)
  arrow(252, 72, 252, 6);                   // plume

  const q = n => n === null ? '? CFM' : FP.fmt.cfm(n);
  const muted = FP.tok('text-muted'), pri = FP.tok('primary-dark');
  const lbl = (lines, x, y, al) => {     // [[text, colour, bold], ...], first line top at local y
    noStroke(); textSize(ts); textAlign(al || LEFT, TOP);
    lines.forEach((l, i) => {
      fill(l[1] || pal.text); textStyle(l[2] ? BOLD : NORMAL);
      text(l[0], X(x), Y(y) + i * (ts + 4));
    });
  };
  lbl([['Fume hoods'], [v.ppm + ' ppm', pri, true]], 2, 228);
  lbl([['Hood air'], [q(v.c), pri, true]], 62, 148);
  lbl([['Bypass air'], [q(v.b), pri, true]], 171, 102, RIGHT);
  lbl([['Entrained'], [q(v.e), pri, true]], 204, 56, RIGHT);
  lbl([['Fan']], 284, 190);
  lbl([['Fan flow'], [q(v.fan), v.fan === null ? muted : pri, true]], 272, 114);
  lbl([['Total flow'], [q(v.total), v.total === null ? muted : pri, true],
    [v.plume === null ? 'Plume ? ppm' : 'Plume ' + FP.fmt.num(v.plume, 1) + ' ppm', v.plume === null ? muted : pri, true]], 266, 2);
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
}

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
function blocks(list, x, y, w, ts, dry) {
  const pad = 7;
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
  const list = [];
  if (mode === 'cases') {
    const i = caseIndex(), k = CASES[i];
    list.push({ paras: [{ t: 'Case ' + (i + 1) + ' of 3 (illustrative values)', bold: true, size: 1 }] });
    list.push({ gap: 4, paras: [{ t: 'How much air must the fan move, and how much leaves the stack?', bold: true }] });
    if (canvasWidth >= 640) list.push({ gap: 2, paras: [{ t: 'Given: hood air ' + FP.fmt.cfm(k.c) + ' at ' + k.ppm + ' ppm, bypass ' + FP.fmt.cfm(k.b) +
      ', entrained ' + FP.fmt.cfm(k.e) + '. Type the three values below and press Check.', muted: true }] });
    if (notice) list.push({ gap: 6, box: 'info', paras: [{ t: 'ℹ ' + notice }] });
    // Results of the latest check, grouped so the panel stays short: correct values in one
    // box, retries (one shared hint) in one box, each missed value in its own box with the
    // case explanation printed once.
    const shown = results.map((r, j) => ({ r, j })).filter(o => o.r && ['correct', 'retry', 'missed'].includes(o.r.status));
    const ok = shown.filter(o => o.r.status === 'correct');
    const retry = shown.filter(o => o.r.status === 'retry');
    const missed = shown.filter(o => o.r.status === 'missed');
    if (ok.length) list.push({ gap: 5, box: 'ok', paras: ok.map(o => ({ t: QTY[o.j].name + ': ' + o.r.message, color: FP.tok('correct') })) });
    if (retry.length) list.push({ gap: 5, box: 'bad', paras: retry.map(o => ({ t: QTY[o.j].name + ': ' + o.r.message, color: FP.tok('incorrect') })) });
    if (missed.length === 1) {
      const o = missed[0];
      list.push({ gap: 5, box: 'bad', paras: [{ t: QTY[o.j].name + ': ' + o.r.message, color: FP.tok('incorrect') }] });
    } else if (missed.length > 1) {   // one box: the case explanation once, then every revealed value
      const ans = missed.map(o => QTY[o.j].name.toLowerCase() + ' ' + FP.fmt.num(o.r.item.model, o.r.item.decimals) + ' ' + o.r.item.unit);
      list.push({ gap: 5, box: 'bad', paras: [{ t: FP.msg.BAD + ' ' + missed[0].r.item.caseText + ' The answers are ' +
        ans.join(', ') + '. These count as missed.', color: FP.tok('incorrect') }] });
    }
  } else {
    const v = sliderVals();
    const m = mix(v.c, v.b, v.e, v.ppm);
    list.push({ paras: [{ t: FP.msg.EXPLORE + ' (not scored)', bold: true, size: 1 }] });
    list.push({ gap: 4, paras: [
      { t: 'Fan flow = ' + FP.fmt.num(v.c) + ' + ' + FP.fmt.num(v.b) + ' = ' + FP.fmt.cfm(m.fanCfm) },
      { t: 'Total flow = ' + FP.fmt.num(m.fanCfm) + ' + ' + FP.fmt.num(v.e) + ' = ' + FP.fmt.cfm(m.totalCfm) },
      { t: 'Plume = ' + v.ppm + ' × ' + FP.fmt.num(v.c) + ' / ' + FP.fmt.num(m.totalCfm) + ' = ' + FP.fmt.num(m.plumePpm, 1) + ' ppm', bold: true }
    ] });
    if (doubling) list.push({ gap: 6, box: 'info', paras: [{ t: doublingText() }] });
    else list.push({ gap: 6, paras: [{ t: 'Try it: double the entrained flow and watch what happens to the plume concentration.', muted: true }] });
    const s = summaryLines();
    list.push({ gap: 6, paras: [{ t: s[0], bold: true }, { t: s[1], color: FP.tok(mastered() ? 'correct' : 'text') }] });
  }
  const ts = K.fitTextSize(t => blocks(list, x, y, w, t, true) - y, h, 16, 12);
  textAlign(LEFT, TOP);
  blocks(list, x, y, w, ts, false);
}

function drawControlLabels() {
  const narrow = canvasWidth < 480;
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(narrow ? 14 : 15);
  if (mode === 'explore') {
    SLIDERS.forEach((s, i) => {
      fill(FP.tok('text'));
      textStyle(BOLD);
      const val = Number(sliders[i].value());
      text((narrow ? s.label : s.long.replace(/ \(.*\)/, '')) + ': ' + FP.fmt.num(val) + ' ' + s.unit, 10, K.controlLabel(i));
    });
    textStyle(NORMAL);
    return;
  }
  const lc = labelCol();
  QTY.forEach((q, i) => {
    fill(FP.tok('text'));
    textStyle(BOLD);
    text(q.label, 10, K.controlLabel(i));
    textStyle(NORMAL);
    // verdict beside each box: ✓/✗ plus the model value once it is resolved
    const st = runners[i].state(), r = results[i];
    const x = lc + inputs[i].elt.offsetWidth + 10;
    let t = null, col = FP.tok('text-muted');
    if (st.phase !== 'question' && r && (r.status === 'correct' || r.status === 'missed')) {
      const ok = r.status === 'correct';
      t = (ok || narrow ? (ok ? FP.msg.OK : FP.msg.BAD) : FP.msg.BAD + ' answer') + ' ' + FP.fmt.num(r.item.model, r.item.decimals);
      col = FP.tok(ok ? 'correct' : 'incorrect');
    } else if (r && r.status === 'retry') {
      t = FP.msg.BAD + ' ' + st.attemptLabel;
      col = FP.tok('incorrect');
    } else if (!narrow) {
      t = st.attemptLabel;
    }
    if (t) { fill(col); textSize(narrow ? 13 : 14); text(t, x, K.controlLabel(i)); textSize(narrow ? 14 : 15); }
  });
  fill(FP.tok('text-muted'));
  textSize(narrow ? 13 : 14);
  text(narrow ? 'Sliders unlock after case 3.' : 'Free exploration (Explore mode) unlocks after case 3.', 10, K.controlLabel(4));
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
