// Motor Base Selector
// CANVAS_HEIGHT: 600
// Eight illustrative fan-and-motor cases, in a fixed order. For each one the learner chooses one
// of five motor base styles and commits it with Check: one attempt, the correct base and the rule
// are shown at once, and a checked case cannot be changed. A reference table of frame ranges and
// typical mountings (FanPedia pp. 76-78) opens at any time. Mastery is 7 of 8 on the first
// attempt; after case 8 a summary lists every case with the learner's choice, the correct base and
// the reason. Rules: Chapter 15 "Mounting the Motor on a Belt-Driven Fan".
// Built on the FanPedia kit: FP.CardDeck (fixed deal, lock, score, mastery, spec wording via
// `messages`), FP.p5 (layout, text, controls, keys), FP.msg / FP.announce (wording, live region).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js.

const K = FP.p5;
const SIM_ID = 'ch15-motor-base-selector';
const CANVAS_H = 600;
let canvasWidth = 800;
let ctrlRows = 2;                                  // grows to 3-4 when the buttons wrap
let controlHeight = K.controlHeightFor(ctrlRows);
let drawHeight = CANVAS_H - controlHeight;
const MASTERY = 7;
const PROMPT = 'Which motor base fits this fan and motor?';

// Chapter 15 spec, "Content": the five base styles and the reference table rows.
const BINS = [
  { id: 'nema', name: 'NEMA type slide base', short: 'NEMA slide', frame: '48 to 445',
    mounting: 'Arr. 1, 3, 9, 9F, 9H, 9ST; plenum 1, 3, 3HS, 3VS, 3SM; pedestal plug 1P, 9P' },
  { id: 'rails', name: 'Heavy-duty slide rails', short: 'HD rails', frame: '440, 500 and 5000 series',
    mounting: 'On base; on pedestal for Arr. 9H only' },
  { id: 'auto', name: 'Automotive pivot base', short: 'Auto pivot', frame: 'Not stated',
    mounting: 'Arr. 9H pedestal, Arr. 9SS swingout, Arr. 3 specially mounted; mostly automotive' },
  { id: 'post', name: 'Standard post mount', short: 'Post mount', frame: '48 to 215',
    mounting: 'Tubular centrifugal and axial Arr. 9; plenum 3HA, 3VA; plug Arr. 9' },
  { id: 'pivot', name: 'Pivot/bolted adjustable base', short: 'Pivot/bolted', frame: '254 to 445',
    mounting: 'Tubular centrifugal and axial Arr. 9; plenum 3HA, 3VA; plug Arr. 9' }
];
const BIN = {};
BINS.forEach(b => { BIN[b.id] = b; });

// The eight cases, in the spec's order. short: summary label.
const CASES = [
  { id: 1, answer: 'nema', short: '326T, Arr. 9 housed centrifugal',
    text: '326T motor on an Arrangement 9 housed centrifugal fan, general industry.',
    why: '326 is within 48 to 445, and Arrangement 9 is on the slide base mounting list.' },
  { id: 2, answer: 'rails', short: '5008S, Arr. 1 floor-mounted',
    text: '5008S motor on a floor-mounted Arrangement 1 fan.',
    why: 'The 5000 series is beyond the NEMA slide base range and is listed for heavy-duty slide rails.' },
  { id: 3, answer: 'post', short: '184T, Arr. 9 tubular centrifugal',
    text: '184T motor on an Arrangement 9 tubular centrifugal fan.',
    why: '184 is within 48 to 215, the standard post mount range for tubular centrifugal Arrangement 9.' },
  { id: 4, answer: 'pivot', short: '286T, Arr. 3HA plenum',
    text: '286T motor on an Arrangement 3HA plenum fan.',
    why: '286 is above 215 and within 254 to 445, the pivot/bolted range for plenum Arrangement 3HA.' },
  { id: 5, answer: 'post', short: '213T, Arr. 3VA plenum',
    text: '213T motor on an Arrangement 3VA plenum fan.',
    why: '213 is within 48 to 215, and plenum Arrangement 3VA is on the post mount list.' },
  { id: 6, answer: 'auto', short: 'Arr. 9SS swingout, automotive, CW',
    text: 'Arrangement 9SS swingout fan for an automotive plant, clockwise rotation.',
    why: 'Arrangement 9SS is listed only for automotive pivot bases; with clockwise rotation the motor goes in position L.' },
  { id: 7, answer: 'rails', short: '449T, Arr. 3 plenum',
    text: '449T motor on an Arrangement 3 plenum fan.',
    why: '449 is a 440-series frame above the 445 limit of the NEMA slide base.' },
  { id: 8, answer: 'nema', short: '254T, Arr. 9P pedestal plug',
    text: '254T motor on an Arrangement 9P pedestal plug fan.',
    why: 'Pedestal plug fans in Arrangement 9P are on the NEMA slide base mounting list, and 254 is within 48 to 445.' }
];

