// Motor Enclosure Selector
// CANVAS_HEIGHT: 545
// Learners recommend a motor enclosure (ODP, TEFC, TEAO, TENV, EXPL) for ten
// illustrative fan jobs. Only the first choice on each job is scored; wrong
// choices can be followed by further unscored tries until the accepted answer is found.
// Built on the FanPedia kit: FP.CardDeck (jobs, first-try score, mastery, unscored
// practice tries), FP.p5 (layout, text, controls, keys), FD (motor drawing, air arrows).
// Enclosure facts: FanPedia p. 73 (Motor Specifications: Enclosure and Intended Duty).

const K = FP.p5;
const SIM_ID = 'ch14-motor-enclosure-selector';
let canvasWidth = 800;
const drawHeight = 430;
const controlHeight = K.controlHeightFor(3);   // 115: enclosure buttons, card + navigation, keys
const canvasHeight = drawHeight + controlHeight;
const MASTERY = 8;
const PROMPT = 'Which motor enclosure would you recommend for this job?';

// Five reference cards (spec Content, FanPedia p. 73).
const ENCLOSURES = {
  ODP: { name: 'Open drip proof', facts: [
    'Internal fan blows the surrounding air across the windings.',
    'Not for dirty or wet atmospheres.',
    'IP22 · general duty.'] },
  TEFC: { name: 'Totally enclosed fan cooled', facts: [
    'Sealed windings; an external fan blows air over the frame.',
    'IP44, IP54, IP55, IP56.',
    'General duty, severe duty, IEEE 45, IEEE 841.'] },
  TEAO: { name: 'Totally enclosed air over', facts: [
    'Sealed, with no fan of its own.',
    'Cooled by the fan\'s airstream: the motor sits in the air stream.'] },
  TENV: { name: 'Totally enclosed non-ventilated', facts: [
    'Sealed, no fan; heat leaves through the frame only.',
    'Runs hotter; usually a larger frame.',
    'IP56.'] },
  EXPL: { name: 'Explosion proof', facts: [
    'External fan; interior built so an internal arc or explosion cannot ignite a flammable surrounding atmosphere.',
    'DFG duty, for the NEC group · IP55.'] }
};
const CODES = Object.keys(ENCLOSURES);

// Ten jobs (illustrative), fixed order. accepted = spec "Accepted" set.
const JOBS = [
  { text: 'Belt-driven Arrangement 9 supply fan; motor in a clean, dry, indoor mechanical room.', short: 'Clean, dry indoor supply fan',
    accepted: ['ODP', 'TEFC'], why: 'The air around the motor is clean and dry, so ODP is acceptable; TEFC also works but is not required.' },
  { text: 'Belt-driven exhaust fan on a roof; motor exposed to rain and blowing dust.', short: 'Rooftop exhaust, rain and dust',
    accepted: ['TEFC'], why: 'Wet and dirty air would pass through an ODP motor\'s windings; TEFC keeps the windings sealed.' },
  { text: 'Direct-drive vaneaxial fan; motor inside the housing, cooled by the air the fan moves.', short: 'Vaneaxial, motor in housing',
    accepted: ['TEAO'], why: 'A motor in the fan\'s own airstream is cooled by that air, which is what TEAO is built for.' },
  { text: 'Belt-driven fan whose motor is mounted in the fan\'s air stream.', short: 'Belt drive, motor in air stream',
    accepted: ['TEAO'], why: 'FanPedia lists the air stream of a belt-driven fan or blower as a TEAO location.' },
  { text: 'Textile plant where lint would clog an external fan cover; the customer accepts a larger frame.', short: 'Textile plant, lint',
    accepted: ['TENV'], why: 'TENV has no fan or fan cover to clog; the cost is a hotter motor in a larger frame.' },
  { text: 'Exhaust from a solvent paint spray room; the area around the motor is classified for flammable gases and vapors.', short: 'Paint spray room, gases',
    accepted: ['EXPL'], why: 'A classified hazardous location for gases needs an explosion-proof (DFG) motor for its NEC group.' },
  { text: 'Grain-handling area classified as a hazardous location for combustible dust.', short: 'Grain handling, dust',
    accepted: ['EXPL'], why: 'Combustible dust locations are NEC hazardous locations; the motor must be explosion proof for the dust group.' },
  { text: 'Paper mill process fan; the specification calls for IEEE 841 motors.', short: 'Paper mill, IEEE 841',
    accepted: ['TEFC'], why: 'FanPedia maps IEEE 841 duty to the TEFC enclosure (IP56).' },
  { text: 'Metric specification: IP55, general purpose, non-hazardous area.', short: 'IP55, non-hazardous',
    accepted: ['TEFC'], why: 'IP55 maps to TEFC or EXPL; with no hazardous location, TEFC is the right choice and EXPL adds needless cost.' },
  { text: 'Metric specification: IP22, clean indoor location.', short: 'IP22, clean indoor',
    accepted: ['ODP'], why: 'IP22 is the metric equivalent of ODP in FanPedia\'s table.' }
].map((j, i) => Object.assign(j, { id: 'job-' + (i + 1), answer: j.accepted[0], answerText: j.accepted.join(' or ') }));


