// Isolation Hardware Sorter - p5.js MicroSim (Chapter 23: Spring Isolators, Restraints and
// Field Measurement)
// CANVAS_HEIGHT: 685
// Eleven job-site descriptions, dealt in a shuffled order, each placed in one of ten bins:
// four spring isolator types, snubber, thrust restraint, and four mounting styles. Two
// attempts per card; the first attempt counts toward mastery (9 of 11). A missed card moves
// to its correct bin. The summary lists every card missed on the first attempt with its reason.
// Built on the FanPedia kit: FP.CardDeck (deal, attempts, lock, score, mastery), FP.p5
// (layout, text, panels, controls, keys, focus), FP.msg / FP.announce (wording, live region).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js (load them
// before this file, also in the p5.js editor).

const K = FP.p5;
const SIM_ID = 'ch23-isolation-hardware-sorter';
let canvasWidth = 800;
const drawHeight = 640;
const controlHeight = K.controlHeightFor(1);   // Next card | Start over (More missed in the summary)
const canvasHeight = drawHeight + controlHeight;
const MASTERY = 9;
const PROMPT = 'Which hardware does this job call for?';

// Ten bins (chapter 23 spec, "Bins"); key: 1-9, then 0 for the tenth.
const BINS = [
  { id: 'open', name: 'Open spring isolator', short: 'Open spring' },
  { id: 'housed', name: 'Housed spring isolator', short: 'Housed spring' },
  { id: 'restrained', name: 'Restrained spring isolator', short: 'Restrained spring' },
  { id: 'seismic', name: 'Seismic spring isolator', short: 'Seismic spring' },
  { id: 'snubber', name: 'Snubber', short: 'Snubber' },
  { id: 'thrust', name: 'Thrust restraint', short: 'Thrust restraint' },
  { id: 'hangers', name: 'Isolation hangers (ceiling hung)', short: 'Isolation hangers' },
  { id: 'direct', name: 'Isolators directly under fan', short: 'Directly under fan' },
  { id: 'rails', name: 'Isolation rails', short: 'Isolation rails' },
  { id: 'angle', name: 'Isolator mounting angle', short: 'Mounting angle' }
];
const BIN_NAME = Object.fromEntries(BINS.map(b => [b.id, b.name]));
const keyFor = i => (i === 9 ? '0' : String(i + 1));

