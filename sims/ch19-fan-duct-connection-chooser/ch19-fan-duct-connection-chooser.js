// Fan-to-Duct Connection Chooser - p5.js MicroSim (FanPedia shared kit: FP.CardDeck, FP.p5)
// CANVAS_HEIGHT: 564
// Eight illustrative job descriptions, in a fixed order, each answered with one of seven
// connection or inlet box options: bolted flange connection, slip connection, flexible
// connector, tube adapter and rubber sleeve, bolt-on inlet box, free-standing inlet box,
// inlet box horn. One scored submission per job; option definitions can be opened at any
// time (exploration, not evidence). Facts: FanPedia pp. 67, 126, 127, 131, 132, 141, 142, 143,
// 187, 194 and chapter 19 "Connecting the Fan to the Duct".
// Needs ../shared-libs/fanpedia-core.js and fanpedia-p5.js (see main.html).

const K = FP.p5;
const SIM_ID = 'ch19-fan-duct-connection-chooser';
let canvasWidth = 800;
let drawHeight = 440;
let controlHeight = K.controlHeightFor(3);
const margin = 10;

const PROMPT = 'How should this fan connect?';
const MASTERY = 7;
const REVIEW = 'Review the sections on the items you missed.';
const NOTE_FULL = ['Illustrative jobs', 'Source: FanPedia pp. 67–194', 'Keys: 1–7 choose, D definition, Enter submit / next'];
const NOTE_SHORT = ['Illustrative jobs', 'Keys: 1–7, D, Enter'];

// Options and the definitions the learner can open (chapter 19 wording).
const OPTIONS = [
  { name: 'Bolted flange connection',
    def: 'Two mating flanges joined by bolts through matching hole patterns, usually with a gasket between them. Rigid and airtight; the normal joint between a fan flange and a companion flange on the duct.' },
  { name: 'Slip connection',
    def: 'A collar slid over or into a mating collar or pipe and sealed, typically with a rubber sleeve held by clamps. The sleeve flexes, so it tolerates small misalignment and movement.' },
  { name: 'Flexible connector',
    def: 'A short section of flexible material joining the fan inlet or outlet to the duct. Reduces vibration transmission and allows some misalignment; required on all isolated fans.' },
  { name: 'Tube adapter and rubber sleeve',
    def: 'A 4-inch metal collar and flange bolted to a pressure blower discharge, plus a 6-inch, 2-ply rubber slip sleeve with two hose clamps. Rated up to 5 psi and 180°F.' },
  { name: 'Bolt-on inlet box',
    def: "A detached inlet box bolted directly to the fan's inlet flange, on a single base angle with gussets and a reinforcement plate. TCF's preferred inlet box design." },
  { name: 'Free-standing inlet box',
    def: 'A detached inlet box mounted separately from the fan and fully supported at the floor. It joins the fan with a bolted round outlet flange or a slip collar.' },
  { name: 'Inlet box horn',
    def: 'An extension on an integral inlet box that carries the inlet connection out past the fan. Used when the inlet and discharge airflows would intersect.' }
];
const O = Object.fromEntries(OPTIONS.map(o => [o.name, o.name]));

// Spec Rules: the tube adapter sleeve is acceptable when pressure <= 5 psi and temperature <= 180°F.
const SLEEVE = { psi: 5, degF: 180 };
function sleeveOK(job) { return job.psi <= SLEEVE.psi && job.degF <= SLEEVE.degF; }

