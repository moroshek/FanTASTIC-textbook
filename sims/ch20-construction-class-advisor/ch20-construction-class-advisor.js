// Construction Class Advisor MicroSim (Chapter 20)
// CANVAS_HEIGHT: 660
// Six illustrative airstream inquiries. For each one the learner picks one of four
// construction recommendations (A-D), commits it with Recommend, and only then sees
// the reason. The first attempt is scored (FP.CardDeck, 1 attempt); one extra
// practice attempt is allowed and is never scored.
// Source rules: FanPedia (https://tcf.com/fanpedia/) pp. 85, 107, 110, 116, 119, 122, 145.
// Needs the FanPedia kit: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js (../shared-libs/).

const K = FP.p5;
const SIM_ID = 'ch20-construction-class-advisor';

// ---------- canvas layout ----------
let canvasWidth = 800;                       // replaced by the container width
const drawHeight = 580;                      // drawing region (no controls here)
const controlHeight = K.controlHeightFor(2); // 2 control rows: 80
const canvasHeight = drawHeight + controlHeight;
const margin = 15;

// ---------- content (from the chapter specification; option order is fixed) ----------
const inquiries = [
  {
    id: 'q1-steam',
    short: 'Arr. 9 axial fan, steam, near-ambient',
    text: 'Arrangement 9 axial fan exhausting steam from a washdown area at near-ambient temperature.',
    tags: ['wet'],
    options: [
      'High moisture construction with a drain at the lowest point.',
      'High temperature package.',
      'Spark resistant Type C.',
      'Standard construction; steam is just air.'
    ],
    answer: 0,
    why: 'High moisture construction is for steam or condensation in the housing and is offered on Arrangement 9 axial fans; a drain removes the water.'
  },
  {
    id: 'q2-steam-220F',
    short: 'Same Arr. 9 axial fan, steam at 220°F',
    text: 'The same Arrangement 9 axial fan, but the steam exhaust reaches 220°F.',
    tags: ['hot', 'wet'],
    options: [
      'High moisture construction plus a high temperature package.',
      'Refer to engineering review; high moisture and high temperature construction cannot be combined.',
      'High moisture construction only; 220°F is not hot.',
      'Insulated jacket only.'
    ],
    answer: 1,
    why: 'FanPedia states that high moisture construction cannot be used with high temperature construction, and 220°F falls in an axial high temperature package.'
  },
  {
    id: 'q3-type-c-nonferrous',
    short: 'Radial bladed fan, Type C specified, non-ferrous impeller',
    text: 'Radial bladed fan; specification calls for spark-resistant Type C; this fan\'s standard impeller is non-ferrous.',
    tags: ['explosive'],
    options: [
      'Type C with rub plate and Monel rub ring.',
      'Type B.',
      'Type A.',
      'No spark resistance needed.'
    ],
    answer: 1,
    why: 'FanPedia notes that a fan with a non-ferrous impeller as standard should use Type B.'
  },
  {
    id: 'q4-kiln-700F',
    short: 'Arr. 1 centrifugal, kiln air at 700°F, walkway',
    text: 'Arrangement 1 centrifugal fan recirculating kiln air at 700°F; a walkway passes beside the fan and workers can touch the housing.',
    tags: ['hot', 'personnel exposure'],
    options: [
      'Standard construction with a heat-resistant coating.',
      '601°F-800°F package, no insulation.',
      '601°F-800°F package with insulated construction (for example an insulated jacket).',
      '801°F-1,000°F package.'
    ],
    answer: 2,
    why: '700°F lies in the 601°F-800°F band, and a touchable hot housing calls for insulation; jackets are also named as personnel protection.'
  },
  {
    id: 'q5-fgr',
    short: 'Forced draft fan, inlet box, exhaust returned to inlet',
    text: 'Forced draft fan with an inlet box; the boiler system returns part of its hot exhaust to the fan inlet.',
    tags: ['hot', 'recirculated gas'],
    options: [
      'FGR connection on the inlet box, with an insulated inlet box for the hot gas.',
      'High moisture construction.',
      'Spark resistant Type C.',
      'Weep hole only.'
    ],
    answer: 0,
    why: 'Recirculated flue gas enters through an FGR connection on the front of the inlet box, and the hot gas makes an insulated inlet box appropriate.'
  },
  {
    id: 'q6-stainless-pedestal',
    short: 'Stainless housing on a mild steel pedestal',
    text: 'Stainless steel housing on a mild steel pedestal; the specification forbids welding stainless steel to mild steel.',
    tags: ['corrosive'],
    options: [
      'Weld the housing to the pedestal anyway.',
      'Buffer strips between housing and pedestal, or a bolt-on pedestal.',
      'Coat the pedestal.',
      'Aluminum pedestal welded to the housing.'
    ],
    answer: 1,
    why: 'FanPedia uses buffer strips when stainless must not be welded to mild steel, and a bolt-on pedestal for dissimilar metals.'
  }
];

