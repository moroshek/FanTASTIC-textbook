// Fan Family Sorter - p5.js MicroSim (FanPedia shared kit: FP.CardDeck, FP.p5)
// CANVAS_HEIGHT: 610
// Sort fifteen Twin City Fan product lines into the centrifugal, axial and
// mixed flow families. Each card is placed once, locks, and shows feedback.
// Product lines: Twin City Fan product catalog pages on tcf.com, retrieved 2026-10-08.
// Needs ../shared-libs/fanpedia-core.js and fanpedia-p5.js (see main.html).

const K = FP.p5;
let canvasWidth = 760;
const drawHeight = 530;
const controlHeight = K.controlHeightFor(2);   // bins | navigation wrap to row 2 at 320 px
const canvasHeight = drawHeight + controlHeight;
const margin = 10;

const BINS = ['Centrifugal', 'Axial', 'Mixed flow'];
const PROMPT = 'Which family does this product line belong to? Look for the airflow path, not the housing.';
const MASTERY = 13;
const REVIEW = 'Review the sections on tubular housings and power roof ventilators, then sort again.';
const SOURCE = FP.msg.source('Twin City Fan product catalog, tcf.com', '2026-10-08');
const SHORT_SOURCE = FP.msg.source('tcf.com catalog', '2026-10-08');
const KEYS_HINT = 'Keys: 1, 2, 3 to place; Enter for next';

// Card text never names a family; the family names appear only in feedback.
const CARDS = [
  { model: 'BC-SW', text: 'single width, single inlet fan in a snail-shaped housing; air leaves at a right angle to the shaft', answer: 'Centrifugal',
    why: 'A scroll housing with a right-angle discharge is a housed centrifugal fan.' },
  { model: 'NFC-DW', text: 'double width, double inlet fan with a forward curved wheel in a snail-shaped housing', answer: 'Centrifugal',
    why: 'Forward curved wheels throw air outward; DWDI housed fans are centrifugal.' },
  { model: 'Plenum fan', text: 'wheel and inlet funnel with no housing, running inside an air handler cabinet', answer: 'Centrifugal',
    why: 'An unhoused fan is still centrifugal; the plenum collects the air instead of a scroll.' },
  { model: 'Plug fan', text: 'wheel inside an oven wall, mounting panel and motor outside', answer: 'Centrifugal',
    why: 'Plug fans are unhoused centrifugal fans plugged into a plenum wall.' },
  { model: 'TSL', text: 'airfoil wheel in a round tube, with straightening vanes; air goes straight through', answer: 'Centrifugal',
    why: 'A tubular inline centrifugal fan: the wheel throws air outward and the vanes turn it back along the tube.' },
  { model: 'BSI', text: 'belt-driven fan in a square housing with removable side panels; straight-through or 90-degree flow', answer: 'Centrifugal',
    why: 'A square inline centrifugal fan uses a backward inclined centrifugal wheel.' },
  { model: 'DCRD', text: 'direct-drive downblast roof exhauster', answer: 'Centrifugal',
    why: "DCRD is in the catalog's Centrifugal Roof & Wall Exhausters section." },
  { model: 'BCIFE', text: 'induced flow laboratory exhaust fan with a backward inclined wheel', answer: 'Centrifugal',
    why: 'Backward inclined wheels are centrifugal; lab exhaust is an application, not a family.' },
  { model: 'TD', text: 'direct-drive fan in a plain round tube, propeller-style blades on a hub, no vanes', answer: 'Axial',
    why: 'A tubeaxial fan: air goes straight along the shaft and leaves swirling.' },
  { model: 'TCVA', text: 'cast aluminum propeller-style impeller in a round tube, with a vane section downstream', answer: 'Axial',
    why: 'A vaneaxial fan: the guide vanes straighten the swirl but the path is still along the shaft.' },
  { model: 'WPB', text: 'belt-driven wall mounted fan, impeller centered in a flat panel', answer: 'Axial',
    why: 'A panel fan centers an axial impeller in a panel and moves air straight through the wall.' },
  { model: 'TUD', text: 'direct-drive upblast roof ventilator built on a tube with a propeller-style impeller', answer: 'Axial',
    why: "The catalog's Roof Ventilators are tubeaxial-based PRVs; not every roof fan is centrifugal." },
  { model: 'QSL', text: 'high-pressure airfoil fan in a round tube with straightening vanes; blades taper from the front plate to the hub end', answer: 'Mixed flow',
    why: 'Blades that taper from the front plate to the hub end mark the hybrid impeller of a mixed flow fan.' },
  { model: 'QCLB', text: 'low-pressure, single-surface-blade fan in a round tube; air leaves the impeller on a diagonal', answer: 'Mixed flow',
    why: 'A diagonal impeller exit is the mixed flow signature.' },
  { model: 'TVIFE', text: 'direct-drive induced flow laboratory exhaust fan with a hybrid impeller whose air leaves on a diagonal', answer: 'Mixed flow',
    why: 'TVIFE is listed as an induced flow, mixed flow lab exhaust fan.' }
].map((c, i) => Object.assign({ id: 'card-' + (i + 1) }, c));

