type HomeRecord = {
  id: string;
  title: string;
  en: string;
  department: string;
  category: string;
  date: string;
  lead: string;
  clearance: string;
  abstract: string;
  findings: string[];
  replies?: { author: string; content: string; createdAt?: string }[];
  tags?: string[];
  content?: Record<string, unknown>;
  source: string;
};

const modules = [
  { key: "logs", label: "日志", en: "LOGS" },
  { key: "articles", label: "文章", en: "ARTICLES" },
  { key: "photos", label: "照片", en: "PHOTOS" },
  { key: "videos", label: "视频", en: "VIDEOS" },
  { key: "projects", label: "项目库", en: "PROJECTS" },
];

const api = (path: string) => `${location.origin}${path}?t=${Date.now()}`;

async function readModule(key: string) {
  try {
    const response = await fetch(api(`/api/content/${key}`));
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

function asText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function recordFor(module: (typeof modules)[number], item: any, index: number): HomeRecord {
  return {
    id: `${String(modules.indexOf(module) + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
    title: asText(item.title ?? item.name ?? item.code, `${module.label}档案`).slice(0, 80),
    en: module.en,
    department: module.label,
    category: module.label,
    date: asText(item.date ?? item.createdAt, "PERSONAL ARCHIVE"),
    lead: "HIROFJET",
    clearance: "PERSONAL ARCHIVE",
    abstract: asText(
      item.description,
      asText(item.markdown).replace(/[#>*_`[\]]/g, "").slice(0, 260),
    ).slice(0, 420),
    findings: [
      `模块：${module.label}`,
      `编号：${asText(item.id ?? item.code, "—")}`,
      "内容来自 RHINE//HOME 个人档案接口。",
    ],
    tags: Array.isArray(item.tags) ? item.tags.map((tag: unknown) => asText(tag)).filter(Boolean) : [],
    content: item,
    source: "",
  };
}

async function homeArchiveRecords(): Promise<HomeRecord[]> {
  try {
    const response = await fetch(api("/api/site/home"));
    if (!response.ok) return [];
    const data = await response.json();
    const profile = data.profile;
    if (!profile) return [];
    const sample = profile.codeName === "SAMPLE";
    const base = [
      {
        title: sample ? "HIROFJET" : profile.realName || profile.codeName,
        abstract: sample ? "个人主页档案已接入 RHINE LAB。登录后可在后台主页资料中修改内容。" : profile.intro,
        findings: [
          `代号：${sample ? "HIROFJET" : profile.codeName}`,
          `职业：${profile.occupation}`,
          `组织：${profile.affiliation}`,
        ],
      },
      ...(profile.dossier ?? []).map((text: string, index: number) => ({
        title: `个人档案 ${String(index + 1).padStart(2, "0")}`,
        abstract: text,
        findings: [`模块：主页`, `档案序号：${index + 1}`],
      })),
    ];
    while (base.length < 8) {
      base.push({
        title: "个人档案待补全",
        abstract: "在后台「主页资料」中补充档案内容后，这里会同步显示。",
        findings: ["模块：主页"],
      });
    }
    return base.slice(0, 8).map((item, index) => ({
      id: `00-${String(index + 1).padStart(2, "0")}`,
      title: item.title,
      en: "HOME / PROFILE",
      department: "主页",
      category: "主页",
      date: profile.status || "ACTIVE",
      lead: sample ? "HIROFJET" : profile.codeName,
      clearance: "PERSONAL FILE",
      abstract: item.abstract || "",
      findings: item.findings,
      source: "",
    }));
  } catch {
    return Array.from({ length: 8 }, (_, index) => ({
      id: `00-${String(index + 1).padStart(2, "0")}`,
      title: index === 0 ? "HIROFJET" : `个人档案 ${String(index).padStart(2, "0")}`,
      en: "HOME / PROFILE",
      department: "主页",
      category: "主页",
      date: "ACTIVE",
      lead: "HIROFJET",
      clearance: "PERSONAL FILE",
      abstract: index === 0 ? "个人主页档案已接入 RHINE LAB。" : "等待后台补充主页资料。",
      findings: ["模块：主页"],
      source: "",
    }));
  }
}

