const canvas = document.getElementById("stage-canvas");
const editor = document.getElementById("java-editor");
const STAGE_STARTER_CODES = {
  stage1: `// 「実行」ボタンを押してみよう\n向く(90);\n移動(480);\n`,
  stage2: `// 前に進む\n移動(150);\n`,
  stage3: `向く(90);\n移動(150);\n`,
  stage4: `// ヒヨコを掴む\n向く(90);\n移動(180);\n部位回転("右腕", -60);\n`,
  stage5: `// B地点の近くまで進む\n向く("B");\nwhile (近くにいない("B")) {\n  移動(30);\n}\n`,
  stage6: ``,
  stage7: `// 1足目の靴を履く\n移動(60);\n向く(90);\nwhile (近くにいない("靴")) {\n  移動(30);\n}\n部位回転("右足", -60);\n`,
  stage8: ``,
  stage9: `// 繰り返しを使って3羽のヒヨコを運ぼう\n繰り返し(3回) {\n  \n}\n`,
  stage10: `向く("A");\nwhile (近くにいない("A")) {\n  移動(30);\n}\nもし (近くにいる("ヒヨコ")) {\n  \n}\n`
};

function setStarterCodeForStage(stageId) {
  if (!editor) return;
  const code = STAGE_STARTER_CODES[stageId] !== undefined ? STAGE_STARTER_CODES[stageId] : "";
  editor.value = code;
  if (typeof historyStack !== 'undefined') {
    historyStack.length = 0;
    historyStack.push({ val: editor.value, start: 0, end: 0 });
    historyIndex = 0;
  }
  if (typeof updateToolbarState === "function") updateToolbarState();
  if (typeof resetStage8Clears === "function") resetStage8Clears();
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
const btnShowHint = document.getElementById("btn-show-hint");
const btnReplayHint = document.getElementById("btn-replay-hint");

const stage8TestSelector = document.getElementById("stage8-test-selector");
const btnTestCase1 = document.getElementById("btn-test-case-1");
const btnTestCase2 = document.getElementById("btn-test-case-2");
const stageTitleEl = document.getElementById("stage-title");
const stageGoalBannerEl = document.getElementById("stage-goal-banner");
let stage8ClearedCases = new Set();

const STAGE_INFO = {
  stage0: {
    title: "チュートリアル",
    goal: "🎯 目標：画面の案内にそって基本の動かし方を練習しよう"
  },
  stage1: {
    title: "ステージ1：移動と方向転換①",
    goal: "🎯 目標：ピクトグラムを GOAL まで移動させよう"
  },
  stage2: {
    title: "ステージ2：移動と方向転換②",
    goal: "🎯 目標：途中で向きを変えて、GOAL まで移動させよう"
  },
  stage3: {
    title: "ステージ3：移動と方向転換③",
    goal: "🎯 目標：真ん中の壁を避けて GOAL まで移動させよう"
  },
  stage4: {
    title: "ステージ4：ヒヨコを運ぼう①",
    goal: "🎯 目標：ヒヨコを掴んで GOAL の中まで運び、そこで離そう"
  },
  stage5: {
    title: "ステージ5：ヒヨコを運ぼう②",
    goal: "🎯 目標：右上にあるヒヨコを掴んで GOAL まで運ぼう"
  },
  stage6: {
    title: "ステージ6：ヒヨコを運ぼう③",
    goal: "🎯 目標：2羽のうち、どちらか1羽のヒヨコを GOAL まで運ぼう"
  },
  stage7: {
    title: "ステージ7：靴と針山①",
    goal: "🎯 目標：2足の靴を両方履いて針山を通り抜け、ヒヨコを GOAL まで運ぼう"
  },
  stage8: {
    title: "ステージ8：靴と針山②",
    goal: "🎯 目標：2足の靴を両方履いて針山を越え、どちらか1羽のヒヨコを GOAL まで運ぼう"
  },
  stage9: {
    title: "ステージ9：3羽のヒヨコを運ぼう",
    goal: "🎯 目標：ヒヨコを1羽ずつ運び、合計3羽を GOAL まで運ぼう"
  },
  stage10: {
    title: "ステージ10：ヒヨコを探そう",
    goal: "🎯 目標：爆弾に触れないようヒヨコを GOAL まで運ぼう（パターン1・2の両方でクリアしよう）"
  },
  tut1: {
    title: "📘 チュートリアル①：移動と方向転換（ステージ1〜3）",
    goal: "🎯 練習：矢印の向きへ進み、途中で向きを変えて左上の GOAL へ進もう"
  },
  tut4: {
    title: "📘 チュートリアル②：ヒヨコを掴んで運ぶ（ステージ4〜6）",
    goal: "🎯 練習：B地点のヒヨコを右腕で掴み、D地点の GOAL の中で離そう"
  },
  tut7: {
    title: "📘 チュートリアル③：靴と針山（ステージ7〜8）",
    goal: "🎯 練習：右足を回して靴を履き、赤い針山を越えて GOAL へ進もう"
  },
  tut9: {
    title: "📘 チュートリアル④：複数のヒヨコと「繰り返し」（ステージ9）",
    goal: "🎯 練習：「繰り返し」を使って、B地点の巣からヒヨコを1羽ずつ GOAL へ運ぼう"
  },
  tut10: {
    title: "📘 チュートリアル⑤：爆弾と「もし〜そうでなければ」（ステージ10）",
    goal: "🎯 練習：爆弾を掴まないよう「もし」でヒヨコを確かめて GOAL へ運ぼう"
  }
};

function updateStageMissionUI(stageId) {
  const activeId = (typeof engine !== "undefined" && engine.currentStageId && engine.currentStageId.startsWith("tut"))
    ? engine.currentStageId
    : stageId;
  const info = STAGE_INFO[activeId] || STAGE_INFO[stageId] || STAGE_INFO.stage1;
  if (stageTitleEl) stageTitleEl.textContent = info.title;
  if (stageGoalBannerEl) stageGoalBannerEl.textContent = info.goal;
}

function updateStage8TestUI(stageId) {
  const activeId = (typeof engine !== "undefined" && engine.currentStageId && engine.currentStageId.startsWith("tut"))
    ? engine.currentStageId
    : stageId;
  updateStageMissionUI(activeId);
  if (!stage8TestSelector) return;
  if (activeId === "stage10" || activeId === "tut10") {
    stage8TestSelector.style.display = "inline-flex";
    updateStage8ButtonsUI();
  } else {
    stage8TestSelector.style.display = "none";
  }
}

function updateStage8ButtonsUI() {
  if (!btnTestCase1 || !btnTestCase2) return;
  const cur = engine.currentTestCase || 0;
  const is1Cleared = stage8ClearedCases.has(0);
  const is2Cleared = stage8ClearedCases.has(1);

  btnTestCase1.textContent = is1Cleared ? "パターン1 ✓" : "パターン1";
  btnTestCase2.textContent = is2Cleared ? "パターン2 ✓" : "パターン2";

  if (cur === 0) {
    btnTestCase1.style.background = is1Cleared ? "#059669" : "#0284c7";
    btnTestCase1.style.color = "white";
    btnTestCase1.style.border = "none";
    btnTestCase1.style.fontWeight = "bold";

    btnTestCase2.style.background = "white";
    btnTestCase2.style.color = is2Cleared ? "#059669" : "#0284c7";
    btnTestCase2.style.border = `1px solid ${is2Cleared ? "#059669" : "#0284c7"}`;
    btnTestCase2.style.fontWeight = "normal";
  } else {
    btnTestCase2.style.background = is2Cleared ? "#059669" : "#0284c7";
    btnTestCase2.style.color = "white";
    btnTestCase2.style.border = "none";
    btnTestCase2.style.fontWeight = "bold";

    btnTestCase1.style.background = "white";
    btnTestCase1.style.color = is1Cleared ? "#059669" : "#0284c7";
    btnTestCase1.style.border = `1px solid ${is1Cleared ? "#059669" : "#0284c7"}`;
    btnTestCase1.style.fontWeight = "normal";
  }
}

function resetStage8Clears() {
  if (stage8ClearedCases.size > 0) {
    stage8ClearedCases.clear();
    updateStage8ButtonsUI();
  }
}

if (btnTestCase1) {
  btnTestCase1.addEventListener("click", () => {
    if (isRunning) return;
    engine.setTestCase(0);
    updateStage8ButtonsUI();
    clearOutput();
  });
}

if (btnTestCase2) {
  btnTestCase2.addEventListener("click", () => {
    if (isRunning) return;
    engine.setTestCase(1);
    updateStage8ButtonsUI();
    clearOutput();
  });
}


function updateHintButtonsUI(hasHint) {
  const iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`;
  const replaySvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`;
  
  if (btnShowHint) {
    if (hasHint) {
      btnShowHint.innerHTML = `${iconSvg} 別のヒントを探す`;
      btnShowHint.title = "別のヒントを探す";
    } else {
      btnShowHint.innerHTML = `${iconSvg} ヒントを見る`;
      btnShowHint.title = "ヒントを見る";
    }
  }
  if (btnReplayHint) {
    btnReplayHint.innerHTML = `${replaySvg} 同じヒントを見る`;
    btnReplayHint.title = "同じヒントを見る";
    btnReplayHint.style.display = hasHint ? 'inline-flex' : 'none';
  }
}

async function checkHintLock() {
  if (!btnShowHint) return;
  const stageId = stageSelect ? stageSelect.value : "stage1";
  const activeId = (typeof engine !== "undefined" && engine.currentStageId) ? engine.currentStageId : stageId;
  
  if (stageId === "stage0" || activeId.startsWith("tut")) {
    btnShowHint.disabled = true;
    return;
  }

  // 判定中はボタンを無効化
  btnShowHint.disabled = true;
  btnShowHint.title = "実行履歴を確認中...";

  try {
    // データベース（ログ）から、このユーザーがこのステージで一度でも実行したか確認する
    const snapshot = await db.collection('logs')
      .where('userId', '==', userId)
      .where('stageId', '==', stageId)
      .limit(1)
      .get();
      
    if (!snapshot.empty) {
      btnShowHint.disabled = false;
      btnShowHint.title = currentTargetHintLogId ? "別のヒントを探す" : "ヒントを見る";
    } else {
      btnShowHint.disabled = true;
      btnShowHint.title = "まずは自分でプログラムを実行してみましょう！";
    }
  } catch(e) {
    console.error("Hint lock check failed:", e);
    // エラー時は安全のためロック解除
    btnShowHint.disabled = false;
    btnShowHint.title = currentTargetHintLogId ? "別のヒントを探す" : "ヒントを見る";
  }
}

if (stageSelect) {
  stageSelect.addEventListener("change", (e) => {
    const newStage = e.target.value;
    if (typeof closeTutorialOverlayOnly === "function") {
      closeTutorialOverlayOnly();
    }
    const applyStageSwitch = () => {
      stage8ClearedCases.clear();
      engine.loadStage(newStage);
      setStarterCodeForStage(newStage);
      checkHintLock();
      clearOutput();
      updateShoeUI();
      updateStage8TestUI(newStage);
      if (stageSelect && window.restoreHintState) window.restoreHintState(newStage);
      lastViewedHint = "ヒントなし";
      updateHintBadge();
      if (typeof maybeStartAutoTutorial === "function") {
        setTimeout(() => maybeStartAutoTutorial(newStage), 120);
      }
    };

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
      
      // アニメーションループが停止するのを少し待ってからステージを切り替える
      setTimeout(applyStageSwitch, 150);
    } else {
      applyStageSwitch();
    }
  });
}

