// AMCA Installation Type Sorter
// CANVAS_HEIGHT: 595
// Eight illustrative installations, shuffled. For each, the learner answers two
// questions (is the inlet ducted? is the outlet ducted?), places the description in
// one of four bins (Type A, B, C, D) and commits it. Only the first committed answer
// is scored; after a miss the learner may move the item once more, unscored.
// Rule (chapter 25): No/No = A, No/Yes = B, Yes/No = C, Yes/Yes = D. A cabinet,
// plenum or room is open space, not a duct.
// Built on the FanPedia kit: FP.CardDeck (order, score, mastery, unscored practice
// try), FP.p5 (layout, text, controls, keys), FD (airflow arrows).

const K = FP.p5;
const SIM_ID = 'ch25-amca-installation-type-sorter';
let canvasWidth = 800;
const drawHeight = 480;
const controlHeight = K.controlHeightFor(3);   // 115: predictions (1 or 2 rows), buttons
const canvasHeight = drawHeight + controlHeight;
const MASTERY = 7;
const QUESTION = 'Is each side of this fan free or ducted?';

// Bin definitions (shown at all times) and the two-question rule.
const TYPES = {
  A: { inlet: false, outlet: false, def: 'Free inlet, free outlet', abbr: 'Free in, free out' },
  B: { inlet: false, outlet: true, def: 'Free inlet, ducted outlet', abbr: 'Free in, ducted out' },
  C: { inlet: true, outlet: false, def: 'Ducted inlet, free outlet', abbr: 'Ducted in, free out' },
  D: { inlet: true, outlet: true, def: 'Ducted inlet, ducted outlet', abbr: 'Ducted in, ducted out' }
};
const LETTERS = ['A', 'B', 'C', 'D'];
function typeFor(inlet, outlet) { return inlet ? (outlet ? 'D' : 'C') : (outlet ? 'B' : 'A'); }

// The spec's eight descriptions (illustrative installations), with a short label for the end view.
const CARDS = [
  { id: 1, answer: 'A', short: 'Plug fan in an air handler cabinet',
    desc: 'A plug fan inside an air handler cabinet, drawing from the cabinet and discharging into it',
    why: 'Neither side has a duct; the cabinet is open space around the fan.' },
  { id: 2, answer: 'A', short: 'Propeller wall fan, no ductwork',
    desc: 'A propeller wall fan drawing from a warehouse and discharging outdoors, with no ductwork',
    why: 'Both the inlet and the outlet are open to their surroundings.' },
  { id: 3, answer: 'B', short: 'Utility set, supply duct on outlet',
    desc: 'A utility set with an open inlet in an equipment room and a supply duct bolted to its outlet',
    why: 'The inlet is free and the outlet is ducted.' },
  { id: 4, answer: 'B', short: 'Pressure blower, open funnel, process duct',
    desc: 'A pressure blower with an open inlet funnel in a work area, discharging into a process duct',
    why: 'An open funnel is a free inlet; the process duct makes the outlet ducted.' },
  { id: 5, answer: 'C', short: 'Roof upblast fan on a kitchen duct',
    desc: 'A roof upblast exhaust fan fed by a kitchen exhaust duct from below, discharging to atmosphere',
    why: 'The inlet is ducted and the discharge is open to the air.' },
  { id: 6, answer: 'C', short: 'Centrifugal fan from a hood, no outlet duct',
    desc: 'A centrifugal fan drawing through a duct from a process hood and discharging directly outdoors with no outlet duct',
    why: 'Ducted inlet, free outlet, whatever the fan type.' },
  { id: 7, answer: 'D', short: 'Inline fan in a duct run',
    desc: 'An inline fan installed in the middle of a duct run',
    why: 'Both sides are connected to ductwork.' },
  { id: 8, answer: 'D', short: 'Centrifugal fan, collector to stack',
    desc: 'A centrifugal fan with an inlet duct from a dust collector and an outlet duct to a stack',
    why: 'Both sides are ducted.' }
].map(c => Object.assign(c, { answerText: 'Type ' + c.answer }));

