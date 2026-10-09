// High Temperature Package Finder
// CANVAS_HEIGHT: 587
// Eight illustrative job tickets, in a fixed order: for each, the learner picks the FanPedia
// high temperature package band from the band list for the ticket's fan family and marks
// whether engineering review is required, then checks. Two attempts per ticket; a ticket is
// correct only when both halves match. Mastery 7 of 8 (first attempt). After ticket 8, an
// Explore mode looks up the band and review flag for any family and temperature.
// Built on the FanPedia kit: FP.CardDeck (tickets, attempts, score, mastery), FP.p5 (layout,
// text, controls, keys), FP.msg / FP.announce (wording, live region).

const K = FP.p5;
const SIM_ID = 'ch21-high-temp-package-finder';
let canvasWidth = 800;
const drawHeight = 472;
const controlHeight = K.controlHeightFor(3);   // 115: band row, review row, buttons
const canvasHeight = drawHeight + controlHeight;
const MASTERY = 7;
const T_MIN = 100, T_MAX = 1200;

// ---------- Band lists by family (chapter 21 spec, "Content"; FanPedia pp. 110-116) ----------
// hi: null means "and over". review: engineering review required. select: select models only.
function band(lo, hi, review, select) {
  const txt = hi == null ? fmtF(lo) + ' and over' : num(lo) + '-' + fmtF(hi);
  return { id: lo + '-' + (hi == null ? 'up' : hi), lo, hi, review: !!review, select: !!select,
    text: txt, label: txt + (select ? ' (select models)' : '') };
}
function num(x) { return FP.fmt.num(x); }
function fmtF(x) { return FP.fmt.degF(x); }
const FIVE = () => [band(301, 500), band(501, 600), band(601, 800), band(801, 1000), band(1001, null, true)];
const FAMILIES = [
  { id: 'c1', name: 'Centrifugal, Arr. 1, 8, 9, 9F, 10', short: 'Centrifugal Arr. 1, 8, 9, 9F, 10', page: 110, bands: FIVE() },
  { id: 'c4', name: 'Centrifugal, Arr. 4', short: 'Centrifugal Arr. 4', page: 111,
    bands: [band(181, 300), band(301, null, true)] },
  { id: 'p9', name: 'Arr. 9 plug fan', short: 'Arr. 9 plug fan', page: 113, bands: FIVE() },
  { id: 'p4', name: 'Arr. 4 plug fan', short: 'Arr. 4 plug fan', page: 114,
    bands: [band(181, 300, false, true), band(301, null, true)] },
  { id: 'ak', name: 'Air kit, Arr. 3', short: 'Air kit, Arr. 3', page: 115, bands: FIVE() },
  { id: 'ax4', name: 'Axial, Arr. 4', short: 'Axial Arr. 4', page: 116,
    bands: [band(106, 150), band(151, 195, true), band(196, 240, true)] },
  { id: 'ax9', name: 'Axial, Arr. 9', short: 'Axial Arr. 9', page: 116,
    bands: [band(201, 250), band(201, 300, false, true)] }
];
const FAM = {};
FAMILIES.forEach(f => { FAM[f.id] = f; });

