// Duct System Pressure Explorer - p5.js MicroSim (Chapter 2: Airstreams, Total Pressure and Standard Air)
// CANVAS_HEIGHT: 675
// One illustrative exhaust system (hood, 24 x 24 in. inlet duct, fan, 20 x 20 in. outlet duct,
// stack). Five calculation challenges (velocity, velocity pressure, fan total pressure, air power,
// pressure at a higher airflow) hide their target readout until the learner checks an answer;
// then Explore mode unlocks the airflow slider and every station value updates live.
// Built on the FanPedia kit: FP.ChallengeRunner (flow, wording, score, mastery), FP.models
// (duct velocity, velocity pressure, system resistance, air power), FD.ductRun (schematic),
// FP.p5 (layout, text, controls, keys).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js, fan-models.js,
// fan-drawings.js (load them before this file, also in the p5.js editor).

const K = FP.p5;
const M = FP.models;
const SIM_ID = 'ch02-duct-system-pressure-explorer';

// ---------- Canvas layout ----------
let canvasWidth = 800;
const drawHeight = 560;
const controlHeight = K.controlHeightFor(3);   // answer row, Start over + definition row, airflow row
const canvasHeight = drawHeight + controlHeight;

// ---------- Illustrative system (spec Rules) ----------
const Q_BASE = 10000;          // CFM at which the chapter's worked example holds
const AREA_IN = 4.00;          // ft², 24 in. x 24 in.
const AREA_OUT = 2.78;         // ft², 20 in. x 20 in. (the spec's rounded area)
const TP1_BASE = -0.81;        // in. wg at 10,000 CFM
const TP2_BASE = 2.81;         // in. wg at 10,000 CFM
const Q_MIN = 4000, Q_MAX = 14000, Q_STEP = 500;
const DATA_NOTE = ['Illustrative system', 'standard air, 0.075 lb/ft³'];

// Every station and fan value at airflow q (unrounded; display rounds).
function systemAt(q) {
  const v1 = M.ductVelocityFpm(q, AREA_IN);
  const v2 = M.ductVelocityFpm(q, AREA_OUT);
  const vp1 = M.velocityPressureInWg(v1);
  const vp2 = M.velocityPressureInWg(v2);
  const tp1 = M.systemPressure(TP1_BASE, Q_BASE, q);
  const tp2 = M.systemPressure(TP2_BASE, Q_BASE, q);
  const ftp = tp2 - tp1;
  return { q, v1, v2, vp1, vp2, tp1, tp2, sp1: tp1 - vp1, sp2: tp2 - vp2,
    ftp, fsp: ftp - vp2, ahp: M.airPowerHp(q, ftp) };
}

