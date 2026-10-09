// Impeller Recommender for Real Airstreams - p5.js MicroSim (Chapter 9)
// CANVAS_HEIGHT: 660
// Ten job cards, shuffled, each placed in one of seven impeller bins. Two attempts per card:
// a wrong first try gets the "what does the material do" prompt and the card comes back; a
// wrong second try shows the correct bin and its reason and counts as missed. Mastery is
// 8 of 10 correct on the first try.
// Sources: Twin City Fan current product pages (Radial Bladed Fans: RBA, RBO, RBW, RBP; Radial
// Tip & High Efficiency Fans: RTF, HAF, HIB), retrieved 2026-10-08; FanPedia pp. 31-32. Job
// settings such as "process tank" are illustrative wrappers around the catalog statements.
// Built on the FanPedia kit: FP.CardDeck (deck, two attempts, score, mastery), FP.p5 (layout,
// text, controls, keys).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js.

const K = FP.p5;
const SIM_ID = 'ch09-impeller-recommender';

let canvasWidth = 800;
const drawHeight = 510;
const controlHeight = K.controlHeightFor(4);   // bins in two rows, navigation below (two rows at 320 px)
const canvasHeight = drawHeight + controlHeight;
const MASTERY = 8;
const PROMPT = 'Which impeller would you put in this fan?';
const SOURCE = 'Source: tcf.com product pages, retrieved 2026-10-08; FanPedia pp. 31–32';
const KEYS_HINT = 'Keys: 1–7 place, Enter next, D descriptions';
const RETRY_TEXT = 'Not the best fit. Ask what the material does in this airstream: does it stick, wrap, strike, or pass through?';

const BINS = [
  { id: 'HAF', name: 'Airfoil (HAF)', short: 'Airfoil (HAF)', desc: 'Hollow airfoil blades; highest efficiency; clean air, high pressure.' },
  { id: 'HIB', name: 'Backward curved (HIB)', short: 'Backward curved (HIB)', desc: 'Single thickness curved blades; clean air or light dust loading.' },
  { id: 'RTF', name: 'Radial tip (RTF)', short: 'Radial tip (RTF)', desc: 'Curved at entry, radial at tip; large volumes of clean or dirty gas.' },
  { id: 'RBA', name: 'Air handling radial (RBA)', short: 'Air handling (RBA)', desc: 'Heavy blades welded to back plate and front plate; relatively clean air, fumes, light contaminant.' },
  { id: 'RBO', name: 'Open radial paddle (RBO)', short: 'Open paddle (RBO)', desc: 'Open paddles, no plates; coarse, sticky, heavy or abrasive material.' },
  { id: 'RBW', name: 'Back plate wool, material handling (RBW)', short: 'Back plate wool (RBW)', desc: 'Radial blades on a full back plate; long, stringy or fibrous material.' },
  { id: 'RBP', name: 'Paper handling (RBP)', short: 'Paper handling (RBP)', desc: 'Full back plate with gussets and a deflector cone; paper trim, fibrous material, metal trim, high impact.' }
];
const BIN = Object.fromEntries(BINS.map(b => [b.id, b]));

// The ten job cards (spec Content table); tag is the short name used in the summary.
const CARDS = [
  { tag: 'Boiler forced draft', answer: 'HAF',
    text: 'Forced draft fan for a fluid boiler; clean air at high pressure; the owner wants the lowest power bill.',
    why: 'Clean air and high pressure are the airfoil\'s home ground, and it has the highest efficiency.' },
  { tag: 'Moisture blow-off', answer: 'HAF',
    text: 'Moisture blow-off on a product line; clean air; high pressure.',
    why: 'The catalog lists moisture blow-off for the HAF; with clean air there is no reason to give up efficiency.' },
  { tag: 'Baghouse clean side', answer: 'HIB',
    text: 'Fan on the clean side of a baghouse; air carries light dust.',
    why: 'The catalog lists the clean side of baghouses for the HIB; solid curved blades tolerate light dust.' },
  { tag: 'Incinerator induced draft', answer: 'RTF',
    text: 'Induced draft fan on an incinerator; large volume of dirty gas; moderate to high pressure.',
    why: 'Radial tip fans handle large volumes of dirty gas and are more efficient than radial blade fans at high airflow.' },
  { tag: 'Cyclone exhaust', answer: 'RTF',
    text: 'Exhaust from a cyclone; high airflow; the gas still carries particulate.',
    why: 'The catalog lists cyclone exhaust for the RTF; the radial tip sheds particulate while keeping efficiency at high flow.' },
  { tag: 'Tank vapor exhaust', answer: 'RBA',
    text: 'Vapor exhaust from a process tank; air with a light contaminant; a rugged fan is wanted.',
    why: 'The air handling impeller is the radial family\'s choice for fumes, vapor and light contaminant.' },
  { tag: 'Sticky, abrasive conveying', answer: 'RBO',
    text: 'Pneumatic conveying of coarse, sticky and abrasive material.',
    why: 'Open paddles give sticky, abrasive material nothing to build up on or catch.' },
  { tag: 'Buffing threads', answer: 'RBW',
    text: 'Exhaust from a buffing system that throws off threads.',
    why: 'The back plate wool impeller is designed to keep threads from wrapping around the spiders and blades.' },
  { tag: 'Corrugated trim', answer: 'RBP',
    text: 'Trim removal on a corrugated box line; strips of paper trim strike the wheel.',
    why: 'Paper trim with high-impact loading calls for the paper handling impeller, whose deflector cone prevents wrapping at the hub.' },
  { tag: 'Metal trim', answer: 'RBP',
    text: 'Removal of metal trim from a stamping line.',
    why: 'The catalog lists metal trim and other high-impact loading for the paper handling impeller.' }
].map((c, i) => Object.assign(c, { id: 'card-' + (i + 1), answerText: BIN[c.answer].name }));

