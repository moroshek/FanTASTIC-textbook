// Which Exploded View Shows This Part - p5.js MicroSim (FanPedia shared kit: FP.CardDeck, FP.p5)
// CANVAS_HEIGHT: 760
// Twelve housing-part cards, shuffled, go into four fan-family bins: the family whose
// FanPedia exploded view (pp. 9-19) or housing detail (pp. 59-66) labels the part.
// Cards move freely until Check. The first check is scored (mastery 10 of 12); Retry
// sends the incorrect cards back to the pool for unscored practice, as often as needed.
// Needs ../shared-libs/fanpedia-core.js and fanpedia-p5.js (see main.html).

const K = FP.p5;
const SIM_ID = 'ch07-exploded-view-part-sorter';
let canvasWidth = 800;
const canvasHeight = 760;
let drawHeight = 640;
let controlHeight = canvasHeight - drawHeight;
const margin = 10;
const MASTERY = 10;
const REVIEW_SHORT = 'Review the chapter, then press Retry.';
const QUESTION = "Which fan family's exploded view shows each part?";
const REVIEW = 'Review the sections on tubular housings, plug fan hardware and rooftop hardware, then press Retry.';

const BINS = [
  { id: 'HC', name: 'Housed Centrifugal', sub: 'scroll housing', button: 'Housed centrifugal' },
  { id: 'TU', name: 'Tubular', sub: 'axial, inline centrifugal, mixed flow', button: 'Tubular' },
  { id: 'PF', name: 'Plug Fan', sub: '', button: 'Plug fan' },
  { id: 'RE', name: 'Centrifugal Roof Exhauster', sub: '', button: 'Roof exhauster' }
];
const BIN = Object.fromEntries(BINS.map(b => [b.id, b]));

// Chapter 7 spec, "Content" table.
const CARDS = [
  { name: 'Housing Side', answer: 'HC', why: 'A flat side plate of the scroll housing (FanPedia pp. 60–61).' },
  { name: 'Housing Scroll', answer: 'HC', why: 'The curved wrapper exists only on scroll housings (p. 60).' },
  { name: 'Cutoff', answer: 'HC', why: 'The tongue where the scroll meets the outlet (p. 60).' },
  { name: 'Straightening Vanes', answer: 'TU', why: 'Fixed vanes that remove swirl in inline centrifugal and mixed flow housings (pp. 17, 64).' },
  { name: 'Guide Vanes', answer: 'TU', why: 'The vaneaxial version of straightening vanes (pp. 16, 63).' },
  { name: 'Discharge Cone', answer: 'TU', why: 'Tapered outlet section on the belt driven inline and mixed flow view (p. 17).' },
  { name: 'Belt Tube', answer: 'TU', why: 'Carries belts across the airstream to a shaft inside the tube (pp. 15–17).' },
  { name: 'Mounting Panel', answer: 'PF', why: "Fastens the fan to the customer's plenum wall (pp. 13–14, 66)." },
  { name: 'Insulation Plug', answer: 'PF', why: 'Insulates the plenum wall opening around the fan (pp. 13–14, 66).' },
  { name: 'Shroud', answer: 'RE', why: 'Shell around the roof exhauster impeller (p. 19).' },
  { name: 'Curb Cap', answer: 'RE', why: 'Sits on the roof curb in the exploded view (p. 19); roof mounted axial fans also use one (p. 7).' },
  { name: 'Motor Cover', answer: 'RE', why: 'Weather cover on top of the roof exhauster (p. 19).' }
].map((c, i) => Object.assign(c, { id: 'card-' + (i + 1), n: i + 1, answerText: BIN[c.answer].name }));
const CARD = Object.fromEntries(CARDS.map(c => [c.id, c]));
const VANES_NOTE = 'A scroll housing turns the air with its spiral shape; vanes are needed only when the air leaves the impeller swirling inside a tube.';

