// Catalog Section Finder - p5.js MicroSim (FanPedia shared kit: FP.CardDeck, FP.p5)
// CANVAS_HEIGHT: 638
// Ten customer questions are sorted into the ten sections of a Twin City Fan product catalog
// (Catalog 300 order, plus the Performance Data section that Catalog 902 adds). Two attempts
// per card; only the first is scored. Pointing at or tabbing to a section shows what it holds.
// Sources: Twin City Fan Catalog 300 (April 2024) and Catalog 902 (November 2017).
// Needs ../shared-libs/fanpedia-core.js and fanpedia-p5.js (see main.html).

const K = FP.p5;
const SIM_ID = 'ch26-catalog-section-finder';
let canvasWidth = 800;
let drawHeight = 590;
const controlHeight = K.controlHeightFor(1);
const margin = 10;
const WIDE = 640;            // five bin columns from this canvas width up
const FIXED_FROM = 684;      // from this width up the drawing region keeps one height,
const WIDE_DRAW_H = 593;     // the tallest layout in 684-1000 px (chapter iframes are 684-753 px wide)

const PROMPT = 'Which catalog section answers this question?';
const MASTERY = 8;
const REVIEW = 'Review "Catalog Structure" in the chapter, then press Start over.';
const INFO_IDLE = 'Point at a section or Tab to it to read what it contains. Reading a description is not scored.';
const NOTE_FULL = ['Source: TCF Catalog 300 (Apr 2024), Catalog 902 (Nov 2017)', 'Keys: 1–9, 0 place, Enter next'];
const NOTE_SHORT = ['Source: TCF Catalogs 300, 902', 'Keys: 1–9, 0, Enter'];

// Section bins (spec Content table), in catalog order. key = keyboard shortcut.
const BINS = [
  { name: 'Overview', desc: 'Models, diameters, airflow and pressure range, arrangements, certifications' },
  { name: 'Construction Features', desc: 'How the impeller, housing, shaft and bearings are built' },
  { name: 'High Temperature Modifications', desc: 'Temperature bands, bearing and lubrication requirements, derating' },
  { name: 'Arrangements', desc: 'Picture and paragraph for each arrangement offered' },
  { name: 'Options/Accessories', desc: 'Guards, bases, dampers, inlet vanes, flanges, seals, doors, drives' },
  { name: 'Engineering Data', desc: 'Maximum RPM, impeller weight and WR² by size and class' },
  { name: 'Material Specifications', desc: 'Housing gauges, shaft diameters, bearing types, bare fan weights' },
  { name: 'Performance Data', desc: 'Printed RPM and BHP tables by model and size' },
  { name: 'Dimensions', desc: 'Drawings and dimension tables by arrangement and size' },
  { name: 'Typical Specifications', desc: 'Specification paragraphs ready to copy' }
].map((b, i) => Object.assign({ key: i === 9 ? '0' : String(i + 1) }, b));

const BIN = name => BINS.findIndex(b => b.name === name);

