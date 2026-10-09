// Ventilation Job Matcher
// CANVAS_HEIGHT: 670
// Twelve building ventilation job cards (shuffled once per session). For each card the
// learner recommends one of twelve product lines and picks the deciding factor (air
// contents, discharge path, mounting location, occupant exposure), then commits both.
// Product line and factor are scored separately; mastery is 10 of 12 product lines on
// the first (only) attempt. The summary groups the jobs by deciding factor.
// Built on the FanPedia kit: FP.CardDeck (cards, product-line score, mastery, wording),
// FP.Score (the separate reasons score), FP.p5 (layout, text, controls, keys),
// FP.announce. Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js
// (load them before this file, also in the p5.js editor).

const K = FP.p5;
const SIM_ID = 'ch05-ventilation-job-matcher';

let canvasWidth = 800;
const drawHeight = 520;
const controlHeight = K.controlHeightFor(4);   // 150: product line, factors (wrap at narrow widths), buttons
const canvasHeight = drawHeight + controlHeight;

// ---------- Content (chapter 5 spec) ----------
// Product lines in the spec's order; short names for the list and summary.
const LINES = [
  { id: 'kitchen', name: 'Kitchen exhaust fan', short: 'Kitchen exhaust fan' },
  { id: 'smoke', name: 'Smoke and heat exhaust fan', short: 'Smoke and heat fan' },
  { id: 'frp', name: 'Fiberglass fan', short: 'Fiberglass fan' },
  { id: 'mancooler', name: 'Mancooler', short: 'Mancooler' },
  { id: 'downblast', name: 'Downblast centrifugal roof exhauster', short: 'Downblast roof exhauster' },
  { id: 'lab', name: 'Laboratory exhaust fan with entrained flow', short: 'Lab exhaust (entrained)' },
  { id: 'plenum', name: 'Plenum fan', short: 'Plenum fan' },
  { id: 'cabinet', name: 'Cabinet ventilator', short: 'Cabinet ventilator' },
  { id: 'gravity', name: 'Gravity relief ventilator', short: 'Gravity relief ventilator' },
  { id: 'inline', name: 'Square inline centrifugal fan', short: 'Square inline fan' },
  { id: 'wall', name: 'Centrifugal wall exhauster', short: 'Centrifugal wall exhauster' },
  { id: 'tubeaxial', name: 'Tubeaxial fan', short: 'Tubeaxial fan' }
];
const LINE = Object.fromEntries(LINES.map(l => [l.id, l]));
const FACTORS = [
  { id: 'air', name: 'Air contents', short: 'Air' },
  { id: 'path', name: 'Discharge path', short: 'Discharge' },
  { id: 'mount', name: 'Mounting location', short: 'Mounting' },
  { id: 'people', name: 'Occupant exposure', short: 'Occupants' }
];
const FACTOR = Object.fromEntries(FACTORS.map(f => [f.id, f]));

