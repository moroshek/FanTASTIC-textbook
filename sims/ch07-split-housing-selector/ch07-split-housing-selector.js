// Split Housing Selector - p5.js MicroSim (FanPedia shared kit: FP.CardDeck, FP.p5)
// CANVAS_HEIGHT: 672
// Eight illustrative centrifugal fan situations in a fixed order. For each one the
// learner commits a split recommendation (locked), then picks one of four FanPedia
// justifications. A situation is correct only when both match; one attempt each;
// mastery is 6 of 8. After situation 8 a summary table shows every answer beside
// the correct one. Sources: FanPedia pp. 120, 156-157, 164-168 and 194.
// Needs ../shared-libs/fanpedia-core.js and fanpedia-p5.js (see main.html).

const K = FP.p5;
const SIM_ID = 'ch07-split-housing-selector';
let canvasWidth = 800;
const canvasHeight = 672;
let drawHeight = 535;
let controlHeight = canvasHeight - drawHeight;
const margin = 10;
const MASTERY = 6;
const QUESTION = 'Which split, if any, should this fan have?';
const REASON_PROMPT = 'Pick the FanPedia rule that justifies the right choice for this fan:';
const REASON_SHORT = 'Pick the rule that justifies the right choice:';
const REVIEW = 'Review the section "Split Housings" in Chapter 7, then press Start over.';
const LETTERS = ['A', 'B', 'C', 'D'];

// Recommendations: full name (feedback, aria) and the short button label.
const RECS = [
  { id: 'H', name: 'Horizontal split', short: 'Horizontal' },
  { id: 'T', name: 'Three-way split', short: 'Three-way' },
  { id: 'M', name: 'Pie split, Mohawk style', short: 'Pie, Mohawk' },
  { id: 'S', name: 'Pie split, standard style', short: 'Pie, standard' },
  { id: 'N', name: 'No split recommended', short: 'No split' }
];
const REC = Object.fromEntries(RECS.map(r => [r.id, r]));

// Situations (chapter 7 spec, "Content" table). Illustrative situations.
const SITUATIONS = [
  { text: 'A size 807 SWSI housing is too large to ship assembled. The customer only needs it in two halves.', rec: 'H',
    just: 'The standard split runs along the horizontal centerline, and size 807 and above may be split by the shop for shipping.' },
  { text: 'A replacement fan must pass through an existing doorway that is smaller than the housing even when split in two.', rec: 'T',
    just: 'A three-way split is normally required to ship a fan or to enter a specific sized opening.' },
  { text: 'Maintenance wants to pull the impeller of an SWSI fan with no inlet box without disturbing the ductwork, and wants the inlet side left unsplit.', rec: 'M',
    just: 'The Mohawk splits between the scroll and the inlet housing side; the inlet side has no split.' },
  { text: 'The same impeller-removal need, but on a double width, double inlet fan.', rec: 'S',
    just: 'The Mohawk style is not used on double width fans.' },
  { text: 'An Arrangement 3SI fan with an attached inlet box needs easy impeller removal.', rec: 'S',
    just: 'Arrangement 3SI includes a pie split, and the Mohawk style is not used on fans with attached inlet boxes.' },
  { text: 'An Arrangement 1 fan in nominally leak-tight service. Nothing about shipping or access requires a split.', rec: 'N',
    just: 'FanPedia states split housings are not recommended for nominally leak-tight construction.' },
  { text: 'A replacement SWSI housing must match the existing pie split on an older fan, which runs all the way down to the inlet plate.', rec: 'S',
    just: 'The standard (older style) pie split runs all the way down to the funnel or inlet plate.' },
  { text: 'A retrofit fan must be lowered through a roof hatch smaller than half the housing, and the quote has not yet allowed for drafting time.', rec: 'T',
    just: 'Three sections fit the opening, and three-way splits need additional drafting and engineering time, so the quote must allow for it.' }
].map((s, i) => Object.assign(s, { id: i + 1, answerText: REC[s.rec].name }));

// Spec rule: the options for situation n are its own justification plus the justifications of
// the next three rows after n (wrapping past row 8 to row 1) whose recommendation differs from n's.
function justOptions(n) {
  const own = SITUATIONS[n];
  const out = [n];
  for (let k = 1; k < SITUATIONS.length && out.length < 4; k++) {
    const j = (n + k) % SITUATIONS.length;
    if (SITUATIONS[j].rec !== own.rec) out.push(j);
  }
  return out;
}