// Question cards (spec Content table, numbered as in the chapter); answer = bin index.
const CARDS = [
  { n: 1, tag: 'Max RPM', section: 'Engineering Data',
    text: 'What is the maximum RPM of a BC-SW size 365 Class II?',
    hint: 'A maximum speed is a mechanical limit set by size and class, not a duty point. Which section tabulates limits like that?',
    why: 'Maximum RPM by size and class is engineering data (Catalog 300, page 16: 1,283 RPM).' },
  { n: 2, tag: 'Shaft, bearing', section: 'Material Specifications',
    text: 'What shaft diameter and bearing type does a BC SWSI Class I size 365 use in Arrangement 1?',
    hint: 'This asks for the size and type of particular parts for one size and class, not how the fan is built in general.',
    why: 'Shaft and bearing sizes by size and class are in the material specifications table.' },
  { n: 3, tag: 'RPM, BHP', section: 'Performance Data',
    text: 'What RPM and BHP does an RBA 913 need for 4,092 CFM at 12 in. wg?',
    hint: 'This is a duty point, an airflow at a pressure. Which section turns a duty point into speed and power?',
    why: 'Speed and power at a duty point are read from the performance tables (Catalog 902, page 24).' },
  { n: 4, tag: '450°F bearings', section: 'High Temperature Modifications',
    text: 'What bearing and grease does a BC-SW need at 450°F?',
    hint: 'What makes this question special is the 450°F airstream. Find the section organised around that condition.',
    why: 'Table 1 lists bearing type and lubrication for each temperature band.' },
  { n: 5, tag: 'Motor on 9H', section: 'Arrangements',
    text: 'Where does the motor mount on an Arrangement 9H?',
    hint: 'Where the motor sits depends on how fan, bearings and motor are configured. Which section describes each configuration?',
    why: "Each arrangement's paragraph describes the motor location." },
  { n: 6, tag: 'Damper type', section: 'Options/Accessories',
    text: 'Is an opposed blade or parallel blade outlet damper better for modulating over the full range?',
    hint: 'A damper is something added to the fan, not part of its standard build.',
    why: 'Damper types and where to use each are described with the accessories.' },
  { n: 7, tag: 'Lifting lugs', section: 'Construction Features',
    text: 'Are lifting lugs standard on BC housings?',
    hint: 'Ask whether the lugs are an add-on or part of how the standard housing is built.',
    why: 'Housing construction, including lifting lugs, is described in construction features.' },
  { n: 8, tag: 'BC-DW airflow', section: 'Overview',
    text: 'What is the highest airflow the BC-DW line covers?',
    hint: 'This asks for the range a whole product line covers, not one size\'s data. Where does the catalog introduce each line?',
    why: 'The overview states the airflow and pressure range for each model (344,300 CFM for BC-DW).' },
  { n: 9, tag: 'Height, 300', section: 'Dimensions',
    text: 'How tall is a BC-SW size 300 in Arrangement 9?',
    hint: 'This is a physical size of the assembled fan. Which section pairs drawings with tables of sizes?',
    why: 'Overall dimensions are in the dimension tables, which are not for construction.' },
  { n: 10, tag: 'Spec text', section: 'Typical Specifications',
    text: 'What paragraph can an engineer paste into a project specification for a BC-DW?',
    hint: 'The engineer wants ready-written wording, not data. Which section holds text to copy?',
    why: 'Specification paragraphs are collected at the back of the catalog.' }
].map(c => Object.assign({ id: 'question-' + c.n, answer: BIN(c.section), answerText: c.section }, c));

// Spec wording: Correct: + Why; a first wrong placement gets the card's hint (it never names the
// section and the Why, which does, is held back); after the second attempt: Not quite. + Why +
// the correct section.
const MSG = {
  correct: res => FP.msg.OK + ' Correct: ' + res.card.why,
  retry: res => FP.msg.BAD + ' Not quite. ' + res.card.hint + ' Try again (1 attempt left, not scored).',
  missed: res => FP.msg.BAD + ' Not quite. ' + res.card.why + ' The answer is ' + res.card.section + '.'
};

const deck = new FP.CardDeck({
  cards: CARDS, shuffle: true, attempts: 2, retryMissed: false,
  noun: 'Cards', mastery: MASTERY, reviewPointer: REVIEW, id: SIM_ID, messages: MSG
});
let lastRes = null;          // latest placement result for the face-up card
let triedBin = -1;           // the wrong bin of a first attempt, marked until the card locks
let infoBin = -1;            // section whose description is shown (hover or focus)

let binButtons = [];
let nextButton, restartButton;
let lay = null;

