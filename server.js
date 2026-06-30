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
