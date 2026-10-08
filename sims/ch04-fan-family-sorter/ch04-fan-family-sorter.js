// Fan Family Sorter - p5.js MicroSim
// CANVAS_HEIGHT: 610
// Sort fifteen Twin City Fan product lines into the centrifugal, axial and
// mixed flow families. Each card is placed once, locks, and shows feedback.
// Product lines: Twin City Fan product catalog pages on tcf.com, retrieved 2026-10-08.

// Canvas dimensions - REQUIRED structure
let canvasWidth = 760;
let drawHeight = 560;
let controlHeight = 50;
let canvasHeight = drawHeight + controlHeight;
let margin = 20;
let defaultTextSize = 16;

const BINS = ['Centrifugal', 'Axial', 'Mixed flow'];
const PROMPT = 'Which family does this product line belong to? Look for the airflow path, not the housing.';
const MASTERY = 13;

// Card text never names a family; the family names appear only in feedback.
const CARDS = [
  { model: 'BC-SW', text: 'single width, single inlet fan in a snail-shaped housing; air leaves at a right angle to the shaft', bin: 'Centrifugal',
    why: 'A scroll housing with a right-angle discharge is a housed centrifugal fan.' },
  { model: 'NFC-DW', text: 'double width, double inlet fan with a forward curved wheel in a snail-shaped housing', bin: 'Centrifugal',
    why: 'Forward curved wheels throw air outward; DWDI housed fans are centrifugal.' },
  { model: 'Plenum fan', text: 'wheel and inlet funnel with no housing, running inside an air handler cabinet', bin: 'Centrifugal',
    why: 'An unhoused fan is still centrifugal; the plenum collects the air instead of a scroll.' },
  { model: 'Plug fan', text: 'wheel inside an oven wall, mounting panel and motor outside', bin: 'Centrifugal',
    why: 'Plug fans are unhoused centrifugal fans plugged into a plenum wall.' },
  { model: 'TSL', text: 'airfoil wheel in a round tube, with straightening vanes; air goes straight through', bin: 'Centrifugal',
    why: 'A tubular inline centrifugal fan: the wheel throws air outward and the vanes turn it back along the tube.' },
  { model: 'BSI', text: 'belt-driven fan in a square housing with removable side panels; straight-through or 90-degree flow', bin: 'Centrifugal',
    why: 'A square inline centrifugal fan uses a backward inclined centrifugal wheel.' },
  { model: 'DCRD', text: 'direct-drive downblast roof exhauster', bin: 'Centrifugal',
    why: "DCRD is in the catalog's Centrifugal Roof & Wall Exhausters section." },
  { model: 'BCIFE', text: 'induced flow laboratory exhaust fan with a backward inclined wheel', bin: 'Centrifugal',
    why: 'Backward inclined wheels are centrifugal; lab exhaust is an application, not a family.' },
  { model: 'TD', text: 'direct-drive fan in a plain round tube, propeller-style blades on a hub, no vanes', bin: 'Axial',
    why: 'A tubeaxial fan: air goes straight along the shaft and leaves swirling.' },
  { model: 'TCVA', text: 'cast aluminum propeller-style impeller in a round tube, with a vane section downstream', bin: 'Axial',
    why: 'A vaneaxial fan: the guide vanes straighten the swirl but the path is still along the shaft.' },
  { model: 'WPB', text: 'belt-driven wall mounted fan, impeller centered in a flat panel', bin: 'Axial',
    why: 'A panel fan centers an axial impeller in a panel and moves air straight through the wall.' },
  { model: 'TUD', text: 'direct-drive upblast roof ventilator built on a tube with a propeller-style impeller', bin: 'Axial',
    why: "The catalog's Roof Ventilators are tubeaxial-based PRVs; not every roof fan is centrifugal." },
  { model: 'QSL', text: 'high-pressure airfoil fan in a round tube with straightening vanes; blades taper from the front plate to the hub end', bin: 'Mixed flow',
    why: 'Blades that taper from the front plate to the hub end mark the hybrid impeller of a mixed flow fan.' },
  { model: 'QCLB', text: 'low-pressure, single-surface-blade fan in a round tube; air leaves the impeller on a diagonal', bin: 'Mixed flow',
    why: 'A diagonal impeller exit is the mixed flow signature.' },
  { model: 'TVIFE', text: 'direct-drive induced flow laboratory exhaust fan with a hybrid impeller whose air leaves on a diagonal', bin: 'Mixed flow',
    why: 'TVIFE is listed as an induced flow, mixed flow lab exhaust fan.' }
];

// State
let deck = [];          // shuffled copy of CARDS
let current = 0;        // index into deck of the card face up
let placements = [];    // { card, chosen, correct } in placement order
let phase = 'choose';   // 'choose' | 'feedback' | 'summary'
let missPage = 0;
let missPages = [[]];