// Spec feedback: Correct: "Correct: <base>. <Why>". Incorrect: "Not quite. The correct base is <base>. <Why>".
const deck = new FP.CardDeck({
  cards: CASES, shuffle: false, attempts: 1, retryMissed: false,
  noun: 'Cases', mastery: MASTERY, id: SIM_ID,
  label: a => BIN[a].name,
  reviewPointer: 'Reread "Mounting the Motor on a Belt-Driven Fan" and its frame-range table, then press Start over',
  messages: {
    missed: res => FP.msg.BAD + ' Not quite. The correct base is ' + BIN[res.card.answer].name + '. ' + res.card.why
  }
});

let pending = null;        // bin chosen, not checked yet
let feedback = null;       // {kind, message}
let notice = '';
let tableOpen = false;     // reference table shown in place of the bins
let tablePage = 0;         // narrow screens: the table is split into pages of rows
let tablePages = [[0, 5]];
let sumPage = 0;           // summary page (narrow screens split the eight rows)
let sumPages = [[0, CASES.length]];
let binButtons = [], checkButton, nextButton, tableButton, pageButton, startOverButton;

const keys = K.keys.bind({
  '1': () => choose(0), '2': () => choose(1), '3': () => choose(2), '4': () => choose(3), '5': () => choose(4),
  r: toggleTable, Enter: enterKey
});
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, CANVAS_H);
  canvas.parent(document.querySelector('main'));
  binButtons = BINS.map((b, i) => {
    const btn = K.button((i + 1) + ' ' + b.short, () => choose(i));
    btn.elt.dataset.full = (i + 1) + ' ' + b.short;
    btn.elt.dataset.short = (i + 1) + ' ' + b.short.split(/[ /]/)[0].replace('HD', 'Rails');
    btn.addClass('choice');
    btn.attribute('aria-pressed', 'false');
    btn.attribute('aria-label', b.name + ' (key ' + (i + 1) + ')');
    return btn;
  });
  checkButton = K.button(FP.msg.CHECK, checkCase);
  nextButton = K.button('Next case', nextCase);
  tableButton = K.button('Reference table', toggleTable);
  tableButton.attribute('aria-pressed', 'false');
  pageButton = K.button('Show cases 5-8', turnPage);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });
  updateControls();
  describe('Motor base selector. Eight illustrative cases give a motor frame, a fan type and arrangement, ' +
    'and sometimes the industry. For each, choose one of five base styles (NEMA type slide base, heavy-duty ' +
    'slide rails, automotive pivot base, standard post mount, pivot/bolted adjustable base) and press Check. ' +
    'A reference table of frame ranges and typical mountings opens at any time. Each case is marked correct or ' +
    'incorrect with the rule, and after case 8 a summary lists every case with your choice and the correct base.');
}

