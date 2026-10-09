// Impeller Type Classifier - p5.js MicroSim (Chapter 8: Centrifugal and Axial Impeller Types)
// CANVAS_HEIGHT: 660
// Ten written impeller descriptions, shuffled, each sorted once into one of six bins:
// Backward inclined (centrifugal), Forward curved (centrifugal), Mixed flow, Axial fixed pitch,
// Axial adjustable pitch, Axial reversible. One scored placement per card; misplaced cards go
// to a review pile that can be redone, unscored, after card 10.
// Sources: FanPedia PDF p. 31 (centrifugal captions), pp. 6 and 32 (mixed flow), pp. 33-35
// (fixed and adjustable markings, cast or fabricated), p. 41 (reversible modes).
// Built on the FanPedia kit: FP.CardDeck (deck, score, mastery, review round), FP.p5 (layout,
// text, controls, keys).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js.

const K = FP.p5;
const SIM_ID = 'ch08-impeller-type-classifier';

let canvasWidth = 800;
const drawHeight = 510;
const controlHeight = K.controlHeightFor(4);   // six bins wrap to three rows at 320 px, plus navigation
const canvasHeight = drawHeight + controlHeight;
const MASTERY = 8;
const PROMPT = 'Where does the air go, and what do the blades look like?';
const SOURCE = 'Source: FanPedia PDF pp. 6, 31–35, 41';
const KEYS_HINT = 'Keys: 1–6 place the card, Enter for next';

const BINS = [
  { id: 'BI', name: 'Backward inclined (centrifugal)', short: 'Backward inclined', tiny: 'Backward incl.' },
  { id: 'FC', name: 'Forward curved (centrifugal)', short: 'Forward curved', tiny: 'Forward curved' },
  { id: 'MF', name: 'Mixed flow', short: 'Mixed flow', tiny: 'Mixed flow' },
  { id: 'AF', name: 'Axial, fixed pitch', short: 'Axial, fixed pitch', tiny: 'Axial fixed' },
  { id: 'AA', name: 'Axial, adjustable pitch', short: 'Axial, adjustable pitch', tiny: 'Axial adjustable' },
  { id: 'AR', name: 'Axial, reversible', short: 'Axial, reversible', tiny: 'Axial reversible' }
];
const BIN = Object.fromEntries(BINS.map(b => [b.id, b]));

// The 10 cards (spec table); tag is the short name shown on a placed chip.
const CARDS = [
  { tag: 'Flat blades, tips trail', answer: 'BI',
    text: 'Flat, single-thickness blades whose tips trail the direction of rotation; air leaves at a right angle to the shaft',
    why: 'Flat blades tilted backward against rotation define backward inclined.' },
  { tag: 'Short curved blades', answer: 'FC',
    text: 'Many short, shallow blades curved so their tips point in the direction of rotation, held by an end ring and tie rods',
    why: 'Tips pointing with rotation, plus end ring and tie rods, define forward curved.' },
  { tag: 'Tapered airfoil blades', answer: 'MF',
    text: 'Airfoil blades that taper from the front plate to the hub end, giving a larger tip width; air leaves partly along the shaft',
    why: 'A tapered blade with partly axial discharge is the hybrid axial-centrifugal impeller.' },
  { tag: 'Cast, one angle', answer: 'AF',
    text: 'Cast impeller with blades formed at one angle that cannot be changed',
    why: 'Cast or fabricated blades at one angle are fixed pitch.' },
  { tag: 'Clamped shanks', answer: 'AA',
    text: 'Separate blades whose shanks clamp into the hub so the blade angle can be reset',
    why: 'Clamped shanks allow the pitch to be reset.' },
  { tag: 'Two flow modes', answer: 'AR',
    text: 'One axial impeller shown in two modes: standard flow MP and reverse flow PM',
    why: 'An impeller built to move air either way along the shaft is reversible.' },
  { tag: '"F4/F6" fiberglass', answer: 'AA',
    text: 'Fiberglass blades on an aluminum hub, sold as the "F4/F6" impeller',
    why: 'FanPedia marks F4/F6 and FG4/FG6 as adjustable; fiberglass does not mean fixed.' },
  { tag: '"TF" fiberglass', answer: 'AF',
    text: 'Fiberglass "TF" impeller with molded blades',
    why: 'FanPedia marks the TF impeller as fixed.' },
  { tag: 'SWSI in inline housing', answer: 'BI',
    text: 'A single width single inlet wheel with backward-tilted flat blades in an inline (tubular) centrifugal fan',
    why: 'Air still leaves the wheel outward; the tubular housing turns it back in line, so the impeller is centrifugal.' },
  { tag: '"TCTA" impeller', answer: 'AF',
    text: '"TCTA" impeller, as listed in FanPedia\'s axial impeller types',
    why: 'FanPedia marks the TCTA impeller as fixed.' }
].map((c, i) => Object.assign(c, { id: 'card-' + (i + 1), answerText: BIN[c.answer].name }));

