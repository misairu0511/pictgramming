const canvas = document.getElementById("stage-canvas");
const editor = document.getElementById("java-editor");
const STAGE_STARTER_CODES = {
  stage1: `// 「実行」ボタンを押してみましょう\n向く(90);\n移動(480);\n`,
  stage2: `// 前に進みます\n移動(150);\n`,
  stage3: `// 壁を避けて GOAL まで進みます\n`,
  stage4: `// ヒヨコを掴みます\n向く(90);\n移動(180);\n部位回転("右腕", -60);\n`,
  stage5: `// B地点の近くまで進みます\n向く("B");\nwhile (近くにいない("B")) {\n  移動(30);\n}\n`,
  stage6: ``,
  stage7: `// 2足の靴を両方履いてから針山を越え、ヒヨコを GOAL まで運びます\n`,
  stage8: ``,
  stage9: `// 「繰り返し」を使って3羽のヒヨコを運びます\n繰り返し(3回) {\n  \n}\n`,
  stage10: `// A地点またはF地点を調べて、爆弾を避けてヒヨコを GOAL まで運びます\n`
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

// localStorage がブラウザ設定や大学アカウントのポリシーでブロックされてもクラッシュしない安全ラッパー
const _memoryStorage = {};
function safeGetStorage(key) {
  try {
    return window.localStorage ? window.localStorage.getItem(key) : (_memoryStorage[key] || null);
  } catch (e) {
    console.warn("localStorage.getItem blocked:", e);
    return _memoryStorage[key] || null;
  }
}
function safeSetStorage(key, val) {
  _memoryStorage[key] = String(val);
  try {
    if (window.localStorage) window.localStorage.setItem(key, String(val));
  } catch (e) {
    console.warn("localStorage.setItem blocked:", e);
  }
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
let db = null;
try {
  if (typeof firebase !== "undefined") {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
  }
} catch (e) {
  console.error("Firebase initialization failed:", e);
}
if (!db) {
  // Firebase が拡張機能やアカウント制限でブロックされた場合でも画面操作・実行・チュートリアルが止まらないようダミーを用意
  const dummyQuery = {
    where: () => dummyQuery,
    limit: () => dummyQuery,
    get: async () => ({ empty: true, forEach: () => {} }),
    add: async () => ({}),
    doc: () => ({
      get: async () => ({ exists: false, data: () => ({}) }),
      set: async () => ({})
    })
  };
  db = {
    collection: () => dummyQuery,
    batch: () => ({ delete: () => {}, commit: async () => {} })
  };
}

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
    goal: "🎯 目標：爆弾に触れないようヒヨコを GOAL まで運ぼう（実行するとパターン1→パターン2の順にテストされます）"
  },
  tut1: {
    title: "📘 チュートリアル①：移動と方向転換（ステージ1〜3）",
    goal: "🎯 練習：矢印の向きへ進み、途中で向きを変えて左上の GOAL へ進みましょう"
  },
  tut4: {
    title: "📘 チュートリアル②：ヒヨコを掴んで運ぶ（ステージ4〜6）",
    goal: "🎯 練習：ヒヨコの近くまで進んで掴み（部位回転 または 掴む）、GOAL の中で離しましょう"
  },
  tut7: {
    title: "📘 チュートリアル③：靴と針山（ステージ7〜8）",
    goal: "🎯 練習：靴を履いて（部位回転 または 靴を履く／履く）、赤い針山を越えて GOAL へ進みましょう"
  },
  tut9: {
    title: "📘 チュートリアル④：複数のヒヨコと「繰り返し」（ステージ9）",
    goal: "🎯 練習：「繰り返し」を使って、B地点の巣からヒヨコを1羽ずつ GOAL へ運びましょう"
  },
  tut10: {
    title: "📘 チュートリアル⑤：爆弾と「もし〜そうでなければ」（ステージ10）",
    goal: "🎯 練習：爆弾を掴まないよう「もし」でヒヨコを確かめて GOAL へ運びましょう"
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

function normalizeCodeForHintCheck(str) {
  return (str || "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, "");
}

function isModifiedExecutionLog(logData, stageId) {
  if (!logData || logData.eventType === "hint_view") return false;
  if (logData.goalResult === "ゴールした") return true;

  const starterNorm = normalizeCodeForHintCheck(STAGE_STARTER_CODES[stageId] || "");
  const currentNorm = normalizeCodeForHintCheck(logData.sourceCode || "");

  // 初期コードから実質的なコード変更（コメント・空白を除く）がない場合は不可
  if (!currentNorm || currentNorm === starterNorm) return false;

  // 少なくとも1つ以上の動作コマンドが実際に実行されていることを確認（構文エラーのみや空ループを除外）
  const events = Array.isArray(logData.events) ? logData.events : [];
  const hasActionEvent = events.some(ev => {
    const msg = ev && ev.message ? ev.message : "";
    return (
      msg.startsWith("移動") ||
      msg.startsWith("向く") ||
      msg.startsWith("回転") ||
      msg.startsWith("部位回転") ||
      msg.startsWith("掴む") ||
      msg.startsWith("離す") ||
      msg.startsWith("靴")
    );
  });
  return hasActionEvent;
}

let isHintLocked = true;
let hintPopoverTimer = null;

function showHintLockPopover() {
  const popover = document.getElementById("hint-lock-popover");
  if (!popover) return;
  popover.hidden = false;
  if (hintPopoverTimer) clearTimeout(hintPopoverTimer);
  hintPopoverTimer = setTimeout(() => {
    popover.hidden = true;
  }, 3200);
}

function hideHintLockPopover() {
  const popover = document.getElementById("hint-lock-popover");
  if (popover) popover.hidden = true;
  if (hintPopoverTimer) {
    clearTimeout(hintPopoverTimer);
    hintPopoverTimer = null;
  }
}

async function checkHintLock() {
  if (!btnShowHint) return;
  const stageId = stageSelect ? stageSelect.value : "stage1";
  const activeId = (typeof engine !== "undefined" && engine.currentStageId) ? engine.currentStageId : stageId;
  
  if (stageId === "stage0" || activeId.startsWith("tut")) {
    isHintLocked = true;
    btnShowHint.disabled = true;
    btnShowHint.style.opacity = "0.5";
    hideHintLockPopover();
    return;
  }

  btnShowHint.disabled = false;

  try {
    // データベース（ログ）から、このユーザーがこのステージで初期コードから書き換えて実行した履歴があるか確認する
    const snapshot = await db.collection('logs')
      .where('userId', '==', userId)
      .where('stageId', '==', stageId)
      .get();
      
    let hasValidAttempt = false;
    snapshot.forEach(doc => {
      if (isModifiedExecutionLog(doc.data(), stageId)) {
        hasValidAttempt = true;
      }
    });

    if (hasValidAttempt) {
      isHintLocked = false;
      hideHintLockPopover();
      btnShowHint.style.opacity = "1";
      btnShowHint.title = currentTargetHintLogId ? "別のヒントを探す" : "ヒントを見る";
    } else {
      isHintLocked = true;
      btnShowHint.style.opacity = "0.7";
      btnShowHint.title = "まずは自分でプログラムを書き足して実行してみましょう！";
    }
  } catch(e) {
    console.error("Hint lock check failed:", e);
    isHintLocked = false;
    btnShowHint.style.opacity = "1";
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
      stageStartTime = Date.now();
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
      if (resetButton) resetButton.disabled = false;
      
      // アニメーションループが停止するのを少し待ってからステージを切り替える
      setTimeout(applyStageSwitch, 150);
    } else {
      applyStageSwitch();
    }
  });
}

let tutorialAdvanceCheck = null;
const TUTORIAL_BOUNDARY_STAGES = new Set(["stage1", "stage4", "stage7", "stage9", "stage10"]);
let tutorialReturnStageId = "stage1";
let tutorialSavedCode = null;
let activeTutorialScrollHandler = null;
let tutorialInitTimer = null;
let tutorialAdvanceTimer = null;

const TUTORIAL_REFERENCE_CODES = {
  tut1: [
    {
      title: "チュートリアル①：移動と方向転換（ステージ1〜3）",
      code: `// 矢印の向きへ進みます\n移動(270);\n// 左へ向きを変えてゴールへ進みます\n向く(-90);\n移動(200);`
    }
  ],
  tut4: [
    {
      title: "チュートリアル②（方法1）：部位回転でヒヨコを掴む例",
      code: `// ヒヨコの横まで進んで、右腕を回して掴みます\n移動(160);\n部位回転("右腕", -60);\n// 右を向いてゴールまで運び、離します\n向く(90);\n移動(260);\n離す();`
    },
    {
      title: "チュートリアル②（方法2）：「掴む();」でヒヨコを掴む例",
      code: `// 手がヒヨコに届く位置まで進んで「掴む();」で掴みます\n移動(200);\n掴む();\n// 右を向いてゴールまで運び、離します\n向く(90);\n移動(260);\n離す();`
    },
    {
      title: "地点（A〜F）へ向かって移動する例（ステージ5〜）",
      code: `// B地点の近くに着くまで移動を繰り返します\n向く("B");\nwhile (近くにいない("B")) {\n  移動(30);\n}`
    }
  ],
  tut7: [
    {
      title: "チュートリアル③（方法1）：部位回転で靴を履く例",
      code: `// 右足を回して靴を履き、針山を越えて進みます\n移動(120);\n部位回転("右足", -60);\n移動(220);`
    },
    {
      title: "チュートリアル③（方法2）：「靴を履く();」／「履く();」で履く例",
      code: `// 靴の近くまで進んで「靴を履く();」（または「履く();」）で履きます\n移動(120);\n靴を履く();\n移動(220);`
    }
  ],
  tut9: [
    {
      title: "チュートリアル④：「繰り返し」で複数のヒヨコを運ぶ（ステージ9）",
      code: `// 「繰り返し」を使って往復し、すべてのヒヨコを運びます\n繰り返し(2回) {\n  向く("B");\n  while (近くにいない("B")) {\n    移動(30);\n  }\n  部位回転("右腕", -60);\n  向く("E");\n  while (近くにいない("ゴール")) {\n    移動(30);\n  }\n  離す();\n  部位回転("右腕", 60);\n}`
    }
  ],
  tut10: [
    {
      title: "チュートリアル⑤：「もし〜そうでなければ」でヒヨコを探す（ステージ10）",
      code: `// 「もし」でヒヨコがいるか確かめてから掴みます\n向く("B");\nwhile (近くにいない("B")) {\n  移動(30);\n}\nもし (近くにいる("ヒヨコ")) {\n  部位回転("右腕", -60);\n} そうでなければ {\n  向く("E");\n  while (近くにいない("E")) {\n    移動(30);\n  }\n  部位回転("右腕", -60);\n}\n向く("F");\nwhile (近くにいない("ゴール")) {\n  移動(30);\n}\n離す();`
    }
  ]
};

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
  const isStage5Plus = stageNum >= 5;
  const isShoeStage = activeId === "stage7" || activeId === "stage8" || activeId === "tut7";
  const isStage9Plus = stageNum >= 9;
  const isStage10 = stageNum >= 10;

  // 段階的表示：ステージ4以降（部位回転・掴む・離す・部位名一覧）
  document.querySelectorAll(".unlock-stage4").forEach(el => {
    if (el.tagName === "LI") {
      el.style.display = isStage4Plus ? "list-item" : "none";
    } else if (el.classList.contains("part-name-list")) {
      el.style.display = isStage4Plus ? "block" : "none";
    } else {
      el.style.display = isStage4Plus ? "inline-block" : "none";
    }
  });

  // 段階的表示：ステージ5以降（while・条件判定）
  document.querySelectorAll(".unlock-stage5").forEach(el => {
    el.style.display = isStage5Plus ? (el.tagName === "LI" ? "list-item" : "inline-block") : "none";
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

  if (typeof syncTutorialReferenceCodeForStage === "function") {
    syncTutorialReferenceCodeForStage(stageSelect.value);
  }
}

const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

let isRunning = false;
let shouldStop = false;
let currentLogSession = null;
let currentTargetHintLogId = null;
let currentTargetHintEvents = null;
let currentTargetHintSourceCode = null;
let viewedHintLogIds = new Set();
let lastViewedHint = "ヒントなし";
let stageStartTime = Date.now();

async function saveHintViewLog(actionType, targetId, score) {
  if (!userId) return;
  const stageId = stageSelect ? stageSelect.value : "stage1";
  const activeId = (typeof engine !== "undefined" && engine.currentStageId) ? engine.currentStageId : stageId;
  if (stageId === "stage0" || activeId.startsWith("tut")) return; // 不要なログ（チュートリアル）を弾く
  const elapsedSeconds = Math.round((Date.now() - stageStartTime) / 1000);
  try {
    await db.collection('logs').add({
      eventType: 'hint_view',
      userId: userId,
      stageId: stageId,
      timestamp: new Date().toISOString(),
      elapsedSeconds: elapsedSeconds,
      hintActionType: actionType,
      targetHintLogId: targetId,
      scoreWhenHintViewed: score
    });
  } catch (e) {
    console.error("Failed to save hint view log", e);
  }
}


function generateShortUserId() {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // 0/O, 1/I などの紛らわしい文字を除外
  let code = "U-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

let userId = safeGetStorage("pictgramming_user_id");
if (!userId || userId.startsWith("user_")) {
  userId = generateShortUserId();
  safeSetStorage("pictgramming_user_id", userId);
}

const userIdDisplayEl = document.getElementById("user-id-display");
const btnCopyUserId = document.getElementById("btn-copy-user-id");
if (userIdDisplayEl) {
  userIdDisplayEl.textContent = userId;
}
if (btnCopyUserId) {
  btnCopyUserId.addEventListener("click", () => {
    navigator.clipboard.writeText(userId).then(() => {
      btnCopyUserId.textContent = "コピー完了";
      setTimeout(() => {
        btnCopyUserId.textContent = "コピー";
      }, 1500);
    });
  });
}



// --- Hint Restoration Logic ---
window.restoreHintState = async function(stageId) {
  console.log("restoreHintState called for stage: " + stageId);
  if (!userId) return;
  const btnReplay = document.getElementById("btn-replay-hint");
  if (!btnReplay) return;
  
  currentTargetHintLogId = null;
  currentTargetHintEvents = null;
  currentTargetHintSourceCode = null;
  viewedHintLogIds.clear();
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
          const targetData = targetDoc.data();
          const isValid = targetData.sourceCode ? await verifyHintCode(stageId, targetData.sourceCode) : false;
          if (isValid) {
            currentTargetHintLogId = targetId;
            currentTargetHintEvents = targetData.events;
            currentTargetHintSourceCode = targetData.sourceCode || null;
            viewedHintLogIds.add(targetId);
            lastViewedHint = "ヒントなし";
            if (typeof updateHintButtonsUI === 'function') updateHintButtonsUI(true);
            console.log("Replay button restored successfully!");
          } else {
            console.log("Previous hint failed current stage verification; skipping restore.");
          }
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
let logCount = parseInt(safeGetStorage("pictgramming_log_count") || "0", 10);

const nicknameInput = document.getElementById("user-nickname");
if (nicknameInput) {
  const savedNickname = safeGetStorage("pictgramming_nickname");
  if (savedNickname) {
    nicknameInput.value = savedNickname;
  }
  nicknameInput.addEventListener("input", (e) => {
    safeSetStorage("pictgramming_nickname", e.target.value.trim());
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
  "胴体": "body",
  "左腕": "leftArm",
  "右腕": "rightArm",
  "左足": "leftLeg",
  "右足": "rightLeg",
  "左脚": "leftLeg",
  "右脚": "rightLeg",
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
if (resetButton) {
  resetButton.addEventListener("click", () => {
    if (isRunning) return;
    clearOutput();
  });
}
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

const STAGE10_FALLBACK_HINT_CODE = `向く("A");
while (近くにいない("A")) {
  移動(30);
}
もし (近くにいる("ヒヨコ")) {
  部位回転("右腕", -60);
  向く("F");
  while (近くにいない("ゴール")) {
    移動(30);
  }
  離す();
} そうでなければ {
  向く("F");
  while (近くにいない("F")) {
    移動(30);
  }
  部位回転("右腕", -60);
  向く("A");
  while (近くにいない("ゴール")) {
    移動(30);
  }
  離す();
}`;

let _simEngine = null;
function getHintSimEngine() {
  if (_simEngine) return _simEngine;
  const dummyCanvas = {
    width: canvas ? canvas.width : 720,
    height: canvas ? canvas.height : 560,
    getContext: () => new Proxy({}, { get: () => () => {} })
  };
  _simEngine = new PictoEngine(dummyCanvas);
  _simEngine.draw = () => {};
  _simEngine.startRenderLoop = () => {};
  _simEngine.wait = async () => {};
  _simEngine.animate = async (dur, fn) => {
    fn(1);
  };
  return _simEngine;
}

function createSimPictoContext(simEngine) {
  let loopSteps = 0;
  const resolveTarget = (t) => typeof t === "string" ? t.trim() : t;
  return {
    移動: async (val) => {
      if (typeof val !== "number" || !Number.isFinite(val)) throw new Error("ERR");
      await simEngine.animateMove(val);
    },
    向く: async (target) => {
      await simEngine.animateFace(resolveTarget(target));
    },
    向き: async (target) => {
      await simEngine.animateFace(resolveTarget(target));
    },
    回転: async (val) => {
      if (typeof val === "string") {
        await simEngine.animateFace(val.trim());
        return;
      }
      if (typeof val !== "number" || !Number.isFinite(val)) throw new Error("ERR");
      await simEngine.animateTurn(val);
    },
    部位回転: async (part, val) => {
      if (typeof part !== "string" || typeof val !== "number" || !Number.isFinite(val)) throw new Error("ERR");
      const label = part.trim();
      const realPart = partNames[label] || partAliases[label.toLowerCase()];
      if (!realPart) throw new Error("ERR");
      await simEngine.animatePartRotate(realPart, val);
    },
    "掴む": async () => { simEngine.grabItem(); },
    "離す": async () => { simEngine.releaseItem(); },
    "靴を履く": async () => { simEngine.equipShoe(); },
    "履く": async () => { simEngine.equipShoe(); },
    "靴を脱ぐ": async () => { simEngine.unequipShoe(); },
    "脱ぐ": async () => { simEngine.unequipShoe(); },
    "右足で履く": async () => { simEngine.equipShoe(); },
    "左足で履く": async () => { simEngine.equipShoe(); },
    "右足で脱ぐ": async () => { simEngine.unequipShoe(); },
    "左足で脱ぐ": async () => { simEngine.unequipShoe(); },
    "近くにいる": async (label) => simEngine.isNearTarget(label),
    "近くにいない": async (label) => !simEngine.isNearTarget(label),
    "地点にいる": async (label) => simEngine.isNearTarget(label),
    "地点にいない": async (label) => !simEngine.isNearTarget(label),
    "ヒヨコの近くにいる": async () => simEngine.isNearItem(),
    "ヒヨコの近くにいない": async () => !simEngine.isNearItem(),
    "爆弾の近くにいる": async () => simEngine.isNearTarget("爆弾"),
    "爆弾の近くにいない": async () => !simEngine.isNearTarget("爆弾"),
    "靴の近くにいる": async () => simEngine.isNearTarget("靴"),
    "靴の近くにいない": async () => !simEngine.isNearTarget("靴"),
    "ヒヨコを持っている": async () => {
      const items = simEngine.state.items || (simEngine.state.item ? [simEngine.state.item] : []);
      return items.some(it => it && it.attachedTo !== null);
    },
    yield: async () => {
      loopSteps++;
      if (loopSteps > 250) throw new Error("LOOP_LIMIT");
    }
  };
}

function isSimRunCleanClear(simEngine, stageId) {
  if (simEngine.evaluateGoalStatus() !== "ゴールした") return false;
  if (!simEngine.state.hasItem) return true;
  const stageDef = STAGES[stageId];
  const requiredCount = stageDef && stageDef.requiredGoalCount
    ? stageDef.requiredGoalCount
    : (stageDef && stageDef.requireAllItems ? simEngine.state.items.length : 1);
  const inGoalItems = (simEngine.state.items || []).filter(it =>
    it && it.attachedTo === null && simEngine.distance(it.x, it.y, simEngine.goal.x, simEngine.goal.y) <= simEngine.goal.radius + 5
  );
  return inGoalItems.length >= requiredCount;
}

const _hintVerifyCache = new Map();
async function verifyHintCode(stageId, sourceCode) {
  if (!stageId || !sourceCode || typeof sourceCode !== "string") return false;
  const trimmed = sourceCode.trim();
  if (!trimmed) return false;
  const cacheKey = `${stageId}::${trimmed}`;
  if (_hintVerifyCache.has(cacheKey)) return _hintVerifyCache.get(cacheKey);

  let ok = false;
  try {
    const jsCode = transpileToJava(trimmed);
    const fn = new AsyncFunction("picto", jsCode);
    const simEngine = getHintSimEngine();

    simEngine.loadStage(stageId);
    if (stageId === "stage10" || stageId === "tut10") {
      simEngine.setTestCase(0);
      simEngine.reset();
      await fn(createSimPictoContext(simEngine));
      if (isSimRunCleanClear(simEngine, stageId)) {
        simEngine.setTestCase(1);
        simEngine.reset();
        await fn(createSimPictoContext(simEngine));
        ok = isSimRunCleanClear(simEngine, stageId);
      }
    } else {
      await fn(createSimPictoContext(simEngine));
      ok = isSimRunCleanClear(simEngine, stageId);
    }
  } catch (e) {
    ok = false;
  }

  _hintVerifyCache.set(cacheKey, ok);
  return ok;
}

async function playHintLog(targetLog, stageId) {
  if (!targetLog) return;
  const source = targetLog.sourceCode ? targetLog.sourceCode.trim() : "";
  shouldStop = false;
  runButton.disabled = true;
  stopButton.disabled = false;
  pauseButton.disabled = false;
  pauseButton.textContent = "一時停止";
  if (resetButton) resetButton.disabled = true;

  try {
    if (stageId === "stage10") {
      const isValidStage10Source = source ? await verifyHintCode("stage10", source) : false;
      const stage10Source = isValidStage10Source ? source : STAGE10_FALLBACK_HINT_CODE;
      const jsCode = transpileToJava(stage10Source);
      const fn = new AsyncFunction("picto", jsCode);

      // パターン1を再生
      engine.setTestCase(0);
      updateStage8ButtonsUI();
      engine.reset();
      engine.isGhostMode = true;
      engine.state.color = "#9ca3af";
      engine.draw();
      addLog("▶ ヒント：【パターン1】の動きを再生します", "info", false);
      try {
        await fn(createPictoContext(true));
      } catch (err1) {
        if (err1 && err1.message === "STOP") throw err1;
      }

      if (!shouldStop && !engine.isStopped) {
        await engine.wait(800);
      }

      // 続けてパターン2を再生
      if (!shouldStop && !engine.isStopped) {
        engine.setTestCase(1);
        updateStage8ButtonsUI();
        engine.reset();
        engine.isGhostMode = true;
        engine.state.color = "#9ca3af";
        engine.draw();
        addLog("▶ ヒント：続けて【パターン2】の動きを再生します", "info", false);
        try {
          await fn(createPictoContext(true));
        } catch (err2) {
          if (err2 && err2.message === "STOP") throw err2;
        }
      }
    } else if (source) {
      const jsCode = transpileToJava(source);
      const fn = new AsyncFunction("picto", jsCode);
      engine.reset();
      engine.isGhostMode = true;
      engine.state.color = "#9ca3af";
      engine.draw();
      await fn(createPictoContext(true));
    } else if (targetLog.events && targetLog.events.length > 0) {
      await engine.playGhost(targetLog.events);
    }
  } catch (err) {
    if (err && err.message !== "STOP") {
      console.warn("Ghost playback stopped:", err.message);
    }
  } finally {
    engine.isGhostMode = false;
    engine.startRenderLoop();
    runButton.disabled = false;
    stopButton.disabled = true;
    pauseButton.disabled = true;
    pauseButton.textContent = "一時停止";
    if (resetButton) resetButton.disabled = false;
  }
}

if (btnShowHint) {
  btnShowHint.addEventListener("click", async () => {
    if (isRunning) return;
    if (isHintLocked) {
      showHintLockPopover();
      return;
    }
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
      // 現行ステージ仕様で実際にゴール（ヒヨコ運搬・靴・両パターン含む）まで再現できるログのみを抽出
      const verifiedClears = [];
      for (const d of othersClears) {
        if (d.sourceCode && await verifyHintCode(stageId, d.sourceCode)) {
          verifiedClears.push(d);
        }
      }
      if (verifiedClears.length > 0) {
        othersClears = verifiedClears;
      } else if (stageId === "stage10" && othersClears.length > 0) {
        // 既存のクリアログが旧仕様（片方のパターンのみクリア等）だった場合は両パターン対応コードを補完
        othersClears = othersClears.map(d => ({
          ...d,
          sourceCode: STAGE10_FALLBACK_HINT_CODE
        }));
      } else {
        othersClears = [];
      }
        
      if (othersClears.length === 0) {
        addLog("まだあなた以外にクリアした人がいないため、ヒントを表示できません。", "info");
        return;
      }

      // すでに見たヒントIDを除外した候補リストを作成（すべて見尽くした場合は直前の1件のみ除外してリセット）
      let candidateClears = othersClears.filter(log => !viewedHintLogIds.has(log.id));
      if (candidateClears.length === 0) {
        viewedHintLogIds.clear();
        candidateClears = othersClears.filter(log => othersClears.length === 1 || log.id !== currentTargetHintLogId);
      }
      
      const myClearSnapshot = await db.collection('logs')
        .where('stageId', '==', stageId)
        .where('userId', '==', userId)
        .where('goalResult', '==', 'ゴールした')
        .limit(1)
        .get();

      if (!myClearSnapshot.empty) {
        console.log("他人クリア件数: " + othersClears.length);
        const randomLog = candidateClears[Math.floor(Math.random() * candidateClears.length)];
        addLog(`【別解再生】${randomLog.nickname || '誰か'}さんのクリアの動きを再生します`, "info");
        currentTargetHintLogId = randomLog.id;
        currentTargetHintEvents = randomLog.events;
        currentTargetHintSourceCode = randomLog.sourceCode || null;
        viewedHintLogIds.add(randomLog.id);
        lastViewedHint = "別解再生";
        await saveHintViewLog("new_search", currentTargetHintLogId, null);
        updateHintBadge();
        
        isRunning = true;
        await playHintLog(randomLog, stageId);
        isRunning = false;
      } else {
        const myLatestSnapshot = await db.collection('logs')
          .where('stageId', '==', stageId)
          .where('userId', '==', userId)
          .get();
          
        let myLatestEvents = [];
        if (!myLatestSnapshot.empty) {
          let myLogs = [];
          myLatestSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.eventType !== 'hint_view') myLogs.push(data);
          });
          myLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          const latestModifiedLog = myLogs.find(l => isModifiedExecutionLog(l, stageId)) || myLogs[0];
          if (latestModifiedLog) myLatestEvents = latestModifiedLog.events || [];
        }
          
        console.log("未クリア(DTW)モード: 他人クリア件数=" + othersClears.length + " (未視聴候補=" + candidateClears.length + ")");
        const bestLog = findBestHintLog(candidateClears, myLatestEvents, stageId);
        if (!bestLog || ((!bestLog.events || bestLog.events.length === 0) && !bestLog.sourceCode)) return;
        let score = Math.round(bestLog._calculatedDistanceScore || 0);
        
        addLog(`【お手本再生】${bestLog.nickname || '誰か'}さんのクリアの動きを再生します`, "info");
        currentTargetHintLogId = bestLog.id;
        currentTargetHintEvents = bestLog.events;
        currentTargetHintSourceCode = bestLog.sourceCode || null;
        viewedHintLogIds.add(bestLog.id);
        lastViewedHint = "お手本再生";
        await saveHintViewLog("new_search", currentTargetHintLogId, score);
        updateHintBadge();
        isRunning = true;
        await playHintLog(bestLog, stageId);
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
      if (isRunning || (!currentTargetHintEvents && !currentTargetHintSourceCode)) {
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
          if (doc.exists && !currentTargetHintSourceCode && doc.data().sourceCode) {
            currentTargetHintSourceCode = doc.data().sourceCode;
          }
        }
        
        lastViewedHint = hintTypeStr;
        if (typeof updateHintBadge === 'function') updateHintBadge();
        addLog(`【${hintTypeStr}】さっきの${hintNickname}さんの動きをもう一度再生します`, "info");
        await saveHintViewLog("replay", currentTargetHintLogId, null);
        
        isRunning = true;
        await playHintLog({
          events: currentTargetHintEvents,
          sourceCode: currentTargetHintSourceCode
        }, stageId);
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
  if (resetButton) resetButton.disabled = true;

  currentLogSession = {
    sourceCode: source,
    events: []
  };

  let finalGoalResult = null;
  try {
    let jsCode = transpileToJava(source);
    const fn = new AsyncFunction('picto', jsCode);

    if (initialStageId === "stage10" || initialStageId === "tut10") {
      stage8ClearedCases.clear();
      // --- パターン1を実行 ---
      engine.setTestCase(0);
      updateStage8ButtonsUI();
      addLog("▶ 【パターン1】を実行します", "info", false);
      let res1 = null;
      let err1Thrown = false;
      try {
        await fn(createPictoContext(false));
        if (!shouldStop) {
          res1 = engine.evaluateGoalStatus();
        }
      } catch (err1) {
        if (err1.message === "STOP") throw err1;
        err1Thrown = true;
        res1 = err1.message;
        addLog(`エラー (パターン1): ${err1.message}`, "error");
      }

      if (!shouldStop && !err1Thrown && res1) {
        if (res1 === "ゴールした") {
          stage8ClearedCases.add(0);
          updateStage8ButtonsUI();
          addLog("【パターン1 判定結果】 ゴールした", "success", false);
        } else {
          addLog(`【パターン1 判定結果】 ${res1}`, "info", false);
        }
      }

      // チュートリアル10のステップ0（爆弾体験ステップ）ではパターン1で爆発したらそこで終了
      if (initialStageId === "tut10" && err1Thrown) {
        finalGoalResult = res1;
        currentLogSession.goalResult = res1;
      } else if (!shouldStop) {
        await engine.wait(800);
        if (!shouldStop) {
          // --- 続けてパターン2を実行 ---
          engine.setTestCase(1);
          updateStage8ButtonsUI();
          addLog("▶ 続けて【パターン2】を実行します", "info", false);
          let res2 = null;
          let err2Thrown = false;
          try {
            await fn(createPictoContext(false));
            if (!shouldStop) {
              res2 = engine.evaluateGoalStatus();
            }
          } catch (err2) {
            if (err2.message === "STOP") throw err2;
            err2Thrown = true;
            res2 = err2.message;
            addLog(`エラー (パターン2): ${err2.message}`, "error");
          }

          if (!shouldStop && !err2Thrown && res2) {
            if (res2 === "ゴールした") {
              stage8ClearedCases.add(1);
              updateStage8ButtonsUI();
              addLog("【パターン2 判定結果】 ゴールした", "success", false);
            } else {
              addLog(`【パターン2 判定結果】 ${res2}`, "info", false);
            }
          }

          if (!shouldStop) {
            if (res1 === "ゴールした" && res2 === "ゴールした") {
              finalGoalResult = "ゴールした";
              addLog("完了しました。", "success");
              addLog("【判定結果】 ゴールした（パターン1・パターン2の両方をクリア！）", "success");
            } else if (res1 === "ゴールした") {
              finalGoalResult = `パターン1のみクリア（パターン2: ${res2}）`;
              addLog(`【判定結果】 ${finalGoalResult}`, "info");
            } else if (res2 === "ゴールした") {
              finalGoalResult = `パターン2のみクリア（パターン1: ${res1}）`;
              addLog(`【判定結果】 ${finalGoalResult}`, "info");
            } else {
              finalGoalResult = res1 || res2 || "ゴールに届いていない";
              addLog(`【判定結果】 ${finalGoalResult}`, "info");
            }
            currentLogSession.goalResult = finalGoalResult;
          } else {
            currentLogSession.goalResult = "手動中断";
          }
        } else {
          currentLogSession.goalResult = "手動中断";
        }
      } else {
        currentLogSession.goalResult = "手動中断";
      }
    } else {
      const picto = createPictoContext(false);
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
    if (resetButton) resetButton.disabled = false;

    if (currentLogSession) {
      currentLogSession.userId = userId;
      if (nicknameInput) {
        currentLogSession.nickname = nicknameInput.value.trim() || "名無し";
      }
      currentLogSession.timestamp = new Date().toISOString();
      currentLogSession.elapsedSeconds = Math.round((Date.now() - stageStartTime) / 1000);
      currentLogSession.sessionId = sessionId;
      currentLogSession.stageId = typeof initialStageId !== 'undefined' ? initialStageId : engine.currentStageId;
      if (currentLogSession.stageId === "stage10") {
        currentLogSession.testCase = "both";
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
        safeSetStorage("pictgramming_log_count", logCount);
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
        const isStage10 = stageSelect && stageSelect.value === "stage10";
        
        if (isStage10) {
          addLog(`【判定】お見事！パターン1とパターン2の両方をクリアしました！`, "success");
          if (clearOverlay) {
            const btnNext = document.getElementById("btn-next-stage");
            if (btnNext) {
              btnNext.textContent = "🎉 全ステージクリア！";
              btnNext.disabled = true;
              btnNext.style.background = "#10b981";
            }
            clearOverlay.hidden = false;
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

  // 全角の引用符・括弧・セミコロン・カンマ・スペースを半角に正規化
  jsCode = jsCode
    .replace(/[“”″‟]/g, '"')
    .replace(/[‘’′]/g, "'")
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/；/g, ';')
    .replace(/[，、]/g, ',')
    .replace(/　/g, ' ');
  
  // Replace variable types
  jsCode = jsCode.replace(/\b(?:int|double|float|boolean|String)\b\s+/g, 'let ');

  // Replace Japanese control structures
  jsCode = jsCode.replace(/繰り返し\s*\(\s*(\d+)\s*回\s*\)\s*\{/g, 'for (let _i = 0; _i < $1; _i++) {');
  jsCode = jsCode.replace(/もし\s*\(([\s\S]*?)\)\s*\{/g, 'if ($1) {');
  jsCode = jsCode.replace(/\}\s*そうでなければ\s*\{/g, '} else {');
  
  // Inject yield into loops to prevent freezing
  jsCode = jsCode.replace(/\b(for|while)\s*\(([\s\S]*?)\)\s*\{/g, '$1($2) { await picto.yield(); ');
  
  // Support unquoted target names inside 近くにいる / 近くにいない / 地点にいる / 地点にいない / 向く / 向き / 回転
  // (e.g. 向く(A) -> 向く("A"), 近くにいない(B) -> 近くにいない("B"), 近くにいる(ヒヨコ) -> 近くにいる("ヒヨコ"))
  jsCode = jsCode.replace(/(近くにいる|近くにいない|地点にいる|地点にいない|向く|向き|回転)\s*\(\s*(A|B|C|D|E|F|ヒヨコ|爆弾|靴|ゴール|GOAL)\s*\)/g, '$1("$2")');

  // Support unquoted body part names inside 部位回転 (e.g. 部位回転(右腕, -60) -> 部位回転("右腕", -60))
  jsCode = jsCode.replace(/(部位回転)\s*\(\s*(頭|体|胴体|左腕|右腕|左足|右足|左脚|右脚|左肘|右肘|左膝|右膝)\s*,/g, '$1("$2",');

  // Replace command keywords to await picto.method
  jsCode = jsCode.replace(/(移動|向く|向き|回転|部位回転|掴む|離す|靴を履く|靴を脱ぐ|履く|脱ぐ|右足で履く|左足で履く|右足で脱ぐ|左足で脱ぐ|近くにいない|近くにいる|地点にいない|地点にいる|ヒヨコの近くにいない|ヒヨコの近くにいる|爆弾の近くにいない|爆弾の近くにいる|靴の近くにいない|靴の近くにいる|ヒヨコを持っている)\s*\(/g, 'await picto.$1(');
  
  return jsCode;
}

function createPictoContext(isGhost = false) {
  const checkStop = () => { if (shouldStop || (isGhost && engine.isStopped)) throw new Error("STOP"); };
  const logCmd = (msg) => { if (!isGhost) addLog(msg, "", false); };
  const recCmd = (msg) => { if (!isGhost) recordEventState(msg); };
  let loopSteps = 0;
  let didActionInLoop = false;

  return {
    移動: async (val) => {
      checkStop();
      if (typeof val !== "number" || !Number.isFinite(val)) throw new Error("移動の引数は数字である必要があります");
      didActionInLoop = true;
      const msg = `移動(${val});`;
      logCmd(msg);
      try {
        await engine.animateMove(val);
      } finally {
        recCmd(msg);
      }
    },
    向く: async (target) => {
      checkStop();
      didActionInLoop = true;
      if (typeof target === "number" && Number.isFinite(target)) {
        const msg = `向く(${target});`;
        logCmd(msg);
        try {
          await engine.animateFace(target);
        } finally {
          recCmd(msg);
        }
      } else if (typeof target === "string") {
        const label = target.trim();
        const msg = `向く("${label}");`;
        logCmd(msg);
        try {
          await engine.animateFace(label);
        } finally {
          recCmd(msg);
        }
      } else {
        throw new Error("向くの引数は地点名(\"A\"など)または角度(数字)である必要があります");
      }
    },
    向き: async (target) => {
      checkStop();
      didActionInLoop = true;
      if (typeof target === "number" && Number.isFinite(target)) {
        const msg = `向く(${target});`;
        logCmd(msg);
        try {
          await engine.animateFace(target);
        } finally {
          recCmd(msg);
        }
      } else if (typeof target === "string") {
        const label = target.trim();
        const msg = `向く("${label}");`;
        logCmd(msg);
        try {
          await engine.animateFace(label);
        } finally {
          recCmd(msg);
        }
      } else {
        throw new Error("向きの引数は地点名(\"A\"など)または角度(数字)である必要があります");
      }
    },
    回転: async (val) => {
      checkStop();
      didActionInLoop = true;
      if (typeof val === "string") {
        const label = val.trim();
        const msg = `向く("${label}");`;
        logCmd(msg);
        try {
          await engine.animateFace(label);
        } finally {
          recCmd(msg);
        }
        return;
      }
      if (typeof val !== "number" || !Number.isFinite(val)) throw new Error("回転の引数は数字である必要があります");
      const msg = `向く(${val});`;
      logCmd(msg);
      try {
        await engine.animateTurn(val);
      } finally {
        recCmd(msg);
      }
    },
    部位回転: async (part, val) => {
      checkStop();
      didActionInLoop = true;
      if (typeof part !== "string") throw new Error("部位回転の第1引数は部位の名前(文字列)である必要があります");
      if (typeof val !== "number" || !Number.isFinite(val)) throw new Error("部位回転の第2引数は数字である必要があります");
      
      const label = part.trim();
      const realPart = partNames[label] || partAliases[label.toLowerCase()];
      if (!realPart) throw new Error(`"${label}"は使えない部位名です`);
      
      const msg = `部位回転("${realPart}", ${val});`;
      logCmd(msg);
      try {
        await engine.animatePartRotate(realPart, val);
      } finally {
        recCmd(msg);
      }
    },
    "掴む": async function() {
      checkStop();
      didActionInLoop = true;
      const msg = "掴む();";
      logCmd(msg);
      try {
        engine.grabItem();
        await new Promise(r => setTimeout(r, 100));
      } finally {
        recCmd(msg);
      }
    },
    "離す": async function() {
      checkStop();
      didActionInLoop = true;
      const msg = "離す();";
      logCmd(msg);
      try {
        engine.releaseItem();
        await new Promise(r => setTimeout(r, 100));
      } finally {
        recCmd(msg);
      }
    },
    "靴を履く": async function() {
      checkStop();
      didActionInLoop = true;
      const msg = "靴を履く();";
      logCmd(msg);
      try {
        engine.equipShoe();
        await new Promise(r => setTimeout(r, 100));
      } finally {
        recCmd(msg);
      }
    },
    "履く": async function() {
      checkStop();
      didActionInLoop = true;
      const msg = "靴を履く();";
      logCmd(msg);
      try {
        engine.equipShoe();
        await new Promise(r => setTimeout(r, 100));
      } finally {
        recCmd(msg);
      }
    },
    "靴を脱ぐ": async function() {
      checkStop();
      didActionInLoop = true;
      const msg = "靴を脱ぐ();";
      logCmd(msg);
      try {
        engine.unequipShoe();
        await new Promise(r => setTimeout(r, 100));
      } finally {
        recCmd(msg);
      }
    },
    "脱ぐ": async function() {
      checkStop();
      didActionInLoop = true;
      const msg = "靴を脱ぐ();";
      logCmd(msg);
      try {
        engine.unequipShoe();
        await new Promise(r => setTimeout(r, 100));
      } finally {
        recCmd(msg);
      }
    },
    "右足で履く": async function() {
      checkStop();
      didActionInLoop = true;
      const msg = "靴を履く();";
      logCmd(msg);
      try {
        engine.equipShoe();
        await new Promise(r => setTimeout(r, 100));
      } finally {
        recCmd(msg);
      }
    },
    "左足で履く": async function() {
      checkStop();
      didActionInLoop = true;
      const msg = "靴を履く();";
      logCmd(msg);
      try {
        engine.equipShoe();
        await new Promise(r => setTimeout(r, 100));
      } finally {
        recCmd(msg);
      }
    },
    "右足で脱ぐ": async function() {
      checkStop();
      didActionInLoop = true;
      const msg = "靴を脱ぐ();";
      logCmd(msg);
      try {
        engine.unequipShoe();
        await new Promise(r => setTimeout(r, 100));
      } finally {
        recCmd(msg);
      }
    },
    "左足で脱ぐ": async function() {
      checkStop();
      didActionInLoop = true;
      const msg = "靴を脱ぐ();";
      logCmd(msg);
      try {
        engine.unequipShoe();
        await new Promise(r => setTimeout(r, 100));
      } finally {
        recCmd(msg);
      }
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
      if (shouldStop || (isGhost && engine.isStopped)) throw new Error("STOP");
      loopSteps++;
      if (loopSteps > 250) {
        throw new Error("繰り返しが多すぎるため自動停止しました（条件や向きを確認してください）");
      }
      while (engine.isPaused && !shouldStop && !(isGhost && engine.isStopped)) {
        await new Promise(r => setTimeout(r, 50));
      }
      if (didActionInLoop) {
        didActionInLoop = false;
      } else {
        await new Promise(r => setTimeout(r, 1));
      }
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

function recordEventState(message, type = "") {
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

function addLog(message, type = "", shouldRecordEvent = true) {
  const row = document.createElement("div");
  row.className = `log-entry ${type}`.trim();
  row.textContent = message;
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;

  if (shouldRecordEvent) {
    recordEventState(message, type);
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

  partTooltip.textContent = `"${part.ja}"`;
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

function renderTutorialReferenceCode(tutKey) {
  const displayEl = document.getElementById("tut-code-display");
  const pillsContainer = document.getElementById("tut-code-pills");
  if (!displayEl) return;

  if (pillsContainer) {
    pillsContainer.querySelectorAll(".tut-pill-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-tut") === tutKey);
    });
  }

  const items = TUTORIAL_REFERENCE_CODES[tutKey] || TUTORIAL_REFERENCE_CODES.tut1;
  displayEl.innerHTML = items.map((item, idx) => {
    const encoded = encodeURIComponent(item.code);
    return `
      <div class="tut-code-card">
        <div class="tut-code-card-header">
          <span>${item.title}</span>
          <button type="button" class="tut-code-copy-btn" data-code="${encoded}">コピー</button>
        </div>
        <pre class="tut-code-pre">${item.code}</pre>
      </div>
    `;
  }).join("");

  displayEl.querySelectorAll(".tut-code-copy-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const code = decodeURIComponent(btn.getAttribute("data-code") || "");
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = "コピー完了!";
        setTimeout(() => {
          btn.textContent = "コピー";
        }, 1500);
      });
    });
  });
}

function setHelpTab(tabName) {
  const tabBtnCommands = document.getElementById("tab-btn-commands");
  const tabBtnTutCodes = document.getElementById("tab-btn-tut-codes");
  const panelCommands = document.getElementById("help-panel-commands");
  const panelTutCodes = document.getElementById("help-panel-tut-codes");
  if (!tabBtnCommands || !tabBtnTutCodes || !panelCommands || !panelTutCodes) return;

  const isTut = tabName === "tut";
  tabBtnCommands.classList.toggle("active", !isTut);
  tabBtnTutCodes.classList.toggle("active", isTut);
  panelCommands.hidden = isTut;
  panelTutCodes.hidden = !isTut;
}

function syncTutorialReferenceCodeForStage(stageId) {
  const tutKey = getTutorialKeyForStage(stageId);
  renderTutorialReferenceCode(tutKey);
}

const tabBtnCommandsEl = document.getElementById("tab-btn-commands");
const tabBtnTutCodesEl = document.getElementById("tab-btn-tut-codes");
const btnOpenTutCodeEl = document.getElementById("btn-open-tut-code");
const tutCodePillsEl = document.getElementById("tut-code-pills");

if (tabBtnCommandsEl) {
  tabBtnCommandsEl.addEventListener("click", () => setHelpTab("commands"));
}
if (tabBtnTutCodesEl) {
  tabBtnTutCodesEl.addEventListener("click", () => {
    syncTutorialReferenceCodeForStage(stageSelect ? stageSelect.value : "stage1");
    setHelpTab("tut");
  });
}
if (btnOpenTutCodeEl) {
  btnOpenTutCodeEl.addEventListener("click", () => {
    const panelTutCodes = document.getElementById("help-panel-tut-codes");
    if (panelTutCodes && !panelTutCodes.hidden) {
      setHelpTab("commands");
    } else {
      syncTutorialReferenceCodeForStage(stageSelect ? stageSelect.value : "stage1");
      setHelpTab("tut");
      const helpEl = document.querySelector(".command-help");
      if (helpEl && helpEl.scrollIntoView) {
        helpEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  });
}
if (tutCodePillsEl) {
  tutCodePillsEl.querySelectorAll(".tut-pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tutKey = btn.getAttribute("data-tut") || "tut1";
      renderTutorialReferenceCode(tutKey);
    });
  });
}
syncTutorialReferenceCodeForStage(stageSelect ? stageSelect.value : "stage1");

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
  if (tutorialInitTimer) {
    clearTimeout(tutorialInitTimer);
    tutorialInitTimer = null;
  }
  if (tutorialAdvanceTimer) {
    clearTimeout(tutorialAdvanceTimer);
    tutorialAdvanceTimer = null;
  }
  if (activeTutorialScrollHandler) {
    window.removeEventListener('scroll', activeTutorialScrollHandler, true);
    window.removeEventListener('resize', activeTutorialScrollHandler);
    activeTutorialScrollHandler = null;
  }
  if (window.tutorialOnTopElements) {
    window.tutorialOnTopElements.forEach(el => {
      el.classList.remove('tutorial-on-top');
      el.classList.remove('tutorial-action-target');
    });
    window.tutorialOnTopElements = null;
  }
  if (runButton) runButton.classList.remove('tutorial-action-target');
  if (stageSelect) stageSelect.disabled = false;
  if (overlay) overlay.hidden = true;
  tutorialAdvanceCheck = null;
}

function buildTutorialSteps(tutKey) {
  const runOnTop = ['#btn-run', '#java-editor', '.stage-frame', '.log-panel'];

  if (tutKey === "tut1") {
    return [
      {
        target: 'stage-canvas',
        onTopElements: ['.stage-frame'],
        pos: 'right',
        text: '「ピクトグラミング」へようこそ！\n青い人型が「ピクトグラム」で、青い矢印（▶）が「今向いている方向」です。\n緑色の「GOAL」まで動かすとクリアになります（画面右下に移動の目安を表示しています）。'
      },
      {
        target: 'stage-goal-banner',
        onTopElements: ['#stage-goal-banner', '.stage-frame'],
        pos: 'bottom',
        text: '各ステージのクリア条件は「🎯 目標」に書かれています。'
      },
      {
        target: 'java-editor',
        onTopElements: ['#java-editor', '.editor-toolbar'],
        pos: 'left',
        text: '右側の黒い入力欄が、ピクトグラムへの命令（プログラム）を書く場所です。\n矢印ボタンで「元に戻す・やり直す」、ゴミ箱ボタンで「全て消去」ができます。'
      },
      {
        target: '.snippet-toolbar',
        onTopElements: ['.snippet-toolbar', '#java-editor'],
        pos: 'top',
        text: '入力欄の下のボタンを押すと、ワンクリックでプログラムに文を追加できます。'
      },
      {
        target: '.command-help',
        onTopElements: ['.command-help'],
        pos: 'top',
        text: '右下の「使える文」では、使える命令の書き方や意味を確認できます。\n「📘 チュートリアルのコード」タブを押すと、チュートリアルのお手本コードを確認できます。'
      },
      {
        target: 'btn-run',
        onTopElements: runOnTop,
        pos: 'bottom',
        text: '入力欄に「移動(270);」を入力しました。\n【実行】ボタンを押して、矢印の向きへ移動させてみましょう。',
        codeToAdd: '// 矢印の向きへ進みます\n移動(270);',
        replaceCode: true,
        waitForRun: true,
        checkCondition: () => engine.state.y < (engine.canvas.height / 2)
      },
      {
        target: '.log-panel',
        onTopElements: ['.log-panel', '.stage-frame'],
        pos: 'top',
        text: '左下の「実行結果」には、実行した命令やクリア判定、エラーメッセージが表示されます。\n「履歴を見る」から、過去に実行したプログラムを見返すことができます。'
      },
      {
        target: 'btn-run',
        onTopElements: runOnTop,
        pos: 'bottom',
        text: '続けて「向く(-90);」で左を向き、「移動(200);」で GOAL へ進みます。\nもう一度【実行】を押してください。',
        codeToAdd: '// 矢印の向きへ進みます\n移動(270);\n// 左へ向きを変えてゴールへ進みます\n向く(-90);\n移動(200);',
        replaceCode: true,
        waitForRun: true,
        checkCondition: () => engine.evaluateGoalStatus() === "ゴールした"
      },
      {
        target: 'btn-show-hint',
        onTopElements: ['#btn-show-hint', '.stage-frame'],
        pos: 'bottom',
        text: '見事クリアです！\n解き方に迷ったときは、自分でプログラムを書き足して1回以上【実行】すると、「💡 ヒントを見る」から他の人のクリアの動きを見ることができます。'
      }
    ];
  }

  if (tutKey === "tut4") {
    return [
      {
        target: 'stage-canvas',
        onTopElements: ['.stage-frame', '.command-help'],
        pos: 'right',
        text: 'ここからは「ヒヨコ」を掴んで、GOAL の中で離すとクリアになります。\nピクトグラムにカーソルを合わせると、"右腕" などの部位名が表示されます。'
      },
      {
        target: 'btn-run',
        onTopElements: runOnTop,
        pos: 'bottom',
        text: 'ヒヨコは「部位回転」で腕を当てるか、「掴む();」で掴めます。\nまずは「部位回転("右腕", -60);」で掴んでみましょう。【実行】を押してください。',
        codeToAdd: '// ヒヨコの横まで進んで、右腕で掴みます\n移動(160);\n部位回転("右腕", -60);',
        replaceCode: true,
        waitForRun: true,
        checkCondition: () => engine.state.hasGrabbedItem
      },
      {
        target: 'btn-run',
        onTopElements: runOnTop,
        pos: 'bottom',
        text: '次は手が届く位置まで進んで「掴む();」で掴み、GOAL で「離す();」を使ってみましょう。\n【実行】を押してください。',
        codeToAdd: '// 手がヒヨコに届く位置まで進んで「掴む();」で掴みます\n移動(200);\n掴む();\n// 右を向いてゴールまで運び、離します\n向く(90);\n移動(260);\n離す();',
        replaceCode: true,
        waitForRun: true,
        checkCondition: () => engine.evaluateGoalStatus() === "ゴールした"
      },
      {
        target: 'java-editor',
        onTopElements: ['.stage-frame', '.command-help'],
        pos: 'left',
        text: 'クリアです！「部位回転」と「掴む();」はどちらを使ってもOKです。\nお手本コードは「📘 チュートリアルのコード」からいつでも確認できます。'
      }
    ];
  }

  if (tutKey === "tut7") {
    return [
      {
        target: 'btn-run',
        onTopElements: runOnTop,
        pos: 'bottom',
        text: '赤い「針山」と「靴」が登場します。\nまずは靴を履かずに【実行】を押して、どうなるか見てみましょう。',
        codeToAdd: '// 靴を履かずにそのまま進みます\n移動(240);',
        replaceCode: true,
        waitForRun: true,
        checkCondition: () => log.textContent.includes('針山に触れてしまった')
      },
      {
        target: 'btn-run',
        onTopElements: runOnTop,
        pos: 'bottom',
        text: '靴を履いていないと、針山は通れません。\n靴は「部位回転("右足", -60);」で足を回して触れるか、靴の近くで「靴を履く();」（または「履く();」）を使うと履けます。\nまずは「部位回転」で履いてみましょう。【実行】を押してください。',
        codeToAdd: '// 右足を回して靴を履き、針山を越えて進みます\n移動(120);\n部位回転("右足", -60);\n移動(220);',
        replaceCode: true,
        waitForRun: true,
        checkCondition: () => engine.evaluateGoalStatus() === "ゴールした"
      },
      {
        target: 'btn-run',
        onTopElements: runOnTop,
        pos: 'bottom',
        text: '足を回して靴を履けました！\n今度は足を回さずに、「靴を履く();」（「履く();」でも可）を使って靴を履いてみましょう。【実行】を押してください。',
        codeToAdd: '// 靴の近くまで進んで「靴を履く();」（または「履く();」）で履きます\n移動(120);\n靴を履く();\n移動(220);',
        replaceCode: true,
        waitForRun: true,
        checkCondition: () => engine.evaluateGoalStatus() === "ゴールした"
      },
      {
        target: 'java-editor',
        onTopElements: ['.stage-frame'],
        pos: 'left',
        text: '「部位回転」と「靴を履く();（履く();）」のどちらでも靴を履くことができました！\nステージにあるすべての靴を履いてから、針山を渡ってみましょう。'
      }
    ];
  }

  if (tutKey === "tut9") {
    return [
      {
        target: 'btn-run',
        onTopElements: runOnTop,
        pos: 'bottom',
        text: '一度に持てるヒヨコは「1羽だけ」です。\nまずは1往復するプログラムを【実行】してみましょう。',
        codeToAdd: '// まずは1羽だけ運びます\n向く("B");\nwhile (近くにいない("B")) {\n  移動(30);\n}\n部位回転("右腕", -60);\n向く("E");\nwhile (近くにいない("ゴール")) {\n  移動(30);\n}\n離す();',
        replaceCode: true,
        waitForRun: true,
        checkCondition: () => log.textContent.includes('まだヒヨコが残っている')
      },
      {
        target: 'btn-run',
        onTopElements: runOnTop,
        pos: 'bottom',
        text: 'まだヒヨコが残っていますね。\n「繰り返し(2回) { ... }」で囲み、最後に右腕を戻す文を入れました。【実行】を押してみましょう。',
        codeToAdd: '// 「繰り返し」を使って往復し、すべてのヒヨコを運びます\n繰り返し(2回) {\n  向く("B");\n  while (近くにいない("B")) {\n    移動(30);\n  }\n  部位回転("右腕", -60);\n  向く("E");\n  while (近くにいない("ゴール")) {\n    移動(30);\n  }\n  離す();\n  部位回転("右腕", 60);\n}',
        replaceCode: true,
        waitForRun: true,
        checkCondition: () => engine.evaluateGoalStatus() === "ゴールした"
      },
      {
        target: 'java-editor',
        onTopElements: ['.stage-frame'],
        pos: 'left',
        text: '「繰り返し」を使うと、同じ動きを何回も行うことができます。\n回数を指定して、すべてのヒヨコを GOAL まで運んでみましょう。'
      }
    ];
  }

  // tut10: ステージ10用（爆弾と条件分岐）
  return [
    {
      target: 'btn-run',
      onTopElements: runOnTop,
      pos: 'bottom',
      text: '腕を回して「爆弾」を掴むと、ゲームオーバーになります。\nまずは【実行】を押して確かめてみましょう。',
      codeToAdd: '// 確かめずにB地点で右腕を回します\n向く("B");\nwhile (近くにいない("B")) {\n  移動(30);\n}\n部位回転("右腕", -60);',
      replaceCode: true,
      waitForRun: true,
      checkCondition: () => log.textContent.includes('爆弾を掴んでしまった')
    },
    {
      target: 'btn-run',
      onTopElements: runOnTop,
      pos: 'bottom',
      text: '💥 爆発してしまいました。\n「もし (近くにいる("ヒヨコ"))」で確かめてから掴むプログラムに変えました。【実行】を押してみましょう。',
      codeToAdd: '// 「もし」でヒヨコがいるか確かめてから掴みます\n向く("B");\nwhile (近くにいない("B")) {\n  移動(30);\n}\nもし (近くにいる("ヒヨコ")) {\n  部位回転("右腕", -60);\n} そうでなければ {\n  向く("E");\n  while (近くにいない("E")) {\n    移動(30);\n  }\n  部位回転("右腕", -60);\n}\n向く("F");\nwhile (近くにいない("ゴール")) {\n  移動(30);\n}\n離す();',
      replaceCode: true,
      waitForRun: true,
      checkCondition: () => engine.evaluateGoalStatus() === "ゴールした"
    },
    {
      target: 'stage8-test-selector',
      onTopElements: ['.stage-frame'],
      pos: 'bottom',
      text: 'ステージ10では、【実行】や【ヒントを見る】を押すと「パターン1」と「パターン2」が順番に自動実行されます。\nどちらのパターンでもクリアできるプログラムを作ってみましょう。'
    }
  ];
}

function startTutorialForStage(targetStageId, force = false) {
  const mainStageId = (targetStageId && !targetStageId.startsWith("tut") && targetStageId !== "stage0")
    ? targetStageId
    : (stageSelect && !stageSelect.value.startsWith("tut") && stageSelect.value !== "stage0" ? stageSelect.value : "stage1");
  const tutKey = getTutorialKeyForStage(mainStageId);
  const storageKey = 'pict_tut_done_' + tutKey;

  if (!force && safeGetStorage(storageKey)) {
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
    if (resetButton) resetButton.disabled = false;
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
    safeSetStorage(storageKey, 'true');
    safeSetStorage('tutorialCompleted', 'true');

    if (stageSelect) {
      stageSelect.value = tutorialReturnStageId;
    }
    stageStartTime = Date.now();
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

  let activeStepEl = null;
  let activeStepCfg = null;

  function updateTutorialPosition(immediate = false) {
    if (!activeStepEl || !activeStepCfg || overlay.hidden) return;
    const rect = activeStepEl.getBoundingClientRect();
    const pad = 10;

    if (immediate) {
      highlight.style.transition = 'none';
      bubble.style.transition = 'none';
    } else {
      highlight.style.transition = '';
      bubble.style.transition = '';
    }

    highlight.style.top = (rect.top - pad) + 'px';
    highlight.style.left = (rect.left - pad) + 'px';
    highlight.style.width = (rect.width + pad * 2) + 'px';
    highlight.style.height = (rect.height + pad * 2) + 'px';

    const targetCenterX = rect.left + rect.width / 2;
    const targetCenterY = rect.top + rect.height / 2;
    let bubbleTop = 16;
    let bubbleLeft = 16;

    if (activeStepCfg.pos === 'right') {
      bubbleTop = Math.max(16, rect.top + 20);
      bubbleLeft = rect.right + pad + 18;
    } else if (activeStepCfg.pos === 'left') {
      bubbleTop = Math.max(16, rect.top + 20);
      bubbleLeft = Math.max(16, rect.left - bubble.offsetWidth - pad - 18);
    } else if (activeStepCfg.pos === 'top') {
      bubbleTop = Math.max(16, rect.top - bubble.offsetHeight - pad - 18);
      bubbleLeft = targetCenterX - bubble.offsetWidth / 2;
    } else if (activeStepCfg.pos === 'bottom') {
      bubbleTop = rect.bottom + pad + 18;
      bubbleLeft = targetCenterX - bubble.offsetWidth / 2;
    }

    // 画面端からはみ出さないようにクランプしつつ、ターゲット要素（特に実行ボタン）と絶対に重ならないようにする
    bubbleLeft = Math.max(16, Math.min(window.innerWidth - bubble.offsetWidth - 16, bubbleLeft));
    if (activeStepCfg.pos === 'bottom') {
      // 下配置の場合は常にターゲットの下端より下に配置し、実行ボタンの上に被さらないようにする
      bubbleTop = Math.max(rect.bottom + pad + 14, bubbleTop);
    } else if (activeStepCfg.pos === 'top') {
      bubbleTop = Math.min(rect.top - bubble.offsetHeight - pad - 14, Math.max(16, bubbleTop));
    } else {
      bubbleTop = Math.max(16, Math.min(window.innerHeight - bubble.offsetHeight - 16, bubbleTop));
    }

    bubble.style.top = bubbleTop + 'px';
    bubble.style.left = bubbleLeft + 'px';

    // 吹き出しのしっぽ（三角形）がターゲットの中央を正確に指すようCSS変数を設定
    const arrowLeft = Math.max(18, Math.min(bubble.offsetWidth - 38, targetCenterX - bubbleLeft - 10));
    const arrowTop = Math.max(18, Math.min(bubble.offsetHeight - 38, targetCenterY - bubbleTop - 10));
    bubble.style.setProperty('--arrow-left', arrowLeft + 'px');
    bubble.style.setProperty('--arrow-top', arrowTop + 'px');
  }

  if (activeTutorialScrollHandler) {
    window.removeEventListener('scroll', activeTutorialScrollHandler, true);
    window.removeEventListener('resize', activeTutorialScrollHandler);
  }
  activeTutorialScrollHandler = () => updateTutorialPosition(true);
  window.addEventListener('scroll', activeTutorialScrollHandler, true);
  window.addEventListener('resize', activeTutorialScrollHandler);

  function showStep(index) {
    if (index >= steps.length) {
      finishTutorial();
      return;
    }

    const step = steps[index];
    let el = document.getElementById(step.target) || document.querySelector(step.target);
    if (!el) {
      showStep(index + 1);
      return;
    }

    activeStepEl = el;
    activeStepCfg = step;

    text.style.whiteSpace = 'pre-line';
    text.textContent = step.text;
    bubble.className = 'tutorial-bubble ' + step.pos;

    if (window.tutorialOnTopElements) {
      window.tutorialOnTopElements.forEach(elItem => {
        elItem.classList.remove('tutorial-on-top');
        elItem.classList.remove('tutorial-action-target');
      });
      window.tutorialOnTopElements = null;
    }
    if (runButton) runButton.classList.remove('tutorial-action-target');

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
      isRunning = false;
      shouldStop = false;
      if (runButton) {
        runButton.disabled = false;
        runButton.textContent = "実行";
      }
      el.classList.add('tutorial-action-target');
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

    updateTutorialPosition(true);
    setTimeout(() => {
      updateTutorialPosition(false);
    }, 20);
  }

  tutorialAdvanceCheck = () => {
    if (overlay.hidden) return;
    const step = steps[currentStep];
    if (step && step.waitForRun && step.checkCondition) {
      const passed = step.checkCondition();
      if (passed) {
        if (tutorialAdvanceTimer) clearTimeout(tutorialAdvanceTimer);
        tutorialAdvanceTimer = setTimeout(() => {
          tutorialAdvanceTimer = null;
          if (!overlay.hidden) {
            currentStep++;
            showStep(currentStep);
          }
        }, 450);
      } else if (step.codeToAdd && editor) {
        // 万一チュートリアル中にコードが書き換えられて条件未達になった場合、正しいサンプルコードを再セットしてすぐ再実行できるようにする
        editor.value = step.codeToAdd;
      }
    }
  };

  // 専用疑似ステージ（tut1 / tut4 / tut7 / tut9 / tut10）をロード
  if (tutorialInitTimer) {
    clearTimeout(tutorialInitTimer);
    tutorialInitTimer = null;
  }
  if (stageSelect) stageSelect.disabled = true;
  engine.loadStage(tutKey);
  clearOutput();
  updateShoeUI();
  updateStage8TestUI(tutKey);
  if (typeof checkHintLock === 'function') checkHintLock();

  if (editor) {
    editor.value = "";
  }

  overlay.hidden = false;
  showStep(0);

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
  if (!safeGetStorage('pict_tut_done_' + tutKey)) {
    startTutorialForStage(stageId, false);
  }
}

// 初回アクセス時（ステージ1などを初めて開いたとき）に該当チュートリアルを自動表示
requestAnimationFrame(() => {
  const initialStage = stageSelect ? stageSelect.value : "stage1";
  maybeStartAutoTutorial(initialStage);
});

// ヘッダーの「チュートリアル」ボタンを押したときは現在のステージ区分に応じたチュートリアルを表示
const btnStartTutorial = document.getElementById("btn-start-tutorial");
if (btnStartTutorial) {
  btnStartTutorial.addEventListener("click", () => {
    const curStage = stageSelect ? stageSelect.value : "stage1";
    startTutorialForStage(curStage, true);
  });
}