// Chapter 23 spec, "Content" table. look: the feature named in Why (retry hint);
// short: chip text.
const CARDS = [
  { id: 1, answer: 'hangers', short: 'Hangs from roof steel',
    text: 'The fan hangs from roof steel; the isolators go between the overhead structure and the fan on threaded rod by others.',
    why: 'A fan suspended from structure with isolators between structure and fan uses isolation hangers.',
    look: 'a fan suspended from overhead structure, with the isolators between structure and fan' },
  { id: 2, answer: 'thrust', short: 'Slides back at every start',
    text: 'A horizontal-discharge fan on springs slides back at every start; the spec asks for two devices, 180° apart, tying the fan discharge to the discharge duct with threaded rod.',
    why: 'Thrust restraints are ceiling hung type isolators attached to fan discharge and duct, two per fan, 180° apart.',
    look: 'two devices per fan, 180° apart, attached to the fan discharge and the duct' },
  { id: 3, answer: 'angle', short: 'Inlet side unsupported',
    text: 'The inlet side of the fan has no structural member for an isolator to bear on.',
    why: 'A mounting angle is used when the fan inlet does not have a structural support.',
    look: 'a fan inlet without a structural support' },
  { id: 4, answer: 'rails', short: 'Between two flat bars',
    text: 'Isolators sit between two flat bars; the top bar bolts to the fan\'s foundation holes and the bottom bar anchors to the floor.',
    why: 'That is FanPedia\'s definition of isolation rails.',
    look: 'isolators placed between two pieces of flat bar' },
  { id: 5, answer: 'direct', short: '30-in impeller, no base',
    text: 'A fan with a 30-inch impeller (illustrative) gets springs bolted straight under the foundation holes in its own structure, with no base.',
    why: 'Direct mounting is usually limited to impellers of 36.5 in or less; 30 in qualifies.',
    look: 'isolators under the fan\'s own foundation holes on an impeller of 36.5 in or less' },
  { id: 6, answer: 'direct', short: 'Swingout on flat pads',
    text: 'A swingout housed centrifugal fan with a large impeller sits on flat pads bolted directly under its own structure.',
    why: 'Swingout housed centrifugal fans are the exception: any impeller size, flat pads only.',
    look: 'the swingout housed centrifugal exception: any impeller size, flat pads only' },
  { id: 7, answer: 'seismic', short: 'Housing nearly surrounds spring',
    text: 'The spec calls for spring mounts whose housings nearly surround the entire spring so they withstand earthquake loads.',
    why: 'A housing that nearly surrounds the spring for seismic loads defines a seismic spring.',
    look: 'a housing that nearly surrounds the spring for seismic loads' },
  { id: 8, answer: 'snubber', short: 'Brackets with elastomer',
    text: 'A separate device, one bracket on the base and one on the floor with elastomeric material between them, limits movement in any direction; it is used along with the isolators.',
    why: 'A snubber works with isolators as a shock absorber; the elastomer prevents metal-to-metal contact.',
    look: 'a device that works with the isolators as a shock absorber, with elastomer to prevent metal-to-metal contact' },
  { id: 9, answer: 'restrained', short: 'Frame limits travel',
    text: 'Springs with a frame added to limit vertical and horizontal travel; no seismic requirement is stated.',
    why: 'A housing or frame that restrains vertical and/or horizontal motion defines a restrained spring.',
    look: 'a housing or frame that restrains vertical and/or horizontal motion' },
  { id: 10, answer: 'open', short: 'Bare coil, ceiling hung',
    text: 'A bare coil spring in a formed metal surround on a ceiling hung fan; it does nothing to resist aerodynamic forces.',
    why: 'Open springs offer no restriction of aerodynamic motion; ceiling hung types sit in a formed metal surround.',
    look: 'a spring with no restriction of aerodynamic motion' },
  { id: 11, answer: 'housed', short: 'Housing holds two springs',
    text: 'An enclosed housing holds two springs that act exactly like open springs.',
    why: 'Housed springs work like open springs inside an enclosed housing that can hold one or more springs.',
    look: 'springs that work like open springs inside an enclosed housing' }
].map(c => Object.assign(c, { hint: 'Look for ' + c.look + '.' }));

// Spec feedback: Correct "Correct. <Why>."; Incorrect "Not quite. Look for <feature>." (retry);
// after the second wrong attempt the card moves to its correct bin and the Why text is shown.
const deck = new FP.CardDeck({
  cards: CARDS, shuffle: true, attempts: 2, retryMissed: false,
  noun: 'Cards', mastery: MASTERY, id: SIM_ID,
  label: a => BIN_NAME[a],
  reviewPointer: 'Reread "Open, Housed, Restrained and Seismic Springs", "Where the Isolators Go" and ' +
    '"Snubbers and Thrust Restraints", then press Start over',
  messages: {
    correct: res => FP.msg.OK + ' Correct. ' + res.card.why
  }
});

let feedback = null;      // {kind, message}
let tried = [];           // bins tried wrongly on the face-up card
let missPage = 0;
let binButtons = [], nextButton, startOverButton, moreButton;
let layout = null;        // bin rectangles for drawing and button placement

const keyMap = { Enter: enterKey };
BINS.forEach((b, i) => { keyMap[keyFor(i)] = () => choose(i); });
const keys = K.keys.bind(keyMap);
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  binButtons = BINS.map((b, i) => {
    const btn = K.button(keyFor(i) + ' ' + b.name, () => choose(i));
    btn.addClass('choice');
    btn.addClass('ihs-bin');
    btn.attribute('aria-label', b.name + ' (key ' + keyFor(i) + ')');
    return btn;
  });
  nextButton = K.button('Next card', nextCard);
  moreButton = K.button('More missed', morePage, { variant: 'secondary' });
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });
  updateControls();
  describe('Isolation hardware sorter. Eleven job-site descriptions are dealt one at a time in a ' +
    'shuffled order. Place each in one of ten bins: open, housed, restrained or seismic spring isolator, ' +
    'snubber, thrust restraint, isolation hangers, isolators directly under the fan, isolation rails, or ' +
    'isolator mounting angle. A wrong first placement gives a hint and a second try; a second miss moves ' +
    'the card to its correct bin. The summary shows the first-attempt score and the missed descriptions.');
}