// ---------- Challenges (fixed order, two attempts; spec table) ----------
// model = the answer computed from the numbers the question gives, rounded as the spec's
// "Correct answer" column prints it (the tolerance is applied around that value).
const CHALLENGE_DATA = [
  { id: 'inlet-velocity', label: 'challenge 1',
    prompt: 'How fast is the air moving in the inlet duct?',
    question: 'At 10,000 CFM, what is the velocity in the inlet duct (fpm)?',
    model: M.round(M.ductVelocityFpm(10000, AREA_IN), 0), tolerance: { abs: 25 }, unit: 'fpm', answerText: '2,500 fpm',
    q: 10000, hide: ['v1', 'vp1', 'sp1'],
    wrong: 'Use Q = A × V: 10,000 ÷ 4.00 ft² = 2,500 fpm.' },
  { id: 'outlet-vp', label: 'challenge 2',
    prompt: 'Velocity pressure goes with the square of velocity.',
    question: 'At 10,000 CFM the outlet velocity is 3,600 fpm. What is the outlet velocity pressure (in. wg)?',
    model: M.round(M.velocityPressureInWg(3600), 2), tolerance: { abs: 0.02 }, unit: 'in. wg', answerText: '0.81 in. wg',
    q: 10000, hide: ['vp2', 'sp2', 'fsp'],
    wrong: 'VP = (V ÷ 4005)²: (3,600 ÷ 4005)² = 0.899² = 0.81 in. wg. Velocity pressure goes with the square of velocity.' },
  { id: 'fan-total-pressure', label: 'challenge 3',
    prompt: 'Keep every sign when you subtract.',
    question: 'At 10,000 CFM, inlet SP is −1.20 and inlet VP is 0.39; outlet SP is +2.00 and outlet VP is 0.81. ' +
      'What is the fan total pressure (in. wg)?',
    model: M.round((2.00 + 0.81) - (-1.20 + 0.39), 2), tolerance: { abs: 0.03 }, unit: 'in. wg', answerText: '3.62 in. wg',
    q: 10000, hide: ['tp1', 'tp2', 'ftp', 'fsp', 'ahp'],
    wrong: 'TP inlet = −1.20 + 0.39 = −0.81; TP outlet = 2.00 + 0.81 = 2.81; FTP = 2.81 − (−0.81) = 3.62 in. wg. ' +
      'Keep the inlet sign.' },
  { id: 'air-power', label: 'challenge 4',
    prompt: 'Air power is the energy rate the fan gives the air.',
    question: 'What is the air power at 10,000 CFM and 3.62 in. wg fan total pressure (hp)?',
    model: M.round(M.airPowerHp(10000, 3.62), 2), tolerance: { abs: 0.05 }, unit: 'hp', answerText: '5.70 hp',
    q: 10000, hide: ['ahp'],
    wrong: 'AHP = Q × FTP ÷ 6356 = 10,000 × 3.62 ÷ 6356 = 5.70 hp.' },
  { id: 'ftp-at-12000', label: 'challenge 5',
    prompt: 'The plant asks for 20 percent more air through the same ductwork.',
    question: 'The airflow is raised to 12,000 CFM in the same system. What fan total pressure is now required (in. wg)?',
    model: M.round(M.systemPressure(3.62, 10000, 12000), 2), tolerance: { abs: 0.05 }, unit: 'in. wg', answerText: '5.21 in. wg',
    q: 12000, hide: ['sp1', 'tp1', 'sp2', 'tp2', 'ftp', 'fsp', 'ahp'],
    wrong: 'Pressure goes with the square of airflow: (12,000 ÷ 10,000)² = 1.44, and 3.62 × 1.44 = 5.21 in. wg, ' +
      'not 3.62 × 1.20.' }
];
// First wrong attempt: a hint that names the rule or the slip, never the value or the worked
// numbers. The final miss shows the spec's "Feedback when wrong" text (why) with the answer.
const near = (v, target, abs) => FP.check.numeric(v, target, { abs });
const HINTS = {
  'inlet-velocity': v => (near(v, 10000 * AREA_IN, 50) ? 'You multiplied. Velocity is airflow divided by flow area: V = Q ÷ A.'
    : 'Velocity is airflow divided by flow area, V = Q ÷ A, with A in ft² (shown under Station 1).'),
  'outlet-vp': v => (near(v, 3600 / 4005, 0.02) ? 'You stopped before squaring. Velocity pressure goes with the square of velocity.'
    : 'VP = (V ÷ 4005)²: divide the velocity by 4005, then square the result.'),
  'fan-total-pressure': v => {
    if (near(v, 2.81 - 0.81, 0.03)) return 'Keep the inlet sign: the inlet total pressure is negative, and subtracting a negative adds.';
    if (near(v, 2.00 - (-1.20), 0.03)) return 'That is the static pressure rise. Fan total pressure uses total pressure, TP = SP + VP, at each station.';
    if (near(v, 2.81, 0.03)) return 'That is the outlet total pressure alone. Subtract the inlet total pressure, keeping its sign.';
    return 'Find TP = SP + VP at each station, then FTP = TP outlet − TP inlet, keeping every sign.';
  },
  'air-power': v => (near(v, 10000 * 3.62, 100) ? 'You did not divide. Air power in hp is Q × FTP ÷ 6356.'
    : near(v, 10000 * 3.62 / 33000, 0.05) ? 'With CFM and in. wg the constant is 6356, not 33,000.'
      : 'AHP = Q × FTP ÷ 6356, with Q in CFM and FTP in in. wg.'),
  'ftp-at-12000': v => (near(v, 3.62 * 1.2, 0.05) ? 'You scaled by the airflow ratio. In the same system, pressure goes with the square of the airflow ratio.'
    : near(v, 3.62 * 1.728, 0.05) ? 'You cubed the ratio; that is the rule for power. Pressure goes with the square of the airflow ratio.'
      : 'In the same system, pressure goes with the square of the airflow ratio.')
};
const ITEMS = CHALLENGE_DATA.map(c => Object.assign({}, c, { hint: HINTS[c.id], why: c.wrong }));
const MASTERY = 4;