let tutorialAdvanceCheck = null;

function getStageNumber(id) {
  if (!id) return 1;
  if (id.startsWith("tut")) return parseInt(id.replace("tut", ""), 10) || 1;
  if (id.startsWith("stage")) return parseInt(id.replace("stage", ""), 10) || 1;
  return 1;
}

function updateShoeUI() {
  if (!stageSelect) return;
  const activeId = (typeof engine !== "undefined" && engine.currentStageId && engine.currentStageId.startsWith("tut"))
    ? engine.currentStageId
    : stageSelect.value;
  updateStage8TestUI(activeId);

  const stageNum = getStageNumber(activeId);
  const isStage4Plus = stageNum >= 4;
  const isShoeStage = activeId === "stage7" || activeId === "stage8" || activeId === "tut7";
  const isStage9Plus = stageNum >= 9;
  const isStage10 = stageNum >= 10;

  // 段階的表示：ステージ4以降（部位回転・掴む・離す・while・条件・部位名一覧）
  document.querySelectorAll(".unlock-stage4").forEach(el => {
    if (el.tagName === "LI") {
      el.style.display = isStage4Plus ? "list-item" : "none";
    } else if (el.classList.contains("part-name-list")) {
      el.style.display = isStage4Plus ? "block" : "none";
    } else {
      el.style.display = isStage4Plus ? "inline-block" : "none";
    }
  });

  // 段階的表示：ステージ7〜8のみ（靴を履く）
  document.querySelectorAll(".shoe-snippet").forEach(el => {
    el.style.display = isShoeStage ? "inline-block" : "none";
  });
  const shoeHelp1 = document.getElementById("shoe-help-1");
  const shoeHelp2 = document.getElementById("shoe-help-2");
  if (shoeHelp1) shoeHelp1.style.display = isShoeStage ? "list-item" : "none";
  if (shoeHelp2) shoeHelp2.style.display = isShoeStage ? "list-item" : "none";

  // 段階的表示：ステージ9以降（繰り返し）
  document.querySelectorAll(".unlock-stage9").forEach(el => {
    el.style.display = isStage9Plus ? (el.tagName === "LI" ? "list-item" : "inline-block") : "none";
  });

  // 段階的表示：ステージ10（もし / もし...else）
  document.querySelectorAll(".unlock-stage10").forEach(el => {
    el.style.display = isStage10 ? (el.tagName === "LI" ? "list-item" : "inline-block") : "none";
  });

  // ステージの進行に合わせて説明文の補足対象も段階的に変化させる
  const helpFacePoint = document.getElementById("help-face-point");
  if (helpFacePoint) {
    let invalidTargets = "ゴール";
    if (isStage4Plus) invalidTargets = "ヒヨコ・ゴール";
    if (isShoeStage) invalidTargets = "ヒヨコ・靴・ゴール";
    if (isStage10) invalidTargets = "ヒヨコ・爆弾・ゴール";
    helpFacePoint.innerHTML = `<code>向く("A");</code> 地点（<code>"A"</code>〜<code>"F"</code>）の方向へ矢印を向ける（※${invalidTargets}には直接向けません）`;
  }

  const helpPartRotate = document.getElementById("help-part-rotate");
  if (helpPartRotate) {
    const bombNote = isStage10 ? " ※爆弾に触れるとゲームオーバー" : "";
    helpPartRotate.innerHTML = `<code>部位回転("部位名", 数字);</code> 手足を回す（腕を回してヒヨコに触れると自動で掴みます${bombNote}）`;
  }

  const helpCondTargets = document.getElementById("help-condition-targets");
  if (helpCondTargets) {
    let extraTargets = `<code>"ゴール"</code>, <code>"ヒヨコ"</code>`;
    if (isShoeStage) extraTargets += `, <code>"靴"</code>`;
    if (isStage10) extraTargets += `, <code>"爆弾"</code>`;
    helpCondTargets.innerHTML = `<strong>【条件】</strong> <code>近くにいる("対象")</code> ／ <code>近くにいない("対象")</code><br>対象には地点（<code>"A"</code>〜<code>"F"</code>）のほか、${extraTargets} を指定できます`;
  }
}

