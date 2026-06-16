const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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