const JOBS = [
  { id: 1, short: 'Restaurant grill hood', line: 'kitchen', factor: 'air',
    text: 'A restaurant\'s grill hood exhaust must leave through the roof.',
    why: 'Grease-laden air needs a listed kitchen fan (UL 705 Supplement SC) with upblast discharge away from building surfaces.' },
  { id: 2, short: 'Atrium smoke clearing', line: 'smoke', factor: 'air',
    text: 'An atrium must be cleared of smoke during a fire, with the fan still running at high temperature.',
    why: 'Smoke and heat fans are rated for 500°F for four hours or 1,000°F for 15 minutes; an ordinary fan is not.' },
  { id: 3, short: 'Wastewater building', line: 'frp', factor: 'air',
    text: 'A wastewater treatment building exhausts moist, corrosive air.',
    why: 'FRP housings resist moisture-laden and corrosive air at lower cost than stainless steel or exotic alloys.' },
  { id: 4, short: 'Foundry pour station', line: 'mancooler', factor: 'people',
    text: 'Workers at a foundry pour station need a movable fan blowing air on them.',
    why: 'A mancooler is an axial fan on a 360-degree swivel base with OSHA-compliant inlet and outlet screens; it cools people rather than exhausting air.' },
  { id: 5, short: 'Restroom exhaust, flat roof', line: 'downblast', factor: 'path',
    text: 'Restroom exhaust on a flat roof where a low, weather-protected unit is preferred.',
    why: 'Clean air may be laid back onto the roof, and the downblast cover gives a low profile with built-in weather protection.' },
  { id: 6, short: 'Research fume hoods', line: 'lab', factor: 'path',
    text: 'Fume hood exhaust must be diluted and thrown high above a research building\'s roof.',
    why: 'A nozzle or windband entrains outside air into a high-velocity plume, diluting it and raising plume height.' },
  { id: 7, short: 'Cleanroom air handler', line: 'plenum', factor: 'mount',
    text: 'A cleanroom air-handling unit must supply three duct openings from one cabinet with minimal maintenance.',
    why: 'The plenum fan pressurizes the cabinet so every opening is fed; direct drive Arrangement 4 avoids belt residue.' },
  { id: 8, short: 'Office bathroom', line: 'cabinet', factor: 'mount',
    text: 'Quiet, continuous exhaust from an office bathroom, mounted above the ceiling.',
    why: 'A small forward curved blower in a cabinet is built for quiet continuous duty in ceilings.' },
  { id: 9, short: 'Warehouse relief opening', line: 'gravity', factor: 'path',
    text: 'A warehouse needs a relief opening that lets air out when the supply fans run, with no second motor.',
    why: 'Supply-fan pressure pushes air out through the weather-protected opening; no fan is needed.' },
  { id: 10, short: 'Tight above-ceiling duct', line: 'inline', factor: 'mount',
    text: 'Clean exhaust duct runs through a tight above-ceiling space and must turn 90 degrees at the fan.',
    why: 'Its square housing fits rectangular duct and can pass air straight through or through a 90-degree turn.' },
  { id: 11, short: 'Shop with no roof access', line: 'wall', factor: 'mount',
    text: 'A single-story shop with no roof access needs exhaust where the duct ends at an exterior wall.',
    why: 'The side-wall exhauster discharges straight out from the wall, away from the building face.' },
  { id: 12, short: 'Short round process duct', line: 'tubeaxial', factor: 'path',
    text: 'Short, straight round duct carrying general process exhaust at low pressure.',
    why: 'A plain-tube axial fan moves air straight through at low pressure in a short duct run.' }
];

const QUESTION = 'Which product line was built for this job, and why?';
const POINTER = 'Review "Matching the Job to the Product Line" and the two comparison tables, then press Start over';

// ---------- Engines ----------
const SESSION_SEED = Math.floor(Math.random() * 1e9);   // shuffled once per session; Start over keeps the order
const CARDS = JOBS.map(j => ({ id: j.id, answer: j.line, answerText: LINE[j.line].name, why: j.why, job: j }));
const deck = new FP.CardDeck({
  cards: CARDS, seed: SESSION_SEED, attempts: 1, retryMissed: false,
  noun: 'Product lines', mastery: 10, reviewPointer: POINTER, id: SIM_ID,
  check: (card, choice) => choice.line === card.answer,   // the deck scores product lines only
  messages: {   // spec wording: "Correct: <line>." / "A better fit is <line>." then the Why text
    correct: r => FP.msg.OK + ' Correct: ' + r.card.answerText + '. ' + r.card.why,
    missed: r => FP.msg.BAD + ' A better fit is ' + r.card.answerText + '. ' + r.card.why
  }
});
const reasons = new FP.Score({ total: CARDS.length, noun: 'Reasons' });   // scored separately, not for mastery

// ---------- State ----------
let factor = null;
let feedback = null;        // {line: res, factorOk, chosenLine, chosenFactor}
let picks = {};             // card id -> {line, factor, lineOk, factorOk}
let listHits = [];

let lineSelect, factorBtns = [], commitBtn, nextBtn, startOverBtn;
let factorRow = 1;