// ---------- Job tickets (illustrative jobs), fixed order ----------
const TICKETS = [
  { id: 1, fan: 'Arrangement 1 centrifugal fan', app: 'kiln exhaust', t: 450, fam: 'c1', band: '301-500', review: 'no',
    reason: '450°F falls in the first Arr. 1 band.' },
  { id: 2, fan: 'Arrangement 4 centrifugal fan', app: 'dryer', t: 250, fam: 'c4', band: '181-300', review: 'no',
    reason: 'Arr. 4 has its own lower band; aluminum rotating parts are limited to 250°F.' },
  { id: 3, fan: 'Arrangement 4 centrifugal fan', app: 'oven', t: 400, fam: 'c4', band: '301-up', review: 'yes',
    reason: 'Arr. 4 above 300°F always goes to engineering review.' },
  { id: 4, fan: 'Arrangement 9 plug fan', app: 'oven', t: 650, fam: 'p9', band: '601-800', review: 'no',
    reason: 'Plug fans use the same five bands as Arr. 1, 8, 9, 9F, 10.' },
  { id: 5, fan: 'Air kit, Arrangement 3', app: 'furnace', t: 1100, fam: 'ak', band: '1001-up', review: 'yes',
    reason: 'The top band on every centrifugal and air kit page requires engineering review.' },
  { id: 6, fan: 'Arrangement 4 axial fan', app: 'warm exhaust', t: 180, fam: 'ax4', band: '151-195', review: 'yes',
    reason: 'FanPedia marks the 151-195°F axial band as requiring engineering review.' },
  { id: 7, fan: 'Arrangement 9 axial fan', app: null, t: 240, fam: 'ax9', band: '201-250', review: 'no',
    reason: '240°F is inside the 201-250°F band offered on Arr. 9 axial fans.',
    wrongBand: { '201-300': '201-300°F is for select models only; start from the general band.' } },
  { id: 8, fan: 'Arrangement 10 centrifugal fan', app: null, t: 520, fam: 'c1', band: '501-600', review: 'no',
    reason: '520°F is above 500°F, so it moves up to the second band.' }
].map(c => {
  const b = FAM[c.fam].bands.find(x => x.id === c.band);
  return Object.assign(c, { bandObj: b, answerText: b.text + ', review ' + c.review });
});

function bandOf(card, id) { return FAM[card.fam].bands.find(b => b.id === id); }
function halves(card, choice) { return { band: choice.band === card.band, review: choice.review === card.review }; }
function halfText(h) {
  return 'band ' + (h.band ? FP.msg.OK + ' correct' : FP.msg.BAD + ' incorrect') + ', review ' +
    (h.review ? FP.msg.OK + ' correct' : FP.msg.BAD + ' incorrect');
}
function extraNote(card, choice) { return (card.wrongBand && card.wrongBand[choice.band]) || ''; }

function bandHint(card, choice) {
  const b = bandOf(card, choice.band), t = fmtF(card.t);
  if (choice.band !== card.band) {
    if (extraNote(card, choice)) return extraNote(card, choice);
    if (b.hi != null && card.t > b.hi) return t + ' is above the top of the band you chose. Find the band whose limits contain ' + t + '.';
    if (card.t < b.lo) return t + ' is below the bottom of the band you chose. Find the band whose limits contain ' + t + '.';
  }
  return 'Find the band whose limits contain ' + t + ', then check whether this family sends that band to engineering review.';
}

// Spec feedback: Correct: "Correct: <band>, review <yes/no>. <reason>." First miss: "Check the band
// list for <family> again." plus a hint (bandHint). Second miss: the answer and reason, and the ticket counts as missed.
const deck = new FP.CardDeck({
  cards: TICKETS, shuffle: false, attempts: 2, retryMissed: false,
  noun: 'Tickets', mastery: MASTERY, id: SIM_ID,
  check: (card, choice) => choice.band === card.band && choice.review === card.review,
  reviewPointer: 'Review the band table in "High Temperature Packages", then press Start over',
  messages: {
    correct: res => FP.msg.correct(res.card.answerText, res.card.reason),
    // First miss: a hint only. The halves are not marked (review is yes/no, so a mark would give it
    // away); a wrong band gets the slip (temperature above or below the chosen band, select models).
    retry: res => FP.msg.tryAgain('Check the band list for ' + FAM[res.card.fam].short + ' again. ' +
      bandHint(res.card, res.chosen), res.attemptsLeft),
    missed: res => {
      const c = res.card, h = halves(c, res.chosen);
      return FP.msg.BAD + ' Not quite: ' + halfText(h) + '. The answer is ' + c.answerText + '. ' +
        (extraNote(c, res.chosen) ? extraNote(c, res.chosen) + ' ' : '') + c.reason + ' This one counts as missed.';
    }
  }
});

let mode = 'tickets';      // 'tickets' | 'explore'
let feedback = null;       // {kind, message, chose, halves}
let notice = '';
let bandSelect, reviewRadio, checkButton, nextButton, startOverButton;
let famSelect, tempSlider;

