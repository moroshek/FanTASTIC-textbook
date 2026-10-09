// Motor Line Decoder - HTML predict-then-reveal decoder
// CANVAS_HEIGHT: 660
// Learners interpret each of the ten fields of the motor line
// "50 HP, 1800 RPM, IN, P, 3 Phase, 60 Frequency, 460 Volt, SD, TEFC, 326T",
// picking one of four meanings before the field's explanation is revealed.
// Built on the FanPedia kit: FP.CardDeck (fields, first-try score, mastery),
// FP.rng (seeded shuffle of the four choices), FP.msg, FP.ui, FP.announce.
// Source: FanPedia p. 71 (typical motor specification line), p. 72 (efficiency),
// p. 73 (enclosure and duty), p. 74 (frame letters). Distractors are illustrative.
(function () {
  'use strict';

  const SIM_ID = 'ch14-motor-line-decoder';
  const MASTERY = 8;

  // Ten fields in order. choices[0] is the correct meaning (shuffled when shown).
  // decoded: the short meaning kept under the field once answered.
  // notes: one-line notes for the misconception choices (spec Feedback).
  const FIELDS = [
    { code: '50 HP', choices: ['Rated power 50 horsepower', 'Fan brake horsepower at design', 'Service-factor limit', 'Motor weight class'],
      explain: 'Rated output power; about 37 kW using kW = HP × 0.7457.', decoded: 'Rated power, ≈37 kW' },
    { code: '1800 RPM', choices: ['Synchronous speed of a 4-pole 60 Hz motor', 'Exact full-load speed', 'Fan speed on a belt drive', 'Maximum safe speed'],
      explain: '120 × 60 / 4 = 1800; the motor runs slightly slower because of slip.', decoded: 'Synchronous speed, 4-pole',
      notes: { 'Exact full-load speed': 'Induction motors run slightly below synchronous speed because of slip.' } },
    { code: 'IN', choices: ['Induction technology', 'Insulated bearings', 'Indoor use only', 'Inverter duty'],
      explain: 'The technology field is IN (induction) or EC (electronically commutated).', decoded: 'Induction' },
    { code: 'P', choices: ['Premium Efficiency', 'Phase', 'Pivot base', 'Piggyback mount'],
      explain: 'TCF Premium Efficiency is comparable to NEMA Premium and IEC IE3.', decoded: 'Premium Efficiency',
      notes: { 'Phase': 'Phase appears later as 3 Phase; P here is efficiency.' } },
    { code: '3 Phase', choices: ['Three-phase AC supply', 'Three poles', 'Three-speed motor', 'Third efficiency tier'],
      explain: 'Part of the electric power field: phase.', decoded: 'Three-phase AC' },
    { code: '60 Frequency', choices: ['60 Hz supply frequency', '60 percent load', '60 °C rise', '60-minute rating'],
      explain: 'Part of the electric power field: frequency (cycles per second).', decoded: '60 Hz supply',
      notes: { '60 percent load': 'Frequency is the supply\'s cycles per second, 60 Hz.' } },
    { code: '460 Volt', choices: ['460 V supply voltage', '460 W input', '460 RPM', '460 frame'],
      explain: 'Part of the electric power field: voltage.', decoded: '460 V supply' },
    { code: 'SD', choices: ['Severe Duty', 'Standard Duty', 'Single Drive', 'Slide base'],
      explain: 'Intended duty; GD is general duty, DFG is explosion proof.', decoded: 'Severe Duty',
      notes: { 'Standard Duty': 'General duty is GD; SD is severe duty.' } },
    { code: 'TEFC', choices: ['Totally enclosed fan cooled', 'Totally enclosed, fan cover removed', 'Temperature-rated, fully certified', 'Thermally protected'],
      explain: 'Sealed windings; an external fan blows air over the frame.', decoded: 'Totally enclosed fan cooled' },
    { code: '326T', choices: ['NEMA 326 frame, T-frame foot mount', '326 lb motor', 'TEFC frame 326', '32.6 kW rating'],
      explain: 'Shaft height is 32/4 = 8 inches from the bottom of the feet.', decoded: 'NEMA 326 T-frame, 8 in. shaft height',
      notes: { 'TEFC frame 326': 'T marks the standard T-frame foot mount, not the enclosure.' } }
  ].map((f, i) => Object.assign(f, {
    id: 'field-' + (i + 1),
    answer: f.choices[0],
    // four choices in a fixed shuffled order per field (same for every learner)
    shown: FP.rng.shuffle(f.choices, SIM_ID + '-' + (i + 1)),
    question: 'What does ' + f.code + ' tell you about this motor?'
  }));

  const $ = id => document.getElementById(id);

  const deck = new FP.CardDeck({
    cards: FIELDS, shuffle: false, attempts: 1, retryMissed: false,
    noun: 'First-try', mastery: MASTERY, id: SIM_ID,
    reviewPointer: 'Reread "Reading the Whole Motor Line" for the fields you missed, then press Start over.',
    // Spec wording: Correct "Correct: " + explanation; incorrect "Not quite: " + explanation (+ note)
    messages: {
      correct: res => FP.msg.OK + ' Correct: ' + res.card.explain,
      missed: res => {
        const note = res.card.notes && res.card.notes[res.chosen];
        return FP.msg.BAD + ' Not quite: ' + res.card.explain + ' The meaning is "' + res.card.answer + '".' +
          (note ? ' ' + note : '');
      }
    }
  });

  let picks = [];        // learner's pick per field
  let viewing = -1;      // answered field whose explanation is reopened (exploration)

  // ------------------------------------------------------------------ line
  function buildLine() {
    const ol = $('line');
    FIELDS.forEach((f, i) => {
      const li = document.createElement('li');
      li.className = 'mld-field';
      li.dataset.i = i;
      ol.appendChild(li);
    });
  }

  function renderLine() {
    const st = deck.state();
    const summary = st.phase === 'summary';
    document.querySelectorAll('#line .mld-field').forEach(li => {
      const i = +li.dataset.i;
      const f = FIELDS[i];
      const answered = picks[i] !== undefined;
      li.innerHTML = '';
      const chip = document.createElement(answered ? 'button' : 'span');
      chip.className = 'mld-chip';
      chip.textContent = f.code;
      if (answered) {
        chip.type = 'button';
        chip.setAttribute('aria-label', f.code + ': ' + f.decoded + '. Show the explanation.');
        chip.addEventListener('click', () => showExplanation(i));
        if (viewing === i) chip.classList.add('mld-seen');
      } else {
        chip.setAttribute('aria-label', 'Field ' + (i + 1) + ': ' + f.code + (i === st.index && !summary ? ', current field' : ', not yet decoded'));
      }
      if (!summary && i === st.index) chip.classList.add('mld-cur');
      li.appendChild(chip);
      const m = document.createElement('div');
      m.className = 'mld-meaning';
      if (answered) {
        const ok = picks[i] === f.answer;
        m.classList.add(ok ? 'ok' : 'bad');
        m.textContent = f.decoded;
        m.title = ok ? 'Decoded on the first try' : 'Missed on the first try';
      }
      li.appendChild(m);
    });
  }

  // Exploration: reopen an answered field's explanation (never scored).
  function showExplanation(i) {
    const f = FIELDS[i];
    viewing = i;
    const p = $('explore');
    p.hidden = false;
    p.textContent = 'ℹ Field ' + (i + 1) + ', ' + f.code + ': ' + f.answer + '. ' + f.explain;
    FP.announce(p.textContent);
    renderLine();
    const btn = document.querySelector('#line .mld-field[data-i="' + i + '"] .mld-chip');
    if (btn) btn.focus();
  }

  // ------------------------------------------------------------------ activity
  function render() {
    const st = deck.state();
    const summary = st.phase === 'summary';
    $('score').textContent = st.scoreLabel;
    FP.ui.progress($('progress'), st.results, summary ? -1 : st.index, 'Field');
    renderLine();
    const host = $('choices');
    host.innerHTML = '';
    if (summary) {
      $('prompt').textContent = 'The whole line is decoded. Select any field above to reread its explanation.';
    } else {
      const f = st.card;
      $('prompt').textContent = 'Field ' + (st.index + 1) + ' of ' + FIELDS.length + ': ' + f.question;
      f.shown.forEach((c, k) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'choice';
        b.dataset.choice = c;
        b.textContent = (k + 1) + ' · ' + c;
        b.disabled = st.phase !== 'choose';
        if (st.phase === 'feedback') {
          if (c === f.answer) b.classList.add('mld-ok');
          else if (c === picks[st.index]) b.classList.add('mld-bad');
        }
        b.addEventListener('click', () => pick(c));
        host.appendChild(b);
      });
    }
    $('nextBtn').hidden = st.phase !== 'feedback';
    $('nextBtn').textContent = st.isLast ? 'Show decoded line' : 'Next field';
  }

  function pick(choice) {
    const st = deck.state();
    if (st.phase !== 'choose') return;
    const res = deck.place(choice);
    if (res.status === 'ignored') return;
    picks[st.index] = choice;
    FP.ui.feedback($('feedback'), res.kind, res.message, { announce: false });
    FP.announce('You picked ' + choice + '. ' + res.message);
    render();
    $('nextBtn').focus();
  }

  function next() {
    const st = deck.state();
    if (st.phase !== 'feedback') return;
    deck.next();
    if (deck.state().phase === 'summary') return showSummary();
    $('feedback').className = 'fp-feedback';
    $('feedback').textContent = '';
    render();
    const n = deck.state();
    FP.announce('Field ' + (n.index + 1) + ' of ' + FIELDS.length + ': ' + n.card.question);
    const first = document.querySelector('#choices button');
    if (first) first.focus();
  }

  function showSummary() {
    const s = deck.summary();
    const fb = $('feedback');
    fb.className = 'fp-feedback final';
    fb.textContent = '';
    // the decoded line stays in the drawing above; here the first-try score and mastery
    s.lines.forEach((t, k) => {
      const d = document.createElement('div');
      d.textContent = t;
      if (k === 0) d.style.fontWeight = 'bold';
      fb.appendChild(d);
    });
    FP.announce(s.lines.join(' '));
    render();
    $('startOver').focus();
  }

  function startOver() {
    deck.newRound();
    picks = [];
    viewing = -1;
    $('explore').hidden = true;
    $('feedback').className = 'fp-feedback';
    $('feedback').textContent = '';
    render();
    FP.announce('Started over. Field 1 of ' + FIELDS.length + ': ' + FIELDS[0].question);
  }

  function setupKeys() {
    document.addEventListener('keydown', e => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const st = deck.state();
      const t = e.target;
      const onButton = t && (t.tagName === 'BUTTON' || t.tagName === 'A');
      if (e.key >= '1' && e.key <= '4' && st.phase === 'choose') {
        e.preventDefault();
        pick(st.card.shown[+e.key - 1]);
      } else if (e.key === 'Enter' && !onButton && st.phase === 'feedback') {
        e.preventDefault();
        next();
      }
    });
  }

  function init() {
    buildLine();
    $('nextBtn').addEventListener('click', next);
    $('startOver').addEventListener('click', startOver);
    setupKeys();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
