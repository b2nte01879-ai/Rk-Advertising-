import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, ChevronLeft, ChevronDown, BookOpen, Pencil, Eye, Download, Search, Printer, FileText, Menu, LayoutGrid, TrendingUp, Wallet, Receipt, Clock, BarChart3, Users, Settings, Share2, MessageCircle, MessageSquare, Phone, RotateCcw, Moon, Sun, ShoppingBag } from "lucide-react";
import { storage } from "./firebase";

// ---------- constants ----------
const _NOW_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => _NOW_YEAR - 2 + i); // ২ বছর আগে থেকে +৭ বছর
const MONTH_NAMES = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];
const WEEKDAY_NAMES = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
const getWeekday = (y, m, d) => WEEKDAY_NAMES[new Date(y, m - 1, d).getDay()];

// দ্রুত বেছে নেওয়ার জন্য ডিফল্ট নামের তালিকা (চাইলে নিজে আরও যোগ করা যায়)
const DEFAULT_SALE_NAMES = ["ব্যানার", "ফেস্টুন", "ফ্লেক্স", "স্টিকার", "ভিজিটিং কার্ড"];
const DEFAULT_EXPENSE_NAMES = ["নাস্তা", "মিটার রিচার্জ", "মাল ক্রয়", "ব্যানার প্রিন্ট"];
const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

const toBn = (n) =>
  String(n)
    .split("")
    .map((ch) => (ch >= "0" && ch <= "9" ? BN_DIGITS[+ch] : ch))
    .join("");

const daysInMonth = (year, month) => new Date(year, month, 0).getDate();

const dayKey = (y, m, d) => `day:${y}-${m}-${d}`;
const duesKey = (y) => `dues:${y}`;
const yearStatsKey = (y) => `yearstats:${y}`;
const pad2 = (n) => String(n).padStart(2, "0");

const emptyRowId = () => Math.random().toString(36).slice(2, 10);

const newExpenseRow = () => ({ id: emptyRowId(), name: "", amount: "" });
const newItemRow = () => ({
  id: emptyRowId(),
  name: "",
  height: "",
  weight: "",
  qty: "",
  price: "",
  due: "",
  discount: "",
});

const num = (v) => (v === "" || v === null || v === undefined ? NaN : parseFloat(v));
// বিক্রির সারিতে 'বাকি' যেমন লেখা তেমনই থাকে; শোধ হলে 'duePaid' বাড়ে। বাকির লিস্টে দেখায় বাকি − শোধ।
const dueRemaining = (it) => Math.max(0, (isNaN(num(it.due)) ? 0 : num(it.due)) - (isNaN(num(it.duePaid)) ? 0 : num(it.duePaid)));

function grossTotal(item) {
  const h = isNaN(num(item.height)) ? 1 : num(item.height);
  const w = isNaN(num(item.weight)) ? 1 : num(item.weight);
  const q = isNaN(num(item.qty)) ? 1 : num(item.qty);
  const p = isNaN(num(item.price)) ? 0 : num(item.price);
  return h * w * q * p;
}

function netTotal(item) {
  const due = isNaN(num(item.due)) ? 0 : num(item.due);
  const disc = isNaN(num(item.discount)) ? 0 : num(item.discount);
  return grossTotal(item) - due - disc;
}

function fmt(n) {
  const v = Math.round((n + Number.EPSILON) * 100) / 100;
  return v.toLocaleString("en-IN");
}

// ---------- font loader ----------
// ---------- থিম: লাইট / ডার্ক (CSS ভ্যারিয়েবল) ----------
const THEME_CSS = `
:root{--bg:#F5F6FA;--card:#FFFFFF;--line:#D9DDEB;--line2:#E8EAF2;--tint:#E8EBF5;--outer:#E4E7F1;--ink:#1B2340;--gray:#6B7390;--gray2:#9AA1BA;--gray3:#AEB5CE;--navy-fg:#1F2F5C;--navy-bg:#1F2F5C;--navy-line:#1F2F5C;--on-navy:#F5F6FA;--orange:#C97B2E;--orange-bg:#C97B2E;--red:#B24A45;--green:#3E7D5A;--green2:#2F7A4F;--blue:#4262B4;--active:#E3E7F3;--red-tint:#FBEAE7;--red-tint2:#F7D9D4;--red-dark:#8E2B26;--amber-tint:#FFF6E5;--amber-text:#9A6B1F;--green-tint:#E3F4EA;--green-dark:#1E7A47;--gold:#FFD27A;}
:root.rk-dark{--bg:#0F1420;--card:#1A2133;--line:#2E3A57;--line2:#262F47;--tint:#222C48;--outer:#0A0E18;--ink:#E6E9F5;--gray:#9AA3C2;--gray2:#7C86A8;--gray3:#66708F;--navy-fg:#AFC3FF;--navy-bg:#2B4283;--navy-line:#5C78C8;--on-navy:#FFFFFF;--orange:#E39A4F;--orange-bg:#A8611F;--red:#E8736D;--green:#5CB887;--green2:#5CB887;--blue:#7F9CE8;--active:#263050;--red-tint:#3A1E22;--red-tint2:#4A2429;--red-dark:#F0A19C;--amber-tint:#3A2E17;--amber-text:#E5B35C;--green-tint:#17301F;--green-dark:#6CD39C;--gold:#FFD27A;}
html,body{background:var(--outer);}
@media (min-width:1024px){html,body{background:var(--bg);}}
:root.rk-dark{color-scheme:dark;}
:root.rk-dark input,:root.rk-dark select,:root.rk-dark textarea{color:var(--ink);}
.rk-outer{background:var(--outer);color:var(--ink);}
@media (min-width:1024px){.rk-outer{background:var(--bg);}}
.rk-active:active{background:var(--active);}
`;
function applyTheme(dark) {
  document.documentElement.classList.toggle("rk-dark", !!dark);
  try {
    localStorage.setItem("rk-theme", dark ? "dark" : "light");
  } catch (e) {
    /* ignore */
  }
  window.dispatchEvent(new Event("rk-theme"));
}
function toggleTheme() {
  applyTheme(!document.documentElement.classList.contains("rk-dark"));
}
if (typeof document !== "undefined") {
  let st = document.getElementById("rk-theme-css");
  if (!st) {
    st = document.createElement("style");
    st.id = "rk-theme-css";
    document.head.appendChild(st);
  }
  st.textContent = THEME_CSS;
  let saved = null;
  try {
    saved = localStorage.getItem("rk-theme");
  } catch (e) {
    /* ignore */
  }
  document.documentElement.classList.toggle("rk-dark", saved === "dark");
}

function useLedgerFonts() {
  useEffect(() => {
    const id = "ledger-bn-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

// ---------- নিরাপদ স্টোরেজ: লোকাল মিরর + অফলাইন পেন্ডিং কিউ ----------
// ১) সফল রিড/রাইট localStorage-এ মিরর হয়  ২) রিমোট সেভ ফেল হলে লেখা কিউতে জমা থাকে
// ৩) নেট এলে স্বয়ংক্রিয়ভাবে পাঠানো হয় — লেখা কোনোদিন হারায় না
function lsGet(key) {
  try {
    const v = localStorage.getItem("mirror:" + key);
    return v ? JSON.parse(v) : null;
  } catch (e) {
    return null;
  }
}
function lsSet(key, value) {
  try {
    localStorage.setItem("mirror:" + key, JSON.stringify(value));
  } catch (e) {
    /* ignore */
  }
}
function queueWrite(key, value) {
  try {
    const q = JSON.parse(localStorage.getItem("pendingWrites") || "[]");
    q.push({ key, value });
    localStorage.setItem("pendingWrites", JSON.stringify(q));
  } catch (e) {
    /* ignore */
  }
}
function pendingCount() {
  try {
    return JSON.parse(localStorage.getItem("pendingWrites") || "[]").length;
  } catch (e) {
    return 0;
  }
}
async function flushPendingWrites() {
  let q = [];
  try {
    q = JSON.parse(localStorage.getItem("pendingWrites") || "[]");
  } catch (e) {
    return 0;
  }
  let sent = 0;
  for (let i = 0; i < q.length; i++) {
    try {
      await storage.set(q[i].key, q[i].value);
      sent++;
    } catch (e) {
      // এখনো নেট নেই — বাকিটা পরে
      try {
        localStorage.setItem("pendingWrites", JSON.stringify(q.slice(i)));
      } catch (e2) {}
      return sent;
    }
  }
  try {
    localStorage.setItem("pendingWrites", "[]");
  } catch (e) {}
  return sent;
}
// রিড: রিমোট থেকে পেলে মিরর আপডেট; না পারলে লোকাল মিরর থেকে (স্টেইল ডেটা, কিন্তু হারায় না)
async function kget(key) {
  try {
    const res = await storage.get(key);
    if (res && res.value) {
      lsSet(key, res.value);
      return res.value;
    }
    return lsGet(key);
  } catch (e) {
    return lsGet(key);
  }
}
// রাইট: আগে লোকাল মিরর, তারপর রিমোট; রিমোট ফেল হলে কিউতে (false রিটার্ন)
async function kset(key, value) {
  lsSet(key, value);
  try {
    await storage.set(key, value);
    // একই key-এর পুরনো পেন্ডিং লেখা আর পাঠাবো না (ভুলক্রমে পুরনো ডেটা ওভাররাইট ঠেকাতে)
    try {
      const rest = JSON.parse(localStorage.getItem("pendingWrites") || "[]").filter((w) => w.key !== key);
      localStorage.setItem("pendingWrites", JSON.stringify(rest));
    } catch (e) {}
    return true;
  } catch (e) {
    queueWrite(key, value);
    return false;
  }
}

// ---------- storage helpers (Firestore-backed) ----------
async function loadDay(y, m, d) {
  const raw = await kget(dayKey(y, m, d));
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return {
        expenses: parsed.expenses && parsed.expenses.length ? parsed.expenses : [newExpenseRow()],
        items: parsed.items && parsed.items.length ? parsed.items : [newItemRow()],
        openingOverride: parsed.openingOverride ?? null,
        totalOverride: parsed.totalOverride ?? null,
      };
    } catch (e) {
      /* parse error */
    }
  }
  return { expenses: [newExpenseRow()], items: [newItemRow()], openingOverride: null, totalOverride: null };
}

async function saveDay(y, m, d, data) {
  await kset(dayKey(y, m, d), JSON.stringify(data));
}

async function loadDues(year) {
  const raw = await kget(duesKey(year));
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {}
  }
  return {};
}

async function saveDuesForDate(year, month, day, entries) {
  const all = await loadDues(year);
  const k = `${month}-${day}`;
  if (entries.length) all[k] = entries;
  else delete all[k];
  await kset(duesKey(year), JSON.stringify(all));
}

async function loadYearStats(year) {
  const raw = await kget(yearStatsKey(year));
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {}
  }
  return {};
}

async function saveYearStatsForDate(year, month, day, income, expense, balance) {
  const all = await loadYearStats(year);
  const k = `${month}-${day}`;
  all[k] = { income, expense, balance };
  await kset(yearStatsKey(year), JSON.stringify(all));
}

async function findOpeningBalance(y, m, d) {
  const statsThisYear = await loadYearStats(y);
  const before = Object.keys(statsThisYear)
    .map((k) => {
      const [mm, dd] = k.split("-").map(Number);
      return { mm, dd, k };
    })
    .filter(({ mm, dd }) => mm < m || (mm === m && dd < d))
    .sort((a, b) => b.mm - a.mm || b.dd - a.dd);
  if (before.length > 0) {
    const entry = statsThisYear[before[0].k];
    if (entry && entry.balance !== undefined) return entry.balance;
  }
  if (YEARS.includes(y - 1)) {
    const statsPrevYear = await loadYearStats(y - 1);
    const keys = Object.keys(statsPrevYear)
      .map((k) => {
        const [mm, dd] = k.split("-").map(Number);
        return { mm, dd, k };
      })
      .sort((a, b) => b.mm - a.mm || b.dd - a.dd);
    if (keys.length > 0) {
      const entry = statsPrevYear[keys[0].k];
      if (entry && entry.balance !== undefined) return entry.balance;
    }
  }
  return 0;
}

function sumYearStats(all) {
  return Object.values(all).reduce(
    (acc, v) => ({ income: acc.income + (v.income || 0), expense: acc.expense + (v.expense || 0) }),
    { income: 0, expense: 0 }
  );
}