const keys = K.keys.bind({ Enter: enterKey, y: () => setReview('yes'), n: () => setReview('no') });

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  const mainEl = document.querySelector('main');

  // Ticket controls
  bandSelect = createSelect();
  bandSelect.parent(mainEl);
  bandSelect.attribute('aria-label', 'Package band for this ticket');
  bandSelect.changed(() => { notice = ''; });
  reviewRadio = K.radio([['yes', 'Yes'], ['no', 'No']], { name: 'review', label: 'Engineering review required',
    onChange: () => { notice = ''; } });
  checkButton = K.button(FP.msg.CHECK || 'Check', checkTicket);
  nextButton = K.button('Next ticket', nextTicket);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  // Explore controls (rows 0 and 1 once the tickets are done)
  famSelect = createSelect();
  famSelect.parent(mainEl);
  FAMILIES.forEach(f => famSelect.option(f.name, f.id));
  famSelect.attribute('aria-label', 'Explore: fan family');
  tempSlider = createSlider(T_MIN, T_MAX, 300, 10);
  tempSlider.parent(mainEl);
  tempSlider.attribute('aria-label', 'Explore: airstream temperature, °F');
  famSelect.changed(announceExplore);
  tempSlider.input(announceExplore);

  loadTicket();
  updateControls();

  describe('High temperature package finder. Eight illustrative job tickets give a fan family, an application ' +
    'and an airstream temperature. Choose the FanPedia package band from the band list and mark whether ' +
    'engineering review is required, then check. Two attempts per ticket. After ticket 8, Explore mode shows ' +
    'the band and review flag for any family and temperature.');
}

// ---------- Ticket flow ----------
function loadTicket() {
  const card = deck.state().card;
  bandSelect.elt.innerHTML = '';
  bandSelect.option('Choose a band…', '');
  FAM[card.fam].bands.forEach(b => bandSelect.option(b.label, b.id));
  bandSelect.selected('');
  clearReview();
}
function clearReview() { reviewRadio.elt.querySelectorAll('input').forEach(i => { i.checked = false; }); }
function reviewValue() { const i = reviewRadio.elt.querySelector('input:checked'); return i ? i.value : ''; }
function setReview(v) {
  if (mode !== 'tickets' || deck.state().phase !== 'choose') return;
  const i = reviewRadio.elt.querySelector('input[value="' + v + '"]');
  if (i) { i.checked = true; notice = ''; }
}

function checkTicket() {
  const st = deck.state();
  if (mode !== 'tickets' || st.phase !== 'choose') return;
  const choice = { band: bandSelect.value(), review: reviewValue() };
  if (!choice.band) return setNotice('Choose a band from the band list first.');
  if (!choice.review) return setNotice('Mark engineering review Yes or No first.');
  notice = '';
  const card = st.card;
  const res = deck.place(choice);
  feedback = { kind: res.kind, message: res.message, status: res.status, halves: halves(card, choice),
    chose: bandOf(card, choice.band).text + ', review ' + choice.review };
  FP.announce('You chose ' + feedback.chose + '. ' + res.message);
  updateControls();
  if (res.status === 'retry') { clearReview(); bandSelect.selected(''); bandSelect.elt.focus({ preventScroll: true }); }
}

function setNotice(t) { notice = t; FP.announce(t); }

function nextTicket() {
  const st = deck.state();
  if (mode !== 'tickets' || st.phase !== 'feedback') return;
  if (st.isLast) return enterExplore();
  deck.next();
  feedback = null;
  notice = '';
  loadTicket();
  updateControls();
  bandSelect.elt.focus({ preventScroll: true });   // the next ticket starts at the band list
  const c = deck.state().card;
  FP.announce('Ticket ' + c.id + ' of 8. ' + c.fan + (c.app ? ', ' + c.app : '') + ', ' + fmtF(c.t) + '. Which package band covers this job?');
}

function enterExplore() {
  if (deck.state().phase === 'feedback') deck.next();   // closes the round: summary, events
  mode = 'explore';
  feedback = null;
  updateControls();
  FP.announce('Explore mode. ' + deck.summary().lines.join(' ') + ' Choose any family and temperature.');
}