// Jobs, fixed order (items 3 and 4 back to back). accepted = every correct option.
const JOBS = [
  { n: 1, text: 'A centrifugal fan sits on a spring isolation base. Its outlet joins rectangular ductwork.',
    accepted: [O['Flexible connector']],
    why: 'Flex connectors are required on all isolated fans to block vibration and allow misalignment.' },
  { n: 2, text: 'A free-standing inlet box sits on grade; the fan is on an isolation base, so they are on different planes.',
    accepted: [O['Slip connection'], O['Flexible connector']],
    why: 'FanPedia requires a flex connector, as a slip connection, between a fan and inlet box on different planes.' },
  { n: 3, psi: 3, degF: 150,
    text: 'A pressure blower discharges into a pipe line at 3 psi and 150°F. The plant wants vibration and noise kept out of the piping.',
    why: 'The rubber sleeve isolates vibration and noise and is rated up to 5 psi and 180°F, so 3 psi and 150°F are within it.' },
  { n: 4, psi: 3, degF: 220,
    text: 'The same blower and pipe line, but the airstream is 220°F. The pipe flange is a 125# ASA flange of the same size.',
    why: "220°F exceeds the sleeve's 180°F rating, so bolt the blower to the matching 125# ASA pipe flange instead.",
    extraIf: { chosen: O['Tube adapter and rubber sleeve'], text: "Check the temperature against the sleeve's 180°F rating." } },
  { n: 5, text: "Ductwork must turn 90 degrees into the fan in a tight space, and the box should bolt directly to the fan's inlet flange.",
    accepted: [O['Bolt-on inlet box']],
    why: "The bolt-on box bolts to the fan inlet flange and is TCF's preferred inlet box design." },
  { n: 6, text: 'The inlet box must be fully supported at the floor, separate from the fan.',
    accepted: [O['Free-standing inlet box']],
    why: 'A free-standing box is mounted separately and fully supported at the floor.' },
  { n: 7, text: "An integral inlet box is specified, but the inlet duct would cross the path of the fan's discharge airflow.",
    accepted: [O['Inlet box horn']],
    why: 'Horns are used when inlet and discharge airflows would intersect, so the duct connects without interference.' },
  { n: 8, text: "A free-standing inlet box and its fan share one rigid base on the same plane. The box outlet must join the fan's inlet flange.",
    accepted: [O['Bolted flange connection']],
    why: "The free-standing box's round outlet flange is available only with the bolted connection." }
].map(j => {
  // Pipe-line jobs are judged by the sleeve rating; the alternative is the matching 125# ASA bolted flange.
  if (j.psi != null) j.accepted = [sleeveOK(j) ? O['Tube adapter and rubber sleeve'] : O['Bolted flange connection']];
  return Object.assign(j, { id: 'job-' + j.n, answerText: j.accepted.join(' or ') });
});

function incorrectText(res) {
  const job = res.card;
  let t = FP.msg.BAD + ' Not this one. ' + job.why + ' Accepted answer' + (job.accepted.length > 1 ? 's: ' : ': ') +
    job.answerText + '.';
  if (job.extraIf && res.chosen === job.extraIf.chosen) t += ' ' + job.extraIf.text;
  return t;
}

// Engine: fixed order, one scored submission per job; spec wording replaces the kit defaults.
const deck = new FP.CardDeck({
  cards: JOBS, shuffle: false, attempts: 1, retryMissed: false,
  noun: 'Items', mastery: MASTERY, reviewPointer: REVIEW, id: SIM_ID,
  check: (job, choice) => job.accepted.includes(choice),
  messages: {
    correct: res => FP.msg.OK + ' Correct. ' + res.card.why,
    missed: incorrectText
  }
});

let selected = null;    // option name chosen for the current job (not yet submitted)
let defShown = null;    // option whose definition is open
let lastRes = null;     // the current job's scored result
let notice = '';        // e.g. "Select an option first."
let answers = [];       // per job: {chosen, correct}

let optionButtons = [];
let defButton, submitButton, nextButton, startButton;
let lay = null;

const keys = K.keys.bind({
  '1': () => choose(0), '2': () => choose(1), '3': () => choose(2), '4': () => choose(3),
  '5': () => choose(4), '6': () => choose(5), '7': () => choose(6),
  d: toggleDefinition, Enter: enterKey
});
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight, margin });
  const canvas = createCanvas(canvasWidth, drawHeight + controlHeight);
  canvas.parent(document.querySelector('main'));

  OPTIONS.forEach((o, i) => {
    const b = K.button((i + 1) + '. ' + o.name, () => choose(i));
    b.addClass('choice');
    b.addClass('fdcc-opt');
    b.attribute('aria-pressed', 'false');
    b.attribute('aria-keyshortcuts', String(i + 1));
    optionButtons.push(b);
  });
  defButton = K.button('Definition', toggleDefinition, { variant: 'secondary' });
  defButton.addClass('secondary');
  defButton.attribute('aria-keyshortcuts', 'D');
  submitButton = K.button('Submit', submit);
  nextButton = K.button('Next', advance);
  startButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });
  startButton.addClass('secondary');

  // Buttons whose label changes get the width of their longest label, so the rows never re-wrap.
  for (const [b, labels] of [[defButton, ['Definition', 'Hide definition']], [nextButton, ['Next', 'See summary']]]) {
    let wMax = 0;
    for (const t of labels) { b.html(t); wMax = max(wMax, b.elt.offsetWidth); }
    b.style('min-width', wMax + 'px');
  }

  relayout();
  updateControls();
  describe('Fan-to-Duct Connection Chooser. Eight job descriptions appear in a fixed order. For each, select ' +
    'one of seven options (bolted flange connection, slip connection, flexible connector, tube adapter and ' +
    'rubber sleeve, bolt-on inlet box, free-standing inlet box, inlet box horn) and press Submit. The ' +
    'Definition button opens the definition of the selected option. Each job is scored on its first ' +
    'submission; feedback gives the reason. After job 8 a summary lists every answer and the accepted answers.');
  FP.announce('Job 1 of 8. ' + JOBS[0].text + ' ' + PROMPT);
}