// ---------- Flow ----------
function choose(i) {
  if (deck.state().phase !== 'choose') return;
  pending = BINS[i].id;
  notice = '';
  updateControls();
  FP.announce(BINS[i].name + ' selected. Press Check to commit.');
}

function checkCase() {
  if (deck.state().phase !== 'choose') return;
  if (!pending) return setNotice('Choose a base first (keys 1-5), then press Check.');
  const res = deck.place(pending);
  tableOpen = false;          // the verdict needs the room; the table can be reopened
  tablePage = 0;
  feedback = { kind: res.kind, message: res.message };
  pending = null;
  FP.announce(res.message + ' ' + deck.state().scoreLabel.replace(/^Cases correct/, 'Correct') + '.');
  updateControls();
}

function nextCase() {
  if (deck.state().phase !== 'feedback') return;
  deck.next();
  feedback = null;
  notice = '';
  sumPage = 0;
  updateControls();
  const s = deck.state();
  if (s.phase === 'summary') {
    FP.announce(deck.summary().lines.join('. ') + ' The summary lists every case with your choice and the correct base.');
  } else {
    FP.announce('Case ' + (s.index + 1) + ' of ' + CASES.length + '. ' + s.card.text + ' ' + PROMPT);
  }
}

function toggleTable() {
  if (deck.state().phase === 'summary') return;
  if (tableOpen && tablePage < tablePages.length - 1) tablePage++;   // next page of rows
  else { tableOpen = !tableOpen; tablePage = 0; }
  updateControls();
  // Announce after the next frame, once draw() has split the table into pages for this width.
  setTimeout(() => {
    const [a, b] = tablePages[Math.min(tablePage, tablePages.length - 1)];
    const rows = tablePages.length > 1 ? BINS.slice(a, b) : BINS;
    const which = tablePages.length < 2 ? '' : (b - a === 1 ? ', row ' + b : ', rows ' + (a + 1) + ' to ' + b) + ' of 5';
    FP.announce(tableOpen ? 'Reference table' + which + '. ' +
      rows.map(r => r.name + ': frame range ' + r.frame + '; typical mounting ' + r.mounting + '.').join(' ')
      : 'Reference table closed.');
  }, 80);
}

function turnPage() {
  if (sumPages.length < 2) return;
  sumPage = (sumPage + 1) % sumPages.length;
  updateControls();
  const [a, b] = sumPages[sumPage];
  FP.announce('Summary, cases ' + (a + 1) + ' to ' + b + '. ' + summaryRows().slice(a, b).map(r => r.spoken).join(' '));
}

function startOver() {
  deck.newRound();
  pending = null;
  feedback = null;
  notice = '';
  tableOpen = false;
  tablePage = 0;
  sumPage = 0;
  updateControls();
  FP.announce('Started over. Case 1 of 8. ' + CASES[0].text + ' ' + PROMPT);
}

function setNotice(t) { notice = t; FP.announce(t); }

function enterKey() {
  const ph = deck.state().phase;
  if (ph === 'choose') checkCase();
  else if (ph === 'feedback') nextCase();
}

function scoreText() { return 'Correct: ' + deck.score.correct() + ' of ' + CASES.length; }

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  let y = K.title('Motor Base Selector');
  const st = deck.state();
  const right = st.phase === 'summary' ? 'All 8 cases checked'
    : 'Case ' + (st.index + 1) + ' of ' + CASES.length + ' · one attempt';
  y = K.statusLine(scoreText(), right, null, { y: y - 4 });
  const nl = K.note(canvasWidth >= 560
    ? ['Illustrative cases', 'Rules: FanPedia pp. 76-78', 'Keys: 1-5 choose, R table, Enter checks or goes on']
    : ['Illustrative cases', 'FanPedia pp. 76-78', 'Keys 1-5, R, Enter'], { y: drawHeight - 6, lines: 2 });
  const top = y + 2, bottom = drawHeight - 8 - 17 * nl;
  if (st.phase === 'summary') drawSummary(10, top, canvasWidth - 20, bottom - top);
  else drawSorting(10, top, canvasWidth - 20, bottom - top);
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

