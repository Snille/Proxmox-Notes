// select-generator.js

let FA_MAP = {};      // "fa-linux" -> ""
let FA_CLASSES = [];  // ["fa-linux", "fa-windows", ...]
let BUILD_LOCK = false;
let loadedFileInfoMsg = '';

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
  });

  document.getElementById('closePreviewLayer').addEventListener('click', hidePreviewLayer);
  const layer = document.getElementById('previewLayer');
  layer.addEventListener('click', (e) => { if (e.target === layer) hidePreviewLayer(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && layer.style.display !== 'none') hidePreviewLayer();
  });

  document.getElementById('loadJsonBtn').addEventListener('click', () => {
    document.getElementById('jsonFileInput').click();
  });
  document.getElementById('jsonFileInput').addEventListener('change', loadFromFile);

  document.getElementById('addSelect01Btn').addEventListener('click', () => addSelect01Row());
  document.getElementById('addSelect02Btn').addEventListener('click', () => addSelect02Row());
  document.getElementById('addSelect03Btn').addEventListener('click', () => addSelect03Row());

  document.getElementById('sort01Btn').addEventListener('click', () => { sortRows('select01'); buildJsonToTextarea(); });
  document.getElementById('sort02Btn').addEventListener('click', () => { sortRows('select02'); buildJsonToTextarea(); });
  document.getElementById('sort03Btn').addEventListener('click', () => { sortRows('select03'); buildJsonToTextarea(); });
  document.getElementById('sortAllBtn').addEventListener('click', () => {
    sortRows('select01'); sortRows('select02'); sortRows('select03');
    buildJsonToTextarea();
  });

  document.getElementById('previewBtn').addEventListener('click', previewJsonOverlay);
  document.getElementById('copyBtn').addEventListener('click', copyOutput);
  document.getElementById('downloadBtn').addEventListener('click', downloadSelectJson);

  ['resFqdn', 'resWidth', 'resHeight'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      refreshAllImagePreviews();
      scheduleBuild();
    });
  });

  await loadFontAwesomeMap();
  injectPickerCssOnce();

  // --- Loading the select.json if it exists ---
  async function loadInitialData() {
    const filesToTry = [
      { name: 'select.json', isExample: false },
      { name: 'select-example.json', isExample: true }
    ];
    
    for (const file of filesToTry) {
      try {
        const resp = await fetch(file.name, { cache: 'no-store' });
        if (resp.ok) {
          const text = await resp.text();
          const obj = JSON.parse(text);
          const cfg = obj && obj["proxmox-notes"];

          if (cfg) {
            applyJsonToUi(cfg);
            if (file.isExample) {
              loadedFileInfoMsg = "<strong>Notice:</strong> Example file loaded. When you are done, save the file as <code>select.json</code> in the root of your <code>/notes</code> directory.";
            } else {
              loadedFileInfoMsg = "<strong>Info:</strong> Your <code>select.json</code> is loaded.";
            }
            setMsg([], [loadedFileInfoMsg], []);
            return;
          }
        }
      } catch (err) {
        console.warn(`Could not load ${file.name}, trying next...`);
      }
    }
    setDefaults();
  }

  function applyJsonToUi(cfg) {
    const r = cfg.resources || {};
    document.getElementById('resFqdn').value = r["image fqdn"] || '';
    document.getElementById('resWidth').value = r["image width"] || 100;
    document.getElementById('resHeight').value = r["image height"] || 100;

    document.getElementById('select01Rows').innerHTML = '';
    document.getElementById('select02Rows').innerHTML = '';
    document.getElementById('select03Rows').innerHTML = '';

    const s01 = cfg.select01 || {};
    Object.entries(s01).forEach(([label, v]) => {
      if (v && typeof v === 'object') addSelect01Row({ label, fa: v["fa-objects"] || '' });
      else addSelect01Row({ label, fa: '' });
    });

    const s02 = cfg.select02 || {};
    Object.entries(s02).forEach(([label, key]) => addSelect02Row({ label, key: String(key) }));

    const s03 = cfg.select03 || {};
    Object.entries(s03).forEach(([label, value]) => addSelect03Row({ label, value: String(value) }));

    refreshAllImagePreviews();
    buildJsonToTextarea();
  }

  await loadInitialData();
  
  makeContainerSortable(document.getElementById('select01Rows'));
  makeContainerSortable(document.getElementById('select02Rows'));
  makeContainerSortable(document.getElementById('select03Rows'));

  buildJsonToTextarea();
});

