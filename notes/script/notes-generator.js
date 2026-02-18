// Proxmox Notes Generator
// A simple tool to create markdown notes with a consistent format and styling for your Proxmox VMs/containers.
// FontAwesome icons are used for visual appeal.
// https://fontawesome.com/v4/cheatsheet/

let APP_CFG = null;

document.addEventListener('DOMContentLoaded', async () => {
    APP_CFG = await loadSelectData();

    // Push resources image size into CSS variables (used by min() in form thumbnail box)
    applyResourceSizeToCSS();

    setupDefaultRows(APP_CFG);

    document.getElementById('themeToggle').addEventListener('click', () => document.body.classList.toggle('light-theme'));
    document.getElementById('makeNotes').addEventListener('click', generateNotes);
    document.getElementById('copyBtn').addEventListener('click', copyToClipboard);
    document.getElementById('saveBtn').addEventListener('click', saveToFile);
    document.getElementById('previewBtn').addEventListener('click', showPreview);
    document.getElementById('loadFileBtn').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('fileInput').addEventListener('change', loadFromFile);
    document.getElementById('SELECT02').addEventListener('change', updateIconPreview);

    // Preview layer close handling
    const closeBtn = document.getElementById('closePreviewLayer');
    if (closeBtn) closeBtn.addEventListener('click', hidePreviewLayer);

    const layer = document.getElementById('previewLayer');
    if (layer) {
        layer.addEventListener('click', (e) => {
            if (e.target === layer) hidePreviewLayer();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hidePreviewLayer();
    });

    updateIconPreview();
});

function hidePreviewLayer() {
    const layer = document.getElementById('previewLayer');
    if (layer) layer.style.display = 'none';
}

function getResources() {
    const r = (APP_CFG && APP_CFG.resources) ? APP_CFG.resources : {};
    return {
        imageFqdn: r["image fqdn"] || "../../icons/blue/100x100",
        imageWidth: Number(r["image width"] || 100),
        imageHeight: Number(r["image height"] || 100),
    };
}


// Writes resources image width/height into CSS variables
function applyResourceSizeToCSS() {
    const res = getResources();
    document.documentElement.style.setProperty('--res-width', `${res.imageWidth}px`);
    document.documentElement.style.setProperty('--res-height', `${res.imageHeight}px`);
}

function getImageUrl(imageKey) {
    const res = getResources();
    return `${res.imageFqdn}/${imageKey}${res.imageWidth}x${res.imageHeight}.png`;
}

async function loadSelectData() {
    let usedExample = false;
    let cfg = null;
    try {
        let response = await fetch('select.json', {cache: 'no-store'});
        if (!response.ok) throw new Error('select.json not found');
        const data = await response.json();
        cfg = data['proxmox-notes'];
    } catch (e) {
        // Try select-example.json
        try {
            let response = await fetch('select-example.json', {cache: 'no-store'});
            if (!response.ok) throw new Error('select-example.json not found');
            const data = await response.json();
            cfg = data['proxmox-notes'];
            usedExample = true;
        } catch (e2) {
            console.error("Could not load select.json or select-example.json", e2);
            return null;
        }
    }

    // SELECT01
    const s01 = document.getElementById('SELECT01');
    s01.innerHTML = '';
    Object.entries(cfg.select01 || {}).forEach(([k, v]) => {
        let faClass = '';
        let displayText = '';

        if (v && typeof v === 'object') {
            faClass = v['fa-objects'] || v['fa'] || v['class'] || '';
            displayText = v['text'] || v['label'] || k;
        } else {
            faClass = k;
            displayText = String(v);
        }

        if (!faClass) faClass = k;

        const opt = document.createElement('option');
        opt.value = faClass;
        opt.textContent = displayText;
        s01.appendChild(opt);
    });

    // SELECT02
    const s02 = document.getElementById('SELECT02');
    s02.innerHTML = '';
    Object.entries(cfg.select02 || {}).forEach(([label, val]) => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = label;
        s02.appendChild(opt);
    });

    // If example was used, style the button in index.html if present
    if (usedExample) {
        try {
            const exBtn = window.parent.document.getElementById('selectJsonNoticeBtn');
            if (exBtn) {
                exBtn.style.fontWeight = 'bold';
                exBtn.style.color = 'red';
            }
        } catch (e) {}
    }

    return cfg;
}

/**
 * FORM thumbnail preview:
 * - The FORM preview box is controlled by CSS (min() + overflow hidden).
 * - Here we only update the image src.
 */