// Spec feedback wording: correct "Correct: <part> belongs to <family>. <why>";
// incorrect "Not <chosen family>. <why>", plus the vanes note for card 4 in Housed Centrifugal.
const deck = new FP.CardDeck({
  cards: CARDS, shuffle: true, attempts: 1, retryMissed: true,
  noun: 'Cards', mastery: MASTERY, reviewPointer: REVIEW, id: SIM_ID,
  messages: {
    correct: res => FP.msg.OK + ' Correct: ' + res.card.name + (/s$/.test(res.card.name) ? ' belong to ' : ' belongs to ') + BIN[res.card.answer].name + '. ' + res.card.why,
    missed: res => FP.msg.BAD + ' Not ' + BIN[res.chosen].name + '. ' + res.card.why +
      (res.card.n === 4 && res.chosen === 'HC' ? ' ' + VANES_NOTE : '')
  }
});

// Per-card state: where it sits, whether it is locked, and its latest verdict.
let loc = {};          // id -> 'pool' | bin id
let verdict = {};      // id -> {ok, message, practice}
let locked = {};       // id -> true once checked (until Retry frees the wrong ones)
let checked = false;   // the current set has been checked
let firstScore = null; // first-check score of this round
let selected = null;   // selected card id
let notice = '';
let poolOrder = [];    // shuffled card order (deck order of round 1)

// Drag state
let drag = null;       // {id, dx, dy, x, y, moved, sx, sy}
let pressOnBin = null; // bin id when a press starts on empty bin space
let hits = [];         // [{id, x, y, w, h}] chip rectangles from the last frame
let binRects = {};     // bin id -> {x, y, w, h}; plus 'pool'

let cardSelect, binButtons = [], poolButton, checkButton, retryButton, startOverButton;
let rowsUsed = 2;

function makeButton(label, fn, variant) {
  const b = K.button(label, null, variant ? { variant } : undefined);
  b.elt.type = 'button';
  b.elt.addEventListener('click', fn);
  return b;
}

const keys = K.keys.bind({
  '1': () => moveSelected('HC'), '2': () => moveSelected('TU'), '3': () => moveSelected('PF'), '4': () => moveSelected('RE'),
  '0': () => moveSelected('pool'), c: () => doCheck(), r: () => doRetry()
});
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight, margin });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));

  cardSelect = createSelect();
  cardSelect.parent(document.querySelector('main'));
  cardSelect.attribute('aria-label', 'Card to move or read');
  cardSelect.changed(() => { selected = cardSelect.value(); announceSelected(); });
  // The kit's key helper treats a focused select like a text field; digits have no meaning
  // for the card list, so 1-4 and 0 still place the selected card from here.
  cardSelect.elt.addEventListener('keydown', e => {
    const bin = { '1': 'HC', '2': 'TU', '3': 'PF', '4': 'RE', '0': 'pool' }[e.key];
    if (!bin || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    moveSelected(bin);
  });

  BINS.forEach((b, i) => {
    const btn = makeButton((i + 1) + ' ' + b.button, () => moveSelected(b.id));
    btn.addClass('choice');
    btn.attribute('aria-label', 'Put the selected card in ' + b.name + ' (key ' + (i + 1) + ')');
    btn.attribute('aria-keyshortcuts', String(i + 1));
    binButtons.push(btn);
  });
  poolButton = makeButton('0 Pool', () => moveSelected('pool'), 'secondary');
  poolButton.attribute('aria-label', 'Put the selected card back in the pool (key 0)');
  checkButton = makeButton('Check', doCheck);
  checkButton.attribute('aria-keyshortcuts', 'C');
  retryButton = makeButton('Retry', doRetry, 'secondary');
  retryButton.attribute('aria-keyshortcuts', 'R');
  startOverButton = makeButton(FP.msg.START_OVER, startOver, 'secondary');

  newRound(false);
  describe('Which Exploded View Shows This Part. Twelve housing part cards start in a pool; drag each into one ' +
    'of four bins: Housed Centrifugal, Tubular, Plug Fan or Centrifugal Roof Exhauster. Keyboard: choose a card in ' +
    'the Card list and press 1 to 4 (0 returns it to the pool). Press Check to mark every card; the first check is ' +
    'scored out of 12. Click a card to read why. Retry sends the incorrect cards back to the pool for practice.');
}

