// Fan Base and Isolation Selector MicroSim (Chapter 22)
// CANVAS_HEIGHT: 655
// Seven illustrative installations. For each, the learner picks one of five
// recommendations (base or mounting) and one of three justifications, then presses
// Submit. Both must match (FP.CardDeck, two attempts, mastery 6 of 7 on the first
// attempt). Scenario order and the two distractor justifications per scenario are
// fixed by seed 22. Source: FanPedia pp. 131-133, 143, 165, 166.
// Needs the FanPedia kit: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js (../shared-libs/).

const K = FP.p5;
const SIM_ID = 'ch22-fan-base-isolation-selector';
const SEED = 22;

// ---------- canvas layout ----------
let canvasWidth = 800;
const drawHeight = 470;
let controlHeight = K.controlHeightFor(3);
let canvasHeight = drawHeight + controlHeight;
const margin = 10;

// ---------- content (chapter specification) ----------
const RECS = ['Unitary base', 'Isolation base', 'Inertia base', 'Isolators directly under the fan', 'No added base or isolation'];
const SCENARIOS = [
  { n: 1, id: 's1-7si-slab', short: 'Arr. 7SI on a plant slab',
    text: 'Arrangement 7SI fan, slab on grade in a plant, no isolation requested.', rec: 0,
    just: '7SI ships on a unitary base as standard; unitary bases are designed for use without isolators.' },
  { n: 2, id: 's2-arr1-mezzanine', short: 'Arr. 1 on a mezzanine above offices',
    text: 'Arrangement 1 belt-driven SWSI fan with motor, on a mezzanine above offices; isolation required.', rec: 1,
    just: 'Isolation bases give fan, motor and drive a common support and usually sit on spring or RIS isolators.' },
  { n: 3, id: 's3-9f-springs', short: 'Spec: Arr. 9F with springs under the fan',
    text: 'Spec reads "Arrangement 9F with springs under the fan".', rec: 1,
    just: '9F is not suitable for isolators directly under the fan; FanPedia says use Arrangement 1 with a separate isolation base.' },
  { n: 4, id: 's4-arr8-long', short: 'Long direct-drive Arr. 8 on springs',
    text: 'Long direct-drive Arrangement 8 fan on springs; motor, coupling, shaft and bearings must stay aligned.', rec: 2,
    just: 'Inertia bases are typically used on longer direct-drive fans to mitigate assembly deflection and hold alignment.' },
  { n: 5, id: 's5-roof-vent', short: 'Commercial roof ventilator on a curb',
    text: 'Commercial roof ventilator on a roof curb.', rec: 4,
    just: 'Commercial roof ventilators are internally isolated; no other isolation is required.' },
  { n: 6, id: 's6-arr4-30in', short: 'Arr. 4, 30 in impeller, no separate base',
    text: 'Arrangement 4 fan with a 30 in impeller; isolation wanted with no separate base.', rec: 3,
    just: 'Direct mounting under the fan\'s foundation holes is usually limited to impellers 36.5 in or less; 30 in qualifies.' },
  { n: 7, id: 's7-inlet-box', short: 'Fan and detached inlet box, plant floor',
    text: 'Fan and detached inlet box mounted together on a base on a plant floor; no isolation.', rec: 0,
    just: 'Fan and inlet box can share one base on the same plane; without isolators that base is a unitary base.' }
];
// Two distractor justifications per scenario from the other six rows, then the three
// options shuffled, all from one seed-22 stream (data order), so every learner sees the same.
(function buildJustifications() {
  const rng = FP.rng.seeded(SEED);
  SCENARIOS.forEach(s => {
    const others = FP.rng.shuffle(SCENARIOS.filter(o => o !== s).map(o => o.just), rng).slice(0, 2);
    s.options = FP.rng.shuffle([s.just].concat(others), rng);
    s.answerText = RECS[s.rec] + ': ' + s.just;
  });
})();

