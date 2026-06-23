const canvas = document.getElementById("stage-canvas");
const editor = document.getElementById("java-editor");
if (!editor.value.trim()) {
  editor.value = `// ピクトグラムを動かすプログラムを書いてみよう！\n移動(50);\n回転(90);\n部位回転("左腕", 45);\n`;
}
const log = document.getElementById("stage-log");
const runButton = document.getElementById("btn-run");
const resetButton = document.getElementById("btn-reset");
const clearStageButton = document.getElementById("btn-clear-stage");
const stopButton = document.getElementById("btn-stop");
const pauseButton = document.getElementById("btn-pause");
const partTooltip = document.getElementById("part-tooltip");
const engine = new PictoEngine(canvas);

const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

let isRunning = false;
let shouldStop = false;
let currentLogSession = null;

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
});
clearStageButton.addEventListener("click", () => {
  if (isRunning) return;
  clearOutput();
});

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
  const end = editor.selectionEnd;
  const text = editor.value;
  editor.value = text.slice(0, start) + snippet + text.slice(end);
  editor.selectionStart = editor.selectionEnd = start + snippet.length;
  editor.focus();
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

  try {
    let jsCode = transpileToJava(source);
    const picto = createPictoContext();
    const fn = new AsyncFunction('picto', jsCode);
    await fn(picto);
    if (!shouldStop) {
      addLog("完了しました。", "success");
      
      const goalResult = engine.evaluateGoalStatus();
      const resultType = goalResult === "ゴールした" ? "success" : "info";
      addLog(`【判定結果】 ${goalResult}`, resultType);
      
      currentLogSession.status = "success";
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
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentLogSession)
      }).catch(e => console.error("Log upload failed", e));
      currentLogSession = null;
    }
  }
}

function transpileToJava(javaCode) {
  let jsCode = javaCode;
  
  // Replace variable types
  jsCode = jsCode.replace(/\b(?:int|double|float|boolean|String)\b\s+/g, 'let ');
  
  // Inject yield into loops to prevent freezing
  jsCode = jsCode.replace(/\b(for|while)\s*\((.*?)\)\s*\{/g, '$1($2) { await picto.yield(); ');
  
  // Replace picto commands
  jsCode = jsCode.replace(/(移動|回転|部位回転|掴む|離す)\s*\(/g, 'await picto.$1(');
  
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
    掴む: async () => {
      checkStop();
      addLog(`掴む();`);
      engine.grabItem();
    },
    離す: async () => {
      checkStop();
      addLog(`離す();`);
      engine.releaseItem();
    },
    yield: async () => {
      checkStop();
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