const keys = K.keys.bind({
  '1': () => pickFactor(0), '2': () => pickFactor(1), '3': () => pickFactor(2), '4': () => pickFactor(3),
  Enter: enterKey
});
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));

  lineSelect = createSelect();
  lineSelect.parent(document.querySelector('main'));
  lineSelect.option('Choose a product line…', '');
  LINES.forEach(l => lineSelect.option(l.name, l.id));
  lineSelect.attribute('aria-label', 'Product line for this job');
  lineSelect.changed(onLineChange);

  FACTORS.forEach((f, i) => {
    const b = K.button(f.name, () => pickFactor(i));
    b.addClass('choice');
    b.attribute('aria-pressed', 'false');
    b.attribute('aria-label', 'Deciding factor ' + (i + 1) + ': ' + f.name);
    factorBtns.push(b);
  });
  commitBtn = K.button('Commit', commit);
  nextBtn = K.button('Next card', nextCard);
  startOverBtn = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  syncControls();

  describe('Ventilation job matcher. A job card describes a building ventilation need. Choose one of ' +
    'twelve product lines and the deciding factor (air contents, discharge path, mounting location or ' +
    'occupant exposure), then commit. The sim marks both choices and explains the right fit. After twelve ' +
    'cards a summary lists every job, your choice and the correct choice, grouped by deciding factor.');
}

// ---------- Controls ----------
function syncControls() {
  const had = document.activeElement;
  const st = deck.state();
  const choosing = st.phase === 'choose';
  const summary = st.phase === 'summary';
  K.setEnabled(lineSelect, choosing);
  factorBtns.forEach((b, i) => {
    if (summary) b.hide(); else b.show();
    b.attribute('aria-pressed', factor === FACTORS[i].id ? 'true' : 'false');
    b.html(canvasWidth < 360 ? FACTORS[i].short : FACTORS[i].name);   // short labels keep 320 px to four rows
    K.setEnabled(b, choosing);
  });
  if (summary) { lineSelect.hide(); commitBtn.hide(); nextBtn.hide(); }
  else { lineSelect.show(); commitBtn.show(); nextBtn.show(); }
  K.setEnabled(commitBtn, choosing && !!lineSelect.value() && !!factor);
  K.setEnabled(nextBtn, st.phase === 'feedback');
  nextBtn.html(st.isLast ? 'Show summary' : 'Next card');
  positionControls();
  K.keepFocus(had, [lineSelect].concat(factorBtns, [commitBtn, nextBtn, startOverBtn]));
}

function positionControls() {
  const narrow = canvasWidth < 560;
  const pad = K.layout.margin;
  const lc = narrow ? 104 : 140;
  if (deck.state().phase === 'summary') {
    K.flowButtons(0, [startOverBtn]);
    return;
  }
  lineSelect.position(lc, K.controlRow(0));
  lineSelect.style('max-width', Math.max(150, canvasWidth - lc - pad) + 'px');
  factorRow = 1;
  const after = K.flowButtons(1, factorBtns, { x: narrow ? pad : lc, gap: 6 });
  K.flowButtons(after, [commitBtn, nextBtn, '|', startOverBtn], { x: narrow ? pad : lc });
}

// ---------- Actions ----------
function onLineChange() {
  syncControls();
  const id = lineSelect.value();
  if (id) FP.announce('Product line: ' + LINE[id].name + '.' + (factor ? ' Press Commit or Enter.' : ' Now choose the deciding factor, keys 1 to 4.'));
}

function pickLine(id) {
  if (deck.state().phase !== 'choose') return;
  lineSelect.selected(id);
  onLineChange();
}

function pickFactor(i) {
  if (deck.state().phase !== 'choose') return;
  factor = FACTORS[i].id;
  syncControls();
  FP.announce('Deciding factor: ' + FACTORS[i].name + '.' + (lineSelect.value() ? ' Press Commit or Enter.' : ' Now choose a product line.'));
  (lineSelect.value() ? commitBtn : lineSelect).elt.focus();
}

function commit() {
  const st = deck.state();
  const line = lineSelect.value();
  if (st.phase !== 'choose') return;
  if (!line || !factor) {
    FP.announce('Choose ' + (!line ? 'a product line' : 'the deciding factor') + ' first.');
    return;
  }
  const card = st.card;
  const res = deck.place({ line, factor });
  const factorOk = factor === card.job.factor;
  reasons.record(CARDS.indexOf(card), factorOk, 1);
  picks[card.id] = { line, factor, lineOk: res.status === 'correct', factorOk };
  feedback = { res, factorOk, chosenLine: line, chosenFactor: factor };
  FP.announce('You chose ' + LINE[line].name + ', ' + FACTOR[factor].name + '. ' + res.message + ' ' + factorText(feedback, card) + ' ' +
    deck.state().scoreLabel + '. ' + reasons.label() + '.');
  syncControls();
  nextBtn.elt.focus();
}