const LETTERS = ['A', 'B', 'C'];
const MASTERY = 6;
const MSG_REC_ARR = 'Check the arrangement and impeller size against the mounting rules first.';
const MSG_REC = 'Ask whether isolation is needed, then what the arrangement allows.';
const MSG_JUST = 'Right choice, wrong reason. Which FanPedia rule decides this case?';
const PROMPT = 'What should this fan sit on?';
const REVIEW = 'Reread the base types and mounting methods, then press Start over';
const NOTE = ['Illustrative scenarios', 'Rules: FanPedia pp. 131-133, 143, 165, 166', 'Keys: 1-5 base, A-C reason, Enter submits'];

function hintFor(card, choice) {
  if (choice.rec !== card.rec) return (card.n === 3 || card.n === 6) ? MSG_REC_ARR : MSG_REC;
  return MSG_JUST;
}

// ---------- engine ----------
const deck = new FP.CardDeck({
  cards: SCENARIOS, seed: SEED, attempts: 2, retryMissed: false,
  noun: 'Scenarios', mastery: MASTERY, reviewPointer: REVIEW, id: SIM_ID,
  check: (card, choice) => choice.rec === card.rec && card.options[choice.just] === card.just,
  messages: {
    correct: res => FP.msg.OK + ' Correct: ' + res.card.just,
    retry: res => FP.msg.BAD + ' ' + hintFor(res.card, res.chosen) + ' Try again (1 attempt left).',
    missed: res => FP.msg.BAD + ' ' + hintFor(res.card, res.chosen) + ' The answer is ' + RECS[res.card.rec] +
      ', because: ' + res.card.just + ' This one counts as missed.'
  }
});

// ---------- per-scenario display state ----------
let selRec = -1, selJust = -1;
let lastRes = null;
let firstChoices = {};   // card id -> {rec, just} of the first attempt
let summaryPage = 0;
let contentTop = 60;
let recRows = [0, 1], justRow = 1;   // control rows used by the labels

// ---------- controls ----------
let recButtons = [], justButtons = [];
let submitButton, nextButton, restartButton;
const keys = K.keys.bind({
  '1': () => pickRec(0), '2': () => pickRec(1), '3': () => pickRec(2), '4': () => pickRec(3), '5': () => pickRec(4),
  a: () => pickJust(0), b: () => pickJust(1), c: () => pickJust(2),
  Enter: enterKey
});

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));

  // Create every control before positioning any of them
  RECS.forEach((r, i) => {
    const b = K.button((i + 1) + '. ' + r, () => pickRec(i));
    b.addClass('choice');
    b.attribute('aria-label', 'Recommendation ' + (i + 1) + ': ' + r);
    recButtons.push(b);
  });
  LETTERS.forEach((l, i) => {
    const b = K.button('Reason ' + l, () => pickJust(i));
    b.addClass('choice');
    justButtons.push(b);
  });
  submitButton = K.button('Submit', submit);
  nextButton = K.button('Next scenario', nextScenario);
  restartButton = K.button(FP.msg.START_OVER, resetAll, { variant: 'secondary' });

  positionControls();
  resetAll();
  describe('Fan Base and Isolation Selector: seven illustrative fan installations. For each, choose one of five ' +
    'recommendations (unitary base, isolation base, inertia base, isolators directly under the fan, or no added base or ' +
    'isolation) and one of three justifications, then press Submit. Two attempts per scenario; a summary lists every answer.');
  noLoop();
}

function labelX() { return canvasWidth >= 560 ? 132 : margin; }

// Rows: recommendations (wrap as needed) | reasons A-C + Submit | Next, Start over.
function positionControls() {
  let r = K.flowButtons(0, recButtons, { x: labelX() });
  recRows = [0, r];
  const rr = r;
  r = K.flowButtons(r, justButtons.concat(['|', submitButton]), { x: labelX() });
  justRow = rr;
  r = K.flowButtons(r, [nextButton, restartButton], { x: inSummary() ? margin : labelX() });
  const ch = K.controlHeightFor(r);
  if (ch !== controlHeight) {
    controlHeight = ch;
    canvasHeight = drawHeight + controlHeight;
    K.config({ controlHeight });
    resizeCanvas(canvasWidth, canvasHeight);
  }
}

