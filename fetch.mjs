// ============================================================
// 每日信息差看板 · 抓取脚本
// 用法: node fetch.mjs
// 产出: site/data/{meta,news,weather,hot}.json
// 零依赖, 仅用 Node 原生 fetch (Node >= 18)
// ============================================================
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import {
  CITIES, WEATHER_CODES, CATEGORIES, HOT_PLATFORMS, OPTIONS,
} from "./config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "site", "data");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const log = (...a) => console.log("[fetch]", ...a);
const warn = (...a) => console.warn("[fetch:skip]", ...a);

// ---------------- 基础工具 ----------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function decodeEntities(s) {
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
}

function stripTags(s) {
  return String(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(s, n = 220) {
  s = String(s || "").trim();
  return s.length > n ? s.slice(0, n) + "…" : s;
}

async function fetchText(url, { timeoutMs = OPTIONS.fetchTimeoutMs, headers = {} } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "*/*", ...headers },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

async function fetchJSON(url, opts) {
  const txt = await fetchText(url, opts);
  return JSON.parse(txt);
}

// ---------------- RSS 解析 ----------------
function tagText(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return m ? decodeEntities(m[1]) : "";
}

function atomLink(block) {
  const m = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  return m ? decodeEntities(m[1]) : "";
}

function parseRSS(xml) {
  const out = [];
  const blocks = xml.match(/<(item|entry)([\s>])[\s\S]*?<\/\1>/gi) || [];
  for (const b of blocks) {
    const title = stripTags(tagText(b, "title"));
    if (!title) continue;
    let link = tagText(b, "link").trim() || atomLink(b);
    const desc = stripTags(tagText(b, "description") || tagText(b, "summary") || tagText(b, "content"));
    const dateStr =
      tagText(b, "pubDate") || tagText(b, "published") || tagText(b, "updated") || tagText(b, "dc:date");
    const t = new Date(dateStr);
    out.push({
      title,
      url: link,
      summary: truncate(desc),
      publishedAt: isNaN(t) ? null : t.toISOString(),
    });
  }
  return out;
}

function gnewsUrl(cfg) {
  const hl = cfg.hl || "zh-CN";
  const gl = cfg.gl || "CN";
  const ceid = hl.includes("zh") ? `${gl}:zh-Hans` : `${gl}:en`;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(cfg.gnews)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
}

// ---------------- 天气 ----------------
// 主: Open-Meteo(免 key, 数据全, 需可访问国外网络)
// 备: wthrcdn.etouch.cn(中国可访问, 免 key, 数据较简)
function weatherTextIcon(t = "") {
  if (/晴/.test(t)) return "☀️";
  if (/多云|云/.test(t)) return "⛅";
  if (/阴/.test(t)) return "☁️";
  if (/雷/.test(t)) return "⛈️";
  if (/雨/.test(t)) return "🌧️";
  if (/雪/.test(t)) return "❄️";
  if (/雾|霾/.test(t)) return "🌫️";
  if (/风|沙|尘/.test(t)) return "🌬️";
  return "🌡️";
}
const parseTemp = (s) => { const m = String(s || "").match(/(-?\d+)/); return m ? parseInt(m[1], 10) : null; };
const beijingToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
const addDays = (dateStr, n) => { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

async function fetchWeatherOpenMeteo(c) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=Asia%2FShanghai&forecast_days=7`;
  const j = await fetchJSON(url, { timeoutMs: 15000 });
  const wc = WEATHER_CODES[j.current.weather_code] || { text: "未知", icon: "🌡️" };
  const daily = (j.daily.time || []).map((date, i) => {
    const code = j.daily.weather_code[i];
    const w = WEATHER_CODES[code] || { text: "未知", icon: "🌡️" };
    return {
      date, code, text: w.text, icon: w.icon,
      tmax: Math.round(j.daily.temperature_2m_max[i]),
      tmin: Math.round(j.daily.temperature_2m_min[i]),
      precipProb: j.daily.precipitation_probability_max?.[i] ?? null,
    };
  });
  return {
    name: c.name,
    current: {
      temp: Math.round(j.current.temperature_2m),
      apparent: Math.round(j.current.apparent_temperature),
      humidity: j.current.relative_humidity_2m,
      wind: Math.round(j.current.wind_speed_10m),
      code: j.current.weather_code, text: wc.text, icon: wc.icon,
    },
    daily, stale: false,
  };
}

async function fetchWeatherEtouch(c) {
  const url = `https://wthrcdn.etouch.cn/weather_mini?city=${encodeURIComponent(c.name)}`;
  const j = await fetchJSON(url, { timeoutMs: 12000 });
  const d = j.data;
  const fc = d.forecast || [];
  const today = beijingToday();
  const daily = fc.slice(0, 7).map((f, i) => ({
    date: addDays(today, i),
    code: null,
    text: f.type || "",
    icon: weatherTextIcon(f.type),
    tmax: parseTemp(f.high), tmin: parseTemp(f.low), precipProb: null,
  }));
  const first = daily[0];
  return {
    name: c.name,
    current: {
      temp: parseTemp(d.wendu),
      apparent: null, humidity: null, wind: null, code: null,
      text: first?.text || "", icon: first?.icon || "🌡️",
    },
    daily, stale: false,
  };
}

async function withRetry(fn, attempts = 3, delayMs = 800) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (e) { lastErr = e; await sleep(delayMs * (i + 1)); }
  }
  throw lastErr;
}

