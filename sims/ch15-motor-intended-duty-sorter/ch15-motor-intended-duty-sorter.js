// Motor Intended Duty Sorter
// CANVAS_HEIGHT: 600
// Eight illustrative inquiries, in a fixed order. For each one the learner chooses the motor
// intended duty (GD, SD, IEEE 841, DFG or Washdown) and commits it with Check: one attempt,
// the correct duty and the reason are shown at once, and a checked case cannot be changed.
// Mastery is 7 of 8 on the first attempt. After case 8 a summary lists every case with the
// learner's bin, the correct bin and the reason. Rules: FanPedia p. 73, as in Chapter 15.
// Built on the FanPedia kit: FP.CardDeck (fixed deal, lock, score, mastery, spec wording via
// `messages`), FP.p5 (layout, text, controls, keys), FP.msg / FP.announce (wording, live region).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js.

const K = FP.p5;
const SIM_ID = 'ch15-motor-intended-duty-sorter';
const CANVAS_H = 600;
let canvasWidth = 800;
let ctrlRows = 2;                                  // grows to 3-4 when the buttons wrap
let controlHeight = K.controlHeightFor(ctrlRows);
let drawHeight = CANVAS_H - controlHeight;
const MASTERY = 7;
const PROMPT = 'Which intended duty does this motor need?';

// Chapter 15 spec, "Content": the five bins with the definition shown when a bin is open.
const BINS = [
  { id: 'GD', name: 'GD (General Duty)',
    def: 'General purpose motor for normal, clean and cool air around the motor.' },
  { id: 'SD', name: 'SD (Severe Duty)',
    def: 'Used where a severe duty motor is needed but IEEE 841 is not specified; also called Mil/Chem duty or chemical duty.' },
  { id: 'IEEE 841', name: 'IEEE 841',
    def: 'Industry standard for severe duty motors begun in 1986, used in process industries when specified.' },
  { id: 'DFG', name: 'DFG',
    def: 'Explosion proof enclosure motor for a hazardous location classified under the NEC.' },
  { id: 'Washdown', name: 'Washdown',
    def: 'Special-basis motor for food applications that are washed down.' }
];
const BIN = {};
BINS.forEach(b => { BIN[b.id] = b; });

// The eight cases, in the spec's order. short: summary label.
const CASES = [
  { id: 1, answer: 'GD', short: 'Office supply fan, clean mechanical room',
    text: 'Office building supply fan. The motor is in a clean, cool mechanical room.',
    why: 'Normal, clean and cool air around the motor is the definition of general duty.' },
  { id: 2, answer: 'IEEE 841', short: 'Paper mill, standard requires IEEE 841',
    text: 'Paper mill process fan. The mill\'s motor standard requires IEEE 841 motors.',
    why: 'IEEE 841 is chosen when the customer specifies it, and paper mills are a typical user.' },
  { id: 3, answer: 'SD', short: 'Chemical scrubber, "chemical duty"',
    text: 'Chemical plant scrubber exhaust fan. The specification asks for a "chemical duty" motor and does not mention IEEE 841.',
    why: 'Chemical duty is another name for severe duty, and IEEE 841 was not specified.' },
  { id: 4, answer: 'DFG', short: 'Class I, Div. 1, Group D room',
    text: 'Exhaust fan for a room the owner classifies as Class I, Division 1, Group D (flammable gas).',
    why: 'A classified hazardous location needs an explosion proof DFG motor rated for that class and group.' },
  { id: 5, answer: 'Washdown', short: 'Food plant fan, hosed down',
    text: 'Food plant fan that is hosed down with the rest of the line during cleaning.',
    why: 'FanPedia lists washdown duty motors, ordered on a special basis, for food applications.' },
  { id: 6, answer: 'DFG', short: 'Grain room, Class II, Div. 1, Group G',
    text: 'Grain handling room the owner classifies as Class II, Division 1, Group G (combustible dust).',
    why: 'Group G dust in a classified area needs an explosion proof DFG motor.' },
  { id: 7, answer: 'SD', short: 'Automotive, oil mist, "severe duty"',
    text: 'Automotive plant exhaust fan. The motor sits in air with oil mist and dirt; the specification says "severe duty" and does not mention IEEE 841.',
    why: 'The environment is severe, but IEEE 841 was not specified, so FanPedia\'s rule gives SD.' },
  { id: 8, answer: 'IEEE 841', short: 'Mining, "IEEE 841 TEFC motors"',
    text: 'Mining process fan. The specification says "IEEE 841 TEFC motors."',
    why: 'IEEE 841 is specified, and mining is one of the process industries that use it.' }
];

