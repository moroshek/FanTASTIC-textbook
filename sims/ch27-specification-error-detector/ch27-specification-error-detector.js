// Specification Error Detector - p5.js MicroSim
// CANVAS_HEIGHT: 839
// Chapter 27: Fan Selection and Writing the Specification (Specification Review).
// The learner critiques a ten-clause draft specification for the chapter's dryer exhaust fan:
// each clause is marked acceptable or defective, and a defective clause gets one reason (a-g).
// One submission is the evidence (9 of 10 judged correctly = mastery); "Try again" clears the
// marks, keeps the order and does not change the recorded first-submission score.
// Built on the FanPedia kit: FP.Score (first-submission score and mastery), FP.msg (wording),
// FP.events (answered/completed/mastery), FP.announce, FP.p5 (layout, text, buttons, focus).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js
// (load them before this file, also in the p5.js editor).

const K = FP.p5;
const SIM_ID = 'ch27-specification-error-detector';

// ---------- Canvas layout ----------
let canvasWidth = 800;
const drawHeight = 724;
const controlHeight = K.controlHeightFor(3);
const canvasHeight = drawHeight + controlHeight;

// ---------- Content (spec "Content" table) ----------
const APPLICATION = 'Application: dryer exhaust fan, 20,000 ACFM at 12.0 in. wg, 500°F gas at sea level, ' +
  'moderately sticky, abrasive, combustible wood dust, fan on spring isolators on a mezzanine, cold start at 70°F.';
const PROMPT = 'Which clauses would you send back to the writer, and why?';
const DATA_NOTE = FP.msg.note('Illustrative worked example',
  'Sources: FanPedia pp. 110, 166, 171, 187; TCF Model RTF guide spec 23 34 16');

const REASONS = {
  a: 'duty has no air condition',
  b: 'arrangement unsuited to the temperature',
  c: 'spark-resistance type not allowed at this temperature',
  d: 'motor not sized for cold start',
  e: 'sound data in the wrong form',
  f: 'isolated fan without flex connectors',
  g: 'arrangement cannot sit directly on isolators'
};
const REASON_KEYS = Object.keys(REASONS);

const CLAUSES = [
  { text: 'Fan shall deliver 20,000 CFM at 12.0 in. wg static pressure.', answer: 'a',
    why: 'Without temperature and elevation, a bidder can rate the fan at standard air and deliver a different fan.',
    fixed: 'Fan shall deliver 20,000 ACFM at 12.0 in. wg static pressure with gas at 500°F at sea level (0.0414 lb/ft³).' },
  { text: 'Fan shall be Arrangement 4, direct drive, for 500°F gas.', answer: 'b',
    why: 'Arrangement 4 puts the motor on the fan shaft next to the hot housing; FanPedia notes high temperature ' +
      'may limit it and lists 1, 8, 9, 9F and 10 for high temperature.',
    fixed: 'Fan shall be Arrangement 9, belt drive, for 500°F gas.' },
  { text: 'Provide AMCA Type B spark-resistant construction.', answer: 'c',
    why: 'The guide specification limits Types A and B to 250°F; at 500°F only Type C applies.',
    fixed: 'Provide AMCA Type C spark-resistant construction.' },
  { text: 'Rotation and discharge: CW THD (CW 90).', answer: 'ok',
    why: 'A complete orientation code in both letter and angle form.' },
  { text: 'Motor: 60 HP, sized for the operating brake horsepower at 500°F.', answer: 'd',
    why: 'A 70°F start draws about 96 BHP; a 60 HP motor overloads.',
    fixed: 'Motor: 100 HP, sized for a 70°F start.' },
  { text: 'Sound: overall dBA at 5 ft from the fan.', answer: 'e',
    why: 'The guide specification asks for sound power in eight octave bands with an A-weighted or sone value.',
    fixed: 'Sound: sound power in eight octave bands with A-weighted overall value, per AMCA 300.' },
  { text: 'Maximum operating temperature 500°F; provide high temperature grease and bearings, shaft seal and ' +
      'shaft cooler.', answer: 'ok',
    why: 'Matches the guide specification\'s 500°F tier.' },
  { text: 'Provide 7-gauge steel scroll liner, welded in place.', answer: 'ok',
    why: 'Matches the guide specification; bolt-on liners are not acceptable.' },
  { text: 'Mount fan on spring isolators; connect ductwork directly to fan flanges.', answer: 'f',
    why: 'FanPedia states flex connectors are required on all isolated fans.',
    fixed: 'Mount fan on spring isolators; connect ductwork to fan flanges with inlet and outlet flex connectors.' },
  { text: 'Arrangement 9F, mounted directly on spring isolators.', answer: 'g',
    why: 'FanPedia says 9F is not suitable for isolators directly; use Arrangement 1 with a separate isolation base.',
    fixed: 'Arrangement 9 on an isolation base with spring isolators.' }
];
const MASTERY = 9;