function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

// Spec feedback wording (it wins over the kit's standard wording):
// both right "Correct: <recommendation>. <justification>."; recommendation wrong
// "Not quite. The better choice is <correct recommendation>: <justification>.";
// recommendation right, reason wrong "Right split, wrong reason. <justification>."
const deck = new FP.CardDeck({
  cards: SITUATIONS, shuffle: false, attempts: 1, retryMissed: false,
  noun: 'Situations', mastery: MASTERY, reviewPointer: REVIEW, id: SIM_ID,
  check: (card, choice) => choice.rec === card.rec && choice.just === card.id - 1,
  messages: {
    correct: res => FP.msg.correct(REC[res.card.rec].name, res.card.just),
    missed: res => res.chosen.rec !== res.card.rec
      ? FP.msg.BAD + ' Not quite. The better choice is ' + lowerFirst(REC[res.card.rec].name) + ': ' + res.card.just
      : FP.msg.BAD + ' Right split, wrong reason. ' + res.card.just
  }
});

let chosenRec = null;   // locked recommendation for the face-up situation
let options = [];       // row indexes of the four justifications, in shown order
let lastRes = null;     // CardDeck result for the face-up situation
let history = [];       // [{rec, just, correct}] per situation, for the summary table

let recButtons = [], reasonButtons = [], nextButton, startOverButton;
let ctrlRows = 2;

// p5 mousePressed listens to mousedown only; a click listener also fires on
// Enter/Space when the button has keyboard focus.
function makeButton(label, fn, variant) {
  const b = K.button(label, null, variant ? { variant } : undefined);
  b.elt.type = 'button';
  b.elt.addEventListener('click', fn);
  return b;
}

const keys = K.keys.bind({
  '1': () => chooseRec(0), '2': () => chooseRec(1), '3': () => chooseRec(2), '4': () => chooseRec(3), '5': () => chooseRec(4),
  a: () => chooseReason(0), b: () => chooseReason(1), c: () => chooseReason(2), d: () => chooseReason(3),
  Enter: () => { if (deck.state().phase === 'feedback') advance(); }
});
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight, margin });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));

  RECS.forEach((r, i) => {
    const b = makeButton(r.short, () => chooseRec(i));
    b.addClass('choice');
    b.attribute('aria-label', r.name + ' (key ' + (i + 1) + ')');
    b.attribute('aria-keyshortcuts', String(i + 1));
    recButtons.push(b);
  });
  LETTERS.forEach((L, i) => {
    const b = makeButton(L, () => chooseReason(i));
    b.addClass('choice');
    b.attribute('aria-keyshortcuts', L);
    reasonButtons.push(b);
  });
  nextButton = makeButton('Next situation', advance);
  nextButton.attribute('aria-keyshortcuts', 'Enter');
  startOverButton = makeButton(FP.msg.START_OVER, startOver, 'secondary');

  resetSituation();
  updateControls();
  describe('Split Housing Selector. Eight illustrative centrifugal fan situations are shown one at a time. ' +
    'For each, choose a recommendation (horizontal split, three-way split, Mohawk pie split, standard pie split, ' +
    'or no split) with the buttons below the canvas or keys 1 to 5; the choice locks. Then pick one of four ' +
    'justifications, A to D. The sim marks the situation correct only when both match and shows the feedback. ' +
    'After situation 8 a summary table compares every answer with the correct one.');
}

function resetSituation() {
  chosenRec = null;
  lastRes = null;
  const i = deck.state().index;
  options = FP.rng.shuffle(justOptions(i));
}

function chooseRec(i) {
  const st = deck.state();
  if (st.phase !== 'choose' || chosenRec !== null) return;
  chosenRec = RECS[i].id;
  updateControls();
  FP.announce('Recommendation locked: ' + RECS[i].name + '. ' + REASON_PROMPT + ' ' +
    options.map((j, k) => LETTERS[k] + ': ' + SITUATIONS[j].just).join(' '));
  reasonButtons[0].elt.focus();
}