// Spec feedback. Correct: "Correct: Type <letter>. <Why>." Incorrect: "Not quite. <Why>"
// followed by the correct letter.
function missText(res) {
  return FP.msg.BAD + ' Not quite. ' + res.card.why + ' Correct type: ' + res.card.answer + '.';
}

const deck = new FP.CardDeck({
  cards: CARDS, shuffle: true, attempts: 1, retryMissed: false, practiceTry: true,
  noun: 'Descriptions', mastery: MASTERY, id: SIM_ID,
  reviewPointer: 'Review "AMCA Installation Type" and the two-question rule, then press Start over',
  messages: { missed: missText }
});

let chosen = null;      // bin letter picked for the current commit
let feedback = null;    // {kind, message, scored, pred} after a commit
let notice = '';        // why a commit was refused (incomplete answer)
let firstPick = [];     // per position: {letter, correct} of the scored commit

let inletRadio, outletRadio, binButtons = [], commitButton, nextButton, startOverButton;
let narrow = false;

const keys = K.keys.bind({
  a: () => pickBin('A'), b: () => pickBin('B'), c: () => pickBin('C'), d: () => pickBin('D'),
  Enter: enterKey
});
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));

  inletRadio = K.radio([['no', 'No, free'], ['yes', 'Yes, ducted']],
    { name: 'amca-inlet', label: 'Is the inlet ducted?', onChange: answerChanged });
  outletRadio = K.radio([['no', 'No, free'], ['yes', 'Yes, ducted']],
    { name: 'amca-outlet', label: 'Is the outlet ducted?', onChange: answerChanged });
  for (const L of LETTERS) {
    const b = K.button('Type ' + L, () => pickBin(L));
    b.addClass('choice');
    b.attribute('aria-pressed', 'false');
    b.attribute('aria-keyshortcuts', L.toLowerCase());
    b.attribute('aria-label', 'Bin Type ' + L + ': ' + TYPES[L].def);
    binButtons.push(b);
  }
  commitButton = K.button('Commit', commit);
  nextButton = K.button('Next description', nextCard);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  updateControls();
  describe('AMCA installation type sorter. Eight illustrative fan installations are shown one at a time. ' +
    'For each, answer whether the inlet is ducted and whether the outlet is ducted, then place it in one of ' +
    'four bins: Type A free inlet and free outlet, Type B free inlet and ducted outlet, Type C ducted inlet ' +
    'and free outlet, Type D ducted inlet and ducted outlet. The first committed answer is scored; mastery is 7 of 8.');
  FP.announce('Description 1 of 8. ' + deck.state().card.desc + '. ' + QUESTION);
}

// ---------- layout ----------

function cardRect() {
  const top = 66;
  if (narrow) return { text: [10, top, canvasWidth - 20, 212], diag: null };
  const h = 196, tw = Math.round((canvasWidth - 20) * 0.62);
  return { text: [10, top, tw - 6, h], diag: [10 + tw + 2, top, canvasWidth - 20 - tw - 2, h] };
}

function binRects() {
  const top = narrow ? 284 : 268;
  const bottom = drawHeight - 26;
  const gap = 8;
  if (!narrow) {
    const w = (canvasWidth - 20 - 3 * gap) / 4;
    return LETTERS.map((L, i) => [10 + i * (w + gap), top, w, bottom - top]);
  }
  const w = (canvasWidth - 20 - gap) / 2, h = (bottom - top - gap) / 2;
  return LETTERS.map((L, i) => [10 + (i % 2) * (w + gap), top + Math.floor(i / 2) * (h + gap), w, h]);
}

function positionControls() {
  const rects = binRects();
  binButtons.forEach((b, i) => b.position(rects[i][0] + 6, rects[i][1] + 6));
  const labelW = narrow ? 112 : 128;
  inletRadio.position(10 + labelW, K.controlRow(0) + 4);
  if (narrow) {
    outletRadio.position(10 + labelW, K.controlRow(1) + 4);
  } else {
    outletRadio.position(Math.round(canvasWidth / 2) + labelW, K.controlRow(0) + 4);
  }
  K.flowButtons(narrow ? 2 : 1, [commitButton, nextButton, null, startOverButton], { groupGap: narrow ? 8 : 16 });
}

// ---------- drawing ----------

