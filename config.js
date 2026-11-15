// 小舖設定：改這裡就好，不用動 app.js
window.SHOP = {
  // Google 試算表 ID（網址 /d/ 後面那一段）。試算表要設成「知道連結的任何人可檢視」。
  sheetId: "1wcTacZcFvcO0SRciRhEHbRlH7DCG0R72jb6vwTw82EQ",
  itemsTab: "商品",
  basketsTab: "籃子",

  // 玉山銀行帳號。留空字串就不顯示。
  bankAccount: "",

  // 預訂用 Google 表單的「預先填入連結」，把商品編號的位置換成 {no}。
  // 例：https://docs.google.com/forms/d/e/xxxx/viewform?usp=pp_url&entry.123456={no}
  // 留空字串就不顯示預訂按鈕。
  reserveFormUrl: "",

  // 沒有照片時，依分類顯示的圖示。
  icons: { "3C": "💻", "遊戲": "🎮", "旅遊": "🧳", "家電": "🔌", "收藏": "🧸", "生活": "🏠", "書籍": "📚" },
  defaultIcon: "📦",
};