function chooseReason(k) {
  const st = deck.state();
  if (st.phase !== 'choose' || chosenRec === null || k >= options.length) return;
  const res = deck.place({ rec: chosenRec, just: options[k] });
  if (res.status === 'ignored') return;
  lastRes = res;
  history[st.index] = { rec: chosenRec, just: options[k], reasonLetter: LETTERS[k], correct: res.status === 'correct' };
  updateControls();
  FP.announce(res.message + ' ' + deck.state().scoreLabel + '.');
  nextButton.elt.focus();
}

function advance() {
  if (!deck.next()) return;
  const st = deck.state();
  if (st.phase === 'summary') {
    lastRes = null;
    updateControls();
    const s = deck.summary();
    FP.announce('Summary. ' + s.lines.join(' '));
    startOverButton.elt.focus();
    return;
  }
  resetSituation();
  updateControls();
  FP.announce('Situation ' + (st.index + 1) + ' of ' + SITUATIONS.length + '. ' + st.card.text + ' ' + QUESTION);
  recButtons[0].elt.focus();
}

function startOver() {
  deck.newRound();
  history = [];
  resetSituation();
  updateControls();
  FP.announce('Started over. Situation 1 of ' + SITUATIONS.length + '. ' + SITUATIONS[0].text + ' ' + QUESTION);
}

function updateControls() {
  const had = document.activeElement;
  const st = deck.state();
  const inSummary = st.phase === 'summary';
  recButtons.forEach((b, i) => {
    const on = st.phase === 'choose' && chosenRec === null;
    K.setEnabled(b, on);
    b.attribute('aria-pressed', chosenRec === RECS[i].id ? 'true' : 'false');
    if (inSummary) b.hide(); else b.show();
  });
  reasonButtons.forEach((b, i) => {
    K.setEnabled(b, st.phase === 'choose' && chosenRec !== null);
    const picked = st.phase === 'feedback' && history[st.index] && history[st.index].reasonLetter === LETTERS[i];
    b.attribute('aria-pressed', picked ? 'true' : 'false');
    b.attribute('aria-label', 'Reason ' + LETTERS[i] + (chosenRec !== null && options[i] != null
      ? ': ' + SITUATIONS[options[i]].just : '') + ' (key ' + LETTERS[i] + ')');
    if (inSummary) b.hide(); else b.show();
  });
  K.setEnabled(nextButton, st.phase === 'feedback');
  const nextLabel = st.isLast ? 'See summary' : 'Next situation';
  nextButton.html(nextLabel);
  if (inSummary) nextButton.hide(); else nextButton.show();
  positionControls();
  K.keepFocus(had, [...recButtons, ...reasonButtons, nextButton, startOverButton]);
}

function positionControls() {
  // Two passes: count the rows the buttons need at this width, then size the regions.
  for (let pass = 0; pass < 2; pass++) {
    K.config({ drawHeight, controlHeight, margin });
    const lx = canvasWidth < 480 ? 66 : 84;
    let row = K.flowButtons(0, recButtons, { x: lx });
    const reasonRow = row;
    row = K.flowButtons(row, [...reasonButtons, null, nextButton, null, startOverButton], { x: lx });
    ctrlRows = row;
    layoutRows.rec = 0;
    layoutRows.reason = reasonRow;
    controlHeight = K.controlHeightFor(Math.max(1, row));
    drawHeight = canvasHeight - controlHeight;
  }
}
const layoutRows = { rec: 0, reason: 1 };

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  let y = K.title('Split Housing Selector');
  const st = deck.state();
  const right = st.phase === 'summary' ? 'Summary' : 'Situation ' + (st.index + 1) + ' of ' + SITUATIONS.length;
  y = K.statusLine(st.scoreLabel, right, null, { y: y - 4 });
  K.note(canvasWidth >= 560
    ? ['Illustrative situations', 'Source: FanPedia pp. 120, 156–157, 164–168, 194', 'Keys: 1–5 split, A–D reason, Enter next']
    : [canvasWidth >= 380 ? 'Illustrative situations' : 'Illustrative', 'FanPedia pp. 120, 156–168, 194']);
  const noteH = 22;
  const top = y + 2, h = drawHeight - noteH - top;
  K.panel(margin, top, canvasWidth - 2 * margin, h);
  if (st.phase === 'summary') drawSummary(margin + 10, top + 8, canvasWidth - 2 * margin - 20, h - 16);
  else drawSituation(margin + 10, top + 8, canvasWidth - 2 * margin - 20, h - 16);
  drawControlLabels();
}

