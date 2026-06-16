const canvas = document.getElementById("stage-canvas");
const editor = document.getElementById("java-editor");
const log = document.getElementById("stage-log");
const runButton = document.getElementById("btn-run");
const resetButton = document.getElementById("btn-reset");
const clearStageButton = document.getElementById("btn-clear-stage");
const engine = new PictoEngine(canvas);

let isRunning = false;

const colorMap = {
  red: "#dc2626",
  blue: "#2563eb",
  green: "#16a34a",
  yellow: "#f59e0b",
  black: "#111827",
  purple: "#7c3aed",
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
  const rawArg = match[2].trim();

  if (["moveForward", "moveBack", "turnLeft", "turnRight", "wait"].includes(name)) {
    const number = parseNumberArgument(rawArg, name);
    if (number.error) return number;
    return { name, value: number.value };
  }

  if (name === "stamp") {
    if (rawArg !== "") return { error: "stamp は引数なしで stamp(); と書いてください。" };
    return { name };
  }

  if (name === "setColor") {
    return parseColorArgument(rawArg);
  }

  return { error: `${name} はまだ使えない命令です。` };
}

function parseNumberArgument(rawArg, name) {
  if (rawArg === "") return { name, value: undefined };

  if (!/^-?\d+(\.\d+)?$/.test(rawArg)) {
    return { error: `${name} の中には数値を書いてください。` };
  }

  const value = Number(rawArg);
  if (!Number.isFinite(value)) {
    return { error: `${name} の数値を読み取れませんでした。` };
  }

  return { value };
}

function parseColorArgument(rawArg) {
  const match = rawArg.match(/^["']([^"']+)["']$/);
  if (!match) {
    return { error: 'setColor は setColor("red"); のように色名を文字列で書いてください。' };
  }

  const label = match[1].trim();
  const color = colorMap[label.toLowerCase()] || parseHexColor(label);
  if (!color) {
    return { error: `"${label}" は使える色ではありません。red, blue, green, yellow, black, purple が使えます。` };
  }

  return { name: "setColor", color, label };
}

function parseHexColor(label) {
  return /^#[0-9a-fA-F]{6}$/.test(label) ? label : null;
}