const keyMap = { Enter: enterKey };
BINS.forEach((b, i) => { keyMap[b.key] = () => placeCard(i); });
const keys = K.keys.bind(keyMap);
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight, margin });
  const canvas = createCanvas(canvasWidth, drawHeight + controlHeight);
  canvas.parent(document.querySelector('main'));

  BINS.forEach((b, i) => {
    // A zero-width space after "/" lets "Options/Accessories" wrap inside a narrow button.
    const btn = K.button(b.key + '. ' + b.name.replace('/', '/\u200B'), () => placeCard(i));
    btn.addClass('choice');
    btn.addClass('csf-bin');
    btn.attribute('aria-keyshortcuts', b.key);
    btn.attribute('aria-label', 'Place in ' + b.name + ' (key ' + b.key + '). Contains: ' + b.desc + '.');
    for (const ev of ['mouseenter', 'focus']) btn.elt.addEventListener(ev, () => { infoBin = i; });
    for (const ev of ['mouseleave', 'blur']) btn.elt.addEventListener(ev, () => { if (infoBin === i) infoBin = -1; });
    binButtons.push(btn);
  });
  nextButton = K.button('Next card', advance);
  nextButton.attribute('aria-keyshortcuts', 'Enter');
  restartButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });
  restartButton.addClass('secondary');

  relayout();
  updateControls();
  describe('Catalog Section Finder. Ten customer questions appear one at a time in shuffled order. ' +
    'Assign each to one of ten Twin City Fan catalog sections: Overview, Construction Features, High ' +
    'Temperature Modifications, Arrangements, Options/Accessories, Engineering Data, Material ' +
    'Specifications, Performance Data, Dimensions, Typical Specifications. Use the section buttons or keys ' +
    '1 to 9 and 0. Each card has two attempts; only the first is scored. The running score reads ' +
    'First-try correct: n of 10; mastery is 8 of 10.');
  FP.announce('Card 1 of 10. ' + deck.card().text + ' ' + PROMPT);
}

// ---------- Layout ----------

function metrics() {
  const narrow = canvasWidth < 520;
  return { pad: 12, body: narrow ? 15 : 17, small: narrow ? 13 : 15, head: narrow ? 14 : 15, info: 13 };
}

function linesH(str, w, size, lh, style) {
  textSize(size);
  textStyle(style || NORMAL);
  const n = K.countLines(str, w);
  textStyle(NORMAL);
  return n * lh;
}

function summaryTexts() {
  // Worst case for the reserved height: four first-try misses listed with reasons.
  const longest = CARDS.slice().sort((a, b) => b.why.length - a.why.length).slice(0, 4);
  return longest.map(c => 'Q' + c.n + ' → ' + c.section + ': ' + c.why);
}

// Every position comes from the width only, so the canvas never jumps while the learner works.
function computeLayout() {
  const m = metrics();
  const w = canvasWidth - 2 * margin;
  const inner = w - 2 * m.pad;
  textSize(15);
  const promptH = K.countLines(PROMPT, w) * 19;
  const statusTop = 40 + promptH + 2;
  textStyle(BOLD);
  const lw = textWidth('First-try correct: 10 of 10');
  textStyle(NORMAL);
  const rw = textWidth('Card 10 of 10 · Attempt 2 of 2');
  const statusH = lw + 16 + rw <= w ? 21 : 42;
  const cardTop = statusTop + statusH + 4;

  let maxText = 0, maxFb = 0;
  for (const c of CARDS) {
    maxText = max(maxText, linesH(c.text, inner, m.body, m.body + 5, BOLD));
    for (const st of ['retry', 'missed']) {
      maxFb = max(maxFb, linesH(MSG[st]({ card: c }), inner, m.small, m.small + 5));
    }
  }
  const cardBody = m.head + 8 + maxText + 10 + 18 + 4 + maxFb + 10;
  let sumH = m.head + 10 + 2 * (m.body + 5) + 6;
  for (const s of summaryTexts()) sumH += linesH(s, inner, 13, 17) + 2;
  const cardH = m.pad + max(cardBody, sumH) + m.pad;

  const infoTop = cardTop + cardH + 8;
  let infoH = linesH(INFO_IDLE, w - 16, m.info, 17);
  for (const b of BINS) infoH = max(infoH, linesH(b.name + ': ' + b.desc + '.', w - 16, m.info, 17, BOLD));
  infoH += 10;

  const cols = canvasWidth >= WIDE ? 5 : 2;
  const gap = canvasWidth < 480 ? 6 : 8;
  const binsTop = infoTop + infoH + 8;
  const binW = (w - (cols - 1) * gap) / cols;
  let btnH = 0;
  for (const b of binButtons) {
    b.style('width', (binW - 12) + 'px');
    b.style('height', 'auto');
    btnH = max(btnH, b.elt.offsetHeight || 30);
  }
  for (const b of binButtons) b.style('height', btnH + 'px');
  const chipH = 22;
  const binH = 6 + btnH + 6 + chipH + 6;
  const rows = ceil(BINS.length / cols);
  const binsBottom = binsTop + rows * binH + (rows - 1) * gap;
  let drawH = Math.ceil(binsBottom + 26);
  let cardHx = cardH, infoTopx = infoTop, binsTopx = binsTop;
  // Chapter iframes are 680-760 px wide: from FIXED_FROM up, keep one canvas height (the tallest
  // layout in that range) and give the spare room to the card panel.
  if (canvasWidth >= FIXED_FROM && drawH < WIDE_DRAW_H) {
    const extra = WIDE_DRAW_H - drawH;
    cardHx += extra; infoTopx += extra; binsTopx += extra;
    drawH = WIDE_DRAW_H;
  }
  return { m, w, inner, statusTop, cardTop, cardH: cardHx, infoTop: infoTopx, infoH, cols, gap, binsTop: binsTopx,
    binW, binH, btnH, chipH, drawH };
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
  K.flowButtons(0, [nextButton, '|', restartButton]);
}