const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

let isRunning = false;
let shouldStop = false;
let currentLogSession = null;
let currentTargetHintLogId = null;
let currentTargetHintEvents = null;
let lastViewedHint = "ヒントなし";

    async function saveHintViewLog(actionType, targetId, score) {
  if (!userId) return;
  const stageId = stageSelect ? stageSelect.value : "stage1";
  const activeId = (typeof engine !== "undefined" && engine.currentStageId) ? engine.currentStageId : stageId;
  if (stageId === "stage0" || activeId.startsWith("tut")) return; // 不要なログ（チュートリアル）を弾く
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
  
  currentTargetHintLogId = null;
  currentTargetHintEvents = null;
  lastViewedHint = "ヒントなし";
  if (typeof updateHintButtonsUI === 'function') updateHintButtonsUI(false);
  
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
          lastViewedHint = "ヒントなし";
          if (typeof updateHintButtonsUI === 'function') updateHintButtonsUI(true);
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
    
    // アニメーションループが stop を検知して終了するのを待ってからリセットする
    setTimeout(() => {
      engine.reset();
      engine.draw();
      addLog("実行を停止しました。", "error");
    }, 50);
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
if (typeof checkHintLock === 'function') checkHintLock();
if (stageSelect && window.restoreHintState) window.restoreHintState(stageSelect.value);

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
  
  resetStage8Clears();
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
      resetStage8Clears();
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
      resetStage8Clears();
      isUndoRedoAction = false;
    }
  });
}
if (btnClearEditor) {
  btnClearEditor.addEventListener("click", () => {
    if (editor.value.trim() !== "" && confirm("入力したプログラムをすべて消去しますか？")) {
      editor.value = "";
      editor.focus();
      resetStage8Clears();
      saveHistory();
    }
  });
}