const runner = new FP.ChallengeRunner({
  items: ITEMS,
  attempts: 2,
  noun: 'Challenges',
  mastery: MASTERY,
  reviewPointer: 'Review "Total Pressure" and "Pressure Rise and Air Power", then press Start over',
  // Spec: correct reads "Correct: <value> <unit>."; wrong attempts use the "Feedback when wrong" text.
  messages: { correct: res => FP.msg.correct(res.item.answerText) },
  id: SIM_ID
});

// ---------- Schematic parts and definitions (spec Content) ----------
const PARTS = [
  { key: 'hood', name: 'Hood', def: 'the entry point where air and contaminant are captured from the room.' },
  { key: 'inlet', name: 'Inlet duct', def: 'the duct between the hood and the fan; the fan pulls on it, so its static pressure is negative.' },
  { key: 'st1', name: 'Station 1 (fan inlet)', def: 'the measurement point just upstream of the fan.' },
  { key: 'fan', name: 'Fan', def: 'the only component that adds total pressure to the air.' },
  { key: 'st2', name: 'Station 2 (fan outlet)', def: 'the measurement point just downstream of the fan.' },
  { key: 'outlet', name: 'Outlet duct', def: 'the duct between the fan and the stack; the fan pushes into it, so its static pressure is positive.' },
  { key: 'stack', name: 'Discharge stack', def: 'where the air leaves the system at atmospheric pressure.' }
];
const RUN = [   // FD.ductRun components, in flow order; PARTS key for each
  { type: 'hood', label: 'Hood', part: 'hood' },
  { type: 'duct', label: 'Inlet duct', value: '24 × 24 in.', part: 'inlet' },
  { type: 'fan', label: 'Fan', part: 'fan' },
  { type: 'duct', label: 'Outlet duct', value: '20 × 20 in.', part: 'outlet' },
  { type: 'stack', label: 'Stack', part: 'stack' }
];

// ---------- State ----------
let feedback = null;       // {kind, message}
let worked = '';           // worked calculation after a correct answer
let selectedPart = null;   // PARTS key whose definition is shown
let hitBoxes = [];         // [{key, x, y, w, h}] for mouse clicks on the schematic

// ---------- Controls ----------
let answerInput, checkButton, nextButton, startOverButton, partSelect, airflowSlider;

const keys = K.keys.bind({ Enter: onEnter });
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  const main = document.querySelector('main');

  answerInput = createInput('');
  answerInput.parent(main);
  answerInput.attribute('inputmode', 'decimal');
  answerInput.attribute('autocomplete', 'off');
  answerInput.attribute('aria-label', 'Your answer');

  checkButton = K.button(FP.msg.CHECK, checkAnswer);
  nextButton = K.button('Next challenge', nextChallenge);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  partSelect = createSelect();
  partSelect.parent(main);
  partSelect.option('Definition of…', '');
  for (const p of PARTS) partSelect.option(p.name, p.key);
  partSelect.attribute('aria-label', 'Show the definition of a schematic label');
  partSelect.changed(() => showPart(partSelect.value() || null, false));

  airflowSlider = createSlider(Q_MIN, Q_MAX, Q_BASE, Q_STEP);
  airflowSlider.parent(main);
  airflowSlider.attribute('aria-label', 'Airflow, CFM');

  syncControls();

  describe('Duct system pressure explorer. A schematic shows an exhaust system in flow order: hood, ' +
    '24 by 24 inch inlet duct, station 1 at the fan inlet, the fan, station 2 at the fan outlet, ' +
    '20 by 20 inch outlet duct and discharge stack. Readout panels give velocity, velocity pressure, ' +
    'static pressure and total pressure at each station, and fan total pressure, fan static pressure ' +
    'and air power for the fan. Five challenges ask for one value each, hidden until the answer is checked. ' +
    'After challenge 5 an airflow slider from 4,000 to 14,000 CFM updates every value.');
}