export async function syncHomeArchives() {
  const { records, archiveColumns, categories } = await import("./data");
  const moduleItems = await Promise.all(
    modules.map(async (module) => ({ module, items: await readModule(module.key) })),
  );
  const homeRecords = await homeArchiveRecords();
  void homeRecords;

  const next: HomeRecord[] = [];
  for (const { module, items } of moduleItems) {
    const existing = records.filter((record) => record.category === module.label);
    const list = items.length
      ? items.slice(0, 8).map((item: any, index: number) => recordFor(module, item, index))
      : existing.slice(0, 8);
    while (list.length < 8) {
      list.push(
        recordFor(
          module,
          {
            title: `${module.label}档案位 ${String(list.length + 1).padStart(2, "0")}`,
            description: "等待发布内容后，这里会同步显示。",
          },
          list.length,
        ),
      );
    }
    next.push(...list);
  }

  records.splice(0, records.length, ...next);
  const labels = modules.map((module) => module.label);
  archiveColumns.splice(0, archiveColumns.length, ...labels);
  categories.splice(1, categories.length - 1, ...labels);
  return true;
}

export async function syncLabIdentity() {
  try {
    const response = await fetch(`${location.origin}/api/site/home?t=${Date.now()}`);
    if (!response.ok) return;
    const data = await response.json();
    const profile = data.profile;
    if (!profile) return;
    const name =
      profile.codeName && profile.codeName !== "SAMPLE"
        ? profile.codeName
        : "HIROFJET";
    const display = profile.codeName !== "SAMPLE" ? profile.realName || name : name;
    document.title = `${name} // RHINE LAB`;
    const database = document.querySelector(".welcome-database");
    if (database) database.textContent = `${display} / PERSONAL ARCHIVE`;
    const company = document.querySelector(".welcome-company strong");
    if (company) company.textContent = display;
    const footerName = document.querySelector(".system-footer > span:nth-child(2)");
    if (footerName) {
      footerName.innerHTML = `${name} <i>／</i> <span id="clock">${new Date().toLocaleTimeString("en-GB")}</span>`;
    }
    const settingsIntro = document.querySelector(".settings-intro");
    if (settingsIntro) settingsIntro.textContent = `${name} · SESSION AUTHORIZED`;
  } catch {
    /* keep the lab fallback identity */
  }
}

export function watchHomeArchives() {
  watchArchives(false);
}

const forumModules = [
  { key: "forum", label: "论坛", en: "FORUM" },
];

async function readForum() {
  const token = localStorage.getItem("rhine:token") ?? "";
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  try {
    const response = await fetch(`${location.origin}/api/forum/boards?t=${Date.now()}`, { headers });
    if (!response.ok) return { boards: [], posts: new Map<string, any[]>() };
    const data = await response.json();
    const boards = (Array.isArray(data.boards) ? data.boards : []).filter((board: any) => board.canAccess);
    const posts = new Map<string, any[]>();
    await Promise.all(boards.map(async (board: any) => {
      try {
        const res = await fetch(`${location.origin}/api/forum/boards/${encodeURIComponent(board.slug)}?page=1&t=${Date.now()}`, { headers });
        if (!res.ok) return;
        const body = await res.json();
        const visible = (Array.isArray(body.posts) ? body.posts : [])
          .slice()
          .sort((a: any, b: any) => {
            if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
            return String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
          })
          .slice(0, 8);
        await Promise.all(visible.map(async (post: any) => {
          if (!post?.id) return;
          if (Number(post.replyCount ?? 0) === 0) {
            post.replies = [];
            return;
          }
          try {
            const detail = await fetch(`${location.origin}/api/forum/posts/${post.id}?t=${Date.now()}`, { headers });
            if (!detail.ok) return;
            const payload = await detail.json();
            post.replies = Array.isArray(payload.replies) ? payload.replies : [];
          } catch {
            post.replies = [];
          }
        }));
        posts.set(board.slug, visible);
      } catch {
        /* ignore */
      }
    }));
    return { boards, posts };
  } catch {
    return { boards: [], posts: new Map<string, any[]>() };
  }
}