const letters = ['A', 'B', 'C', 'D'];
const MASTERY = 5;
const exampleLine = '601°F-800°F package; mild steel and Corten or stainless steel; insulated jacket.';
// Spec feedback wording (overrides the §4.2 defaults); ✓/✗ added so colour is not the only cue
const MSG_CORRECT = FP.msg.OK + ' Recommended construction is sound.';
const MSG_WRONG = FP.msg.BAD + ' That breaks a rule.';
const MSG_MASTERY = 'You can turn an airstream into a construction line.';
const REVIEW_POINTER = 'Review the reasons above, then press Start over';
const NOTE = ['Illustrative inquiries', 'Rules: FanPedia pp. 85-145', 'Keys: A-D choose, Enter recommends or goes on'];

// ---------- engine: first attempt scored, fixed order ----------
const deck = new FP.CardDeck({
  cards: inquiries, shuffle: false, attempts: 1, retryMissed: false,
  noun: 'Inquiries', mastery: MASTERY, reviewPointer: REVIEW_POINTER,
  label: (answer) => letters[answer], id: SIM_ID
});

// ---------- per-inquiry display state ----------
let selected = -1;   // option currently selected (not yet committed)
let records = [];    // per inquiry: { first, practice, revealed }
let summaryPage = 0; // narrow screens: the summary rows are split into 1-3 and 4-6
let contentTop = 59; // y below the status line (set in draw)
const PAGE_ROWS = [[0, 1, 2], [3, 4, 5]];

// ---------- controls ----------
let letterButtons = [];
let recommendButton, nextButton, restartButton;
const keys = K.keys.bind({
  a: () => selectOption(0), b: () => selectOption(1), c: () => selectOption(2), d: () => selectOption(3),
  Enter: enterKey
});

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));

  // Create every control before positioning any of them
  for (let i = 0; i < 4; i++) {
    const b = K.button(letters[i], () => selectOption(i));
    b.addClass('choice');
    b.attribute('aria-label', 'Option ' + letters[i]);
    letterButtons.push(b);
  }
  recommendButton = K.button('Recommend', commitRecommendation);
  nextButton = K.button('Next inquiry', nextInquiry);
  restartButton = K.button(FP.msg.START_OVER, resetAll, { variant: 'secondary' });

  positionControls();
  resetAll();

  describe('Construction Class Advisor: six illustrative fan inquiries with airstream condition tags. ' +
    'Choose option A, B, C or D, press Recommend to commit, then read whether the construction is sound and why. ' +
    'The first answer to each inquiry is scored; a summary lists every answer and the first-attempt score out of 6.');
  noLoop();
}

function optionX() { return canvasWidth >= 420 ? 80 : K.layout.margin; }

function positionControls() {
  // Row 0: option letters | Recommend; row 1: Next inquiry, Start over (+ hint)
  K.flowButtons(0, letterButtons.concat(['|', recommendButton]), { x: optionX() });
  K.flowButtons(1, [nextButton, restartButton]);
}

function resetAll() {
  deck.newRound();
  selected = -1;
  summaryPage = 0;
  records = inquiries.map(() => ({ first: -1, practice: -1, revealed: false }));
  updateButtons();
  redraw();
}

function inSummary() { return deck.state().phase === 'summary'; }
function cur() { return deck.state().index; }

function selectOption(i) {
  if (inSummary()) return;
  const r = records[cur()];
  if (r.revealed || r.practice >= 0) return;
  if (r.first === i) return;  // the practice attempt must be a different option
  selected = i;
  updateButtons();
  redraw();
}