// Case panel on top; below it the five base styles, or the reference table when it is open.
// Text shrinks (16 to 12 px) to fit; when the table still does not fit, the case panel drops
// its prompt line.
function drawSorting(x, y, w, h) {
  const gap = 8;
  let compact = false;
  let range = [0, BINS.length];
  const below = (ts, dry, yy) => tableOpen ? refTable(x, yy, w, ts, dry, range) : binsBlock(x, yy, w, ts, dry);
  const total = ts => casePanel(x, y, w, ts, true, compact) + gap + below(ts, true, 0);
  let ts = K.fitTextSize(total, h, 16, 12);
  if (total(ts) > h && tableOpen) { compact = true; ts = K.fitTextSize(total, h, 16, 12); }
  if (tableOpen) {
    // Narrow screens: split the table into pages of whole rows (the table button turns the page).
    const pages = [];
    if (total(ts) <= h) pages.push([0, BINS.length]);
    else {
      ts = 12;
      let start = 0;
      while (start < BINS.length) {
        let end = start + 1;
        range = [start, end + 1];
        while (end < BINS.length && total(12) <= h) { end++; range = [start, end + 1]; }
        pages.push([start, end]);
        start = end;
      }
    }
    if (pages.length !== tablePages.length) { tablePages = pages; tablePage = Math.min(tablePage, pages.length - 1); updateControls(); }
    tablePages = pages;
    range = tablePages[Math.min(tablePage, tablePages.length - 1)];
  }
  const ch = casePanel(x, y, w, ts, false, compact);
  below(ts, false, y + ch + gap);
}

// The spec's reference table: base style, frame range, typical mounting. Returns its height.
function refTable(x, y, w, ts, dry, range) {
  const pad = 8, iw = w - 2 * pad;
  const st = deck.state();
  const ss = Math.max(12, ts - 1), lh = Math.round(ss * 1.25);
  textSize(ts);
  textStyle(BOLD);
  let yy = y + pad;
  const paged = range[1] - range[0] < BINS.length;
  const title = paged ? 'Reference table, ' + (range[1] - range[0] === 1 ? 'row ' + range[1] : 'rows ' + (range[0] + 1) + '-' + range[1]) + ' of 5 (FanPedia pp. 76-78)'
    : 'Reference table: frame range and typical mounting (FanPedia pp. 76-78)';
  yy = K.wrapText(title, x + pad, yy, iw, Math.round(ts * 1.25), { dryRun: true }) + 4;
  const rows = BINS.slice(range[0], range[1]).map((b, k) => {
    const i = range[0] + k;
    textSize(ts); textStyle(BOLD);
    const nameW = textWidth(FP.msg.OK + ' ' + (i + 1) + ' ' + b.name);
    textStyle(NORMAL); textSize(ss);
    const frameText = 'Frame: ' + b.frame;
    const sameLine = nameW + 14 + textWidth(frameText) <= iw;
    const mH = K.countLines('Mounting: ' + b.mounting, iw - 12) * lh;
    return { b, i, sameLine, frameText, h: Math.round(ts * 1.25) + (sameLine ? 0 : lh) + mH + 8 };
  });
  const hTot = (yy - y) + rows.reduce((n, r) => n + r.h, 0) + pad;
  if (dry) { textStyle(NORMAL); return hTot; }
  K.panel(x, y, w, hTot, { fill: '--fp-primary-bg', stroke: '--fp-primary', radius: 6 });
  noStroke(); fill(FP.tok('text')); textSize(ts); textStyle(BOLD); textAlign(LEFT, TOP);
  yy = K.wrapText(title, x + pad, y + pad, iw, Math.round(ts * 1.25)) + 4;
  rows.forEach(r => {
    const sel = pending === r.b.id && st.phase === 'choose';
    if (sel) K.panel(x + 3, yy - 2, w - 6, r.h - 2, { fill: '#ffffff', stroke: '--fp-primary', weight: 2, radius: 4 });
    stroke(FP.tok('border')); strokeWeight(1);
    if (r.i > range[0] && !sel) line(x + pad, yy - 3, x + w - pad, yy - 3);
    noStroke(); fill(FP.tok('text')); textSize(ts); textStyle(BOLD);
    text((sel ? FP.msg.OK + ' ' : '') + (r.i + 1) + ' ' + r.b.name, x + pad, yy);
    textStyle(NORMAL); textSize(ss);
    let ly = yy + Math.round(ts * 1.25);
    if (r.sameLine) { textAlign(RIGHT, TOP); text(r.frameText, x + w - pad, yy + 1); textAlign(LEFT, TOP); }
    else { text(r.frameText, x + pad + 12, ly); ly += lh; }
    K.wrapText('Mounting: ' + r.b.mounting, x + pad + 12, ly, iw - 12, lh);
    yy += r.h;
  });
  textStyle(NORMAL);
  return hTot;
}

