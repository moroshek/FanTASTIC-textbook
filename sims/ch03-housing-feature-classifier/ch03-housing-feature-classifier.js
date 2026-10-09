// Which Housing Feature Does the Job? - p5.js MicroSim (Chapter 3: Basic Fan Anatomy)
// CANVAS_HEIGHT: 600
// Twelve job-site requests in a fixed order, four options each, two attempts per request.
// The learner commits one option; a wrong first try shows a hint that names the job of the
// right feature; a second miss reveals the answer. A summary lists every request; a Retry
// missed round is practice only (the first-attempt score is kept).
// Built on the FanPedia kit: FP.CardDeck (flow, wording, score, mastery, retry missed),
// FP.p5 (layout, text, controls, keys, focus).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js (load them before
// this file, also in the p5.js editor).

const K = FP.p5;
const SIM_ID = 'ch03-housing-feature-classifier';

// ---------- Canvas layout ----------
let canvasWidth = 800;
const drawHeight = 555;
const controlHeight = K.controlHeightFor(1);   // Next · Retry missed · Start over
const canvasHeight = drawHeight + controlHeight;
const HEADING = 'A customer calls with a request. Which feature does the job?';
const DATA_NOTE = ['Illustrative job-site requests', 'Keys: 1-4 choose, Enter for next'];

// ---------- Content (chapter specification; options in the order listed) ----------
const REQUESTS = [
  { request: 'We need to look at the impeller for buildup between cleanings without opening a door.',
    options: ['Access door', 'Inspection port', 'Pie split housing', 'Safety screen'],
    answer: 'Inspection port',
    why: 'A port is a small, closable opening for viewing; an access door is for reaching in.',
    hint: 'Think of the smallest opening that still lets you see inside.' },
  { request: 'The impeller must be pulled out without disconnecting the inlet or outlet duct.',
    options: ['Horizontal split housing', 'Pie split housing', 'Raised access door', 'Inlet collar'],
    answer: 'Pie split housing',
    why: 'A pie split cuts a wedge of 90 degrees or more so the impeller comes out without disturbing inlet or outlet.',
    hint: 'Which split keeps the inlet and outlet in place?' },
  { request: 'The fan has to fit through a doorway smaller than the assembled housing.',
    options: ['3-way split housing', 'Quick-open access door', 'Welded housing', 'Stack cap'],
    answer: '3-way split housing',
    why: 'A 3-way split divides the housing into three sections for shipping or for passing through a specific opening.',
    hint: 'Which split divides the housing for shipping?' },
  { request: 'The fan is insulated, and we need to open the door without cutting the insulation.',
    options: ['Bolted access door', 'Raised access door', 'Inspection port', 'Inlet flange'],
    answer: 'Raised access door',
    why: 'A raised access door is built up above the insulation, usually by 2 inches.',
    hint: 'Which door sits above the insulation?' },
  { request: 'Our flexible sleeve slips over the inlet and is held with clamps.',
    options: ['Inlet flange', 'Inlet collar', 'Companion flange', 'Outlet flange'],
    answer: 'Inlet collar',
    why: 'A collar is a plain sleeve for slip-fit connections; a flange is bolted.',
    hint: 'Which connection has no bolt holes?' },
  { request: 'The contractor needs a part to attach to the duct in the field so the bolt holes match the fan inlet.',
    options: ['Companion flange', 'Inlet collar', 'Evasé', 'Inspection port'],
    answer: 'Companion flange',
    why: 'Companion flanges are attached to the duct in the field and are shipped loose to match the fan flange.',
    hint: 'Which part goes on the duct, not the fan?' },
  { request: 'The downstream duct must bolt rigidly to the fan discharge.',
    options: ['Outlet flange', 'Inlet collar', 'Stack cap', 'Bird screen'],
    answer: 'Outlet flange',
    why: 'The outlet flange carries the bolt pattern for the discharge duct.',
    hint: 'Which part has the bolt pattern at the discharge?' },
  { request: 'Birds keep nesting in the roof exhauster\'s discharge.',
    options: ['Safety screen', 'Bird screen', 'Backdraft damper', 'Inspection port'],
    answer: 'Bird screen',
    why: 'A bird screen keeps birds and debris out of outdoor-facing openings.',
    hint: 'Which mesh is meant for animals?' },
  { request: 'A panel fan inlet is within reach of people on a ladder.',
    options: ['Bird screen', 'Safety screen', 'Stack cap', 'Gravity damper'],
    answer: 'Safety screen',
    why: 'A safety screen keeps hands and objects away from the impeller.',
    hint: 'Which mesh is meant for people?' },
  { request: 'Cold air blows in through the wall fan every night when it is off.',
    options: ['Backdraft damper', 'Safety screen', 'Stack cap', 'Quick-open access door'],
    answer: 'Backdraft damper',
    why: 'A gravity backdraft damper opens when the fan runs and closes by gravity when it stops.',
    hint: 'Which part acts only when the fan stops?' },
  { request: 'The fume exhaust must discharge straight up, away from the roof.',
    options: ['Hood', 'Stack cap', 'Backdraft damper', 'Bird screen'],
    answer: 'Stack cap',
    why: 'A stack cap moves air straight through and up; a hood deflects it down and outward.',
    hint: 'Which part throws air straight up?' },
  { request: 'The housing seams must not leak, so we want no bolted seams in the scroll.',
    options: ['Bolted housing', 'Welded housing', '3-way split housing', 'Inspection port'],
    answer: 'Welded housing',
    why: 'Continuous welds join the housing permanently with no bolted seams to leak.',
    hint: 'Which joining method leaves no seams to gasket?' }
];
const CARDS = REQUESTS.map((r, i) => Object.assign({ id: 'request-' + (i + 1), n: i + 1 }, r));

