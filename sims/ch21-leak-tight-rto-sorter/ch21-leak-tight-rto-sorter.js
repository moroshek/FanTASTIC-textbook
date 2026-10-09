// Leak-Tight Versus RTO Requirement Sorter
// CANVAS_HEIGHT: 567
// Twelve requirement cards from FanPedia's nominally leak-tight (p. 120) and RTO (p. 121)
// construction pages, dealt in one shuffled order (seed 21). The learner places each card in
// Leak-Tight Only, Both or RTO Only and locks the placement: one attempt, no re-placement.
// Mastery 10 of 12 on the first attempt. Afterwards the two FanPedia lists can be compared
// side by side with the shared lines linked.
// Built on the FanPedia kit: FP.CardDeck (deal, lock, score, mastery), FP.p5 (layout, text,
// controls, keys), FP.msg / FP.announce (wording, live region).

const K = FP.p5;
const SIM_ID = 'ch21-leak-tight-rto-sorter';
let canvasWidth = 800;
const drawHeight = 452;
const controlHeight = K.controlHeightFor(3);   // 115: bins, actions (+1 row when bins wrap at 320 px)
const canvasHeight = drawHeight + controlHeight;
const MASTERY = 10;

const BINS = [
  { id: 'lt', name: 'Leak-Tight Only' },
  { id: 'both', name: 'Both' },
  { id: 'rto', name: 'RTO Only' }
];
const BIN_NAME = { lt: 'Leak-Tight Only', both: 'Both', rto: 'RTO Only' };

// Chapter 21 spec, "Content" table. short: chip and comparison text.
const CARDS = [
  { id: 1, text: 'Solid drive side on housing (no drive plates)', short: 'Solid drive side', answer: 'both',
    why: 'Both pages list it; drive plates are a leak path.' },
  { id: 2, text: 'Not recommended for applications over 600°F', short: 'Not over 600°F', answer: 'both',
    why: 'Both pages state the same 600°F limit.' },
  { id: 3, text: 'Bolted connections on 3 in. to 4 in. centers', short: 'Bolts on 3-4 in. centers', answer: 'both',
    why: 'Close bolt spacing keeps gaskets clamped on both options.' },
  { id: 4, text: 'Centering plates if the housing is split', short: 'Centering plates if split', answer: 'both',
    why: 'Both pages require them to seal the open areas at seals and inlet.' },
  { id: 5, text: 'Soap bubble test at the shop, recorded on the inspection form', short: 'Soap bubble test', answer: 'both',
    why: 'Both pages describe the same shop test.' },
  { id: 6, text: 'Arrangements 1, 8 and 9 only', short: 'Arr. 1, 8 and 9 only', answer: 'lt',
    why: 'The arrangement limit appears only on the leak-tight page.' },
  { id: 7, text: 'Shaft seal: lip, Graphoil stuffing box, or double carbon ring', short: 'Lip, Graphoil or double carbon seal', answer: 'lt',
    why: 'These three seal types are the leak-tight list.' },
  { id: 8, text: 'Drain: pipe coupling type with plug', short: 'Plugged pipe-coupling drain', answer: 'lt',
    why: 'The plugged pipe-coupling drain is called out on the leak-tight page.' },
  { id: 9, text: 'Silicone sponge gasket and silicone caulk, with an alternative on automotive jobs', short: 'Silicone; alternative on automotive', answer: 'rto',
    why: 'The silicone rule belongs to RTO duty.' },
  { id: 10, text: 'Dampers, if required, must have stuffing boxes', short: 'Stuffing boxes on dampers', answer: 'rto',
    why: 'Only the RTO page sets a damper requirement.' },
  { id: 11, text: 'Sales must specify VFD, cycling and bake-out conditions', short: 'VFD, cycling, bake-out', answer: 'rto',
    why: 'These are the RTO service conditions.' },
  { id: 12, text: 'Shaft seal: friction, single carbon ring, or commercial carbon ring', short: 'Friction or carbon ring seal', answer: 'rto',
    why: 'These are the RTO seal types.' }
];