// Spec wording: correct "Correct: <bin>." + Why; incorrect "This one is <bin>." + Why.
const deck = new FP.CardDeck({
  cards: CARDS, shuffle: true, attempts: 1, retryMissed: true,
  noun: 'Cards', mastery: MASTERY,
  reviewPointer: 'Reread "Identifying an Impeller Type" and use the review pile',
  messages: {
    correct: res => FP.msg.OK + ' Correct: ' + res.card.answerText + '. ' + res.card.why,
    missed: res => FP.msg.BAD + ' This one is ' + res.card.answerText + '. ' + res.card.why
  },
  onComplete: () => { scoredMisses = deck.misses(); },
  id: SIM_ID
});
let scoredMisses = [];

let binButtons = [];
let nextButton, reviewButton, startOverButton;

const keys = K.keys.bind({
  '1': () => place(0), '2': () => place(1), '3': () => place(2),
  '4': () => place(3), '5': () => place(4), '6': () => place(5),
  Enter: advance
});
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));

  BINS.forEach((b, i) => {
    const btn = K.button(b.short, () => place(i));
    btn.addClass('choice');
    btn.attribute('aria-label', (i + 1) + ': ' + b.name);
    btn.attribute('aria-keyshortcuts', String(i + 1));
    binButtons.push(btn);
  });
  nextButton = K.button('Next card', advance);
  nextButton.attribute('aria-keyshortcuts', 'Enter');
  reviewButton = K.button('Redo review pile', review, { variant: 'secondary' });
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  updateControls();
  describe('Impeller type classifier. Ten description cards appear one at a time in shuffled order. ' +
    'Sort each into one of six bins with the buttons below the canvas or keys 1 to 6: backward ' +
    'inclined, forward curved, mixed flow, axial fixed pitch, axial adjustable pitch or axial ' +
    'reversible. Each placement locks and shows whether it was correct and why. After card 10 a ' +
    'summary shows the first-attempt score and mastery, and misplaced cards can be redone unscored.');
}

// ---------- Controls ----------
function narrow() { return canvasWidth < 480; }

function updateControls() {
  const had = document.activeElement;
  const st = deck.state();
  const summary = st.phase === 'summary';
  binButtons.forEach((b, i) => {
    if (summary) b.hide(); else b.show();
    b.html(narrow() ? BINS[i].tiny : BINS[i].short);
    K.setEnabled(b, st.phase === 'choose');
  });
  if (summary) nextButton.hide(); else nextButton.show();
  nextButton.html(st.isLast ? 'Show summary' : 'Next card');
  K.setEnabled(nextButton, st.phase === 'feedback');
  const canReview = summary && deck.summary().canRetryMissed;
  if (canReview) {
    reviewButton.show();
    reviewButton.html('Redo review pile (' + deck.roundMisses().length + ')');
  } else {
    reviewButton.hide();
  }
  positionControls();
  K.keepFocus(had, binButtons.concat([nextButton, reviewButton, startOverButton]));
}

function positionControls() {
  const st = deck.state();
  if (st.phase === 'summary') {
    K.flowButtons(0, [reviewButton, startOverButton]);
    return;
  }
  K.flowButtons(0, binButtons.concat(['|', nextButton, startOverButton]));
}

function cardSpeech(card) { return card.text + '.'; }

function place(i) {
  const st = deck.state();
  if (st.phase !== 'choose') return;
  const res = deck.place(BINS[i].id);
  if (res.status === 'ignored') return;
  updateControls();
  FP.announce('You placed it in ' + BINS[i].name + '. ' + res.message +
    (deck.state().practice ? '' : ' ' + deck.state().scoreLabel + '.'));
  nextButton.elt.focus();
}

function advance() {
  if (!deck.next()) return;
  updateControls();
  const st = deck.state();
  if (st.phase === 'summary') {
    const s = deck.summary();
    const m = deck.roundMisses().length;
    FP.announce((st.practice ? 'Review pile done. ' + m + ' still misplaced. ' : 'Summary. ') + s.lines.join(' ') +
      (!st.practice && m ? ' ' + m + ' card' + (m === 1 ? '' : 's') + ' in the review pile.' : ''));
    (reviewButton.elt.style.display === 'none' ? startOverButton : reviewButton).elt.focus();
  } else {
    FP.announce('Card ' + (st.index + 1) + ' of ' + st.count + (st.practice ? ' (review, not scored)' : '') +
      ': ' + cardSpeech(st.card));
    binButtons[0].elt.focus();
  }
}