export async function syncForumArchives() {
  const { records, archiveColumns, categories } = await import("./data");
  const { boards, posts } = await readForum();
  if (!boards.length) return false;
  const next: HomeRecord[] = [];
  for (const [boardIndex, board] of boards.slice(0, 8).entries()) {
    const list = (posts.get(board.slug) ?? []).slice(0, 8);
    const mapped: HomeRecord[] = list.length
      ? list.map((post: any, index: number) => ({
          id: `${String(boardIndex + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
          title: post.title ?? "无标题帖子",
          en: board.name,
          department: board.name,
          category: board.name,
          date: post.createdAt ?? "FORUM",
          lead: post.author ?? "UNKNOWN",
          clearance: board.access === "core" ? "CORE BOARD" : board.access === "special" ? "SPECIAL BOARD" : "PUBLIC BOARD",
          abstract: String(post.content ?? post.excerpt ?? "").replace(/[#>*_`[\]]/g, "").slice(0, 260),
          findings: [
            `论坛：${board.name}`,
            `作者：${post.author ?? "—"}`,
            `帖子编号：${post.id ?? "—"}`,
            `回复：${Array.isArray(post.replies) ? post.replies.length : 0} 条`,
          ],
          replies: (Array.isArray(post.replies) ? post.replies : [])
            .slice(0, 24)
            .map((reply: any) => ({
              author: reply.author ?? "—",
              content: String(reply.content ?? "").replace(/[#>*_`[\]]/g, ""),
              createdAt: reply.createdAt ?? "",
            })),
          tags: Array.isArray(post.tags) ? post.tags : [],
          content: post,
          source: "",
        }))
      : [{
          id: `${String(boardIndex + 1).padStart(2, "0")}-01`,
          title: "暂无帖子",
          en: board.name,
          department: board.name,
          category: board.name,
          date: "FORUM",
          lead: "SYSTEM",
          clearance: "EMPTY BOARD",
          abstract: "该论坛暂时没有可读取的帖子。",
          findings: [`论坛：${board.name}`],
          source: "",
        }];
    while (mapped.length < 8) {
      mapped.push({
        id: `${String(boardIndex + 1).padStart(2, "0")}-${String(mapped.length + 1).padStart(2, "0")}`,
        title: "暂无可读取帖子",
        en: board.name,
        department: board.name,
        category: board.name,
        date: "FORUM",
        lead: "SYSTEM",
        clearance: "EMPTY SLOT",
        abstract: "该论坛后续帖子会在这里显示。",
        findings: [`论坛：${board.name}`],
        source: "",
      });
    }
    next.push(...mapped);
  }
  records.splice(0, records.length, ...next);
  archiveColumns.splice(0, archiveColumns.length, ...boards.slice(0, 8).map((board: any) => board.name));
  categories.splice(1, categories.length - 1, "全部论坛", ...boards.slice(0, 8).map((board: any) => board.name));
  return true;
}

export function watchForumArchives() {
  watchArchives(true);
}

function watchArchives(forum: boolean) {
  let signature = "";
  const poll = async () => {
    const data = forum ? await readForum() : await Promise.all(
      modules.map(async (module) => ({ module, items: await readModule(module.key) })),
    );
    const nextSignature = JSON.stringify(data, (_key, value) =>
      value instanceof Map ? [...value.entries()] : value,
    );
    if (signature && nextSignature !== signature) {
      location.reload();
      return;
    }
    signature = nextSignature;
  };
  void poll();
  window.setInterval(poll, 5_000);
}