// Returns the panel height.
function casePanel(x, y, w, ts, dry, compact) {
  const st = deck.state();
  const pad = 10, iw = w - 2 * pad;
  const body = compact ? [{ t: 'Case ' + (st.index + 1) + ': ' + st.card.text, bold: true }] : [
    { t: 'Case ' + (st.index + 1) + ' of ' + CASES.length + ' · Illustrative case', muted: true, small: true },
    { t: st.card.text, bold: true, gap: 2 },
    { t: PROMPT, gap: 4 }
  ];
  if (pending && st.phase === 'choose') body.push({ t: 'Selected: ' + BIN[pending].name + '. Press Check (Enter) to commit.', color: FP.tok('primary-dark'), gap: 4 });
  if (notice) body.push({ t: 'ℹ ' + notice, color: FP.tok('primary-dark'), gap: 4 });
  const fb = feedback ? [{ t: feedback.message, color: FP.tok(feedback.kind === 'ok' ? 'correct' : 'incorrect') }] : [];
  const fpad = 7;
  let yy = paras(body, x + pad, y + pad, iw, ts, true);
  let fbH = 0;
  if (fb.length) fbH = paras(fb, x + pad + fpad, 0, iw - 2 * fpad, ts, true) + 2 * fpad;
  const hTot = (yy - y) + (fb.length ? 6 + fbH : 0) + pad - 2;
  if (dry) return hTot;
  K.panel(x, y, w, hTot);
  yy = paras(body, x + pad, y + pad, iw, ts, false);
  if (fb.length) {
    const ok = feedback.kind === 'ok';
    K.panel(x + pad - 3, yy + 6, iw + 6, fbH, {
      fill: ok ? '--fp-correct-bg' : '--fp-incorrect-bg', stroke: ok ? '--fp-correct' : '--fp-incorrect',
      dashed: !ok, weight: 2
    });
    paras(fb, x + pad + fpad, yy + 6 + fpad, iw - 2 * fpad, ts, false);
  }
  return hTot;
}

