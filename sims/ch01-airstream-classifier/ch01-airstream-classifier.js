// Airstream Classifier - p5.js MicroSim (FanPedia shared kit: FP.CardDeck, FP.p5)
// CANVAS_HEIGHT: 650
// Chapter 1 (Air, Pressure and the Fan): sort ten airstreams into five bins: clean air, or
// contaminated by solids, corrosives or moisture, flammables, or fumes hazardous to people.
// One scored placement per card; a missed card stays up for unscored retries until it is
// placed correctly, and the correct bin is revealed after the second wrong placement.
// Shuffled order, seeded per session. Mastery: 8 of 10 on the first attempt.
// Needs ../shared-libs/fanpedia-core.js and fanpedia-p5.js (see main.html).

const K = FP.p5;
const SIM_ID = 'ch01-airstream-classifier';
let canvasWidth = 800;
const drawHeight = 535;
const controlHeight = K.controlHeightFor(3);   // bins | navigation wrap at 320-400 px
const canvasHeight = drawHeight + controlHeight;
const margin = 10;

const PROMPT = 'What is in this air, and why does it matter to the fan?';
const MASTERY = 8;
const REVIEW = 'Reread "Contaminated Airstreams" and ask which property matters: solids, corrosion or moisture, flammability, or harm to people';
const NOTE = 'Bins from the chapter section "Contaminated Airstreams"; FanPedia pp. 4, 6, 32, 110-116';
const KEYS_HINT = 'Keys: A-E or 1-5 to place; Enter for next';

// Bins, with the definition shown on each bin (spec wording).
const BINS = [
  { id: 'A', name: 'Clean air', button: 'A Clean', def: 'No significant solids, moisture, corrosives, flammables or hazardous fumes, at any temperature.' },
  { id: 'B', name: 'Solids', button: 'B Solids', def: 'Contaminated: solids that wear or build up on the impeller.' },
  { id: 'C', name: 'Corrosive or moisture', button: 'C Corrosive', def: 'Contaminated: corrosive gases or heavy moisture that attack materials.' },
  { id: 'D', name: 'Flammable', button: 'D Flammable', def: 'Contaminated: flammable vapors, gases or dusts that make a spark dangerous.' },
  { id: 'E', name: 'Hazardous fumes', button: 'E Fumes', def: 'Contaminated: fumes hazardous to people, which must be diluted and discharged away from the building.' }
];
const binById = id => BINS.find(b => b.id === id);

const CARDS = [
  { short: 'Office supply air', text: 'Filtered supply air for an office floor at 70°F', answer: 'A',
    why: 'Filtered air at room temperature carries nothing that threatens the fan or people.' },
  { short: 'Paper trim conveying', text: 'Air conveying paper trim away from a converting line', answer: 'B',
    why: 'Paper trim is solid material; FanPedia lists paper handling radial impellers for this kind of duty.' },
  { short: 'Plating tank exhaust', text: 'Exhaust above a plating tank with acid mist', answer: 'C',
    why: 'Acid mist corrodes metal parts in the airstream.' },
  { short: 'Dishwasher room exhaust', text: 'Exhaust from a commercial dishwasher room, saturated with water vapor', answer: 'C',
    why: 'Heavy moisture condenses and attacks materials; the fan needs drains and suitable materials.' },
  { short: 'Paint booth exhaust', text: 'Exhaust from a paint booth carrying solvent vapor', answer: 'D',
    why: 'Solvent vapor is flammable, so a spark from rubbing parts could ignite it.' },
  { short: 'Lab fume hood exhaust', text: 'Exhaust from laboratory fume hoods', answer: 'E',
    why: "Lab exhaust carries fumes hazardous to people; FanPedia's lab exhaust fans dilute it and send it up and away from the building." },
  { short: '400°F drying oven', text: 'Recirculated air inside a 400°F drying oven, with no dust or vapor', answer: 'A',
    why: 'High temperature alone does not make air contaminated; it calls for high-temperature construction instead.' },
  { short: 'Foundry shakeout', text: 'Sand and grit from a foundry shakeout', answer: 'B',
    why: 'Abrasive solids erode blades and housings.' },
  { short: 'Battery charging room', text: 'Exhaust from a battery charging room where hydrogen can collect', answer: 'D',
    why: 'Hydrogen is a flammable gas, so ignition sources must be controlled.' },
  { short: 'Outdoor make-up air', text: 'Outdoor make-up air drawn into a warehouse', answer: 'A',
    why: 'Outdoor air with nothing added is clean air for fan selection purposes.' }
].map((c, i) => Object.assign({ id: 'card-' + (i + 1) }, c));