function draw() {
  K.regions(drawHeight, controlHeight);
  const st = deck.state();
  let y = K.title('AMCA Installation Type Sorter');
  const right = st.phase === 'summary' ? 'All 8 placed'
    : (canvasWidth < 400 ? '' : 'Description ') + (st.index + 1) + ' of ' + st.count;
  y = K.statusLine('Correct on first try: ' + deck.score.firstAttempt() + ' of ' + CARDS.length, right, null, { y: y - 4 });
  K.note(narrow ? ['Illustrative installations', 'Keys: A–D bin, Enter']
    : ['Illustrative installations', 'Keys: A–D choose a bin, Enter commits or goes on']);

  const r = cardRect();
  K.panel(...r.text);
  if (st.phase === 'summary') drawSummaryPanel(...r.text);
  else drawCardPanel(...r.text);
  if (r.diag) { K.panel(...r.diag); drawSchematic(...r.diag); }
  drawBins();
  drawControlLabels();
}

// Paragraph list renderer: [{t, bold, muted, color, gap, small}] → y below.
function paras(list, x, y, w, ts, dry) {
  for (const p of list) {
    const s = p.small ? Math.max(12, ts - 2) : ts;
    textSize(s);
    textStyle(p.bold ? BOLD : NORMAL);
    fill(p.color || FP.tok(p.muted ? 'text-muted' : 'text'));
    noStroke();
    y += p.gap || 0;
    y = K.wrapText(p.t, x, y, w, Math.round(s * 1.3), { dryRun: dry });
  }
  textStyle(NORMAL);
  return y;
}

function drawCardPanel(px, py, pw, ph) {
  const st = deck.state();
  const card = st.card;
  const x = px + 10, w = pw - 20, top = py + 8;
  const body = [
    { t: card.desc + '.' },
    { t: QUESTION, bold: true, color: FP.tok('primary-dark'), gap: 6 }
  ];
  if (notice) body.push({ t: 'ℹ ' + notice, muted: true, gap: 4 });
  const fb = [];
  if (feedback) {
    fb.push({ t: feedback.message, color: FP.tok(feedback.kind === 'ok' ? 'correct' : 'incorrect') });
    fb.push({ t: feedback.pred, muted: true, small: true, gap: 2 });
    if (deck.canPractice()) fb.push({ t: 'You may move it once more (not scored): pick a bin and commit.', muted: true, small: true });
  }
  const pad = 7;
  const layout = ts => {
    let yy = paras(body, x, top, w, ts, true);
    if (fb.length) yy = paras(fb, x + pad, yy + 8 + pad, w - 2 * pad, ts, true) + pad;
    return yy - top;
  };
  const ts = K.fitTextSize(layout, ph - 14, 16, 12);
  let yy = paras(body, x, top, w, ts, false);
  if (fb.length) {
    const fTop = yy + 8;
    const fH = paras(fb, x + pad, fTop + pad, w - 2 * pad, ts, true) + pad - fTop;
    const ok = feedback.kind === 'ok';
    K.panel(x - 3, fTop, w + 6, fH, { fill: ok ? '--fp-correct-bg' : '--fp-incorrect-bg',
      stroke: ok ? '--fp-correct' : '--fp-incorrect', dashed: !ok, weight: 2 });
    paras(fb, x + pad, fTop + pad, w - 2 * pad, ts, false);
  }
}

function drawSummaryPanel(px, py, pw, ph) {
  const s = deck.summary();
  const x = px + 10, w = pw - 20, top = py + 8;
  const list = [
    { t: 'Correct on first try: ' + s.firstAttempt + ' of ' + s.total, bold: true },
    { t: s.lines[1], color: FP.tok(s.mastered ? 'correct' : 'text') , gap: 2 },
    { t: 'The bins below now hold the correct contents. ' + FP.msg.OK + ' means your first answer put the item there; ' +
      FP.msg.BAD + ' means it did not (your first bin in brackets).', gap: 6 },
    { t: 'Two questions decide the type: is the inlet ducted, and is the outlet ducted? A cabinet, plenum or room is open space, not a duct.',
      muted: true, gap: 6 }
  ];
  if (narrow) list.pop();   // the rule stays in the lesson text; the bins need the room
  const ts = K.fitTextSize(t => paras(list, x, top, w, t, true) - top, ph - 14, 16, 12);
  const fTop = top - 5;
  const fH = paras(list.slice(0, 2), x, top, w, ts, true) - fTop + 5;
  K.panel(x - 4, fTop, w + 8, fH, { fill: '--fp-primary-bg', stroke: '--fp-primary', weight: 2 });
  paras(list, x, top, w, ts, false);
}

