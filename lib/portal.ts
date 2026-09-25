export type Category = {
  id: string
  name: string
  color: string
  icon: "file" | "wrench" | "game" | "shield"
}

export type PortalTool = {
  id: string
  name: string
  description: string
  url: string
  categoryId: string
  cover: "amber" | "sky" | "violet" | "mint" | "rose" | "blue"
  icon: "file" | "calculator" | "sparkles" | "gamepad" | "palette" | "database"
  favorite: boolean
  published: boolean
  lastUsedAt?: string
}

export type PortalData = {
  categories: Category[]
  tools: PortalTool[]
}

export const seedCategories: Category[] = [
  { id: "docs", name: "เอกสาร", color: "#f2b84b", icon: "file" },
  { id: "tools", name: "เครื่องมือ", color: "#5da9e9", icon: "wrench" },
  { id: "games", name: "เกม", color: "#9b82e8", icon: "game" },
  { id: "admin", name: "Admin", color: "#f08080", icon: "shield" },
]

export const seedTools: PortalTool[] = [
  {
    id: "document-studio",
    name: "Document Studio",
    description: "สร้างและจัดการเอกสารที่ใช้ประจำ",
    url: "https://example.com/document-studio",
    categoryId: "docs",
    cover: "amber",
    icon: "file",
    favorite: true,
    published: true,
    lastUsedAt: "2026-09-23T08:30:00.000Z",
  },
  {
    id: "focus-timer",
    name: "Focus Timer",
    description: "จับเวลาทำงานและพักอย่างเป็นจังหวะ",
    url: "https://example.com/focus-timer",
    categoryId: "tools",
    cover: "sky",
    icon: "calculator",
    favorite: true,
    published: true,
    lastUsedAt: "2026-09-22T14:15:00.000Z",
  },
  {
    id: "puzzle-room",
    name: "Puzzle Room",
    description: "เกมสั้น ๆ สำหรับพักสมองระหว่างงาน",
    url: "https://example.com/puzzle-room",
    categoryId: "games",
    cover: "violet",
    icon: "sparkles",
    favorite: true,
    published: true,
  },
  {
    id: "admin-console",
    name: "Admin Console",
    description: "จัดการเครื่องมือและหมวดหมู่ใน Portal",
    url: "https://example.com/admin-console",
    categoryId: "admin",
    cover: "mint",
    icon: "gamepad",
    favorite: true,
    published: true,
    lastUsedAt: "2026-09-18T10:00:00.000Z",
  },
]

export const seedData: PortalData = {
  categories: seedCategories,
  tools: seedTools,
}

export function isSafeHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

export function upsertTool(tools: PortalTool[], tool: PortalTool) {
  const existing = tools.findIndex((item) => item.id === tool.id)
  if (existing === -1) return [tool, ...tools]
  return tools.map((item) => (item.id === tool.id ? tool : item))
}

export function removeCategory(data: PortalData, categoryId: string) {
  if (data.tools.some((tool) => tool.categoryId === categoryId)) {
    return { ok: false as const, reason: "category_in_use" as const, data }
  }
  return {
    ok: true as const,
    data: {
      ...data,
      categories: data.categories.filter((category) => category.id !== categoryId),
    },
  }
}

export function recentlyUsed(tools: PortalTool[]) {
  return tools
    .filter((tool) => Boolean(tool.lastUsedAt))
    .toSorted((a, b) =>
      (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? ""),
    )
}

export function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0E00-\u0E7F]+/g, "-")
    .replace(/^-|-$/g, "")
  return slug || `item-${Date.now()}`
}