function judgmentText(v) {
  if (v === 'ok') return 'Acceptable';
  return 'Defective, reason (' + v + ') ' + REASONS[v];
}

// ---------- State ----------
const score = new FP.Score({ total: CLAUSES.length, mastery: MASTERY, noun: 'Clauses' });
let submissions = 0;          // 0 until the first submission (the recorded one)
let firstCorrect = null;      // first-submission count
let results = null;           // per clause: {correct, chosen} for the latest submission
let reviewed = false;         // marks locked and results shown
let view = 'draft';           // 'draft' | 'corrected'
let page = 0;
let notice = null;            // {kind, message} for the status panel
let layoutCache = null;

// ---------- Controls ----------
let selects = [];
let submitButton, tryAgainButton, correctedButton, prevButton, nextButton;

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  const main = document.querySelector('main');

  CLAUSES.forEach((c, i) => {
    const s = createSelect();
    s.parent(main);
    s.option('Choose: acceptable or defective', '');
    s.option('Acceptable', 'ok');
    REASON_KEYS.forEach(k => s.option('Defective: (' + k + ') ' + REASONS[k], k));
    s.selected('');
    s.attribute('aria-label', 'Clause ' + (i + 1) + ' judgment: ' + c.text);
    s.addClass('sed-select');
    s.changed(() => { notice = null; });
    selects.push(s);
  });

  prevButton = K.button('◀ Previous clauses', () => turnPage(-1), { variant: 'secondary' });
  nextButton = K.button('More clauses ▶', () => turnPage(1), { variant: 'secondary' });
  submitButton = K.button('Submit review', submitReview);
  tryAgainButton = K.button('Try again', tryAgain, { variant: 'secondary' });
  correctedButton = K.button('Show corrected specification', toggleCorrected, { variant: 'secondary' });
  correctedButton.attribute('aria-pressed', 'false');

  syncControls();

  describe('Specification error detector. An application card describes a 500°F dryer exhaust fan. Ten ' +
    'draft specification clauses follow, each with a drop-down to mark it acceptable or defective with one ' +
    'of seven reasons. Submit review reveals, for every clause, whether the judgment was correct and why; ' +
    'Show corrected specification rewrites the defective clauses.');
}

// ---------- Layout of the clause list (pages) ----------
function wide() { return canvasWidth >= 620; }
function selectWidth() { return wide() ? min(330, floor(canvasWidth * 0.4)) : canvasWidth - 54; }

// Header block (title, card, prompt) height; clause area from listTop to listBottom.
function headerLayout() {
  textSize(wide() ? 14 : 13);
  const lead = wide() ? 18 : 17;
  const cardLines = K.countLines(APPLICATION, canvasWidth - 40);
  const cardY = 42;
  const cardH = cardLines * lead + 12;
  const promptY = cardY + cardH + 8;
  textStyle(BOLD); textSize(wide() ? 15 : 14);
  const heading = view === 'corrected' ? 'Corrected specification (defective clauses rewritten)' : PROMPT;
  const hlines = wide() ? K.wrapLines(heading, canvasWidth - 20 - 140).slice(0, 2)
    : K.wrapLines(heading, canvasWidth - 20).slice(0, 3);
  textStyle(NORMAL);
  return { lead, cardY, cardH, promptY, hlines, listTop: promptY + hlines.length * 19 + (wide() ? 8 : 24) };
}

// Height of one clause block at the current width and state.
// Text column starts at TX; a select sits beside the text (wide) or below it (narrow, while
// marking). After review a narrow screen hides the select: the result line restates the mark.
const TX = 40;
function showSelect() { return view === 'draft' && (wide() || !reviewed); }
function clauseBlock(i) {
  const w = wide();
  const ts = w ? 14 : 13, lead = w ? 18 : 17;
  textSize(ts);
  const textW = w ? canvasWidth - 20 - selectWidth() - TX - 4 : canvasWidth - TX - 16;
  const tLines = K.countLines(clauseShownText(i), textW);
  let body;                                   // height below the 6 px top pad, before the result
  if (w) body = max(tLines * lead, 30);
  else if (showSelect()) body = tLines * lead + 36;
  else if (view === 'corrected') body = tLines * lead + 20;
  else body = tLines * lead;
  const msgW = canvasWidth - TX - 16;
  let h = 6 + body;
  const msgTop = h + 4;
  if (reviewed && view === 'draft') h += 4 + K.countLines(resultMessage(i), msgW) * lead + 2;
  return { h: h + 10, textW, tLines, lead, ts, msgTop, msgW };
}

