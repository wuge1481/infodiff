// ============================================================
// 每日信息差看板 · 配置
// 所有信源 / 分类 / 城市都集中在这里, 方便随时增删改
// ============================================================

// ---- 天气城市 ----
export const CITIES = [
  { name: "珠海", lat: 22.2707, lon: 113.5767 },
  { name: "澳门", lat: 22.1987, lon: 113.5439 },
];

// ---- 天气代码 → 中文 + emoji (WMO / Open-Meteo) ----
export const WEATHER_CODES = {
  0:  { text: "晴",     icon: "☀️" },
  1:  { text: "大部晴", icon: "🌤️" },
  2:  { text: "多云",   icon: "⛅" },
  3:  { text: "阴",     icon: "☁️" },
  45: { text: "雾",     icon: "🌫️" },
  48: { text: "雾凇",   icon: "🌫️" },
  51: { text: "毛毛雨", icon: "🌦️" },
  53: { text: "毛毛雨", icon: "🌦️" },
  55: { text: "毛毛雨", icon: "🌦️" },
  56: { text: "冻毛毛雨", icon: "🌧️" },
  57: { text: "冻毛毛雨", icon: "🌧️" },
  61: { text: "小雨",   icon: "🌧️" },
  63: { text: "中雨",   icon: "🌧️" },
  65: { text: "大雨",   icon: "🌧️" },
  66: { text: "冻雨",   icon: "🌧️" },
  67: { text: "冻雨",   icon: "🌧️" },
  71: { text: "小雪",   icon: "🌨️" },
  73: { text: "中雪",   icon: "🌨️" },
  75: { text: "大雪",   icon: "❄️" },
  77: { text: "雪粒",   icon: "❄️" },
  80: { text: "阵雨",   icon: "🌦️" },
  81: { text: "阵雨",   icon: "🌦️" },
  82: { text: "强阵雨", icon: "🌧️" },
  85: { text: "阵雪",   icon: "🌨️" },
  86: { text: "阵雪",   icon: "🌨️" },
  95: { text: "雷雨",   icon: "⛈️" },
  96: { text: "雷雨冰雹", icon: "⛈️" },
  99: { text: "雷雨冰雹", icon: "⛈️" },
};