// Lays out [{t, bold, muted, color, gap, indent, box}] paragraphs; returns the y below.
function drawParas(paras, x, y, w, ts, dry) {
  for (const p of paras) {
    const s = p.small ? Math.max(12, ts - 1) : ts;
    textSize(s);
    textStyle(p.bold ? BOLD : NORMAL);
    fill(p.color || FP.tok(p.muted ? 'text-muted' : 'text'));
    noStroke();
    textAlign(LEFT, TOP);
    y += p.gap || 0;
    const ind = p.indent || 0;
    if (p.lead) {
      textStyle(BOLD);
      if (!dry) text(p.lead, x, y);
      textStyle(p.bold ? BOLD : NORMAL);
    }
    y = K.wrapText(p.t, x + ind, y, w - ind, Math.round(s * 1.3), { dryRun: dry });
  }
  textStyle(NORMAL);
  return y;
}

function drawSituation(x, y, w, h) {
  const st = deck.state();
  const card = st.card;
  const compact = canvasWidth < 480;   // narrow canvases drop the repeated heading and shorten prompts
  const paras = [
    compact ? null : { t: 'Situation ' + (st.index + 1), bold: true },
    { t: card.text, gap: compact ? 0 : 4 },
    { t: QUESTION, bold: true, gap: compact ? 5 : 8 }
  ].filter(Boolean);
  if (chosenRec === null) {
    paras.push({ t: 'Choose one of the five recommendations below (keys 1–5). Your choice locks.', muted: true, gap: 4 });
  } else {
    paras.push({ t: (compact ? 'Your split (locked): ' : 'Your recommendation: ') + REC[chosenRec].name +
      (compact ? '' : ' (locked)'), gap: compact ? 2 : 4, color: FP.tok('primary-dark') });
    paras.push({ t: compact ? REASON_SHORT : REASON_PROMPT, bold: true, gap: compact ? 5 : 8 });
    const picked = history[st.index];
    options.forEach((j, k) => {
      const mark = st.phase === 'feedback'
        ? (j === card.id - 1 ? ' ✓' : (picked && picked.just === j ? ' ✗' : '')) : '';
      paras.push({ lead: LETTERS[k] + mark, t: SITUATIONS[j].just, indent: compact ? 30 : 34, gap: compact ? 2 : 3,
        color: st.phase === 'feedback' && j === card.id - 1 ? FP.tok('correct') : null });
    });
  }
  const fb = lastRes ? [{ t: lastRes.message }] : [];
  const pad = 8;
  const layout = ts => {
    let yy = drawParas(paras, x, y, w, ts, true);
    if (fb.length) yy = drawParas(fb, x + pad, yy + 10 + pad, w - 2 * pad, ts, true) + pad;
    return yy - y;
  };
  const ts = K.fitTextSize(layout, h, 16, 12);
  let yy = drawParas(paras, x, y, w, ts, false);
  if (fb.length) {
    const ok = lastRes.status === 'correct';
    const fbTop = yy + 10;
    const fbH = drawParas(fb, x + pad, fbTop + pad, w - 2 * pad, ts, true) + pad - fbTop;
    // ✓ solid border for correct, ✗ dashed border for incorrect: never colour alone
    K.panel(x - 2, fbTop, w + 4, fbH, {
      fill: ok ? '--fp-correct-bg' : '--fp-incorrect-bg', stroke: ok ? '--fp-correct' : '--fp-incorrect',
      dashed: !ok, weight: 2
    });
    fb[0].color = FP.tok(ok ? 'correct' : 'incorrect');
    drawParas(fb, x + pad, fbTop + pad, w - 2 * pad, ts, false);
  }
}

function verdictWord(hrow, card) {
  if (!hrow) return '';
  if (hrow.correct) return '✓ Correct';
  return hrow.rec !== card.rec ? '✗ Wrong split' : '✗ Wrong reason';
}