// Spec wording (it wins over the kit's standard "Not quite" wording):
// correct "Correct: <bin>." + Why; incorrect "This one is <bin>." + Why.
function verdictHead(p) {
  return p.correct ? FP.msg.OK + ' Correct: ' + p.card.answer + '.' : FP.msg.BAD + ' This one is ' + p.card.answer + '.';
}
function scoreLabel() {
  return 'Correct: ' + deck.score.correct() + ' of ' + deck.cards.length;
}

// Engine: shuffled deck, one placement per card, no practice round (spec).
const deck = new FP.CardDeck({
  cards: CARDS, shuffle: true, attempts: 1, retryMissed: false,
  noun: 'Cards', mastery: MASTERY, id: 'ch04-fan-family-sorter'
});
let missPage = 0;
let missPages = [[]];

// Controls
let binButtons = [];
let nextButton, againButton, moreButton;

// p5 mousePressed listens to mousedown only; a click listener also fires on
// Enter/Space when the button has keyboard focus.
function makeButton(label, fn, variant) {
  const b = K.button(label, null, variant ? { variant } : undefined);
  b.elt.type = 'button';
  b.elt.addEventListener('click', fn);
  return b;
}

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight, margin });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));

  for (let i = 0; i < BINS.length; i++) {
    const b = makeButton(BINS[i], () => placeCard(BINS[i]));
    b.addClass('choice');
    b.attribute('aria-keyshortcuts', String(i + 1));
    binButtons.push(b);
  }
  nextButton = makeButton('Next card', advance);
  nextButton.attribute('aria-keyshortcuts', 'Enter');
  againButton = makeButton('Sort again', resetSort, 'secondary');
  moreButton = makeButton('More misses', () => {
    missPage = (missPage + 1) % missPages.length;
    updateControls();
  }, 'secondary');

  resetSort();
  describe('Fan Family Sorter. Fifteen Twin City Fan product line cards are shown one at a time. ' +
    'Place each card into the Centrifugal, Axial or Mixed flow bin using the buttons below the canvas, ' +
    'or press 1, 2 or 3. Each placement locks and shows whether it was correct and why; the verdict is ' +
    'also announced. After all fifteen, a summary shows the score and every misplaced card.');
}

function resetSort() {
  deck.newRound();
  missPage = 0;
  missPages = [[]];
  updateControls();
  FP.announce('New sort. Card 1 of ' + deck.cards.length + ': ' + cardSpeech(deck.card()));
}

function cardSpeech(card) {
  return card.model + ', ' + card.text + '.';
}

