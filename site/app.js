// 每日信息差看板 · 前端逻辑
(() => {
  const $ = (s) => document.querySelector(s);
  const main = $("#main");
  const navEl = $("#nav");
  const updatedAtEl = $("#updatedAt");
  const searchEl = $("#search");
  const themeBtn = $("#themeBtn");

  const state = {
    view: "news",
    categoryId: "all",
    subId: "all",
    platformId: null,
    search: "",
    data: null,
  };

  // ---------- 工具 ----------
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function timeAgo(iso) {
    if (!iso) return "";
    const t = new Date(iso);
    if (isNaN(t)) return "";
    const diff = (Date.now() - t.getTime()) / 1000;
    if (diff < 0) return "刚刚";
    if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    if (diff < 172800) return "昨天";
    if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }

  function matchesSearch(it) {
    const q = state.search.trim().toLowerCase();
    if (!q) return true;
    const hay = [it.title, it.titleZh, it.summary, it.source]
      .filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  }

  // ---------- 渲染: 新闻 ----------
  function itemCard(it) {
    const mt = it.machineTranslated && it.titleZh;
    const mainTitle = mt ? it.titleZh : it.title;
    const orig = mt && it.title !== it.titleZh ? it.title : null;
    return `
      <a class="card" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">
        <div class="card-title">
          <span class="zh">${esc(mainTitle)}</span>
          ${mt ? '<span class="mt-badge">机翻</span>' : ""}
          ${orig ? `<span class="orig">${esc(orig)}</span>` : ""}
        </div>
        ${it.summary ? `<p class="card-summary">${esc(it.summary)}</p>` : ""}
        <div class="card-meta">
          <span class="source-tag">${esc(it.source || "来源")}</span>
          <span>${timeAgo(it.publishedAt)}</span>
          <span class="arrow">↗</span>
        </div>
      </a>`;
  }

  function subBlock(sub) {
    const items = sub.items.filter(matchesSearch);
    if (!items.length && state.search) return "";
    return `
      <div class="sub-block">
        <div class="sub-title">
          ${esc(sub.name)}
          <span class="count">${items.length} 条</span>
          ${sub.stale ? '<span class="stale-badge">沿用旧数据</span>' : ""}
        </div>
        ${items.length ? items.map(itemCard).join("") : '<div class="empty">暂无数据</div>'}
      </div>`;
  }

  function categorySection(cat) {
    return `
      <section class="section" data-cat="${esc(cat.id)}">
        <div class="section-head">
          <span class="icon">${cat.icon}</span> ${esc(cat.name)}
        </div>
        ${cat.subs.map(subBlock).join("")}
      </section>`;
  }

  function renderNews() {
    const cats = state.data.news.categories;
    if (state.categoryId === "all") {
      return cats.map(categorySection).join("");
    }
    const cat = cats.find((c) => c.id === state.categoryId);
    if (!cat) return '<div class="empty">板块不存在</div>';
    const chips = ["all", ...cat.subs.map((s) => s.id)]
      .map((id) => {
        const label = id === "all" ? "全部" : cat.subs.find((s) => s.id === id).name;
        return `<span class="chip ${state.subId === id ? "active" : ""}" data-sub="${esc(id)}">${esc(label)}</span>`;
      }).join("");
    const subs = state.subId === "all" ? cat.subs : cat.subs.filter((s) => s.id === state.subId);
    return `
      <section class="section">
        <div class="section-head">
          <span class="icon">${cat.icon}</span> ${esc(cat.name)}
        </div>
        <div class="sub-chips">${chips}</div>
        ${subs.map(subBlock).join("")}
      </section>`;
  }

  // ---------- 渲染: 天气 ----------
  function weatherCard(c) {
    if (!c.current) {
      return `<div class="weather-card"><div class="empty">${esc(c.name)} 暂无数据</div></div>`;
    }
    const days = (c.daily || []).slice(0, 7).map((d) => `
      <div class="wday" title="${esc(d.text)}">
        <span class="d-ico">${d.icon}</span>
        <div>${esc(String(d.date).slice(5))}</div>
        <div class="d-hi">${d.tmax}°</div>
        <div class="d-lo">${d.tmin}°</div>
      </div>`).join("");
    return `
      <div class="weather-card">
        <div class="weather-top">
          <div class="weather-now">
            <span class="weather-icon">${c.current.icon}</span>
            <div>
              <div class="weather-temp">${c.current.temp}°</div>
              <div class="weather-desc">${esc(c.current.text)}</div>
            </div>
          </div>
          <div class="weather-detail">
            <div>体感 ${c.current.apparent}°</div>
            <div>湿度 ${c.current.humidity}%</div>
            <div>风 ${c.current.wind} km/h</div>
          </div>
        </div>
        <div class="weather-days">${days}</div>
        ${c.stale ? '<div class="stale-badge" style="margin-top:10px">沿用旧数据</div>' : ""}
      </div>`;
  }

  function renderWeather() {
    return `
      <section class="section">
        <div class="section-head"><span class="icon">🌦️</span> 天气预报</div>
        <div class="weather-grid">${state.data.weather.cities.map(weatherCard).join("")}</div>
      </section>`;
  }

  // ---------- 渲染: 热搜 ----------
  function hotItem(it) {
    const mt = it.machineTranslated && it.titleZh;
    const mainTitle = mt ? it.titleZh : it.title;
    const orig = mt && it.title !== it.titleZh ? it.title : null;
    return `
      <li class="hot-item">
        <span class="hot-rank ${it.rank <= 3 ? "top" : ""}">${it.rank}</span>
        <div class="hot-title">
          <a href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">
            <span class="zh">${esc(mainTitle)}</span>
            ${orig ? `<span class="orig">${esc(orig)}</span>` : ""}
          </a>
        </div>
        ${mt ? '<span class="mt-badge">机翻</span>' : ""}
        ${it.hot ? `<span class="hot-val">${esc(it.hot)}</span>` : ""}
      </li>`;
  }

  function renderHot() {
    const plats = state.data.hot.platforms;
    const cur = state.platformId || plats[0]?.id;
    const tabs = plats.map((p) =>
      `<span class="chip ${cur === p.id ? "active" : ""}" data-plat="${esc(p.id)}">${esc(p.name)}${p.stale ? " ⚠️" : ""}</span>`).join("");
    const plat = plats.find((p) => p.id === cur);
    const items = plat ? plat.items.filter(matchesSearch) : [];
    const list = plat && plat.kind === "intl"
      ? `<p style="font-size:12px;color:var(--text-faint);margin:0 0 8px">国外热榜 · 标题已机翻, 可点进原文</p>` : "";
    return `
      <section class="section">
        <div class="section-head"><span class="icon">🔥</span> 全平台热搜</div>
        <div class="hot-tabs">${tabs}</div>
        ${plat ? `<div class="panel">${list}<ul class="hot-list">${items.map(hotItem).join("") || '<li class="empty">暂无数据</li>'}</ul></div>`
              : '<div class="empty">暂无热搜数据</div>'}
      </section>`;
  }

  // ---------- 主渲染 ----------
  function render() {
    if (!state.data) return;
    let html = "";
    if (state.view === "weather") html = renderWeather();
    else if (state.view === "hot") html = renderHot();
    else html = renderNews();
    main.innerHTML = html;
  }

  function renderNav() {
    const cats = state.data.news.categories;
    const items = [
      { id: "all", label: "全部", view: "news", categoryId: "all" },
      ...cats.map((c) => ({ id: c.id, label: `${c.icon} ${c.name}`, view: "news", categoryId: c.id })),
      { id: "weather", label: "🌦️ 天气", view: "weather" },
      { id: "hot", label: "🔥 热搜", view: "hot" },
    ];
    navEl.innerHTML = items.map((it) => {
      const active = state.view === it.view && (it.view !== "news" || state.categoryId === it.categoryId);
      return `<button class="nav-btn ${active ? "active" : ""}" data-nav="${esc(it.id)}">${esc(it.label)}</button>`;
    }).join("");
  }

  // ---------- 事件 ----------
  navEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-btn");
    if (!btn) return;
    const id = btn.dataset.nav;
    if (id === "all") { state.view = "news"; state.categoryId = "all"; state.subId = "all"; }
    else if (id === "weather") state.view = "weather";
    else if (id === "hot") state.view = "hot";
    else { state.view = "news"; state.categoryId = id; state.subId = "all"; }
    renderNav(); render();
  });

  main.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip[data-sub]");
    if (chip) { state.subId = chip.dataset.sub; render(); }
    const plat = e.target.closest(".chip[data-plat]");
    if (plat) { state.platformId = plat.dataset.plat; render(); }
  });

  searchEl.addEventListener("input", () => { state.search = searchEl.value; render(); });

  // ---------- 主题 ----------
  function applyTheme() {
    let t = localStorage.getItem("infodiff-theme");
    if (t !== "dark" && t !== "light") {
      t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.dataset.theme = t;
    themeBtn.textContent = t === "dark" ? "☀️" : "🌙";
  }
  themeBtn.addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme;
    const next = cur === "dark" ? "light" : "dark";
    localStorage.setItem("infodiff-theme", next);
    applyTheme();
  });
  applyTheme();

  // ---------- 加载 ----------
  async function load() {
    try {
      const [meta, news, weather, hot] = await Promise.all([
        fetch("./data/meta.json").then((r) => r.json()),
        fetch("./data/news.json").then((r) => r.json()),
        fetch("./data/weather.json").then((r) => r.json()),
        fetch("./data/hot.json").then((r) => r.json()),
      ]);
      state.data = { meta, news, weather, hot };
      const t = new Date(meta.updatedAt);
      updatedAtEl.textContent = `更新于 ${isNaN(t) ? meta.updatedAt : t.toLocaleString("zh-CN", { hour12: false })} · ${meta.newsCount || 0} 条新闻`;
      renderNav();
      render();
    } catch (err) {
      main.innerHTML = `<div class="empty">数据加载失败: ${esc(err.message)}<br>请先运行 node fetch.mjs 生成数据。</div>`;
    }
  }
  load();
})();