// Spec feedback: Correct: "Correct: <Why>." Incorrect: "This one belongs in <Bin>. <Why>."
const deck = new FP.CardDeck({
  cards: CARDS, seed: 21, attempts: 1, retryMissed: false,
  noun: 'Cards', mastery: MASTERY, id: SIM_ID,
  label: a => BIN_NAME[a],
  reviewPointer: 'Reread "RTO Service Conditions" and the leak-tight list, then press Start over',
  messages: {
    correct: res => FP.msg.OK + ' Correct: ' + res.card.why,
    missed: res => FP.msg.BAD + ' This one belongs in ' + BIN_NAME[res.card.answer] + '. ' + res.card.why
  }
});

let pending = null;      // bin chosen but not locked yet
let feedback = null;     // {kind, message}
let notice = '';
let view = 'bins';       // 'bins' | 'compare' (after the last card)
let binButtons = [], lockButton, nextButton, compareButton, startOverButton;
let navRow = 1;

const keys = K.keys.bind({ '1': () => choose(0), '2': () => choose(1), '3': () => choose(2), Enter: enterKey });

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  binButtons = BINS.map((b, i) => {
    const btn = K.button((i + 1) + ' ' + b.name, () => choose(i));
    btn.addClass('choice');
    btn.attribute('aria-pressed', 'false');
    return btn;
  });
  lockButton = K.button('Lock placement', lockPlacement);
  nextButton = K.button('Next card', nextCard);
  compareButton = K.button('Compare the two lists', toggleCompare);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });
  updateControls();
  describe('Leak-tight versus RTO requirement sorter. Twelve requirement cards from FanPedia\'s nominally ' +
    'leak-tight and RTO construction pages are dealt one at a time. Place each card in Leak-Tight Only, Both ' +
    'or RTO Only and lock it; the card is marked correct or incorrect with the reason. After all twelve, ' +
    'compare the two FanPedia lists side by side with the shared lines linked.');
}

// ---------- Flow ----------
function choose(i) {
  if (deck.state().phase !== 'choose') return;
  pending = BINS[i].id;
  notice = '';
  updateControls();
  FP.announce(BINS[i].name + ' selected. Press Lock placement to lock it.');
}

function lockPlacement() {
  const st = deck.state();
  if (st.phase !== 'choose') return;
  if (!pending) return setNotice('Choose a bin first (keys 1-3).');
  const res = deck.place(pending);
  feedback = { kind: res.kind, message: res.message };
  pending = null;
  FP.announce('Placed in ' + BIN_NAME[res.chosen] + '. ' + res.message);
  updateControls();
}

function nextCard() {
  const st = deck.state();
  if (st.phase !== 'feedback') return;
  deck.next();
  feedback = null;
  notice = '';
  updateControls();
  const s = deck.state();
  if (s.phase === 'summary') {
    FP.announce(deck.summary().lines.join(' ') + ' Press Compare the two lists to see them side by side.');
  } else {
    FP.announce('Card ' + (s.index + 1) + ' of 12. ' + s.card.text + '. Which construction calls for this?');
  }
}

function toggleCompare() {
  if (deck.state().phase !== 'summary') return;
  view = view === 'compare' ? 'bins' : 'compare';
  updateControls();
  FP.announce(view === 'compare'
    ? 'The two FanPedia lists side by side. 5 of the 12 requirements are shared: solid drive side, 600°F limit, 3 to 4 inch bolt centers, centering plates and the soap bubble test.'
    : 'Bins view.');
}

function startOver() {
  deck.newRound();
  pending = null;
  feedback = null;
  notice = '';
  view = 'bins';
  updateControls();
  FP.announce('Started over. Card 1 of 12. ' + deck.state().card.text + '.');
}

function setNotice(t) { notice = t; FP.announce(t); }