// Summary: the score lines, then a table of every answer beside the correct one.
function drawSummary(x, y, w, h) {
  const s = deck.summary();
  const wide = w >= 520;
  const rowsFor = ts => {
    let yy = y;
    textSize(ts);
    yy += Math.round(ts * 1.3) * 2 + 4;   // two summary lines (wrapped below if needed)
    yy = y;
    textStyle(BOLD);
    yy = K.wrapText(s.lines[0], x, yy, w, Math.round(ts * 1.3), { dryRun: true });
    textStyle(NORMAL);
    yy = K.wrapText(s.lines[1], x, yy, w, Math.round(ts * 1.3), { dryRun: true }) + 6;
    yy += Math.round(ts * 1.3) + 4;       // header
    for (let i = 0; i < SITUATIONS.length; i++) yy += rowHeight(i, ts, w, wide, true) + 2;
    return yy - y;
  };
  const ts = K.fitTextSize(rowsFor, h, 15, 12);
  const lh = Math.round(ts * 1.3);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(ts);
  textStyle(BOLD);
  fill(FP.tok('text'));
  let yy = K.wrapText(s.lines[0], x, y, w, lh);
  textStyle(NORMAL);
  fill(FP.tok(s.mastered ? 'correct' : 'text'));
  yy = K.wrapText((s.mastered ? '✓ ' : '') + s.lines[1], x, yy, w, lh) + 6;
  const cols = columns(x, w, wide);
  textStyle(BOLD);
  fill(FP.tok('text-muted'));
  text('#', cols[0], yy);
  text('Your answer', cols[1], yy);
  text('Correct split', cols[2], yy);
  if (wide) text('Result', cols[3], yy);
  textStyle(NORMAL);
  yy += lh + 4;
  for (let i = 0; i < SITUATIONS.length; i++) {
    const rh = rowHeight(i, ts, w, wide, false, yy);
    yy += rh + 2;
  }
}

function columns(x, w, wide) {
  return wide ? [x, x + 26, x + 26 + (w - 26) * 0.42, x + 26 + (w - 26) * 0.80]
    : [x, x + 22, x + 22 + (w - 22) * 0.5];
}

// Draws (or measures) one summary row; returns its height.
function rowHeight(i, ts, w, wide, dry, y) {
  const card = SITUATIONS[i];
  const hrow = history[i];
  const x = margin + 10;
  const cols = columns(x, w, wide);
  const lh = Math.round(ts * 1.3);
  textSize(ts);
  const mine = hrow ? REC[hrow.rec].name + (hrow.just === i ? ', right reason' : ', wrong reason') : '—';
  const yours = wide ? mine : mine + (hrow ? ' ' + verdictWord(hrow, card).split(' ')[0] : '');
  const w1 = cols[2] - cols[1] - 8;
  const w2 = (wide ? cols[3] : x + w) - cols[2] - 8;
  const w3 = wide ? x + w - cols[3] : 0;
  const h1 = K.wrapText(yours, 0, 0, w1, lh, { dryRun: true });
  const h2 = K.wrapText(card.answerText, 0, 0, w2, lh, { dryRun: true });
  const h3 = wide ? K.wrapText(verdictWord(hrow, card), 0, 0, w3, lh, { dryRun: true }) : 0;
  const rh = Math.max(h1, h2, h3, lh);
  if (dry) return rh;
  if (i % 2 === 0) {
    noStroke();
    fill(FP.tok('primary-bg'));
    rect(x - 4, y - 2, w + 8, rh + 4, 4);
  }
  const ok = hrow && hrow.correct;
  fill(FP.tok('text'));
  text(String(i + 1), cols[0], y);
  fill(FP.tok(hrow ? (ok ? 'correct' : 'incorrect') : 'text'));
  K.wrapText(yours, cols[1], y, w1, lh);
  fill(FP.tok('text'));
  K.wrapText(card.answerText, cols[2], y, w2, lh);
  if (wide) {
    fill(FP.tok(hrow ? (ok ? 'correct' : 'incorrect') : 'text'));
    K.wrapText(verdictWord(hrow, card), cols[3], y, w3, lh);
  }
  return rh;
}

function drawControlLabels() {
  const st = deck.state();
  noStroke();
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(canvasWidth < 480 ? 14 : 16);
  if (st.phase === 'summary') {
    fill(FP.tok('text'));
    textStyle(NORMAL);
    textAlign(LEFT, CENTER);
    textAlign(LEFT, TOP);
    return;
  }
  fill(FP.tok(st.phase === 'choose' && chosenRec === null ? 'text' : 'text-muted'));
  text('Split:', margin, K.controlLabel(layoutRows.rec, drawHeight));
  fill(FP.tok(st.phase === 'choose' && chosenRec !== null ? 'text' : 'text-muted'));
  text('Reason:', margin, K.controlLabel(layoutRows.reason, drawHeight));
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