// ---------- Control state and layout ----------
function syncControls() {
  const st = runner.state();
  if (st.explore) {
    answerInput.hide(); checkButton.hide(); nextButton.hide();
  } else {
    answerInput.show();
    K.setEnabled(answerInput, st.phase === 'question');
    if (st.phase === 'question') { checkButton.show(); nextButton.hide(); } else { checkButton.hide(); nextButton.show(); }
    nextButton.html(st.isLast ? 'Start exploring' : 'Next challenge');
  }
  K.setEnabled(airflowSlider, st.explore);
  positionControls();
}

function narrow() { return canvasWidth < 480; }
function compact() { return canvasWidth < 360; }   // readouts drop the "in. wg" unit (the note names it)

function positionControls() {
  const n = narrow();
  const inputX = n ? 100 : 112;
  answerInput.size(n ? 74 : 100);
  answerInput.position(inputX, K.controlRow(0));
  textSize(n ? 14 : 16);
  const unit = runner.state().item ? runner.state().item.unit : '';
  const bx = inputX + (answerInput.elt.offsetWidth || 100) + 8 + textWidth(unit) + 10;
  checkButton.position(bx, K.controlRow(0));
  nextButton.position(bx, K.controlRow(0));
  startOverButton.position(10, K.controlRow(1));
  const sx = 10 + (startOverButton.elt.offsetWidth || 90) + 12;
  partSelect.position(sx, K.controlRow(1));
  partSelect.style('max-width', Math.max(120, canvasWidth - sx - 10) + 'px');
  const left = n ? 172 : 200;
  airflowSlider.position(left, K.controlRow(2) + 4);
  airflowSlider.size(K.sliderWidth(canvasWidth, left, 15));
}

// ---------- Challenge flow (FP.ChallengeRunner) ----------
function onEnter() {
  const st = runner.state();
  if (st.phase === 'question') checkAnswer(); else if (st.phase === 'resolved') nextChallenge();
}

function checkAnswer() {
  const res = runner.submit(answerInput.value());
  if (res.status === 'ignored') return;
  feedback = { kind: res.kind, message: res.message };
  worked = res.status === 'correct' ? 'Worked calculation: ' + res.item.wrong : '';
  FP.announce(res.message + (worked ? ' ' + worked : ''));
  if (res.status === 'correct' || res.status === 'missed') {
    syncControls();
    nextButton.elt.focus();
  } else {
    answerInput.elt.select();
  }
}

function nextChallenge() {
  if (!runner.next()) return;
  feedback = null;
  worked = '';
  const st = runner.state();
  if (st.explore) {
    syncControls();
    const s = runner.summary();
    FP.announce(s.lines.join(' ') + ' ' + FP.msg.EXPLORE + ': the airflow slider is unlocked.');
    airflowSlider.elt.focus();
  } else {
    airflowSlider.value(st.item.q);     // challenge 5 moves the airflow to 12,000 CFM first
    answerInput.value('');
    syncControls();
    FP.announce('Challenge ' + (st.index + 1) + ' of ' + ITEMS.length + ': ' + st.item.question);
    answerInput.elt.focus();
  }
}

function startOver() {
  runner.restart();
  feedback = null;
  worked = '';
  airflowSlider.value(Q_BASE);
  answerInput.value('');
  syncControls();
  FP.announce('Started over. Challenge 1 of ' + ITEMS.length + ': ' + ITEMS[0].question);
  answerInput.elt.focus();
}