// ---------- Round logic ----------
function newRound(announce) {
  if (announce) deck.newRound();
  poolOrder = deck.order.map(c => c.id);
  loc = {}; verdict = {}; locked = {};
  CARDS.forEach(c => { loc[c.id] = 'pool'; });
  checked = false;
  firstScore = null;
  notice = '';
  selected = poolOrder[0];
  updateControls();
  if (announce) FP.announce('Started over. All 12 cards are in the pool. ' + QUESTION);
}

function startOver() { newRound(true); }

function poolCards() { return poolOrder.filter(id => loc[id] === 'pool'); }

function moveCard(id, where) {
  if (!id || locked[id] || loc[id] === where) return false;
  loc[id] = where;
  notice = '';
  return true;
}

function moveSelected(where) {
  if (!selected) return;
  if (locked[selected]) {
    notice = CARD[selected].name + ' is checked and locked.' + (checked && canRetry() ? ' Press Retry to free the incorrect cards.' : '');
    FP.announce(notice);
    return;
  }
  const id = selected;
  if (!moveCard(id, where)) return;
  const name = CARD[id].name;
  const left = poolCards().length;
  // keyboard flow: go on to the next card still in the pool
  if (where !== 'pool' && left) selected = poolCards()[0];
  updateControls();
  FP.announce(name + (where === 'pool' ? ' back in the pool.' : ' placed in ' + BIN[where].name + '.') +
    ' ' + left + ' left in the pool.' + (left && selected !== id ? ' Next card: ' + CARD[selected].name + '.' : ''));
}

function movableCards() { return CARDS.filter(c => !locked[c.id]); }

function doCheck() {
  if (checked) return;
  const left = poolCards().filter(id => !locked[id]);
  if (left.length) {
    notice = 'Place all the cards before you press Check (' + left.length + ' still in the pool).';
    FP.announce(notice);
    return;
  }
  // Score through the engine, card by card in deck order.
  const practice = deck.practice;
  deck.order.forEach(card => {
    const res = deck.place(loc[card.id]);
    verdict[card.id] = { ok: res.status === 'correct', message: res.message, practice };
    locked[card.id] = true;
    deck.next();
  });
  checked = true;
  if (!practice) firstScore = deck.summary().firstAttempt;
  const wrong = CARDS.filter(c => verdict[c.id] && !verdict[c.id].ok);
  selected = wrong.length ? wrong[0].id : selected;
  notice = '';
  updateControls();
  const lines = summaryLines();
  FP.announce((practice ? 'Practice check (not scored): ' + (deck.order.length - wrong.length) + ' of ' +
    deck.order.length + ' correct. ' : '') + lines.join(' ') + (wrong.length ? ' Incorrect: ' + wrong.map(c => c.name).join(', ') + '.' : ''));
}

function canRetry() { return checked && deck.summary().canRetryMissed; }

function doRetry() {
  if (!canRetry()) return;
  const missed = deck.roundMisses().map(m => m.card.id);   // this round's (scored or practice)
  deck.retryMissed();
  missed.forEach(id => { loc[id] = 'pool'; locked[id] = false; delete verdict[id]; });
  checked = false;
  selected = poolCards()[0];
  notice = '';
  updateControls();
  cardSelect.elt.focus();
  FP.announce('Retry (not scored): ' + missed.length + ' card' + (missed.length === 1 ? '' : 's') +
    ' back in the pool: ' + missed.map(id => CARD[id].name).join(', ') + '.');
}

function summaryLines() {
  if (firstScore === null) return [];
  const N = CARDS.length;
  return ['First check: ' + firstScore + ' of ' + N,
    firstScore >= MASTERY ? FP.msg.masteryReached(MASTERY, N)
      : 'Mastery needs ' + MASTERY + ' of ' + N + ' on the first check. ' + (canvasWidth >= 560 ? REVIEW : REVIEW_SHORT)];
}

function announceSelected() {
  const id = selected;
  if (!id) return;
  const where = loc[id] === 'pool' ? 'in the pool' : 'in ' + BIN[loc[id]].name;
  FP.announce(CARD[id].name + ', ' + where + '.' + (verdict[id] ? ' ' + verdict[id].message : ''));
}

