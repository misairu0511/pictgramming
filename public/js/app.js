/**
 * ピクトグラミング - メインアプリ
 * ドラッグ&ドロップ、ブロック管理、実行制御
 */

const blockList = document.getElementById('block-list');
const canvas = document.getElementById('stage-canvas');
const stageLog = document.getElementById('stage-log');
const engine = new PictoEngine(canvas);

let blocks = [];       // { id, type, label, param, picto }
let idCounter = 0;
let isRunning = false;

// ========================
// ブロックメタデータ
// ========================
const BLOCK_META = {
  'repeat':       { picto: '🔁', label: 'くりかえす', hasParam: true, paramLabel: '回', defaultParam: 3 },
  'if':           { picto: '❓', label: 'もしも',     hasParam: false },
  'wait':         { picto: '⏳', label: 'まつ',       hasParam: true, paramLabel: '秒', defaultParam: 1 },
  'move-forward': { picto: '⬆️', label: 'まえへすすむ', hasParam: true, paramLabel: 'px', defaultParam: 30 },
  'move-back':    { picto: '⬇️', label: 'うしろへさがる', hasParam: true, paramLabel: 'px', defaultParam: 30 },
  'turn-left':    { picto: '↰',  label: 'ひだりをむく', hasParam: true, paramLabel: '°', defaultParam: 90 },
  'turn-right':   { picto: '↱',  label: 'みぎをむく',   hasParam: true, paramLabel: '°', defaultParam: 90 },
  'color-red':    { picto: '🔴', label: 'あかにする',   hasParam: false },
  'color-blue':   { picto: '🔵', label: 'あおにする',   hasParam: false },
  'color-green':  { picto: '🟢', label: 'みどりにする', hasParam: false },
  'stamp':        { picto: '🖊️', label: 'スタンプをおす', hasParam: false },
  'sound-beep':   { picto: '🔔', label: 'ピッとなる',   hasParam: false },
  'sound-tada':   { picto: '🎉', label: 'かんせいおと', hasParam: false },
};

// ========================
// ブロックリストをレンダリング
// ========================
function renderBlocks() {
  blockList.innerHTML = '';

  if (blocks.length === 0) {
    blockList.innerHTML = '<div class="drop-hint" id="drop-hint">← ブロックをここにドラッグしよう！</div>';
  }

  blocks.forEach((block, i) => {
    // ドロップゾーン（各ブロックの前）
    const dz = createDropZone(i);
    blockList.appendChild(dz);

    const meta = BLOCK_META[block.type] || { picto: '▶', label: block.type };
    const el = document.createElement('div');
    el.className = 'program-block';
    el.dataset.index = i;
    el.draggable = true;
    el.id = `block-${block.id}`;

    el.innerHTML = `
      <div class="block-picto">${meta.picto}</div>
      <div class="block-label">${meta.label}</div>
      <div class="block-param">
        ${meta.hasParam ? `<input class="param-input" type="number" min="1" max="999"
          value="${block.param ?? meta.defaultParam}"
          data-id="${block.id}">
          <span style="font-size:0.75rem;color:var(--text-muted)">${meta.paramLabel}</span>` : ''}
        <button class="block-delete" data-id="${block.id}" title="削除">✕</button>
      </div>
    `;

    // パラメータ変更
    const input = el.querySelector('.param-input');
    if (input) {
      input.addEventListener('input', (e) => {
        const b = blocks.find(b => b.id == e.target.dataset.id);
        if (b) b.param = parseInt(e.target.value, 10);
      });
    }

    // 削除ボタン
    el.querySelector('.block-delete').addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.id, 10);
      blocks = blocks.filter(b => b.id !== id);
      renderBlocks();
    });

    // ブロック自体のドラッグ（並び替え）
    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'list', index: i }));
      setTimeout(() => el.classList.add('dragging-ghost'), 0);
    });
    el.addEventListener('dragend', () => el.classList.remove('dragging-ghost'));

    blockList.appendChild(el);
  });

  // 末尾のドロップゾーン
  blockList.appendChild(createDropZone(blocks.length));
}

function createDropZone(index) {
  const dz = document.createElement('div');
  dz.className = 'drop-zone';
  dz.dataset.dropIndex = index;

  dz.addEventListener('dragover', (e) => {
    e.preventDefault();
    dz.classList.add('active');
  });
  dz.addEventListener('dragleave', () => dz.classList.remove('active'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('active');
    handleDrop(e, index);
  });
  return dz;
}

