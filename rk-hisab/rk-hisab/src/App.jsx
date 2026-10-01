import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, ChevronLeft, ChevronDown, BookOpen, Pencil, Eye, Download, Search, Printer, FileText, Menu, LayoutGrid, TrendingUp, Wallet, Receipt, Clock, BarChart3 } from "lucide-react";
import { storage } from "./firebase";

// ---------- constants ----------
const YEARS = [2026, 2027, 2028, 2029, 2030];
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

// ---------- storage helpers (Firestore-backed) ----------
async function loadDay(y, m, d) {
  try {
    const res = await storage.get(dayKey(y, m, d));
    if (res && res.value) {
      const parsed = JSON.parse(res.value);
      return {
        expenses: parsed.expenses && parsed.expenses.length ? parsed.expenses : [newExpenseRow()],
        items: parsed.items && parsed.items.length ? parsed.items : [newItemRow()],
        openingOverride: parsed.openingOverride ?? null,
        totalOverride: parsed.totalOverride ?? null,
      };
    }
  } catch (e) {
    /* not found */
  }
  return { expenses: [newExpenseRow()], items: [newItemRow()], openingOverride: null, totalOverride: null };
}

async function saveDay(y, m, d, data) {
  try {
    await storage.set(dayKey(y, m, d), JSON.stringify(data));
  } catch (e) {
    console.error("save failed", e);
  }
}

async function loadDues(year) {
  try {
    const res = await storage.get(duesKey(year));
    if (res && res.value) return JSON.parse(res.value);
  } catch (e) {
    /* not found */
  }
  return {};
}

async function saveDuesForDate(year, month, day, entries) {
  const all = await loadDues(year);
  const k = `${month}-${day}`;
  if (entries.length) all[k] = entries;
  else delete all[k];
  try {
    await storage.set(duesKey(year), JSON.stringify(all));
  } catch (e) {
    console.error("dues save failed", e);
  }
}

async function loadYearStats(year) {
  try {
    const res = await storage.get(yearStatsKey(year));
    if (res && res.value) return JSON.parse(res.value);
  } catch (e) {
    /* not found */
  }
  return {};
}

async function saveYearStatsForDate(year, month, day, income, expense, balance) {
  const all = await loadYearStats(year);
  const k = `${month}-${day}`;
  all[k] = { income, expense, balance };
  try {
    await storage.set(yearStatsKey(year), JSON.stringify(all));
  } catch (e) {
    console.error("year stats save failed", e);
  }
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
  try {
    const res = await storage.get(memosKey(y));
    if (res && res.value) return JSON.parse(res.value);
  } catch (e) {
    /* not found */
  }
  return [];
}

async function saveMemosYear(y, list) {
  try {
    await storage.set(memosKey(y), JSON.stringify(list));
    return true;
  } catch (e) {
    console.error("memo save failed", e);
    return false;
  }
}

async function loadAllMemos() {
  const results = await Promise.all(YEARS.map(loadMemosYear));
  return results.flat();
}

async function loadManualDues() {
  try {
    const res = await storage.get(MANUAL_DUES_KEY);
    if (res && res.value) return JSON.parse(res.value);
  } catch (e) {
    /* not found */
  }
  return [];
}