// Schematic of the answer (after a commit): inlet on the left, outlet on the right.
function drawSchematic(px, py, pw, ph) {
  const st = deck.state();
  const show = st.phase === 'summary' ? null : (feedback ? st.card.answer : null);
  noStroke();
  fill(FP.tok('text'));
  textAlign(CENTER, TOP);
  textSize(15);
  textStyle(BOLD);
  text(show ? 'Type ' + show + ': ' + TYPES[show].def.toLowerCase() : st.phase === 'summary' ? 'Inlet | fan | outlet' : 'Inlet ? | fan | outlet ?', px + pw / 2, py + 8);
  textStyle(NORMAL);
  const cy = py + ph / 2 + 6, cx = px + pw / 2, r = Math.min(30, pw * 0.12);
  const leftX = px + 12, rightX = px + pw - 12;
  const side = (ducted, x0, x1, label, isInlet) => {
    if (ducted === null) {
      noStroke(); fill(FP.tok('text-muted')); textSize(30); textAlign(CENTER, CENTER);
      text('?', (x0 + x1) / 2, cy);
    } else if (ducted) {
      stroke(FP.tok('edge')); strokeWeight(2); fill(FP.tok('metal'));
      rect(Math.min(x0, x1), cy - 18, Math.abs(x1 - x0), 36);
      FD.airflowArrow(null, { x1: Math.min(x0, x1) + 8, y1: cy, x2: Math.max(x0, x1) - 8, y2: cy, head: 9 });
    } else {
      // free: open air drawn as three converging (inlet) or spreading (outlet) arrows
      for (const dy of [-26, 0, 26]) {
        if (isInlet) FD.airflowArrow(null, { x1: x0, y1: cy + dy, x2: x1 - 8, y2: cy + dy * 0.3, head: 8, dashed: true });
        else FD.airflowArrow(null, { x1: x0 + 8, y1: cy + dy * 0.3, x2: x1, y2: cy + dy, head: 8, dashed: true });
      }
    }
    noStroke(); fill(FP.tok('text')); textSize(13); textAlign(CENTER, TOP);
    text(label + (ducted === null ? '' : ducted ? ': ducted' : ': free'), (x0 + x1) / 2, cy + 36);
  };
  const t = show ? TYPES[show] : null;
  side(t ? t.inlet : null, leftX, cx - r - 4, 'Inlet', true);
  side(t ? t.outlet : null, cx + r + 4, rightX, 'Outlet', false);
  stroke(FP.tok('text')); strokeWeight(2); fill(255);
  circle(cx, cy, 2 * r);
  noStroke(); fill(FP.tok('text')); textSize(13); textAlign(CENTER, CENTER);
  text('Fan', cx, cy);
  if (!show) {
    fill(FP.tok('text-muted')); textSize(13); textAlign(CENTER, BOTTOM);
    K.wrapText(st.phase === 'summary' ? 'Ducted side: a duct is bolted on. Free side: open space.'
      : 'Commit to see the answer drawn.', cx, py + ph - 34, pw - 16, 16, { align: CENTER, maxLines: 2 });
  }
  textAlign(LEFT, TOP);
}

