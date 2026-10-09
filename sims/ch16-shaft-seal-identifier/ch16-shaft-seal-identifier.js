// Shaft Seal Identifier
// CANVAS_HEIGHT: 760
// Explore mode first: the seven FanPedia shaft seal types, grouped in their three families, each
// with a reference infobox and a schematic cross-section. Then a quiz: 12 cards (parts, materials
// or order-line names) in shuffled order, two attempts each; a card is committed by pressing a bin.
// After each answer the correct bin's infobox opens. Mastery is 10 of 12 on the first attempt.
// Built on the FanPedia kit: FP.CardDeck (deal, two attempts, score, mastery, spec wording via
// `messages`), FP.p5 (layout, text, controls, keys), FP.msg / FP.announce (wording, live region).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js.

const K = FP.p5;
const SIM_ID = 'ch16-shaft-seal-identifier';
const CANVAS_H = 760;
let canvasWidth = 800;
let ctrlRows = 2;
let controlHeight = K.controlHeightFor(ctrlRows);
let drawHeight = CANVAS_H - controlHeight;
const MASTERY = 10;
const EXPLORE_PROMPT = 'Every shaft seal is identified by what touches the shaft. Open the bins, then start the quiz.';
const MASTERY_MSG = 'You can identify FanPedia\'s seven shaft seal types from their parts.';

// Chapter 16 spec, "Content": seven bins with their reference infobox, in three families.
const FAMILIES = [
  { name: 'Contact seals', ids: ['friction', 'vring', 'lip'] },
  { name: 'Carbon ring seals', ids: ['single', 'double'] },
  { name: 'Stuffing box seals', ids: ['box', 'purge'] }
];
const BINS = [
  { id: 'friction', name: 'Friction shaft seal', short: 'Friction', page: 149,
    info: 'Standard type; soft seal material (tacky cloth, Teflon, Viton, Nomex mineral wool, silicone sheet or Fiber Frax ceramic felt) held by a cover plate, typically aluminum. Also called tacky cloth seal.' },
  { id: 'vring', name: 'V-ring shaft seal', short: 'V-ring', page: 150,
    info: 'Teflon plate design with Chekseal and PTFE joint sealant. Also called axial shaft seal or Teflon shaft seal.' },
  { id: 'lip', name: 'Lip shaft seal', short: 'Lip', page: 151,
    info: 'Elastomer lip (Buna-N standard, Viton special) in a seal housing with a grease fitting. Also called grease seal, grease purge, double lip seal.' },
  { id: 'single', name: 'Single carbon ring seal', short: 'Single carbon', page: 152,
    info: 'One split carbon ring in a seal housing behind a cover plate; vendor supplied. Also called floating circumferential carbon ring seal, labyrinth shaft seal.' },
  { id: 'double', name: 'Double carbon ring seal', short: 'Double carbon', page: 153,
    info: 'Two split carbon rings with a lantern ring at a purge hole; vendor supplied.' },
  { id: 'box', name: 'Stuffing box seal', short: 'Stuffing box', page: 154,
    info: 'Inside plate with seal housing, Graphoil split inner rings, carbon yarn packing outer rings, outside plate with retaining ring. Also called Graphoil seal, packing gland seal.' },
  { id: 'purge', name: 'Stuffing box seal with gas purge', short: 'Box + purge', page: 155,
    info: 'Stuffing box with a Teflon lantern ring at a purge hole; ships with a 1/8-inch NPT pipe plug replaced in the field by the customer\'s purge line.' }
];
const BIN = {};
BINS.forEach(b => { BIN[b.id] = b; });