function enterKey() {
  const ph = deck.state().phase;
  if (ph === 'choose') lockPlacement();
  else if (ph === 'feedback') nextCard();
}
function keyPressed() { return keys(); }

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  let y = K.title(canvasWidth >= 460 ? 'Leak-Tight Versus RTO Requirement Sorter' : 'Leak-Tight vs RTO Sorter');
  const st = deck.state();
  const right = st.phase === 'summary' ? (view === 'compare' ? 'Comparing the lists' : 'All cards placed')
    : 'Card ' + (st.index + 1) + ' of ' + CARDS.length + ' · one placement';
  y = K.statusLine(st.scoreLabel, right, null, { y: y - 4 });
  K.note(canvasWidth >= 520
    ? ['Source: FanPedia p. 120 (leak-tight) and p. 121 (RTO)', 'Keys: 1-3 choose a bin, Enter locks or goes on']
    : ['FanPedia pp. 120-121', 'Keys 1-3, Enter'], { y: drawHeight - 6 });
  const top = y + 2, bottom = drawHeight - 24;
  if (view === 'compare') { drawCompare(10, top, canvasWidth - 20, bottom - top); return; }
  const cardH = Math.round((bottom - top) * (canvasWidth >= 600 ? 0.42 : 0.5));
  K.panel(10, top, canvasWidth - 20, cardH);
  if (st.phase === 'summary') drawSummary(20, top + 8, canvasWidth - 40, cardH - 14);
  else drawCard(20, top + 8, canvasWidth - 40, cardH - 14);
  drawBins(10, top + cardH + 6, canvasWidth - 20, bottom - top - cardH - 6);
}

function paras(list, x, y, w, ts, dry) {
  for (const p of list) {
    const s = p.big ? ts + 2 : (p.small ? Math.max(12, ts - 2) : ts);
    textSize(s);
    textStyle(p.bold ? BOLD : NORMAL);
    noStroke();
    fill(p.color || FP.tok(p.muted ? 'text-muted' : 'text'));
    y += p.gap || 0;
    y = K.wrapText(p.t, x, y, w, Math.round(s * 1.3), { dryRun: dry });
  }
  textStyle(NORMAL);
  return y;
}

function drawCard(x, y, w, h) {
  const st = deck.state();
  const body = [
    { t: 'Requirement card ' + (st.index + 1) + ' of ' + CARDS.length, muted: true, small: true },
    { t: st.card.text, bold: true, big: true, gap: 2 },
    { t: 'Which construction calls for this?', gap: 4 }
  ];
  if (pending && st.phase === 'choose') body.push({ t: 'Selected: ' + BIN_NAME[pending] + '. Press Lock placement (Enter).', color: FP.tok('primary-dark'), gap: 4 });
  if (notice) body.push({ t: 'ℹ ' + notice, color: FP.tok('primary-dark'), gap: 4 });
  const fb = feedback ? [{ t: feedback.message, color: FP.tok(feedback.kind === 'ok' ? 'correct' : 'incorrect') }] : [];
  const pad = 7;
  const layout = ts => {
    let yy = paras(body, x, y, w, ts, true);
    if (fb.length) yy = paras(fb, x + pad, yy + 6 + pad, w - 2 * pad, ts, true) + pad;
    return yy - y;
  };
  const ts = K.fitTextSize(layout, h, 16, 12);
  let yy = paras(body, x, y, w, ts, false);
  if (fb.length) {
    const fbTop = yy + 6;
    const fbH = paras(fb, x + pad, fbTop + pad, w - 2 * pad, ts, true) + pad - fbTop;
    K.panel(x - 2, fbTop, w + 4, fbH, {
      fill: feedback.kind === 'ok' ? '--fp-correct-bg' : '--fp-incorrect-bg',
      stroke: feedback.kind === 'ok' ? '--fp-correct' : '--fp-incorrect', dashed: feedback.kind !== 'ok', weight: 2
    });
    paras(fb, x + pad, fbTop + pad, w - 2 * pad, ts, false);
  }
}