// ---------- Layout ----------

function metrics() {
  const narrow = canvasWidth < 520;
  return { pad: 12, body: narrow ? 14 : 16, small: narrow ? 13 : 15, head: narrow ? 15 : 17, narrow };
}

function linesH(str, w, size, lh) {
  textSize(size);
  textStyle(NORMAL);
  return K.countLines(str, w) * lh;
}

// Geometry from the width only: the job panel reserves room for the longest job plus its longest
// feedback, and the definition panel for the longest definition, so nothing jumps between jobs.
function computeLayout() {
  const m = metrics();
  const w = canvasWidth - 2 * margin;
  const inner = w - 2 * m.pad;
  textSize(15);
  const promptH = K.countLines(PROMPT, w) * 19;
  const statusTop = 40 + promptH + 2;
  textStyle(BOLD);
  const lw = textWidth('Correct: 8 of 8');
  textStyle(NORMAL);
  const rw = textWidth('Job 8 of 8 · one scored submission');
  const statusH = lw + 16 + rw <= w ? 21 : 42;
  const jobTop = statusTop + statusH + 4;
  let maxText = 0, maxFb = 0, maxDef = 0;
  for (const j of JOBS) {
    maxText = max(maxText, linesH(j.text, inner, m.body, m.body + 5));
    let worst = FP.msg.BAD + ' Not this one. ' + j.why + ' Accepted answers: ' + j.answerText + '.';
    if (j.extraIf) worst += ' ' + j.extraIf.text;
    maxFb = max(maxFb, linesH(worst, inner - 8, m.small, m.small + 5));
  }
  for (const o of OPTIONS) maxDef = max(maxDef, linesH(o.def, inner, m.small, m.small + 5));
  const jobH = m.pad + m.head + 8 + maxText + 8 + 22 + maxFb + 10 + m.pad;
  const defTop = jobTop + jobH + 8;
  const defH = 10 + m.small + 8 + maxDef + 10;
  return { m, w, inner, statusTop, jobTop, jobH, defTop, defH, drawH: defTop + defH + 26 };
}

function relayout() {
  lay = computeLayout();
  drawHeight = lay.drawH;
  K.config({ drawHeight, controlHeight, margin });
  const rows = positionControls();
  const ch = K.controlHeightFor(rows);
  if (ch !== controlHeight || height !== drawHeight + controlHeight || width !== canvasWidth) {
    controlHeight = ch;
    K.config({ drawHeight, controlHeight, margin });
    resizeCanvas(canvasWidth, drawHeight + controlHeight);
  }
}

// Options flow from row 0; the action buttons start on a fresh row. Returns the rows used.
function positionControls() {
  const r = K.flowButtons(0, optionButtons, { gap: 6 });
  return K.flowButtons(r, [defButton, '|', submitButton, nextButton, '|', startButton]);
}

// ---------- Drawing ----------

function draw() {
  K.regions(drawHeight, controlHeight);
  K.title('Fan-to-Duct Connection Chooser');
  noStroke();
  fill(FP.tok('text-muted'));
  textSize(15);
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
  K.wrapText(PROMPT, margin, 40, lay.w, 19);
  const st = deck.state();
  const right = st.phase === 'summary' ? 'All 8 jobs done' : 'Job ' + (st.index + 1) + ' of 8 · one scored submission';
  K.statusLine(scoreLabel(), right, null, { y: lay.statusTop });

  if (st.phase === 'summary') drawSummary();
  else { drawJob(st); drawDefinition(); }

  textSize(13);
  K.note(textWidth(FP.msg.note(...NOTE_FULL)) <= lay.w ? NOTE_FULL : NOTE_SHORT);
}