function placeCard(binName) {
  const res = deck.place(binName);
  if (res.status === 'ignored') return;
  updateControls();
  const p = deck.placements[deck.placements.length - 1];
  FP.announce(verdictHead(p) + ' ' + p.card.why + ' ' + scoreLabel() + '.');
  nextButton.elt.focus();
}

function advance() {
  if (!deck.next()) return;
  missPage = 0;
  missPages = [[]];
  updateControls();
  const st = deck.state();
  if (st.phase === 'summary') {
    const misses = deck.misses().length;
    FP.announce('Summary. ' + scoreLabel() + '. ' + masteryText() + ' ' +
      misses + ' misplaced card' + (misses === 1 ? '' : 's') + '.');
    againButton.elt.focus();
  } else {
    FP.announce('Card ' + (st.index + 1) + ' of ' + st.count + ': ' + cardSpeech(st.card));
  }
}

function mastered() {
  return deck.score.correct() >= MASTERY;
}
function masteryText() {
  return mastered() ? 'Mastery reached.' : REVIEW;
}

function updateControls() {
  if (!moreButton) return;
  const st = deck.state();
  const summary = st.phase === 'summary';
  for (const b of binButtons) {
    if (summary) b.hide(); else b.show();
    K.setEnabled(b, st.phase === 'choose');
  }
  if (summary) nextButton.hide(); else nextButton.show();
  nextButton.html(st.isLast ? 'Show summary' : 'Next card');
  K.setEnabled(nextButton, st.phase === 'feedback');
  // "Sort again" is offered once all fifteen are placed, on the summary (spec).
  if (summary) againButton.show(); else againButton.hide();
  if (summary && missPages.length > 1) {
    moreButton.show();
    moreButton.html('More misses (' + (missPage + 1) + ' of ' + missPages.length + ')');
  } else {
    moreButton.hide();
  }
  positionControls();
}

function positionControls() {
  // A group gap separates "place" from "navigate"; buttons wrap at narrow widths.
  K.flowButtons(0, binButtons.concat(['|', nextButton, moreButton, againButton]));
}

const keys = K.keys.bind({
  '1': () => placeCard(BINS[0]),
  '2': () => placeCard(BINS[1]),
  '3': () => placeCard(BINS[2]),
  Enter: advance,
  n: advance
});
function keyPressed() { return keys(); }

function draw() {
  K.regions(drawHeight, controlHeight);
  let y = K.title('Fan Family Sorter');

  // Prompt
  noStroke();
  textSize(15);
  textStyle(NORMAL);
  fill(FP.tok('text-muted'));
  y = K.wrapText(PROMPT, canvasWidth / 2, y - 2, canvasWidth - 2 * margin, 19, { align: CENTER }) + 4;

  // Score and progress
  const st = deck.state();
  const progress = st.phase === 'summary' ? 'All ' + st.count + ' placed' : 'Card ' + (st.index + 1) + ' of ' + st.count;
  y = K.statusLine(scoreLabel(), progress, null, { y }) + 6;

  if (st.phase === 'summary') {
    drawSummary(y);
  } else {
    y = drawCurrentCard(y, st);
    drawBins(y + 10, drawHeight - 26);
  }

  // Data label and keyboard hint (hint dropped when it does not fit).
  textSize(13);
  textStyle(NORMAL);
  const both = FP.msg.note(SOURCE, KEYS_HINT);
  const room = canvasWidth - 2 * margin;
  K.note(textWidth(both) <= room ? both : textWidth(SOURCE) <= room ? SOURCE : SHORT_SOURCE);
}

