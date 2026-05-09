import { mkdir, readFile, writeFile } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "text",
  cdataPropName: "text"
});

const sources = JSON.parse(await readFile("sources.json", "utf8"));
const now = new Date();

const importantWords = [
  "gpt", "claude", "gemini", "llama", "model", "agent", "agents", "reasoning",
  "multimodal", "video", "voice", "api", "benchmark", "safety", "open source",
  "release", "launch", "research", "paper", "embedding", "inference", "training",
  "chatgpt", "anthropic", "openai", "google", "deepmind", "microsoft", "nvidia"
];

const categoryRules = [
  ["model", ["gpt", "claude", "gemini", "llama", "model", "reasoning", "benchmark"]],
  ["product", ["api", "app", "launch", "release", "tool", "platform", "agent"]],
  ["research", ["paper", "arxiv", "research", "training", "inference", "dataset"]],
  ["industry", ["policy", "partnership", "funding", "chip", "nvidia", "enterprise"]]
];

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") return value.text || value.href || value["#text"] || "";
  return "";
}

function clean(value) {
  return text(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function linkOf(item) {
  const link = item.link;
  if (typeof link === "string") return link;
  if (Array.isArray(link)) {
    const html = link.find((entry) => entry.rel === "alternate") || link[0];
    return html.href || text(html);
  }
  if (link?.href) return link.href;
  return item.guid || item.id || "";
}

function publishedAt(item) {
  const raw = item.pubDate || item.published || item.updated || item["dc:date"] || item.date;
  const date = new Date(text(raw));
  return Number.isNaN(date.getTime()) ? now : date;
}

function chooseCategory(title, summary, fallback) {
  const body = `${title} ${summary}`.toLowerCase();
  for (const [category, words] of categoryRules) {
    if (words.some((word) => body.includes(word))) return category;
  }
  return fallback || "industry";
}

function scoreItem({ title, summary, source, date, category }) {
  const ageHours = Math.max(0, (now - date) / 36e5);
  const recency = Math.max(0, 16 - Math.floor(ageHours / 24) * 3);
  const tier = source.tier === "T1" ? 24 : source.tier === "T1.5" ? 16 : 9;
  const sourceKind = source.kind === "official" ? 10 : source.kind === "platform" ? 7 : 4;
  const body = `${title} ${summary}`.toLowerCase();
  const keyword = importantWords.reduce((sum, word) => sum + (body.includes(word) ? 3 : 0), 0);
  const categoryBoost = category === "model" ? 8 : category === "product" ? 6 : category === "research" ? 5 : 3;
  const titleSignal = title.length > 18 && title.length < 130 ? 8 : 4;
  return Math.min(99, Math.round(28 + tier + sourceKind + recency + keyword + categoryBoost + titleSignal));
}

function clusterKey(title) {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 9)
    .sort()
    .join("-");
}

async function loadSource(source) {
  const res = await fetch(source.url, {
    headers: { "user-agent": "Personal AI Hub RSS bot (+https://github.com)" }
  });
  if (!res.ok) throw new Error(`${source.name}: ${res.status}`);
  const xml = await res.text();
  const data = parser.parse(xml);
  const channel = data.rss?.channel || data.feed || {};
  const rawItems = asArray(channel.item || channel.entry).slice(0, 20);
  return rawItems.map((item) => {
    const title = clean(item.title);
    const summary = clean(item.description || item.summary || item.content || item["content:encoded"]).slice(0, 280);
    const date = publishedAt(item);
    const category = chooseCategory(title, summary, source.category);
    const base = {
      id: Buffer.from(`${source.name}:${linkOf(item) || title}`).toString("base64url"),
      title,
      summary,
      url: linkOf(item),
      publishedAt: date.toISOString(),
      source: source.name,
      tier: source.tier,
      sourceKind: source.kind,
      category
    };
    return { ...base, score: scoreItem({ ...base, source, date }) };
  }).filter((item) => item.title && item.url);
}

const settled = await Promise.allSettled(sources.map(loadSource));
const errors = settled
  .map((result, index) => result.status === "rejected" ? `${sources[index].name}: ${result.reason.message}` : null)
  .filter(Boolean);
const items = settled
  .flatMap((result) => result.status === "fulfilled" ? result.value : [])
  .sort((a, b) => b.score - a.score || new Date(b.publishedAt) - new Date(a.publishedAt));

const seenUrls = new Set();
const clusters = new Map();
for (const item of items) {
  if (seenUrls.has(item.url)) continue;
  seenUrls.add(item.url);
  const key = clusterKey(item.title) || item.id;
  const cluster = clusters.get(key) || [];
  cluster.push(item);
  clusters.set(key, cluster);
}

const clustered = Array.from(clusters.values()).map((cluster) => {
  cluster.sort((a, b) => {
    const tierRank = { T1: 3, "T1.5": 2, T2: 1 };
    return (tierRank[b.tier] - tierRank[a.tier]) || b.score - a.score;
  });
  return { ...cluster[0], related: cluster.slice(1, 5) };
});

const curated = clustered
  .filter((item) => item.score >= (item.tier === "T1" ? 63 : item.tier === "T1.5" ? 68 : 74))
  .sort((a, b) => b.score - a.score)
  .slice(0, 60);

const digestSections = ["model", "product", "industry", "research"].map((category) => ({
  category,
  items: curated.filter((item) => item.category === category).slice(0, 5)
}));

await mkdir("data", { recursive: true });
await writeFile("data/news.json", JSON.stringify({
  generatedAt: now.toISOString(),
  sources,
  errors,
  items: clustered.slice(0, 120),
  curated,
  digestSections
}, null, 2));

console.log(`Generated ${clustered.length} items, ${curated.length} curated.`);
if (errors.length) console.log(`Skipped feeds: ${errors.join("; ")}`);