const CARDS = [
  { id: 1, answer: 'friction', text: 'An aluminum cover plate clamps a strip of tacky cloth against the shaft.',
    why: 'Soft material held by a cover plate is the friction (standard) seal.' },
  { id: 2, answer: 'lip', text: 'Order line: "Shaft Seal: Buna Rubber (lip type), Standard".',
    why: 'Buna rubber lip is the standard lip seal.' },
  { id: 3, answer: 'lip', text: 'A seal housing on the fan housing wall carries a grease fitting.',
    why: 'Only the lip seal is greased through its own housing.' },
  { id: 4, answer: 'single', text: 'One split carbon ring sits in a seal housing behind a cover plate; there is no purge hole.',
    why: 'One carbon ring without a purge is the single ring mechanical seal.' },
  { id: 5, answer: 'double', text: 'Two split carbon rings with a lantern ring between them at a purge hole.',
    why: 'Two carbon rings plus a lantern ring is the double ring mechanical seal.' },
  { id: 6, answer: 'box', text: 'Graphoil split rings inside, carbon yarn packing outside, and an outside plate with a retaining ring; no purge hole.',
    why: 'Graphoil and carbon yarn packing compressed in a box is a stuffing box.' },
  { id: 7, answer: 'purge', text: 'Carbon yarn packing and a Teflon lantern ring at a hole closed by a 1/8-inch NPT pipe plug.',
    why: 'Packing plus a lantern ring and purge plug is the purged stuffing box.' },
  { id: 8, answer: 'vring', text: 'A Teflon plate with Chekseal, called an axial shaft seal.',
    why: '"Axial shaft seal" is another name for the V-ring type.' },
  { id: 9, answer: 'friction', text: 'Seal material is Fiber Frax ceramic felt under a cover plate.',
    why: 'Fiber Frax is one of the friction seal\'s materials.' },
  { id: 10, answer: 'box', text: 'The order calls it a "packing gland seal" and lists no purge.',
    why: 'Packing gland seal is another name for the stuffing box.' },
  { id: 11, answer: 'lip', text: 'Order line: "Shaft Seal: Viton (lip type), Special".',
    why: 'Viton is the special lip material; the part is still a lip seal.' },
  { id: 12, answer: 'purge', text: 'Order line: "Shaft Seal: Graphoil Stuffing Box With Purge".',
    why: '"With Purge" adds the lantern ring and purge connection.' }
];

// Spec feedback: Correct "Correct: <bin>. <Why>." First wrong "Not this one. Look again at the parts
// named on the card." Second wrong "This is a <correct bin>. <Why>." (the card counts as missed).
const deck = new FP.CardDeck({
  cards: CARDS, shuffle: true, attempts: 2, retryMissed: false,
  noun: 'Cards', mastery: MASTERY, id: SIM_ID,
  label: a => BIN[a].name,
  reviewPointer: 'Reread "Shaft Seals" and press Start over for a new shuffle',
  messages: {
    retry: FP.msg.BAD + ' Not this one. Look again at the parts named on the card.',
    missed: res => FP.msg.BAD + ' This is a ' + BIN[res.card.answer].name + '. ' + res.card.why
  }
});

let mode = 'explore';      // 'explore' | 'quiz' (the deck's phase covers choose / feedback / summary)
let openBin = null;        // bin whose infobox is open
let wrongPick = null;      // last wrong first-attempt pick (dashed outline until the card resolves)
let feedback = null;
let sumPage = 0, sumPages = [[0, 1]];
let binButtons = [], quizButton, nextButton, pageButton, startOverButton;