async function saveManualDues(list) {
  try {
    await storage.set(MANUAL_DUES_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    console.error("manual dues save failed", e);
    return false;
  }
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
      body{font-family:'Noto Sans Bengali',sans-serif;padding:28px;color:#2A211B;}
      .letterhead{text-align:center;border-bottom:2px solid #8C2F26;padding-bottom:10px;margin-bottom:14px;}
      .letterhead h1{color:#8C2F26;font-size:22px;margin:0;}
      .letterhead p{color:#6B5D4A;font-size:12px;margin:4px 0 0;}
      .meta{display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;}
      .cust{font-size:13.5px;margin-bottom:14px;line-height:1.6;}
      table{width:100%;border-collapse:collapse;}
      th,td{border:1px solid #D9CBA8;padding:5px 8px;font-size:12.5px;}
      th{background:#8C2F26;color:#fff;text-align:left;}
      .summary{width:300px;margin-left:auto;margin-top:16px;}
      .summary td{border:none;padding:3px 4px;font-size:13px;}
      .summary tr.total td{border-top:2px solid #8C2F26;font-weight:bold;font-size:15px;color:#8C2F26;}
      .note{margin-top:14px;font-size:12.5px;color:#6B5D4A;}
      .sign{display:flex;justify-content:space-between;margin-top:56px;font-size:12px;color:#6B5D4A;}
      .sign span{border-top:1px solid #6B5D4A;padding-top:4px;min-width:130px;text-align:center;}
      @media print{ body{padding:10mm;} }
    </style>
    </head><body>
      <div class="letterhead">
        <h1>R.K ADVERTISING AND DIGITAL HOUSE</h1>
        <p>আবুল বিড়ি ফ্যাক্টরির বিপরীতে, ডি.টি রোড, পাহাড়তলী, চট্টগ্রাম</p>
        <p>ফোন: ০১৭৯৬২১৬৮৩৩</p>
      </div>
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
      style={{ width: 56, background: "#8C2F26", color: "#F3ECDD", fontFamily: "'Noto Serif Bengali', serif", fontSize: 20 }}
    >
      {index}
    </div>
    <div
      className="flex-1 flex items-center justify-between px-4 py-4 border-b transition-colors group-active:bg-[#e9dfc9]"
      style={{ borderColor: "#D9CBA8" }}
    >
      <span style={{ fontFamily: "'Noto Serif Bengali', serif", fontSize: 19, color: "#2A211B" }}>{label}</span>
      {sub && (
        <span style={{ fontFamily: "'Noto Sans Bengali', sans-serif", fontSize: 13, color: "#8C2F26" }}>{sub}</span>
      )}
    </div>
  </button>
);

// মেনু বাটন — items: [{ label, icon, onClick, disabled }]
const HamburgerMenu = ({ items, icon, buttonStyle, buttonClass, align = "left", accent = "#8C2F26" }) => {
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
            background: "#FFFFFF",
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
              className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-[#F5F6FA]"
              style={{ color: accent, fontSize: 14, fontWeight: 600, borderTop: i > 0 ? "1px solid #E8EAF2" : "none", opacity: it.disabled ? 0.55 : 1 }}
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

const HeaderBar = ({ title, onBack, editMode, onToggleMode, menuItems }) => (
  <div className="flex items-center gap-3 px-4 py-4 sticky top-0 z-10" style={{ background: "#7A2820", color: "#F3ECDD" }}>
    {menuItems && <HamburgerMenu items={menuItems} />}
    {onBack && (
      <button onClick={onBack} className="p-1 -ml-1 active:opacity-60">
        <ChevronLeft size={22} />
      </button>
    )}
    <BookOpen size={18} style={{ opacity: 0.85 }} />
    <h1 className="flex-1" style={{ fontFamily: "'Noto Serif Bengali', serif", fontSize: 19 }}>{title}</h1>
    {onToggleMode && (
      <button
        onClick={onToggleMode}
        className="flex items-center gap-1 px-2 py-1 rounded-sm active:opacity-70"
        style={{ background: "rgba(243,236,221,0.15)", fontSize: 11 }}
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
    style={{ color: "#F3ECDD", fontSize: small ? 10.5 : 12, fontWeight: 600 }}
  >
    {children}
  </div>
);

const SectionTitle = ({ label }) => (
  <div style={{ fontFamily: "'Noto Serif Bengali', serif", fontSize: 16, color: "#7A2820", marginBottom: 8, paddingLeft: 2 }}>
    {label}
  </div>
);

const SummaryRow = ({ label, value, negative, strong, muted, editableHint }) => (
  <div
    className="grid grid-cols-[1fr,110px] items-center px-3 leading-none"
    style={{
      background: strong ? "#8C2F26" : "#FFFDF7",
      borderTop: "1px solid #EADFC4",
      paddingTop: muted ? 2 : 3,
      paddingBottom: muted ? 2 : 3,
    }}
  >
    <div>
      <span
        style={{
          fontFamily: "'Noto Serif Bengali', serif",
          fontWeight: muted ? 600 : 700,
          fontSize: strong ? 16 : muted ? 11 : 14.5,
          color: strong ? "#F3ECDD" : muted ? "#C3B598" : "#2A211B",
        }}
      >
        {label}
      </span>
      {editableHint && <div style={{ fontSize: 8, color: "#A6987A", marginTop: 1, lineHeight: 1 }}>{editableHint}</div>}
    </div>
    <div
      className="text-right"
      style={{
        fontSize: strong ? 19 : muted ? 11.5 : 15.5,
        fontWeight: muted ? 600 : 700,
        color: strong ? "#F3ECDD" : negative ? "#B5473C" : muted ? "#C3B598" : "#2A211B",
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
        className="w-full flex items-center justify-between px-3 py-2 rounded-sm active:opacity-80"
        style={{ border: "1px solid #D9CBA8", background: "#FFFDF7", color: "#8C2F26", fontSize: 13.5 }}
      >
        <span>{label}</span>
        <ChevronDown size={17} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 z-20 mt-1 rounded-sm overflow-y-auto"
          style={{ maxHeight: 224, border: "1px solid #8C2F26", background: "#FFFDF7", boxShadow: "0 6px 16px rgba(42,33,27,0.18)" }}
        >
          {names.map((n, i) => (
            <div key={n} className="flex items-center" style={{ borderTop: i > 0 ? "1px solid #EADFC4" : "none" }}>
              <button
                type="button"
                onClick={() => {
                  onPick(n);
                  setOpen(false);
                }}
                className="flex-1 text-left px-3 py-2 active:bg-[#F3ECDD]"
                style={{ fontSize: 13.5, color: "#2A211B" }}
              >
                {n}
              </button>
              {customNames.includes(n) && (
                <button
                  type="button"
                  onClick={() => onRemove(n)}
                  className="px-3 py-2 active:opacity-60"
                  style={{ color: "#B5473C", fontSize: 16, lineHeight: 1 }}
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
            className="w-full text-left px-3 py-2 active:bg-[#F3ECDD]"
            style={{ borderTop: "1px solid #8C2F26", color: "#8C2F26", fontSize: 13, fontWeight: 600 }}
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
  const [backingUp, setBackingUp] = useState(false);

  // ---- কাস্টমার মেমো ও সরাসরি বাকি ----
  const [memos, setMemos] = useState([]);
  const [memosLoading, setMemosLoading] = useState(false);
  const [memoQuery, setMemoQuery] = useState("");
  const [memoDraft, setMemoDraft] = useState(null); // null হলে লিস্ট/ডিটেইল দেখায়
  const [memoView, setMemoView] = useState(null); // যে মেমো খুলে দেখা হচ্ছে
  const [memoSaving, setMemoSaving] = useState(false);
  const [newDue, setNewDue] = useState({ name: "", amount: "", date: "" });
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
      try {
        const a = await storage.get("presets:sale");
        if (a && a.value) setCustomSaleNames(JSON.parse(a.value));
      } catch (e) {
        /* ignore */
      }
      try {
        const b = await storage.get("presets:expense");
        if (b && b.value) setCustomExpenseNames(JSON.parse(b.value));
      } catch (e) {
        /* ignore */
      }
    })();
  }, []);

  const allSaleNames = [...DEFAULT_SALE_NAMES, ...customSaleNames];
  const allExpenseNames = [...DEFAULT_EXPENSE_NAMES, ...customExpenseNames];

  const addPresetName = async (kind) => {
    const raw = window.prompt(kind === "sale" ? "বিক্রির নতুন নাম লিখুন (যেমন: পোস্টার):" : "খরচের নতুন নাম লিখুন (যেমন: গাড়ি ভাড়া):");
    const name = (raw || "").trim();
    if (!name) return;
    const existing = kind === "sale" ? allSaleNames : allExpenseNames;
    if (existing.includes(name)) return;
    const next = [...(kind === "sale" ? customSaleNames : customExpenseNames), name];
    if (kind === "sale") setCustomSaleNames(next);
    else setCustomExpenseNames(next);
    try {
      await storage.set(kind === "sale" ? "presets:sale" : "presets:expense", JSON.stringify(next));
    } catch (e) {
      console.error("preset save failed", e);
    }
  };

  const removePresetName = async (kind, name) => {
    const next = (kind === "sale" ? customSaleNames : customExpenseNames).filter((n) => n !== name);
    if (kind === "sale") setCustomSaleNames(next);
    else setCustomExpenseNames(next);
    try {
      await storage.set(kind === "sale" ? "presets:sale" : "presets:expense", JSON.stringify(next));
    } catch (e) {
      console.error("preset save failed", e);
    }
  };

  // চিপে ট্যাপ করলে প্রথম খালি-নামের সারিতে বসে, না থাকলে নতুন সারি যোগ হয়
  const applySalePreset = (name) =>
    setSaleDrafts((rows) => {
      const i = rows.findIndex((r) => !r.name);
      if (i >= 0) return rows.map((r, j) => (j === i ? { ...r, name } : r));
      return [...rows, { ...emptySaleDraft(), name }];
    });
  const applyExpensePreset = (name) =>
    setExpenseDrafts((rows) => {
      const i = rows.findIndex((r) => !r.name);
      if (i >= 0) return rows.map((r, j) => (j === i ? { ...r, name } : r));
      return [...rows, { ...emptyExpenseDraft(), name }];
    });
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

  const todayInputValue = () => {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  };

  const handleSettlePayment = async (dueEntry, key) => {
    const input = paymentInputs[key] || {};
    const amount = num(input.amount);
    if (isNaN(amount) || amount <= 0) return;
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
    } finally {
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
    const [yy, mm, dd] = (newDue.date || todayInputValue()).split("-").map(Number);
    setAddingDue(true);
    try {
      const list = await loadManualDues();
      list.push({ id: emptyRowId(), y: yy, m: mm, d: dd, name, amount });
      const ok = await saveManualDues(list);
      if (!ok) {
        window.alert("বাকি সেভ হয়নি — ইন্টারনেট চেক করে আবার চেষ্টা করুন।");
        return;
      }
      setNewDue({ name: "", amount: "", date: "" });
      setAllDues(await loadAllDuesFlat());
    } finally {
      setAddingDue(false);
    }
  };

  const handleDeleteManualDue = async (e) => {
    if (!window.confirm(`${e.name} এর বাকি এন্ট্রিটা মুছে ফেলবেন?`)) return;
    const list = (await loadManualDues()).filter((x) => x.id !== e.id);
    await saveManualDues(list);
    if (e.memoId) {
      const ml = await loadMemosYear(e.memoY);
      await saveMemosYear(e.memoY, ml.map((x) => (x.id === e.memoId ? { ...x, dueListId: null } : x)));
    }
    setAllDues(await loadAllDuesFlat());
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
      if (!ok) {
        window.alert("মেমো সেভ হয়নি — ইন্টারনেট চেক করে আবার চেষ্টা করুন।");
        return;
      }
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
    } finally {
      setMemoSaving(false);
    }
  };

  const handleDeleteMemo = async (memo) => {
    if (!window.confirm(`${memo.customer} এর মেমো নং ${toBn(memo.no)} মুছে ফেলবেন?`)) return;
    const list = (await loadMemosYear(memo.y)).filter((x) => x.id !== memo.id);
    await saveMemosYear(memo.y, list);
    if (memo.dueListId) await syncMemoDue(memo, 0);
    setMemoView(null);
    await refreshMemos();
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

  const printDayMemo = (y, m, d, dayData) => {
    const win = window.open("", "_blank");
    if (!win) return;

    const saleRows = dayData.items
      .map(
        (it) => `<tr>
          <td>${it.name || ""}</td>
          <td style="text-align:right">${it.height || "—"}</td>
          <td style="text-align:right">${it.weight || "—"}</td>
          <td style="text-align:right">${it.qty || "১"}</td>
          <td style="text-align:right">${fmt(num(it.price) || 0)}</td>
          <td style="text-align:right">${fmt(netTotal(it))}</td>
          <td style="text-align:right">${fmt(num(it.due) || 0)}</td>
          <td style="text-align:right">${fmt(num(it.discount) || 0)}</td>
        </tr>`
      )
      .join("");

    const expenseRows = dayData.expenses
      .map((e) => `<tr><td>${e.name || ""}</td><td style="text-align:right">${fmt(num(e.amount) || 0)}</td></tr>`)
      .join("");

    win.document.write(`
      <html><head><title>মেমো — ${toBn(d)} ${MONTH_NAMES[m - 1]} ${toBn(y)}</title>
      <meta charset="utf-8" />
      <style>
        body{font-family:'Noto Sans Bengali',sans-serif;padding:28px;color:#2A211B;}
        .letterhead{text-align:center;border-bottom:2px solid #8C2F26;padding-bottom:10px;margin-bottom:14px;}
        .letterhead h1{color:#8C2F26;font-size:22px;margin:0;}
        .letterhead p{color:#6B5D4A;font-size:12px;margin:4px 0 0;}
        .meta{display:flex;justify-content:space-between;font-size:13px;margin-bottom:14px;}
        h2{font-size:14px;color:#8C2F26;margin:16px 0 6px;}
        table{width:100%;border-collapse:collapse;}
        th,td{border:1px solid #D9CBA8;padding:5px 8px;font-size:12.5px;}
        th{background:#8C2F26;color:#fff;text-align:left;}
        .exp-th{background:#B98B3E;}
        .summary{width:320px;margin-left:auto;margin-top:16px;}
        .summary td{border:none;padding:3px 4px;font-size:13px;}
        .summary tr.total td{border-top:2px solid #8C2F26;font-weight:bold;font-size:15px;color:#8C2F26;}
        @media print{ body{padding:10mm;} }
      </style>
      </head><body>
        <div class="letterhead">
          <h1>R.K ADVERTISING AND DIGITAL HOUSE</h1>
          <p>আবুল বিড়ি ফ্যাক্টরির বিপরীতে, ডি.টি রোড, পাহাড়তলী, চট্টগ্রাম</p>
          <p>ফোন: ০১৭৯৬২১৬৮৩৩</p>
        </div>
        <div class="meta">
          <span>তারিখ: ${toBn(d)} ${MONTH_NAMES[m - 1]}, ${toBn(y)} (${getWeekday(y, m, d)})</span>
        </div>

        <h2>বিক্রি</h2>
        <table>
          <thead><tr><th>নাম</th><th>হাইট</th><th>ওয়েট</th><th>পরিমান</th><th>দাম</th><th>মোট</th><th>বাকি</th><th>ছাড়</th></tr></thead>
          <tbody>${saleRows || '<tr><td colspan="8" style="text-align:center;color:#8A7A5C">কোনো বিক্রি নেই</td></tr>'}</tbody>
        </table>

        <h2>খরচ</h2>
        <table>
          <thead><tr><th class="exp-th">বিবরণ</th><th class="exp-th" style="text-align:right">টাকা</th></tr></thead>
          <tbody>${expenseRows || '<tr><td colspan="2" style="text-align:center;color:#8A7A5C">কোনো খরচ নেই</td></tr>'}</tbody>
        </table>

        <table class="summary">
          <tr><td>ইজা টাকা</td><td style="text-align:right">${fmt(dayData.opening)}</td></tr>
          <tr><td>বিক্রি মোট</td><td style="text-align:right">${fmt(dayData.itemsTotal)}</td></tr>
          <tr><td>মোট টাকা</td><td style="text-align:right">${fmt(dayData.totalMoney)}</td></tr>
          <tr><td>মোট খরচ (-)</td><td style="text-align:right">${fmt(dayData.expenseTotal)}</td></tr>
          <tr class="total"><td>অবশিষ্ট</td><td style="text-align:right">${fmt(dayData.remaining)}</td></tr>
        </table>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

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
        body{font-family:'Noto Sans Bengali',sans-serif;padding:24px;color:#2A211B;}
        h1{color:#8C2F26;font-size:18px;margin-bottom:2px;}
        p.sub{color:#6B5D4A;font-size:12px;margin-top:0;}
        table{width:100%;border-collapse:collapse;margin-top:14px;}
        th,td{border:1px solid #D9CBA8;padding:6px 10px;font-size:13px;}
        th{background:#8C2F26;color:#fff;text-align:left;}
        tfoot td{font-weight:bold;background:#EFE3C8;}
      </style>
      </head><body>
      <h1>R.K ADVERTISING AND DIGITAL HOUSE</h1>
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
    } finally {
      setSaving(false);
    }
  };

  const deleteExpenseRow = async (y, m, d, id) => {
    const raw = await loadDay(y, m, d);
    const expensesArr = raw.expenses.filter((r) => isMeaningfulExpense(r) && r.id !== id);
    await recomputeAndSaveDay(y, m, d, { ...raw, expenses: expensesArr });
    if (year && month) setMonthEntries(await loadMonthEntries(year, month));
  };

  const deleteSaleRow = async (y, m, d, id) => {
    const raw = await loadDay(y, m, d);
    const itemsArr = raw.items.filter((r) => isMeaningfulItem(r) && r.id !== id);
    await recomputeAndSaveDay(y, m, d, { ...raw, items: itemsArr });
    if (year && month) setMonthEntries(await loadMonthEntries(year, month));
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
    if (view !== "years" && view !== "dues") return;
    let cancelled = false;
    setAllDuesLoading(true);
    (async () => {
      const flat = await loadAllDuesFlat();
      if (!cancelled) {
        setAllDues(flat);
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
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "#F3ECDD" }}>
        <p style={{ fontFamily: "'Noto Serif Bengali', serif", color: "#8C2F26" }}>লোড হচ্ছে…</p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-6" style={{ background: "#F3ECDD" }}>
        <div className="text-center max-w-xs">
          <p style={{ fontFamily: "'Noto Serif Bengali', serif", fontSize: 18, color: "#8C2F26", marginBottom: 14 }}>
            পাসওয়ার্ড ছাড়া এই পাতা দেখা যাবে না
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-sm"
            style={{ background: "#8C2F26", color: "#F3ECDD", fontWeight: 600 }}
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex justify-center bg-[#E4D8BE] lg:bg-[#F3ECDD]">
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
        style={{ background: "#F3ECDD", fontFamily: "'Noto Sans Bengali', sans-serif" }}
      >
        {/* ---------- YEARS (ড্যাশবোর্ড) ---------- */}
        {view === "years" &&
          (() => {
            const NAVY = "#1F2F5C";
            const GRAY = "#6B7390";
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
            const val = (n) => (todayLoading && !s ? "…" : money(n));
            const card = { background: "#FFFFFF", borderRadius: 22 };
            const stats = [
              { label: "মোট জমা", value: paid, color: "#3E7D5A", icon: <Wallet size={28} strokeWidth={1.8} /> },
              { label: "মোট খরচ", value: expense, color: "#C97B2E", icon: <Receipt size={28} strokeWidth={1.8} /> },
              { label: "বাকি টাকা", value: dueToday, color: "#B24A45", icon: <Clock size={28} strokeWidth={1.8} /> },
              { label: "আনুমানিক লাভ", value: profit, color: "#4262B4", icon: <BarChart3 size={28} strokeWidth={1.8} /> },
            ];
            const goToday = () => {
              const now = new Date();
              if (!YEARS.includes(now.getFullYear())) return;
              setYear(now.getFullYear());
              setMonth(now.getMonth() + 1);
              setView("days");
            };
            return (
              <div className="flex-1 px-4 pt-6 pb-10" style={{ background: "#F5F6FA" }}>
                {/* হেডার */}
                <div className="flex items-start justify-between mb-5">
                  <div className="min-w-0">
                    <h1 style={{ color: NAVY, fontSize: 28, fontWeight: 700, lineHeight: 1.15 }}>RK Advertising</h1>
                    <p style={{ color: GRAY, fontSize: 17, marginTop: 4 }}>দৈনিক হিসাব ব্যবস্থাপনা</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <button
                      onClick={toggleEditMode}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full active:opacity-70"
                      style={{ background: "#FFFFFF", color: NAVY, fontSize: 11.5, fontWeight: 600, border: "1px solid #D9DDEB" }}
                    >
                      {editMode ? <Pencil size={12} /> : <Eye size={12} />}
                      {editMode ? "এডিট মোড" : "ভিউ মোড"}
                    </button>
                    <HamburgerMenu
                      align="right"
                      accent={NAVY}
                      icon={<LayoutGrid size={26} color="#FFFFFF" strokeWidth={2} />}
                      buttonClass="flex items-center justify-center active:opacity-80"
                      buttonStyle={{ width: 54, height: 54, borderRadius: 17, background: NAVY }}
                      items={[
                        { label: "কাস্টমার মেমো", icon: <FileText size={17} />, onClick: () => setView("memos") },
                        { label: "গ্রাহক লেজার / এন্ট্রি খুঁজুন", icon: <Search size={17} />, onClick: () => setView("ledger") },
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
                  <div className="flex items-center gap-1.5 mt-3" style={{ color: "#2F7A4F", fontSize: 16 }}>
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
                      {allDuesLoading ? "লোড হচ্ছে…" : `${toBn(allDues.length)} টা এন্ট্রি · দেখতে ট্যাপ করুন`}
                    </div>
                  </div>
                  <div style={{ color: "#B24A45", fontSize: 21, fontWeight: 700 }}>
                    {allDuesLoading ? "…" : money(allDues.reduce((a, e) => a + (e.amount || 0), 0))}
                  </div>
                </button>

                {/* বছর বেছে নিন */}
                <div className="px-5 py-4" style={card}>
                  <p style={{ color: GRAY, fontSize: 14, marginBottom: 8 }}>বছর বেছে নিন</p>
                  <select
                    value=""
                    onChange={(e) => {
                      const y = Number(e.target.value);
                      if (y) {
                        setYear(y);
                        setView("months");
                      }
                    }}
                    className="w-full px-4 py-3 outline-none"
                    style={{ border: `1px solid ${NAVY}`, background: "#F5F6FA", color: NAVY, fontSize: 16, fontWeight: 600, borderRadius: 14 }}
                  >
                    <option value="" disabled>
                      একটা সন সিলেক্ট করুন
                    </option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        সন {toBn(y)}
                      </option>
                    ))}
                  </select>
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
                <div className="rounded-sm mb-4 px-3 py-3" style={{ border: "1px solid #8C2F26", background: "#F3ECDD" }}>
                  <p style={{ fontFamily: "'Noto Serif Bengali', serif", fontSize: 15, color: "#8C2F26", marginBottom: 8 }}>
                    সরাসরি বাকি যোগ করুন
                  </p>
                  <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 92px" }}>
                    <input
                      value={newDue.name}
                      onChange={(ev) => setNewDue((p) => ({ ...p, name: ev.target.value }))}
                      list="due-name-options"
                      placeholder="কার বাকি (নাম)"
                      className="min-w-0 px-2 py-2 rounded-sm outline-none"
                      style={{ fontSize: 14, border: "1px solid #D9CBA8", background: "#FFFDF7" }}
                    />
                    <input
                      value={newDue.amount}
                      onChange={(ev) => setNewDue((p) => ({ ...p, amount: ev.target.value }))}
                      inputMode="decimal"
                      placeholder="টাকা"
                      className="min-w-0 px-2 py-2 rounded-sm outline-none text-right"
                      style={{ fontSize: 14, border: "1px solid #D9CBA8", background: "#FFFDF7", color: "#B5473C", fontWeight: 600 }}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="date"
                      value={newDue.date || todayInputValue()}
                      onChange={(ev) => setNewDue((p) => ({ ...p, date: ev.target.value }))}
                      className="min-w-0 px-2 py-1.5 rounded-sm outline-none"
                      style={{ fontSize: 12.5, border: "1px solid #D9CBA8", background: "#FFFDF7" }}
                    />
                    <button
                      onClick={handleAddManualDue}
                      disabled={addingDue}
                      className="ml-auto flex items-center gap-1 px-3 py-2 rounded-sm active:opacity-80"
                      style={{ background: "#8C2F26", color: "#F3ECDD", fontSize: 13, fontWeight: 600 }}
                    >
                      <Plus size={14} /> {addingDue ? "…" : "বাকি যোগ করুন"}
                    </button>
                  </div>
                </div>
              )}
              {allDuesLoading ? (
                <p style={{ fontSize: 12, color: "#8A7A5C" }}>লোড হচ্ছে…</p>
              ) : allDues.length === 0 ? (
                <p style={{ fontSize: 12, color: "#8A7A5C" }}>এখনও কোনো বাকি নেই।</p>
              ) : (
                <div className="rounded-sm overflow-hidden" style={{ border: "1px solid #8C2F26" }}>
                  <div className="grid grid-cols-[84px,1fr,70px]" style={{ background: "#8C2F26" }}>
                    <Th small>তারিখ</Th>
                    <Th>নাম</Th>
                    <Th right>বাকি</Th>
                  </div>
                  {allDues.map((e, i) => {
                    const daysAgo = Math.floor((new Date() - new Date(e.y, e.m - 1, e.d)) / (1000 * 60 * 60 * 24));
                    const overdue = daysAgo >= 15;
                    const key = `${e.y}-${e.m}-${e.d}-${e.id}`;
                    const input = paymentInputs[key] || {};
                    return (
                      <div key={i} style={{ borderTop: "1px solid #EADFC4" }}>
                        <div
                          className="grid grid-cols-[84px,1fr,70px] items-center"
                          style={{
                            background: overdue ? "#FBEAE7" : "#FFFDF7",
                            borderLeft: overdue ? "3px solid #B5473C" : "3px solid transparent",
                          }}
                        >
                          <div className="px-2 py-1.5" style={{ fontSize: 11.5, color: "#6B5D4A" }}>
                            {toBn(e.d)} {MONTH_NAMES[e.m - 1].slice(0, 3)} {toBn(e.y)}
                          </div>
                          <div className="px-2 py-1.5 truncate" style={{ fontSize: 12.5, color: "#2A211B" }}>
                            {e.name}
                            {overdue && (
                              <span style={{ fontSize: 9.5, color: "#B5473C", marginLeft: 5, fontWeight: 600 }}>
                                ⚠ {toBn(daysAgo)} দিন
                              </span>
                            )}
                          </div>
                          <div className="px-2 py-1.5 text-right" style={{ fontSize: 12.5, fontWeight: 600, color: "#B5473C" }}>
                            {fmt(e.amount)}
                          </div>
                        </div>
                        {editMode && (
                          <div
                            className="flex items-center gap-1.5 px-2 py-1.5"
                            style={{ background: "#F3ECDD", borderTop: "1px dashed #D9CBA8" }}
                          >
                            <span style={{ fontSize: 10.5, color: "#8C2F26", fontWeight: 600, whiteSpace: "nowrap" }}>পরিশোধ:</span>
                            <input
                              value={input.amount || ""}
                              onChange={(ev) =>
                                setPaymentInputs((prev) => ({ ...prev, [key]: { ...prev[key], amount: ev.target.value } }))
                              }
                              inputMode="decimal"
                              placeholder="টাকা"
                              className="min-w-0 px-1.5 py-1 rounded-sm outline-none"
                              style={{ width: 64, fontSize: 11, border: "1px solid #D9CBA8", background: "#FFFDF7" }}
                            />
                            <input
                              type="date"
                              value={input.date || todayInputValue()}
                              onChange={(ev) =>
                                setPaymentInputs((prev) => ({ ...prev, [key]: { ...prev[key], date: ev.target.value } }))
                              }
                              className="min-w-0 px-1.5 py-1 rounded-sm outline-none"
                              style={{ fontSize: 10.5, border: "1px solid #D9CBA8", background: "#FFFDF7" }}
                            />
                            <button
                              onClick={() => handleSettlePayment(e, key)}
                              disabled={payingKey === key || !num(input.amount) || num(input.amount) <= 0}
                              className="px-2.5 py-1 rounded-sm active:opacity-70 ml-auto"
                              style={{ background: "#8C2F26", color: "#F3ECDD", fontSize: 10.5, fontWeight: 600, whiteSpace: "nowrap" }}
                            >
                              {payingKey === key ? "…" : "জমা করুন"}
                            </button>
                            {e.manual && (
                              <button
                                onClick={() => handleDeleteManualDue(e)}
                                className="p-1 active:opacity-60"
                                style={{ color: "#B5473C" }}
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
                  <div className="grid grid-cols-[84px,1fr,70px] items-center" style={{ borderTop: "1px solid #8C2F26", background: "#EFE3C8" }}>
                    <div />
                    <div className="px-2 py-1.5" style={{ fontFamily: "'Noto Serif Bengali', serif", fontSize: 13, color: "#7A2820" }}>
                      মোট বাকি
                    </div>
                    <div className="px-2 py-1.5 text-right" style={{ fontSize: 13.5, fontWeight: 700, color: "#7A2820" }}>
                      {fmt(allDues.reduce((s, e) => s + (e.amount || 0), 0))}
                    </div>
                  </div>
                </div>
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
                const inputStyle = { fontSize: 14, color: "#2A211B", border: "1px solid #D9CBA8", background: "#FFFDF7" };
                const selStyle = { fontSize: 13, background: "#FFFDF7", border: "1px solid #D9CBA8", padding: "4px 5px" };
                const cols = "120px 46px 46px 52px 56px 64px 24px";
                return (
                  <div className="px-3 pt-4 pb-10" style={editMode ? undefined : { pointerEvents: "none", opacity: 0.8 }}>
                    {/* তারিখ + কাস্টমার */}
                    <div className="rounded-sm mb-4" style={{ border: "1px solid #8C2F26", background: "#F3ECDD" }}>
                      <div className="flex items-center justify-center gap-2 px-3 pt-3 pb-2">
                        <span style={{ fontFamily: "'Noto Serif Bengali', serif", fontSize: 16, color: "#8C2F26" }}>তারিখ</span>
                        <select value={memoDraft.d} onChange={(e) => setMemoDate("d", e.target.value)} className="rounded-sm" style={selStyle}>
                          {Array.from({ length: daysInMonth(memoDraft.y, memoDraft.m) }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d}>
                              {toBn(d)}
                            </option>
                          ))}
                        </select>
                        <select value={memoDraft.m} onChange={(e) => setMemoDate("m", e.target.value)} className="rounded-sm" style={selStyle}>
                          {MONTH_NAMES.map((mn, i) => (
                            <option key={mn} value={i + 1}>
                              {mn}
                            </option>
                          ))}
                        </select>
                        <select value={memoDraft.y} onChange={(e) => setMemoDate("y", e.target.value)} className="rounded-sm" style={selStyle}>
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
                          className="w-full px-2 py-2 rounded-sm outline-none"
                          style={{ ...inputStyle, fontSize: 15 }}
                        />
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <input
                            value={memoDraft.phone}
                            onChange={(e) => updateMemoField("phone", e.target.value)}
                            inputMode="tel"
                            placeholder="ফোন (ঐচ্ছিক)"
                            className="min-w-0 px-2 py-2 rounded-sm outline-none"
                            style={inputStyle}
                          />
                          <input
                            value={memoDraft.address}
                            onChange={(e) => updateMemoField("address", e.target.value)}
                            placeholder="ঠিকানা (ঐচ্ছিক)"
                            className="min-w-0 px-2 py-2 rounded-sm outline-none"
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    </div>

                    {/* কী কী কিনেছে */}
                    <p style={{ fontFamily: "'Noto Serif Bengali', serif", fontSize: 16, color: "#8C2F26", margin: "0 0 6px 2px" }}>
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
                    <div className="rounded-sm overflow-hidden" style={{ border: "1px solid #D9CBA8" }}>
                      <div className="overflow-x-auto">
                        <div className="grid items-center" style={{ gridTemplateColumns: cols, background: "#B98B3E", minWidth: 408 }}>
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
                            style={{ gridTemplateColumns: cols, background: "#FFFDF7", minWidth: 408, borderTop: idx > 0 ? "1px solid #EADFC4" : "none" }}
                          >
                            <input
                              value={row.name}
                              onChange={(e) => updateMemoItem(idx, "name", e.target.value)}
                              list="sale-name-options"
                              placeholder="নাম"
                              className="min-w-0 px-1.5 py-2 bg-transparent outline-none"
                              style={{ fontSize: 14, color: "#2A211B" }}
                            />
                            {["height", "weight", "qty", "price"].map((f) => (
                              <input
                                key={f}
                                value={row[f]}
                                onChange={(e) => updateMemoItem(idx, f, e.target.value)}
                                inputMode="decimal"
                                placeholder={f === "qty" ? "1" : f === "price" ? "0" : "—"}
                                className="min-w-0 w-full px-0.5 py-2 bg-transparent outline-none text-right"
                                style={{ fontSize: 14, color: "#2A211B" }}
                              />
                            ))}
                            <div className="px-1 py-2 text-right truncate" style={{ fontSize: 14, color: "#5B3E1B", fontWeight: 700 }}>
                              {fmt(memoItemUsed(row) ? grossTotal(row) : 0)}
                            </div>
                            <button onClick={() => removeMemoItem(idx)} className="flex items-center justify-center h-full" style={{ color: "#B5473C" }}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="px-2 py-1.5" style={{ fontSize: 12, color: "#8A7A5C", background: "#F3ECDD" }}>
                        মোট = হাইট × ওয়েট × পরিমান × দাম
                      </p>
                    </div>
                    <button
                      onClick={addMemoItem}
                      className="w-full flex items-center justify-center gap-1 py-2 mt-1 mb-4 rounded-sm active:opacity-70"
                      style={{ background: "#F3ECDD", color: "#8C2F26", fontSize: 14, border: "1px dashed #D9CBA8" }}
                    >
                      <Plus size={15} /> আইটেম যোগ করুন
                    </button>

                    {/* হিসাব */}
                    <div className="rounded-sm overflow-hidden mb-2" style={{ border: "1px solid #8C2F26" }}>
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
                            style={{ fontWeight: 700, color: "#8C6A2F" }}
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
                            style={{ fontWeight: 700, color: "#B5473C" }}
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
                            style={{ fontWeight: 700, color: "#2A211B" }}
                          />
                        }
                      />
                      <SummaryRow label="বাকি =" value={fmt(calc.due)} strong />
                    </div>

                    <input
                      value={memoDraft.note}
                      onChange={(e) => updateMemoField("note", e.target.value)}
                      placeholder="নোট (ঐচ্ছিক)"
                      className="w-full px-2 py-2 mt-3 rounded-sm outline-none"
                      style={inputStyle}
                    />
                    <label className="flex items-center gap-2 mt-3" style={{ fontSize: 13, color: "#2A211B" }}>
                      <input type="checkbox" checked={memoDraft.listDue} onChange={(e) => updateMemoField("listDue", e.target.checked)} />
                      বাকি থাকলে বাকির লিস্টেও দেখান
                    </label>

                    <div className="py-4 flex gap-2">
                      <button
                        onClick={() => setMemoDraft(null)}
                        className="px-3 py-2 rounded-sm active:opacity-70"
                        style={{ border: "1px solid #8C2F26", color: "#8C2F26", fontSize: 12 }}
                      >
                        বাতিল
                      </button>
                      <button
                        onClick={handleSaveMemo}
                        disabled={memoSaving}
                        className="flex-1 py-2 rounded-sm active:opacity-80"
                        style={{ background: "#8C2F26", color: "#F3ECDD", fontSize: 13, fontWeight: 600 }}
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
                    <div className="rounded-sm overflow-hidden" style={{ border: "1px solid #8C2F26", background: "#FFFDF7" }}>
                      <div className="px-3 py-2 flex items-center justify-between" style={{ background: "#F3ECDD" }}>
                        <span style={{ fontFamily: "'Noto Serif Bengali', serif", fontSize: 16, color: "#8C2F26" }}>মেমো নং {toBn(mm.no)}</span>
                        <span style={{ fontSize: 12, color: "#6B5D4A" }}>
                          {toBn(mm.d)} {MONTH_NAMES[mm.m - 1]}, {toBn(mm.y)}
                        </span>
                      </div>
                      <div className="px-3 py-2" style={{ fontSize: 13.5, color: "#2A211B", lineHeight: 1.6 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{mm.customer}</div>
                        {mm.phone && <div style={{ color: "#6B5D4A" }}>ফোন: {mm.phone}</div>}
                        {mm.address && <div style={{ color: "#6B5D4A" }}>ঠিকানা: {mm.address}</div>}
                      </div>
                      {used.length > 0 && (
                        <div className="overflow-x-auto">
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 380 }}>
                            <thead>
                              <tr style={{ background: "#8C2F26", color: "#F3ECDD" }}>
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
                                <tr key={it.id} style={{ borderTop: "1px solid #EADFC4" }}>
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
                      <div style={{ borderTop: "1px solid #8C2F26" }}>
                        {used.length > 0 && <SummaryRow label="সাবটোটাল =" value={fmt(c.subtotal)} />}
                        {c.discount > 0 && <SummaryRow label="ছাড় (−)" value={fmt(c.discount)} />}
                        {c.prevDue > 0 && <SummaryRow label="পূর্বের বাকি (+)" value={fmt(c.prevDue)} />}
                        <SummaryRow label="সর্বমোট =" value={fmt(c.total)} />
                        {c.paid > 0 && <SummaryRow label="জমা (−)" value={fmt(c.paid)} />}
                        <SummaryRow label="বাকি =" value={fmt(c.due)} strong />
                      </div>
                      {mm.note && (
                        <p className="px-3 py-2" style={{ fontSize: 12.5, color: "#6B5D4A", borderTop: "1px solid #EADFC4" }}>
                          নোট: {mm.note}
                        </p>
                      )}
                    </div>

                    {mm.dueListId && (
                      <p className="mt-2" style={{ fontSize: 12, color: "#8C2F26" }}>
                        ✓ এই বাকি বাকির লিস্টে আছে
                      </p>
                    )}

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => printCustomerMemo(mm)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-sm active:opacity-80"
                        style={{ background: "#8C2F26", color: "#F3ECDD", fontSize: 13.5, fontWeight: 600 }}
                      >
                        <Printer size={15} /> প্রিন্ট / PDF
                      </button>
                      {editMode && (
                        <>
                          <button
                            onClick={() => startEditMemo(mm)}
                            className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-sm active:opacity-70"
                            style={{ border: "1px solid #8C2F26", color: "#8C2F26", fontSize: 13 }}
                          >
                            <Pencil size={14} /> এডিট
                          </button>
                          <button
                            onClick={() => handleDeleteMemo(mm)}
                            className="flex items-center justify-center px-3 py-2.5 rounded-sm active:opacity-70"
                            style={{ border: "1px solid #B5473C", color: "#B5473C" }}
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
                    className="w-full flex items-center justify-center gap-1.5 py-3 mb-3 rounded-sm active:opacity-80"
                    style={{ background: "#8C2F26", color: "#F3ECDD", fontSize: 14, fontWeight: 600 }}
                  >
                    <Plus size={16} /> নতুন মেমো বানান
                  </button>
                ) : (
                  <div className="mb-3 px-3 py-2 rounded-sm flex items-center gap-2" style={{ background: "#EFE3C8", color: "#7A2820", fontSize: 12 }}>
                    <Eye size={13} /> ভিউ মোড — নতুন মেমো বানাতে উপরে বাটনে চাপ দিয়ে এডিট মোড চালু করুন
                  </div>
                )}
                <input
                  value={memoQuery}
                  onChange={(e) => setMemoQuery(e.target.value)}
                  placeholder="কাস্টমারের নাম / ফোন / মেমো নং দিয়ে খুঁজুন…"
                  className="w-full px-3 py-2 rounded-sm outline-none mb-3"
                  style={{ border: "1px solid #D9CBA8", background: "#FFFDF7", fontSize: 13.5 }}
                />
                {memosLoading ? (
                  <p style={{ fontSize: 12, color: "#8A7A5C" }}>লোড হচ্ছে…</p>
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
                        <p style={{ fontSize: 12, color: "#8A7A5C" }}>
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
                              className="w-full text-left rounded-sm px-3 py-2.5 active:opacity-80"
                              style={{ border: "1px solid #D9CBA8", background: "#FFFDF7" }}
                            >
                              <div className="flex items-center justify-between">
                                <span style={{ fontFamily: "'Noto Serif Bengali', serif", fontSize: 15, color: "#2A211B" }}>{mm.customer}</span>
                                <span style={{ fontSize: 15, fontWeight: 700, color: "#8C2F26" }}>{fmt(c.total)}</span>
                              </div>
                              <div className="flex items-center justify-between mt-1" style={{ fontSize: 11, color: "#8A7A5C" }}>
                                <span>
                                  নং {toBn(mm.no)} · {toBn(mm.d)} {MONTH_NAMES[mm.m - 1].slice(0, 3)} {toBn(mm.y)}
                                  {mm.phone ? ` · ${mm.phone}` : ""}
                                </span>
                                {c.due > 0 ? (
                                  <span style={{ color: "#B5473C", fontWeight: 600 }}>বাকি {fmt(c.due)}</span>
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
                placeholder="নাম দিয়ে খুঁজুন…"
                className="w-full px-3 py-2 rounded-sm outline-none mb-3"
                style={{ border: "1px solid #D9CBA8", background: "#FFFDF7", fontSize: 13.5 }}
              />

              {ledgerLoading ? (
                <p style={{ fontSize: 12, color: "#8A7A5C" }}>লোড হচ্ছে…</p>
              ) : ledgerQuery.trim() ? (
                (() => {
                  const q = ledgerQuery.trim().toLowerCase();
                  const matches = ledgerData
                    .filter((r) => r.name.toLowerCase().includes(q))
                    .sort((a, b) => b.y - a.y || b.m - a.m || b.d - a.d);
                  if (matches.length === 0) return <p style={{ fontSize: 12, color: "#8A7A5C" }}>কোনো এন্ট্রি পাওয়া যায়নি।</p>;
                  return (
                    <div className="rounded-sm overflow-hidden" style={{ border: "1px solid #8C2F26" }}>
                      <div className="grid grid-cols-[70px,1fr,54px,70px]" style={{ background: "#8C2F26" }}>
                        <Th small>তারিখ</Th>
                        <Th>নাম</Th>
                        <Th small>ধরন</Th>
                        <Th right>টাকা</Th>
                      </div>
                      {matches.map((r, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-[70px,1fr,54px,70px] items-center"
                          style={{ borderTop: "1px solid #EADFC4", background: "#FFFDF7" }}
                        >
                          <div className="px-2 py-1.5" style={{ fontSize: 11, color: "#6B5D4A" }}>
                            {toBn(r.d)} {MONTH_NAMES[r.m - 1].slice(0, 3)} {toBn(r.y)}
                          </div>
                          <div className="px-2 py-1.5 truncate" style={{ fontSize: 12.5, color: "#2A211B" }}>
                            {r.name}
                          </div>
                          <div className="px-2 py-1.5" style={{ fontSize: 11, color: r.type === "খরচ" ? "#B98B3E" : "#8C2F26" }}>
                            {r.type}
                          </div>
                          <div className="px-2 py-1.5 text-right" style={{ fontSize: 12.5, fontWeight: 600, color: "#2A211B" }}>
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
                  if (list.length === 0) return <p style={{ fontSize: 12, color: "#8A7A5C" }}>এখনও কোনো বিক্রি নেই।</p>;
                  return (
                    <div className="flex flex-col gap-2">
                      {list.map((g, i) => (
                        <div key={i} className="rounded-sm px-3 py-2.5" style={{ border: "1px solid #D9CBA8", background: "#FFFDF7" }}>
                          <div className="flex items-center justify-between">
                            <span style={{ fontFamily: "'Noto Serif Bengali', serif", fontSize: 15, color: "#2A211B" }}>{g.name}</span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "#8C2F26" }}>{fmt(g.total)}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1" style={{ fontSize: 11, color: "#8A7A5C" }}>
                            <span>
                              {toBn(g.count)} টা এন্ট্রি · সর্বশেষ {toBn(g.last.d)} {MONTH_NAMES[g.last.m - 1].slice(0, 3)} {toBn(g.last.y)}
                            </span>
                            {g.due > 0 && <span style={{ color: "#B5473C", fontWeight: 600 }}>বাকি {fmt(g.due)}</span>}
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

        {/* ---------- MONTHS (+ yearly summary) ---------- */}
        {view === "months" && (
          <>
            <HeaderBar title={`সন ${toBn(year)}`} onBack={() => setView("years")} editMode={editMode} onToggleMode={toggleEditMode} />

            <div className="px-3 pt-4 lg:flex lg:justify-end">
              <div className="lg:w-full lg:max-w-md">
                <SectionTitle label="বছরের সারাংশ" />
                {yearStatsLoading ? (
                  <p style={{ fontSize: 12, color: "#8A7A5C" }}>লোড হচ্ছে…</p>
                ) : (
                  <div className="rounded-sm overflow-hidden mb-2 lg:scale-110 lg:origin-top-right" style={{ border: "1px solid #8C2F26" }}>
                    <SummaryRow label="মোট আয় =" value={fmt(yearStats.income)} />
                    <SummaryRow label="মোট খরচ = (-)" value={fmt(yearStats.expense)} negative />
                    <SummaryRow label="থাকলো =" value={fmt(yearStats.income - yearStats.expense)} strong />
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 pt-4 pb-1">
              <p style={{ color: "#6B5D4A", fontSize: 13 }}>মাস বেছে নিন</p>
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
                className="w-full flex items-center justify-center gap-2 py-2 rounded-sm active:opacity-70"
                style={{ border: "1px solid #8C2F26", color: "#8C2F26", fontSize: 12.5, fontWeight: 600 }}
              >
                <Printer size={14} /> PDF রিপোর্ট
              </button>
            </div>

            {!editMode && (
              <div
                className="mx-3 mt-3 px-3 py-2 rounded-sm flex items-center gap-2"
                style={{ background: "#EFE3C8", color: "#7A2820", fontSize: 12 }}
              >
                <Eye size={13} /> ভিউ মোড — শুধু দেখা যাচ্ছে, এডিট করতে উপরে বাটনে চাপুন
              </div>
            )}

            <div className="px-3 pt-3" style={editMode ? undefined : { pointerEvents: "none", opacity: 0.8 }}>
              {/* ---- ড্রাফট প্যানেল: নতুন এন্ট্রি বা ক্লিক করে আনা এন্ট্রি এডিট ---- */}
              <div className="rounded-sm mb-5" style={{ border: "1px solid #8C2F26", background: "#F3ECDD" }}>
                <div className="flex items-center justify-center gap-2 px-3 pt-3 pb-2">
                  <span style={{ fontFamily: "'Noto Serif Bengali', serif", fontSize: 16, color: "#8C2F26" }}>তারিখ</span>
                  <select
                    value={draftDay}
                    onChange={(e) => setDraftDay(Number(e.target.value))}
                    className="rounded-sm"
                    style={{ fontSize: 13, background: "#FFFDF7", border: "1px solid #D9CBA8", padding: "4px 5px" }}
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
                    className="rounded-sm"
                    style={{ fontSize: 13, background: "#FFFDF7", border: "1px solid #D9CBA8", padding: "4px 5px" }}
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
                    className="rounded-sm"
                    style={{ fontSize: 13, background: "#FFFDF7", border: "1px solid #D9CBA8", padding: "4px 5px" }}
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {toBn(y)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col lg:flex-row">
                  {/* --- বিক্রি ড্রাফট (৭০%, একাধিক সারি) --- */}
                  <div className="px-3 lg:w-[70%]">
                    <p style={{ fontFamily: "'Noto Serif Bengali', serif", fontSize: 16, color: "#8C2F26", margin: "4px 0" }}>বিক্রি</p>
                    <NameDropdown
                      label="বিক্রির নাম বেছে নিন"
                      names={allSaleNames}
                      customNames={customSaleNames}
                      onPick={applySalePreset}
                      onAdd={() => addPresetName("sale")}
                      onRemove={(n) => removePresetName("sale", n)}
                    />
                    <div className="rounded-sm overflow-hidden" style={{ border: "1px solid #D9CBA8" }}>
                      <div className="overflow-x-auto">
                        <div
                          className="grid items-center"
                          style={{ gridTemplateColumns: "120px 48px 48px 56px 48px 56px 48px 48px 24px", background: "#B98B3E", minWidth: 480 }}
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
                              gridTemplateColumns: "120px 48px 48px 56px 48px 56px 48px 48px 24px",
                              background: "#FFFDF7",
                              minWidth: 480,
                              borderTop: idx > 0 ? "1px solid #EADFC4" : "none",
                            }}
                          >
                            <input
                              value={row.name}
                              onChange={(e) => updateSaleDraft(idx, "name", e.target.value)}
                              list="sale-name-options"
                              placeholder="নাম"
                              className="min-w-0 px-1.5 py-2 bg-transparent outline-none"
                              style={{ fontSize: 14, color: "#2A211B" }}
                            />
                            <input
                              value={row.height}
                              onChange={(e) => updateSaleDraft(idx, "height", e.target.value)}
                              inputMode="decimal"
                              placeholder="—"
                              className="min-w-0 w-full px-0.5 py-2 bg-transparent outline-none text-right"
                              style={{ fontSize: 14, color: "#2A211B" }}
                            />
                            <input
                              value={row.weight}
                              onChange={(e) => updateSaleDraft(idx, "weight", e.target.value)}
                              inputMode="decimal"
                              placeholder="—"
                              className="min-w-0 w-full px-0.5 py-2 bg-transparent outline-none text-right"
                              style={{ fontSize: 14, color: "#2A211B" }}
                            />
                            <input
                              value={row.qty}
                              onChange={(e) => updateSaleDraft(idx, "qty", e.target.value)}
                              inputMode="decimal"
                              placeholder="1"
                              className="min-w-0 w-full px-0.5 py-2 bg-transparent outline-none text-right"
                              style={{ fontSize: 14, color: "#2A211B" }}
                            />
                            <input
                              value={row.price}
                              onChange={(e) => updateSaleDraft(idx, "price", e.target.value)}
                              inputMode="decimal"
                              placeholder="0"
                              className="min-w-0 w-full px-0.5 py-2 bg-transparent outline-none text-right"
                              style={{ fontSize: 14, color: "#2A211B" }}
                            />
                            <div className="px-1 py-2 text-right truncate" style={{ fontSize: 14, color: "#5B3E1B", fontWeight: 700 }}>
                              {fmt(netTotal(row))}
                            </div>
                            <input
                              value={row.due}
                              onChange={(e) => updateSaleDraft(idx, "due", e.target.value)}
                              inputMode="decimal"
                              placeholder="0"
                              className="min-w-0 w-full px-0.5 py-2 bg-transparent outline-none text-right"
                              style={{ fontSize: 14, color: "#B5473C", fontWeight: 600 }}
                            />
                            <input
                              value={row.discount}
                              onChange={(e) => updateSaleDraft(idx, "discount", e.target.value)}
                              inputMode="decimal"
                              placeholder="0"
                              className="min-w-0 w-full px-0.5 py-2 bg-transparent outline-none text-right"
                              style={{ fontSize: 14, color: "#8C6A2F", fontWeight: 600 }}
                            />
                            <button
                              onClick={() => removeSaleDraftRow(idx)}
                              className="flex items-center justify-center h-full"
                              style={{ color: "#B5473C" }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="px-2 py-1.5" style={{ fontSize: 12, color: "#8A7A5C", background: "#F3ECDD" }}>
                        মোট = (হাইট × ওয়েট × পরিমান × দাম) − বাকি − ছাড়।
                      </p>
                    </div>
                    <button
                      onClick={() => setSaleDrafts((rows) => [...rows, emptySaleDraft()])}
                      className="w-full flex items-center justify-center gap-1 py-2 mt-1 rounded-sm active:opacity-70"
                      style={{ background: "#F3ECDD", color: "#8C2F26", fontSize: 14, border: "1px dashed #D9CBA8" }}
                    >
                      <Plus size={15} /> বিক্রি যোগ করুন
                    </button>
                  </div>

                  {/* --- খরচ ড্রাফট (৩০%, একাধিক সারি) --- */}
                  <div className="px-3 mt-3 lg:mt-0 lg:w-[30%]">
                    <p style={{ fontFamily: "'Noto Serif Bengali', serif", fontSize: 16, color: "#8C2F26", margin: "4px 0" }}>খরচ</p>
                    <NameDropdown
                      label="খরচের নাম বেছে নিন"
                      names={allExpenseNames}
                      customNames={customExpenseNames}
                      onPick={applyExpensePreset}
                      onAdd={() => addPresetName("expense")}
                      onRemove={(n) => removePresetName("expense", n)}
                    />
                    <div className="rounded-sm overflow-hidden" style={{ border: "1px solid #D9CBA8" }}>
                      <div className="grid" style={{ gridTemplateColumns: "1fr 70px 24px", background: "#8C2F26" }}>
                        <Th>বিবরণ</Th>
                        <Th right>টাকা</Th>
                        <Th />
                      </div>
                      {expenseDrafts.map((row, idx) => (
                        <div
                          key={idx}
                          className="grid items-center"
                          style={{ gridTemplateColumns: "1fr 70px 24px", background: "#FFFDF7", borderTop: idx > 0 ? "1px solid #EADFC4" : "none" }}
                        >
                          <input
                            value={row.name}
                            onChange={(e) => updateExpenseDraft(idx, "name", e.target.value)}
                            list="expense-name-options"
                            placeholder="যেমন: নাস্তা"
                            className="min-w-0 px-2 py-2 bg-transparent outline-none"
                            style={{ fontSize: 15, color: "#2A211B" }}
                          />
                          <input
                            value={row.amount}
                            onChange={(e) => updateExpenseDraft(idx, "amount", e.target.value)}
                            inputMode="decimal"
                            placeholder="0"
                            className="min-w-0 w-full px-1 py-2 bg-transparent outline-none text-right"
                            style={{ fontSize: 15, color: "#2A211B" }}
                          />
                          <button onClick={() => removeExpenseDraftRow(idx)} className="flex items-center justify-center h-full" style={{ color: "#B5473C" }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setExpenseDrafts((rows) => [...rows, emptyExpenseDraft()])}
                      className="w-full flex items-center justify-center gap-1 py-2 mt-1 rounded-sm active:opacity-70"
                      style={{ background: "#F3ECDD", color: "#8C2F26", fontSize: 14, border: "1px dashed #D9CBA8" }}
                    >
                      <Plus size={15} /> খরচ যোগ করুন
                    </button>
                  </div>
                </div>

                <div className="px-3 py-3 flex gap-2">
                  <button
                    onClick={() => resetDraft(draftYear, draftMonth)}
                    className="px-3 py-2 rounded-sm active:opacity-70"
                    style={{ border: "1px solid #8C2F26", color: "#8C2F26", fontSize: 12 }}
                  >
                    বাতিল
                  </button>
                  <button
                    onClick={handleSaveDraft}
                    disabled={saving}
                    className="flex-1 py-2 rounded-sm active:opacity-80"
                    style={{ background: "#8C2F26", color: "#F3ECDD", fontSize: 13, fontWeight: 600 }}
                  >
                    {saving ? "সেভ হচ্ছে…" : "সেভ করুন"}
                  </button>
                </div>
              </div>

              {/* ---- প্রতিদিনের বক্স ---- */}
              {monthLoading ? (
                <div className="flex items-center justify-center py-10" style={{ color: "#8C2F26" }}>
                  লোড হচ্ছে…
                </div>
              ) : (
                <div className="pb-10">
                  {Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1).map((d) => {
                    const dayData = monthEntries[d];
                    const hasEntries = dayData && (dayData.expenses.length > 0 || dayData.items.length > 0);
                    return (
                      <div key={d} className="rounded-sm mb-3" style={{ border: "1px solid #D9CBA8" }}>
                        <div
                          className="px-3 py-2 flex items-center justify-between"
                          style={{ background: "#F3ECDD" }}
                        >
                          <p style={{ fontFamily: "'Noto Serif Bengali', serif", fontSize: 15, color: "#8C2F26", margin: 0 }}>
                            {toBn(d)} {MONTH_NAMES[month - 1]}, {toBn(year)} <span style={{ fontSize: 12, color: "#8A7A5C" }}>({getWeekday(year, month, d)})</span>
                          </p>
                          {hasEntries && (
                            <button
                              onClick={() => printDayMemo(year, month, d, dayData)}
                              className="flex items-center gap-1 px-2 py-1 rounded-sm active:opacity-70"
                              style={{ border: "1px solid #8C2F26", color: "#8C2F26", fontSize: 10.5 }}
                            >
                              <Printer size={12} /> মেমো
                            </button>
                          )}
                        </div>
                        {!hasEntries ? (
                          <p className="px-3 py-2" style={{ fontSize: 11, color: "#8A7A5C", margin: 0 }}>
                            কোনো এন্ট্রি নেই
                          </p>
                        ) : (
                          <>
                          <div className="flex flex-col lg:flex-row">
                            {/* ---- বিক্রি (৭০%) ---- */}
                            <div className="lg:w-[70%] overflow-x-auto" style={{ borderRight: "1px solid #D9CBA8" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 420 }}>
                                <thead>
                                  <tr style={{ background: "#8C2F26", color: "#F3ECDD" }}>
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
                                      <td colSpan={9} style={{ padding: "6px", fontSize: 12, color: "#8A7A5C", background: "#FFFDF7" }}>
                                        কোনো বিক্রি নেই
                                      </td>
                                    </tr>
                                  ) : (
                                    dayData.items.map((row) => (
                                      <tr
                                        key={row.id}
                                        onClick={() => loadClickedSale(year, month, d, row)}
                                        style={{ borderTop: "1px solid #EADFC4", background: "#FFFDF7", cursor: "pointer" }}
                                      >
                                        <td style={{ padding: "5px 6px" }}>{row.name}</td>
                                        <td style={{ padding: "5px 6px", textAlign: "right" }}>{row.height || "—"}</td>
                                        <td style={{ padding: "5px 6px", textAlign: "right" }}>{row.weight || "—"}</td>
                                        <td style={{ padding: "5px 6px", textAlign: "right" }}>{row.qty || "১"}</td>
                                        <td style={{ padding: "5px 6px", textAlign: "right" }}>{row.price || 0}</td>
                                        <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 700 }}>{fmt(netTotal(row))}</td>
                                        <td style={{ padding: "5px 6px", textAlign: "right", color: "#B5473C" }}>
                                          {row.due || 0}
                                          {num(row.duePaid) > 0 && (
                                            <div style={{ fontSize: 9.5, color: "#5B7F3E" }}>শোধ {fmt(num(row.duePaid))}</div>
                                          )}
                                        </td>
                                        <td style={{ padding: "5px 6px", textAlign: "right", color: "#8C6A2F" }}>{row.discount || 0}</td>
                                        <td style={{ padding: "5px 6px", textAlign: "right" }}>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteSaleRow(year, month, d, row.id);
                                            }}
                                            style={{ color: "#B5473C" }}
                                          >
                                            <Trash2 size={13} />
                                          </button>
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
                                  <tr style={{ background: "#B98B3E", color: "#F3ECDD" }}>
                                    <th style={{ padding: "5px 6px", textAlign: "left", fontWeight: 600 }}>খরচ</th>
                                    <th style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>টাকা</th>
                                    <th style={{ padding: "5px 6px" }}></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {dayData.expenses.length === 0 ? (
                                    <tr>
                                      <td colSpan={3} style={{ padding: "6px", fontSize: 12, color: "#8A7A5C", background: "#FFFDF7" }}>
                                        কোনো খরচ নেই
                                      </td>
                                    </tr>
                                  ) : (
                                    dayData.expenses.map((row) => (
                                      <tr
                                        key={row.id}
                                        onClick={() => loadClickedExpense(year, month, d, row)}
                                        style={{ borderTop: "1px solid #EADFC4", background: "#FFFDF7", cursor: "pointer" }}
                                      >
                                        <td style={{ padding: "5px 6px" }}>{row.name}</td>
                                        <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 700 }}>{fmt(num(row.amount) || 0)}</td>
                                        <td style={{ padding: "5px 6px", textAlign: "right" }}>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteExpenseRow(year, month, d, row.id);
                                            }}
                                            style={{ color: "#B5473C" }}
                                          >
                                            <Trash2 size={13} />
                                          </button>
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
                              <div className="grid" style={{ gridTemplateColumns: "repeat(7,1fr)", background: "#B98B3E", color: "#F3ECDD", fontSize: 11 }}>
                                <span style={{ padding: "5px 4px" }}>ইজা টাকা =</span>
                                <span style={{ padding: "5px 4px" }}>বিক্রি মোট =</span>
                                <span style={{ padding: "5px 4px" }}>(বাকি)</span>
                                <span style={{ padding: "5px 4px" }}>(ছাড়)</span>
                                <span style={{ padding: "5px 4px" }}>মোট টাকা =</span>
                                <span style={{ padding: "5px 4px" }}>মোট খরচ =</span>
                                <span style={{ padding: "5px 4px" }}>অবশিষ্ট =</span>
                              </div>
                              <div className="grid" style={{ gridTemplateColumns: "repeat(7,1fr)", background: "#FFFDF7", fontSize: 12.5, fontWeight: 700 }}>
                                <span style={{ padding: "5px 4px" }}>{fmt(dayData.opening)}</span>
                                <span style={{ padding: "5px 4px" }}>{fmt(dayData.itemsTotal)}</span>
                                <span style={{ padding: "5px 4px", color: "#B5473C" }}>{fmt(dayData.duesTotalDay)}</span>
                                <span style={{ padding: "5px 4px", color: "#8C6A2F" }}>{fmt(dayData.discountTotalDay)}</span>
                                <span style={{ padding: "5px 4px" }}>{fmt(dayData.totalMoney)}</span>
                                <span style={{ padding: "5px 4px", color: "#B5473C" }}>{fmt(dayData.expenseTotal)}</span>
                                <span style={{ padding: "5px 4px", fontWeight: 700, color: "#7A2820" }}>{fmt(dayData.remaining)}</span>
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


        {/* ---------- DAY DETAIL ---------- */}
        {view === "day" && (
          <>
            <HeaderBar
              title={`${toBn(day)} ${MONTH_NAMES[month - 1]}, ${toBn(year)}`}
              onBack={() => setView("days")}
              editMode={editMode}
              onToggleMode={toggleEditMode}
            />

            {loading ? (
              <div className="flex-1 flex items-center justify-center py-20" style={{ color: "#8C2F26" }}>
                লোড হচ্ছে…
              </div>
            ) : (
              <>
                {!editMode && (
                  <div
                    className="mx-3 mt-3 px-3 py-2 rounded-sm flex items-center gap-2"
                    style={{ background: "#EFE3C8", color: "#7A2820", fontSize: 12 }}
                  >
                    <Eye size={13} /> ভিউ মোড — শুধু দেখা যাচ্ছে, এডিট করতে উপরে বাটনে চাপুন
                  </div>
                )}
                <div
                  className="flex-1 px-3 pt-4 pb-10"
                  style={editMode ? undefined : { pointerEvents: "none", opacity: 0.8 }}
                >
                  {/* --- Expenses section (compact) --- */}
                  <SectionTitle label="খরচ" />
                  <div className="rounded-sm overflow-hidden mb-5" style={{ border: "1px solid #D9CBA8" }}>
                    <div className="grid" style={{ gridTemplateColumns: "1fr 64px 22px", background: "#8C2F26" }}>
                      <Th small>বিবরণ</Th>
                      <Th right small>টাকা</Th>
                      <Th />
                    </div>
                    {expenses.map((row) => (
                      <div
                        key={row.id}
                        className="grid items-center"
                        style={{ gridTemplateColumns: "1fr 64px 22px", borderTop: "1px solid #EADFC4", background: "#FFFDF7" }}
                      >
                        <input
                          value={row.name}
                          onChange={(e) => updateExpense(row.id, "name", e.target.value)}
                          placeholder="যেমন: নাস্তা"
                          className="min-w-0 px-1.5 py-1.5 bg-transparent outline-none"
                          style={{ fontSize: 12.5, color: "#2A211B" }}
                        />
                        <input
                          value={row.amount}
                          onChange={(e) => updateExpense(row.id, "amount", e.target.value)}
                          inputMode="decimal"
                          placeholder="0"
                          className="min-w-0 w-full px-1 py-1.5 bg-transparent outline-none text-right"
                          style={{ fontSize: 12.5, color: "#2A211B" }}
                        />
                        <button
                          onClick={() => setExpenses((rows) => rows.filter((r) => r.id !== row.id))}
                          className="flex items-center justify-center h-full active:opacity-60"
                          style={{ color: "#B5473C" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setExpenses((rows) => [...rows, newExpenseRow()])}
                      className="w-full flex items-center justify-center gap-1 py-2 active:opacity-70"
                      style={{ background: "#F3ECDD", color: "#8C2F26", fontSize: 12.5, borderTop: "1px solid #EADFC4" }}
                    >
                      <Plus size={13} /> খরচ যোগ করুন
                    </button>
                  </div>

                  {/* --- Sale section --- */}
                  <SectionTitle label="বিক্রি" />
                  <div className="rounded-sm overflow-hidden mb-5" style={{ border: "1px solid #D9CBA8" }}>
                    <div
                      className="grid items-center"
                      style={{ gridTemplateColumns: "1fr 30px 30px 40px 30px 34px 32px 30px 18px", background: "#B98B3E" }}
                    >
                      <Th small>নাম</Th>
                      <Th right small>হাইট</Th>
                      <Th right small>ওয়েট</Th>
                      <Th right small>পরিমান</Th>
                      <Th right small>দাম</Th>
                      <Th right small>মোট</Th>
                      <Th right small>বাকি</Th>
                      <Th right small>ছাড়</Th>
                      <Th />
                    </div>
                    {items.map((row) => (
                      <div
                        key={row.id}
                        className="grid items-center"
                        style={{
                          gridTemplateColumns: "1fr 30px 30px 40px 30px 34px 32px 30px 18px",
                          borderTop: "1px solid #EADFC4",
                          background: "#FFFDF7",
                        }}
                      >
                        <input
                          value={row.name}
                          onChange={(e) => updateItem(row.id, "name", e.target.value)}
                          placeholder="নাম"
                          className="min-w-0 px-1 py-1.5 bg-transparent outline-none"
                          style={{ fontSize: 10.5, color: "#2A211B" }}
                        />
                        <input
                          value={row.height}
                          onChange={(e) => updateItem(row.id, "height", e.target.value)}
                          inputMode="decimal"
                          placeholder="—"
                          className="min-w-0 w-full px-0 py-1.5 bg-transparent outline-none text-right"
                          style={{ fontSize: 10.5, color: "#2A211B" }}
                        />
                        <input
                          value={row.weight}
                          onChange={(e) => updateItem(row.id, "weight", e.target.value)}
                          inputMode="decimal"
                          placeholder="—"
                          className="min-w-0 w-full px-0 py-1.5 bg-transparent outline-none text-right"
                          style={{ fontSize: 10.5, color: "#2A211B" }}
                        />
                        <input
                          value={row.qty}
                          onChange={(e) => updateItem(row.id, "qty", e.target.value)}
                          inputMode="decimal"
                          placeholder="1"
                          className="min-w-0 w-full px-0 py-1.5 bg-transparent outline-none text-right"
                          style={{ fontSize: 10.5, color: "#2A211B" }}
                        />
                        <input
                          value={row.price}
                          onChange={(e) => updateItem(row.id, "price", e.target.value)}
                          inputMode="decimal"
                          placeholder="0"
                          className="min-w-0 w-full px-0 py-1.5 bg-transparent outline-none text-right"
                          style={{ fontSize: 10.5, color: "#2A211B" }}
                        />
                        <div className="px-0.5 py-1.5 text-right truncate" style={{ fontSize: 10.5, color: "#5B3E1B", fontWeight: 600 }}>
                          {fmt(netTotal(row))}
                        </div>
                        <input
                          value={row.due}
                          onChange={(e) => updateItem(row.id, "due", e.target.value)}
                          inputMode="decimal"
                          placeholder="0"
                          className="min-w-0 w-full px-0 py-1.5 bg-transparent outline-none text-right"
                          style={{ fontSize: 10.5, color: "#B5473C", fontWeight: 600 }}
                        />
                        <input
                          value={row.discount}
                          onChange={(e) => updateItem(row.id, "discount", e.target.value)}
                          inputMode="decimal"
                          placeholder="0"
                          className="min-w-0 w-full px-0 py-1.5 bg-transparent outline-none text-right"
                          style={{ fontSize: 10.5, color: "#8C6A2F", fontWeight: 600 }}
                        />
                        <button
                          onClick={() => setItems((rows) => rows.filter((r) => r.id !== row.id))}
                          className="flex items-center justify-center h-full active:opacity-60"
                          style={{ color: "#B5473C" }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setItems((rows) => [...rows, newItemRow()])}
                      className="w-full flex items-center justify-center gap-1 py-2 active:opacity-70"
                      style={{ background: "#F3ECDD", color: "#8C2F26", fontSize: 12.5, borderTop: "1px solid #EADFC4" }}
                    >
                      <Plus size={13} /> বিক্রি যোগ করুন
                    </button>
                    <p className="px-3 py-1.5" style={{ fontSize: 10.5, color: "#8A7A5C", background: "#F3ECDD" }}>
                      মোট = (হাইট × ওয়েট × পরিমান × দাম) − বাকি − ছাড়।
                    </p>
                  </div>

                  {/* --- Summary --- */}
                  <div className="rounded-sm overflow-hidden" style={{ border: "1px solid #8C2F26" }}>
                    <SummaryRow
                      label="ইজা টাকা ="
                      value={
                        <input
                          value={openingOverride ?? opening}
                          onChange={(e) => setOpeningOverride(e.target.value === "" ? "" : e.target.value)}
                          onBlur={(e) => {
                            if (e.target.value === "") setOpeningOverride(null);
                          }}
                          inputMode="decimal"
                          className="bg-transparent outline-none text-right w-full"
                          style={{ fontWeight: 700, color: "#2A211B" }}
                        />
                      }
                      editableHint="অটো আসে, চাইলে বদলান"
                    />
                    <SummaryRow label="বিক্রি মোট =" value={fmt(itemsTotal)} />
                    <SummaryRow label="(এর মধ্যে বাকি)" value={fmt(duesTotalDay)} muted />
                    <SummaryRow label="(এর মধ্যে ছাড়)" value={fmt(discountTotalDay)} muted />
                    <SummaryRow
                      label="মোট টাকা ="
                      value={
                        <input
                          value={totalOverride ?? computedTotalMoney}
                          onChange={(e) => setTotalOverride(e.target.value === "" ? "" : e.target.value)}
                          onBlur={(e) => {
                            if (e.target.value === "") setTotalOverride(null);
                          }}
                          inputMode="decimal"
                          className="bg-transparent outline-none text-right w-full"
                          style={{ fontWeight: 700, color: "#2A211B" }}
                        />
                      }
                      editableHint="অটো আসে, চাইলে বদলান"
                    />
                    <SummaryRow label="মোট খরচ = (-)" value={fmt(expenseTotal)} negative />
                    <SummaryRow label="অবশিষ্ট =" value={fmt(remaining)} strong />
                  </div>

                  <button onClick={clearDay} className="mt-6 mx-auto block px-4 py-2 active:opacity-70" style={{ fontSize: 12, color: "#B5473C" }}>
                    এই দিনের হিসাব মুছে ফেলুন
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
