// Flow Control Device Sorter - p5.js MicroSim (FanPedia shared kit: FP.CardDeck, FP.p5)
// CANVAS_HEIGHT: 566
// Eight illustrative field situations are sorted into seven damper and vane bins: ceiling and
// wall gravity dampers, blast gate, slide gate damper, nested inlet vanes, and the lab exhaust
// isolation and bypass dampers. Each card is scored on its first placement; a miss moves the
// card to its correct bin, marked as missed. "Try again" reshuffles all eight for an unscored
// practice round. Device facts: FanPedia pp. 125, 127, 136, 138, 139, 180, 181, 188, 192.
// Needs ../shared-libs/fanpedia-core.js and fanpedia-p5.js (see main.html).

const K = FP.p5;
const SIM_ID = 'ch19-flow-control-device-sorter';
let canvasWidth = 800;
let drawHeight = 560;
const controlHeight = K.controlHeightFor(1);
const margin = 10;

const PROMPT = 'Which device fits this situation?';
const MASTERY = 7;
const REVIEW = 'Review the sections on the devices you missed, then try again.';
const NOTE_FULL = ['Illustrative scenarios', 'Source: FanPedia pp. 125–192', 'Keys: 1–7 place, Enter next'];
const NOTE_SHORT = ['Illustrative scenarios', 'Keys: 1–7, Enter'];

// Bins: name (bin label) and how the incorrect message names the device.
const BINS = [
  { name: 'Ceiling type gravity damper', phrase: 'This is a ceiling type gravity damper.' },
  { name: 'Wall type gravity damper', phrase: 'This is a wall type gravity damper.' },
  { name: 'Blast gate', phrase: 'This is a blast gate.' },
  { name: 'Slide gate damper', phrase: 'This is a slide gate damper.' },
  { name: 'Nested inlet vanes', phrase: 'This calls for nested inlet vanes.' },
  { name: 'Lab exhaust isolation damper', phrase: 'This is a lab exhaust isolation damper.' },
  { name: 'Lab exhaust bypass damper', phrase: 'This is a lab exhaust bypass damper.' }
];

// Situation cards (spec Content table, numbered as in the chapter); answer = bin index.
const CARDS = [
  { n: 1, tag: 'Ceiling opening', answer: 0,
    text: 'A fan exhausts through a horizontal opening in a ceiling. When it stops, nothing powered may close the opening, but backflow and rain must be kept out.',
    why: 'It opens on fan start and closes by gravity, and it is the type for a ceiling opening.' },
  { n: 2, tag: 'Wall opening', answer: 1,
    text: 'A fan exhausts through a vertical wall. When it stops, the opening must close by itself against backdraft, rain and snow.',
    why: 'Same gravity action as the ceiling type, but built for the vertical plane of a wall.' },
  { n: 3, tag: '200°F shutoff', answer: 2,
    text: "A pressure blower's outlet must be able to shut off flow completely, and the outlet bolts to a 125# ASA pipe flange. The airstream is 200°F.",
    why: 'A blast gate is a wafer butterfly valve at the outlet flange that controls flow to full shutoff, rated to 250°F, with a 125# ASA bolt pattern.' },
  { n: 4, tag: 'Automatic shutoff', answer: 2,
    text: 'The same kind of blower outlet needs shutoff, and the plant wants an actuator to open and close it automatically.',
    why: 'Blast gates are available for automatic control; a slide gate damper is manual.' },
  { n: 5, tag: 'Cast Al inlet trim', answer: 3,
    text: 'A cast aluminum pressure blower needs a simple manual adjustment at its inlet that a technician sets once at startup.',
    why: 'Slide gate dampers fit cast aluminum pressure blowers, mount on the inlet or outlet, and give manual adjustment.' },
  { n: 6, tag: 'Clean 400°F air', answer: 4,
    text: 'A clean 400°F airstream needs flow control with horsepower savings, and the vanes should sit inside the inlet funnel rather than in a separate bolted housing.',
    why: 'Nested vanes pre-spin the air from within the inlet funnel and suit clean air up to 600°F.' },
  { n: 7, tag: 'Standby lab fan', answer: 5,
    text: 'Three lab exhaust fans share one plenum, with one on standby. The standby fan must not let air run backward through it.',
    why: 'The isolation damper closes behind an idle fan so the running fans cannot draw air back through it.' },
  { n: 8, tag: 'Sashes closing', answer: 6,
    text: 'As fume hood sashes close, building exhaust drops, but the lab fan must keep its airflow and plume height constant.',
    why: 'The bypass damper opens to admit outside air through the bypass plenum and make up the lost flow.' }
].map(c => Object.assign({ id: 'situation-' + c.n, answerText: BINS[c.answer].name }, c));

