import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, ChevronLeft, ChevronDown, BookOpen, Pencil, Eye, Download, Search, Printer, FileText, Menu, LayoutGrid, TrendingUp, Wallet, Receipt, Clock, BarChart3, Users, Settings, Share2, MessageCircle, MessageSquare, Phone, RotateCcw, Moon, Sun, ShoppingBag, Shield, UserCheck } from "lucide-react";
import { storage } from "./firebase";

// ---------- constants ----------
const _NOW_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => _NOW_YEAR - 2 + i); // ২ বছর আগে থেকে +৭ বছর
const MONTH_NAMES = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];
const MONTH_SHORT = ["জানু", "ফেব্রু", "মার্চ", "এপ্রি", "মে", "জুন", "জুলা", "আগ", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];
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
// ছাড় (dueWaived) নগদ ছাড়াই বাকি কমায়, তাই আয়ে ওঠে না
const dueRemaining = (it) => Math.max(0, (isNaN(num(it.due)) ? 0 : num(it.due)) - (isNaN(num(it.duePaid)) ? 0 : num(it.duePaid)) - (isNaN(num(it.dueWaived)) ? 0 : num(it.dueWaived)));

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
:root{--rk-z:1;}
@media (min-width:1024px){:root{--rk-z:1.35;}}
@media (min-width:1440px){:root{--rk-z:1.55;}}
.rk-zoomable{zoom:var(--rk-z);}
.rk-sheet-card{zoom:var(--rk-z);max-height:calc(94vh / var(--rk-z));}
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

// ---------- সুরক্ষিত স্টোরেজ ----------
// ১) প্রতিটা রিড/রাইট ফোনে মিরর হয়  ২) সেভ ফেল হলে কিউতে জমা (ডুপ্লিকেট ছাড়া)
// ৩) অন্য ডিভাইস মাঝখানে বদলে দিলে ওভাররাইট না করে মার্জ হয়, দুই কপিই রাখা থাকে
// ৪) দৈনিক সার্ভার স্ন্যাপশট + ডিভাইসের কপি + ফাইল ব্যাকআপ — সবকিছু ফিরিয়ে আনা যায়
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
const hashStr = (s) => {
  const t = String(s);
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return h + ":" + t.length;
};
const hashOrNone = (v) => (v === null || v === undefined || v === "" ? "none" : hashStr(v));
function baseGet(key) {
  try {
    return localStorage.getItem("base:" + key);
  } catch (e) {
    return null;
  }
}
function baseSet(key, v) {
  try {
    localStorage.setItem("base:" + key, hashOrNone(v));
  } catch (e) {
    /* ignore */
  }
}
function readQueue() {
  try {
    return JSON.parse(localStorage.getItem("pendingWrites") || "[]");
  } catch (e) {
    return [];
  }
}
function writeQueue(q) {
  try {
    localStorage.setItem("pendingWrites", JSON.stringify(q));
    return true;
  } catch (e) {
    return false;
  }
}
function queueWrite(key, value, baseHash, baseContent) {
  const q = readQueue();
  const i = q.findIndex((w) => w.key === key);
  if (i >= 0) q[i] = { ...q[i], value }; // প্রথম 'বেস' ই থাকে, মান নতুনটা
  else q.push({ key, value, base: baseHash === undefined ? null : baseHash, baseContent: baseContent || null });
  if (!writeQueue(q)) {
    try {
      window.alert("⚠️ ফোনের স্টোরেজ ভরে গেছে — এই সেভ সার্ভারে না গেলে হারাতে পারে। নেট ঠিক আছে কিনা দেখুন, আর ডেটা সুরক্ষা পেজ থেকে ব্যাকআপ ফাইল নামিয়ে রাখুন।");
    } catch (e) {
      /* ignore */
    }
  }
}
function dropQueued(key) {
  const q = readQueue();
  if (q.some((w) => w.key === key)) writeQueue(q.filter((w) => w.key !== key));
}
function pendingCount() {
  return readQueue().length;
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
async function readRemote(key, ms = 8000) {
  try {
    const res = await withTimeout(storage.get(key), ms);
    return { ok: true, value: res && res.value ? res.value : null };
  } catch (e) {
    return { ok: false, value: null };
  }
}

// ---- মার্জ (৩-ওয়ে): আমার বদল + অন্য ডিভাইসের বদল দুটোই থাকে ----
const J = JSON.stringify;
const pj = (s, fb) => {
  try {
    return s ? JSON.parse(s) : fb;
  } catch (e) {
    return fb;
  }
};
const sameJ = (a, b) => J(a) === J(b);
const idOfAny = (x) => (x && typeof x === "object" ? (x.id !== undefined ? String(x.id) : x.tid !== undefined ? String(x.tid) : J(x)) : String(x));
function merge3List(b, m, r) {
  const mk = (arr) => {
    const mp = new Map();
    (arr || []).forEach((x) => mp.set(idOfAny(x), x));
    return mp;
  };
  const bm = mk(b);
  const mm = mk(m);
  const rm = mk(r);
  const order = [];
  const seen = new Set();
  [...(r || []), ...(m || [])].forEach((x) => {
    const id = idOfAny(x);
    if (!seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  });
  const out = [];
  order.forEach((id) => {
    const inB = bm.has(id);
    const inM = mm.has(id);
    const inR = rm.has(id);
    const bv = bm.get(id);
    const mv = mm.get(id);
    const rv = rm.get(id);
    if (inM && inR) {
      if (!inB) out.push(rv);
      else if (sameJ(mv, bv)) out.push(rv);
      else if (sameJ(rv, bv)) out.push(mv);
      else out.push(rv);
    } else if (inM) {
      if (!inB || !sameJ(mv, bv)) out.push(mv);
    } else if (inR) {
      if (!inB || !sameJ(rv, bv)) out.push(rv);
    }
  });
  return out;
}
function merge3Map(b, m, r) {
  const B = b || {};
  const M = m || {};
  const R = r || {};
  const out = {};
  new Set([...Object.keys(R), ...Object.keys(M)]).forEach((k) => {
    const inB = k in B;
    const inM = k in M;
    const inR = k in R;
    if (inM && inR) {
      if (!inB || sameJ(M[k], B[k])) out[k] = R[k];
      else if (sameJ(R[k], B[k])) out[k] = M[k];
      else out[k] = R[k];
    } else if (inM) {
      if (!inB || !sameJ(M[k], B[k])) out[k] = M[k];
    } else if (inR) {
      if (!inB || !sameJ(R[k], B[k])) out[k] = R[k];
    }
  });
  return out;
}
const scalar3 = (b, m, r) => (sameJ(m, b) ? r : sameJ(r, b) ? m : r);
function merge3Deep(b, m, r, depth) {
  const B = b || {};
  const M = m || {};
  const R = r || {};
  const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
  const out = {};
  new Set([...Object.keys(R), ...Object.keys(M)]).forEach((k) => {
    const inB = k in B;
    const inM = k in M;
    const inR = k in R;
    if (inM && inR) {
      if (depth > 0 && isObj(M[k]) && isObj(R[k])) out[k] = merge3Deep(B[k], M[k], R[k], depth - 1);
      else if (!inB || sameJ(M[k], B[k])) out[k] = R[k];
      else if (sameJ(R[k], B[k])) out[k] = M[k];
      else out[k] = R[k];
    } else if (inM) {
      if (!inB || !sameJ(M[k], B[k])) out[k] = M[k];
    } else if (inR) {
      if (!inB || !sameJ(R[k], B[k])) out[k] = R[k];
    }
  });
  return out;
}
function mergeValues(key, baseStr, mineStr, remoteStr) {
  const m = pj(mineStr, undefined);
  const r = pj(remoteStr, undefined);
  if (m === undefined || r === undefined) return null;
  const b = baseStr ? pj(baseStr, null) : null;
  try {
    if (key.startsWith("day:")) {
      const g = (o, f) => (o && Array.isArray(o[f]) ? o[f] : []);
      return J({
        ...r,
        expenses: merge3List(b ? g(b, "expenses") : null, g(m, "expenses"), g(r, "expenses")),
        items: merge3List(b ? g(b, "items") : null, g(m, "items"), g(r, "items")),
        openingOverride: scalar3(b ? b.openingOverride ?? null : null, m.openingOverride ?? null, r.openingOverride ?? null),
        totalOverride: scalar3(b ? b.totalOverride ?? null : null, m.totalOverride ?? null, r.totalOverride ?? null),
      });
    }
    if (key.startsWith("dues:")) {
      const out = {};
      new Set([...Object.keys(r || {}), ...Object.keys(m || {})]).forEach((k) => {
        const list = merge3List(b ? (b[k] || []) : null, (m || {})[k] || [], (r || {})[k] || []);
        if (list.length) out[k] = list;
      });
      return J(out);
    }
    if (key.startsWith("yearstats:") || key === "shopinfo") return J(merge3Map(b, m, r));
    if (key.startsWith("attend:")) return J(merge3Deep(b, m, r, 2));
    if (key.startsWith("salary:")) return J(merge3Deep(b, m, r, 1));
    if (key.startsWith("memos:") || key === "manualdues" || key === "trash" || key === "customers" || key === "staff" || key === "staffadv" || key === "payables" || key === "payablepay" || key.startsWith("presets:"))
      return J(merge3List(Array.isArray(b) ? b : null, Array.isArray(m) ? m : [], Array.isArray(r) ? r : []));
  } catch (e) {
    return null;
  }
  return null;
}
function addRecalc(key) {
  try {
    const m = /^day:(\d+)-(\d+)-(\d+)$/.exec(key);
    if (!m) return;
    const list = JSON.parse(localStorage.getItem("recalc") || "[]");
    const id = `${m[1]}-${m[2]}-${m[3]}`;
    if (!list.includes(id)) list.push(id);
    localStorage.setItem("recalc", JSON.stringify(list));
  } catch (e) {
    /* ignore */
  }
}
// ---- IndexedDB (ডিভাইসের নিজস্ব কপি; বড় ডেটা রাখা যায়) ----
function idbOpen() {
  return new Promise((res, rej) => {
    try {
      const rq = indexedDB.open("rk-safe", 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore("kv");
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    } catch (e) {
      rej(e);
    }
  });
}
async function idbPut(key, val) {
  try {
    const db = await idbOpen();
    return await new Promise((res) => {
      const tx = db.transaction("kv", "readwrite");
      tx.objectStore("kv").put(val, key);
      tx.oncomplete = () => res(true);
      tx.onerror = () => res(false);
      tx.onabort = () => res(false);
    });
  } catch (e) {
    return false;
  }
}
async function idbGet(key) {
  try {
    const db = await idbOpen();
    return await new Promise((res) => {
      const rq = db.transaction("kv").objectStore("kv").get(key);
      rq.onsuccess = () => res(rq.result === undefined ? null : rq.result);
      rq.onerror = () => res(null);
    });
  } catch (e) {
    return null;
  }
}
async function idbDel(key) {
  try {
    const db = await idbOpen();
    return await new Promise((res) => {
      const tx = db.transaction("kv", "readwrite");
      tx.objectStore("kv").delete(key);
      tx.oncomplete = () => res(true);
      tx.onerror = () => res(false);
    });
  } catch (e) {
    return false;
  }
}
async function idbKeys(prefix) {
  try {
    const db = await idbOpen();
    return await new Promise((res) => {
      const rq = db.transaction("kv").objectStore("kv").getAllKeys();
      rq.onsuccess = () => res((rq.result || []).filter((k) => String(k).startsWith(prefix)));
      rq.onerror = () => res([]);
    });
  } catch (e) {
    return [];
  }
}

async function resolveConflict(key, mineStr, remoteStr, baseContent) {
  let merged = null;
  try {
    merged = mergeValues(key, baseContent, mineStr, remoteStr);
  } catch (e) {
    merged = null;
  }
  const value = merged !== null ? merged : mineStr;
  const rec = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    at: Date.now(),
    key,
    base: baseContent || null,
    mine: mineStr,
    remote: remoteStr,
    merged: value,
    auto: merged !== null,
  };
  await idbPut("conflict:" + rec.id, J(rec));
  try {
    const s = J(rec);
    if (s.length < 600000) await withTimeout(storage.set("conflict:" + rec.id, s), 6000);
  } catch (e) {
    /* ignore */
  }
  if (value !== remoteStr) {
    addRecalc(key);
    try {
      window.dispatchEvent(new CustomEvent("rk-conflict", { detail: { key } }));
    } catch (e) {
      /* ignore */
    }
  }
  return value;
}

// রিড: রিমোট থেকে পেলে মিরর+বেস আপডেট; না পারলে লোকাল মিরর (পুরনো হতে পারে, কিন্তু হারায় না)
async function kget(key) {
  const r = await readRemote(key);
  if (r.ok) {
    if (r.value) {
      lsSet(key, r.value);
      baseSet(key, r.value);
      return r.value;
    }
    baseSet(key, null);
    return lsGet(key);
  }
  return lsGet(key);
}
// রাইট: ফোনে মিরর → (অন্য ডিভাইস বদলে দিলে মার্জ) → সার্ভার; ফেল হলে কিউতে (false)
async function kset(key, value, opts = {}) {
  if (key.startsWith("day:")) txCache = null;
  const ym = /^(?:day|dues|yearstats|memos|attend|salary):(\d{4})/.exec(key);
  if (ym) markYearSeen(Number(ym[1]));
  const prev = lsGet(key);
  lsSet(key, value);
  const baseHash = baseGet(key);
  const baseContent = prev !== null && baseHash !== null && hashOrNone(prev) === baseHash ? prev : null;
  try {
    let toWrite = value;
    if (!opts.force && baseHash !== null) {
      const r = await readRemote(key, 6000);
      if (r.ok && r.value !== null) {
        const rh = hashStr(r.value);
        if (rh !== baseHash && rh !== hashStr(value)) toWrite = await resolveConflict(key, value, r.value, baseContent);
      }
    }
    await storage.set(key, toWrite);
    if (toWrite !== value) lsSet(key, toWrite);
    baseSet(key, toWrite);
    dropQueued(key);
    return true;
  } catch (e) {
    queueWrite(key, value, baseHash, baseContent);
    return false;
  }
}
let flushing = false;
async function flushPendingWrites() {
  if (flushing) return 0;
  flushing = true;
  let sent = 0;
  try {
    const q = readQueue();
    for (const w of q) {
      try {
        let toWrite = w.value;
        const r = await readRemote(w.key, 8000);
        if (r.ok && r.value !== null) {
          const rh = hashStr(r.value);
          if (rh === hashStr(w.value)) {
            dropQueued(w.key);
            baseSet(w.key, w.value);
            sent++;
            continue;
          }
          const hasBase = w.base !== null && w.base !== undefined;
          if (!hasBase || rh !== w.base) toWrite = await resolveConflict(w.key, w.value, r.value, w.baseContent || null);
        } else if (!r.ok && typeof navigator !== "undefined" && navigator.onLine === false) {
          return sent;
        }
        await storage.set(w.key, toWrite);
        lsSet(w.key, toWrite);
        baseSet(w.key, toWrite);
        dropQueued(w.key);
        sent++;
      } catch (e) {
        return sent;
      }
    }
    return sent;
  } finally {
    flushing = false;
  }
}

// ---------- গতি: যে বছরে ডেটা আছে শুধু সেগুলোই লোড, দিনের ডেটা প্যারালাল ----------
const YEARS_SEEN_KEY = "rk-years-seen";
const YEARS_SCAN_TTL = 3 * 86400000;
let txCache = null; // সব লেনদেনের সেশন-ক্যাশ (দিনের ডেটা বদলালে মুছে যায়)
let yearsScanPromise = null;
function seenYears() {
  try {
    const o = JSON.parse(localStorage.getItem(YEARS_SEEN_KEY));
    if (o && Array.isArray(o.years) && Date.now() - o.at < YEARS_SCAN_TTL) return o.years;
  } catch (e) {
    /* ignore */
  }
  return null;
}
function markYearSeen(y) {
  try {
    const o = JSON.parse(localStorage.getItem(YEARS_SEEN_KEY));
    if (o && Array.isArray(o.years) && !o.years.includes(y)) {
      o.years.push(y);
      localStorage.setItem(YEARS_SEEN_KEY, JSON.stringify(o));
    }
  } catch (e) {
    /* ignore */
  }
}
async function activeYears() {
  const pick = (found) => YEARS.filter((y) => found.includes(y) || Math.abs(y - _NOW_YEAR) <= 1);
  const seen = seenYears();
  if (seen) return pick(seen);
  if (!yearsScanPromise) {
    yearsScanPromise = (async () => {
      const found = [];
      let allOk = true;
      await Promise.all(
        YEARS.map(async (y) => {
          for (const k of [`dues:${y}`, `memos:${y}`, `yearstats:${y}`]) {
            const r = await readRemote(k, 8000);
            if (!r.ok) {
              allOk = false;
              return;
            }
            if (r.value && r.value !== "{}" && r.value !== "[]") {
              found.push(y);
              return;
            }
          }
        })
      );
      if (allOk) {
        try {
          localStorage.setItem(YEARS_SEEN_KEY, JSON.stringify({ at: Date.now(), years: found }));
        } catch (e) {
          /* ignore */
        }
        return found;
      }
      return null;
    })();
    yearsScanPromise.then(
      () => {
        yearsScanPromise = null;
      },
      () => {
        yearsScanPromise = null;
      }
    );
  }
  const found = await yearsScanPromise;
  return found ? pick(found) : YEARS;
}
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    })
  );
  return out;
}

// ---------- ব্যাকআপ / স্ন্যাপশট / রিস্টোর ----------
const FIXED_DATA_KEYS = ["manualdues", "presets:sale", "presets:expense", "shopinfo", "trash", "customers", "staff", "staffadv", "payables", "payablepay"];
const isDataKey = (k) => FIXED_DATA_KEYS.includes(k) || /^(day|dues|yearstats|memos|attend|salary):/.test(k);
const SNAP_INDEX = "snap:index";
const SNAP_CHUNK = 250000;
const KEEP_DAILY = 14;
const KEEP_MONTHLY = 6;
const snapDateStr = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

async function listAllDataKeys() {
  const keys = new Set(FIXED_DATA_KEYS);
  for (const y of YEARS) {
    keys.add(`dues:${y}`);
    keys.add(`yearstats:${y}`);
    keys.add(`memos:${y}`);
    keys.add(`attend:${y}`);
    keys.add(`salary:${y}`);
  }
  const statRaws = await Promise.all(
    YEARS.map(async (y) => {
      const r = await readRemote(`yearstats:${y}`, 8000);
      return r.ok && r.value ? r.value : lsGet(`yearstats:${y}`);
    })
  );
  YEARS.forEach((y, i) => Object.keys(pj(statRaws[i], {})).forEach((k) => keys.add(`day:${y}-${k}`)));
  // সাম্প্রতিক দুই মাসের সব দিন (স্ট্যাটস না থাকলেও ধরা পড়ে)
  const now = new Date();
  for (let back = 0; back < 2; back++) {
    const dt = new Date(now.getFullYear(), now.getMonth() - back, 1);
    for (let d = 1; d <= daysInMonth(dt.getFullYear(), dt.getMonth() + 1); d++) keys.add(`day:${dt.getFullYear()}-${dt.getMonth() + 1}-${d}`);
  }
  if (typeof storage.list === "function") {
    try {
      const res = await withTimeout(storage.list("day:"), 10000);
      const arr = Array.isArray(res) ? res : res && Array.isArray(res.keys) ? res.keys : [];
      arr.forEach((k) => {
        const name = typeof k === "string" ? k : k && (k.key || k.id);
        if (name && isDataKey(name)) keys.add(name);
      });
    } catch (e) {
      /* ignore */
    }
  }
  return [...keys].filter(isDataKey);
}
async function collectAllData(onProgress) {
  const keys = await listAllDataKeys();
  const queued = new Set(readQueue().map((w) => w.key));
  const data = {};
  let failed = 0;
  let stale = 0;
  let done = 0;
  const todo = [...keys];
  const worker = async () => {
    while (todo.length) {
      const k = todo.shift();
      if (queued.has(k) && lsGet(k)) {
        data[k] = lsGet(k);
      } else {
        const r = await readRemote(k, 10000);
        if (r.ok) {
          if (r.value) data[k] = r.value;
        } else {
          const l = lsGet(k);
          if (l) {
            data[k] = l;
            stale++;
          } else failed++;
        }
      }
      done++;
      if (onProgress) onProgress(done, keys.length);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return { data, failed, stale, total: keys.length };
}
async function buildBackupObject(onProgress) {
  const { data, failed, stale, total } = await collectAllData(onProgress);
  return { obj: { app: "rk-ledger", version: 1, createdAt: Date.now(), date: snapDateStr(), keys: data }, failed, stale, total };
}
function selectKeep(list) {
  const sorted = [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
  const daily = sorted.slice(0, KEEP_DAILY);
  const rest = sorted.slice(KEEP_DAILY);
  const months = {};
  rest.forEach((x) => {
    const mo = x.date.slice(0, 7);
    if (!months[mo] || x.date < months[mo].date) months[mo] = x;
  });
  const monthly = Object.values(months)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, KEEP_MONTHLY);
  return { keep: [...daily, ...monthly], drop: rest.filter((x) => !monthly.includes(x)) };
}
async function saveLocalCopy(name, obj) {
  const json = typeof obj === "string" ? obj : J(obj);
  const meta = { at: Date.now(), date: snapDateStr(), keys: 0 };
  try {
    meta.keys = Object.keys((typeof obj === "string" ? JSON.parse(obj) : obj).keys || {}).length;
  } catch (e) {
    /* ignore */
  }
  if (name === "snap-latest") {
    const prev = await idbGet("snap-latest");
    const pm = await idbGet("snap-latest:meta");
    if (prev) {
      await idbPut("snap-prev", prev);
      if (pm) await idbPut("snap-prev:meta", pm);
    }
  }
  const ok = await idbPut(name, json);
  if (ok) await idbPut(name + ":meta", meta);
  return ok;
}
async function listLocalCopies() {
  const out = [];
  for (const [name, label] of [["snap-latest", "সর্বশেষ কপি"], ["snap-prev", "আগের কপি"], ["pre-restore", "রিস্টোরের ঠিক আগের অবস্থা"]]) {
    const meta = await idbGet(name + ":meta");
    if (meta) out.push({ name, label, ...meta });
  }
  return out;
}
async function readSnapIndex() {
  const r = await readRemote(SNAP_INDEX, 8000);
  if (!r.ok) return null;
  const list = pj(r.value, []);
  return Array.isArray(list) ? list : [];
}
async function loadServerSnapshot(entry) {
  let json = "";
  for (let i = 0; i < entry.chunks; i++) {
    const r = await readRemote(`snap:${entry.date}:${i}`, 15000);
    if (!r.ok || !r.value) throw new Error("chunk-missing");
    json += r.value;
  }
  return JSON.parse(json);
}
async function createServerSnapshot(opts = {}, onProgress) {
  const today = snapDateStr();
  const idx = await readSnapIndex();
  if (idx === null) return { status: "offline" };
  if (!opts.force && idx.some((x) => x.date === today)) return { status: "exists", index: idx };
  const { obj, failed, total } = await buildBackupObject(onProgress);
  if (total > 0 && failed > total * 0.2) return { status: "partial", failed, total };
  const json = J(obj);
  const chunks = [];
  for (let i = 0; i < json.length; i += SNAP_CHUNK) chunks.push(json.slice(i, i + SNAP_CHUNK));
  if (!chunks.length) chunks.push("{}");
  for (let i = 0; i < chunks.length; i++) await storage.set(`snap:${today}:${i}`, chunks[i]);
  const check = await readRemote(`snap:${today}:${chunks.length - 1}`, 10000);
  if (!check.ok || check.value !== chunks[chunks.length - 1]) return { status: "verify-failed" };
  const entry = { date: today, chunks: chunks.length, keys: Object.keys(obj.keys).length, at: obj.createdAt, size: json.length };
  const { keep, drop } = selectKeep([entry, ...idx.filter((x) => x.date !== today)]);
  await storage.set(SNAP_INDEX, J(keep));
  for (const d of drop) {
    for (let i = 0; i < d.chunks; i++) {
      try {
        if (typeof storage.delete === "function") await storage.delete(`snap:${d.date}:${i}`);
        else await storage.set(`snap:${d.date}:${i}`, "x");
      } catch (e) {
        /* ignore */
      }
    }
  }
  await saveLocalCopy("snap-latest", json);
  return { status: "created", entry, failed };
}
// প্রতিদিন একবার: সার্ভার স্ন্যাপশট + এই ডিভাইসে কপি + ব্রাউজারকে ডেটা না মুছতে বলা
async function runAutoProtection() {
  try {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  } catch (e) {
    /* ignore */
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) return { status: "offline" };
  const res = await createServerSnapshot({});
  if (res.status === "exists") {
    const meta = await idbGet("snap-latest:meta");
    if (!meta || meta.date !== snapDateStr()) {
      const entry = (res.index || []).find((x) => x.date === snapDateStr());
      if (entry) {
        try {
          await saveLocalCopy("snap-latest", await loadServerSnapshot(entry));
        } catch (e) {
          /* ignore */
        }
      }
    }
  }
  return res;
}
// ---------- Google Drive ব্যাকআপ (আপনার নিজের Google অ্যাকাউন্টে, Apps Script দিয়ে) ----------
const DRIVE_CFG_KEY = "rk-drive-cfg";
const DRIVE_SCRIPT = String.raw`var SECRET = "এখানে-নিজের-গোপন-কোড-লিখুন";
var FOLDER_NAME = "RK হিসাব ব্যাকআপ";
var KEEP = 30;

function folder_() {
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function list_(f) {
  var arr = [];
  var it = f.getFiles();
  while (it.hasNext()) {
    var x = it.next();
    arr.push({ id: x.getId(), name: x.getName(), date: x.getLastUpdated().getTime(), size: x.getSize() });
  }
  arr.sort(function (a, b) { return b.date - a.date; });
  return arr;
}

function trim_(f) {
  var arr = list_(f);
  for (var i = KEEP; i < arr.length; i++) DriveApp.getFileById(arr[i].id).setTrashed(true);
}

function doGet() {
  return out_({ ok: true, hint: "POST only" });
}

function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    if (!req || req.secret !== SECRET) return out_({ ok: false, error: "secret" });
    var f = folder_();
    if (req.action === "ping") {
      return out_({ ok: true, email: Session.getEffectiveUser().getEmail(), folder: f.getUrl() });
    }
    if (req.action === "backup") {
      var name = String(req.name || "backup.json").replace(/[^\w.\-]/g, "_");
      var it = f.getFilesByName(name);
      var file;
      if (it.hasNext()) {
        file = it.next();
        file.setContent(req.content);
      } else {
        file = f.createFile(name, req.content, MimeType.PLAIN_TEXT);
      }
      trim_(f);
      return out_({ ok: true, id: file.getId(), name: file.getName(), size: file.getSize() });
    }
    if (req.action === "list") {
      return out_({ ok: true, files: list_(f) });
    }
    if (req.action === "get") {
      var fl = DriveApp.getFileById(req.id);
      var inside = false;
      var ps = fl.getParents();
      while (ps.hasNext()) if (ps.next().getId() === f.getId()) inside = true;
      if (!inside) return out_({ ok: false, error: "not-in-folder" });
      return out_({ ok: true, content: fl.getBlob().getDataAsString("UTF-8") });
    }
    return out_({ ok: false, error: "unknown" });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}
`;
function getDriveCfg() {
  try {
    const c = JSON.parse(localStorage.getItem(DRIVE_CFG_KEY));
    return c && c.url && c.secret ? c : null;
  } catch (e) {
    return null;
  }
}
function saveDriveCfg(c) {
  try {
    localStorage.setItem(DRIVE_CFG_KEY, JSON.stringify(c));
  } catch (e) {
    /* ignore */
  }
}
function clearDriveCfg() {
  try {
    localStorage.removeItem(DRIVE_CFG_KEY);
    localStorage.removeItem("rk-last-drive");
    localStorage.removeItem("rk-drive-err");
  } catch (e) {
    /* ignore */
  }
}
const lastDriveBackup = () => {
  try {
    return localStorage.getItem("rk-last-drive");
  } catch (e) {
    return null;
  }
};
const lastDriveError = () => {
  try {
    return localStorage.getItem("rk-drive-err");
  } catch (e) {
    return null;
  }
};
async function driveCall(action, payload = {}, ms = 90000) {
  const cfg = getDriveCfg();
  if (!cfg) throw new Error("not-configured");
  const res = await withTimeout(
    fetch(cfg.url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ secret: cfg.secret, action, ...payload }), redirect: "follow" }),
    ms
  );
  const j = await res.json();
  if (!j || !j.ok) throw new Error((j && j.error) || "drive-error");
  return j;
}
async function uploadBackupToDrive(obj) {
  const name = `rk-hisab-backup-${obj.date || snapDateStr()}.json`;
  const j = await driveCall("backup", { name, content: J(obj) }, 180000);
  try {
    localStorage.setItem("rk-last-drive", snapDateStr());
    localStorage.removeItem("rk-drive-err");
  } catch (e) {
    /* ignore */
  }
  return j;
}
// প্রতিদিন একবার, নিরাপত্তা-কপির পরে নিজে থেকে Drive-এ পাঠানো
async function ensureDriveBackup() {
  if (!getDriveCfg()) return { status: "off" };
  if (lastDriveBackup() === snapDateStr()) return { status: "done" };
  if (typeof navigator !== "undefined" && navigator.onLine === false) return { status: "offline" };
  try {
    let obj = null;
    const idx = await readSnapIndex();
    const entry = idx && idx.find((x) => x.date === snapDateStr());
    if (entry) {
      try {
        obj = await loadServerSnapshot(entry);
      } catch (e) {
        obj = null;
      }
    }
    if (!obj) {
      const b = await buildBackupObject();
      if (b.total && b.failed > b.total * 0.2) return { status: "partial" };
      obj = b.obj;
    }
    await uploadBackupToDrive(obj);
    return { status: "uploaded" };
  } catch (e) {
    try {
      localStorage.setItem("rk-drive-err", String((e && e.message) || e));
    } catch (e2) {
      /* ignore */
    }
    return { status: "error", error: String((e && e.message) || e) };
  }
}

