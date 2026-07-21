const canvas = document.getElementById("stage-canvas");
const editor = document.getElementById("java-editor");
if (!editor.value.trim()) {
  editor.value = `// ピクトグラムを動かすプログラムを書いてみよう！\n移動(50);\n回転(90);\n部位回転("左腕", 45);\n`;
}

// Firebase Setup
const firebaseConfig = {
  apiKey: "AIzaSyBc4s66rHugPmNVV_Ra-S7P4vOfe2tNxQA",
  authDomain: "pictgramming.firebaseapp.com",
  projectId: "pictgramming",
  storageBucket: "pictgramming.firebasestorage.app",
  messagingSenderId: "835896621128",
  appId: "1:835896621128:web:e5ae40c7d4b91ff1e6407d",
  measurementId: "G-6RP66BRFLG"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const log = document.getElementById("stage-log");
const runButton = document.getElementById("btn-run");
const resetButton = document.getElementById("btn-reset");
const clearStageButton = document.getElementById("btn-clear-stage");
const stopButton = document.getElementById("btn-stop");
const pauseButton = document.getElementById("btn-pause");
const partTooltip = document.getElementById("part-tooltip");
const engine = new PictoEngine(canvas);
const stageSelect = document.getElementById("stage-select");
if (stageSelect) {
  stageSelect.addEventListener("change", (e) => {
    if (isRunning) {
      shouldStop = true;
      engine.stop();
      isRunning = false;
      runButton.textContent = "実行";
      runButton.disabled = false;
      stopButton.disabled = true;
      pauseButton.disabled = true;
      pauseButton.textContent = "一時停止";
      resetButton.disabled = false;
      
      const btnShowHint = document.getElementById("btn-show-hint");
      if (btnShowHint) {
        btnShowHint.disabled = false;
        btnShowHint.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>\n          ゴースト再生`;
      }
      
      // アニメーションループが停止するのを少し待ってからステージを切り替える
      setTimeout(() => {
        engine.loadStage(e.target.value);
        clearOutput();
        updateShoeUI();
      }, 150);
    } else {
      engine.loadStage(e.target.value);
      clearOutput();
      updateShoeUI();
    }
  });
}

let tutorialAdvanceCheck = null;

function updateShoeUI() {
  if (!stageSelect) return;
  const isShoeStage = stageSelect.value === "stage4" || stageSelect.value === "stage5";
  document.querySelectorAll(".shoe-snippet").forEach(el => el.style.display = isShoeStage ? "inline-block" : "none");
  const shoeHelp1 = document.getElementById("shoe-help-1");
  const shoeHelp2 = document.getElementById("shoe-help-2");
  if (shoeHelp1) shoeHelp1.style.display = isShoeStage ? "list-item" : "none";
  if (shoeHelp2) shoeHelp2.style.display = isShoeStage ? "list-item" : "none";
}

const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

let isRunning = false;
let shouldStop = false;
let currentLogSession = null;

let userId = localStorage.getItem("pictgramming_user_id");
if (!userId) {
  userId = "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("pictgramming_user_id", userId);
}

// 起動ごとのセッションIDを発行（サーバー起動の代わり）
const sessionId = "session_" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

// ログ番号（これまで何回実行したか）を管理
let logCount = parseInt(localStorage.getItem("pictgramming_log_count") || "0", 10);

const nicknameInput = document.getElementById("user-nickname");
if (nicknameInput) {
  const savedNickname = localStorage.getItem("pictgramming_nickname");
  if (savedNickname) {
    nicknameInput.value = savedNickname;
  }
  nicknameInput.addEventListener("input", (e) => {
    localStorage.setItem("pictgramming_nickname", e.target.value.trim());
  });
}

const partNames = {
  head: "head",
  body: "body",
  leftArm: "leftArm",
  rightArm: "rightArm",
  leftLeg: "leftLeg",
  rightLeg: "rightLeg",
  leftElbow: "leftElbow",
  rightElbow: "rightElbow",
  leftKnee: "leftKnee",
  rightKnee: "rightKnee",
};

const partAliases = {
  atama: "head",
  karada: "body",
  hidariude: "leftArm",
  migiude: "rightArm",
  hidariashi: "leftLeg",
  migiashi: "rightLeg",
  hidarihiji: "leftElbow",
  migihiji: "rightElbow",
  hidarihiza: "leftKnee",
  migihiza: "rightKnee",
  "頭": "head",
  "体": "body",
  "左腕": "leftArm",
  "右腕": "rightArm",
  "左足": "leftLeg",
  "右足": "rightLeg",
  "左肘": "leftElbow",
  "右肘": "rightElbow",
  "左膝": "leftKnee",
  "右膝": "rightKnee"
};

runButton.addEventListener("click", runProgram);
stopButton.addEventListener("click", () => {
  if (isRunning) {
    shouldStop = true;
    engine.stop();
    pauseButton.disabled = true;
    addLog("実行を停止しました。", "error");
  }
});
pauseButton.addEventListener("click", () => {
  if (!isRunning || shouldStop) return;
  if (engine.isPaused) {
    engine.resume();
    pauseButton.textContent = "一時停止";
    addLog("実行を再開しました。", "info");
  } else {
    engine.pause();
    pauseButton.textContent = "再開";
    addLog("一時停止中...", "info");
  }
});
resetButton.addEventListener("click", () => {
  if (isRunning) return;
  editor.value = "";
  clearOutput();
  saveHistory();
});
clearStageButton.addEventListener("click", () => {
  if (isRunning) return;
  clearOutput();
});

// 初期化時にUIを更新
updateShoeUI();

const btnUndo = document.getElementById("btn-undo");
const btnRedo = document.getElementById("btn-redo");
const btnClearEditor = document.getElementById("btn-clear-editor");

const historyStack = [{ val: editor.value, start: 0, end: 0 }];
let historyIndex = 0;
let isUndoRedoAction = false;

function updateToolbarState() {
  if (btnUndo) {
    btnUndo.disabled = (historyIndex <= 0);
    btnUndo.style.opacity = btnUndo.disabled ? "0.3" : "1";
    btnUndo.style.cursor = btnUndo.disabled ? "not-allowed" : "pointer";
  }
  if (btnRedo) {
    btnRedo.disabled = (historyIndex >= historyStack.length - 1);
    btnRedo.style.opacity = btnRedo.disabled ? "0.3" : "1";
    btnRedo.style.cursor = btnRedo.disabled ? "not-allowed" : "pointer";
  }
  if (btnClearEditor) {
    btnClearEditor.disabled = (editor.value.trim() === "");
    btnClearEditor.style.opacity = btnClearEditor.disabled ? "0.3" : "1";
    btnClearEditor.style.cursor = btnClearEditor.disabled ? "not-allowed" : "pointer";
  }
}

function saveHistory() {
  if (isUndoRedoAction) return;
  const currentVal = editor.value;
  if (historyIndex >= 0 && historyStack[historyIndex].val === currentVal) return;
  
  historyStack.length = historyIndex + 1;
  historyStack.push({
    val: currentVal,
    start: editor.selectionStart,
    end: editor.selectionEnd
  });
  if (historyStack.length > 50) {
    historyStack.shift();
  } else {
    historyIndex++;
  }
  updateToolbarState();
}

editor.addEventListener("input", saveHistory);

if (btnUndo) {
  btnUndo.addEventListener("click", () => {
    if (historyIndex > 0) {
      isUndoRedoAction = true;
      historyIndex--;
      const state = historyStack[historyIndex];
      editor.value = state.val;
      editor.selectionStart = state.start;
      editor.selectionEnd = state.end;
      editor.focus();
      updateToolbarState();
      isUndoRedoAction = false;
    }
  });
}
if (btnRedo) {
  btnRedo.addEventListener("click", () => {
    if (historyIndex < historyStack.length - 1) {
      isUndoRedoAction = true;
      historyIndex++;
      const state = historyStack[historyIndex];
      editor.value = state.val;
      editor.selectionStart = state.start;
      editor.selectionEnd = state.end;
      editor.focus();
      updateToolbarState();
      isUndoRedoAction = false;
    }
  });
}
if (btnClearEditor) {
  btnClearEditor.addEventListener("click", () => {
    if (editor.value.trim() !== "" && confirm("入力したプログラムをすべて消去しますか？")) {
      editor.value = "";
      editor.focus();
      saveHistory();
    }
  });
}

updateToolbarState();

const btnShowHint = document.getElementById("btn-show-hint");
if (btnShowHint) {
  btnShowHint.addEventListener("click", async () => {
    if (isRunning) return;
    
    btnShowHint.disabled = true;
    const originalText = btnShowHint.innerHTML;
    btnShowHint.innerHTML = "取得中...";
    
    try {
      const stageId = stageSelect.value;
      
      // 1. 他の人が1人でもクリアしているかチェック
      const clearSnapshot = await db.collection('logs')
        .where('stageId', '==', stageId)
        .where('goalResult', '==', 'ゴールした')
        .get();
        
      const othersClears = [];
      clearSnapshot.forEach(doc => {
        if (doc.data().userId !== userId) {
          othersClears.push(doc.data());
        }
      });
        
      if (othersClears.length === 0) {
        addLog("まだあなた以外にクリアした人がいないため、ヒントを表示できません！", "info");
        btnShowHint.disabled = false;
        btnShowHint.innerHTML = originalText;
        return;
      }
      
      // 2. 自分がすでにクリアしているかチェック
      const myClearSnapshot = await db.collection('logs')
        .where('stageId', '==', stageId)
        .where('userId', '==', userId)
        .where('goalResult', '==', 'ゴールした')
        .limit(1)
        .get();

      if (!myClearSnapshot.empty) {
        // すでにクリア済みの場合は、他の人の「完全な別解」をフルで再生する
        const randomLog = othersClears[Math.floor(Math.random() * othersClears.length)];
        
        addLog(`【別解再生】${randomLog.nickname || '誰か'}さんのクリアの動きを再生します`, "info");
        
        isRunning = true;
        shouldStop = false;
        stopButton.disabled = false;
        
        await engine.playGhost(randomLog.events);
        return;
      }
      
      // 3. 自分の最新の「惜しいコード（ヒヨコを掴んだ状態）」を取得
      const mySnapshot = await db.collection('logs')
        .where('stageId', '==', stageId)
        .where('userId', '==', userId)
        .where('goalResult', 'in', ['持ったがゴールに入れていない', 'ゴールしていたが離していない'])
        .get();
        
      if (mySnapshot.empty) {
        // 【今回追加した処理】自分がまだヒヨコを掴んでいない場合は、他の人の前半部分を再生する
        const randomLog = othersClears[Math.floor(Math.random() * othersClears.length)];
        
        if (!randomLog.events || randomLog.events.length === 0) {
          addLog("ヒントデータの読み込みに失敗しました。", "error");
          return;
        }
        
        addLog(`【前半ヒント】${randomLog.nickname || '誰か'}さんがヒヨコを掴むまでを再生します`, "info");
        
        // 掴むメッセージが含まれているイベントを探す
        let grabIndex = randomLog.events.findIndex(evt => evt.message && evt.message.startsWith("掴む"));
        if (grabIndex === -1) {
          grabIndex = randomLog.events.length;
        } else {
          // 掴んだ瞬間のイベントを含めるために +1 する
          grabIndex = Math.min(grabIndex + 1, randomLog.events.length);
        }
        
        const truncatedEvents = randomLog.events.slice(0, grabIndex);
        
        isRunning = true;
        shouldStop = false;
        stopButton.disabled = false;
        
        await engine.playGhost(truncatedEvents);
        
        // ここでreturnすればfinallyへ飛ぶので、後半の自分専用ゴースト処理には進まない
        return;
      }
      
      // 降順ソートして最新を取得
      const myLogs = [];
      mySnapshot.forEach(doc => myLogs.push(doc.data()));
      myLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const latestLog = myLogs[0];
      
      addLog(`【ヒント再生】あなたの動きの続きを自動生成します`, "info");
      
      isRunning = true;
      shouldStop = false;
      stopButton.disabled = false;
      
      // 前半: ゴーストモードで自分のコードを再現
      engine.reset();
      engine.isGhostMode = true;
      engine.state.color = "#9ca3af";
      
      let jsCode = transpileToJava(latestLog.sourceCode);
      const picto = createPictoContext();
      const fn = new AsyncFunction('picto', jsCode);
      
      await fn(picto);
      
      if (shouldStop) throw new Error("STOP");
      
      // 後半: 自動補完（現在地からゴールへのベクトルを計算して実行）
      if (engine.state.hasGrabbedItem) {
        const goalPos = engine.goal;
        const attachedPart = engine.state.item.attachedTo || "rightArm";
        
        // 角度0の時の手のローカル座標を取得
        const savedDir = engine.state.direction;
        engine.state.direction = 0;
        const handPos0 = engine.getHandPosition(attachedPart);
        engine.state.direction = savedDir;
        
        const local_x = handPos0.x - engine.state.x;
        const local_y = handPos0.y - engine.state.y;
        
        const dx = goalPos.x - engine.state.x;
        const dy = goalPos.y - engine.state.y;
        const R = Math.sqrt(dx * dx + dy * dy);
        
        if (R >= Math.abs(local_x)) {
          const phi = Math.atan2(dy, dx);
          const acosVal = Math.acos(local_x / R);
          
          const theta1 = phi + acosVal;
          const theta2 = phi - acosVal;
          
          const D1 = dx * Math.sin(theta1) - dy * Math.cos(theta1) + local_y;
          const D2 = dx * Math.sin(theta2) - dy * Math.cos(theta2) + local_y;
          
          let targetThetaRad = (D1 > D2) ? theta1 : theta2;
          let distance = Math.max(D1, D2);
          
          const targetAngle = targetThetaRad * 180 / Math.PI;
          let rotateAmount = targetAngle - engine.state.direction;
          rotateAmount = ((rotateAmount % 360) + 540) % 360 - 180;
          
          if (Math.abs(rotateAmount) > 1) {
            await engine.animateTurn(rotateAmount);
          }
          if (distance > 0) {
            await engine.animateMove(distance);
          }
        } else {
          // ゴールが近すぎる場合はフォールバック
          const targetAngle = Math.atan2(goalPos.y - engine.state.item.y, goalPos.x - engine.state.item.x) * 180 / Math.PI + 90;
          let rotateAmount = targetAngle - engine.state.direction;
          rotateAmount = ((rotateAmount % 360) + 540) % 360 - 180;
          await engine.animateTurn(rotateAmount);
          await engine.animateMove(R);
        }
        engine.releaseItem();
      }
      
    } catch (e) {
      if (e.message !== "STOP") console.error(e);
      else addLog("ヒントの再生を中断しました。", "error");
    } finally {
      engine.isGhostMode = false;
      isRunning = false;
      shouldStop = false;
      stopButton.disabled = true;
      runButton.textContent = "実行";
      runButton.disabled = false;
      btnShowHint.disabled = false;
      btnShowHint.innerHTML = originalText;
    }
  });
}

canvas.addEventListener("mousemove", showPartTooltip);
canvas.addEventListener("mouseleave", hidePartTooltip);

editor.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    runProgram();
  }
});

document.querySelectorAll(".snippet-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const rawSnippet = btn.getAttribute("data-snippet");
    const snippet = rawSnippet.replace(/\\n/g, "\n");
    insertSnippet(snippet);
  });
});

function insertSnippet(snippet) {
  const start = editor.selectionStart;
  const text = editor.value;
  
  // 現在の行の末尾を探す
  let lineEnd = text.indexOf('\n', start);
  if (lineEnd === -1) lineEnd = text.length;
  
  const before = text.slice(0, lineEnd);
  const after = text.slice(lineEnd);
  
  let prefix = "";
  if (before.length > 0 && !before.endsWith('\n')) {
    prefix = "\n";
  }

  let finalSnippet = prefix + snippet;
  let cursorTarget = finalSnippet.indexOf('$CURSOR$');
  
  if (cursorTarget !== -1) {
    finalSnippet = finalSnippet.replace('$CURSOR$', '');
  } else {
    cursorTarget = finalSnippet.length;
  }
  
  editor.value = before + finalSnippet + after;
  
  const newCursorPos = before.length + cursorTarget;
  editor.selectionStart = editor.selectionEnd = newCursorPos;
  editor.focus();
  saveHistory();
}

async function runProgram() {
  if (isRunning) return;

  clearOutput();
  let source = editor.value.trim();

  if (!source) {
    addLog("実行できる文がありません。", "error");
    return;
  }

  isRunning = true;
  shouldStop = false;
  runButton.textContent = "実行中";
  runButton.disabled = true;
  stopButton.disabled = false;
  pauseButton.disabled = false;
  pauseButton.textContent = "一時停止";
  resetButton.disabled = true;

  currentLogSession = {
    sourceCode: source,
    status: "unknown",
    events: []
  };

  let finalGoalResult = null;
  try {
    let jsCode = transpileToJava(source);
    const picto = createPictoContext();
    const fn = new AsyncFunction('picto', jsCode);
    await fn(picto);
    if (!shouldStop) {
      addLog("完了しました。", "success");
      
      const goalResult = engine.evaluateGoalStatus();
      finalGoalResult = goalResult;
      const resultType = goalResult === "ゴールした" ? "success" : "info";
      addLog(`【判定結果】 ${goalResult}`, resultType);
      
      currentLogSession.status = goalResult === "ゴールした" ? "success" : "failed";
      currentLogSession.goalResult = goalResult;
    } else {
      currentLogSession.status = "stopped";
      currentLogSession.goalResult = "中断のため判定なし";
    }
  } catch (error) {
    if (error.message !== "STOP") {
      addLog(`エラー: ${error.message}`, "error");
      currentLogSession.status = "error";
      currentLogSession.errorMessage = error.message;
      currentLogSession.goalResult = "エラー中断のため判定なし";
    } else {
      currentLogSession.status = "stopped";
      currentLogSession.goalResult = "中断のため判定なし";
    }
  } finally {
    isRunning = false;
    runButton.textContent = "実行";
    runButton.disabled = false;
    stopButton.disabled = true;
    pauseButton.disabled = true;
    pauseButton.textContent = "一時停止";
    resetButton.disabled = false;

    if (currentLogSession) {
      currentLogSession.userId = userId;
      if (nicknameInput) {
        currentLogSession.nickname = nicknameInput.value.trim() || "名無し";
      }
      currentLogSession.timestamp = new Date().toISOString();
      currentLogSession.sessionId = sessionId;
      currentLogSession.stageId = engine.currentStageId;
      
      logCount++;
      localStorage.setItem("pictgramming_log_count", logCount);
      
      const customDocId = `${userId}_log${logCount}`;
      
      db.collection('logs').doc(customDocId).set(currentLogSession)
        .then(() => console.log(`Log saved to Firebase with ID: ${customDocId}`))
        .catch(e => console.error("Firebase log upload failed", e));
        
      currentLogSession = null;
      
      if (finalGoalResult === "ゴールした") {
        updateStageLocks(true);
        const clearOverlay = document.getElementById("clear-overlay");
        if (clearOverlay) {
          clearOverlay.hidden = false;
          // 4秒後に自動で消す
          setTimeout(() => {
            clearOverlay.hidden = true;
          }, 4000);
        }
      }
    }
    
    // チュートリアルの進行チェック
    if (tutorialAdvanceCheck) tutorialAdvanceCheck();
  }
}

// ログ履歴モーダルの処理
const btnLogHistory = document.getElementById("btn-log-history");
const logModal = document.getElementById("log-history-modal");
const logModalClose = document.getElementById("log-modal-close");
const logModalContent = document.getElementById("log-modal-content");

async function loadHistoryForStage(stageId) {
  logModalContent.innerHTML = "<p>読み込み中...</p>";
  
  try {
    const snapshot = await db.collection('logs')
      .where('userId', '==', userId)
      .where('stageId', '==', stageId)
      .get();
      
    if (snapshot.empty) {
      logModalContent.innerHTML = "<p>このステージの履歴がありません。</p>";
      return;
    }
    
    let logs = [];
    snapshot.forEach(doc => logs.push(doc.data()));
    logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    
    let html = "";
    logs.forEach(log => {
      const encodedCode = encodeURIComponent(log.sourceCode);
      const stageNum = log.stageId ? log.stageId.replace('stage', '') : '1';
      const stageName = `ステージ${stageNum}`;
      html += `
        <div class="history-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div class="history-time">${log.timestamp}</div>
              <div class="history-status" style="font-weight:bold;">${stageName}</div>
              <div class="history-status">状態: ${log.status}</div>
              ${log.goalResult ? `<div class="history-goal">判定: ${log.goalResult}</div>` : ''}
            </div>
            <button class="btn btn-secondary btn-copy" style="font-size: 11px; padding: 4px 8px;" data-code="${encodedCode}">コピー</button>
          </div>
          <pre class="history-code">${log.sourceCode}</pre>
        </div>
      `;
    });
    logModalContent.innerHTML = html;
    
    // コピーボタンのイベントリスナー
    document.querySelectorAll(".btn-copy").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const code = decodeURIComponent(e.target.getAttribute("data-code"));
        navigator.clipboard.writeText(code).then(() => {
          e.target.textContent = "コピー完了!";
          setTimeout(() => {
            e.target.textContent = "コピー";
          }, 2000);
        });
      });
    });
  } catch (e) {
    console.error(e);
    logModalContent.innerHTML = "<p>履歴の取得に失敗しました。</p>";
  }
}

if (btnLogHistory && logModal) {
  const modalStageSelect = document.getElementById("modal-stage-select");
  
  btnLogHistory.addEventListener("click", () => {
    logModal.showModal();
    if (modalStageSelect) {
      modalStageSelect.value = stageSelect.value;
    }
    loadHistoryForStage(stageSelect.value);
  });
  
  if (modalStageSelect) {
    modalStageSelect.addEventListener("change", (e) => {
      loadHistoryForStage(e.target.value);
    });
  }

  logModalClose.addEventListener("click", () => {
    logModal.close();
  });
}

function updateShoeUI() {
  if (!stageSelect) return;
  const isShoeStage = stageSelect.value === "stage4" || stageSelect.value === "stage5";
  document.querySelectorAll(".shoe-snippet").forEach(el => el.style.display = isShoeStage ? "inline-block" : "none");
  const shoeHelp1 = document.getElementById("shoe-help-1");
  const shoeHelp2 = document.getElementById("shoe-help-2");
  if (shoeHelp1) shoeHelp1.style.display = isShoeStage ? "list-item" : "none";
  if (shoeHelp2) shoeHelp2.style.display = isShoeStage ? "list-item" : "none";
}

if (stageSelect) {
  stageSelect.addEventListener("change", () => {
    engine.loadStage(stageSelect.value);
    clearOutput();
    updateShoeUI();
  });
}

function transpileToJava(javaCode) {
  let jsCode = javaCode;
  
  // Replace variable types
  jsCode = jsCode.replace(/\b(?:int|double|float|boolean|String)\b\s+/g, 'let ');

  // Replace Japanese control structures
  jsCode = jsCode.replace(/繰り返し\s*\(\s*(\d+)\s*回\s*\)\s*\{/g, 'for (let _i = 0; _i < $1; _i++) {');
  jsCode = jsCode.replace(/もし\s*\((.*?)\)\s*\{/g, 'if ($1) {');
  jsCode = jsCode.replace(/\}\s*そうでなければ\s*\{/g, '} else {');
  
  // Inject yield into loops to prevent freezing
  jsCode = jsCode.replace(/\b(for|while)\s*\((.*?)\)\s*\{/g, '$1($2) { await picto.yield(); ');
  
  // Replace command keywords to await picto.method
  jsCode = jsCode.replace(/(移動|回転|部位回転|掴む|離す|右足で履く|左足で履く|右足で脱ぐ|左足で脱ぐ|ヒヨコの近くにいる|ヒヨコを持っている)\s*\(/g, 'await picto.$1(');
  
  return jsCode;
}

function createPictoContext() {
  const checkStop = () => { if (shouldStop) throw new Error("STOP"); };

  return {
    移動: async (val) => {
      checkStop();
      if (typeof val !== "number" || !Number.isFinite(val)) throw new Error("移動の引数は数字である必要があります");
      addLog(`移動(${val});`);
      await engine.animateMove(val);
    },
    回転: async (val) => {
      checkStop();
      if (typeof val !== "number" || !Number.isFinite(val)) throw new Error("回転の引数は数字である必要があります");
      addLog(`回転(${val});`);
      await engine.animateTurn(val);
    },
    部位回転: async (part, val) => {
      checkStop();
      if (typeof part !== "string") throw new Error("部位回転の第1引数は部位の名前(文字列)である必要があります");
      if (typeof val !== "number" || !Number.isFinite(val)) throw new Error("部位回転の第2引数は数字である必要があります");
      
      const label = part.trim();
      const realPart = partNames[label] || partAliases[label.toLowerCase()];
      if (!realPart) throw new Error(`"${label}"は使えない部位名です`);
      
      addLog(`部位回転("${realPart}", ${val});`);
      await engine.animatePartRotate(realPart, val);
    },
    "掴む": async function() {
      checkStop();
      addLog("掴む();");
      engine.grabItem();
      await new Promise(r => setTimeout(r, 100)); // 少し待機
    },
    "離す": async function() {
      checkStop();
      addLog("離す();");
      engine.releaseItem();
      await new Promise(r => setTimeout(r, 100));
    },
    "右足で履く": async function() {
      checkStop();
      addLog("右足で履く();");
      engine.equipShoe("right");
      await new Promise(r => setTimeout(r, 100));
    },
    "左足で履く": async function() {
      checkStop();
      addLog("左足で履く();");
      engine.equipShoe("left");
      await new Promise(r => setTimeout(r, 100));
    },
    "右足で脱ぐ": async function() {
      checkStop();
      addLog("右足で脱ぐ();");
      engine.unequipShoe("right");
      await new Promise(r => setTimeout(r, 100));
    },
    "左足で脱ぐ": async function() {
      checkStop();
      addLog("左足で脱ぐ();");
      engine.unequipShoe("left");
      await new Promise(r => setTimeout(r, 100));
    },
    "ヒヨコの近くにいる": async function() {
      if (shouldStop) throw new Error("STOP");
      return engine.isNearItem();
    },
    "ヒヨコを持っている": async function() {
      if (shouldStop) throw new Error("STOP");
      return engine.state.hasGrabbedItem;
    },
    yield: async function() {
      if (shouldStop) throw new Error("STOP");
      while (engine.isPaused && !shouldStop) {
        await new Promise(r => setTimeout(r, 50));
      }
      await new Promise(r => setTimeout(r, 1));
      checkStop();
    }
  };
}

function clearOutput() {
  log.innerHTML = "";
  engine.reset();
  const clearOverlay = document.getElementById("clear-overlay");
  if (clearOverlay) clearOverlay.hidden = true;
}

function addLog(message, type = "") {
  const row = document.createElement("div");
  row.className = `log-entry ${type}`.trim();
  row.textContent = message;
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;

  if (currentLogSession && isRunning) {
    currentLogSession.events.push({ type, message });
  }
}

function showPartTooltip(event) {
  const rect = canvas.getBoundingClientRect();
  const canvasX = (event.clientX - rect.left) * (canvas.width / rect.width);
  const canvasY = (event.clientY - rect.top) * (canvas.height / rect.height);
  
  const shoeName = engine.getShoeAt(canvasX, canvasY);
  if (shoeName) {
    partTooltip.textContent = shoeName;
    partTooltip.style.left = `${event.clientX - rect.left + 14}px`;
    partTooltip.style.top = `${event.clientY - rect.top + 14}px`;
    partTooltip.hidden = false;
    return;
  }
  
  const part = engine.getPartAt(canvasX, canvasY);

  if (!part) {
    hidePartTooltip();
    return;
  }

  partTooltip.textContent = `${part.ja}: "${part.code}"`;
  partTooltip.style.left = `${event.clientX - rect.left + 14}px`;
  partTooltip.style.top = `${event.clientY - rect.top + 14}px`;
  partTooltip.hidden = false;
}

function hidePartTooltip() {
  partTooltip.hidden = true;
}

// ----------------------------------------------------
// ステージのアンロック（進行）管理
// ----------------------------------------------------
async function updateStageLocks(skipReload = false) {
  if (!stageSelect) return;
  const options = stageSelect.options;
  
  try {
    // ユーザーの全ログを取得して、クリアしたステージIDを抽出
    const snapshot = await db.collection('logs')
      .where('userId', '==', userId)
      .get();
      
    const clearedStages = new Set();
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.goalResult === 'ゴールした') {
        clearedStages.add(data.stageId);
      }
    });
    const hasCleared0 = clearedStages.has('stage0');
    const hasCleared1 = clearedStages.has('stage1');
    const hasCleared2 = clearedStages.has('stage2');
    const hasCleared3 = clearedStages.has('stage3');
    const hasCleared4 = clearedStages.has('stage4');
    const hasCleared5 = clearedStages.has('stage5');
    
    // ステージ0は常に解放（ただしドロップダウンからは隠す）
    options[0].disabled = false;
    options[0].text = "ステージ0: チュートリアル";
    options[0].hidden = true;
    
    // ステージ1 (ステージ0クリアで解放)
    if (options.length > 1) {
      if (hasCleared0) {
        options[1].disabled = false;
        options[1].text = "ステージ1: 目の前のヒヨコ";
      } else {
        options[1].disabled = true;
        options[1].text = "🔒 ステージ1 (ステージ0をクリアで解放)";
        if (stageSelect.value === 'stage1') stageSelect.value = 'stage0';
      }
    }
    
    // ステージ2 (ステージ1クリアで解放)
    if (options.length > 2) {
      if (hasCleared1) {
        options[2].disabled = false;
        options[2].text = "ステージ2: 後ろのヒヨコ";
      } else {
        options[2].disabled = true;
        options[2].text = "🔒 ステージ2 (ステージ1をクリアで解放)";
        if (stageSelect.value === 'stage2') stageSelect.value = (hasCleared0 ? 'stage1' : 'stage0');
      }
    }
    
    // ステージ3 (ステージ2クリアで解放)
    if (options.length > 3) {
      if (hasCleared2) {
        options[3].disabled = false;
        options[3].text = "ステージ3: 遠い道のり";
      } else {
        options[3].disabled = true;
        options[3].text = "🔒 ステージ3 (ステージ2をクリアで解放)";
        if (stageSelect.value === 'stage3') stageSelect.value = (hasCleared1 ? 'stage2' : (hasCleared0 ? 'stage1' : 'stage0'));
      }
    }
    
    // ステージ4 (ステージ3クリアで解放)
    if (options.length > 4) {
      if (hasCleared3) {
        options[4].disabled = false;
        options[4].text = "ステージ4: 片足の靴";
      } else {
        options[4].disabled = true;
        options[4].text = "🔒 ステージ4 (ステージ3をクリアで解放)";
        if (stageSelect.value === 'stage4') stageSelect.value = (hasCleared2 ? 'stage3' : (hasCleared1 ? 'stage2' : (hasCleared0 ? 'stage1' : 'stage0')));
      }
    }
    
    // ステージ5 (ステージ4クリアで解放)
    if (options.length > 5) {
      if (hasCleared4) {
        options[5].disabled = false;
        options[5].text = "ステージ5: 両足の靴";
      } else {
        options[5].disabled = true;
        options[5].text = "🔒 ステージ5 (ステージ4をクリアで解放)";
        if (stageSelect.value === 'stage5') stageSelect.value = (hasCleared3 ? 'stage4' : (hasCleared2 ? 'stage3' : (hasCleared1 ? 'stage2' : (hasCleared0 ? 'stage1' : 'stage0'))));
      }
    }
    
    // ステージ6 (ステージ5クリアで解放)
    if (options.length > 6) {
      if (hasCleared5) {
        options[6].disabled = false;
        options[6].text = "ステージ6: 狭いトンネル";
      } else {
        options[6].disabled = true;
        options[6].text = "🔒 ステージ6 (ステージ5をクリアで解放)";
        if (stageSelect.value === 'stage6') stageSelect.value = (hasCleared4 ? 'stage5' : (hasCleared3 ? 'stage4' : (hasCleared2 ? 'stage3' : (hasCleared1 ? 'stage2' : (hasCleared0 ? 'stage1' : 'stage0')))));
      }
    }
    
    updateShoeUI();
    if (!skipReload && stageSelect && typeof engine !== 'undefined') {
      engine.loadStage(stageSelect.value);
    }
    
  } catch (e) {
    console.error("ステージロック状況の取得に失敗しました", e);
  }
}

// ページロード時の初期設定：チュートリアル完了済みでstage0が選択されている場合、stage1をデフォルトにする
const isTutorialCompleted = localStorage.getItem('tutorialCompleted');
if (isTutorialCompleted && stageSelect && stageSelect.value === 'stage0') {
  stageSelect.value = 'stage1';
}

// ページ読み込み時にロック状況を更新
updateStageLocks();

const clearOverlay = document.getElementById("clear-overlay");
if (clearOverlay) {
  clearOverlay.addEventListener("click", () => {
    clearOverlay.hidden = true;
  });
}

// 全履歴削除ボタン
const btnDeleteAllLogs = document.getElementById("btn-delete-all-logs");
if (btnDeleteAllLogs) {
  btnDeleteAllLogs.addEventListener("click", async () => {
    if (!confirm("本当に自分の履歴を全て削除しますか？\n（この操作は取り消せません）")) return;
    
    btnDeleteAllLogs.disabled = true;
    btnDeleteAllLogs.textContent = "削除中...";
    
    try {
      const snapshot = await db.collection('logs').where('userId', '==', userId).get();
      const batch = db.batch();
      snapshot.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      
      const logModalContent = document.getElementById("log-modal-content");
      if (logModalContent) logModalContent.innerHTML = "<p>すべての履歴を削除しました。</p>";
      
      // ステージ1に戻してロック状況をリセット
      if (stageSelect) stageSelect.value = "stage1";
      engine.loadStage("stage1");
      updateStageLocks();
      clearOutput();
    } catch (e) {
      console.error(e);
      alert("削除に失敗しました。");
    } finally {
      btnDeleteAllLogs.disabled = false;
      btnDeleteAllLogs.textContent = "全削除";
    }
  });
}

// --- チュートリアル・ステージ0制御 ---
function initTutorial(force = false) {
  const isCompleted = localStorage.getItem('tutorialCompleted');
  
  // 古いチュートリアルコードが残っていたら強制更新
  if (editor && (editor.value === "移動(85);\n掴む();\n移動(165);\n離す();" || editor.value === "移動(100);\n掴む();\n移動(150);\n離す();")) {
    editor.value = "部位回転(\"右腕\", -45);\n移動(100);\n掴む();\n回転(90);\n移動(150);\n離す();";
  }

  if (isCompleted && !force) {
    if (stageSelect && stageSelect.value === 'stage0' && !editor.value.includes('掴む()')) {
      editor.value = "部位回転(\"右腕\", -45);\n移動(100);\n掴む();\n回転(90);\n移動(150);\n離す();";
    }
    return;
  }

  const overlay = document.getElementById('tutorial-wrapper');
  const highlight = document.getElementById('tutorial-highlight');
  const bubble = document.getElementById('tutorial-bubble');
  const text = document.getElementById('tutorial-text');
  const nextBtn = document.getElementById('btn-tutorial-next');
  
  if (!overlay || !highlight || !bubble) return;

  const steps = [
    { target: 'java-editor', text: 'チュートリアルへようこそ！まずはプログラムを書いて動かす練習です。', pos: 'left' },
    { 
      target: 'java-editor', 
      onTopElements: ['#btn-run', '.stage-frame'],
      text: '「部位回転」で右腕を曲げます。エディタにコードを追加しました！上の明るくなっている【実行】ボタンを押してみてください。', 
      pos: 'left', 
      codeToAdd: '部位回転("右腕", -45);',
      keyword: '部位回転',
      waitForRun: true,
      checkCondition: () => editor.value.includes('部位回転')
    },
    { 
      target: 'java-editor', 
      onTopElements: ['#btn-run', '.stage-frame'],
      text: '次は「移動」してヒヨコを「掴む」命令を追加しました！もう一度【実行】ボタンを押してください！', 
      pos: 'left', 
      codeToAdd: '移動(100);\n掴む();',
      keyword: '掴む()',
      waitForRun: true,
      checkCondition: () => engine.state.hasGrabbedItem
    },
    { 
      target: 'java-editor', 
      onTopElements: ['#btn-run', '.stage-frame'],
      text: '最後に「回転」で向きを変え、移動して「離す」命令でゴールしましょう！【実行】ボタンを押してください！', 
      pos: 'left', 
      codeToAdd: '回転(90);\n移動(150);\n離す();',
      keyword: '離す()',
      waitForRun: true,
      checkCondition: () => engine.evaluateGoalStatus() === "ゴールした"
    }
  ];
  let currentStep = 0;

  function showStep(index) {
    if (index >= steps.length) {
      if (window.tutorialOnTopElements) {
        window.tutorialOnTopElements.forEach(el => el.classList.remove('tutorial-on-top'));
        window.tutorialOnTopElements = null;
      }
      overlay.hidden = true;
      localStorage.setItem('tutorialCompleted', 'true');
      if (stageSelect) {
        // チュートリアルが完了したら、自動的にステージ1に進む
        stageSelect.value = 'stage1';
        engine.loadStage('stage1');
        updateShoeUI();
      }
      editor.value = "";
      return;
    }

    const step = steps[index];
    let el = step.target === 'snippet-toolbar' ? document.querySelector('.snippet-toolbar') : document.getElementById(step.target);
    if (!el) { showStep(index + 1); return; }

    const rect = el.getBoundingClientRect();
    const pad = 10;
    
    highlight.style.top = (rect.top - pad) + 'px';
    highlight.style.left = (rect.left - pad) + 'px';
    highlight.style.width = (rect.width + pad * 2) + 'px';
    highlight.style.height = (rect.height + pad * 2) + 'px';
    
    text.textContent = step.text;
    bubble.className = 'tutorial-bubble ' + step.pos;
    
    if (window.tutorialOnTopElements) {
      window.tutorialOnTopElements.forEach(el => el.classList.remove('tutorial-on-top'));
      window.tutorialOnTopElements = null;
    }

    if (step.onTopElements) {
      window.tutorialOnTopElements = [];
      step.onTopElements.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
          el.classList.add('tutorial-on-top');
          window.tutorialOnTopElements.push(el);
        }
      });
    }
    
    // 実行待ちステップの場合は次へボタンを隠す
    if (step.waitForRun) {
      nextBtn.style.display = 'none';
      if (step.codeToAdd) {
        const hasCode = step.keyword ? editor.value.includes(step.keyword) : editor.value.replace(/\r\n/g, '\n').includes(step.codeToAdd.replace(/\r\n/g, '\n'));
        if (!hasCode) {
          if (editor.value.trim() === '') {
            editor.value = step.codeToAdd;
          } else {
            editor.value = editor.value.trim() + '\n' + step.codeToAdd;
          }
        }
      }
    } else {
      nextBtn.style.display = 'block';
    }
    
    // 位置計算
    setTimeout(() => {
      if (step.pos === 'right') {
        bubble.style.top = (rect.top + 20) + 'px';
        bubble.style.left = (rect.right + pad + 20) + 'px';
      } else if (step.pos === 'left') {
        bubble.style.top = (rect.top + 20) + 'px';
        bubble.style.left = (rect.left - bubble.offsetWidth - pad - 20) + 'px';
      } else if (step.pos === 'top') {
        bubble.style.top = (rect.top - bubble.offsetHeight - pad - 20) + 'px';
        bubble.style.left = (rect.left) + 'px';
      } else if (step.pos === 'bottom') {
        bubble.style.top = (rect.bottom + pad + 20) + 'px';
        // 右端が画面外に出ないように調整
        if (rect.left + bubble.offsetWidth > window.innerWidth) {
          bubble.style.left = (window.innerWidth - bubble.offsetWidth - 20) + 'px';
        } else {
          bubble.style.left = (rect.left) + 'px';
        }
      }
    }, 10); // 少し待ってからoffsetHeightを取得
  }

  tutorialAdvanceCheck = () => {
    if (overlay.hidden) return;
    const step = steps[currentStep];
    if (step && step.waitForRun && step.checkCondition) {
      // 判定処理を少し遅延させて、アニメーション完了後などの確実な状態を取得する
      setTimeout(() => {
        if (step.checkCondition()) {
          currentStep++;
          showStep(currentStep);
        }
      }, 1000); // 動きを見せるために1秒待つ
    }
  };

  // 強制的にステージ0を選択しておく
  if (stageSelect) {
    stageSelect.value = 'stage0';
    engine.loadStage('stage0');
    updateShoeUI();
  }
  
  if (editor) {
    editor.value = "";
  }
  
  overlay.hidden = false;
  setTimeout(() => { showStep(0); }, 300);

  // 古いイベントリスナーを確実に消すため onclick を使用する
  nextBtn.onclick = () => {
    currentStep++;
    showStep(currentStep);
  };
  
  const skipBtn = document.getElementById('btn-tutorial-skip');
  if (skipBtn) {
    skipBtn.onclick = () => {
      overlay.hidden = true;
      localStorage.setItem('tutorialCompleted', 'true');
      if (stageSelect) {
        stageSelect.value = 'stage1';
        engine.loadStage('stage1');
        updateShoeUI();
      }
      editor.value = "";
    };
  }
}

// 少し遅延させてDOMの準備を確実に待つ
setTimeout(() => initTutorial(false), 500);

// あとからチュートリアルを開始するボタン
const btnStartTutorial = document.getElementById("btn-start-tutorial");
if (btnStartTutorial) {
  btnStartTutorial.addEventListener("click", () => {
    initTutorial(true);
  });
}