async function fetchWeather() {
  const cities = [];
  for (const c of CITIES) {
    let city = null;
    for (const fn of [fetchWeatherOpenMeteo, fetchWeatherEtouch]) {
      try {
        city = await withRetry(() => fn(c), 3, 800);
        log(`天气: ${c.name} OK (${fn.name})`);
        break;
      } catch (e) {
        warn(`天气 ${c.name} (${fn.name}) 失败: ${e.message}`);
      }
    }
    if (!city) city = { name: c.name, current: null, daily: [], stale: true };
    cities.push(city);
    await sleep(OPTIONS.requestDelayMs);
  }
  return { cities, updatedAt: new Date().toISOString() };
}

// ---------------- 热搜 ----------------
async function fetchHotPlatform(p) {
  const mk = (items) => ({
    id: p.id, name: p.name, kind: p.kind,
    items: items.filter((it) => it && it.title && it.url),
    stale: false,
  });
  try {
    switch (p.id) {
      case "weibo": {
        const j = await fetchJSON("https://weibo.com/ajax/side/hotSearch", {
          headers: { Referer: "https://weibo.com" },
        });
        const list = (j.data?.realtime || []).slice(0, OPTIONS.perHotMax);
        return mk(list.map((it, i) => ({
          rank: i + 1, title: it.word, hot: it.num ? `${Math.round(it.num / 10000)}万` : (it.note || ""),
          url: `https://s.weibo.com/weibo?q=${encodeURIComponent(it.word)}`,
        })));
      }
      case "baidu": {
        const j = await fetchJSON("https://top.baidu.com/api/board?platform=wise&tab=realtime");
        // 百度接口层级常变, 递归收集所有带 word 字段的词条
        const seen = new Set();
        const list = [];
        const walk = (node) => {
          if (!node) return;
          if (Array.isArray(node)) { for (const x of node) walk(x); return; }
          if (typeof node !== "object") return;
          if (typeof node.word === "string" && node.word) {
            if (!seen.has(node.word)) { seen.add(node.word); list.push(node); }
            return;
          }
          for (const k of ["content", "list", "children", "data"]) if (node[k]) walk(node[k]);
        };
        walk(j.data?.cards);
        return mk(list.slice(0, OPTIONS.perHotMax).map((it, i) => ({
          rank: i + 1, title: it.word, hot: it.hotScore || it.newHotName || "",
          url: it.rawUrl || it.url || `https://www.baidu.com/s?wd=${encodeURIComponent(it.word)}`,
        })));
      }
      case "zhihu": {
        const j = await fetchJSON("https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=50", {
          headers: { Referer: "https://www.zhihu.com" },
        });
        const list = (j.data || []).slice(0, OPTIONS.perHotMax);
        return mk(list.map((it, i) => ({
          rank: i + 1, title: it.target?.title || it.target?.title_area?.text || "",
          hot: it.detail_text || "", url: it.target?.url || `https://www.zhihu.com/question/${it.target?.id || ""}`,
        })).filter((x) => x.title));
      }
      case "bilibili": {
        const j = await fetchJSON("https://api.bilibili.com/x/web-interface/search/square?limit=15&platform=web", {
          headers: { Referer: "https://www.bilibili.com" },
        });
        const list = (j.data?.trending?.list || []).slice(0, OPTIONS.perHotMax);
        return mk(list.map((it, i) => ({
          rank: i + 1, title: it.keyword || it.show_name, hot: it.heat_score ? `热度 ${it.heat_score}` : "",
          url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(it.keyword || it.show_name)}`,
        })));
      }
      case "toutiao": {
        const j = await fetchJSON("https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc", {
          headers: { Referer: "https://www.toutiao.com" },
        });
        const list = (j.data || []).slice(0, OPTIONS.perHotMax);
        return mk(list.map((it, i) => ({
          rank: i + 1, title: it.Title || it.title, hot: it.HotValue || it.hotValue || "",
          url: it.Url || it.url || `https://so.toutiao.com/search?keyword=${encodeURIComponent(it.Title)}`,
        })));
      }
      case "reddit": {
        const j = await fetchJSON("https://www.reddit.com/r/technology+worldnews+science/hot.json?limit=15", {
          headers: { "User-Agent": "infodiff/1.0" },
        });
        const list = (j.data?.children || []).slice(0, OPTIONS.perHotMax);
        return mk(list.map((c, i) => ({
          rank: i + 1, title: c.data.title, hot: `▲${c.data.ups ?? c.data.score ?? 0}`,
          url: c.data.url_overridden_by_dest || c.data.url || `https://www.reddit.com${c.data.permalink}`,
        })));
      }
      case "hn": {
        const j = await fetchJSON("https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=15");
        const list = (j.hits || []).slice(0, OPTIONS.perHotMax);
        return mk(list.map((it, i) => ({
          rank: i + 1, title: it.title, hot: `▲${it.points ?? 0}`,
          url: it.url || `https://news.ycombinator.com/item?id=${it.objectID}`,
        })));
      }
      case "gtrends": {
        const xml = await fetchText("https://trends.google.com/trending/rss?geo=US");
        const list = parseRSS(xml).slice(0, OPTIONS.perHotMax);
        return mk(list.map((it, i) => ({
          rank: i + 1, title: it.title, hot: "", url: it.url,
        })));
      }
      default:
        throw new Error("unknown platform");
    }
  } catch (e) {
    warn(`热搜 ${p.name} 失败: ${e.message}`);
    return { id: p.id, name: p.name, kind: p.kind, items: [], stale: true, error: e.message };
  }
}