// ---------- Flow ----------
function choose(i) {
  const st = deck.state();
  if (st.phase !== 'choose' || tried.includes(BINS[i].id)) return;
  const res = deck.place(BINS[i].id);
  if (res.status === 'ignored') return;
  feedback = { kind: res.kind, message: res.message };
  if (res.status !== 'correct') tried.push(BINS[i].id);   // wrong picks stay marked until Next
  FP.announce('Placed in ' + BINS[i].name + '. ' + res.message);
  updateControls();
}

function nextCard() {
  if (deck.state().phase !== 'feedback') return;
  deck.next();
  feedback = null;
  tried = [];
  missPage = 0;
  updateControls();
  const s = deck.state();
  if (s.phase === 'summary') {
    const sum = deck.summary();
    FP.announce(sum.lines.join(' ') + ' ' + firstMisses().length + ' cards missed on the first attempt.');
  } else {
    FP.announce('Card ' + (s.index + 1) + ' of ' + CARDS.length + '. ' + s.card.text + ' ' + PROMPT);
  }
}

function startOver() {
  deck.newRound();
  feedback = null;
  tried = [];
  missPage = 0;
  updateControls();
  FP.announce('Started over. Card 1 of ' + CARDS.length + '. ' + deck.state().card.text + ' ' + PROMPT);
}

function enterKey() { if (deck.state().phase === 'feedback') nextCard(); }

// Cards not right on the first attempt, in deal order: [{k, card, correct, attempts}]
function firstMisses() {
  return deck.placements.map((p, i) => Object.assign({ k: i + 1 }, p))
    .filter(p => !(p.correct && p.attempts === 1));
}

function scoreLine() {
  return 'First-attempt correct: ' + deck.score.firstAttempt() + ' of ' + CARDS.length + '; mastery at ' + MASTERY + '.';
}

// ---------- Layout ----------
function computeLayout() {
  const wide = canvasWidth >= 640;
  const cols = wide ? 5 : 2, rows = wide ? 2 : 5;
  const top = wide ? 74 : 92;
  const cardH = wide ? 150 : (canvasWidth < 400 ? 200 : 172);
  const gap = 6;
  const binTop = top + cardH + 8, binBottom = drawHeight - 24;
  const bw = (canvasWidth - 20 - (cols - 1) * gap) / cols;
  const bh = (binBottom - binTop - (rows - 1) * gap) / rows;
  const bins = BINS.map((b, i) => ({
    x: 10 + (i % cols) * (bw + gap), y: binTop + Math.floor(i / cols) * (bh + gap), w: bw, h: bh
  }));
  return { wide, top, cardH, bins, btnH: wide ? 40 : 30 };
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  if (!layout) layout = computeLayout();
  const st = deck.state();
  let y = K.title('Isolation Hardware Sorter');
  const right = st.phase === 'summary' ? 'All 11 cards placed'
    : 'Card ' + (st.index + 1) + ' of ' + CARDS.length + (st.phase === 'choose' ? ' · ' + st.attemptLabel : '');
  K.statusLine(scoreLine(), right, null, { y: y - 4 });
  K.note(canvasWidth >= 560
    ? ['Source: FanPedia pp. 133-135, 196-197', 'Item 5 impeller size is illustrative', 'Keys: 1-9 and 0 place, Enter goes on']
    : ['FanPedia pp. 133-135, 196-197', 'Keys 1-9, 0, Enter'], { y: drawHeight - 6 });
  const L = layout;
  if (st.phase === 'summary') {
    drawSummary(10, L.top, canvasWidth - 20, drawHeight - 26 - L.top);
    return;
  }
  K.panel(10, L.top, canvasWidth - 20, L.cardH);
  drawCard(20, L.top + 7, canvasWidth - 40, L.cardH - 12);
  drawBins();
}

function paras(list, x, y, w, ts, dry) {
  for (const p of list) {
    const s = p.big ? ts + 1 : (p.small ? Math.max(12, ts - 2) : ts);
    textSize(s);
    textStyle(p.bold ? BOLD : NORMAL);
    noStroke();
    fill(p.color || FP.tok(p.muted ? 'text-muted' : 'text'));
    y += p.gap || 0;
    y = K.wrapText(p.t, x, y, w, Math.round(s * 1.3), { dryRun: dry, maxLines: p.maxLines });
  }
  textStyle(NORMAL);
  return y;
}