function startOver() {
  deck.newRound();
  mode = 'tickets';
  feedback = null;
  notice = '';
  famSelect.selected('c1');
  tempSlider.value(300);
  loadTicket();
  updateControls();
  FP.announce('Started over. Ticket 1 of 8. ' + TICKETS[0].fan + ', ' + TICKETS[0].app + ', ' + fmtF(TICKETS[0].t) + '.');
}

function enterKey() {
  if (mode !== 'tickets') return;
  const ph = deck.state().phase;
  if (ph === 'choose') checkTicket();
  else if (ph === 'feedback') nextTicket();
}
function keyPressed() { return keys(); }

// ---------- Explore lookup ----------
// The band whose range holds t (lo <= t <= hi; "and over" has no upper bound). Where two
// bands hold t (Arr. 9 axial), the general band wins over the select-models band.
function lookup(famId, t) {
  const f = FAM[famId];
  const hits = f.bands.filter(b => t >= b.lo && (b.hi == null || t <= b.hi));
  if (hits.length) {
    const b = hits.find(x => !x.select) || hits[0];
    return { band: b, also: hits.filter(x => x !== b) };
  }
  const first = f.bands[0], top = Math.max(...f.bands.map(b => b.hi == null ? Infinity : b.hi));
  if (t < first.lo) return { band: null, below: first.lo };
  return { band: null, above: top };
}
function lookupText(famId, t) {
  const r = lookup(famId, t);
  if (r.band) {
    return { head: 'Band: ' + r.band.label, review: 'Engineering review: ' + (r.band.review ? 'Yes' : 'No'),
      note: r.also.length ? r.also.map(b => b.label).join(', ') + ' also covers ' + fmtF(t) + '; start from the general band.' : '' };
  }
  if (r.below) return { head: 'Below the first listed band', review: 'No package band below ' + fmtF(r.below) + ' for this family.', note: '' };
  return { head: 'No listed band', review: 'The listed bands for this family stop at ' + fmtF(r.above) + '.',
    note: 'FanPedia describes axial service up to 600°F, but lists no band above 300°F; ask the factory.' };
}
let lastExplore = '';
function announceExplore() {
  if (mode !== 'explore') return;
  const key = famSelect.value() + tempSlider.value();
  if (key === lastExplore) return;
  lastExplore = key;
  const r = lookupText(famSelect.value(), Number(tempSlider.value()));
  FP.announce(FAM[famSelect.value()].name + ', ' + fmtF(Number(tempSlider.value())) + '. ' + r.head + '. ' + r.review);
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  let y = K.title('High Temperature Package Finder');
  const st = deck.state();
  const right = mode === 'explore' ? 'Explore mode (not scored)'
    : 'Ticket ' + (st.index + 1) + ' of ' + TICKETS.length + ' · ' + (st.phase === 'choose' ? st.attemptLabel : 'checked');
  y = K.statusLine(st.scoreLabel, right, null, { y: y - 4 });
  K.note(canvasWidth >= 520
    ? ['Illustrative jobs', 'Bands: FanPedia pp. 110-116', 'Keys: Y/N review, Enter checks or goes on']
    : ['Illustrative jobs', 'FanPedia pp. 110-116'], { y: drawHeight - 6 });

  const top = y + 2, h = drawHeight - 24 - top;
  let A, B;
  if (canvasWidth >= 600) {
    const lw = Math.round(canvasWidth * 0.5);
    A = [10, top, lw - 15, h];
    B = [lw + 5, top, canvasWidth - lw - 15, h];
  } else {
    // narrow: ticket on top; the band chart below gets more room once it opens
    const open = mode === 'explore' || st.phase !== 'choose';
    const bh = open ? Math.round(h * 0.38) : 92;
    A = [10, top, canvasWidth - 20, h - bh - 6];
    B = [10, top + h - bh, canvasWidth - 20, bh];
  }
  K.panel(...A);
  K.panel(...B);
  if (mode === 'explore') drawExplorePanel(A[0] + 10, A[1] + 8, A[2] - 20, A[3] - 14);
  else drawTicketPanel(A[0] + 10, A[1] + 8, A[2] - 20, A[3] - 14);
  drawBandPanel(...B);
  drawControlLabels();
}