function hidePreviewLayer() {
  document.getElementById('previewLayer').style.display = 'none';
}
function showPreviewLayer(text) {
  document.getElementById('jsonPreviewPre').textContent = text;
  document.getElementById('previewLayer').style.display = 'flex';
}

function setMsg(okLines = [], infoLines = [], errLines = []) {
  const box = document.getElementById('msgBox');

  const okHtml = okLines.length
    ? `<div class="ok"><i class="fa fa-check"></i> ${okLines.join('<br>')}</div>`
    : '';

  const infoHtml = infoLines.length
    ? `<div class="info" style="margin-top:10px;"><i class="fa fa-info-circle"></i> ${infoLines.join('<br>')}</div>`
    : '';

  const errHtml = errLines.length
    ? `<div class="err" style="margin-top:10px;"><i class="fa fa-exclamation-triangle"></i> ${errLines.join('<br>')}</div>`
    : '';

  // Always show tip information
  const tipHtml = `<div class="mini" style="margin-top:10px;">
    Remember: The FQDN needs to be set to a location that your Proxmox Server can access to display the pictures in the "Notes".<br/>
    The "../icons/100x100" is just for demo purposes. You need to change it to a REAL FQDN.<br/>
    This tool generates the select.json file to be saved to the root of the "notes"-folder.
  </div>`;

  box.innerHTML = okHtml + infoHtml + errHtml + tipHtml;
}

function setDefaults() {
    loadedFileInfoMsg = '';
  document.getElementById('resFqdn').value = '../icons/100x100';
  document.getElementById('resWidth').value = 100;
  document.getElementById('resHeight').value = 100;

  addSelect01Row({ label: 'Linux', fa: 'fa-linux' });
  addSelect01Row({ label: 'Windows', fa: 'fa-windows' });

  addSelect02Row({ label: 'Default', key: 'default' });
  addSelect02Row({ label: 'Mint', key: 'linuxmint02' });

  addSelect03Row({ label: 'Ubuntu 22.04', value: 'Ubuntu 22.04' });
  addSelect03Row({ label: 'Debian 12', value: 'Debian 12' });

  refreshAllImagePreviews();
}