// Controls
let binButtons = [];
let nextButton, againButton, moreButton;

function setup() {
  updateCanvasSize();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textFont('Arial');

  for (let i = 0; i < BINS.length; i++) {
    const b = createButton(BINS[i]);
    b.parent(document.querySelector('main'));
    b.mousePressed(() => placeCard(BINS[i]));
    styleButton(b);
    binButtons.push(b);
  }
  nextButton = createButton('Next card');
  nextButton.parent(document.querySelector('main'));
  nextButton.mousePressed(advance);
  styleButton(nextButton);

  againButton = createButton('Sort again');
  againButton.parent(document.querySelector('main'));
  againButton.mousePressed(resetSort);
  styleButton(againButton);

  moreButton = createButton('More misses');
  moreButton.parent(document.querySelector('main'));
  moreButton.mousePressed(() => { missPage = (missPage + 1) % missPages.length; updateControls(); });
  styleButton(moreButton);

  resetSort();
  describe('Fan Family Sorter. Fifteen Twin City Fan product line cards are shown one at a time. ' +
    'Place each card into the Centrifugal, Axial or Mixed flow bin using the buttons below the canvas, ' +
    'or press 1, 2 or 3. Each placement locks and shows whether it was correct and why. ' +
    'After all fifteen, a summary shows the score and every misplaced card.', LABEL);
}

function styleButton(b) {
  b.style('font-size', '15px');
  b.style('padding', '6px 12px');
  b.style('cursor', 'pointer');
}

function resetSort() {
  deck = shuffle(CARDS.slice());
  current = 0;
  placements = [];
  phase = 'choose';
  missPage = 0;
  missPages = [[]];
  updateControls();
}

function placeCard(binName) {
  if (phase !== 'choose') return;
  const card = deck[current];
  placements.push({ card: card, chosen: binName, correct: binName === card.bin });
  phase = 'feedback';
  updateControls();
}

function advance() {
  if (phase !== 'feedback') return;
  if (current < deck.length - 1) {
    current++;
    phase = 'choose';
  } else {
    phase = 'summary';
    missPage = 0;
    missPages = [[]];
  }
  updateControls();
}

function score() {
  return placements.filter(p => p.correct).length;
}

function updateControls() {
  const allPlaced = placements.length === deck.length;
  for (const b of binButtons) {
    if (phase === 'summary') b.hide(); else b.show();
    setEnabled(b, phase === 'choose');
  }
  if (phase === 'summary') nextButton.hide(); else nextButton.show();
  nextButton.html(current === deck.length - 1 ? 'Show summary' : 'Next card');
  setEnabled(nextButton, phase === 'feedback');
  // "Sort again" is offered once all fifteen are placed, on the summary.
  if (phase === 'summary' && allPlaced) againButton.show(); else againButton.hide();
  if (phase === 'summary' && missPages.length > 1) {
    moreButton.show();
    moreButton.html('More misses (' + (missPage + 1) + ' of ' + missPages.length + ')');
  } else {
    moreButton.hide();
  }
  positionControls();
}

function setEnabled(b, on) {
  if (on) b.removeAttribute('disabled'); else b.attribute('disabled', '');
}

function positionControls() {
  if (!againButton) return;
  const y = drawHeight + 10;
  let x = margin;
  const visible = phase === 'summary'
    ? [moreButton, againButton].filter(b => b.elt.style.display !== 'none')
    : binButtons.concat([nextButton]);
  for (let i = 0; i < visible.length; i++) {
    const b = visible[i];
    // Small gap after the three bin buttons separates "place" from "navigate".
    if (phase !== 'summary' && i === BINS.length) x += 16;
    b.position(x, y);
    x += b.elt.offsetWidth + 8;
  }
}

function keyPressed() {
  if (phase === 'choose' && key >= '1' && key <= '3') placeCard(BINS[int(key) - 1]);
  else if (phase === 'feedback' && (keyCode === ENTER || key === 'n' || key === 'N')) advance();
}