// Lays out {t, bold, muted, color, gap, small} paragraphs; returns the y below.
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

function drawTicketPanel(x, y, w, h) {
  const st = deck.state();
  const c = st.card;
  noStroke();
  fill(FP.tok('text'));
  textStyle(BOLD);
  textSize(17);
  textAlign(LEFT, TOP);
  text('Job ticket ' + c.id + ' of ' + TICKETS.length, x, y);
  textStyle(NORMAL);
  const top = y + 26;
  const body = [
    { t: 'Fan: ' + c.fan },
    { t: 'Application: ' + (c.app || 'not stated') },
    { t: 'Airstream temperature: ' + fmtF(c.t), bold: true },
    canvasWidth >= 600 ? { t: 'Band list: ' + FAM[c.fam].name, muted: true, small: true, gap: 2 } : null,
    { t: 'Which package band covers this job?', bold: true, gap: 6 }
  ].filter(Boolean);
  if (notice) body.push({ t: 'ℹ ' + notice, color: FP.tok('primary-dark'), gap: 6 });
  const fb = [];
  if (feedback) {
    fb.push({ t: 'You chose: ' + feedback.chose, muted: true });
    fb.push({ t: feedback.message, color: FP.tok(feedback.kind === 'ok' ? 'correct' : 'incorrect') });
  }
  const pad = 7;
  const layout = ts => {
    let yy = paras(body, x, top, w, ts, true);
    if (fb.length) yy = paras(fb, x + pad, yy + 8 + pad, w - 2 * pad, ts, true) + pad;
    return yy - top;
  };
  const ts = K.fitTextSize(layout, y + h - top, 16, 12);
  let yy = paras(body, x, top, w, ts, false);
  if (fb.length) {
    const fbTop = yy + 8;
    const fbH = paras(fb, x + pad, fbTop + pad, w - 2 * pad, ts, true) + pad - fbTop;
    K.panel(x - 2, fbTop, w + 4, fbH, {
      fill: feedback.kind === 'ok' ? '--fp-correct-bg' : '--fp-incorrect-bg',
      stroke: feedback.kind === 'ok' ? '--fp-correct' : '--fp-incorrect', dashed: feedback.kind !== 'ok', weight: 2
    });
    paras(fb, x + pad, fbTop + pad, w - 2 * pad, ts, false);
  }
}

function drawExplorePanel(x, y, w, h) {
  const famId = famSelect.value(), t = Number(tempSlider.value());
  const r = lookupText(famId, t);
  noStroke();
  fill(FP.tok('text'));
  textStyle(BOLD);
  textSize(17);
  textAlign(LEFT, TOP);
  text('Explore mode', x, y);
  textStyle(NORMAL);
  const top = y + 26;
  const s = deck.summary();
  const missed = s.misses.map(m => m.card.id);
  const list = [
    { t: FAM[famId].name + ', ' + fmtF(t) },
    { t: r.head, bold: true, color: FP.tok('primary-dark'), gap: 4 },
    { t: r.review, bold: true },
    r.note ? { t: r.note, muted: true, small: true } : null,
    { t: 'Try an axial family above 300°F, and Arr. 4 at 300°F and 310°F.', muted: true, gap: 6 },
    { t: s.lines[0], bold: true, gap: 8 },
    { t: s.lines[1] },
    missed.length ? { t: 'Missed tickets: ' + missed.join(', ') + '.', muted: true } : null
  ].filter(Boolean);
  const ts = K.fitTextSize(tt => paras(list, x, top, w, tt, true) - top, y + h - top, 16, 12);
  paras(list, x, top, w, ts, false);
}

