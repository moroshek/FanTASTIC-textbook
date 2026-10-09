// Model Code Decoder - p5.js MicroSim (FanPedia shared kit: FP.CardDeck, FP.p5)
// CANVAS_HEIGHT: 670
// Eight Twin City Fan designations (model, size, class, arrangement) are judged against two
// catalog extracts: Offered or Not offered, and the class maximum RPM. Both answers must match.
// One scored attempt per designation, then one unscored practice try. Fixed order.
// Sources: Catalog 902 (November 2017) pp. 13, 20, 24; Catalog 300 (April 2024) pp. 2-3, 9, 16.
// Needs ../shared-libs/fanpedia-core.js and fanpedia-p5.js (see main.html).

const K = FP.p5;
const SIM_ID = 'ch26-model-code-decoder';
let canvasWidth = 800;
let drawHeight = 640;
const controlHeight = K.controlHeightFor(1);
const margin = 10;
const WIDE = 640;            // extracts side by side from this canvas width up
const FIXED_FROM = 684;      // from this width up the drawing region keeps one height,
const WIDE_DRAW_H = 625;     // the tallest layout in 684-1000 px (chapter iframes are 684-753 px wide)

const PROMPT = 'Can the factory build this fan, and how fast can it run?';
const MASTERY = 7;
const REVIEW = 'Review "Model Code" and its worked example in the chapter, then press Start over.';
const NOTE_FULL = ['Source: TCF Catalog 902 (Nov 2017) pp. 13, 20, 24; Catalog 300 (Apr 2024) pp. 2-3, 9, 16',
  'Keys: O, N, 1–5, Enter, A, B'];
const NOTE_SHORT = ['Source: TCF Catalogs 902, 300', 'Keys: O, N, 1–5, Enter, A, B'];
const NONE = 'none';

// Maximum RPM choices per model row: the values in that row plus "none".
const RPM_OPTIONS = {
  'RBO 905': ['5,296'],
  'RBA 913': ['2,812', '3,337', '4,000'],
  'BC-SW 365': ['995', '1,283', '1,727', '1,883'],
  'BC-DW 365': ['1,015', '1,302', '1,651', '1,883']
};

// Extract A (Catalog 902) and Extract B (Catalog 300), as lines: [indent level, text, style].
const EXTRACTS = [
  { key: 'A', title: 'Extract A: Catalog 902', sub: 'RB Series availability (p. 13), maximum RPM (pp. 20, 24)', lines: [
    [0, 'RBO 905 · impeller diameter 8.75 in.', 'bold'],
    [1, 'Class 22: Arr. 1, 8, 10, 9A, 9B · max 5,296 RPM'],
    [1, 'Class 32: not offered'],
    [1, 'Class 45: not offered'],
    [1, 'Selections above 4,000 RPM not recommended; consult factory.', 'muted'],
    [0, 'RBA 913 · impeller diameter 22.625 in.', 'bold'],
    [1, 'Class 22: Arr. 1, 4, 8, 10, 4VI, 9A, 9B, 9F · max 2,812 RPM'],
    [1, 'Class 32: Arr. 1, 4, 8, 9, 4VI, 9F · max 3,337 RPM'],
    [1, 'Class 45: Arr. 1, 8, 9, 9F · max 4,000 RPM']
  ] },
  { key: 'B', title: 'Extract B: Catalog 300', sub: 'Arrangements by model (pp. 2-3, 9), maximum RPM (p. 16)', lines: [
    [0, 'BC-SW 365', 'bold'],
    [1, 'Arrangements (all classes): 1, 3, 3F, 3SI, 4, 7SI, 8, 9, 9F, 9H, 9ST, 9SS, 10'],
    [1, 'Max RPM: Class I = 995; Class II = 1,283; Class III = 1,727; Class IV = 1,883'],
    [0, 'BC-DW 365', 'bold'],
    [1, 'Arrangements (all classes): 3, 3F, 3DI, 7, 7DI'],
    [1, 'Max RPM: Class I = 1,015; Class II = 1,302; Class III = 1,651; Class IV = 1,883']
  ] }
];