// Engine: shuffled, one scored placement per card. Spec wording replaces the kit defaults.
const deck = new FP.CardDeck({
  cards: CARDS, shuffle: true, attempts: 1, retryMissed: false,
  noun: 'Cards', mastery: MASTERY, reviewPointer: REVIEW, id: SIM_ID,
  messages: {
    correct: res => FP.msg.OK + ' Correct. ' + res.card.why,
    missed: res => FP.msg.BAD + ' Not quite. ' + BINS[res.card.answer].phrase + ' ' + res.card.why
  }
});
let practiceRound = false;   // true after "Try again": every card again, unscored
let scored = null;           // the scored round's summary, kept through practice rounds
let lastRes = null;          // result of the latest placement on the face-up card

let binButtons = [];
let nextButton, tryButton;
let lay = null;              // geometry from computeLayout()

const keys = K.keys.bind({
  '1': () => placeCard(0), '2': () => placeCard(1), '3': () => placeCard(2), '4': () => placeCard(3),
  '5': () => placeCard(4), '6': () => placeCard(5), '7': () => placeCard(6),
  Enter: enterKey
});
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight, margin });
  const canvas = createCanvas(canvasWidth, drawHeight + controlHeight);
  canvas.parent(document.querySelector('main'));

  BINS.forEach((b, i) => {
    const btn = K.button((i + 1) + '. ' + b.name, () => placeCard(i));
    btn.addClass('choice');
    btn.addClass('fcds-bin');
    btn.attribute('aria-keyshortcuts', String(i + 1));
    btn.attribute('aria-label', 'Place in bin ' + (i + 1) + ': ' + b.name);
    binButtons.push(btn);
  });
  nextButton = K.button('Next card', advance);
  nextButton.attribute('aria-keyshortcuts', 'Enter');
  tryButton = K.button('Try again', tryAgain, { variant: 'secondary' });
  tryButton.addClass('secondary');

  relayout();
  updateControls();
  describe('Flow Control Device Sorter. Eight field situations appear one at a time. Place each into one ' +
    'of seven bins: ceiling type gravity damper, wall type gravity damper, blast gate, slide gate damper, ' +
    'nested inlet vanes, lab exhaust isolation damper, lab exhaust bypass damper. Use the bin buttons or ' +
    'keys 1 to 7. Each placement is marked correct or incorrect with the reason; a missed card moves to its ' +
    'correct bin. The running count reads Correct: n of 8. Try again starts an unscored practice round.');
  FP.announce('Card 1 of 8. ' + deck.card().text + ' ' + PROMPT);
}

// ---------- Layout ----------

function textHeight(str, w, size, lh) {
  textSize(size);
  textStyle(NORMAL);
  return K.countLines(str, w) * lh;
}

function cardMetrics() {
  const narrow = canvasWidth < 520;
  return { pad: 12, body: narrow ? 14 : 16, small: narrow ? 13 : 15, head: narrow ? 15 : 17 };
}