function drawSummary(x, y, w, h) {
  const s = deck.summary();
  const list = [
    { t: s.lines[0], bold: true },
    { t: (s.mastered ? FP.msg.OK + ' ' : '') + s.lines[1], color: FP.tok(s.mastered ? 'correct' : 'text') },
    { t: 'Press Compare the two lists: how many of the 12 requirements are shared?', muted: true, gap: 4 }
  ];
  if (s.misses.length) {
    list.push({ t: 'Missed: ' + s.misses.map(m => m.card.short + ' (' + m.answer + ')').join('; ') + '.', gap: 4 });
  }
  const ts = K.fitTextSize(t => paras(list, x, y, w, t, true) - y, h, 16, 12);
  paras(list, x, y, w, ts, false);
}

// Three bins; locked cards appear as chips in the bin the learner chose (✓ solid / ✗ dashed).
function drawBins(x, y, w, h) {
  const gap = 8, bw = (w - 2 * gap) / 3;
  const placements = deck.placements;
  const narrow = canvasWidth < 480;
  BINS.forEach((b, i) => {
    const bx = x + i * (bw + gap);
    const sel = pending === b.id;
    K.panel(bx, y, bw, h, { stroke: sel ? '--fp-primary' : '--fp-border', weight: sel ? 3 : 1, fill: sel ? '--fp-primary-bg' : null });
    noStroke();
    fill(FP.tok('text'));
    textStyle(BOLD);
    textSize(narrow ? 13 : 15);
    textAlign(CENTER, TOP);
    text((i + 1) + ' ' + (narrow && b.id !== 'both' ? b.name.replace(' Only', '') : b.name), bx + bw / 2, y + 6);
    textStyle(NORMAL);
    if (narrow && b.id !== 'both') {
      textSize(12);
      fill(FP.tok('text-muted'));
      text('only', bx + bw / 2, y + 22);
    }
    textAlign(LEFT, TOP);
    const chips = placements.filter(p => p.chosen === b.id);
    const cy0 = y + (narrow ? 40 : 30);
    const chipH = Math.min(24, (h - (cy0 - y) - 4) / Math.max(1, Math.min(12, chips.length)) - 3);
    chips.forEach((p, k) => {
      const cy = cy0 + k * (chipH + 3);
      K.panel(bx + 5, cy, bw - 10, chipH, {
        radius: 4, weight: 1.5, dashed: !p.correct,
        fill: p.correct ? '--fp-correct-bg' : '--fp-incorrect-bg', stroke: p.correct ? '--fp-correct' : '--fp-incorrect'
      });
      noStroke();
      fill(FP.tok(p.correct ? 'correct' : 'incorrect'));
      textSize(12);
      textAlign(LEFT, CENTER);
      let s = (p.correct ? FP.msg.OK : FP.msg.BAD) + ' ' + p.card.short;
      const maxW = bw - 18;
      if (textWidth(s) > maxW) { while (s.length > 3 && textWidth(s + '…') > maxW) s = s.slice(0, -1); s += '…'; }
      text(s, bx + 9, cy + chipH / 2 + 1);
      textAlign(LEFT, TOP);
    });
    if (!chips.length && deck.state().phase !== 'summary') {
      fill(FP.tok('text-muted'));
      textSize(12);
      textAlign(CENTER, TOP);
      text(narrow ? 'empty' : 'Empty', bx + bw / 2, cy0 + 4);
      textAlign(LEFT, TOP);
    }
  });
}