// Draws the face-up card (and its feedback once placed). Returns the bottom y.
function drawCurrentCard(top, st) {
  const card = st.card;
  const placed = st.phase === 'feedback' ? deck.placements[deck.placements.length - 1] : null;
  const w = min(canvasWidth - 2 * margin, 700);
  const x = (canvasWidth - w) / 2;
  const pad = 12;
  const narrow = canvasWidth < 480;
  const bodySize = narrow ? 14 : 16;
  const whySize = narrow ? 13 : 15;
  const bodyLH = bodySize + 4;
  const whyLH = whySize + 4;

  // Placed-in tag beside the model name, or on its own line when narrow.
  let tag = '';
  let tagOwnLine = false;
  if (placed) {
    tag = (placed.correct ? FP.msg.OK : FP.msg.BAD) + ' You placed it in ' + placed.chosen;
    textStyle(BOLD);
    textSize(18);
    const mw = textWidth(card.model);
    textStyle(NORMAL);
    textSize(14);
    tagOwnLine = mw + 16 + textWidth(tag) > w - 2 * pad;
  }

  textStyle(NORMAL);
  textSize(bodySize);
  const descLines = K.countLines(card.text, w - 2 * pad);
  let fbLines = 0;
  if (placed) {
    textSize(whySize);
    fbLines = K.countLines(placed.card.why, w - 2 * pad);
  }
  const h = pad + 24 + (tagOwnLine ? 20 : 0) + descLines * bodyLH +
    (placed ? 12 + 21 + fbLines * whyLH : 0) + pad - 4;

  if (placed) {
    K.panel(x, top, w, h, {
      fill: placed.correct ? '--fp-correct-bg' : '--fp-incorrect-bg',
      stroke: placed.correct ? '--fp-correct' : '--fp-incorrect',
      dashed: !placed.correct, weight: 3
    });
  } else {
    K.panel(x, top, w, h, { fill: '--fp-ctrl-bg', stroke: '--fp-primary', weight: 2 });
  }

  const verdictColor = placed ? FP.tok(placed.correct ? 'correct' : 'incorrect') : null;
  noStroke();
  textAlign(LEFT, TOP);
  fill(FP.tok('primary-dark'));
  textSize(18);
  textStyle(BOLD);
  text(card.model, x + pad, top + pad);
  let yy = top + pad + 24;
  if (placed) {
    textSize(14);
    fill(verdictColor);
    if (tagOwnLine) {
      text(tag, x + pad, yy - 2);
      yy += 20;
    } else {
      textAlign(RIGHT, TOP);
      text(tag, x + w - pad, top + pad + 2);
      textAlign(LEFT, TOP);
    }
  }
  textStyle(NORMAL);
  fill(FP.tok('text'));
  textSize(bodySize);
  yy = K.wrapText(card.text, x + pad, yy, w - 2 * pad, bodyLH);
  if (placed) {
    yy += 6;
    stroke(FP.tok('border'));
    line(x + pad, yy, x + w - pad, yy);
    noStroke();
    yy += 6;
    textStyle(BOLD);
    fill(verdictColor);
    textSize(16);
    text(verdictHead(placed), x + pad, yy);
    textStyle(NORMAL);
    yy += 21;
    fill(FP.tok('text'));
    textSize(whySize);
    K.wrapText(placed.card.why, x + pad, yy, w - 2 * pad, whyLH);
  }
  return top + h;
}