// ---------------- 翻译 (Google gtx 免费端点) ----------------
async function translateOnce(text) {
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
  const j = await fetchJSON(url, { timeoutMs: 8000 });
  const seg = (j && j[0]) || [];
  const out = seg.map((s) => s && s[0]).filter(Boolean).join("");
  return out.trim();
}

async function translateMany(texts) {
  const out = new Map();
  let todo = texts.slice(0, OPTIONS.translateMax);
  let idx = 0;
  const workers = Array.from({ length: OPTIONS.translateConcurrency }, async () => {
    while (idx < todo.length) {
      const i = idx++;
      const t = todo[i];
      try {
        out.set(t, await translateOnce(t));
      } catch {
        out.set(t, "");
      }
    }
  });
  await Promise.all(workers);
  return out;
}

// ---------------- 新闻抓取 ----------------
async function fetchNews() {
  const categories = [];
  for (const cat of CATEGORIES) {
    const subs = [];
    for (const sub of cat.subs) {
      let items = [];
      for (const feed of sub.feeds) {
        try {
          const url = feed.url || gnewsUrl(feed);
          const xml = await fetchText(url);
          const parsed = parseRSS(xml);
          for (const it of parsed) {
            if (it.url && !items.some((x) => x.url === it.url)) {
              items.push({
                title: it.title,
                summary: it.summary,
                source: feed.name,
                url: it.url,
                publishedAt: it.publishedAt,
                lang: feed.url ? guessLang(feed.url, it.title) : "zh",
                machineTranslated: false,
              });
            }
          }
          if (parsed.length) log(`新闻 ${cat.name}/${sub.name} ← ${feed.name} (+${parsed.length})`);
        } catch (e) {
          warn(`新闻 ${feed.name} 失败: ${e.message}`);
        }
        await sleep(OPTIONS.requestDelayMs);
      }
      // 按时间排序 + 去重 + 截断
      items.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
      items = items.slice(0, OPTIONS.perSubMax);
      subs.push({ id: sub.id, name: sub.name, items });
    }
    categories.push({ id: cat.id, name: cat.name, icon: cat.icon, subs });
  }
  return categories;
}

function guessLang(feedUrl, title) {
  // 根据信源域名粗判语言: 国外站点视为 en, 触发翻译
  const intlDomains = /(nature|science|techcrunch|theverge|engadget|venturebeat|hnrss|statnews|fiercepharma|chemistryworld|sciencedaily|sciencenews|polygon|ign|defensenews|understandingwar|bbci|reuters|ftchinese)/i;
  return intlDomains.test(feedUrl) ? "en" : /[\u4e00-\u9fff]/.test(title) ? "zh" : "en";
}