updateToolbarState();

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
        
      let othersClears = [];
      clearSnapshot.forEach(doc => {
        if (doc.data().userId !== userId && doc.data().eventType !== 'hint_view') {
          othersClears.push({ id: doc.id, ...doc.data() });
        }
      });
      if (stageId === "stage8") {
        const testFiltered = othersClears.filter(d => d.testCase === engine.currentTestCase);
        if (testFiltered.length > 0) {
          othersClears = testFiltered;
        }
      }
        
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
        console.log("他人クリア件数: " + othersClears.length);
        const randomLog = othersClears[Math.floor(Math.random() * othersClears.length)];
        addLog(`【別解再生】${randomLog.nickname || '誰か'}さんのクリアの動きを再生します`, "info");
        currentTargetHintLogId = randomLog.id;
        currentTargetHintEvents = randomLog.events;
        lastViewedHint = "別解再生";
        await saveHintViewLog("new_search", currentTargetHintLogId, null);
        updateHintBadge();
        
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
          
        console.log("未クリア(DTW)モード: 他人クリア件数=" + othersClears.length);
        const bestLog = findBestHintLog(othersClears, myLatestEvents, stageId);
        if (!bestLog.events || bestLog.events.length === 0) return;
        let score = Math.round(bestLog._calculatedDistanceScore || 0);
        
        addLog(`【お手本再生】${bestLog.nickname || '誰か'}さんのクリアの動きを再生します`, "info");
        currentTargetHintLogId = bestLog.id;
        currentTargetHintEvents = bestLog.events;
        lastViewedHint = "お手本再生";
        await saveHintViewLog("new_search", currentTargetHintLogId, score);
        updateHintBadge();
        isRunning = true;
        await engine.playGhost(bestLog.events);
        isRunning = false;
      }
    } catch (e) {
      console.error(e);
    } finally {
      isRunning = false;
      btnShowHint.disabled = false;
      if (typeof updateHintButtonsUI === 'function') {
        updateHintButtonsUI(!!currentTargetHintLogId);
      }
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
          
        const hintTypeStr = !myClearSnapshot.empty ? "別解再生" : "お手本再生";
        
        let hintNickname = "誰か";
        if (currentTargetHintLogId) {
          const doc = await db.collection('logs').doc(currentTargetHintLogId).get();
          if (doc.exists && doc.data().nickname) {
            hintNickname = doc.data().nickname;
          }
        }
        
        lastViewedHint = hintTypeStr;
        if (typeof updateHintBadge === 'function') updateHintBadge();
        addLog(`【${hintTypeStr}】さっきの${hintNickname}さんの動きをもう一度再生します`, "info");
        await saveHintViewLog("replay", currentTargetHintLogId, null);
          
        let eventsToPlay = currentTargetHintEvents;
        // if (myClearSnapshot.empty && mySnapshot.empty) {
        //   let grabIndex = currentTargetHintEvents.findIndex(evt => evt.message && evt.message.startsWith("掴む"));
        //   eventsToPlay = grabIndex >= 0 ? currentTargetHintEvents.slice(0, grabIndex + 1) : currentTargetHintEvents;
        // }
        
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
  if (!isNaN(stageNum) && (stageNum >= 1 && stageNum <= 3)) { wArm = 0.0; }
  if (!isNaN(stageNum) && (stageNum === 7 || stageNum === 8)) { wLeg = 0.2; }
  
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
  
  // ステージ1・2はヒヨコなし、ステージ5・6は靴があるため重みを調整
  const stageNum = parseInt(stageId.replace('stage', ''), 10);
  if (!isNaN(stageNum) && (stageNum >= 1 && stageNum <= 3)) {
    wArm = 0.0;
  }
  if (!isNaN(stageNum) && (stageNum === 7 || stageNum === 8)) {
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
      
      currentLogSession.goalResult = goalResult;
    } else {
      currentLogSession.goalResult = "手動中断";
    }
  } catch (error) {
    if (error.message !== "STOP") {
      addLog(`エラー: ${error.message}`, "error");
      currentLogSession.goalResult = error.message;
    } else {
      currentLogSession.goalResult = "手動中断";
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
      if (currentLogSession.stageId === "stage10") {
        currentLogSession.testCase = engine.currentTestCase;
      }
      
      currentLogSession.hintViewed = lastViewedHint;
      currentLogSession.targetHintLogId = currentTargetHintLogId;
      
      if (currentTargetHintEvents && currentLogSession.events.length > 0) {
        currentLogSession.distanceToTargetHint = calculateDTWScore(currentLogSession.events, currentTargetHintEvents, engine.currentStageId);
      } else {
        currentLogSession.distanceToTargetHint = null;
      }
      
      // 何も動かずに即座に中断された空ログはDB容量と分析ノイズ削減のため保存しない
      if (currentLogSession.goalResult === "手動中断" && currentLogSession.events.length === 0) {
        currentLogSession = null;
        return;
      }

      const isTutorialRun = currentLogSession.stageId === "stage0" || (currentLogSession.stageId && currentLogSession.stageId.startsWith("tut"));
      if (!isTutorialRun) {
        logCount++;
        localStorage.setItem("pictgramming_log_count", logCount);
        const customDocId = `${userId}_log${logCount}`;
        db.collection('logs').doc(customDocId).set(currentLogSession)
          .then(() => {
             console.log(`Log saved to Firebase with ID: ${customDocId}`);
             if (typeof checkHintLock === 'function') checkHintLock();
          })
          .catch(e => console.error("Firebase log upload failed", e));
      } else {
        if (typeof checkHintLock === 'function') checkHintLock();
      }
        
      currentLogSession = null;
      
      if (finalGoalResult === "ゴールした" && !isTutorialRun) {
        updateStageLocks(true);
        const clearOverlay = document.getElementById("clear-overlay");
        const isStage8 = stageSelect && stageSelect.value === "stage10";
        
        if (isStage8) {
          stage8ClearedCases.add(engine.currentTestCase);
          updateStage8ButtonsUI();

          if (stage8ClearedCases.size < 2) {
            const currentName = engine.currentTestCase === 0 ? "パターン1" : "パターン2";
            const nextCase = engine.currentTestCase === 0 ? 1 : 0;
            const nextName = nextCase === 0 ? "パターン1" : "パターン2";
            addLog(`【判定】${currentName} クリア！`, "success");
            addLog(`表示エリア右上の「${nextName}」ボタンに切り替えて、同じプログラムでもう一方のパターンもクリアできるか確認しよう！`, "info");
          } else {
            addLog(`【判定】お見事！パターン1とパターン2の両方をクリアしました！条件分岐が完璧に書けています！`, "success");
            if (clearOverlay) {
              const btnNext = document.getElementById("btn-next-stage");
              if (btnNext) {
                btnNext.textContent = "🎉 全ステージクリア！";
                btnNext.disabled = true;
                btnNext.style.background = "#10b981";
              }
              clearOverlay.hidden = false;
            }
          }
        } else {
          if (clearOverlay) {
            const btnNext = document.getElementById("btn-next-stage");
            if (btnNext) {
              btnNext.textContent = "次のステージへ進む ▶";
              btnNext.disabled = false;
              btnNext.style.background = "#2563eb";
            }
            clearOverlay.hidden = false;
          }
        }
      }
    }
    
    // チュートリアルの進行チェック
    if (tutorialAdvanceCheck) tutorialAdvanceCheck();
  }
}