// Spec feedback: Correct "Correct: <bin letter>. <Why>"; incorrect "Not quite. <Why>";
// the correct bin is revealed after the second wrong placement (the first unscored retry).
function binText(id) { const b = binById(id); return id + ' (' + b.name.toLowerCase() + ')'; }
const deck = new FP.CardDeck({
  cards: CARDS, seed: Math.floor(Math.random() * 1e9), attempts: 1, retryMissed: false,
  practiceTry: Infinity,                     // unlimited unscored retries until the card is placed correctly
  noun: 'First-attempt', mastery: MASTERY, reviewPointer: REVIEW, id: SIM_ID,
  messages: {
    correct: res => FP.msg.correct(res.card.answer, res.card.why),
    missed: res => res.practiceTry
      ? FP.msg.BAD + ' Not quite. The correct bin is ' + binText(res.card.answer) + '. ' + res.card.why
      : FP.msg.BAD + ' Not quite. ' + res.card.why
  }
});

// Per-card display state
let solved = false;      // placed in the correct bin (scored or practice): Next unlocks
let wrongCount = 0;      // wrong placements on this card; the bin is revealed at 2
let lastRes = null;
let lastChosen = null;

// Controls
let binButtons = [];
let nextButton, againButton;

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight, margin });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));

  BINS.forEach((b, i) => {
    const btn = K.button(b.button, () => place(b.id));
    btn.addClass('choice');
    btn.attribute('aria-label', 'Bin ' + b.id + ': ' + b.name);
    btn.attribute('aria-keyshortcuts', b.id + ' ' + (i + 1));
    binButtons.push(btn);
  });
  nextButton = K.button('Next card', advance);
  nextButton.attribute('aria-keyshortcuts', 'Enter');
  againButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  resetCardState();
  updateControls();
  FP.announce('Airstream classifier. Card 1 of 10: ' + deck.card().text + '.');
  describe('Airstream Classifier. Ten airstream cards are shown one at a time in a shuffled order. Place each into one of ' +
    'five bins with the buttons below the canvas or keys A to E: A clean air, B solids, C corrosive gases or moisture, ' +
    'D flammable, E fumes hazardous to people. The first placement is scored; a wrong card stays up until it is placed ' +
    'in the correct bin, and the correct bin is shown after the second wrong placement. A summary lists every card, ' +
    'your first choice and the correct bin.');
}

function resetCardState() { solved = false; wrongCount = 0; lastRes = null; lastChosen = null; }

function place(id) {
  const st = deck.state();
  if (st.phase === 'summary' || solved) return;
  const res = deck.place(id);
  if (res.status === 'ignored') return;
  lastRes = res; lastChosen = id;
  if (res.status === 'correct') solved = true; else wrongCount++;
  updateControls();
  let say = res.message;
  if (!solved) say += wrongCount >= 2 ? ' Place it in bin ' + res.card.answer + ' to continue.' : ' Place it in the correct bin to continue; retries are not scored.';
  FP.announce(say + ' ' + deck.state().scoreLabel + '.');
  if (solved) nextButton.elt.focus();
}

function advance() {
  if (!solved || !deck.next()) return;
  resetCardState();
  updateControls();
  const st = deck.state();
  if (st.phase === 'summary') {
    const s = deck.summary();
    FP.announce('Summary. ' + firstLine(s) + '. ' + s.lines[1]);
    againButton.elt.focus();
  } else {
    FP.announce('Card ' + (st.index + 1) + ' of ' + st.count + ': ' + st.card.text + '.');
  }
}

function startOver() {
  deck.newRound();
  resetCardState();
  updateControls();
  FP.announce('Started over with a new order. Card 1 of 10: ' + deck.card().text + '.');
  binButtons[0].elt.focus();
}

function firstLine(s) { return 'First-attempt correct: ' + s.firstAttempt + ' of ' + s.total; }