function drawCard(x, y, w, h) {
  const st = deck.state();
  const body = [
    { t: 'Job description, card ' + (st.index + 1) + ' of ' + CARDS.length, muted: true, small: true },
    { t: st.card.text, bold: true, big: true, gap: 2 }
  ];
  if (!feedback) body.push({ t: PROMPT, gap: 4 });
  const fb = feedback ? [{ t: feedback.message, color: FP.tok(feedback.kind === 'ok' ? 'correct' : 'incorrect') }] : [];
  const pad = 6;
  const measure = ts => {
    let yy = paras(body, x, y, w, ts, true);
    if (fb.length) yy = paras(fb, x + pad, yy + 5 + pad, w - 2 * pad, ts, true) + pad;
    return yy - y;
  };
  const ts = K.fitTextSize(measure, h, 16, 12);
  let yy = paras(body, x, y, w, ts, false);
  if (fb.length) {
    const fbTop = yy + 5;
    const fbH = paras(fb, x + pad, fbTop + pad, w - 2 * pad, ts, true) + pad - fbTop;
    const ok = feedback.kind === 'ok';
    K.panel(x - 3, fbTop, w + 6, Math.min(fbH, y + h - fbTop + 4), {
      fill: ok ? '--fp-correct-bg' : '--fp-incorrect-bg', stroke: ok ? '--fp-correct' : '--fp-incorrect',
      dashed: !ok, weight: 2, radius: 6
    });
    paras(fb, x + pad, fbTop + pad, w - 2 * pad, ts, false);
  }
}

// Bin panels; locked cards sit in their correct bin (✓ solid first try, ✓ 2nd try, ✗ dashed moved).
function drawBins() {
  const L = layout;
  const placed = deck.placements.map((p, i) => Object.assign({ k: i + 1 }, p));
  BINS.forEach((b, i) => {
    const r = L.bins[i];
    const wrongPick = tried.includes(b.id);
    K.panel(r.x, r.y, r.w, r.h, { stroke: wrongPick ? '--fp-incorrect' : '--fp-border',
      dashed: wrongPick, weight: wrongPick ? 2 : 1 });
    const chips = placed.filter(p => p.card.answer === b.id);
    const cy0 = r.y + L.btnH + 8;
    const room = r.y + r.h - 4 - cy0;
    if (!chips.length) {
      noStroke();
      fill(FP.tok('text-muted'));
      textSize(12);
      textAlign(CENTER, CENTER);
      if (room >= 14) text(wrongPick ? '✗ not this one' : 'Empty', r.x + r.w / 2, cy0 + Math.min(room, 22) / 2);
      textAlign(LEFT, TOP);
      return;
    }
    if (L.wide) {
      const chipH = Math.min(36, (room - 4) / 2);
      chips.forEach((p, j) => chip(r.x + 5, cy0 + j * (chipH + 4), r.w - 10, chipH, p, true));
    } else {
      const cw = (r.w - 10 - 4) / 2;
      chips.forEach((p, j) => chip(r.x + 5 + j * (cw + 4), cy0, cw, Math.min(20, room), p, false));
    }
  });
}

function chip(x, y, w, h, p, withText) {
  const first = p.correct && p.attempts === 1;
  K.panel(x, y, w, h, { radius: 4, weight: 1.5, dashed: !p.correct,
    fill: p.correct ? '--fp-correct-bg' : '--fp-incorrect-bg', stroke: p.correct ? '--fp-correct' : '--fp-incorrect' });
  noStroke();
  fill(FP.tok(p.correct ? 'correct' : 'incorrect'));
  textSize(12);
  textAlign(LEFT, TOP);
  const mark = (p.correct ? FP.msg.OK : FP.msg.BAD) + ' ' + p.k;
  const tag = first ? '' : (p.correct ? ' (2nd try)' : ' (moved)');
  if (!withText) {
    textAlign(LEFT, CENTER);
    fitLine(mark + (p.correct && !first ? ' 2nd' : ''), x + 4, y + h / 2 + 1, w - 8);
    return;
  }
  K.wrapText(mark + tag + ': ' + p.card.short, x + 4, y + 3, w - 8, 15, { maxLines: Math.max(1, Math.floor((h - 4) / 15)) });
}

function fitLine(s, x, y, maxW) {
  if (textWidth(s) > maxW) {
    while (s.length > 2 && textWidth(s + '…') > maxW) s = s.slice(0, -1);
    s += '…';
  }
  text(s, x, y);
}

