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
const btnReplayHint = document.getElementById("btn-replay-hint");
      if (btnShowHint) {
        btnShowHint.disabled = false;
        btnShowHint.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>\n          ゴースト再生`;
      }
      
      // アニメーションループが停止するのを少し待ってからステージを切り替える
      setTimeout(() => {
        engine.loadStage(e.target.value);
        clearOutput();
        updateShoeUI();
        if (stageSelect && window.restoreHintState) window.restoreHintState(stageSelect.value);
      }, 150);
    } else {
      engine.loadStage(e.target.value);
      clearOutput();
      updateShoeUI();
      if (stageSelect && window.restoreHintState) window.restoreHintState(stageSelect.value);
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
let currentTargetHintLogId = null;
let currentTargetHintEvents = null;
let hintViewCounts = {
  "別解再生": 0,
  "初期状態から他人がヒヨコを掴むまでのゴースト": 0,
  "掴んだ状態からゴールまでのゴースト": 0
};
let runsSinceHint = 0;

    async function saveHintViewLog(actionType, targetId, score) {
  if (!userId) return;
  const stageId = stageSelect ? stageSelect.value : "stage1";
  try {
await db.collection('logs').add({
  eventType: 'hint_view',
  userId: userId,
  stageId: stageId,
  timestamp: new Date().toISOString(),
  hintActionType: actionType,
  targetHintLogId: targetId,
  scoreWhenHintViewed: score
});
  } catch (e) {
console.error("Failed to save hint view log", e);
  }
}


let userId = localStorage.getItem("pictgramming_user_id");
if (!userId) {
  userId = "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("pictgramming_user_id", userId);
}



// --- Hint Restoration Logic ---
window.restoreHintState = async function(stageId) {
  console.log("restoreHintState called for stage: " + stageId);
  if (!userId) return;
  const btnReplay = document.getElementById("btn-replay-hint");
  if (!btnReplay) return;
  
  btnReplay.style.display = 'none';
  currentTargetHintLogId = null;
  currentTargetHintEvents = null;
  lastViewedHint = "ヒントなし";
  
  try {
    const allMyLogsSnap = await db.collection('logs')
      .where('userId', '==', userId)
      .where('stageId', '==', stageId)
      .get();
      
    let myHintLogs = [];
    allMyLogsSnap.forEach(doc => {
      if (doc.data().eventType === 'hint_view') {
        myHintLogs.push(doc.data());
      }
    });
    console.log("Found hint logs count:", myHintLogs.length);
    
    if (myHintLogs.length > 0) {
      myHintLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const targetId = myHintLogs[0].targetHintLogId;
      console.log("Latest targetId:", targetId);
      if (targetId) {
        const targetDoc = await db.collection('logs').doc(targetId).get();
        console.log("Target ghost exists:", targetDoc.exists);
        if (targetDoc.exists) {
          currentTargetHintLogId = targetId;
          currentTargetHintEvents = targetDoc.data().events;
          btnReplay.style.display = 'inline-flex';
          lastViewedHint = "ヒントなし";
          console.log("Replay button restored successfully!");
        }
      }
    }
  } catch (e) {
    console.error("Failed to restore hint state", e);
  } finally {
    if (typeof updateHintBadge === 'function') updateHintBadge();
  }
};
// -----------------------------

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

function updateHintBadge() {
    const badge = document.getElementById("hint-badge");
    if (!badge) return;
    if (!currentTargetHintLogId || lastViewedHint === "ヒントなし") {
      badge.hidden = true;
    } else {
      badge.textContent = `💡 視聴中: ${lastViewedHint}`;
      badge.hidden = false;
    }
}

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
const btnReplayHint = document.getElementById("btn-replay-hint");
if (btnShowHint) {
  

  btnShowHint.addEventListener("click", async () => {
    if (isRunning) return;
    btnShowHint.disabled = true;
    const originalText = btnShowHint.innerHTML;
    btnShowHint.innerHTML = "検索中...";
    
    try {
      const stageId = stageSelect.value;
      const clearSnapshot = await db.collection('logs')
        .where('stageId', '==', stageId)
        .where('goalResult', '==', 'ゴールした')
        .get();
        
      const othersClears = [];
      clearSnapshot.forEach(doc => {
        if (doc.data().userId !== userId && doc.data().eventType !== 'hint_view') {
          othersClears.push({ id: doc.id, ...doc.data() });
        }
      });
        
      if (othersClears.length === 0) {
        addLog("まだあなた以外にクリアした人がいないため、ヒントを表示できません。", "info");
        return;
      }
      
      const myClearSnapshot = await db.collection('logs')
        .where('stageId', '==', stageId)
        .where('userId', '==', userId)
        .where('goalResult', '==', 'ゴールした')
        .limit(1)
        .get();

      if (!myClearSnapshot.empty) {
        const randomLog = othersClears[Math.floor(Math.random() * othersClears.length)];
        addLog(`【別解再生】${randomLog.nickname || '誰か'}さんのクリアの動きを再生します`, "info");
        currentTargetHintLogId = randomLog.id;
        currentTargetHintEvents = randomLog.events;
        lastViewedHint = "別解再生";
        await saveHintViewLog("new_search", currentTargetHintLogId, null);
        updateHintBadge();
        runsSinceHint = 0;
        
        isRunning = true;
        await engine.playGhost(randomLog.events);
          isRunning = false;
      } else {
        const myLatestSnapshot = await db.collection('logs')
          .where('stageId', '==', stageId)
          .where('userId', '==', userId)
          .get();
          
        let myLatestEvents = [];
        if (!myLatestSnapshot.empty) {
          let myLogs = [];
          myLatestSnapshot.forEach(doc => { if(doc.data().eventType !== 'hint_view') myLogs.push(doc.data()); });
          myLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          if (myLogs.length > 0) myLatestEvents = myLogs[0].events || [];
        }

        const mySnapshot = await db.collection('logs')
          .where('stageId', '==', stageId)
          .where('userId', '==', userId)
          .where('goalResult', 'in', ['持ったがゴールに入れていない', 'ゴールしているが離していない'])
          .get();
          
        const bestLog = findBestHintLog(othersClears, myLatestEvents, stageId);
        if (!bestLog.events || bestLog.events.length === 0) return;
        let score = Math.round(bestLog._calculatedDistanceScore || 0);
        
        if (mySnapshot.empty) {
          addLog(`【前半ヒント】${bestLog.nickname || '誰か'}さんがヒヨコを掴むまでを再生します`, "info");
          let grabIndex = bestLog.events.findIndex(evt => evt.message && evt.message.startsWith("掴む"));
          let partialEvents = grabIndex >= 0 ? bestLog.events.slice(0, grabIndex + 1) : bestLog.events;
          currentTargetHintLogId = bestLog.id;
          currentTargetHintEvents = bestLog.events;
          lastViewedHint = "前半ヒント";
          await saveHintViewLog("new_search", currentTargetHintLogId, score);
          updateHintBadge();
          runsSinceHint = 0;
          isRunning = true;
          await engine.playGhost(partialEvents);
            isRunning = false;
        } else {
          addLog(`【後半ヒント】${bestLog.nickname || '誰か'}さんのクリアの動きを再生します`, "info");
          currentTargetHintLogId = bestLog.id;
          currentTargetHintEvents = bestLog.events;
          lastViewedHint = "後半ヒント";
          await saveHintViewLog("new_search", currentTargetHintLogId, score);
          updateHintBadge();
          runsSinceHint = 0;
          isRunning = true;
          await engine.playGhost(bestLog.events);
            isRunning = false;
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      btnShowHint.disabled = false;
      btnShowHint.innerHTML = originalText;
      if (btnReplayHint && currentTargetHintLogId) btnReplayHint.style.display = 'inline-flex';
    }
  });
}

  if (btnReplayHint) {
    btnReplayHint.addEventListener("click", async () => {
      if (isRunning || !currentTargetHintEvents) {
        console.warn("Replay cancelled");
        return;
      }
      try {
        const stageId = stageSelect ? stageSelect.value : "stage1";
        const myClearSnapshot = await db.collection('logs')
          .where('stageId', '==', stageId)
          .where('userId', '==', userId)
          .where('goalResult', '==', 'ゴールした')
          .limit(1)
          .get();
          
        const mySnapshot = await db.collection('logs')
          .where('stageId', '==', stageId)
          .where('userId', '==', userId)
          .where('goalResult', 'in', ['持ったがゴールに入れていない', 'ゴールしているが離していない'])
          .get();
          
        let hintTypeStr = "前回のヒント";
        let actionStr = "動き";
        if (!myClearSnapshot.empty) {
          hintTypeStr = "別解再生";
          actionStr = "クリアの動き";
        } else if (mySnapshot.empty) {
          hintTypeStr = "前半ヒント";
          actionStr = "ヒヨコを掴むまでの動き";
        } else {
          hintTypeStr = "後半ヒント";
          actionStr = "クリアの動き";
        }
        
        let hintNickname = "誰か";
        if (currentTargetHintLogId) {
          const doc = await db.collection('logs').doc(currentTargetHintLogId).get();
          if (doc.exists && doc.data().nickname) {
            hintNickname = doc.data().nickname;
          }
        }
        
        lastViewedHint = hintTypeStr;
        if (typeof updateHintBadge === 'function') updateHintBadge();
        addLog(`【${hintTypeStr}】さっきの${hintNickname}さんの${actionStr}をもう一度再生します`, "info");
        await saveHintViewLog("replay", currentTargetHintLogId, null);
          
        let eventsToPlay = currentTargetHintEvents;
        if (myClearSnapshot.empty && mySnapshot.empty) {
          let grabIndex = currentTargetHintEvents.findIndex(evt => evt.message && evt.message.startsWith("掴む"));
          eventsToPlay = grabIndex >= 0 ? currentTargetHintEvents.slice(0, grabIndex + 1) : currentTargetHintEvents;
        }
        
        isRunning = true;
        await engine.playGhost(eventsToPlay);
      } catch (e) {
        console.error(e);
      } finally {
        isRunning = false;
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

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// 動きの近い度（類似度）をDTWで計算して最適なログを抽出する関数

function calculateDTWScore(myEvents, pastEvents, stageId) {
  if (!myEvents || !pastEvents || myEvents.length === 0 || pastEvents.length === 0) return 0;
  let wPos = 1.0, wDir = 0.5, wArm = 0.2, wLeg = 0.0;
  const stageNum = parseInt(stageId.replace('stage', ''), 10);
  if (!isNaN(stageNum) && stageNum >= 4) { wLeg = 0.2; }
  
  let n = myEvents.length;
  let m = pastEvents.length;
  let dtw = Array(n + 1).fill().map(() => Array(m + 1).fill(Infinity));
  dtw[0][0] = 0;
  
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      let ev1 = myEvents[i-1], ev2 = pastEvents[j-1];
      let dx = (ev1.x || 0) - (ev2.x || 0), dy = (ev1.y || 0) - (ev2.y || 0);
      let posDist = Math.sqrt(dx*dx + dy*dy);
      let dDir = Math.abs((ev1.direction || 0) - (ev2.direction || 0)) % 360;
      if (dDir > 180) dDir = 360 - dDir;
      let armCost = (Math.abs((ev1.leftArm || 0) - (ev2.leftArm || 0)) + Math.abs((ev1.rightArm || 0) - (ev2.rightArm || 0)) + Math.abs((ev1.leftElbow || 0) - (ev2.leftElbow || 0)) + Math.abs((ev1.rightElbow || 0) - (ev2.rightElbow || 0))) * wArm;
      let legCost = (Math.abs((ev1.leftLeg || 0) - (ev2.leftLeg || 0)) + Math.abs((ev1.rightLeg || 0) - (ev2.rightLeg || 0)) + Math.abs((ev1.leftKnee || 0) - (ev2.leftKnee || 0)) + Math.abs((ev1.rightKnee || 0) - (ev2.rightKnee || 0))) * wLeg;
      
      let cost = (posDist * wPos) + (dDir * wDir) + armCost + legCost;
      dtw[i][j] = cost + Math.min(dtw[i-1][j], dtw[i][j-1], dtw[i-1][j-1]);
    }
  }
  return Math.min(...dtw[n].slice(1));
}

function findBestHintLog(othersClears, myEvents, stageId) {
  if (!myEvents || myEvents.length === 0) {
    const randomLog = othersClears[Math.floor(Math.random() * othersClears.length)];
    randomLog._calculatedDistanceScore = 0;
    return randomLog;
  }
  
  let wPos = 1.0;
  let wDir = 0.5;
  let wArm = 0.2;
  let wLeg = 0.0;
  
  // ステージ4以降は靴があるため、足の重みを追加
  const stageNum = parseInt(stageId.replace('stage', ''), 10);
  if (!isNaN(stageNum) && stageNum >= 4) {
    wLeg = 0.2;
  }
  
  let bestLog = null;
  let minScore = Infinity;
  
  for (const log of othersClears) {
    const pastEvents = log.events;
    if (!pastEvents || pastEvents.length === 0) continue;
    
    let n = myEvents.length;
    let m = pastEvents.length;
    
    // DTW行列の初期化
    let dtw = Array(n + 1).fill().map(() => Array(m + 1).fill(Infinity));
    dtw[0][0] = 0;
    
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        let ev1 = myEvents[i-1];
        let ev2 = pastEvents[j-1];
        
        let dx = (ev1.x || 0) - (ev2.x || 0);
        let dy = (ev1.y || 0) - (ev2.y || 0);
        let posDist = Math.sqrt(dx*dx + dy*dy);
        
        let dDir = Math.abs((ev1.direction || 0) - (ev2.direction || 0)) % 360;
        if (dDir > 180) dDir = 360 - dDir;
        
        let dLeftArm = Math.abs((ev1.leftArm || 0) - (ev2.leftArm || 0));
        let dRightArm = Math.abs((ev1.rightArm || 0) - (ev2.rightArm || 0));
        let dLeftElbow = Math.abs((ev1.leftElbow || 0) - (ev2.leftElbow || 0));
        let dRightElbow = Math.abs((ev1.rightElbow || 0) - (ev2.rightElbow || 0));
        
        let dLeftLeg = Math.abs((ev1.leftLeg || 0) - (ev2.leftLeg || 0));
        let dRightLeg = Math.abs((ev1.rightLeg || 0) - (ev2.rightLeg || 0));
        let dLeftKnee = Math.abs((ev1.leftKnee || 0) - (ev2.leftKnee || 0));
        let dRightKnee = Math.abs((ev1.rightKnee || 0) - (ev2.rightKnee || 0));
        
        let armCost = (dLeftArm + dRightArm + dLeftElbow + dRightElbow) * wArm;
        let legCost = (dLeftLeg + dRightLeg + dLeftKnee + dRightKnee) * wLeg;
        
        let cost = (posDist * wPos) + (dDir * wDir) + armCost + legCost;
        
        dtw[i][j] = cost + Math.min(
          dtw[i-1][j],    // 挿入
          dtw[i][j-1],    // 欠損
          dtw[i-1][j-1]   // マッチ
        );
      }
    }
    
    // 学習者の全イベントを、過去ログの任意のプレフィックス（途中まで）にマッチさせた時の最小コスト
    let logMinScore = Math.min(...dtw[n].slice(1));
    
    if (logMinScore < minScore) {
      minScore = logMinScore;
      bestLog = log;
    }
  }
  
  if (bestLog) {
    bestLog._calculatedDistanceScore = minScore;
    return bestLog;
  }
  
  const fallbackLog = othersClears[Math.floor(Math.random() * othersClears.length)];
  fallbackLog._calculatedDistanceScore = 0;
  return fallbackLog;
}

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
  const initialStageId = engine.currentStageId;

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
      currentLogSession.stageId = typeof initialStageId !== 'undefined' ? initialStageId : engine.currentStageId;
      
      if (lastViewedHint !== "ヒントなし") {
        runsSinceHint++;
      }
      currentLogSession.hintViewed = lastViewedHint;
      
      currentLogSession.hintViewCount = currentTargetHintLogId ? 1 : 0;
      currentLogSession.runsSinceHint = currentTargetHintLogId ? runsSinceHint : 0;
      currentLogSession.targetHintLogId = currentTargetHintLogId;
      currentLogSession.codeLength = editor.value.length;
      currentLogSession.codeLines = editor.value.split('\n').length;
      
      if (currentTargetHintEvents && currentLogSession.events.length > 0) {
        currentLogSession.distanceToTargetHint = calculateDTWScore(currentLogSession.events, currentTargetHintEvents, engine.currentStageId);
      } else {
        currentLogSession.distanceToTargetHint = null;
      }
      
      currentLogSession.finalState = {
        x: engine.state.x,
        y: engine.state.y,
        direction: engine.state.direction,
        hasGrabbedItem: engine.state.hasGrabbedItem
      };
      
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
    snapshot.forEach(doc => { if (doc.data().eventType !== 'hint_view') logs.push(doc.data()); });
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

  // 靴のチュートリアル表示
  if (isShoeStage && !localStorage.getItem('shoeTutorialCompleted')) {
    const modal = document.getElementById('shoe-tutorial-modal');
    if (modal) {
      modal.showModal();
      localStorage.setItem('shoeTutorialCompleted', 'true');
      
      const closeBtn = document.getElementById('shoe-modal-close');
      const okBtn = document.getElementById('btn-shoe-modal-ok');
      
      const closeModal = () => modal.close();
      if (closeBtn) closeBtn.onclick = closeModal;
      if (okBtn) okBtn.onclick = closeModal;
    }
  }
}

if (stageSelect) {
  stageSelect.addEventListener("change", () => {
    engine.loadStage(stageSelect.value);
    clearOutput();
    updateShoeUI();
    if (window.restoreHintState) window.restoreHintState(stageSelect.value);
    lastViewedHint = "ヒントなし";
    updateHintBadge();
    hintViewCounts = {
      "初期状態から他人がヒヨコを掴むまでのゴースト": 0,
      "掴んだ状態からのゴースト": 0,
      "別解再生": 0
    };
    runsSinceHint = 0;
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
    currentLogSession.events.push({ 
      type, 
      message,
      x: engine.state.x,
      y: engine.state.y,
      direction: engine.state.direction,
      leftArm: engine.state.leftArm || 0,
      rightArm: engine.state.rightArm || 0,
      leftElbow: engine.state.leftElbow || 0,
      rightElbow: engine.state.rightElbow || 0,
      leftLeg: engine.state.leftLeg || 0,
      rightLeg: engine.state.rightLeg || 0,
      leftKnee: engine.state.leftKnee || 0,
      rightKnee: engine.state.rightKnee || 0
    });
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
    
    // ステージ1は最初から解放
    if (options.length > 1) {
      options[1].disabled = false;
      options[1].text = "ステージ1: 目の前のヒヨコ";
    }
    
    // ステージ2 (ステージ1クリアで解放)
    if (options.length > 2) {
      if (hasCleared1) {
        options[2].disabled = false;
        options[2].text = "ステージ2: 後ろのヒヨコ";
      } else {
        options[2].disabled = true;
        options[2].text = "🔒 ステージ2 (ステージ1をクリアで解放)";
        if (stageSelect.value === 'stage2') stageSelect.value = 'stage1';
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
        if (stageSelect.value === 'stage3') stageSelect.value = (hasCleared1 ? 'stage2' : 'stage1');
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
        if (stageSelect.value === 'stage4') stageSelect.value = (hasCleared2 ? 'stage3' : (hasCleared1 ? 'stage2' : 'stage1'));
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
        if (stageSelect.value === 'stage5') stageSelect.value = (hasCleared3 ? 'stage4' : (hasCleared2 ? 'stage3' : (hasCleared1 ? 'stage2' : 'stage1')));
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
        if (stageSelect.value === 'stage6') stageSelect.value = (hasCleared4 ? 'stage5' : (hasCleared3 ? 'stage4' : (hasCleared2 ? 'stage3' : (hasCleared1 ? 'stage2' : 'stage1'))));
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
  if (stageSelect && window.restoreHintState) window.restoreHintState(stageSelect.value);
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