// Spec feedback: Correct: "Correct: <bin>. <Why>". Incorrect: "Not quite. The correct duty is <bin>. <Why>".
const deck = new FP.CardDeck({
  cards: CASES, shuffle: false, attempts: 1, retryMissed: false,
  noun: 'Cases', mastery: MASTERY, id: SIM_ID,
  label: a => BIN[a].name,
  reviewPointer: 'Reread "Motor Intended Duty" and "Severe Duty Motor", then press Start over',
  messages: {
    missed: res => FP.msg.BAD + ' Not quite. The correct duty is ' + BIN[res.card.answer].name + '. ' + res.card.why
  }
});

let pending = null;        // bin chosen, not checked yet
let feedback = null;       // {kind, message}
let notice = '';
let openAll = false;       // "Open all definitions"
let sumPage = 0;           // summary page (narrow screens split the eight rows)
let sumPages = [[0, CASES.length]];
let binButtons = [], checkButton, nextButton, defsButton, pageButton, startOverButton;

const keys = K.keys.bind({
  '1': () => choose(0), '2': () => choose(1), '3': () => choose(2), '4': () => choose(3), '5': () => choose(4),
  d: toggleDefs, Enter: enterKey
});
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, CANVAS_H);
  canvas.parent(document.querySelector('main'));
  binButtons = BINS.map((b, i) => {
    const btn = K.button((i + 1) + ' ' + b.id, () => choose(i));
    btn.elt.dataset.full = (i + 1) + ' ' + b.id;
    btn.elt.dataset.short = (i + 1) + ' ' + b.id.replace('Washdown', 'Wash').replace('IEEE 841', 'IEEE');
    btn.addClass('choice');
    btn.attribute('aria-pressed', 'false');
    btn.attribute('aria-label', b.name + ' (key ' + (i + 1) + ')');
    return btn;
  });
  checkButton = K.button(FP.msg.CHECK, checkCase);
  nextButton = K.button('Next case', nextCase);
  defsButton = K.button('Open all definitions', toggleDefs);
  defsButton.attribute('aria-pressed', 'false');
  pageButton = K.button('Show cases 5-8', turnPage);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });
  updateControls();
  describe('Motor intended duty sorter. Eight illustrative inquiries are shown one at a time in a fixed ' +
    'order. For each, choose the intended duty the motor needs (GD, SD, IEEE 841, DFG or Washdown) and ' +
    'press Check. Choosing a bin opens its FanPedia definition. Each case is marked correct or incorrect ' +
    'with the reason, and after case 8 a summary lists every case with your bin, the correct bin and the reason.');
}

// ---------- Flow ----------
function choose(i) {
  if (deck.state().phase !== 'choose') return;
  pending = BINS[i].id;
  notice = '';
  updateControls();
  FP.announce(BINS[i].name + ' selected: ' + BINS[i].def + ' Press Check to commit.');
}

function checkCase() {
  if (deck.state().phase !== 'choose') return;
  if (!pending) return setNotice('Choose a duty first (keys 1-5), then press Check.');
  const res = deck.place(pending);
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
    FP.announce(deck.summary().lines.join('. ') + ' The summary lists every case with your bin and the correct bin.');
  } else {
    FP.announce('Case ' + (s.index + 1) + ' of ' + CASES.length + '. ' + s.card.text + ' ' + PROMPT);
  }
}