function factorText(fb, card) {
  return fb.factorOk ? FP.msg.OK + ' Right reason.' : FP.msg.BAD + ' The deciding factor here is ' + FACTOR[card.job.factor].name.toLowerCase() + '.';
}

function nextCard() {
  if (deck.state().phase !== 'feedback') return;
  deck.next();
  feedback = null;
  factor = null;
  lineSelect.selected('');
  syncControls();
  const st = deck.state();
  if (st.phase === 'summary') {
    FP.announce('Summary. ' + deck.summary().lines.join(' ') + ' ' + reasons.label() + '.');
    startOverBtn.elt.focus();
  } else {
    FP.announce('Job card ' + (st.index + 1) + ' of 12. ' + st.card.job.text + ' ' + QUESTION);
    lineSelect.elt.focus();
  }
}

function startOver() {
  deck.newRound(SESSION_SEED);
  reasons.reset();
  picks = {};
  feedback = null;
  factor = null;
  lineSelect.selected('');
  syncControls();
  FP.announce('Started over. Job card 1 of 12. ' + deck.state().card.job.text + ' ' + QUESTION);
  lineSelect.elt.focus();
}

function enterKey() {
  const st = deck.state();
  if (st.phase === 'choose') commit();
  else if (st.phase === 'feedback') nextCard();
}

function mousePressed() {
  for (const h of listHits) {
    if (mouseX >= h.x && mouseX <= h.x + h.w && mouseY >= h.y && mouseY <= h.y + h.h) { pickLine(h.id); return; }
  }
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  listHits = [];
  let y = K.title('Ventilation Job Matcher');
  const st = deck.state();
  const right = reasons.label() + (st.phase === 'summary' ? ' · Summary' : ' · Card ' + (st.index + 1) + ' of 12');
  y = K.statusLine(st.scoreLabel, right, null, { y: y - 4 });
  K.note(canvasWidth >= 560
    ? ['Job cards are illustrative', 'Sources: tcf.com product pages; FanPedia pp. 4–6, 170', 'Keys: 1–4 factor, Enter commits or goes on']
    : ['Illustrative jobs', 'tcf.com; FanPedia', 'Keys 1–4, Enter']);
  const top = y + 2, bottom = drawHeight - 24;
  if (st.phase === 'summary') {
    K.panel(10, top, canvasWidth - 20, bottom - top);
    drawSummary(20, top + 8, canvasWidth - 40, bottom - top - 16);
  } else if (canvasWidth >= 640) {
    const lw = Math.round(canvasWidth * 0.58);
    K.panel(10, top, lw - 15, bottom - top);
    K.panel(lw + 5, top, canvasWidth - lw - 15, bottom - top);
    drawCard(20, top + 8, lw - 35, bottom - top - 16);
    drawLineList(lw + 15, top + 8, canvasWidth - lw - 35, bottom - top - 16, 1);
  } else {
    const listH = 6 * 22 + 30;
    K.panel(10, top, canvasWidth - 20, bottom - top - listH - 6);
    K.panel(10, bottom - listH, canvasWidth - 20, listH);
    drawCard(20, top + 8, canvasWidth - 40, bottom - top - listH - 22);
    drawLineList(18, bottom - listH + 6, canvasWidth - 36, listH - 10, 2);
  }
  drawControlLabels();
  const over = listHits.some(h => mouseX >= h.x && mouseX <= h.x + h.w && mouseY >= h.y && mouseY <= h.y + h.h);
  cursor(over && st.phase === 'choose' ? HAND : ARROW);
}

function drawControlLabels() {
  if (deck.state().phase === 'summary') return;
  const narrow = canvasWidth < 560;
  noStroke();
  fill(FP.tok('text'));
  textStyle(BOLD);
  textSize(narrow ? 14 : 15);
  textAlign(LEFT, CENTER);
  text('Product line:', 10, K.controlLabel(0));
  if (!narrow) text('Deciding factor:', 10, K.controlLabel(factorRow));
  textStyle(NORMAL);
}