function resetAll() {
  deck.newRound(SEED);          // same seed-22 order on every Start over
  selRec = -1; selJust = -1; lastRes = null; firstChoices = {}; summaryPage = 0;
  updateButtons();
  redraw();
}

function inSummary() { return deck.state().phase === 'summary'; }
function card() { return deck.state().card; }
function choosing() { return deck.state().phase === 'choose'; }

function pickRec(i) {
  if (!choosing()) return;
  selRec = i;
  afterPick();
}
function pickJust(i) {
  if (!choosing()) return;
  selJust = i;
  afterPick();
}
// Once both parts are chosen, Submit takes focus, so Enter submits from the keyboard.
function afterPick() {
  updateButtons();
  if (selRec >= 0 && selJust >= 0) submitButton.elt.focus();
  redraw();
}

function submit() {
  if (!choosing() || selRec < 0 || selJust < 0) return;
  const c = card();
  if (deck.state().attempt === 1) firstChoices[c.id] = { rec: selRec, just: selJust };
  const res = deck.place({ rec: selRec, just: selJust });
  if (res.status === 'ignored') return;
  lastRes = res;
  // A retry clears the wrong part so the next Submit is a new choice.
  if (res.status === 'retry') {
    if (res.chosen.rec !== c.rec) { selRec = -1; selJust = -1; } else selJust = -1;
  }
  FP.announce(res.message);
  const had = document.activeElement;
  updateButtons();
  K.keepFocus(had, [submitButton].concat(recButtons, justButtons, [nextButton, restartButton]));
  redraw();
}

function nextScenario() {
  if (inSummary()) { flipSummaryPage(); return; }
  if (deck.state().phase !== 'feedback') return;
  deck.next();
  selRec = -1; selJust = -1; lastRes = null;
  if (inSummary()) {
    FP.announce(summaryLines().join(' '));
  } else {
    const st = deck.state();
    FP.announce('Scenario ' + (st.index + 1) + ' of ' + st.count + ': ' + st.card.text + ' ' + PROMPT);
  }
  const had = document.activeElement;
  updateButtons();
  K.keepFocus(had, [nextButton, restartButton].concat(recButtons));
  if (!inSummary() && (!had || had === nextButton.elt || had === document.body)) recButtons[0].elt.focus();
  redraw();
}

function enterKey() {
  const ph = deck.state().phase;
  if (ph === 'choose') submit();
  else if (ph === 'feedback') nextScenario();
  else if (summaryPaged()) flipSummaryPage();
}

function updateButtons() {
  const st = deck.state();
  const ch = st.phase === 'choose';
  const c = st.card;
  const locked = st.phase === 'feedback';
  RECS.forEach((r, i) => {
    const b = recButtons[i];
    K.setEnabled(b, ch);
    b.attribute('aria-pressed', i === selRec && ch ? 'true' : 'false');
    b.removeClass('selected');
    if (i === selRec && ch) b.addClass('selected');
    let label = (i + 1) + '. ' + r;
    if (locked && c && i === c.rec) label = FP.msg.OK + ' ' + label;
    else if (locked && lastRes && lastRes.chosen.rec === i) label = FP.msg.BAD + ' ' + label;
    b.html(label);
    b.style('display', inSummary() ? 'none' : '');
  });
  LETTERS.forEach((l, i) => {
    const b = justButtons[i];
    K.setEnabled(b, ch);
    b.attribute('aria-pressed', i === selJust && ch ? 'true' : 'false');
    b.removeClass('selected');
    if (i === selJust && ch) b.addClass('selected');
    b.attribute('aria-label', 'Reason ' + l + ': ' + (c && c.options ? c.options[i] : ''));
    b.style('display', inSummary() ? 'none' : '');
  });
  K.setEnabled(submitButton, ch && selRec >= 0 && selJust >= 0);
  submitButton.style('display', inSummary() ? 'none' : '');
  const paged = summaryPaged();
  K.setEnabled(nextButton, paged || locked);
  nextButton.html(inSummary() ? (paged ? (summaryPage === 0 ? 'Scenarios 5-7' : 'Scenarios 1-4') : 'Summary')
    : (st.isLast ? 'See summary' : 'Next scenario'));
  if (inSummary() && !paged) nextButton.style('display', 'none'); else nextButton.style('display', '');
  positionControls();
}