async function restoreFromBackupObject(obj, onProgress, opts = {}) {
  if (!obj || obj.app !== "rk-ledger" || !obj.keys || typeof obj.keys !== "object") throw new Error("bad-format");
  const entries = Object.entries(obj.keys).filter(([k, v]) => isDataKey(k) && typeof v === "string");
  if (!opts.skipPre) {
    let saved = false;
    try {
      const cur = await buildBackupObject();
      saved = await saveLocalCopy("pre-restore", cur.obj);
    } catch (e) {
      saved = false;
    }
    if (!saved) return { status: "no-prerestore" };
  }
  let ok = 0;
  let queued = 0;
  for (let i = 0; i < entries.length; i++) {
    const done = await kset(entries[i][0], entries[i][1], { force: true });
    if (done) ok++;
    else queued++;
    if (onProgress) onProgress(i + 1, entries.length);
  }
  return { status: "done", ok, queued, total: entries.length };
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

// ---------- অবশিষ্ট (ব্যালেন্স) চেইন: আগের দিন বদলালে পরের সব দিন মিলিয়ে নেওয়া ----------
const validNum = (v) => v !== null && v !== undefined && v !== "" && !isNaN(num(v));
function chainBalances(entries, startBalance) {
  let prev = startBalance;
  return entries.map((e) => {
    const opening = validNum(e.ov) ? num(e.ov) : prev;
    const total = validNum(e.to) ? num(e.to) : opening + e.income;
    const balance = total - e.expense;
    prev = balance;
    return { ...e, opening, balance };
  });
}
// fromY/M/D দিলে: ওই দিনের পরের দিনগুলো; না দিলে: শুরু থেকে সব দিন। dryRun হলে শুধু কী বদলাবে তা বলে।
async function rebalance({ fromY, fromM, fromD, dryRun } = {}) {
  let yrs = fromY ? (await activeYears()).filter((y) => y >= fromY) : YEARS;
  if (fromY && !yrs.includes(fromY)) yrs = [fromY, ...yrs];
  const stats = {};
  await Promise.all(
    yrs.map(async (y) => {
      stats[y] = await loadYearStats(y);
    })
  );
  let list = [];
  yrs.forEach((y) =>
    Object.keys(stats[y]).forEach((k) => {
      const [m, d] = k.split("-").map(Number);
      list.push({ y, m, d });
    })
  );
  list.sort((a, b) => a.y - b.y || a.m - b.m || a.d - b.d);
  let startBalance = 0;
  if (fromY) {
    const own = stats[fromY] && stats[fromY][`${fromM}-${fromD}`];
    startBalance = own && own.balance !== undefined ? own.balance : await findOpeningBalance(fromY, fromM, fromD);
    list = list.filter((x) => x.y > fromY || (x.y === fromY && (x.m > fromM || (x.m === fromM && x.d > fromD))));
  }
  if (!list.length) return { changes: [], total: 0 };
  const days = await mapLimit(list, 12, (j) => loadDay(j.y, j.m, j.d));
  const entries = list.map((j, i) => {
    const dd = days[i];
    return {
      ...j,
      income: dd.items.reduce((sum, it) => sum + (netTotal(it) || 0), 0),
      expense: dd.expenses.reduce((sum, e) => sum + (isNaN(num(e.amount)) ? 0 : num(e.amount)), 0),
      ov: dd.openingOverride,
      to: dd.totalOverride,
    };
  });
  const out = chainBalances(entries, startBalance);
  const changes = [];
  const touched = new Set();
  out.forEach((e) => {
    const k = `${e.m}-${e.d}`;
    const old = stats[e.y][k] || {};
    if (old.balance !== e.balance || old.income !== e.income || old.expense !== e.expense) {
      changes.push({ y: e.y, m: e.m, d: e.d, oldBalance: old.balance, newBalance: e.balance });
      if (!dryRun) {
        stats[e.y][k] = { income: e.income, expense: e.expense, balance: e.balance };
        touched.add(e.y);
      }
    }
  });
  if (!dryRun && touched.size) {
    for (const y of touched) {
      await kset(yearStatsKey(y), JSON.stringify(stats[y]));
    }
  }
  return { changes, total: list.length };
}

// ---------- স্টাফ হাজিরা, অ্যাডভান্স ও বেতন ----------
const PAYABLES_KEY = "payables";
const PAYABLEPAY_KEY = "payablepay";
const STAFF_KEY = "staff";
const STAFF_ADV_KEY = "staffadv";
async function loadJsonList(key) {
  const v = pj(await kget(key), []);
  return Array.isArray(v) ? v : [];
}
async function loadJsonObj(key) {
  const v = pj(await kget(key), {});
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}
const loadStaff = () => loadJsonList(STAFF_KEY);
const saveStaff = (list) => kset(STAFF_KEY, J(list));
const loadStaffAdv = () => loadJsonList(STAFF_ADV_KEY);
const saveStaffAdv = (list) => kset(STAFF_ADV_KEY, J(list));
const loadAttend = (y) => loadJsonObj(`attend:${y}`);
const saveAttend = (y, o) => kset(`attend:${y}`, J(o));
const loadSalaryRec = (y) => loadJsonObj(`salary:${y}`);
const saveSalaryRec = (y, o) => kset(`salary:${y}`, J(o));
const ATT_NEXT = { "": "P", P: "A", A: "H", H: "" };

// এক স্টাফের এক মাসের হিসাব: উপস্থিত/অর্ধ/অনুপস্থিত দিন ও হাজিরা অনুযায়ী বেতন
function staffMonthCalc(st, monthAtt, y, m) {
  const n = daysInMonth(y, m);
  const att = monthAtt || {};
  let p = 0;
  let h = 0;
  let a = 0;
  for (let d = 1; d <= n; d++) {
    const v = att[d];
    if (v === "P") p++;
    else if (v === "H") h++;
    else if (v === "A") a++;
  }
  const units = p + h * 0.5;
  const sal = num(st.salary) || 0;
  const rate = st.type === "daily" ? sal : sal / 30; // মাসিক: প্রতি মাস ৩০ দিন ধরা হয়
  const raw = Math.round(rate * units);
  return { n, p, h, a, unmarked: n - p - h - a, units, rate, gross: st.type === "daily" ? raw : Math.min(Math.round(sal), raw) };
}
const advLeft = (a) => Math.max(0, (a.amount || 0) - (a.settled || 0));
const advOutstanding = (advs, staffId) => advs.filter((a) => a.staffId === staffId).reduce((s, a) => s + advLeft(a), 0);
// বেতন থেকে অ্যাডভান্স কাটা: পুরনো অ্যাডভান্স আগে; বেতনের বেশি কাটা যায় না, বাকিটা পরের মাসে যায়
function planPayment(gross, advs, staffId) {
  const list = advs
    .filter((a) => a.staffId === staffId && advLeft(a) > 0)
    .sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
  let left = gross;
  const parts = [];
  for (const a of list) {
    if (left <= 0) break;
    const take = Math.min(left, advLeft(a));
    if (take > 0) {
      parts.push({ id: a.id, amt: take });
      left -= take;
    }
  }
  const deduct = parts.reduce((s, p) => s + p.amt, 0);
  return { deduct, parts, net: gross - deduct };
}

// চলতি মাসের সারাংশ: মোট বিক্রি, জমা, খরচ, বাকি
async function computeMonthSummary(y, m) {
  const stats = await loadYearStats(y);
  const days = Object.keys(stats)
    .map((k) => k.split("-").map(Number))
    .filter(([mm]) => mm === m)
    .map(([, d]) => d);
  const loaded = await mapLimit(days, 12, (d) => loadDay(y, m, d));
  let sale = 0;
  let paid = 0;
  let expense = 0;
  let due = 0;
  loaded.forEach((dd) => {
    dd.items.forEach((it) => {
      paid += netTotal(it) || 0;
      due += dueRemaining(it) || 0;
      if (!String(it.name || "").endsWith("(পরিশোধ)")) sale += grossTotal(it) - numOr0(it.discount);
    });
    dd.expenses.forEach((e) => {
      expense += isNaN(num(e.amount)) ? 0 : num(e.amount);
    });
  });
  return { y, m, sale, paid, expense, due, days: days.length };
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
    const dayCache = new Map();
    await mapLimit(dateKeys, 12, async (dk) => {
      const [mm2, dd2] = dk.split("-").map(Number);
      dayCache.set(dk, await loadDay(y, mm2, dd2));
    });
    for (const dk of dateKeys) {
      const [m, d] = dk.split("-").map(Number);
      const dateLabel = `${y}-${pad2(m)}-${pad2(d)}`;
      const day = dayCache.get(dk);
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
  if (txCache) return txCache;
  const years = await activeYears();
  const statsList = await Promise.all(years.map((y) => loadYearStats(y)));
  const jobs = [];
  years.forEach((y, i) =>
    Object.keys(statsList[i]).forEach((dk) => {
      const [m, d] = dk.split("-").map(Number);
      jobs.push({ y, m, d });
    })
  );
  jobs.sort((a, b) => a.y - b.y || a.m - b.m || a.d - b.d);
  const days = await mapLimit(jobs, 12, (j) => loadDay(j.y, j.m, j.d));
  const rows = [];
  jobs.forEach((j, idx) => {
    const { y, m, d } = j;
    const day = days[idx];
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
        customer: (it.customer || "").trim(),
        id: it.id,
        detail: lineText(it),
        billed: grossTotal(it) - (num(it.discount) || 0) - (num(it.dueWaived) || 0),
        paid: Math.max(0, grossTotal(it) - (num(it.discount) || 0) - (num(it.dueWaived) || 0) - dueRemaining(it)),
      });
    });
  });
  txCache = rows;
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
  const years = await activeYears();
  const results = await Promise.all(years.map(loadMemosYear));
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
  const years = await activeYears();
  const [results, manual] = await Promise.all([Promise.all(years.map((y) => loadDues(y))), loadManualDues()]);
  const flat = [];
  results.forEach((duesForYear, idx) => {
    const y = years[idx];
    Object.entries(duesForYear).forEach(([k, entries]) => {
      const [m, d] = k.split("-").map(Number);
      entries.forEach((e) => flat.push({ y, m, d, ...e }));
    });
  });
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
// একটা পণ্য-সারির পুরো বিবরণ: নাম · সাইজ · পরিমান · দাম = মোট
const lineText = (it) => {
  const nm = (it.name && String(it.name).trim()) || "পণ্য";
  const h = String(it.height === undefined || it.height === null ? "" : it.height).trim();
  const w = String(it.weight === undefined || it.weight === null ? "" : it.weight).trim();
  const q = String(it.qty === undefined || it.qty === null ? "" : it.qty).trim();
  const p = String(it.price === undefined || it.price === null ? "" : it.price).trim();
  const parts = [nm];
  if (h && w) parts.push(`সাইজ ${toBn(h)}×${toBn(w)}`);
  else if (h || w) parts.push(`সাইজ ${toBn(h || w)}`);
  parts.push(`পরিমান ${toBn(q || "1")}`);
  if (p) parts.push(`দাম ৳${toBn(p)}`);
  let t = parts.join(" · ");
  const g = grossTotal(it);
  if (!isNaN(g)) t += ` = ৳${toBn(fmt(g))}`;
  const d = numOr0(it.discount);
  if (d > 0) t += ` · ছাড় ৳${toBn(fmt(d))}`;
  return t;
};

const CUSTOMERS_KEY = "customers";
async function loadCustomerReg() {
  const raw = await kget(CUSTOMERS_KEY);
  const list = pj(raw, []);
  return Array.isArray(list) ? list : [];
}
async function saveCustomerReg(list) {
  return await kset(CUSTOMERS_KEY, JSON.stringify(list));
}
const lastUpdateText = (val) => {
  if (!val) return "লেনদেন নেই";
  const y = Math.floor(val / 10000);
  const m = Math.floor(val / 100) % 100;
  const d = val % 100;
  const n = daysSince(y, m, d);
  return `${toBn(d)} ${MONTH_NAMES[m - 1]} ${toBn(y)} · ${n <= 0 ? "আজ" : `${toBn(n)} দিন আগে`}`;
};
const lastUpdateColor = (val) => {
  if (!val) return "var(--gray)";
  const n = daysSince(Math.floor(val / 10000), Math.floor(val / 100) % 100, val % 100);
  return n <= 1 ? "var(--green)" : n <= 3 ? "var(--amber-text)" : "var(--red)";
};

function buildCustomers(memos, dues, registry = [], sales = []) {
  const map = {};
  const touch = (name) => {
    const k = custKey(name);
    if (!k) return null;
    if (!map[k]) map[k] = { key: k, name: String(name).trim(), phone: "", address: "", memos: [], dues: [], sales: [], reg: null, billed: 0, paid: 0, due: 0, lastVal: 0 };
    return map[k];
  };
  const val = (o) => o.y * 10000 + o.m * 100 + o.d;
  registry.forEach((r) => {
    const c = touch(r.name);
    if (c) c.reg = r;
  });
  sales.forEach((sl) => {
    if (!sl.customer) return;
    const c = touch(sl.customer);
    if (!c) return;
    c.sales.push(sl);
    c.billed += sl.billed || 0;
    c.paid += sl.paid || 0;
    c.lastVal = Math.max(c.lastVal, val(sl));
  });
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
    if (c.reg) {
      c.name = String(c.reg.name).trim();
      if (c.reg.phone) c.phone = c.reg.phone;
      if (c.reg.address) c.address = c.reg.address;
    }
  });
  return Object.values(map);
}