// ---------------- 合并旧数据(容错回退) ----------------
function readJson(name) {
  const p = join(DATA_DIR, name);
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

function mergeNews(fresh) {
  const old = readJson("news.json");
  if (!old) return fresh;
  const oldSubs = new Map();
  for (const c of old.categories) for (const s of c.subs) oldSubs.set(`${c.id}/${s.id}`, s.items);
  for (const cat of fresh) for (const sub of cat.subs) {
    if (sub.items.length === 0) {
      const carried = oldSubs.get(`${cat.id}/${sub.id}`) || [];
      if (carried.length) {
        sub.items = carried;
        sub.stale = true;
        warn(`新闻 ${cat.name}/${sub.name} 全部失败, 沿用昨日数据`);
      }
    }
  }
  return fresh;
}

function mergeHot(fresh) {
  const old = readJson("hot.json");
  if (!old) return fresh;
  const oldMap = new Map(old.platforms.map((p) => [p.id, p]));
  for (const p of fresh) {
    if (p.items.length === 0 && oldMap.get(p.id)?.items?.length) {
      p.items = oldMap.get(p.id).items;
      p.stale = true;
      warn(`热搜 ${p.name} 失败, 沿用昨日数据`);
    }
  }
  return fresh;
}

function mergeWeather(fresh) {
  const old = readJson("weather.json");
  if (!old) return fresh;
  const oldMap = new Map(old.cities.map((c) => [c.name, c]));
  for (const c of fresh.cities) {
    if (!c.current && oldMap.get(c.name)?.current) {
      Object.assign(c, oldMap.get(c.name));
      c.stale = true;
      warn(`天气 ${c.name} 失败, 沿用昨日数据`);
    }
  }
  return fresh;
}

// ---------------- 翻译国外内容 ----------------
async function applyTranslation(newsCategories, hotPlatforms) {
  const targets = []; // { kind, title }
  for (const cat of newsCategories) {
    for (const sub of cat.subs) {
      for (const it of sub.items) {
        if (it.lang === "en" && it.title) targets.push({ title: it.title, lang: "en" });
      }
    }
  }
  for (const p of hotPlatforms) {
    if (p.kind !== "intl") continue;
    for (const it of p.items) if (it.title) targets.push({ title: it.title, lang: "en" });
  }
  const need = [...new Set(targets.map((t) => t.title))];
  if (!need.length) return;
  log(`翻译 ${need.length} 条国外内容…`);
  const map = await translateMany(need);
  const lookup = (t) => map.get(t) || "";
  for (const cat of newsCategories) {
    for (const sub of cat.subs) {
      for (const it of sub.items) {
        if (it.lang === "en") {
          it.titleZh = lookup(it.title);
          if (it.titleZh) it.machineTranslated = true;
        }
      }
    }
  }
  for (const p of hotPlatforms) {
    if (p.kind !== "intl") continue;
    for (const it of p.items) {
      it.titleZh = lookup(it.title);
      if (it.titleZh) it.machineTranslated = true;
    }
  }
}

// ---------------- 主流程 ----------------
async function main() {
  mkdirSync(DATA_DIR, { recursive: true });
  const t0 = Date.now();
  log("开始抓取…");

  log("== 新闻 ==");
  const categories = mergeNews(await fetchNews());
  const newsCount = categories.reduce(
    (n, c) => n + c.subs.reduce((m, s) => m + s.items.length, 0), 0);

  log("== 热搜 ==");
  let platforms = [];
  for (const p of HOT_PLATFORMS) {
    platforms.push(await fetchHotPlatform(p));
    await sleep(OPTIONS.requestDelayMs);
  }
  platforms = mergeHot(platforms);

  log("== 天气 ==");
  const weather = mergeWeather(await fetchWeather());

  log("== 翻译 ==");
  await applyTranslation(categories, platforms);

  const updatedAt = new Date().toISOString();
  const meta = {
    updatedAt,
    newsCount,
    hotPlatforms: platforms.filter((p) => p.items.length).length,
    generatedBy: "fetch.mjs",
  };

  writeFileSync(join(DATA_DIR, "meta.json"), JSON.stringify(meta, null, 2));
  writeFileSync(join(DATA_DIR, "news.json"), JSON.stringify({ updatedAt, categories }, null, 2));
  writeFileSync(join(DATA_DIR, "weather.json"), JSON.stringify(weather, null, 2));
  writeFileSync(join(DATA_DIR, "hot.json"), JSON.stringify({ updatedAt, platforms }, null, 2));

  log(`完成, 耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s: 新闻 ${newsCount} 条, 热搜 ${meta.hotPlatforms} 平台, 天气 ${weather.cities.length} 城`);
}

main().catch((e) => {
  console.error("[fetch:error]", e);
  process.exit(1);
});