function commitRecommendation() {
  if (inSummary() || selected < 0) return;
  const idx = cur();
  const r = records[idx];
  const q = inquiries[idx];
  if (r.first < 0) {
    r.first = selected;                        // scored attempt (locks the deck card)
    deck.place(selected);
    if (selected === q.answer) r.revealed = true;
  } else if (r.practice < 0 && !r.revealed) {
    r.practice = selected;                     // practice attempt (not scored)
    r.revealed = true;                         // correct option shown after practice
    FP.events.emit('answered', {
      source: SIM_ID, itemId: q.id, index: idx, value: selected, correct: selected === q.answer,
      attempt: 2, final: true, scored: false
    });
  }
  selected = -1;
  FP.announce(feedbackText(idx).join(' '));
  const had = document.activeElement;
  updateButtons();
  keepFocus(had);
  redraw();
}

function nextInquiry() {
  if (inSummary()) { flipSummaryPage(); return; }
  if (records[cur()].first < 0) return;
  records[cur()].revealed = true;  // moving on reveals the correct option for the summary
  selected = -1;
  deck.next();
  if (inSummary()) {
    const s = deck.summary();
    FP.announce(finalLines(s).join('. '));
  } else {
    FP.announce('Inquiry ' + (cur() + 1) + ' of ' + inquiries.length + ': ' + inquiries[cur()].text);
  }
  const had = document.activeElement;
  updateButtons();
  keepFocus(had);
  redraw();
}

// A button that just became disabled drops keyboard focus; move it to the next useful control
function keepFocus(a) {
  if (!a || a.tagName !== 'BUTTON' || !a.disabled) return;
  const order = [nextButton].concat(letterButtons, [restartButton]);
  const target = inSummary() ? (nextButton.elt.disabled ? restartButton : nextButton)
    : order.find(b => !b.elt.disabled);
  if (target) target.elt.focus();
}

function enterKey() {
  if (selected >= 0) commitRecommendation();
  else if (inSummary() ? summaryPaged() : records[cur()].first >= 0) nextInquiry();
}

// Summary paging (only when all six rows do not fit at 12 px)
function allRows() { return [0, 1, 2, 3, 4, 5]; }
function summaryPaged() {
  if (!inSummary()) return false;
  return layoutSummary(contentTop, 12, false, allRows()) > drawHeight - 24;
}
function flipSummaryPage() {
  if (!summaryPaged()) return;
  summaryPage = 1 - summaryPage;
  const rows = PAGE_ROWS[summaryPage];
  FP.announce('Summary, inquiries ' + (rows[0] + 1) + ' to ' + (rows[rows.length - 1] + 1) + '.');
  updateButtons();
  redraw();
}

function updateButtons() {
  const summary = inSummary();
  const r = records[cur()] || records[0];
  const choosing = !summary && !r.revealed && r.practice < 0;
  for (let i = 0; i < 4; i++) {
    K.setEnabled(letterButtons[i], choosing && r.first !== i);
    const on = i === selected;
    if (on) letterButtons[i].addClass('selected'); else letterButtons[i].removeClass('selected');
    letterButtons[i].attribute('aria-pressed', on ? 'true' : 'false');
  }
  K.setEnabled(recommendButton, choosing && selected >= 0);
  const paged = summaryPaged();
  K.setEnabled(nextButton, paged || (!summary && r.first >= 0));
  nextButton.html(paged ? (summaryPage === 0 ? 'Inquiries 4-6' : 'Inquiries 1-3')
    : (deck.state().isLast ? 'See summary' : 'Next inquiry'));
  positionControls();   // the Next label changes width
}

// ---------- feedback text ----------
function feedbackText(idx) {
  const r = records[idx];
  const q = inquiries[idx];
  const last = r.practice >= 0 ? r.practice : r.first;
  const verdict = last === q.answer ? MSG_CORRECT : MSG_WRONG;
  const head = r.practice >= 0 ? FP.msg.practice(verdict) : 'First attempt (scored): ' + verdict;
  const extra = r.revealed
    ? 'Correct recommendation: ' + letters[q.answer] + '.'
    : 'You may choose again once for practice; your first answer is the one scored.';
  return [head, q.why, extra];
}