function customerRows(c) {
  const val = (o) => o.y * 10000 + o.m * 100 + o.d;
  return [
    ...c.memos.map((mm) => {
      const cc = memoCalc(mm);
      return { kind: "memo", mm, val: val(mm), y: mm.y, m: mm.m, d: mm.d, label: `মেমো নং ${toBn(mm.no)}`, detail: mm.items.filter(memoItemUsed).map(lineText), total: cc.total, paid: cc.paid, due: cc.due };
    }),
    ...c.sales.map((sl) => ({
      kind: "sale",
      val: val(sl),
      y: sl.y,
      m: sl.m,
      d: sl.d,
      label: "বিক্রি",
      detail: [sl.detail || sl.name],
      total: sl.billed || 0,
      paid: sl.paid || 0,
      due: sl.due || 0,
    })),
    ...c.dues
      .filter((e) => !e.memoId && !e.fromSale)
      .map((e) => ({
        kind: "due",
        val: val(e),
        y: e.y,
        m: e.m,
        d: e.d,
        label: e.manual ? "সরাসরি বাকি" : "দৈনিক হিসাবের বাকি",
        detail: e.lines ? e.lines.map(lineText) : [],
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
// ---------- প্রিন্ট ডকুমেন্টের নতুন নকশা (মেমো, হিসাবের বিবরণী, মাসিক রিপোর্ট) ----------
const bf = (n) => toBn(fmt(n));
const DOC_FONT = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800&display=swap">';
const DOC_CSS = `
@page{size:A4;margin:11mm;}
*{box-sizing:border-box;}
body{font-family:'Noto Sans Bengali','Segoe UI',sans-serif;margin:0;padding:22px;color:#1B2340;background:#fff;font-size:13px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.sheet{max-width:830px;margin:0 auto;}
.band{display:flex;align-items:center;justify-content:space-between;gap:16px;background:linear-gradient(135deg,#1F2F5C 0%,#2B4283 100%);color:#fff;border-radius:14px;padding:16px 20px;}
.band .brand{display:flex;align-items:center;gap:14px;min-width:0;}
.band .logo{height:56px;max-width:112px;object-fit:contain;background:#fff;border-radius:10px;padding:4px;}
.band h1{margin:0;font-size:21px;font-weight:800;line-height:1.25;}
.band p{margin:3px 0 0;font-size:11.5px;opacity:.88;line-height:1.5;}
.band .tag{text-align:right;flex-shrink:0;}
.band .tag .t{font-size:11px;letter-spacing:.6px;opacity:.82;}
.band .tag .n{font-size:23px;font-weight:800;line-height:1.15;}
.band .tag .d{font-size:12px;opacity:.92;margin-top:2px;}
.panel{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;background:#F5F6FA;border:1px solid #E3E7F3;border-radius:12px;padding:12px 16px;margin-top:14px;}
.panel .k{font-size:11px;color:#6B7390;margin-bottom:2px;}
.panel .v{font-size:16px;font-weight:800;color:#1B2340;}
.panel .s{font-size:12.5px;color:#4A5272;line-height:1.6;}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px;}
.kpi{border-radius:12px;padding:10px 14px;border:1px solid #E3E7F3;background:#F5F6FA;}
.kpi .k{font-size:11px;color:#6B7390;}
.kpi .v{font-size:19px;font-weight:800;line-height:1.3;}
.kpi.navy{background:#E8EBF5;border-color:#D3D9EE;}.kpi.navy .v{color:#1F2F5C;}
.kpi.green{background:#E3F4EA;border-color:#C7E6D3;}.kpi.green .v{color:#1E7A47;}
.kpi.orange{background:#FFF3E3;border-color:#F4DDBB;}.kpi.orange .v{color:#B2661F;}
.kpi.red{background:#FBEAE7;border-color:#F0CBC6;}.kpi.red .v{color:#B24A45;}
table.items{width:100%;border-collapse:separate;border-spacing:0;margin-top:14px;border:1px solid #D9DDEB;border-radius:12px;overflow:hidden;}
table.items th{background:#1F2F5C;color:#fff;font-size:12px;font-weight:600;padding:8px 10px;text-align:left;white-space:nowrap;}
table.items td{padding:8px 10px;font-size:12.5px;border-top:1px solid #E8EAF2;vertical-align:top;}
table.items th.r{text-align:right;}
table.items th.c{text-align:center;}
table.items tbody:not(.g) tr:nth-child(even) td{background:#F8F9FC;}
table.items tbody.g:nth-of-type(even) td{background:#F8F9FC;}
table.items tbody.g tr + tr td{border-top:none;}
table.items tfoot td{background:#E8EBF5;font-weight:800;color:#1F2F5C;border-top:2px solid #1F2F5C;}
table.items td.sub{padding:0 10px 9px 12px;border-top:none;font-size:11.5px;color:#6B7390;line-height:1.6;}
.r{text-align:right;}.c{text-align:center;}
.red{color:#B24A45;}.green{color:#1E7A47;}.muted{color:#6B7390;}.b{font-weight:700;}
.sum{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-top:16px;}
.totals{width:330px;border:1px solid #D9DDEB;border-radius:12px;overflow:hidden;margin-left:auto;}
.totals .row{display:flex;justify-content:space-between;padding:7px 14px;font-size:13px;border-top:1px solid #E8EAF2;}
.totals .row:first-child{border-top:none;}
.totals .grand{background:#1F2F5C;color:#fff;font-weight:800;font-size:16px;padding:10px 14px;border-top:none;}
.stamp{display:inline-block;border:2.5px solid;border-radius:10px;padding:4px 18px;font-weight:800;font-size:19px;letter-spacing:.5px;transform:rotate(-6deg);margin-top:8px;}
.stamp.paid{color:#2F7A4F;border-color:#2F7A4F;}.stamp.due{color:#B24A45;border-color:#B24A45;}
.note{margin-top:14px;padding:10px 14px;background:#FFF8E6;border:1px solid #F3E2B3;border-radius:10px;font-size:12.5px;color:#7A5A12;}
.sign{display:flex;justify-content:space-between;margin-top:56px;font-size:12px;color:#6B7390;}
.sign span{border-top:1.5px solid #AEB5CE;padding-top:5px;min-width:150px;text-align:center;}
.foot{margin-top:22px;padding-top:10px;border-top:1px dashed #D9DDEB;text-align:center;font-size:11.5px;color:#6B7390;line-height:1.7;}
.chart{margin-top:14px;border:1px solid #E3E7F3;border-radius:12px;padding:10px 12px 6px;background:#fff;}
.chart .ttl{font-size:12px;font-weight:700;color:#1F2F5C;display:flex;justify-content:space-between;}
.chart .lg span{display:inline-block;width:10px;height:10px;border-radius:3px;margin:0 4px 0 10px;vertical-align:middle;}
.close-btn{position:fixed;top:10px;right:10px;width:42px;height:42px;border-radius:50%;border:none;background:#1F2F5C;color:#fff;font-size:22px;line-height:1;cursor:pointer;z-index:99;box-shadow:0 2px 8px rgba(0,0,0,.3);}
@media print{body{padding:0;}.close-btn{display:none !important;}tr{page-break-inside:avoid;}}
`;
const docBand = (tagLabel, tagMain, tagSub) => {
  const s = getShop();
  return `<div class="band"><div class="brand">${s.logo ? `<img class="logo" src="${s.logo}" alt="" />` : ""}<div style="min-width:0"><h1>${esc(s.name)}</h1>${s.address ? `<p>${esc(s.address)}</p>` : ""}${s.phone ? `<p>ফোন: ${esc(s.phone)}</p>` : ""}</div></div><div class="tag"><div class="t">${esc(tagLabel)}</div><div class="n">${tagMain}</div>${tagSub ? `<div class="d">${tagSub}</div>` : ""}</div></div>`;
};
const docPage = (title, body) =>
  `<html><head><title>${esc(title)}</title><meta charset="utf-8" />${DOC_FONT}<style>${DOC_CSS}</style></head><body><button class="close-btn" onclick="window.close()" aria-label="বন্ধ করুন">✕</button><div class="sheet">${body}</div></body></html>`;
const docFoot = () => {
  const s = getShop();
  return `<div class="foot">ধন্যবাদ — আবার আসবেন${s.phone ? `<br/>যোগাযোগ: ${esc(s.phone)}` : ""}${s.address ? ` · ${esc(s.address)}` : ""}</div>`;
};
const sizeText = (it) => {
  const h = String(it.height || "").trim();
  const w = String(it.weight || "").trim();
  return h && w ? toBn(`${esc(h)} × ${esc(w)}`) : h || w ? toBn(esc(h || w)) : "—";
};
function openPrintHtml(html) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

function memoHtml(memo) {
  const c = memoCalc(memo);
  const used = memo.items.filter(memoItemUsed);
  const rows = used
    .map(
      (it, i) =>
        `<tr><td class="c muted">${toBn(i + 1)}</td><td class="b">${esc(it.name)}</td><td class="c">${sizeText(it)}</td><td class="r">${toBn(esc(it.qty) || "1")}</td><td class="r">${bf(numOr0(it.price))}</td><td class="r b">${bf(grossTotal(it))}</td></tr>`
    )
    .join("");
  const line = (label, value, cls) => `<div class="row${cls ? " " + cls : ""}"><span>${label}</span><span>${value}</span></div>`;
  const paidUp = c.due <= 0;
  const body = `
    ${docBand("মেমো নং", toBn(memo.no), `${toBn(memo.d)} ${MONTH_NAMES[memo.m - 1]}, ${toBn(memo.y)}`)}
    <div class="panel"><div><div class="k">প্রাপক</div><div class="v">${esc(memo.customer)}</div></div><div class="s" style="text-align:right">${memo.phone ? `ফোন: ${esc(memo.phone)}<br/>` : ""}${memo.address ? `ঠিকানা: ${esc(memo.address)}` : ""}</div></div>
    ${rows ? `<table class="items"><thead><tr><th class="c" style="width:38px">নং</th><th>বিবরণ</th><th class="c">সাইজ</th><th class="r">পরিমান</th><th class="r">দাম</th><th class="r">মোট</th></tr></thead><tbody>${rows}</tbody></table>` : ""}
    <div class="sum"><div>${c.total > 0 ? `<span class="stamp ${paidUp ? "paid" : "due"}">${paidUp ? "পরিশোধিত" : "বাকি ৳" + bf(c.due)}</span>` : ""}</div>
      <div class="totals">
        ${rows ? line("সাবটোটাল", bf(c.subtotal)) : ""}
        ${c.discount > 0 ? line("ছাড় (−)", bf(c.discount)) : ""}
        ${c.prevDue > 0 ? line("পূর্বের বাকি (+)", bf(c.prevDue)) : ""}
        ${line("সর্বমোট", `<b>${bf(c.total)}</b>`)}
        ${c.paid > 0 ? line("জমা (−)", `<span class="green b">${bf(c.paid)}</span>`) : ""}
        ${line("বাকি", `৳ ${bf(c.due)}`, "grand")}
      </div></div>
    ${memo.note ? `<div class="note"><b>নোট:</b> ${esc(memo.note)}</div>` : ""}
    <div class="sign"><span>গ্রাহকের স্বাক্ষর</span><span>কর্তৃপক্ষ</span></div>
    ${docFoot()}`;
  return docPage(`মেমো নং ${toBn(memo.no)} — ${memo.customer}`, body);
}

function statementHtml(c) {
  const rows = customerRows(c);
  const now = new Date();
  const trs = rows
    .map((r) => {
      const main = `<tr><td class="muted" style="white-space:nowrap">${toBn(r.d)} ${MONTH_SHORT[r.m - 1]} ${toBn(r.y)}</td><td class="b">${esc(r.label)}</td><td class="r">${bf(r.total)}</td><td class="r green">${r.paid ? bf(r.paid) : "—"}</td><td class="r b ${r.due > 0 ? "red" : "muted"}">${bf(r.due)}</td></tr>`;
      const sub = r.detail && r.detail.length ? `<tr><td class="sub" colspan="5">${r.detail.map((t) => `• ${esc(t)}`).join("<br/>")}</td></tr>` : "";
      return `<tbody class="g">${main}${sub}</tbody>`;
    })
    .join("");
  const body = `
    ${docBand("হিসাবের বিবরণী", "", `${toBn(now.getDate())} ${MONTH_NAMES[now.getMonth()]}, ${toBn(now.getFullYear())}`)}
    <div class="panel"><div><div class="k">কাস্টমার</div><div class="v">${esc(c.name)}</div></div><div class="s" style="text-align:right">${c.phone ? `ফোন: ${esc(c.phone)}<br/>` : ""}${c.address ? `ঠিকানা: ${esc(c.address)}` : ""}</div></div>
    <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi navy"><div class="k">মোট বিল (ছাড়সহ)</div><div class="v">৳ ${bf(c.billed)}</div></div>
      <div class="kpi green"><div class="k">মোট জমা</div><div class="v">৳ ${bf(c.paid)}</div></div>
      <div class="kpi ${c.due > 0 ? "red" : "green"}"><div class="k">বর্তমান বাকি</div><div class="v">৳ ${bf(c.due)}</div></div>
    </div>
    ${trs ? `<table class="items"><thead><tr><th>তারিখ</th><th>বিবরণ</th><th class="r">সর্বমোট</th><th class="r">জমা</th><th class="r">বাকি</th></tr></thead>${trs}</table>` : ""}
    <div class="sign"><span>গ্রাহকের স্বাক্ষর</span><span>কর্তৃপক্ষ</span></div>
    ${docFoot()}`;
  return docPage(`হিসাবের বিবরণী — ${c.name}`, body);
}

function monthReportHtml(y, m, entries) {
  const days = Object.keys(entries).map(Number).sort((a, b) => a - b);
  const sum = (f) => days.reduce((s, d) => s + (f(entries[d]) || 0), 0);
  const cash = sum((e) => e.itemsTotal);
  const exp = sum((e) => e.expenseTotal);
  const disc = sum((e) => e.discountTotalDay);
  const dueNow = sum((e) => e.items.reduce((a, it) => a + dueRemaining(it), 0));
  const sale = sum((e) => e.items.filter((it) => !String(it.name || "").endsWith("(পরিশোধ)")).reduce((a, it) => a + grossTotal(it) - numOr0(it.discount), 0));
  const first = days.length ? entries[days[0]] : null;
  const last = days.length ? entries[days[days.length - 1]] : null;
  const wk = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];
  const trs = days
    .map((d) => {
      const e = entries[d];
      const w = wk[new Date(y, m - 1, d).getDay()];
      const dueD = e.items.reduce((a, it) => a + dueRemaining(it), 0);
      return `<tr><td class="b">${toBn(d)} <span class="muted" style="font-weight:400;font-size:11px">${w}</span></td><td class="r muted">${bf(e.opening)}</td><td class="r b">${bf(e.itemsTotal)}</td><td class="r ${dueD > 0 ? "red" : "muted"}">${dueD > 0 ? bf(dueD) : "—"}</td><td class="r muted">${e.discountTotalDay > 0 ? bf(e.discountTotalDay) : "—"}</td><td class="r ${e.expenseTotal > 0 ? "" : "muted"}" ${e.expenseTotal > 0 ? 'style="color:#B2661F"' : ""}>${e.expenseTotal > 0 ? bf(e.expenseTotal) : "—"}</td><td class="r b ${e.remaining < 0 ? "red" : ""}" style="color:${e.remaining < 0 ? "#B24A45" : "#1F2F5C"}">${bf(e.remaining)}</td></tr>`;
    })
    .join("");
  // দৈনিক বিক্রি বনাম খরচের বার চার্ট (SVG)
  const W = 780;
  const H = 130;
  const maxV = Math.max(1, ...days.map((d) => Math.max(entries[d].itemsTotal, entries[d].expenseTotal)));
  const bw = days.length ? Math.min(22, (W - 20) / days.length / 2.4) : 10;
  const step = days.length ? (W - 20) / days.length : 20;
  const bars = days
    .map((d, i) => {
      const x = 10 + i * step;
      const hs = Math.round((entries[d].itemsTotal / maxV) * (H - 28));
      const he = Math.round((entries[d].expenseTotal / maxV) * (H - 28));
      return `<rect x="${x.toFixed(1)}" y="${H - 18 - hs}" width="${bw.toFixed(1)}" height="${hs}" rx="2" fill="#2B4283"/><rect x="${(x + bw + 1).toFixed(1)}" y="${H - 18 - he}" width="${bw.toFixed(1)}" height="${he}" rx="2" fill="#E39A4F"/><text x="${(x + bw).toFixed(1)}" y="${H - 5}" font-size="9" text-anchor="middle" fill="#6B7390">${toBn(d)}</text>`;
    })
    .join("");
  const body = `
    ${docBand("মাসিক হিসাব", `${MONTH_NAMES[m - 1]}`, `${toBn(y)} · ${toBn(days.length)} দিনের এন্ট্রি`)}
    <div class="kpis">
      <div class="kpi navy"><div class="k">মোট বিক্রি</div><div class="v">৳ ${bf(sale)}</div></div>
      <div class="kpi green"><div class="k">নগদ জমা (আয়)</div><div class="v">৳ ${bf(cash)}</div></div>
      <div class="kpi orange"><div class="k">মোট খরচ</div><div class="v">৳ ${bf(exp)}</div></div>
      <div class="kpi ${sale - exp >= 0 ? "green" : "red"}"><div class="k">আনুমানিক লাভ</div><div class="v">৳ ${bf(sale - exp)}</div></div>
    </div>
    <div class="kpis" style="margin-top:10px">
      <div class="kpi"><div class="k">মাসের শুরুতে ইজা টাকা</div><div class="v" style="font-size:16px">৳ ${bf(first ? first.opening : 0)}</div></div>
      <div class="kpi"><div class="k">মাসের শেষে অবশিষ্ট</div><div class="v" style="font-size:16px;color:#1F2F5C">৳ ${bf(last ? last.remaining : 0)}</div></div>
      <div class="kpi red"><div class="k">এখনো বাকি</div><div class="v" style="font-size:16px">৳ ${bf(dueNow)}</div></div>
      <div class="kpi"><div class="k">মোট ছাড়</div><div class="v" style="font-size:16px">৳ ${bf(disc)}</div></div>
    </div>
    ${days.length ? `<div class="chart"><div class="ttl"><span>দিন অনুযায়ী জমা ও খরচ</span><span class="lg"><span style="background:#2B4283"></span>জমা<span style="background:#E39A4F"></span>খরচ</span></div><svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">${bars}</svg></div>` : ""}
    <table class="items">
      <thead><tr><th>তারিখ</th><th class="r">ইজা টাকা</th><th class="r">জমা (আয়)</th><th class="r">বাকি</th><th class="r">ছাড়</th><th class="r">খরচ</th><th class="r">অবশিষ্ট</th></tr></thead>
      <tbody>${trs}</tbody>
      <tfoot><tr><td>মোট</td><td></td><td class="r">${bf(cash)}</td><td class="r">${bf(dueNow)}</td><td class="r">${bf(disc)}</td><td class="r">${bf(exp)}</td><td class="r">${bf(last ? last.remaining : 0)}</td></tr></tfoot>
    </table>
    <div class="foot">প্রস্তুতের তারিখ: ${toBn(new Date().getDate())} ${MONTH_NAMES[new Date().getMonth()]} ${toBn(new Date().getFullYear())} · "বাকি" মানে ওই দিনের বিক্রির যে টাকা এখনো পাওয়া যায়নি</div>`;
  return docPage(`${MONTH_NAMES[m - 1]} ${y} — মাসিক হিসাব`, body);
}

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
  const RED = "#B24A45";
  const rr = (x, yy, w, h, r, fill, stroke, lw = 1) => {
    ctx.beginPath();
    ctx.moveTo(x + r, yy);
    ctx.lineTo(x + w - r, yy);
    ctx.arcTo(x + w, yy, x + w, yy + r, r);
    ctx.lineTo(x + w, yy + h - r);
    ctx.arcTo(x + w, yy + h, x + w - r, yy + h, r);
    ctx.lineTo(x + r, yy + h);
    ctx.arcTo(x, yy + h, x, yy + h - r, r);
    ctx.lineTo(x, yy + r);
    ctx.arcTo(x, yy, x + r, yy, r);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.stroke();
    }
  };
  const TONE = {
    navy: ["#E8EBF5", "#D3D9EE", "#1F2F5C"],
    green: ["#E3F4EA", "#C7E6D3", "#1E7A47"],
    red: ["#FBEAE7", "#F0CBC6", "#B24A45"],
    orange: ["#FFF3E3", "#F4DDBB", "#B2661F"],
    gray: ["#F5F6FA", "#E3E7F3", "#1B2340"],
  };
  const drawHead = () => {
    if (!doc.table) return;
    rr(M, y, tw, 28, 7, NAVY);
    let x = M;
    doc.table.cols.forEach((c) => {
      const w = c.w * tw;
      const tx = c.align === "right" ? x + w - 8 : c.align === "center" ? x + w / 2 : x + 8;
      text(c.label, tx, y + 19, { size: 12.5, bold: true, color: "#ffffff", align: c.align || "left", maxW: w - 16 });
      x += w;
    });
    y += 30;
  };
  const ensure = (h, withHead) => {
    if (y + h > PH - M - 34) {
      newPage();
      if (withHead) drawHead();
    }
  };

  newPage();
  // মাথার ব্যান্ড: লোগো + দোকানের নাম + ডকুমেন্টের ট্যাগ
  const bandH = 92;
  rr(M, y, tw, bandH, 14, NAVY);
  let bx = M + 18;
  if (logoImg) {
    rr(bx, y + 16, 64, 60, 10, "#ffffff");
    const lw = Math.min(56, (logoImg.width * 52) / logoImg.height);
    ctx.drawImage(logoImg, bx + (64 - lw) / 2, y + 20, lw, 52);
    bx += 78;
  }
  const tagW = 190;
  const nameW = PW - M - 18 - tagW - bx;
  text(shop.name, bx, y + 36, { size: 20, bold: true, color: "#ffffff", maxW: nameW });
  if (shop.address) text(shop.address, bx, y + 56, { size: 11.5, color: "#D5DBF0", maxW: nameW });
  if (shop.phone) text(`ফোন: ${shop.phone}`, bx, y + 74, { size: 11.5, color: "#D5DBF0", maxW: nameW });
  const tx0 = PW - M - 18;
  if (doc.tagMain) {
    if (doc.tagLabel) text(doc.tagLabel, tx0, y + 30, { size: 11.5, color: "#D5DBF0", align: "right" });
    text(doc.tagMain, tx0, y + 58, { size: 26, bold: true, color: "#ffffff", align: "right", maxW: tagW });
    if (doc.tagSub) text(doc.tagSub, tx0, y + 78, { size: 12, color: "#D5DBF0", align: "right", maxW: tagW });
  } else {
    if (doc.tagLabel) text(doc.tagLabel, tx0, y + 46, { size: 17, bold: true, color: "#ffffff", align: "right", maxW: tagW });
    if (doc.tagSub) text(doc.tagSub, tx0, y + 68, { size: 12, color: "#D5DBF0", align: "right", maxW: tagW });
  }
  y += bandH + 16;

  // পক্ষের প্যানেল
  const lines = doc.customerLines || [];
  if (lines.length) {
    const ph = 62;
    rr(M, y, tw, ph, 10, "#F5F6FA", "#E3E7F3");
    text(doc.partyLabel || "কাস্টমার", M + 16, y + 20, { size: 11, color: GRAY });
    text(lines[0], M + 16, y + 45, { size: 18, bold: true, maxW: tw * 0.55 });
    lines.slice(1, 3).forEach((ln, i) => text(ln, PW - M - 16, y + 26 + i * 20, { size: 12.5, color: "#4A5272", align: "right", maxW: tw * 0.4 }));
    y += ph + 14;
  }
  // সারাংশ-কার্ড
  if (doc.kpis && doc.kpis.length) {
    const n = doc.kpis.length;
    const gap = 10;
    const kw = (tw - gap * (n - 1)) / n;
    doc.kpis.forEach((k, i) => {
      const t = TONE[k.tone] || TONE.gray;
      const x = M + i * (kw + gap);
      rr(x, y, kw, 56, 10, t[0], t[1]);
      text(k.label, x + 12, y + 20, { size: 11, color: GRAY, maxW: kw - 24 });
      text(k.value, x + 12, y + 44, { size: 18, bold: true, color: t[2], maxW: kw - 24 });
    });
    y += 70;
  }

  if (doc.table) {
    drawHead();
    doc.table.rows.forEach((r, ri) => {
      const subs = (doc.table.subs && doc.table.subs[ri]) || [];
      const subLines = [];
      subs.forEach((sline) => wrapLines("• " + sline, tw - 28, 11.5).forEach((ln) => subLines.push(ln)));
      const rowH = 28 + (subLines.length ? subLines.length * 16 + 5 : 0);
      ensure(rowH + 2, true);
      if (ri % 2 === 1) {
        ctx.fillStyle = "#F8F9FC";
        ctx.fillRect(M, y, tw, rowH);
      }
      let x = M;
      doc.table.cols.forEach((c, i) => {
        const w = c.w * tw;
        const tx = c.align === "right" ? x + w - 8 : c.align === "center" ? x + w / 2 : x + 8;
        text(r[i], tx, y + 19, { size: 13, bold: !!c.bold, color: c.color === "red" ? RED : c.color === "green" ? "#1E7A47" : c.color === "gray" ? GRAY : INK, align: c.align || "left", maxW: w - 16 });
        x += w;
      });
      subLines.forEach((ln, k) => text(ln, M + 14, y + 38 + k * 16, { size: 11.5, color: GRAY, maxW: tw - 28 }));
      y += rowH;
      hline(y, "#E8EAF2", 1);
    });
  }

  if (doc.summary && doc.summary.length) {
    y += 16;
    const hs = doc.summary.map((row) => (row[2] ? 42 : 29));
    const boxH = hs.reduce((a, b) => a + b, 0);
    ensure(boxH + 24, false);
    const bw = 330;
    const bx2 = PW - M - bw;
    if (doc.stamp) {
      const sc = doc.stamp.tone === "green" ? "#2F7A4F" : RED;
      ctx.save();
      ctx.translate(M + 100, y + boxH / 2);
      ctx.rotate(-0.1);
      setFont(21, true);
      const sw = ctx.measureText(doc.stamp.text).width;
      rr(-sw / 2 - 18, -24, sw + 36, 48, 10, null, sc, 2.5);
      text(doc.stamp.text, 0, 8, { size: 21, bold: true, color: sc, align: "center" });
      ctx.restore();
    }
    rr(bx2, y, bw, boxH, 10, "#ffffff", "#D9DDEB");
    let yy = y;
    doc.summary.forEach((row, ri) => {
      const strong = !!row[2];
      const h = hs[ri];
      if (strong) {
        rr(bx2, yy, bw, h, 10, NAVY);
        ctx.fillStyle = NAVY;
        ctx.fillRect(bx2, yy, bw, 12);
      } else if (ri > 0) {
        ctx.strokeStyle = "#E8EAF2";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx2 + 1, yy);
        ctx.lineTo(bx2 + bw - 1, yy);
        ctx.stroke();
      }
      text(row[0], bx2 + 14, yy + (strong ? 27 : 19), { size: strong ? 16 : 13.5, bold: strong, color: strong ? "#ffffff" : INK });
      text(row[1], bx2 + bw - 14, yy + (strong ? 27 : 19), { size: strong ? 17 : 13.5, bold: strong, color: strong ? "#ffffff" : INK, align: "right" });
      yy += h;
    });
    y += boxH + 8;
  }

  if (doc.note) {
    const nl = wrapLines(doc.note, tw - 28, 12.5);
    const nh = nl.length * 19 + 16;
    ensure(nh + 20, false);
    y += 10;
    rr(M, y, tw, nh, 10, "#FFF8E6", "#F3E2B3");
    nl.forEach((ln, k) => text(ln, M + 14, y + 22 + k * 19, { size: 12.5, color: "#7A5A12" }));
    y += nh + 4;
  }

  ensure(80, false);
  const sy = Math.max(y + 54, PH - M - 78);
  const labels = doc.signLabels || ["গ্রাহকের স্বাক্ষর", "কর্তৃপক্ষ"];
  [
    [M, M + 160],
    [PW - M - 160, PW - M],
  ].forEach((seg, i) => {
    ctx.strokeStyle = "#AEB5CE";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(seg[0], sy);
    ctx.lineTo(seg[1], sy);
    ctx.stroke();
    text(labels[i], (seg[0] + seg[1]) / 2, sy + 18, { size: 12, color: GRAY, align: "center" });
  });
  // প্রতিটা পাতার নিচে: ধন্যবাদ + পাতা নম্বর
  pages.forEach((pg, i) => {
    ctx = pg.getContext("2d");
    ctx.strokeStyle = "#D9DDEB";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(M, PH - 36);
    ctx.lineTo(PW - M, PH - 36);
    ctx.stroke();
    text(`ধন্যবাদ — আবার আসবেন${shop.phone ? ` · ${shop.phone}` : ""}`, PW / 2, PH - 18, { size: 11.5, color: GRAY, align: "center", maxW: tw - 120 });
    if (pages.length > 1) text(`পাতা ${toBn(i + 1)}/${toBn(pages.length)}`, PW - M, PH - 18, { size: 11, color: GRAY, align: "right" });
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
  if (used.length) summary.push(["সাবটোটাল", bf(c.subtotal)]);
  if (c.discount > 0) summary.push(["ছাড় (−)", bf(c.discount)]);
  if (c.prevDue > 0) summary.push(["পূর্বের বাকি (+)", bf(c.prevDue)]);
  summary.push(["সর্বমোট", bf(c.total)]);
  if (c.paid > 0) summary.push(["জমা (−)", bf(c.paid)]);
  summary.push(["বাকি", `৳ ${bf(c.due)}`, true]);
  const sizeOf = (it) => {
    const h = String(it.height || "").trim();
    const w = String(it.weight || "").trim();
    return h && w ? toBn(`${h} × ${w}`) : h || w ? toBn(h || w) : "—";
  };
  return {
    tagLabel: "মেমো নং",
    tagMain: toBn(memo.no),
    tagSub: `${toBn(memo.d)} ${MONTH_NAMES[memo.m - 1]}, ${toBn(memo.y)}`,
    partyLabel: "প্রাপক",
    customerLines: [memo.customer, memo.phone ? `ফোন: ${memo.phone}` : "", memo.address ? `ঠিকানা: ${memo.address}` : ""].filter(Boolean),
    table: used.length
      ? {
          cols: [
            { label: "নং", w: 0.07, align: "center", color: "gray" },
            { label: "বিবরণ", w: 0.37, bold: true },
            { label: "সাইজ", w: 0.15, align: "center" },
            { label: "পরিমান", w: 0.1, align: "right" },
            { label: "দাম", w: 0.14, align: "right" },
            { label: "মোট", w: 0.17, align: "right", bold: true },
          ],
          rows: used.map((it, i) => [toBn(i + 1), it.name, sizeOf(it), toBn(it.qty || "1"), bf(numOr0(it.price)), bf(grossTotal(it))]),
        }
      : null,
    summary,
    stamp: c.total > 0 ? (c.due <= 0 ? { text: "পরিশোধিত", tone: "green" } : { text: `বাকি ৳${bf(c.due)}`, tone: "red" }) : null,
    note: memo.note ? `নোট: ${memo.note}` : "",
  };
}

function statementToDoc(c) {
  const rows = customerRows(c);
  const now = new Date();
  return {
    tagLabel: "হিসাবের বিবরণী",
    tagSub: `${toBn(now.getDate())} ${MONTH_NAMES[now.getMonth()]}, ${toBn(now.getFullYear())}`,
    partyLabel: "কাস্টমার",
    customerLines: [c.name, c.phone ? `ফোন: ${c.phone}` : "", c.address ? `ঠিকানা: ${c.address}` : ""].filter(Boolean),
    kpis: [
      { label: "মোট বিল (ছাড়সহ)", value: `৳ ${bf(c.billed)}`, tone: "navy" },
      { label: "মোট জমা", value: `৳ ${bf(c.paid)}`, tone: "green" },
      { label: "বর্তমান বাকি", value: `৳ ${bf(c.due)}`, tone: c.due > 0 ? "red" : "green" },
    ],
    table: rows.length
      ? {
          cols: [
            { label: "তারিখ", w: 0.2, color: "gray" },
            { label: "বিবরণ", w: 0.28, bold: true },
            { label: "সর্বমোট", w: 0.17, align: "right" },
            { label: "জমা", w: 0.17, align: "right", color: "green" },
            { label: "বাকি", w: 0.18, align: "right", bold: true, color: "red" },
          ],
          rows: rows.map((r) => [`${toBn(r.d)} ${MONTH_SHORT[r.m - 1]} ${toBn(r.y)}`, r.label, bf(r.total), r.paid ? bf(r.paid) : "—", bf(r.due)]),
          subs: rows.map((r) => r.detail || []),
        }
      : null,
    summary: [],
    note: "",
    signLabels: ["গ্রাহকের স্বাক্ষর", "কর্তৃপক্ষ"],
  };
}

function printCustomerStatement(c) {
  openPrintHtml(statementHtml(c));
}

function printCustomerMemo(memo) {
  openPrintHtml(memoHtml(memo));
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
const NameInput = ({ value, onValue, names, customNames, onAdd, onRemove, placeholder, inputClass = "px-2 py-2", inputStyle, addLabel = "+ নতুন নাম যোগ করুন" }) => {
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
    let z = 1;
    try {
      z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rk-z")) || 1;
    } catch (e) {
      /* ignore */
    }
    setPos(
      up
        ? { z, left, width, bottom: vh - r.top + 2, maxH: Math.max(150, Math.min(300, r.top - 12)) }
        : { z, left, width, top: r.bottom + 2, maxH: Math.max(150, Math.min(300, below - 12)) }
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
              zoom: pos.z,
              left: pos.left / pos.z,
              width: pos.width / pos.z,
              ...(pos.top !== undefined ? { top: pos.top / pos.z } : { bottom: pos.bottom / pos.z }),
              maxHeight: pos.maxH / pos.z,
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
                {addLabel}
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
      <button
        onClick={onBack}
        aria-label="পিছনে যান"
        className="flex items-center justify-center shrink-0 active:opacity-70"
        style={{ width: 42, height: 42, borderRadius: 999, background: "rgba(255,255,255,0.22)", color: "#FFFFFF", boxShadow: "0 2px 10px rgba(0,0,0,0.28)", marginLeft: -4 }}
      >
        <ChevronLeft size={26} strokeWidth={2.6} />
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
  const [dueOpen, setDueOpen] = useState(null);
  const [settleForm, setSettleForm] = useState(null);
  const [showDueAdd, setShowDueAdd] = useState(false);
  const [settlingBusy, setSettlingBusy] = useState(false);
  const [pbList, setPbList] = useState([]);
  const [pbPays, setPbPays] = useState([]);
  const [pbOpen, setPbOpen] = useState(null);
  const [pbShowAdd, setPbShowAdd] = useState(false);
  const [pbShowPaid, setPbShowPaid] = useState(false);
  const [pbAdd, setPbAdd] = useState({ name: "", amount: "", date: "", note: "" });
  const [pbPay, setPbPay] = useState(null);
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
  const [newDue, setNewDue] = useState({ name: "", amount: "", date: "", phone: "", lines: [] });
  const [dueFilter, setDueFilter] = useState("all"); // all | old7 | old15
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
  const [customersReg, setCustomersReg] = useState([]);
  const [custForm, setCustForm] = useState(null);
  const [custSort, setCustSort] = useState("due"); // due | recent | name
  const [lastEntry, setLastEntry] = useState(null);
  const [safety, setSafety] = useState(null);
  const [safetyBusy, setSafetyBusy] = useState("");
  const [driveCfg, setDriveCfg] = useState(() => getDriveCfg());
  const [driveForm, setDriveForm] = useState({ url: "", secret: "" });
  const [driveFiles, setDriveFiles] = useState(null);
  const [safetyJump, setSafetyJump] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [staffAdv, setStaffAdv] = useState([]);
  const [attendY, setAttendY] = useState({});
  const [salaryY, setSalaryY] = useState({});
  const [staffYM, setStaffYM] = useState(() => ({ y: _NOW_YEAR, m: new Date().getMonth() + 1 }));
  const [staffForm, setStaffForm] = useState(null);
  const [staffOpen, setStaffOpen] = useState(null);
  const [payForm, setPayForm] = useState(null);
  const [advForm, setAdvForm] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const attQueue = useRef(Promise.resolve());
  const restoreRef = useRef(null);

  const [yearStats, setYearStats] = useState({ income: 0, expense: 0 });
  const [yearStatsLoading, setYearStatsLoading] = useState(false);

  // ---- মাস-ভিত্তিক ইউনিফাইড ভিউ (উপরে এডিট প্যানেল + নিচে প্রতিদিনের বক্স) ----
  const [monthEntries, setMonthEntries] = useState({});
  const [monthLoading, setMonthLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const emptyExpenseDraft = () => ({ id: null, name: "", amount: "" });
  const emptySaleDraft = () => ({ id: null, name: "", customer: "", height: "", weight: "", qty: "", price: "", due: "", discount: "" });

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
      .map((it) => {
        const cn = (it.customer || "").trim();
        return { id: it.id, name: cn || it.name || "(নামহীন)", amount: dueRemaining(it), ...(cn ? { item: it.name || "", fromSale: true } : {}) };
      });
    await saveDuesForDate(y, m, d, dueRows);
    await saveYearStatsForDate(y, m, d, itemsTotal, expenseTotal, remaining);
    try {
      await rebalance({ fromY: y, fromM: m, fromD: d });
    } catch (e) {
      /* ব্যালেন্স মেলানো ব্যর্থ হলেও সেভ হারায় না; 'হিসাব মিলিয়ে নিন' বাটনে ঠিক করা যায় */
    }
  }

  const phoneOf = (name, entry) => {
    if (entry && entry.phone) return entry.phone;
    const k = custKey(name);
    const rg = customersReg.find((c) => custKey(c.name) === k && c.phone);
    if (rg) return rg.phone;
    const mm = memos.find((x) => custKey(x.customer) === k && x.phone);
    return mm ? mm.phone : "";
  };

  const allCustomerNames = [...new Map([...customersReg.map((c) => c.name), ...memos.map((x) => x.customer)].filter(Boolean).map((n) => [custKey(n), String(n).trim()])).values()];

  const quickRegisterCustomer = async (rawName) => {
    const name = (rawName || "").trim();
    if (!name) return null;
    if (customersReg.some((c) => custKey(c.name) === custKey(name))) return name;
    const list = [...customersReg, { id: emptyRowId(), name, phone: "", address: "", at: Date.now() }];
    setCustomersReg(list);
    await saveCustomerReg(list);
    return name;
  };

  const saveCustForm = async () => {
    const f = custForm;
    if (!f) return;
    const name = (f.name || "").trim();
    if (!name) {
      window.alert("কাস্টমারের নাম লিখুন।");
      return;
    }
    if (customersReg.some((c) => custKey(c.name) === custKey(name) && c.id !== f.id)) {
      window.alert("এই নামে কাস্টমার আগেই রেজিস্টার করা আছে।");
      return;
    }
    const phone = (f.phone || "").trim();
    if (phone && digitsOnly(phone).length < 10 && !window.confirm("ফোন নম্বরটা ১০ ডিজিটের কম মনে হচ্ছে। তবুও সেভ করবেন?")) return;
    const address = (f.address || "").trim();
    const list = f.id
      ? customersReg.map((c) => (c.id === f.id ? { ...c, name, phone, address } : c))
      : [...customersReg, { id: emptyRowId(), name, phone, address, at: Date.now() }];
    const ok = await saveCustomerReg(list);
    setCustomersReg(list);
    setCustForm(null);
    setCustSel(custKey(name));
    showToast(ok ? "✓ কাস্টমার সেভ হয়েছে" : "ফোনে সেভ হয়েছে — নেট এলে সার্ভারে যাবে");
  };

  const deleteCustReg = async (c) => {
    if (!window.confirm(`${c.name} কে কাস্টমার তালিকা থেকে মুছবেন? (কোনো লেনদেন নেই বলেই মোছা যাচ্ছে)`)) return;
    const list = customersReg.filter((x) => x.id !== c.reg.id);
    await saveCustomerReg(list);
    setCustomersReg(list);
    setCustSel(null);
    showToast("কাস্টমার মুছে ফেলা হয়েছে");
  };

  // ---- ডেটা সুরক্ষা পেজের কাজ ----
  const refreshSafety = async () => {
    const idx = await readSnapIndex();
    const local = await listLocalCopies();
    const ckeys = await idbKeys("conflict:");
    const conflicts = [];
    for (const k of ckeys.slice(-20)) {
      const r = pj(await idbGet(k), null);
      if (r) conflicts.push({ id: r.id, at: r.at, key: r.key, auto: r.auto });
    }
    conflicts.sort((a, b) => b.at - a.at);
    setSafety({ idx, local, conflicts, pending: pendingCount() });
  };
  const driveErrText = (e) => {
    const m = String((e && e.message) || e);
    if (m === "secret") return "গোপন কোড মেলেনি — স্ক্রিপ্টের SECRET আর এখানে দেওয়া কোড একই হতে হবে।";
    if (m === "timeout" || /Failed to fetch|NetworkError|Load failed/i.test(m)) return "Google-এর সাথে যোগাযোগ হয়নি — লিংকটা ঠিক আছে কিনা, 'Who has access: Anyone' দেওয়া আছে কিনা আর নেট ঠিক আছে কিনা দেখুন।";
    return "Drive-এ কাজ হয়নি (" + m + ")।";
  };
  const connectDrive = async () => {
    const url = (driveForm.url || "").trim();
    const secret = (driveForm.secret || "").trim();
    if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(url)) {
      window.alert("লিংকটা ঠিক মনে হচ্ছে না। Deploy করার পর যে 'Web app URL' পেয়েছেন (…/exec দিয়ে শেষ) সেটা দিন।");
      return;
    }
    if (!secret) {
      window.alert("গোপন কোড লিখুন।");
      return;
    }
    setSafetyBusy("Google-এর সাথে যাচাই হচ্ছে…");
    try {
      saveDriveCfg({ url, secret });
      const j = await driveCall("ping", {}, 40000);
      saveDriveCfg({ url, secret, email: j.email || "", folder: j.folder || "" });
      setDriveCfg(getDriveCfg());
      setDriveForm({ url: "", secret: "" });
      showToast("✓ Google অ্যাকাউন্ট যুক্ত হয়েছে");
      loadDriveFiles();
    } catch (e) {
      clearDriveCfg();
      setDriveCfg(null);
      window.alert(driveErrText(e));
    } finally {
      setSafetyBusy("");
    }
  };
  const disconnectDrive = () => {
    if (!window.confirm("Google Drive সংযোগ বিচ্ছিন্ন করবেন? Drive-এ আগে রাখা ফাইল থেকে যাবে, শুধু নতুন ব্যাকআপ আর যাবে না।")) return;
    clearDriveCfg();
    setDriveCfg(null);
    setDriveFiles(null);
  };
  const loadDriveFiles = async () => {
    if (!getDriveCfg()) return;
    try {
      const j = await driveCall("list", {}, 40000);
      setDriveFiles(j.files || []);
    } catch (e) {
      setDriveFiles(null);
    }
  };
  const restoreFromDrive = async (f) => {
    if (needEdit()) return;
    try {
      setSafetyBusy("Drive থেকে নামানো হচ্ছে…");
      const j = await driveCall("get", { id: f.id }, 180000);
      const obj = JSON.parse(j.content);
      setSafetyBusy("");
      await runRestore(obj, `Drive: ${f.name}`);
    } catch (e) {
      setSafetyBusy("");
      window.alert(driveErrText(e));
    }
  };
  const fixBalances = async () => {
    showToast("হিসাব মেলানো হচ্ছে…");
    try {
      const r = await rebalance({ dryRun: true });
      if (!r.changes.length) {
        showToast("✓ সব দিনের অবশিষ্ট ঠিক আছে");
        return;
      }
      if (!editMode) {
        window.alert(`${toBn(r.changes.length)} টা দিনের অবশিষ্ট মিলছে না। ঠিক করতে আগে এডিট মোড চালু করুন (পিন লাগবে), তারপর আবার চাপুন।`);
        return;
      }
      const sample = r.changes
        .slice(0, 6)
        .map((c) => `${toBn(c.d)} ${MONTH_NAMES[c.m - 1]} ${toBn(c.y)}: ${c.oldBalance === undefined ? "—" : toBn(fmt(c.oldBalance))} → ${toBn(fmt(c.newBalance))}`)
        .join("\n");
      if (!window.confirm(`${toBn(r.changes.length)} টা দিনের অবশিষ্ট ঠিক করা হবে:\n\n${sample}${r.changes.length > 6 ? "\n…" : ""}\n\n(দিনের এন্ট্রি বদলাবে না, শুধু ইজা টাকা ও অবশিষ্ট মিলবে)। করবেন?`)) return;
      await rebalance({});
      if (year && month) setMonthEntries(await loadMonthEntries(year, month));
      showToast(`✓ ${toBn(r.changes.length)} টা দিনের অবশিষ্ট ঠিক হয়েছে`);
    } catch (e) {
      window.alert("হিসাব মেলানো যায়নি — নেট দেখে আবার চেষ্টা করুন।");
    }
  };
  const formRef = useRef(null);
  const handleFormEnter = (e) => {
    if (e.key !== "Enter" || e.defaultPrevented) return;
    const t = e.target;
    if (!t || t.tagName !== "INPUT" || !formRef.current) return;
    const list = [...formRef.current.querySelectorAll("input:not([disabled])")].filter((i) => i.type !== "hidden");
    const i = list.indexOf(t);
    if (i < 0 || i === list.length - 1) return;
    e.preventDefault();
    const nx = list[i + 1];
    nx.focus();
    try {
      nx.select();
    } catch (err) {
      /* ignore */
    }
  };
  useEffect(() => {
    if (!saleSheetOpen || !formRef.current) return;
    formRef.current.querySelectorAll("input").forEach((i) => i.setAttribute("enterkeyhint", "next"));
  });
  // ---- স্টাফ: দিনের খরচের সারিতে বেতন/অ্যাডভান্স লেখা ও মোছা ----
  const upsertDayExpense = async (yy, mm, dd, row) => {
    const raw = await loadDay(yy, mm, dd);
    const expenses = [...raw.expenses.filter(isMeaningfulExpense).filter((r) => r.id !== row.id), row];
    await recomputeAndSaveDay(yy, mm, dd, { ...raw, expenses });
  };
  const removeDayExpense = async (yy, mm, dd, id) => {
    const raw = await loadDay(yy, mm, dd);
    if (!raw.expenses.some((r) => r.id === id)) return;
    await recomputeAndSaveDay(yy, mm, dd, { ...raw, expenses: raw.expenses.filter(isMeaningfulExpense).filter((r) => r.id !== id) });
  };
  const parseYmd = (ds) => {
    const [yy, mm, dd] = String(ds || "").split("-").map(Number);
    return yy && mm && dd ? { yy, mm, dd } : null;
  };

  const loadStaffAll = async (yy) => {
    setStaffLoading(true);
    try {
      const [list, adv, att, sal] = await Promise.all([loadStaff(), loadStaffAdv(), loadAttend(yy), loadSalaryRec(yy)]);
      setStaffList(list);
      setStaffAdv(adv);
      setAttendY(att);
      setSalaryY(sal);
    } finally {
      setStaffLoading(false);
    }
  };

  const saveStaffForm = async () => {
    const f = staffForm;
    if (!f) return;
    const name = (f.name || "").trim();
    const salary = num(f.salary);
    if (!name) {
      window.alert("স্টাফের নাম লিখুন।");
      return;
    }
    if (!(salary > 0)) {
      window.alert("বেতনের টাকা লিখুন (০-এর বেশি)।");
      return;
    }
    if (staffList.some((s) => custKey(s.name) === custKey(name) && s.id !== f.id && s.active !== false) && !window.confirm("এই নামে আরেকজন চালু স্টাফ আছে। তবুও যোগ করবেন?")) return;
    const rec = { name, phone: (f.phone || "").trim(), type: f.type === "daily" ? "daily" : "monthly", salary: String(salary), active: f.active !== false };
    const list = f.id ? staffList.map((s) => (s.id === f.id ? { ...s, ...rec } : s)) : [...staffList, { id: emptyRowId(), ...rec, at: Date.now() }];
    const ok = await saveStaff(list);
    setStaffList(list);
    setStaffForm(null);
    showToast(ok ? "✓ স্টাফ সেভ হয়েছে" : "ফোনে সেভ হয়েছে — নেট এলে সার্ভারে যাবে");
  };

  const applyAttend = (stId, d, value) => {
    if (!editMode) return;
    const { y, m } = staffYM;
    setAttendY((p) => {
      const q = JSON.parse(JSON.stringify(p));
      q[m] = q[m] || {};
      q[m][stId] = q[m][stId] || {};
      if (value) q[m][stId][d] = value;
      else delete q[m][stId][d];
      return q;
    });
    attQueue.current = attQueue.current.then(async () => {
      const fresh = await loadAttend(y);
      fresh[m] = fresh[m] || {};
      fresh[m][stId] = fresh[m][stId] || {};
      if (value) fresh[m][stId][d] = value;
      else delete fresh[m][stId][d];
      const ok = await saveAttend(y, fresh);
      if (!ok) showToast("ফোনে সেভ হয়েছে — নেট এলে সার্ভারে যাবে");
    });
  };
  const cycleAttend = (stId, d) => {
    const cur = ((attendY[staffYM.m] || {})[stId] || {})[d] || "";
    applyAttend(stId, d, ATT_NEXT[cur]);
  };

  const addAdvance = async (st) => {
    const f = advForm;
    const amount = num(f && f.amount);
    const dt = parseYmd(f && f.date);
    if (!(amount > 0) || !dt) {
      window.alert("অ্যাডভান্সের টাকা আর তারিখ দিন।");
      return;
    }
    const id = emptyRowId();
    const adv = { id, staffId: st.id, date: f.date, amount, settled: 0, note: (f.note || "").trim(), expId: `adv-${id}` };
    try {
      await upsertDayExpense(dt.yy, dt.mm, dt.dd, { id: adv.expId, name: `অ্যাডভান্স — ${st.name}`, amount: String(amount) });
      const list = [...staffAdv, adv];
      await saveStaffAdv(list);
      setStaffAdv(list);
      setAdvForm(null);
      showToast(`✓ অ্যাডভান্স ৳${toBn(fmt(amount))} লেখা হয়েছে (${toBn(dt.dd)} ${MONTH_NAMES[dt.mm - 1]} এর খরচে)`);
    } catch (e) {
      window.alert("অ্যাডভান্স সেভ হয়নি — নেট দেখে আবার চেষ্টা করুন।");
    }
  };
  const deleteAdvance = async (adv) => {
    if ((adv.settled || 0) > 0) {
      window.alert("এই অ্যাডভান্সের কিছু অংশ বেতন থেকে কাটা হয়ে গেছে, তাই মোছা যাবে না। আগে ওই মাসের বেতন 'বাতিল' করুন।");
      return;
    }
    if (!window.confirm(`৳${fmt(adv.amount)} অ্যাডভান্স মুছবেন? ওই দিনের খরচ থেকেও বাদ যাবে।`)) return;
    const dt = parseYmd(adv.date);
    try {
      if (dt) await removeDayExpense(dt.yy, dt.mm, dt.dd, adv.expId);
      const list = staffAdv.filter((a) => a.id !== adv.id);
      await saveStaffAdv(list);
      setStaffAdv(list);
      showToast("অ্যাডভান্স মুছে ফেলা হয়েছে");
    } catch (e) {
      window.alert("মোছা যায়নি — আবার চেষ্টা করুন।");
    }
  };

  const paySalary = async (st) => {
    const { y, m } = staffYM;
    const f = payForm;
    const dt = parseYmd(f && f.date);
    if (!dt) {
      window.alert("বেতন দেওয়ার তারিখ দিন।");
      return;
    }
    const calc = staffMonthCalc(st, (attendY[m] || {})[st.id], y, m);
    const plan = planPayment(calc.gross, staffAdv, st.id);
    const amount = f.amount === "" || f.amount === undefined ? plan.net : num(f.amount);
    if (isNaN(amount) || amount < 0) {
      window.alert("টাকার পরিমাণ ঠিক নয়।");
      return;
    }
    if (calc.gross === 0 && !window.confirm("এই মাসে কোনো উপস্থিতি লেখা নেই, বেতন ৳০। তবুও 'দেওয়া হয়েছে' লিখবেন?")) return;
    const payId = emptyRowId();
    const expId = `salary-${payId}`;
    try {
      if (amount > 0) await upsertDayExpense(dt.yy, dt.mm, dt.dd, { id: expId, name: `বেতন — ${st.name} (${MONTH_NAMES[m - 1]} ${toBn(y)})`, amount: String(amount) });
      const advList = staffAdv.map((a) => {
        const part = plan.parts.find((p) => p.id === a.id);
        return part ? { ...a, settled: (a.settled || 0) + part.amt } : a;
      });
      if (plan.parts.length) {
        await saveStaffAdv(advList);
        setStaffAdv(advList);
      }
      const all = await loadSalaryRec(y);
      all[m] = all[m] || {};
      all[m][st.id] = { id: payId, date: f.date, gross: calc.gross, units: calc.units, deduct: plan.deduct, parts: plan.parts, net: amount, expId: amount > 0 ? expId : null };
      await saveSalaryRec(y, all);
      setSalaryY(all);
      setPayForm(null);
      showToast(`✓ ${st.name} এর বেতন ৳${toBn(fmt(amount))} — ${toBn(dt.dd)} ${MONTH_NAMES[dt.mm - 1]} এর খরচে ওঠানো হয়েছে`);
    } catch (e) {
      window.alert("বেতন সেভ হয়নি — নেট দেখে আবার চেষ্টা করুন (আগে 'ডেটা সুরক্ষা' দেখুন কিছু অর্ধেক হয়েছে কিনা)।");
    }
  };
  const undoSalary = async (st) => {
    const { y, m } = staffYM;
    const rec = ((salaryY[m] || {})[st.id]) || null;
    if (!rec) return;
    if (!window.confirm(`${st.name} এর ${MONTH_NAMES[m - 1]} মাসের বেতন 'দেওয়া হয়েছে' বাতিল করবেন? খরচের সারিটাও মুছে যাবে আর কাটা অ্যাডভান্স আবার বাকি হবে।`)) return;
    try {
      const dt = parseYmd(rec.date);
      if (dt && rec.expId) await removeDayExpense(dt.yy, dt.mm, dt.dd, rec.expId);
      if (rec.parts && rec.parts.length) {
        const advList = staffAdv.map((a) => {
          const part = rec.parts.find((p) => p.id === a.id);
          return part ? { ...a, settled: Math.max(0, (a.settled || 0) - part.amt) } : a;
        });
        await saveStaffAdv(advList);
        setStaffAdv(advList);
      }
      const all = await loadSalaryRec(y);
      if (all[m]) delete all[m][st.id];
      await saveSalaryRec(y, all);
      setSalaryY(all);
      showToast("বেতন বাতিল হয়েছে");
    } catch (e) {
      window.alert("বাতিল হয়নি — আবার চেষ্টা করুন।");
    }
  };

  const needEdit = () => {
    if (editMode) return false;
    window.alert("রিস্টোরের মতো কাজের জন্য আগে এডিট মোড চালু করুন (পিন লাগবে)।");
    return true;
  };
  const runRestore = async (obj, label) => {
    if (needEdit()) return;
    const n = Object.keys((obj && obj.keys) || {}).length;
    if (!window.confirm(`"${label}" থেকে ${toBn(n)} টা ডেটা ফিরিয়ে আনবেন?\n\nবর্তমান ডেটার ওই অংশ এই কপির ডেটা দিয়ে বদলে যাবে। রিস্টোরের ঠিক আগের অবস্থা এই ডিভাইসে আলাদা করে রাখা হবে।`)) return;
    setSafetyBusy("রিস্টোর হচ্ছে…");
    try {
      let r = await restoreFromBackupObject(obj, (d, t) => setSafetyBusy(`রিস্টোর হচ্ছে… ${toBn(d)}/${toBn(t)}`));
      if (r.status === "no-prerestore") {
        if (!window.confirm("রিস্টোরের আগের অবস্থার কপি রাখা যায়নি (নেট/স্টোরেজ সমস্যা)। তবুও রিস্টোর করবেন?")) return;
        r = await restoreFromBackupObject(obj, null, { skipPre: true });
      }
      window.alert(`✓ ${toBn(r.ok)} টা ফিরেছে${r.queued ? `, ${toBn(r.queued)} টা নেট এলে যাবে` : ""}। অ্যাপ নতুন করে লোড হবে।`);
      window.location.reload();
    } catch (e) {
      window.alert(e && e.message === "bad-format" ? "এটা এই অ্যাপের ব্যাকআপ ফাইল নয়।" : "রিস্টোর হয়নি — আবার চেষ্টা করুন।");
    } finally {
      setSafetyBusy("");
    }
  };
  const restoreFromFile = async (file) => {
    if (!file) return;
    try {
      const obj = JSON.parse(await file.text());
      await runRestore(obj, file.name);
    } catch (e) {
      window.alert("ফাইলটা পড়া যায়নি — সঠিক ব্যাকআপ ফাইল দিন।");
    }
  };
  const restoreFromServer = async (entry) => {
    try {
      setSafetyBusy("স্ন্যাপশট নামানো হচ্ছে…");
      const obj = await loadServerSnapshot(entry);
      setSafetyBusy("");
      await runRestore(obj, `${entry.date} এর সার্ভার স্ন্যাপশট`);
    } catch (e) {
      setSafetyBusy("");
      window.alert("স্ন্যাপশটটা নামানো যায়নি — নেট দেখে আবার চেষ্টা করুন।");
    }
  };
  const restoreFromLocal = async (c) => {
    const raw = await idbGet(c.name);
    const obj = pj(raw, null);
    if (!obj) {
      window.alert("এই কপিটা পড়া যায়নি।");
      return;
    }
    await runRestore(obj, `${c.label} (${c.date})`);
  };
  const conflictUseMine = async (c) => {
    if (needEdit()) return;
    const rec = pj(await idbGet("conflict:" + c.id), null);
    if (!rec) return;
    if (!window.confirm("এই ডিভাইসের কপিটা (বিবাদের সময়ের) সার্ভারে বসাবেন? অন্য ডিভাইসের ওই অংশের পরিবর্তন বাদ পড়বে।")) return;
    await kset(rec.key, rec.mine, { force: true });
    addRecalc(rec.key);
    await idbDel("conflict:" + c.id);
    showToast("✓ বসানো হয়েছে");
    refreshSafety();
  };
  const conflictDismiss = async (c) => {
    await idbDel("conflict:" + c.id);
    refreshSafety();
  };
  const processRecalc = async () => {
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem("recalc") || "[]");
    } catch (e) {
      list = [];
    }
    if (!list.length) return;
    try {
      localStorage.setItem("recalc", "[]");
    } catch (e) {
      /* ignore */
    }
    for (const id of list) {
      const [yy, mm, dd] = id.split("-").map(Number);
      try {
        const raw = await loadDay(yy, mm, dd);
        await recomputeAndSaveDay(yy, mm, dd, raw);
      } catch (e) {
        addRecalc(dayKey(yy, mm, dd));
      }
    }
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

  // ---- বাকি: বিস্তারিত পণ্যসহ যোগ, কাস্টমার অনুযায়ী জমা + ছাড় ----
  const addDueLine = () => setNewDue((p) => ({ ...p, lines: [...(p.lines || []), { name: "", height: "", weight: "", qty: "", price: "" }] }));
  const updateDueLine = (i, f, v) => setNewDue((p) => ({ ...p, lines: (p.lines || []).map((ln, idx) => (idx === i ? { ...ln, [f]: v } : ln)) }));
  const removeDueLine = (i) => setNewDue((p) => ({ ...p, lines: (p.lines || []).filter((_, idx) => idx !== i) }));

  // এক বাকি-এন্ট্রিতে জমা (cash) আর ছাড় (waive) বসানো। আয়ের সারি এখানে হয় না — কাস্টমার-পর্যায়ে একবারই হয়।
  async function applyDueSettlement(entry, cash, waive) {
    if (entry.manual) {
      const list = await loadManualDues();
      const remaining = Math.max(0, (entry.amount || 0) - cash - waive);
      await saveManualDues(list.map((x) => (x.id === entry.id ? { ...x, amount: remaining } : x)).filter((x) => !(x.id === entry.id && x.amount <= 0)));
      if (entry.memoId) {
        const ml = await loadMemosYear(entry.memoY);
        await saveMemosYear(
          entry.memoY,
          ml.map((x) =>
            x.id === entry.memoId
              ? { ...x, paid: String(numOr0(x.paid) + cash), discount: String(numOr0(x.discount) + waive), dueListId: remaining > 0 ? x.dueListId : null }
              : x
          )
        );
      }
    } else {
      const origRaw = await loadDay(entry.y, entry.m, entry.d);
      const items = origRaw.items.map((it) => {
        if (it.id !== entry.id) return it;
        const left = dueRemaining(it);
        const c = Math.min(cash, left);
        const w = Math.min(waive, Math.max(0, left - c));
        return { ...it, duePaid: String((num(it.duePaid) || 0) + c), dueWaived: String((num(it.dueWaived) || 0) + w) };
      });
      await recomputeAndSaveDay(entry.y, entry.m, entry.d, { ...origRaw, items });
    }
  }

  const settleCustomerDues = async (group) => {
    const f = settleForm && settleForm.key === group.key ? settleForm : null;
    if (!f) return;
    const paid = num(f.paid) || 0;
    const waive = num(f.waive) || 0;
    if (paid < 0 || waive < 0 || (paid === 0 && waive === 0)) {
      window.alert("জমা বা ছাড় — অন্তত একটা টাকা লিখুন।");
      return;
    }
    if (paid + waive > group.total + 0.001) {
      window.alert(`জমা + ছাড় (৳${toBn(fmt(paid + waive))}) বাকির (৳${toBn(fmt(group.total))}) চেয়ে বেশি।`);
      return;
    }
    const dt = parseYmd(f.date || todayInputValue());
    if (!dt) {
      window.alert("তারিখ ঠিক নয়।");
      return;
    }
    if (settlingRef.current) return;
    settlingRef.current = true;
    setSettlingBusy(true);
    try {
      let cashLeft = paid;
      let waiveLeft = waive;
      for (const e of group.entries) {
        if (cashLeft <= 0 && waiveLeft <= 0) break;
        const c = Math.min(cashLeft, e.amount);
        cashLeft -= c;
        const w = Math.min(waiveLeft, e.amount - c);
        waiveLeft -= w;
        if (c > 0 || w > 0) await applyDueSettlement(e, c, w);
      }
      if (paid > 0) {
        const payRaw = await loadDay(dt.yy, dt.mm, dt.dd);
        const newItem = { id: emptyRowId(), name: `${group.name} (পরিশোধ)`, height: "", weight: "", qty: "1", price: String(paid), due: "", discount: "" };
        await recomputeAndSaveDay(dt.yy, dt.mm, dt.dd, { ...payRaw, items: [...payRaw.items.filter(isMeaningfulItem), newItem] });
      }
      setSettleForm(null);
      setAllDuesLoading(true);
      setAllDues(await loadAllDuesFlat());
      setAllDuesLoading(false);
      showToast(waive > 0 ? `✓ জমা ৳${toBn(fmt(paid))}, ছাড় ৳${toBn(fmt(waive))}` : `✓ ৳${toBn(fmt(paid))} জমা হয়েছে`);
    } catch (e) {
      window.alert("পুরোটা সেভ হয়নি — নেট দেখে বাকির লিস্ট আবার খুলে দেখুন, তারপর বাকিটা আবার দিন।");
    } finally {
      settlingRef.current = false;
      setSettlingBusy(false);
    }
  };

  // ---- পাওনাদার (আমি কাকে কত দেব) ----
  const loadPayablesAll = async () => {
    const [a, b] = await Promise.all([loadJsonList(PAYABLES_KEY), loadJsonList(PAYABLEPAY_KEY)]);
    setPbList(a);
    setPbPays(b);
  };
  const addPayable = async () => {
    const name = (pbAdd.name || "").trim();
    const amount = num(pbAdd.amount);
    const dt = parseYmd(pbAdd.date || todayInputValue());
    if (!name || !(amount > 0) || !dt) {
      window.alert("নাম, টাকা আর তারিখ দিন।");
      return;
    }
    const list = [...pbList, { id: emptyRowId(), name, date: pbAdd.date || todayInputValue(), amount, note: (pbAdd.note || "").trim(), paid: 0 }];
    const ok = await kset(PAYABLES_KEY, JSON.stringify(list));
    setPbList(list);
    setPbAdd({ name: "", amount: "", date: "", note: "" });
    setPbShowAdd(false);
    showToast(ok ? "✓ পাওনা যোগ হয়েছে" : "ফোনে সেভ হয়েছে — নেট এলে সার্ভারে যাবে");
  };
  const deletePayable = async (en) => {
    if ((en.paid || 0) > 0) {
      window.alert("এর কিছু টাকা দেওয়া হয়ে গেছে, তাই মোছা যাবে না। আগে ওই পরিশোধ মুছুন।");
      return;
    }
    if (!window.confirm(`${en.name} এর ৳${fmt(en.amount)} পাওনা মুছবেন?`)) return;
    const list = pbList.filter((x) => x.id !== en.id);
    await kset(PAYABLES_KEY, JSON.stringify(list));
    setPbList(list);
  };
  const payPayable = async (g) => {
    const f = pbPay && pbPay.key === g.key ? pbPay : null;
    if (!f) return;
    const amount = num(f.amount);
    const dt = parseYmd(f.date || todayInputValue());
    if (!(amount > 0) || !dt) {
      window.alert("কত টাকা দিলেন আর তারিখ দিন।");
      return;
    }
    if (amount > g.total + 0.001) {
      window.alert(`দেওয়ার টাকা (৳${toBn(fmt(amount))}) পাওনার (৳${toBn(fmt(g.total))}) চেয়ে বেশি।`);
      return;
    }
    if (settlingRef.current) return;
    settlingRef.current = true;
    setSettlingBusy(true);
    try {
      const id = emptyRowId();
      let left = amount;
      const parts = [];
      for (const en of g.entries) {
        if (left <= 0) break;
        const take = Math.min(left, Math.max(0, en.amount - (en.paid || 0)));
        if (take > 0) {
          parts.push({ id: en.id, amt: take });
          left -= take;
        }
      }
      const expId = f.toExpense !== false ? `pbpay-${id}` : null;
      if (expId) await upsertDayExpense(dt.yy, dt.mm, dt.dd, { id: expId, name: `পাওনা পরিশোধ — ${g.name}`, amount: String(amount) });
      const list = pbList.map((en) => {
        const part = parts.find((p) => p.id === en.id);
        return part ? { ...en, paid: (en.paid || 0) + part.amt } : en;
      });
      const pays = [...pbPays, { id, key: g.key, name: g.name, date: f.date || todayInputValue(), amount, note: (f.note || "").trim(), expId, parts }];
      await kset(PAYABLES_KEY, JSON.stringify(list));
      await kset(PAYABLEPAY_KEY, JSON.stringify(pays));
      setPbList(list);
      setPbPays(pays);
      setPbPay(null);
      showToast(`✓ ${g.name} কে ৳${toBn(fmt(amount))} দেওয়া হয়েছে${expId ? " — খরচে ওঠানো হয়েছে" : ""}`);
    } catch (e) {
      window.alert("সেভ হয়নি — নেট দেখে আবার চেষ্টা করুন।");
    } finally {
      settlingRef.current = false;
      setSettlingBusy(false);
    }
  };
  const deletePayablePay = async (p) => {
    if (!window.confirm(`${p.name} কে ৳${fmt(p.amount)} দেওয়ার এই এন্ট্রি মুছবেন? খরচের সারিটাও মুছবে আর পাওনা আবার বাকি হবে।`)) return;
    try {
      const dt = parseYmd(p.date);
      if (dt && p.expId) await removeDayExpense(dt.yy, dt.mm, dt.dd, p.expId);
      const list = pbList.map((en) => {
        const part = (p.parts || []).find((x) => x.id === en.id);
        return part ? { ...en, paid: Math.max(0, (en.paid || 0) - part.amt) } : en;
      });
      const pays = pbPays.filter((x) => x.id !== p.id);
      await kset(PAYABLES_KEY, JSON.stringify(list));
      await kset(PAYABLEPAY_KEY, JSON.stringify(pays));
      setPbList(list);
      setPbPays(pays);
    } catch (e) {
      window.alert("মোছা যায়নি — আবার চেষ্টা করুন।");
    }
  };

  const handleAddManualDue = async () => {
    const name = newDue.name.trim();
    const usedLines = (newDue.lines || []).filter(memoItemUsed);
    const amount = usedLines.length ? usedLines.reduce((sum, it) => sum + (grossTotal(it) || 0), 0) : num(newDue.amount);
    if (!name || isNaN(amount) || amount <= 0) {
      window.alert("নাম আর বাকির টাকা (বা পণ্যের দাম) দিন।");
      return;
    }
    if (addingDueRef.current) return;
    addingDueRef.current = true;
    const [yy, mm, dd] = (newDue.date || todayInputValue()).split("-").map(Number);
    setAddingDue(true);
    try {
      const list = await loadManualDues();
      list.push({
        id: emptyRowId(),
        y: yy,
        m: mm,
        d: dd,
        name,
        amount,
        ...((newDue.phone || "").trim() ? { phone: newDue.phone.trim() } : {}),
        ...(usedLines.length ? { lines: usedLines.map((it) => ({ name: it.name, height: it.height, weight: it.weight, qty: it.qty, price: it.price })), total: amount } : {}),
      });
      const ok = await saveManualDues(list);
      if (!ok) window.alert("সার্ভারে সেভ হয়নি, তবে বাকি ফোনে জমা আছে — নেট এলে স্বয়ংক্রিয়ভাবে পাঠানো হবে। হারাবে না।");
      setNewDue({ name: "", amount: "", date: "", phone: "", lines: [] });
      setShowDueAdd(false);
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
        const prev = customersReg.find((c) => custKey(c.name) === custKey(val)) || memos.find((x) => custKey(x.customer) === custKey(val));
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
    openPrintHtml(monthReportHtml(y, m, entries));
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
    setSaleSheetOpen(true);
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
        customer: row.customer ?? "",
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
      const noCust = meaningfulSaleDrafts.filter((r) => num(r.due) > 0 && !(r.customer || "").trim());
      if (
        noCust.length &&
        !window.confirm(
          `${toBn(noCust.length)} টা বিক্রিতে বাকি আছে কিন্তু ক্রেতার নাম দেওয়া হয়নি।\nবাকির লিস্টে বিক্রির নামে (${noCust[0].name || "নামহীন"}) উঠবে।\n\nতবুও সেভ করবেন?`
        )
      )
        return;

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

  // চলতি মাসের সংক্ষিপ্ত হিসাব (হোম পেজে)
  useEffect(() => {
    if (view !== "years") return;
    let cancelled = false;
    const now = new Date();
    const ty = now.getFullYear();
    const tm = now.getMonth() + 1;
    if (!YEARS.includes(ty)) {
      setTodaySummary(null);
      return;
    }
    setTodayLoading(true);
    (async () => {
      let sum = null;
      try {
        sum = await computeMonthSummary(ty, tm);
      } catch (e) {
        sum = null;
      }
      if (!cancelled) {
        setTodaySummary(sum);
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
    if (view !== "ledger" && view !== "customers" && view !== "dues") return;
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

  // কাস্টমার রেজিস্ট্রি + মেমো (নামের তালিকা) লোড
  useEffect(() => {
    if (!unlocked) return;
    (async () => {
      setCustomersReg(await loadCustomerReg());
      refreshMemos();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  // হোমে: শেষ হিসাব কবে ওঠানো হয়েছে
  useEffect(() => {
    if (view !== "years") return;
    let cancelled = false;
    (async () => {
      let found = null;
      for (const yy of [_NOW_YEAR, _NOW_YEAR - 1]) {
        const st = await loadYearStats(yy);
        const keys = Object.keys(st)
          .filter((k) => (st[k].income || 0) > 0 || (st[k].expense || 0) > 0)
          .map((k) => {
            const [mm, dd] = k.split("-").map(Number);
            return { y: yy, m: mm, d: dd };
          })
          .sort((a, b) => b.m - a.m || b.d - a.d);
        if (keys.length) {
          found = keys[0];
          break;
        }
      }
      if (!cancelled) setLastEntry(found);
    })();
    return () => {
      cancelled = true;
    };
  }, [view]);

  // ডেটা সুরক্ষা: দৈনিক স্ন্যাপশট, কনফ্লিক্ট বার্তা, পেন্ডিং ফ্লাশ, বন্ধ করার আগে সতর্কতা
  useEffect(() => {
    if (!unlocked) return;
    const t = setTimeout(async () => {
      const r = await runAutoProtection();
      if (r && r.status === "created") showToast("🛡 আজকের নিরাপত্তা-কপি নেওয়া হয়েছে");
      const dr = await ensureDriveBackup();
      if (dr && dr.status === "uploaded") showToast("☁ আজকের ব্যাকআপ Google Drive-এ গেছে");
    }, 30000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);
  useEffect(() => {
    if (!unlocked) return;
    processRecalc();
    const onConflict = () => {
      showToast("⚠ অন্য ডিভাইসের পরিবর্তনের সাথে মিলিয়ে নেওয়া হয়েছে — কিছু হারায়নি (ডেটা সুরক্ষা পেজে দেখুন)");
      setTimeout(processRecalc, 800);
    };
    window.addEventListener("rk-conflict", onConflict);
    return () => window.removeEventListener("rk-conflict", onConflict);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);
  useEffect(() => {
    const warn = (e) => {
      if (pendingCount() > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    const t = setInterval(async () => {
      if (pendingCount() > 0 && navigator.onLine !== false) {
        const n = await flushPendingWrites();
        if (n > 0) showToast(`✅ ${toBn(n)} টা পেন্ডিং সেভ সার্ভারে পাঠানো হয়েছে।`);
      }
    }, 25000);
    return () => {
      window.removeEventListener("beforeunload", warn);
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (view === "staff") loadStaffAll(staffYM.y);
    if (view === "payables") loadPayablesAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, staffYM.y]);
  useEffect(() => {
    if (view === "safety") {
      refreshSafety();
      loadDriveFiles();
      if (safetyJump) {
        setSafetyJump(false);
        setTimeout(() => restoreRef.current && restoreRef.current.scrollIntoView({ behavior: "smooth", block: "start" }), 500);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          className="rk-zoomable"
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
            maxWidth: "calc(92vw / var(--rk-z))",
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
              aria-label="বিক্রি ও খরচের ফর্ম খুলুন"
              className="rk-zoomable fixed flex items-center gap-2 active:opacity-80"
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
              <ShoppingBag size={20} /> বিক্রি / খরচ
              {(saleDrafts.filter(isMeaningfulItem).length + expenseDrafts.filter(isMeaningfulExpense).length) > 0 && (
                <span style={{ background: "var(--orange-bg)", color: "#FFFFFF", borderRadius: 999, minWidth: 22, height: 22, fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 6px" }}>
                  {toBn((saleDrafts.filter(isMeaningfulItem).length + expenseDrafts.filter(isMeaningfulExpense).length))}
                </span>
              )}
            </button>
          )}
          {saleSheetOpen && (
            <div
              className="fixed inset-0 flex items-end sm:items-center justify-center sm:p-4"
              style={{ zIndex: 70, background: "rgba(8,12,22,0.6)" }}
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setSaleSheetOpen(false);
              }}
            >
              <div
                ref={formRef}
                onKeyDown={handleFormEnter}
                className="rk-sheet-card w-full flex flex-col rounded-t-2xl sm:rounded-2xl"
                style={{ maxWidth: 1100, background: "var(--bg)", border: "2.5px solid var(--navy-line)", fontFamily: "'Noto Sans Bengali', sans-serif" }}
              >
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "var(--navy-fg)" }}>বিক্রি ও খরচ</div>
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
                <div className="overflow-y-auto pb-2">
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
                    <div className="px-3 lg:w-[68%]">
                      <p style={{ fontFamily: "'Noto Sans Bengali', sans-serif", fontSize: 16, color: "var(--navy-fg)", margin: "4px 0" }}>বিক্রি</p>
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)" }}>
                    <div className="overflow-x-auto">
                      <div
                        className="grid items-center"
                        style={{ gridTemplateColumns: "150px 48px 48px 56px 48px 56px 48px 48px 24px minmax(150px, 1fr)", background: "var(--orange-bg)", minWidth: 700 }}
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
                        <Th>ক্রেতা</Th>
                      </div>
                      {saleDrafts.map((row, idx) => (
                        <div
                          key={idx}
                          className="grid items-center"
                          style={{
                            gridTemplateColumns: "150px 48px 48px 56px 48px 56px 48px 48px 24px minmax(150px, 1fr)",
                            background: "var(--card)",
                            minWidth: 700,
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
                          {(() => {
                            const needCust = num(row.due) > 0 && !(row.customer || "").trim();
                            return (
                              <div className="px-1 min-w-0" style={{ boxShadow: needCust ? "inset 0 0 0 1.5px var(--red)" : "none", borderRadius: 8 }}>
                                <NameInput
                                  value={row.customer || ""}
                                  onValue={(v) => updateSaleDraft(idx, "customer", v)}
                                  names={allCustomerNames}
                                  customNames={[]}
                                  onAdd={async (nm) => {
                                    const n = await quickRegisterCustomer(nm);
                                    if (n) updateSaleDraft(idx, "customer", n);
                                  }}
                                  onRemove={() => {}}
                                  addLabel="+ নতুন কাস্টমার যোগ করুন"
                                  placeholder={needCust ? "ক্রেতা দিন (বাকি আছে)" : "ক্রেতার নাম"}
                                  inputClass="px-1.5 py-2"
                                  inputStyle={{ fontSize: 14, color: needCust ? "var(--red)" : "var(--ink)" }}
                                />
                              </div>
                            );
                          })()}
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
                  <div className="px-3 mt-3 lg:mt-0 lg:w-[32%]">
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
                </div>
                <div className="px-3 py-3 flex gap-2" style={{ borderTop: "1px solid var(--line)" }}>
                  <button
                    onClick={() => {
                      resetDraft(draftYear, draftMonth);
                      setSaleSheetOpen(false);
                    }}
                    className="px-4 py-2.5 rounded-xl active:opacity-70"
                    style={{ border: "1px solid var(--navy-line)", color: "var(--navy-fg)", fontSize: 13.5, fontWeight: 600 }}
                  >
                    বাতিল
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
        {[...new Set([...customersReg.map((c) => c.name), ...memos.map((x) => x.customer)])].map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <datalist id="due-name-options">
        {[...new Set([...customersReg.map((c) => c.name), ...allDues.map((x) => x.name)])].map((n) => (
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
            const sale = s ? s.sale : 0;
            const paid = s ? s.paid : 0;
            const expense = s ? s.expense : 0;
            const dueToday = s ? s.due : 0;
            const profit = sale - expense;
            const monthName = MONTH_NAMES[new Date().getMonth()];
            const money = (n) => `${n < 0 ? "−" : ""}৳ ${toBn(fmt(Math.abs(n)))}`;
            const val = (n) => (!s ? "—" : todayLoading ? "…" : money(n));
            const card = { background: "var(--card)", borderRadius: 22 };
            const stats = [
              { label: "মাসের মোট জমা", value: paid, color: "var(--green)", icon: <Wallet size={22} strokeWidth={1.8} /> },
              { label: "মাসের মোট খরচ", value: expense, color: "var(--orange)", icon: <Receipt size={22} strokeWidth={1.8} /> },
              { label: "মাসের বাকি টাকা", value: dueToday, color: "var(--red)", icon: <Clock size={22} strokeWidth={1.8} /> },
              { label: "মাসের আনুমানিক লাভ", value: profit, color: "var(--blue)", icon: <BarChart3 size={22} strokeWidth={1.8} /> },
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
                        { label: "রিসাইকেল বিন (মোছা ফেরত)", icon: <RotateCcw size={17} />, onClick: () => setView("trash") },
                        { label: "ডেটা সুরক্ষা ও ব্যাকআপ", icon: <Shield size={17} />, onClick: () => setView("safety") },
                        { label: "হিসাব মিলিয়ে নিন (অবশিষ্ট ঠিক করুন)", icon: <BarChart3 size={17} />, onClick: fixBalances },
                        { label: "দোকানের তথ্য ও লোগো", icon: <Settings size={17} />, onClick: () => setView("settings") },
                        { label: "স্টাফ হাজিরা ও বেতন", icon: <UserCheck size={17} />, onClick: () => setView("staff") },
                        { label: "আমি কাকে কত দেব (পাওনাদার)", icon: <Wallet size={17} />, onClick: () => setView("payables") },
                      ]}
                    />
                  </div>
                </div>

                {/* চলতি মাসের মোট বিক্রি */}
                <button onClick={goToday} className="w-full text-left px-4 py-3.5 mb-3 active:opacity-90" style={card}>
                  <div style={{ color: GRAY, fontSize: 16 }}>{monthName} মাসের মোট বিক্রি</div>
                  <div style={{ color: NAVY, fontSize: 32, fontWeight: 700, lineHeight: 1.2, marginTop: 4 }}>{val(sale)}</div>
                  <div className="flex items-center gap-1.5 mt-2" style={{ color: "var(--green2)", fontSize: 14 }}>
                    <TrendingUp size={16} strokeWidth={2} /> পুরো মাসের বিক্রির সারাংশ
                  </div>
                </button>

                {/* মাসের ৪টা কার্ড (মোবাইলে ২×২, পিসিতে এক সারিতে) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-3">
                  {stats.map((st) => (
                    <div key={st.label} className="px-3.5 py-3" style={{ ...card, color: st.color }}>
                      {st.icon}
                      <div style={{ color: GRAY, fontSize: 14.5, marginTop: 4 }}>{st.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, lineHeight: 1.2 }}>{val(st.value)}</div>
                    </div>
                  ))}
                </div>

                {/* বছর বেছে নিন — ২টা ঘর: চলতি বছর | পরের বছরগুলো */}
                <div className="px-5 py-4 mb-3" style={card}>
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

                {/* স্টাফ হাজিরা ও বেতন */}
                <button onClick={() => setView("staff")} className="w-full flex items-center justify-between px-5 py-3 mb-3 active:opacity-90" style={card}>
                  <div className="flex items-center gap-3 text-left">
                    <UserCheck size={24} color="var(--navy-fg)" strokeWidth={1.8} />
                    <div>
                      <div style={{ color: NAVY, fontSize: 15, fontWeight: 700 }}>স্টাফ হাজিরা ও বেতন</div>
                      <div style={{ color: GRAY, fontSize: 12.5, marginTop: 2 }}>হাজিরা, অ্যাডভান্স ও বেতন — বেতন দিলে খরচে নিজে ওঠে</div>
                    </div>
                  </div>
                  <div style={{ color: GRAY, fontSize: 20 }}>›</div>
                </button>

                {/* ডেটা সুরক্ষা অবস্থা */}
                {(() => {
                  const dayDiff = (ds) => (ds ? Math.floor((Date.now() - new Date(ds + "T00:00:00").getTime()) / 86400000) : null);
                  const driveOn = !!driveCfg;
                  const drDays = dayDiff(lastDriveBackup());
                  const bad = pending > 0;
                  const warn = !bad && driveOn && (drDays === null || drDays >= 2);
                  const msg = bad
                    ? `⏳ ${toBn(pending)} টা সেভ সার্ভারে যাওয়া বাকি`
                    : driveOn
                    ? drDays === null
                      ? "⚠ Drive-এ এখনও ব্যাকআপ যায়নি"
                      : drDays >= 2
                      ? `⚠ Drive-এ শেষ ব্যাকআপ ${toBn(drDays)} দিন আগের`
                      : "✓ সুরক্ষিত — নিজে নিজে ব্যাকআপ চলছে (Drive-এও যাচ্ছে)"
                    : "✓ নিজে নিজে ব্যাকআপ চলছে — Google অ্যাকাউন্ট যুক্ত করলে আরও নিরাপদ";
                  return (
                    <div className="mb-3 px-5 py-3" style={card}>
                      <button onClick={() => setView("safety")} className="w-full flex items-center justify-between text-left active:opacity-90">
                        <div>
                          <div style={{ color: NAVY, fontSize: 15, fontWeight: 700 }}>🛡 ডেটা সুরক্ষা</div>
                          <div style={{ color: bad ? "var(--red)" : warn ? "var(--amber-text)" : "var(--green)", fontSize: 12.5, marginTop: 2, fontWeight: 600 }}>{msg}</div>
                        </div>
                        <div style={{ color: GRAY, fontSize: 20 }}>›</div>
                      </button>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            setSafetyJump(true);
                            setView("safety");
                          }}
                          className="px-3 py-1.5 rounded-full active:opacity-70"
                          style={{ border: "1px solid var(--navy-line)", color: NAVY, fontSize: 12.5, fontWeight: 700 }}
                        >
                          ↩ ব্যাকআপ ফিরিয়ে আনুন
                        </button>
                        {!driveOn && (
                          <button
                            onClick={() => setView("safety")}
                            className="px-3 py-1.5 rounded-full active:opacity-70"
                            style={{ background: "var(--navy-bg)", color: "#FFFFFF", fontSize: 12.5, fontWeight: 700 }}
                          >
                            ☁ Google অ্যাকাউন্ট যুক্ত করুন
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* শেষ হিসাব ওঠানো */}
                <div className="px-5 py-3 mb-3 flex items-center justify-between" style={card}>
                  <div style={{ color: GRAY, fontSize: 14 }}>🗓 শেষ হিসাব ওঠানো</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: lastEntry ? lastUpdateColor(lastEntry.y * 10000 + lastEntry.m * 100 + lastEntry.d) : GRAY }}>
                    {lastEntry ? lastUpdateText(lastEntry.y * 10000 + lastEntry.m * 100 + lastEntry.d) : "—"}
                  </div>
                </div>
              </div>
            );
          })()}

        {/* ---------- DUES (কাস্টমার অনুযায়ী বাকির লিস্ট) ---------- */}
        {view === "dues" &&
          (() => {
            const NAVY = "var(--navy-fg)";
            const GRAY = "var(--gray)";
            const saleMap = new Map(ledgerData.filter((r) => r.type === "বিক্রি" && r.id).map((r) => [`${r.y}-${r.m}-${r.d}-${r.id}`, r]));
            const gm = new Map();
            allDues.forEach((e) => {
              const k = custKey(e.name);
              if (!k) return;
              if (!gm.has(k)) gm.set(k, { key: k, name: String(e.name).trim(), entries: [], total: 0 });
              const g = gm.get(k);
              g.entries.push(e);
              g.total += e.amount || 0;
            });
            const all = [...gm.values()].map((g) => {
              g.entries.sort((a, b) => a.y - b.y || a.m - b.m || a.d - b.d);
              const o = g.entries[0];
              g.days = daysSince(o.y, o.m, o.d);
              const rg = customersReg.find((c) => custKey(c.name) === g.key);
              if (rg) g.name = rg.name;
              g.phone = phoneOf(g.name, g.entries.find((e) => e.phone));
              return g;
            });
            const old7 = all.filter((g) => g.days >= 7);
            const old15 = all.filter((g) => g.days >= 15);
            const sumOf = (arr) => arr.reduce((s, g) => s + g.total, 0);
            const shown = all
              .filter((g) => (dueFilter === "old15" ? g.days >= 15 : dueFilter === "old7" ? g.days >= 7 : true))
              .sort((a, b) => b.total - a.total);
            const chip = (id, label) => (
              <button
                key={id}
                onClick={() => setDueFilter(id)}
                className="px-3 py-1.5 rounded-full active:opacity-70"
                style={{ fontSize: 12, fontWeight: 600, border: "1px solid var(--navy-line)", background: dueFilter === id ? "var(--navy-bg)" : "var(--card)", color: dueFilter === id ? "#FFFFFF" : "var(--navy-fg)" }}
              >
                {label}
              </button>
            );
            const entryLabel = (e) => {
              if (e.manual && e.memoId) {
                const mm = memos.find((x) => x.id === e.memoId);
                return mm ? `মেমো নং ${toBn(mm.no)}` : "মেমো";
              }
              return e.manual ? "সরাসরি বাকি" : "বিক্রি";
            };
            const entryDetail = (e) => {
              if (e.manual && e.lines && e.lines.length) return e.lines.map(lineText);
              if (e.manual && e.memoId) {
                const mm = memos.find((x) => x.id === e.memoId);
                return mm ? mm.items.filter(memoItemUsed).map(lineText) : [];
              }
              if (!e.manual) {
                const r = saleMap.get(`${e.y}-${e.m}-${e.d}-${e.id}`);
                return r && r.detail ? [r.detail] : e.item ? [e.item] : [];
              }
              return [];
            };
            const inp = { fontSize: 13.5, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)" };
            const lines = newDue.lines || [];
            const usedLines = lines.filter(memoItemUsed);
            const linesTotal = usedLines.reduce((s, it) => s + (grossTotal(it) || 0), 0);
            return (
              <>
                <HeaderBar title="বাকির লিস্ট" onBack={() => setView("years")} editMode={editMode} onToggleMode={toggleEditMode} />
                <div className="px-3 pt-4 pb-24">
                  {editMode && (
                    <div className="mb-4">
                      {!showDueAdd ? (
                        <button onClick={() => setShowDueAdd(true)} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl active:opacity-80" style={{ background: "var(--navy-bg)", color: "var(--on-navy)", fontSize: 14, fontWeight: 700 }}>
                          <Plus size={16} /> বাকি যোগ করুন (পণ্যের বিস্তারিতসহ)
                        </button>
                      ) : (
                        <div className="rounded-xl px-3 py-3" style={{ border: "2px solid var(--navy-line)", background: "var(--card)" }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 8 }}>নতুন বাকি যোগ করুন</div>
                          <input value={newDue.name} onChange={(ev) => setNewDue((p) => ({ ...p, name: ev.target.value, phone: p.phone || phoneOf(ev.target.value) }))} list="due-name-options" placeholder="কাস্টমারের নাম *" className="w-full px-3 py-2 rounded-xl outline-none mb-2" style={inp} />
                          <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
                            <input value={newDue.phone || ""} onChange={(ev) => setNewDue((p) => ({ ...p, phone: ev.target.value }))} inputMode="tel" placeholder="ফোন (ঐচ্ছিক)" className="px-3 py-2 rounded-xl outline-none" style={inp} />
                            <input type="date" value={newDue.date || todayInputValue()} onChange={(ev) => setNewDue((p) => ({ ...p, date: ev.target.value }))} className="px-2 py-2 rounded-xl outline-none" style={inp} />
                          </div>
                          <div style={{ fontSize: 12.5, color: GRAY, margin: "4px 0" }}>কী কী পণ্য নিয়েছে (বিক্রির ফর্মের মতো):</div>
                          <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--line)" }}>
                            <div style={{ minWidth: 500 }}>
                              <div className="grid items-center" style={{ gridTemplateColumns: "1fr 46px 46px 52px 54px 64px 24px", background: "var(--orange-bg)" }}>
                                <Th>নাম / জিনিস</Th>
                                <Th right>হাইট</Th>
                                <Th right>ওয়েট</Th>
                                <Th right>পরিমান</Th>
                                <Th right>দাম</Th>
                                <Th right>মোট</Th>
                                <Th />
                              </div>
                              {lines.map((ln, i) => (
                                <div key={i} className="grid items-center" style={{ gridTemplateColumns: "1fr 46px 46px 52px 54px 64px 24px", borderTop: "1px solid var(--line2)" }}>
                                  <input value={ln.name} onChange={(ev) => updateDueLine(i, "name", ev.target.value)} placeholder="যেমন: ব্যানার" className="min-w-0 px-2 py-2 bg-transparent outline-none" style={{ fontSize: 13.5, color: "var(--ink)" }} />
                                  {["height", "weight", "qty", "price"].map((f) => (
                                    <input key={f} value={ln[f]} onChange={(ev) => updateDueLine(i, f, ev.target.value)} inputMode="decimal" className="min-w-0 w-full px-0.5 py-2 bg-transparent outline-none text-right" style={{ fontSize: 13.5, color: "var(--ink)" }} />
                                  ))}
                                  <div className="px-1 text-right" style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{memoItemUsed(ln) ? fmt(grossTotal(ln) || 0) : ""}</div>
                                  <button onClick={() => removeDueLine(i)} style={{ color: "var(--red)" }} aria-label="সারি মুছুন">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                          <button onClick={addDueLine} className="w-full flex items-center justify-center gap-1 py-2 mt-1.5 rounded-xl active:opacity-70" style={{ background: "var(--bg)", color: NAVY, fontSize: 13.5, border: "1px dashed var(--line)" }}>
                            <Plus size={14} /> পণ্য যোগ করুন
                          </button>
                          <div className="flex items-center justify-between gap-2 mt-3">
                            {usedLines.length > 0 ? (
                              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--red)" }}>মোট বাকি ৳{toBn(fmt(linesTotal))}</div>
                            ) : (
                              <input value={newDue.amount} onChange={(ev) => setNewDue((p) => ({ ...p, amount: ev.target.value }))} inputMode="decimal" placeholder="পণ্য না লিখলে শুধু বাকির টাকা" className="flex-1 px-3 py-2 rounded-xl outline-none text-right" style={{ ...inp, color: "var(--red)", fontWeight: 600 }} />
                            )}
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => { setShowDueAdd(false); setNewDue({ name: "", amount: "", date: "", phone: "", lines: [] }); }} className="px-4 py-2.5 rounded-xl active:opacity-70" style={{ border: "1px solid var(--navy-line)", color: NAVY, fontSize: 13.5, fontWeight: 600 }}>
                              বাতিল
                            </button>
                            <button onClick={handleAddManualDue} disabled={addingDue} className="flex-1 py-2.5 rounded-xl active:opacity-80" style={{ background: "var(--navy-bg)", color: "var(--on-navy)", fontSize: 14, fontWeight: 700 }}>
                              {addingDue ? "…" : "বাকি যোগ করুন"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {allDuesLoading ? (
                    <p style={{ fontSize: 12, color: GRAY }}>লোড হচ্ছে…</p>
                  ) : all.length === 0 ? (
                    <p style={{ fontSize: 12, color: GRAY }}>এখনও কোনো বাকি নেই।</p>
                  ) : (
                    <>
                      <div className="rounded-xl px-4 py-3 mb-3 flex items-center justify-between" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
                        <div style={{ fontSize: 13, color: GRAY }}>{toBn(all.length)} জন কাস্টমারের মোট বাকি</div>
                        <div style={{ fontSize: 19, fontWeight: 800, color: "var(--red)" }}>৳{toBn(fmt(sumOf(all)))}</div>
                      </div>
                      {old15.length > 0 && (
                        <div className="rounded-xl mb-3 px-3 py-2.5" style={{ background: "var(--red-tint)", border: "1px solid var(--red)", color: "var(--red-dark)", fontSize: 13, fontWeight: 700 }}>
                          ⚠ ১৫ দিনের বেশি পুরনো বাকি: {toBn(old15.length)} জন · ৳{toBn(fmt(sumOf(old15)))}
                        </div>
                      )}
                      <div className="flex gap-2 mb-3 flex-wrap">
                        {chip("all", `সব (${toBn(all.length)})`)}
                        {chip("old7", `৭+ দিন (${toBn(old7.length)})`)}
                        {chip("old15", `১৫+ দিন (${toBn(old15.length)})`)}
                      </div>
                      {shown.map((g) => {
                        const stage = g.days >= 30 ? 3 : g.days >= 15 ? 2 : g.days >= 7 ? 1 : 0;
                        const stBg = ["var(--card)", "var(--amber-tint)", "var(--red-tint)", "var(--red-tint2)"][stage];
                        const stBorder = ["var(--navy-line)", "var(--orange)", "var(--red)", "var(--red-dark)"][stage];
                        const open = dueOpen === g.key;
                        const f = settleForm && settleForm.key === g.key ? settleForm : { key: g.key, paid: "", waive: "", date: todayInputValue() };
                        const setF = (patch) => setSettleForm({ ...f, ...patch });
                        const paidN = num(f.paid) || 0;
                        const waiveN = num(f.waive) || 0;
                        const left = g.total - paidN - waiveN;
                        const msg = dueMessageTotal(g.name, g.total);
                        const cust = customersReg.find((c) => custKey(c.name) === g.key) || memos.find((x) => custKey(x.customer) === g.key);
                        return (
                          <div key={g.key} className="rounded-xl mb-2.5 overflow-hidden" style={{ border: "1px solid var(--line)", borderLeft: `5px solid ${stBorder}`, background: "var(--card)" }}>
                            <button onClick={() => setDueOpen(open ? null : g.key)} className="w-full flex items-center justify-between gap-3 px-3 py-3 text-left active:opacity-90" style={{ background: stBg }}>
                              <div className="min-w-0">
                                <div className="truncate" style={{ fontSize: 17, fontWeight: 800, color: "var(--blue)" }}>{g.name}</div>
                                <div style={{ fontSize: 11.5, color: GRAY, marginTop: 1 }}>
                                  {toBn(g.entries.length)} টা এন্ট্রি · সবচেয়ে পুরনো {g.days <= 0 ? "আজকের" : `${toBn(g.days)} দিন আগের`}
                                  {stage >= 1 ? (stage === 1 ? " ⏰" : " ⚠") : ""}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--red)" }}>৳{toBn(fmt(g.total))}</div>
                                <span style={{ color: GRAY, fontSize: 14 }}>{open ? "▲" : "▼"}</span>
                              </div>
                            </button>
                            {open && (
                              <div className="px-3 pb-3 pt-1" style={{ borderTop: "1px solid var(--line2)" }}>
                                <div className="flex items-center gap-1.5 flex-wrap py-2">
                                  <button onClick={() => openWhatsApp(g.phone, msg)} className="flex items-center gap-1 px-2.5 py-1 rounded-full active:opacity-70" style={{ background: "var(--green-tint)", color: "var(--green-dark)", fontSize: 11.5, fontWeight: 700 }}>
                                    <MessageCircle size={12} /> WhatsApp
                                  </button>
                                  <button onClick={() => openSms(g.phone, msg)} className="flex items-center gap-1 px-2.5 py-1 rounded-full active:opacity-70" style={{ background: "var(--tint)", color: NAVY, fontSize: 11.5, fontWeight: 700 }}>
                                    <MessageSquare size={12} /> SMS
                                  </button>
                                  {g.phone && (
                                    <button onClick={() => openCall(g.phone)} className="flex items-center gap-1 px-2.5 py-1 rounded-full active:opacity-70" style={{ background: "var(--tint)", color: NAVY, fontSize: 11.5, fontWeight: 700 }}>
                                      <Phone size={12} /> কল
                                    </button>
                                  )}
                                  {cust && (
                                    <button onClick={() => { setCustSel(g.key); setView("customers"); }} className="px-2.5 py-1 rounded-full active:opacity-70" style={{ border: "1px solid var(--navy-line)", color: NAVY, fontSize: 11.5, fontWeight: 700 }}>
                                      পুরো হিসাব ›
                                    </button>
                                  )}
                                  <span style={{ fontSize: 10.5, color: GRAY }}>{g.phone || "ফোন নম্বর নেই"}</span>
                                </div>
                                {g.entries.map((e) => {
                                  const det = entryDetail(e);
                                  return (
                                    <div key={`${e.y}-${e.m}-${e.d}-${e.id}`} className="py-2" style={{ borderTop: "1px solid var(--line2)" }}>
                                      <div className="flex items-center justify-between gap-2">
                                        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>
                                          {toBn(e.d)} {MONTH_NAMES[e.m - 1]} {toBn(e.y)} · {entryLabel(e)}
                                        </span>
                                        <span className="flex items-center gap-2">
                                          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--red)" }}>৳{toBn(fmt(e.amount))}</span>
                                          {editMode && e.manual && (
                                            <button onClick={() => handleDeleteManualDue(e)} style={{ color: "var(--red)" }} aria-label="এই বাকি মুছুন">
                                              <Trash2 size={13} />
                                            </button>
                                          )}
                                        </span>
                                      </div>
                                      {det.map((t, i) => (
                                        <div key={i} style={{ fontSize: 11.5, color: GRAY, marginTop: 2 }}>• {t}</div>
                                      ))}
                                    </div>
                                  );
                                })}

                                {editMode ? (
                                  <div className="mt-3 rounded-xl px-3 py-3" style={{ background: "var(--tint)" }}>
                                    <div style={{ fontSize: 13.5, fontWeight: 700, color: NAVY, marginBottom: 6 }}>জমা / ছাড় নিন</div>
                                    <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
                                      <input value={f.paid} onChange={(ev) => setF({ paid: ev.target.value })} inputMode="decimal" placeholder="টাকা পেলাম" className="px-3 py-2 rounded-xl outline-none text-right" style={{ ...inp, color: "var(--green)", fontWeight: 600 }} />
                                      <input value={f.waive} onChange={(ev) => setF({ waive: ev.target.value })} inputMode="decimal" placeholder="ছাড় (মাফ)" className="px-3 py-2 rounded-xl outline-none text-right" style={{ ...inp, color: "var(--orange)", fontWeight: 600 }} />
                                    </div>
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                      <input type="date" value={f.date} onChange={(ev) => setF({ date: ev.target.value })} className="px-2 py-1.5 rounded-xl outline-none" style={{ ...inp, fontSize: 12.5 }} />
                                      <button onClick={() => setF({ paid: String(g.total), waive: "" })} className="px-2.5 py-1 rounded-full active:opacity-70" style={{ border: "1px solid var(--navy-line)", color: NAVY, fontSize: 11.5, fontWeight: 700 }}>
                                        পুরোটা জমা
                                      </button>
                                      <button onClick={() => setF({ waive: String(Math.max(0, g.total - paidN)) })} className="px-2.5 py-1 rounded-full active:opacity-70" style={{ border: "1px solid var(--orange)", color: "var(--orange)", fontSize: 11.5, fontWeight: 700 }}>
                                        বাকিটুকু ছাড়
                                      </button>
                                    </div>
                                    <div style={{ fontSize: 12.5, color: left < 0 ? "var(--red)" : "var(--ink)", marginBottom: 8, lineHeight: 1.6 }}>
                                      বাকি ৳{toBn(fmt(g.total))} − জমা ৳{toBn(fmt(paidN))} − ছাড় ৳{toBn(fmt(waiveN))} = <b>৳{toBn(fmt(left))}</b>
                                      {left < 0 ? " (বাকির চেয়ে বেশি!)" : left === 0 && (paidN > 0 || waiveN > 0) ? " ✓ পুরো শোধ" : ""}
                                    </div>
                                    <button onClick={() => settleCustomerDues(g)} disabled={settlingBusy || left < 0 || (paidN <= 0 && waiveN <= 0)} className="w-full py-2.5 rounded-xl active:opacity-80" style={{ background: "var(--navy-bg)", color: "#FFFFFF", fontSize: 14, fontWeight: 700, opacity: settlingBusy || left < 0 || (paidN <= 0 && waiveN <= 0) ? 0.6 : 1 }}>
                                      {settlingBusy ? "…" : "জমা নিন"}
                                    </button>
                                    <p style={{ fontSize: 11, color: GRAY, marginTop: 6, lineHeight: 1.6 }}>
                                      পুরনো বাকি আগে শোধ হয়। পাওয়া টাকাটা এই তারিখের আয়ে "{g.name} (পরিশোধ)" নামে ওঠে। ছাড়ের টাকা আয়ে ওঠে না, শুধু বাকি থেকে বাদ যায়।
                                    </p>
                                  </div>
                                ) : (
                                  <p style={{ fontSize: 11.5, color: GRAY, marginTop: 8 }}>জমা বা ছাড় নিতে এডিট মোড চালু করুন।</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {shown.length === 0 && <p style={{ fontSize: 12, color: GRAY }}>এই ভাগে কোনো বাকি নেই।</p>}
                    </>
                  )}
                </div>
              </>
            );
          })()}

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
                                  নং {toBn(mm.no)} · {toBn(mm.d)} {MONTH_SHORT[mm.m - 1]} {toBn(mm.y)}
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
                            {toBn(r.d)} {MONTH_SHORT[r.m - 1]} {toBn(r.y)}
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
                              {toBn(g.count)} টা এন্ট্রি · সর্বশেষ {toBn(g.last.d)} {MONTH_SHORT[g.last.m - 1]} {toBn(g.last.y)}
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

        {/* ---------- PAYABLES (আমি কাকে কত দেব) ---------- */}
        {view === "payables" &&
          (() => {
            const NAVY = "var(--navy-fg)";
            const GRAY = "var(--gray)";
            const box = { background: "var(--card)", border: "1px solid var(--line)" };
            const inp = { fontSize: 13.5, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)" };
            const gm = new Map();
            pbList.forEach((en) => {
              const k = custKey(en.name);
              if (!k) return;
              if (!gm.has(k)) gm.set(k, { key: k, name: String(en.name).trim(), entries: [], total: 0 });
              const g = gm.get(k);
              g.entries.push(en);
              g.total += Math.max(0, (en.amount || 0) - (en.paid || 0));
            });
            const all = [...gm.values()].map((g) => {
              g.entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
              return g;
            });
            const open = all.filter((g) => g.total > 0).sort((a, b) => b.total - a.total);
            const done = all.filter((g) => g.total <= 0);
            const list = pbShowPaid ? [...open, ...done] : open;
            const fmtD = (ds) => {
              const d = parseYmd(ds);
              return d ? `${toBn(d.dd)} ${MONTH_NAMES[d.mm - 1]} ${toBn(d.yy)}` : ds;
            };
            return (
              <>
                <HeaderBar title="আমি কাকে কত দেব" onBack={() => setView("years")} editMode={editMode} onToggleMode={toggleEditMode} />
                <div className="px-3 pt-4 pb-24">
                  {editMode &&
                    (!pbShowAdd ? (
                      <button onClick={() => setPbShowAdd(true)} className="w-full flex items-center justify-center gap-1.5 py-2.5 mb-3 rounded-xl active:opacity-80" style={{ background: "var(--navy-bg)", color: "var(--on-navy)", fontSize: 14, fontWeight: 700 }}>
                        <Plus size={16} /> নতুন পাওনা যোগ করুন
                      </button>
                    ) : (
                      <div className="rounded-xl mb-3 px-3 py-3" style={{ border: "2px solid var(--navy-line)", background: "var(--card)" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 8 }}>কাকে কত দিতে হবে</div>
                        <input value={pbAdd.name} onChange={(e) => setPbAdd((p) => ({ ...p, name: e.target.value }))} list="pb-name-options" placeholder="কার পাওনা (নাম) *" className="w-full px-3 py-2 rounded-xl outline-none mb-2" style={inp} />
                        <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
                          <input value={pbAdd.amount} onChange={(e) => setPbAdd((p) => ({ ...p, amount: e.target.value }))} inputMode="decimal" placeholder="টাকা *" className="px-3 py-2 rounded-xl outline-none text-right" style={inp} />
                          <input type="date" value={pbAdd.date || todayInputValue()} onChange={(e) => setPbAdd((p) => ({ ...p, date: e.target.value }))} className="px-2 py-2 rounded-xl outline-none" style={inp} />
                        </div>
                        <input value={pbAdd.note} onChange={(e) => setPbAdd((p) => ({ ...p, note: e.target.value }))} placeholder="কিসের জন্য (যেমন: কালি, কাগজ)" className="w-full px-3 py-2 rounded-xl outline-none mb-2" style={inp} />
                        <div className="flex gap-2">
                          <button onClick={() => setPbShowAdd(false)} className="px-4 py-2.5 rounded-xl" style={{ border: "1px solid var(--navy-line)", color: NAVY, fontSize: 13.5 }}>বাতিল</button>
                          <button onClick={addPayable} className="flex-1 py-2.5 rounded-xl active:opacity-80" style={{ background: "var(--navy-bg)", color: "var(--on-navy)", fontSize: 14, fontWeight: 700 }}>পাওনা যোগ করুন</button>
                        </div>
                      </div>
                    ))}
                  <datalist id="pb-name-options">
                    {all.map((g) => (
                      <option key={g.key} value={g.name} />
                    ))}
                  </datalist>
                  <div className="rounded-xl px-4 py-3 mb-3 flex items-center justify-between" style={box}>
                    <div style={{ fontSize: 13, color: GRAY }}>{toBn(open.length)} জনকে মোট দিতে হবে</div>
                    <div style={{ fontSize: 19, fontWeight: 800, color: "var(--orange)" }}>৳{toBn(fmt(open.reduce((s, g) => s + g.total, 0)))}</div>
                  </div>
                  {list.length === 0 ? (
                    <p style={{ fontSize: 12, color: GRAY }}>কাউকে কিছু দিতে হবে না। {editMode ? "" : "(যোগ করতে এডিট মোড চালু করুন)"}</p>
                  ) : (
                    list.map((g) => {
                      const isOpen = pbOpen === g.key;
                      const f = pbPay && pbPay.key === g.key ? pbPay : { key: g.key, amount: "", date: todayInputValue(), note: "", toExpense: true };
                      const setF = (patch) => setPbPay({ ...f, ...patch });
                      const myPays = pbPays.filter((p) => p.key === g.key).sort((a, b) => (a.date < b.date ? 1 : -1));
                      return (
                        <div key={g.key} className="rounded-xl mb-2.5 overflow-hidden" style={{ ...box, borderLeft: "5px solid var(--orange)", opacity: g.total <= 0 ? 0.7 : 1 }}>
                          <button onClick={() => setPbOpen(isOpen ? null : g.key)} className="w-full flex items-center justify-between gap-3 px-3 py-3 text-left active:opacity-90">
                            <div className="min-w-0">
                              <div className="truncate" style={{ fontSize: 17, fontWeight: 800, color: "var(--blue)" }}>{g.name}</div>
                              <div style={{ fontSize: 11.5, color: GRAY }}>{toBn(g.entries.length)} টা পাওনা{g.total <= 0 ? " · সব শোধ ✓" : ""}</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div style={{ fontSize: 18, fontWeight: 800, color: g.total > 0 ? "var(--orange)" : "var(--green)" }}>৳{toBn(fmt(g.total))}</div>
                              <span style={{ color: GRAY, fontSize: 14 }}>{isOpen ? "▲" : "▼"}</span>
                            </div>
                          </button>
                          {isOpen && (
                            <div className="px-3 pb-3" style={{ borderTop: "1px solid var(--line2)" }}>
                              {g.entries.map((en) => (
                                <div key={en.id} className="py-2" style={{ borderTop: "1px solid var(--line2)" }}>
                                  <div className="flex items-center justify-between gap-2">
                                    <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>{fmtD(en.date)}</span>
                                    <span className="flex items-center gap-2">
                                      <span style={{ fontSize: 13, fontWeight: 800, color: "var(--orange)" }}>৳{toBn(fmt(en.amount))}</span>
                                      {editMode && (en.paid || 0) === 0 && (
                                        <button onClick={() => deletePayable(en)} style={{ color: "var(--red)" }} aria-label="পাওনা মুছুন">
                                          <Trash2 size={13} />
                                        </button>
                                      )}
                                    </span>
                                  </div>
                                  {en.note && <div style={{ fontSize: 11.5, color: GRAY }}>• {en.note}</div>}
                                  {(en.paid || 0) > 0 && (
                                    <div style={{ fontSize: 11.5, color: "var(--green)" }}>
                                      দেওয়া হয়েছে ৳{toBn(fmt(en.paid))} · বাকি ৳{toBn(fmt(Math.max(0, en.amount - en.paid)))}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {myPays.length > 0 && (
                                <div className="mt-2">
                                  <div style={{ fontSize: 12, color: GRAY }}>যা যা দেওয়া হয়েছে</div>
                                  {myPays.map((p) => (
                                    <div key={p.id} className="flex items-center justify-between py-1" style={{ borderTop: "1px solid var(--line2)", fontSize: 12.5 }}>
                                      <span style={{ color: "var(--ink)" }}>
                                        {fmtD(p.date)} · ৳{toBn(fmt(p.amount))}
                                        {p.note ? ` · ${p.note}` : ""}
                                        {p.expId ? " (খরচে আছে)" : ""}
                                      </span>
                                      {editMode && (
                                        <button onClick={() => deletePayablePay(p)} style={{ color: "var(--red)" }} aria-label="এই পরিশোধ মুছুন">
                                          <Trash2 size={13} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {editMode && g.total > 0 && (
                                <div className="mt-3 rounded-xl px-3 py-3" style={{ background: "var(--tint)" }}>
                                  <div style={{ fontSize: 13.5, fontWeight: 700, color: NAVY, marginBottom: 6 }}>টাকা দিলাম</div>
                                  <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
                                    <input value={f.amount} onChange={(e) => setF({ amount: e.target.value })} inputMode="decimal" placeholder={`কত টাকা (বাকি ${toBn(fmt(g.total))})`} className="px-3 py-2 rounded-xl outline-none text-right" style={inp} />
                                    <input type="date" value={f.date} onChange={(e) => setF({ date: e.target.value })} className="px-2 py-2 rounded-xl outline-none" style={inp} />
                                  </div>
                                  <input value={f.note} onChange={(e) => setF({ note: e.target.value })} placeholder="নোট (ঐচ্ছিক)" className="w-full px-3 py-2 rounded-xl outline-none mb-2" style={inp} />
                                  <label className="flex items-center gap-2 mb-2" style={{ fontSize: 12.5, color: "var(--ink)" }}>
                                    <input type="checkbox" checked={f.toExpense !== false} onChange={(e) => setF({ toExpense: e.target.checked })} /> এই তারিখের খরচে লিখুন (ক্যাশ থেকে গেলে টিক রাখুন)
                                  </label>
                                  <div className="flex gap-2">
                                    <button onClick={() => setF({ amount: String(g.total) })} className="px-3 py-2 rounded-xl active:opacity-70" style={{ border: "1px solid var(--navy-line)", color: NAVY, fontSize: 12.5, fontWeight: 700 }}>
                                      পুরোটা
                                    </button>
                                    <button onClick={() => payPayable(g)} disabled={settlingBusy} className="flex-1 py-2 rounded-xl active:opacity-80" style={{ background: "var(--navy-bg)", color: "#FFFFFF", fontSize: 14, fontWeight: 700, opacity: settlingBusy ? 0.6 : 1 }}>
                                      {settlingBusy ? "…" : "দেওয়া হয়েছে — সেভ"}
                                    </button>
                                  </div>
                                  <p style={{ fontSize: 11, color: GRAY, marginTop: 6, lineHeight: 1.6 }}>পুরনো পাওনা আগে শোধ হয়। টিক রাখলে "পাওনা পরিশোধ — {g.name}" নামে ওই দিনের খরচে ওঠে।</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  {done.length > 0 && (
                    <button onClick={() => setPbShowPaid((v) => !v)} style={{ fontSize: 12, color: GRAY }}>
                      {pbShowPaid ? "শোধ হয়ে যাওয়াগুলো লুকান" : `শোধ হয়ে যাওয়া ${toBn(done.length)} জন দেখান`}
                    </button>
                  )}
                </div>
              </>
            );
          })()}

        {/* ---------- STAFF (স্টাফ হাজিরা ও বেতন) ---------- */}
        {view === "staff" &&
          (() => {
            const NAVY = "var(--navy-fg)";
            const GRAY = "var(--gray)";
            const { y, m } = staffYM;
            const n = daysInMonth(y, m);
            const isCurMonth = y === new Date().getFullYear() && m === new Date().getMonth() + 1;
            const today = new Date().getDate();
            const box = { background: "var(--card)", border: "1px solid var(--line)" };
            const visible = staffList.filter((s) => showInactive || s.active !== false);
            const rows = visible.map((st) => {
              const calc = staffMonthCalc(st, (attendY[m] || {})[st.id], y, m);
              const rec = (salaryY[m] || {})[st.id] || null;
              const plan = planPayment(calc.gross, staffAdv, st.id);
              return { st, calc, rec, plan, adv: advOutstanding(staffAdv, st.id) };
            });
            const totGross = rows.reduce((a, r) => a + r.calc.gross, 0);
            const totPaid = rows.reduce((a, r) => a + (r.rec ? r.rec.net : 0), 0);
            const totDue = rows.reduce((a, r) => a + (r.rec ? 0 : r.plan.net), 0);
            const shiftMonth = (delta) => {
              let ny = y;
              let nm = m + delta;
              if (nm < 1) {
                nm = 12;
                ny--;
              } else if (nm > 12) {
                nm = 1;
                ny++;
              }
              setStaffYM({ y: ny, m: nm });
              setStaffOpen(null);
              setPayForm(null);
              setAdvForm(null);
            };
            const stat = (label, value, color) => (
              <div className="rounded-xl px-2 py-2 text-center" style={box}>
                <div style={{ fontSize: 11, color: GRAY }}>{label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color }}>৳{toBn(fmt(value))}</div>
              </div>
            );
            const attStyle = (v) =>
              v === "P"
                ? { background: "var(--green)", color: "#FFFFFF", border: "1px solid var(--green)" }
                : v === "A"
                ? { background: "var(--red)", color: "#FFFFFF", border: "1px solid var(--red)" }
                : v === "H"
                ? { background: "var(--orange-bg)", color: "#FFFFFF", border: "1px solid var(--orange-bg)" }
                : { background: "var(--card)", color: GRAY, border: "1px solid var(--line)" };
            const attMark = (v) => (v === "P" ? "✓" : v === "A" ? "✕" : v === "H" ? "½" : "");
            const inp = { fontSize: 13.5, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)" };
            return (
              <>
                <HeaderBar title="স্টাফ হাজিরা ও বেতন" onBack={() => setView("years")} editMode={editMode} onToggleMode={toggleEditMode} />
                <div className="px-3 pt-4 pb-24">
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => shiftMonth(-1)} className="px-3 py-1.5 rounded-xl active:opacity-70" style={{ ...box, color: NAVY, fontSize: 16 }} aria-label="আগের মাস">
                      ‹
                    </button>
                    <div style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>
                      {MONTH_NAMES[m - 1]} {toBn(y)}
                    </div>
                    <button onClick={() => shiftMonth(1)} className="px-3 py-1.5 rounded-xl active:opacity-70" style={{ ...box, color: NAVY, fontSize: 16 }} aria-label="পরের মাস">
                      ›
                    </button>
                  </div>

                  {staffForm && (
                    <div className="rounded-xl mb-3 px-3 py-3" style={{ border: "2px solid var(--navy-line)", background: "var(--card)" }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 8 }}>{staffForm.id ? "স্টাফের তথ্য বদলান" : "নতুন স্টাফ রেজিস্টার"}</div>
                      <input value={staffForm.name || ""} onChange={(e) => setStaffForm((p) => ({ ...p, name: e.target.value }))} placeholder="স্টাফের নাম *" className="w-full px-3 py-2 rounded-xl outline-none mb-2" style={inp} />
                      <input value={staffForm.phone || ""} onChange={(e) => setStaffForm((p) => ({ ...p, phone: e.target.value }))} inputMode="tel" placeholder="ফোন নম্বর" className="w-full px-3 py-2 rounded-xl outline-none mb-2" style={inp} />
                      <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
                        <select value={staffForm.type || "monthly"} onChange={(e) => setStaffForm((p) => ({ ...p, type: e.target.value }))} className="px-3 py-2 rounded-xl outline-none" style={inp}>
                          <option value="monthly">মাসিক বেতন</option>
                          <option value="daily">দৈনিক বেতন</option>
                        </select>
                        <input value={staffForm.salary || ""} onChange={(e) => setStaffForm((p) => ({ ...p, salary: e.target.value }))} inputMode="decimal" placeholder={staffForm.type === "daily" ? "দৈনিক টাকা *" : "মাসিক টাকা *"} className="px-3 py-2 rounded-xl outline-none text-right" style={inp} />
                      </div>
                      <p style={{ fontSize: 11.5, color: GRAY, lineHeight: 1.6, marginBottom: 8 }}>
                        {staffForm.type === "daily"
                          ? "দৈনিক: বেতন = দৈনিক টাকা × উপস্থিত দিন (অর্ধদিবস = আধা)।"
                          : "মাসিক: প্রতি মাস ৩০ দিন ধরা হয়। প্রতিদিনের হার = মাসিক বেতন ÷ ৩০। বেতন = হার × উপস্থিত দিন (অর্ধদিবস = আধা)। ৩১ দিনের মাসে সব দিন এলেও বেতন মাসিক বেতনের বেশি হয় না।"}
                      </p>
                      {staffForm.id && (
                        <label className="flex items-center gap-2 mb-2" style={{ fontSize: 13, color: "var(--ink)" }}>
                          <input type="checkbox" checked={staffForm.active !== false} onChange={(e) => setStaffForm((p) => ({ ...p, active: e.target.checked }))} /> স্টাফ এখন কাজ করছেন (ছেড়ে গেলে টিক তুলে দিন)
                        </label>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => setStaffForm(null)} className="px-4 py-2.5 rounded-xl active:opacity-70" style={{ border: "1px solid var(--navy-line)", color: NAVY, fontSize: 13.5, fontWeight: 600 }}>
                          বাতিল
                        </button>
                        <button onClick={saveStaffForm} className="flex-1 py-2.5 rounded-xl active:opacity-80" style={{ background: "var(--navy-bg)", color: "var(--on-navy)", fontSize: 14, fontWeight: 700 }}>
                          সেভ করুন
                        </button>
                      </div>
                    </div>
                  )}

                  {editMode ? (
                    <button onClick={() => setStaffForm({ id: null, name: "", phone: "", type: "monthly", salary: "", active: true })} className="w-full flex items-center justify-center gap-1.5 py-2.5 mb-3 rounded-xl active:opacity-80" style={{ background: "var(--navy-bg)", color: "var(--on-navy)", fontSize: 14, fontWeight: 700 }}>
                      <Plus size={16} /> নতুন স্টাফ রেজিস্টার
                    </button>
                  ) : (
                    <p style={{ fontSize: 11.5, color: GRAY, marginBottom: 8 }}>স্টাফ রেজিস্টার, হাজিরা, অ্যাডভান্স বা বেতন দিতে এডিট মোড চালু করুন।</p>
                  )}

                  {visible.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {stat("হাজিরা অনুযায়ী মোট বেতন", totGross, NAVY)}
                      {stat("দেওয়া হয়েছে", totPaid, "var(--green)")}
                      {stat("দিতে বাকি (নেট)", totDue, "var(--red)")}
                    </div>
                  )}

                  {staffLoading ? (
                    <p style={{ fontSize: 12, color: GRAY }}>লোড হচ্ছে…</p>
                  ) : visible.length === 0 ? (
                    <p style={{ fontSize: 12, color: GRAY }}>এখনও কোনো স্টাফ রেজিস্টার করা নেই।</p>
                  ) : (
                    rows.map(({ st, calc, rec, plan, adv }) => {
                      const open = staffOpen === st.id;
                      const att = (attendY[m] || {})[st.id] || {};
                      const myAdv = staffAdv.filter((a) => a.staffId === st.id).sort((a, b) => (a.date < b.date ? 1 : -1));
                      const mismatch = rec && rec.gross !== calc.gross;
                      return (
                        <div key={st.id} className="rounded-xl px-3 py-3 mb-3" style={{ ...box, opacity: st.active === false ? 0.65 : 1 }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
                                {st.name}
                                {st.active === false && <span style={{ fontSize: 11, color: GRAY }}> (ছেড়ে গেছেন)</span>}
                              </div>
                              <div style={{ fontSize: 12, color: GRAY }}>
                                {st.type === "daily" ? "দৈনিক" : "মাসিক"} ৳{toBn(fmt(num(st.salary)))}
                                {st.type !== "daily" ? ` · হার ৳${toBn(fmt(Math.round(calc.rate)))}/দিন` : ""}
                                {st.phone ? ` · ${st.phone}` : ""}
                              </div>
                            </div>
                            {editMode && (
                              <button onClick={() => setStaffForm({ ...st })} className="px-2.5 py-1 rounded-full active:opacity-70 shrink-0" style={{ border: "1px solid var(--navy-line)", color: NAVY, fontSize: 12, fontWeight: 700 }}>
                                ✎ বদলান
                              </button>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1.5 mt-2" style={{ fontSize: 12 }}>
                            <span className="px-2 py-0.5 rounded-full" style={{ background: "var(--green-tint)", color: "var(--green-dark)" }}>উপস্থিত {toBn(calc.p)}</span>
                            <span className="px-2 py-0.5 rounded-full" style={{ background: "var(--amber-tint)", color: "var(--amber-text)" }}>অর্ধ {toBn(calc.h)}</span>
                            <span className="px-2 py-0.5 rounded-full" style={{ background: "var(--red-tint)", color: "var(--red-dark)" }}>অনুপস্থিত {toBn(calc.a)}</span>
                            <span className="px-2 py-0.5 rounded-full" style={{ background: "var(--tint)", color: GRAY }}>চিহ্নহীন {toBn(calc.unmarked)}</span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {stat("হাজিরা অনুযায়ী বেতন", calc.gross, NAVY)}
                            {stat("অ্যাডভান্স বাকি", adv, "var(--orange)")}
                            {stat(rec ? "দেওয়া হয়েছে" : "দেওয়ার মতো (নেট)", rec ? rec.net : plan.net, rec ? "var(--green)" : "var(--ink)")}
                          </div>
                          {!rec && plan.deduct > 0 && (
                            <div style={{ fontSize: 11.5, color: GRAY, marginTop: 4 }}>
                              বেতন ৳{toBn(fmt(calc.gross))} − অ্যাডভান্স কাটা ৳{toBn(fmt(plan.deduct))} = ৳{toBn(fmt(plan.net))}
                            </div>
                          )}

                          {rec ? (
                            <div className="mt-2 rounded-xl px-3 py-2" style={{ background: "var(--green-tint)", color: "var(--green-dark)", fontSize: 12.5 }}>
                              ✓ বেতন দেওয়া হয়েছে {parseYmd(rec.date) ? `${toBn(parseYmd(rec.date).dd)} ${MONTH_NAMES[parseYmd(rec.date).mm - 1]} ${toBn(parseYmd(rec.date).yy)}` : ""} — ৳{toBn(fmt(rec.net))}
                              {rec.deduct > 0 ? ` (অ্যাডভান্স কাটা ৳${toBn(fmt(rec.deduct))})` : ""} · ওই দিনের খরচে ওঠানো আছে
                              {mismatch && <div style={{ color: "var(--red)", marginTop: 3 }}>⚠ হাজিরা বদলেছে — এখনকার বেতন ৳{toBn(fmt(calc.gross))}, দেওয়া হয়েছিল ৳{toBn(fmt(rec.gross))}-এর হিসাবে।</div>}
                              {editMode && (
                                <button onClick={() => undoSalary(st)} className="block mt-1" style={{ color: "var(--red)", fontSize: 12 }}>
                                  বেতন দেওয়া বাতিল করুন
                                </button>
                              )}
                            </div>
                          ) : null}

                          {editMode && isCurMonth && (
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              <span style={{ fontSize: 12, color: GRAY }}>আজ ({toBn(today)}):</span>
                              {[["P", "উপস্থিত"], ["H", "অর্ধ"], ["A", "অনুপস্থিত"]].map(([v, label]) => (
                                <button key={v} onClick={() => applyAttend(st.id, today, att[today] === v ? "" : v)} className="px-2.5 py-1 rounded-full active:opacity-70" style={{ ...attStyle(att[today] === v ? v : ""), fontSize: 12, fontWeight: 700 }}>
                                  {label}
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 mt-3">
                            <button onClick={() => setStaffOpen(open ? null : st.id)} className="px-3 py-1.5 rounded-xl active:opacity-70" style={{ border: "1px solid var(--navy-line)", color: NAVY, fontSize: 12.5, fontWeight: 700 }}>
                              {open ? "হাজিরা লুকান ▲" : "হাজিরা দেখুন/বদলান ▼"}
                            </button>
                            {editMode && (
                              <>
                                <button onClick={() => { setAdvForm({ id: st.id, date: todayInputValue(), amount: "", note: "" }); setPayForm(null); }} className="px-3 py-1.5 rounded-xl active:opacity-70" style={{ background: "var(--amber-tint)", color: "var(--amber-text)", fontSize: 12.5, fontWeight: 700 }}>
                                  + অ্যাডভান্স দিন
                                </button>
                                {!rec && (
                                  <button onClick={() => { setPayForm({ id: st.id, date: todayInputValue(), amount: "" }); setAdvForm(null); }} className="px-3 py-1.5 rounded-xl active:opacity-70" style={{ background: "var(--navy-bg)", color: "#FFFFFF", fontSize: 12.5, fontWeight: 700 }}>
                                    বেতন দিন
                                  </button>
                                )}
                              </>
                            )}
                          </div>

                          {open && (
                            <div className="mt-3">
                              <div className="flex flex-wrap gap-2 mb-2" style={{ fontSize: 11, color: GRAY }}>
                                <span>ঘরে চাপলে বদলায়:</span>
                                <span>✓ উপস্থিত</span>
                                <span>✕ অনুপস্থিত</span>
                                <span>½ অর্ধদিবস</span>
                                <span>খালি = চিহ্নহীন</span>
                              </div>
                              <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
                                {Array.from({ length: n }, (_, i) => i + 1).map((d) => (
                                  <button key={d} onClick={() => cycleAttend(st.id, d)} disabled={!editMode} aria-label={`${d} তারিখ`} className="rounded-lg py-1.5 active:opacity-70" style={{ ...attStyle(att[d]), fontSize: 12, fontWeight: 600, opacity: !editMode ? 0.9 : 1 }}>
                                    <div style={{ fontSize: 10.5, opacity: 0.85 }}>{toBn(d)}</div>
                                    <div style={{ fontSize: 14, lineHeight: 1.1, minHeight: 16 }}>{attMark(att[d])}</div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {advForm && advForm.id === st.id && (
                            <div className="mt-3 rounded-xl px-3 py-3" style={{ background: "var(--amber-tint)" }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--amber-text)", marginBottom: 6 }}>অ্যাডভান্স দিন — {st.name}</div>
                              <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
                                <input value={advForm.amount} onChange={(e) => setAdvForm((p) => ({ ...p, amount: e.target.value }))} inputMode="decimal" placeholder="টাকা" className="px-3 py-2 rounded-xl outline-none text-right" style={inp} />
                                <input type="date" value={advForm.date} onChange={(e) => setAdvForm((p) => ({ ...p, date: e.target.value }))} className="px-2 py-2 rounded-xl outline-none" style={inp} />
                              </div>
                              <input value={advForm.note} onChange={(e) => setAdvForm((p) => ({ ...p, note: e.target.value }))} placeholder="নোট (ঐচ্ছিক)" className="w-full px-3 py-2 rounded-xl outline-none mb-2" style={inp} />
                              <p style={{ fontSize: 11.5, color: GRAY, marginBottom: 8 }}>এই তারিখের খরচে "অ্যাডভান্স — {st.name}" নামে লেখা হবে। বেতন দেওয়ার সময় এটা বেতন থেকে কাটা যাবে।</p>
                              <div className="flex gap-2">
                                <button onClick={() => setAdvForm(null)} className="px-4 py-2 rounded-xl" style={{ border: "1px solid var(--navy-line)", color: NAVY, fontSize: 13 }}>বাতিল</button>
                                <button onClick={() => addAdvance(st)} className="flex-1 py-2 rounded-xl active:opacity-80" style={{ background: "var(--navy-bg)", color: "#FFFFFF", fontSize: 13.5, fontWeight: 700 }}>অ্যাডভান্স সেভ</button>
                              </div>
                            </div>
                          )}

                          {payForm && payForm.id === st.id && (
                            <div className="mt-3 rounded-xl px-3 py-3" style={{ background: "var(--tint)" }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 6 }}>
                                {st.name} এর {MONTH_NAMES[m - 1]} মাসের বেতন দিন
                              </div>
                              <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
                                <input value={payForm.amount} onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))} inputMode="decimal" placeholder={`টাকা (হিসাবে ${toBn(fmt(plan.net))})`} className="px-3 py-2 rounded-xl outline-none text-right" style={inp} />
                                <input type="date" value={payForm.date} onChange={(e) => setPayForm((p) => ({ ...p, date: e.target.value }))} className="px-2 py-2 rounded-xl outline-none" style={inp} />
                              </div>
                              <p style={{ fontSize: 11.5, color: GRAY, marginBottom: 8, lineHeight: 1.6 }}>
                                হাজিরা অনুযায়ী ৳{toBn(fmt(calc.gross))}
                                {plan.deduct > 0 ? ` − অ্যাডভান্স ৳${toBn(fmt(plan.deduct))}` : ""} = দেওয়ার মতো ৳{toBn(fmt(plan.net))}। টাকার ঘর ফাঁকা রাখলে এটাই ধরা হবে। সেভ করলে এই তারিখের খরচে "বেতন — {st.name}" নামে ওঠে যাবে।
                              </p>
                              <div className="flex gap-2">
                                <button onClick={() => setPayForm(null)} className="px-4 py-2 rounded-xl" style={{ border: "1px solid var(--navy-line)", color: NAVY, fontSize: 13 }}>বাতিল</button>
                                <button onClick={() => paySalary(st)} className="flex-1 py-2 rounded-xl active:opacity-80" style={{ background: "var(--navy-bg)", color: "#FFFFFF", fontSize: 13.5, fontWeight: 700 }}>বেতন দেওয়া হয়েছে — খরচে লিখুন</button>
                              </div>
                            </div>
                          )}

                          {myAdv.length > 0 && (
                            <div className="mt-3">
                              <div style={{ fontSize: 12, color: GRAY, marginBottom: 2 }}>অ্যাডভান্সের তালিকা</div>
                              {myAdv.slice(0, 8).map((a) => (
                                <div key={a.id} className="flex items-center justify-between py-1" style={{ borderTop: "1px solid var(--line2)", fontSize: 12.5 }}>
                                  <span style={{ color: "var(--ink)" }}>
                                    {parseYmd(a.date) ? `${toBn(parseYmd(a.date).dd)} ${MONTH_SHORT[parseYmd(a.date).mm - 1]}` : a.date} · ৳{toBn(fmt(a.amount))}
                                    {a.note ? ` · ${a.note}` : ""}
                                  </span>
                                  <span className="flex items-center gap-2">
                                    <span style={{ color: advLeft(a) > 0 ? "var(--orange)" : "var(--green)", fontWeight: 600 }}>{advLeft(a) > 0 ? `বাকি ৳${toBn(fmt(advLeft(a)))}` : "কাটা হয়েছে ✓"}</span>
                                    {editMode && (a.settled || 0) === 0 && (
                                      <button onClick={() => deleteAdvance(a)} style={{ color: "var(--red)" }} aria-label="অ্যাডভান্স মুছুন">
                                        <Trash2 size={13} />
                                      </button>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  {staffList.some((s) => s.active === false) && (
                    <button onClick={() => setShowInactive((v) => !v)} style={{ fontSize: 12, color: GRAY }}>
                      {showInactive ? "ছেড়ে যাওয়া স্টাফ লুকান" : "ছেড়ে যাওয়া স্টাফ দেখান"}
                    </button>
                  )}
                </div>
              </>
            );
          })()}

        {/* ---------- SAFETY (ডেটা সুরক্ষা ও ব্যাকআপ) ---------- */}
        {view === "safety" &&
          (() => {
            const NAVY = "var(--navy-fg)";
            const GRAY = "var(--gray)";
            const box = { background: "var(--card)", border: "1px solid var(--line)" };
            const fmtDate = (ds) => {
              if (!ds) return null;
              const [yy, mm, dd] = ds.split("-").map(Number);
              return `${toBn(dd)} ${MONTH_NAMES[mm - 1]} ${toBn(yy)}`;
            };
            const latest = safety && safety.idx && safety.idx[0];
            const localLatest = safety && safety.local.find((c) => c.name === "snap-latest");
            const dLastDate = lastDriveBackup();
            const dDays = dLastDate ? Math.floor((Date.now() - new Date(dLastDate + "T00:00:00").getTime()) / 86400000) : null;
            const driveRowOk = !driveCfg ? null : dDays !== null && dDays < 2;
            const driveRowText = !driveCfg
              ? "যুক্ত করা নেই"
              : dDays === null
              ? lastDriveError()
                ? "যায়নি — " + lastDriveError()
                : "এখনও যায়নি"
              : dDays === 0
              ? "আজ ✓"
              : `${toBn(dDays)} দিন আগে`;
            const row = (ok, label, value) => (
              <div className="flex items-start justify-between gap-3 py-1.5" style={{ borderTop: "1px solid var(--line2)" }}>
                <div style={{ fontSize: 13, color: GRAY }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, textAlign: "right", color: ok === true ? "var(--green)" : ok === false ? "var(--red)" : "var(--amber-text)" }}>{value}</div>
              </div>
            );
            const btn = (label, onClick, primary, disabled) => (
              <button
                onClick={onClick}
                disabled={disabled || !!safetyBusy}
                className="w-full py-3 rounded-xl active:opacity-80 mb-2"
                style={{
                  background: primary ? "var(--navy-bg)" : "var(--card)",
                  color: primary ? "var(--on-navy)" : NAVY,
                  border: "1px solid var(--navy-line)",
                  fontSize: 14,
                  fontWeight: 700,
                  opacity: disabled || safetyBusy ? 0.6 : 1,
                }}
              >
                {label}
              </button>
            );
            return (
              <>
                <HeaderBar title="ডেটা সুরক্ষা ও ব্যাকআপ" onBack={() => setView("years")} editMode={editMode} onToggleMode={toggleEditMode} />
                <div className="px-3 pt-4 pb-10">
                  {safetyBusy && (
                    <div className="rounded-xl px-3 py-2 mb-3" style={{ background: "var(--tint)", color: NAVY, fontSize: 13, fontWeight: 600 }}>
                      ⏳ {safetyBusy}
                    </div>
                  )}
                  <div className="rounded-xl px-4 py-3 mb-3" style={box}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 4 }}>বর্তমান অবস্থা</div>
                    {!safety ? (
                      <p style={{ fontSize: 12, color: GRAY }}>লোড হচ্ছে…</p>
                    ) : (
                      <>
                        {row(safety.pending === 0, "সার্ভারে যেতে বাকি সেভ", safety.pending === 0 ? "কিছুই নেই ✓" : `${toBn(safety.pending)} টা (নেট এলে যাবে)`)}
                        {row(
                          safety.idx === null ? null : !!latest,
                          "সার্ভারের সর্বশেষ নিরাপত্তা-কপি",
                          safety.idx === null ? "নেট নেই — দেখা যাচ্ছে না" : latest ? `${fmtDate(latest.date)} (${toBn(latest.keys)} টা ডেটা)` : "এখনো নেই"
                        )}
                        {row(!!localLatest, "এই ডিভাইসের নিজস্ব কপি", localLatest ? fmtDate(localLatest.date) : "এখনো নেই")}
                        {row(driveRowOk, "Google Drive-এ শেষ ব্যাকআপ", driveRowText)}
                        {row(safety.conflicts.length === 0 ? true : null, "মিলিয়ে নেওয়া সংঘর্ষ", safety.conflicts.length === 0 ? "নেই ✓" : `${toBn(safety.conflicts.length)} টা (নিচে)`)}
                      </>
                    )}
                  </div>

                  <div className="rounded-xl px-4 py-3 mb-3" style={box}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 6 }}>☁ Google অ্যাকাউন্ট ও Drive</div>
                    {driveCfg ? (
                      <>
                        <div style={{ fontSize: 13, color: "var(--green)", fontWeight: 700 }}>✓ যুক্ত আছে{driveCfg.email ? `: ${driveCfg.email}` : ""}</div>
                        <p style={{ fontSize: 11.5, color: GRAY, lineHeight: 1.6, margin: "4px 0 10px" }}>
                          প্রতিদিন অ্যাপ খুললে নিজে থেকে ব্যাকআপ Drive-এর "RK হিসাব ব্যাকআপ" ফোল্ডারে যায় (শেষ ৩০টা রাখা হয়)। নেট না থাকলে পরের বার যাবে।
                        </p>
                        <button onClick={disconnectDrive} className="mt-1" style={{ fontSize: 12, color: "var(--red)" }}>
                          সংযোগ বিচ্ছিন্ন করুন
                        </button>
                      </>
                    ) : (
                      <>
                        <p style={{ fontSize: 12, color: GRAY, lineHeight: 1.7, marginBottom: 8 }}>
                          যে Google অ্যাকাউন্টের Drive-এ ব্যাকআপ রাখতে চান, সেটা দিয়ে একবার সেটআপ করুন:
                          <br />১. ওই অ্যাকাউন্টে লগইন করে script.google.com খুলুন → "New project"।
                          <br />২. নিচের "স্ক্রিপ্ট কপি করুন" চেপে পুরো লেখা বসান। উপরের SECRET-এ নিজের একটা গোপন কোড লিখুন।
                          <br />৩. Deploy → New deployment → Web app → Execute as: <b>Me</b>, Who has access: <b>Anyone</b> → Deploy → অনুমতি (Authorize) দিন।
                          <br />৪. যে "Web app URL" পাবেন আর গোপন কোড নিচে দিন।
                        </p>
                        {btn("📋 স্ক্রিপ্ট কপি করুন", async () => {
                          try {
                            await navigator.clipboard.writeText(DRIVE_SCRIPT);
                            showToast("✓ স্ক্রিপ্ট কপি হয়েছে — Apps Script-এ বসান");
                          } catch (e) {
                            window.alert("কপি হয়নি — আমার দেওয়া drive-backup.gs ফাইল থেকে নিন।");
                          }
                        })}
                        <input
                          value={driveForm.url}
                          onChange={(ev) => setDriveForm((p) => ({ ...p, url: ev.target.value }))}
                          placeholder="Web app URL (https://script.google.com/macros/s/…/exec)"
                          className="w-full px-3 py-2 rounded-xl outline-none mb-2"
                          style={{ fontSize: 13, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)" }}
                        />
                        <input
                          value={driveForm.secret}
                          onChange={(ev) => setDriveForm((p) => ({ ...p, secret: ev.target.value }))}
                          placeholder="গোপন কোড (স্ক্রিপ্টের SECRET-এর মতোই)"
                          className="w-full px-3 py-2 rounded-xl outline-none mb-2"
                          style={{ fontSize: 13, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)" }}
                        />
                        {btn("✓ সংযুক্ত করুন", connectDrive, true)}
                      </>
                    )}
                  </div>

                  <div ref={restoreRef} className="rounded-xl px-4 py-3 mb-3" style={box}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 2 }}>↩ ব্যাকআপ ফিরিয়ে আনুন (রিস্টোর)</div>
                    <p style={{ fontSize: 11.5, color: GRAY, marginBottom: 8, lineHeight: 1.6 }}>
                      যেকোনো একটা উৎস বেছে নিন — Drive, ফাইল, সার্ভারের কপি বা এই ডিভাইসের কপি। ফেরানোর আগে বর্তমান অবস্থা আলাদা করে রাখা হয়, তাই ভুল হলে আবার আগের অবস্থায় ফেরা যায়।
                    </p>
                    {!editMode && <p style={{ fontSize: 11.5, color: "var(--amber-text)", marginBottom: 8 }}>রিস্টোরের জন্য আগে এডিট মোড চালু করুন।</p>}
                    <label
                      className="block w-full py-3 rounded-xl text-center mb-2"
                      style={{ border: "1px solid var(--navy-line)", color: NAVY, fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: safetyBusy ? 0.6 : 1 }}
                    >
                      📥 ব্যাকআপ ফাইল থেকে রিস্টোর
                      <input
                        type="file"
                        accept=".json,application/json"
                        style={{ display: "none" }}
                        disabled={!!safetyBusy}
                        onChange={(ev) => {
                          const f = ev.target.files && ev.target.files[0];
                          ev.target.value = "";
                          restoreFromFile(f);
                        }}
                      />
                    </label>
                    {driveCfg && (
                      <>
                        <div style={{ fontSize: 12.5, color: GRAY, margin: "10px 0 4px" }}>Google Drive-এর ব্যাকআপ</div>
                        {driveFiles === null ? (
                          <p style={{ fontSize: 12, color: GRAY }}>লোড হচ্ছে… (না এলে নেট দেখে পেজটা আবার খুলুন)</p>
                        ) : driveFiles.length === 0 ? (
                          <p style={{ fontSize: 12, color: GRAY }}>Drive-এ এখনও কোনো ব্যাকআপ নেই।</p>
                        ) : (
                          driveFiles.slice(0, 15).map((f) => (
                            <div key={f.id} className="flex items-center justify-between py-1.5" style={{ borderTop: "1px solid var(--line2)" }}>
                              <span style={{ fontSize: 13, color: "var(--ink)" }}>
                                {f.name.replace("rk-hisab-backup-", "").replace(".json", "")} <span style={{ color: GRAY, fontSize: 11.5 }}>· {toBn(Math.max(1, Math.round((f.size || 0) / 1024)))} KB</span>
                              </span>
                              <button onClick={() => restoreFromDrive(f)} disabled={!!safetyBusy} className="px-3 py-1 rounded-full active:opacity-70" style={{ border: "1px solid var(--navy-line)", color: NAVY, fontSize: 12, fontWeight: 700 }}>
                                ফিরিয়ে আনুন
                              </button>
                            </div>
                          ))
                        )}
                      </>
                    )}
                    {safety && safety.idx && safety.idx.length > 0 && (
                      <>
                        <div style={{ fontSize: 12.5, color: GRAY, margin: "10px 0 4px" }}>সার্ভারের নিরাপত্তা-কপি</div>
                        {safety.idx.map((en) => (
                          <div key={en.date} className="flex items-center justify-between py-1.5" style={{ borderTop: "1px solid var(--line2)" }}>
                            <span style={{ fontSize: 13, color: "var(--ink)" }}>
                              {fmtDate(en.date)} <span style={{ color: GRAY, fontSize: 11.5 }}>· {toBn(en.keys)} টা ডেটা</span>
                            </span>
                            <button onClick={() => restoreFromServer(en)} disabled={!!safetyBusy} className="px-3 py-1 rounded-full active:opacity-70" style={{ border: "1px solid var(--navy-line)", color: NAVY, fontSize: 12, fontWeight: 700 }}>
                              ফিরিয়ে আনুন
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                    {safety && safety.local.length > 0 && (
                      <>
                        <div style={{ fontSize: 12.5, color: GRAY, margin: "10px 0 4px" }}>এই ডিভাইসের কপি</div>
                        {safety.local.map((c) => (
                          <div key={c.name} className="flex items-center justify-between py-1.5" style={{ borderTop: "1px solid var(--line2)" }}>
                            <span style={{ fontSize: 13, color: "var(--ink)" }}>
                              {c.label} <span style={{ color: GRAY, fontSize: 11.5 }}>· {fmtDate(c.date)} · {toBn(c.keys)} টা</span>
                            </span>
                            <button onClick={() => restoreFromLocal(c)} disabled={!!safetyBusy} className="px-3 py-1 rounded-full active:opacity-70" style={{ border: "1px solid var(--navy-line)", color: NAVY, fontSize: 12, fontWeight: 700 }}>
                              ফিরিয়ে আনুন
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  {safety && safety.conflicts.length > 0 && (
                    <div className="rounded-xl px-4 py-3 mb-3" style={{ ...box, border: "1px solid var(--orange)" }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--amber-text)", marginBottom: 4 }}>মিলিয়ে নেওয়া সংঘর্ষ</div>
                      <p style={{ fontSize: 11.5, color: GRAY, marginBottom: 6, lineHeight: 1.6 }}>
                        দুই ডিভাইসে একই জিনিস একসাথে বদলালে অ্যাপ দুটোই মিলিয়ে রেখেছে, কিছু হারায়নি। এই ডিভাইসের কপি আলাদা করে রাখা আছে — সব ঠিক থাকলে "ঠিক আছে" চাপুন।
                      </p>
                      {safety.conflicts.map((c) => (
                        <div key={c.id} className="py-2" style={{ borderTop: "1px solid var(--line2)" }}>
                          <div style={{ fontSize: 12.5, color: "var(--ink)" }}>
                            {c.key.replace(/^day:/, "দিন ").replace(/^dues:/, "বাকি ").replace(/^yearstats:/, "সারাংশ ").replace(/^memos:/, "মেমো ")}
                            <span style={{ color: GRAY, fontSize: 11 }}> · {new Date(c.at).toLocaleString("bn-BD")} · {c.auto ? "নিজে মিলেছে" : "আমার কপি বসেছে"}</span>
                          </div>
                          <div className="flex gap-2 mt-1.5">
                            <button onClick={() => conflictDismiss(c)} className="px-3 py-1 rounded-full active:opacity-70" style={{ background: "var(--navy-bg)", color: "#FFFFFF", fontSize: 12, fontWeight: 700 }}>
                              ঠিক আছে
                            </button>
                            <button onClick={() => conflictUseMine(c)} className="px-3 py-1 rounded-full active:opacity-70" style={{ border: "1px solid var(--navy-line)", color: NAVY, fontSize: 12 }}>
                              এই ডিভাইসের কপি বসান
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            );
          })()}

        {/* ---------- CUSTOMERS (কাস্টমারভিত্তিক পুরো হিসাব) ---------- */}
        {view === "customers" &&
          (() => {
            const NAVY = "var(--navy-fg)";
            const GRAY = "var(--gray)";
            const custs = buildCustomers(memos, allDues, customersReg, ledgerData.filter((r) => r.type === "বিক্রি" && r.customer));
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
                  {custForm && (
                    <div className="rounded-xl mb-4 px-3 py-3" style={{ border: "2px solid var(--navy-line)", background: "var(--card)" }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 8 }}>
                        {custForm.id ? "কাস্টমারের তথ্য বদলান" : "নতুন কাস্টমার রেজিস্টার"}
                      </div>
                      {[
                        ["name", "কাস্টমারের নাম *", "text", custForm.locked],
                        ["phone", "ফোন নম্বর", "tel", false],
                        ["address", "ঠিকানা", "text", false],
                      ].map(([f, label, type, locked]) => (
                        <div key={f} className="mb-2">
                          <div style={{ fontSize: 11.5, color: GRAY, marginBottom: 3 }}>
                            {label}
                            {locked ? " (লেনদেন থাকায় নাম বদলানো যাবে না)" : ""}
                          </div>
                          <input
                            value={custForm[f] || ""}
                            onChange={(ev) => setCustForm((p) => ({ ...p, [f]: ev.target.value }))}
                            inputMode={type === "tel" ? "tel" : undefined}
                            disabled={locked}
                            className="w-full px-3 py-2 rounded-xl outline-none"
                            style={{ fontSize: 14, border: "1px solid var(--line)", background: locked ? "var(--bg)" : "var(--card)", color: "var(--ink)" }}
                          />
                        </div>
                      ))}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => setCustForm(null)}
                          className="px-4 py-2.5 rounded-xl active:opacity-70"
                          style={{ border: "1px solid var(--navy-line)", color: NAVY, fontSize: 13.5, fontWeight: 600 }}
                        >
                          বাতিল
                        </button>
                        <button
                          onClick={saveCustForm}
                          className="flex-1 py-2.5 rounded-xl active:opacity-80"
                          style={{ background: "var(--navy-bg)", color: "var(--on-navy)", fontSize: 14, fontWeight: 700 }}
                        >
                          সেভ করুন
                        </button>
                      </div>
                    </div>
                  )}
                  {allDuesLoading || ledgerLoading ? (
                    <p style={{ fontSize: 12, color: GRAY }}>লোড হচ্ছে…</p>
                  ) : sel ? (
                    (() => {
                      const rows = customerRows(sel);
                      const msg = dueMessageTotal(sel.name, sel.due);
                      return (
                        <>
                          <div className="rounded-xl px-4 py-3 mb-3" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
                            <div className="flex items-start justify-between gap-2">
                              <div style={{ fontSize: 17, fontWeight: 700, color: NAVY }}>{sel.name}</div>
                              {editMode && (
                                <button
                                  onClick={() =>
                                    setCustForm({
                                      id: sel.reg ? sel.reg.id : null,
                                      name: sel.name,
                                      phone: sel.phone || "",
                                      address: sel.address || "",
                                      locked: sel.memos.length + sel.dues.length + sel.sales.length > 0,
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-full active:opacity-70 shrink-0"
                                  style={{ border: "1px solid var(--navy-line)", color: NAVY, fontSize: 12, fontWeight: 700 }}
                                >
                                  {sel.reg ? "✎ তথ্য বদলান" : "✎ রেজিস্টার করুন"}
                                </button>
                              )}
                            </div>
                            <div style={{ fontSize: 13, color: GRAY, marginTop: 2 }}>{sel.phone ? `📞 ${sel.phone}` : "ফোন নম্বর নেই"}</div>
                            {sel.address && <div style={{ fontSize: 13, color: GRAY }}>📍 {sel.address}</div>}
                            <div style={{ fontSize: 12.5, marginTop: 5, fontWeight: 600, color: lastUpdateColor(sel.lastVal) }}>
                              🕒 শেষ আপডেট: {lastUpdateText(sel.lastVal)}
                            </div>
                            {!sel.reg && <div style={{ fontSize: 11.5, color: GRAY, marginTop: 2 }}>এখনো রেজিস্টার করা নেই</div>}
                            {editMode && sel.reg && sel.memos.length + sel.dues.length + sel.sales.length === 0 && (
                              <button onClick={() => deleteCustReg(sel)} className="mt-2" style={{ fontSize: 12, color: "var(--red)" }}>
                                কাস্টমার মুছুন
                              </button>
                            )}
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
                                    {toBn(r.d)} {MONTH_SHORT[r.m - 1]} {toBn(r.y)}
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
                                  {r.detail && r.detail.length > 0 && (
                                    <div className="px-2 pb-1.5" style={{ gridColumn: "1 / -1", fontSize: 11, color: GRAY, lineHeight: 1.55 }}>
                                      {r.detail.map((t, k) => (
                                        <div key={k}>• {t}</div>
                                      ))}
                                    </div>
                                  )}
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
                        .sort((a, b) =>
                          custSort === "recent" ? b.lastVal - a.lastVal : custSort === "name" ? a.name.localeCompare(b.name, "bn") : b.due - a.due || b.lastVal - a.lastVal
                        );
                      return (
                        <>
                          {editMode ? (
                            <button
                              onClick={() => setCustForm({ id: null, name: "", phone: "", address: "", locked: false })}
                              className="w-full flex items-center justify-center gap-1.5 py-2.5 mb-3 rounded-xl active:opacity-80"
                              style={{ background: "var(--navy-bg)", color: "var(--on-navy)", fontSize: 14, fontWeight: 700 }}
                            >
                              <Plus size={16} /> নতুন কাস্টমার রেজিস্টার
                            </button>
                          ) : (
                            <p style={{ fontSize: 11.5, color: GRAY, marginBottom: 8 }}>নতুন কাস্টমার রেজিস্টার করতে এডিট মোড চালু করুন।</p>
                          )}
                          <input
                            value={custQuery}
                            onChange={(e) => setCustQuery(e.target.value)}
                            placeholder="কাস্টমারের নাম / ফোন দিয়ে খুঁজুন…"
                            className="w-full px-3 py-2 rounded-xl outline-none mb-2"
                            style={{ border: "1px solid var(--line)", background: "var(--card)", fontSize: 13.5 }}
                          />
                          <p style={{ fontSize: 12, color: GRAY, marginBottom: 10 }}>
                            মোট {toBn(custs.length)} জন · মোট বাকি ৳{toBn(fmt(custs.reduce((s, c) => s + c.due, 0)))}
                          </p>
                          <div className="flex gap-2 mb-3">
                            {[["due", "বাকি বেশি"], ["recent", "শেষ আপডেট"], ["name", "নাম"]].map(([id, label]) => (
                              <button
                                key={id}
                                onClick={() => setCustSort(id)}
                                className="px-3 py-1 rounded-full active:opacity-70"
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  border: "1px solid var(--navy-line)",
                                  background: custSort === id ? "var(--navy-bg)" : "var(--card)",
                                  color: custSort === id ? "#FFFFFF" : "var(--navy-fg)",
                                }}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          {list.length === 0 ? (
                            <p style={{ fontSize: 12, color: GRAY }}>
                              {custs.length === 0 ? "এখনও কোনো কাস্টমার নেই — উপরের বাটনে রেজিস্টার করুন, বা মেমো বানালে এখানে আসবে।" : "কাউকে পাওয়া যায়নি।"}
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
                                  <div className="mt-0.5" style={{ fontSize: 11.5, fontWeight: 600, color: lastUpdateColor(c.lastVal) }}>
                                    🕒 শেষ আপডেট: {lastUpdateText(c.lastVal)}
                                    {c.reg ? "" : " · রেজিস্টার নেই"}
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
                          {t.y ? ` · হিসাবের তারিখ ${toBn(t.d)} ${MONTH_SHORT[t.m - 1]} ${toBn(t.y)}` : ""}
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