// ---------- drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  const y = K.title('Fan Base and Isolation Selector');
  const st = deck.state();
  const s = deck.summary();
  const left = s.firstAttempt + ' of ' + SCENARIOS.length + ' first-attempt correct';
  const right = inSummary() ? (summaryPaged() ? 'Summary ' + (summaryPage + 1) + ' of 2' : 'Summary')
    : 'Scenario ' + (st.index + 1) + ' of ' + st.count + ' · ' + st.attemptLabel;
  const top = K.statusLine(left, right, null, { y: y - 2 });
  K.note(NOTE, { lines: 2 });
  contentTop = top;
  if (inSummary()) drawSummary(top); else drawScenario(top);

  // control-region labels (wide screens only)
  if (labelX() > margin) {
    noStroke();
    fill(K.tok('--fp-text'));
    textSize(15);
    textStyle(BOLD);
    textAlign(LEFT, CENTER);
    if (!inSummary()) {
      text('Recommend:', margin, K.controlLabel(recRows[0]));
      text('Justify:', margin, K.controlLabel(justRow));
    }
    textStyle(NORMAL);
  }
}

// Room kept clear for the data label (one line, or two on narrow canvases).
function noteSpace() {
  textSize(13);
  return textWidth(NOTE.join(' · ')) > canvasWidth - 2 * margin ? 40 : 24;
}

function drawLines(lines, x, y, lh) {
  for (let i = 0; i < lines.length; i++) text(lines[i], x, y + i * lh);
  return lines.length * lh;
}

