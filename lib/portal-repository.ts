import type { Category, PortalData, PortalTool } from "@/lib/portal"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "")
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(url && key)

function headers(token?: string) {
  return {
    apikey: key ?? "",
    Authorization: `Bearer ${token ?? key ?? ""}`,
    "Content-Type": "application/json",
  }
}

async function request<T>(path: string, init?: RequestInit, token?: string) {
  if (!url || !key) throw new Error("Supabase is not configured")
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: { ...headers(token), ...(init?.headers ?? {}) },
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || `Request failed (${response.status})`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

type CategoryRow = Category & { sort_order?: number }
type ToolRow = Omit<PortalTool, "categoryId" | "lastUsedAt"> & {
  category_id: string
  last_used_at?: string
}

export async function loadRemoteData(token?: string): Promise<PortalData> {
  const [categories, tools] = await Promise.all([
    request<CategoryRow[]>("/rest/v1/categories?select=id,name,color,icon&order=sort_order", undefined, token),
    request<ToolRow[]>("/rest/v1/tools?select=id,name,description,url,category_id,cover,icon,favorite,published,last_used_at&order=created_at", undefined, token),
  ])
  return {
    categories,
    tools: tools.map(({ category_id, last_used_at, ...tool }) => ({
      ...tool,
      categoryId: category_id,
      lastUsedAt: last_used_at,
    })),
  }
}

export async function signInAdmin(email: string, password: string) {
  const result = await request<{ access_token: string }>(
    "/auth/v1/token?grant_type=password",
    { method: "POST", body: JSON.stringify({ email, password }) },
  )
  return result.access_token
}

function toolRow(tool: PortalTool) {
  return {
    id: tool.id,
    name: tool.name,
    description: tool.description,
    url: tool.url,
    category_id: tool.categoryId,
    cover: tool.cover,
    icon: tool.icon,
    favorite: tool.favorite,
    published: tool.published,
    last_used_at: tool.lastUsedAt ?? null,
  }
}

export async function saveRemoteTool(tool: PortalTool, token: string) {
  await request(
    "/rest/v1/tools?on_conflict=id",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(toolRow(tool)),
    },
    token,
  )
}

export async function deleteRemoteTool(id: string, token: string) {
  await request(`/rest/v1/tools?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" }, token)
}

export async function saveRemoteCategory(category: Category, token: string) {
  await request(
    "/rest/v1/categories?on_conflict=id",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(category),
    },
    token,
  )
}

export async function deleteRemoteCategory(id: string, token: string) {
  await request(`/rest/v1/categories?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" }, token)
}