function finalLines(s) {
  return [
    s.lines[0],
    s.mastered ? FP.msg.masteryReached(s.mastery, s.total) + ' ' + MSG_MASTERY
      : FP.msg.masteryNeeds(s.mastery, s.total, REVIEW_POINTER)
  ];
}

// ---------- drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  const y = K.title('Construction Class Advisor');
  const st = deck.state();
  const right = inSummary() ? (summaryPaged() ? 'Summary ' + (summaryPage + 1) + ' of 2' : 'Summary') : 'Inquiry ' + (st.index + 1) + ' of ' + inquiries.length;
  const top = K.statusLine(st.scoreLabel, right, NOTE, { y: y - 2 });
  contentTop = top;

  if (inSummary()) drawSummary(top); else drawInquiry(top);

  // control-region label and hint
  noStroke();
  textStyle(NORMAL);
  textAlign(LEFT, CENTER);
  if (optionX() > K.layout.margin) {
    fill(K.tok('--fp-text'));
    textSize(16);
    text('Option:', 12, K.controlLabel(0));
  }
  const hx = parseFloat(restartButton.elt.style.left || '0') + restartButton.elt.offsetWidth + 16;
  const hint = hintText();
  textSize(14);
  if (hx + textWidth(hint) < canvasWidth - 8) {
    fill(K.tok('--fp-text-muted'));
    text(hint, hx, K.controlLabel(1));
  }
}

function hintText() {
  if (inSummary()) return summaryPaged() ? 'Two summary pages.' : 'Press Start over to try again.';
  const r = records[cur()];
  if (r.first < 0) return selected < 0 ? 'Pick A-D, then Recommend.' : 'Press Recommend to commit.';
  if (!r.revealed && r.practice < 0) return 'Optional: one practice attempt.';
  return 'Press ' + (deck.state().isLast ? 'See summary.' : 'Next inquiry.');
}

function drawLines(lines, x, y, lh) {
  for (let i = 0; i < lines.length; i++) text(lines[i], x, y + i * lh);
  return lines.length * lh;
}

function boldWrap(str, maxW) {
  textStyle(BOLD);
  const lines = K.wrapLines(str, maxW);
  textStyle(NORMAL);
  return lines;
}

// Text, status label and colours for option card i (used to measure and to draw)
function cardInfo(i, innerW, ts) {
  const idx = cur();
  const q = inquiries[idx];
  const r = records[idx];
  textSize(ts);
  const lh = ts * 1.3;
  const lines = K.wrapLines(q.options[i], innerW - 60);
  const isFirst = r.first === i;
  const isPractice = r.practice === i;
  let bg = K.tok('--fp-ctrl-bg'), border = K.tok('--fp-border'), badge = K.tok('--fp-text-muted'), ink = K.tok('--fp-text');
  let weight = 1, dashed = false, tag = '';
  if (i === selected) {
    bg = K.tok('--fp-primary-bg'); border = K.tok('--fp-primary'); badge = border; ink = K.tok('--fp-primary-dark');
    weight = 3; tag = FP.msg.OK + ' selected';
  }
  if ((isFirst || isPractice) && i !== q.answer) {
    bg = K.tok('--fp-incorrect-bg'); border = K.tok('--fp-incorrect'); badge = border; ink = border;
    weight = 2; dashed = true;
    tag = FP.msg.BAD + (isFirst ? ' your first answer: breaks a rule' : ' practice answer: breaks a rule');
  }
  if (r.revealed && i === q.answer) {
    bg = K.tok('--fp-correct-bg'); border = K.tok('--fp-correct'); badge = border; ink = border;
    weight = 3; dashed = false;
    tag = FP.msg.OK + (isFirst ? ' your first answer: correct' : (isPractice ? ' practice answer: correct' : ' correct recommendation'));
  }
  let h = lines.length * lh + 18;
  if (tag) {
    // give the status label its own line when it would collide with the last text line
    textSize(Math.max(ts - 2, 12));
    textStyle(BOLD);
    const tagW = textWidth(tag);
    textStyle(NORMAL);
    textSize(ts);
    const lastW = textWidth(lines[lines.length - 1]);
    if (44 + lastW + 16 + tagW > innerW - 8) h += ts;
  }
  return { lines, h, bg, border, badge, ink, weight, dashed, tag };
}