function showPart(key, fromMouse) {
  selectedPart = key;
  if (fromMouse) partSelect.selected(key || '');
  const p = PARTS.find(x => x.key === key);
  if (p) FP.announce(p.name + ': ' + p.def);
}

function mousePressed() {
  if (mouseY < 0 || mouseY > drawHeight || mouseX < 0 || mouseX > width) return;
  const hit = hitBoxes.find(b => mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h);
  if (hit) showPart(hit.key, true);
}

// Values whose readout is hidden right now (the current challenge's target and what gives it away).
function hiddenKeys() {
  const st = runner.state();
  return st.phase === 'question' && !st.explore ? st.item.hide : [];
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  const st = runner.state();
  const s = runner.summary();
  let y = K.title('Duct System Pressure Explorer');
  const left = FP.msg.score('Challenges', s.firstAttempt, ITEMS.length);   // first-attempt count (spec)
  const right = st.explore ? FP.msg.EXPLORE + ' (not scored)'
    : 'Challenge ' + (st.index + 1) + ' of ' + ITEMS.length;
  y = K.statusLine(left, right, null, { y: y - 2 });

  const sys = systemAt(airflowSlider.value());
  const hidden = hiddenKeys();
  const schemTop = y + 50;                  // room for the stack above the duct
  const schemBottom = drawSchematic(schemTop);
  const panelsBottom = drawReadouts(schemBottom + 6, sys, hidden);
  const defBottom = drawDefinition(panelsBottom + 6);
  drawChallengePanel(defBottom + 6, drawHeight - 26, st, s, sys);
  K.note(canvasWidth >= 560 ? DATA_NOTE.concat('Click a label for its definition', 'Enter: check, then next')
    : compact() ? ['Illustrative', 'standard air', 'pressures in in. wg']
      : ['Illustrative system', 'standard air', 'Enter: check, then next']);
  drawControlLabels(st, sys);
}

function drawSchematic(ductY) {
  const x = 10, w = canvasWidth - 20, h = 40;
  const highlight = RUN.findIndex(c => c.part === selectedPart);
  const ts = narrow() ? 12 : 13;
  const rects = FD.ductRun(null, { x, y: ductY, w, h, components: RUN, highlight: highlight >= 0 ? highlight : undefined,
    textSize: ts });
  hitBoxes = rects.map((r, i) => ({ key: RUN[i].part, x: r.x, y: r.y - 10, w: r.w, h: r.h + 62 }));
  // stations 1 and 2 sit at the fan inlet and outlet (segment boundaries 2 and 3)
  const segW = w / RUN.length;
  const tag = segW < 80 ? 'Stn ' : 'Station ';
  [['st1', tag + '1', x + 2 * segW], ['st2', tag + '2', x + 3 * segW]].forEach(([key, label, sx]) => {
    const on = selectedPart === key;
    push();
    stroke(on ? FP.tok('accent') : FP.tok('primary-dark'));
    strokeWeight(on ? 3 : 1.5);
    drawingContext.setLineDash([4, 3]);
    line(sx, ductY - 14, sx, ductY + h + 2);
    drawingContext.setLineDash([]);
    textSize(ts);
    textStyle(BOLD);
    const tw = textWidth(label) + 10;
    fill(255);
    rect(sx - tw / 2, ductY - 34, tw, 20, 4);
    noStroke();
    fill(FP.tok('primary-dark'));
    textAlign(CENTER, CENTER);
    text(label, sx, ductY - 24);
    pop();
    hitBoxes.push({ key, x: sx - tw / 2 - 2, y: ductY - 36, w: tw + 4, h: 24 });
  });
  return ductY + h + 26 + 16;               // below the size labels
}

// Signed pressure: "−1.20", "+2.00" (sign kept, as the chapter writes station pressures)
function signed(v, plus) {
  const r = M.round(v, 2);
  const s = FP.fmt.num(Math.abs(r), 2);
  return r < 0 ? '−' + s : (plus && r > 0 ? '+' + s : s);
}