// Every position the sketch needs, derived from the width only, so the canvas never jumps
// while the learner works: the card panel reserves room for the longest card and feedback.
function computeLayout() {
  const m = cardMetrics();
  const w = canvasWidth - 2 * margin;
  const inner = w - 2 * m.pad;
  // header: title (40), prompt, status line
  textSize(15);
  const promptH = K.countLines(PROMPT, w) * 19;
  const statusTop = 40 + promptH + 2;
  textStyle(BOLD);
  const lw = textWidth('Correct: 8 of 8');
  textStyle(NORMAL);
  const rw = textWidth('Practice round (not scored) · Card 8 of 8');
  const statusH = lw + 16 + rw <= w ? 21 : 42;
  const cardTop = statusTop + statusH + 4;

  let maxText = 0, maxFb = 0;
  for (const c of CARDS) {
    maxText = max(maxText, textHeight(c.text, inner, m.body, m.body + 5));
    const worst = FP.msg.practice(FP.msg.BAD + ' Not quite. ' + BINS[c.answer].phrase + ' ' + c.why);
    maxFb = max(maxFb, textHeight(worst, inner, m.small, m.small + 5));
  }
  const cardH = m.pad + m.head + 8 + maxText + 10 + 18 + 4 + maxFb + m.pad;

  const cols = canvasWidth >= 640 ? 4 : 2;
  const gap = canvasWidth < 480 ? 6 : 8;
  const binsTop = cardTop + cardH + 10;
  const binW = (w - (cols - 1) * gap) / cols;
  // bin buttons: same width, height of the tallest label
  let btnH = 0;
  for (const b of binButtons) {
    b.style('width', (binW - 12) + 'px');
    b.style('height', 'auto');
    btnH = max(btnH, b.elt.offsetHeight || 30);
  }
  for (const b of binButtons) b.style('height', btnH + 'px');
  const chipH = 22;
  const binH = 6 + btnH + 6 + 2 * (chipH + 4) + 4;
  const rows = ceil((BINS.length + 1) / cols);
  const binsBottom = binsTop + rows * binH + (rows - 1) * gap;
  return { m, w, inner, statusTop, cardTop, cardH, cols, gap, binsTop, binW, binH, btnH, chipH, rows,
    drawH: binsBottom + 26 };
}

function relayout() {
  lay = computeLayout();
  if (lay.drawH !== drawHeight || width !== canvasWidth) {
    drawHeight = lay.drawH;
    K.config({ drawHeight, controlHeight, margin });
    resizeCanvas(canvasWidth, drawHeight + controlHeight);
  }
  positionControls();
}

function binRect(i) {
  const col = i % lay.cols, row = floor(i / lay.cols);
  return { x: margin + col * (lay.binW + lay.gap), y: lay.binsTop + row * (lay.binH + lay.gap), w: lay.binW, h: lay.binH };
}

function positionControls() {
  binButtons.forEach((b, i) => {
    const r = binRect(i);
    b.position(r.x + 6, r.y + 6);
  });
  K.flowButtons(0, [nextButton, '|', tryButton]);
}

// ---------- Drawing ----------

function draw() {
  K.regions(drawHeight, controlHeight);
  K.title('Flow Control Device Sorter');
  noStroke();
  fill(FP.tok('text-muted'));
  textSize(15);
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
  K.wrapText(PROMPT, margin, 40, lay.w, 19);

  const st = deck.state();
  const right = (practiceRound ? 'Practice round (not scored) · ' : '') +
    (st.phase === 'summary' ? 'All ' + st.count + ' placed' : 'Card ' + (st.index + 1) + ' of ' + st.count);
  K.statusLine(scoreLabel(), right, null, { y: lay.statusTop });

  if (st.phase === 'summary') drawSummary();
  else drawCard(st);
  drawBins();

  textSize(13);
  const full = FP.msg.note(...NOTE_FULL);
  K.note(textWidth(full) <= lay.w ? NOTE_FULL : NOTE_SHORT);
}

function practiceCorrect() { return deck.placements.filter(p => p.correct).length; }

function scoreLabel() {
  const s = scored || deck.summary();
  return 'Correct: ' + s.firstAttempt + ' of ' + CARDS.length;
}