// ---------- Drawing ----------

function draw() {
  K.regions(drawHeight, controlHeight);
  K.title('Catalog Section Finder');
  noStroke();
  fill(FP.tok('text-muted'));
  textSize(15);
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
  K.wrapText(PROMPT, margin, 40, lay.w, 19);

  const st = deck.state();
  const right = st.phase === 'summary' ? 'All 10 placed'
    : 'Card ' + (st.index + 1) + ' of ' + st.count + ' · ' + st.attemptLabel;
  K.statusLine(scoreLabel(), right, null, { y: lay.statusTop });

  if (st.phase === 'summary') drawSummary();
  else drawCard(st);
  drawInfo();
  drawBins(st);

  textSize(13);
  const full = FP.msg.note(...NOTE_FULL);
  K.note(textWidth(full) <= lay.w ? NOTE_FULL : NOTE_SHORT);
}

function scoreLabel() {
  return 'First-try correct: ' + deck.score.firstAttempt() + ' of ' + CARDS.length;
}

function feedbackPanel(x, y, w, h, ok) {
  K.panel(x, y, w, h, {
    fill: ok ? '--fp-correct-bg' : '--fp-incorrect-bg', stroke: ok ? '--fp-correct' : '--fp-incorrect',
    dashed: !ok, weight: 2, radius: 6
  });
}

function drawCard(st) {
  const { m, inner } = lay;
  const x = margin, y = lay.cardTop, w = lay.w;
  K.panel(x, y, w, lay.cardH, { fill: '--fp-ctrl-bg', stroke: '--fp-primary', weight: 2 });
  noStroke();
  textAlign(LEFT, TOP);
  textStyle(NORMAL);
  textSize(m.head);
  fill(FP.tok('primary-dark'));
  text('Question ' + st.card.n, x + m.pad, y + m.pad);
  textStyle(BOLD);
  textSize(m.body);
  fill(FP.tok('text'));
  let yy = K.wrapText(st.card.text, x + m.pad, y + m.pad + m.head + 8, inner, m.body + 5);
  textStyle(NORMAL);
  const res = lastRes;
  if (!res) return;
  yy += 10;
  const ok = res.status === 'correct';
  feedbackPanel(x + 6, yy, w - 12, y + lay.cardH - 6 - yy, ok);
  noStroke();
  textSize(m.small);
  fill(FP.tok('text-muted'));
  text('You chose: ' + BINS[res.chosen].name + (res.attempt === 2 ? ' (second try, not scored)' : ''),
    x + m.pad, yy + 6);
  fill(FP.tok(ok ? 'correct' : 'incorrect'));
  K.wrapText(res.message, x + m.pad, yy + 28, inner, m.small + 5);
}