function drawReadouts(top, sys, hidden) {
  const n = narrow();
  const gap = 6, pw = (canvasWidth - 20 - 2 * gap) / 3;
  const rowH = n ? 17 : 19, fs = n ? 12 : 14;
  const panels = [
    { title: n ? 'Station 1' : 'Station 1 (fan inlet)', sub: n ? '4.00 ft²' : '24 × 24 in. · 4.00 ft²', rows: [
      ['V', 'v1', FP.fmt.num(M.round(sys.v1, -1)), 'fpm'],
      ['VP', 'vp1', signed(sys.vp1), 'in. wg'],
      ['SP', 'sp1', signed(sys.sp1, true), 'in. wg'],
      ['TP', 'tp1', signed(sys.tp1, true), 'in. wg']] },
    { title: 'Fan', sub: FP.fmt.cfm(sys.q), rows: [
      ['FTP', 'ftp', signed(sys.ftp), 'in. wg'],
      ['FSP', 'fsp', signed(sys.fsp), 'in. wg'],
      ['AHP', 'ahp', FP.fmt.num(sys.ahp, 2), 'hp']] },
    { title: n ? 'Station 2' : 'Station 2 (fan outlet)', sub: n ? '2.78 ft²' : '20 × 20 in. · 2.78 ft²', rows: [
      ['V', 'v2', FP.fmt.num(M.round(sys.v2, -1)), 'fpm'],
      ['VP', 'vp2', signed(sys.vp2), 'in. wg'],
      ['SP', 'sp2', signed(sys.sp2, true), 'in. wg'],
      ['TP', 'tp2', signed(sys.tp2, true), 'in. wg']] }
  ];
  const ph = 8 + 2 * rowH + 4 * rowH + 4;
  panels.forEach((p, i) => {
    const px = 10 + i * (pw + gap);
    K.panel(px, top, pw, ph, i === 1 ? { fill: '--fp-primary-bg', stroke: '--fp-border' } : {});
    noStroke();
    textAlign(LEFT, TOP);
    textSize(fs);
    textStyle(BOLD);
    fill(FP.tok('text'));
    text(p.title, px + 8, top + 6);
    textStyle(NORMAL);
    textSize(Math.max(12, fs - 1));
    fill(FP.tok('text-muted'));
    text(p.sub, px + 8, top + 6 + rowH);
    textSize(fs);
    const valX = px + (n ? 38 : 46);
    p.rows.forEach((r, j) => {
      const yy = top + 8 + (2 + j) * rowH;
      const hide = hidden.indexOf(r[1]) >= 0;
      textStyle(BOLD);
      fill(FP.tok('text'));
      textAlign(LEFT, TOP);
      text(r[0], px + 8, yy);
      textStyle(NORMAL);
      fill(hide ? FP.tok('text-muted') : FP.tok('primary-dark'));
      const unit = compact() && r[3] === 'in. wg' ? '' : ' ' + r[3];
      text(hide ? '?' : r[2] + unit, valX, yy);
    });
  });
  return top + ph;
}

function drawDefinition(top) {
  const w = canvasWidth - 20;
  const p = PARTS.find(x => x.key === selectedPart);
  const msg = p ? p.name + ': ' + p.def
    : 'Click a label in the schematic, or use "Definition of…", to read what each part is.';
  const fs = narrow() ? 13 : 14;
  textSize(fs);
  const lines = K.countLines(msg, w - 16);
  const h = lines * Math.round(fs * 1.3) + 10;
  K.panel(10, top, w, h, p ? { fill: '--fp-primary-bg', stroke: '--fp-primary' } : {});
  noStroke();
  fill(p ? FP.tok('text') : FP.tok('text-muted'));
  if (p) textStyle(NORMAL);
  K.wrapText(msg, 18, top + 5, w - 16, Math.round(fs * 1.3));
  return top + h;
}