function drawCard(st) {
  const { m, inner } = lay;
  const x = margin, y = lay.cardTop, w = lay.w;
  const res = st.phase === 'feedback' ? lastRes : null;
  K.panel(x, y, w, lay.cardH, { fill: '--fp-ctrl-bg', stroke: '--fp-primary', weight: 2 });
  noStroke();
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(m.head);
  fill(FP.tok('primary-dark'));
  text('Situation ' + st.card.n, x + m.pad, y + m.pad);
  textStyle(NORMAL);
  textSize(m.body);
  fill(FP.tok('text'));
  let yy = K.wrapText(st.card.text, x + m.pad, y + m.pad + m.head + 8, inner, m.body + 5);
  if (!res) return;
  yy += 4;
  const ok = res.status === 'correct';
  const fbTop = yy;
  const fbH = y + lay.cardH - 6 - fbTop;
  K.panel(x + 6, fbTop, w - 12, fbH, {
    fill: ok ? '--fp-correct-bg' : '--fp-incorrect-bg', stroke: ok ? '--fp-correct' : '--fp-incorrect',
    dashed: !ok, weight: 2, radius: 6
  });
  noStroke();
  textSize(m.small);
  fill(FP.tok('text-muted'));
  text('You placed it in: ' + BINS[res.chosen].name, x + m.pad, fbTop + 6);
  fill(FP.tok(ok ? 'correct' : 'incorrect'));
  K.wrapText(res.message, x + m.pad, fbTop + 6 + 22, inner, m.small + 5);
}

function drawSummary() {
  const { m, inner } = lay;
  const x = margin, y = lay.cardTop, w = lay.w;
  // Final state: indigo double border, like the kit's .fp-feedback.final
  K.panel(x, y, w, lay.cardH, { fill: '--fp-ctrl-bg', stroke: '--fp-primary', weight: 1 });
  noFill();
  stroke(FP.tok('primary'));
  rect(x + 3, y + 3, w - 6, lay.cardH - 6, 6);
  noStroke();
  textAlign(LEFT, TOP);
  const s = scored;
  let yy = y + m.pad;
  textStyle(BOLD);
  textSize(m.head + 2);
  fill(FP.tok('text'));
  text(scoreLabel(), x + m.pad, yy);
  yy += m.head + 10;
  textSize(m.body);
  fill(FP.tok(s.mastered ? 'correct' : 'text'));
  yy = K.wrapText(s.mastered ? FP.msg.OK + ' Mastery: 7 or more of 8' : REVIEW, x + m.pad, yy, inner, m.body + 5);
  textStyle(NORMAL);
  fill(FP.tok('text'));
  textSize(m.small);
  const missed = [...new Set(s.misses.map(mm => BINS[mm.card.answer].name))];
  if (missed.length) {
    yy = K.wrapText('Devices you missed: ' + missed.join(', ') + '.', x + m.pad, yy + 6, inner, m.small + 5);
  }
  if (practiceRound) {
    yy = K.wrapText(FP.msg.practice('this round ' + practiceCorrect() + ' of ' + CARDS.length + ' correct.') +
      ' Your scored result above does not change.', x + m.pad, yy + 6, inner, m.small + 5);
  }
  fill(FP.tok('text-muted'));
  K.wrapText('Press Try again for a fresh, reshuffled practice round (not scored).', x + m.pad, yy + 6, inner, m.small + 5);
}