// Wrong-choice hints name the mix-up (what the chosen enclosure is for), never the answer.
// Jobs 2, 5, 6 and 7 name wet, dirty, lint or hazardous air; jobs 3 and 4 name an air stream.
const AIR_JOBS = ['job-2', 'job-5', 'job-6', 'job-7'];
const HAZARD_JOBS = ['job-6', 'job-7'];
const STREAM_JOBS = ['job-3', 'job-4'];
function wrongText(job, choice) {
  let hint = null;
  if (choice === 'ODP' && AIR_JOBS.indexOf(job.id) >= 0) {
    hint = 'ODP lets the surrounding air pass through the motor. Check what the air around this motor carries.';
  } else if (choice === 'EXPL' && HAZARD_JOBS.indexOf(job.id) < 0) {
    hint = 'Explosion proof is for classified hazardous locations. Check whether the job names one.';
  } else if (choice === 'TEAO' && STREAM_JOBS.indexOf(job.id) < 0) {
    hint = 'TEAO has no fan of its own and depends on the fan\'s air stream. Check whether the job puts the motor in that air stream.';
  } else if (choice === 'TENV' && job.id !== 'job-5') {
    hint = 'TENV has no cooling fan and runs hotter. Check whether the job gives a reason to avoid an external fan.';
  } else if (choice === 'TEFC' && HAZARD_JOBS.indexOf(job.id) >= 0) {
    hint = 'Sealed windings alone do not make a motor safe in a classified location. Check what the area is classified for.';
  } else if (choice === 'TEFC' && STREAM_JOBS.indexOf(job.id) >= 0) {
    hint = 'TEFC carries its own external fan. Check where the job puts the motor relative to the air stream.';
  }
  return FP.msg.BAD + ' Not this one. ' + (hint || 'Reread the job and the card for the enclosure you chose.') + ' Try again.';
}
const ALSO_ODP = 'ODP would also have been acceptable here.';

function correctText(job, choice) {
  let t = FP.msg.OK + ' Correct: ' + job.why;
  if (job.accepted.length > 1 && choice !== job.accepted[0]) t += ' ' + ALSO_ODP;
  return t;
}

// One scored choice per job; afterwards unscored practice tries (at most 4 more:
// five enclosures) until the learner reaches an accepted one.
const deck = new FP.CardDeck({
  cards: JOBS, shuffle: false, attempts: 1, retryMissed: false, practiceTry: 4,
  noun: 'First-try', mastery: MASTERY, id: SIM_ID,
  check: (job, choice) => job.accepted.indexOf(choice) >= 0,
  reviewPointer: 'Reread "Motor Enclosures" and the cards for the jobs you missed, then press Start over.',
  messages: {
    correct: res => correctText(res.card, res.chosen),
    missed: res => wrongText(res.card, res.chosen)
  }
});

let tried = [];          // wrong choices on the current job (first and practice)
let solved = false;      // current job has reached an accepted choice
let feedback = null;     // {kind, text}
let firstChoice = [];    // learner's first (scored) choice per job
let openCard = '';       // reference card the learner opened ('' = closed)
let chooseButtons = {};
let cardSelect, nextButton, startOverButton;