function paras(list, x, y, w, ts, dry) {
  for (const p of list) {
    const s = p.size ? Math.max(12, ts + p.size) : ts;
    textSize(s);
    textStyle(p.bold ? BOLD : NORMAL);
    fill(p.color || FP.tok(p.muted ? 'text-muted' : 'text'));
    y += p.gap || 0;
    y = K.wrapText(p.t, x, y, w, Math.round(s * 1.3), { dryRun: dry });
  }
  textStyle(NORMAL);
  return y;
}
function blocks(list, x, y, w, ts, dry) {
  const pad = 7;
  for (const b of list) {
    y += b.gap || 0;
    if (!b.box) { y = paras(b.paras, x, y, w, ts, dry); continue; }
    const h = paras(b.paras, x + pad, y + pad, w - 2 * pad, ts, true) + pad - y;
    if (!dry) {
      const st = b.box === 'ok' ? { fill: '--fp-correct-bg', stroke: '--fp-correct', weight: 2 }
        : { fill: '--fp-incorrect-bg', stroke: '--fp-incorrect', weight: 2, dashed: true };
      K.panel(x - 2, y, w + 4, h, st);
      paras(b.paras, x + pad, y + pad, w - 2 * pad, ts, false);
    }
    y += h;
  }
  return y;
}

function drawCard(x, y, w, h) {
  const st = deck.state();
  const card = st.card;
  const list = [
    { paras: [{ t: 'Job card ' + (st.index + 1) + ' of 12', bold: true, muted: true }] },
    { gap: 4, paras: [{ t: card.job.text, bold: true, size: 2 }] },
    { gap: 6, paras: [{ t: QUESTION }] }
  ];
  if (feedback) {
    const ok = feedback.res.status === 'correct';
    list.push({ gap: 6, paras: [{ t: 'You chose: ' + LINE[feedback.chosenLine].name + ' · ' + FACTOR[feedback.chosenFactor].name, muted: true }] });
    list.push({ gap: 4, box: ok ? 'ok' : 'bad', paras: [{ t: feedback.res.message, color: FP.tok(ok ? 'correct' : 'incorrect') }] });
    list.push({ gap: 4, box: feedback.factorOk ? 'ok' : 'bad', paras: [{ t: factorText(feedback, card),
      color: FP.tok(feedback.factorOk ? 'correct' : 'incorrect') }] });
  } else {
    const parts = [];
    if (!lineSelect.value()) parts.push('a product line');
    if (!factor) parts.push('the deciding factor (keys 1–4)');
    list.push({ gap: 6, paras: [{ t: parts.length ? 'Choose ' + parts.join(' and ') + ', then Commit.' : 'Press Commit (or Enter). One attempt per card.', muted: true }] });
  }
  const ts = K.fitTextSize(t => blocks(list, x, y, w, t, true) - y, h, 16, 12);
  textAlign(LEFT, TOP);
  blocks(list, x, y, w, ts, false);
}

// The twelve product lines, always visible. Click to choose (the select does the same).
// After a commit: ✓ marks the correct line, ✗ the learner's wrong pick.
function drawLineList(x, y, w, h, cols) {
  const st = deck.state();
  const chosen = st.phase === 'feedback' && feedback ? feedback.chosenLine : lineSelect.value();
  const answer = st.phase === 'feedback' ? st.card.answer : null;
  noStroke();
  fill(FP.tok('text'));
  textStyle(BOLD);
  textSize(cols === 1 ? 15 : 13);
  textAlign(LEFT, TOP);
  text('Product lines', x, y);
  textStyle(NORMAL);
  const top = y + (cols === 1 ? 24 : 20);
  const rows = Math.ceil(LINES.length / cols);
  const rowH = Math.min(cols === 1 ? 30 : 22, (y + h - top) / rows);
  const colW = w / cols;
  const ts = cols === 1 ? 14 : 12;
  LINES.forEach((l, i) => {
    const c = cols === 1 ? 0 : Math.floor(i / rows), r = cols === 1 ? i : i % rows;
    const bx = x + c * colW, by = top + r * rowH;
    const isAns = answer === l.id, isPick = chosen === l.id;
    const wrong = answer && isPick && !isAns;
    let mark = '';
    if (isAns) mark = FP.msg.OK + ' ';
    else if (wrong) mark = FP.msg.BAD + ' ';
    else if (isPick) mark = '▸ ';
    push();
    if (isAns || wrong || isPick) {
      stroke(FP.tok(isAns ? 'correct' : wrong ? 'incorrect' : 'primary'));
      strokeWeight(isPick && !answer ? 2 : 1.5);
      if (wrong) drawingContext.setLineDash([5, 3]);
      fill(FP.tok(isAns ? 'correct-bg' : wrong ? 'incorrect-bg' : 'primary-bg'));
      rect(bx - 4, by + 1, colW - 6, rowH - 3, 4);
    }
    pop();
    noStroke();
    fill(FP.tok(isAns ? 'correct' : wrong ? 'incorrect' : 'text'));
    textSize(ts);
    textStyle(isAns || isPick ? BOLD : NORMAL);
    let label = mark + (cols === 1 && w >= 280 ? l.name : l.short);
    while (textWidth(label) > colW - 12 && label.length > 4) label = label.slice(0, -2) + '…';
    textAlign(LEFT, CENTER);
    text(label, bx, by + rowH / 2);
    textStyle(NORMAL);
    listHits.push({ id: l.id, x: bx - 4, y: by, w: colW - 6, h: rowH });
  });
  textAlign(LEFT, TOP);
}