function drawBins(top, bottom) {
  const gap = narrowGap();
  const binW = (canvasWidth - 2 * margin - 2 * gap) / 3;
  const h = bottom - top;
  const placements = deck.placements;
  for (let i = 0; i < BINS.length; i++) {
    const bx = margin + i * (binW + gap);
    stroke(FP.tok('border'));
    strokeWeight(1);
    fill(FP.tok('ctrl-bg'));
    rect(bx, top, binW, h, 6);
    noStroke();
    fill(FP.tok('text'));
    textAlign(CENTER, TOP);
    textSize(16);
    textStyle(BOLD);
    const inBin = placements.filter(p => p.chosen === BINS[i]);
    // Bin name and count on one line, or two when the bin is narrow.
    const head = BINS[i] + ' (' + inBin.length + ')';
    let chipTop = top + 32;
    if (textWidth(head) <= binW - 8) {
      text(head, bx + binW / 2, top + 6);
    } else {
      textSize(14);
      text(BINS[i], bx + binW / 2, top + 6);
      text('(' + inBin.length + ')', bx + binW / 2, top + 24);
      chipTop = top + 46;
    }
    textStyle(NORMAL);
    if (inBin.length === 0) {
      fill(FP.tok('text-muted'));
      textSize(14);
      K.wrapText('No cards yet', bx + binW / 2, chipTop + 2, binW - 8, 18, { align: CENTER });
    }

    // Placed cards as locked chips: ✓ solid border = correct, ✗ dashed = incorrect.
    const inner = 6;
    const cols = binW >= 190 ? 2 : 1;
    const chipGap = 6;
    const chipW = (binW - 2 * inner - (cols - 1) * chipGap) / cols;
    const rowsNeeded = max(1, ceil(inBin.length / cols));
    const avail = top + h - chipTop - 4;
    const chipH = constrain(floor(avail / rowsNeeded) - 5, 18, 24);
    const rowsFit = max(1, floor((avail + 5) / (chipH + 5)));
    let shown = inBin.length;
    if (rowsNeeded > rowsFit) shown = rowsFit * cols - 1;   // keep a slot for "+k more"
    for (let k = 0; k < shown; k++) {
      const p = inBin[k];
      const cx = bx + inner + (k % cols) * (chipW + chipGap);
      const cy = chipTop + floor(k / cols) * (chipH + 5);
      K.panel(cx, cy, chipW, chipH, {
        fill: p.correct ? '--fp-correct-bg' : '--fp-incorrect-bg',
        stroke: p.correct ? '--fp-correct' : '--fp-incorrect',
        dashed: !p.correct, weight: p.correct ? 1 : 1.5, radius: 4
      });
      noStroke();
      fill(FP.tok(p.correct ? 'correct' : 'incorrect'));
      textAlign(LEFT, CENTER);
      textSize(13);
      text(fitLabel((p.correct ? FP.msg.OK + ' ' : FP.msg.BAD + ' ') + p.card.model, chipW - 10), cx + 5, cy + chipH / 2);
    }
    if (shown < inBin.length) {
      const k = shown;
      const cx = bx + inner + (k % cols) * (chipW + chipGap);
      const cy = chipTop + floor(k / cols) * (chipH + 5);
      fill(FP.tok('text-muted'));
      textAlign(LEFT, CENTER);
      textSize(13);
      text('+' + (inBin.length - shown) + ' more', cx + 6, cy + chipH / 2);
    }
  }
}

// Shrinks a chip label to 12 px, then truncates it with an ellipsis, so it stays inside the chip.
function fitLabel(str, maxW) {
  if (textWidth(str) <= maxW) return str;
  textSize(12);
  let t = str;
  while (t.length > 3 && textWidth(t + (t === str ? '' : '…')) > maxW) t = t.slice(0, -1);
  return t === str ? t : t.replace(/\s+$/, '') + '…';
}

function narrowGap() {
  return canvasWidth < 480 ? 6 : 10;
}

// Splits the misplaced cards into pages that fit the space left in the summary.
function paginateMisses(avail, leftW, whyW) {
  const misses = deck.misses();
  const pages = [[]];
  textSize(14);
  textStyle(NORMAL);
  let used = 0;
  for (const m of misses) {
    const rowH = missRowHeight(m, leftW, whyW) + 8;
    if (used + rowH > avail && pages[pages.length - 1].length > 0) {
      pages.push([]);
      used = 0;
    }
    pages[pages.length - 1].push(m);
    used += rowH;
  }
  const changed = pages.length !== missPages.length;
  missPages = pages;
  if (changed) {
    missPage = min(missPage, missPages.length - 1);
    updateControls();
  }
}