// ---------- Controls ----------
function optionText(c) {
  const v = verdict[c.id];
  const where = loc[c.id] === 'pool' ? 'pool' : BIN[loc[c.id]].name;
  return (v ? (v.ok ? '✓ ' : '✗ ') : '') + c.name + ' (' + where + ')';
}

function updateControls() {
  const had = document.activeElement;
  // the Card list follows the pool order
  const sel = cardSelect.elt;
  sel.innerHTML = '';
  poolOrder.forEach(id => {
    const o = document.createElement('option');
    o.value = id;
    o.textContent = optionText(CARD[id]);
    sel.appendChild(o);
  });
  if (selected) sel.value = selected;
  const canMove = selected && !locked[selected];
  binButtons.forEach((b, i) => {
    K.setEnabled(b, !!canMove);
    b.attribute('aria-pressed', selected && loc[selected] === BINS[i].id ? 'true' : 'false');
  });
  K.setEnabled(poolButton, !!canMove && loc[selected] !== 'pool');
  K.setEnabled(checkButton, !checked);
  checkButton.html(deck.practice ? 'Check (practice)' : 'Check');
  K.setEnabled(retryButton, canRetry());
  positionControls();
  K.keepFocus(had, [cardSelect, ...binButtons, poolButton, checkButton, retryButton, startOverButton]);
}

function positionControls() {
  for (let pass = 0; pass < 2; pass++) {
    K.config({ drawHeight, controlHeight, margin });
    const narrow = canvasWidth < 560;
    const lx = narrow ? 52 : 56;
    cardSelect.position(lx, K.controlRow(0));
    cardSelect.style('max-width', (canvasWidth - lx - margin) + 'px');
    let row = 1;
    if (!narrow) {
      // wide: bins on the select's row when they fit
      const x0 = lx + cardSelect.elt.offsetWidth + 12;
      const need = binButtons.reduce((s, b) => s + b.elt.offsetWidth + 8, 0) + poolButton.elt.offsetWidth;
      if (x0 + need <= canvasWidth - margin) {
        K.flowButtons(0, [...binButtons, poolButton], { x: x0 });
      } else row = K.flowButtons(1, [...binButtons, poolButton], { x: lx });
    } else {
      row = K.flowButtons(1, [...binButtons, poolButton], { x: margin });
    }
    row = K.flowButtons(row, [checkButton, retryButton, null, startOverButton], { x: narrow ? margin : lx });
    rowsUsed = row;
    controlHeight = K.controlHeightFor(row);
    drawHeight = canvasHeight - controlHeight;
  }
}

// ---------- Layout ----------
function chipW(c, ts) {
  textSize(ts || 14);
  return Math.ceil(textWidth('✓ ' + c.name)) + 22;
}

// Flow chips left to right inside width w; returns the chips and the total height.
function flow(ids, x, y, w, h, gap, ts) {
  const out = [];
  let cx = x, cy = y;
  ids.forEach(id => {
    const cw = Math.min(chipW(CARD[id], ts), w);
    if (cx > x && cx + cw > x + w) { cx = x; cy += h + gap; }
    out.push({ id, x: cx, y: cy, w: cw, h });
    cx += cw + gap;
  });
  return { chips: out, height: ids.length ? cy + h - y : 0 };
}