function review() {
  if (!deck.retryMissed()) return;
  updateControls();
  const st = deck.state();
  FP.announce('Review pile, not scored. Card 1 of ' + st.count + ': ' + cardSpeech(st.card));
  binButtons[0].elt.focus();
}

function startOver() {
  deck.newRound();
  scoredMisses = [];
  updateControls();
  FP.announce('Started over. Card 1 of ' + CARDS.length + ': ' + cardSpeech(deck.state().card));
  binButtons[0].elt.focus();
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  let y = K.title('Impeller Type Classifier');
  const st = deck.state();

  noStroke(); textSize(narrow() ? 14 : 15); textStyle(NORMAL); fill(FP.tok('text-muted'));
  y = K.wrapText(PROMPT, canvasWidth / 2, y - 4, canvasWidth - 20, 19, { align: CENTER }) + 2;

  const progress = st.phase === 'summary'
    ? (st.practice ? 'Review pile done' : 'All ' + st.count + ' placed')
    : (st.practice ? 'Review ' : 'Card ') + (st.index + 1) + ' of ' + st.count + (st.practice ? ' (not scored)' : '');
  y = K.statusLine(st.scoreLabel, progress, null, { y }) + 4;

  textSize(13);
  const both = FP.msg.note(SOURCE, KEYS_HINT);
  K.note(textWidth(both) <= canvasWidth - 20 ? both : SOURCE);

  if (st.phase === 'summary') {
    drawSummary(y, drawHeight - 24);
  } else {
    const cardBottom = drawCard(y, st);
    drawBins(cardBottom + 8, drawHeight - 24);
  }
}

// [{t, bold, muted, color, gap, size}] paragraphs; returns the y below.
function paras(list, x, y, w, ts, dry) {
  textAlign(LEFT, TOP); noStroke();
  for (const p of list) {
    const s = p.small ? Math.max(12, ts - 2) : p.big ? ts + 1 : ts;
    textSize(s); textStyle(p.bold ? BOLD : NORMAL);
    y += p.gap || 0;
    if (!dry) fill(p.color || FP.tok(p.muted ? 'text-muted' : 'text'));
    y = K.wrapText(p.t, x, y, w, Math.round(s * 1.3), { dryRun: dry });
  }
  textStyle(NORMAL);
  return y;
}

function drawCard(top, st) {
  const card = st.card;
  const placed = st.phase === 'feedback' ? deck.placements[deck.placements.length - 1] : null;
  const last = st.last;
  const w = Math.min(canvasWidth - 20, 720), x = (canvasWidth - w) / 2, pad = 12;
  const maxH = narrow() ? 230 : 190;
  const head = [{ t: (st.practice ? 'Review card ' : 'Card ') + (st.index + 1) + ' of ' + st.count, bold: true, small: true, muted: true },
    { t: card.text, big: true, color: FP.tok('primary-dark'), bold: true, gap: 2 }];
  const fb = placed ? [
    { t: 'You placed it in ' + BIN[placed.chosen].name + '.', muted: true, small: true, gap: 6 },
    { t: last.message, color: FP.tok(placed.correct ? 'correct' : 'incorrect'), gap: 2 }
  ] : [];
  const layout = (ts, dry) => paras(head.concat(fb), x + pad, top + pad, w - 2 * pad, ts, dry) - top + pad - 2;
  const ts = K.fitTextSize(t => layout(t, true), maxH, 16, 12);
  const h = layout(ts, true);
  if (placed) {
    K.panel(x, top, w, h, {
      fill: placed.correct ? '--fp-correct-bg' : '--fp-incorrect-bg',
      stroke: placed.correct ? '--fp-correct' : '--fp-incorrect', dashed: !placed.correct, weight: 2.5
    });
  } else {
    K.panel(x, top, w, h, { fill: '--fp-ctrl-bg', stroke: '--fp-primary', weight: 2 });
  }
  layout(ts, false);
  return top + h;
}