// Designations (spec Content table, fixed order).
const CARDS = [
  { n: 1, model: 'RBA 913', cls: 'Class 22', arr: '10', offered: true, rpm: '2,812',
    why: 'Arrangement 10 is in the Class 22 list for RBA 913.' },
  { n: 2, model: 'RBA 913', cls: 'Class 32', arr: '10', offered: false, rpm: '3,337',
    why: 'Arrangement 10 is offered only in Class 22 for this size; Class 32 lists 1, 4, 8, 9, 4VI, 9F.' },
  { n: 3, model: 'RBA 913', cls: 'Class 45', arr: '4', offered: false, rpm: '4,000',
    why: 'Class 45 lists only 1, 8, 9 and 9F; the direct-drive Arrangement 4 is not offered at Class 45.' },
  { n: 4, model: 'RBA 913', cls: 'Class 45', arr: '9', offered: true, rpm: '4,000',
    why: 'Arrangement 9 is in the Class 45 list.' },
  { n: 5, model: 'RBO 905', cls: 'Class 22', arr: '9A', offered: true, rpm: '5,296',
    why: 'Size 905 offers 9A in Class 22; selections above 4,000 RPM are not recommended without consulting the factory.' },
  { n: 6, model: 'RBO 905', cls: 'Class 32', arr: '1', offered: false, rpm: NONE,
    why: 'Size 905 is built only in Class 22.' },
  { n: 7, model: 'BC-SW 365', cls: 'Class II', arr: '9', offered: true, rpm: '1,283',
    why: 'Arrangement 9 is offered for BC-SW, and Class II size 365 runs to 1,283 RPM.' },
  { n: 8, model: 'BC-DW 365', cls: 'Class I', arr: '9', offered: false, rpm: '1,015',
    why: 'Arrangement 9 is a single width arrangement; BC-DW is offered in 3, 3F, 3DI, 7 and 7DI.' }
].map(c => Object.assign({
  id: 'designation-' + c.n,
  label: c.model + ', ' + c.cls + ', Arrangement ' + c.arr,
  options: RPM_OPTIONS[c.model].concat([NONE]),
  answerText: (c.offered ? 'Offered' : 'Not offered') + ', ' + rpmText(c.rpm)
}, c));

function rpmText(v) { return v === NONE ? 'none (class not built)' : v + ' RPM'; }

// Which of the two answers was wrong, for the spec's "names which answer was wrong".
function wrongParts(card, choice) {
  const o = choice.offered === card.offered, r = choice.rpm === card.rpm;
  if (!o && !r) return 'both answers are wrong';
  if (!o) return 'Offered/Not offered is wrong; the maximum RPM is right';
  return 'the class maximum RPM is wrong; Offered/Not offered is right';
}

const MSG = {
  correct: res => FP.msg.OK + ' Correct: ' + res.card.why,
  missed: res => FP.msg.BAD + ' Not quite: ' + wrongParts(res.card, res.chosen) + '. ' +
    (res.practiceTry ? 'The answer is ' + res.card.answerText + '. ' + res.card.why
      : res.card.why + ' This one counts as missed; you may try once more for practice.')
};

const deck = new FP.CardDeck({
  cards: CARDS, shuffle: false, attempts: 1, practiceTry: true, retryMissed: false,
  noun: 'Designations', mastery: MASTERY, reviewPointer: REVIEW, id: SIM_ID, messages: MSG,
  check: (card, choice) => choice.offered === card.offered && choice.rpm === card.rpm
});

let selOffered = null;       // true | false | null
let selRpm = null;           // one of card.options | null
let lastRes = null;          // latest result (scored or practice) for this card
let scoredRes = null;        // the scored result for this card
const open = { A: false, B: false };

let offeredBtn, notOfferedBtn, rpmBtns = [], extractBtns = {};
let checkButton, nextButton, restartButton;
let lay = null;