// ========================
// ドロップ処理
// ========================
function handleDrop(e, dropIndex) {
  let raw;
  try { raw = JSON.parse(e.dataTransfer.getData('text/plain')); }
  catch { return; }

  if (raw.source === 'palette') {
    // パレットから新規追加
    const meta = BLOCK_META[raw.type];
    const newBlock = {
      id: ++idCounter,
      type: raw.type,
      label: meta?.label || raw.type,
      param: meta?.defaultParam ?? null,
    };
    blocks.splice(dropIndex, 0, newBlock);
  } else if (raw.source === 'list') {
    // 既存ブロックの並び替え
    const fromIndex = raw.index;
    const moved = blocks.splice(fromIndex, 1)[0];
    const toIndex = fromIndex < dropIndex ? dropIndex - 1 : dropIndex;
    blocks.splice(toIndex, 0, moved);
  }
  renderBlocks();
}

// ========================
// パレットのドラッグ設定
// ========================
document.querySelectorAll('.block-item').forEach(item => {
  item.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      source: 'palette',
      type: item.dataset.type,
    }));
  });
});

// ブロックリストへのドロップ（末尾追加フォールバック）
blockList.addEventListener('dragover', (e) => e.preventDefault());
blockList.addEventListener('drop', (e) => {
  e.preventDefault();
  // ドロップゾーンで処理済みなら無視
  if (e.target.classList.contains('drop-zone') || e.target.closest('.drop-zone')) return;
  let raw;
  try { raw = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return; }
  if (raw.source === 'palette') {
    const meta = BLOCK_META[raw.type];
    blocks.push({ id: ++idCounter, type: raw.type, label: meta?.label || raw.type, param: meta?.defaultParam ?? null });
    renderBlocks();
  }
});

// ========================
// 実行
// ========================
document.getElementById('btn-run').addEventListener('click', async () => {
  if (isRunning) return;
  if (blocks.length === 0) { addLog('ブロックを追加してから実行しよう！', 'error'); return; }

  isRunning = true;
  stageLog.innerHTML = '';
  engine.reset();
  document.getElementById('btn-run').textContent = '⏸ 実行中...';

  try {
    await engine.run(
      blocks,
      (activeId) => {
        document.querySelectorAll('.program-block').forEach(el => el.classList.remove('active-block'));
        const el = document.getElementById(`block-${activeId}`);
        if (el) el.classList.add('active-block');
      },
      (msg, type) => addLog(msg, type)
    );
  } catch (err) {
    addLog('エラーが発生しました: ' + err.message, 'error');
  }

  document.querySelectorAll('.program-block').forEach(el => el.classList.remove('active-block'));
  document.getElementById('btn-run').textContent = '▶ 実行';
  isRunning = false;
});

// ========================
// クリア
// ========================
document.getElementById('btn-clear').addEventListener('click', () => {
  if (isRunning) return;
  blocks = [];
  renderBlocks();
  engine.reset();
  stageLog.innerHTML = '';
});

// ========================
// ステップ実行 / リセット
// ========================
document.getElementById('btn-step').addEventListener('click', async () => {
  if (isRunning || blocks.length === 0) return;
  // 先頭ブロック1つだけ実行
  isRunning = true;
  const block = blocks.shift();
  renderBlocks();
  const fn = engine.blockDefs[block.type];
  if (fn) { await fn(parseInt(block.param, 10) || undefined); engine._redraw(); }
  addLog(`▶ ${block.label}`, 'action');
  isRunning = false;
});

document.getElementById('btn-reset-stage').addEventListener('click', () => {
  engine.reset();
  stageLog.innerHTML = '';
  document.querySelectorAll('.program-block').forEach(el => el.classList.remove('active-block'));
});

// ========================
// ログ表示
// ========================
function addLog(msg, type = '') {
  const div = document.createElement('div');
  div.className = `log-entry${type ? ' log-' + type : ''}`;
  div.textContent = msg;
  stageLog.appendChild(div);
  stageLog.scrollTop = stageLog.scrollHeight;
}

// ========================
// 初期描画
// ========================
renderBlocks();