const deck = new FP.CardDeck({
  cards: CARDS,
  shuffle: false,                 // fixed order
  attempts: 2,
  retryMissed: true,
  noun: 'Requests',
  mastery: 10,
  reviewPointer: 'Review "Housing Features for Access and Service" and "Accessories That Protect the Openings" in the chapter',
  // Spec wording: a correct answer shows "Correct:" followed by the Why text.
  messages: { correct: res => FP.msg.correct(res.card.why) },
  id: SIM_ID,
  onComplete: s => { scoredRecap = recapRows(); }
});

// ---------- State ----------
let last = null;                  // last place() result shown in the feedback box
let firstChoice = {};             // card id -> first choice (for the summary)
let scoredRecap = null;           // summary rows kept from the scored round
let L = null;                     // layout computed by relayout()

// ---------- Controls ----------
let optionButtons = [], nextButton, retryButton, startOverButton, summaryDiv;

const keys = K.keys.bind({
  '1': () => choose(0), '2': () => choose(1), '3': () => choose(2), '4': () => choose(3),
  Enter: () => { if (deck.state().phase === 'feedback') { goNext(); } }
});
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));

  for (let i = 0; i < 4; i++) {
    const b = K.button('', () => choose(i), { variant: 'choice' });
    b.addClass('choice');
    b.style('white-space', 'normal');
    b.style('text-align', 'left');
    optionButtons.push(b);
  }
  nextButton = K.button('Next request', goNext);
  retryButton = K.button(FP.msg.RETRY_MISSED, retryMissed, { variant: 'secondary' });
  retryButton.addClass('secondary');
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });
  startOverButton.addClass('secondary');

  summaryDiv = createDiv('');
  summaryDiv.parent(document.querySelector('main'));
  summaryDiv.addClass('hfc-summary');
  summaryDiv.attribute('tabindex', '0');
  summaryDiv.attribute('role', 'region');
  summaryDiv.attribute('aria-label', 'Summary of every request');

  refresh();
  describe('Housing feature classifier. A customer request appears in a speech bubble with four ' +
    'option buttons naming housing features or opening accessories. The learner chooses one; ' +
    'feedback says whether it is correct, gives a hint after a first wrong try, and reveals the ' +
    'answer after a second. Twelve requests in a fixed order, then a summary list and a Retry ' +
    'missed practice round.');
}

// ---------- Flow (FP.CardDeck) ----------
function choose(i) {
  const st = deck.state();
  if (st.phase !== 'choose' || !st.card) { return; }
  const choice = st.card.options[i];
  if (st.attempt === 1 && !st.practice) { firstChoice[st.card.id] = choice; }
  const res = deck.place(choice);
  if (res.status === 'ignored') { return; }
  last = res;
  FP.announce(res.message);
  const had = document.activeElement;
  refresh();
  if (res.locked) { nextButton.elt.focus(); } else { K.keepFocus(had, optionButtons.concat([startOverButton])); }
}

function goNext() {
  if (!deck.next()) { return; }
  last = null;
  refresh();
  const st = deck.state();
  if (st.phase === 'summary') {
    const s = deck.summary();
    FP.announce((st.practice ? 'Practice round done. ' : '') + s.lines.join(' '));
    (retryButton.elt.hidden ? startOverButton : retryButton).elt.focus();
  } else {
    FP.announce('Request ' + (st.index + 1) + ' of ' + st.count + ': ' + st.card.request);
    optionButtons[0].elt.focus();
  }
}