// One row per bin: key and name, the checked cases placed in it (✓ solid / ✗ dashed chips),
// (no definitions here: the frame ranges are in the reference table). Returns the block height.
function binsBlock(x, y, w, ts, dry) {
  const rowGap = 5, pad = 6;
  const st = deck.state();
  const placements = deck.placements;
  const chipW = 40, chipGap = 4;
  let yy = y;
  BINS.forEach((b, i) => {
    const chips = placements.filter(p => p.chosen === b.id);
    textSize(ts);
    textStyle(BOLD);
    const head = (i + 1) + '  ' + b.name;
    const headW = textWidth(head);
    textStyle(NORMAL);
    const chipsW = chips.length * (chipW + chipGap);
    const chipsOnHead = headW + 16 + chipsW <= w - 2 * pad;
    const headH = Math.round(ts * 1.3) + 2;
    let rh = pad + headH;
    if (!chipsOnHead && chips.length) rh += 24;
    rh += pad - 2;
    if (!dry) {
      const sel = pending === b.id && st.phase === 'choose';
      K.panel(x, yy, w, rh, { stroke: sel ? '--fp-primary' : '--fp-border', weight: sel ? 3 : 1,
        fill: sel ? '--fp-primary-bg' : null, radius: 6 });
      noStroke();
      fill(FP.tok('text'));
      textSize(ts);
      textStyle(BOLD);
      textAlign(LEFT, TOP);
      text(head, x + pad, yy + pad);
      textStyle(NORMAL);
      let cx = chipsOnHead ? x + w - pad - chipsW + chipGap : x + pad;
      const cy = chipsOnHead ? yy + pad - 1 : yy + pad + headH;
      chips.forEach(p => {
        K.panel(cx, cy, chipW, 20, { radius: 4, weight: 1.5, dashed: !p.correct,
          fill: p.correct ? '--fp-correct-bg' : '--fp-incorrect-bg', stroke: p.correct ? '--fp-correct' : '--fp-incorrect' });
        noStroke();
        fill(FP.tok(p.correct ? 'correct' : 'incorrect'));
        textSize(12);
        textAlign(CENTER, CENTER);
        text('#' + p.card.id + ' ' + (p.correct ? FP.msg.OK : FP.msg.BAD), cx + chipW / 2, cy + 11);
        textAlign(LEFT, TOP);
        cx += chipW + chipGap;
      });
    }
    yy += rh + rowGap;
  });
  return yy - rowGap - y;
}

// ---------- Summary ----------
function summaryRows() {
  return deck.placements.map(p => {
    const ok = p.correct;
    return {
      ok,
      head: p.card.id + '. ' + p.card.short,
      line: ok ? FP.msg.OK + ' Your choice: ' + BIN[p.chosen].name + ' (correct). ' + p.card.why
        : FP.msg.BAD + ' Your choice: ' + BIN[p.chosen].name + ' · Correct: ' + BIN[p.card.answer].name + '. ' + p.card.why,
      spoken: 'Case ' + p.card.id + ', ' + p.card.short + ': your choice ' + BIN[p.chosen].name + ', ' +
        (ok ? 'correct' : 'incorrect') + '; correct base ' + BIN[p.card.answer].name + '. ' + p.card.why
    };
  });
}

function rowsHeight(rows, w, ts) {
  let h = 0;
  for (const r of rows) {
    textSize(ts);
    textStyle(BOLD);
    h += K.wrapText(r.head, 0, 0, w, Math.round(ts * 1.25), { dryRun: true });
    textStyle(NORMAL);
    textSize(Math.max(12, ts - 1));
    h += K.wrapText(r.line, 0, 0, w - 14, Math.round(Math.max(12, ts - 1) * 1.25), { dryRun: true }) + 6;
  }
  textStyle(NORMAL);
  return h;
}

// Split the eight rows into pages that fit at 12 px or more (one page on wide screens).
function paginate(rows, w, avail) {
  for (let ts = 15; ts >= 12; ts--) if (rowsHeight(rows, w, ts) <= avail) return { pages: [[0, rows.length]], ts };
  const pages = [];
  let start = 0;
  while (start < rows.length) {
    let end = start + 1;
    while (end < rows.length && rowsHeight(rows.slice(start, end + 1), w, 12) <= avail) end++;
    pages.push([start, end]);
    start = end;
  }
  return { pages, ts: 12 };
}