const keys = K.keys.bind({
  '1': () => pressBin(0), '2': () => pressBin(1), '3': () => pressBin(2), '4': () => pressBin(3),
  '5': () => pressBin(4), '6': () => pressBin(5), '7': () => pressBin(6), Enter: enterKey
});
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, CANVAS_H);
  canvas.parent(document.querySelector('main'));
  binButtons = BINS.map((b, i) => {
    const btn = K.button((i + 1) + ' ' + b.short, () => pressBin(i));
    btn.elt.dataset.full = (i + 1) + ' ' + b.short;
    btn.elt.dataset.narrow = (i + 1) + ' ' + ['Friction', 'V-ring', 'Lip', 'Single', 'Double', 'Box', 'Purge'][i];
    btn.addClass('choice');
    btn.attribute('aria-pressed', 'false');
    return btn;
  });
  quizButton = K.button('Start the quiz', startQuiz);
  nextButton = K.button('Next card', nextCard);
  pageButton = K.button('More', turnPage);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });
  updateControls();
  describe('Shaft seal identifier. Seven FanPedia shaft seal types are shown as bins in three families: contact ' +
    'seals (friction, V-ring, lip), carbon ring seals (single, double) and stuffing box seals (plain and with gas ' +
    'purge). In explore mode each bin opens a reference infobox and a schematic cross-section. In the quiz, twelve ' +
    'cards describe a seal by its parts, materials or order-line name; commit each card to a bin, with two attempts.');
}

// ---------- Flow ----------
function inQuiz() { return mode === 'quiz' && deck.state().phase !== 'summary'; }

function pressBin(i) {
  const b = BINS[i];
  const ph = deck.state().phase;
  if (inQuiz() && ph === 'choose') {
    const res = deck.place(b.id);
    feedback = { kind: res.kind, message: res.message };
    if (res.status === 'retry') wrongPick = b.id;
    else { wrongPick = null; openBin = res.card.answer; }
    FP.announce('Committed to ' + b.name + '. ' + res.message +
      (res.status === 'retry' ? '' : ' ' + BIN[res.card.answer].name + ': ' + BIN[res.card.answer].info));
    updateControls();
    return;
  }
  if (inQuiz()) return;            // card resolved: press Next card first
  openBin = b.id;                  // explore (or after the quiz): open the infobox, never scored
  updateControls();
  FP.announce(b.name + '. ' + b.info);
}

function startQuiz() {
  mode = 'quiz';
  if (deck.state().phase !== 'choose' || deck.state().index > 0 || deck.placements.length) deck.newRound();
  openBin = null; feedback = null; wrongPick = null;
  updateControls();
  FP.announce('Quiz. Card 1 of 12. ' + deck.state().card.text + ' Press the bin it belongs in (keys 1 to 7).');
}

function nextCard() {
  if (deck.state().phase !== 'feedback') return;
  deck.next();
  feedback = null; wrongPick = null; openBin = null; sumPage = 0;
  updateControls();
  const st = deck.state();
  if (st.phase === 'summary') FP.announce(summaryList().map(p => p.t).join(' '));
  else FP.announce('Card ' + (st.index + 1) + ' of 12. ' + st.card.text);
}

// Summary: pages the results on narrow screens, or returns from a bin opened after the quiz.
function turnPage() {
  if (openBin) openBin = null;
  else sumPage = (sumPage + 1) % sumPages.length;
  updateControls();
  FP.announce('Summary. ' + summaryList().map(p => p.t).join(' '));
}

function startOver() {
  deck.newRound();
  mode = 'quiz';
  openBin = null; feedback = null; wrongPick = null; sumPage = 0;
  updateControls();
  FP.announce('Started over with a new shuffle. Card 1 of 12. ' + deck.state().card.text);
}