const keys = K.keys.bind({
  o: () => pickOffered(true, true), n: () => pickOffered(false, true),
  '1': () => pickRpm(0, true), '2': () => pickRpm(1, true), '3': () => pickRpm(2, true),
  '4': () => pickRpm(3, true), '5': () => pickRpm(4, true),
  a: () => toggleExtract('A'), b: () => toggleExtract('B'),
  Enter: enterKey
});
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight, margin });
  const canvas = createCanvas(canvasWidth, drawHeight + controlHeight);
  canvas.parent(document.querySelector('main'));

  offeredBtn = K.button('Offered', () => pickOffered(true));
  notOfferedBtn = K.button('Not offered', () => pickOffered(false));
  offeredBtn.attribute('aria-keyshortcuts', 'O');
  notOfferedBtn.attribute('aria-keyshortcuts', 'N');
  for (let i = 0; i < 5; i++) {
    const b = K.button('—', () => pickRpm(i));
    b.attribute('aria-keyshortcuts', String(i + 1));
    rpmBtns.push(b);
  }
  for (const ex of EXTRACTS) {
    const b = K.button('', () => toggleExtract(ex.key), { variant: 'secondary' });
    b.addClass('secondary');
    b.addClass('mcd-extract');
    b.attribute('aria-keyshortcuts', ex.key);
    extractBtns[ex.key] = b;
  }
  checkButton = K.button(FP.msg.CHECK || 'Check', checkAnswer);
  checkButton.attribute('aria-keyshortcuts', 'Enter');
  nextButton = K.button('Next designation', advance);
  restartButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });
  restartButton.addClass('secondary');

  loadCard();
  relayout();
  updateControls();
  describe('Model Code Decoder. Eight Twin City Fan designations appear one at a time, for example RBA 913, ' +
    'Class 22, Arrangement 10. For each, choose Offered or Not offered and the class maximum RPM from the ' +
    'values in that model\'s catalog row, or none, then press Check. Two catalog extracts can be opened at ' +
    'any time: Extract A from Catalog 902 and Extract B from Catalog 300. One scored attempt per ' +
    'designation, then one practice try. The score reads Designations correct: n of 8; mastery is 7 of 8.');
  FP.announce('Designation 1 of 8: ' + deck.card().label + '. ' + PROMPT);
}

// ---------- Layout ----------

function metrics() {
  const narrow = canvasWidth < 520;
  return { pad: 12, big: narrow ? 17 : 20, small: narrow ? 13 : 15, ex: 13, exLh: 17 };
}

function wrapH(str, w, size, lh, style) {
  textSize(size);
  textStyle(style || NORMAL);
  const n = K.countLines(str, w);
  textStyle(NORMAL);
  return n * lh;
}

// Height of one extract's body at width w (title row excluded).
function extractBodyH(ex, w) {
  const m = metrics();
  let h = wrapH(ex.sub, w, m.ex, m.exLh) + 4;
  for (const [ind, t, st] of ex.lines) h += wrapH(t, w - 14 * ind, m.ex, m.exLh, st === 'bold' ? BOLD : NORMAL);
  return h;
}

// Widest RPM button row of any designation, estimated from the labels (a selected button
// gains a "✓ " prefix), so the layout does not change from one designation to the next.
function widestRpmRow(gap) {
  textSize(14);
  textStyle(NORMAL);
  const padX = canvasWidth <= 480 ? 20 : 26;
  let best = 0;
  for (const opts of Object.values(RPM_OPTIONS)) {
    const labels = opts.concat([NONE]);
    const wsum = labels.reduce((s, l) => s + textWidth(l) + padX + gap, -gap) + textWidth('✓ ');
    best = max(best, wsum);
  }
  return best;
}

