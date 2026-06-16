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
  const args = splitArguments(match[2]);

  if (["moveForward", "moveBack", "turnLeft", "turnRight", "wait"].includes(name)) {
    const number = parseOptionalNumber(args, name);
    if (number.error) return number;
    return { name, value: number.value };
  }

  if (name === "stamp" || name === "resetParts") {
    if (args.length > 0) return { error: `${name} は引数なしで ${name}(); と書いてください。` };
    return { name };
  }

  if (name === "setColor") {
    return parseColorArgument(args);
  }

  if (name === "movePart") {
    return parseMovePart(args);
  }

  if (name === "rotatePart") {
    return parseRotatePart(args);
  }

  const shorthand = parsePartShorthand(name, args);
  if (shorthand) return shorthand;

  return { error: `${name} はまだ使えない命令です。` };
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
      if (current.trim()) args.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) args.push(current.trim());
  return args;
}

function parseOptionalNumber(args, name) {
  if (args.length === 0) return { value: undefined };
  if (args.length > 1) return { error: `${name} の引数は1つまでです。` };
  return parseNumber(args[0], `${name} の中には数値を書いてください。`);
}

function parseMovePart(args) {
  if (args.length !== 3) {
    return { error: 'movePart は movePart("head", 0, -20); のように書いてください。' };
  }

  const part = parsePartName(args[0]);
  if (part.error) return part;

  const dx = parseNumber(args[1], "movePart の2つ目には横方向の数値を書いてください。");
  if (dx.error) return dx;

  const dy = parseNumber(args[2], "movePart の3つ目には縦方向の数値を書いてください。");
  if (dy.error) return dy;

  return { name: "movePart", part: part.value, dx: dx.value, dy: dy.value };
}

function parseRotatePart(args) {
  if (args.length !== 2) {
    return { error: 'rotatePart は rotatePart("leftArm", -45); のように書いてください。' };
  }

  const part = parsePartName(args[0]);
  if (part.error) return part;

  const angle = parseNumber(args[1], "rotatePart の2つ目には角度を書いてください。");
  if (angle.error) return angle;

  return { name: "rotatePart", part: part.value, angle: angle.value };
}

function parsePartShorthand(name, args) {
  const moveMatch = name.match(/^move(Head|Body|LeftArm|RightArm|LeftLeg|RightLeg)$/);
  if (moveMatch) {
    if (args.length !== 2) return { error: `${name} は ${name}(0, -20); のように数値を2つ書いてください。` };
    const dx = parseNumber(args[0], `${name} の1つ目には横方向の数値を書いてください。`);
    if (dx.error) return dx;
    const dy = parseNumber(args[1], `${name} の2つ目には縦方向の数値を書いてください。`);
    if (dy.error) return dy;
    return { name: "movePart", part: lowerFirst(moveMatch[1]), dx: dx.value, dy: dy.value };
  }

  const rotateMatch = name.match(/^rotate(Head|Body|LeftArm|RightArm|LeftLeg|RightLeg)$/);
  if (rotateMatch) {
    const angle = parseOptionalNumber(args, name);
    if (angle.error) return angle;
    return { name: "rotatePart", part: lowerFirst(rotateMatch[1]), angle: angle.value ?? 30 };
  }

  return null;
}

function parsePartName(rawArg) {
  const match = rawArg.match(/^["']([^"']+)["']$/);
  if (!match) return { error: '体のパーツ名は "head" のように文字列で書いてください。' };

  const label = match[1].trim();
  const part = partNames[label] || partAliases[label.toLowerCase()];
  if (!part) {
    return { error: `"${label}" は使えるパーツ名ではありません。head, body, leftArm, rightArm, leftLeg, rightLeg が使えます。` };
  }

  return { value: part };
}

function parseNumber(rawArg, errorMessage) {
  if (!/^-?\d+(\.\d+)?$/.test(rawArg)) return { error: errorMessage };

  const value = Number(rawArg);
  if (!Number.isFinite(value)) return { error: "数値を読み取れませんでした。" };

  return { value };
}

function parseColorArgument(args) {
  if (args.length !== 1) {
    return { error: 'setColor は setColor("red"); のように色名を文字列で書いてください。' };
  }

  const match = args[0].match(/^["']([^"']+)["']$/);
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

function lowerFirst(text) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