// Spec wording: Correct "Correct: <impeller>. <Why>."; first wrong try: the "what does the
// material do" prompt; second wrong try: the correct bin and its Why, counted as missed.
const deck = new FP.CardDeck({
  cards: CARDS, shuffle: true, attempts: 2, retryMissed: false,
  noun: 'Recommendations', mastery: MASTERY,
  reviewPointer: 'Reread "Impellers for Dirty Airstreams" and ask what the material does',
  messages: {
    correct: res => FP.msg.correct(res.card.answerText, res.card.why),
    retry: () => FP.msg.BAD + ' ' + RETRY_TEXT,
    missed: res => FP.msg.BAD + ' Not the best fit. The best fit is ' + res.card.answerText + '. ' + res.card.why + ' This one counts as missed.'
  },
  id: SIM_ID
});

let firstChoice = {};        // card id -> bin chosen on the first try
let showDescriptions = false;
let binButtons = [];
let nextButton, descButton, startOverButton;

const keys = K.keys.bind({
  '1': () => place(0), '2': () => place(1), '3': () => place(2), '4': () => place(3),
  '5': () => place(4), '6': () => place(5), '7': () => place(6),
  Enter: advance, d: toggleDescriptions
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
    btn.attribute('aria-label', (i + 1) + ': ' + b.name + '. ' + b.desc);
    btn.attribute('aria-keyshortcuts', String(i + 1));
    binButtons.push(btn);
  });
  nextButton = K.button('Next card', advance);
  nextButton.attribute('aria-keyshortcuts', 'Enter');
  descButton = K.button('Bin descriptions', toggleDescriptions, { variant: 'secondary' });
  descButton.attribute('aria-keyshortcuts', 'D');
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  updateControls();
  describe('Impeller recommender. Ten job cards describing real airstreams appear one at a time in ' +
    'shuffled order. Recommend one of seven impellers for each with the buttons below the canvas or ' +
    'keys 1 to 7: airfoil, backward curved, radial tip, air handling radial, open radial paddle, back ' +
    'plate wool, or paper handling. A wrong first try asks what the material does; a wrong second try ' +
    'shows the best fit and why. After card 10 a summary lists each card, your first choice and the best fit.');
}

// ---------- Scoring line (spec wording) ----------
function firstTry() { return deck.score.firstAttempt(); }
function scoreText() {
  return 'Recommendations correct on first try: ' + firstTry() + ' of ' + CARDS.length +
    (firstTry() >= MASTERY ? ' · ' + FP.msg.OK + ' Mastered' : '');
}

// ---------- Controls ----------
function narrow() { return canvasWidth < 560; }

function updateControls() {
  const had = document.activeElement;
  const st = deck.state();
  const summary = st.phase === 'summary';
  binButtons.forEach((b, i) => {
    if (summary) b.hide(); else b.show();
    b.html(narrow() ? (i + 1) + ' ' + BINS[i].id : BINS[i].short);
    K.setEnabled(b, st.phase === 'choose');
  });
  [nextButton, descButton].forEach(b => { if (summary) b.hide(); else b.show(); });
  nextButton.html(st.isLast ? 'Show summary' : 'Next card');
  K.setEnabled(nextButton, st.phase === 'feedback');
  descButton.html(showDescriptions ? 'Hide descriptions' : 'Bin descriptions');
  descButton.attribute('aria-pressed', showDescriptions ? 'true' : 'false');
  positionControls();
  K.keepFocus(had, binButtons.concat([nextButton, descButton, startOverButton]));
}

function positionControls() {
  if (deck.state().phase === 'summary') { K.flowButtons(0, [startOverButton]); return; }
  const row = K.flowButtons(0, binButtons);
  K.flowButtons(Math.max(row, 2), [nextButton, '|', descButton, startOverButton]);
}