function csvEscape(v) {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function buildBackupCsv() {
  const header = ["তারিখ", "ধরন", "নাম", "টাকা", "হাইট", "ওয়েট", "পরিমান", "দাম", "মোট", "বাকি", "ছাড়"];
  const rows = [header];

  for (const y of YEARS) {
    const stats = await loadYearStats(y);
    const dateKeys = Object.keys(stats).sort((a, b) => {
      const [am, ad] = a.split("-").map(Number);
      const [bm, bd] = b.split("-").map(Number);
      return am - bm || ad - bd;
    });
    for (const dk of dateKeys) {
      const [m, d] = dk.split("-").map(Number);
      const dateLabel = `${y}-${pad2(m)}-${pad2(d)}`;
      const day = await loadDay(y, m, d);
      day.expenses.forEach((e) => {
        if (!e.name && !e.amount) return;
        rows.push([dateLabel, "খরচ", e.name, e.amount, "", "", "", "", "", "", ""]);
      });
      day.items.forEach((it) => {
        if (!it.name && !it.height && !it.weight && !it.qty && !it.price && !it.due && !it.discount) return;
        rows.push([
          dateLabel,
          "বিক্রি",
          it.name,
          "",
          it.height,
          it.weight,
          it.qty,
          it.price,
          fmt(netTotal(it)),
          it.due,
          it.discount,
        ]);
      });
    }
  }

  // কাস্টমার মেমো
  const memosAll = await loadAllMemos();
  memosAll.sort((a, b) => a.y - b.y || a.m - b.m || a.d - b.d || (a.no || 0) - (b.no || 0));
  memosAll.forEach((mm) => {
    const dateLabel = `${mm.y}-${pad2(mm.m)}-${pad2(mm.d)}`;
    mm.items.filter(memoItemUsed).forEach((it) => {
      rows.push([dateLabel, "মেমো", `${mm.customer} — ${it.name}`, "", it.height, it.weight, it.qty, it.price, fmt(grossTotal(it)), "", ""]);
    });
    const c = memoCalc(mm);
    rows.push([dateLabel, "মেমো-সারাংশ", `${mm.customer} (মেমো নং ${mm.no})`, c.paid, "", "", "", "", fmt(c.total), c.due, c.discount]);
  });
  // সরাসরি যোগ করা বাকি (মেমো থেকে আসাগুলো মেমো-সারাংশেই আছে)
  const manualDues = await loadManualDues();
  manualDues.forEach((e) => {
    if (e.memoId) return;
    rows.push([`${e.y}-${pad2(e.m)}-${pad2(e.d)}`, "সরাসরি বাকি", e.name, "", "", "", "", "", "", e.amount, ""]);
  });

  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}

async function buildAllTransactions() {
  const rows = [];
  for (const y of YEARS) {
    const stats = await loadYearStats(y);
    const dateKeys = Object.keys(stats).sort((a, b) => {
      const [am, ad] = a.split("-").map(Number);
      const [bm, bd] = b.split("-").map(Number);
      return am - bm || ad - bd;
    });
    for (const dk of dateKeys) {
      const [m, d] = dk.split("-").map(Number);
      const day = await loadDay(y, m, d);
      day.expenses.forEach((e) => {
        if (!e.name && !e.amount) return;
        rows.push({ y, m, d, type: "খরচ", name: e.name || "(নামহীন)", amount: num(e.amount) || 0, due: 0, discount: 0 });
      });
      day.items.forEach((it) => {
        if (!it.name && !it.height && !it.weight && !it.qty && !it.price && !it.due && !it.discount) return;
        rows.push({
          y,
          m,
          d,
          type: "বিক্রি",
          name: it.name || "(নামহীন)",
          amount: netTotal(it),
          due: dueRemaining(it),
          discount: num(it.discount) || 0,
        });
      });
    }
  }
  return rows;
}

async function downloadBackupCsv(onDone) {
  try {
    const csv = await buildBackupCsv();
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date();
    const stamp = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    a.href = url;
    a.download = `RK-Advertising-hisab-backup-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } finally {
    if (onDone) onDone();
  }
}

// ---------- কাস্টমার মেমো + সরাসরি বাকি ----------
const memosKey = (y) => `memos:${y}`;
const MANUAL_DUES_KEY = "manualdues";

const numOr0 = (v) => (isNaN(num(v)) ? 0 : num(v));
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const newMemoItem = () => ({ id: emptyRowId(), name: "", height: "", weight: "", qty: "", price: "" });
const newMemoDraft = (y, m, d) => ({
  id: null,
  no: null,
  origY: null,
  y,
  m,
  d,
  customer: "",
  phone: "",
  address: "",
  items: [newMemoItem()],
  discount: "",
  prevDue: "",
  paid: "",
  note: "",
  dueListId: null,
  listDue: true,
});
const memoItemUsed = (it) =>
  (it.name && it.name.trim()) || it.height !== "" || it.weight !== "" || it.qty !== "" || it.price !== "";

function memoCalc(memo) {
  const subtotal = memo.items.filter(memoItemUsed).reduce((s, it) => s + grossTotal(it), 0);
  const discount = numOr0(memo.discount);
  const prevDue = numOr0(memo.prevDue);
  const paid = numOr0(memo.paid);
  const total = subtotal - discount + prevDue;
  const due = Math.max(0, total - paid);
  return { subtotal, discount, prevDue, paid, total, due };
}

async function loadMemosYear(y) {
  const raw = await kget(memosKey(y));
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {}
  }
  return [];
}

async function saveMemosYear(y, list) {
  return await kset(memosKey(y), JSON.stringify(list));
}

async function loadAllMemos() {
  const results = await Promise.all(YEARS.map(loadMemosYear));
  return results.flat();
}

async function loadManualDues() {
  const raw = await kget(MANUAL_DUES_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {}
  }
  return [];
}

async function saveManualDues(list) {
  return await kset(MANUAL_DUES_KEY, JSON.stringify(list));
}

// বাকির লিস্ট = দৈনিক হিসাবের বাকি + সরাসরি যোগ করা বাকি (মেমো থেকে আসা সহ)
async function loadAllDuesFlat() {
  const results = await Promise.all(YEARS.map((y) => loadDues(y)));
  const flat = [];
  results.forEach((duesForYear, idx) => {
    const y = YEARS[idx];
    Object.entries(duesForYear).forEach(([k, entries]) => {
      const [m, d] = k.split("-").map(Number);
      entries.forEach((e) => flat.push({ y, m, d, ...e }));
    });
  });
  const manual = await loadManualDues();
  manual.forEach((e) => flat.push({ ...e, manual: true }));
  flat.sort((a, b) => a.y - b.y || a.m - b.m || a.d - b.d);
  return flat;
}

// মেমোর বাকি বাকির লিস্টে বসানো/আপডেট/মুছে ফেলা (dueAmount <= 0 হলে লিস্ট থেকে সরে যায়)
async function syncMemoDue(memo, dueAmount) {
  const list = await loadManualDues();
  const rest = list.filter((x) => x.id !== memo.dueListId);
  if (dueAmount > 0) {
    rest.push({ id: memo.dueListId, y: memo.y, m: memo.m, d: memo.d, name: memo.customer, amount: dueAmount, memoId: memo.id, memoY: memo.y });
  }
  await saveManualDues(rest);
}

// ---------- দোকানের তথ্য (লোগো / ঠিকানা / ফোন) ----------
const SHOP_KEY = "shopinfo";
const DEFAULT_SHOP = {
  name: "R.K ADVERTISING AND DIGITAL HOUSE",
  address: "আবুল বিড়ি ফ্যাক্টরির বিপরীতে, ডি.টি রোড, পাহাড়তলী, চট্টগ্রাম",
  phone: "০১৭৯৬২১৬৮৩৩",
  logo: "",
};
let shopInfo = { ...DEFAULT_SHOP };
const getShop = () => shopInfo;
function setShopInfo(v) {
  shopInfo = { ...DEFAULT_SHOP, ...(v || {}) };
}
async function loadShopInfo() {
  const raw = await kget(SHOP_KEY);
  if (raw) {
    try {
      setShopInfo(JSON.parse(raw));
    } catch (e) {
      /* ignore */
    }
  }
  return shopInfo;
}
async function saveShopInfo(v) {
  setShopInfo(v);
  return await kset(SHOP_KEY, JSON.stringify(shopInfo));
}

// প্রিন্ট পেজের মাথার অংশ (লোগো + নাম + ঠিকানা + ফোন)
const LETTERHEAD_CSS =
  ".letterhead{display:flex;align-items:center;justify-content:center;gap:14px;border-bottom:2px solid #1F2F5C;padding-bottom:10px;margin-bottom:14px;}" +
  ".letterhead .logo{height:64px;max-width:120px;object-fit:contain;}" +
  ".letterhead .lh-text{text-align:center;}" +
  ".letterhead h1{color:#1F2F5C;font-size:22px;margin:0;}" +
  ".letterhead p{color:#6B7390;font-size:12px;margin:4px 0 0;}";
const shopLetterheadHtml = () => {
  const s = getShop();
  return `<div class="letterhead">${s.logo ? `<img class="logo" src="${s.logo}" alt="logo" />` : ""}<div class="lh-text"><h1>${esc(
    s.name
  )}</h1>${s.address ? `<p>${esc(s.address)}</p>` : ""}${s.phone ? `<p>ফোন: ${esc(s.phone)}</p>` : ""}</div></div>`;
};

// লোগো ছোট করে (সর্বোচ্চ ২২০px) JPEG ডেটা-URL বানানো — যাতে সেভ হালকা থাকে
function resizeImageToDataUrl(file, maxSide = 220) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("read"));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("img"));
      img.onload = () => {
        const sc = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * sc));
        const h = Math.max(1, Math.round(img.height * sc));
        const cv = document.createElement("canvas");
        cv.width = w;
        cv.height = h;
        const ctx = cv.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(cv.toDataURL("image/jpeg", 0.85));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

// ---------- ফোন / রিমাইন্ডার / কাস্টমার হেল্পার ----------
const custKey = (n) => String(n || "").trim().toLowerCase().replace(/\s+/g, " ");
const digitsOnly = (p) =>
  String(p || "")
    .replace(/[০-৯]/g, (c) => String("০১২৩৪৫৬৭৮৯".indexOf(c)))
    .replace(/\D/g, "");
function intlPhone(p) {
  const d = digitsOnly(p);
  if (!d) return "";
  if (d.startsWith("880")) return d;
  if (d.startsWith("0")) return "88" + d;
  if (d.length === 10 && d.startsWith("1")) return "880" + d;
  return d;
}
const daysSince = (y, m, d) => Math.floor((Date.now() - new Date(y, m - 1, d).getTime()) / 86400000);
const shopSignoff = () => {
  const s = getShop();
  return `${s.name}${s.phone ? ` (${s.phone})` : ""}`;
};
const dueMessage = (name, amount, y, m, d) =>
  `আসসালামু আলাইকুম ${name}, ${toBn(d)} ${MONTH_NAMES[m - 1]} ${toBn(y)} তারিখ থেকে আপনার ৳${toBn(
    fmt(amount)
  )} টাকা বাকি আছে। অনুগ্রহ করে সুবিধামতো পরিশোধ করবেন। ধন্যবাদ।\n— ${shopSignoff()}`;
const dueMessageTotal = (name, amount) =>
  `আসসালামু আলাইকুম ${name}, আপনার মোট ৳${toBn(fmt(amount))} টাকা বাকি আছে। অনুগ্রহ করে সুবিধামতো পরিশোধ করবেন। ধন্যবাদ।\n— ${shopSignoff()}`;
const memoText = (mm) => {
  const c = memoCalc(mm);
  return `${getShop().name}\nমেমো নং ${toBn(mm.no)} — ${toBn(mm.d)} ${MONTH_NAMES[mm.m - 1]}, ${toBn(mm.y)}\nকাস্টমার: ${
    mm.customer
  }\nসর্বমোট: ৳${toBn(fmt(c.total))}\nজমা: ৳${toBn(fmt(c.paid))}\nবাকি: ৳${toBn(fmt(c.due))}`;
};
function openWhatsApp(phone, text) {
  const p = intlPhone(phone);
  window.open(`https://wa.me/${p}?text=${encodeURIComponent(text)}`, "_blank");
}
function openSms(phone, text) {
  const p = digitsOnly(phone);
  const sep = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "&" : "?";
  window.location.href = `sms:${p}${sep}body=${encodeURIComponent(text)}`;
}
function openCall(phone) {
  window.location.href = `tel:${digitsOnly(phone)}`;
}

// মেমো + বাকির তালিকা থেকে কাস্টমারভিত্তিক হিসাব
function buildCustomers(memos, dues) {
  const map = {};
  const touch = (name) => {
    const k = custKey(name);
    if (!k) return null;
    if (!map[k]) map[k] = { key: k, name: String(name).trim(), phone: "", address: "", memos: [], dues: [], billed: 0, paid: 0, due: 0, lastVal: 0 };
    return map[k];
  };
  const val = (o) => o.y * 10000 + o.m * 100 + o.d;
  [...memos]
    .sort((a, b) => val(a) - val(b) || (a.no || 0) - (b.no || 0))
    .forEach((mm) => {
      const c = touch(mm.customer);
      if (!c) return;
      const calc = memoCalc(mm);
      c.memos.push(mm);
      c.billed += calc.subtotal - calc.discount;
      c.paid += calc.paid;
      c.name = String(mm.customer).trim();
      if (mm.phone) c.phone = mm.phone;
      if (mm.address) c.address = mm.address;
      c.lastVal = Math.max(c.lastVal, val(mm));
    });
  dues.forEach((e) => {
    if (!e.manual) return;
    const c = touch(e.name);
    if (!c) return;
    c.dues.push(e);
    if (e.phone && !c.phone) c.phone = e.phone;
    c.lastVal = Math.max(c.lastVal, val(e));
  });
  dues.forEach((e) => {
    if (e.manual) return;
    const c = map[custKey(e.name)];
    if (!c) return;
    c.dues.push(e);
    c.lastVal = Math.max(c.lastVal, val(e));
  });
  Object.values(map).forEach((c) => {
    c.due = c.dues.reduce((s, e) => s + (e.amount || 0), 0);
  });
  return Object.values(map);
}

function customerRows(c) {
  const val = (o) => o.y * 10000 + o.m * 100 + o.d;
  return [
    ...c.memos.map((mm) => {
      const cc = memoCalc(mm);
      return { kind: "memo", mm, val: val(mm), y: mm.y, m: mm.m, d: mm.d, label: `মেমো নং ${toBn(mm.no)}`, total: cc.total, paid: cc.paid, due: cc.due };
    }),
    ...c.dues
      .filter((e) => !e.memoId)
      .map((e) => ({
        kind: "due",
        val: val(e),
        y: e.y,
        m: e.m,
        d: e.d,
        label: e.manual ? "সরাসরি বাকি" : "দৈনিক হিসাবের বাকি",
        total: e.amount || 0,
        paid: 0,
        due: e.amount || 0,
      })),
  ].sort((a, b) => b.val - a.val);
}

// ---------- রিসাইকেল বিন (মোছা এন্ট্রি ৩০ দিন ফিরিয়ে আনা যায়) ----------
const TRASH_KEY = "trash";
async function loadTrash() {
  const raw = await kget(TRASH_KEY);
  if (raw) {
    try {
      const cutoff = Date.now() - 30 * 86400000;
      return JSON.parse(raw).filter((x) => x.at > cutoff);
    } catch (e) {
      /* ignore */
    }
  }
  return [];
}
async function saveTrash(list) {
  return await kset(TRASH_KEY, JSON.stringify(list.slice(0, 80)));
}
async function addToTrash(entry) {
  const item = { tid: emptyRowId(), at: Date.now(), ...entry };
  const list = await loadTrash();
  list.unshift(item);
  await saveTrash(list);
  return item;
}

// ---------- PDF বানানো ও শেয়ার (কোনো বাড়তি লাইব্রেরি ছাড়া) ----------
// মেমো/বিবরণীকে ক্যানভাসে এঁকে JPEG করা হয়, তারপর সেটা PDF পাতায় বসানো হয়
async function renderDocCanvases(doc) {
  const S = 2;
  const PW = 794;
  const PH = 1123;
  const M = 40;
  const NAVY = "#1F2F5C";
  const GRAY = "#6B7390";
  const INK = "#1B2340";
  const LINE = "#D9DDEB";
  const FONT = "'Noto Sans Bengali', 'Noto Sans', sans-serif";
  try {
    await Promise.all([document.fonts.load(`400 16px ${FONT}`, "অআকখ"), document.fonts.load(`700 16px ${FONT}`, "অআকখ")]);
  } catch (e) {
    /* ফন্ট না এলেও চলবে */
  }
  const shop = getShop();
  let logoImg = null;
  if (shop.logo) {
    logoImg = await new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = shop.logo;
    });
  }
  const pages = [];
  let cv = null;
  let ctx = null;
  let y = M;
  const newPage = () => {
    cv = document.createElement("canvas");
    cv.width = PW * S;
    cv.height = PH * S;
    ctx = cv.getContext("2d");
    ctx.scale(S, S);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, PW, PH);
    ctx.textBaseline = "alphabetic";
    pages.push(cv);
    y = M;
  };
  const setFont = (size, bold) => {
    ctx.font = `${bold ? 700 : 400} ${size}px ${FONT}`;
  };
  const fit = (txt, maxW) => {
    let t = String(txt === null || txt === undefined ? "" : txt);
    if (!maxW || ctx.measureText(t).width <= maxW) return t;
    while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
    return t + "…";
  };
  const text = (txt, x, yy, o = {}) => {
    const { size = 14, bold = false, color = INK, align = "left", maxW } = o;
    setFont(size, bold);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(fit(txt, maxW), x, yy);
  };
  const hline = (yy, color, w) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(M, yy);
    ctx.lineTo(PW - M, yy);
    ctx.stroke();
  };
  const wrapLines = (txt, maxW, size) => {
    setFont(size, false);
    const words = String(txt).split(/\s+/);
    const lines = [];
    let cur = "";
    words.forEach((w) => {
      const t = cur ? cur + " " + w : w;
      if (ctx.measureText(t).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  };
  const tw = PW - 2 * M;
  const drawHead = () => {
    if (!doc.table) return;
    ctx.fillStyle = NAVY;
    ctx.fillRect(M, y, tw, 28);
    let x = M;
    doc.table.cols.forEach((c) => {
      const w = c.w * tw;
      const tx = c.align === "right" ? x + w - 8 : c.align === "center" ? x + w / 2 : x + 8;
      text(c.label, tx, y + 19, { size: 13, bold: true, color: "#ffffff", align: c.align || "left", maxW: w - 16 });
      x += w;
    });
    y += 28;
  };
  const ensure = (h, withHead) => {
    if (y + h > PH - M - 30) {
      newPage();
      if (withHead) drawHead();
    }
  };

  newPage();
  // মাথার অংশ
  let logoW = 0;
  if (logoImg) {
    const h = 60;
    logoW = Math.min(120, (logoImg.width * h) / logoImg.height);
    ctx.drawImage(logoImg, M, y, logoW, h);
  }
  const hw = PW - 2 * M - 2 * (logoW ? logoW + 10 : 0);
  text(shop.name, PW / 2, y + 24, { size: 22, bold: true, color: NAVY, align: "center", maxW: hw });
  if (shop.address) text(shop.address, PW / 2, y + 46, { size: 12.5, color: GRAY, align: "center", maxW: hw });
  if (shop.phone) text(`ফোন: ${shop.phone}`, PW / 2, y + 64, { size: 12.5, color: GRAY, align: "center", maxW: hw });
  y += 76;
  hline(y, NAVY, 2);
  y += 22;

  if (doc.metaLeft) text(doc.metaLeft, M, y, { size: 14 });
  if (doc.metaRight) text(doc.metaRight, PW - M, y, { size: 14, align: "right" });
  y += 26;
  (doc.customerLines || []).forEach((ln, i) => {
    text(ln, M, y, { size: i === 0 ? 17 : 13.5, bold: i === 0, color: i === 0 ? INK : GRAY, maxW: tw });
    y += i === 0 ? 24 : 21;
  });
  y += 10;

  if (doc.table) {
    drawHead();
    doc.table.rows.forEach((r) => {
      ensure(30, true);
      let x = M;
      doc.table.cols.forEach((c, i) => {
        const w = c.w * tw;
        const tx = c.align === "right" ? x + w - 8 : c.align === "center" ? x + w / 2 : x + 8;
        text(r[i], tx, y + 19, { size: 13.5, align: c.align || "left", maxW: w - 16 });
        x += w;
      });
      y += 28;
      hline(y, LINE, 1);
    });
  }

  if (doc.summary && doc.summary.length) {
    y += 14;
    ensure(doc.summary.length * 28 + 20, false);
    const bx = PW - M - 320;
    doc.summary.forEach((row) => {
      const label = row[0];
      const value = row[1];
      const strong = !!row[2];
      if (strong) {
        ctx.strokeStyle = NAVY;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx, y);
        ctx.lineTo(PW - M, y);
        ctx.stroke();
        y += 6;
      }
      text(label, bx + 4, y + 18, { size: strong ? 17 : 14, bold: strong, color: strong ? NAVY : INK });
      text(value, PW - M - 4, y + 18, { size: strong ? 17 : 14, bold: strong, color: strong ? NAVY : INK, align: "right" });
      y += strong ? 30 : 25;
    });
  }

  if (doc.note) {
    y += 12;
    wrapLines(doc.note, tw, 13).forEach((ln) => {
      ensure(22, false);
      text(ln, M, y + 14, { size: 13, color: GRAY });
      y += 21;
    });
  }

  ensure(90, false);
  const sy = Math.max(y + 56, PH - M - 30);
  const labels = doc.signLabels || ["গ্রাহকের স্বাক্ষর", "কর্তৃপক্ষ"];
  [
    [M, M + 160],
    [PW - M - 160, PW - M],
  ].forEach((seg, i) => {
    ctx.strokeStyle = GRAY;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(seg[0], sy);
    ctx.lineTo(seg[1], sy);
    ctx.stroke();
    text(labels[i], (seg[0] + seg[1]) / 2, sy + 18, { size: 12, color: GRAY, align: "center" });
  });
  return pages;
}

async function canvasesToJpegs(cvs) {
  const out = [];
  for (const c of cvs) {
    const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.92));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    out.push({ bytes, w: c.width, h: c.height });
  }
  return out;
}

