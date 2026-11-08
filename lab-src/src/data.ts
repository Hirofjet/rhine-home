import content from "../content/archives.json" with { type: "json" };

export interface ArchiveRecord {
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
  replies?: {
    author: string;
    authorId?: number;
    authorTitle?: string;
    authorLevel?: number;
    content: string;
    createdAt?: string;
  }[];
  tags?: string[];
  content?: Record<string, unknown>;
  source: string;
}

export const PAGE_SIZE = 8;
export const records: ArchiveRecord[] = content.records;
export const categories = ["全部档案", ...content.categories];
export const archiveColumns = content.columns;
const columnPages = new Map<number, number>();

/** 当前列的全部档案索引（不按页截断） */
export function allColumnFiles(lane: number) {
  const category = archiveColumns[lane];
  if (!category) return [];
  return records
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => record.category === category)
    .map(({ index }) => index);
}

export function columnPageCount(lane: number) {
  return Math.max(1, Math.ceil(allColumnFiles(lane).length / PAGE_SIZE));
}

export function columnPage(lane: number) {
  return Math.min(
    Math.max(0, columnPages.get(lane) ?? 0),
    columnPageCount(lane) - 1,
  );
}

export function setColumnPage(lane: number, page: number) {
  columnPages.set(lane, Math.max(0, Math.min(page, columnPageCount(lane) - 1)));
}

export function resetArchivePages() {
  columnPages.clear();
}

/** 当前页的 8 个档案索引 */
export function columnFiles(lane: number) {
  const page = columnPage(lane);
  return allColumnFiles(lane).slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
}

export function fileLocation(index: number) {
  const lane = archiveColumns.indexOf(records[index].category);
  const all = allColumnFiles(lane);
  const offset = Math.max(0, all.indexOf(index));
  const page = Math.floor(offset / PAGE_SIZE);
  setColumnPage(lane, page);
  const row = 12 + (offset % PAGE_SIZE);
  return { lane, row, slot: lane * 32 + row };
}

export function fileAtSlot(slot: number) {
  const files = columnFiles(Math.floor(slot / 32));
  return files[Math.max(0, Math.min(files.length - 1, (slot % 32) - 12))];
}