// Lay out the inquiry screen at text size ts; draws when doDraw, returns the bottom y
function layoutInquiry(top, ts, doDraw) {
  const idx = cur();
  const q = inquiries[idx];
  const r = records[idx];
  const innerW = canvasWidth - 2 * margin;
  const lh = ts * 1.3;
  let y = top + 4;
  textSize(ts);
  textAlign(LEFT, TOP);
  noStroke();

  // inquiry box (prompt panel)
  const qLines = K.wrapLines(q.text, innerW - 20);
  const boxH = qLines.length * lh + 14;
  if (doDraw) {
    K.panel(margin, y, innerW, boxH, { fill: '--fp-primary-bg', stroke: '--fp-primary', weight: 1.5 });
    fill(K.tok('--fp-text'));
    drawLines(qLines, margin + 10, y + 7, lh);
  }
  y += boxH + 8;

  // airstream condition tags (text chips)
  if (doDraw) {
    fill(K.tok('--fp-text'));
    textAlign(LEFT, CENTER);
    text('Airstream:', margin, y + (lh + 8) / 2);
    let tx = margin + textWidth('Airstream:') + 10;
    for (const t of q.tags) {
      const w = textWidth(t) + 18;
      K.panel(tx, y, w, lh + 8, { fill: '--fp-ctrl-bg', stroke: '--fp-text-muted', radius: 12 });
      noStroke();
      fill(K.tok('--fp-text'));
      text(t, tx + 9, y + (lh + 8) / 2);
      tx += w + 8;
    }
    textAlign(LEFT, TOP);
  }
  y += lh + 18;

  // prompt
  if (doDraw) {
    fill(K.tok('--fp-text'));
    textStyle(BOLD);
    text('What should the construction line say?', margin, y);
    textStyle(NORMAL);
  }
  y += lh + 8;

  // option cards
  for (let i = 0; i < 4; i++) {
    const c = cardInfo(i, innerW, ts);
    if (doDraw) {
      K.panel(margin, y, innerW, c.h, { fill: c.bg, stroke: c.border, weight: c.weight, dashed: c.dashed });
      noStroke();
      fill(c.badge);
      circle(margin + 20, y + c.h / 2, 26);
      fill(K.tok('--fp-ctrl-bg'));
      textStyle(BOLD);
      textAlign(CENTER, CENTER);
      text(letters[i], margin + 20, y + c.h / 2);
      textAlign(LEFT, TOP);
      textStyle(NORMAL);
      fill(K.tok('--fp-text'));
      drawLines(c.lines, margin + 44, y + 9, lh);
      if (c.tag) {
        textSize(Math.max(ts - 2, 12));
        textStyle(BOLD);
        fill(c.ink);
        textAlign(RIGHT, TOP);
        text(c.tag, margin + innerW - 8, y + c.h - Math.max(ts - 2, 12) - 5);
        textAlign(LEFT, TOP);
        textStyle(NORMAL);
        textSize(ts);
      }
    }
    y += c.h + 8;
  }

  // feedback panel
  y += 2;
  textSize(ts);
  if (r.first < 0) {
    const msg = 'Choose one option, then press Recommend. The reason appears after you commit.';
    const lines = K.wrapLines(msg, innerW);
    if (doDraw) {
      fill(K.tok('--fp-text-muted'));
      textStyle(ITALIC);
      drawLines(lines, margin, y, lh);
      textStyle(NORMAL);
    }
    return y + lines.length * lh;
  }
  const [headT, whyT, extraT] = feedbackText(idx);
  const good = (r.practice >= 0 ? r.practice : r.first) === q.answer;
  const head = boldWrap(headT, innerW - 20);
  const body = K.wrapLines(whyT, innerW - 20);
  const extra = K.wrapLines(extraT, innerW - 20);
  const fh = (head.length + body.length + extra.length) * lh + 16;
  if (doDraw) {
    K.panel(margin, y, innerW, fh, {
      fill: good ? '--fp-correct-bg' : '--fp-incorrect-bg',
      stroke: good ? '--fp-correct' : '--fp-incorrect', weight: 2, dashed: !good, radius: 10
    });
    noStroke();
    let fy = y + 8;
    fill(K.tok(good ? '--fp-correct' : '--fp-incorrect'));
    textStyle(BOLD);
    fy += drawLines(head, margin + 10, fy, lh);
    textStyle(NORMAL);
    fill(K.tok('--fp-text'));
    fy += drawLines(body, margin + 10, fy, lh);
    fill(K.tok('--fp-primary-dark'));
    textStyle(ITALIC);
    drawLines(extra, margin + 10, fy, lh);
    textStyle(NORMAL);
  }
  return y + fh;
}