// The family's bands on a °F scale: one row per band, dashed bars need engineering review.
// Before a check the panel stays closed so it does not give the answer away.
function drawBandPanel(px, py, pw, ph) {
  let famId, t = null, answer = null;
  if (mode === 'explore') {
    famId = famSelect.value();
    t = Number(tempSlider.value());
    const r = lookup(famId, t);
    answer = r.band ? r.band.id : null;
  } else {
    const st = deck.state();
    famId = st.card.fam;
    if (st.phase === 'feedback') { t = st.card.t; answer = st.card.band; }
  }
  const f = FAM[famId];
  noStroke();
  fill(FP.tok('text'));
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(15);
  const head = 'Package bands: ' + f.short;
  text(textWidth(head) < pw - 20 ? head : f.short, px + 10, py + 8);
  textStyle(NORMAL);

  if (t === null) {
    const msg = deck.state().phase === 'choose' && feedback && feedback.status === 'retry'
      ? 'Second attempt: the band chart opens after your final check.'
      : 'Check your answer to see this family\'s bands on a temperature scale.';
    const big = ph >= 140;
    textSize(big ? 40 : 28);
    textAlign(CENTER, CENTER);
    fill(FP.tok('text-muted'));
    if (big) text('?', px + pw / 2, py + ph / 2 + 16); else text('?', px + 24, py + ph / 2 + 12);
    textAlign(LEFT, TOP);
    textSize(14);
    if (big) K.wrapText(msg, px + 10, py + 34, pw - 20, 19);
    else K.wrapText(msg, px + 46, py + 32, pw - 56, 18, { maxLines: 3 });
    return;
  }

  const x0 = px + 14, x1 = px + pw - 16;
  const sx = v => x0 + (Math.min(Math.max(v, T_MIN), T_MAX) - T_MIN) / (T_MAX - T_MIN) * (x1 - x0);
  const axisY = py + ph - 34;
  const rowsTop = py + 34;
  const rowH = Math.min(40, (axisY - 8 - rowsTop) / f.bands.length);
  const ts = rowH >= 30 ? 13 : 12;
  const inline = rowH < 24;   // short rows: label on the same line as its bar
  f.bands.forEach((b, i) => {
    const ry = rowsTop + i * rowH;
    const bx0 = sx(b.lo), bx1 = b.hi == null ? x1 : sx(b.hi);
    const isAns = b.id === answer;
    const barY = inline ? ry + 2 : ry + ts + 3, barH = inline ? Math.max(8, rowH - 5) : Math.max(8, rowH - ts - 8);
    push();
    stroke(FP.tok(isAns ? 'primary-dark' : 'edge'));
    strokeWeight(isAns ? 3 : 1.5);
    if (b.review) drawingContext.setLineDash([5, 3]);
    fill(isAns ? FP.tok('primary-bg') : FP.tok('metal'));
    rect(bx0, barY, Math.max(4, bx1 - bx0), barH);
    drawingContext.setLineDash([]);
    if (b.hi == null) {                   // "and over": arrowhead at the scale end
      noStroke();
      fill(FP.tok('edge'));
      triangle(x1, barY + barH / 2, x1 - 8, barY - 1, x1 - 8, barY + barH + 1);
    }
    pop();
    let lab = b.label + (b.review ? ' · review' : '') + (isAns ? '  ◀ ' + (mode === 'explore' ? 'this temperature' : 'answer') : '');
    noStroke();
    textSize(ts);
    textStyle(isAns ? BOLD : NORMAL);
    fill(FP.tok(isAns ? 'primary-dark' : 'text'));
    if (textWidth(lab) > x1 - x0) lab = b.label + (b.review ? ' · review' : '') + (isAns ? ' ◀' : '');
    if (inline) {
      // right of the bar when it fits, otherwise left of it
      const right = bx1 + 6 + textWidth(lab) <= px + pw - 4;
      textAlign(right ? LEFT : RIGHT, CENTER);
      text(lab, right ? bx1 + 6 : bx0 - 6, barY + barH / 2);
      textAlign(LEFT, TOP);
    } else {
      const tx = Math.max(x0, Math.min(bx0, x1 - textWidth(lab)));
      text(lab, tx, ry);
    }
    textStyle(NORMAL);
  });
  // °F axis
  stroke(FP.tok('edge'));
  strokeWeight(1);
  line(x0, axisY, x1, axisY);
  noStroke();
  fill(FP.tok('text-muted'));
  textSize(12);
  textAlign(CENTER, TOP);
  const ticks = pw >= 300 ? [100, 300, 500, 700, 900, 1100] : [100, 300, 600, 900, 1200];
  ticks.forEach(v => {
    stroke(FP.tok('edge'));
    line(sx(v), axisY, sx(v), axisY + 4);
    noStroke();
    text(num(v), sx(v), axisY + 6);
  });
  textAlign(RIGHT, TOP);
  text('°F', x1, axisY + 20);
  // Temperature marker
  const mx = sx(t);
  stroke(FP.tok('air'));
  strokeWeight(2);
  drawingContext.setLineDash([4, 3]);
  line(mx, rowsTop - 4, mx, axisY);
  drawingContext.setLineDash([]);
  noStroke();
  fill(FP.tok('air'));
  textStyle(BOLD);
  textSize(13);
  const mt = fmtF(t);
  textAlign(LEFT, TOP);
  text(mt, Math.max(px + 6, Math.min(mx - textWidth(mt) / 2, px + pw - 8 - textWidth(mt))), axisY + 20);
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
}