function updateControls() {
  if (!againButton) return;
  const had = document.activeElement;
  const st = deck.state();
  const summary = st.phase === 'summary';
  binButtons.forEach((b, i) => {
    if (summary) b.hide(); else b.show();
    K.setEnabled(b, !summary && !solved);
    const reveal = !solved && wrongCount >= 2 && BINS[i].id === st.card.answer;
    b.html((reveal ? '→ ' : '') + BINS[i].button);
  });
  if (summary) nextButton.hide(); else nextButton.show();
  nextButton.html(st.isLast ? 'Show summary' : 'Next card');
  K.setEnabled(nextButton, solved);
  againButton.html(summary ? 'Sort again' : FP.msg.START_OVER);
  positionControls();
  K.keepFocus(had, binButtons.concat([nextButton, againButton]));
}

function positionControls() {
  K.flowButtons(0, binButtons.concat(['|', nextButton, againButton]));
}

const keys = K.keys.bind({
  a: () => place('A'), b: () => place('B'), c: () => place('C'), d: () => place('D'), e: () => place('E'),
  '1': () => place('A'), '2': () => place('B'), '3': () => place('C'), '4': () => place('D'), '5': () => place('E'),
  Enter: advance
});
function keyPressed() { return keys(); }

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  let y = K.title('Airstream Classifier');
  noStroke(); textSize(15); textStyle(NORMAL); fill(FP.tok('text-muted'));
  y = K.wrapText(PROMPT, canvasWidth / 2, y - 2, canvasWidth - 2 * margin, 19, { align: CENTER }) + 2;
  const st = deck.state();
  const progress = st.phase === 'summary' ? 'All ' + st.count + ' placed' : 'Card ' + (st.index + 1) + ' of ' + st.count;
  y = K.statusLine(st.scoreLabel, progress, null, { y }) + 4;
  if (st.phase === 'summary') drawSummary(y);
  else {
    y = drawCard(y, st);
    drawBins(y + 8, drawHeight - 26, st);
  }
  textSize(13);
  const both = FP.msg.note(NOTE, KEYS_HINT);
  const room = canvasWidth - 2 * margin;
  K.note(textWidth(both) <= room ? both : textWidth(NOTE) <= room ? NOTE : 'Bins from Chapter 1 "Contaminated Airstreams"');
}

function drawCard(top, st) {
  const card = st.card;
  const w = min(canvasWidth - 2 * margin, 720), x = (canvasWidth - w) / 2, pad = 12, iw = w - 2 * pad;
  const narrow = canvasWidth < 480;
  const bodySize = narrow ? 15 : 17, fbSize = narrow ? 13 : 15;
  const bodyLH = bodySize + 5, fbLH = fbSize + 5;
  const placed = lastRes != null;
  const msg = placed ? lastRes.message : '';
  const ok = placed && solved;
  let instr = '';
  if (placed && !solved) instr = wrongCount >= 2 ? 'Place it in bin ' + card.answer + ' to go on (not scored).' : 'Place it in the correct bin to go on. Retries are not scored.';
  if (placed && solved && lastRes.practiceTry) instr = 'Placed after a retry: the first placement stays as scored.';
  if (placed && solved && !lastRes.practiceTry) instr = 'You placed it in bin ' + lastChosen + '.';

  textStyle(BOLD); textSize(bodySize);
  const tl = K.countLines(card.text, iw);
  textStyle(BOLD); textSize(fbSize);
  const ml = placed ? K.countLines(msg, iw) : 0;
  textStyle(NORMAL);
  const il = instr ? K.countLines(instr, iw) : 0;
  const h = pad + 18 + tl * bodyLH + (placed ? 14 + ml * fbLH + il * fbLH : 0) + pad - 2;

  if (placed) {
    K.panel(x, top, w, h, { fill: ok ? '--fp-correct-bg' : '--fp-incorrect-bg', stroke: ok ? '--fp-correct' : '--fp-incorrect',
      dashed: !ok, weight: 3 });
  } else {
    K.panel(x, top, w, h, { fill: '--fp-ctrl-bg', stroke: '--fp-primary', weight: 2 });
  }
  noStroke(); textAlign(LEFT, TOP);
  fill(FP.tok('text-muted')); textSize(13); textStyle(NORMAL);
  text('Airstream', x + pad, top + pad - 2);
  fill(FP.tok('text')); textSize(bodySize); textStyle(BOLD);
  let yy = K.wrapText(card.text, x + pad, top + pad + 18, iw, bodyLH);
  if (placed) {
    yy += 6;
    stroke(FP.tok('border')); line(x + pad, yy, x + w - pad, yy); noStroke();
    yy += 8;
    textSize(fbSize); textStyle(BOLD); fill(FP.tok(ok ? 'correct' : 'incorrect'));
    yy = K.wrapText(msg, x + pad, yy, iw, fbLH);
    textStyle(NORMAL); fill(FP.tok('text'));
    if (instr) K.wrapText(instr, x + pad, yy, iw, fbLH);
  }
  textStyle(NORMAL);
  return top + h;
}

