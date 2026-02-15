/**
 * 台股選股雷達 — 前端邏輯
 * 讀取 scan_result.json 並渲染表格
 */

const DATA_URL = 'data/scan_result.json';

// DOM 元素
const els = {
    scanMeta: document.getElementById('scanMeta'),
    condVolume: document.getElementById('condVolume'),
    condRatio: document.getElementById('condRatio'),
    statScanned: document.getElementById('statScanned'),
    statMatched: document.getElementById('statMatched'),
    statTime: document.getElementById('statTime'),
    statElapsed: document.getElementById('statElapsed'),
    loadingState: document.getElementById('loadingState'),
    emptyState: document.getElementById('emptyState'),
    noMatchState: document.getElementById('noMatchState'),
    tableContainer: document.getElementById('tableContainer'),
    tableBody: document.getElementById('tableBody'),
    searchInput: document.getElementById('searchInput'),
};

let scanData = null;
let currentResults = [];
let sortKey = 'volume_ratio';
let sortDesc = true;

// === 初始化 ===
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupSearch();
    setupSort();
});

// === 載入資料 ===
async function loadData() {
    try {
        const resp = await fetch(DATA_URL);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        scanData = await resp.json();
        renderAll();
    } catch (err) {
        console.error('載入失敗:', err);
        showState('empty');
    }
}

// === 渲染全部 ===
function renderAll() {
    if (!scanData) return;

    // 更新條件
    if (scanData.conditions) {
        els.condVolume.textContent = scanData.conditions.volume_threshold?.toLocaleString() ?? '1000';
        els.condRatio.textContent = scanData.conditions.volume_surge_ratio ?? '2';
    }

    // 更新統計
    animateCounter(els.statScanned, scanData.total_scanned || 0);
    animateCounter(els.statMatched, scanData.total_matched || 0);
    els.statTime.textContent = formatScanTime(scanData.scan_time);
    els.statElapsed.textContent = formatElapsed(scanData.elapsed_seconds);

    // 更新 header badge
    els.scanMeta.innerHTML = `
    <span class="badge badge-success">
      <span class="badge-dot"></span>
      最後掃描: ${formatScanTime(scanData.scan_time)}
    </span>
  `;

    // 渲染表格
    currentResults = [...(scanData.results || [])];
    if (currentResults.length === 0 && scanData.total_scanned > 0) {
        showState('noMatch');
    } else if (currentResults.length > 0) {
        sortAndRender();
    } else {
        showState('empty');
    }
}

// === 排序 & 渲染 ===
function sortAndRender() {
    currentResults.sort((a, b) => {
        let va = a[sortKey];
        let vb = b[sortKey];
        if (typeof va === 'string') {
            return sortDesc ? vb.localeCompare(va) : va.localeCompare(vb);
        }
        return sortDesc ? vb - va : va - vb;
    });
    renderTable(currentResults);
}

function renderTable(results) {
    const searchTerm = els.searchInput.value.trim().toLowerCase();
    const filtered = searchTerm
        ? results.filter(r =>
            r.code.toLowerCase().includes(searchTerm) ||
            r.name.toLowerCase().includes(searchTerm)
        )
        : results;

    if (filtered.length === 0) {
        els.tableBody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center; padding:40px; color:var(--text-muted); font-family:var(--font-sans);">
          🔍 沒有符合搜尋的結果
        </td>
      </tr>
    `;
        showState('table');
        return;
    }

    els.tableBody.innerHTML = filtered.map((r, i) => `
    <tr style="animation-delay: ${i * 30}ms">
      <td>${i + 1}</td>
      <td>${r.code}</td>
      <td>${r.name}</td>
      <td>${r.close.toFixed(2)}</td>
      <td>
        <span class="volume-ratio ${r.volume_ratio >= 5 ? 'extreme' : ''}">
          ${r.volume_ratio.toFixed(1)}x
        </span>
      </td>
      <td>${r.volume.toLocaleString()}</td>
      <td>${Number(r.volume_avg5).toLocaleString()}</td>
      <td>${r.k.toFixed(1)}</td>
      <td>${r.d.toFixed(1)}</td>
      <td><span class="signal-badge">買入</span></td>
    </tr>
  `).join('');

    showState('table');
}

// === 狀態切換 ===
function showState(state) {
    els.loadingState.style.display = 'none';
    els.emptyState.style.display = 'none';
    els.noMatchState.style.display = 'none';
    els.tableContainer.style.display = 'none';

    switch (state) {
        case 'loading': els.loadingState.style.display = 'flex'; break;
        case 'empty': els.emptyState.style.display = 'flex'; break;
        case 'noMatch': els.noMatchState.style.display = 'flex'; break;
        case 'table': els.tableContainer.style.display = 'block'; break;
    }
}

// === 搜尋 ===
function setupSearch() {
    let timeout;
    els.searchInput.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            renderTable(currentResults);
        }, 200);
    });
}

// === 排序 ===
function setupSort() {
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            if (sortKey === key) {
                sortDesc = !sortDesc;
            } else {
                sortKey = key;
                sortDesc = true;
            }

            // 更新 UI
            document.querySelectorAll('.sortable').forEach(el => {
                el.classList.remove('active-sort', 'desc', 'asc');
                el.textContent = el.textContent.replace(/ [▲▼]/, '');
            });
            th.classList.add('active-sort', sortDesc ? 'desc' : 'asc');
            th.textContent += sortDesc ? ' ▼' : ' ▲';

            sortAndRender();
        });
    });
}

// === 工具函式 ===
function formatScanTime(timeStr) {
    if (!timeStr) return '—';
    try {
        const parts = timeStr.split(' ');
        return parts[0] ? `${parts[0]} ${parts[1] || ''}`.trim() : timeStr;
    } catch {
        return timeStr;
    }
}

function formatElapsed(seconds) {
    if (!seconds && seconds !== 0) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}分${secs}秒`;
    return `${secs}秒`;
}

function animateCounter(el, target) {
    const duration = 800;
    const startTime = performance.now();
    const startVal = 0;

    function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const current = Math.round(startVal + (target - startVal) * eased);
        el.textContent = current.toLocaleString();
        if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
}