async function loadFontAwesomeMap() {
  try {
    const cssText = await fetch('css/font-awesome.css').then(r => r.text());
    const re = /\.fa-([a-z0-9-]+):before\s*\{\s*content:\s*["']\\([0-9a-fA-F]+)["']\s*;\s*\}/g;

    let m;
    const map = {};
    const classes = [];
    while ((m = re.exec(cssText)) !== null) {
      const name = m[1];
      const hex = m[2];
      const cls = `fa-${name}`;
      const glyph = String.fromCharCode(parseInt(hex, 16));
      map[cls] = glyph;
      classes.push(cls);
    }

    FA_MAP = map;
    FA_CLASSES = classes.sort();

    setMsg([`Loaded ${FA_CLASSES.length} Font Awesome icons.`], [], []);
  } catch (e) {
    console.error(e);
    FA_MAP = {};
    FA_CLASSES = [];
    setMsg([], [], [
      `Could not parse <code>css/font-awesome.css</code>.`,
      `Check that the file exists and is accessible.`
    ]);
  }
}

function normalizeFaClass(v) {
  const t = (v || '').trim();
  if (!t) return '';
  if (!t.startsWith('fa-')) return `fa-${t}`;
  return t;
}
function faShort(cls) {
  return (cls || '').startsWith('fa-') ? cls.slice(3) : cls;
}
function autoBuildText(label, faClass) {
  const l = (label || '').trim();
  const fa = normalizeFaClass(faClass);
  const glyph = FA_MAP[fa] || '';
  const base = l || fa || '';
  return glyph ? `${glyph} ${base}` : base;
}

function injectPickerCssOnce() {
  if (document.getElementById('faPickerCss')) return;

  const css = `
  .fa-pick-wrap { position: relative; flex: 0 0 160px; min-width: 210px; }
  .fa-pick-btn {
    width: 100%;
    height: 38px;
    border: 1px solid var(--border-color);
    background: var(--bg-color);
    color: inherit;                 /* ✅ theme-dependent */
    border-radius: 6px;
    box-sizing: border-box;
    padding: 6px 10px;
    text-align: left;
    font-family: 'FontAwesome','Segoe UI',Arial,sans-serif;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .fa-pick-btn:focus { outline: 2px solid rgba(255,255,255,0.18); outline-offset: 2px; }
  .fa-pick-btn .fa-pick-label { font-family: 'Segoe UI', Arial, sans-serif; opacity: 0.95; }
  .fa-pick-btn .fa-pick-placeholder { opacity: 0.65; } /* when no icon picked */
  .fa-pick-panel {
    position: absolute;
    top: 42px;
    left: 0;
    right: 0;
    z-index: 9999;
    border: 1px solid var(--border-color);
    background: var(--bg-color);
    color: inherit;                 /* ✅ theme-dependent */
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    overflow: hidden;
    display: none;
  }
  .fa-pick-panel.open { display: block; }
  .fa-pick-search {
    width: 100%;
    border: 0;
    border-bottom: 1px solid var(--border-color);
    background: transparent;
    padding: 10px;
    box-sizing: border-box;
    outline: none;
    color: inherit;                 /* ✅ theme-dependent */
    caret-color: currentColor;      /* ✅ */
  }
  .fa-pick-list {
    max-height: 360px;
    overflow: auto;
  }
  .fa-pick-item {
    padding: 8px 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: 'FontAwesome','Segoe UI',Arial,sans-serif;
    color: inherit;
  }
  .fa-pick-item:hover,
  .fa-pick-item.active {
    background: rgba(255,255,255,0.08);
  }
  .fa-pick-item .fa-pick-name { font-family: 'Segoe UI', Arial, sans-serif; opacity: 0.95; }
  .fa-pick-empty { padding: 10px; opacity: 0.8; }
  `;
  const style = document.createElement('style');
  style.id = 'faPickerCss';
  style.textContent = css;
  document.head.appendChild(style);
}

// ---------- select01 row ----------
function addSelect01Row(initial = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'row-item tight';
  wrap.dataset.type = 's01';

  wrap.innerHTML = `
    <span class="drag-handle" title="Drag to reorder"><i class="fa fa-bars"></i></span>
    <span class="fa-chip" title="Icon preview"><i class="fa"></i></span>
    <input class="row-key s01-label" type="text" placeholder="Name (shown in Notes)" value="${escapeHtmlAttr(initial.label || '')}">
    <div class="fa-pick-wrap s01-picker"></div>
    <button type="button" class="remove-btn s01-remove">×</button>
  `;

  // Force one row
  wrap.style.display = 'flex';
  wrap.style.alignItems = 'center';
  wrap.style.flexWrap = 'nowrap';

  const labelEl = wrap.querySelector('.s01-label');

  // sizing so it fits nicely as one row
  labelEl.style.flex = '0 1 140px';
  labelEl.style.minWidth = '120px';

  const pickerHost = wrap.querySelector('.s01-picker');
  const initFa = normalizeFaClass(initial.fa || '');

  // Drag allowed only from handle
  wrap.draggable = true;
  wrap.dataset.dragAllowed = '0';
  const handle = wrap.querySelector('.drag-handle');
  handle.addEventListener('mousedown', () => wrap.dataset.dragAllowed = '1');
  handle.addEventListener('mouseup', () => wrap.dataset.dragAllowed = '0');
  handle.addEventListener('mouseleave', () => wrap.dataset.dragAllowed = '0');

  wrap.querySelector('.s01-remove').addEventListener('click', () => {
    wrap.remove();
    scheduleBuild();
  });

  createFaPicker(pickerHost, initFa, (newFa) => {
    wrap.dataset.fa = newFa || '';
    refreshIconPreviewForRow(wrap);
    scheduleBuild();
  });

  wrap.dataset.fa = initFa || '';

  labelEl.addEventListener('input', () => scheduleBuild());

  document.getElementById('select01Rows').appendChild(wrap);
  refreshIconPreviewForRow(wrap);
  scheduleBuild();
}

function refreshIconPreviewForRow(row) {
  const prevI = row.querySelector('.fa-chip i');
  const fa = normalizeFaClass(row.dataset.fa || '');

  prevI.className = 'fa';
  if (fa) prevI.classList.add(fa);

  const glyph = FA_MAP[fa] || '';
  row.querySelector('.fa-chip').title = glyph ? `Glyph: ${glyph} (${fa})` : `(${fa || 'no icon'})`;
}

// Custom searchable picker
function createFaPicker(host, initialFa, onChange) {
  const state = {
    open: false,
    value: normalizeFaClass(initialFa || ''),
    query: '',
    activeIndex: 0,
    filtered: []
  };

  host.innerHTML = `
    <button type="button" class="fa-pick-btn" title="Pick icon">
      <span class="fa-pick-glyph"></span>
      <span class="fa-pick-label"></span>
      <span style="margin-left:auto; opacity:0.75;"><i class="fa fa-caret-down"></i></span>
    </button>
    <div class="fa-pick-panel" role="listbox">
      <input class="fa-pick-search" type="text" placeholder="Search icon... (type without fa-)" autocomplete="off">
      <div class="fa-pick-list"></div>
    </div>
  `;

  const btn = host.querySelector('.fa-pick-btn');
  const glyphSpan = host.querySelector('.fa-pick-glyph');
  const labelSpan = host.querySelector('.fa-pick-label');
  const panel = host.querySelector('.fa-pick-panel');
  const search = host.querySelector('.fa-pick-search');
  const list = host.querySelector('.fa-pick-list');

  function setButtonDisplay() {
    const fa = normalizeFaClass(state.value);
    const glyph = FA_MAP[fa] || '';
    const short = fa ? faShort(fa) : '';

    glyphSpan.textContent = glyph ? glyph : ' ';
    if (fa) {
      labelSpan.textContent = short;
      labelSpan.classList.remove('fa-pick-placeholder');
    } else {
      labelSpan.textContent = 'pick icon';
      labelSpan.classList.add('fa-pick-placeholder');
    }
  }

  function filterNow() {
    const q = (state.query || '').trim().toLowerCase();
    state.filtered = FA_CLASSES.filter(cls => {
      if (!q) return true;
      const short = faShort(cls).toLowerCase();
      return short.includes(q) || cls.toLowerCase().includes(q);
    });

    if (state.activeIndex >= state.filtered.length) state.activeIndex = Math.max(0, state.filtered.length - 1);
    renderList();
  }

  function renderList() {
    list.innerHTML = '';
    if (!state.filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'fa-pick-empty';
      empty.textContent = 'No matches';
      list.appendChild(empty);
      return;
    }

    state.filtered.forEach((cls, idx) => {
      const glyph = FA_MAP[cls] || '';
      const short = faShort(cls);

      const item = document.createElement('div');
      item.className = 'fa-pick-item' + (idx === state.activeIndex ? ' active' : '');
      item.dataset.value = cls;

      item.innerHTML = `
        <span>${glyph || ''}</span>
        <span class="fa-pick-name">${short}</span>
      `;

      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectValue(cls);
      });

      list.appendChild(item);
    });
  }

  function open() {
    state.open = true;
    panel.classList.add('open');
    state.query = '';
    search.value = '';
    state.activeIndex = 0;
    filterNow();
    setTimeout(() => search.focus(), 0);
  }

  function close() {
    state.open = false;
    panel.classList.remove('open');
    btn.focus();
  }

  function toggle() {
    if (state.open) close();
    else open();
  }

  function selectValue(cls) {
    state.value = normalizeFaClass(cls);
    setButtonDisplay();
    close();
    onChange(state.value);
  }

  btn.addEventListener('click', toggle);

  search.addEventListener('input', () => {
    state.query = search.value;
    state.activeIndex = 0;
    filterNow();
  });

  search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      state.activeIndex = Math.min(state.activeIndex + 1, Math.max(0, state.filtered.length - 1));
      renderList();
      scrollActiveIntoView();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      state.activeIndex = Math.max(0, state.activeIndex - 1);
      renderList();
      scrollActiveIntoView();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const cls = state.filtered[state.activeIndex];
      if (cls) selectValue(cls);
    }
  });

  function scrollActiveIntoView() {
    const active = list.querySelector('.fa-pick-item.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  const onDocDown = (e) => {
    if (!state.open) return;
    if (!host.contains(e.target)) close();
  };
  document.addEventListener('mousedown', onDocDown);

  setButtonDisplay();
  if (state.value) onChange(state.value);
}