function toggleDefs() {
  if (deck.state().phase === 'summary') return;
  openAll = !openAll;
  updateControls();
  FP.announce(openAll ? 'All five definitions open. ' + BINS.map(b => b.name + ': ' + b.def).join(' ')
    : 'Definitions closed. A bin opens when you choose it.');
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
  openAll = false;
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
  let y = K.title(canvasWidth >= 420 ? 'Motor Intended Duty Sorter' : 'Intended Duty Sorter');
  const st = deck.state();
  const right = st.phase === 'summary' ? 'All 8 cases checked'
    : 'Case ' + (st.index + 1) + ' of ' + CASES.length + ' · one attempt';
  y = K.statusLine(scoreText(), right, null, { y: y - 4 });
  const nl = K.note(canvasWidth >= 560
    ? ['Illustrative cases', 'Rules: FanPedia p. 73', 'Keys: 1-5 choose, D definitions, Enter checks or goes on']
    : ['Illustrative cases', 'FanPedia p. 73', 'Keys 1-5, D, Enter'], { y: drawHeight - 6, lines: 2 });
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

// Case panel on top, the five bins below. Text shrinks (16 to 12 px) to fit; when all
// definitions cannot fit even at 12 px, only the chosen bin's definition stays open.
function drawSorting(x, y, w, h) {
  const gap = 8;
  const defsFor = openIds();
  const total = ts => casePanel(x, y, w, ts, true) + gap + binsBlock(x, 0, w, ts, defsFor, true);
  let ts = K.fitTextSize(total, h, 16, 12);
  // Not enough room for every open definition: keep the chosen bin's, then as many others as fit.
  while (total(ts) > h && defsFor.length > (pending ? 1 : 0)) {
    defsFor.pop();
    ts = K.fitTextSize(total, h, 16, 12);
  }
  const ch = casePanel(x, y, w, ts, false);
  binsBlock(x, y + ch + gap, w, ts, defsFor, false, h - ch - gap);
}

// Open bins, the chosen one first.
function openIds() {
  const ids = pending ? [pending] : [];
  if (openAll) BINS.forEach(b => { if (b.id !== pending) ids.push(b.id); });
  return ids;
}

// Returns the panel height.
function casePanel(x, y, w, ts, dry) {
  const st = deck.state();
  const pad = 10, iw = w - 2 * pad;
  const body = [
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
// and the definition when the bin is open. Returns the block height.
function binsBlock(x, y, w, ts, defsFor, dry, avail) {
  const rowGap = 5, pad = 6;
  const st = deck.state();
  const placements = deck.placements;
  const chipW = 40, chipGap = 4;
  let yy = y;
  BINS.forEach((b, i) => {
    const open = defsFor.indexOf(b.id) >= 0;
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
    let defH = 0;
    if (open) {
      textSize(Math.max(12, ts - 1));
      defH = K.wrapText(b.def, 0, 0, w - 2 * pad, Math.round(Math.max(12, ts - 1) * 1.3), { dryRun: true });
      rh += defH + 2;
    }
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
      if (!open) {
        fill(FP.tok('text-muted'));
        textSize(12);
        const hint = (canvasWidth >= 480 || openAll) ? (openAll ? 'closed: no room' : 'closed') : '';
        if (hint && !chips.length) { textAlign(RIGHT, TOP); text(hint, x + w - pad, yy + pad + 2); textAlign(LEFT, TOP); }
      }
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
      if (open) {
        fill(FP.tok('text'));
        const ds = Math.max(12, ts - 1);
        textSize(ds);
        K.wrapText(b.def, x + pad, yy + pad + headH + (!chipsOnHead && chips.length ? 24 : 0), w - 2 * pad, Math.round(ds * 1.3));
      }
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
      line: ok ? FP.msg.OK + ' Your bin: ' + BIN[p.chosen].id + ' (correct). ' + p.card.why
        : FP.msg.BAD + ' Your bin: ' + BIN[p.chosen].id + ' · Correct: ' + BIN[p.card.answer].id + '. ' + p.card.why,
      spoken: 'Case ' + p.card.id + ', ' + p.card.short + ': your bin ' + BIN[p.chosen].name + ', ' +
        (ok ? 'correct' : 'incorrect') + '; correct bin ' + BIN[p.card.answer].name + '. ' + p.card.why
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
  defsButton.html(narrow ? 'Definitions' : (openAll ? 'Close all definitions' : 'Open all definitions'));
  binButtons.forEach(b => b.html(narrow ? b.elt.dataset.short : b.elt.dataset.full));
  checkButton.html(FP.msg.CHECK);
  nextButton.html(deck.state().isLast ? 'Finish' : (narrow ? 'Next' : 'Next case'));
  for (let pass = 0; pass < 2; pass++) {
    let row = K.flowButtons(0, binButtons);
    row = K.flowButtons(row, [checkButton, nextButton, defsButton, pageButton, null, startOverButton]);
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
  for (const c of [checkButton, nextButton, defsButton]) { if (done) c.hide(); else c.show(); }
  K.setEnabled(checkButton, st.phase === 'choose');
  K.setEnabled(nextButton, st.phase === 'feedback');
  nextButton.attribute('aria-label', st.isLast ? 'Finish and see the summary' : 'Next case');
  defsButton.attribute('aria-pressed', openAll ? 'true' : 'false');
  if (done && sumPages.length > 1) {
    pageButton.show();
    const nx = sumPages[(sumPage + 1) % sumPages.length];
    pageButton.html(nx[1] - nx[0] === 1 ? 'Show case ' + nx[1] : 'Show cases ' + (nx[0] + 1) + '-' + nx[1]);
  } else pageButton.hide();
  positionControls();
  K.keepFocus(had, [nextButton, checkButton, ...binButtons, defsButton, pageButton, startOverButton]);
  if (st.phase === 'feedback' && (had === checkButton.elt || had === document.body)) nextButton.elt.focus();
  if (done && (had === nextButton.elt || had === document.body)) (sumPages.length > 1 ? pageButton : startOverButton).elt.focus();
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, CANVAS_H);
  positionControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
