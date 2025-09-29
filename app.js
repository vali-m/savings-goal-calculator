(function(){
  const el = id => document.getElementById(id);
  const usdFmt = new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2, minimumFractionDigits:2});
  const fmt = n => {
    if (!isFinite(n)) return "";
    return usdFmt.format(n);
  };

  const form = el('calcForm');
  const note = el('note');
  const tableWrap = el('tableWrap');
  const inputs = {
    initial: el('initial'),
    ror: el('ror'),
    years: el('years'),
    yearly: el('yearly'),
    objective: el('objective')
  };

  const currencyInputs = [inputs.initial, inputs.yearly, inputs.objective];

  function formatCurrencyInput(inputEl){
    const n = parseNumber(inputEl.value);
    inputEl.value = n === null ? '' : fmt(n);
  }

  function unformatCurrencyInput(inputEl){
    const n = parseNumber(inputEl.value);
    inputEl.value = n === null ? '' : String(n);
  }

  currencyInputs.forEach(inp=>{
    inp.addEventListener('focus', ()=>unformatCurrencyInput(inp));
    inp.addEventListener('blur', ()=>formatCurrencyInput(inp));
  });

  // Format defaults on load
  formatCurrencyInput(inputs.initial);

  function clearComputedOutline(){
    inputs.years.classList.remove('computed');
    inputs.yearly.classList.remove('computed');
    inputs.objective.classList.remove('computed');
  }

  function simulate(P0, r, S, N){
    // Returns array of {year, amount, returns}
    const rows = [{year:0, amount:P0, returns:0}];
    let A = P0;
    for(let k=1;k<=N;k++){
      const ret = A * r; // nominal return for the year, excluding new savings
      A = A * (1 + r) + S; // end-of-year contribution
      rows.push({year:k, amount:A, returns:ret});
    }
    return rows;
  }

  function yearsToTarget(P0, r, S, target, cap=10000){
    if (target <= P0) return {years:0, rows:[{year:0, amount:P0, returns:0}]};
    let A = P0, rows=[{year:0, amount:P0, returns:0}], y=0;
    for(y=1; y<=cap; y++){
      const ret = A * r;
      A = A * (1 + r) + S;
      rows.push({year:y, amount:A, returns:ret});
      if (A >= target) return {years:y, rows};
    }
    return {years:null, rows};
  }

  function renderTable(rows){
    if (!rows || rows.length===0){ tableWrap.innerHTML=''; return; }
    let html = '<table><thead><tr><th>Year</th><th>Portfolio</th><th>Investment Returns since last year</th></tr></thead><tbody>';
    html += rows.map(r=>`<tr><td>${r.year}</td><td>${fmt(r.amount)}</td><td>${fmt(r.returns)}</td></tr>`).join('');
    html += '</tbody></table>';
    tableWrap.innerHTML = html;
  }

  function setNote(text, cls){
    note.className = 'note' + (cls? ' ' + cls : '');
    note.textContent = text || '';
  }

  function parseNumber(v){
    if (v === '' || v === null || v === undefined) return null;
    if (typeof v === 'string') v = v.replace(/[^0-9.\-]/g, '');
    const n = Number(v);
    return isNaN(n) ? null : n;
  }

  el('resetBtn').addEventListener('click', ()=>{
    form.reset();
    inputs.initial.value = '0';
    inputs.ror.value = '7';
    clearComputedOutline();
    setNote('','');
    tableWrap.innerHTML='';
    formatCurrencyInput(inputs.initial);
  });

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    clearComputedOutline();
    setNote('', '');

    const P0 = parseNumber(inputs.initial.value);
    const rPct = parseNumber(inputs.ror.value);

    if (P0 === null || rPct === null){
      setNote('Initial amount and expected return are required.', 'error');
      return;
    }
    const r = rPct / 100;
    if (r <= -1){
      setNote('Rate must be greater than -100%.', 'error');
      return;
    }

    const N_in = parseNumber(inputs.years.value);
    const S_in = parseNumber(inputs.yearly.value);
    const F_in = parseNumber(inputs.objective.value);

    const trio = [N_in, S_in, F_in];
    const emptyCount = trio.filter(v => v === null).length;
    if (emptyCount !== 1){
      setNote('Leave exactly one of: Years, Yearly saved, or Objective blank.', 'error');
      tableWrap.innerHTML='';
      return;
    }

    // Compute the missing one
    let N = N_in, S = S_in, F = F_in, rows = null;

    // Case A: Objective missing
    if (F === null){
      if (N === null || S === null){
        setNote('Provide Years and Yearly saved to compute Objective.', 'error');
        return;
      }
      if (N < 0){ setNote('Years cannot be negative.', 'error'); return; }
      rows = simulate(P0, r, S, Math.floor(N));
      F = rows[rows.length-1].amount;
      inputs.objective.value = fmt(F);
      inputs.objective.classList.add('computed');
      renderTable(rows);
      if (S < 0) setNote('Computed with negative yearly savings. Verify inputs.', 'warn');
      return;
    }

    // Case B: Years missing
    if (N === null){
      if (S === null){ setNote('Provide Yearly saved to compute Years.', 'error'); return; }
      if (F <= 0 && P0 <= 0 && S <= 0 && r <= 0){
        setNote('Unreachable target with non-positive values.', 'error');
        return;
      }
      const res = yearsToTarget(P0, r, S, F);
      if (res.years === null){
        setNote('Target not reached within 10,000 years. Adjust inputs.', 'error');
        tableWrap.innerHTML='';
        return;
      }
      N = res.years;
      inputs.years.value = String(N);
      inputs.years.classList.add('computed');
      rows = res.rows;
      renderTable(rows);
      if (S < 0) setNote('Computed years given negative yearly savings. Verify inputs.', 'warn');
      return;
    }

    // Case C: Yearly saved missing
    if (S === null){
      if (N < 0){ setNote('Years cannot be negative.', 'error'); return; }
      // Solve S from closed-form. Handle r==0 separately.
      const n = Math.floor(N);
      const g = (1 + r) ** n;
      if (n === 0){
        if (F !== P0){
          setNote('With 0 years, target must equal initial. Increase years to save.', 'error');
          tableWrap.innerHTML='';
          return;
        }
        S = 0; // trivial
      } else if (r === 0){
        S = (F - P0) / n;
      } else {
        const denom = (g - 1) / r;
        S = (F - P0 * g) / denom;
      }
      inputs.yearly.value = Number.isFinite(S) ? fmt(S) : '';
      inputs.yearly.classList.add('computed');
      rows = simulate(P0, r, S, n);
      renderTable(rows);
      if (S < 0) setNote('Computed negative yearly savings to meet target. Verify feasibility.', 'warn');
      return;
    }
  });
})();