function drawBins(top, bottom) {
  const cols = narrow() ? 2 : 3, rows = 6 / cols, gap = narrow() ? 6 : 10;
  const bw = (canvasWidth - 20 - (cols - 1) * gap) / cols;
  const bh = (bottom - top - (rows - 1) * gap) / rows;
  const placements = deck.placements;
  BINS.forEach((b, i) => {
    const bx = 10 + (i % cols) * (bw + gap), by = top + Math.floor(i / cols) * (bh + gap);
    stroke(FP.tok('border')); strokeWeight(1); fill(FP.tok('ctrl-bg'));
    rect(bx, by, bw, bh, 6);
    const inBin = placements.filter(p => p.chosen === b.id);
    noStroke(); fill(FP.tok('text')); textAlign(LEFT, TOP); textStyle(BOLD);
    textSize(narrow() ? 12 : 13);
    const label = (i + 1) + ' · ' + (bw < 200 ? b.short : b.name);
    text(fitText(label, bw - 34), bx + 6, by + 5);
    textStyle(NORMAL); fill(FP.tok('text-muted')); textAlign(RIGHT, TOP);
    text('(' + inBin.length + ')', bx + bw - 6, by + 5);
    const chipTop = by + 24, chipH = 20, chipGap = 4;
    const fit = Math.max(0, Math.floor((by + bh - 4 - chipTop + chipGap) / (chipH + chipGap)));
    if (inBin.length === 0) {
      fill(FP.tok('text-muted')); textAlign(LEFT, TOP); textSize(12);
      text('Empty', bx + 6, chipTop + 2);
      return;
    }
    if (inBin.length > fit && fit <= 1) {
      // too small for chips: counts with glyphs (never colour alone)
      const ok = inBin.filter(p => p.correct).length, bad = inBin.length - ok;
      textAlign(LEFT, TOP); textSize(12);
      fill(FP.tok('correct')); text(FP.msg.OK + ' ' + ok + ' correct', bx + 6, chipTop + 2);
      fill(FP.tok('incorrect')); text(FP.msg.BAD + ' ' + bad + ' wrong', bx + 6 + Math.min(bw / 2, 80), chipTop + 2);
      return;
    }
    const shown = inBin.length > fit ? Math.max(0, fit - 1) : inBin.length;
    for (let k = 0; k < shown; k++) {
      const p = inBin[k];
      const cy = chipTop + k * (chipH + chipGap);
      K.panel(bx + 5, cy, bw - 10, chipH, {
        fill: p.correct ? '--fp-correct-bg' : '--fp-incorrect-bg', stroke: p.correct ? '--fp-correct' : '--fp-incorrect',
        dashed: !p.correct, weight: p.correct ? 1 : 1.5, radius: 4
      });
      noStroke(); fill(FP.tok(p.correct ? 'correct' : 'incorrect')); textAlign(LEFT, CENTER); textSize(12);
      text(fitText((p.correct ? FP.msg.OK : FP.msg.BAD) + ' ' + p.card.tag, bw - 22), bx + 10, cy + chipH / 2 + 1);
    }
    if (shown < inBin.length) {
      fill(FP.tok('text-muted')); textAlign(LEFT, CENTER); textSize(12);
      text('+' + (inBin.length - shown) + ' more', bx + 10, chipTop + shown * (chipH + chipGap) + chipH / 2);
    }
  });
}

function fitText(s, maxW) {
  if (textWidth(s) <= maxW) return s;
  let t = s;
  while (t.length > 2 && textWidth(t + '…') > maxW) t = t.slice(0, -1);
  return t.replace(/\s+$/, '') + '…';
}

function drawSummary(top, bottom) {
  const st = deck.state();
  const s = deck.summary();
  const x = 10, w = canvasWidth - 20;
  K.panel(x, top, w, bottom - top);
  const list = [];
  if (st.practice) {
    list.push({ t: 'Review pile done (not scored)', bold: true });
    const still = deck.practiceMisses();
    list.push({ t: still.length ? still.length + ' card' + (still.length === 1 ? ' is' : 's are') + ' still misplaced; redo them or start over.'
      : 'Every card in the review pile is now in the right bin.', gap: 2 });
  }
  list.push({ t: s.lines[0], bold: true, big: true, gap: st.practice ? 8 : 0 });
  list.push({ t: s.lines[1], color: s.mastered ? FP.tok('primary-dark') : FP.tok('text'), bold: s.mastered });
  if (scoredMisses.length) {
    list.push({ t: 'Review pile from the scored round:', bold: true, gap: 8 });
    for (const m of scoredMisses) {
      list.push({ t: FP.msg.BAD + ' ' + m.card.tag + ': placed in ' + BIN[m.chosen].short + '; this one is ' +
        m.card.answerText + '. ' + m.card.why, small: true, gap: 2 });
    }
  } else {
    list.push({ t: 'No cards in the review pile: all ten were placed correctly on the first try.', gap: 8 });
  }
  list.push({ t: 'The review pile does not change the score. Start over reshuffles all ten cards.', muted: true, small: true, gap: 8 });
  const ts = K.fitTextSize(t => paras(list, x + 12, top + 10, w - 24, t, true) - top, bottom - top - 16, 16, 12);
  paras(list, x + 12, top + 10, w - 24, ts, false);
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  updateControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