function retryMissed() {
  if (!deck.retryMissed()) { return; }
  last = null;
  refresh();
  const st = deck.state();
  FP.announce(FP.msg.practice('Request ' + st.card.n + ': ' + st.card.request));
  optionButtons[0].elt.focus();
}

function startOver() {
  deck.newRound();
  last = null;
  firstChoice = {};
  scoredRecap = null;
  refresh();
  FP.announce('Started over. Request 1 of ' + CARDS.length + ': ' + CARDS[0].request);
  optionButtons[0].elt.focus();
}

// Rows for the summary: [{n, ok, text}] from this round's placements.
function recapRows() {
  return deck.placements.map(p => {
    const c = p.card;
    const first = firstChoice[c.id];
    let txt;
    if (p.correct && p.attempts === 1) {
      txt = 'Request ' + c.n + ': ✓ ' + c.answer + '. ' + c.why;
    } else if (p.correct) {
      txt = 'Request ' + c.n + ': ✓ ' + c.answer + ' on the second try (first choice: ' + first + '). ' + c.why;
    } else {
      txt = 'Request ' + c.n + ': ✗ You chose ' + (first && first !== p.chosen ? first + ', then ' : '') +
        p.chosen + '. Correct: ' + c.answer + '. ' + c.why;
    }
    return { n: c.n, cls: p.correct ? (p.attempts === 1 ? 'ok' : 'ok2') : 'bad', text: txt };
  });
}