function drawBins() {
  const st = deck.state();
  const rects = binRects();
  const done = st.phase === 'summary';
  LETTERS.forEach((L, i) => {
    const [x, y, w, h] = rects[i];
    const sel = chosen === L && !done;
    K.panel(x, y, w, h, { stroke: sel ? '--fp-primary' : '--fp-border', weight: sel ? 3 : 1 });
    noStroke();
    fill(FP.tok('text'));
    textAlign(LEFT, TOP);
    // During the round the bin's button sits at its top; at the end it is replaced by a heading.
    let bh = binButtons[i].elt.offsetHeight || 30;
    if (done) {
      textStyle(BOLD); textSize(15);
      text('Type ' + L, x + 8, y + 7);
      textStyle(NORMAL);
      bh = 12;
    }
    textSize(narrow ? 12 : 13);
    const def = textWidth(TYPES[L].def) > w - 14 ? TYPES[L].abbr : TYPES[L].def;   // one line at 320 px
    let yy = K.wrapText(def, x + 8, y + bh + 12, w - 14, narrow ? 15 : 17);
    stroke(FP.tok('border')); strokeWeight(1);
    line(x + 6, yy + 3, x + w - 6, yy + 3);
    noStroke();
    yy += 8;
    if (done) drawBinAnswers(L, x + 8, yy, w - 14, y + h - yy - 4);
    else drawBinChips(L, x + 8, yy, w - 14);
  });
}

// During the round: chips with the description number and ✓/✗ (solid / dashed border).
function drawBinChips(L, x, y, w) {
  let cx = x, cy = y;
  textSize(13);
  firstPick.forEach((p, pos) => {
    if (!p || p.letter !== L) return;
    const label = (pos + 1) + ' ' + (p.correct ? FP.msg.OK : FP.msg.BAD);
    const cw = textWidth(label) + 14;
    if (cx + cw > x + w) { cx = x; cy += 26; }
    K.panel(cx, cy, cw, 22, { fill: p.correct ? '--fp-correct-bg' : '--fp-incorrect-bg',
      stroke: p.correct ? '--fp-correct' : '--fp-incorrect', dashed: !p.correct, weight: 2, radius: 5 });
    noStroke();
    fill(FP.tok(p.correct ? 'correct' : 'incorrect'));
    textAlign(LEFT, CENTER);
    text(label, cx + 7, cy + 11);
    cx += cw + 6;
  });
  textAlign(LEFT, TOP);
}

// End of round: each bin shows its correct contents, marked against the learner's first answer.
function drawBinAnswers(L, x, y, w, h) {
  const items = [];
  deck.order.forEach((card, pos) => {
    if (card.answer !== L) return;
    const p = firstPick[pos];
    const ok = p && p.correct;
    items.push({ t: (ok ? FP.msg.OK : FP.msg.BAD) + ' ' + (pos + 1) + '. ' + card.short + (ok || !p ? '' : ' [' + p.letter + ']'), ok });
  });
  const layout = ts => {
    let yy = y;
    for (const it of items) { textSize(ts); yy = K.wrapText(it.t, x, yy, w, Math.round(ts * 1.25), { dryRun: true, maxLines: narrow ? 1 : 3 }) + 3; }
    return yy - y;
  };
  const ts = K.fitTextSize(layout, h, 14, 12);
  let yy = y;
  for (const it of items) {
    fill(FP.tok(it.ok ? 'correct' : 'incorrect'));
    textSize(ts);
    yy = K.wrapText(it.t, x, yy, w, Math.round(ts * 1.25), { maxLines: narrow ? 1 : 3 }) + 3;
  }
}

function drawControlLabels() {
  noStroke();
  fill(FP.tok('text'));
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(narrow ? 13 : 15);
  text('Inlet ducted?', 10, K.controlLabel(0));
  if (narrow) text('Outlet ducted?', 10, K.controlLabel(1));
  else text('Outlet ducted?', Math.round(canvasWidth / 2), K.controlLabel(0));
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
}

// ---------- actions ----------

function radioValue(r) { const v = r.value(); return v === 'yes' ? true : v === 'no' ? false : null; }
function clearRadio(r) { r.elt.querySelectorAll('input').forEach(i => { i.checked = false; }); }

function answerChanged() { notice = ''; }

function pickBin(L) {
  const st = deck.state();
  if (st.phase === 'summary' || (st.phase === 'feedback' && !deck.canPractice())) return;
  chosen = L;
  notice = '';
  updateControls();
  // After a miss, focus sits on Next; move it to Commit so Enter commits the unscored try.
  if (document.activeElement === nextButton.elt) commitButton.elt.focus();
  FP.announce('Type ' + L + ' selected: ' + TYPES[L].def + '. Press Commit.');
}