function clauseShownText(i) {
  const c = CLAUSES[i];
  if (view === 'corrected' && c.fixed) return c.fixed;
  return c.text;
}

function computeLayout() {
  const hd = headerLayout();
  const listBottom = drawHeight - 84;     // status panel and data note below
  const avail = listBottom - hd.listTop;
  const pages = [[]];
  let used = 0;
  for (let i = 0; i < CLAUSES.length; i++) {
    const b = clauseBlock(i);
    if (used + b.h > avail && pages[pages.length - 1].length) { pages.push([]); used = 0; }
    pages[pages.length - 1].push({ i, b });
    used += b.h;
  }
  return { hd, pages, listBottom };
}

function layoutKey() {
  return [canvasWidth, reviewed, view, page, submissions].join('|');
}

function refreshLayout() {
  const key = layoutKey();
  if (layoutCache && layoutCache.key === key) return layoutCache;
  const L = computeLayout();
  if (page > L.pages.length - 1) page = L.pages.length - 1;
  L.key = layoutKey();
  // place the selects of the current page
  const onPage = new Set(L.pages[page].map(r => r.i));
  let y = L.hd.listTop;
  const pos = {};
  for (const r of L.pages[page]) { pos[r.i] = y; y += r.b.h; }
  selects.forEach((s, i) => {
    if (!onPage.has(i) || !showSelect()) { s.hide(); return; }
    s.show();
    s.size(selectWidth());
    const b = L.pages[page].find(r => r.i === i).b;
    if (wide()) s.position(canvasWidth - 16 - selectWidth(), pos[i] + 5);
    else s.position(TX, pos[i] + 6 + b.tLines * b.lead + 3);
  });
  L.pos = pos;
  layoutCache = L;
  syncPageButtons(L);
  return L;
}

function invalidate() { layoutCache = null; }

// ---------- Controls ----------
function syncControls() {
  for (const s of selects) K.setEnabled(s, !reviewed);
  if (reviewed) { submitButton.hide(); tryAgainButton.show(); correctedButton.show(); }
  else { submitButton.show(); tryAgainButton.hide(); correctedButton.hide(); }
  correctedButton.html(view === 'corrected' ? 'Show my review' : 'Show corrected specification');
  correctedButton.attribute('aria-pressed', view === 'corrected' ? 'true' : 'false');
  invalidate();
  refreshLayout();
  positionButtons();
}

function syncPageButtons(L) {
  const many = L.pages.length > 1;
  if (many) { prevButton.show(); nextButton.show(); } else { prevButton.hide(); nextButton.hide(); }
  K.setEnabled(prevButton, page > 0, { keepFocus: true });
  K.setEnabled(nextButton, page < L.pages.length - 1, { keepFocus: true });
  positionButtons();
}

let hintRow = 1;
function positionButtons() {
  const r = K.flowButtons(0, [submitButton, tryAgainButton, correctedButton]);
  hintRow = K.flowButtons(r, [prevButton, nextButton]);
}

function turnPage(d) {
  const L = refreshLayout();
  const np = constrain(page + d, 0, L.pages.length - 1);
  if (np === page) return;
  page = np;
  invalidate();
  const L2 = refreshLayout();
  const nums = L2.pages[page].map(r => r.i + 1);
  FP.announce('Showing clauses ' + nums[0] + ' to ' + nums[nums.length - 1] + ' of ' + CLAUSES.length + '.');
  const firstSel = selects[nums[0] - 1];
  if (!reviewed && view === 'draft') firstSel.elt.focus();
}

// ---------- Review flow ----------
function marks() { return selects.map(s => s.value()); }

function shortJudgment(v) { return v === 'ok' ? 'Acceptable' : 'Defective (' + v + ')'; }

// "✓ Correct: Defective (a). <Why>" or "✗ Incorrect: you marked Acceptable; it is Defective (a). <Why>"
function resultMessage(i) {
  const r = results[i];
  const c = CLAUSES[i];
  let m;
  if (r.correct) m = FP.msg.correct(shortJudgment(c.answer), c.why);
  else m = FP.msg.BAD + ' Incorrect: you marked ' + shortJudgment(r.chosen) + '; it is ' +
    shortJudgment(c.answer) + '. ' + c.why;
  if (submissions > 1) m = FP.msg.practice(m);
  return m;
}