function drawSummary(x, y, w, h) {
  const s = deck.summary();
  const twoCol = w >= 600;
  const groups = FACTORS.map(f => ({ f, cards: deck.order.filter(c => c.job.factor === f.id) }));
  const rowText = c => {
    const p = picks[c.id] || {};
    let t = (p.lineOk ? FP.msg.OK : FP.msg.BAD) + ' ' + c.job.short + ': ' + LINE[c.answer].short;
    if (!p.lineOk && p.line) t += ' (you: ' + LINE[p.line].short + ')';
    if (p.factor && !p.factorOk) t += '; reason ' + FP.msg.BAD + ' (you: ' + FACTOR[p.factor].name.toLowerCase() + ')';
    return { t, ok: !!p.lineOk };   // colour follows the product line; a wrong reason is written out
  };
  const layoutCol = (gs, cx, cy, cw, ts, dry) => {
    const lh = Math.round(ts * 1.3);
    for (const g of gs) {
      textStyle(BOLD); fill(FP.tok('text')); textSize(ts);
      cy = K.wrapText('Deciding factor: ' + g.f.name, cx, cy, cw, lh, { dryRun: dry });
      textStyle(NORMAL);
      for (const c of g.cards) {
        const r = rowText(c);
        fill(FP.tok(r.ok ? 'correct' : 'incorrect'));
        cy = K.wrapText(r.t, cx + 8, cy, cw - 8, lh, { dryRun: dry });
      }
      cy += 4;
    }
    return cy;
  };
  const layout = (ts, dry) => {
    let yy = y;
    noStroke();
    textSize(ts + 1); textStyle(BOLD); fill(FP.tok('text'));
    if (!dry) text('Summary: twelve jobs grouped by deciding factor', x, yy);
    yy += Math.round((ts + 1) * 1.4);
    textStyle(NORMAL);
    let below;
    if (twoCol) {
      const cw = (w - 20) / 2;
      below = Math.max(layoutCol(groups.slice(0, 2), x, yy, cw, ts, dry), layoutCol(groups.slice(2), x + cw + 20, yy, cw, ts, dry));
    } else {
      below = layoutCol(groups, x, yy, w, ts, dry);
    }
    yy = below + 4;
    const lh = Math.round(ts * 1.3);
    const lines = [s.lines[0] + ' (product lines)', reasons.label() + ' (not part of mastery); a wrong reason is marked "reason ' + FP.msg.BAD + '".', s.lines[1]];
    lines.forEach((t, i) => {
      textStyle(i === 2 ? BOLD : NORMAL);
      fill(FP.tok(i === 2 && s.mastered ? 'correct' : 'text'));
      yy = K.wrapText(t, x, yy, w, lh, { dryRun: dry });
    });
    textStyle(NORMAL);
    return yy - y;
  };
  textAlign(LEFT, TOP);
  const ts = K.fitTextSize(t => layout(t, true), h, 15, 12);
  layout(ts, false);
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  syncControls();   // relabels the factor buttons for the width, then positions the controls
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