function draw() {
  updateCanvasSize();

  fill('aliceblue');
  stroke('silver');
  rect(0, 0, canvasWidth, drawHeight);
  fill('white');
  rect(0, drawHeight, canvasWidth, controlHeight);

  // Title
  noStroke();
  fill('black');
  textAlign(CENTER, TOP);
  textSize(22);
  textStyle(BOLD);
  text('Fan Family Sorter', canvasWidth / 2, 10);
  textStyle(NORMAL);

  // Prompt and score line
  textSize(15);
  fill('dimgray');
  const promptLines = wrapLines(PROMPT, canvasWidth - 2 * margin);
  for (let i = 0; i < promptLines.length; i++) text(promptLines[i], canvasWidth / 2, 40 + i * 19);
  let y = 40 + promptLines.length * 19 + 4;
  textSize(16);
  fill('black');
  textStyle(BOLD);
  const progress = phase === 'summary' ? 'All 15 placed' :
    'Card ' + (current + 1) + ' of ' + deck.length;
  text('Correct: ' + score() + ' of 15     ' + progress, canvasWidth / 2, y);
  textStyle(NORMAL);
  y += 28;

  if (phase === 'summary') {
    drawSummary(y);
  } else {
    y = drawCurrentCard(y);
    drawBins(y + 10, drawHeight - 26);
  }

  // Provenance note
  noStroke();
  fill('gray');
  textSize(11);
  textAlign(LEFT, BOTTOM);
  const source = 'Product lines: Twin City Fan product catalog, tcf.com (retrieved 2026-10-08).';
  const keys = ' Keys: 1, 2, 3 to place; Enter for next.';
  text(textWidth(source + keys) <= canvasWidth - 2 * margin ? source + keys : source,
    margin, drawHeight - 6);
}

// Draws the face-up card (and its feedback once placed). Returns the bottom y.
function drawCurrentCard(top) {
  const card = deck[current];
  const placed = phase === 'feedback' ? placements[placements.length - 1] : null;
  const w = min(canvasWidth - 2 * margin, 680);
  const x = (canvasWidth - w) / 2;
  const pad = 12;

  textSize(16);
  const descLines = wrapLines(card.text, w - 2 * pad);
  let fbLines = [];
  let fbHead = '';
  if (placed) {
    fbHead = placed.correct ? 'Correct: ' + card.bin + '.' : 'This one is ' + card.bin + '.';
    textSize(15);
    fbLines = wrapLines(card.why, w - 2 * pad);
  }
  const h = pad + 22 + descLines.length * 20 + (placed ? 10 + 20 + fbLines.length * 19 : 0) + pad;

  stroke(placed ? (placed.correct ? 'seagreen' : 'firebrick') : 'steelblue');
  strokeWeight(placed ? 3 : 2);
  fill(placed ? (placed.correct ? 'honeydew' : 'mistyrose') : 'white');
  rect(x, top, w, h, 8);
  strokeWeight(1);

  noStroke();
  textAlign(LEFT, TOP);
  fill('midnightblue');
  textSize(18);
  textStyle(BOLD);
  text(card.model, x + pad, top + pad);
  if (placed) {
    textAlign(RIGHT, TOP);
    textSize(14);
    fill(placed.correct ? 'seagreen' : 'firebrick');
    text((placed.correct ? '✓ ' : '✗ ') + 'You placed it in ' + placed.chosen, x + w - pad, top + pad + 2);
    textAlign(LEFT, TOP);
  }
  textStyle(NORMAL);
  fill('black');
  textSize(16);
  let yy = top + pad + 24;
  for (const line of descLines) { text(line, x + pad, yy); yy += 20; }
  if (placed) {
    yy += 6;
    stroke('silver');
    line(x + pad, yy, x + w - pad, yy);
    noStroke();
    yy += 6;
    textStyle(BOLD);
    fill(placed.correct ? 'seagreen' : 'firebrick');
    textSize(16);
    text(fbHead, x + pad, yy);
    textStyle(NORMAL);
    yy += 21;
    fill('black');
    textSize(15);
    for (const line of fbLines) { text(line, x + pad, yy); yy += 19; }
  }
  return top + h;
}

function drawBins(top, bottom) {
  const gap = 10;
  const binW = (canvasWidth - 2 * margin - 2 * gap) / 3;
  const h = bottom - top;
  for (let i = 0; i < BINS.length; i++) {
    const bx = margin + i * (binW + gap);
    stroke('slategray');
    fill('whitesmoke');
    rect(bx, top, binW, h, 6);
    noStroke();
    fill('black');
    textAlign(CENTER, TOP);
    textSize(16);
    textStyle(BOLD);
    const inBin = placements.filter(p => p.chosen === BINS[i]);
    text(BINS[i] + ' (' + inBin.length + ')', bx + binW / 2, top + 6);
    textStyle(NORMAL);
    if (inBin.length === 0) {
      fill('darkgray');
      textSize(14);
      text('No cards yet', bx + binW / 2, top + 34);
    }

    // Placed cards as locked chips, marked correct or incorrect.
    const cols = binW >= 190 ? 2 : 1;
    const chipGap = 6;
    const chipW = (binW - 2 * 8 - (cols - 1) * chipGap) / cols;
    const rowsNeeded = max(1, ceil(inBin.length / cols));
    const chipH = constrain(floor((h - 36) / rowsNeeded) - 5, 16, 24);
    for (let k = 0; k < inBin.length; k++) {
      const p = inBin[k];
      const cx = bx + 8 + (k % cols) * (chipW + chipGap);
      const cy = top + 32 + floor(k / cols) * (chipH + 5);
      stroke(p.correct ? 'seagreen' : 'firebrick');
      fill(p.correct ? 'honeydew' : 'mistyrose');
      rect(cx, cy, chipW, chipH, 4);
      noStroke();
      fill(p.correct ? 'darkgreen' : 'firebrick');
      textAlign(LEFT, CENTER);
      textSize(13);
      text((p.correct ? '✓ ' : '✗ ') + p.card.model, cx + 6, cy + chipH / 2);
    }
  }
}