// ---------- Actions ----------
function place(i) {
  const st = deck.state();
  if (st.phase !== 'choose') return;
  const card = st.card;
  const first = st.attempt === 1;
  const res = deck.place(BINS[i].id);
  if (res.status === 'ignored') return;
  if (first) firstChoice[card.id] = BINS[i].id;
  updateControls();
  FP.announce('You chose ' + BINS[i].name + '. ' + res.message + ' ' + scoreText() + '.');
  if (res.status === 'retry') binButtons[i === 0 ? 1 : 0].elt.focus();
  else nextButton.elt.focus();
}

function advance() {
  if (!deck.next()) return;
  updateControls();
  const st = deck.state();
  if (st.phase === 'summary') {
    const lines = summaryLines();
    FP.announce('Summary. ' + lines.join(' '));
    startOverButton.elt.focus();
  } else {
    FP.announce('Card ' + (st.index + 1) + ' of ' + st.count + ': ' + st.card.text);
    binButtons[0].elt.focus();
  }
}

function startOver() {
  deck.newRound();
  firstChoice = {};
  updateControls();
  const st = deck.state();
  FP.announce('Started over. Card 1 of ' + st.count + ': ' + st.card.text);
  binButtons[0].elt.focus();
}

function toggleDescriptions() {
  if (deck.state().phase === 'summary') return;
  showDescriptions = !showDescriptions;
  updateControls();
  FP.announce(showDescriptions ? 'Bin descriptions: ' + BINS.map((b, i) => (i + 1) + ', ' + b.name + ': ' + b.desc).join(' ')
    : 'Bin descriptions hidden.');
}

function summaryLines() {
  const n = firstTry(), N = CARDS.length;
  return [
    FP.msg.firstAttempt(n, N),
    n >= MASTERY ? FP.msg.OK + ' Mastered (' + MASTERY + ' of ' + N + ' needed).'
      : FP.msg.masteryNeeds(MASTERY, N, deck.opts.reviewPointer)
  ];
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  let y = K.title('Impeller Recommender for Real Airstreams');
  const st = deck.state();

  noStroke(); textSize(narrow() ? 14 : 15); textStyle(NORMAL); fill(FP.tok('text-muted'));
  y = K.wrapText(PROMPT, canvasWidth / 2, y - 4, canvasWidth - 20, 19, { align: CENTER }) + 2;

  const progress = st.phase === 'summary' ? 'All ' + st.count + ' cards done' : 'Card ' + (st.index + 1) + ' of ' + st.count;
  y = K.statusLine(scoreText(), progress, null, { y }) + 4;

  textSize(13);
  const both = FP.msg.note(SOURCE, KEYS_HINT);
  K.note(textWidth(both) <= canvasWidth - 20 ? both : (textWidth(SOURCE) <= canvasWidth - 20 ? SOURCE : 'Source: tcf.com, FanPedia pp. 31–32'));

  if (st.phase === 'summary') { drawSummary(y, drawHeight - 24); return; }
  const cardBottom = drawCard(y, st);
  if (showDescriptions) drawDescriptions(cardBottom + 8, drawHeight - 24);
  else drawBins(cardBottom + 8, drawHeight - 24);
}

// [{t, bold, color, gap, small, big}] paragraphs; returns the y below.
function paras(list, x, y, w, ts, dry) {
  textAlign(LEFT, TOP); noStroke();
  for (const p of list) {
    const s = p.small ? Math.max(12, ts - 2) : p.big ? ts + 1 : ts;
    textSize(s); textStyle(p.bold ? BOLD : NORMAL);
    y += p.gap || 0;
    if (!dry) fill(p.color || FP.tok('text'));
    y = K.wrapText(p.t, x, y, w, Math.round(s * 1.3), { dryRun: dry });
  }
  textStyle(NORMAL);
  return y;
}

function drawCard(top, st) {
  const card = st.card, last = st.last;
  const w = Math.min(canvasWidth - 20, 760), x = (canvasWidth - w) / 2, pad = 12;
  const maxH = narrow() ? 230 : 170;
  const head = [{ t: 'Card ' + (st.index + 1) + ' of ' + st.count + (st.attempt === 2 && st.phase === 'choose' ? ' · second try' : ''), bold: true, small: true, color: FP.tok('text-muted') },
    { t: card.text, big: true, color: FP.tok('primary-dark'), bold: true, gap: 2 }];
  const fb = last ? [
    { t: 'You chose ' + BIN[last.chosen].name + '.', small: true, color: FP.tok('text-muted'), gap: 6 },
    { t: last.message, color: FP.tok(last.status === 'correct' ? 'correct' : 'incorrect'), gap: 2 }
  ] : [];
  const layout = (ts, dry) => paras(head.concat(fb), x + pad, top + pad, w - 2 * pad, ts, dry) - top + pad - 2;
  const ts = K.fitTextSize(t => layout(t, true), maxH, 16, 12);
  const h = layout(ts, true);
  if (last) {
    const ok = last.status === 'correct';
    K.panel(x, top, w, h, { fill: ok ? '--fp-correct-bg' : '--fp-incorrect-bg', stroke: ok ? '--fp-correct' : '--fp-incorrect', dashed: !ok, weight: 2.5 });
  } else {
    K.panel(x, top, w, h, { fill: '--fp-ctrl-bg', stroke: '--fp-primary', weight: 2 });
  }
  layout(ts, false);
  return top + h;
}

