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
  if (logData.userId) {
    logText += `UserID: ${logData.userId}\n`;
  }
  logText += `Status: ${logData.status}\n`;
  if (logData.goalResult) {
    logText += `Goal Result: ${logData.goalResult}\n`;
  }
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

app.get("/api/logs/:userId", (req, res) => {
  const targetUserId = req.params.userId;
  const logsBaseDir = path.join(__dirname, "logs");
  
  if (!fs.existsSync(logsBaseDir)) {
    return res.json({ logs: [] });
  }

  const logEntries = [];
  const dirs = fs.readdirSync(logsBaseDir);
  
  for (const dir of dirs) {
    const logPath = path.join(logsBaseDir, dir, "execution.log");
    if (fs.existsSync(logPath)) {
      const content = fs.readFileSync(logPath, "utf-8");
      const parts = content.split(/========== \[(.*?)\] ==========/);
      
      for (let i = 1; i < parts.length; i += 2) {
        const timestamp = parts[i];
        const text = parts[i + 1];
        
        if (text && text.includes(`UserID: ${targetUserId}`)) {
          const statusMatch = text.match(/Status: (.*)/);
          const goalMatch = text.match(/Goal Result: (.*)/);
          const sourceMatch = text.match(/\[Source Code\]\n([\s\S]*?)\n\[Execution Events\]/);
          
          logEntries.push({
            timestamp,
            status: statusMatch ? statusMatch[1].trim() : "",
            goalResult: goalMatch ? goalMatch[1].trim() : null,
            sourceCode: sourceMatch ? sourceMatch[1].trim() : ""
          });
        }
      }
    }
  }
  
  logEntries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  res.json({ logs: logEntries });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Pictogramming is running: http://localhost:${PORT}`);
});

module.exports = app;