function drawInquiry(top) {
  const maxY = drawHeight - 24;   // keep the data label clear
  const ts = K.fitTextSize(s => layoutInquiry(top, s, false), maxY, 16, 12);
  layoutInquiry(top, ts, true);
}

// Summary rows, measured or drawn at text size ts; returns the bottom y
function layoutSummary(top, ts, doDraw, rows) {
  const innerW = canvasWidth - 2 * margin;
  const lh = ts * 1.3;
  const small = Math.max(ts - 2, 12);
  const slh = small * 1.3;
  const s = deck.summary();
  let y = top + 2;
  textAlign(LEFT, TOP);
  noStroke();

  for (const i of rows) {
    const q = inquiries[i];
    const r = records[i];
    const ok = r.first === q.answer;
    textSize(ts);
    // narrow screens drop the short description so the reasons stay readable
    const label = canvasWidth < 560 ? 'Inquiry ' + (i + 1) : (i + 1) + '. ' + q.short;
    const head = boldWrap((ok ? FP.msg.OK : FP.msg.BAD) + ' ' + label + ' — first answer ' +
      (r.first >= 0 ? letters[r.first] : '-') + (ok ? ' (correct)' : ' (incorrect)') +
      '; correct ' + letters[q.answer], innerW - 16);
    textSize(small);
    const body = K.wrapLines(q.why, innerW - 16);
    const h = head.length * lh + body.length * slh + 12;
    if (doDraw) {
      K.panel(margin, y, innerW, h, {
        fill: ok ? '--fp-correct-bg' : '--fp-incorrect-bg',
        stroke: ok ? '--fp-correct' : '--fp-incorrect', dashed: !ok, radius: 6
      });
      noStroke();
      textSize(ts);
      textStyle(BOLD);
      fill(K.tok(ok ? '--fp-correct' : '--fp-incorrect'));
      drawLines(head, margin + 8, y + 5, lh);
      textStyle(NORMAL);
      textSize(small);
      fill(K.tok('--fp-text'));
      drawLines(body, margin + 8, y + 5 + head.length * lh, slh);
    }
    y += h + 5;
  }

  // worked example: inquiry 4 as a construction line
  textSize(ts);
  const exLines = K.wrapLines('Construction line for inquiry 4: ' + exampleLine, innerW - 16);
  const exH = exLines.length * lh + 12;
  if (doDraw) {
    K.panel(margin, y, innerW, exH, { fill: '--fp-primary-bg', stroke: '--fp-primary', radius: 6 });
    noStroke();
    fill(K.tok('--fp-primary-dark'));
    drawLines(exLines, margin + 8, y + 6, lh);
  }
  y += exH + 8;

  // first-attempt score and mastery line
  const fl = finalLines(s);
  const vLines = boldWrap(fl[0], innerW).concat(boldWrap(fl[1], innerW));
  if (doDraw) {
    textStyle(BOLD);
    fill(K.tok(s.mastered ? '--fp-correct' : '--fp-text'));
    drawLines(vLines, margin, y, lh);
    textStyle(NORMAL);
  }
  y += vLines.length * lh;
  return y;
}

function drawSummary(top) {
  const maxY = drawHeight - 24;
  const rows = summaryPaged() ? PAGE_ROWS[summaryPage] : allRows();
  const ts = K.fitTextSize(s => layoutSummary(top, s, false, rows), maxY, 16, 12);
  layoutSummary(top, ts, true, rows);
}

// ---------- keyboard: A-D select, Enter commits (or moves on once committed) ----------
function keyPressed() { return keys(); }

// ---------- responsive sizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  updateButtons();
  redraw();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