function scoreLabel() {
  return 'Correct: ' + deck.summary().firstAttempt + ' of ' + JOBS.length;
}

function drawJob(st) {
  const { m, inner } = lay;
  const x = margin, y = lay.jobTop, w = lay.w;
  K.panel(x, y, w, lay.jobH, { fill: '--fp-ctrl-bg', stroke: '--fp-primary', weight: 2 });
  noStroke();
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(m.head);
  fill(FP.tok('primary-dark'));
  text('Job ' + st.card.n, x + m.pad, y + m.pad);
  textStyle(NORMAL);
  textSize(m.body);
  fill(FP.tok('text'));
  let yy = K.wrapText(st.card.text, x + m.pad, y + m.pad + m.head + 8, inner, m.body + 5) + 8;
  textSize(m.small);
  if (st.phase === 'feedback' && lastRes) {
    const ok = lastRes.status === 'correct';
    K.panel(x + 6, yy, w - 12, y + lay.jobH - 6 - yy, {
      fill: ok ? '--fp-correct-bg' : '--fp-incorrect-bg', stroke: ok ? '--fp-correct' : '--fp-incorrect',
      dashed: !ok, weight: 2, radius: 6
    });
    noStroke();
    fill(FP.tok('text-muted'));
    text('Your answer: ' + lastRes.chosen, x + m.pad + 2, yy + 6);
    fill(FP.tok(ok ? 'correct' : 'incorrect'));
    K.wrapText(lastRes.message, x + m.pad + 2, yy + 28, inner - 8, m.small + 5);
  } else {
    fill(FP.tok(notice ? 'primary-dark' : 'text-muted'));
    const msg = notice ? 'ℹ ' + notice
      : selected ? 'Selected: ' + selected + '. Press Submit (Enter) to lock it in.'
        : 'Select one option below, then press Submit. Definition opens the selected option\'s definition.';
    K.wrapText(msg, x + m.pad, yy, inner, m.small + 5);
  }
}

function drawDefinition() {
  const { m, inner } = lay;
  const x = margin, y = lay.defTop, w = lay.w;
  // Info panel: dotted border (the kit's .fp-feedback.info look)
  push();
  fill(FP.tok('info-bg'));
  stroke(FP.tok('text-muted'));
  strokeWeight(1);
  drawingContext.setLineDash([2, 3]);
  rect(x, y, w, lay.defH, 6);
  pop();
  noStroke();
  textAlign(LEFT, TOP);
  textSize(m.small);
  textStyle(BOLD);
  fill(FP.tok('text'));
  const o = defShown != null ? OPTIONS[defShown] : null;
  text(o ? 'ℹ Definition: ' + o.name : 'ℹ Definitions', x + m.pad, y + 10);
  textStyle(NORMAL);
  fill(FP.tok(o ? 'text' : 'text-muted'));
  K.wrapText(o ? o.def : 'Select an option and press Definition (or D) to read what it is. Opening definitions is not scored.',
    x + m.pad, y + 10 + m.small + 8, inner, m.small + 5);
}

function drawSummary() {
  const { m } = lay;
  const x = margin, y = lay.jobTop, w = lay.w;
  const h = lay.defTop + lay.defH - y;
  K.panel(x, y, w, h, { fill: '--fp-ctrl-bg', stroke: '--fp-primary', weight: 1 });
  noFill();
  stroke(FP.tok('primary'));
  rect(x + 3, y + 3, w - 6, h - 6, 6);
  noStroke();
  const s = deck.summary();
  const inner = w - 2 * m.pad;
  const head = s.mastered ? FP.msg.OK + ' Mastery: 7 or more of 8' : REVIEW;
  // One row per job: number, verdict, your answer, accepted answers. Text shrinks to fit.
  const rows = JOBS.map((j, i) => {
    const a = answers[i] || {};
    return { ok: a.correct, t: j.n + '. ' + (a.correct ? FP.msg.OK : FP.msg.BAD) + ' Your answer: ' + (a.chosen || '—') +
      ' · Accepted: ' + j.answerText };
  });
  const layoutAt = (ts, dry) => {
    let yy = y + m.pad;
    textAlign(LEFT, TOP);
    textStyle(BOLD);
    textSize(ts + 2);
    fill(FP.tok('text'));
    if (!dry) text(scoreLabel(), x + m.pad, yy);
    yy += ts + 8;
    textSize(ts);
    fill(FP.tok(s.mastered ? 'correct' : 'text'));
    yy = K.wrapText(head, x + m.pad, yy, inner, ts + 4, { dryRun: dry }) + 6;
    textStyle(NORMAL);
    for (const r of rows) {
      fill(FP.tok(r.ok ? 'text' : 'incorrect'));
      yy = K.wrapText(r.t, x + m.pad, yy, inner, ts + 4, { dryRun: dry }) + 3;
    }
    fill(FP.tok('text-muted'));
    yy = K.wrapText('Press Start over to clear all answers.', x + m.pad, yy + 4, inner, ts + 4, { dryRun: dry });
    return yy - y;
  };
  const ts = K.fitTextSize(t => layoutAt(t, true), h - m.pad, m.small, 12);
  layoutAt(ts, false);
}