function enterKey() {
  if (mode === 'explore') startQuiz();
  else if (deck.state().phase === 'feedback') nextCard();
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  const st = deck.state();
  let y = K.title('Shaft Seal Identifier');
  const right = mode === 'explore' ? FP.msg.EXPLORE
    : st.phase === 'summary' ? 'All 12 cards placed'
      : 'Card ' + (st.index + 1) + ' of 12 · ' + st.attemptLabel;
  y = K.statusLine('First-try correct: ' + deck.score.firstAttempt() + ' of 12', right, null, { y: y - 4 });
  const nl = K.note(canvasWidth >= 560
    ? ['Schematic cross-sections, not to scale', 'Source: FanPedia pp. 149-155', 'Keys: 1-7 bins, Enter next']
    : ['Schematic, not to scale', 'FanPedia pp. 149-155', 'Keys 1-7, Enter'], { y: drawHeight - 6, lines: 2 });
  const top = y + 2, bottom = drawHeight - 8 - 17 * nl;
  const w = canvasWidth - 20;
  if (mode === 'quiz' && st.phase === 'summary' && !openBin) { drawSummary(10, top, w, bottom - top); return; }
  // top panel: explore prompt, the card, or (after the quiz) a pointer back to the summary
  const binsH = binsHeight(w);
  const room = bottom - top - binsH - 16;
  const infoH = Math.max(canvasWidth >= 600 ? 150 : 150, Math.min(260, room - drawTopPanel(10, top, w, 0, canvasWidth >= 600 ? 15 : 13)));
  const topH = bottom - top - binsH - infoH - 16;
  drawTopPanel(10, top, w, topH);
  drawBins(10, top + topH + 8, w, binsH);
  drawInfo(10, bottom - infoH, w, infoH);
}

