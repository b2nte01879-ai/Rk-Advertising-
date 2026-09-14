import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, ChevronLeft, BookOpen, Pencil, Eye, Download } from "lucide-react";
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

  // এডিট/ভিউ মোড এখন এই ব্রাউজারের নিজস্ব পছন্দ (localStorage), Firestore-এ যায় না
  useEffect(() => {
    try {
      if (localStorage.getItem("editMode") === "true") setEditMode(true);
    } catch (e) {
      /* default: view mode */
    }
  }, []);

  const toggleEditMode = () => {
    setEditMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("editMode", next ? "true" : "false");
      } catch (e) {
        /* ignore */
      }
      return next;
    });
  };

  const [year, setYear] = useState(null);
  const [month, setMonth] = useState(null);
  const [day, setDay] = useState(null);

  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [items, setItems] = useState([]);
  const [opening, setOpening] = useState(0);
  const [openingOverride, setOpeningOverride] = useState(null);
  const [totalOverride, setTotalOverride] = useState(null);

  const [allDues, setAllDues] = useState([]);
  const [allDuesLoading, setAllDuesLoading] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  const [yearStats, setYearStats] = useState({ income: 0, expense: 0 });
  const [yearStatsLoading, setYearStatsLoading] = useState(false);

  const loadedRef = useRef(false);
  const saveTimer = useRef(null);

  const openDay = (y, m, d) => {
    setYear(y);
    setMonth(m);
    setDay(d);
    setView("day");
  };

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

  // দিনের ডেটা লোড
  useEffect(() => {
    if (view !== "day" || !year || !month || !day) return;
    let cancelled = false;
    loadedRef.current = false;
    setLoading(true);
    (async () => {
      const data = await loadDay(year, month, day);
      const openingAuto = data.openingOverride ?? (await findOpeningBalance(year, month, day));
      if (cancelled) return;
      setExpenses(data.expenses);
      setItems(data.items);
      setOpeningOverride(data.openingOverride);
      setOpening(openingAuto);
      setTotalOverride(data.totalOverride);
      setLoading(false);
      loadedRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [view, year, month, day]);

  // derived totals
  const itemsTotal = items.reduce((s, it) => s + (netTotal(it) || 0), 0);
  const duesTotalDay = items.reduce((s, it) => s + (isNaN(num(it.due)) ? 0 : num(it.due)), 0);
  const discountTotalDay = items.reduce((s, it) => s + (isNaN(num(it.discount)) ? 0 : num(it.discount)), 0);
  const expenseTotal = expenses.reduce((s, e) => s + (isNaN(num(e.amount)) ? 0 : num(e.amount)), 0);
  const computedTotalMoney = opening + itemsTotal;
  const totalMoney =
    totalOverride !== null && totalOverride !== "" && !isNaN(num(totalOverride)) ? num(totalOverride) : computedTotalMoney;
  const remaining = totalMoney - expenseTotal;

  // autosave (debounced) — সরাসরি Firestore-এ যায়
  useEffect(() => {
    if (!loadedRef.current || view !== "day") return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await saveDay(year, month, day, { expenses, items, openingOverride, totalOverride });
      const dueRows = items
        .filter((it) => !isNaN(num(it.due)) && num(it.due) > 0)
        .map((it) => ({ name: it.name || "(নামহীন)", amount: num(it.due) }));
      await saveDuesForDate(year, month, day, dueRows);
      await saveYearStatsForDate(year, month, day, itemsTotal, expenseTotal, remaining);
    }, 500);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, items, openingOverride, totalOverride, year, month, day]);

  const updateExpense = (id, field, val) =>
    setExpenses((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  const updateItem = (id, field, val) =>
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));

  const clearDay = () => {
    setExpenses([newExpenseRow()]);
    setItems([newItemRow()]);
    setOpeningOverride(null);
  };

  return (
    <div className="min-h-screen w-full flex justify-center bg-[#E4D8BE] lg:bg-[#F3ECDD]">
      <style>{`
        @media (min-width: 1024px) {
          .rk-zoom { zoom: 1.35; }
          .rk-zoom .rk-days-grid { zoom: 0.45; }
          .rk-zoom .rk-brand-title { font-size: 20px !important; }
        }
        @media (min-width: 1440px) {
          .rk-zoom { zoom: 1.55; }
          .rk-zoom .rk-days-grid { zoom: 0.4; }
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
                  {allDues.map((e, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[84px,1fr,70px] items-center"
                      style={{ borderTop: "1px solid #EADFC4", background: "#FFFDF7" }}
                    >
                      <div className="px-2 py-1.5" style={{ fontSize: 11.5, color: "#6B5D4A" }}>
                        {toBn(e.d)} {MONTH_NAMES[e.m - 1].slice(0, 3)} {toBn(e.y)}
                      </div>
                      <div className="px-2 py-1.5 truncate" style={{ fontSize: 12.5, color: "#2A211B" }}>
                        {e.name}
                      </div>
                      <div className="px-2 py-1.5 text-right" style={{ fontSize: 12.5, fontWeight: 600, color: "#B5473C" }}>
                        {fmt(e.amount)}
                      </div>
                    </div>
                  ))}
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

        {/* ---------- DAYS ---------- */}
        {view === "days" && (
          <>
            <HeaderBar
              title={`${MONTH_NAMES[month - 1]}, ${toBn(year)}`}
              onBack={() => setView("months")}
              editMode={editMode}
              onToggleMode={toggleEditMode}
            />
            <div className="rk-days-grid grid grid-cols-5 gap-2 p-4">
              {Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1).map((d) => (
                <button
                  key={d}
                  onClick={() => openDay(year, month, d)}
                  className="aspect-square flex items-center justify-center rounded-sm active:opacity-70"
                  style={{ background: "#FFFDF7", border: "1px solid #D9CBA8", color: "#2A211B", fontFamily: "'Noto Serif Bengali', serif", fontSize: 17 }}
                >
                  {toBn(d)}
                </button>
              ))}
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