// The two FanPedia lists side by side; the five shared lines are linked across the middle.
function drawCompare(x, y, w, h) {
  const shared = CARDS.filter(c => c.answer === 'both');
  const lt = CARDS.filter(c => c.answer === 'lt');
  const rto = CARDS.filter(c => c.answer === 'rto');
  const mid = Math.max(54, Math.round(w * 0.14));
  const cw = (w - mid) / 2;
  const lx = x, rx = x + cw + mid;
  noStroke();
  fill(FP.tok('text'));
  textStyle(BOLD);
  textSize(canvasWidth < 480 ? 13 : 15);
  textAlign(LEFT, TOP);
  K.wrapText(canvasWidth < 480 ? 'Leak-tight (p. 120)' : 'Nominally leak-tight (p. 120)', lx + 4, y + 2, cw - 4, 17);
  K.wrapText(canvasWidth < 480 ? 'RTO (p. 121)' : 'RTO construction (p. 121)', rx + 4, y + 2, cw - 4, 17);
  textStyle(NORMAL);
  const rowsTop = y + 26;
  const rows = shared.length + Math.max(lt.length, rto.length);
  const rowH = Math.min(36, (y + h - 22 - rowsTop) / rows);
  const ts = rowH >= 30 ? 13 : 12;
  const box = (bx, by, c, kind) => {
    K.panel(bx, by, cw, rowH - 4, { radius: 4, fill: kind === 'shared' ? '--fp-primary-bg' : null,
      stroke: kind === 'shared' ? '--fp-primary' : '--fp-border', weight: kind === 'shared' ? 1.5 : 1 });
    noStroke();
    fill(FP.tok('text'));
    textSize(ts);
    textAlign(LEFT, CENTER);
    let s = c.short;
    if (textWidth(s) > cw - 12) { while (s.length > 3 && textWidth(s + '…') > cw - 12) s = s.slice(0, -1); s += '…'; }
    text(s, bx + 6, by + (rowH - 4) / 2 + 1);
    textAlign(LEFT, TOP);
  };
  shared.forEach((c, i) => {
    const by = rowsTop + i * rowH;
    box(lx, by, c, 'shared');
    box(rx, by, c, 'shared');
    stroke(FP.tok('primary'));
    strokeWeight(2);
    line(lx + cw, by + (rowH - 4) / 2, rx, by + (rowH - 4) / 2);
    noStroke();
    fill(FP.tok('primary-dark'));
    textSize(12);
    textAlign(CENTER, BOTTOM);
    text('both', lx + cw + mid / 2, by + (rowH - 4) / 2 - 2);
    textAlign(LEFT, TOP);
  });
  const t2 = rowsTop + shared.length * rowH + 4;
  lt.forEach((c, i) => box(lx, t2 + i * rowH, c, 'only'));
  rto.forEach((c, i) => box(rx, t2 + i * rowH, c, 'only'));
  noStroke();
  fill(FP.tok('text'));
  textSize(13);
  textStyle(BOLD);
  textAlign(LEFT, BOTTOM);
  text('5 of the 12 requirements are shared (linked rows).', x + 4, y + h - 2);
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
}

// ---------- Controls ----------
function positionControls() {
  const narrow = canvasWidth < 480;
  BINS.forEach((b, i) => {
    const label = (i + 1) + ' ' + (narrow && b.id === 'lt' ? 'Leak-Tight' : narrow && b.id === 'rto' ? 'RTO' : b.name);
    binButtons[i].html(label);
    binButtons[i].attribute('aria-label', b.name + ' (key ' + (i + 1) + ')');
  });
  navRow = K.flowButtons(0, binButtons);
  K.flowButtons(navRow, [lockButton, nextButton, compareButton, null, startOverButton]);
}

function updateControls() {
  const had = document.activeElement;
  const st = deck.state();
  const done = st.phase === 'summary';
  binButtons.forEach((b, i) => {
    K.setEnabled(b, st.phase === 'choose');
    b.attribute('aria-pressed', pending === BINS[i].id ? 'true' : 'false');
    if (done) b.hide(); else b.show();
  });
  for (const c of [lockButton, nextButton]) { if (done) c.hide(); else c.show(); }
  if (done) compareButton.show(); else compareButton.hide();
  K.setEnabled(lockButton, st.phase === 'choose');
  K.setEnabled(nextButton, st.phase === 'feedback');
  nextButton.html(st.isLast ? 'Finish' : 'Next card');
  nextButton.attribute('aria-label', st.isLast ? 'Finish and see the summary' : 'Next card');
  compareButton.html(view === 'compare' ? 'Show the bins' : 'Compare the two lists');
  positionControls();
  K.keepFocus(had, [nextButton, lockButton, ...binButtons, compareButton, startOverButton]);
  if (st.phase === 'feedback' && (had === lockButton.elt || had === document.body)) nextButton.elt.focus();
  if (done && (had === nextButton.elt || had === document.body)) compareButton.elt.focus();
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