function firstTryMisses() {
  return deck.placements.filter(p => !(p.correct && p.attempts === 1));
}

function drawSummary() {
  const { m, inner } = lay;
  const x = margin, y = lay.cardTop, w = lay.w, h = lay.cardH;
  // Final state: indigo double border, like the kit's .fp-feedback.final
  K.panel(x, y, w, h, { fill: '--fp-ctrl-bg', stroke: '--fp-primary', weight: 1 });
  noFill();
  stroke(FP.tok('primary'));
  rect(x + 3, y + 3, w - 6, h - 6, 6);
  noStroke();
  textAlign(LEFT, TOP);
  const s = deck.summary();
  let yy = y + m.pad;
  textStyle(BOLD);
  textSize(m.head + 2);
  fill(FP.tok('text'));
  text(scoreLabel(), x + m.pad, yy);
  yy += m.head + 10;
  textSize(m.small);
  fill(FP.tok(s.mastered ? 'correct' : 'text'));
  yy = K.wrapText(s.mastered ? FP.msg.OK + ' ' + FP.msg.masteryReached(MASTERY, CARDS.length)
    : FP.msg.masteryNeeds(MASTERY, CARDS.length, REVIEW), x + m.pad, yy, inner, m.small + 5);
  textStyle(NORMAL);
  const misses = firstTryMisses();
  fill(FP.tok('text'));
  if (!misses.length) {
    K.wrapText('No missed cards: every question was placed in the right section on the first try.',
      x + m.pad, yy + 6, inner, m.small + 5);
    return;
  }
  yy = K.wrapText('Missed on the first try (' + misses.length + '):', x + m.pad, yy + 6, inner, m.small + 5);
  const lines = misses.map(p => 'Q' + p.card.n + ' → ' + p.card.section + ': ' + p.card.why);
  const room = y + h - m.pad - yy;
  const layout = ts => lines.reduce((acc, l) => K.wrapText(l, 0, acc, inner, ts * 1.3, { dryRun: true }) + 2, 0);
  const ts = K.fitTextSize(layout, room, 13, 12);
  const lh = ts * 1.3;
  const maxLines = Math.max(1, Math.floor(room / lh));
  let used = 0;
  for (const l of lines) {
    const left = maxLines - used;
    if (left <= 0) break;
    const ny = K.wrapText(l, x + m.pad, yy, inner, lh, { maxLines: left });
    used += Math.round((ny - yy) / lh);
    yy = ny + 2;
  }
}

function drawInfo() {
  const { m, w } = lay;
  const x = margin, y = lay.infoTop;
  K.panel(x, y, w, lay.infoH, { fill: '--fp-primary-bg', stroke: '--fp-border', weight: 1, radius: 6 });
  noStroke();
  textAlign(LEFT, TOP);
  textSize(m.info);
  if (infoBin < 0) {
    fill(FP.tok('text-muted'));
    K.wrapText(INFO_IDLE, x + 8, y + 5, w - 16, 17);
    return;
  }
  const b = BINS[infoBin];
  fill(FP.tok('text'));
  // Name in bold, description in regular weight, wrapped together.
  textStyle(BOLD);
  const head = b.name + ': ';
  const hw = textWidth(head);
  text(head, x + 8, y + 5);
  textStyle(NORMAL);
  const full = K.wrapLines(head + b.desc + '.', w - 16);
  // First line: draw the rest after the bold head; later lines in full.
  const first = full[0].slice(head.length - 1).trim();
  text(first, x + 8 + hw, y + 5);
  for (let i = 1; i < full.length; i++) text(full[i], x + 8, y + 5 + 17 * i);
}

