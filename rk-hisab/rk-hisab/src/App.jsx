import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, ChevronLeft, BookOpen, Pencil, Eye, Download, Search, Printer } from "lucide-react";
import { storage } from "./firebase";

// ---------- constants ----------
const YEARS = [2026, 2027, 2028, 2029, 2030];
const MONTH_NAMES = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];
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
          due: num(it.due) || 0,
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

const HeaderBar = ({ title, onBack, editMode, onToggleMode }) => (
  <div className="flex items-center gap-3 px-4 py-4 sticky top-0 z-10" style={{ background: "#7A2820", color: "#F3ECDD" }}>
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

// ---------- main app ----------
export default function LedgerApp() {
  useLedgerFonts();

  const [view, setView] = useState("years"); // years | dues | months | days | day
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
  const [backingUp, setBackingUp] = useState(false);

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
      .filter((it) => !isNaN(num(it.due)) && num(it.due) > 0)
      .map((it) => ({ name: it.name || "(নামহীন)", amount: num(it.due) }));
    await saveDuesForDate(y, m, d, dueRows);
    await saveYearStatsForDate(y, m, d, itemsTotal, expenseTotal, remaining);
  }

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
    const win = window.open("", "_blank");
    if (!win) return;
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
      const results = await Promise.all(YEARS.map((y) => loadDues(y)));
      const flat = [];
      results.forEach((duesForYear, idx) => {
        const y = YEARS[idx];
        Object.entries(duesForYear).forEach(([k, entries]) => {
          const [m, d] = k.split("-").map(Number);
          entries.forEach((e) => flat.push({ y, m, d, ...e }));
        });
      });
      flat.sort((a, b) => a.y - b.y || a.m - b.m || a.d - b.d);
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
      <div
        className="rk-zoom min-h-screen w-full flex flex-col sm:h-[calc(100vh-48px)] sm:max-w-[460px] sm:my-6 sm:rounded-lg sm:shadow-2xl sm:overflow-y-auto lg:max-w-6xl lg:h-screen lg:my-0 lg:rounded-none lg:shadow-none"
        style={{ background: "#F3ECDD", fontFamily: "'Noto Sans Bengali', sans-serif" }}
      >
        {/* ---------- YEARS ---------- */}
        {view === "years" && (
          <>
            <HeaderBar
              title={
                <div className="leading-tight">
                  <div className="rk-brand-title" style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3, opacity: 0.9 }}>
                    R.K ADVERTISING AND DIGITAL HOUSE
                  </div>
                  <div style={{ fontFamily: "'Noto Serif Bengali', serif", fontSize: 18 }}>দৈনিক হিসাব</div>
                </div>
              }
              editMode={editMode}
              onToggleMode={toggleEditMode}
            />

            <div className="px-3 pt-5 pb-1 lg:flex">
              <button
                onClick={() => setView("dues")}
                className="w-full flex items-center justify-between px-4 py-4 rounded-sm active:opacity-80 lg:w-auto lg:min-w-[320px] lg:max-w-sm"
                style={{ background: "#8C2F26", color: "#F3ECDD" }}
              >
                <div className="text-left">
                  <div style={{ fontFamily: "'Noto Serif Bengali', serif", fontSize: 17 }}>বাকির লিস্ট</div>
                  <div style={{ fontSize: 11.5, opacity: 0.8, marginTop: 2 }}>
                    {allDuesLoading ? "লোড হচ্ছে…" : `${toBn(allDues.length)} টা এন্ট্রি`}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    {allDuesLoading ? "…" : fmt(allDues.reduce((s, e) => s + (e.amount || 0), 0))}
                  </div>
                  <div style={{ fontSize: 10.5, opacity: 0.8 }}>দেখতে ট্যাপ করুন</div>
                </div>
              </button>
            </div>

            {todaySummary && (
              <div className="px-3 pt-3">
                <SectionTitle label="আজকের হিসাব" />
                <div className="rounded-sm overflow-hidden mb-1" style={{ border: "1px solid #8C2F26" }}>
                  <div className="grid grid-cols-3" style={{ background: "#FFFDF7" }}>
                    <div className="px-2 py-2 text-center" style={{ borderRight: "1px solid #EADFC4" }}>
                      <div style={{ fontSize: 10, color: "#6B5D4A" }}>আয়</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#2A211B" }}>{fmt(todayLoading ? 0 : todaySummary.itemsTotal)}</div>
                    </div>
                    <div className="px-2 py-2 text-center" style={{ borderRight: "1px solid #EADFC4" }}>
                      <div style={{ fontSize: 10, color: "#6B5D4A" }}>খরচ</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#B5473C" }}>{fmt(todayLoading ? 0 : todaySummary.expenseTotal)}</div>
                    </div>
                    <div className="px-2 py-2 text-center" style={{ background: "#8C2F26" }}>
                      <div style={{ fontSize: 10, color: "#F3ECDD", opacity: 0.85 }}>অবশিষ্ট</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#F3ECDD" }}>{fmt(todayLoading ? 0 : todaySummary.remaining)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="px-4 pt-4 pb-2">
              <p style={{ color: "#6B5D4A", fontSize: 13 }}>বছর বেছে নিন</p>
            </div>
            <div className="flex flex-col">
              {YEARS.map((y) => (
                <Tab
                  key={y}
                  index={toBn(y)}
                  label={`সন ${toBn(y)}`}
                  sub="১২ মাস"
                  onClick={() => {
                    setYear(y);
                    setView("months");
                  }}
                />
              ))}
            </div>

            <div className="px-3 pt-4">
              <button
                onClick={() => setView("ledger")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-sm active:opacity-70"
                style={{ border: "1px solid #8C2F26", color: "#8C2F26", fontSize: 13, fontWeight: 600 }}
              >
                <Search size={15} /> গ্রাহক লেজার / এন্ট্রি খুঁজুন
              </button>
            </div>

            <div className="px-4 pt-6 pb-8">
              <button
                onClick={() => {
                  setBackingUp(true);
                  downloadBackupCsv(() => setBackingUp(false));
                }}
                disabled={backingUp}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-sm active:opacity-70"
                style={{ border: "1px solid #8C2F26", color: "#8C2F26", fontSize: 13, fontWeight: 600 }}
              >
                <Download size={15} />
                {backingUp ? "তৈরি হচ্ছে…" : "ব্যাকআপ ডাউনলোড করুন (CSV)"}
              </button>
            </div>
          </>
        )}

        {/* ---------- DUES (all years) ---------- */}
        {view === "dues" && (
          <>
            <HeaderBar title="বাকির লিস্ট" onBack={() => setView("years")} editMode={editMode} onToggleMode={toggleEditMode} />
            <div className="px-3 pt-4 pb-8">
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
                    return (
                      <div
                        key={i}
                        className="grid grid-cols-[84px,1fr,70px] items-center"
                        style={{
                          borderTop: "1px solid #EADFC4",
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
                    <div className="rounded-sm overflow-hidden" style={{ border: "1px solid #D9CBA8" }}>
                      <div className="overflow-x-auto">
                        <div
                          className="grid items-center"
                          style={{ gridTemplateColumns: "100px 48px 48px 56px 48px 56px 48px 48px 24px", background: "#B98B3E", minWidth: 460 }}
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
                              gridTemplateColumns: "100px 48px 48px 56px 48px 56px 48px 48px 24px",
                              background: "#FFFDF7",
                              minWidth: 460,
                              borderTop: idx > 0 ? "1px solid #EADFC4" : "none",
                            }}
                          >
                            <input
                              value={row.name}
                              onChange={(e) => updateSaleDraft(idx, "name", e.target.value)}
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
                        <p
                          className="px-3 py-2"
                          style={{ fontFamily: "'Noto Serif Bengali', serif", fontSize: 15, color: "#8C2F26", background: "#F3ECDD", margin: 0 }}
                        >
                          {toBn(d)} {MONTH_NAMES[month - 1]}, {toBn(year)}
                        </p>
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
                                        <td style={{ padding: "5px 6px", textAlign: "right", color: "#B5473C" }}>{row.due || 0}</td>
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
