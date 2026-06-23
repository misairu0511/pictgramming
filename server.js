const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// サーバー起動時に、その時点の時刻でログフォルダを作成する
const startTimeStr = new Date().toLocaleString("ja-JP", {
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit"
}).replace(/[/\s:]/g, "-"); // 例: "2026-06-23-14-15-00"

const sessionLogsDir = path.join(__dirname, "logs", startTimeStr);
if (!fs.existsSync(sessionLogsDir)) {
  fs.mkdirSync(sessionLogsDir, { recursive: true });
}

app.post("/api/log", (req, res) => {
  const logData = req.body;
  const logFile = path.join(sessionLogsDir, "execution.log");
  
  const timestamp = new Date().toISOString();
  let logText = `\n========== [${timestamp}] ==========\n`;
  logText += `Status: ${logData.status}\n`;
  if (logData.errorMessage) {
    logText += `Error: ${logData.errorMessage}\n`;
  }
  logText += `\n[Source Code]\n${logData.sourceCode}\n`;
  logText += `\n[Execution Events]\n`;
  if (logData.events && logData.events.length > 0) {
    logData.events.forEach(e => {
      logText += `  - [${e.type || "info"}] ${e.message}\n`;
    });
  } else {
    logText += `  (No events recorded)\n`;
  }
  logText += `=========================================\n`;

  fs.appendFile(logFile, logText, (err) => {
    if (err) {
      console.error("Failed to write log", err);
      return res.status(500).json({ success: false });
    }
    res.json({ success: true });
  });
});

app.post("/api/run", (req, res) => {
  const { program } = req.body;
  res.json({ success: true, message: "Program received.", program });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Pictogramming is running: http://localhost:${PORT}`);
});

module.exports = app;