function submitReview() {
  const m = marks();
  const missing = m.map((v, i) => (v === '' ? i + 1 : null)).filter(v => v !== null);
  if (missing.length) {
    notice = { kind: 'info', message: 'Mark all ten clauses before submitting. Still unmarked: clause' +
      (missing.length > 1 ? 's ' : ' ') + missing.join(', ') + '.' };
    FP.announce(notice.message);
    // jump to the page that holds the first unmarked clause
    const L = refreshLayout();
    const pi = L.pages.findIndex(p => p.some(r => r.i === missing[0] - 1));
    if (pi >= 0 && pi !== page) { page = pi; invalidate(); refreshLayout(); }
    selects[missing[0] - 1].elt.focus();
    return;
  }
  submissions++;
  const scored = submissions === 1;
  results = m.map((v, i) => ({ chosen: v, correct: v === CLAUSES[i].answer }));
  const n = results.filter(r => r.correct).length;
  results.forEach((r, i) => {
    if (scored) score.record(i, r.correct, 1);
    FP.events.emit('answered', { source: SIM_ID, itemId: 'clause-' + (i + 1), index: i, value: r.chosen,
      correct: r.correct, attempt: submissions, final: true, scored });
  });
  if (scored) {
    firstCorrect = n;
    FP.events.emit('completed', { source: SIM_ID, firstAttempt: n, correct: n, total: CLAUSES.length,
      mastered: score.mastered() });
    if (score.mastered()) FP.events.emit('mastery', { source: SIM_ID, total: CLAUSES.length });
  }
  reviewed = true;
  view = 'draft';
  page = 0;
  notice = null;
  syncControls();
  FP.announce(statusLines().join(' ') + ' Each clause now shows whether your judgment was correct and why.');
  tryAgainButton.elt.focus();
}

function tryAgain() {
  selects.forEach(s => s.selected(''));
  reviewed = false;
  view = 'draft';
  results = null;
  page = 0;
  notice = null;
  syncControls();
  FP.announce('Marks cleared. The clause order is unchanged; your first-submission score stays recorded.');
  selects[0].elt.focus();
}

function toggleCorrected() {
  view = view === 'corrected' ? 'draft' : 'corrected';
  page = 0;
  syncControls();
  FP.announce(view === 'corrected'
    ? 'Corrected specification: the seven defective clauses are rewritten.'
    : 'Showing your review.');
}

function statusLines() {
  if (!reviewed && submissions === 0) {
    const n = marks().filter(v => v !== '').length;
    return ['Clauses marked: ' + n + ' of ' + CLAUSES.length + '.',
      'Marks can be changed freely until you submit; the first submission is the one recorded.'];
  }
  const lines = [];
  if (reviewed) {
    const n = results.filter(r => r.correct).length;
    lines.push((submissions > 1 ? 'This try: ' : '') + n + ' of 10 clauses judged correctly.');
  } else {
    const n = marks().filter(v => v !== '').length;
    lines.push('Try ' + (submissions + 1) + ': clauses marked ' + n + ' of ' + CLAUSES.length + ' (not scored).');
  }
  if (submissions > 1 || !reviewed) lines.push('First submission (recorded): ' + firstCorrect + ' of 10 clauses judged correctly.');
  lines.push(score.mastered() ? FP.msg.masteryReached(MASTERY, CLAUSES.length)
    : FP.msg.masteryNeeds(MASTERY, CLAUSES.length, 'Press Try again to practice the clauses you missed.'));
  return lines;
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  const L = refreshLayout();
  K.title('Specification Error Detector');
  const w = wide();
  const hd = L.hd;

  // Application card
  K.panel(10, hd.cardY, canvasWidth - 20, hd.cardH, { fill: '--fp-primary-bg', stroke: '--fp-border', radius: 6 });
  noStroke(); fill(FP.tok('text')); textSize(w ? 14 : 13); textAlign(LEFT, TOP);
  K.wrapText(APPLICATION, 20, hd.cardY + 6, canvasWidth - 40, hd.lead);

  // Prompt and page indicator
  const nums = L.pages[page].map(r => r.i + 1);
  noStroke(); textAlign(LEFT, TOP);
  textStyle(BOLD); textSize(w ? 15 : 14); fill(FP.tok('text'));
  hd.hlines.forEach((ln, k) => text(ln, 10, hd.promptY + k * 19));
  textStyle(NORMAL);
  if (L.pages.length > 1) {
    textSize(13); fill(FP.tok('text-muted')); textAlign(RIGHT, TOP);
    text('Clauses ' + nums[0] + '–' + nums[nums.length - 1] + ' of 10', canvasWidth - 10, w ? hd.promptY + 2 : hd.promptY + hd.hlines.length * 19);
  }

  // Clauses on this page
  let y = hd.listTop;
  for (const r of L.pages[page]) {
    drawClause(r.i, y, r.b);
    y += r.b.h;
  }

  drawStatus(L.listBottom + 4);
  K.note(DATA_NOTE, { y: drawHeight - 8 });
  drawControlText();
}