// Summary: first-attempt score, mastery, and the cards missed on the first attempt with reasons.
function drawSummary(x, y, w, h) {
  K.panel(x, y, w, h);
  const s = deck.summary();
  const misses = firstMisses();
  const head = [
    { t: s.lines[0], bold: true, big: true },
    { t: (s.mastered ? FP.msg.OK + ' ' : '') + s.lines[1], color: FP.tok(s.mastered ? 'correct' : 'text'), gap: 2 }
  ];
  const items = misses.map(m => ({
    t: '• ' + m.card.text + ' → ' + BIN_NAME[m.card.answer] +
      (m.correct ? ' (right on the second try). ' : ' (missed twice). ') + m.card.why, gap: 4
  }));
  const ix = x + 10, iw = w - 20, iy = y + 8, ih = h - 16;
  const ts = canvasWidth >= 640 ? 15 : 13;
  let yy = paras(head, ix, iy, iw, ts, false);
  if (!items.length) {
    paras([{ t: 'No cards missed on the first attempt. Press Start over for a new order.', gap: 8 }], ix, yy, iw, ts, false);
    return;
  }
  yy = paras([{ t: 'Missed on the first attempt (' + items.length + '):', bold: true, gap: 8 }], ix, yy, iw, ts, false);
  // Page the list when it does not fit (the More missed button turns the page)
  const pages = [];
  let cur = [], used = 0;
  const avail = iy + ih - yy - 18;
  items.forEach(it => {
    const hgt = paras([it], ix, 0, iw, ts, true);
    if (cur.length && used + hgt > avail) { pages.push(cur); cur = []; used = 0; }
    cur.push(it); used += hgt;
  });
  if (cur.length) pages.push(cur);
  const page = missPage % pages.length;
  paras(pages[page], ix, yy, iw, ts, false);
  if (pages.length > 1) {
    noStroke();
    fill(FP.tok('text-muted'));
    textSize(12);
    textAlign(LEFT, BOTTOM);
    text('Page ' + (page + 1) + ' of ' + pages.length + ' · press More missed for the rest', ix, y + h - 6);
  }
  summaryPages = pages.length;
  syncMoreButton();
}

// The More missed button shows only when the summary list needs more than one page.
let summaryPages = 1, moreVisible = false;
function syncMoreButton() {
  const want = deck.state().phase === 'summary' && summaryPages > 1;
  if (want === moreVisible) return;
  moreVisible = want;
  if (want) moreButton.show(); else moreButton.hide();
  positionControls();
}

function morePage() {
  missPage++;
  FP.announce('Missed list, page ' + ((missPage % summaryPages) + 1) + ' of ' + summaryPages + '.');
}

// ---------- Controls ----------
function positionControls() {
  layout = computeLayout();
  const L = layout;
  BINS.forEach((b, i) => {
    const r = L.bins[i];
    const btn = binButtons[i];
    const wrong = tried.includes(b.id);
    btn.html((wrong && L.wide ? FP.msg.BAD + ' ' : '') + keyFor(i) + ' ' + (L.wide ? b.name : b.short));
    btn.attribute('aria-label', b.name + ' (key ' + keyFor(i) + ')' + (wrong ? ', not this one' : ''));
    btn.size(r.w - 8);
    btn.style('height', L.btnH + 'px');
    btn.position(r.x + 4, r.y + 4);
  });
  K.flowButtons(0, [nextButton, moreButton, null, startOverButton]);
}

function updateControls() {
  const had = document.activeElement;
  const st = deck.state();
  const done = st.phase === 'summary';
  binButtons.forEach((b, i) => {
    K.setEnabled(b, st.phase === 'choose' && !tried.includes(BINS[i].id));
    if (done) b.hide(); else b.show();
  });
  if (done) nextButton.hide(); else nextButton.show();
  K.setEnabled(nextButton, st.phase === 'feedback');
  nextButton.html(st.isLast ? 'Finish' : 'Next card');
  nextButton.attribute('aria-label', st.isLast ? 'Finish and see the summary' : 'Next card');
  summaryPages = 1;
  moreVisible = true;          // forces syncMoreButton to hide it until a summary needs it
  syncMoreButton();
  positionControls();
  K.keepFocus(had, [nextButton, ...binButtons, moreButton, startOverButton]);
  if (st.phase === 'feedback') nextButton.elt.focus();
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
