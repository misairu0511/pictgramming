const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 静的ファイルを提供
app.use(express.static(path.join(__dirname, 'public')));

// APIエンドポイント: プログラムを実行（将来拡張用）
app.use(express.json());

app.post('/api/run', (req, res) => {
  const { program } = req.body;
  // サーバーサイドでプログラムを解析・実行するロジック（将来拡張用）
  res.json({ success: true, message: 'プログラムを受信しました', program });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎭 ピクトグラミング起動中: http://localhost:${PORT}`);
});

module.exports = app;
