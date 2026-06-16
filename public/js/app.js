const canvas = document.getElementById("stage-canvas");
const editor = document.getElementById("java-editor");
const log = document.getElementById("stage-log");
const runButton = document.getElementById("btn-run");
const resetButton = document.getElementById("btn-reset");
const clearStageButton = document.getElementById("btn-clear-stage");
const partTooltip = document.getElementById("part-tooltip");
const engine = new PictoEngine(canvas);

let isRunning = false;

const partNames = {
  head: "head",
  body: "body",
  leftArm: "leftArm",
  rightArm: "rightArm",
  leftLeg: "leftLeg",
  rightLeg: "rightLeg",
};

const partAliases = {
  atama: "head",
  karada: "body",
  hidariude: "leftArm",
  migiude: "rightArm",
  hidariashi: "leftLeg",
  migiashi: "rightLeg",
};

runButton.addEventListener("click", runProgram);
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

async function runProgram() {
  if (isRunning) return;

  clearOutput();
  const result = parseJavaStatements(editor.value);

  if (result.errors.length > 0) {
    result.errors.forEach((message) => addLog(message, "error"));
    return;
  }

  if (result.commands.length === 0) {
    addLog("実行できる文がありません。", "error");
    return;
  }

  isRunning = true;
  runButton.textContent = "実行中";
  runButton.disabled = true;
  resetButton.disabled = true;

  try {
    await engine.run(result.commands, addLog);
  } catch (error) {
    addLog(`実行中にエラーが発生しました: ${error.message}`, "error");
  } finally {
    isRunning = false;
    runButton.textContent = "実行";
    runButton.disabled = false;
    resetButton.disabled = false;
  }
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

function parseJavaStatements(source) {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const lines = withoutBlockComments.split(/\r?\n/);
  const statements = [];
  const errors = [];

  lines.forEach((line, index) => {
    const clean = line.replace(/\/\/.*$/, "").trim();
    if (!clean) return;

    clean.split(";").forEach((part, partIndex, parts) => {
      const statement = part.trim();
      if (!statement) return;

      if (partIndex === parts.length - 1 && !clean.endsWith(";")) {
        errors.push(`${index + 1}行目: 文の最後に ; を付けてください。`);
        return;
      }

      statements.push({ text: statement, line: index + 1 });
    });
  });

  const commands = [];
  statements.forEach((statement) => {
    const command = parseStatement(statement.text);
    if (command.error) {
      errors.push(`${statement.line}行目: ${command.error}`);
      return;
    }
    commands.push(command);
  });

  return { commands, errors };
}

function parseStatement(statement) {
  const match = statement.match(/^(?:picto\.)?([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)$/);
  if (!match) {
    return { error: `"${statement}" は使える Java 文の形ではありません。` };
  }

  const name = match[1];
  const args = splitArguments(match[2]);

  if (["move", "rotate"].includes(name)) {
    const number = parseRequiredNumber(args, name);
    if (number.error) return number;
    return { name, value: number.value };
  }

  if (name === "rotatePart") {
    return parseRotatePart(name, args);
  }

  return {
    error: `${name} は使えません。使える文は move, rotate, rotatePart です。`,
  };
}

function splitArguments(rawArgs) {
  const args = [];
  let current = "";
  let quote = "";

  for (const char of rawArgs) {
    if ((char === '"' || char === "'") && quote === "") {
      quote = char;
      current += char;
      continue;
    }

    if (char === quote) {
      quote = "";
      current += char;
      continue;
    }

    if (char === "," && quote === "") {
      args.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim() || rawArgs.trim()) args.push(current.trim());
  return args.filter((arg) => arg !== "");
}

function parseRequiredNumber(args, name) {
  if (args.length !== 1) return { error: `${name} には数字を1つ書いてください。` };
  return parseNumber(args[0], `${name} の中には数字を書いてください。`);
}

function parseRotatePart(name, args) {
  if (args.length !== 2) {
    return { error: `${name} は ${name}("leftArm", 45); のように書いてください。` };
  }

  const part = parsePartName(args[0]);
  if (part.error) return part;

  const angle = parseNumber(args[1], `${name} の2つ目には数字を書いてください。`);
  if (angle.error) return angle;

  return { name, part: part.value, value: angle.value };
}

function parsePartName(rawArg) {
  const match = rawArg.match(/^["']([^"']+)["']$/);
  if (!match) return { error: '体の部位は "head" のように文字列で書いてください。' };

  const label = match[1].trim();
  const part = partNames[label] || partAliases[label.toLowerCase()];
  if (!part) {
    return { error: `"${label}" は使える体の部位ではありません。head, body, leftArm, rightArm, leftLeg, rightLeg が使えます。` };
  }

  return { value: part };
}

function parseNumber(rawArg, errorMessage) {
  if (!/^-?\d+(\.\d+)?$/.test(rawArg)) return { error: errorMessage };

  const value = Number(rawArg);
  if (!Number.isFinite(value)) return { error: "数字を読み取れませんでした。" };

  return { value };
}