function placementsIn(id) { return deck.placements.filter(p => p.chosen === id); }

function binOutline(b, st) {
  if (lastRes == null || st.phase === 'summary') return null;
  if (!solved && wrongCount >= 2 && b.id === st.card.answer) return 'reveal';
  if (lastChosen === b.id) return solved ? 'ok' : 'bad';
  return null;
}

function drawBins(top, bottom, st) {
  if (canvasWidth >= 600) drawBinColumns(top, bottom, st); else drawBinRows(top, bottom, st);
}

function binFrame(x, y, w, h, kind) {
  if (kind === 'reveal') K.panel(x, y, w, h, { fill: '--fp-ctrl-bg', stroke: '--fp-accent', weight: 3, radius: 6 });
  else if (kind === 'ok') K.panel(x, y, w, h, { fill: '--fp-correct-bg', stroke: '--fp-correct', weight: 2, radius: 6 });
  else if (kind === 'bad') K.panel(x, y, w, h, { fill: '--fp-incorrect-bg', stroke: '--fp-incorrect', weight: 2, dashed: true, radius: 6 });
  else K.panel(x, y, w, h, { fill: '--fp-ctrl-bg', stroke: '--fp-border', radius: 6 });
}

function drawBinColumns(top, bottom, st) {
  const gap = 8, binW = (canvasWidth - 2 * margin - 4 * gap) / 5, h = bottom - top;
  BINS.forEach((b, i) => {
    const bx = margin + i * (binW + gap);
    const kind = binOutline(b, st);
    binFrame(bx, top, binW, h, kind);
    noStroke(); textAlign(LEFT, TOP);
    fill(FP.tok('primary-dark')); textStyle(BOLD); textSize(15);
    let y = K.wrapText(b.id + '. ' + b.name, bx + 7, top + 7, binW - 14, 18);
    if (kind === 'reveal') { fill(FP.tok('accent-text')); textSize(13); text('→ correct bin', bx + 7, y); y += 17; }
    fill(FP.tok('text')); textStyle(NORMAL); textSize(13);
    y = K.wrapText(b.def, bx + 7, y + 2, binW - 14, 16) + 6;
    stroke(FP.tok('border')); line(bx + 6, y, bx + binW - 6, y); noStroke();
    y += 6;
    const inBin = placementsIn(b.id);
    if (!inBin.length) { fill(FP.tok('text-muted')); textSize(13); text('No cards yet', bx + 7, y); return; }
    const chipH = 22;
    const fit = Math.max(1, Math.floor((top + h - 6 - y + 4) / (chipH + 4)));
    const shown = inBin.length > fit ? fit - 1 : inBin.length;
    for (let k = 0; k < shown; k++) chip(inBin[k], bx + 5, y + k * (chipH + 4), binW - 10, chipH);
    if (shown < inBin.length) { fill(FP.tok('text-muted')); textSize(13); text('+' + (inBin.length - shown) + ' more', bx + 8, y + shown * (chipH + 4) + 4); }
  });
}

function chip(p, x, y, w, h) {
  K.panel(x, y, w, h, { fill: p.correct ? '--fp-correct-bg' : '--fp-incorrect-bg', stroke: p.correct ? '--fp-correct' : '--fp-incorrect',
    dashed: !p.correct, weight: p.correct ? 1 : 1.5, radius: 4 });
  noStroke(); fill(FP.tok(p.correct ? 'correct' : 'incorrect')); textAlign(LEFT, CENTER); textSize(12);
  text(fitLabel((p.correct ? FP.msg.OK : FP.msg.BAD) + ' ' + p.card.short, w - 8), x + 4, y + h / 2);
}