function drawBins() {
  const placements = deck.placements;
  for (let i = 0; i < BINS.length; i++) {
    const r = binRect(i);
    stroke(FP.tok('border'));
    strokeWeight(1);
    fill(FP.tok('ctrl-bg'));
    rect(r.x, r.y, r.w, r.h, 6);
    noStroke();
    // A missed card sits in its correct bin, marked as missed.
    const inBin = placements.filter(p => p.card.answer === i);
    const top = r.y + 6 + lay.btnH + 6;
    if (!inBin.length) {
      fill(FP.tok('text-muted'));
      textSize(13);
      textAlign(LEFT, CENTER);
      text('No cards yet', r.x + 8, top + lay.chipH / 2);
    }
    inBin.forEach((p, k) => {
      const cy = top + k * (lay.chipH + 4);
      K.panel(r.x + 6, cy, r.w - 12, lay.chipH, {
        fill: p.correct ? '--fp-correct-bg' : '--fp-incorrect-bg',
        stroke: p.correct ? '--fp-correct' : '--fp-incorrect', dashed: !p.correct, weight: p.correct ? 1 : 1.5, radius: 4
      });
      noStroke();
      fill(FP.tok(p.correct ? 'correct' : 'incorrect'));
      textAlign(LEFT, CENTER);
      textSize(13);
      const label = '#' + p.card.n + ' ' + (p.correct ? FP.msg.OK : FP.msg.BAD + ' missed') + ' · ' + p.card.tag;
      text(fitLabel(label, r.w - 22), r.x + 11, cy + lay.chipH / 2);
    });
  }
  // The eighth grid cell explains the chips.
  const r = binRect(BINS.length);
  noStroke();
  fill(FP.tok('text-muted'));
  textSize(13);
  textAlign(LEFT, TOP);
  K.wrapText('Chips show placed cards by situation number: ' + FP.msg.OK + ' solid = correct; ' + FP.msg.BAD +
    ' dashed = missed, moved to its correct bin.', r.x + 6, r.y + 6, r.w - 12, 17, { maxLines: 6 });
}

// Shrinks a label to 12 px, then truncates it with an ellipsis so it stays inside the chip.
function fitLabel(str, maxW) {
  if (textWidth(str) <= maxW) return str;
  textSize(12);
  let t = str;
  while (t.length > 3 && textWidth(t + '…') > maxW) t = t.slice(0, -1);
  return t === str ? t : t.replace(/[\s·]+$/, '') + '…';
}

// ---------- Actions ----------

function placeCard(i) {
  const st = deck.state();
  if (st.phase !== 'choose') return;
  const res = deck.place(i);
  if (res.status === 'ignored') return;
  lastRes = res;
  updateControls();
  FP.announce(res.message + ' ' + scoreLabel() + '.');
  nextButton.elt.focus();
}

function advance() {
  if (!deck.next()) return;
  lastRes = null;
  const st = deck.state();
  if (st.phase === 'summary') {
    if (!practiceRound) scored = deck.summary();
    updateControls();
    const s = scored;
    FP.announce('All 8 placed. ' + scoreLabel() + '. ' + (s.mastered ? 'Mastery: 7 or more of 8.' : REVIEW) +
      (practiceRound ? ' Practice round: ' + practiceCorrect() + ' of 8 correct, not scored.' : ''));
    tryButton.elt.focus();
  } else {
    updateControls();
    FP.announce('Card ' + (st.index + 1) + ' of ' + st.count + '. ' + st.card.text);
    binButtons[0].elt.focus();
  }
}

// Unscored practice round over all eight cards, reshuffled; the scored result is kept.
// (CardDeck has no public "practice round over every card"; _start(list, true) is its own
// retry-missed path, so events carry scored:false and messages get the Practice prefix.)
function tryAgain() {
  if (deck.state().phase !== 'summary') return;
  practiceRound = true;
  lastRes = null;
  deck._start(CARDS.slice(), true);
  updateControls();
  const st = deck.state();
  FP.announce('Practice round, not scored. Card 1 of 8. ' + st.card.text);
  binButtons[0].elt.focus();
}

function enterKey() {
  const st = deck.state();
  if (st.phase === 'feedback') advance();
  else if (st.phase === 'summary') tryAgain();
}

function updateControls() {
  if (!tryButton) return;
  const st = deck.state();
  const had = document.activeElement;
  for (const b of binButtons) K.setEnabled(b, st.phase === 'choose');
  nextButton.html(st.isLast ? 'Show summary' : 'Next card');
  K.setEnabled(nextButton, st.phase === 'feedback');
  if (st.phase === 'summary') { nextButton.hide(); tryButton.show(); } else { nextButton.show(); tryButton.hide(); }
  positionControls();
  K.keepFocus(had, [nextButton, tryButton, ...binButtons]);
}

function windowResized() {
  updateCanvasSize();
  relayout();
}

function updateCanvasSize() {
  canvasWidth = K.updateCanvasSize(320);
}
