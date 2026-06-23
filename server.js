const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/log", (req, res) => {
  const logData = req.body;
  const logsDir = path.join(__dirname, "logs");
  
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const logFile = path.join(logsDir, "execution.log");
  
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