// Lay out the scenario screen at text size ts; draws when doDraw; returns the bottom y.
function layoutScenario(top, ts, doDraw) {
  const st = deck.state();
  const c = st.card;
  const innerW = canvasWidth - 2 * margin;
  const lh = ts * 1.3;
  const locked = st.phase === 'feedback';
  let y = top + 2;
  textSize(ts);
  textAlign(LEFT, TOP);
  noStroke();

  // scenario panel
  textStyle(BOLD);
  const head = 'Scenario ' + (st.index + 1) + ': ';
  const headW = textWidth(head);
  textStyle(NORMAL);
  const sLines = K.wrapLines(c.text, innerW - 20 - headW);
  const boxH = sLines.length * lh + 14;
  if (doDraw) {
    K.panel(margin, y, innerW, boxH, { fill: '--fp-primary-bg', stroke: '--fp-primary', weight: 1.5 });
    noStroke();
    fill(K.tok('--fp-text'));
    textStyle(BOLD);
    text(head, margin + 10, y + 7);
    textStyle(NORMAL);
    drawLines(sLines, margin + 10 + headW, y + 7, lh);
  }
  y += boxH + 8;

  // prompt + current recommendation
  const recText = selRec >= 0 && !locked ? 'Your recommendation: ' + RECS[selRec]
    : (locked ? 'Your recommendation: ' + RECS[lastRes.chosen.rec] : 'Your recommendation: none yet (keys 1-5)');
  textStyle(BOLD);
  const pw = textWidth(PROMPT) + 16;
  textStyle(NORMAL);
  const twoLine = pw + textWidth(recText) >= innerW;
  if (doDraw) {
    fill(K.tok('--fp-text'));
    textStyle(BOLD);
    text(PROMPT, margin, y);
    textStyle(NORMAL);
    fill(K.tok(selRec >= 0 || locked ? '--fp-primary-dark' : '--fp-text-muted'));
    if (twoLine) text(recText, margin, y + lh); else text(recText, margin + pw, y);
  }
  y += lh * (twoLine ? 2 : 1) + 6;
  if (doDraw) {
    fill(K.tok('--fp-text'));
    textStyle(BOLD);
    text('Which rule justifies it? (keys A-C)', margin, y);
    textStyle(NORMAL);
  }
  y += lh + 4;

  // justification cards
  for (let i = 0; i < 3; i++) {
    const lines = K.wrapLines(c.options[i], innerW - 54);
    let h = lines.length * lh + 12;
    let bg = '--fp-ctrl-bg', border = '--fp-border', weight = 1, dashed = false, tag = '', ink = '--fp-text';
    const correctOpt = c.options[i] === c.just;
    if (!locked && i === selJust) { bg = '--fp-primary-bg'; border = '--fp-primary'; weight = 3; tag = FP.msg.OK + ' selected'; ink = '--fp-primary-dark'; }
    if (locked && lastRes && lastRes.chosen.just === i && !correctOpt) {
      bg = '--fp-incorrect-bg'; border = '--fp-incorrect'; weight = 2; dashed = true; tag = FP.msg.BAD + ' your reason'; ink = '--fp-incorrect';
    }
    if (locked && correctOpt) {
      bg = '--fp-correct-bg'; border = '--fp-correct'; weight = 3; ink = '--fp-correct';
      tag = FP.msg.OK + (lastRes && lastRes.chosen.just === i ? ' your reason: correct' : ' correct reason');
    }
    const tagSize = Math.max(ts - 2, 12);
    if (tag) {
      textSize(tagSize); textStyle(BOLD);
      const tw = textWidth(tag);
      textStyle(NORMAL); textSize(ts);
      if (44 + textWidth(lines[lines.length - 1]) + 16 + tw > innerW - 8) h += tagSize + 2;
    }
    if (doDraw) {
      K.panel(margin, y, innerW, h, { fill: bg, stroke: border, weight: weight, dashed: dashed });
      noStroke();
      fill(K.tok(border === '--fp-border' ? '--fp-text-muted' : border));
      circle(margin + 20, y + h / 2, 26);
      fill(K.tok('--fp-ctrl-bg'));
      textStyle(BOLD);
      textAlign(CENTER, CENTER);
      text(LETTERS[i], margin + 20, y + h / 2);
      textAlign(LEFT, TOP);
      textStyle(NORMAL);
      fill(K.tok('--fp-text'));
      drawLines(lines, margin + 44, y + 6, lh);
      if (tag) {
        textSize(tagSize); textStyle(BOLD); fill(K.tok(ink));
        textAlign(RIGHT, TOP);
        text(tag, margin + innerW - 8, y + h - tagSize - 5);
        textAlign(LEFT, TOP); textStyle(NORMAL); textSize(ts);
      }
    }
    y += h + 6;
  }

  // feedback
  y += 2;
  let msg, kind;
  if (lastRes) { msg = lastRes.message; kind = lastRes.kind; }
  else { msg = 'Choose a recommendation and a reason, then press Submit (Enter).'; kind = 'info'; }
  if (kind !== 'info') textStyle(BOLD);
  const fLines = K.wrapLines(msg, innerW - 20);
  textStyle(NORMAL);
  const fh = fLines.length * lh + 14;
  if (doDraw) {
    if (kind === 'info') {
      fill(K.tok('--fp-text-muted'));
      textStyle(ITALIC);
      drawLines(fLines, margin, y, lh);
      textStyle(NORMAL);
    } else {
      const ok = kind === 'ok';
      K.panel(margin, y, innerW, fh, { fill: ok ? '--fp-correct-bg' : '--fp-incorrect-bg',
        stroke: ok ? '--fp-correct' : '--fp-incorrect', weight: 2, dashed: !ok, radius: 10 });
      noStroke();
      fill(K.tok(ok ? '--fp-correct' : '--fp-incorrect'));
      textStyle(BOLD);
      drawLines(fLines, margin + 10, y + 7, lh);
      textStyle(NORMAL);
    }
  }
  return y + (kind === 'info' ? fLines.length * lh : fh);
}

function drawScenario(top) {
  const maxY = drawHeight - noteSpace();
  const ts = K.fitTextSize(s => layoutScenario(top, s, false), maxY, 16, 12);
  layoutScenario(top, ts, true);
}