// Computes the pool, bin and feedback rectangles and every chip position. The card being
// dragged keeps its slot (drawn as a placeholder), so targets do not move under the pointer.
function layout() {
  const wide = canvasWidth >= 560;
  const top = 86, noteH = 20;
  const L = { wide, top, chipH: wide ? 28 : 26, gap: wide ? 6 : 5, ts: wide ? 14 : 13, bins: {} };
  const fbH = wide ? 118 : 136;
  L.fb = { x: margin, y: drawHeight - noteH - fbH, w: canvasWidth - 2 * margin, h: fbH - 6 };
  const W = canvasWidth - 2 * margin;
  const inBin = id => poolOrder.filter(c => loc[c] === id);
  if (wide) {
    // pool sized for all 12 cards so the bins do not jump as the pool empties
    const full = flow(poolOrder, 0, 0, W - 16, L.chipH, L.gap, L.ts).height;
    L.pool = { x: margin, y: top, w: W, h: full + 34 };
    L.pool.chips = flow(inBin('pool'), margin + 8, top + 26, W - 16, L.chipH, L.gap, L.ts).chips;
    const by = L.pool.y + L.pool.h + 8, bh = L.fb.y - 8 - by;
    const bw = (W - 3 * 8) / 4;
    BINS.forEach((b, i) => {
      const r = { x: margin + i * (bw + 8), y: by, w: bw, h: bh, headerH: 64 };
      const ids = inBin(b.id), ct = r.y + r.headerH, avail = r.y + r.h - 6 - ct;
      // one card per line; squeeze the spacing when a bin holds many cards
      const step = ids.length ? Math.min(L.chipH + 5, (avail - L.chipH) / Math.max(1, ids.length - 1)) : 0;
      r.chips = ids.map((id, k) => ({ id, x: r.x + 6, y: ct + k * step, w: r.w - 12, h: L.chipH }));
      L.bins[b.id] = r;
    });
  } else {
    // narrow: the pool and four full-width bins (name on top, cards flowing below), each sized
    // to its cards; chips shrink if a lopsided sort would overflow into the feedback panel
    const build = (chipH, gap, ts) => {
      let y = top;
      const pf = flow(inBin('pool'), margin + 8, y + 24, W - 16, chipH, gap, ts);
      const pool = { x: margin, y, w: W, h: Math.max(chipH, pf.height) + 32, chips: pf.chips };
      y += pool.h + 6;
      const bins = {};
      BINS.forEach(b => {
        const f = flow(inBin(b.id), margin + 6, y + 22, W - 12, chipH, gap, ts);
        const h = f.height ? f.height + 28 : 34;
        bins[b.id] = { x: margin, y, w: W, h, chips: f.chips };
        y += h + 5;
      });
      return { pool, bins, bottom: y };
    };
    let lay = build(L.chipH, L.gap, L.ts);
    if (lay.bottom > L.fb.y - 4) {
      L.chipH = 22; L.gap = 4; L.ts = 12;
      lay = build(L.chipH, L.gap, L.ts);
    }
    L.pool = lay.pool;
    L.bins = lay.bins;
  }
  return L;
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  let y = K.title('Which Exploded View Shows This Part?');
  const placed = CARDS.length - poolCards().length;
  const left = firstScore !== null ? 'First check: ' + firstScore + ' of ' + CARDS.length : 'Placed: ' + placed + ' of ' + CARDS.length;
  const right = deck.practice ? 'Retry (not scored)' : (firstScore !== null ? 'Checked' : 'Before Check');
  y = K.statusLine(left, right, null, { y: y - 4 });
  noStroke();
  fill(FP.tok('text'));
  textSize(canvasWidth < 400 ? 14 : 15);
  textAlign(LEFT, TOP);
  text(textWidth(QUESTION) <= canvasWidth - 2 * margin ? QUESTION : 'Which exploded view shows each part?', margin, y);
  K.note(canvasWidth >= 560
    ? ['Source: FanPedia exploded views pp. 9–19 and housing details pp. 59–66', 'Keys: 1–4 bin, 0 pool, C check, R retry']
    : ['FanPedia pp. 9–19, 59–66', 'Keys 1–4, 0, C, R']);

  const L = layout();
  hits = [];
  binRects = { pool: L.pool };
  const over = drag && drag.moved ? regionAt(mouseX, mouseY) : null;
  // pool
  K.panel(L.pool.x, L.pool.y, L.pool.w, L.pool.h, { dashed: true,
    stroke: over === 'pool' ? '--fp-primary' : '--fp-border', weight: over === 'pool' ? 2 : 1 });
  noStroke();
  fill(FP.tok('text-muted'));
  textSize(13);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text('Pool (' + poolCards().length + ')', L.pool.x + 8, L.pool.y + 6);
  textStyle(NORMAL);
  L.pool.chips.forEach(c => drawChip(c, false, L));
  // bins
  BINS.forEach((b, i) => drawBin(b, i, L.bins[b.id], L, over === b.id));
  // feedback panel
  drawFeedback(L.fb);
  // the dragged card on top
  if (drag && drag.moved) {
    const c = CARD[drag.id];
    drawChip({ id: c.id, x: mouseX - drag.dx, y: mouseY - drag.dy, w: chipW(c, L.ts), h: L.chipH }, true, L);
  }
  drawControlLabels();
}