function updateIconPreview() {
    const select = document.getElementById('SELECT02');
    const preview = document.getElementById('iconPreview');
    if (!select || !preview) return;

    // Ensure CSS vars reflect current resources (in case select.json changed)
    applyResourceSizeToCSS();

    const val = (select.value && select.value.trim()) ? select.value.trim() : 'default01';

    // Keep the FORM size controlled by CSS only
    preview.src = getImageUrl(val);
    preview.style.display = 'block';
}

function setupDefaultRows(data) {
    const osOptions = data ? data.select03 : {};
    addRow('creation', 'Date', '', 'date');
    addRow('creation', 'Owner', '');
    addRow('creation', 'OS', '', 'select', osOptions);
    addRow('creation', 'Backup', '');
    addRow('network', 'IP', '');
    addRow('network', 'MAC', '');
    addRow('network', 'DHCP', 'No', 'bool');
    addRow('network', 'VLAN', '');
    addServiceRow('WebGUI', 'https://');
    addRow('access', 'User', 'root');
    addRow('access', 'SSH Key', 'No', 'bool');
    addRow('access', 'Password', 'No', 'bool');
}

function addRow(section, label = '', value = '', type = 'text', options = {}) {
    const container = document.getElementById(`${section}Rows`);
    const div = document.createElement('div');
    div.className = 'row-item';
    let inputHtml = '';

    if (type === 'bool') {
        inputHtml = `<select class="row-val"><option value="Yes" ${value === 'Yes' ? 'selected' : ''}>Yes</option><option value="No" ${value === 'No' ? 'selected' : ''}>No</option></select>`;
    } else if (type === 'select') {
        inputHtml = `<select class="row-val">`;
        Object.entries(options).forEach(([k, v]) => { inputHtml += `<option value="${v}">${k}</option>`; });
        inputHtml += `</select>`;
    } else if (type === 'date') {
        inputHtml = `<input type="date" class="row-val" value="${value}">`;
    } else {
        inputHtml = `<input type="text" class="row-val" value="${value}">`;
    }

    div.innerHTML = `<input type="text" class="row-key" value="${label}">${inputHtml}<button type="button" class="remove-btn" onclick="this.parentElement.remove()">×</button>`;
    container.appendChild(div);
}

function addServiceRow(name = '', url = '') {
    const container = document.getElementById(`servicesRows`);
    const div = document.createElement('div');
    div.className = 'row-item';
    div.innerHTML = `<input type="text" class="service-name" value="${name}" placeholder="Name"><input type="text" class="service-url" value="${url}" placeholder="URL"><button type="button" class="remove-btn" onclick="this.parentElement.remove()">×</button>`;
    container.appendChild(div);
}

function generateNotes() {
    const s01 = document.getElementById('SELECT01').value;
    const t01 = document.getElementById('TEXT01').value;
    const s02 = document.getElementById('SELECT02').value;
    const m01 = document.getElementById('MULTILINE01').value.replace(/\n/g, '<br>');
    const m02 = document.getElementById('MULTILINE02').value.replace(/\n/g, '<br>');

    const res = getResources();
    const key = (s02 && s02.trim()) ? s02.trim() : 'default';
    const imgUrl = getImageUrl(key);

    // Preview + output image size follows resources exactly
    const imgStyle = `width:${res.imageWidth}px;height:${res.imageHeight}px;`;

    let md = `# <i class="fa ${s01}"></i> ${t01}\n| | |\n| - | - |\n`;
    md += `| <img title="${t01}" src="${imgUrl}" alt="[Icon]" style="${imgStyle}"> | <i class="fa fa-file-text-o"></i> ${m01} |\n`;
    md += `### <i class="fa fa-sticky-note-o"></i> Notes:\n${m02}\n| | |\n| - | - |\n`;

    md += buildSection('creation', 'fa-exclamation-circle', 'Creation:');
    md += buildSection('network', 'fa-sitemap', 'Network:');

    document.querySelectorAll('#servicesRows .row-item').forEach((r, i) => {
        const name = r.querySelector('.service-name').value;
        const url = r.querySelector('.service-url').value;
        const label = i === 0 ? `<i class="fa fa-cogs"></i> **Services:**` : '';
        md += `| ${label} | <a href="${url}" target="_blank" style="text-decoration: none; color: #00f000;">${name}</a> |\n`;
    });

    md += buildSection('access', 'fa-key', 'Access:');
    document.getElementById('outputCode').value = md;
}