function commit() {
  const st = deck.state();
  const practice = st.phase === 'feedback' && deck.canPractice();
  if (st.phase !== 'choose' && !practice) return;
  const inlet = radioValue(inletRadio), outlet = radioValue(outletRadio);
  if (inlet === null || outlet === null) return setNotice('Answer both questions (inlet ducted? outlet ducted?) first.');
  if (!chosen) return setNotice('Choose a bin (Type A, B, C or D) first.');
  notice = '';
  const res = deck.place(chosen);
  if (res.status === 'ignored') return;
  const pairType = typeFor(inlet, outlet);
  const pred = 'Your answers: inlet ' + (inlet ? 'ducted' : 'free') + ', outlet ' + (outlet ? 'ducted' : 'free') +
    ' (that pair is Type ' + pairType + ')' + (pairType !== chosen ? '; you placed it in Type ' + chosen + '.' : '.');
  if (!res.practiceTry) firstPick[st.index] = { letter: chosen, correct: res.status === 'correct' };
  feedback = { kind: res.kind, message: res.message, pred };
  FP.announce(res.message + ' ' + pred);
  chosen = null;
  updateControls();
  focusAfterCommit();
}

function focusAfterCommit() {
  // Next keeps Enter meaning "go on"; keys A-D still move the item for the unscored try.
  if (!nextButton.elt.disabled) nextButton.elt.focus();
}

function setNotice(t) { notice = t; FP.announce(t); }

function nextCard() {
  const st = deck.state();
  if (st.phase !== 'feedback') return;
  deck.next();
  feedback = null;
  chosen = null;
  notice = '';
  clearRadio(inletRadio);
  clearRadio(outletRadio);
  updateControls();
  const s = deck.state();
  if (s.phase === 'summary') {
    const sum = deck.summary();
    FP.announce('All 8 placed. Correct on first try: ' + sum.firstAttempt + ' of 8. ' + sum.lines[1] +
      ' The bins now show the correct contents.');
    startOverButton.elt.focus();
  } else {
    FP.announce('Description ' + (s.index + 1) + ' of 8. ' + s.card.desc + '. ' + QUESTION);
    inletRadio.elt.querySelector('input').focus();
  }
}

function startOver() {
  deck.newRound();
  feedback = null; chosen = null; notice = ''; firstPick = [];
  clearRadio(inletRadio);
  clearRadio(outletRadio);
  updateControls();
  FP.announce('Started over. Description 1 of 8. ' + deck.state().card.desc + '. ' + QUESTION);
}

function enterKey() {
  const st = deck.state();
  if (st.phase === 'choose' || (st.phase === 'feedback' && deck.canPractice() && chosen)) commit();
  else if (st.phase === 'feedback') nextCard();
  else if (st.phase === 'summary') startOver();
}

function updateControls() {
  const had = document.activeElement;
  const st = deck.state();
  const canPlace = st.phase === 'choose' || (st.phase === 'feedback' && deck.canPractice());
  binButtons.forEach((b, i) => {
    if (st.phase === 'summary') b.hide(); else b.show();
    K.setEnabled(b, canPlace);
    b.attribute('aria-pressed', chosen === LETTERS[i] ? 'true' : 'false');
  });
  for (const r of [inletRadio, outletRadio]) r.elt.querySelectorAll('input').forEach(inp => { inp.disabled = !canPlace; });
  K.setEnabled(commitButton, canPlace);
  const commitLabel = st.phase === 'feedback' ? 'Commit again (not scored)' : 'Commit';
  commitButton.html(narrow && st.phase === 'feedback' ? 'Commit again' : commitLabel);
  commitButton.attribute('aria-label', commitLabel);
  K.setEnabled(nextButton, st.phase === 'feedback');
  const nextLabel = st.isLast ? 'See the bins' : 'Next description';
  nextButton.html(narrow && !st.isLast ? 'Next' : nextLabel);
  nextButton.attribute('aria-label', nextLabel);
  if (st.phase === 'summary') nextButton.hide(); else nextButton.show();
  positionControls();
  K.keepFocus(had, [...binButtons, commitButton, nextButton, startOverButton]);
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  updateControls();
}

function updateCanvasSize() {
  canvasWidth = K.updateCanvasSize(320);
  narrow = canvasWidth < 560;
}