// Seven bin tiles: number, name, description (when it fits) and the cards placed so far.
function drawBins(top, bottom) {
  const cols = narrow() ? 2 : 4, rows = Math.ceil(BINS.length / cols), gap = narrow() ? 6 : 8;
  const bw = (canvasWidth - 20 - (cols - 1) * gap) / cols;
  const bh = (bottom - top - (rows - 1) * gap) / rows;
  const placed = deck.placements;
  BINS.forEach((b, i) => {
    const bx = 10 + (i % cols) * (bw + gap), by = top + Math.floor(i / cols) * (bh + gap);
    stroke(FP.tok('border')); strokeWeight(1); fill(FP.tok('ctrl-bg'));
    rect(bx, by, bw, bh, 6);
    const inBin = placed.filter(p => p.chosen === b.id);
    noStroke(); fill(FP.tok('text')); textAlign(LEFT, TOP); textStyle(BOLD); textSize(13);
    const lines = K.wrapLines((i + 1) + ' · ' + b.name, bw - 12);
    let ty = by + 5;
    lines.slice(0, 2).forEach(l => { text(l, bx + 6, ty); ty += 16; });
    textStyle(NORMAL);
    const chipsH = inBin.length ? 18 : 0;
    const room = by + bh - 4 - chipsH - ty;
    textSize(12); fill(FP.tok('text-muted'));
    const fit = Math.floor(room / 15);
    if (fit >= 1) K.wrapText(b.desc, bx + 6, ty, bw - 12, 15, { maxLines: fit });
    if (inBin.length) {
      const ok = inBin.filter(p => p.correct).length, bad = inBin.length - ok;
      textAlign(LEFT, BOTTOM); textSize(12);
      let cx = bx + 6;
      if (ok) { fill(FP.tok('correct')); const s = FP.msg.OK + ' ' + ok; text(s, cx, by + bh - 4); cx += textWidth(s) + 10; }
      if (bad) { fill(FP.tok('incorrect')); text(FP.msg.BAD + ' ' + bad, cx, by + bh - 4); }
    }
  });
}

function drawDescriptions(top, bottom) {
  const x = 10, w = canvasWidth - 20;
  K.panel(x, top, w, bottom - top, { stroke: '--fp-primary' });
  const list = [{ t: 'Bin descriptions', bold: true }];
  BINS.forEach((b, i) => list.push({ t: (i + 1) + ' · ' + b.name + ': ' + b.desc, gap: 3 }));
  const ts = K.fitTextSize(t => paras(list, x + 10, top + 8, w - 20, t, true) - top, bottom - top - 12, 15, 12);
  paras(list, x + 10, top + 8, w - 20, ts, false);
}

function drawSummary(top, bottom) {
  const x = 10, w = canvasWidth - 20;
  K.panel(x, top, w, bottom - top);
  const lines = summaryLines();
  const mastered = firstTry() >= MASTERY;
  const list = [
    { t: lines[0], bold: true, big: true },
    { t: lines[1], color: FP.tok(mastered ? 'primary-dark' : 'text'), bold: mastered },
    { t: 'Each card, your first choice and the best fit:', bold: true, gap: 8 }
  ];
  deck.order.forEach(card => {
    const fc = firstChoice[card.id];
    const ok = fc === card.answer;
    list.push({ t: (ok ? FP.msg.OK : FP.msg.BAD) + ' ' + card.tag + ': first choice ' + (fc ? BIN[fc].short : '—') +
      (ok ? '' : '; best fit ' + BIN[card.answer].short), small: true, gap: 2,
      color: FP.tok(ok ? 'text' : 'incorrect') });
  });
  list.push({ t: 'Start over reshuffles the ten cards and resets the score.', small: true, gap: 8, color: FP.tok('text-muted') });
  const ts = K.fitTextSize(t => paras(list, x + 12, top + 10, w - 24, t, true) - top, bottom - top - 16, 16, 12);
  paras(list, x + 12, top + 10, w - 24, ts, false);
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  updateControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