// Splits the misplaced cards into pages that fit the space left in the summary.
function paginateMisses(avail, whyW) {
  const misses = placements.filter(p => !p.correct);
  const pages = [[]];
  textSize(14);
  textStyle(NORMAL);
  let used = 0;
  for (const m of misses) {
    const rowH = max(36, 18 + wrapLines(m.card.why, whyW).length * 18) + 8;
    if (used + rowH > avail && pages[pages.length - 1].length > 0) {
      pages.push([]);
      used = 0;
    }
    pages[pages.length - 1].push(m);
    used += rowH;
  }
  if (pages.length !== missPages.length) {
    missPages = pages;
    missPage = min(missPage, missPages.length - 1);
    updateControls();
  } else {
    missPages = pages;
  }
}

function summaryLeftColWidth(w) {
  return min(220, w * 0.34);
}

function drawSummary(top) {
  const w = min(canvasWidth - 2 * margin, 700);
  const x = (canvasWidth - w) / 2;
  const s = score();
  const mastered = s >= MASTERY;
  const bottom = drawHeight - 26;

  stroke(mastered ? 'seagreen' : 'darkorange');
  strokeWeight(2);
  fill('white');
  rect(x, top, w, bottom - top, 8);
  strokeWeight(1);
  noStroke();

  textAlign(CENTER, TOP);
  textSize(20);
  textStyle(BOLD);
  fill('black');
  text('Correct: ' + s + ' of 15', canvasWidth / 2, top + 12);
  textSize(16);
  fill(mastered ? 'seagreen' : 'firebrick');
  const msg = mastered ? 'Mastery reached.' :
    'Review the sections on tubular housings and power roof ventilators, then sort again.';
  const msgLines = wrapLines(msg, w - 30);
  let y = top + 42;
  for (const l of msgLines) { text(l, canvasWidth / 2, y); y += 20; }
  textStyle(NORMAL);

  // Per-bin tally
  textSize(14);
  fill('dimgray');
  const tally = BINS.map(b => {
    const ps = placements.filter(p => p.card.bin === b);
    return b + ': ' + ps.filter(p => p.correct).length + ' of ' + ps.length;
  }).join('    ');
  text(tally, canvasWidth / 2, y + 4);
  y += 30;

  const misses = placements.filter(p => !p.correct);
  textAlign(LEFT, TOP);
  if (misses.length === 0) {
    fill('black');
    textSize(16);
    text('No misplaced cards. Every product line went to its family on the first try.', x + 12, y + 6, w - 24);
    return;
  }
  const leftW = summaryLeftColWidth(w);
  const whyW = w - 24 - leftW;
  // The header can change height with the page note, so measure it at the
  // page count from the previous pass, then paginate the rows that remain.
  fill('black');
  textSize(15);
  textStyle(BOLD);
  const pageNote = missPages.length > 1 ? ' (page ' + (missPage + 1) + ' of ' + missPages.length + ')' : '';
  const headLines = wrapLines('Misplaced cards (' + misses.length + ')' + pageNote +
    '. Which clue misled you: housing shape, roof location or application name?', w - 24);
  for (const l of headLines) { text(l, x + 12, y); y += 19; }
  textStyle(NORMAL);
  y += 8;
  paginateMisses(bottom - 8 - y, whyW);

  for (const m of missPages[missPage] || []) {
    textSize(14);
    textStyle(BOLD);
    fill('firebrick');
    text('✗ ' + m.card.model, x + 12, y);
    textStyle(NORMAL);
    fill('dimgray');
    text('you chose ' + m.chosen, x + 12, y + 18);
    fill('black');
    textStyle(BOLD);
    text('This one is ' + m.card.bin + '.', x + 12 + leftW, y);
    textStyle(NORMAL);
    const lines = wrapLines(m.card.why, whyW);
    let ly = y + 18;
    for (const l of lines) { text(l, x + 12 + leftW, ly); ly += 18; }
    y = max(y + 36, ly) + 8;
    stroke('gainsboro');
    line(x + 12, y - 4, x + w - 12, y - 4);
    noStroke();
  }
}

// Word-wraps str to lines no wider than maxW at the current text size.
function wrapLines(str, maxW) {
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (textWidth(test) > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  updateControls();
}

function updateCanvasSize() {
  const container = document.querySelector('main');
  if (container) {
    canvasWidth = container.offsetWidth;
  }
}
