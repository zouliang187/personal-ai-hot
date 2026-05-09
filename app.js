const state = {
  data: null,
  view: "curated",
  category: "all",
  query: ""
};

const labels = {
  curated: ["精选信息", "值得优先看的 AI 动态"],
  timeline: ["完整时间线", "按时间浏览所有监控条目"],
  digest: ["AI 日报", "按主题整理的今日重点"],
  sources: ["信源管理", "当前监控的来源与权重"]
};

const categories = {
  model: "模型",
  product: "产品",
  industry: "行业",
  research: "研究"
};

const content = document.querySelector("#content");
const statusEl = document.querySelector("#status");
const searchInput = document.querySelector("#searchInput");

function formatDate(iso) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}

function escapeHtml(value = "") {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function filteredItems(items) {
  const q = state.query.trim().toLowerCase();
  return items.filter((item) => {
    const matchCategory = state.category === "all" || item.category === state.category;
    const matchQuery = !q || `${item.title} ${item.summary} ${item.source}`.toLowerCase().includes(q);
    return matchCategory && matchQuery;
  });
}

function itemCard(item) {
  const related = item.related?.length
    ? `<div class="related"><span>相关报道</span>${item.related.map((entry) => `<a href="${entry.url}" target="_blank" rel="noreferrer">${escapeHtml(entry.source)}</a>`).join("")}</div>`
    : "";
  return `
    <article class="item">
      <div class="score" title="综合质量分">${item.score}</div>
      <div>
        <h2><a href="${item.url}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a></h2>
        <p class="summary">${escapeHtml(item.summary || "暂无摘要，点击标题查看原文。")}</p>
        <div class="meta">
          <span class="tag">${categories[item.category] || item.category}</span>
          <span class="tag tier">${item.tier}</span>
          <span>${escapeHtml(item.source)}</span>
          <span>${formatDate(item.publishedAt)}</span>
        </div>
        ${related}
      </div>
    </article>
  `;
}

function renderFeed(items) {
  const visible = filteredItems(items);
  if (!visible.length) {
    content.innerHTML = `<div class="status">当前筛选下没有结果。</div>`;
    return;
  }
  content.innerHTML = `<div class="feed">${visible.map(itemCard).join("")}</div>`;
}

function renderDigest() {
  const sections = state.data.digestSections;
  content.innerHTML = `
    <div class="digest-grid">
      ${sections.map((section) => `
        <section class="digest-section">
          <h2>${categories[section.category] || section.category}</h2>
          ${section.items.length ? `<ol>${section.items.map((item) => `<li><a href="${item.url}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a></li>`).join("")}</ol>` : `<p class="summary">暂无足够高分条目。</p>`}
        </section>
      `).join("")}
    </div>
  `;
}

function renderSources() {
  content.innerHTML = `
    <div class="source-grid">
      ${state.data.sources.map((source) => `
        <section class="source-card">
          <h2>${escapeHtml(source.name)}</h2>
          <div class="meta">
            <span class="tag tier">${source.tier}</span>
            <span class="tag">${escapeHtml(source.kind)}</span>
            <span class="tag">${categories[source.category] || source.category}</span>
          </div>
          <p><a href="${source.url}" target="_blank" rel="noreferrer">${escapeHtml(source.url)}</a></p>
        </section>
      `).join("")}
    </div>
  `;
}

function render() {
  const [label, title] = labels[state.view];
  document.querySelector("#viewLabel").textContent = label;
  document.querySelector("#viewTitle").textContent = title;
  statusEl.textContent = state.data.errors?.length ? `部分信源暂时不可用：${state.data.errors.join("；")}` : "";

  if (state.view === "curated") renderFeed(state.data.curated);
  if (state.view === "timeline") renderFeed([...state.data.items].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)));
  if (state.view === "digest") renderDigest();
  if (state.view === "sources") renderSources();
}

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(".tab.is-active")?.classList.remove("is-active");
    button.classList.add("is-active");
    state.view = button.dataset.view;
    render();
  });
});

document.querySelectorAll(".pill").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(".pill.is-active")?.classList.remove("is-active");
    button.classList.add("is-active");
    state.category = button.dataset.category;
    render();
  });
});

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

const response = await fetch("data/news.json", { cache: "no-store" });
state.data = await response.json();

document.querySelector("#curatedCount").textContent = state.data.curated.length;
document.querySelector("#sourceCount").textContent = state.data.sources.length;
document.querySelector("#updatedAt").textContent = formatDate(state.data.generatedAt);

render();