function drawClause(i, y, b) {
  const w = wide();
  const c = CLAUSES[i];
  const r = reviewed && view === 'draft' ? results[i] : null;
  // card
  const opts = { radius: 6 };
  if (r) {
    opts.fill = r.correct ? '--fp-correct-bg' : '--fp-incorrect-bg';
    opts.stroke = r.correct ? '--fp-correct' : '--fp-incorrect';
    opts.dashed = !r.correct; opts.weight = 2;
  }
  K.panel(10, y, canvasWidth - 20, b.h - 6, opts);
  // number
  noStroke(); fill(FP.tok('text')); textStyle(BOLD); textSize(b.ts); textAlign(LEFT, TOP);
  textAlign(RIGHT, TOP);
  text((i + 1) + '.', TX - 5, y + 6);
  textAlign(LEFT, TOP);
  textStyle(NORMAL);
  const corrected = view === 'corrected' && c.fixed;
  if (view === 'corrected') {
    fill(corrected ? FP.tok('primary') : FP.tok('text'));
    if (corrected) textStyle(BOLD);
  }
  K.wrapText(clauseShownText(i), TX, y + 6, b.textW, b.lead);
  textStyle(NORMAL);
  if (view === 'corrected' && w) {
    fill(corrected ? FP.tok('primary') : FP.tok('text-muted'));
    textSize(13); textAlign(RIGHT, TOP);
    text(corrected ? 'Rewritten' : 'Unchanged (acceptable)', canvasWidth - 20, y + 7);
  } else if (view === 'corrected') {
    // narrow: tag on the line below the text
    fill(corrected ? FP.tok('primary') : FP.tok('text-muted'));
    textSize(13); textAlign(LEFT, TOP);
    text(corrected ? 'Rewritten' : 'Unchanged (acceptable)', TX, y + 6 + b.tLines * b.lead + 3);
  }
  if (r) {
    const msg = resultMessage(i);
    fill(r.correct ? FP.tok('correct') : FP.tok('incorrect'));
    textSize(b.ts); textAlign(LEFT, TOP);
    K.wrapText(msg, TX, y + b.msgTop, b.msgW, b.lead);
  }
}

function drawStatus(y) {
  const h = drawHeight - 26 - y;
  const lines = statusLines();
  let kind = null;
  if (notice) kind = notice.kind;
  K.panel(10, y, canvasWidth - 20, h, kind === 'info'
    ? { fill: '--fp-info-bg', stroke: '--fp-border', radius: 6 }
    : (reviewed ? { stroke: '--fp-primary', weight: 2, radius: 6 } : { radius: 6 }));
  const msgs = notice ? ['ℹ ' + notice.message] : lines;
  const ts = K.fitTextSize(t => {
    let hh = 0;
    msgs.forEach(m => { hh += K.countLines(m, canvasWidth - 40) * round(t * 1.3); });
    return hh;
  }, h - 10, wide() ? 15 : 14, 12);
  let yy = y + 5;
  textAlign(LEFT, TOP); noStroke();
  msgs.forEach((m, k) => {
    textStyle(k === 0 && !notice ? BOLD : NORMAL);
    fill(!notice && m.indexOf('Mastery reached') === 0 ? FP.tok('primary') : FP.tok('text'));
    yy = K.wrapText(m, 20, yy, canvasWidth - 40, round(ts * 1.3), { maxLines: 2 });
  });
  textStyle(NORMAL);
}

function drawControlText() {
  // Keyboard hint on the first free control row
  if (hintRow > 2) return;
  noStroke(); fill(FP.tok('text-muted')); textSize(13); textAlign(LEFT, CENTER);
  const hint = 'Keys: Tab moves between drop-downs and buttons; arrow keys change a drop-down.';
  const short = 'Tab: next control; arrows: change a drop-down.';
  text(textWidth(hint) < canvasWidth - 20 ? hint : short, 10, K.controlLabel(hintRow));
}

// ---------- Responsive sizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  invalidate();
  refreshLayout();
  positionButtons();
}

function updateCanvasSize() {
  canvasWidth = K.updateCanvasSize(320);
}