const keys = K.keys.bind({
  '1': () => choose(CODES[0]), '2': () => choose(CODES[1]), '3': () => choose(CODES[2]),
  '4': () => choose(CODES[3]), '5': () => choose(CODES[4]),
  Enter: () => nextJob(), c: () => cycleCard()
});

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));

  CODES.forEach((code, i) => {
    const b = K.button(code, () => choose(code));
    b.addClass('choice');
    b.attribute('aria-label', code + ', ' + ENCLOSURES[code].name + ' (key ' + (i + 1) + ')');
    chooseButtons[code] = b;
  });
  cardSelect = createSelect();
  cardSelect.option('Closed', '');
  CODES.forEach(c => cardSelect.option(c + ' card', c));
  cardSelect.parent(document.querySelector('main'));
  cardSelect.attribute('aria-label', 'Open an enclosure reference card');
  cardSelect.changed(() => { openCard = cardSelect.value(); announceCard(); });
  nextButton = K.button('Next job', () => nextJob());
  startOverButton = K.button(FP.msg.START_OVER, () => startOver(), { variant: 'secondary' });

  positionControls();
  updateControls();
  describe('Motor enclosure selector. Ten illustrative fan jobs; for each, choose one of five motor enclosures ' +
    '(ODP, TEFC, TEAO, TENV, explosion proof). The first choice is scored. Reference cards describe each enclosure ' +
    'with a drawing of how it is cooled. A summary lists each job, your first choice and the accepted answer.');
}

function labelCol() { return canvasWidth < 480 ? 10 : 118; }

function positionControls() {
  const narrow = canvasWidth < 480;
  const x = labelCol();
  if (deck.state().phase === 'summary') { K.flowButtons(0, [startOverButton], { x }); return; }
  const btns = CODES.map(c => chooseButtons[c]);
  let row = K.flowButtons(0, btns, { x, gap: narrow ? 6 : 8 });
  if (narrow) row = Math.max(row, 1);
  cardSelect.position(x + (narrow ? 0 : 0), K.controlRow(row));
  const cx = x + cardSelect.elt.offsetWidth + 10;
  K.flowButtons(row, [nextButton, null, startOverButton], { x: cx, groupGap: narrow ? 8 : 16 });
}

function draw() {
  K.regions(drawHeight, controlHeight);
  let y = K.title('Motor Enclosure Selector');
  const st = deck.state();
  const right = st.phase === 'summary' ? 'Summary' : 'Job ' + (st.index + 1) + ' of ' + JOBS.length;
  y = K.statusLine(st.scoreLabel, right, null, { y: y - 4 });
  K.note(canvasWidth >= 560
    ? ['Illustrative jobs', 'Source: FanPedia p. 73', 'Keys: 1–5 choose, C reference card, Enter next job']
    : ['Illustrative jobs', 'Source: FanPedia p. 73']);

  const top = y + 2, bottom = drawHeight - 22;
  if (st.phase === 'summary') {
    K.panel(10, top, canvasWidth - 20, bottom - top);
    drawSummary(20, top + 8, canvasWidth - 40, bottom - top - 16);
  } else if (canvasWidth >= 560) {
    const leftW = Math.round((canvasWidth - 30) * 0.53);
    K.panel(10, top, leftW, bottom - top);
    K.panel(20 + leftW, top, canvasWidth - 30 - leftW, bottom - top);
    drawJobPanel(20, top + 8, leftW - 20, bottom - top - 16);
    drawCardPanel(30 + leftW, top + 8, canvasWidth - 50 - leftW, bottom - top - 16, true);
  } else {
    const cardH = 118;
    K.panel(10, top, canvasWidth - 20, bottom - top - cardH - 6);
    K.panel(10, bottom - cardH, canvasWidth - 20, cardH);
    drawJobPanel(18, top + 6, canvasWidth - 36, bottom - top - cardH - 18);
    drawCardPanel(18, bottom - cardH + 6, canvasWidth - 36, cardH - 12, false);
  }
  drawControlLabels();
}

// ---------- text helper: paragraphs {t, bold, muted, color, gap, size} ----------
function paras(list, x, y, w, ts, dry) {
  for (const p of list) {
    const s = p.size ? Math.max(12, ts + p.size) : ts;
    textSize(s);
    textStyle(p.bold ? BOLD : NORMAL);
    fill(p.color || FP.tok(p.muted ? 'text-muted' : 'text'));
    noStroke();
    textAlign(LEFT, TOP);
    y += p.gap || 0;
    y = K.wrapText(p.t, x, y, w, Math.round(s * 1.3), { dryRun: dry });
  }
  textStyle(NORMAL);
  return y;
}