// Narrow layout: one row per bin with its definition and a count of first placements.
function drawBinRows(top, bottom, st) {
  const w = canvasWidth - 2 * margin, gap = 5;
  textSize(12);
  const heights = BINS.map(b => K.countLines(b.id + '. ' + b.name + ': ' + b.def, w - 70) * 15 + 10);
  const total = heights.reduce((a, c) => a + c, 0) + gap * 4;
  let y = top + Math.max(0, (bottom - top - total) / 2) * 0;
  BINS.forEach((b, i) => {
    const kind = binOutline(b, st);
    binFrame(margin, y, w, heights[i], kind);
    noStroke(); textAlign(LEFT, TOP); textSize(12);
    fill(FP.tok('text'));
    const head = b.id + '. ' + b.name + ': ';
    const lines = K.wrapLines(head + b.def, w - 70);
    // bold head on the first line
    let ly = y + 5;
    lines.forEach((ln, k) => {
      if (k === 0 && ln.indexOf(head.trim()) === 0) {
        textStyle(BOLD); fill(FP.tok('primary-dark')); text(head, margin + 6, ly);
        const hw = textWidth(head);
        textStyle(NORMAL); fill(FP.tok('text')); text(ln.slice(head.length), margin + 6 + hw, ly);
      } else { textStyle(NORMAL); fill(FP.tok('text')); text(ln, margin + 6, ly); }
      ly += 15;
    });
    const inBin = placementsIn(b.id);
    const okN = inBin.filter(p => p.correct).length, badN = inBin.length - okN;
    textAlign(RIGHT, TOP); textStyle(BOLD);
    let rx = margin + w - 6;
    if (kind === 'reveal') { fill(FP.tok('accent-text')); text('→ here', rx, y + 5); }
    else {
      if (badN) { fill(FP.tok('incorrect')); text(FP.msg.BAD + badN, rx, y + 5); rx -= 26; }
      if (okN) { fill(FP.tok('correct')); text(FP.msg.OK + okN, rx, y + 5); }
    }
    textStyle(NORMAL);
    y += heights[i] + gap;
  });
}

function fitLabel(str, maxW) {
  if (textWidth(str) <= maxW) return str;
  let t = str;
  while (t.length > 3 && textWidth(t + '…') > maxW) t = t.slice(0, -1);
  return t.replace(/\s+$/, '') + '…';
}

function drawSummary(top) {
  const s = deck.summary();
  const w = min(canvasWidth - 2 * margin, 720), x = (canvasWidth - w) / 2, bottom = drawHeight - 26;
  K.panel(x, top, w, bottom - top, { fill: '--fp-ctrl-bg', stroke: '--fp-primary', weight: 1 });
  noFill(); stroke(FP.tok('primary')); rect(x + 3, top + 3, w - 6, bottom - top - 6, 6); noStroke();
  textAlign(CENTER, TOP); textStyle(BOLD); textSize(19); fill(FP.tok('text'));
  text(firstLine(s), canvasWidth / 2, top + 10);
  textSize(14); fill(FP.tok(s.mastered ? 'correct' : 'text'));
  let y = K.wrapText((s.mastered ? FP.msg.OK + ' ' : '') + s.lines[1], canvasWidth / 2, top + 36, w - 30, 18, { align: CENTER }) + 8;
  textStyle(NORMAL);
  // One row per card: first choice and correct bin.
  const narrow = w < 560;
  const rows = deck.placements;
  const rowH = Math.min(24, (bottom - 8 - y) / rows.length);
  const ts = rowH < 20 ? 12 : 13;
  textAlign(LEFT, CENTER); textSize(ts);
  textStyle(BOLD); fill(FP.tok('text-muted'));
  const cA = x + 14, cB = x + w - (narrow ? 132 : 250), cC = x + w - (narrow ? 64 : 120);
  rows.forEach((p, i) => {
    const ry = y + i * rowH + rowH / 2;
    if (i % 2 === 0) { fill(FP.tok('info-bg')); rect(x + 8, ry - rowH / 2, w - 16, rowH); }
    textStyle(NORMAL); fill(FP.tok(p.correct ? 'correct' : 'incorrect')); textStyle(BOLD);
    text(p.correct ? FP.msg.OK : FP.msg.BAD, cA, ry);
    fill(FP.tok('text')); textStyle(NORMAL);
    text(fitLabel(narrow ? p.card.short : p.card.text, cB - cA - 26), cA + 18, ry);
    text((narrow ? 'you ' : 'first choice ') + p.chosen, cB, ry);
    textStyle(BOLD);
    text((narrow ? 'bin ' : 'correct bin ') + p.card.answer, cC, ry);
    textStyle(NORMAL);
  });
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  updateControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