function drawSummary(x, y, w, h) {
  const s = deck.summary();
  const pad = 10, iw = w - 2 * pad;
  K.panel(x, y, w, h);
  const headList = [
    { t: s.lines[0], bold: true },
    { t: (s.mastered ? FP.msg.OK + ' ' : '') + s.lines[1], color: FP.tok(s.mastered ? 'correct' : 'text') }
  ];
  const hts = canvasWidth >= 480 ? 15 : 13;
  let yy = paras(headList, x + pad, y + pad, iw, hts, false) + 6;
  stroke(FP.tok('border'));
  line(x + pad, yy - 3, x + w - pad, yy - 3);
  noStroke();
  const rows = summaryRows();
  const pg = paginate(rows, iw, y + h - pad - yy);
  if (pg.pages.length !== sumPages.length) { sumPages = pg.pages; sumPage = Math.min(sumPage, sumPages.length - 1); updateControls(); }
  sumPages = pg.pages;
  const [a, b] = sumPages[Math.min(sumPage, sumPages.length - 1)];
  const ts = pg.ts, ls = Math.max(12, ts - 1);
  rows.slice(a, b).forEach(r => {
    textSize(ts);
    textStyle(BOLD);
    fill(FP.tok('text'));
    yy = K.wrapText(r.head, x + pad, yy, iw, Math.round(ts * 1.25));
    textStyle(NORMAL);
    textSize(ls);
    fill(FP.tok(r.ok ? 'correct' : 'incorrect'));
    yy = K.wrapText(r.line, x + pad + 14, yy, iw - 14, Math.round(ls * 1.25)) + 6;
  });
  textStyle(NORMAL);
}

// ---------- Controls ----------
function positionControls() {
  const narrow = canvasWidth < 480;
  const more = tableOpen && tablePage < tablePages.length - 1;
  tableButton.html(more ? 'More rows' : (narrow ? 'Table' : 'Reference table'));
  binButtons.forEach(b => b.html(narrow ? b.elt.dataset.short : b.elt.dataset.full));
  checkButton.html(FP.msg.CHECK);
  nextButton.html(deck.state().isLast ? 'Finish' : (narrow ? 'Next' : 'Next case'));
  for (let pass = 0; pass < 2; pass++) {
    let row = K.flowButtons(0, binButtons);
    row = K.flowButtons(row, [checkButton, nextButton, tableButton, pageButton, null, startOverButton]);
    const rows = Math.max(1, row);
    if (rows === ctrlRows) break;
    ctrlRows = rows;
    controlHeight = K.controlHeightFor(ctrlRows);
    drawHeight = CANVAS_H - controlHeight;
    K.config({ drawHeight, controlHeight });
  }
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
  for (const c of [checkButton, nextButton, tableButton]) { if (done) c.hide(); else c.show(); }
  K.setEnabled(checkButton, st.phase === 'choose');
  K.setEnabled(nextButton, st.phase === 'feedback');
  nextButton.attribute('aria-label', st.isLast ? 'Finish and see the summary' : 'Next case');
  tableButton.attribute('aria-pressed', tableOpen ? 'true' : 'false');
  tableButton.attribute('aria-label', (tableOpen ? (tablePage < tablePages.length - 1 ? 'Show more rows of' : 'Close') : 'Open') + ' the reference table (key R)');
  if (done && sumPages.length > 1) {
    pageButton.show();
    const nx = sumPages[(sumPage + 1) % sumPages.length];
    pageButton.html(nx[1] - nx[0] === 1 ? 'Show case ' + nx[1] : 'Show cases ' + (nx[0] + 1) + '-' + nx[1]);
  } else pageButton.hide();
  positionControls();
  K.keepFocus(had, [nextButton, checkButton, ...binButtons, tableButton, pageButton, startOverButton]);
  if (st.phase === 'feedback' && (had === checkButton.elt || had === document.body)) nextButton.elt.focus();
  if (done && (had === nextButton.elt || had === document.body)) (sumPages.length > 1 ? pageButton : startOverButton).elt.focus();
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, CANVAS_H);
  positionControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