function paras(list, x, y, w, ts, dry) {
  for (const p of list) {
    const s = p.small ? Math.max(12, ts - 2) : ts;
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

// With `dryTs`, returns the height the panel needs at that text size and draws nothing.
function drawTopPanel(x, y, w, h, dryTs) {
  const st = deck.state();
  const pad = 10, iw = w - 2 * pad, fpad = 7;
  let body;
  if (mode === 'explore') {
    body = [{ t: EXPLORE_PROMPT, bold: true },
      { t: 'Press a bin to open its reference infobox and cross-section. Press Start the quiz (Enter) when you are ready.', gap: 4, muted: true }];
  } else if (st.phase === 'summary') {
    body = [{ t: 'Quiz finished. ' + deck.summary().lines[0] + '.', bold: true },
      { t: 'You are reviewing a bin. Press Summary to see the results again, or Start over for a new shuffle.', gap: 4 }];
  } else {
    body = [{ t: 'Card ' + (st.index + 1) + ' of 12', muted: true, small: true },
      { t: st.card.text, bold: true, gap: 2 },
      { t: 'Which seal type is this? Press its bin to commit.', gap: 4 }];
  }
  let fb = feedback ? [{ t: feedback.message, color: FP.tok(feedback.kind === 'ok' ? 'correct' : 'incorrect') }] : [];
  // Sizing only: reserve room for the verdict while a card is open, so the infobox does not jump.
  if (dryTs && !feedback && inQuiz()) fb = [{ t: FP.msg.BAD + ' This is a ' + BIN[st.card.answer].name + '. ' + st.card.why }];
  const layout = ts => {
    let yy = paras(body, 0, 0, iw, ts, true);
    if (fb.length) yy += 6 + paras(fb, 0, 0, iw - 2 * fpad, ts, true) + 2 * fpad;
    return yy + 2 * pad - 4;
  };
  if (dryTs) return layout(dryTs);
  const ts = K.fitTextSize(layout, h, 16, 12);
  K.panel(x, y, w, h);
  let yy = paras(body, x + pad, y + pad, iw, ts, false);
  if (fb.length) {
    const fbH = paras(fb, 0, 0, iw - 2 * fpad, ts, true) + 2 * fpad;
    const ok = feedback.kind === 'ok';
    K.panel(x + pad - 3, yy + 6, iw + 6, fbH, { fill: ok ? '--fp-correct-bg' : '--fp-incorrect-bg',
      stroke: ok ? '--fp-correct' : '--fp-incorrect', dashed: !ok, weight: 2 });
    paras(fb, x + pad + fpad, yy + 6 + fpad, iw - 2 * fpad, ts, false);
  }
}

// Bins in three family groups: one row on wide screens, one row per family on narrow ones.
function wideBins() { return canvasWidth >= 600; }
const NARROW_ROW = 54;
function binsHeight(w) { return wideBins() ? 104 : 3 * NARROW_ROW + 2 * 6; }

function drawBins(x, y, w, h) {
  const st = deck.state();
  const placements = deck.placements;
  const famGap = 8, gap = 5, headH = wideBins() ? 17 : 15;
  const rows = wideBins() ? [FAMILIES] : FAMILIES.map(f => [f]);
  const rowH = wideBins() ? h : NARROW_ROW;
  rows.forEach((fams, r) => {
    const ry = y + r * (rowH + 6);
    const n = fams.reduce((a, f) => a + f.ids.length, 0);
    const tileW = (w - famGap * (fams.length - 1) - gap * (n - fams.length)) / n;
    let fx = x;
    fams.forEach(fam => {
      const fw = fam.ids.length * tileW + (fam.ids.length - 1) * gap;
      noStroke(); fill(FP.tok('text-muted')); textSize(12); textStyle(BOLD); textAlign(LEFT, TOP);
      text(fam.name, fx + 2, ry);
      textStyle(NORMAL);
      fam.ids.forEach((id, k) => {
        const b = BIN[id], i = BINS.indexOf(b);
        const tx = fx + k * (tileW + gap), ty = ry + headH, th = rowH - headH;
        const isOpen = openBin === id, isWrong = wrongPick === id;
        K.panel(tx, ty, tileW, th, {
          radius: 6, weight: isOpen || isWrong ? 2.5 : 1, dashed: isWrong,
          stroke: isWrong ? '--fp-incorrect' : isOpen ? '--fp-primary' : '--fp-border',
          fill: isOpen ? '--fp-primary-bg' : isWrong ? '--fp-incorrect-bg' : null
        });
        noStroke(); fill(FP.tok('text')); textSize(13); textStyle(BOLD); textAlign(LEFT, TOP);
        const long = (i + 1) + ' ' + b.name.replace(' shaft seal', '').replace(' seal', '');
        const label = (wideBins() ? tileW >= 104 : textWidth(long) <= tileW - 10) ? long : (i + 1) + ' ' + b.short;
        K.wrapText(label, tx + 5, ty + 4, tileW - 10, 15, { maxLines: wideBins() ? 2 : 1 });
        textStyle(NORMAL);
        // committed cards in this bin: ✓ solid / ✗ dashed chips with the card number
        const chips = placements.filter(p => p.chosen === id);
        const cw = 30, ch = 18;
        let cx = tx + 5, cy = ty + th - ch - 4;
        chips.forEach(p => {
          if (cx + cw > tx + tileW - 3) { cx = tx + 5; cy -= ch + 3; }
          K.panel(cx, cy, cw, ch, { radius: 4, weight: 1.3, dashed: !p.correct,
            fill: p.correct ? '--fp-correct-bg' : '--fp-incorrect-bg', stroke: p.correct ? '--fp-correct' : '--fp-incorrect' });
          noStroke(); fill(FP.tok(p.correct ? 'correct' : 'incorrect')); textSize(12); textAlign(CENTER, CENTER);
          text(p.card.id + (p.correct ? FP.msg.OK : FP.msg.BAD), cx + cw / 2, cy + ch / 2 + 1);
          textAlign(LEFT, TOP);
          cx += cw + 3;
        });
      });
      fx += fw + famGap;
    });
  });
}

// Reference infobox: a schematic cross-section of the open bin plus its FanPedia text.
function drawInfo(x, y, w, h) {
  K.panel(x, y, w, h, { fill: '#ffffff' });
  const pad = 10;
  if (!openBin) {
    noStroke(); fill(FP.tok('text-muted')); textSize(13); textAlign(LEFT, TOP);
    const t = mode === 'quiz' && deck.state().phase !== 'summary'
      ? 'The correct bin\'s reference infobox opens here after you answer each card.'
      : 'No bin open. Press a bin (keys 1-7) to see its reference infobox and cross-section.';
    K.wrapText(t, x + pad, y + pad, w - 2 * pad, 17);
    return;
  }
  const b = BIN[openBin];
  const dw = Math.min(260, Math.round(w * (w >= 500 ? 0.42 : 0.34)));
  drawSeal(openBin, x + 6, y + 6, dw, h - 12, w >= 500);
  const tx = x + dw + 16, tw = w - dw - 16 - pad;
  const list = [{ t: b.name, bold: true }, { t: b.info, gap: 3 }, { t: 'FanPedia p. ' + b.page, muted: true, small: true, gap: 3 }];
  const ts = K.fitTextSize(t => paras(list, 0, 0, tw, t, true) + 2 * pad, h, 15, 12);
  paras(list, tx, y + pad, tw, ts, false);
}

// Schematic cross-sections: housing wall at the left, shaft along the bottom, the seal outside the wall.
function drawSeal(id, x, y, w, h, labels) {
  const metal = FP.tok('metal'), side = FP.tok('metal-side'), edge = FP.tok('edge');
  const carbon = FP.tok('belt'), elast = FP.tok('series-4'), soft = FP.tok('accent');
  push();
  noStroke(); fill(FP.tok('draw-bg')); rect(x, y, w, h, 6);
  const sy = y + h * 0.74, sh = Math.max(10, h * 0.13);           // shaft top and height
  const wx = x + w * 0.16;                                         // housing wall
  stroke(edge); strokeWeight(1);
  fill(side); rect(x + 2, sy, w - 4, sh);                          // shaft
  fill(metal); rect(wx - 6, y + 8, 8, sy - y - 12);                // housing wall, gap above the shaft
  const u = (w - (wx - x) - 14) / 10;                              // horizontal unit
  const x0 = wx + 3;
  const lbl = [];
  const plate = (px, pw, ph, c) => { fill(c || metal); stroke(edge); rect(px, sy - ph, pw, ph - 3); };
  const ring = (px, pw, c, rh) => { fill(c); stroke(edge); rect(px, sy - (rh || h * 0.2), pw, (rh || h * 0.2)); };
  const purge = (px) => {
    stroke(FP.tok('air')); strokeWeight(2.5); drawingContext.setLineDash([5, 3]);
    line(px, y + 6, px, sy - h * 0.22); drawingContext.setLineDash([]);
    noStroke(); fill(FP.tok('air')); triangle(px - 5, sy - h * 0.24, px + 5, sy - h * 0.24, px, sy - h * 0.2);
    strokeWeight(1);
  };
  if (id === 'friction') {
    ring(x0, u * 2, soft, h * 0.18); plate(x0 + u * 2, u * 1.2, h * 0.5);
    lbl.push(['soft seal material', x0 + u, sy - h * 0.18], ['cover plate', x0 + u * 2.6, sy - h * 0.5]);
  } else if (id === 'vring') {
    fill('#ffffff'); stroke(edge); rect(x0, sy - h * 0.45, u * 1.4, h * 0.45 - 1);
    lbl.push(['Teflon plate', x0 + u * 0.7, sy - h * 0.45]);
  } else if (id === 'lip') {
    plate(x0, u * 4, h * 0.5, metal);
    fill(elast); noStroke(); quad(x0 + u * 1.5, sy - h * 0.2, x0 + u * 2.3, sy - h * 0.2, x0 + u * 3.3, sy - 1, x0 + u * 2.6, sy - 1);
    fill(edge); rect(x0 + u * 1.6, sy - h * 0.62, u * 0.8, h * 0.12);
    lbl.push(['elastomer lip', x0 + u * 2.8, sy - h * 0.08], ['grease fitting', x0 + u * 2, sy - h * 0.62]);
  } else if (id === 'single') {
    plate(x0, u * 4, h * 0.5, metal); ring(x0 + u * 1.2, u * 1.4, carbon, h * 0.2); plate(x0 + u * 4, u * 1, h * 0.55);
    lbl.push(['split carbon ring', x0 + u * 1.9, sy - h * 0.2], ['cover plate', x0 + u * 4.5, sy - h * 0.55]);
  } else if (id === 'double') {
    plate(x0, u * 6, h * 0.5, metal); ring(x0 + u * 0.8, u * 1.4, carbon, h * 0.2); ring(x0 + u * 2.4, u * 1.2, '#ffffff', h * 0.2);
    ring(x0 + u * 3.8, u * 1.4, carbon, h * 0.2); plate(x0 + u * 6, u * 1, h * 0.55); purge(x0 + u * 3);
    lbl.push(['two carbon rings', x0 + u * 1.5, sy - h * 0.2], ['lantern ring, purge', x0 + u * 3, y + 6]);
  } else {
    // stuffing box: inside plate, ring stack (Graphoil inner, carbon yarn outer), outside plate, rods
    plate(x0, u * 1, h * 0.62, metal);
    const isPurge = id === 'purge';
    const seq = isPurge ? ['g', 'g', 'L', 'c', 'c'] : ['g', 'g', 'c', 'c', 'c'];
    seq.forEach((t, k) => ring(x0 + u * (1.1 + k * 0.95), u * 0.85, t === 'g' ? edge : t === 'L' ? '#ffffff' : side, h * 0.26));
    plate(x0 + u * 6, u * 1, h * 0.55, metal);
    stroke(edge); strokeWeight(2); line(x0, y + h * 0.16, x0 + u * 7.4, y + h * 0.16); strokeWeight(1);
    if (isPurge) { purge(x0 + u * 3.4); fill(edge); noStroke(); rect(x0 + u * 3.1, y + 4, u * 0.6, 8); }
    lbl.push(['Graphoil rings', x0 + u * 2, sy - h * 0.26]);
    lbl.push(isPurge ? ['lantern ring, purge plug', x0 + u * 3.4, y + 6] : ['carbon yarn packing', x0 + u * 4.5, sy - h * 0.26]);
  }
  // labels (wide infobox only), kept inside the box
  if (labels) {
    textSize(12); noStroke();
    let ly = y + 4;
    lbl.forEach(([t, ax, ay], k) => {
      const tw = textWidth(t) + 8;
      const lx = constrain(ax - tw / 2, x + 2, x + w - tw - 2);
      const lyy = k === 0 ? y + h * 0.33 : y + 4;
      stroke(FP.tok('text-muted')); line(ax, ay, ax, lyy + 16);
      noStroke(); fill(255, 255, 255, 235); rect(lx, lyy, tw, 16, 3);
      fill(FP.tok('text')); textAlign(LEFT, TOP); text(t, lx + 4, lyy + 2);
      ly += 18;
    });
  }
  noStroke(); fill(FP.tok('text-muted')); textSize(12); textAlign(LEFT, BOTTOM);
  text('fan side', x + 4, y + h - 2);
  textAlign(RIGHT, BOTTOM); text('shaft', x + w - 4, y + h - 2);
  pop();
}

// ---------- Summary ----------
function summaryList() {
  const s = deck.summary();
  const list = [{ t: s.lines[0] + '.', bold: true }];
  list.push({ t: s.mastered ? FP.msg.OK + ' ' + MASTERY_MSG + ' ' + s.lines[1] : s.lines[1], color: FP.tok(s.mastered ? 'correct' : 'text') });
  list.push({ t: 'Press any bin (keys 1-7) to review its infobox; Start over deals a new shuffle.', muted: true, gap: 4 });
  const notFirst = deck.placements.filter(p => !(p.correct && p.attempts === 1));
  if (!notFirst.length) list.push({ t: 'No cards missed.', gap: 6 });
  else {
    list.push({ t: 'Cards not correct on the first try:', bold: true, gap: 6 });
    notFirst.forEach(p => list.push({
      t: (p.correct ? FP.msg.OK + ' (second try) ' : FP.msg.BAD + ' ') + 'Card ' + p.card.id + ': ' + p.card.text + ' → ' + BIN[p.card.answer].name + '.',
      color: FP.tok(p.correct ? 'text' : 'incorrect'), gap: 3, small: true
    }));
  }
  return list;
}

function drawSummary(x, y, w, h) {
  K.panel(x, y, w, h);
  const pad = 10, iw = w - 2 * pad;
  const list = summaryList();
  const head = list.slice(0, 4), rows = list.slice(4);
  const fits = ts => paras(list, 0, 0, iw, ts, true) + 2 * pad <= h;
  let ts = 15;
  while (ts > 12 && !fits(ts)) ts--;
  let pages = [[0, rows.length]];
  if (!fits(ts)) {   // narrow: page the missed list
    pages = [];
    const avail = h - 2 * pad - paras(head, 0, 0, iw, 12, true);
    let start = 0;
    while (start < rows.length) {
      let end = start + 1;
      while (end < rows.length && paras(rows.slice(start, end + 1), 0, 0, iw, 12, true) <= avail) end++;
      pages.push([start, end]); start = end;
    }
  }
  if (pages.length !== sumPages.length) { sumPages = pages; sumPage = 0; updateControls(); }
  sumPages = pages;
  const [a, b] = sumPages[Math.min(sumPage, sumPages.length - 1)];
  let yy = paras(head, x + pad, y + pad, iw, ts, false);
  paras(rows.slice(a, b), x + pad, yy, iw, ts, false);
}

// ---------- Controls ----------
function positionControls() {
  const narrow = canvasWidth < 480;
  binButtons.forEach(b => b.html(narrow ? b.elt.dataset.narrow : b.elt.dataset.full));
  for (let pass = 0; pass < 2; pass++) {
    let row = K.flowButtons(0, binButtons);
    row = K.flowButtons(row, [quizButton, nextButton, pageButton, null, startOverButton]);
    const rows = Math.max(1, row);
    if (rows === ctrlRows) break;
    ctrlRows = rows;
    controlHeight = K.controlHeightFor(ctrlRows);
    drawHeight = CANVAS_H - controlHeight;
    K.config({ drawHeight, controlHeight });
  }
  nextButton.html(deck.state().isLast ? 'Finish' : (narrow ? 'Next' : 'Next card'));
}

function updateControls() {
  const had = document.activeElement;
  const st = deck.state();
  const quizOn = inQuiz();
  binButtons.forEach((b, i) => {
    const id = BINS[i].id;
    K.setEnabled(b, !quizOn || st.phase === 'choose');
    b.attribute('aria-pressed', !quizOn && openBin === id ? 'true' : 'false');
    b.attribute('aria-label', BINS[i].name + (quizOn ? ': commit the card here' : ': open the infobox') + ' (key ' + (i + 1) + ')');
  });
  if (mode === 'explore') { quizButton.show(); quizButton.html('Start the quiz'); } else quizButton.hide();
  if (quizOn) nextButton.show(); else nextButton.hide();
  K.setEnabled(nextButton, st.phase === 'feedback');
  if (mode === 'quiz' && st.phase === 'summary') {
    pageButton.show();
    pageButton.html(openBin ? 'Summary' : sumPages.length > 1 ? 'More results' : 'Summary');
    K.setEnabled(pageButton, !!openBin || sumPages.length > 1);
  } else pageButton.hide();
  if (mode === 'explore') startOverButton.hide(); else startOverButton.show();
  positionControls();
  K.keepFocus(had, [nextButton, ...binButtons, quizButton, pageButton, startOverButton]);
  if (st.phase === 'feedback' && (had === document.body || binButtons.some(b => b.elt === had))) nextButton.elt.focus();
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, CANVAS_H);
  positionControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