// ---------- select02 / select03 ----------
function addSelect02Row(initial = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'row-item tight';
  wrap.dataset.type = 's02';

  wrap.innerHTML = `
    <span class="drag-handle" title="Drag to reorder"><i class="fa fa-bars"></i></span>
    <span class="img-preview" title="Image preview"><img alt=""/></span>
    <input class="row-key s02-label" type="text" placeholder="Label (shown)" value="${escapeHtmlAttr(initial.label || '')}">
    <input class="row-val s02-key" type="text" placeholder="Image key (e.g. ubuntu)" value="${escapeHtmlAttr(initial.key || '')}">
    <button type="button" class="remove-btn s02-remove">×</button>
  `;

  wrap.draggable = true;
  wrap.dataset.dragAllowed = '0';
  const handle = wrap.querySelector('.drag-handle');
  handle.addEventListener('mousedown', () => wrap.dataset.dragAllowed = '1');
  handle.addEventListener('mouseup', () => wrap.dataset.dragAllowed = '0');
  handle.addEventListener('mouseleave', () => wrap.dataset.dragAllowed = '0');

  wrap.querySelector('.s02-remove').addEventListener('click', () => {
    wrap.remove();
    scheduleBuild();
  });

  wrap.querySelector('.s02-label').addEventListener('input', () => scheduleBuild());
  wrap.querySelector('.s02-key').addEventListener('input', () => {
    refreshImagePreviewForRow(wrap);
    scheduleBuild();
  });

  document.getElementById('select02Rows').appendChild(wrap);
  refreshImagePreviewForRow(wrap);
  scheduleBuild();
}

