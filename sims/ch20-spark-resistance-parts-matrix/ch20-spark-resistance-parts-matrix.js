// Spark Resistance Parts Matrix - plain HTML on the FanPedia kit (Chapter 20)
// CANVAS_HEIGHT: 1170
// The learner sets 18 cells (6 centrifugal fan components x Types A, B, C) to
// Non-ferrous, Steel or Not listed, then presses Check. The first Check is the
// recorded score (FP.Score, mastery 15 of 18); Try Again clears only the wrong
// cells; the second Check or Show Answers reveals the answer table and note.
// Source: FanPedia, Spark Resistant Construction, Centrifugal Fans, pp. 104-106.
(function () {
  'use strict';

  const SIM_ID = 'ch20-spark-resistance-parts-matrix';
  const TYPES = ['Type A', 'Type B', 'Type C'];
  const STATES = [
    { value: 'nonferrous', label: 'Non-ferrous' },
    { value: 'steel', label: 'Steel' },
    { value: 'notlisted', label: 'Not listed' }
  ];
  const N = 'nonferrous', S = 'steel', X = 'notlisted';

  // ---------- Content (chapter specification, fixed row order) ----------
  const ROWS = [
    { id: 'housing', name: 'Housing / frame',
      desc: 'The scroll and sides that enclose the impeller.',
      answers: [N, S, S],
      reason: 'Only Type A makes the whole airstream non-ferrous; B and C keep a steel housing.' },
    { id: 'impeller', name: 'Impeller',
      desc: 'The rotating wheel, with its welded hub.',
      answers: [N, N, S],
      reason: 'Type B is defined by a non-ferrous impeller; Type C leaves the impeller steel.' },
    { id: 'funnel', name: 'Inlet funnel',
      desc: 'The cone that guides air into the impeller eye.',
      answers: [N, S, N],
      reason: 'In Type B the steel inlet cone is the contact point for the aluminum impeller; in Type C the aluminum funnel is the first contact point.' },
    { id: 'rubplate', name: 'Rub plate',
      desc: 'The plate at the housing opening where the shaft passes through.',
      answers: [X, N, N],
      reason: 'Type A\'s list has no rub plate because the airstream parts are already non-ferrous; B and C use an aluminum rub plate at the shaft opening.' },
    { id: 'shaft', name: 'Shaft',
      desc: 'The steel or alloy shaft carrying the impeller.',
      answers: [S, S, S],
      reason: 'The shaft is steel construction in all three types.' },
    { id: 'pedestal', name: 'Pedestal',
      desc: 'The structure that carries the bearings, outside the airstream.',
      answers: [S, S, S],
      reason: 'The pedestal is outside the airstream and is steel in all three types (bolted on for Type A).' }
  ];
  const TOTAL = ROWS.length * TYPES.length;   // 18
  const MASTERY = 15;
  const NOTE = 'Bearings are not allowed in the airstream in any of the three types. Type C at 501°F and above uses a steel funnel with a rubbing band and rubbing bars instead of the aluminum funnel.';
  const MSG = {
    matched: function (n) { return 'You matched ' + n + ' of ' + TOTAL + ' cells.'; },
    good: 'You can tell the three types apart part by part.',
    review: 'Look at the Impeller and Inlet funnel rows first; they carry the main difference between B and C.'
  };
  const label = function (v) { const s = STATES.find(function (x) { return x.value === v; }); return s ? s.label : ''; };

  // ---------- State ----------
  // phase: 'set' (before the first Check), 'retry' (after Try Again), 'checked1'
  // (first Check done, waiting), 'revealed' (answers shown).
  let phase = 'set';
  let checks = 0;
  let firstScore = null;
  const score = new FP.Score({ total: TOTAL, mastery: MASTERY, noun: 'Cells' });
  let cellOk = [];      // per cell index: null | true | false (latest Check)

  const $ = function (id) { return document.getElementById(id); };
  const tbody = $('rows');
  const cells = [];     // {row, col, idx, td, select, mark}
  const reasonRows = [], rowBtns = [];

  // ---------- Build the matrix ----------
  ROWS.forEach(function (row, r) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice srpm-rowbtn';
    btn.textContent = row.name;
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'desc');
    btn.addEventListener('click', function () { toggleDesc(r); });
    rowBtns.push(btn);
    th.appendChild(btn);
    tr.appendChild(th);

    TYPES.forEach(function (type, c) {
      const idx = r * TYPES.length + c;
      const td = document.createElement('td');
      td.className = 'srpm-cell';
      const sel = document.createElement('select');
      sel.id = 'cell-' + row.id + '-' + c;
      sel.setAttribute('aria-label', row.name + ', ' + type);
      sel.add(new Option('Choose…', ''));
      STATES.forEach(function (s) { sel.add(new Option(s.label, s.value)); });
      sel.addEventListener('change', onCellChange);
      const mark = document.createElement('span');
      mark.className = 'srpm-mark';
      mark.hidden = true;
      td.appendChild(sel);
      td.appendChild(mark);
      tr.appendChild(td);
      cells.push({ row: r, col: c, idx: idx, td: td, select: sel, mark: mark });
    });
    tbody.appendChild(tr);

    const rtr = document.createElement('tr');
    rtr.className = 'srpm-reason';
    rtr.hidden = true;
    const rtd = document.createElement('td');
    rtd.colSpan = 4;
    rtr.appendChild(rtd);
    tbody.appendChild(rtr);
    reasonRows.push(rtr);
  });

  // One shared description line (keeps the matrix height fixed); one row open at a time.
  function toggleDesc(r) {
    const open = rowBtns[r].getAttribute('aria-expanded') !== 'true';
    rowBtns.forEach(function (b, i) { b.setAttribute('aria-expanded', open && i === r ? 'true' : 'false'); });
    $('desc').textContent = open ? ROWS[r].name + ': ' + ROWS[r].desc : 'Open a component name to read what it is.';
  }

  function setCount() {
    return cells.filter(function (c) { return c.select.value !== ''; }).length;
  }

  function onCellChange() { render(); }

  // ---------- Check ----------
  function check() {
    if (setCount() < TOTAL || phase === 'checked1' || phase === 'revealed') return;
    checks++;
    let n = 0;
    cellOk = cells.map(function (c) {
      const ok = c.select.value === ROWS[c.row].answers[c.col];
      if (ok) n++;
      return ok;
    });
    const scored = checks === 1;
    cells.forEach(function (c) {
      const ok = cellOk[c.idx];
      if (scored) score.record(c.idx, ok, 1);
      FP.events.emit('answered', {
        source: SIM_ID, itemId: ROWS[c.row].id + '-' + TYPES[c.col].slice(-1),
        index: c.idx, value: c.select.value, correct: ok, attempt: checks,
        final: !scored || ok, scored: scored
      });
    });
    if (scored) {
      firstScore = n;
      const mastered = score.mastered();
      FP.events.emit('completed', { source: SIM_ID, firstAttempt: n, correct: n, total: TOTAL, mastered: mastered });
      if (mastered) FP.events.emit('mastery', { source: SIM_ID, total: TOTAL });
    }
    markCells(false);
    if (checks === 1 && n < TOTAL) {
      phase = 'checked1';
      const good = n >= MASTERY;
      FP.ui.feedback($('feedback'), good ? 'ok' : 'bad',
        (good ? '✓ ' : '✗ ') + MSG.matched(n) + ' ' + (good ? MSG.good : MSG.review) + ' ' +
        score.summaryLines()[1] + ' Wrong cells are marked ✗, with the reason under their row. ' +
        'Press Try Again to fix them, or Show Answers.');
    } else {
      reveal(n);
    }
    render();
  }

  // Mark each cell from cellOk; with answers=true also show the correct state.
  function markCells(answers) {
    cells.forEach(function (c) {
      const ok = cellOk[c.idx];
      const ans = ROWS[c.row].answers[c.col];
      c.td.classList.remove('ok', 'bad');
      c.mark.className = 'srpm-mark';
      c.mark.hidden = ok == null && !answers;
      if (ok === true) {
        c.td.classList.add('ok');
        c.mark.classList.add('ok');
        c.mark.textContent = '✓ Correct';
      } else if (ok === false) {
        c.td.classList.add('bad');
        c.mark.classList.add('bad');
        c.mark.textContent = answers ? '✗ Answer: ' + label(ans) : '✗ Not quite';
      } else if (answers) {
        c.mark.classList.add('ans');
        c.mark.textContent = 'Answer: ' + label(ans);
      } else {
        c.mark.textContent = '';
      }
      c.select.setAttribute('aria-describedby', 'reason-' + c.row);
      const state = ok === true ? 'correct' : ok === false ? 'incorrect' + (answers ? ', answer ' + label(ans) : '') : '';
      c.select.setAttribute('aria-label', ROWS[c.row].name + ', ' + TYPES[c.col] + (state ? ', ' + state : ''));
    });
    ROWS.forEach(function (row, r) {
      const wrong = cells.some(function (c) { return c.row === r && cellOk[c.idx] === false; });
      const show = answers || wrong;
      const td = reasonRows[r].firstChild;
      td.id = 'reason-' + r;
      reasonRows[r].hidden = !show;
      reasonRows[r].classList.toggle('srpm-all', answers && !wrong);
      td.innerHTML = '';
      const b = document.createElement('b');
      b.textContent = (wrong ? '✗ ' : '') + row.name + ': ';
      td.appendChild(b);
      td.appendChild(document.createTextNode(row.reason));
    });
  }

  function reveal(nLatest) {
    phase = 'revealed';
    if (cellOk.length === 0) cellOk = cells.map(function () { return null; });
    markCells(true);
    $('answerNote').textContent = NOTE;
    $('answerNote').hidden = false;
    const fs = firstScore;
    const lines = [];
    if (fs != null) {
      if (checks === 1) lines.push(MSG.matched(fs));
      lines.push(score.summaryLines()[0] + ' (recorded).');
      lines.push(fs >= MASTERY ? score.summaryLines()[1] + ' ' + MSG.good : score.summaryLines(MSG.review)[1]);
      if (checks === 2 && nLatest != null) lines.push('Second Check (not scored): ' + nLatest + ' of ' + TOTAL + '.');
    } else {
      lines.push('Answers shown before a Check; nothing was scored.');
    }
    lines.push('Every cell now shows its answer.');
    FP.ui.feedback($('feedback'), 'final', lines.join(' '));
  }

  function tryAgain() {
    if (phase !== 'checked1') return;
    phase = 'retry';
    cells.forEach(function (c) {
      if (cellOk[c.idx] === false) {
        c.select.value = '';
        cellOk[c.idx] = null;
      }
    });
    markCells(false);
    FP.ui.feedback($('feedback'), 'info', 'The correct cells are kept and locked. Set the cleared cells again and press Check. Your first-Check score of ' + firstScore + ' of ' + TOTAL + ' stays recorded.');
    render();
    const first = cells.find(function (c) { return c.select.value === ''; });
    if (first) first.select.focus();
  }

  function showAnswers() {
    if (phase === 'revealed') return;
    reveal(null);
    render();
  }

  function startOver() {
    phase = 'set';
    checks = 0;
    firstScore = null;
    score.reset();
    cellOk = [];
    cells.forEach(function (c) {
      c.select.value = '';
      c.td.classList.remove('ok', 'bad');
      c.mark.hidden = true;
      c.mark.textContent = '';
      c.select.removeAttribute('aria-describedby');
      c.select.setAttribute('aria-label', ROWS[c.row].name + ', ' + TYPES[c.col]);
    });
    reasonRows.forEach(function (r) { r.hidden = true; });
    $('answerNote').hidden = true;
    FP.ui.feedback($('feedback'), 'info', 'Set all 18 cells, then press Check.', { announce: false });
    render();
  }

  // ---------- Render controls ----------
  function render() {
    const had = document.activeElement;
    const n = setCount();
    const left = TOTAL - n;
    cells.forEach(function (c) {
      c.select.disabled = phase === 'revealed' || phase === 'checked1' || cellOk[c.idx] === true;
    });
    const canCheck = (phase === 'set' || phase === 'retry') && left === 0;
    $('check').disabled = !canCheck;
    $('check').hidden = phase === 'revealed';
    $('tryAgain').hidden = phase !== 'checked1';
    $('showAnswers').hidden = phase === 'revealed' || phase === 'set';
    if (phase === 'set' || phase === 'retry') {
      $('remaining').textContent = left === 0 ? 'All cells set: press Check.' :
        left + (left === 1 ? ' cell remains' : ' cells remain') + ' empty.';
    } else {
      $('remaining').textContent = '';
    }
    $('score').textContent = firstScore == null ? 'Cells set: ' + n + ' of ' + TOTAL
      : 'First Check: ' + firstScore + ' of ' + TOTAL + ' cells (recorded)';
    $('attempt').textContent = phase === 'revealed' ? 'Answers revealed'
      : 'Check ' + Math.min(checks + 1, 2) + ' of 2';
    // Keep keyboard focus on something usable when a button hides or disables.
    if (had && had !== document.body && (had.disabled || had.hidden || had.offsetParent === null)) {
      const order = [$('tryAgain'), $('check'), $('showAnswers'), $('startOver')];
      const next = order.find(function (b) { return !b.disabled && !b.hidden; });
      if (next) next.focus();
    }
  }

  $('check').addEventListener('click', check);
  $('tryAgain').addEventListener('click', tryAgain);
  $('showAnswers').addEventListener('click', showAnswers);
  $('startOver').addEventListener('click', startOver);

  startOver();
})();
