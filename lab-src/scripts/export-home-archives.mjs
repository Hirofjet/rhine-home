import { writeFile } from "node:fs/promises";

const base = process.env.HOME_API ?? "http://127.0.0.1:3001";
const modules = [
  { key: "articles", label: "文章", en: "ARTICLES" },
  { key: "photos", label: "照片", en: "PHOTOS" },
  { key: "videos", label: "视频", en: "VIDEOS" },
  { key: "projects", label: "项目库", en: "PROJECTS" },
  { key: "logs", label: "日志", en: "LOGS" },
];

const fallback = {
  articles: ["关于我", "技术随笔", "项目复盘", "阅读记录"],
  photos: ["档案照片", "生活切片", "实验室记录", "旅行影像"],
  videos: ["项目演示", "动态记录", "实验片段", "影像档案"],
  projects: ["RHINE//HOME", "组合终端", "档案系统", "个人工具"],
  logs: ["今日记录", "开发日志", "研究日志", "阶段总结"],
};

const records = [];
const categories = modules.map((item) => item.label);

for (const [moduleIndex, module] of modules.entries()) {
  let items = [];
  try {
    const response = await fetch(`${base}/api/content/${module.key}?t=${Date.now()}`);
    if (response.ok) {
      const data = await response.json();
      items = Array.isArray(data.items) ? data.items : [];
    }
  } catch {
    items = [];
  }

  const mapped = items.map((item) => ({
    title:
      item.title ?? item.name ?? item.code ?? `${module.label}档案`,
    en: module.en,
    date: item.date ?? item.createdAt ?? "PERSONAL ARCHIVE",
    abstract:
      item.description ??
      item.markdown?.replace(/[#>*_`[\]]/g, "").slice(0, 220) ??
      item.name ??
      "",
    source: item.url ?? item.githubUrl ?? "",
    findings: [
      `模块：${module.label}`,
      `编号：${item.id ?? item.code ?? "—"}`,
      "内容来自 RHINE//HOME 个人档案接口。",
    ],
  }));

  while (mapped.length < 8) {
    const demoIndex = mapped.length;
    mapped.push({
      title: fallback[module.key][demoIndex] ?? `${module.label} ${demoIndex + 1}`,
      en: module.en,
      date: "TEST ARCHIVE",
      abstract: `等待发布内容 · ${module.label}模块测试档案。发布真实内容后重新构建即可替换。`,
      source: "",
      findings: [
        `模块：${module.label}`,
        "当前为测试占位档案",
        "通过后台发布内容后重新构建 3D 档案库",
      ],
    });
  }

  for (const [index, item] of mapped.slice(0, 8).entries()) {
    records.push({
      id: `${String(moduleIndex + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
      title: item.title,
      en: item.en,
      department: module.label,
      category: module.label,
      date: item.date,
      lead: "HIROFJET",
      clearance: "PERSONAL ARCHIVE",
      abstract: item.abstract,
      findings: item.findings,
      source: item.source,
    });
  }
}

await writeFile(
  new URL("../content/archives.json", import.meta.url),
  JSON.stringify({ categories, columns: categories, records }, null, 2),
  "utf8",
);
console.log(`Exported ${records.length} personal archive records.`);