function getResources() {
  const fqdn = document.getElementById('resFqdn').value.trim();
  const wRaw = document.getElementById('resWidth').value;
  const hRaw = document.getElementById('resHeight').value;
  const w = wRaw === '' ? '' : Number(wRaw);
  const h = hRaw === '' ? '' : Number(hRaw);
  return { fqdn, w, h };
}
function buildImageUrl(key) {
  const { fqdn, w, h } = getResources();
  const safeKey = (key || 'default').trim() || 'default';
  return `${fqdn}/${safeKey}-${w}x${h}.png`;
}
function refreshImagePreviewForRow(row) {
  const keyEl = row.querySelector('.s02-key');
  const img = row.querySelector('.img-preview img');
  const key = (keyEl.value || '').trim() || 'default';
  const url = buildImageUrl(key);
  img.src = url;
  row.querySelector('.img-preview').title = url;
}
function refreshAllImagePreviews() {
  document.querySelectorAll('#select02Rows .row-item').forEach(refreshImagePreviewForRow);
}

function addSelect03Row(initial = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'row-item tight';
  wrap.dataset.type = 's03';

  wrap.innerHTML = `
    <span class="drag-handle" title="Drag to reorder"><i class="fa fa-bars"></i></span>
    <input class="row-key s03-label" type="text" placeholder="Label (shown)" value="${escapeHtmlAttr(initial.label || '')}">
    <input class="row-val s03-value" type="text" placeholder="Value (stored)" value="${escapeHtmlAttr(initial.value || '')}">
    <button type="button" class="remove-btn s03-remove">×</button>
  `;

  wrap.draggable = true;
  wrap.dataset.dragAllowed = '0';
  const handle = wrap.querySelector('.drag-handle');
  handle.addEventListener('mousedown', () => wrap.dataset.dragAllowed = '1');
  handle.addEventListener('mouseup', () => wrap.dataset.dragAllowed = '0');
  handle.addEventListener('mouseleave', () => wrap.dataset.dragAllowed = '0');

  wrap.querySelector('.s03-remove').addEventListener('click', () => {
    wrap.remove();
    scheduleBuild();
  });

  wrap.querySelector('.s03-label').addEventListener('input', () => scheduleBuild());
  wrap.querySelector('.s03-value').addEventListener('input', () => scheduleBuild());

  document.getElementById('select03Rows').appendChild(wrap);
  scheduleBuild();
}

// ---------- Validation + JSON ----------
function clearErrors() {
  document.querySelectorAll('.row-item.has-error').forEach(el => {
    el.classList.remove('has-error');
    el.removeAttribute('data-error');
    el.removeAttribute('title');
  });
}
function markError(rowItem, message) {
  rowItem.classList.add('has-error');
  rowItem.dataset.error = message;
  rowItem.title = message;
}