// ---------- Controls: state and layout ----------
function refresh() {
  const st = deck.state();
  const summary = st.phase === 'summary';
  optionButtons.forEach((b, i) => {
    const opt = st.card && !summary ? st.card.options[i] : '';
    let mark = '';
    if (st.phase === 'feedback' && last && opt) {
      if (opt === st.card.answer) { mark = '✓ '; } else if (opt === last.chosen) { mark = '✗ '; }
    } else if (st.phase === 'choose' && last && last.status === 'retry' && opt === last.chosen) {
      mark = '✗ ';
    }
    b.html(mark + (i + 1) + '. ' + opt);
    b.attribute('aria-label', 'Option ' + (i + 1) + ': ' + opt + (mark === '✓ ' ? ', correct answer' :
      (mark === '✗ ' ? ', your choice, incorrect' : '')));
    b.removeClass('hfc-ok'); b.removeClass('hfc-bad');
    if (mark === '✓ ') { b.addClass('hfc-ok'); } else if (mark === '✗ ') { b.addClass('hfc-bad'); }
    if (summary) { b.hide(); } else { b.show(); }
    K.setEnabled(b, st.phase === 'choose' && !(last && last.status === 'retry' && opt === last.chosen));
  });
  if (st.phase === 'feedback') { nextButton.show(); } else { nextButton.hide(); }
  nextButton.html(st.isLast ? (st.practice ? 'Finish practice' : 'See summary') : 'Next request');
  const s = deck.summary();
  if (summary && s.canRetryMissed) { retryButton.show(); } else { retryButton.hide(); }
  if (summary) {
    const rows = scoredRecap || recapRows();
    summaryDiv.html(rows.map(r => '<p class="' + r.cls + '">' + escapeHtml(r.text) + '</p>').join(''));
    summaryDiv.show();
  } else {
    summaryDiv.hide();
  }
  relayout();
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function wide() { return canvasWidth >= 560; }

// Computes the layout of the drawing region and positions the DOM controls.
function relayout() {
  const st = deck.state();
  const w = wide();
  const m = 10;
  L = {};
  textSize(15);
  textStyle(BOLD);
  L.statusY = 40;
  const right = statusRight(st);
  const statusLines = (textWidth(st.scoreLabel) + 16 + (textStyle(NORMAL), textWidth(right)) <= canvasWidth - 2 * m) ? 1 : 2;
  L.headY = L.statusY + statusLines * 21 + 4;
  textStyle(BOLD);
  textSize(w ? 17 : 15);
  L.headSize = w ? 17 : 15;
  L.headH = K.countLines(HEADING, canvasWidth - 2 * m) * round(L.headSize * 1.3);
  textStyle(NORMAL);
  L.bubbleY = L.headY + L.headH + 8;

  if (st.phase === 'summary') {
    L.summary = true;
    L.sumTop = L.bubbleY;
    // Room for the two summary lines (each up to two lines) above the scrolling list.
    textSize(15);
    textStyle(BOLD);
    const s = deck.summary();
    const n = s.lines.reduce((acc, ln) => acc + min(3, K.countLines(ln, canvasWidth - 40)), 0) + (st.practice ? 1 : 0);
    textStyle(NORMAL);
    L.listTop = L.sumTop + 8 + n * 20 + 26;
    const listH = drawHeight - 40 - L.listTop;
    summaryDiv.position(m + 6, L.listTop);
    summaryDiv.size(canvasWidth - 2 * m - 12, listH);
  } else {
    L.summary = false;
    L.bubbleSize = w ? 18 : 15;
    textSize(L.bubbleSize);
    L.bubbleX = w ? 70 : m;
    L.bubbleW = canvasWidth - L.bubbleX - m;
    const lead = round(L.bubbleSize * 1.35);
    L.bubbleH = K.countLines(quote(st.card.request), L.bubbleW - 24) * lead + 34;
    // Option buttons: 2 x 2 when wide, one per row when narrow.
    const top = L.bubbleY + L.bubbleH + (w ? 18 : 12);
    const cols = w ? 2 : 1, gap = w ? 12 : 8;
    const bw = (canvasWidth - 2 * m - gap * (cols - 1)) / cols;
    let y = top, rowH = 0;
    optionButtons.forEach((b, i) => {
      const col = i % cols;
      if (col === 0 && i > 0) { y += rowH + gap; rowH = 0; }
      b.size(bw);
      b.style('min-height', w ? '52px' : '34px');
      b.style('font-size', w ? '16px' : '15px');
      b.position(m + col * (bw + gap), y);
      rowH = max(rowH, b.elt.offsetHeight || 36);
    });
    L.feedbackY = y + rowH + (w ? 18 : 12);
  }
  K.flowButtons(0, [nextButton, retryButton, '|', startOverButton]);
}

function statusRight(st) {
  if (st.phase === 'summary') { return st.practice ? 'Practice round done' : 'Summary'; }
  const what = (st.practice ? 'Practice ' : 'Request ') + (st.practice ? (st.index + 1) + ' of ' + st.count
    : (st.index + 1) + ' of ' + st.count);
  return what + (st.phase === 'choose' ? ' · ' + st.attemptLabel : '');
}

function quote(s) { return '“' + s + '”'; }

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  if (!L) { return; }
  const st = deck.state();
  K.title('Which Housing Feature Does the Job?');
  K.statusLine(st.scoreLabel, statusRight(st), null, { y: L.statusY });

  noStroke();
  fill(FP.tok('text'));
  textStyle(BOLD);
  textSize(L.headSize);
  textAlign(LEFT, TOP);
  K.wrapText(HEADING, 10, L.headY, canvasWidth - 20, round(L.headSize * 1.3));
  textStyle(NORMAL);

  if (L.summary) { drawSummary(st); } else { drawRequest(st); if (wide()) { drawProgress(st); } }
  K.note(DATA_NOTE, { lines: wide() ? 1 : 2 });
}

function drawRequest(st) {
  // Caller icon (wide only) and speech bubble with the request
  if (wide()) { drawCaller(36, L.bubbleY + 30); }
  K.panel(L.bubbleX, L.bubbleY, L.bubbleW, L.bubbleH, { fill: 255, stroke: '--fp-primary', weight: 2, radius: 12 });
  if (wide()) {
    fill(255); stroke(FP.tok('primary')); strokeWeight(2);
    triangle(L.bubbleX + 1, L.bubbleY + 18, L.bubbleX - 14, L.bubbleY + 28, L.bubbleX + 1, L.bubbleY + 34);
    noStroke(); fill(255); rect(L.bubbleX + 1, L.bubbleY + 19, 4, 14);
  }
  noStroke();
  fill(FP.tok('text-muted'));
  textSize(13);
  textAlign(LEFT, TOP);
  text((st.practice ? 'Practice (not scored) · Request ' : 'Request ') + st.card.n, L.bubbleX + 12, L.bubbleY + 7);
  fill(FP.tok('text'));
  textSize(L.bubbleSize);
  K.wrapText(quote(st.card.request), L.bubbleX + 12, L.bubbleY + 26, L.bubbleW - 24, round(L.bubbleSize * 1.35));

  // Feedback box
  const fy = L.feedbackY, fw = canvasWidth - 20, maxH = drawHeight - 46 - fy;
  let msg, kind;
  if (last && last.message) { msg = last.message; kind = last.kind; }
  else { msg = 'Choose the option that does the job (keys 1-4).'; kind = 'info'; }
  const txt = (kind === 'info' ? 'ℹ ' : '') + msg;
  const ts = K.fitTextSize(s => K.countLines(txt, fw - 20) * round(s * 1.3) + 14, maxH, wide() ? 16 : 15, 12);
  const lead = round(ts * 1.3);
  const h = K.countLines(txt, fw - 20) * lead + 14;
  const ok = kind === 'ok', bad = kind === 'bad';
  K.panel(10, fy, fw, h, {
    fill: ok ? '--fp-correct-bg' : (bad ? '--fp-incorrect-bg' : '--fp-info-bg'),
    stroke: ok ? '--fp-correct' : (bad ? '--fp-incorrect' : '--fp-border'),
    dashed: bad, weight: ok || bad ? 2 : 1, radius: 6
  });
  noStroke();
  fill(ok ? FP.tok('correct') : (bad ? FP.tok('incorrect') : FP.tok('text')));
  textSize(ts);
  K.wrapText(txt, 20, fy + 7, fw - 20, lead);
}

