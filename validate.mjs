// 数据校验: 抓取结果写入前/后检查 schema 完整性, 防止脏数据破坏前端
// 用法: node validate.mjs   (退出码 0=通过, 1=失败)
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "site", "data");
const errors = [];

const check = (cond, msg) => { if (!cond) errors.push(msg); };

function read(name) {
  try { return JSON.parse(readFileSync(join(DATA, name), "utf8")); }
  catch (e) { errors.push(`无法读取 ${name}: ${e.message}`); return null; }
}

const meta = read("meta.json");
const news = read("news.json");
const weather = read("weather.json");
const hot = read("hot.json");

// meta
check(meta && typeof meta.updatedAt === "string" && !isNaN(new Date(meta.updatedAt)), "meta.updatedAt 无效");
check(meta && typeof meta.newsCount === "number", "meta.newsCount 缺失");

// news
if (news && Array.isArray(news.categories)) {
  check(news.categories.length >= 5, `新闻大类数量异常: ${news.categories?.length ?? 0}`);
  let total = 0;
  for (const c of news.categories) {
    check(c.id && c.name && Array.isArray(c.subs), `分类「${c.name || c.id}」结构异常`);
    for (const s of c.subs || []) {
      check(Array.isArray(s.items), `子类「${s.name}」items 缺失`);
      for (const it of s.items || []) {
        check(it.title && it.url, `条目缺少 title/url (来源 ${it.source || "?"})`);
        total++;
      }
    }
  }
  if (total === 0) errors.push("新闻总条目为 0");
} else if (news) {
  errors.push("news.categories 缺失或非数组");
}

// weather
if (weather && Array.isArray(weather.cities)) {
  for (const c of weather.cities) {
    const ok = c.current && typeof c.current.temp === "number";
    check(ok || c.stale === true, `天气「${c.name}」无数据且未标记 stale`);
  }
} else if (weather) {
  errors.push("weather.cities 缺失或非数组");
}

// hot
if (hot && Array.isArray(hot.platforms)) {
  for (const p of hot.platforms) {
    check(Array.isArray(p.items), `热搜平台「${p.name}」items 缺失`);
    for (const it of p.items || []) {
      check(it.title && it.url, `热搜条目缺少 title/url (${p.name})`);
    }
  }
} else if (hot) {
  errors.push("hot.platforms 缺失或非数组");
}

if (errors.length) {
  console.error("[validate] 失败:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("[validate] OK: 数据校验通过");