function validateAll() {
  clearErrors();
  const errors = [];
  const infos = [];

  const { fqdn, w, h } = getResources();
  if (!fqdn) errors.push('Resources: "image fqdn" is empty.');
  if (typeof w !== 'number' || isNaN(w) || w === null || w === undefined || w === '' || w <= 0) {
    errors.push('Resources: "image width" must be present and a positive number.');
  }
  if (typeof h !== 'number' || isNaN(h) || h === null || h === undefined || h === '' || h <= 0) {
    errors.push('Resources: "image height" must be present and a positive number.');
  }

  const s01LabelCounts = {};
  document.querySelectorAll('#select01Rows .row-item').forEach(row => {
    const label = row.querySelector('.s01-label').value.trim();
    const fa = normalizeFaClass(row.dataset.fa || '');
    if (!label) markError(row, 'Icon: Missing Name.');
    if (!fa) markError(row, 'Icon: Missing icon.');
    if (label) s01LabelCounts[label] = (s01LabelCounts[label] || 0) + 1;
  });
  Object.entries(s01LabelCounts).forEach(([k, c]) => {
    if (c > 1) infos.push(`Icon: Duplicate name "${k}" (allowed).`);
  });

  const s02LabelCounts = {};
  const s02KeyCounts = {};
  document.querySelectorAll('#select02Rows .row-item').forEach(row => {
    const label = row.querySelector('.s02-label').value.trim();
    const key = row.querySelector('.s02-key').value.trim();
    if (!label) markError(row, 'Image: Missing Label.');
    if (!key) markError(row, 'Image: Missing key.');
    if (label) s02LabelCounts[label] = (s02LabelCounts[label] || 0) + 1;
    if (key) s02KeyCounts[key] = (s02KeyCounts[key] || 0) + 1;
  });
  Object.entries(s02LabelCounts).forEach(([k, c]) => { if (c > 1) infos.push(`Image: Duplicate label "${k}" (allowed).`); });
  Object.entries(s02KeyCounts).forEach(([k, c]) => { if (c > 1) infos.push(`Image: Duplicate key "${k}" (allowed).`); });

  const s03LabelCounts = {};
  document.querySelectorAll('#select03Rows .row-item').forEach(row => {
    const label = row.querySelector('.s03-label').value.trim();
    if (!label) markError(row, 'OS: Missing Label.');
    if (label) s03LabelCounts[label] = (s03LabelCounts[label] || 0) + 1;
  });
  Object.entries(s03LabelCounts).forEach(([k, c]) => { if (c > 1) infos.push(`OS: Duplicate label "${k}" (allowed).`); });

  return {
    errors: Array.from(new Set(errors)),
    infos: Array.from(new Set(infos)),
  };
}

function buildSelectJsonObject() {
  const { fqdn, w, h } = getResources();
  const resources = { "image fqdn": fqdn, "image width": w, "image height": h };

  const select01 = {};
  document.querySelectorAll('#select01Rows .row-item').forEach(row => {
    const label = row.querySelector('.s01-label').value.trim();
    const fa = normalizeFaClass(row.dataset.fa || '');
    if (!label) return;
    const text = autoBuildText(label, fa);
    select01[label] = { "fa-objects": fa, "text": text };
  });

  const select02 = {};
  document.querySelectorAll('#select02Rows .row-item').forEach(row => {
    const label = row.querySelector('.s02-label').value.trim();
    const key = row.querySelector('.s02-key').value.trim();
    if (!label || !key) return;
    select02[label] = key;
  });

  const select03 = {};
  document.querySelectorAll('#select03Rows .row-item').forEach(row => {
    const label = row.querySelector('.s03-label').value.trim();
    const value = row.querySelector('.s03-value').value.trim();
    if (!label) return;
    select03[label] = value || label;
  });

  return {
    "proxmox-notes": {
      "resources": resources,
      "select01": select01,
      "select02": select02,
      "select03": select03
    }
  };
}

function buildJsonToTextarea() {
  if (BUILD_LOCK) return;
  BUILD_LOCK = true;

  refreshAllImagePreviews();

  const { errors, infos } = validateAll();
  const obj = buildSelectJsonObject();
  document.getElementById('outputJson').value = JSON.stringify(obj, null, 2);


  // Always include loaded file info in info box
  const infoCombined = loadedFileInfoMsg ? [loadedFileInfoMsg, ...infos] : infos;
  if (errors.length) setMsg([], infoCombined, errors);
  else setMsg(['No validation errors.'], infoCombined, []);

  BUILD_LOCK = false;
}

// Validate JSON in output box if user edits it manually
document.addEventListener('DOMContentLoaded', () => {
  const outputJson = document.getElementById('outputJson');
  if (outputJson) {
    outputJson.addEventListener('input', () => {
      let error = null;
      try {
        JSON.parse(outputJson.value);
      } catch (e) {
        error = 'Output is not valid JSON: ' + e.message;
      }
      if (error) {
        setMsg([], [], [error]);
      } else {
        buildJsonToTextarea();
      }
    });
  }
});