function drawChallengePanel(top, bottom, st, s, sys) {
  const x = 10, w = canvasWidth - 20;
  K.panel(x, top, w, bottom - top);
  const tx = x + 10, tw = w - 20;
  const maxH = bottom - top - 14;
  const ts = K.fitTextSize(t => panelContent(tx, top + 7, tw, t, st, s, sys, true) - (top + 7), maxH, 16, 12);
  panelContent(tx, top + 7, tw, ts, st, s, sys, false);
}

// Draws (or, with dry, measures) the challenge or Explore text; returns the y below it.
function panelContent(x, y, w, ts, st, s, sys, dry) {
  const lead = Math.round(ts * 1.3);
  const gap = 5;
  textSize(ts);
  noStroke();
  textAlign(LEFT, TOP);
  const para = (str, col, bold) => {
    textStyle(bold ? BOLD : NORMAL);
    if (!dry) fill(col);
    y = K.wrapText(str, x, y, w, lead, { dryRun: dry }) + gap;
    textStyle(NORMAL);
  };
  if (!st.explore) {
    para('Challenge ' + (st.index + 1) + ' of ' + ITEMS.length +
      (st.phase === 'question' ? ' · ' + st.attemptLabel : ''), FP.tok('text'), true);
    para(st.item.prompt + ' ' + st.item.question, FP.tok('text'), false);
    if (feedback && feedback.message) {
      const msg = (feedback.kind === 'info' ? 'ℹ ' : '') + feedback.message;
      const h = K.countLines(msg, w - 16) * lead + 10;
      if (!dry) {
        const ok = feedback.kind === 'ok', bad = feedback.kind === 'bad';
        K.panel(x - 4, y - 2, w + 8, h, {
          fill: ok ? '--fp-correct-bg' : (bad ? '--fp-incorrect-bg' : '--fp-info-bg'),
          stroke: ok ? '--fp-correct' : (bad ? '--fp-incorrect' : '--fp-border'),
          dashed: bad, weight: ok || bad ? 2 : 1, radius: 6
        });
        fill(ok ? FP.tok('correct') : (bad ? FP.tok('incorrect') : FP.tok('text')));
        K.wrapText(msg, x + 4, y + 3, w - 16, lead);
      }
      y += h + gap;
    }
    if (worked) para(worked, FP.tok('text'), false);
    if (!feedback) para(st.exploreLabel + ' The airflow slider is locked until then.', FP.tok('text-muted'), false);
  } else {
    para(s.lines[0], FP.tok('text'), true);
    para(s.lines[1], s.mastered ? FP.tok('primary-dark') : FP.tok('text'), s.mastered);
    const r = sys.q / Q_BASE;
    para('Compared with 10,000 CFM: airflow × ' + FP.fmt.num(r, 2) + ', FTP × ' + FP.fmt.num(r * r, 2) +
      ', air power × ' + FP.fmt.num(r * r * r, 2) + '.', FP.tok('text'), false);
    para('Move the airflow. SP1 stays negative and TP1 is always smaller in magnitude than SP1. ' +
      'From 5,000 to 10,000 CFM, FTP rises 4 times and air power 8 times.', FP.tok('text-muted'), false);
  }
  return y - gap;
}

function drawControlLabels(st, sys) {
  const n = narrow();
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(n ? 14 : 16);
  fill(FP.tok('text'));
  if (!st.explore) {
    const mid = K.controlRow(0) + (answerInput.elt.offsetHeight || 28) / 2;
    text('Your answer:', 10, mid);
    text(st.item.unit, (n ? 100 : 112) + (answerInput.elt.offsetWidth || 100) + 6, mid);
  } else {
    textSize(n ? 13 : 15);
    fill(FP.tok('text-muted'));
    text(FP.msg.EXPLORE + ': move the airflow slider.', 10, K.controlLabel(0));
  }
  textSize(n ? 14 : 16);
  fill(st.explore ? FP.tok('text') : FP.tok('text-muted'));
  text('Airflow: ' + FP.fmt.cfm(sys.q), 10, K.controlLabel(2) + 2);
}

// ---------- Responsive sizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}

function updateCanvasSize() {
  canvasWidth = K.updateCanvasSize(320);
}
