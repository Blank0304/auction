const SHOP = window.SHOP;
const STATUS = { "可購買": "ok", "已預訂": "hold", "已售出": "sold" };
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = n => "$" + Number(n).toLocaleString("en-US");
const pad = n => String(n).padStart(3, "0");
const no3 = n => "#" + pad(n);
const num = s => { const n = parseFloat(String(s).replace(/[^\d.]/g, "")); return isFinite(n) ? n : null; };
const icon = cat => SHOP.icons[cat] || SHOP.defaultIcon;

let ITEMS = [], cat = "全部", current = null, shots = [], shot = 0;

// 解析 CSV（支援引號、欄位內的逗號與換行），回傳以第一列為欄位名稱的物件陣列
function parseCSV(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  const head = (rows.shift() || []).map(h => h.trim());
  return rows.map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()])));
}

async function loadTab(tab) {
  const url = `https://docs.google.com/spreadsheets/d/${SHOP.sheetId}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(tab)}&_=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return parseCSV(await res.text());
}

function toItem(r) {
  const no = num(r["編號"]), price = num(r["售價"]);
  if (no === null || !r["品名"]) return null;
  return { no, name: r["品名"], cat: r["分類"] || "其他", was: num(r["原價"]), price,
    cond: r["品況"] || "", desc: r["說明"] || "", status: STATUS[r["狀態"]] || "ok", label: r["狀態"] || "可購買" };
}

function renderBaskets(rows) {
  const list = rows.filter(r => r["籃子名稱"]);
  $("sec-basket").hidden = !list.length;
  $("baskets").innerHTML = list.map(r => `
    <div class="basket"><div class="sticker"><small>每樣</small><span>${esc(money(num(r["價格"]) ?? 0))}</span></div>
    <div><h3>${esc(r["籃子名稱"])}</h3><p>${esc(r["內容說明"] || "")}</p></div></div>`).join("");
}

function renderChips() {
  const cats = ["全部", ...new Set(ITEMS.map(i => i.cat))];
  $("chips").innerHTML = cats.map(c => `<button class="chip" type="button" data-cat="${esc(c)}" aria-pressed="${c === cat}">${esc(c)}</button>`).join("");
}

function render() {
  const q = $("q").value.trim().toLowerCase(), sort = $("sort").value, avail = $("avail").checked;
  const list = ITEMS.filter(i =>
    (cat === "全部" || i.cat === cat) &&
    (!avail || i.status === "ok") &&
    (!q || i.name.toLowerCase().includes(q) || no3(i.no).includes(q) || String(i.no) === q));
  list.sort((a, b) => sort === "asc" ? a.price - b.price : sort === "desc" ? b.price - a.price : a.no - b.no);
  $("grid").innerHTML = list.map(i => `
    <button class="card ${i.status === "sold" ? "is-sold" : ""}" type="button" data-no="${i.no}">
      <div class="photo"><span aria-hidden="true">${icon(i.cat)}</span>
        <img src="images/${pad(i.no)}.jpg" alt="" loading="lazy" onerror="this.remove()">
        <span class="no">${no3(i.no)}</span><span class="price">${i.price === null ? "洽詢" : money(i.price)}</span></div>
      <div class="info">
        <span class="name">${esc(i.name)}</span>
        <span class="meta">${i.was ? `<s>${money(i.was)}</s>` : ""}${esc(i.cond)}</span>
        <span class="status ${i.status}">${esc(i.label)}</span>
      </div>
    </button>`).join("");
  $("empty").hidden = list.length > 0 || !ITEMS.length;
  const left = ITEMS.filter(i => i.status === "ok").length;
  $("count").textContent = `共 ${ITEMS.length} 件，還有 ${left} 件可買`;
}

// 找出這件商品有哪些照片：001.jpg、001-2.jpg、001-3.jpg…（最多 6 張，遇到缺號就停）
function findShots(no) {
  const probe = src => new Promise(ok => { const im = new Image(); im.onload = () => ok(true); im.onerror = () => ok(false); im.src = src; });
  return (async () => {
    const out = [];
    for (let k = 1; k <= 6; k++) {
      const src = `images/${pad(no)}${k === 1 ? "" : "-" + k}.jpg`;
      if (!(await probe(src))) break;
      out.push(src);
    }
    return out;
  })();
}

function drawPhoto() {
  const i = current, many = shots.length > 1;
  $("d-photo").innerHTML = `<span aria-hidden="true">${icon(i.cat)}</span>
    ${shots.length ? `<img src="${shots[shot]}" alt="${esc(i.name)}">` : ""}
    <span class="no">${no3(i.no)}</span>
    ${many ? `<button class="nav prev" type="button" aria-label="上一張">‹</button><button class="nav next" type="button" aria-label="下一張">›</button><span class="dots">${shot + 1} / ${shots.length}</span>` : ""}`;
}

async function openItem(i) {
  current = i; shots = []; shot = 0;
  drawPhoto();
  $("d-name").textContent = i.name;
  $("d-price").textContent = i.price === null ? "洽詢" : money(i.price);
  const off = i.was && i.price ? `原價 <s>${money(i.was)}</s>（約 ${Math.round(i.price / i.was * 100) / 10} 折）` : "";
  $("d-meta").innerHTML = [esc(i.cat), esc(i.cond), off].filter(Boolean).join(" · ");
  $("d-desc").textContent = i.desc;
  const canReserve = i.status === "ok" && SHOP.reserveFormUrl;
  $("reserve").hidden = !canReserve;
  if (canReserve) $("reserve").href = SHOP.reserveFormUrl.replace("{no}", encodeURIComponent(`${no3(i.no)} ${i.name}`));
  $("d-msg").textContent = i.status === "hold" ? "這件已經有人預訂。如果對方放棄，我會改回可購買。"
    : i.status === "sold" ? "這件已經賣出了。"
    : canReserve ? "填完表單後我會幫你保留到拍賣會當天。" : "想預訂請直接找 Wei。";
  if (!$("dlg").open) $("dlg").showModal();
  const found = await findShots(i.no);
  if (current === i) { shots = found; drawPhoto(); }
}

$("chips").addEventListener("click", e => {
  const b = e.target.closest(".chip"); if (!b) return;
  cat = b.dataset.cat; renderChips(); render();
});
["q", "sort", "avail"].forEach(id => $(id).addEventListener("input", render));
$("grid").addEventListener("click", e => {
  const c = e.target.closest(".card"); if (!c) return;
  openItem(ITEMS.find(i => i.no === +c.dataset.no));
});
$("d-photo").addEventListener("click", e => {
  const b = e.target.closest(".nav"); if (!b) return;
  shot = (shot + (b.classList.contains("next") ? 1 : shots.length - 1)) % shots.length;
  drawPhoto();
});
$("close").addEventListener("click", () => $("dlg").close());
$("dlg").addEventListener("click", e => { if (e.target === $("dlg")) $("dlg").close(); });

if (SHOP.bankAccount) {
  $("bank").hidden = false;
  $("acct").textContent = SHOP.bankAccount;
  $("copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(SHOP.bankAccount.replace(/\D/g, "")); $("copy").textContent = "已複製"; }
    catch { $("copy").textContent = "請長按帳號複製"; }
    setTimeout(() => $("copy").textContent = "複製帳號", 2000);
  });
}

(async () => {
  try {
    const [items, baskets] = await Promise.all([loadTab(SHOP.itemsTab), loadTab(SHOP.basketsTab).catch(() => [])]);
    ITEMS = items.map(toItem).filter(Boolean);
    renderBaskets(baskets); renderChips(); render();
    if (!ITEMS.length) $("count").textContent = "商品還在整理中，晚點再來看看";
  } catch (err) {
    $("count").textContent = "";
    $("notice").hidden = false;
    $("notice").textContent = "商品清單暫時讀不到，請重新整理一次。如果還是不行，請直接找 Wei。";
    console.error(err);
  }
})();