function drawJobPanel(x, y, w, h) {
  const st = deck.state();
  const job = st.card;
  const head = [
    { t: 'Job ' + (st.index + 1) + ' of ' + JOBS.length + ' (illustrative)', bold: true, color: FP.tok('primary-dark'), size: -2 },
    { t: job.text, gap: 4, size: 1 },
    { t: PROMPT, bold: true, gap: 8 }
  ];
  if (tried.length) head.push({ t: 'Tried: ' + tried.map(c => FP.msg.BAD + ' ' + c).join('  '), muted: true, gap: 6 });
  if (solved) head.push({ t: 'Accepted: ' + job.accepted.join(', '), bold: true, gap: 6 });
  const fb = feedback ? [{ t: feedback.text, color: FP.tok(feedback.kind === 'ok' ? 'correct' : 'incorrect') }] : [];
  const pad = 8;
  const layout = ts => {
    let yy = paras(head, x, y, w, ts, true);
    if (fb.length) yy = paras(fb, x + pad, yy + 10 + pad, w - 2 * pad, ts, true) + pad;
    return yy - y;
  };
  const ts = K.fitTextSize(layout, h, 16, 12);
  let yy = paras(head, x, y, w, ts, false);
  if (fb.length) {
    const fbTop = yy + 10;
    const fbH = paras(fb, x + pad, fbTop + pad, w - 2 * pad, ts, true) + pad - fbTop;
    // solid border for correct, dashed for incorrect: never colour alone (✓/✗ in the text too)
    K.panel(x - 2, fbTop, w + 4, fbH, {
      fill: feedback.kind === 'ok' ? '--fp-correct-bg' : '--fp-incorrect-bg',
      stroke: feedback.kind === 'ok' ? '--fp-correct' : '--fp-incorrect',
      dashed: feedback.kind !== 'ok', weight: 2
    });
    paras(fb, x + pad, fbTop + pad, w - 2 * pad, ts, false);
  }
}

// Card shown: the one the learner opened, else (once solved) the learner's accepted choice.
function shownCard() {
  if (openCard) return openCard;
  if (solved && deck.state().phase !== 'summary') return solvedWith;
  return '';
}
let solvedWith = '';

function drawCardPanel(x, y, w, h, withSketch) {
  const code = shownCard();
  noStroke();
  textAlign(LEFT, TOP);
  if (!code) {
    const list = [
      { t: 'Reference cards', bold: true, color: FP.tok('primary-dark') },
      { t: 'Open a card with the Card list or the C key to read how an enclosure is cooled and protected.', gap: 4 },
      { t: 'Two questions settle most choices: is the area classified as hazardous, and what is in the air around the motor?', muted: true, gap: 6 }
    ];
    const ts = K.fitTextSize(t => paras(list, x, y, w, t, true) - y, h, 15, 12);
    paras(list, x, y, w, ts, false);
    return;
  }
  const e = ENCLOSURES[code];
  const by = openCard ? '' : ' (your answer)';
  const headList = [{ t: code + ': ' + e.name + by, bold: true, color: FP.tok('primary-dark') }];
  let yy = y;
  const sketchH = withSketch ? Math.min(150, Math.max(110, h * 0.42)) : 0;
  const ts0 = 15;
  yy = paras(headList, x, yy, w, ts0, false);
  if (withSketch) {
    drawMotor(code, x, yy + 4, w, sketchH);
    yy += sketchH + 8;
  }
  const facts = e.facts.map(f => ({ t: '• ' + f, gap: 2 }));
  const ts = K.fitTextSize(t => paras(facts, x, yy, w, t, true) - yy, y + h - yy, 15, 12);
  paras(facts, x, yy, w, ts, false);
}