function drawControlLabels() {
  const narrow = canvasWidth < 480;
  noStroke();
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(narrow ? 14 : 15);
  fill(FP.tok('text'));
  if (mode === 'explore') {
    text('Family:', 10, K.controlLabel(0));
    text('Temperature: ' + fmtF(Number(tempSlider.value())), 10, K.controlLabel(1));
  } else {
    text('Band:', 10, K.controlLabel(0));
    text(narrow ? 'Review required:' : 'Engineering review required:', 10, K.controlLabel(1));
  }
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
}

function labelCol() { return canvasWidth < 480 ? 64 : 70; }

function positionControls() {
  const narrow = canvasWidth < 480;
  const pad = K.layout.margin;
  if (mode === 'explore') {
    famSelect.position(labelCol(), K.controlRow(0));
    famSelect.style('max-width', Math.max(120, canvasWidth - labelCol() - pad) + 'px');
    textSize(narrow ? 14 : 15);
    textStyle(BOLD);
    const sx = 10 + textWidth('Temperature: 1,200°F') + 12;
    textStyle(NORMAL);
    tempSlider.position(sx, K.controlRow(1) + 4);
    tempSlider.size(K.sliderWidth(canvasWidth, sx, 20, 100));
  } else {
    bandSelect.position(labelCol(), K.controlRow(0));
    bandSelect.style('max-width', Math.max(120, canvasWidth - labelCol() - pad) + 'px');
    textSize(narrow ? 14 : 15);
    textStyle(BOLD);
    const rx = 10 + textWidth(narrow ? 'Review required:' : 'Engineering review required:') + 12;
    textStyle(NORMAL);
    reviewRadio.position(rx, K.controlRow(1) + 3);
  }
  K.flowButtons(2, [checkButton, nextButton, null, startOverButton]);
}

function updateControls() {
  const had = document.activeElement;
  const st = deck.state();
  const inT = mode === 'tickets';
  const canCheck = inT && st.phase === 'choose';
  for (const c of [bandSelect, reviewRadio, checkButton, nextButton]) { if (inT) c.show(); else c.hide(); }
  for (const c of [famSelect, tempSlider]) { if (inT) c.hide(); else c.show(); }
  K.setEnabled(bandSelect, canCheck);
  reviewRadio.elt.querySelectorAll('input').forEach(i => { i.disabled = !canCheck; });
  K.setEnabled(checkButton, canCheck);
  K.setEnabled(nextButton, inT && st.phase === 'feedback');
  const nl = st.isLast ? 'Explore' : 'Next ticket';
  nextButton.html(nl);
  nextButton.attribute('aria-label', st.isLast ? 'Finish and open Explore mode' : 'Next ticket');
  positionControls();
  K.keepFocus(had, [nextButton, checkButton, startOverButton]);
  if (inT && st.phase === 'feedback' && (had === checkButton.elt || had === document.body)) nextButton.elt.focus();
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