// ---- 新闻分类: 大类 → 子类 → 信源 ----
// 信源两种写法:
//   { name, url }                  直接 RSS
//   { name, gnews: "关键词", hl, gl }  Google 新闻 RSS(稳定、自动聚合)
export const CATEGORIES = [
  {
    id: "tech", name: "科技", icon: "🤖",
    subs: [
      {
        id: "ai", name: "AI / 人工智能",
        feeds: [
          { name: "机器之心", url: "https://www.jiqizhixin.com/rss" },
          { name: "量子位", url: "https://www.qbitai.com/feed" },
          { name: "MIT 科技评论", url: "https://www.technologyreview.com/feed/" },
          { name: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/" },
          { name: "谷歌新闻·AI", gnews: "人工智能 OR AI", hl: "zh-CN", gl: "CN" },
        ],
      },
      {
        id: "cs", name: "计算机 / 互联网 / 软件",
        feeds: [
          { name: "InfoQ 中文", url: "https://www.infoq.cn/feed" },
          { name: "36氪", url: "https://36kr.com/feed" },
          { name: "Hacker News", url: "https://hnrss.org/frontpage" },
          { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
          { name: "谷歌新闻·互联网", gnews: "互联网 OR 计算机 OR 软件", hl: "zh-CN", gl: "CN" },
        ],
      },
      {
        id: "bio", name: "生物 / 生命科学",
        feeds: [
          { name: "Nature", url: "https://www.nature.com/nature.rss" },
          { name: "ScienceDaily·生物", url: "https://www.sciencedaily.com/rss/plants_animals/biology.xml" },
          { name: "谷歌新闻·生物", gnews: "生物 OR 生命科学 OR 基因", hl: "zh-CN", gl: "CN" },
        ],
      },
      {
        id: "chem", name: "化学 / 材料",
        feeds: [
          { name: "Nature Chemistry", url: "https://www.nature.com/nchem.rss" },
          { name: "Chemistry World", url: "https://www.chemistryworld.com/rss" },
          { name: "谷歌新闻·化学", gnews: "化学 OR 材料 OR 新材料", hl: "zh-CN", gl: "CN" },
        ],
      },
      {
        id: "pharma", name: "药物 / 药理 / 医疗",
        feeds: [
          { name: "丁香园", url: "https://www.dxy.cn/bbs/newweb/rss" },
          { name: "STAT 健康", url: "https://www.statnews.com/feed/" },
          { name: "Fierce Pharma", url: "https://www.fiercepharma.com/rss/xml" },
          { name: "谷歌新闻·医药", gnews: "药物 OR 医药 OR 新药 OR 临床", hl: "zh-CN", gl: "CN" },
        ],
      },
    ],
  },
  {
    id: "science", name: "实证 / 科学", icon: "🔬",
    subs: [
      {
        id: "research", name: "研究 / 数据 / 核查",
        feeds: [
          { name: "ScienceDaily 头条", url: "https://www.sciencedaily.com/rss/top/science.xml" },
          { name: "Science News", url: "https://www.sciencenews.org/feed" },
          { name: "科学网", url: "https://news.sciencenet.cn/rss.aspx" },
          { name: "谷歌新闻·科学", gnews: "科学研究 OR 论文 OR 数据", hl: "zh-CN", gl: "CN" },
        ],
      },
    ],
  },
  {
    id: "military", name: "战争 / 军事", icon: "🛰️",
    subs: [
      {
        id: "war", name: "国际冲突 / 地缘 / 国防",
        feeds: [
          { name: "观察者网", url: "https://www.guancha.cn/rss" },
          { name: "ISW 战争研究所", url: "https://www.understandingwar.org/rss.xml" },
          { name: "Defense News", url: "https://www.defensenews.com/arc/outboundfeeds/rss/" },
          { name: "谷歌新闻·军事", gnews: "军事 OR 战争 OR 地缘 OR 国防", hl: "zh-CN", gl: "CN" },
        ],
      },
    ],
  },
  {
    id: "gaming", name: "电竞 / 游戏", icon: "🎮",
    subs: [
      {
        id: "esports", name: "赛事 / 新游 / 行业",
        feeds: [
          { name: "游研社", url: "https://www.yystv.cn/rss" },
          { name: "Polygon", url: "https://www.polygon.com/rss/index.xml" },
          { name: "IGN", url: "https://feeds.ign.com/ign/all" },
          { name: "谷歌新闻·电竞", gnews: "电竞 OR 游戏 OR 新游", hl: "zh-CN", gl: "CN" },
        ],
      },
    ],
  },
  {
    id: "digital", name: "数码", icon: "📱",
    subs: [
      {
        id: "hardware", name: "手机 / 电脑 / 硬件",
        feeds: [
          { name: "爱范儿", url: "https://www.ifanr.com/feed" },
          { name: "少数派", url: "https://sspai.com/feed" },
          { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
          { name: "Engadget", url: "https://www.engadget.com/rss.xml" },
          { name: "谷歌新闻·数码", gnews: "数码 OR 手机 OR 电脑 OR 硬件", hl: "zh-CN", gl: "CN" },
        ],
      },
    ],
  },
  {
    id: "finance", name: "财经 / 宏观", icon: "📈",
    subs: [
      {
        id: "macro", name: "宏观 / 市场",
        feeds: [
          { name: "华尔街见闻", url: "https://wallstreetcn.com/rss/news/global" },
          { name: "FT中文网", url: "https://www.ftchinese.com/rss/feed" },
          { name: "谷歌新闻·财经", gnews: "财经 OR 宏观经济 OR 市场", hl: "zh-CN", gl: "CN" },
        ],
      },
    ],
  },
  {
    id: "society", name: "社会 / 民生", icon: "🏙️",
    subs: [
      {
        id: "people", name: "民生 / 热点",
        feeds: [
          { name: "谷歌新闻·民生", gnews: "民生 OR 社会 OR 热点", hl: "zh-CN", gl: "CN" },
        ],
      },
    ],
  },
  {
    id: "politics", name: "时政", icon: "🏛️",
    subs: [
      {
        id: "current", name: "时政 / 要闻",
        feeds: [
          { name: "BBC 中文", url: "https://feeds.bbci.co.uk/zhongwen/simp/rss.xml" },
          { name: "谷歌新闻·时政", gnews: "时政 OR 要闻 OR 政策", hl: "zh-CN", gl: "CN" },
        ],
      },
    ],
  },
];

// ---- 热搜平台 ----
// kind: "cn" 中文平台 | "intl" 国外平台(标题会机翻成中文)
export const HOT_PLATFORMS = [
  { id: "weibo", name: "微博热搜", kind: "cn" },
  { id: "baidu", name: "百度热搜", kind: "cn" },
  { id: "zhihu", name: "知乎热榜", kind: "cn" },
  { id: "bilibili", name: "B站热门", kind: "cn" },
  { id: "toutiao", name: "今日头条", kind: "cn" },
  { id: "reddit", name: "Reddit 热帖", kind: "intl" },
  { id: "hn", name: "Hacker News", kind: "intl" },
  { id: "gtrends", name: "谷歌趋势", kind: "intl" },
];

// ---- 抓取参数 ----
export const OPTIONS = {
  perSubMax: 12,       // 每个子类最多保留多少条
  perHotMax: 15,       // 每个热搜平台最多保留多少条
  fetchTimeoutMs: 12000, // 单个请求超时
  translateMax: 200,   // 每次运行最多翻译多少条(避免触发限流)
  translateConcurrency: 4,
  requestDelayMs: 250, // 请求间小间隔, 礼貌抓取
  staleHours: 48,      // 超过该小时数的旧条目会被替换掉
};