// Side-view motor with the cooling path for each enclosure (schematic, not to scale).
function drawMotor(code, x, y, w, h) {
  const pal = FD.palette();
  const mw = Math.min(w * 0.56, 190), mh = Math.min(h * 0.42, 58);
  const mx = x + (w - mw) / 2 + 10, my = y + (h - mh) / 2 + 4;
  const frame = FD.frameAt(0, 0, 1);
  // shaft out of the drive end (left)
  push();
  stroke(pal.edge); strokeWeight(5);
  line(mx - 26, my + mh / 2, mx, my + mh / 2);
  pop();
  if (code === 'TEAO') {
    // the driven fan's blades on the shaft: the airstream comes from it
    push();
    stroke(pal.edge); strokeWeight(2); fill(pal.metal);
    ellipse(mx - 30, my + mh / 2, 10, mh * 1.4);
    pop();
  }
  FD.motor(null, { frame, x0: mx, y0: my, x1: mx + mw, y1: my + mh, label: code });
  if (code === 'EXPL') {
    // heavier frame: a second outline
    push(); noFill(); stroke(pal.motorEdge); strokeWeight(4); rect(mx - 4, my - 4, mw + 8, mh + 8, 8); pop();
  }
  const hasCover = code === 'TEFC' || code === 'EXPL';
  if (hasCover) {
    push(); fill(pal.metal); stroke(pal.edge); strokeWeight(1.5);
    rect(mx + mw, my + 6, 22, mh - 12, 0, 10, 10, 0);
    // grille slots
    stroke(pal.edge); for (let k = 0; k < 3; k++) line(mx + mw + 8 + k * 5, my + 12, mx + mw + 8 + k * 5, my + mh - 12);
    pop();
  }
  const arrow = (x1, y1, x2, y2, dashed, color) => FD.airflowArrow(null, { x1, y1, x2, y2, weight: 2.5, head: 9, dashed, color });
  const lab = (t, lx, ly, col) => { push(); noStroke(); fill(col || pal.text); textSize(13); textAlign(CENTER, TOP); text(t, lx, ly); pop(); };
  if (code === 'ODP') {
    // air in through the openings, across the windings, out opposite the drive end
    // inside the frame the path is drawn white so it reads against the motor colour
    arrow(mx + 16, my - 26, mx + 22, my - 2, false);
    arrow(mx + 22, my + 4, mx + 26, my + mh * 0.62, false, pal.white);
    arrow(mx + 32, my + mh * 0.8, mx + mw - 16, my + mh * 0.8, true, pal.white);
    arrow(mx + mw - 10, my + mh * 0.8, mx + mw + 34, my + mh * 0.8, false);
    lab('room air across the windings', x + w / 2, my + mh + 12);
  } else if (hasCover) {
    // external fan blows air along the outside of the frame only
    const off = code === 'EXPL' ? 13 : 8;
    arrow(mx + mw + 14, my - off, mx + 14, my - off, false);
    arrow(mx + mw + 14, my + mh + off, mx + 14, my + mh + off, false);
    lab(code === 'EXPL' ? 'external fan · ignition kept inside' : 'external fan, air over the frame', x + w / 2, my + mh + off + 8);
  } else if (code === 'TEAO') {
    arrow(mx - 18, my - 10, mx + mw + 30, my - 10, false);
    arrow(mx - 18, my + mh + 10, mx + mw + 30, my + mh + 10, false);
    lab('the fan\'s airstream flows over the frame', x + w / 2, my + mh + 18);
  } else if (code === 'TENV') {
    // heat leaving through the frame: wavy lines, no airflow
    push(); noFill(); stroke(pal.accent); strokeWeight(2);
    for (let k = 0; k < 4; k++) {
      const hx = mx + 22 + k * (mw - 44) / 3;
      beginShape();
      for (let t = 0; t <= 1.001; t += 0.1) vertex(hx + 4 * Math.sin(t * Math.PI * 3), my - 6 - t * 26);
      endShape();
    }
    pop();
    lab('no fan: heat leaves through the frame', x + w / 2, my + mh + 12);
  }
}

function drawSummary(x, y, w, h) {
  const s = deck.summary();
  noStroke();
  textAlign(LEFT, TOP);
  const narrow = w < 520;
  textSize(16); textStyle(BOLD); fill(FP.tok('text'));
  text('Summary', x, y);
  textStyle(NORMAL);
  const rowH = narrow ? 20 : 22;
  const ty = y + 26;
  const cols = narrow ? [0, 22, w * 0.55, w * 0.78] : [0, 30, w * 0.52, w * 0.74];
  textSize(narrow ? 12 : 14);
  textStyle(BOLD);
  fill(FP.tok('text-muted'));
  ['#', 'Job', 'First choice', 'Accepted'].forEach((t, i) => text(t, x + cols[i], ty));
  textStyle(NORMAL);
  JOBS.forEach((j, i) => {
    const yy = ty + rowH * (i + 1);
    const fc = firstChoice[i] || '—';
    const ok = j.accepted.indexOf(fc) >= 0;
    fill(FP.tok('text'));
    text(String(i + 1), x + cols[0], yy);
    text(fitText(j.short, cols[2] - cols[1] - 8), x + cols[1], yy);
    fill(FP.tok(ok ? 'correct' : 'incorrect'));
    textStyle(BOLD);
    text((ok ? FP.msg.OK : FP.msg.BAD) + ' ' + fc, x + cols[2], yy);
    textStyle(NORMAL);
    fill(FP.tok('text'));
    text(j.accepted.join(', '), x + cols[3], yy);
  });
  const ly = ty + rowH * (JOBS.length + 1) + 8;
  const lines = [{ t: s.lines[0], bold: true }, { t: s.lines[1] }];
  const ts = K.fitTextSize(t => paras(lines, x, ly, w, t, true) - ly, y + h - ly, 15, 12);
  paras(lines, x, ly, w, ts, false);
}