BUILD_LOCK = false;

function scheduleBuild() {
  window.clearTimeout(scheduleBuild._t);
  scheduleBuild._t = window.setTimeout(() => buildJsonToTextarea(), 60);
}

function previewJsonOverlay() {
  buildJsonToTextarea();
  showPreviewLayer(document.getElementById('outputJson').value);
}
function copyOutput() {
  const ta = document.getElementById('outputJson');
  ta.select();
  document.execCommand('copy');
}
function downloadSelectJson() {
  buildJsonToTextarea();
  const text = document.getElementById('outputJson').value;
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'select.json';
  a.click();
}

function loadFromFile(ev) {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const obj = JSON.parse(e.target.result);
      const cfg = obj && obj["proxmox-notes"];
      if (!cfg) { alert('Could not find "proxmox-notes" root object.'); return; }

      const r = cfg.resources || {};
      document.getElementById('resFqdn').value = r["image fqdn"] || '';
      document.getElementById('resWidth').value = r["image width"] || 100;
      document.getElementById('resHeight').value = r["image height"] || 100;

      document.getElementById('select01Rows').innerHTML = '';
      document.getElementById('select02Rows').innerHTML = '';
      document.getElementById('select03Rows').innerHTML = '';

      const s01 = cfg.select01 || {};
      Object.entries(s01).forEach(([label, v]) => {
        if (v && typeof v === 'object') addSelect01Row({ label, fa: v["fa-objects"] || '' });
        else addSelect01Row({ label, fa: '' });
      });

      const s02 = cfg.select02 || {};
      Object.entries(s02).forEach(([label, key]) => addSelect02Row({ label, key: String(key) }));

      const s03 = cfg.select03 || {};
      Object.entries(s03).forEach(([label, value]) => addSelect03Row({ label, value: String(value) }));

      refreshAllImagePreviews();
      buildJsonToTextarea();
    } catch (err) {
      console.error(err);
      alert('Invalid JSON file.');
    }
  };
  reader.readAsText(file);
}

// ---------- Sorting + Drag&Drop ----------
function sortRows(which) {
  let container;
  let getKey;

  if (which === 'select01') {
    container = document.getElementById('select01Rows');
    getKey = (row) => (row.querySelector('.s01-label')?.value || '').trim().toLowerCase();
  } else if (which === 'select02') {
    container = document.getElementById('select02Rows');
    getKey = (row) => (row.querySelector('.s02-label')?.value || '').trim().toLowerCase();
  } else if (which === 'select03') {
    container = document.getElementById('select03Rows');
    getKey = (row) => (row.querySelector('.s03-label')?.value || '').trim().toLowerCase();
  } else return;

  const rows = Array.from(container.querySelectorAll('.row-item'));
  rows.sort((a, b) => getKey(a).localeCompare(getKey(b), undefined, { numeric: true, sensitivity: 'base' }));

  container.innerHTML = '';
  rows.forEach(r => container.appendChild(r));
}

function makeContainerSortable(container) {
  let dragged = null;

  container.addEventListener('dragstart', (e) => {
    const row = e.target.closest('.row-item');
    if (!row) return;

    if (row.dataset.dragAllowed !== '1') {
      e.preventDefault();
      return;
    }

    dragged = row;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', 'x'); } catch {}
  });

  container.addEventListener('dragend', () => {
    if (dragged) dragged.classList.remove('dragging');
    dragged = null;
    scheduleBuild();
  });

  container.addEventListener('dragover', (e) => {
    if (!dragged) return;
    e.preventDefault();
    const afterEl = getDragAfterElement(container, e.clientY);
    if (afterEl == null) container.appendChild(dragged);
    else container.insertBefore(dragged, afterEl);
  });
}

function getDragAfterElement(container, y) {
  const els = [...container.querySelectorAll('.row-item:not(.dragging)')];
  let closest = { offset: Number.NEGATIVE_INFINITY, element: null };

  for (const el of els) {
    const box = el.getBoundingClientRect();
    const offset = y - (box.top + box.height / 2);
    if (offset < 0 && offset > closest.offset) closest = { offset, element: el };
  }
  return closest.element;
}

function escapeHtmlAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}