function buildPdfFromJpegs(pages) {
  const enc = new TextEncoder();
  const parts = [];
  let offset = 0;
  const push = (x) => {
    const b = typeof x === "string" ? enc.encode(x) : x;
    parts.push(b);
    offset += b.length;
  };
  const offsets = [];
  const objStart = (n) => {
    offsets[n] = offset;
    push(`${n} 0 obj\n`);
  };
  const PWpt = 595.28;
  const PHpt = 841.89;
  const total = 2 + pages.length * 3;
  push("%PDF-1.4\n");
  objStart(1);
  push("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objStart(2);
  push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ")}] /Count ${pages.length} >>\nendobj\n`);
  pages.forEach((pg, i) => {
    const po = 3 + i * 3;
    const co = po + 1;
    const io = po + 2;
    objStart(po);
    push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PWpt} ${PHpt}] /Resources << /XObject << /Im0 ${io} 0 R >> >> /Contents ${co} 0 R >>\nendobj\n`);
    const content = `q ${PWpt} 0 0 ${PHpt} 0 0 cm /Im0 Do Q`;
    objStart(co);
    push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
    objStart(io);
    push(`<< /Type /XObject /Subtype /Image /Width ${pg.w} /Height ${pg.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.bytes.length} >>\nstream\n`);
    push(pg.bytes);
    push("\nendstream\nendobj\n");
  });
  const xref = offset;
  let x = `xref\n0 ${total + 1}\n0000000000 65535 f \n`;
  for (let n = 1; n <= total; n++) x += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  push(x);
  push(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: "application/pdf" });
}

async function makePdfBlob(doc) {
  const cvs = await renderDocCanvases(doc);
  return buildPdfFromJpegs(await canvasesToJpegs(cvs));
}

// ফোনে হলে শেয়ার-শিট (WhatsApp বেছে নেওয়া যায়), না হলে ডাউনলোড
async function sharePdf(doc, filename, text) {
  const blob = await makePdfBlob(doc);
  const file = new File([blob], filename, { type: "application/pdf" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename, text });
      return "shared";
    } catch (e) {
      if (e && e.name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}

function memoToDoc(memo) {
  const c = memoCalc(memo);
  const used = memo.items.filter(memoItemUsed);
  const summary = [];
  if (used.length) summary.push(["সাবটোটাল", fmt(c.subtotal)]);
  if (c.discount > 0) summary.push(["ছাড় (-)", fmt(c.discount)]);
  if (c.prevDue > 0) summary.push(["পূর্বের বাকি (+)", fmt(c.prevDue)]);
  summary.push(["সর্বমোট", fmt(c.total)]);
  if (c.paid > 0) summary.push(["জমা (-)", fmt(c.paid)]);
  summary.push(["বাকি", fmt(c.due), true]);
  return {
    metaLeft: `মেমো নং: ${toBn(memo.no)}`,
    metaRight: `তারিখ: ${toBn(memo.d)} ${MONTH_NAMES[memo.m - 1]}, ${toBn(memo.y)}`,
    customerLines: [memo.customer, memo.phone ? `ফোন: ${memo.phone}` : "", memo.address ? `ঠিকানা: ${memo.address}` : ""].filter(Boolean),
    table: used.length
      ? {
          cols: [
            { label: "নং", w: 0.07, align: "center" },
            { label: "বিবরণ", w: 0.33 },
            { label: "হাইট", w: 0.1, align: "right" },
            { label: "ওয়েট", w: 0.1, align: "right" },
            { label: "পরিমান", w: 0.1, align: "right" },
            { label: "দাম", w: 0.13, align: "right" },
            { label: "মোট", w: 0.17, align: "right" },
          ],
          rows: used.map((it, i) => [toBn(i + 1), it.name, it.height || "—", it.weight || "—", it.qty || "১", fmt(numOr0(it.price)), fmt(grossTotal(it))]),
        }
      : null,
    summary,
    note: memo.note ? `নোট: ${memo.note}` : "",
  };
}

function statementToDoc(c) {
  const rows = customerRows(c);
  const now = new Date();
  return {
    metaLeft: "হিসাবের বিবরণী",
    metaRight: `তারিখ: ${toBn(now.getDate())} ${MONTH_NAMES[now.getMonth()]}, ${toBn(now.getFullYear())}`,
    customerLines: [c.name, c.phone ? `ফোন: ${c.phone}` : "", c.address ? `ঠিকানা: ${c.address}` : ""].filter(Boolean),
    table: rows.length
      ? {
          cols: [
            { label: "তারিখ", w: 0.2 },
            { label: "বিবরণ", w: 0.28 },
            { label: "সর্বমোট", w: 0.17, align: "right" },
            { label: "জমা", w: 0.17, align: "right" },
            { label: "বাকি", w: 0.18, align: "right" },
          ],
          rows: rows.map((r) => [`${toBn(r.d)} ${MONTH_NAMES[r.m - 1].slice(0, 3)} ${toBn(r.y)}`, r.label, fmt(r.total), r.paid ? fmt(r.paid) : "—", fmt(r.due)]),
        }
      : null,
    summary: [
      ["মোট বিল (ছাড়সহ)", fmt(c.billed)],
      ["মোট জমা", fmt(c.paid)],
      ["বর্তমান বাকি", fmt(c.due), true],
    ],
    note: "",
    signLabels: ["গ্রাহকের স্বাক্ষর", "কর্তৃপক্ষ"],
  };
}

function printCustomerStatement(c) {
  const win = window.open("", "_blank");
  if (!win) return;
  const rows = customerRows(c)
    .map(
      (r) =>
        `<tr><td>${toBn(r.d)} ${MONTH_NAMES[r.m - 1].slice(0, 3)} ${toBn(r.y)}</td><td>${esc(r.label)}</td><td style="text-align:right">${fmt(r.total)}</td><td style="text-align:right">${
          r.paid ? fmt(r.paid) : "—"
        }</td><td style="text-align:right">${fmt(r.due)}</td></tr>`
    )
    .join("");
  const now = new Date();
  win.document.write(`
    <html><head><title>হিসাবের বিবরণী — ${esc(c.name)}</title>
    <meta charset="utf-8" />
    <style>
      body{font-family:'Noto Sans Bengali',sans-serif;padding:28px;color:#1B2340;}
      ${LETTERHEAD_CSS}
      .meta{display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;}
      .cust{font-size:13.5px;margin-bottom:14px;line-height:1.6;}
      table{width:100%;border-collapse:collapse;}
      th,td{border:1px solid #D9DDEB;padding:5px 8px;font-size:12.5px;}
      th{background:#1F2F5C;color:#fff;text-align:left;}
      .summary{width:300px;margin-left:auto;margin-top:16px;}
      .summary td{border:none;padding:3px 4px;font-size:13px;}
      .summary tr.total td{border-top:2px solid #1F2F5C;font-weight:bold;font-size:15px;color:#1F2F5C;}
      .sign{display:flex;justify-content:space-between;margin-top:56px;font-size:12px;color:#6B7390;}
      .sign span{border-top:1px solid #6B7390;padding-top:4px;min-width:130px;text-align:center;}
      @media print{ body{padding:10mm;} }
      .close-btn{position:fixed;top:10px;right:10px;width:42px;height:42px;border-radius:50%;border:none;background:#1F2F5C;color:#fff;font-size:22px;line-height:1;cursor:pointer;z-index:99;box-shadow:0 2px 8px rgba(0,0,0,.3);}@media print{.close-btn{display:none !important;}}
    </style>
    </head><body><button class="close-btn" onclick="window.close()" aria-label="বন্ধ করুন">✕</button>
      ${shopLetterheadHtml()}
      <div class="meta"><span>হিসাবের বিবরণী</span><span>তারিখ: ${toBn(now.getDate())} ${MONTH_NAMES[now.getMonth()]}, ${toBn(now.getFullYear())}</span></div>
      <div class="cust"><b>${esc(c.name)}</b>${c.phone ? `<br/>ফোন: ${esc(c.phone)}` : ""}${c.address ? `<br/>ঠিকানা: ${esc(c.address)}` : ""}</div>
      ${
        rows
          ? `<table><thead><tr><th>তারিখ</th><th>বিবরণ</th><th>সর্বমোট</th><th>জমা</th><th>বাকি</th></tr></thead><tbody>${rows}</tbody></table>`
          : ""
      }
      <table class="summary">
        <tr><td>মোট বিল (ছাড়সহ)</td><td style="text-align:right">${fmt(c.billed)}</td></tr>
        <tr><td>মোট জমা</td><td style="text-align:right">${fmt(c.paid)}</td></tr>
        <tr class="total"><td>বর্তমান বাকি</td><td style="text-align:right">${fmt(c.due)}</td></tr>
      </table>
      <div class="sign"><span>গ্রাহকের স্বাক্ষর</span><span>কর্তৃপক্ষ</span></div>
    </body></html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

function printCustomerMemo(memo) {
  const win = window.open("", "_blank");
  if (!win) return;
  const c = memoCalc(memo);
  const rows = memo.items
    .filter(memoItemUsed)
    .map(
      (it, i) => `<tr>
        <td style="text-align:center">${toBn(i + 1)}</td>
        <td>${esc(it.name)}</td>
        <td style="text-align:right">${esc(it.height) || "—"}</td>
        <td style="text-align:right">${esc(it.weight) || "—"}</td>
        <td style="text-align:right">${esc(it.qty) || "১"}</td>
        <td style="text-align:right">${fmt(numOr0(it.price))}</td>
        <td style="text-align:right">${fmt(grossTotal(it))}</td>
      </tr>`
    )
    .join("");
  const line = (label, value, cls) => `<tr${cls ? ` class="${cls}"` : ""}><td>${label}</td><td style="text-align:right">${value}</td></tr>`;
  win.document.write(`
    <html><head><title>মেমো নং ${toBn(memo.no)} — ${esc(memo.customer)}</title>
    <meta charset="utf-8" />
    <style>
      body{font-family:'Noto Sans Bengali',sans-serif;padding:28px;color:#1B2340;}
      ${LETTERHEAD_CSS}
      .meta{display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;}
      .cust{font-size:13.5px;margin-bottom:14px;line-height:1.6;}
      table{width:100%;border-collapse:collapse;}
      th,td{border:1px solid #D9DDEB;padding:5px 8px;font-size:12.5px;}
      th{background:#1F2F5C;color:#fff;text-align:left;}
      .summary{width:300px;margin-left:auto;margin-top:16px;}
      .summary td{border:none;padding:3px 4px;font-size:13px;}
      .summary tr.total td{border-top:2px solid #1F2F5C;font-weight:bold;font-size:15px;color:#1F2F5C;}
      .note{margin-top:14px;font-size:12.5px;color:#6B7390;}
      .sign{display:flex;justify-content:space-between;margin-top:56px;font-size:12px;color:#6B7390;}
      .sign span{border-top:1px solid #6B7390;padding-top:4px;min-width:130px;text-align:center;}
      @media print{ body{padding:10mm;} }
    .close-btn{position:fixed;top:10px;right:10px;width:42px;height:42px;border-radius:50%;border:none;background:#1F2F5C;color:#fff;font-size:22px;line-height:1;cursor:pointer;z-index:99;box-shadow:0 2px 8px rgba(0,0,0,.3);}@media print{.close-btn{display:none !important;}}</style>
    </head><body><button class="close-btn" onclick="window.close()" aria-label="বন্ধ করুন">✕</button>
      ${shopLetterheadHtml()}
      <div class="meta">
        <span>মেমো নং: ${toBn(memo.no)}</span>
        <span>তারিখ: ${toBn(memo.d)} ${MONTH_NAMES[memo.m - 1]}, ${toBn(memo.y)}</span>
      </div>
      <div class="cust">
        <b>${esc(memo.customer)}</b>
        ${memo.phone ? `<br/>ফোন: ${esc(memo.phone)}` : ""}
        ${memo.address ? `<br/>ঠিকানা: ${esc(memo.address)}` : ""}
      </div>
      ${
        rows
          ? `<table>
        <thead><tr><th style="width:36px">নং</th><th>বিবরণ</th><th>হাইট</th><th>ওয়েট</th><th>পরিমান</th><th>দাম</th><th>মোট</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`
          : ""
      }
      <table class="summary">
        ${rows ? line("সাবটোটাল", fmt(c.subtotal)) : ""}
        ${c.discount > 0 ? line("ছাড় (-)", fmt(c.discount)) : ""}
        ${c.prevDue > 0 ? line("পূর্বের বাকি (+)", fmt(c.prevDue)) : ""}
        ${line("সর্বমোট", fmt(c.total))}
        ${c.paid > 0 ? line("জমা (-)", fmt(c.paid)) : ""}
        ${line("বাকি", fmt(c.due), "total")}
      </table>
      ${memo.note ? `<p class="note">নোট: ${esc(memo.note)}</p>` : ""}
      <div class="sign"><span>গ্রাহকের স্বাক্ষর</span><span>কর্তৃপক্ষ</span></div>
    </body></html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

// ---------- small UI atoms ----------
const Tab = ({ index, label, sub, onClick }) => (
  <button onClick={onClick} className="w-full flex items-stretch text-left group">
    <div
      className="flex items-center justify-center shrink-0"
      style={{ width: 56, background: "var(--navy-bg)", color: "var(--on-navy)", fontFamily: "'Noto Sans Bengali', sans-serif", fontSize: 20 }}
    >
      {index}
    </div>
    <div
      className="flex-1 flex items-center justify-between px-4 py-4 border-b transition-colors group-active:bg-[color:var(--active)]"
      style={{ borderColor: "var(--line)" }}
    >
      <span style={{ fontFamily: "'Noto Sans Bengali', sans-serif", fontSize: 19, color: "var(--ink)" }}>{label}</span>
      {sub && (
        <span style={{ fontFamily: "'Noto Sans Bengali', sans-serif", fontSize: 13, color: "var(--navy-fg)" }}>{sub}</span>
      )}
    </div>
  </button>
);

// মেনু বাটন — items: [{ label, icon, onClick, disabled }]
const HamburgerMenu = ({ items, icon, buttonStyle, buttonClass, align = "left", accent = "var(--navy-fg)" }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={align === "right" ? "relative" : "relative -ml-1"}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={buttonClass || "p-1 active:opacity-60"}
        style={buttonStyle}
        aria-label="মেনু"
        aria-expanded={open}
      >
        {icon || <Menu size={22} />}
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 30 }}
        />
      )}
      {open && (
        <div
          className="absolute rounded-xl overflow-hidden"
          style={{
            top: "100%",
            marginTop: 10,
            [align === "right" ? "right" : "left"]: 0,
            minWidth: 255,
            background: "var(--card)",
            border: `1px solid ${accent}`,
            boxShadow: "0 10px 26px rgba(31,47,92,0.22)",
            zIndex: 40,
          }}
        >
          {items.map((it, i) => (
            <button
              key={it.label}
              disabled={it.disabled}
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left rk-active"
              style={{ color: accent, fontSize: 14, fontWeight: 600, borderTop: i > 0 ? "1px solid var(--line2)" : "none", opacity: it.disabled ? 0.55 : 1 }}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ThemeButton = ({ variant = "header" }) => {
  const [dark, setDark] = useState(() => (typeof document !== "undefined" ? document.documentElement.classList.contains("rk-dark") : false));
  useEffect(() => {
    const h = () => setDark(document.documentElement.classList.contains("rk-dark"));
    window.addEventListener("rk-theme", h);
    return () => window.removeEventListener("rk-theme", h);
  }, []);
  const card = variant === "card";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? "লাইট মোড চালু করুন" : "ডার্ক মোড চালু করুন"}
      className="flex items-center justify-center rounded-full active:opacity-70 shrink-0"
      style={
        card
          ? { width: 32, height: 32, background: "var(--card)", color: "var(--navy-fg)", border: "1px solid var(--line)" }
          : { width: 30, height: 30, background: "rgba(255,255,255,0.18)", color: "var(--on-navy)" }
      }
    >
      {dark ? <Sun size={card ? 15 : 14} /> : <Moon size={card ? 15 : 14} />}
    </button>
  );
};

// নামের ঘর — ভিতরে ডাউন অ্যারো; চাপলে নামের তালিকা + "নতুন নাম যোগ করুন"
const NameInput = ({ value, onValue, names, customNames, onAdd, onRemove, placeholder, inputClass = "px-2 py-2", inputStyle }) => {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [pos, setPos] = useState(null);
  const boxRef = useRef(null);
  const listRef = useRef(null);

  const openList = () => {
    const el = boxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(Math.max(r.width, 230), vw - 16);
    const left = Math.max(8, Math.min(r.left, vw - width - 8));
    const below = vh - r.bottom;
    const up = below < 260 && r.top > below;
    setPos(
      up
        ? { left, width, bottom: vh - r.top + 2, maxH: Math.max(150, Math.min(280, r.top - 12)) }
        : { left, width, top: r.bottom + 2, maxH: Math.max(150, Math.min(280, below - 12)) }
    );
    setAdding(false);
    setNewName("");
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const inside = (t) => (boxRef.current && boxRef.current.contains(t)) || (listRef.current && listRef.current.contains(t));
    const outside = (e) => {
      if (!inside(e.target)) setOpen(false);
    };
    const onScroll = (e) => {
      if (!(listRef.current && listRef.current.contains(e.target))) setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener("mousedown", outside);
    document.addEventListener("touchstart", outside);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("touchstart", outside);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const submit = async () => {
    const nm = newName.trim();
    if (!nm) return;
    await onAdd(nm);
    setAdding(false);
    setNewName("");
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="flex items-center min-w-0">
      <input
        value={value}
        onChange={(e) => onValue(e.target.value)}
        placeholder={placeholder}
        className={`min-w-0 flex-1 bg-transparent outline-none ${inputClass}`}
        style={inputStyle}
      />
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openList())}
        aria-label="নামের তালিকা খুলুন"
        className="shrink-0 px-1 py-2 active:opacity-60"
        style={{ color: "var(--navy-fg)" }}
      >
        <ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={listRef}
            className="rounded-xl overflow-y-auto"
            style={{
              position: "fixed",
              zIndex: 120,
              left: pos.left,
              width: pos.width,
              ...(pos.top !== undefined ? { top: pos.top } : { bottom: pos.bottom }),
              maxHeight: pos.maxH,
              border: "1px solid var(--navy-line)",
              background: "var(--card)",
              boxShadow: "0 8px 22px rgba(0,0,0,0.28)",
              fontFamily: "'Noto Sans Bengali', sans-serif",
            }}
          >
            {names.map((n, i) => (
              <div key={n} className="flex items-center" style={{ borderTop: i > 0 ? "1px solid var(--line2)" : "none" }}>
                <button
                  type="button"
                  onClick={() => {
                    onValue(n);
                    setOpen(false);
                  }}
                  className="flex-1 text-left px-3 py-2 rk-active"
                  style={{ fontSize: 13.5, color: "var(--ink)" }}
                >
                  {n}
                </button>
                {customNames.includes(n) && (
                  <button
                    type="button"
                    onClick={() => onRemove(n)}
                    className="px-3 py-2 active:opacity-60"
                    style={{ color: "var(--red)", fontSize: 16, lineHeight: 1 }}
                    aria-label={`${n} মুছুন`}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {adding ? (
              <div className="flex items-center gap-1.5 px-2 py-2" style={{ borderTop: "1px solid var(--navy-line)" }}>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder="নতুন নামটা লিখুন"
                  className="min-w-0 flex-1 px-2 py-1.5 rounded-xl outline-none"
                  style={{ fontSize: 13.5, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)" }}
                />
                <button
                  type="button"
                  onClick={submit}
                  className="px-3 py-1.5 rounded-xl active:opacity-80"
                  style={{ background: "var(--navy-bg)", color: "#FFFFFF", fontSize: 13, fontWeight: 700 }}
                >
                  যোগ
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="w-full text-left px-3 py-2.5 rk-active"
                style={{ borderTop: "1px solid var(--navy-line)", color: "var(--navy-fg)", fontSize: 13.5, fontWeight: 700 }}
              >
                + নতুন নাম যোগ করুন
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

const HeaderBar = ({ title, onBack, editMode, onToggleMode, menuItems }) => (
  <div className="flex items-center gap-3 px-4 py-4 sticky top-0 z-10" style={{ background: "var(--navy-bg)", color: "var(--on-navy)" }}>
    {menuItems && <HamburgerMenu items={menuItems} />}
    {onBack && (
      <button onClick={onBack} className="p-1 -ml-1 active:opacity-60">
        <ChevronLeft size={22} />
      </button>
    )}
    <BookOpen size={18} style={{ opacity: 0.85 }} />
    <h1 className="flex-1" style={{ fontFamily: "'Noto Sans Bengali', sans-serif", fontSize: 19 }}>{title}</h1>
    <ThemeButton />
    {onToggleMode && (
      <button
        onClick={onToggleMode}
        className="flex items-center gap-1 px-2 py-1 rounded-xl active:opacity-70"
        style={{ background: "rgba(255,255,255,0.18)", fontSize: 11 }}
      >
        {editMode ? <Pencil size={13} /> : <Eye size={13} />}
        {editMode ? "এডিট মোড" : "ভিউ মোড"}
      </button>
    )}
  </div>
);

const Th = ({ children, right, small }) => (
  <div
    className={`${small ? "px-0.5" : "px-2"} py-2 whitespace-nowrap ${right ? "text-right" : "text-left"}`}
    style={{ color: "var(--on-navy)", fontSize: small ? 10.5 : 12, fontWeight: 600 }}
  >
    {children}
  </div>
);

const SectionTitle = ({ label }) => (
  <div style={{ fontFamily: "'Noto Sans Bengali', sans-serif", fontSize: 16, color: "var(--navy-fg)", marginBottom: 8, paddingLeft: 2 }}>
    {label}
  </div>
);

const SummaryRow = ({ label, value, negative, strong, muted, editableHint }) => (
  <div
    className="grid grid-cols-[1fr,110px] items-center px-3 leading-none"
    style={{
      background: strong ? "var(--navy-bg)" : "var(--card)",
      borderTop: "1px solid var(--line2)",
      paddingTop: muted ? 2 : 3,
      paddingBottom: muted ? 2 : 3,
    }}
  >
    <div>
      <span
        style={{
          fontFamily: "'Noto Sans Bengali', sans-serif",
          fontWeight: muted ? 600 : 700,
          fontSize: strong ? 16 : muted ? 11 : 14.5,
          color: strong ? "var(--on-navy)" : muted ? "var(--gray3)" : "var(--ink)",
        }}
      >
        {label}
      </span>
      {editableHint && <div style={{ fontSize: 8, color: "var(--gray2)", marginTop: 1, lineHeight: 1 }}>{editableHint}</div>}
    </div>
    <div
      className="text-right"
      style={{
        fontSize: strong ? 19 : muted ? 11.5 : 15.5,
        fontWeight: muted ? 600 : 700,
        color: strong ? "var(--on-navy)" : negative ? "var(--red)" : muted ? "var(--gray3)" : "var(--ink)",
      }}
    >
      {value}
    </div>
  </div>
);

// নামের তালিকা — ডাউন অ্যারো চাপলে নিচে নামে, নাম বেছে নিলে সারিতে বসে
const NameDropdown = ({ label, names, customNames, onPick, onAdd, onRemove }) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open]);

  return (
    <div ref={boxRef} className="relative mb-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl active:opacity-80"
        style={{ border: "1px solid var(--line)", background: "var(--card)", color: "var(--navy-fg)", fontSize: 13.5 }}
      >
        <span>{label}</span>
        <ChevronDown size={17} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 z-20 mt-1 rounded-xl overflow-y-auto"
          style={{ maxHeight: 224, border: "1px solid var(--navy-line)", background: "var(--card)", boxShadow: "0 6px 16px rgba(31,47,92,0.18)" }}
        >
          {names.map((n, i) => (
            <div key={n} className="flex items-center" style={{ borderTop: i > 0 ? "1px solid var(--line2)" : "none" }}>
              <button
                type="button"
                onClick={() => {
                  onPick(n);
                  setOpen(false);
                }}
                className="flex-1 text-left px-3 py-2 rk-active"
                style={{ fontSize: 13.5, color: "var(--ink)" }}
              >
                {n}
              </button>
              {customNames.includes(n) && (
                <button
                  type="button"
                  onClick={() => onRemove(n)}
                  className="px-3 py-2 active:opacity-60"
                  style={{ color: "var(--red)", fontSize: 16, lineHeight: 1 }}
                  aria-label={`${n} মুছুন`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onAdd();
            }}
            className="w-full text-left px-3 py-2 rk-active"
            style={{ borderTop: "1px solid var(--navy-line)", color: "var(--navy-fg)", fontSize: 13, fontWeight: 600 }}
          >
            + নতুন নাম যোগ করুন
          </button>
        </div>
      )}
    </div>
  );
};

// ---------- main app ----------
export default function LedgerApp() {
  useLedgerFonts();

  const [view, setView] = useState("years"); // years | dues | memos | ledger | months | days | day
  const [editMode, setEditMode] = useState(false);

  // ---- ছোট বার্তা (টোস্ট), অফলাইন চিহ্ন ----
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = (msg, action) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, action });
    toastTimer.current = setTimeout(() => setToast(null), action ? 9000 : 3000);
  };
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [pending, setPending] = useState(0);
  const [saleSheetOpen, setSaleSheetOpen] = useState(false); // বিক্রির পুরো ফর্ম (ভাসমান বাটন থেকে খোলে)
  useEffect(() => {
    if (!(editMode && view === "days")) setSaleSheetOpen(false);
  }, [editMode, view]);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    setPending(pendingCount());
    const t = setInterval(() => setPending(pendingCount()), 4000);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      clearInterval(t);
    };
  }, []);

  // পুরো অ্যাপ দেখার জন্য পাসওয়ার্ড লক (এডিট মোডের পিন থেকে আলাদা)
  const SITE_PASSWORD_KEY = "sitePassword";
  const [unlocked, setUnlocked] = useState(false);
  const [checkingLock, setCheckingLock] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (localStorage.getItem("siteUnlocked") === "true") {
          setUnlocked(true);
          setCheckingLock(false);
          return;
        }
      } catch (e) {
        /* ignore */
      }
      let stored = null;
      try {
        const res = await storage.get(SITE_PASSWORD_KEY);
        stored = res && res.value;
      } catch (e) {
        /* ignore */
      }
      if (!stored) {
        const newPw = window.prompt(
          "এই অ্যাপ প্রথমবার খোলা হচ্ছে — একটা পাসওয়ার্ড সেট করুন (এটা মনে রাখুন, ভবিষ্যতে সবার জন্য এটাই লাগবে):"
        );
        if (newPw && newPw.trim()) {
          await storage.set(SITE_PASSWORD_KEY, newPw.trim());
          setUnlocked(true);
          try {
            localStorage.setItem("siteUnlocked", "true");
          } catch (e) {
            /* ignore */
          }
        }
        setCheckingLock(false);
        return;
      }
      const entered = window.prompt("পাসওয়ার্ড দিন:");
      if (entered !== null && entered.trim() === stored) {
        setUnlocked(true);
        try {
          localStorage.setItem("siteUnlocked", "true");
        } catch (e) {
          /* ignore */
        }
      }
      setCheckingLock(false);
    })();
  }, []);

  // এডিট/ভিউ মোড এখন এই ব্রাউজারের নিজস্ব পছন্দ (localStorage), Firestore-এ যায় না
  useEffect(() => {
    try {
      if (localStorage.getItem("editMode") === "true") setEditMode(true);
    } catch (e) {
      /* default: view mode */
    }
  }, []);

  // অফলাইনে জমা থাকা সেভগুলো নেট চলে এলে স্বয়ংক্রিয়ভাবে পাঠানো
  useEffect(() => {
    const flush = async () => {
      const n = await flushPendingWrites();
      if (n > 0) showToast(`✅ ${toBn(n)} টা পেন্ডিং সেভ সার্ভারে পাঠানো হয়েছে।`);
    };
    window.addEventListener("online", flush);
    flush();
    return () => window.removeEventListener("online", flush);
  }, []);

  const ADMIN_PIN_KEY = "adminPin";

  const toggleEditMode = async () => {
    if (editMode) {
      setEditMode(false);
      try {
        localStorage.setItem("editMode", "false");
      } catch (e) {
        /* ignore */
      }
      return;
    }
    let stored = null;
    try {
      const res = await storage.get(ADMIN_PIN_KEY);
      stored = res && res.value;
    } catch (e) {
      /* ignore */
    }
    if (!stored) {
      const newPin = window.prompt(
        "প্রথমবার এডিট মোড চালু করছেন — একটা পিন সেট করুন (এটা মনে রাখুন, পরে সবসময় এটাই লাগবে):"
      );
      if (!newPin || !newPin.trim()) return;
      await storage.set(ADMIN_PIN_KEY, newPin.trim());
      setEditMode(true);
      try {
        localStorage.setItem("editMode", "true");
      } catch (e) {
        /* ignore */
      }
      return;
    }
    const entered = window.prompt("এডিট মোড খুলতে পিন দিন:");
    if (entered === null) return;
    if (entered.trim() === stored) {
      setEditMode(true);
      try {
        localStorage.setItem("editMode", "true");
      } catch (e) {
        /* ignore */
      }
    } else {
      window.alert("পিন ভুল হয়েছে।");
    }
  };

  const [year, setYear] = useState(null);
  const [month, setMonth] = useState(null);

  const [allDues, setAllDues] = useState([]);
  const [allDuesLoading, setAllDuesLoading] = useState(false);
  const [todaySummary, setTodaySummary] = useState(null);
  const [todayLoading, setTodayLoading] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerData, setLedgerData] = useState([]);
  const [ledgerQuery, setLedgerQuery] = useState("");
  const [paymentInputs, setPaymentInputs] = useState({});
  const [payingKey, setPayingKey] = useState(null);
  const settlingRef = useRef(false); // ডাবল/ট্রিপল ট্যাপ ঠেকানোর লক
  const addingDueRef = useRef(false);
  const [backingUp, setBackingUp] = useState(false);

  // ---- কাস্টমার মেমো ও সরাসরি বাকি ----
  const [memos, setMemos] = useState([]);
  const [memosLoading, setMemosLoading] = useState(false);
  const [memoQuery, setMemoQuery] = useState("");
  const [memoDraft, setMemoDraft] = useState(null); // null হলে লিস্ট/ডিটেইল দেখায়
  const [memoView, setMemoView] = useState(null); // যে মেমো খুলে দেখা হচ্ছে
  const [memoSaving, setMemoSaving] = useState(false);
  const [newDue, setNewDue] = useState({ name: "", amount: "", date: "", phone: "" });
  const [dueFilter, setDueFilter] = useState("all"); // all | old7 | old15
  const [openDue, setOpenDue] = useState(null);
  const [custQuery, setCustQuery] = useState("");
  const [custSel, setCustSel] = useState(null);
  const openMemoRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const [ledgerType, setLedgerType] = useState("all");
  const [trash, setTrash] = useState([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [shop, setShop] = useState(DEFAULT_SHOP);
  const [shopDraft, setShopDraft] = useState(null);
  const [addingDue, setAddingDue] = useState(false);

  const [yearStats, setYearStats] = useState({ income: 0, expense: 0 });
  const [yearStatsLoading, setYearStatsLoading] = useState(false);

  // ---- মাস-ভিত্তিক ইউনিফাইড ভিউ (উপরে এডিট প্যানেল + নিচে প্রতিদিনের বক্স) ----
  const [monthEntries, setMonthEntries] = useState({});
  const [monthLoading, setMonthLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const emptyExpenseDraft = () => ({ id: null, name: "", amount: "" });
  const emptySaleDraft = () => ({ id: null, name: "", height: "", weight: "", qty: "", price: "", due: "", discount: "" });

  const getTodayDefaultDay = (y, m) => {
    const now = new Date();
    if (now.getFullYear() === y && now.getMonth() + 1 === m) return now.getDate();
    return 1;
  };
  const _today = new Date();
  const _initYear = YEARS.includes(_today.getFullYear()) ? _today.getFullYear() : YEARS[0];
  const _initMonth = _today.getMonth() + 1;

  const [draftDay, setDraftDay] = useState(getTodayDefaultDay(_initYear, _initMonth));
  const [draftMonth, setDraftMonth] = useState(_initMonth);
  const [draftYear, setDraftYear] = useState(_initYear);
  const [expenseDrafts, setExpenseDrafts] = useState([emptyExpenseDraft()]);
  const [saleDrafts, setSaleDrafts] = useState([emptySaleDraft()]);

  // কাস্টম নামের তালিকা (Firestore-এ সেভ থাকে, সবাই একই তালিকা দেখে)
  const [customSaleNames, setCustomSaleNames] = useState([]);
  const [customExpenseNames, setCustomExpenseNames] = useState([]);

  useEffect(() => {
    (async () => {
      const a = await kget("presets:sale");
      if (a) {
        try {
          setCustomSaleNames(JSON.parse(a));
        } catch (e) {}
      }
      const b = await kget("presets:expense");
      if (b) {
        try {
          setCustomExpenseNames(JSON.parse(b));
        } catch (e) {}
      }
    })();
  }, []);

  const allSaleNames = [...DEFAULT_SALE_NAMES, ...customSaleNames];
  const allExpenseNames = [...DEFAULT_EXPENSE_NAMES, ...customExpenseNames];

  const addPresetName = async (kind, rawName) => {
    const raw = rawName !== undefined ? rawName : window.prompt(kind === "sale" ? "বিক্রির নতুন নাম লিখুন (যেমন: পোস্টার):" : "খরচের নতুন নাম লিখুন (যেমন: গাড়ি ভাড়া):");
    const name = (raw || "").trim();
    if (!name) return null;
    const existing = kind === "sale" ? allSaleNames : allExpenseNames;
    if (existing.includes(name)) return name;
    const next = [...(kind === "sale" ? customSaleNames : customExpenseNames), name];
    if (kind === "sale") setCustomSaleNames(next);
    else setCustomExpenseNames(next);
    await kset(kind === "sale" ? "presets:sale" : "presets:expense", JSON.stringify(next));
    return name;
  };

  const removePresetName = async (kind, name) => {
    const next = (kind === "sale" ? customSaleNames : customExpenseNames).filter((n) => n !== name);
    if (kind === "sale") setCustomSaleNames(next);
    else setCustomExpenseNames(next);
    await kset(kind === "sale" ? "presets:sale" : "presets:expense", JSON.stringify(next));
  };

  const [editingExpenseOrigin, setEditingExpenseOrigin] = useState(null);
  const [editingSaleOrigin, setEditingSaleOrigin] = useState(null);

  const updateExpenseDraft = (idx, field, val) =>
    setExpenseDrafts((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
  const updateSaleDraft = (idx, field, val) =>
    setSaleDrafts((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
  const removeExpenseDraftRow = (idx) =>
    setExpenseDrafts((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== idx) : [emptyExpenseDraft()]));
  const removeSaleDraftRow = (idx) =>
    setSaleDrafts((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== idx) : [emptySaleDraft()]));

  const isMeaningfulExpense = (e) => (e.name && e.name.trim()) || (e.amount !== "" && e.amount !== null && e.amount !== undefined);
  const isMeaningfulItem = (it) =>
    (it.name && it.name.trim()) || it.height !== "" || it.weight !== "" || it.qty !== "" || it.price !== "" || it.due !== "" || it.discount !== "";

  async function computeDayFull(y, m, d) {
    const data = await loadDay(y, m, d);
    const expenses = data.expenses.filter(isMeaningfulExpense);
    const items = data.items.filter(isMeaningfulItem);
    const opening = data.openingOverride ?? (await findOpeningBalance(y, m, d));
    const itemsTotal = items.reduce((s, it) => s + (netTotal(it) || 0), 0);
    const duesTotalDay = items.reduce((s, it) => s + (isNaN(num(it.due)) ? 0 : num(it.due)), 0);
    const discountTotalDay = items.reduce((s, it) => s + (isNaN(num(it.discount)) ? 0 : num(it.discount)), 0);
    const expenseTotal = expenses.reduce((s, e) => s + (isNaN(num(e.amount)) ? 0 : num(e.amount)), 0);
    const computedTotalMoney = opening + itemsTotal;
    const totalMoney =
      data.totalOverride !== null && data.totalOverride !== "" && !isNaN(num(data.totalOverride))
        ? num(data.totalOverride)
        : computedTotalMoney;
    const remaining = totalMoney - expenseTotal;
    return {
      expenses,
      items,
      openingOverride: data.openingOverride,
      totalOverride: data.totalOverride,
      opening,
      itemsTotal,
      duesTotalDay,
      discountTotalDay,
      expenseTotal,
      totalMoney,
      remaining,
    };
  }

  async function recomputeAndSaveDay(y, m, d, rawData) {
    const expenses = rawData.expenses.filter(isMeaningfulExpense);
    const items = rawData.items.filter(isMeaningfulItem);
    await saveDay(y, m, d, { expenses, items, openingOverride: rawData.openingOverride ?? null, totalOverride: rawData.totalOverride ?? null });
    const opening = (rawData.openingOverride ?? null) !== null ? num(rawData.openingOverride) : await findOpeningBalance(y, m, d);
    const itemsTotal = items.reduce((s, it) => s + (netTotal(it) || 0), 0);
    const expenseTotal = expenses.reduce((s, e) => s + (isNaN(num(e.amount)) ? 0 : num(e.amount)), 0);
    const computedTotalMoney = opening + itemsTotal;
    const totalMoney =
      (rawData.totalOverride ?? null) !== null && rawData.totalOverride !== "" && !isNaN(num(rawData.totalOverride))
        ? num(rawData.totalOverride)
        : computedTotalMoney;
    const remaining = totalMoney - expenseTotal;
    const dueRows = items
      .filter((it) => dueRemaining(it) > 0)
      .map((it) => ({ id: it.id, name: it.name || "(নামহীন)", amount: dueRemaining(it) }));
    await saveDuesForDate(y, m, d, dueRows);
    await saveYearStatsForDate(y, m, d, itemsTotal, expenseTotal, remaining);
  }

  async function settlePayment(dueEntry, py, pm, pd, amount) {
    // ১. আসল বিক্রির 'বাকি' থেকে বাদ দেওয়া
    const origRaw = await loadDay(dueEntry.y, dueEntry.m, dueEntry.d);
    // 'বাকি' সংখ্যাটা বদলাই না, তাই আসল দিনের আয় একই থাকে। শুধু 'শোধ হয়েছে' জমা রাখি।
    const items = origRaw.items.map((it) => {
      if (it.id === dueEntry.id) {
        const paidSoFar = Math.min(num(it.due) || 0, (num(it.duePaid) || 0) + amount);
        return { ...it, duePaid: String(paidSoFar) };
      }
      return it;
    });
    await recomputeAndSaveDay(dueEntry.y, dueEntry.m, dueEntry.d, { ...origRaw, items });

    // ২. পরিশোধের টাকা যেই তারিখে জমা হলো, সেই তারিখে আয় হিসেবে যোগ করা
    const payRaw = await loadDay(py, pm, pd);
    const newItem = {
      id: emptyRowId(),
      name: `${dueEntry.name} (পরিশোধ)`,
      height: "",
      weight: "",
      qty: "1",
      price: String(amount),
      due: "",
      discount: "",
    };
    const items2 = [...payRaw.items.filter(isMeaningfulItem), newItem];
    await recomputeAndSaveDay(py, pm, pd, { ...payRaw, items: items2 });
  }

  const phoneOf = (name, entry) => {
    if (entry && entry.phone) return entry.phone;
    const k = custKey(name);
    const mm = memos.find((x) => custKey(x.customer) === k && x.phone);
    return mm ? mm.phone : "";
  };

  const handleSharePdf = async (doc, filename, text) => {
    if (sharing) return;
    setSharing(true);
    showToast("PDF তৈরি হচ্ছে…");
    try {
      const r = await sharePdf(doc, filename, text);
      if (r === "downloaded") showToast("PDF ডাউনলোড হয়েছে — WhatsApp-এ অ্যাটাচ করে পাঠান");
      else setToast(null);
    } catch (e) {
      window.alert("PDF বানানো যায়নি — প্রিন্ট বাটন থেকে PDF সেভ করে নিন।");
    } finally {
      setSharing(false);
    }
  };

  const todayInputValue = () => {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  };

  const handleSettlePayment = async (dueEntry, key) => {
    const input = paymentInputs[key] || {};
    const amount = num(input.amount);
    if (isNaN(amount) || amount <= 0) return;
    if (settlingRef.current) return; // আগের ক্লিকের কাজ চলছে — আবার চলবে না
    settlingRef.current = true;
    const dateStr = input.date || todayInputValue();
    const [py, pm, pd] = dateStr.split("-").map(Number);
    setPayingKey(key);
    try {
      if (dueEntry.manual) await settleManualDue(dueEntry, py, pm, pd, amount);
      else await settlePayment(dueEntry, py, pm, pd, amount);
      setPaymentInputs((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setAllDuesLoading(true);
      setAllDues(await loadAllDuesFlat());
      setAllDuesLoading(false);
      showToast(`✓ ৳${toBn(fmt(amount))} জমা হয়েছে`);
    } finally {
      settlingRef.current = false;
      setPayingKey(null);
    }
  };

  // সরাসরি যোগ করা বাকির পরিশোধ: বাকি কমে, আর টাকাটা পরিশোধের তারিখে আয় হিসেবে বসে
  async function settleManualDue(dueEntry, py, pm, pd, amount) {
    const remaining = Math.max(0, (dueEntry.amount || 0) - amount);
    const list = await loadManualDues();
    const next = list
      .map((x) => (x.id === dueEntry.id ? { ...x, amount: remaining } : x))
      .filter((x) => !(x.id === dueEntry.id && x.amount <= 0));
    await saveManualDues(next);

    // মেমো থেকে আসা বাকি হলে মেমোর জমাও বাড়ে
    if (dueEntry.memoId) {
      const ml = await loadMemosYear(dueEntry.memoY);
      await saveMemosYear(
        dueEntry.memoY,
        ml.map((x) =>
          x.id === dueEntry.memoId
            ? { ...x, paid: String(numOr0(x.paid) + amount), dueListId: remaining > 0 ? x.dueListId : null }
            : x
        )
      );
    }

    const payRaw = await loadDay(py, pm, pd);
    const newItem = {
      id: emptyRowId(),
      name: `${dueEntry.name} (পরিশোধ)`,
      height: "",
      weight: "",
      qty: "1",
      price: String(amount),
      due: "",
      discount: "",
    };
    await recomputeAndSaveDay(py, pm, pd, { ...payRaw, items: [...payRaw.items.filter(isMeaningfulItem), newItem] });
  }

  const handleAddManualDue = async () => {
    const name = newDue.name.trim();
    const amount = num(newDue.amount);
    if (!name || isNaN(amount) || amount <= 0) {
      window.alert("নাম আর বাকির টাকা দিন।");
      return;
    }
    if (addingDueRef.current) return;
    addingDueRef.current = true;
    const [yy, mm, dd] = (newDue.date || todayInputValue()).split("-").map(Number);
    setAddingDue(true);
    try {
      const list = await loadManualDues();
      list.push({ id: emptyRowId(), y: yy, m: mm, d: dd, name, amount, ...((newDue.phone || "").trim() ? { phone: newDue.phone.trim() } : {}) });
      const ok = await saveManualDues(list);
      if (!ok) window.alert("সার্ভারে সেভ হয়নি, তবে বাকি ফোনে জমা আছে — নেট এলে স্বয়ংক্রিয়ভাবে পাঠানো হবে। হারাবে না।");
      setNewDue({ name: "", amount: "", date: "", phone: "" });
      setAllDues(await loadAllDuesFlat());
      if (ok) showToast("✓ বাকি যোগ হয়েছে");
    } finally {
      addingDueRef.current = false;
      setAddingDue(false);
    }
  };

  const handleDeleteManualDue = async (e) => {
    if (!window.confirm(`${e.name} এর বাকি এন্ট্রিটা মুছে ফেলবেন?`)) return;
    const cleanDue = { ...e };
    delete cleanDue.manual;
    const tItem = await addToTrash({ kind: "due", label: `${e.name} — বাকি ৳${fmt(e.amount)}`, y: e.y, m: e.m, d: e.d, data: cleanDue });
    const list = (await loadManualDues()).filter((x) => x.id !== e.id);
    await saveManualDues(list);
    if (e.memoId) {
      const ml = await loadMemosYear(e.memoY);
      await saveMemosYear(e.memoY, ml.map((x) => (x.id === e.memoId ? { ...x, dueListId: null } : x)));
    }
    setAllDues(await loadAllDuesFlat());
    showToast("বাকি এন্ট্রি মুছে ফেলা হয়েছে", { label: "ফিরিয়ে আনুন", fn: () => restoreTrash(tItem) });
  };

  // ---- মেমো ----
  const refreshMemos = async () => {
    setMemosLoading(true);
    const all = await loadAllMemos();
    all.sort((a, b) => b.y - a.y || b.m - a.m || b.d - a.d || (b.no || 0) - (a.no || 0));
    setMemos(all);
    setMemosLoading(false);
  };

  const startNewMemo = () => {
    const now = new Date();
    const y = YEARS.includes(now.getFullYear()) ? now.getFullYear() : YEARS[0];
    setMemoDraft(newMemoDraft(y, now.getMonth() + 1, now.getDate()));
    setMemoView(null);
  };
  const startEditMemo = (memo) => {
    setMemoDraft({ ...JSON.parse(JSON.stringify(memo)), origY: memo.y, listDue: !!memo.dueListId });
    setMemoView(null);
  };
  const updateMemoField = (field, val) => setMemoDraft((dr) => ({ ...dr, [field]: val }));
  const setMemoDate = (field, val) =>
    setMemoDraft((dr) => {
      const next = { ...dr, [field]: Number(val) };
      next.d = Math.min(next.d, daysInMonth(next.y, next.m));
      return next;
    });
  const onMemoCustomerChange = (val) =>
    setMemoDraft((dr) => {
      const next = { ...dr, customer: val };
      if (!dr.phone && !dr.address) {
        const prev = memos.find((x) => x.customer === val);
        if (prev) {
          next.phone = prev.phone || "";
          next.address = prev.address || "";
        }
      }
      return next;
    });
  const updateMemoItem = (idx, field, val) =>
    setMemoDraft((dr) => ({ ...dr, items: dr.items.map((it, i) => (i === idx ? { ...it, [field]: val } : it)) }));
  const addMemoItem = () => setMemoDraft((dr) => ({ ...dr, items: [...dr.items, newMemoItem()] }));
  const removeMemoItem = (idx) =>
    setMemoDraft((dr) => ({ ...dr, items: dr.items.length > 1 ? dr.items.filter((_, i) => i !== idx) : [newMemoItem()] }));
  const applyMemoItemPreset = (name) =>
    setMemoDraft((dr) => {
      const i = dr.items.findIndex((r) => !r.name);
      if (i >= 0) return { ...dr, items: dr.items.map((r, j) => (j === i ? { ...r, name } : r)) };
      return { ...dr, items: [...dr.items, { ...newMemoItem(), name }] };
    });

  const handleSaveMemo = async () => {
    const draft = memoDraft;
    if (!draft) return;
    const customer = draft.customer.trim();
    const items = draft.items.filter(memoItemUsed).map((it) => ({ ...it, name: (it.name || "").trim() }));
    const calc = memoCalc({ ...draft, items });
    if (!customer) {
      window.alert("কাস্টমারের নাম লিখুন।");
      return;
    }
    if (items.length === 0 && calc.prevDue <= 0) {
      window.alert("অন্তত একটা আইটেম লিখুন, নয়তো শুধু বাকির জন্য 'পূর্বের বাকি'-তে টাকা দিন।");
      return;
    }
    setMemoSaving(true);
    try {
      const all = await loadAllMemos();
      const maxNo = all.reduce((s, x) => Math.max(s, x.no || 0), 0);
      const listId = draft.listDue && calc.due > 0 ? draft.dueListId || emptyRowId() : null;
      const record = {
        id: draft.id || emptyRowId(),
        no: draft.no || maxNo + 1,
        y: draft.y,
        m: draft.m,
        d: draft.d,
        customer,
        phone: (draft.phone || "").trim(),
        address: (draft.address || "").trim(),
        items,
        discount: draft.discount,
        prevDue: draft.prevDue,
        paid: draft.paid,
        note: (draft.note || "").trim(),
        dueListId: listId,
      };

      const yearList = await loadMemosYear(record.y);
      const at = yearList.findIndex((x) => x.id === record.id);
      if (at >= 0) yearList[at] = record;
      else yearList.push(record);
      const ok = await saveMemosYear(record.y, yearList);
      if (!ok) window.alert("সার্ভারে সেভ হয়নি, তবে মেমো ফোনে জমা আছে — নেট এলে স্বয়ংক্রিয়ভাবে পাঠানো হবে। হারাবে না।");
      // তারিখের সন বদলালে আগের সনের লিস্ট থেকে সরানো
      if (draft.id && draft.origY && draft.origY !== record.y) {
        const oldList = (await loadMemosYear(draft.origY)).filter((x) => x.id !== record.id);
        await saveMemosYear(draft.origY, oldList);
      }

      if (listId) await syncMemoDue(record, calc.due);
      else if (draft.dueListId) await syncMemoDue({ ...record, dueListId: draft.dueListId }, 0);

      setMemoDraft(null);
      setMemoView(record);
      await refreshMemos();
      if (ok) showToast("✓ মেমো সেভ হয়েছে");
    } finally {
      setMemoSaving(false);
    }
  };

  const handleDeleteMemo = async (memo) => {
    if (!window.confirm(`${memo.customer} এর মেমো নং ${toBn(memo.no)} মুছে ফেলবেন?`)) return;
    const tItem = await addToTrash({ kind: "memo", label: `${memo.customer} — মেমো নং ${toBn(memo.no)}`, y: memo.y, m: memo.m, d: memo.d, data: memo });
    const list = (await loadMemosYear(memo.y)).filter((x) => x.id !== memo.id);
    await saveMemosYear(memo.y, list);
    if (memo.dueListId) await syncMemoDue(memo, 0);
    setMemoView(null);
    await refreshMemos();
    showToast("মেমো মুছে ফেলা হয়েছে", { label: "ফিরিয়ে আনুন", fn: () => restoreTrash(tItem) });
  };

  async function loadMonthEntries(y, m) {
    const n = daysInMonth(y, m);
    const days = Array.from({ length: n }, (_, i) => i + 1);
    const results = await Promise.all(days.map((d) => computeDayFull(y, m, d)));
    const obj = {};
    days.forEach((d, i) => {
      obj[d] = results[i];
    });
    return obj;
  }

  const printMonthReport = (y, m, entries) => {
    const win = window.open("", "_blank");
    if (!win) return;
    const days = Object.keys(entries)
      .map(Number)
      .sort((a, b) => a - b);
    const rows = days
      .map((d) => {
        const e = entries[d];
        return `<tr><td>${toBn(d)}</td><td style="text-align:right">${fmt(e.itemsTotal)}</td><td style="text-align:right">${fmt(
          e.expenseTotal
        )}</td><td style="text-align:right">${fmt(e.remaining)}</td></tr>`;
      })
      .join("");
    const totalIncome = days.reduce((s, d) => s + entries[d].itemsTotal, 0);
    const totalExpense = days.reduce((s, d) => s + entries[d].expenseTotal, 0);
    win.document.write(`
      <html><head><title>${MONTH_NAMES[m - 1]} ${y} - R.K Advertising</title>
      <meta charset="utf-8" />
      <style>
        body{font-family:'Noto Sans Bengali',sans-serif;padding:24px;color:#1B2340;}
        h1{color:#1F2F5C;font-size:18px;margin-bottom:2px;}
        p.sub{color:#6B7390;font-size:12px;margin-top:0;}
        table{width:100%;border-collapse:collapse;margin-top:14px;}
        th,td{border:1px solid #D9DDEB;padding:6px 10px;font-size:13px;}
        th{background:#1F2F5C;color:#fff;text-align:left;}
        tfoot td{font-weight:bold;background:#E8EBF5;}
        ${LETTERHEAD_CSS}
      .close-btn{position:fixed;top:10px;right:10px;width:42px;height:42px;border-radius:50%;border:none;background:#1F2F5C;color:#fff;font-size:22px;line-height:1;cursor:pointer;z-index:99;box-shadow:0 2px 8px rgba(0,0,0,.3);}@media print{.close-btn{display:none !important;}}</style>
      </head><body><button class="close-btn" onclick="window.close()" aria-label="বন্ধ করুন">✕</button>
      ${shopLetterheadHtml()}
      <p class="sub">মাসিক রিপোর্ট — ${MONTH_NAMES[m - 1]}, ${toBn(y)}</p>
      <table>
        <thead><tr><th>তারিখ</th><th>আয়</th><th>খরচ</th><th>অবশিষ্ট</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td>মোট</td><td>${fmt(totalIncome)}</td><td>${fmt(totalExpense)}</td><td>${fmt(
      totalIncome - totalExpense
    )}</td></tr></tfoot>
      </table>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const resetDraft = (y, m) => {
    setDraftDay(getTodayDefaultDay(y, m));
    setDraftMonth(m);
    setDraftYear(y);
    setExpenseDrafts([emptyExpenseDraft()]);
    setSaleDrafts([emptySaleDraft()]);
    setEditingExpenseOrigin(null);
    setEditingSaleOrigin(null);
  };

  const loadClickedExpense = (y, m, d, row) => {
    setDraftYear(y);
    setDraftMonth(m);
    setDraftDay(d);
    setExpenseDrafts([{ id: row.id, name: row.name, amount: row.amount }]);
    setEditingExpenseOrigin({ y, m, d, id: row.id });
  };

  const loadClickedSale = (y, m, d, row) => {
    setDraftYear(y);
    setDraftMonth(m);
    setDraftDay(d);
    setSaleSheetOpen(true);
    setSaleDrafts([
      {
        id: row.id,
        name: row.name,
        height: row.height,
        weight: row.weight,
        qty: row.qty,
        price: row.price,
        due: row.due,
        duePaid: row.duePaid ?? "",
        discount: row.discount,
      },
    ]);
    setEditingSaleOrigin({ y, m, d, id: row.id });
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const ty = draftYear;
      const tm = draftMonth;
      const td = draftDay;
      const touched = new Set([`${ty}-${tm}-${td}`]);

      const meaningfulExpenseDrafts = expenseDrafts.filter(isMeaningfulExpense);
      const meaningfulSaleDrafts = saleDrafts.filter(isMeaningfulItem);

      // --- খরচ ড্রাফট(গুলো) সেভ ---
      if (meaningfulExpenseDrafts.length > 0) {
        const targetRaw = await loadDay(ty, tm, td);
        let expensesArr = targetRaw.expenses.filter(isMeaningfulExpense);
        const moved =
          editingExpenseOrigin && (editingExpenseOrigin.y !== ty || editingExpenseOrigin.m !== tm || editingExpenseOrigin.d !== td);

        meaningfulExpenseDrafts.forEach((draftRow) => {
          const isTheEditedRow = editingExpenseOrigin && draftRow.id === editingExpenseOrigin.id;
          if (isTheEditedRow && !moved) {
            expensesArr = expensesArr.map((r) => (r.id === editingExpenseOrigin.id ? { ...draftRow, id: r.id } : r));
          } else {
            expensesArr = [...expensesArr, { ...draftRow, id: draftRow.id && !isTheEditedRow ? draftRow.id : emptyRowId() }];
          }
        });
        await recomputeAndSaveDay(ty, tm, td, { ...targetRaw, expenses: expensesArr });

        if (moved) {
          const originRaw = await loadDay(editingExpenseOrigin.y, editingExpenseOrigin.m, editingExpenseOrigin.d);
          const originExpenses = originRaw.expenses.filter((r) => isMeaningfulExpense(r) && r.id !== editingExpenseOrigin.id);
          await recomputeAndSaveDay(editingExpenseOrigin.y, editingExpenseOrigin.m, editingExpenseOrigin.d, {
            ...originRaw,
            expenses: originExpenses,
          });
          touched.add(`${editingExpenseOrigin.y}-${editingExpenseOrigin.m}-${editingExpenseOrigin.d}`);
        }
      }

      // --- বিক্রি ড্রাফট(গুলো) সেভ ---
      if (meaningfulSaleDrafts.length > 0) {
        const targetRaw = await loadDay(ty, tm, td);
        let itemsArr = targetRaw.items.filter(isMeaningfulItem);
        const moved = editingSaleOrigin && (editingSaleOrigin.y !== ty || editingSaleOrigin.m !== tm || editingSaleOrigin.d !== td);

        meaningfulSaleDrafts.forEach((draftRow) => {
          const isTheEditedRow = editingSaleOrigin && draftRow.id === editingSaleOrigin.id;
          if (isTheEditedRow && !moved) {
            itemsArr = itemsArr.map((r) => (r.id === editingSaleOrigin.id ? { ...draftRow, id: r.id } : r));
          } else {
            itemsArr = [...itemsArr, { ...draftRow, id: draftRow.id && !isTheEditedRow ? draftRow.id : emptyRowId() }];
          }
        });
        const targetRaw2 = await loadDay(ty, tm, td);
        await recomputeAndSaveDay(ty, tm, td, { ...targetRaw2, expenses: targetRaw2.expenses.filter(isMeaningfulExpense), items: itemsArr });

        if (moved) {
          const originRaw = await loadDay(editingSaleOrigin.y, editingSaleOrigin.m, editingSaleOrigin.d);
          const originItems = originRaw.items.filter((r) => isMeaningfulItem(r) && r.id !== editingSaleOrigin.id);
          await recomputeAndSaveDay(editingSaleOrigin.y, editingSaleOrigin.m, editingSaleOrigin.d, { ...originRaw, items: originItems });
          touched.add(`${editingSaleOrigin.y}-${editingSaleOrigin.m}-${editingSaleOrigin.d}`);
        }
      }

      if (year && month) {
        const refreshed = await loadMonthEntries(year, month);
        setMonthEntries(refreshed);
      }
      resetDraft(year || ty, month || tm);
      if (pendingCount() > 0) window.alert("⚠️ কিছু সেভ এখনো সার্ভারে যায়নি — তবে সব ফোনে জমা আছে, নেট এলে স্বয়ংক্রিয়ভাবে পাঠানো হবে। হারাবে না।");
      else showToast("✓ সেভ হয়েছে");
    } finally {
      setSaving(false);
    }
  };

  const deleteExpenseRow = async (y, m, d, id) => {
    if (!window.confirm("এই খরচের সারিটা মুছে ফেলবেন?")) return;
    const raw = await loadDay(y, m, d);
    const gone = raw.expenses.find((r) => r.id === id);
    const tItem = gone ? await addToTrash({ kind: "expense", label: `${gone.name || "খরচ"} — ৳${fmt(numOr0(gone.amount))}`, y, m, d, data: gone }) : null;
    const expensesArr = raw.expenses.filter((r) => isMeaningfulExpense(r) && r.id !== id);
    await recomputeAndSaveDay(y, m, d, { ...raw, expenses: expensesArr });
    if (year && month) setMonthEntries(await loadMonthEntries(year, month));
    if (tItem) showToast("খরচের সারি মুছে ফেলা হয়েছে", { label: "ফিরিয়ে আনুন", fn: () => restoreTrash(tItem) });
  };

  const deleteSaleRow = async (y, m, d, id) => {
    if (!window.confirm("এই বিক্রির সারিটা মুছে ফেলবেন?")) return;
    const raw = await loadDay(y, m, d);
    const gone = raw.items.find((r) => r.id === id);
    const tItem = gone ? await addToTrash({ kind: "sale", label: `${gone.name || "বিক্রি"} — ৳${fmt(netTotal(gone))}`, y, m, d, data: gone }) : null;
    const itemsArr = raw.items.filter((r) => isMeaningfulItem(r) && r.id !== id);
    await recomputeAndSaveDay(y, m, d, { ...raw, items: itemsArr });
    if (year && month) setMonthEntries(await loadMonthEntries(year, month));
    if (tItem) showToast("বিক্রির সারি মুছে ফেলা হয়েছে", { label: "ফিরিয়ে আনুন", fn: () => restoreTrash(tItem) });
  };

  // মোছা এন্ট্রি ফিরিয়ে আনা
  const restoreTrash = async (item) => {
    try {
      if (item.kind === "sale" || item.kind === "expense") {
        const raw = await loadDay(item.y, item.m, item.d);
        if (item.kind === "sale") {
          const items = [...raw.items.filter(isMeaningfulItem).filter((r) => r.id !== item.data.id), item.data];
          await recomputeAndSaveDay(item.y, item.m, item.d, { ...raw, items });
        } else {
          const expenses = [...raw.expenses.filter(isMeaningfulExpense).filter((r) => r.id !== item.data.id), item.data];
          await recomputeAndSaveDay(item.y, item.m, item.d, { ...raw, expenses });
        }
        if (year && month) setMonthEntries(await loadMonthEntries(year, month));
      } else if (item.kind === "memo") {
        const mm = item.data;
        const list = await loadMemosYear(mm.y);
        if (!list.some((x) => x.id === mm.id)) list.push(mm);
        await saveMemosYear(mm.y, list);
        const calc = memoCalc(mm);
        if (mm.dueListId && calc.due > 0) await syncMemoDue(mm, calc.due);
        await refreshMemos();
      } else if (item.kind === "due") {
        const e = item.data;
        const list = await loadManualDues();
        if (!list.some((x) => x.id === e.id)) list.push(e);
        await saveManualDues(list);
        if (e.memoId) {
          const ml = await loadMemosYear(e.memoY);
          await saveMemosYear(e.memoY, ml.map((x) => (x.id === e.memoId ? { ...x, dueListId: e.id } : x)));
        }
      }
      const rest = (await loadTrash()).filter((x) => x.tid !== item.tid);
      await saveTrash(rest);
      setTrash(rest);
      setAllDues(await loadAllDuesFlat());
      showToast("✓ ফিরিয়ে আনা হয়েছে");
    } catch (err) {
      window.alert("ফিরিয়ে আনা যায়নি — আবার চেষ্টা করুন।");
    }
  };

  const purgeTrash = async (item) => {
    if (!window.confirm("এটা চিরতরে মুছে যাবে — আর ফেরানো যাবে না। নিশ্চিত?")) return;
    const rest = (await loadTrash()).filter((x) => x.tid !== item.tid);
    await saveTrash(rest);
    setTrash(rest);
  };

  // মাসের সব দিনের ডেটা লোড
  useEffect(() => {
    if (view !== "days" || !year || !month) return;
    let cancelled = false;
    setMonthLoading(true);
    (async () => {
      const obj = await loadMonthEntries(year, month);
      if (!cancelled) {
        setMonthEntries(obj);
        setMonthLoading(false);
      }
    })();
    resetDraft(year, month);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, year, month]);

  // সব বছরের বাকির লিস্ট লোড (হোম পেজ + বাকির পেজে)
  useEffect(() => {
    if (view !== "years" && view !== "dues" && view !== "customers") return;
    let cancelled = false;
    setAllDuesLoading(true);
    (async () => {
      const [flat, ml] = await Promise.all([loadAllDuesFlat(), loadAllMemos()]);
      ml.sort((a, b) => b.y - a.y || b.m - a.m || b.d - a.d || (b.no || 0) - (a.no || 0));
      if (!cancelled) {
        setAllDues(flat);
        setMemos(ml);
        setAllDuesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view]);

  // আজকের সংক্ষিপ্ত হিসাব (হোম পেজে)
  useEffect(() => {
    if (view !== "years") return;
    let cancelled = false;
    const now = new Date();
    const ty = now.getFullYear();
    const tm = now.getMonth() + 1;
    const td = now.getDate();
    if (!YEARS.includes(ty)) {
      setTodaySummary(null);
      return;
    }
    setTodayLoading(true);
    (async () => {
      const full = await computeDayFull(ty, tm, td);
      if (!cancelled) {
        setTodaySummary({ y: ty, m: tm, d: td, ...full });
        setTodayLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view]);

  // মেমো পেজ খুললে সব মেমো লোড
  useEffect(() => {
    if (view !== "memos") return;
    setMemoDraft(null);
    setMemoView(null);
    if (openMemoRef.current) {
      setMemoView(openMemoRef.current);
      openMemoRef.current = null;
    }
    setMemoQuery("");
    refreshMemos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // গ্রাহক লেজার / এন্ট্রি খোঁজার ডেটা লোড
  useEffect(() => {
    if (view !== "ledger") return;
    let cancelled = false;
    setLedgerLoading(true);
    (async () => {
      const rows = await buildAllTransactions();
      if (!cancelled) {
        setLedgerData(rows);
        setLedgerLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view]);

  // দোকানের তথ্য (লোগো/ঠিকানা/ফোন) লোড
  useEffect(() => {
    (async () => {
      const sInfo = await loadShopInfo();
      setShop({ ...sInfo });
    })();
  }, []);

  useEffect(() => {
    if (view === "settings") setShopDraft({ ...shop });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // রিসাইকেল বিন লোড
  useEffect(() => {
    if (view !== "trash") return;
    let cancelled = false;
    setTrashLoading(true);
    (async () => {
      const list = await loadTrash();
      if (!cancelled) {
        setTrash(list);
        setTrashLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view]);

  // বছরের সারাংশ লোড
  useEffect(() => {
    if (view !== "months" || !year) return;
    let cancelled = false;
    setYearStatsLoading(true);
    (async () => {
      const all = await loadYearStats(year);
      if (!cancelled) {
        setYearStats(sumYearStats(all));
        setYearStatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view, year]);

  if (checkingLock) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <p style={{ fontFamily: "'Noto Sans Bengali', sans-serif", color: "var(--navy-fg)" }}>লোড হচ্ছে…</p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-6" style={{ background: "var(--bg)" }}>
        <div className="text-center max-w-xs">
          <p style={{ fontFamily: "'Noto Sans Bengali', sans-serif", fontSize: 18, color: "var(--navy-fg)", marginBottom: 14 }}>
            পাসওয়ার্ড ছাড়া এই পাতা দেখা যাবে না
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl"
            style={{ background: "var(--navy-bg)", color: "var(--on-navy)", fontWeight: 600 }}
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rk-outer min-h-screen w-full flex justify-center">
      <style>{`
        @media (min-width: 1024px) {
          .rk-zoom { zoom: 1.35; }
          .rk-zoom .rk-day-num { font-size: 13px !important; }
          .rk-zoom .rk-brand-title { font-size: 20px !important; }
        }
        @media (min-width: 1440px) {
          .rk-zoom { zoom: 1.55; }
          .rk-zoom .rk-day-num { font-size: 12px !important; }
          .rk-zoom .rk-brand-title { font-size: 23px !important; }
        }
      `}</style>
      {toast && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: 22,
            transform: "translateX(-50%)",
            zIndex: 80,
            background: "var(--navy-bg)",
            color: "#FFFFFF",
            borderRadius: 14,
            padding: "10px 16px",
            fontSize: 14,
            display: "flex",
            gap: 14,
            alignItems: "center",
            boxShadow: "0 6px 20px rgba(31,47,92,0.35)",
            maxWidth: "92vw",
            fontFamily: "'Noto Sans Bengali', sans-serif",
          }}
        >
          <span>{toast.msg}</span>
          {toast.action && (
            <button
              onClick={() => {
                const f = toast.action.fn;
                setToast(null);
                f();
              }}
              style={{ color: "var(--gold)", fontWeight: 700, whiteSpace: "nowrap" }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
      {editMode && view === "days" && (
        <>
          {!saleSheetOpen && (
            <button
              onClick={() => setSaleSheetOpen(true)}
              aria-label="বিক্রির ফর্ম খুলুন"
              className="fixed flex items-center gap-2 active:opacity-80"
              style={{
                zIndex: 60,
                right: 16,
                bottom: 20,
                background: "var(--navy-bg)",
                color: "#FFFFFF",
                borderRadius: 999,
                padding: "12px 18px",
                fontSize: 15,
                fontWeight: 700,
                boxShadow: "0 8px 22px rgba(0,0,0,0.35)",
                fontFamily: "'Noto Sans Bengali', sans-serif",
              }}
            >
              <ShoppingBag size={20} /> বিক্রি
              {saleDrafts.filter(isMeaningfulItem).length > 0 && (
                <span style={{ background: "var(--orange-bg)", color: "#FFFFFF", borderRadius: 999, minWidth: 22, height: 22, fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 6px" }}>
                  {toBn(saleDrafts.filter(isMeaningfulItem).length)}
                </span>
              )}
            </button>
          )}
          {saleSheetOpen && (
            <div
              className="fixed inset-0 flex items-end sm:items-center justify-center"
              style={{ zIndex: 70, background: "rgba(8,12,22,0.6)" }}
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setSaleSheetOpen(false);
              }}
            >
              <div
                className="w-full flex flex-col rounded-t-2xl sm:rounded-2xl"
                style={{ maxWidth: 900, maxHeight: "92vh", background: "var(--bg)", border: "2.5px solid var(--navy-line)", fontFamily: "'Noto Sans Bengali', sans-serif" }}
              >
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "var(--navy-fg)" }}>বিক্রির ফর্ম</div>
                    <div style={{ fontSize: 12, color: "var(--gray)" }}>
                      {toBn(draftDay)} {MONTH_NAMES[draftMonth - 1]}, {toBn(draftYear)}
                    </div>
                  </div>
                  <button
                    onClick={() => setSaleSheetOpen(false)}
                    aria-label="বন্ধ করুন"
                    className="flex items-center justify-center rounded-full active:opacity-70"
                    style={{ width: 36, height: 36, background: "var(--navy-bg)", color: "#FFFFFF", fontSize: 18, lineHeight: 1 }}
                  >
                    ✕
                  </button>
                </div>
                <div className="px-3 pb-3 overflow-y-auto">
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)" }}>
                    <div className="overflow-x-auto">
                      <div
                        className="grid items-center"
                        style={{ gridTemplateColumns: "150px 48px 48px 56px 48px 56px 48px 48px 24px", background: "var(--orange-bg)", minWidth: 530 }}
                      >
                        <Th>নাম</Th>
                        <Th right>হাইট</Th>
                        <Th right>ওয়েট</Th>
                        <Th right>পরিমান</Th>
                        <Th right>দাম</Th>
                        <Th right>মোট</Th>
                        <Th right>বাকি</Th>
                        <Th right>ছাড়</Th>
                        <Th />
                      </div>
                      {saleDrafts.map((row, idx) => (
                        <div
                          key={idx}
                          className="grid items-center"
                          style={{
                            gridTemplateColumns: "150px 48px 48px 56px 48px 56px 48px 48px 24px",
                            background: "var(--card)",
                            minWidth: 530,
                            borderTop: idx > 0 ? "1px solid var(--line2)" : "none",
                          }}
                        >
                          <NameInput
                            value={row.name}
                            onValue={(v) => updateSaleDraft(idx, "name", v)}
                            names={allSaleNames}
                            customNames={customSaleNames}
                            onAdd={async (nm) => {
                              const n = await addPresetName("sale", nm);
                              if (n) updateSaleDraft(idx, "name", n);
                            }}
                            onRemove={(n) => removePresetName("sale", n)}
                            placeholder="নাম"
                            inputClass="px-1.5 py-2"
                            inputStyle={{ fontSize: 14, color: "var(--ink)" }}
                          />
                          {[
                            ["height", "—"],
                            ["weight", "—"],
                            ["qty", "1"],
                            ["price", "0"],
                          ].map(([f, ph]) => (
                            <input
                              key={f}
                              value={row[f]}
                              onChange={(e) => updateSaleDraft(idx, f, e.target.value)}
                              inputMode="decimal"
                              placeholder={ph}
                              className="min-w-0 w-full px-0.5 py-2 bg-transparent outline-none text-right"
                              style={{ fontSize: 14, color: "var(--ink)" }}
                            />
                          ))}
                          <div className="px-1 py-2 text-right truncate" style={{ fontSize: 14, color: "var(--navy-fg)", fontWeight: 700 }}>
                            {fmt(netTotal(row))}
                          </div>
                          <input
                            value={row.due}
                            onChange={(e) => updateSaleDraft(idx, "due", e.target.value)}
                            inputMode="decimal"
                            placeholder="0"
                            className="min-w-0 w-full px-0.5 py-2 bg-transparent outline-none text-right"
                            style={{ fontSize: 14, color: "var(--red)", fontWeight: 600 }}
                          />
                          <input
                            value={row.discount}
                            onChange={(e) => updateSaleDraft(idx, "discount", e.target.value)}
                            inputMode="decimal"
                            placeholder="0"
                            className="min-w-0 w-full px-0.5 py-2 bg-transparent outline-none text-right"
                            style={{ fontSize: 14, color: "var(--orange)", fontWeight: 600 }}
                          />
                          <button onClick={() => removeSaleDraftRow(idx)} className="flex items-center justify-center h-full" style={{ color: "var(--red)" }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="px-2 py-1.5" style={{ fontSize: 12, color: "var(--gray)", background: "var(--bg)" }}>
                      মোট = (হাইট × ওয়েট × পরিমান × দাম) − বাকি − ছাড়।
                    </p>
                  </div>
                  <button
                    onClick={() => setSaleDrafts((rows) => [...rows, emptySaleDraft()])}
                    className="w-full flex items-center justify-center gap-1 py-2 mt-1 rounded-xl active:opacity-70"
                    style={{ background: "var(--bg)", color: "var(--navy-fg)", fontSize: 14, border: "1px dashed var(--line)" }}
                  >
                    <Plus size={15} /> বিক্রি যোগ করুন
                  </button>
                </div>
                <div className="px-3 py-3 flex gap-2" style={{ borderTop: "1px solid var(--line)" }}>
                  <button
                    onClick={() => setSaleSheetOpen(false)}
                    className="px-4 py-2.5 rounded-xl active:opacity-70"
                    style={{ border: "1px solid var(--navy-line)", color: "var(--navy-fg)", fontSize: 13.5, fontWeight: 600 }}
                  >
                    ঠিক আছে
                  </button>
                  <button
                    onClick={async () => {
                      await handleSaveDraft();
                      setSaleSheetOpen(false);
                    }}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl active:opacity-80"
                    style={{ background: "var(--navy-bg)", color: "var(--on-navy)", fontSize: 14, fontWeight: 700 }}
                  >
                    {saving ? "সেভ হচ্ছে…" : "সেভ করুন"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <datalist id="sale-name-options">
        {allSaleNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <datalist id="expense-name-options">
        {allExpenseNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <datalist id="memo-customer-options">
        {[...new Set(memos.map((x) => x.customer))].map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <datalist id="due-name-options">
        {[...new Set(allDues.map((x) => x.name))].map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <div
        className="rk-zoom min-h-screen w-full flex flex-col sm:h-[calc(100vh-48px)] sm:max-w-[460px] sm:my-6 sm:rounded-lg sm:shadow-2xl sm:overflow-y-auto lg:max-w-6xl lg:h-screen lg:my-0 lg:rounded-none lg:shadow-none"
        style={{ background: "var(--bg)", fontFamily: "'Noto Sans Bengali', sans-serif" }}
      >
        {(!online || pending > 0) && (
          <div
            style={{
              background: online ? "var(--amber-tint)" : "var(--red-tint)",
              color: online ? "var(--amber-text)" : "var(--red)",
              fontSize: 12,
              fontWeight: 700,
              padding: "6px 12px",
              textAlign: "center",
            }}
          >
            {!online
              ? `📴 ইন্টারনেট নেই — সেভ ফোনে জমা থাকবে, নেট এলে নিজে পাঠানো হবে${pending ? ` (${toBn(pending)} টা জমা আছে)` : ""}`
              : `⏳ ${toBn(pending)} টা সেভ সার্ভারে পাঠানো বাকি`}
          </div>
        )}
        {/* ---------- YEARS (ড্যাশবোর্ড) ---------- */}
        {view === "years" &&
          (() => {
            const NAVY = "var(--navy-fg)";
            const GRAY = "var(--gray)";
            const s = todaySummary;
            const sale = s
              ? s.items
                  .filter((it) => !String(it.name || "").endsWith("(পরিশোধ)"))
                  .reduce((a, it) => a + grossTotal(it) - numOr0(it.discount), 0)
              : 0;
            const paid = s ? s.itemsTotal : 0;
            const expense = s ? s.expenseTotal : 0;
            const dueToday = s ? s.items.reduce((a, it) => a + dueRemaining(it), 0) : 0;
            const profit = sale - expense;
            const money = (n) => `${n < 0 ? "−" : ""}৳ ${toBn(fmt(Math.abs(n)))}`;
            const val = (n) => (!s ? "—" : todayLoading ? "…" : money(n));
            const card = { background: "var(--card)", borderRadius: 22 };
            const stats = [
              { label: "মোট জমা", value: paid, color: "var(--green)", icon: <Wallet size={28} strokeWidth={1.8} /> },
              { label: "মোট খরচ", value: expense, color: "var(--orange)", icon: <Receipt size={28} strokeWidth={1.8} /> },
              { label: "বাকি টাকা", value: dueToday, color: "var(--red)", icon: <Clock size={28} strokeWidth={1.8} /> },
              { label: "আনুমানিক লাভ", value: profit, color: "var(--blue)", icon: <BarChart3 size={28} strokeWidth={1.8} /> },
            ];
            const goToday = () => {
              const now = new Date();
              if (!YEARS.includes(now.getFullYear())) return;
              setYear(now.getFullYear());
              setMonth(now.getMonth() + 1);
              setView("days");
            };
            return (
              <div className="flex-1 px-4 pt-6 pb-10" style={{ background: "var(--bg)" }}>
                {/* হেডার */}
                <div className="flex items-start justify-between mb-5">
                  <div className="min-w-0">
                    <h1 style={{ color: NAVY, fontSize: 28, fontWeight: 700, lineHeight: 1.15 }}>RK Advertising</h1>
                    <p style={{ color: GRAY, fontSize: 17, marginTop: 4 }}>দৈনিক হিসাব ব্যবস্থাপনা</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <ThemeButton variant="card" />
                    <button
                      onClick={toggleEditMode}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full active:opacity-70"
                      style={{ background: "var(--card)", color: NAVY, fontSize: 11.5, fontWeight: 600, border: "1px solid var(--line)" }}
                    >
                      {editMode ? <Pencil size={12} /> : <Eye size={12} />}
                      {editMode ? "এডিট মোড" : "ভিউ মোড"}
                    </button>
                    <HamburgerMenu
                      align="right"
                      accent={NAVY}
                      icon={<LayoutGrid size={26} color="#FFFFFF" strokeWidth={2} />}
                      buttonClass="flex items-center justify-center active:opacity-80"
                      buttonStyle={{ width: 54, height: 54, borderRadius: 17, background: "var(--navy-bg)" }}
                      items={[
                        { label: "কাস্টমার মেমো", icon: <FileText size={17} />, onClick: () => setView("memos") },
                        { label: "কাস্টমারের পুরো হিসাব", icon: <Users size={17} />, onClick: () => { setCustSel(null); setView("customers"); } },
                        { label: "গ্রাহক লেজার / এন্ট্রি খুঁজুন", icon: <Search size={17} />, onClick: () => setView("ledger") },
                        { label: "রিসাইকেল বিন (মোছা ফেরত)", icon: <RotateCcw size={17} />, onClick: () => setView("trash") },
                        { label: "দোকানের তথ্য ও লোগো", icon: <Settings size={17} />, onClick: () => setView("settings") },
                        { label: "ডার্ক / লাইট মোড বদলান", icon: <Moon size={17} />, onClick: toggleTheme },
                        {
                          label: backingUp ? "ব্যাকআপ তৈরি হচ্ছে…" : "ব্যাকআপ ডাউনলোড (CSV)",
                          icon: <Download size={17} />,
                          disabled: backingUp,
                          onClick: () => {
                            setBackingUp(true);
                            downloadBackupCsv(() => setBackingUp(false));
                          },
                        },
                      ]}
                    />
                  </div>
                </div>

                {/* আজকের মোট বিক্রি */}
                <button onClick={goToday} className="w-full text-left px-5 py-5 mb-3 active:opacity-90" style={card}>
                  <div style={{ color: GRAY, fontSize: 19 }}>আজকের মোট বিক্রি</div>
                  <div style={{ color: NAVY, fontSize: 40, fontWeight: 700, lineHeight: 1.2, marginTop: 8 }}>{val(sale)}</div>
                  <div className="flex items-center gap-1.5 mt-3" style={{ color: "var(--green2)", fontSize: 16 }}>
                    <TrendingUp size={19} strokeWidth={2} /> দৈনিক বিক্রির সারাংশ
                  </div>
                </button>

                {/* ২×২ কার্ড */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {stats.map((st) => (
                    <div key={st.label} className="px-4 py-4" style={{ ...card, color: st.color }}>
                      {st.icon}
                      <div style={{ color: GRAY, fontSize: 17, marginTop: 8 }}>{st.label}</div>
                      <div style={{ fontSize: 25, fontWeight: 700, marginTop: 8, lineHeight: 1.2 }}>{val(st.value)}</div>
                    </div>
                  ))}
                </div>

                {/* বাকির লিস্ট */}
                <button onClick={() => setView("dues")} className="w-full flex items-center justify-between px-5 py-4 mb-3 active:opacity-90" style={card}>
                  <div className="text-left">
                    <div style={{ color: NAVY, fontSize: 18, fontWeight: 700 }}>বাকির লিস্ট</div>
                    <div style={{ color: GRAY, fontSize: 13, marginTop: 2 }}>
                      {allDuesLoading
                        ? "লোড হচ্ছে…"
                        : (() => {
                            const old15n = allDues.filter((e) => daysSince(e.y, e.m, e.d) >= 15).length;
                            return `${toBn(allDues.length)} টা এন্ট্রি${old15n ? ` · ⚠ ${toBn(old15n)} টা ১৫+ দিনের পুরনো` : " · দেখতে ট্যাপ করুন"}`;
                          })()}
                    </div>
                  </div>
                  <div style={{ color: "var(--red)", fontSize: 21, fontWeight: 700 }}>
                    {allDuesLoading ? "…" : money(allDues.reduce((a, e) => a + (e.amount || 0), 0))}
                  </div>
                </button>

                {/* বছর বেছে নিন — ২টা ঘর: চলতি বছর | পরের বছরগুলো */}
                <div className="px-5 py-4" style={card}>
                  <p style={{ color: GRAY, fontSize: 14, marginBottom: 8 }}>বছর বেছে নিন</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setYear(_NOW_YEAR);
                        setView("months");
                      }}
                      className="px-4 py-3 active:opacity-80"
                      style={{ border: `1px solid ${NAVY}`, background: "var(--navy-bg)", color: "#FFFFFF", fontSize: 16, fontWeight: 700, borderRadius: 14 }}
                    >
                      সন {toBn(_NOW_YEAR)}
                    </button>
                    <select
                      value=""
                      onChange={(e) => {
                        const y = Number(e.target.value);
                        if (y) {
                          setYear(y);
                          setView("months");
                        }
                      }}
                      className="w-full px-3 py-3 outline-none"
                      style={{ border: `1px solid ${NAVY}`, background: "var(--bg)", color: NAVY, fontSize: 16, fontWeight: 600, borderRadius: 14 }}
                    >
                      <option value="" disabled>
                        {toBn(_NOW_YEAR + 1)} – {toBn(YEARS[YEARS.length - 1])}
                      </option>
                      {YEARS.filter((y) => y > _NOW_YEAR).map((y) => (
                        <option key={y} value={y}>
                          সন {toBn(y)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* ---------- DUES (all years) ---------- */}
        {view === "dues" && (
          <>
            <HeaderBar title="বাকির লিস্ট" onBack={() => setView("years")} editMode={editMode} onToggleMode={toggleEditMode} />
            <div className="px-3 pt-4 pb-8">
              {editMode && (
                <div className="rounded-xl mb-4 px-3 py-3" style={{ border: "1px solid var(--navy-line)", background: "var(--bg)" }}>
                  <p style={{ fontFamily: "'Noto Sans Bengali', sans-serif", fontSize: 15, color: "var(--navy-fg)", marginBottom: 8 }}>
                    সরাসরি বাকি যোগ করুন
                  </p>
                  <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 92px" }}>
                    <input
                      value={newDue.name}
                      onChange={(ev) => setNewDue((p) => ({ ...p, name: ev.target.value }))}
                      list="due-name-options"
                      placeholder="কার বাকি (নাম)"
                      className="min-w-0 px-2 py-2 rounded-xl outline-none"
                      style={{ fontSize: 14, border: "1px solid var(--line)", background: "var(--card)" }}
                    />
                    <input
                      value={newDue.amount}
                      onChange={(ev) => setNewDue((p) => ({ ...p, amount: ev.target.value }))}
                      inputMode="decimal"
                      placeholder="টাকা"
                      className="min-w-0 px-2 py-2 rounded-xl outline-none text-right"
                      style={{ fontSize: 14, border: "1px solid var(--line)", background: "var(--card)", color: "var(--red)", fontWeight: 600 }}
                    />
                  </div>
                  <input
                    value={newDue.phone || ""}
                    onChange={(ev) => setNewDue((p) => ({ ...p, phone: ev.target.value }))}
                    inputMode="tel"
                    placeholder="ফোন নম্বর (রিমাইন্ডার পাঠাতে — ঐচ্ছিক)"
                    className="w-full mt-2 px-2 py-2 rounded-xl outline-none"
                    style={{ fontSize: 13.5, border: "1px solid var(--line)", background: "var(--card)" }}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="date"
                      value={newDue.date || todayInputValue()}
                      onChange={(ev) => setNewDue((p) => ({ ...p, date: ev.target.value }))}
                      className="min-w-0 px-2 py-1.5 rounded-xl outline-none"
                      style={{ fontSize: 12.5, border: "1px solid var(--line)", background: "var(--card)" }}
                    />
                    <button
                      onClick={handleAddManualDue}
                      disabled={addingDue}
                      className="ml-auto flex items-center gap-1 px-3 py-2 rounded-xl active:opacity-80"
                      style={{ background: "var(--navy-bg)", color: "var(--on-navy)", fontSize: 13, fontWeight: 600 }}
                    >
                      <Plus size={14} /> {addingDue ? "…" : "বাকি যোগ করুন"}
                    </button>
                  </div>
                </div>
              )}
              {allDuesLoading ? (
                <p style={{ fontSize: 12, color: "var(--gray)" }}>লোড হচ্ছে…</p>
              ) : allDues.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--gray)" }}>এখনও কোনো বাকি নেই।</p>
              ) : (
                (() => {
                  const custMap = {};
                  buildCustomers(memos, allDues).forEach((c) => {
                    custMap[c.key] = c;
                  });
                  const withAge = allDues.map((e) => ({ e, days: daysSince(e.y, e.m, e.d) }));
                  const old7 = withAge.filter((x) => x.days >= 7);
                  const old15 = withAge.filter((x) => x.days >= 15);
                  const sumOf = (arr) => arr.reduce((s, x) => s + (x.e.amount || 0), 0);
                  const shown = withAge.filter((x) => (dueFilter === "old15" ? x.days >= 15 : dueFilter === "old7" ? x.days >= 7 : true));
                  const chip = (id, label) => (
                    <button
                      key={id}
                      onClick={() => setDueFilter(id)}
                      className="px-3 py-1.5 rounded-full active:opacity-70"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        border: "1px solid var(--navy-line)",
                        background: dueFilter === id ? "var(--navy-bg)" : "var(--card)",
                        color: dueFilter === id ? "#FFFFFF" : "var(--navy-fg)",
                      }}
                    >
                      {label}
                    </button>
                  );
                  return (
                    <>
                      {old15.length > 0 && (
                        <div className="rounded-xl mb-3 px-3 py-2.5" style={{ background: "var(--red-tint)", border: "1px solid var(--red)", color: "var(--red-dark)" }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                            ⚠ ১৫ দিনের বেশি পুরনো বাকি: {toBn(old15.length)} টা · মোট ৳{toBn(fmt(sumOf(old15)))}
                          </div>
                          <div style={{ fontSize: 11.5, marginTop: 2 }}>নিচে WhatsApp / SMS বাটনে চাপ দিয়ে রিমাইন্ডার পাঠান।</div>
                        </div>
                      )}
                      <div className="flex gap-2 mb-3 flex-wrap">
                        {chip("all", `সব (${toBn(withAge.length)})`)}
                        {chip("old7", `৭+ দিন (${toBn(old7.length)})`)}
                        {chip("old15", `১৫+ দিন (${toBn(old15.length)})`)}
                      </div>
                      {shown.length === 0 ? (
                        <p style={{ fontSize: 12, color: "var(--gray)" }}>এই ভাগে কোনো বাকি নেই।</p>
                      ) : (
                        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--navy-line)" }}>
                          <div className="grid grid-cols-[84px,1fr,70px]" style={{ background: "var(--navy-bg)" }}>
                            <Th small>তারিখ</Th>
                            <Th>নাম</Th>
                            <Th right>বাকি</Th>
                          </div>
                          {shown.map(({ e, days }, i) => {
                            const stage = days >= 30 ? 3 : days >= 15 ? 2 : days >= 7 ? 1 : 0;
                            const stBg = ["var(--card)", "var(--amber-tint)", "var(--red-tint)", "var(--red-tint2)"][stage];
                            const stBorder = ["transparent", "var(--orange)", "var(--red)", "var(--red-dark)"][stage];
                            const stColor = stage === 1 ? "var(--amber-text)" : "var(--red)";
                            const key = `${e.y}-${e.m}-${e.d}-${e.id}`;
                            const input = paymentInputs[key] || {};
                            const phone = phoneOf(e.name, e);
                            const cust = custMap[custKey(e.name)];
                            const open = openDue === key || stage >= 1;
                            return (
                              <div key={i} style={{ borderTop: "1px solid var(--line2)" }}>
                                <div
                                  onClick={() => setOpenDue(openDue === key ? null : key)}
                                  className="grid grid-cols-[84px,1fr,70px] items-center"
                                  style={{ background: stBg, borderLeft: `3px solid ${stBorder}`, cursor: "pointer" }}
                                >
                                  <div className="px-2 py-1.5" style={{ fontSize: 11.5, color: "var(--gray)" }}>
                                    {toBn(e.d)} {MONTH_NAMES[e.m - 1].slice(0, 3)} {toBn(e.y)}
                                  </div>
                                  <div className="px-2 py-1.5 truncate" style={{ fontSize: 12.5, color: "var(--ink)" }}>
                                    {e.name}
                                    {stage >= 1 && (
                                      <span style={{ fontSize: 9.5, color: stColor, marginLeft: 5, fontWeight: 700 }}>
                                        {stage === 1 ? "⏰" : stage === 2 ? "⚠" : "⚠⚠"} {toBn(days)} দিন
                                      </span>
                                    )}
                                  </div>
                                  <div className="px-2 py-1.5 text-right" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--red)" }}>
                                    {fmt(e.amount)}
                                  </div>
                                </div>
                                {open && (
                                  <div
                                    className="flex items-center gap-1.5 px-2 py-1.5 flex-wrap"
                                    style={{ background: stBg, borderLeft: `3px solid ${stBorder}`, borderTop: "1px dashed var(--line2)" }}
                                  >
                                    <button
                                      onClick={() => openWhatsApp(phone, dueMessage(e.name, e.amount, e.y, e.m, e.d))}
                                      className="flex items-center gap-1 px-2.5 py-1 rounded-full active:opacity-70"
                                      style={{ background: "var(--green-tint)", color: "var(--green-dark)", fontSize: 11.5, fontWeight: 700 }}
                                    >
                                      <MessageCircle size={12} /> WhatsApp
                                    </button>
                                    <button
                                      onClick={() => openSms(phone, dueMessage(e.name, e.amount, e.y, e.m, e.d))}
                                      className="flex items-center gap-1 px-2.5 py-1 rounded-full active:opacity-70"
                                      style={{ background: "var(--tint)", color: "var(--navy-fg)", fontSize: 11.5, fontWeight: 700 }}
                                    >
                                      <MessageSquare size={12} /> SMS
                                    </button>
                                    {phone && (
                                      <button
                                        onClick={() => openCall(phone)}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-full active:opacity-70"
                                        style={{ background: "var(--tint)", color: "var(--navy-fg)", fontSize: 11.5, fontWeight: 700 }}
                                      >
                                        <Phone size={12} /> কল
                                      </button>
                                    )}
                                    {cust && (
                                      <button
                                        onClick={() => {
                                          setCustSel(cust.key);
                                          setView("customers");
                                        }}
                                        className="px-2.5 py-1 rounded-full active:opacity-70"
                                        style={{ border: "1px solid var(--navy-line)", color: "var(--navy-fg)", fontSize: 11.5, fontWeight: 700 }}
                                      >
                                        পুরো হিসাব ›
                                      </button>
                                    )}
                                    <span style={{ fontSize: 10.5, color: "var(--gray)" }}>{phone ? phone : "ফোন নম্বর নেই"}</span>
                                  </div>
                                )}
                                {editMode && (
                                  <div
                                    className="flex items-center gap-1.5 px-2 py-1.5"
                                    style={{ background: "var(--bg)", borderTop: "1px dashed var(--line)" }}
                                  >
                                    <span style={{ fontSize: 10.5, color: "var(--navy-fg)", fontWeight: 600, whiteSpace: "nowrap" }}>পরিশোধ:</span>
                                    <input
                                      value={input.amount || ""}
                                      onChange={(ev) =>
                                        setPaymentInputs((prev) => ({ ...prev, [key]: { ...prev[key], amount: ev.target.value } }))
                                      }
                                      inputMode="decimal"
                                      placeholder="টাকা"
                                      className="min-w-0 px-1.5 py-1 rounded-xl outline-none"
                                      style={{ width: 64, fontSize: 11, border: "1px solid var(--line)", background: "var(--card)" }}
                                    />
                                    <input
                                      type="date"
                                      value={input.date || todayInputValue()}
                                      onChange={(ev) =>
                                        setPaymentInputs((prev) => ({ ...prev, [key]: { ...prev[key], date: ev.target.value } }))
                                      }
                                      className="min-w-0 px-1.5 py-1 rounded-xl outline-none"
                                      style={{ fontSize: 10.5, border: "1px solid var(--line)", background: "var(--card)" }}
                                    />
                                    <button
                                      onClick={() => handleSettlePayment(e, key)}
                                      disabled={payingKey !== null || !num(input.amount) || num(input.amount) <= 0}
                                      className="px-2.5 py-1 rounded-xl active:opacity-70 ml-auto"
                                      style={{ background: "var(--navy-bg)", color: "var(--on-navy)", fontSize: 10.5, fontWeight: 600, whiteSpace: "nowrap" }}
                                    >
                                      {payingKey === key ? "…" : "জমা করুন"}
                                    </button>
                                    {e.manual && (
                                      <button
                                        onClick={() => handleDeleteManualDue(e)}
                                        className="p-1 active:opacity-60"
                                        style={{ color: "var(--red)" }}
                                        aria-label="এই বাকি মুছুন"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          <div className="grid grid-cols-[84px,1fr,70px] items-center" style={{ borderTop: "1px solid var(--navy-line)", background: "var(--tint)" }}>
                            <div />
                            <div className="px-2 py-1.5" style={{ fontFamily: "'Noto Sans Bengali', sans-serif", fontSize: 13, color: "var(--navy-fg)" }}>
                              {dueFilter === "all" ? "মোট বাকি" : "এই ভাগের মোট"}
                            </div>
                            <div className="px-2 py-1.5 text-right" style={{ fontSize: 13.5, fontWeight: 700, color: "var(--navy-fg)" }}>
                              {fmt(sumOf(shown))}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()
              )}
            </div>
          </>
        )}

        {/* ---------- MEMOS (কাস্টমার মেমো) ---------- */}
        {view === "memos" && (
          <>
            <HeaderBar
              title={memoDraft ? (memoDraft.id ? "মেমো এডিট" : "নতুন মেমো") : "কাস্টমার মেমো"}
              onBack={() => {
                if (memoDraft) setMemoDraft(null);
                else if (memoView) setMemoView(null);
                else setView("years");
              }}
              editMode={editMode}
              onToggleMode={toggleEditMode}
            />

            {/* ---- নতুন মেমো / এডিট ফর্ম ---- */}
            {memoDraft &&
              (() => {
                const calc = memoCalc(memoDraft);
                const inputStyle = { fontSize: 14, color: "var(--ink)", border: "1px solid var(--line)", background: "var(--card)" };
                const selStyle = { fontSize: 13, background: "var(--card)", border: "1px solid var(--line)", padding: "4px 5px" };
                const cols = "120px 46px 46px 52px 56px 64px 24px";
                return (
                  <div className="px-3 pt-4 pb-10" style={editMode ? undefined : { pointerEvents: "none", opacity: 0.8 }}>
                    {/* তারিখ + কাস্টমার */}
                    <div className="rounded-xl mb-4" style={{ border: "1px solid var(--navy-line)", background: "var(--bg)" }}>
                      <div className="flex items-center justify-center gap-2 px-3 pt-3 pb-2">
                        <span style={{ fontFamily: "'Noto Sans Bengali', sans-serif", fontSize: 16, color: "var(--navy-fg)" }}>তারিখ</span>
                        <select value={memoDraft.d} onChange={(e) => setMemoDate("d", e.target.value)} className="rounded-xl" style={selStyle}>
                          {Array.from({ length: daysInMonth(memoDraft.y, memoDraft.m) }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d}>
                              {toBn(d)}
                            </option>
                          ))}
                        </select>
                        <select value={memoDraft.m} onChange={(e) => setMemoDate("m", e.target.value)} className="rounded-xl" style={selStyle}>
                          {MONTH_NAMES.map((mn, i) => (
                            <option key={mn} value={i + 1}>
                              {mn}
                            </option>
                          ))}
                        </select>
                        <select value={memoDraft.y} onChange={(e) => setMemoDate("y", e.target.value)} className="rounded-xl" style={selStyle}>
                          {YEARS.map((y) => (
                            <option key={y} value={y}>
                              {toBn(y)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="px-3 pb-3">
                        <input
                          value={memoDraft.customer}
                          onChange={(e) => onMemoCustomerChange(e.target.value)}
                          list="memo-customer-options"
                          placeholder="কাস্টমারের নাম"
                          className="w-full px-2 py-2 rounded-xl outline-none"
                          style={{ ...inputStyle, fontSize: 15 }}
                        />
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <input
                            value={memoDraft.phone}
                            onChange={(e) => updateMemoField("phone", e.target.value)}
                            inputMode="tel"
                            placeholder="ফোন (ঐচ্ছিক)"
                            className="min-w-0 px-2 py-2 rounded-xl outline-none"
                            style={inputStyle}
                          />
                          <input
                            value={memoDraft.address}
                            onChange={(e) => updateMemoField("address", e.target.value)}
                            placeholder="ঠিকানা (ঐচ্ছিক)"
                            className="min-w-0 px-2 py-2 rounded-xl outline-none"
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    </div>

                    {/* কী কী কিনেছে */}
                    <p style={{ fontFamily: "'Noto Sans Bengali', sans-serif", fontSize: 16, color: "var(--navy-fg)", margin: "0 0 6px 2px" }}>
                      কী কী কিনেছে
                    </p>
                    <NameDropdown
                      label="আইটেমের নাম বেছে নিন"
                      names={allSaleNames}
                      customNames={customSaleNames}
                      onPick={applyMemoItemPreset}
                      onAdd={() => addPresetName("sale")}
                      onRemove={(n) => removePresetName("sale", n)}
                    />
                    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)" }}>
                      <div className="overflow-x-auto">
                        <div className="grid items-center" style={{ gridTemplateColumns: cols, background: "var(--orange-bg)", minWidth: 408 }}>
                          <Th>নাম</Th>
                          <Th right>হাইট</Th>
                          <Th right>ওয়েট</Th>
                          <Th right>পরিমান</Th>
                          <Th right>দাম</Th>
                          <Th right>মোট</Th>
                          <Th />
                        </div>
                        {memoDraft.items.map((row, idx) => (
                          <div
                            key={row.id}
                            className="grid items-center"
                            style={{ gridTemplateColumns: cols, background: "var(--card)", minWidth: 408, borderTop: idx > 0 ? "1px solid var(--line2)" : "none" }}
                          >
                            <input
                              value={row.name}
                              onChange={(e) => updateMemoItem(idx, "name", e.target.value)}
                              list="sale-name-options"
                              placeholder="নাম"
                              className="min-w-0 px-1.5 py-2 bg-transparent outline-none"
                              style={{ fontSize: 14, color: "var(--ink)" }}
                            />
                            {["height", "weight", "qty", "price"].map((f) => (
                              <input
                                key={f}
                                value={row[f]}
                                onChange={(e) => updateMemoItem(idx, f, e.target.value)}
                                inputMode="decimal"
                                placeholder={f === "qty" ? "1" : f === "price" ? "0" : "—"}
                                className="min-w-0 w-full px-0.5 py-2 bg-transparent outline-none text-right"
                                style={{ fontSize: 14, color: "var(--ink)" }}
                              />
                            ))}
                            <div className="px-1 py-2 text-right truncate" style={{ fontSize: 14, color: "var(--navy-fg)", fontWeight: 700 }}>
                              {fmt(memoItemUsed(row) ? grossTotal(row) : 0)}
                            </div>
                            <button onClick={() => removeMemoItem(idx)} className="flex items-center justify-center h-full" style={{ color: "var(--red)" }}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="px-2 py-1.5" style={{ fontSize: 12, color: "var(--gray)", background: "var(--bg)" }}>
                        মোট = হাইট × ওয়েট × পরিমান × দাম
                      </p>
                    </div>
                    <button
                      onClick={addMemoItem}
                      className="w-full flex items-center justify-center gap-1 py-2 mt-1 mb-4 rounded-xl active:opacity-70"
                      style={{ background: "var(--bg)", color: "var(--navy-fg)", fontSize: 14, border: "1px dashed var(--line)" }}
                    >
                      <Plus size={15} /> আইটেম যোগ করুন
                    </button>

                    {/* হিসাব */}
                    <div className="rounded-xl overflow-hidden mb-2" style={{ border: "1px solid var(--navy-line)" }}>
                      <SummaryRow label="সাবটোটাল =" value={fmt(calc.subtotal)} />
                      <SummaryRow
                        label="ছাড় (−)"
                        value={
                          <input
                            value={memoDraft.discount}
                            onChange={(e) => updateMemoField("discount", e.target.value)}
                            inputMode="decimal"
                            placeholder="0"
                            className="bg-transparent outline-none text-right w-full"
                            style={{ fontWeight: 700, color: "var(--orange)" }}
                          />
                        }
                      />
                      <SummaryRow
                        label="পূর্বের বাকি (+)"
                        editableHint="আগের বাকি থাকলে বা শুধু বাকি লিখতে এখানে দিন"
                        value={
                          <input
                            value={memoDraft.prevDue}
                            onChange={(e) => updateMemoField("prevDue", e.target.value)}
                            inputMode="decimal"
                            placeholder="0"
                            className="bg-transparent outline-none text-right w-full"
                            style={{ fontWeight: 700, color: "var(--red)" }}
                          />
                        }
                      />
                      <SummaryRow label="সর্বমোট =" value={fmt(calc.total)} />
                      <SummaryRow
                        label="জমা (পেয়েছি) (−)"
                        value={
                          <input
                            value={memoDraft.paid}
                            onChange={(e) => updateMemoField("paid", e.target.value)}
                            inputMode="decimal"
                            placeholder="0"
                            className="bg-transparent outline-none text-right w-full"
                            style={{ fontWeight: 700, color: "var(--ink)" }}
                          />
                        }
                      />
                      <SummaryRow label="বাকি =" value={fmt(calc.due)} strong />
                    </div>

                    <input
                      value={memoDraft.note}
                      onChange={(e) => updateMemoField("note", e.target.value)}
                      placeholder="নোট (ঐচ্ছিক)"
                      className="w-full px-2 py-2 mt-3 rounded-xl outline-none"
                      style={inputStyle}
                    />
                    <label className="flex items-center gap-2 mt-3" style={{ fontSize: 13, color: "var(--ink)" }}>
                      <input type="checkbox" checked={memoDraft.listDue} onChange={(e) => updateMemoField("listDue", e.target.checked)} />
                      বাকি থাকলে বাকির লিস্টেও দেখান
                    </label>

                    <div className="py-4 flex gap-2">
                      <button
                        onClick={() => setMemoDraft(null)}
                        className="px-3 py-2 rounded-xl active:opacity-70"
                        style={{ border: "1px solid var(--navy-line)", color: "var(--navy-fg)", fontSize: 12 }}
                      >
                        বাতিল
                      </button>
                      <button
                        onClick={handleSaveMemo}
                        disabled={memoSaving}
                        className="flex-1 py-2 rounded-xl active:opacity-80"
                        style={{ background: "var(--navy-bg)", color: "var(--on-navy)", fontSize: 13, fontWeight: 600 }}
                      >
                        {memoSaving ? "সেভ হচ্ছে…" : "মেমো সেভ করুন"}
                      </button>
                    </div>
                  </div>
                );
              })()}

            {/* ---- সেভ করা মেমো দেখা ---- */}
            {!memoDraft &&
              memoView &&
              (() => {
                const mm = memoView;
                const c = memoCalc(mm);
                const used = mm.items.filter(memoItemUsed);
                return (
                  <div className="px-3 pt-4 pb-10">
                    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--navy-line)", background: "var(--card)" }}>
                      <div className="px-3 py-2 flex items-center justify-between" style={{ background: "var(--bg)" }}>
                        <span style={{ fontFamily: "'Noto Sans Bengali', sans-serif", fontSize: 16, color: "var(--navy-fg)" }}>মেমো নং {toBn(mm.no)}</span>
                        <span style={{ fontSize: 12, color: "var(--gray)" }}>
                          {toBn(mm.d)} {MONTH_NAMES[mm.m - 1]}, {toBn(mm.y)}
                        </span>
                      </div>
                      <div className="px-3 py-2" style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.6 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{mm.customer}</div>
                        {mm.phone && <div style={{ color: "var(--gray)" }}>ফোন: {mm.phone}</div>}
                        {mm.address && <div style={{ color: "var(--gray)" }}>ঠিকানা: {mm.address}</div>}
                      </div>
                      {used.length > 0 && (
                        <div className="overflow-x-auto">
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 380 }}>
                            <thead>
                              <tr style={{ background: "var(--navy-bg)", color: "var(--on-navy)" }}>
                                <th style={{ padding: "5px 6px", textAlign: "left", fontWeight: 600 }}>নাম</th>
                                <th style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>হাইট</th>
                                <th style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>ওয়েট</th>
                                <th style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>পরিমান</th>
                                <th style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>দাম</th>
                                <th style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>মোট</th>
                              </tr>
                            </thead>
                            <tbody>
                              {used.map((it) => (
                                <tr key={it.id} style={{ borderTop: "1px solid var(--line2)" }}>
                                  <td style={{ padding: "5px 6px" }}>{it.name}</td>
                                  <td style={{ padding: "5px 6px", textAlign: "right" }}>{it.height || "—"}</td>
                                  <td style={{ padding: "5px 6px", textAlign: "right" }}>{it.weight || "—"}</td>
                                  <td style={{ padding: "5px 6px", textAlign: "right" }}>{it.qty || "১"}</td>
                                  <td style={{ padding: "5px 6px", textAlign: "right" }}>{fmt(numOr0(it.price))}</td>
                                  <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 700 }}>{fmt(grossTotal(it))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <div style={{ borderTop: "1px solid var(--navy-line)" }}>
                        {used.length > 0 && <SummaryRow label="সাবটোটাল =" value={fmt(c.subtotal)} />}
                        {c.discount > 0 && <SummaryRow label="ছাড় (−)" value={fmt(c.discount)} />}
                        {c.prevDue > 0 && <SummaryRow label="পূর্বের বাকি (+)" value={fmt(c.prevDue)} />}
                        <SummaryRow label="সর্বমোট =" value={fmt(c.total)} />
                        {c.paid > 0 && <SummaryRow label="জমা (−)" value={fmt(c.paid)} />}
                        <SummaryRow label="বাকি =" value={fmt(c.due)} strong />
                      </div>
                      {mm.note && (
                        <p className="px-3 py-2" style={{ fontSize: 12.5, color: "var(--gray)", borderTop: "1px solid var(--line2)" }}>
                          নোট: {mm.note}
                        </p>
                      )}
                    </div>

                    {mm.dueListId && (
                      <p className="mt-2" style={{ fontSize: 12, color: "var(--navy-fg)" }}>
                        ✓ এই বাকি বাকির লিস্টে আছে
                      </p>
                    )}

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleSharePdf(memoToDoc(mm), `memo-${mm.no}.pdf`, `${getShop().name} — মেমো নং ${toBn(mm.no)}`)}
                        disabled={sharing}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl active:opacity-80"
                        style={{ background: "var(--green-dark)", color: "#FFFFFF", fontSize: 13.5, fontWeight: 600, opacity: sharing ? 0.6 : 1 }}
                      >
                        <Share2 size={15} /> {sharing ? "তৈরি হচ্ছে…" : "PDF শেয়ার (WhatsApp)"}
                      </button>
                      <button
                        onClick={() => openWhatsApp(mm.phone, memoText(mm))}
                        className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl active:opacity-70"
                        style={{ border: "1px solid var(--green-dark)", color: "var(--green-dark)", fontSize: 13 }}
                      >
                        <MessageCircle size={14} /> লেখা
                      </button>
                      <button
                        onClick={() => {
                          setCustSel(custKey(mm.customer));
                          setView("customers");
                        }}
                        className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl active:opacity-70"
                        style={{ border: "1px solid var(--navy-line)", color: "var(--navy-fg)", fontSize: 13 }}
                      >
                        <Users size={14} /> পুরো হিসাব
                      </button>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => printCustomerMemo(mm)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl active:opacity-80"
                        style={{ background: "var(--navy-bg)", color: "var(--on-navy)", fontSize: 13.5, fontWeight: 600 }}
                      >
                        <Printer size={15} /> প্রিন্ট / PDF
                      </button>
                      {editMode && (
                        <>
                          <button
                            onClick={() => startEditMemo(mm)}
                            className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl active:opacity-70"
                            style={{ border: "1px solid var(--navy-line)", color: "var(--navy-fg)", fontSize: 13 }}
                          >
                            <Pencil size={14} /> এডিট
                          </button>
                          <button
                            onClick={() => handleDeleteMemo(mm)}
                            className="flex items-center justify-center px-3 py-2.5 rounded-xl active:opacity-70"
                            style={{ border: "1px solid var(--red)", color: "var(--red)" }}
                            aria-label="মেমো মুছুন"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

            {/* ---- মেমোর লিস্ট ---- */}
            {!memoDraft && !memoView && (
              <div className="px-3 pt-4 pb-8">
                {editMode ? (
                  <button
                    onClick={startNewMemo}
                    className="w-full flex items-center justify-center gap-1.5 py-3 mb-3 rounded-xl active:opacity-80"
                    style={{ background: "var(--navy-bg)", color: "var(--on-navy)", fontSize: 14, fontWeight: 600 }}
                  >
                    <Plus size={16} /> নতুন মেমো বানান
                  </button>
                ) : (
                  <div className="mb-3 px-3 py-2 rounded-xl flex items-center gap-2" style={{ background: "var(--tint)", color: "var(--navy-fg)", fontSize: 12 }}>
                    <Eye size={13} /> ভিউ মোড — নতুন মেমো বানাতে উপরে বাটনে চাপ দিয়ে এডিট মোড চালু করুন
                  </div>
                )}
                <input
                  value={memoQuery}
                  onChange={(e) => setMemoQuery(e.target.value)}
                  placeholder="কাস্টমারের নাম / ফোন / মেমো নং দিয়ে খুঁজুন…"
                  className="w-full px-3 py-2 rounded-xl outline-none mb-3"
                  style={{ border: "1px solid var(--line)", background: "var(--card)", fontSize: 13.5 }}
                />
                {memosLoading ? (
                  <p style={{ fontSize: 12, color: "var(--gray)" }}>লোড হচ্ছে…</p>
                ) : (
                  (() => {
                    const q = memoQuery.trim().toLowerCase();
                    const list = q
                      ? memos.filter(
                          (x) => x.customer.toLowerCase().includes(q) || (x.phone || "").includes(q) || String(x.no) === q
                        )
                      : memos;
                    if (list.length === 0)
                      return (
                        <p style={{ fontSize: 12, color: "var(--gray)" }}>
                          {memos.length === 0 ? "এখনও কোনো মেমো নেই।" : "কোনো মেমো পাওয়া যায়নি।"}
                        </p>
                      );
                    return (
                      <div className="flex flex-col gap-2">
                        {list.map((mm) => {
                          const c = memoCalc(mm);
                          return (
                            <button
                              key={mm.id}
                              onClick={() => setMemoView(mm)}
                              className="w-full text-left rounded-xl px-3 py-2.5 active:opacity-80"
                              style={{ border: "1px solid var(--line)", background: "var(--card)" }}
                            >
                              <div className="flex items-center justify-between">
                                <span style={{ fontFamily: "'Noto Sans Bengali', sans-serif", fontSize: 15, color: "var(--ink)" }}>{mm.customer}</span>
                                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--navy-fg)" }}>{fmt(c.total)}</span>
                              </div>
                              <div className="flex items-center justify-between mt-1" style={{ fontSize: 11, color: "var(--gray)" }}>
                                <span>
                                  নং {toBn(mm.no)} · {toBn(mm.d)} {MONTH_NAMES[mm.m - 1].slice(0, 3)} {toBn(mm.y)}
                                  {mm.phone ? ` · ${mm.phone}` : ""}
                                </span>
                                {c.due > 0 ? (
                                  <span style={{ color: "var(--red)", fontWeight: 600 }}>বাকি {fmt(c.due)}</span>
                                ) : (
                                  <span>পরিশোধিত</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </div>
            )}
          </>
        )}

        {/* ---------- LEDGER (গ্রাহক লেজার / এন্ট্রি খোঁজা) ---------- */}
        {view === "ledger" && (
          <>
            <HeaderBar title="গ্রাহক লেজার" onBack={() => setView("years")} editMode={editMode} onToggleMode={toggleEditMode} />
            <div className="px-3 pt-4 pb-8">
              <input
                value={ledgerQuery}
                onChange={(e) => setLedgerQuery(e.target.value)}
                placeholder="নাম / তারিখ (১২ মার্চ, ১২/৩) / টাকা দিয়ে খুঁজুন…"
                className="w-full px-3 py-2 rounded-xl outline-none mb-2"
                style={{ border: "1px solid var(--line)", background: "var(--card)", fontSize: 13.5 }}
              />
              {ledgerQuery.trim() && (
                <div className="flex gap-2 mb-3">
                  {[["all", "সব"], ["বিক্রি", "বিক্রি"], ["খরচ", "খরচ"]].map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setLedgerType(id)}
                      className="px-3 py-1 rounded-full active:opacity-70"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        border: "1px solid var(--navy-line)",
                        background: ledgerType === id ? "var(--navy-bg)" : "var(--card)",
                        color: ledgerType === id ? "#FFFFFF" : "var(--navy-fg)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {ledgerLoading ? (
                <p style={{ fontSize: 12, color: "var(--gray)" }}>লোড হচ্ছে…</p>
              ) : ledgerQuery.trim() ? (
                (() => {
                  const q = ledgerQuery.trim().toLowerCase();
                  const dateText = (r) =>
                    `${r.d} ${toBn(r.d)} ${MONTH_NAMES[r.m - 1]} ${r.y} ${toBn(r.y)} ${r.d}/${r.m}/${r.y} ${r.d}/${r.m} ${toBn(r.d)}/${toBn(r.m)} ${pad2(r.d)}-${pad2(r.m)}-${r.y} ${r.y}-${pad2(r.m)}-${pad2(r.d)}`.toLowerCase();
                  const matches = ledgerData
                    .filter((r) => ledgerType === "all" || r.type === ledgerType)
                    .filter(
                      (r) =>
                        r.name.toLowerCase().includes(q) ||
                        String(r.amount).includes(q) ||
                        toBn(String(r.amount)).includes(q) ||
                        dateText(r).includes(q)
                    )
                    .sort((a, b) => b.y - a.y || b.m - a.m || b.d - a.d);
                  if (matches.length === 0) return <p style={{ fontSize: 12, color: "var(--gray)" }}>কোনো এন্ট্রি পাওয়া যায়নি।</p>;
                  return (
                    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--navy-line)" }}>
                      <div className="grid grid-cols-[70px,1fr,54px,70px]" style={{ background: "var(--navy-bg)" }}>
                        <Th small>তারিখ</Th>
                        <Th>নাম</Th>
                        <Th small>ধরন</Th>
                        <Th right>টাকা</Th>
                      </div>
                      {matches.map((r, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setYear(r.y);
                            setMonth(r.m);
                            setView("days");
                          }}
                          className="grid grid-cols-[70px,1fr,54px,70px] items-center"
                          style={{ borderTop: "1px solid var(--line2)", background: "var(--card)", cursor: "pointer" }}
                        >
                          <div className="px-2 py-1.5" style={{ fontSize: 11, color: "var(--gray)" }}>
                            {toBn(r.d)} {MONTH_NAMES[r.m - 1].slice(0, 3)} {toBn(r.y)}
                          </div>
                          <div className="px-2 py-1.5 truncate" style={{ fontSize: 12.5, color: "var(--ink)" }}>
                            {r.name}
                          </div>
                          <div className="px-2 py-1.5" style={{ fontSize: 11, color: r.type === "খরচ" ? "var(--orange)" : "var(--navy-fg)" }}>
                            {r.type}
                          </div>
                          <div className="px-2 py-1.5 text-right" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>
                            {fmt(r.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : (
                (() => {
                  const grouped = {};
                  ledgerData
                    .filter((r) => r.type === "বিক্রি")
                    .forEach((r) => {
                      if (!grouped[r.name]) grouped[r.name] = { name: r.name, total: 0, due: 0, discount: 0, count: 0, last: null };
                      const g = grouped[r.name];
                      g.total += r.amount;
                      g.due += r.due;
                      g.discount += r.discount;
                      g.count += 1;
                      const val = r.y * 10000 + r.m * 100 + r.d;
                      if (!g.last || val > g.last.val) g.last = { val, y: r.y, m: r.m, d: r.d };
                    });
                  const list = Object.values(grouped).sort((a, b) => b.total - a.total);
                  if (list.length === 0) return <p style={{ fontSize: 12, color: "var(--gray)" }}>এখনও কোনো বিক্রি নেই।</p>;
                  return (
                    <div className="flex flex-col gap-2">
                      {list.map((g, i) => (
                        <div key={i} className="rounded-xl px-3 py-2.5" style={{ border: "1px solid var(--line)", background: "var(--card)" }}>
                          <div className="flex items-center justify-between">
                            <span style={{ fontFamily: "'Noto Sans Bengali', sans-serif", fontSize: 15, color: "var(--ink)" }}>{g.name}</span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--navy-fg)" }}>{fmt(g.total)}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1" style={{ fontSize: 11, color: "var(--gray)" }}>
                            <span>
                              {toBn(g.count)} টা এন্ট্রি · সর্বশেষ {toBn(g.last.d)} {MONTH_NAMES[g.last.m - 1].slice(0, 3)} {toBn(g.last.y)}
                            </span>
                            {g.due > 0 && <span style={{ color: "var(--red)", fontWeight: 600 }}>বাকি {fmt(g.due)}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
          </>
        )}

        {/* ---------- CUSTOMERS (কাস্টমারভিত্তিক পুরো হিসাব) ---------- */}
        {view === "customers" &&
          (() => {
            const NAVY = "var(--navy-fg)";
            const GRAY = "var(--gray)";
            const custs = buildCustomers(memos, allDues);
            const sel = custSel ? custs.find((c) => c.key === custSel) : null;
            const tile = (label, value, color) => (
              <div className="rounded-xl px-2 py-2.5 text-center" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: 11, color: GRAY }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color, marginTop: 2 }}>৳{toBn(fmt(value))}</div>
              </div>
            );
            const pill = (icon, label, onClick, bg, fg, disabled) => (
              <button
                onClick={onClick}
                disabled={disabled}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl active:opacity-70"
                style={{ background: bg, color: fg, fontSize: 12.5, fontWeight: 700, opacity: disabled ? 0.6 : 1 }}
              >
                {icon} {label}
              </button>
            );
            return (
              <>
                <HeaderBar
                  title={sel ? sel.name : "কাস্টমারের হিসাব"}
                  onBack={() => (custSel ? setCustSel(null) : setView("years"))}
                  editMode={editMode}
                  onToggleMode={toggleEditMode}
                />
                <div className="px-3 pt-4 pb-10">
                  {allDuesLoading ? (
                    <p style={{ fontSize: 12, color: GRAY }}>লোড হচ্ছে…</p>
                  ) : sel ? (
                    (() => {
                      const rows = customerRows(sel);
                      const msg = dueMessageTotal(sel.name, sel.due);
                      return (
                        <>
                          <div className="rounded-xl px-4 py-3 mb-3" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
                            <div style={{ fontSize: 17, fontWeight: 700, color: NAVY }}>{sel.name}</div>
                            <div style={{ fontSize: 13, color: GRAY, marginTop: 2 }}>
                              {sel.phone ? `📞 ${sel.phone}` : "ফোন নম্বর নেই — মেমোতে ফোন দিলে এখানে আসবে"}
                            </div>
                            {sel.address && <div style={{ fontSize: 13, color: GRAY }}>📍 {sel.address}</div>}
                          </div>
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            {tile("মোট বিল", sel.billed, NAVY)}
                            {tile("মোট জমা", sel.paid, "var(--green)")}
                            {tile("বর্তমান বাকি", sel.due, "var(--red)")}
                          </div>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {sel.due > 0 &&
                              pill(<MessageCircle size={14} />, "WhatsApp রিমাইন্ডার", () => openWhatsApp(sel.phone, msg), "var(--green-tint)", "var(--green-dark)")}
                            {sel.due > 0 && pill(<MessageSquare size={14} />, "SMS", () => openSms(sel.phone, msg), "var(--tint)", NAVY)}
                            {sel.phone && pill(<Phone size={14} />, "কল", () => openCall(sel.phone), "var(--tint)", NAVY)}
                            {pill(<Printer size={14} />, "প্রিন্ট", () => printCustomerStatement(sel), "var(--navy-bg)", "#FFFFFF")}
                            {pill(
                              <Share2 size={14} />,
                              sharing ? "তৈরি হচ্ছে…" : "PDF শেয়ার",
                              () => handleSharePdf(statementToDoc(sel), "hisab-bibaroni.pdf", `${sel.name} — হিসাবের বিবরণী`),
                              "var(--navy-bg)",
                              "#FFFFFF",
                              sharing
                            )}
                          </div>
                          {rows.length === 0 ? (
                            <p style={{ fontSize: 12, color: GRAY }}>এই কাস্টমারের কোনো লেনদেন নেই।</p>
                          ) : (
                            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--navy-line)" }}>
                              <div className="grid grid-cols-[66px,1fr,58px,58px,58px]" style={{ background: "var(--navy-bg)" }}>
                                <Th small>তারিখ</Th>
                                <Th>বিবরণ</Th>
                                <Th right>মোট</Th>
                                <Th right>জমা</Th>
                                <Th right>বাকি</Th>
                              </div>
                              {rows.map((r, i) => (
                                <div
                                  key={i}
                                  onClick={
                                    r.kind === "memo"
                                      ? () => {
                                          openMemoRef.current = r.mm;
                                          setView("memos");
                                        }
                                      : undefined
                                  }
                                  className="grid grid-cols-[66px,1fr,58px,58px,58px] items-center"
                                  style={{ borderTop: "1px solid var(--line2)", background: "var(--card)", cursor: r.kind === "memo" ? "pointer" : "default" }}
                                >
                                  <div className="px-1 py-1.5" style={{ fontSize: 10.5, color: GRAY }}>
                                    {toBn(r.d)} {MONTH_NAMES[r.m - 1].slice(0, 3)} {toBn(r.y)}
                                  </div>
                                  <div className="px-2 py-1.5 truncate" style={{ fontSize: 12, color: "var(--ink)" }}>
                                    {r.label}
                                    {r.kind === "memo" && <span style={{ color: NAVY }}> ›</span>}
                                  </div>
                                  <div className="px-1 py-1.5 text-right" style={{ fontSize: 11.5 }}>{fmt(r.total)}</div>
                                  <div className="px-1 py-1.5 text-right" style={{ fontSize: 11.5, color: "var(--green)" }}>{r.paid ? fmt(r.paid) : "—"}</div>
                                  <div className="px-1 py-1.5 text-right" style={{ fontSize: 11.5, fontWeight: 700, color: r.due > 0 ? "var(--red)" : GRAY }}>
                                    {fmt(r.due)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    (() => {
                      const q = custQuery.trim().toLowerCase();
                      const list = custs
                        .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.phone || "").includes(q))
                        .sort((a, b) => b.due - a.due || b.lastVal - a.lastVal);
                      return (
                        <>
                          <input
                            value={custQuery}
                            onChange={(e) => setCustQuery(e.target.value)}
                            placeholder="কাস্টমারের নাম / ফোন দিয়ে খুঁজুন…"
                            className="w-full px-3 py-2 rounded-xl outline-none mb-2"
                            style={{ border: "1px solid var(--line)", background: "var(--card)", fontSize: 13.5 }}
                          />
                          <p style={{ fontSize: 12, color: GRAY, marginBottom: 10 }}>
                            মোট {toBn(custs.length)} জন · মোট বাকি ৳{toBn(fmt(custs.reduce((s, c) => s + c.due, 0)))} (বেশি বাকি আগে)
                          </p>
                          {list.length === 0 ? (
                            <p style={{ fontSize: 12, color: GRAY }}>
                              {custs.length === 0 ? "এখনও কোনো কাস্টমার নেই — কাস্টমার মেমো বানালে এখানে আসবে।" : "কাউকে পাওয়া যায়নি।"}
                            </p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {list.map((c) => (
                                <button
                                  key={c.key}
                                  onClick={() => setCustSel(c.key)}
                                  className="w-full text-left rounded-xl px-3 py-2.5 active:opacity-80"
                                  style={{ border: "1px solid var(--line)", background: "var(--card)" }}
                                >
                                  <div className="flex items-center justify-between">
                                    <span style={{ fontSize: 15, color: "var(--ink)", fontWeight: 600 }}>{c.name}</span>
                                    {c.due > 0 ? (
                                      <span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--red)" }}>বাকি ৳{toBn(fmt(c.due))}</span>
                                    ) : (
                                      <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}>বাকি নেই</span>
                                    )}
                                  </div>
                                  <div className="mt-1" style={{ fontSize: 11, color: GRAY }}>
                                    {toBn(c.memos.length)} টা মেমো · বিল ৳{toBn(fmt(c.billed))} · জমা ৳{toBn(fmt(c.paid))}
                                    {c.phone ? ` · ${c.phone}` : ""}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()
                  )}
                </div>
              </>
            );
          })()}

        {/* ---------- TRASH (রিসাইকেল বিন) ---------- */}
        {view === "trash" && (
          <>
            <HeaderBar title="রিসাইকেল বিন" onBack={() => setView("years")} editMode={editMode} onToggleMode={toggleEditMode} />
            <div className="px-3 pt-4 pb-10">
              <p style={{ fontSize: 12, color: "var(--gray)", marginBottom: 10 }}>
                মুছে ফেলা বিক্রি, খরচ, মেমো ও বাকি ৩০ দিন এখানে থাকে। {editMode ? "" : "ফিরিয়ে আনতে এডিট মোড চালু করুন।"}
              </p>
              {trashLoading ? (
                <p style={{ fontSize: 12, color: "var(--gray)" }}>লোড হচ্ছে…</p>
              ) : trash.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--gray)" }}>বিন খালি — কিছু মোছা হয়নি।</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {trash.map((t) => {
                    const when = new Date(t.at);
                    const kindLabel = { sale: "বিক্রি", expense: "খরচ", memo: "মেমো", due: "বাকি" }[t.kind] || t.kind;
                    return (
                      <div key={t.tid} className="rounded-xl px-3 py-2.5" style={{ border: "1px solid var(--line)", background: "var(--card)" }}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate" style={{ fontSize: 14, color: "var(--ink)", fontWeight: 600 }}>
                            <span style={{ fontSize: 10.5, color: "var(--navy-fg)", background: "var(--tint)", borderRadius: 8, padding: "1px 7px", marginRight: 6 }}>
                              {kindLabel}
                            </span>
                            {t.label}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--gray)", marginTop: 3 }}>
                          মোছা হয়েছে {toBn(when.getDate())} {MONTH_NAMES[when.getMonth()]}
                          {t.y ? ` · হিসাবের তারিখ ${toBn(t.d)} ${MONTH_NAMES[t.m - 1].slice(0, 3)} ${toBn(t.y)}` : ""}
                        </div>
                        {editMode && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => restoreTrash(t)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl active:opacity-70"
                              style={{ background: "var(--navy-bg)", color: "#FFFFFF", fontSize: 12.5, fontWeight: 700 }}
                            >
                              <RotateCcw size={13} /> ফিরিয়ে আনুন
                            </button>
                            <button
                              onClick={() => purgeTrash(t)}
                              className="px-3 py-1.5 rounded-xl active:opacity-70"
                              style={{ border: "1px solid var(--red)", color: "var(--red)", fontSize: 12.5 }}
                            >
                              চিরতরে মুছুন
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ---------- SETTINGS (দোকানের তথ্য ও লোগো) ---------- */}
        {view === "settings" && shopDraft && (
          <>
            <HeaderBar title="দোকানের তথ্য ও লোগো" onBack={() => setView("years")} editMode={editMode} onToggleMode={toggleEditMode} />
            <div className="px-3 pt-4 pb-10">
              {!editMode && (
                <div className="mb-3 px-3 py-2 rounded-xl flex items-center gap-2" style={{ background: "var(--tint)", color: "var(--navy-fg)", fontSize: 12 }}>
                  <Eye size={13} /> ভিউ মোড — বদলাতে উপরের বাটনে চাপ দিয়ে এডিট মোড চালু করুন
                </div>
              )}
              <p style={{ fontSize: 12, color: "var(--gray)", marginBottom: 10 }}>
                এই তথ্য মেমো, মাসিক রিপোর্ট, হিসাবের বিবরণী ও PDF-এর মাথায় বসবে।
              </p>
              <div className="rounded-xl px-3 py-3 mb-3 flex items-center gap-3" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 72, height: 72, borderRadius: 14, border: "1px dashed var(--gray3)", background: "var(--bg)", overflow: "hidden" }}
                >
                  {shopDraft.logo ? (
                    <img src={shopDraft.logo} alt="লোগো" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--gray)" }}>লোগো নেই</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    className="px-3 py-1.5 rounded-xl text-center"
                    style={{ background: editMode ? "var(--navy-bg)" : "var(--gray3)", color: "#FFFFFF", fontSize: 12.5, fontWeight: 700, cursor: editMode ? "pointer" : "not-allowed" }}
                  >
                    {shopDraft.logo ? "লোগো বদলান" : "লোগো আপলোড"}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={!editMode}
                      style={{ display: "none" }}
                      onChange={async (ev) => {
                        const f = ev.target.files && ev.target.files[0];
                        ev.target.value = "";
                        if (!f) return;
                        try {
                          const url = await resizeImageToDataUrl(f);
                          setShopDraft((p) => ({ ...p, logo: url }));
                        } catch (err) {
                          window.alert("ছবিটা পড়া যায়নি — অন্য ছবি দিয়ে চেষ্টা করুন।");
                        }
                      }}
                    />
                  </label>
                  {shopDraft.logo && editMode && (
                    <button onClick={() => setShopDraft((p) => ({ ...p, logo: "" }))} style={{ fontSize: 12, color: "var(--red)" }}>
                      লোগো সরান
                    </button>
                  )}
                </div>
              </div>
              {[
                ["name", "দোকানের নাম"],
                ["address", "ঠিকানা"],
                ["phone", "ফোন নম্বর"],
              ].map(([f, label]) => (
                <div key={f} className="mb-3">
                  <div style={{ fontSize: 12, color: "var(--gray)", marginBottom: 4 }}>{label}</div>
                  <input
                    value={shopDraft[f] || ""}
                    onChange={(ev) => setShopDraft((p) => ({ ...p, [f]: ev.target.value }))}
                    disabled={!editMode}
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ border: "1px solid var(--line)", background: editMode ? "var(--card)" : "var(--bg)", fontSize: 14 }}
                  />
                </div>
              ))}
              <button
                onClick={async () => {
                  if (!editMode) return;
                  const ok = await saveShopInfo({ ...shopDraft, name: (shopDraft.name || "").trim() || DEFAULT_SHOP.name });
                  setShop(getShop());
                  if (ok) showToast("✓ দোকানের তথ্য সেভ হয়েছে");
                  else window.alert("সার্ভারে সেভ হয়নি, তবে ফোনে জমা আছে — নেট এলে নিজে থেকে যাবে।");
                }}
                disabled={!editMode}
                className="w-full py-3 rounded-xl active:opacity-80"
                style={{ background: editMode ? "var(--navy-bg)" : "var(--gray3)", color: "#FFFFFF", fontSize: 14, fontWeight: 700 }}
              >
                সেভ করুন
              </button>
            </div>
          </>
        )}

        {/* ---------- MONTHS (+ yearly summary) ---------- */}
        {view === "months" && (
          <>
            <HeaderBar title={`সন ${toBn(year)}`} onBack={() => setView("years")} editMode={editMode} onToggleMode={toggleEditMode} />

            <div className="px-3 pt-4 lg:flex lg:justify-end">
              <div className="lg:w-full lg:max-w-md">
                <SectionTitle label="বছরের সারাংশ" />
                {yearStatsLoading ? (
                  <p style={{ fontSize: 12, color: "var(--gray)" }}>লোড হচ্ছে…</p>
                ) : (
                  <div className="rounded-xl overflow-hidden mb-2 lg:scale-110 lg:origin-top-right" style={{ border: "1px solid var(--navy-line)" }}>
                    <SummaryRow label="মোট আয় =" value={fmt(yearStats.income)} />
                    <SummaryRow label="মোট খরচ = (-)" value={fmt(yearStats.expense)} negative />
                    <SummaryRow label="থাকলো =" value={fmt(yearStats.income - yearStats.expense)} strong />
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 pt-4 pb-1">
              <p style={{ color: "var(--gray)", fontSize: 13 }}>মাস বেছে নিন</p>
            </div>
            <div className="flex flex-col">
              {MONTH_NAMES.map((name, i) => (
                <Tab
                  key={name}
                  index={toBn(i + 1)}
                  label={name}
                  sub={`${toBn(daysInMonth(year, i + 1))} দিন`}
                  onClick={() => {
                    setMonth(i + 1);
                    setView("days");
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* ---------- DAYS (unified month view: top draft panel + every day's box) ---------- */}
        {view === "days" && (
          <>
            <HeaderBar
              title={`${MONTH_NAMES[month - 1]}, ${toBn(year)}`}
              onBack={() => setView("months")}
              editMode={editMode}
              onToggleMode={toggleEditMode}
            />

            <div className="px-3 pt-3">
              <button
                onClick={() => printMonthReport(year, month, monthEntries)}
                disabled={monthLoading}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl active:opacity-70"
                style={{ border: "1px solid var(--navy-line)", color: "var(--navy-fg)", fontSize: 12.5, fontWeight: 600 }}
              >
                <Printer size={14} /> PDF রিপোর্ট
              </button>
            </div>

            {!editMode && (
              <div
                className="mx-3 mt-3 px-3 py-2 rounded-xl flex items-center gap-2"
                style={{ background: "var(--tint)", color: "var(--navy-fg)", fontSize: 12 }}
              >
                <Eye size={13} /> ভিউ মোড — শুধু দেখা যাচ্ছে, এডিট করতে উপরে বাটনে চাপুন
              </div>
            )}

            <div className="px-3 pt-3">
              {/* ---- ড্রাফট প্যানেল: শুধু এডিট মোডে দেখায় ---- */}
              {editMode && (
              <div className="rounded-xl mb-5" style={{ border: "2.5px solid var(--navy-line)", background: "var(--bg)" }}>
                <div className="flex items-center justify-center gap-2 px-3 pt-3 pb-2">
                  <span style={{ fontFamily: "'Noto Sans Bengali', sans-serif", fontSize: 16, color: "var(--navy-fg)" }}>তারিখ</span>
                  <select
                    value={draftDay}
                    onChange={(e) => setDraftDay(Number(e.target.value))}
                    className="rounded-xl"
                    style={{ fontSize: 14, fontWeight: 800, color: "var(--navy-fg)", background: "var(--card)", border: "2px solid var(--navy-line)", padding: "4px 5px" }}
                  >
                    {Array.from({ length: daysInMonth(draftYear, draftMonth) }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {toBn(d)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={draftMonth}
                    onChange={(e) => setDraftMonth(Number(e.target.value))}
                    className="rounded-xl"
                    style={{ fontSize: 14, fontWeight: 800, color: "var(--navy-fg)", background: "var(--card)", border: "2px solid var(--navy-line)", padding: "4px 5px" }}
                  >
                    {MONTH_NAMES.map((mn, i) => (
                      <option key={mn} value={i + 1}>
                        {mn}
                      </option>
                    ))}
                  </select>
                  <select
                    value={draftYear}
                    onChange={(e) => setDraftYear(Number(e.target.value))}
                    className="rounded-xl"
                    style={{ fontSize: 14, fontWeight: 800, color: "var(--navy-fg)", background: "var(--card)", border: "2px solid var(--navy-line)", padding: "4px 5px" }}
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {toBn(y)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col lg:flex-row">
                  {/* --- খরচ ড্রাফট (৩০%, একাধিক সারি) --- */}
                  <div className="px-3 w-full lg:max-w-[560px]">
                    <p style={{ fontFamily: "'Noto Sans Bengali', sans-serif", fontSize: 16, color: "var(--navy-fg)", margin: "4px 0" }}>খরচ</p>
                    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)" }}>
                      <div className="grid" style={{ gridTemplateColumns: "1fr 70px 24px", background: "var(--navy-bg)" }}>
                        <Th>বিবরণ</Th>
                        <Th right>টাকা</Th>
                        <Th />
                      </div>
                      {expenseDrafts.map((row, idx) => (
                        <div
                          key={idx}
                          className="grid items-center"
                          style={{ gridTemplateColumns: "1fr 70px 24px", background: "var(--card)", borderTop: idx > 0 ? "1px solid var(--line2)" : "none" }}
                        >
                          <NameInput
                            value={row.name}
                            onValue={(v) => updateExpenseDraft(idx, "name", v)}
                            names={allExpenseNames}
                            customNames={customExpenseNames}
                            onAdd={async (nm) => {
                              const n = await addPresetName("expense", nm);
                              if (n) updateExpenseDraft(idx, "name", n);
                            }}
                            onRemove={(n) => removePresetName("expense", n)}
                            placeholder="যেমন: নাস্তা"
                            inputClass="px-2 py-2"
                            inputStyle={{ fontSize: 15, color: "var(--ink)" }}
                          />
                          <input
                            value={row.amount}
                            onChange={(e) => updateExpenseDraft(idx, "amount", e.target.value)}
                            inputMode="decimal"
                            placeholder="0"
                            className="min-w-0 w-full px-1 py-2 bg-transparent outline-none text-right"
                            style={{ fontSize: 15, color: "var(--ink)" }}
                          />
                          <button onClick={() => removeExpenseDraftRow(idx)} className="flex items-center justify-center h-full" style={{ color: "var(--red)" }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setExpenseDrafts((rows) => [...rows, emptyExpenseDraft()])}
                      className="w-full flex items-center justify-center gap-1 py-2 mt-1 rounded-xl active:opacity-70"
                      style={{ background: "var(--bg)", color: "var(--navy-fg)", fontSize: 14, border: "1px dashed var(--line)" }}
                    >
                      <Plus size={15} /> খরচ যোগ করুন
                    </button>
                  </div>
                </div>

                <div className="px-3 py-3 flex gap-2">
                  <button
                    onClick={() => resetDraft(draftYear, draftMonth)}
                    className="px-3 py-2 rounded-xl active:opacity-70"
                    style={{ border: "1px solid var(--navy-line)", color: "var(--navy-fg)", fontSize: 12 }}
                  >
                    বাতিল
                  </button>
                  <button
                    onClick={handleSaveDraft}
                    disabled={saving}
                    className="flex-1 py-2 rounded-xl active:opacity-80"
                    style={{ background: "var(--navy-bg)", color: "var(--on-navy)", fontSize: 13, fontWeight: 600 }}
                  >
                    {saving ? "সেভ হচ্ছে…" : "সেভ করুন"}
                  </button>
                </div>
              </div>
              )}

              {/* ---- প্রতিদিনের বক্স ---- */}
              {monthLoading ? (
                <div className="flex items-center justify-center py-10" style={{ color: "var(--navy-fg)" }}>
                  লোড হচ্ছে…
                </div>
              ) : (
                <div className="pb-10">
                  {Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1).map((d) => {
                    const dayData = monthEntries[d];
                    const hasEntries = dayData && (dayData.expenses.length > 0 || dayData.items.length > 0);
                    return (
                      <div key={d} className="rounded-xl mb-3 overflow-hidden" style={{ border: "2.5px solid var(--navy-line)" }}>
                        <div
                          className="px-3 py-2 flex items-center justify-between"
                          style={{ background: "var(--bg)" }}
                        >
                          <p style={{ fontFamily: "'Noto Sans Bengali', sans-serif", fontSize: 17, fontWeight: 800, color: "var(--navy-fg)", margin: 0 }}>
                            {toBn(d)} {MONTH_NAMES[month - 1]}, {toBn(year)} <span style={{ fontSize: 13, fontWeight: 700, color: "var(--navy-fg)" }}>({getWeekday(year, month, d)})</span>
                          </p>
                        </div>
                        {!hasEntries ? (
                          <p className="px-3 py-2" style={{ fontSize: 11, color: "var(--gray)", margin: 0 }}>
                            কোনো এন্ট্রি নেই
                          </p>
                        ) : (
                          <>
                          <div className="flex flex-col lg:flex-row">
                            {/* ---- বিক্রি (৭০%) ---- */}
                            <div className="lg:w-[70%] overflow-x-auto" style={{ borderRight: "2.5px solid var(--navy-line)" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 420 }}>
                                <thead>
                                  <tr style={{ background: "var(--navy-bg)", color: "var(--on-navy)" }}>
                                    <th style={{ padding: "5px 6px", textAlign: "left", fontWeight: 600 }}>নাম</th>
                                    <th style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>হাইট</th>
                                    <th style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>ওয়েট</th>
                                    <th style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>পরিমান</th>
                                    <th style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>দাম</th>
                                    <th style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>মোট</th>
                                    <th style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>বাকি</th>
                                    <th style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>ছাড়</th>
                                    <th style={{ padding: "5px 6px" }}></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {dayData.items.length === 0 ? (
                                    <tr>
                                      <td colSpan={9} style={{ padding: "6px", fontSize: 12, color: "var(--gray)", background: "var(--card)" }}>
                                        কোনো বিক্রি নেই
                                      </td>
                                    </tr>
                                  ) : (
                                    dayData.items.map((row) => (
                                      <tr
                                        key={row.id}
                                        onClick={editMode ? () => loadClickedSale(year, month, d, row) : undefined}
                                        style={{ borderTop: "1px solid var(--line2)", background: "var(--card)", cursor: editMode ? "pointer" : "default" }}
                                      >
                                        <td style={{ padding: "5px 6px" }}>{row.name}</td>
                                        <td style={{ padding: "5px 6px", textAlign: "right" }}>{row.height || "—"}</td>
                                        <td style={{ padding: "5px 6px", textAlign: "right" }}>{row.weight || "—"}</td>
                                        <td style={{ padding: "5px 6px", textAlign: "right" }}>{row.qty || "১"}</td>
                                        <td style={{ padding: "5px 6px", textAlign: "right" }}>{row.price || 0}</td>
                                        <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 700 }}>{fmt(netTotal(row))}</td>
                                        <td style={{ padding: "5px 6px", textAlign: "right", color: "var(--red)" }}>
                                          {row.due || 0}
                                          {num(row.duePaid) > 0 && (
                                            <div style={{ fontSize: 9.5, color: "var(--green)" }}>শোধ {fmt(num(row.duePaid))}</div>
                                          )}
                                        </td>
                                        <td style={{ padding: "5px 6px", textAlign: "right", color: "var(--orange)" }}>{row.discount || 0}</td>
                                        <td style={{ padding: "5px 6px", textAlign: "right" }}>
                                          {editMode && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteSaleRow(year, month, d, row.id);
                                            }}
                                            style={{ color: "var(--red)" }}
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                          )}
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>

                            {/* ---- খরচ (৩০%) ---- */}
                            <div className="lg:w-[30%] overflow-x-auto">
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 180 }}>
                                <thead>
                                  <tr style={{ background: "var(--orange-bg)", color: "var(--on-navy)" }}>
                                    <th style={{ padding: "5px 6px", textAlign: "left", fontWeight: 600 }}>খরচ</th>
                                    <th style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>টাকা</th>
                                    <th style={{ padding: "5px 6px" }}></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {dayData.expenses.length === 0 ? (
                                    <tr>
                                      <td colSpan={3} style={{ padding: "6px", fontSize: 12, color: "var(--gray)", background: "var(--card)" }}>
                                        কোনো খরচ নেই
                                      </td>
                                    </tr>
                                  ) : (
                                    dayData.expenses.map((row) => (
                                      <tr
                                        key={row.id}
                                        onClick={editMode ? () => loadClickedExpense(year, month, d, row) : undefined}
                                        style={{ borderTop: "1px solid var(--line2)", background: "var(--card)", cursor: editMode ? "pointer" : "default" }}
                                      >
                                        <td style={{ padding: "5px 6px" }}>{row.name}</td>
                                        <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 700 }}>{fmt(num(row.amount) || 0)}</td>
                                        <td style={{ padding: "5px 6px", textAlign: "right" }}>
                                          {editMode && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteExpenseRow(year, month, d, row.id);
                                            }}
                                            style={{ color: "var(--red)" }}
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                          )}
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <div style={{ minWidth: 560 }}>
                              <div className="grid" style={{ gridTemplateColumns: "repeat(7,1fr)", background: "var(--orange-bg)", color: "var(--on-navy)", fontSize: 11 }}>
                                <span style={{ padding: "5px 4px" }}>ইজা টাকা =</span>
                                <span style={{ padding: "5px 4px" }}>বিক্রি মোট =</span>
                                <span style={{ padding: "5px 4px" }}>(বাকি)</span>
                                <span style={{ padding: "5px 4px" }}>(ছাড়)</span>
                                <span style={{ padding: "5px 4px" }}>মোট টাকা =</span>
                                <span style={{ padding: "5px 4px" }}>মোট খরচ =</span>
                                <span style={{ padding: "5px 4px" }}>অবশিষ্ট =</span>
                              </div>
                              <div className="grid" style={{ gridTemplateColumns: "repeat(7,1fr)", background: "var(--card)", fontSize: 12.5, fontWeight: 700 }}>
                                <span style={{ padding: "5px 4px" }}>{fmt(dayData.opening)}</span>
                                <span style={{ padding: "5px 4px" }}>{fmt(dayData.itemsTotal)}</span>
                                <span style={{ padding: "5px 4px", color: "var(--red)" }}>{fmt(dayData.duesTotalDay)}</span>
                                <span style={{ padding: "5px 4px", color: "var(--orange)" }}>{fmt(dayData.discountTotalDay)}</span>
                                <span style={{ padding: "5px 4px" }}>{fmt(dayData.totalMoney)}</span>
                                <span style={{ padding: "5px 4px", color: "var(--red)" }}>{fmt(dayData.expenseTotal)}</span>
                                <span style={{ padding: "5px 4px", fontWeight: 700, color: "var(--navy-fg)" }}>{fmt(dayData.remaining)}</span>
                              </div>
                            </div>
                          </div>
                        </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