function fitText(t, maxW) {
  if (textWidth(t) <= maxW) return t;
  while (t.length > 3 && textWidth(t + '…') > maxW) t = t.slice(0, -1);
  return t + '…';
}

function drawControlLabels() {
  if (canvasWidth < 480 || deck.state().phase === 'summary') return;
  noStroke();
  fill(FP.tok('text'));
  textStyle(BOLD);
  textSize(15);
  textAlign(LEFT, CENTER);
  text('Recommend:', 10, K.controlLabel(0));
  text('Card:', 10, K.controlLabel(1));
  textStyle(NORMAL);
  textSize(13);
  fill(FP.tok('text-muted'));
  text('First choice on each job is scored. Further tries are allowed but not scored.', 10, K.controlLabel(2));
  textAlign(LEFT, TOP);
}

// ---------- logic ----------
function choose(code) {
  const st = deck.state();
  if (st.phase === 'summary' || solved || tried.indexOf(code) >= 0) return;
  const first = st.phase === 'choose';
  const res = deck.place(code);
  if (res.status === 'ignored') return;
  if (first) firstChoice[st.index] = code;
  if (res.status === 'correct') {
    solved = true;
    solvedWith = code;
    const text = first ? res.message : correctText(st.card, code) + ' (Not scored: only the first try counts.)';
    feedback = { kind: 'ok', text };
  } else {
    tried.push(code);
    feedback = { kind: 'bad', text: wrongText(st.card, code) + (first ? ' Your first try counts as missed.' : '') };
  }
  FP.announce('You chose ' + code + '. ' + feedback.text + (solved ? ' Accepted: ' + st.card.accepted.join(', ') + '.' : ''));
  updateControls();
}

function nextJob() {
  const st = deck.state();
  if (st.phase !== 'feedback' || !solved) return;
  const fromNext = document.activeElement === nextButton.elt;
  deck.next();
  tried = [];
  solved = false;
  solvedWith = '';
  feedback = null;
  if (deck.state().phase === 'summary') {
    const s = deck.summary();
    FP.announce('Summary. ' + s.lines.join(' '));
  } else {
    const n = deck.state();
    FP.announce('Job ' + (n.index + 1) + ' of ' + JOBS.length + '. ' + n.card.text + ' ' + PROMPT);
  }
  updateControls();
  // keyboard users land on the first enclosure button of the new job
  if (fromNext && deck.state().phase !== 'summary') chooseButtons[CODES[0]].elt.focus();
}

function startOver() {
  deck.newRound();
  tried = [];
  solved = false;
  solvedWith = '';
  feedback = null;
  firstChoice = [];
  openCard = '';
  cardSelect.selected('');
  updateControls();
  FP.announce('Started over. Job 1 of ' + JOBS.length + '. ' + JOBS[0].text + ' ' + PROMPT);
}

function cycleCard() {
  const i = openCard ? CODES.indexOf(openCard) : -1;
  openCard = i + 1 < CODES.length ? CODES[i + 1] : '';
  cardSelect.selected(openCard);
  announceCard();
}

function announceCard() {
  if (!openCard) { FP.announce('Reference card closed.'); return; }
  const e = ENCLOSURES[openCard];
  FP.announce(openCard + ' card: ' + e.name + '. ' + e.facts.join(' '));
}

function updateControls() {
  const had = document.activeElement;
  const st = deck.state();
  const summary = st.phase === 'summary';
  CODES.forEach(c => {
    const b = chooseButtons[c];
    const wrong = tried.indexOf(c) >= 0;
    const good = solved && c === solvedWith;
    b.html((wrong ? FP.msg.BAD + ' ' : good ? FP.msg.OK + ' ' : '') + c);
    K.setEnabled(b, !summary && !solved && !wrong);
    if (summary) b.hide(); else b.show();
  });
  K.setEnabled(nextButton, solved);
  nextButton.html(st.isLast ? 'Show summary' : 'Next job');
  if (summary) { nextButton.hide(); cardSelect.hide(); } else { nextButton.show(); cardSelect.show(); }
  positionControls();
  const order = CODES.map(c => chooseButtons[c].elt).concat([cardSelect.elt, nextButton.elt, startOverButton.elt]);
  K.keepFocus(had, order);
  if (solved && had && had.classList && had.classList.contains('choice')) nextButton.elt.focus();
  if (summary) startOverButton.elt.focus();
}

function keyPressed() { return keys(); }

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