function drawBin(b, i, r, L, over) {
  binRects[b.id] = r;
  K.panel(r.x, r.y, r.w, r.h, { stroke: over ? '--fp-primary' : '--fp-border', weight: over ? 2 : 1 });
  noStroke();
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  fill(FP.tok('text'));
  if (L.wide) {
    textSize(15);
    const y = K.wrapText((i + 1) + '  ' + b.name, r.x + 8, r.y + 6, r.w - 16, 18, { maxLines: 2 });
    textStyle(NORMAL);
    if (b.sub) {
      fill(FP.tok('text-muted'));
      textSize(13);
      K.wrapText('(' + b.sub + ')', r.x + 8, y, r.w - 16, 16, { maxLines: 2 });
    }
  } else {
    textSize(13);
    text((i + 1) + '  ' + b.name, r.x + 8, r.y + 5);
    textStyle(NORMAL);
    if (!r.chips.length) {
      fill(FP.tok('text-muted'));
      textAlign(RIGHT, TOP);
      text('empty', r.x + r.w - 8, r.y + 5);
      textAlign(LEFT, TOP);
    }
  }
  r.chips.forEach(c => drawChip(c, false, L));
}

function drawChip(c, floating, L) {
  const card = CARD[c.id];
  if (!floating && drag && drag.moved && drag.id === c.id) {   // the dragged card's empty slot
    push(); noFill(); stroke(FP.tok('text-muted')); drawingContext.setLineDash([4, 4]);
    rect(c.x, c.y, c.w, c.h, 6); pop();
    hits.push(c);
    return;
  }
  const v = verdict[c.id];
  const sel = selected === c.id;
  push();
  if (floating) { drawingContext.shadowBlur = 8; drawingContext.shadowColor = 'rgba(0,0,0,0.25)'; }
  strokeWeight(sel ? 2.5 : (v ? 2 : 1));
  stroke(FP.tok(v ? (v.ok ? 'correct' : 'incorrect') : (sel ? 'primary' : 'text-muted')));
  fill(FP.tok(v ? (v.ok ? 'correct-bg' : 'incorrect-bg') : 'ctrl-bg'));
  if (v && !v.ok) drawingContext.setLineDash([5, 3]);
  rect(c.x, c.y, c.w, c.h, 6);
  drawingContext.setLineDash([]);
  pop();
  if (sel && v) {   // selection ring outside the verdict border
    push(); noFill(); stroke(FP.tok('primary')); strokeWeight(2); rect(c.x - 3, c.y - 3, c.w + 6, c.h + 6, 8); pop();
  }
  noStroke();
  fill(FP.tok(v ? (v.ok ? 'correct' : 'incorrect') : 'text'));
  textAlign(LEFT, CENTER);
  textStyle(sel ? BOLD : NORMAL);
  let label = (v ? (v.ok ? '✓ ' : '✗ ') : '') + card.name;
  let ts = L ? L.ts : 14;
  textSize(ts);
  while (ts > 12 && textWidth(label) > c.w - 14) textSize(--ts);
  if (textWidth(label) > c.w - 14) {
    while (label.length > 2 && textWidth(label + '…') > c.w - 14) label = label.slice(0, -1);
    label += '…';
  }
  text(label, c.x + 8, c.y + c.h / 2 + 1);
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
  if (!floating) hits.push(c);
}