// Height of one miss row: model and "you chose" on the left, Why on the right.
function missRowHeight(m, leftW, whyW) {
  textSize(14);
  textStyle(NORMAL);
  const left = 18 + K.countLines('you chose ' + m.chosen, leftW - 10) * 18;
  const right = 18 + K.countLines(m.why, whyW) * 18;
  return max(36, left, right);
}

function drawSummary(top) {
  const w = min(canvasWidth - 2 * margin, 700);
  const x = (canvasWidth - w) / 2;
  const bottom = drawHeight - 26;
  const isMastered = mastered();

  // Final state: indigo double border (the kit's .fp-feedback.final look).
  K.panel(x, top, w, bottom - top, { fill: '--fp-ctrl-bg', stroke: '--fp-primary', weight: 1 });
  noFill();
  stroke(FP.tok('primary'));
  strokeWeight(1);
  rect(x + 3, top + 3, w - 6, bottom - top - 6, 6);
  strokeWeight(1);
  noStroke();

  textAlign(CENTER, TOP);
  textSize(20);
  textStyle(BOLD);
  fill(FP.tok('text'));
  text(scoreLabel(), canvasWidth / 2, top + 12);
  textSize(16);
  fill(FP.tok(isMastered ? 'correct' : 'text'));
  const msg = isMastered ? FP.msg.OK + ' Mastery reached.' : REVIEW;
  let y = K.wrapText(msg, canvasWidth / 2, top + 42, w - 30, 20, { align: CENTER });
  textStyle(NORMAL);

  // Per-bin tally
  textSize(14);
  fill(FP.tok('text-muted'));
  const tally = BINS.map(b => {
    const ps = deck.placements.filter(p => p.card.answer === b);
    return b + ': ' + ps.filter(p => p.correct).length + ' of ' + ps.length;
  }).join(FP.msg.SEP);
  y = K.wrapText(tally, canvasWidth / 2, y + 4, w - 24, 18, { align: CENTER }) + 8;

  const misses = deck.misses();
  textAlign(LEFT, TOP);
  if (misses.length === 0) {
    fill(FP.tok('text'));
    textSize(16);
    K.wrapText('No misplaced cards. Every product line went to its family on the first try.', x + 12, y + 6, w - 24, 20);
    return;
  }
  const leftW = min(220, w * 0.34);
  const whyW = w - 24 - leftW;
  // The header can change height with the page note, so measure it at the
  // page count from the previous pass, then paginate the rows that remain.
  fill(FP.tok('text'));
  textSize(15);
  textStyle(BOLD);
  const pageNote = missPages.length > 1 ? ' (page ' + (missPage + 1) + ' of ' + missPages.length + ')' : '';
  y = K.wrapText('Misplaced cards (' + misses.length + ')' + pageNote +
    '. Which clue misled you: housing shape, roof location or application name?', x + 12, y, w - 24, 19);
  textStyle(NORMAL);
  y += 8;
  paginateMisses(bottom - 8 - y, leftW, whyW);

  for (const m of missPages[missPage] || []) {
    textSize(14);
    textStyle(BOLD);
    fill(FP.tok('incorrect'));
    text(FP.msg.BAD + ' ' + m.card.model, x + 12, y);
    textStyle(NORMAL);
    fill(FP.tok('text-muted'));
    const cy = K.wrapText('you chose ' + m.chosen, x + 12, y + 18, leftW - 10, 18);
    fill(FP.tok('text'));
    textStyle(BOLD);
    text('This one is ' + m.card.answer + '.', x + 12 + leftW, y);
    textStyle(NORMAL);
    const ly = K.wrapText(m.why, x + 12 + leftW, y + 18, whyW, 18);
    y = max(y + 36, cy, ly) + 8;
    stroke(FP.tok('border'));
    line(x + 12, y - 4, x + w - 12, y - 4);
    noStroke();
  }
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  updateControls();
}

function updateCanvasSize() {
  canvasWidth = K.updateCanvasSize(320);
}