function buildSection(id, icon, title) {
    let out = '';
    const rows = document.querySelectorAll(`#${id}Rows .row-item`);
    rows.forEach((r, i) => {
        const k = r.querySelector('.row-key').value;
        const v = r.querySelector('.row-val').value;
        const iconPart = i === 0 ? `<i class="fa ${icon} fa-fw"></i> **${title}**` : '';
        out += `| ${iconPart} | **${k}:** ${v} |\n`;
    });
    return out;
}

function renderNotesMarkdownToHtml(md) {
    const lines = md.split('\n');
    const withBold = lines.map(l => l.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'));

    let html = '';
    let i = 0;

    const isSeparatorLine = (line) => /^\|\s*-+\s*\|\s*-+\s*\|$/.test(line.trim());
    const isTableLine = (line) => line.trim().startsWith('|') && line.trim().endsWith('|');

    while (i < withBold.length) {
        const line = withBold[i];

        if (line.startsWith('# ')) {
            html += `<h1>${line.substring(2).trim()}</h1>\n`;
            i++;
            continue;
        }
        if (line.startsWith('### ')) {
            html += `<h3>${line.substring(4).trim()}</h3>\n`;
            i++;
            continue;
        }

        if (isTableLine(line)) {
            const tableLines = [];
            while (i < withBold.length && isTableLine(withBold[i])) {
                if (!isSeparatorLine(withBold[i])) tableLines.push(withBold[i]);
                i++;
            }

            if (tableLines.length > 0) {
                html += `<table>\n`;
                for (const tl of tableLines) {
                    const cells = tl.trim().replace(/^\|/, '').replace(/\|$/, '').split('|');
                    html += `<tr>${cells.map(c => `<td>${c.trim()}</td>`).join('')}</tr>\n`;
                }
                html += `</table>\n`;
            }
            continue;
        }

        const trimmed = line.trim();
        if (trimmed !== '') html += `<div>${trimmed}</div>\n`;
        else html += `<div style="height:8px;"></div>\n`;

        i++;
    }

    return html;
}

function showPreview() {
    generateNotes();
    const md = document.getElementById('outputCode').value;
    if (!md) return;

    const html = renderNotesMarkdownToHtml(md);

    const layer = document.getElementById('previewLayer');
    const body = document.getElementById('renderedPreviewLayerBody');
    if (!layer || !body) return;

    body.innerHTML = html;
    layer.style.display = 'flex';
}

function copyToClipboard() {
    const code = document.getElementById('outputCode');
    code.select();
    document.execCommand('copy');
}

function saveToFile() {
    const serverName = document.getElementById('TEXT01').value.trim() || 'proxmox_notes_config';
    const state = {
        h: {
            s1: document.getElementById('SELECT01').value,
            t1: document.getElementById('TEXT01').value,
            s2: document.getElementById('SELECT02').value,
            m1: document.getElementById('MULTILINE01').value,
            m2: document.getElementById('MULTILINE02').value
        },
        sections: {
            creation: Array.from(document.querySelectorAll('#creationRows .row-item')).map(r => ({ k: r.querySelector('.row-key').value, v: r.querySelector('.row-val').value })),
            network: Array.from(document.querySelectorAll('#networkRows .row-item')).map(r => ({ k: r.querySelector('.row-key').value, v: r.querySelector('.row-val').value })),
            services: Array.from(document.querySelectorAll('#servicesRows .row-item')).map(r => ({ n: r.querySelector('.service-name').value, u: r.querySelector('.service-url').value })),
            access: Array.from(document.querySelectorAll('#accessRows .row-item')).map(r => ({ k: r.querySelector('.row-key').value, v: r.querySelector('.row-val').value }))
        }
    };
    const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${serverName}.json`;
    a.click();
}

function loadFromFile(ev) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const d = JSON.parse(e.target.result);
        document.getElementById('SELECT01').value = d.h.s1;
        document.getElementById('TEXT01').value = d.h.t1;
        document.getElementById('SELECT02').value = d.h.s2;
        document.getElementById('MULTILINE01').value = d.h.m1;
        document.getElementById('MULTILINE02').value = d.h.m2;

        updateIconPreview();

        ['creation', 'network', 'access'].forEach(id => {
            const container = document.getElementById(`${id}Rows`);
            container.innerHTML = '';
            d.sections[id].forEach(r => addRow(id, r.k, r.v));
        });

        const sContainer = document.getElementById('servicesRows');
        sContainer.innerHTML = '';
        d.sections.services.forEach(s => addServiceRow(s.n, s.u));
    };
    reader.readAsText(ev.target.files[0]);
}