// Progress chips for the round (wide only): ✓ solid, ✗ dashed, ▸ current; never colour alone.
function drawProgress(st) {
  const n = st.count, y = drawHeight - 64, size = 30, gap = 6;
  const label = st.practice ? 'Practice:' : 'Progress:';
  textSize(14);
  const lx = 10, x0 = lx + textWidth(label) + 10;
  if (x0 + n * (size + gap) > canvasWidth - 10) { return; }
  noStroke(); fill(FP.tok('text-muted')); textAlign(LEFT, CENTER);
  text(label, lx, y + size / 2);
  for (let i = 0; i < n; i++) {
    const r = st.results[i], cur = i === st.index;
    const x = x0 + i * (size + gap);
    const ok = r === 'correct', bad = r === 'missed';
    const stroke1 = ok ? '--fp-correct' : (bad ? '--fp-incorrect' : (cur ? '--fp-primary' : '--fp-border'));
    K.panel(x, y, size, size, { fill: ok ? '--fp-correct-bg' : (bad ? '--fp-incorrect-bg' : (cur ? '--fp-primary-bg' : 255)),
      stroke: stroke1, dashed: bad, weight: ok || bad || cur ? 2 : 1, radius: 5 });
    noStroke();
    fill(ok ? FP.tok('correct') : (bad ? FP.tok('incorrect') : FP.tok('text')));
    textAlign(CENTER, CENTER); textSize(12);
    const lbl = String(i + 1);
    text((ok ? '✓' : (bad ? '✗' : (cur ? '▸' : ''))) + lbl, x + size / 2, y + size / 2 + 1);
  }
}

// Simple caller icon: a head and shoulders with a phone handset.
function drawCaller(x, y) {
  push();
  noStroke();
  fill(FP.tok('primary-bg'));
  circle(x, y + 4, 52);
  fill(FP.tok('primary'));
  circle(x, y - 6, 18);
  arc(x, y + 22, 34, 30, PI, TWO_PI);
  stroke(FP.tok('text')); strokeWeight(3); noFill();
  arc(x + 13, y - 6, 16, 22, -HALF_PI, HALF_PI);
  pop();
}

function drawSummary(st) {
  const s = deck.summary();
  const y0 = L.sumTop;
  K.panel(10, y0, canvasWidth - 20, drawHeight - 34 - y0, { fill: '--fp-primary-bg', stroke: '--fp-primary', weight: 2 });
  noStroke();
  textAlign(LEFT, TOP);
  textSize(15);
  textStyle(BOLD);
  fill(FP.tok('text'));
  const lines = s.lines.slice();
  if (st.practice) {
    const pr = deck.placements;
    lines[0] = 'Practice round (not scored): ' + pr.filter(p => p.correct).length + ' of ' + pr.length +
      ' correct. ' + lines[0];
  }
  let y = y0 + 8;
  for (const ln of lines) {
    if (ln === lines[1]) { textStyle(s.mastered ? BOLD : NORMAL); fill(s.mastered ? FP.tok('primary') : FP.tok('text')); }
    y = K.wrapText(ln, 20, y, canvasWidth - 40, 20, { maxLines: 3 });
  }
  textStyle(NORMAL);
  fill(FP.tok('text-muted'));
  textSize(13);
  text('Every request (scroll the list):', 20, L.listTop - 18);
}

// ---------- Responsive sizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  relayout();
}

function updateCanvasSize() {
  canvasWidth = K.updateCanvasSize(320);
}