function drawBins(st) {
  for (let i = 0; i < BINS.length; i++) {
    const r = binRect(i);
    stroke(FP.tok('border'));
    strokeWeight(1);
    fill(FP.tok('ctrl-bg'));
    rect(r.x, r.y, r.w, r.h, 6);
    noStroke();
    const top = r.y + 6 + lay.btnH + 6;
    // Each card has its own section, so a bin holds at most one placed card.
    const p = deck.placements.find(pp => pp.card.answer === i);
    textAlign(LEFT, CENTER);
    textSize(13);
    if (p) {
      const firstTry = p.correct && p.attempts === 1;
      K.panel(r.x + 6, top, r.w - 12, lay.chipH, {
        fill: firstTry ? '--fp-correct-bg' : '--fp-incorrect-bg',
        stroke: firstTry ? '--fp-correct' : '--fp-incorrect', dashed: !firstTry, weight: 1.5, radius: 4
      });
      noStroke();
      fill(FP.tok(firstTry ? 'correct' : 'incorrect'));
      const head = 'Q' + p.card.n + ' ' + (firstTry ? FP.msg.OK : FP.msg.BAD + ' missed');
      const label = textWidth(head + ' · ' + p.card.tag) <= r.w - 22 ? head + ' · ' + p.card.tag : head;
      text(fitLabel(label, r.w - 22), r.x + 11, top + lay.chipH / 2);
    } else if (st.phase !== 'summary' && i === triedBin) {
      K.panel(r.x + 6, top, r.w - 12, lay.chipH, { fill: '--fp-incorrect-bg', stroke: '--fp-incorrect', dashed: true, weight: 1.5, radius: 4 });
      noStroke();
      fill(FP.tok('incorrect'));
      text(fitLabel(FP.msg.BAD + ' tried, not here', r.w - 22), r.x + 11, top + lay.chipH / 2);
    } else {
      fill(FP.tok('text-muted'));
      text('—', r.x + 11, top + lay.chipH / 2);
    }
  }
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
  if (deck.state().phase !== 'choose') return;
  const res = deck.place(i);
  if (res.status === 'ignored') return;
  lastRes = res;
  triedBin = res.status === 'retry' ? i : -1;
  updateControls();
  FP.announce(res.message + ' ' + scoreLabel() + '.');
  if (res.locked) nextButton.elt.focus();
}

function advance() {
  if (!deck.next()) return;
  lastRes = null;
  triedBin = -1;
  const st = deck.state();
  updateControls();
  if (st.phase === 'summary') {
    const s = deck.summary();
    const misses = firstTryMisses();
    FP.announce('All 10 placed. ' + scoreLabel() + '. ' +
      (s.mastered ? FP.msg.masteryReached(MASTERY, CARDS.length) : FP.msg.masteryNeeds(MASTERY, CARDS.length, REVIEW)) +
      (misses.length ? ' Missed on the first try: ' + misses.map(p => 'question ' + p.card.n + ', ' + p.card.section + '. ' + p.card.why).join(' ') : ''));
    restartButton.elt.focus();
  } else {
    FP.announce('Card ' + (st.index + 1) + ' of ' + st.count + '. ' + st.card.text);
    binButtons[0].elt.focus();
  }
}

function startOver() {
  deck.newRound();
  lastRes = null;
  triedBin = -1;
  updateControls();
  FP.announce('Start over. Card 1 of 10. ' + deck.card().text + ' ' + PROMPT);
  binButtons[0].elt.focus();
}

function enterKey() {
  const st = deck.state();
  if (st.phase === 'feedback') advance();
  else if (st.phase === 'summary') startOver();
}

function updateControls() {
  if (!restartButton) return;
  const st = deck.state();
  const had = document.activeElement;
  binButtons.forEach(b => K.setEnabled(b, st.phase === 'choose'));
  nextButton.html(st.isLast ? 'Show summary' : 'Next card');
  K.setEnabled(nextButton, st.phase === 'feedback');
  if (st.phase === 'summary') nextButton.hide(); else nextButton.show();
  positionControls();
  K.keepFocus(had, [nextButton, restartButton, ...binButtons]);
}

function windowResized() {
  updateCanvasSize();
  relayout();
}

function updateCanvasSize() {
  canvasWidth = K.updateCanvasSize(320);
}