// ---------- summary ----------
const PAGE_ROWS = [[0, 1, 2, 3], [4, 5, 6]];
function summaryLines() {
  const s = deck.summary();
  return [s.lines[0] + '.', s.lines[1]];
}
function summaryPaged() {
  if (!inSummary()) return false;
  return layoutSummary(contentTop, 12, false, [0, 1, 2, 3, 4, 5, 6]) > drawHeight - noteSpace();
}
function flipSummaryPage() {
  if (!summaryPaged()) return;
  summaryPage = 1 - summaryPage;
  const rows = PAGE_ROWS[summaryPage];
  FP.announce('Summary, scenarios ' + (rows[0] + 1) + ' to ' + (rows[rows.length - 1] + 1) + '.');
  updateButtons();
  redraw();
}
// Rows are in the order the scenarios were shown.
function layoutSummary(top, ts, doDraw, rows) {
  const innerW = canvasWidth - 2 * margin;
  const lh = ts * 1.3;
  const small = Math.max(ts - 2, 12);
  const slh = small * 1.3;
  const order = deck.order;
  let y = top + 2;
  textAlign(LEFT, TOP);
  noStroke();
  for (const i of rows) {
    const c = order[i];
    const pl = deck.placements.find(p => p.card === c);
    if (!pl) continue;
    const first = firstChoices[c.id] || pl.chosen;
    const firstOk = pl.correct && pl.attempts === 1;
    const result = firstOk ? 'correct on the first attempt' : (pl.correct ? 'correct on the second attempt' : 'missed');
    textSize(ts);
    textStyle(BOLD);
    const head = K.wrapLines((firstOk ? FP.msg.OK : FP.msg.BAD) + ' ' + (i + 1) + '. ' + c.short + ': ' +
      (firstOk ? RECS[c.rec] + ', ' : '') + result, innerW - 16);
    textStyle(NORMAL);
    textSize(small);
    // A first-attempt success needs no detail; otherwise show the learner's first answer and the rule.
    const body = firstOk ? [] : K.wrapLines('Your first answer: ' + RECS[first.rec] + ', reason ' + LETTERS[first.just] +
      '. Correct: ' + RECS[c.rec] + '. ' + c.just, innerW - 16);
    const h = head.length * lh + body.length * slh + 10;
    if (doDraw) {
      K.panel(margin, y, innerW, h, { fill: firstOk ? '--fp-correct-bg' : '--fp-incorrect-bg',
        stroke: firstOk ? '--fp-correct' : '--fp-incorrect', dashed: !firstOk, radius: 6 });
      noStroke();
      textSize(ts); textStyle(BOLD);
      fill(K.tok(firstOk ? '--fp-correct' : '--fp-incorrect'));
      drawLines(head, margin + 8, y + 4, lh);
      textStyle(NORMAL); textSize(small);
      fill(K.tok('--fp-text'));
      drawLines(body, margin + 8, y + 4 + head.length * lh, slh);
    }
    y += h + 4;
  }
  if (rows[rows.length - 1] === 6) {
    textSize(ts);
    textStyle(BOLD);
    const v = K.wrapLines(summaryLines().join(' '), innerW);
    if (doDraw) {
      fill(K.tok(deck.summary().mastered ? '--fp-correct' : '--fp-text'));
      drawLines(v, margin, y + 2, lh);
    }
    textStyle(NORMAL);
    y += v.length * lh + 2;
  }
  return y;
}
function drawSummary(top) {
  const maxY = drawHeight - noteSpace();
  const rows = summaryPaged() ? PAGE_ROWS[summaryPage] : [0, 1, 2, 3, 4, 5, 6];
  const ts = K.fitTextSize(s => layoutSummary(top, s, false, rows), maxY, 16, 12);
  layoutSummary(top, ts, true, rows);
}

// ---------- keyboard and resizing ----------
function keyPressed() { return keys(); }
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  updateButtons();
  redraw();
}
function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