function drawFeedback(r) {
  const lines = [];
  if (notice) lines.push({ t: 'ℹ ' + notice, color: FP.tok('primary-dark') });
  const s = summaryLines();
  if (s.length) {
    lines.push({ t: s[0], bold: true });
    lines.push({ t: (firstScore >= MASTERY ? FP.msg.OK + ' ' : '') + s[1], color: FP.tok(firstScore >= MASTERY ? 'correct' : 'text') });
  }
  const v = selected && verdict[selected];
  let box = null;
  if (v) box = { t: v.message, ok: v.ok };
  else if (!s.length && !notice) {
    lines.push({ t: canvasWidth >= 560
      ? 'Drag each card into a bin, or pick it in the Card list and press 1–4. Cards move freely until you press Check. After Check, click a card to read why.'
      : 'Drag each card into a bin, or pick it in the Card list and press 1–4. Press Check when the pool is empty.', muted: true });
  } else if (checked && !v) {
    lines.push({ t: 'Click a card (or pick it in the Card list) to read why.', muted: true });
  }
  K.panel(r.x, r.y, r.w, r.h, { fill: '--fp-ctrl-bg', stroke: '--fp-border' });
  const x = r.x + 10, w = r.w - 20;
  const measure = (ts, dry) => {
    let yy = r.y + 8;
    lines.forEach(p => {
      textSize(ts); textStyle(p.bold ? BOLD : NORMAL);
      fill(p.color || FP.tok(p.muted ? 'text-muted' : 'text'));
      yy = K.wrapText(p.t, x, yy, w, Math.round(ts * 1.3), { dryRun: dry });
    });
    textStyle(NORMAL);
    if (box) {
      textSize(ts);
      const by = yy + 4;
      const bh = K.wrapText(box.t, x + 8, by + 5, w - 16, Math.round(ts * 1.3), { dryRun: true }) + 5 - by;
      if (!dry) {
        K.panel(x - 2, by, w + 4, bh, { fill: box.ok ? '--fp-correct-bg' : '--fp-incorrect-bg',
          stroke: box.ok ? '--fp-correct' : '--fp-incorrect', dashed: !box.ok, weight: 2 });
        noStroke();
        fill(FP.tok(box.ok ? 'correct' : 'incorrect'));
        K.wrapText(box.t, x + 8, by + 5, w - 16, Math.round(ts * 1.3));
      }
      yy = by + bh;
    }
    return yy - r.y + 4;
  };
  noStroke();
  textAlign(LEFT, TOP);
  const ts = K.fitTextSize(t => measure(t, true), r.h, 15, 12);
  measure(ts, false);
}

function drawControlLabels() {
  noStroke();
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(canvasWidth < 560 ? 14 : 15);
  fill(FP.tok('text'));
  text('Card:', margin, K.controlLabel(0, drawHeight));
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
}

// ---------- Mouse: drag a card, or click a card then a bin ----------
function inRect(x, y, r) { return r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
function chipAt(x, y) {
  for (let i = hits.length - 1; i >= 0; i--) if (inRect(x, y, hits[i])) return hits[i];
  return null;
}
function regionAt(x, y) {
  for (const b of BINS) if (inRect(x, y, binRects[b.id])) return b.id;
  if (inRect(x, y, binRects.pool)) return 'pool';
  return null;
}

function mousePressed() {
  if (mouseY > drawHeight || mouseX < 0 || mouseX > width || mouseY < 0) return;
  const c = chipAt(mouseX, mouseY);
  pressOnBin = null;
  if (c) {
    drag = { id: c.id, dx: mouseX - c.x, dy: mouseY - c.y, sx: mouseX, sy: mouseY, moved: false };
  } else {
    pressOnBin = regionAt(mouseX, mouseY);
  }
}

function mouseDragged() {
  if (!drag || locked[drag.id]) return;
  if (!drag.moved && dist(mouseX, mouseY, drag.sx, drag.sy) > 5) drag.moved = true;
  return false;
}

function mouseReleased() {
  if (drag) {
    const d = drag;
    drag = null;
    if (d.moved && !locked[d.id]) {
      const where = regionAt(mouseX, mouseY);
      selected = d.id;
      if (where) {
        moveCard(d.id, where);
        updateControls();
        FP.announce(CARD[d.id].name + (where === 'pool' ? ' back in the pool.' : ' placed in ' + BIN[where].name + '.'));
      } else updateControls();
    } else {
      selected = d.id;   // a click selects the card (and shows its verdict after Check)
      updateControls();
      announceSelected();
    }
    return;
  }
  // a click on empty bin space moves the selected card there
  if (pressOnBin && pressOnBin === regionAt(mouseX, mouseY) && selected && !locked[selected] && loc[selected] !== pressOnBin) {
    moveSelected(pressOnBin);
  }
  pressOnBin = null;
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