// クリアオーバーレイのボタン処理
const btnNextStage = document.getElementById("btn-next-stage");
const btnCloseClear = document.getElementById("btn-close-clear");
if (btnNextStage) {
  btnNextStage.addEventListener("click", () => {
    const clearOverlay = document.getElementById("clear-overlay");
    if (clearOverlay) clearOverlay.hidden = true;
    if (!stageSelect) return;
    const curIdx = stageSelect.selectedIndex;
    if (curIdx < stageSelect.options.length - 1) {
      stageSelect.selectedIndex = curIdx + 1;
      stageSelect.dispatchEvent(new Event("change"));
    }
  });
}
if (btnCloseClear) {
  btnCloseClear.addEventListener("click", () => {
    const clearOverlay = document.getElementById("clear-overlay");
    if (clearOverlay) clearOverlay.hidden = true;
  });
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
              <div class="history-goal" style="font-weight:600; color:${log.goalResult === 'ゴールした' ? '#16a34a' : '#dc2626'};">判定: ${log.goalResult || log.status || '不明'}</div>
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

function transpileToJava(javaCode) {
  let jsCode = javaCode;
  
  // Replace variable types
  jsCode = jsCode.replace(/\b(?:int|double|float|boolean|String)\b\s+/g, 'let ');

  // Replace Japanese control structures
  jsCode = jsCode.replace(/繰り返し\s*\(\s*(\d+)\s*回\s*\)\s*\{/g, 'for (let _i = 0; _i < $1; _i++) {');
  jsCode = jsCode.replace(/もし\s*\(([\s\S]*?)\)\s*\{/g, 'if ($1) {');
  jsCode = jsCode.replace(/\}\s*そうでなければ\s*\{/g, '} else {');
  
  // Inject yield into loops to prevent freezing
  jsCode = jsCode.replace(/\b(for|while)\s*\(([\s\S]*?)\)\s*\{/g, '$1($2) { await picto.yield(); ');
  
  // Support unquoted target names inside 近くにいる / 近くにいない / 向く (e.g. 近くにいる(爆弾) -> 近くにいる("爆弾"))
  jsCode = jsCode.replace(/(近くにいる|近くにいない|向く|回転)\s*\(\s*(ヒヨコ|爆弾|靴|ゴール)\s*\)/g, '$1("$2")');

  // Replace command keywords to await picto.method
  jsCode = jsCode.replace(/(移動|向く|回転|部位回転|掴む|離す|靴を履く|靴を脱ぐ|履く|脱ぐ|右足で履く|左足で履く|右足で脱ぐ|左足で脱ぐ|近くにいない|近くにいる|地点にいない|地点にいる|ヒヨコの近くにいない|ヒヨコの近くにいる|爆弾の近くにいない|爆弾の近くにいる|靴の近くにいない|靴の近くにいる|ヒヨコを持っている)\s*\(/g, 'await picto.$1(');
  
  return jsCode;
}

function createPictoContext() {
  const checkStop = () => { if (shouldStop) throw new Error("STOP"); };
  let loopSteps = 0;

  return {
    移動: async (val) => {
      checkStop();
      if (typeof val !== "number" || !Number.isFinite(val)) throw new Error("移動の引数は数字である必要があります");
      addLog(`移動(${val});`);
      await engine.animateMove(val);
    },
    向く: async (target) => {
      checkStop();
      if (typeof target === "number" && Number.isFinite(target)) {
        addLog(`向く(${target});`);
        await engine.animateFace(target);
      } else if (typeof target === "string") {
        const label = target.trim();
        addLog(`向く("${label}");`);
        await engine.animateFace(label);
      } else {
        throw new Error("向くの引数は地点名(\"A\"など)または角度(数字)である必要があります");
      }
    },
    回転: async (val) => {
      checkStop();
      if (typeof val === "string") {
        const label = val.trim();
        addLog(`向く("${label}");`);
        await engine.animateFace(label);
        return;
      }
      if (typeof val !== "number" || !Number.isFinite(val)) throw new Error("回転の引数は数字である必要があります");
      addLog(`向く(${val});`);
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
      await new Promise(r => setTimeout(r, 100));
    },
    "離す": async function() {
      checkStop();
      addLog("離す();");
      engine.releaseItem();
      await new Promise(r => setTimeout(r, 100));
    },
    "靴を履く": async function() {
      checkStop();
      addLog("靴を履く();");
      engine.equipShoe();
      await new Promise(r => setTimeout(r, 100));
    },
    "履く": async function() {
      checkStop();
      addLog("靴を履く();");
      engine.equipShoe();
      await new Promise(r => setTimeout(r, 100));
    },
    "靴を脱ぐ": async function() {
      checkStop();
      addLog("靴を脱ぐ();");
      engine.unequipShoe();
      await new Promise(r => setTimeout(r, 100));
    },
    "脱ぐ": async function() {
      checkStop();
      addLog("靴を脱ぐ();");
      engine.unequipShoe();
      await new Promise(r => setTimeout(r, 100));
    },
    "右足で履く": async function() {
      checkStop();
      addLog("靴を履く();");
      engine.equipShoe();
      await new Promise(r => setTimeout(r, 100));
    },
    "左足で履く": async function() {
      checkStop();
      addLog("靴を履く();");
      engine.equipShoe();
      await new Promise(r => setTimeout(r, 100));
    },
    "右足で脱ぐ": async function() {
      checkStop();
      addLog("靴を脱ぐ();");
      engine.unequipShoe();
      await new Promise(r => setTimeout(r, 100));
    },
    "左足で脱ぐ": async function() {
      checkStop();
      addLog("靴を脱ぐ();");
      engine.unequipShoe();
      await new Promise(r => setTimeout(r, 100));
    },
    "近くにいる": async function(label) {
      checkStop();
      return engine.isNearTarget(label);
    },
    "近くにいない": async function(label) {
      checkStop();
      return !engine.isNearTarget(label);
    },
    "地点にいる": async function(label) {
      checkStop();
      return engine.isNearTarget(label);
    },
    "地点にいない": async function(label) {
      checkStop();
      return !engine.isNearTarget(label);
    },
    "ヒヨコの近くにいる": async function() {
      checkStop();
      return engine.isNearItem();
    },
    "ヒヨコの近くにいない": async function() {
      checkStop();
      return !engine.isNearItem();
    },
    "爆弾の近くにいる": async function() {
      checkStop();
      return engine.isNearTarget("爆弾");
    },
    "爆弾の近くにいない": async function() {
      checkStop();
      return !engine.isNearTarget("爆弾");
    },
    "靴の近くにいる": async function() {
      checkStop();
      return engine.isNearTarget("靴");
    },
    "靴の近くにいない": async function() {
      checkStop();
      return !engine.isNearTarget("靴");
    },
    "ヒヨコを持っている": async function() {
      checkStop();
      const items = engine.state.items || (engine.state.item ? [engine.state.item] : []);
      return items.some(it => it && it.attachedTo !== null);
    },
    yield: async function() {
      if (shouldStop) throw new Error("STOP");
      loopSteps++;
      if (loopSteps > 250) {
        throw new Error("繰り返しが多すぎるため自動停止しました（条件や向きを確認してください）");
      }
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
    const parts = (engine.state && engine.state.parts) ? engine.state.parts : {};
    currentLogSession.events.push({ 
      type, 
      message,
      x: Math.round(engine.state.x),
      y: Math.round(engine.state.y),
      direction: Math.round(engine.state.direction),
      leftArm: parts.leftArm ? parts.leftArm.rotation : 0,
      rightArm: parts.rightArm ? parts.rightArm.rotation : 0,
      leftElbow: parts.leftElbow ? parts.leftElbow.rotation : 0,
      rightElbow: parts.rightElbow ? parts.rightElbow.rotation : 0,
      leftLeg: parts.leftLeg ? parts.leftLeg.rotation : 0,
      rightLeg: parts.rightLeg ? parts.rightLeg.rotation : 0,
      leftKnee: parts.leftKnee ? parts.leftKnee.rotation : 0,
      rightKnee: parts.rightKnee ? parts.rightKnee.rotation : 0
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
  
  const stageTitles = {
    stage0: "ステージ0: チュートリアル",
    stage1: "ステージ1: 移動と方向転換① (基本)",
    stage2: "ステージ2: 移動と方向転換② (曲がり角)",
    stage3: "ステージ3: 移動と方向転換③ (壁の迂回)",
    stage4: "ステージ4: ヒヨコを運ぼう① (掴んで運ぶ)",
    stage5: "ステージ5: ヒヨコを運ぼう② (whileで移動)",
    stage6: "ステージ6: ヒヨコを運ぼう③ (複数ルート)",
    stage7: "ステージ7: 靴と針山① (縦の針山)",
    stage8: "ステージ8: 靴と針山② (横の針山)",
    stage9: "ステージ9: 3羽のヒヨコを運ぼう (繰り返し)",
    stage10: "ステージ10: ヒヨコを探そう (条件分岐)"
  };

  try {
    // テスト・確認しやすいよう全8ステージを解放状態で表示
    for (let i = 0; i < options.length; i++) {
      const val = options[i].value;
      options[i].disabled = false;
      if (stageTitles[val]) {
        options[i].text = stageTitles[val];
      }
      if (val === "stage0") {
        options[i].hidden = true;
      }
    }
    
    updateShoeUI();
    updateStage8TestUI(stageSelect ? stageSelect.value : "stage1");
    if (typeof checkHintLock === 'function') checkHintLock();
    if (!skipReload && stageSelect && typeof engine !== 'undefined') {
      engine.loadStage(stageSelect.value);
    }
  } catch (e) {
    console.error("ステージロック状況の取得に失敗しました", e);
  }
}

// ページロード時の初期設定：デフォルトでステージ1を選択
if (stageSelect && stageSelect.value === 'stage0') {
  stageSelect.value = 'stage1';
}

// ページ読み込み時にロック状況を更新
updateStageLocks();
setStarterCodeForStage(stageSelect ? stageSelect.value : "stage1");
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
      setStarterCodeForStage("stage1");
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

// --- 5段階インタラクティブ・チュートリアル制御（tut1, tut4, tut7, tut9, tut10） ---
const TUTORIAL_BOUNDARY_STAGES = new Set(["stage1", "stage4", "stage7", "stage9", "stage10"]);
let tutorialReturnStageId = "stage1";
let tutorialSavedCode = null;

function getTutorialKeyForStage(stageId) {
  if (stageId === "stage1" || stageId === "stage2" || stageId === "stage3" || stageId === "tut1") return "tut1";
  if (stageId === "stage4" || stageId === "stage5" || stageId === "stage6" || stageId === "tut4") return "tut4";
  if (stageId === "stage7" || stageId === "stage8" || stageId === "tut7") return "tut7";
  if (stageId === "stage9" || stageId === "tut9") return "tut9";
  if (stageId === "stage10" || stageId === "tut10") return "tut10";
  return "tut1";
}

function closeTutorialOverlayOnly() {
  const overlay = document.getElementById('tutorial-wrapper');
  if (window.tutorialOnTopElements) {
    window.tutorialOnTopElements.forEach(el => el.classList.remove('tutorial-on-top'));
    window.tutorialOnTopElements = null;
  }
  if (overlay) overlay.hidden = true;
  tutorialAdvanceCheck = null;
}

function buildTutorialSteps(tutKey) {
  if (tutKey === "tut1") {
    return [
      {
        target: 'java-editor',
        pos: 'left',
        text: 'ピクトグラミングへようこそ！\nここでは簡単な文を書いて、画面のピクトグラムを GOAL まで動かす練習をします。（※本番のステージとは配置が違う練習用ステージです）'
      },
      {
        target: 'java-editor',
        onTopElements: ['#btn-run', '.stage-frame'],
        pos: 'left',
        text: 'ピクトグラムは「矢印の向き」へ進みます。\nまずは「移動(270);」で上へ進んでみましょう！右上の【実行】ボタンを押してみてください。',
        codeToAdd: '移動(270);',
        replaceCode: true,
        waitForRun: true,
        checkCondition: () => engine.state.y < (engine.canvas.height / 2)
      },
      {
        target: 'java-editor',
        onTopElements: ['#btn-run', '.stage-frame'],
        pos: 'left',
        text: '上に進みましたね！次は左にある GOAL に向かうため、「向く(-90);」で左へ90度向きを変え、「移動(200);」で進みます。\nもう一度【実行】ボタンを押してください！',
        codeToAdd: '向く(-90);\n移動(200);',
        keyword: '向く(-90)',
        waitForRun: true,
        checkCondition: () => engine.evaluateGoalStatus() === "ゴールした"
      },
      {
        target: 'stage-goal-banner',
        pos: 'bottom',
        text: 'お見事、練習ステージの GOAL に到着しました！\n各ステージのクリア条件は、いつもここの「🎯 目標」に書かれています。'
      },
      {
        target: 'btn-show-hint',
        pos: 'bottom',
        text: 'もし途中で解き方に迷ったら、自分で1回以上【実行】したあとに「💡 ヒントを見る」を押すと、他の人の動きをヒントとして見ることができます。\nそれでは本番のステージへ進みましょう！'
      }
    ];
  }

  if (tutKey === "tut4") {
    return [
      {
        target: 'java-editor',
        pos: 'left',
        text: 'ステージ4〜6からは「ヒヨコ」が登場します！\nヒヨコを掴んで GOAL の中まで運び、そこで離すとクリアになります。（※練習用の配置で試してみましょう）'
      },
      {
        target: 'java-editor',
        onTopElements: ['#btn-run', '.stage-frame'],
        pos: 'left',
        text: '「向く("B");」と「while (近くにいない("B")) { 移動(30); }」でB地点まで歩き、「部位回転("右腕", -60);」で右腕を振ってヒヨコを掴みます！\n【実行】ボタンを押して動きを見てみましょう！',
        codeToAdd: '// B地点まで歩いて右腕でヒヨコを掴む\n向く("B");\nwhile (近くにいない("B")) {\n  移動(30);\n}\n部位回転("右腕", -60);',
        replaceCode: true,
        waitForRun: true,
        checkCondition: () => engine.state.hasGrabbedItem
      },
      {
        target: 'java-editor',
        onTopElements: ['#btn-run', '.stage-frame'],
        pos: 'left',
        text: '右腕がヒヨコに触れてキャッチできました！\n続けてD地点にある GOAL まで歩き、「離す();」でヒヨコを GOAL の中に置きましょう。【実行】ボタンを押してください！',
        codeToAdd: '// ゴールまで運んで離す\n向く("D");\nwhile (近くにいない("ゴール")) {\n  移動(30);\n}\n離す();',
        keyword: '離す()',
        waitForRun: true,
        checkCondition: () => engine.evaluateGoalStatus() === "ゴールした"
      },
      {
        target: 'java-editor',
        pos: 'left',
        text: 'バッチリです！\n「向く("地点名")」「while (近くにいない(...))」「部位回転」「離す()」を組み合わせて、本番のステージでもヒヨコを GOAL まで運んでみましょう！'
      }
    ];
  }

  if (tutKey === "tut7") {
    return [
      {
        target: 'java-editor',
        onTopElements: ['#btn-run', '.stage-frame'],
        pos: 'left',
        text: 'ステージ7・8では、赤い「針山」と「靴」が登場します！\nまずは靴を履かずに針山へ進むとどうなるか、【実行】ボタンを押して確かめてみましょう。',
        codeToAdd: '// 靴を履かずにそのまま進むと…？\n移動(240);',
        replaceCode: true,
        waitForRun: true,
        checkCondition: () => log.textContent.includes('針山に触れてしまった')
      },
      {
        target: 'java-editor',
        onTopElements: ['#btn-run', '.stage-frame'],
        pos: 'left',
        text: '靴を履いていないと「針山に触れてしまった！」とエラーになってしまいます。\n今度は靴の近くまで歩いて「部位回転("右足", -60);」で足を回し、靴を履いてから針山を越えてみましょう！【実行】ボタンを押してください。',
        codeToAdd: '// 靴の近くで右足を回して履き、針山を越えてゴールへ！\n移動(120);\n部位回転("右足", -60);\n移動(220);',
        replaceCode: true,
        waitForRun: true,
        checkCondition: () => engine.evaluateGoalStatus() === "ゴールした"
      },
      {
        target: 'java-editor',
        pos: 'left',
        text: '靴を履いたことで、赤い針山の上を安全に通り抜けられました！\n本番のステージには靴が2足あります。「2足すべての靴」を履いてから針山を渡りましょう！'
      }
    ];
  }

  if (tutKey === "tut9") {
    return [
      {
        target: 'java-editor',
        onTopElements: ['#btn-run', '.stage-frame'],
        pos: 'left',
        text: 'ステージ9では、複数のヒヨコを GOAL へ運びます。\nピクトグラムが一度に持てるヒヨコは「1羽だけ」です。まずは1往復するプログラムを【実行】して結果を見てみましょう！',
        codeToAdd: '// まずは1羽だけ運んでみる\n向く("B");\nwhile (近くにいない("B")) {\n  移動(30);\n}\n部位回転("右腕", -60);\n向く("E");\nwhile (近くにいない("ゴール")) {\n  移動(30);\n}\n離す();',
        replaceCode: true,
        waitForRun: true,
        checkCondition: () => log.textContent.includes('足りません')
      },
      {
        target: 'java-editor',
        onTopElements: ['#btn-run', '.stage-frame'],
        pos: 'left',
        text: '1羽運べましたが、まだ巣にヒヨコが残っていますね。\n同じ往復の動きを何度も書く代わりに「繰り返し(2回) { ... }」で囲み、最後に上げた右腕を元に戻す「部位回転("右腕", 60);」を入れて【実行】してみましょう！',
        codeToAdd: '// 「繰り返し」で往復してすべてのヒヨコを運ぶ\n繰り返し(2回) {\n  向く("B");\n  while (近くにいない("B")) {\n    移動(30);\n  }\n  部位回転("右腕", -60);\n  向く("E");\n  while (近くにいない("ゴール")) {\n    移動(30);\n  }\n  離す();\n  部位回転("右腕", 60);\n}',
        replaceCode: true,
        waitForRun: true,
        checkCondition: () => engine.evaluateGoalStatus() === "ゴールした"
      },
      {
        target: 'java-editor',
        pos: 'left',
        text: '「繰り返し」を使うことで、短いプログラムで何往復もヒヨコを運ぶことができました！\n本番のステージ9では「繰り返し(3回) { ... }」を使って3羽のヒヨコを GOAL まで運びましょう！'
      }
    ];
  }

  // tut10: ステージ10用（爆弾と条件分岐）
  return [
    {
      target: 'java-editor',
      onTopElements: ['#btn-run', '.stage-frame'],
      pos: 'left',
      text: 'ステージ10では「爆弾」が登場します！\n近くを歩くだけなら大丈夫ですが、爆弾の上で腕を回して「爆弾を掴む」と爆発してゲームオーバーになります。まずは【実行】ボタンを押して確かめてみましょう！',
      codeToAdd: '// 確かめずにB地点で右腕を回すと…？\n向く("B");\nwhile (近くにいない("B")) {\n  移動(30);\n}\n部位回転("右腕", -60);',
      replaceCode: true,
      waitForRun: true,
      checkCondition: () => log.textContent.includes('爆弾を掴んでしまった')
    },
    {
      target: 'java-editor',
      onTopElements: ['#btn-run', '.stage-frame'],
      pos: 'left',
      text: '💥 爆弾を掴んでしまいゲームオーバーになりました！\nそこで「もし (近くにいる("ヒヨコ")) { ... } そうでなければ { ... }」を使います。B地点にヒヨコがいなければ腕を回さずE地点へ向かうプログラムを【実行】してみましょう！',
      codeToAdd: '// 「もし」でヒヨコがいるか確かめてから腕を回す\n向く("B");\nwhile (近くにいない("B")) {\n  移動(30);\n}\nもし (近くにいる("ヒヨコ")) {\n  部位回転("右腕", -60);\n} そうでなければ {\n  向く("E");\n  while (近くにいない("E")) {\n    移動(30);\n  }\n  部位回転("右腕", -60);\n}\n向く("D");\nwhile (近くにいない("ゴール")) {\n  移動(30);\n}\n離す();',
      replaceCode: true,
      waitForRun: true,
      checkCondition: () => engine.evaluateGoalStatus() === "ゴールした"
    },
    {
      target: 'stage8-test-selector',
      pos: 'bottom',
      text: 'お見事！爆弾を避けてヒヨコだけを GOAL に運べました！\n本番のステージ10では、右上の「パターン1」「パターン2」を切り替えて、ヒヨコと爆弾の位置が入れ替わっても同じプログラムで両方クリアできるか挑戦しましょう！'
    }
  ];
}

function startTutorialForStage(targetStageId, force = false) {
  const mainStageId = (targetStageId && !targetStageId.startsWith("tut") && targetStageId !== "stage0")
    ? targetStageId
    : (stageSelect && !stageSelect.value.startsWith("tut") && stageSelect.value !== "stage0" ? stageSelect.value : "stage1");
  const tutKey = getTutorialKeyForStage(mainStageId);
  const storageKey = 'pict_tut_done_' + tutKey;

  if (!force && localStorage.getItem(storageKey)) {
    return;
  }

  const overlay = document.getElementById('tutorial-wrapper');
  const highlight = document.getElementById('tutorial-highlight');
  const bubble = document.getElementById('tutorial-bubble');
  const text = document.getElementById('tutorial-text');
  const nextBtn = document.getElementById('btn-tutorial-next');
  if (!overlay || !highlight || !bubble || !text || !nextBtn) return;

  // 現在実行中なら停止
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
  }

  // すでにチュートリアル中でなければ、戻るべきステージと現在のコードを退避
  if (overlay.hidden) {
    tutorialReturnStageId = mainStageId;
    tutorialSavedCode = editor ? editor.value : "";
  }

  const steps = buildTutorialSteps(tutKey);
  let currentStep = 0;

  function finishTutorial() {
    closeTutorialOverlayOnly();
    localStorage.setItem(storageKey, 'true');
    localStorage.setItem('tutorialCompleted', 'true');

    if (stageSelect) {
      stageSelect.value = tutorialReturnStageId;
    }
    engine.loadStage(tutorialReturnStageId);
    clearOutput();
    updateShoeUI();
    updateStage8TestUI(tutorialReturnStageId);
    if (typeof checkHintLock === 'function') checkHintLock();

    if (editor) {
      if (tutorialSavedCode !== null && tutorialSavedCode.trim() !== "") {
        editor.value = tutorialSavedCode;
      } else {
        setStarterCodeForStage(tutorialReturnStageId);
      }
    }
    tutorialSavedCode = null;
  }

  function showStep(index) {
    if (index >= steps.length) {
      finishTutorial();
      return;
    }

    const step = steps[index];
    let el = step.target === 'snippet-toolbar'
      ? document.querySelector('.snippet-toolbar')
      : document.getElementById(step.target);
    if (!el) {
      showStep(index + 1);
      return;
    }

    const rect = el.getBoundingClientRect();
    const pad = 10;

    highlight.style.top = (rect.top - pad) + 'px';
    highlight.style.left = (rect.left - pad) + 'px';
    highlight.style.width = (rect.width + pad * 2) + 'px';
    highlight.style.height = (rect.height + pad * 2) + 'px';

    text.style.whiteSpace = 'pre-line';
    text.textContent = step.text;
    bubble.className = 'tutorial-bubble ' + step.pos;

    if (window.tutorialOnTopElements) {
      window.tutorialOnTopElements.forEach(elItem => elItem.classList.remove('tutorial-on-top'));
      window.tutorialOnTopElements = null;
    }

    if (step.onTopElements) {
      window.tutorialOnTopElements = [];
      step.onTopElements.forEach(selector => {
        const topEl = document.querySelector(selector);
        if (topEl) {
          topEl.classList.add('tutorial-on-top');
          window.tutorialOnTopElements.push(topEl);
        }
      });
    }

    if (step.waitForRun) {
      nextBtn.style.display = 'none';
      if (step.codeToAdd !== undefined) {
        if (step.replaceCode) {
          clearOutput();
          editor.value = step.codeToAdd;
        } else {
          const hasCode = step.keyword
            ? editor.value.includes(step.keyword)
            : editor.value.replace(/\r\n/g, '\n').includes(step.codeToAdd.replace(/\r\n/g, '\n'));
          if (!hasCode) {
            if (editor.value.trim() === '') {
              editor.value = step.codeToAdd;
            } else {
              editor.value = editor.value.trim() + '\n' + step.codeToAdd;
            }
          }
        }
      }
    } else {
      nextBtn.style.display = 'block';
      nextBtn.textContent = (index === steps.length - 1) ? 'ステージへ進む ▶' : '次へ';
    }

    setTimeout(() => {
      if (step.pos === 'right') {
        bubble.style.top = Math.max(16, rect.top + 20) + 'px';
        bubble.style.left = (rect.right + pad + 20) + 'px';
      } else if (step.pos === 'left') {
        bubble.style.top = Math.max(16, rect.top + 20) + 'px';
        bubble.style.left = Math.max(16, rect.left - bubble.offsetWidth - pad - 20) + 'px';
      } else if (step.pos === 'top') {
        bubble.style.top = Math.max(16, rect.top - bubble.offsetHeight - pad - 20) + 'px';
        bubble.style.left = Math.max(16, rect.left) + 'px';
      } else if (step.pos === 'bottom') {
        bubble.style.top = (rect.bottom + pad + 20) + 'px';
        if (rect.left + bubble.offsetWidth > window.innerWidth) {
          bubble.style.left = Math.max(16, window.innerWidth - bubble.offsetWidth - 20) + 'px';
        } else {
          bubble.style.left = Math.max(16, rect.left) + 'px';
        }
      }
    }, 10);
  }

  tutorialAdvanceCheck = () => {
    if (overlay.hidden) return;
    const step = steps[currentStep];
    if (step && step.waitForRun && step.checkCondition) {
      setTimeout(() => {
        if (!overlay.hidden && step.checkCondition()) {
          currentStep++;
          showStep(currentStep);
        }
      }, 900);
    }
  };

  // 専用疑似ステージ（tut1 / tut4 / tut7 / tut9 / tut10）をロード
  engine.loadStage(tutKey);
  clearOutput();
  updateShoeUI();
  updateStage8TestUI(tutKey);
  if (typeof checkHintLock === 'function') checkHintLock();

  if (editor) {
    editor.value = "";
  }

  overlay.hidden = false;
  setTimeout(() => { showStep(0); }, 200);

  nextBtn.onclick = () => {
    currentStep++;
    showStep(currentStep);
  };

  const skipBtn = document.getElementById('btn-tutorial-skip');
  if (skipBtn) {
    skipBtn.onclick = () => {
      finishTutorial();
    };
  }
}

function maybeStartAutoTutorial(stageId) {
  if (!TUTORIAL_BOUNDARY_STAGES.has(stageId)) return;
  const tutKey = getTutorialKeyForStage(stageId);
  if (!localStorage.getItem('pict_tut_done_' + tutKey)) {
    startTutorialForStage(stageId, false);
  }
}

// 初回アクセス時（ステージ1などを初めて開いたとき）に該当チュートリアルを自動表示
setTimeout(() => {
  const initialStage = stageSelect ? stageSelect.value : "stage1";
  maybeStartAutoTutorial(initialStage);
}, 400);

// ヘッダーの「チュートリアル」ボタンを押したときは現在のステージ区分に応じたチュートリアルを表示
const btnStartTutorial = document.getElementById("btn-start-tutorial");
if (btnStartTutorial) {
  btnStartTutorial.addEventListener("click", () => {
    const curStage = stageSelect ? stageSelect.value : "stage1";
    startTutorialForStage(curStage, true);
  });
}