// ---------- Actions ----------

function choose(i) {
  if (deck.state().phase !== 'choose') return;
  selected = OPTIONS[i].name;
  notice = '';
  updateControls();
  FP.announce('Selected ' + selected + '. Press Submit, or D for its definition.');
  submitButton.elt.focus();   // Enter now submits; Tab and Shift+Tab reach the options
}

function toggleDefinition() {
  if (deck.state().phase === 'summary') return;
  const i = selected ? OPTIONS.findIndex(o => o.name === selected) : -1;
  if (i < 0) {
    if (deck.state().phase === 'choose') { notice = 'Select an option first, then press Definition.'; FP.announce(notice); }
    return;
  }
  defShown = defShown === i ? null : i;
  updateControls();
  FP.announce(defShown == null ? 'Definition closed.' : OPTIONS[i].name + ': ' + OPTIONS[i].def);
}

function submit() {
  const st = deck.state();
  if (st.phase !== 'choose') return;
  if (!selected) {
    notice = 'Select an option first, then press Submit.';
    FP.announce(notice);
    return;
  }
  const res = deck.place(selected);
  if (res.status === 'ignored') return;
  lastRes = res;
  answers[st.index] = { chosen: selected, correct: res.status === 'correct' };
  updateControls();
  FP.announce(res.message + ' ' + scoreLabel() + '.');
  nextButton.elt.focus();
}

function advance() {
  if (!deck.next()) return;
  selected = null; lastRes = null; notice = ''; defShown = null;
  updateControls();
  const st = deck.state();
  if (st.phase === 'summary') {
    const s = deck.summary();
    FP.announce('Summary. ' + scoreLabel() + '. ' + (s.mastered ? 'Mastery: 7 or more of 8.' : REVIEW) + ' ' +
      JOBS.map((j, i) => 'Job ' + j.n + ': ' + (answers[i].correct ? 'correct' : 'missed, accepted ' + j.answerText)).join('; ') + '.');
    startButton.elt.focus();
  } else {
    FP.announce('Job ' + (st.index + 1) + ' of 8. ' + st.card.text);
    optionButtons[0].elt.focus();
  }
}

function startOver() {
  deck.newRound();
  selected = null; lastRes = null; notice = ''; defShown = null; answers = [];
  updateControls();
  FP.announce('Started over. Job 1 of 8. ' + JOBS[0].text);
  optionButtons[0].elt.focus();
}

function enterKey() {
  const st = deck.state();
  if (st.phase === 'choose') submit();
  else if (st.phase === 'feedback') advance();
}

function updateControls() {
  if (!startButton) return;
  const st = deck.state();
  const had = document.activeElement;
  const summary = st.phase === 'summary';
  const shown = st.phase === 'feedback' && lastRes ? lastRes.chosen : selected;
  optionButtons.forEach((b, i) => {
    const on = OPTIONS[i].name === shown;
    b.attribute('aria-pressed', on ? 'true' : 'false');
    K.setEnabled(b, st.phase === 'choose');
  });
  K.setEnabled(defButton, !summary && selected != null);
  defButton.html(defShown != null ? 'Hide definition' : 'Definition');
  K.setEnabled(submitButton, st.phase === 'choose' && selected != null);
  K.setEnabled(nextButton, st.phase === 'feedback');
  nextButton.html(st.isLast ? 'See summary' : 'Next');
  relayout();
  K.keepFocus(had, [submitButton, nextButton, defButton, ...optionButtons, startButton]);
}

function windowResized() {
  updateCanvasSize();
  relayout();
}

function updateCanvasSize() {
  canvasWidth = K.updateCanvasSize(320);
}
