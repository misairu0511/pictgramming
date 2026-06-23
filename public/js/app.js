const canvas = document.getElementById("stage-canvas");
const editor = document.getElementById("java-editor");
const log = document.getElementById("stage-log");
const runButton = document.getElementById("btn-run");
const resetButton = document.getElementById("btn-reset");
const clearStageButton = document.getElementById("btn-clear-stage");
const stopButton = document.getElementById("btn-stop");
const partTooltip = document.getElementById("part-tooltip");
const engine = new PictoEngine(canvas);

const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

let isRunning = false;
let shouldStop = false;

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
};

runButton.addEventListener("click", runProgram);
stopButton.addEventListener("click", () => {
  if (isRunning) {
    shouldStop = true;
    engine.stop();
    addLog("実行を停止しました。", "error");
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
  resetButton.disabled = true;

  try {
    let jsCode = transpileToJava(source);
    const picto = createPictoContext();
    const fn = new AsyncFunction('picto', jsCode);
    await fn(picto);
    if (!shouldStop) addLog("完了しました。", "success");
  } catch (error) {
    if (error.message !== "STOP") {
      addLog(`エラー: ${error.message}`, "error");
    }
  } finally {
    isRunning = false;
    runButton.textContent = "実行";
    runButton.disabled = false;
    stopButton.disabled = true;
    resetButton.disabled = false;
  }
}

function transpileToJava(javaCode) {
  let jsCode = javaCode;
  
  // Replace variable types
  jsCode = jsCode.replace(/\b(?:int|double|float|boolean|String)\b\s+/g, 'let ');
  
  // Inject yield into loops to prevent freezing
  jsCode = jsCode.replace(/\b(for|while)\s*\((.*?)\)\s*\{/g, '$1($2) { await picto.yield(); ');
  
  // Replace picto commands
  jsCode = jsCode.replace(/\b(move|rotate|rotatePart)\s*\(/g, 'await picto.$1(');
  
  return jsCode;
}

function createPictoContext() {
  const checkStop = () => { if (shouldStop) throw new Error("STOP"); };

  return {
    move: async (val) => {
      checkStop();
      if (typeof val !== "number" || !Number.isFinite(val)) throw new Error("moveの引数は数字である必要があります");
      addLog(`move(${val});`);
      await engine.animateMove(val);
    },
    rotate: async (val) => {
      checkStop();
      if (typeof val !== "number" || !Number.isFinite(val)) throw new Error("rotateの引数は数字である必要があります");
      addLog(`rotate(${val});`);
      await engine.animateTurn(val);
    },
    rotatePart: async (part, val) => {
      checkStop();
      if (typeof part !== "string") throw new Error("rotatePartの第1引数は部位の名前(文字列)である必要があります");
      if (typeof val !== "number" || !Number.isFinite(val)) throw new Error("rotatePartの第2引数は数字である必要があります");
      
      const label = part.trim();
      const realPart = partNames[label] || partAliases[label.toLowerCase()];
      if (!realPart) throw new Error(`"${label}"は使えない部位名です`);
      
      addLog(`rotatePart("${realPart}", ${val});`);
      await engine.animatePartRotate(realPart, val);
    },
    yield: async () => {
      checkStop();
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