function computeLayout() {
  const m = metrics();
  const w = canvasWidth - 2 * margin;
  const inner = w - 2 * m.pad;
  textSize(15);
  const promptH = K.countLines(PROMPT, w) * 19;
  const statusTop = 40 + promptH + 2;
  textStyle(BOLD);
  const lw = textWidth('Designations correct: 8 of 8');
  textStyle(NORMAL);
  const rw = textWidth('Designation 8 of 8');
  const statusH = lw + 16 + rw <= w ? 21 : 42;
  const cardTop = statusTop + statusH + 4;

  // Designation panel: heading, designation, two answer rows, feedback.
  let desH = 0;
  for (const c of CARDS) desH = max(desH, wrapH(c.label, inner, m.big, m.big + 6, BOLD));
  textSize(m.small);
  const labelW = max(textWidth('Offered?'), textWidth('Class max RPM:')) + 10;
  const rowGap = 8;
  // Answer rows wrap below their label when the buttons do not fit beside it.
  const rpmW = widestRpmRow(rowGap);
  const besideRpm = labelW + rpmW <= inner;
  const rowH = 36;
  const answersH = rowH + (besideRpm ? rowH : 22 + rowH);
  let fbH = 0;
  for (const c of CARDS) {
    const worstChoice = { offered: !c.offered, rpm: c.rpm === NONE ? c.options[0] : NONE };
    for (const pt of [false, true]) {
      let msg = MSG.missed({ card: c, chosen: worstChoice, practiceTry: pt });
      if (pt) msg = FP.msg.practice(msg);
      fbH = max(fbH, wrapH(msg, inner, m.small, m.small + 5));
    }
  }
  fbH += 12;
  const cardBody = 18 + 6 + desH + 8 + answersH + 8 + fbH;
  // Summary: score, mastery, and up to eight missed designations with answers.
  let sumH = 22 + wrapH(FP.msg.masteryNeeds(MASTERY, 8, REVIEW), inner, m.small, m.small + 5, BOLD) + 24;
  for (const c of CARDS.slice(0, 4)) sumH += wrapH('#' + c.n + ' ' + c.label + ' → ' + c.answerText, inner, 13, 17) + 2;
  const cardH = m.pad + max(cardBody, sumH) + m.pad;

  // Extracts: side by side when wide, stacked when narrow.
  let exTop = cardTop + cardH + 10;
  const side = canvasWidth >= WIDE;
  const exW = side ? (w - 10) / 2 : w;
  const tbtnH = 34;
  const bodyH = EXTRACTS.map(ex => extractBodyH(ex, exW - 16) + 12);
  let exH;
  if (side) exH = tbtnH + max(bodyH[0], bodyH[1]);
  else exH = 2 * tbtnH + bodyH[0] + bodyH[1] + 10;
  let drawH = Math.ceil(exTop + exH + 24);
  let cardHx = cardH;
  // Chapter iframes are 680-760 px wide: from FIXED_FROM up, keep one canvas height (the tallest
  // layout in that range) and give the spare room to the designation panel.
  if (canvasWidth >= FIXED_FROM && drawH < WIDE_DRAW_H) {
    const extra = WIDE_DRAW_H - drawH;
    cardHx += extra; exTop += extra;
    drawH = WIDE_DRAW_H;
  }
  return { m, w, inner, statusTop, cardTop, cardH: cardHx, labelW, rowGap, rowH, besideRpm, desH, fbH,
    exTop, side, exW, tbtnH, bodyH, exH, drawH };
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

function answerRowsTop() {
  return lay.cardTop + lay.m.pad + 18 + 6 + lay.desH + 8;
}

// Extract boxes: {x, y, w, h} for the title row plus body.
function extractBox(i) {
  if (lay.side) {
    return { x: margin + i * (lay.exW + 10), y: lay.exTop, w: lay.exW, h: lay.exH };
  }
  const y = i === 0 ? lay.exTop : lay.exTop + lay.tbtnH + lay.bodyH[0] + 10;
  return { x: margin, y, w: lay.w, h: lay.tbtnH + lay.bodyH[i] };
}

function positionControls() {
  const x0 = margin + lay.m.pad;
  const y0 = answerRowsTop();
  let x = x0 + lay.labelW;
  for (const b of [offeredBtn, notOfferedBtn]) { b.position(x, y0 + 3); x += b.elt.offsetWidth + lay.rowGap; }
  let ry = y0 + lay.rowH, rx = x0 + lay.labelW;
  if (!lay.besideRpm) { ry += 22; rx = x0; }
  for (const b of rpmBtns) {
    if (b.elt.hidden) continue;
    b.position(rx, ry + 3);
    rx += b.elt.offsetWidth + lay.rowGap;
  }
  EXTRACTS.forEach((ex, i) => { const r = extractBox(i); extractBtns[ex.key].position(r.x, r.y); });
  K.flowButtons(0, [checkButton, nextButton, '|', restartButton]);
}

// ---------- Drawing ----------

function draw() {
  K.regions(drawHeight, controlHeight);
  K.title('Model Code Decoder');
  noStroke();
  fill(FP.tok('text-muted'));
  textSize(15);
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
  K.wrapText(PROMPT, margin, 40, lay.w, 19);

  const st = deck.state();
  const right = st.phase === 'summary' ? 'All 8 judged' : 'Designation ' + (st.index + 1) + ' of ' + st.count;
  K.statusLine(scoreLabel(), right, null, { y: lay.statusTop });

  if (st.phase === 'summary') drawSummary();
  else drawCard(st);
  EXTRACTS.forEach((ex, i) => drawExtract(ex, i));

  textSize(13);
  const full = FP.msg.note(...NOTE_FULL);
  K.note(textWidth(full) <= lay.w ? NOTE_FULL : NOTE_SHORT);
}

function scoreLabel() {
  return FP.msg.score('Designations', deck.score.firstAttempt(), CARDS.length);
}

function drawCard(st) {
  const { m, inner } = lay;
  const x = margin, y = lay.cardTop, w = lay.w;
  K.panel(x, y, w, lay.cardH, { fill: '--fp-ctrl-bg', stroke: '--fp-primary', weight: 2 });
  noStroke();
  textAlign(LEFT, TOP);
  textSize(14);
  fill(FP.tok('primary-dark'));
  text('Designation ' + st.card.n, x + m.pad, y + m.pad);
  textStyle(BOLD);
  textSize(m.big);
  fill(FP.tok('text'));
  K.wrapText(st.card.label, x + m.pad, y + m.pad + 24, inner, m.big + 6);
  textStyle(NORMAL);

  // Answer row labels, with a ✓/✗ mark per answer once the scored attempt is in.
  const y0 = answerRowsTop();
  const res = lastRes;
  const marks = res ? { o: res.chosen.offered === st.card.offered, r: res.chosen.rpm === st.card.rpm } : null;
  textSize(m.small);
  textAlign(LEFT, CENTER);
  fill(FP.tok('text'));
  text('Offered?', x + m.pad, y0 + 18);
  const ry = lay.besideRpm ? y0 + lay.rowH + 18 : y0 + lay.rowH + 11;
  text('Class max RPM:', x + m.pad, ry);
  if (marks) {
    drawMark(marks.o, offeredBtn, notOfferedBtn, y0 + 18);
    const visible = rpmBtns.filter(b => !b.elt.hidden);
    const rowY = lay.besideRpm ? ry : y0 + lay.rowH + 22 + 18;
    drawMark(marks.r, visible[visible.length - 1], null, rowY);
  }

  if (!res) return;
  const ok = res.status === 'correct';
  const fy = y + lay.cardH - 6 - lay.fbH;
  K.panel(x + 6, fy, w - 12, lay.fbH, {
    fill: ok ? '--fp-correct-bg' : '--fp-incorrect-bg', stroke: ok ? '--fp-correct' : '--fp-incorrect',
    dashed: !ok, weight: 2, radius: 6
  });
  noStroke();
  textAlign(LEFT, TOP);
  textSize(m.small);
  fill(FP.tok(ok ? 'correct' : 'incorrect'));
  K.wrapText(res.message, x + m.pad, fy + 6, inner, m.small + 5);
}

// ✓ or ✗ with a word after the last button of an answer row (text, not colour alone).
function drawMark(ok, lastBtn, alt, cy) {
  const b = alt && alt.elt.offsetLeft > lastBtn.elt.offsetLeft ? alt : lastBtn;
  const mx = b.elt.offsetLeft + b.elt.offsetWidth + 10;
  textSize(lay.m.small);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  fill(FP.tok(ok ? 'correct' : 'incorrect'));
  const word = (ok ? FP.msg.OK + ' right' : FP.msg.BAD + ' wrong');
  if (mx + textWidth(word) <= margin + lay.w - 4) text(word, mx, cy);
  else text(ok ? FP.msg.OK : FP.msg.BAD, min(mx, margin + lay.w - 16), cy);
  textStyle(NORMAL);
}

function drawSummary() {
  const { m, inner } = lay;
  const x = margin, y = lay.cardTop, w = lay.w, h = lay.cardH;
  K.panel(x, y, w, h, { fill: '--fp-ctrl-bg', stroke: '--fp-primary', weight: 1 });
  noFill();
  stroke(FP.tok('primary'));
  rect(x + 3, y + 3, w - 6, h - 6, 6);
  noStroke();
  textAlign(LEFT, TOP);
  const s = deck.summary();
  let yy = y + m.pad;
  textStyle(BOLD);
  textSize(17);
  fill(FP.tok('text'));
  text(scoreLabel(), x + m.pad, yy);
  yy += 26;
  textSize(m.small);
  fill(FP.tok(s.mastered ? 'correct' : 'text'));
  yy = K.wrapText(s.mastered ? FP.msg.OK + ' ' + FP.msg.masteryReached(MASTERY, CARDS.length)
    : FP.msg.masteryNeeds(MASTERY, CARDS.length, REVIEW), x + m.pad, yy, inner, m.small + 5);
  textStyle(NORMAL);
  fill(FP.tok('text'));
  const misses = s.misses;
  if (!misses.length) {
    K.wrapText('No missed designations.', x + m.pad, yy + 6, inner, m.small + 5);
    return;
  }
  yy = K.wrapText('Missed designations and their answers:', x + m.pad, yy + 6, inner, m.small + 5);
  const lines = misses.map(mm => '#' + mm.card.n + ' ' + mm.card.label + ' → ' + mm.card.answerText + '. ' + mm.card.why);
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

function drawExtract(ex, i) {
  const { m } = lay;
  const r = extractBox(i);
  const bodyY = r.y + lay.tbtnH;
  const bodyH = r.h - lay.tbtnH;
  if (!open[ex.key]) {
    // Collapsed: a dashed placeholder that says what opening it shows.
    K.panel(r.x, bodyY, r.w, bodyH, { fill: '--fp-draw-bg', stroke: '--fp-border', dashed: true, weight: 1, radius: 6 });
    noStroke();
    fill(FP.tok('text-muted'));
    textSize(13);
    textAlign(LEFT, TOP);
    K.wrapText('Collapsed. Press the button above or key ' + ex.key + ' to open: ' + ex.sub + '.',
      r.x + 8, bodyY + 8, r.w - 16, 17);
    return;
  }
  K.panel(r.x, bodyY, r.w, bodyH, { fill: '--fp-ctrl-bg', stroke: '--fp-primary', weight: 1, radius: 6 });
  noStroke();
  textAlign(LEFT, TOP);
  textSize(m.ex);
  fill(FP.tok('text-muted'));
  let yy = K.wrapText(ex.sub, r.x + 8, bodyY + 6, r.w - 16, m.exLh) + 4;
  for (const [ind, t, st] of ex.lines) {
    textStyle(st === 'bold' ? BOLD : NORMAL);
    fill(FP.tok(st === 'muted' ? 'text-muted' : 'text'));
    yy = K.wrapText(t, r.x + 8 + 14 * ind, yy, r.w - 16 - 14 * ind, m.exLh);
  }
  textStyle(NORMAL);
}

// ---------- Actions ----------

function loadCard() {
  selOffered = null;
  selRpm = null;
  lastRes = null;
  scoredRes = null;
  const card = deck.card();
  if (!card) return;
  rpmBtns.forEach((b, i) => {
    const v = card.options[i];
    if (v == null) { b.elt.hidden = true; return; }
    b.elt.hidden = false;
    b.html(v === NONE ? 'none' : v);
    b.attribute('aria-label', 'Class maximum RPM: ' + (v === NONE ? 'none, class not built' : v) + ' (key ' + (i + 1) + ')');
  });
}

function canAnswer() {
  const st = deck.state();
  return st.phase === 'choose' || (st.phase === 'feedback' && st.canPractice);
}

// A shortcut key moves focus to Check once both answers are chosen, so Enter checks
// (Enter on a focused answer button would press that button instead).
function afterPick(fromKey) {
  updateControls();
  if (fromKey && !checkButton.elt.disabled) checkButton.elt.focus();
}

function pickOffered(v, fromKey) {
  if (!canAnswer()) return;
  selOffered = v;
  afterPick(fromKey);
}

function pickRpm(i, fromKey) {
  const card = deck.card();
  if (!canAnswer() || !card || card.options[i] == null) return;
  selRpm = card.options[i];
  afterPick(fromKey);
}

function checkAnswer() {
  if (!canAnswer()) return;
  if (selOffered === null || selRpm === null) {
    FP.announce('Choose Offered or Not offered and a class maximum RPM first.');
    return;
  }
  const res = deck.place({ offered: selOffered, rpm: selRpm });
  if (res.status === 'ignored') return;
  lastRes = res;
  if (!res.practiceTry) scoredRes = res;
  updateControls();
  FP.announce(res.message + ' ' + scoreLabel() + '.');
  const st = deck.state();
  if (!st.canPractice) nextButton.elt.focus();
}

function advance() {
  if (!deck.next()) return;
  const st = deck.state();
  if (st.phase === 'summary') {
    lastRes = null;
    updateControls();
    const s = deck.summary();
    FP.announce('All 8 judged. ' + scoreLabel() + '. ' +
      (s.mastered ? FP.msg.masteryReached(MASTERY, CARDS.length) : FP.msg.masteryNeeds(MASTERY, CARDS.length, REVIEW)) +
      (s.misses.length ? ' Missed: ' + s.misses.map(mm => mm.card.label + ': ' + mm.card.answerText + '.').join(' ') : ''));
    restartButton.elt.focus();
  } else {
    loadCard();
    updateControls();
    FP.announce('Designation ' + (st.index + 1) + ' of ' + st.count + ': ' + st.card.label + '.');
    offeredBtn.elt.focus();
  }
}

function startOver() {
  deck.newRound();
  loadCard();
  updateControls();
  FP.announce('Start over. Designation 1 of 8: ' + deck.card().label + '. ' + PROMPT);
  offeredBtn.elt.focus();
}

function toggleExtract(k) {
  open[k] = !open[k];
  updateControls();
  FP.announce((k === 'A' ? EXTRACTS[0] : EXTRACTS[1]).title + (open[k] ? ' opened.' : ' collapsed.'));
}

function enterKey() {
  const st = deck.state();
  if (st.phase === 'choose') checkAnswer();
  else if (st.phase === 'feedback') advance();
  else if (st.phase === 'summary') startOver();
}

function updateControls() {
  if (!restartButton) return;
  const st = deck.state();
  const had = document.activeElement;
  const answering = canAnswer();
  const summary = st.phase === 'summary';
  for (const [b, v] of [[offeredBtn, true], [notOfferedBtn, false]]) {
    b.attribute('aria-pressed', String(selOffered === v));
    K.setEnabled(b, answering);
    if (summary) b.hide(); else b.show();
  }
  const card = deck.card();
  rpmBtns.forEach((b, i) => {
    b.attribute('aria-pressed', String(!!card && card.options[i] === selRpm));
    K.setEnabled(b, answering);
    b.style('display', summary || b.elt.hidden ? 'none' : '');
  });
  for (const ex of EXTRACTS) {
    const b = extractBtns[ex.key];
    b.html((open[ex.key] ? '▾ ' : '▸ ') + ex.title);
    b.attribute('aria-expanded', String(open[ex.key]));
    b.attribute('aria-label', ex.title + ', ' + ex.sub + (open[ex.key] ? ', open' : ', collapsed') + ' (key ' + ex.key + ')');
  }
  const practice = st.phase === 'feedback' && st.canPractice;
  checkButton.html(practice ? 'Practice try' : 'Check');
  K.setEnabled(checkButton, answering && selOffered !== null && selRpm !== null);
  nextButton.html(st.isLast ? 'Show summary' : 'Next designation');
  K.setEnabled(nextButton, st.phase === 'feedback');
  if (summary) { checkButton.hide(); nextButton.hide(); } else { checkButton.show(); nextButton.show(); }
  positionControls();
  K.keepFocus(had, [checkButton, nextButton, restartButton, offeredBtn, notOfferedBtn, ...rpmBtns]);
}

function windowResized() {
  updateCanvasSize();
  relayout();
}

function updateCanvasSize() {
  canvasWidth = K.updateCanvasSize(320);
}
