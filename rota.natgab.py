<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>NATGAB Duty Board</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<style>
  :root{
    --bg:#EDEBE2;
    --surface:#FFFFFF;
    --surface-2:#F6F4EC;
    --ink:#1D2622;
    --ink-soft:#5B6560;
    --line:#DBD7C8;
    --teal:#1F6F63;
    --teal-deep:#123F38;
    --gold:#B8862F;
    --work:#1F7A55;
    --work-bg:#E4F1E9;
    --off:#7C8580;
    --off-bg:#EAE9E4;
    --leave:#B8862F;
    --leave-bg:#F5EBD6;
    --sick:#B24638;
    --sick-bg:#F6E4E0;
    --other:#5C6B9E;
    --other-bg:#E7EAF4;
    --radius:10px;
    --font-display:'Space Grotesk', system-ui, sans-serif;
    --font-body:'IBM Plex Sans', system-ui, sans-serif;
    --font-mono:'IBM Plex Mono', ui-monospace, monospace;
  }
  *{box-sizing:border-box;}
  @media (prefers-reduced-motion: reduce){
    *{animation:none !important; transition:none !important;}
  }
  body{
    margin:0;
    background:var(--bg);
    color:var(--ink);
    font-family:var(--font-body);
    -webkit-font-smoothing:antialiased;
  }
  .board{
    max-width:920px;
    margin:0 auto;
    padding:20px 16px 60px;
  }
  .board__header{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:16px;
    flex-wrap:wrap;
    padding-bottom:18px;
    border-bottom:2px solid var(--ink);
    margin-bottom:20px;
  }
  .brand{display:flex; align-items:center; gap:12px;}
  .brand__mark{
    font-family:var(--font-display);
    font-weight:700;
    font-size:14px;
    letter-spacing:0.06em;
    background:var(--teal-deep);
    color:#fff;
    width:38px; height:38px;
    display:flex; align-items:center; justify-content:center;
    border-radius:8px;
  }
  .brand h1{
    font-family:var(--font-display);
    font-size:20px;
    font-weight:700;
    margin:0;
    letter-spacing:-0.01em;
  }
  .brand__sub{
    margin:2px 0 0;
    font-size:12.5px;
    color:var(--ink-soft);
  }
  .upload{display:flex; align-items:center; gap:10px; flex-wrap:wrap;}
  .btn{
    font-family:var(--font-body);
    font-weight:600;
    font-size:13.5px;
    padding:9px 16px;
    border-radius:8px;
    border:1.5px solid var(--ink);
    background:var(--surface);
    color:var(--ink);
    cursor:pointer;
  }
  .btn:hover{background:var(--surface-2);}
  .btn:focus-visible, input:focus-visible, .tab:focus-visible, .staff-row:focus-visible{
    outline:2.5px solid var(--teal);
    outline-offset:2px;
  }
  .btn--primary{background:var(--teal-deep); color:#fff; border-color:var(--teal-deep);}
  .btn--primary:hover{background:var(--teal);}
  .file-status{font-size:12.5px; color:var(--ink-soft);}

  .empty-state{
    background:var(--surface);
    border:1.5px dashed var(--line);
    border-radius:var(--radius);
    padding:44px 24px;
    text-align:center;
    color:var(--ink-soft);
    font-size:14.5px;
  }
  .empty-state code{
    font-family:var(--font-mono);
    background:var(--surface-2);
    padding:2px 6px;
    border-radius:4px;
    font-size:13px;
  }
  .empty-state__hint{font-size:12.5px; margin-top:6px;}

  .tabs{display:flex; gap:6px; margin-bottom:18px;}
  .tab{
    font-family:var(--font-display);
    font-weight:600;
    font-size:13.5px;
    padding:9px 18px;
    border-radius:999px;
    border:1.5px solid var(--line);
    background:var(--surface);
    color:var(--ink-soft);
    cursor:pointer;
  }
  .tab.active{background:var(--ink); color:#fff; border-color:var(--ink);}

  .month-tabs{
    display:flex;
    gap:6px;
    overflow-x:auto;
    padding-bottom:8px;
    margin-bottom:10px;
  }
  .month-tab{
    flex:0 0 auto;
    font-family:var(--font-mono);
    font-weight:600;
    font-size:12px;
    letter-spacing:0.03em;
    padding:6px 11px;
    border-radius:6px;
    border:1.5px solid var(--line);
    background:var(--surface);
    color:var(--ink-soft);
    cursor:pointer;
  }
  .month-tab.active{background:var(--teal-deep); color:#fff; border-color:var(--teal-deep);}

  .day-strip{
    display:flex;
    gap:6px;
    overflow-x:auto;
    padding:6px 2px 14px;
    margin-bottom:8px;
    border-bottom:1.5px solid var(--line);
  }
  .day-cell{
    flex:0 0 auto;
    width:46px;
    padding:7px 0 8px;
    border-radius:8px;
    border:1.5px solid var(--line);
    background:var(--surface);
    text-align:center;
    cursor:pointer;
    transition:transform .12s ease, box-shadow .12s ease;
  }
  .day-cell:hover{transform:translateY(-2px);}
  .day-cell.selected{
    background:var(--teal-deep);
    border-color:var(--teal-deep);
    color:#fff;
    transform:translateY(-3px);
    box-shadow:0 4px 0 var(--gold);
  }
  .day-cell.today{border-color:var(--gold); border-width:2px;}
  .day-cell__num{font-family:var(--font-display); font-weight:700; font-size:15px; display:block;}
  .day-cell__dow{font-family:var(--font-mono); font-size:10px; opacity:0.7; text-transform:uppercase;}

  .date-readout{
    font-family:var(--font-display);
    font-size:22px;
    font-weight:700;
    margin:14px 0 4px;
  }
  .date-readout__sub{
    font-family:var(--font-body);
    font-size:12.5px;
    color:var(--ink-soft);
    font-weight:400;
    margin-top:2px;
  }

  .tally-row{
    display:grid;
    grid-template-columns:repeat(auto-fit, minmax(110px, 1fr));
    gap:8px;
    margin:16px 0;
  }
  .tally-card{
    border-radius:var(--radius);
    padding:12px 14px;
    cursor:pointer;
    border:1.5px solid transparent;
    text-align:left;
  }
  .tally-card__count{font-family:var(--font-display); font-size:24px; font-weight:700; display:block; line-height:1;}
  .tally-card__label{font-size:11.5px; font-weight:600; letter-spacing:0.02em; margin-top:4px; display:block;}
  .tally-card.active{border-color:var(--ink);}
  .tally-card--work{background:var(--work-bg); color:var(--work);}
  .tally-card--off{background:var(--off-bg); color:var(--off);}
  .tally-card--leave{background:var(--leave-bg); color:var(--leave);}
  .tally-card--sick{background:var(--sick-bg); color:var(--sick);}
  .tally-card--other{background:var(--other-bg); color:var(--other);}

  .search-input{
    width:100%;
    font-family:var(--font-body);
    font-size:14px;
    padding:10px 14px;
    border-radius:8px;
    border:1.5px solid var(--line);
    background:var(--surface);
    color:var(--ink);
    margin-bottom:12px;
  }

  .unrecorded-note{
    font-size:12px;
    color:var(--ink-soft);
    margin:-4px 0 12px;
  }

  .staff-list{display:flex; flex-direction:column; gap:6px;}
  .staff-row{
    display:flex;
    align-items:center;
    gap:10px;
    background:var(--surface);
    border:1.5px solid var(--line);
    border-radius:8px;
    padding:9px 12px;
  }
  .team-dot{
    width:10px; height:10px; border-radius:50%;
    flex:0 0 auto;
    border:1px solid rgba(0,0,0,0.15);
  }
  .staff-row__main{flex:1 1 auto; min-width:0;}
  .staff-row__name{font-weight:600; font-size:14px;}
  .staff-row__meta{font-size:12px; color:var(--ink-soft); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
  .code-chip{
    font-family:var(--font-mono);
    font-size:11.5px;
    font-weight:600;
    padding:4px 9px;
    border-radius:6px;
    white-space:nowrap;
  }
  .code-chip--work{background:var(--work-bg); color:var(--work);}
  .code-chip--off{background:var(--off-bg); color:var(--off);}
  .code-chip--leave{background:var(--leave-bg); color:var(--leave);}
  .code-chip--sick{background:var(--sick-bg); color:var(--sick);}
  .code-chip--other{background:var(--other-bg); color:var(--other);}

  .no-results{color:var(--ink-soft); font-size:13.5px; padding:20px 0; text-align:center;}

  /* Staff view */
  .staff-summary{
    display:grid;
    grid-template-columns:repeat(auto-fit, minmax(90px,1fr));
    gap:8px;
    margin:14px 0 18px;
  }
  .staff-summary .tally-card__count{font-size:20px;}
  .staff-meta-line{font-size:13px; color:var(--ink-soft); margin-bottom:14px;}
  .year-grid{overflow-x:auto; border:1.5px solid var(--line); border-radius:var(--radius); background:var(--surface);}
  table.year-table{border-collapse:collapse; font-family:var(--font-mono); font-size:11px; width:100%;}
  table.year-table th, table.year-table td{padding:0; text-align:center;}
  table.year-table th.month-label{
    font-family:var(--font-body);
    font-weight:600;
    font-size:11.5px;
    text-align:left;
    padding:6px 10px;
    color:var(--ink-soft);
    position:sticky; left:0; background:var(--surface);
    border-right:1.5px solid var(--line);
  }
  table.year-table th.day-col{padding:4px 0; color:var(--ink-soft); font-weight:500;}
  table.year-table td.cell{
    width:26px; height:26px;
    font-weight:600;
    cursor:default;
  }
  table.year-table td.cell.work{background:var(--work-bg); color:var(--work);}
  table.year-table td.cell.off{background:var(--off-bg); color:var(--off);}
  table.year-table td.cell.leave{background:var(--leave-bg); color:var(--leave);}
  table.year-table td.cell.sick{background:var(--sick-bg); color:var(--sick);}
  table.year-table td.cell.other{background:var(--other-bg); color:var(--other);}
  table.year-table td.cell.empty{background:transparent;}
  table.year-table tr:not(:last-child) td, table.year-table tr:not(:last-child) th{border-bottom:1px solid var(--line);}

  .legend-row{display:flex; gap:14px; flex-wrap:wrap; margin-top:14px; font-size:11.5px; color:var(--ink-soft);}
  .legend-row span{display:inline-flex; align-items:center; gap:5px;}
  .legend-dot{width:9px; height:9px; border-radius:2px; display:inline-block;}
</style>
</head>
<body>

<div class="board">
  <header class="board__header">
    <div class="brand">
      <span class="brand__mark">NB</span>
      <div>
        <h1>NATGAB Duty Board</h1>
        <p class="brand__sub">Staff rota lookup</p>
      </div>
    </div>
    <div class="upload">
      <input type="file" id="fileInput" accept=".xlsx" hidden />
      <button id="uploadBtn" class="btn btn--primary" type="button">Load rota file</button>
      <span id="fileStatus" class="file-status">No file loaded</span>
    </div>
  </header>

  <div id="emptyState" class="empty-state">
    <p>Upload your rota workbook (e.g. <code>JANUARY_TO_DECEMBER_ROTA_26.xlsx</code>) to get started.</p>
    <p class="empty-state__hint">Nothing leaves your browser — the file is read locally and never uploaded anywhere.</p>
  </div>

  <div id="mainContent" hidden>
    <nav class="tabs">
      <button class="tab active" data-tab="day" type="button">Day view</button>
      <button class="tab" data-tab="staff" type="button">Staff view</button>
    </nav>

    <section id="dayView" class="view">
      <div class="month-tabs" id="monthTabs"></div>
      <div class="day-strip" id="dayStrip"></div>
      <div id="dateReadout" class="date-readout"></div>
      <div class="tally-row" id="tallyRow"></div>
      <input type="search" id="daySearch" class="search-input" placeholder="Filter by name or designation..." />
      <div id="unrecordedNote" class="unrecorded-note"></div>
      <div class="staff-list" id="staffList"></div>
    </section>

    <section id="staffView" class="view" hidden>
      <input type="text" id="staffSearch" class="search-input" placeholder="Search staff by name..." list="staffNamesList" />
      <datalist id="staffNamesList"></datalist>
      <div id="staffDetail"></div>
    </section>
  </div>
</div>

<script>
(function(){
  "use strict";

  var MONTH_NAMES = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  var MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var WEEKDAY_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  var CODES = {
    'I':  {label:'In (Working)', group:'work'},
    'N':  {label:'Night Shift', group:'work'},
    'LI': {label:'Live-In', group:'work'},
    'H':  {label:'Working From Home', group:'work'},
    'O':  {label:'Office', group:'work'},
    'TS': {label:'Training / Shadowing', group:'work'},
    'T':  {label:'Training', group:'work'},
    'C':  {label:'College', group:'work'},
    'M':  {label:'Meeting', group:'work'},
    'AP': {label:'Appointment', group:'work'},
    'X':  {label:'Day Off / Weekend / Bank Holiday', group:'off'},
    'AL': {label:'Annual Leave', group:'leave'},
    'EL': {label:'Emergency Leave', group:'leave'},
    'ML': {label:'Maternity Leave', group:'leave'},
    'S':  {label:'Sick', group:'sick'}
  };

  var GROUP_META = {
    work:  {label:'Working',   order:0},
    other: {label:'Other',     order:1},
    leave: {label:'On leave',  order:2},
    sick:  {label:'Sick',      order:3},
    off:   {label:'Off duty',  order:4}
  };

  var TEAM_COLORS = {
    brown:'#8B5A2B', blue:'#2F6FB2', black:'#22221F', pink:'#D9789F',
    orange:'#D9822B', green:'#3E8E5A', purple:'#7C5AA6', yellow:'#D9B23E',
    white:'#EDEBE2'
  };

  function codeInfo(code){
    return CODES[code] || {label: code, group: 'other'};
  }

  // ---------- Parsing ----------
  function parseWorkbook(workbook){
    var months = {}; // idx -> {sheetName, days:[{dayNum,colIndex}], staff:[...]}
    workbook.SheetNames.forEach(function(sheetName){
      var upper = sheetName.toUpperCase();
      var monthIdx = -1;
      for (var i=0;i<MONTH_NAMES.length;i++){
        if (upper.indexOf(MONTH_NAMES[i]) !== -1){ monthIdx = i; break; }
      }
      if (monthIdx === -1) return;

      var ws = workbook.Sheets[sheetName];
      var rows = XLSX.utils.sheet_to_json(ws, {header:1, raw:true, defval:null});
      var headerRow = rows[0] || [];

      var days = [];
      for (var c=7; c<headerRow.length; c++){
        var v = headerRow[c];
        if (typeof v === 'number' && v>=1 && v<=31){
          days.push({dayNum:v, colIndex:c});
        } else {
          break;
        }
      }
      if (days.length === 0) return;

      var staff = [];
      var seen = {};
      for (var r=2; r<rows.length; r++){
        var row = rows[r] || [];
        var nameCell = row[0];
        if (nameCell && String(nameCell).trim().toUpperCase() === 'CODES') break;
        if (!nameCell || String(nameCell).trim() === '') continue;

        var name = String(nameCell).trim();
        var designation = row[3] ? String(row[3]).trim() : '';
        var phone = row[2] ? String(row[2]).trim() : '';
        var team = row[5] ? String(row[5]).trim() : '';
        var key = name.toLowerCase() + '|' + designation.toLowerCase() + '|' + phone;
        if (seen[key]) continue;
        seen[key] = true;

        var statuses = {};
        days.forEach(function(d){
          var v2 = row[d.colIndex];
          if (v2 !== null && v2 !== undefined && String(v2).trim() !== ''){
            statuses[d.dayNum] = String(v2).trim().toUpperCase();
          }
        });

        staff.push({name:name, designation:designation, phone:phone, team:team, statuses:statuses});
      }

      months[monthIdx] = {sheetName:sheetName, days:days, staff:staff};
    });
    return months;
  }

  // ---------- State ----------
  var DATA = null; // parsed months
  var state = {
    tab:'day',
    monthIdx:null,
    day:null,
    activeGroup:null,
    daySearch:'',
    staffSelected:null,
    staffSearch:''
  };

  // ---------- DOM refs ----------
  var el = {
    fileInput: document.getElementById('fileInput'),
    uploadBtn: document.getElementById('uploadBtn'),
    fileStatus: document.getElementById('fileStatus'),
    emptyState: document.getElementById('emptyState'),
    mainContent: document.getElementById('mainContent'),
    tabs: document.querySelectorAll('.tab'),
    dayView: document.getElementById('dayView'),
    staffView: document.getElementById('staffView'),
    monthTabs: document.getElementById('monthTabs'),
    dayStrip: document.getElementById('dayStrip'),
    dateReadout: document.getElementById('dateReadout'),
    tallyRow: document.getElementById('tallyRow'),
    daySearch: document.getElementById('daySearch'),
    unrecordedNote: document.getElementById('unrecordedNote'),
    staffList: document.getElementById('staffList'),
    staffSearch: document.getElementById('staffSearch'),
    staffNamesList: document.getElementById('staffNamesList'),
    staffDetail: document.getElementById('staffDetail')
  };

  // ---------- File loading ----------
  el.uploadBtn.addEventListener('click', function(){ el.fileInput.click(); });
  el.fileInput.addEventListener('change', function(e){
    var file = e.target.files[0];
    if (!file) return;
    el.fileStatus.textContent = 'Reading ' + file.name + '...';
    var reader = new FileReader();
    reader.onload = function(ev){
      try{
        var wb = XLSX.read(ev.target.result, {type:'array'});
        DATA = parseWorkbook(wb);
        var monthKeys = Object.keys(DATA);
        if (monthKeys.length === 0){
          el.fileStatus.textContent = 'No recognizable month sheets found in that file.';
          return;
        }
        el.fileStatus.textContent = file.name + ' loaded';
        el.emptyState.hidden = true;
        el.mainContent.hidden = false;
        initAfterLoad();
      }catch(err){
        el.fileStatus.textContent = 'Could not read that file.';
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });

  function initAfterLoad(){
    var monthKeys = Object.keys(DATA).map(Number).sort(function(a,b){return a-b;});
    // default to today's date if that month/day exists in the workbook, else first available
    var today = new Date();
    var defaultMonth = monthKeys.indexOf(today.getMonth()) !== -1 ? today.getMonth() : monthKeys[0];
    var monthData = DATA[defaultMonth];
    var defaultDay = monthData.days.some(function(d){return d.dayNum === today.getDate();}) ? today.getDate() : monthData.days[0].dayNum;

    state.monthIdx = defaultMonth;
    state.day = defaultDay;

    renderMonthTabs();
    renderDayStrip();
    renderDayView();
    populateStaffDatalist();
  }

  // ---------- Tabs ----------
  el.tabs.forEach(function(tabBtn){
    tabBtn.addEventListener('click', function(){
      el.tabs.forEach(function(t){t.classList.remove('active');});
      tabBtn.classList.add('active');
      state.tab = tabBtn.dataset.tab;
      el.dayView.hidden = state.tab !== 'day';
      el.staffView.hidden = state.tab !== 'staff';
    });
  });

  // ---------- Month tabs ----------
  function renderMonthTabs(){
    var monthKeys = Object.keys(DATA).map(Number).sort(function(a,b){return a-b;});
    el.monthTabs.innerHTML = '';
    monthKeys.forEach(function(m){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'month-tab' + (m === state.monthIdx ? ' active' : '');
      btn.textContent = MONTH_SHORT[m];
      btn.addEventListener('click', function(){
        state.monthIdx = m;
        var days = DATA[m].days;
        if (!days.some(function(d){return d.dayNum === state.day;})){
          state.day = days[0].dayNum;
        }
        renderMonthTabs();
        renderDayStrip();
        renderDayView();
      });
      el.monthTabs.appendChild(btn);
    });
  }

  // ---------- Day strip ----------
  function renderDayStrip(){
    var days = DATA[state.monthIdx].days;
    var today = new Date();
    el.dayStrip.innerHTML = '';
    days.forEach(function(d){
      var cell = document.createElement('div');
      var isToday = today.getMonth() === state.monthIdx && today.getDate() === d.dayNum && today.getFullYear() === 2026;
      cell.className = 'day-cell' + (d.dayNum === state.day ? ' selected' : '') + (isToday ? ' today' : '');
      var jsDow = new Date(2026, state.monthIdx, d.dayNum).getDay();
      cell.innerHTML = '<span class="day-cell__num">' + d.dayNum + '</span><span class="day-cell__dow">' + WEEKDAY_LONG[jsDow].slice(0,3) + '</span>';
      cell.addEventListener('click', function(){
        state.day = d.dayNum;
        renderDayStrip();
        renderDayView();
      });
      el.dayStrip.appendChild(cell);
    });
  }

  // ---------- Day view ----------
  el.daySearch.addEventListener('input', function(){
    state.daySearch = el.daySearch.value.toLowerCase();
    renderStaffList();
  });

  function renderDayView(){
    var jsDow = new Date(2026, state.monthIdx, state.day).getDay();
    el.dateReadout.innerHTML = WEEKDAY_LONG[jsDow] + ' &middot; ' + state.day + ' ' + MONTH_SHORT[state.monthIdx] + ' 2026' +
      '<div class="date-readout__sub">' + DATA[state.monthIdx].sheetName.trim() + '</div>';
    state.activeGroup = null;
    renderTally();
    renderStaffList();
  }

  function getDayEntries(){
    var staff = DATA[state.monthIdx].staff;
    var entries = [];
    var unrecorded = 0;
    staff.forEach(function(s){
      var code = s.statuses[state.day];
      if (!code){ unrecorded++; return; }
      var info = codeInfo(code);
      entries.push({staff:s, code:code, info:info});
    });
    return {entries:entries, unrecorded:unrecorded, total:staff.length};
  }

  function renderTally(){
    var data = getDayEntries();
    var counts = {work:0, off:0, leave:0, sick:0, other:0};
    data.entries.forEach(function(e){ counts[e.info.group] = (counts[e.info.group]||0) + 1; });

    el.tallyRow.innerHTML = '';
    Object.keys(GROUP_META).sort(function(a,b){return GROUP_META[a].order - GROUP_META[b].order;}).forEach(function(g){
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'tally-card tally-card--' + g + (state.activeGroup === g ? ' active' : '');
      card.innerHTML = '<span class="tally-card__count">' + (counts[g]||0) + '</span><span class="tally-card__label">' + GROUP_META[g].label + '</span>';
      card.addEventListener('click', function(){
        state.activeGroup = state.activeGroup === g ? null : g;
        renderTally();
        renderStaffList();
      });
      el.tallyRow.appendChild(card);
    });

    el.unrecordedNote.textContent = data.unrecorded > 0 ?
      (data.total - data.unrecorded) + ' of ' + data.total + ' staff have a schedule entry for this day (' + data.unrecorded + ' blank).' : '';
  }

  function renderStaffList(){
    var data = getDayEntries();
    var q = state.daySearch;
    var filtered = data.entries.filter(function(e){
      if (state.activeGroup && e.info.group !== state.activeGroup) return false;
      if (q && (e.staff.name.toLowerCase().indexOf(q) === -1 && e.staff.designation.toLowerCase().indexOf(q) === -1)) return false;
      return true;
    });
    filtered.sort(function(a,b){
      if (a.info.group !== b.info.group) return GROUP_META[a.info.group].order - GROUP_META[b.info.group].order;
      return a.staff.name.localeCompare(b.staff.name);
    });

    el.staffList.innerHTML = '';
    if (filtered.length === 0){
      el.staffList.innerHTML = '<div class="no-results">No matching staff for this filter.</div>';
      return;
    }
    filtered.forEach(function(e){
      var row = document.createElement('div');
      row.className = 'staff-row';
      var teamColor = TEAM_COLORS[e.staff.team.toLowerCase()] || 'transparent';
      row.innerHTML =
        '<span class="team-dot" style="background:' + teamColor + '"></span>' +
        '<div class="staff-row__main">' +
          '<div class="staff-row__name">' + escapeHtml(e.staff.name) + '</div>' +
          '<div class="staff-row__meta">' + escapeHtml(e.staff.designation || '&mdash;') + '</div>' +
        '</div>' +
        '<span class="code-chip code-chip--' + e.info.group + '">' + e.code + ' &middot; ' + e.info.label + '</span>';
      el.staffList.appendChild(row);
    });
  }

  // ---------- Staff view ----------
  function allStaffNames(){
    var names = {};
    Object.keys(DATA).forEach(function(m){
      DATA[m].staff.forEach(function(s){ names[s.name] = true; });
    });
    return Object.keys(names).sort();
  }

  function populateStaffDatalist(){
    el.staffNamesList.innerHTML = '';
    allStaffNames().forEach(function(n){
      var opt = document.createElement('option');
      opt.value = n;
      el.staffNamesList.appendChild(opt);
    });
  }

  el.staffSearch.addEventListener('input', function(){
    state.staffSearch = el.staffSearch.value.trim();
    var match = allStaffNames().find(function(n){ return n.toLowerCase() === state.staffSearch.toLowerCase(); });
    if (!match){
      var partial = allStaffNames().filter(function(n){ return n.toLowerCase().indexOf(state.staffSearch.toLowerCase()) !== -1; });
      match = partial.length === 1 ? partial[0] : null;
    }
    if (match){
      state.staffSelected = match;
      renderStaffDetail();
    } else if (state.staffSearch === ''){
      state.staffSelected = null;
      el.staffDetail.innerHTML = '';
    }
  });

  function renderStaffDetail(){
    var name = state.staffSelected;
    if (!name){ el.staffDetail.innerHTML = ''; return; }

    var monthKeys = Object.keys(DATA).map(Number).sort(function(a,b){return a-b;});
    var counts = {work:0, off:0, leave:0, sick:0, other:0};
    var designation = '', team = '', phone = '';
    var rowsHtml = '';
    var maxDays = 0;
    monthKeys.forEach(function(m){ maxDays = Math.max(maxDays, DATA[m].days.length); });

    var headerCells = '<th class="month-label">Month</th>';
    for (var d=1; d<=maxDays; d++){ headerCells += '<th class="day-col">' + d + '</th>'; }

    monthKeys.forEach(function(m){
      var monthData = DATA[m];
      var s = monthData.staff.find(function(st){ return st.name.toLowerCase() === name.toLowerCase(); });
      var cells = '<th class="month-label">' + MONTH_SHORT[m] + '</th>';
      for (var d2=1; d2<=maxDays; d2++){
        var dayExists = d2 <= monthData.days.length;
        if (!s || !dayExists){
          cells += '<td class="cell empty"></td>';
          continue;
        }
        var code = s.statuses[d2];
        if (!code){
          cells += '<td class="cell empty"></td>';
        } else {
          var info = codeInfo(code);
          counts[info.group] = (counts[info.group]||0) + 1;
          cells += '<td class="cell ' + info.group + '" title="' + MONTH_SHORT[m] + ' ' + d2 + ': ' + info.label + '">' + code + '</td>';
        }
      }
      if (s){ designation = s.designation; team = s.team; phone = s.phone; }
      rowsHtml += '<tr>' + cells + '</tr>';
    });

    var teamColor = TEAM_COLORS[team.toLowerCase()] || 'transparent';

    var summaryHtml = '';
    Object.keys(GROUP_META).sort(function(a,b){return GROUP_META[a].order - GROUP_META[b].order;}).forEach(function(g){
      summaryHtml += '<div class="tally-card tally-card--' + g + '"><span class="tally-card__count">' + (counts[g]||0) + '</span><span class="tally-card__label">' + GROUP_META[g].label + '</span></div>';
    });

    var legendHtml = Object.keys(CODES).map(function(c){
      return '<span><span class="legend-dot" style="background:var(--' + CODES[c].group + ')"></span>' + c + ' = ' + CODES[c].label + '</span>';
    }).join('');

    el.staffDetail.innerHTML =
      '<div class="date-readout"><span class="team-dot" style="background:' + teamColor + '; margin-right:6px;"></span>' + escapeHtml(name) + '</div>' +
      '<div class="staff-meta-line">' + escapeHtml(designation || 'No designation on file') + (phone ? ' &middot; ' + escapeHtml(phone) : '') + (team ? ' &middot; ' + escapeHtml(team) + ' team' : '') + '</div>' +
      '<div class="staff-summary">' + summaryHtml + '</div>' +
      '<div class="year-grid"><table class="year-table"><thead><tr>' + headerCells + '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div>' +
      '<div class="legend-row">' + legendHtml + '</div>';
  }

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
  }
})();
</script>
</body>
</html>