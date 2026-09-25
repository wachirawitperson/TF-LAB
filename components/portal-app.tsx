"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { Menu, Moon, Pencil, Plus, Search, Star, Sun, Trash2 } from "lucide-react"
import { useTheme } from "next-themes"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"
import { Toaster } from "@/components/ui/sonner"
import {
  isSafeHttpUrl,
  recentlyUsed,
  removeCategory,
  seedData,
  slugify,
  upsertTool,
  type Category,
  type PortalData,
  type PortalTool,
} from "@/lib/portal"
import {
  deleteRemoteCategory,
  deleteRemoteTool,
  isSupabaseConfigured,
  loadRemoteData,
  saveRemoteCategory,
  saveRemoteTool,
  signInAdmin,
} from "@/lib/portal-repository"

type View =
  | "home"
  | "tools"
  | "categories"
  | "favorites"
  | "recent"
  | "manage-tools"
  | "manage-categories"
  | "settings"

const mainNav: { id: View; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "tools", label: "Tools" },
  { id: "categories", label: "Categories" },
  { id: "favorites", label: "Favorites" },
  { id: "recent", label: "Recently Used" },
]

const adminNav: { id: View; label: string }[] = [
  { id: "manage-tools", label: "Manage Tools" },
  { id: "manage-categories", label: "Manage Categories" },
  { id: "settings", label: "Settings" },
]

const emptyTool: PortalTool = {
  id: "",
  name: "",
  description: "",
  url: "https://",
  categoryId: "tools",
  cover: "amber",
  icon: "sparkles",
  favorite: false,
  published: true,
}

function loadLocal(): PortalData {
  try {
    const stored = localStorage.getItem("tf-lab.portal-data")
    return stored ? (JSON.parse(stored) as PortalData) : seedData
  } catch {
    return seedData
  }
}

function isAdminView(view: View) {
  return view === "manage-tools" || view === "manage-categories" || view === "settings"
}

export function PortalApp() {
  const [view, setView] = useState<View>("home")
  const [data, setData] = useState<PortalData>(() => isSupabaseConfigured ? seedData : loadLocal())
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [loadError, setLoadError] = useState("")
  const [adminToken, setAdminToken] = useState("")
  const [demoAdmin, setDemoAdmin] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    let active = true
    if (!isSupabaseConfigured) {
      return
    }
    loadRemoteData(adminToken || undefined)
      .then((next) => active && setData(next))
      .catch(() => active && setLoadError("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [adminToken])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      localStorage.setItem("tf-lab.portal-data", JSON.stringify(data))
    }
  }, [data])

  const visibleTools = useMemo(() => {
    let result = data.tools.filter((tool) => tool.published || adminToken || demoAdmin)
    if (view === "favorites") result = result.filter((tool) => tool.favorite)
    if (view === "recent") result = recentlyUsed(result)
    if (category !== "all") result = result.filter((tool) => tool.categoryId === category)
    const normalized = query.trim().toLocaleLowerCase("th")
    if (normalized) {
      result = result.filter((tool) =>
        `${tool.name} ${tool.description}`.toLocaleLowerCase("th").includes(normalized),
      )
    }
    return result
  }, [adminToken, category, data.tools, demoAdmin, query, view])

  useEffect(() => {
    const context = document.modelContext
    if (!context?.registerTool) return
    const lifecycle = new AbortController()
    void Promise.resolve(
      context.registerTool(
        {
          name: "list_portal_tools",
          title: "List portal tools",
          description: "List the currently visible tools in the TF LAB portal.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
          annotations: { readOnlyHint: true, untrustedContentHint: false },
          execute: () => visibleTools.map(({ id, name, categoryId, url: toolUrl }) => ({ id, name, categoryId, url: toolUrl })),
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined)
    return () => lifecycle.abort()
  }, [visibleTools])

  function openTool(tool: PortalTool) {
    const updated = { ...tool, lastUsedAt: new Date().toISOString() }
    setData((current) => ({ ...current, tools: upsertTool(current.tools, updated) }))
    window.open(tool.url, "_blank", "noopener,noreferrer")
  }

  const setCurrentView = (next: View) => {
    setView(next)
    if (next !== "categories") setCategory("all")
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "260px" } as React.CSSProperties}>
      <Sidebar collapsible="offcanvas" className="border-none">
        <SidebarHeader className="px-6 pb-2 pt-7">
          <button className="flex h-[54px] w-full items-center gap-3 rounded-2xl bg-sidebar-accent px-3.5 text-left" onClick={() => setCurrentView("home")}>
            <span className="size-[30px] rounded-[9px] bg-sidebar-primary" aria-hidden="true" />
            <span><strong className="block text-lg leading-5">TF LAB</strong><span className="text-[11px] text-sidebar-foreground/65">Personal portal</span></span>
          </button>
        </SidebarHeader>
        <SidebarContent className="px-4">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {mainNav.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton isActive={view === item.id} onClick={() => setCurrentView(item.id)} className="h-11 rounded-xl bg-sidebar-accent px-3.5 text-[15px] data-[active=true]:font-semibold">
                      <span className={`size-[9px] rounded-full ${view === item.id ? "bg-sidebar-primary" : "bg-sidebar-foreground/50"}`} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="mt-4 p-0">
            <SidebarGroupLabel className="h-8 px-2 text-[11px] uppercase">Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {adminNav.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton isActive={view === item.id} onClick={() => setCurrentView(item.id)} className="h-11 rounded-xl bg-sidebar-accent px-3.5 text-[15px] data-[active=true]:font-semibold">
                      <span className={`size-[9px] rounded-full ${view === item.id ? "bg-sidebar-primary" : "bg-sidebar-foreground/50"}`} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="px-6 pb-6">
          <div className="flex h-12 items-center justify-between rounded-[14px] bg-sidebar-accent px-3.5 text-sm font-semibold">
            <span>{resolvedTheme === "dark" ? "Dark mode" : "Light mode"}</span>
            <Switch aria-label="สลับโหมดสี" checked={resolvedTheme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-h-svh">
        <MobileHeader theme={resolvedTheme} setTheme={setTheme} />
        <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-7 md:px-12 md:py-[38px]">
          {isAdminView(view) ? (
            <AdminPanel
              view={view}
              data={data}
              token={adminToken}
              isAdmin={Boolean(adminToken || demoAdmin)}
              onToken={setAdminToken}
              onDemo={() => setDemoAdmin(true)}
              onChange={setData}
              query={query}
              onQuery={setQuery}
            />
          ) : (
            <HomePanel
              view={view}
              data={data}
              tools={visibleTools}
              query={query}
              onQuery={setQuery}
              category={category}
              onCategory={setCategory}
              onOpen={openTool}
              onFavorite={(tool) => setData((current) => ({ ...current, tools: upsertTool(current.tools, { ...tool, favorite: !tool.favorite }) }))}
              loading={loading}
              error={loadError}
              onView={setCurrentView}
            />
          )}
        </div>
      </SidebarInset>
      <Toaster richColors position="bottom-right" />
    </SidebarProvider>
  )
}

function MobileHeader({ theme, setTheme }: { theme?: string; setTheme: (theme: string) => void }) {
  return (
    <header className="flex h-[76px] items-center justify-between bg-sidebar px-4 md:hidden">
      <strong className="text-xl">TF LAB</strong>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Sun /> : <Moon />}<span className="sr-only">สลับโหมดสี</span>
        </Button>
        <SidebarTrigger className="size-[42px] rounded-xl bg-sidebar-accent"><Menu /><span className="sr-only">เปิดเมนู</span></SidebarTrigger>
      </div>
    </header>
  )
}

function PageHeader({ title, subtitle, query, onQuery }: { title: string; subtitle: string; query: string; onQuery: (query: string) => void }) {
  return (
    <header className="mb-6 flex min-h-[72px] items-start justify-between gap-5 border-b-0 bg-card md:items-center">
      <div><h1 className="text-[30px] font-bold leading-[1.4] tracking-tight">{title}</h1><p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p></div>
      <div className="hidden items-center gap-2.5 sm:flex">
        <div className="relative"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-11 w-[174px] rounded-[14px] pl-9" aria-label="ค้นหาเครื่องมือ" placeholder="ค้นหาเครื่องมือ" value={query} onChange={(event) => onQuery(event.target.value)} /></div>
        <span className="size-[42px] rounded-full bg-primary" aria-hidden="true" />
      </div>
    </header>
  )
}

function HomePanel({ view, data, tools, query, onQuery, category, onCategory, onOpen, onFavorite, loading, error, onView }: { view: View; data: PortalData; tools: PortalTool[]; query: string; onQuery: (query: string) => void; category: string; onCategory: (id: string) => void; onOpen: (tool: PortalTool) => void; onFavorite: (tool: PortalTool) => void; loading: boolean; error: string; onView: (view: View) => void }) {
  const heading = view === "home" ? "ยินดีต้อนรับกลับ" : view === "favorites" ? "รายการโปรด" : view === "recent" ? "ใช้งานล่าสุด" : view === "categories" ? "หมวดหมู่" : "เครื่องมือทั้งหมด"
  const mobileHeading = view === "home" ? "สวัสดี 👋" : heading

  if (error) return <div role="alert" className="rounded-2xl border bg-card p-8 text-center"><h1 className="text-xl font-bold">เชื่อมต่อข้อมูลไม่ได้</h1><p className="mt-2 text-muted-foreground">{error}</p><Button className="mt-5" onClick={() => window.location.reload()}>ลองใหม่</Button></div>

  return (
    <>
      <div className="hidden md:block"><PageHeader title={heading} subtitle="เครื่องมือทั้งหมดของคุณ อยู่ในที่เดียว" query={query} onQuery={onQuery} /></div>
      <div className="mb-5 md:hidden"><h1 className="text-[26px] font-bold">{mobileHeading}</h1><p className="mt-3 text-base text-muted-foreground">เปิดเครื่องมือที่ใช้อยู่ได้ทันที</p><div className="relative mt-4"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-11 rounded-[14px] pl-9" aria-label="ค้นหาเครื่องมือ" placeholder="ค้นหาเครื่องมือ" value={query} onChange={(event) => onQuery(event.target.value)} /></div></div>

      {view === "home" && (
        <section className="mb-6" aria-labelledby="quick-title">
          <div className="mb-5 hidden items-center justify-between md:flex"><h2 id="quick-title" className="text-xl font-semibold">Quick Access</h2><button className="text-[13px] font-semibold text-primary" onClick={() => onView("favorites")}>ดูทั้งหมด</button></div>
          <div className="grid grid-cols-3 gap-2.5 md:gap-3.5">
            {data.tools.filter((tool) => tool.favorite).slice(0, 3).map((tool) => (
              <button key={tool.id} onClick={() => onOpen(tool)} className="flex h-24 flex-col items-start justify-center gap-1 rounded-[18px] border bg-card p-3 text-left transition hover:-translate-y-0.5 md:h-[104px] md:flex-row md:items-center md:gap-3.5 md:px-[18px]">
                <span className="size-[30px] shrink-0 rounded-[9px] bg-primary md:size-14 md:rounded-[15px]" />
                <span><strong className="block text-sm md:text-[15px]">{quickLabel(tool)}</strong><span className="hidden text-xs text-muted-foreground md:block">{tool.name}</span></span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="tools-title">
        <div className="mb-5 flex items-center justify-between"><h2 id="tools-title" className="text-[20px] font-semibold">เครื่องมือทั้งหมด</h2><span className="hidden text-[13px] font-semibold text-primary md:block">จัดเรียงล่าสุด</span></div>
        <div className="mb-4 hidden gap-2.5 overflow-x-auto pb-1 md:flex">
          <FilterButton active={category === "all"} onClick={() => onCategory("all")}>ทั้งหมด</FilterButton>
          {data.categories.map((item) => <FilterButton key={item.id} active={category === item.id} onClick={() => onCategory(item.id)}>{item.name}</FilterButton>)}
        </div>
        {loading ? <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-6">{[0, 1, 2, 3].map((item) => <div key={item} className="aspect-[.72] animate-pulse rounded-[20px] bg-muted" />)}</div> : tools.length ? <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-6 xl:grid-cols-4">{tools.map((tool) => <ToolCard key={tool.id} tool={tool} category={data.categories.find((item) => item.id === tool.categoryId)} onOpen={onOpen} onFavorite={onFavorite} />)}</div> : <div className="rounded-[20px] border border-dashed p-10 text-center text-muted-foreground">ไม่พบเครื่องมือในรายการนี้</div>}
      </section>
    </>
  )
}

function quickLabel(tool: PortalTool) {
  if (tool.categoryId === "docs") return "สร้างเอกสาร"
  if (tool.categoryId === "games") return "สุ่มเกม"
  return "จับเวลาโฟกัส"
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button className={`h-[38px] shrink-0 rounded-full border px-[18px] text-[13px] font-semibold ${active ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`} onClick={onClick}>{children}</button>
}

function ToolCard({ tool, category, onOpen, onFavorite }: { tool: PortalTool; category?: Category; onOpen: (tool: PortalTool) => void; onFavorite: (tool: PortalTool) => void }) {
  return (
    <article className="relative flex min-w-0 flex-col gap-2.5 rounded-[20px] border bg-card p-2.5 shadow-[0_8px_12px_rgba(51,41,20,.10)] md:gap-3 md:p-4">
      <button aria-label={`เปิด ${tool.name}`} className={`cover-${tool.cover} aspect-square w-full rounded-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`} onClick={() => onOpen(tool)} />
      <button className="truncate text-left text-sm font-semibold md:text-[17px]" onClick={() => onOpen(tool)}>{tool.name}</button>
      <div className="flex h-6 items-center justify-between"><span className="truncate text-xs font-medium text-muted-foreground">{category?.name ?? "ทั่วไป"}</span><button aria-label={tool.favorite ? `นำ ${tool.name} ออกจากรายการโปรด` : `เพิ่ม ${tool.name} ในรายการโปรด`} className="text-primary" onClick={() => onFavorite(tool)}><Star className={`size-4 ${tool.favorite ? "fill-current" : ""}`} /></button></div>
    </article>
  )
}

function AdminPanel({ view, data, token, isAdmin, onToken, onDemo, onChange, query, onQuery }: { view: View; data: PortalData; token: string; isAdmin: boolean; onToken: (token: string) => void; onDemo: () => void; onChange: (data: PortalData) => void; query: string; onQuery: (query: string) => void }) {
  if (!isAdmin) return <AdminLogin onToken={onToken} onDemo={onDemo} />
  if (view === "settings") return <><PageHeader title="Settings" subtitle="ตั้งค่าการเชื่อมต่อและสิทธิ์ผู้ดูแล" query={query} onQuery={onQuery} /><div className="rounded-[20px] border bg-card p-6"><h2 className="font-semibold">Data source</h2><p className="mt-2 text-sm text-muted-foreground">{isSupabaseConfigured ? "เชื่อมต่อ Supabase แล้ว และใช้ RLS ควบคุมสิทธิ์" : "Local fallback — ข้อมูลอยู่ในเบราว์เซอร์เครื่องนี้"}</p></div></>
  return <AdminCrud mode={view === "manage-categories" ? "categories" : "tools"} data={data} token={token} onChange={onChange} query={query} onQuery={onQuery} />
}

function AdminLogin({ onToken, onDemo }: { onToken: (token: string) => void; onDemo: () => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true)
    try { onToken(await signInAdmin(email, password)); toast.success("เข้าสู่ระบบแล้ว") } catch { toast.error("อีเมลหรือรหัสผ่านไม่ถูกต้อง") } finally { setBusy(false) }
  }
  return <div className="mx-auto mt-16 max-w-md rounded-[20px] border bg-card p-8"><span className="block size-10 rounded-xl bg-primary" /><h1 className="mt-5 text-2xl font-bold">Admin access</h1><p className="mt-2 text-sm text-muted-foreground">สำหรับผู้ดูแลเพียงคนเดียว ผู้ใช้ทั่วไปไม่ต้องเข้าสู่ระบบ</p>{isSupabaseConfigured ? <form className="mt-6 space-y-4" onSubmit={submit}><div className="space-y-2"><Label htmlFor="admin-email">อีเมล</Label><Input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="admin-password">รหัสผ่าน</Label><Input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div><Button className="w-full" disabled={busy}>{busy ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}</Button></form> : <div className="mt-6"><Button className="w-full" onClick={onDemo}>เปิดโหมดตัวอย่าง Admin</Button><p className="mt-3 text-center text-xs text-muted-foreground">สำหรับทดสอบบนเครื่องนี้เท่านั้น</p></div>}</div>
}

function AdminCrud({ mode, data, token, onChange, query, onQuery }: { mode: "tools" | "categories"; data: PortalData; token: string; onChange: (data: PortalData) => void; query: string; onQuery: (query: string) => void }) {
  const [toolEditor, setToolEditor] = useState<PortalTool | null | undefined>(undefined)
  const [categoryEditor, setCategoryEditor] = useState<Category | null | undefined>(undefined)
  const [remove, setRemove] = useState<{ type: "tool" | "category"; id: string; name: string } | null>(null)
  const tools = data.tools.filter((tool) => tool.name.toLocaleLowerCase("th").includes(query.toLocaleLowerCase("th")))

  async function saveTool(tool: PortalTool) {
    try { if (isSupabaseConfigured) await saveRemoteTool(tool, token); onChange({ ...data, tools: upsertTool(data.tools, tool) }); setToolEditor(undefined); toast.success("บันทึกเครื่องมือแล้ว") } catch { toast.error("บันทึกไม่สำเร็จ กรุณาตรวจสิทธิ์ Admin") }
  }
  async function saveCategory(item: Category) {
    try { if (isSupabaseConfigured) await saveRemoteCategory(item, token); onChange({ ...data, categories: [item, ...data.categories.filter((current) => current.id !== item.id)] }); setCategoryEditor(undefined); toast.success("บันทึกหมวดหมู่แล้ว") } catch { toast.error("บันทึกไม่สำเร็จ กรุณาตรวจสิทธิ์ Admin") }
  }
  async function confirmRemove() {
    if (!remove) return
    try {
      if (remove.type === "tool") { if (isSupabaseConfigured) await deleteRemoteTool(remove.id, token); onChange({ ...data, tools: data.tools.filter((tool) => tool.id !== remove.id) }) }
      else { const result = removeCategory(data, remove.id); if (!result.ok) { toast.error("ลบไม่ได้ เพราะยังมีเครื่องมืออยู่ในหมวดนี้"); setRemove(null); return } if (isSupabaseConfigured) await deleteRemoteCategory(remove.id, token); onChange(result.data) }
      setRemove(null); toast.success("ลบรายการแล้ว")
    } catch { toast.error("ลบรายการไม่สำเร็จ") }
  }

  return (
    <>
      <PageHeader title={mode === "tools" ? "จัดการเครื่องมือ" : "จัดการหมวดหมู่"} subtitle={mode === "tools" ? "เพิ่ม ลบ แก้ไข และจัดหมวดหมู่เครื่องมือ" : "สร้างและดูแลหมวดหมู่ใน Portal"} query={query} onQuery={onQuery} />
      <div className="mb-5 flex h-[54px] items-center justify-between bg-card"><span className="text-sm text-muted-foreground">{mode === "tools" ? `เครื่องมือ ${tools.length} รายการ` : `หมวดหมู่ ${data.categories.length} รายการ`}</span><Button className="h-[46px] rounded-xl" onClick={() => mode === "tools" ? setToolEditor(null) : setCategoryEditor(null)}><Plus /> {mode === "tools" ? "เพิ่มเครื่องมือ" : "เพิ่มหมวดหมู่"}</Button></div>
      <div className="overflow-hidden rounded-[20px] border bg-card">
        {(mode === "tools" ? tools : data.categories).map((item) => {
          const isTool = "categoryId" in item
          const color = isTool ? `cover-${item.cover}` : ""
          const meta = isTool ? `${data.categories.find((category) => category.id === item.categoryId)?.name ?? "ทั่วไป"} • ${item.published ? "เปิดใช้งาน" : "แบบร่าง"}` : `${data.tools.filter((tool) => tool.categoryId === item.id).length} เครื่องมือ`
          return <div key={item.id} className="flex min-h-24 items-center gap-4 border-b px-5 last:border-b-0"><span className={`${color} size-14 shrink-0 rounded-xl`} style={!isTool ? { backgroundColor: item.color } : undefined} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{meta}</p></div><Button size="sm" variant="secondary" className="rounded-[10px] bg-[#fff0b8] text-[#4f3d11] hover:bg-[#ffe590]" onClick={() => isTool ? setToolEditor(item) : setCategoryEditor(item)}><Pencil /> แก้ไข</Button><Button size="sm" variant="secondary" className="rounded-[10px] bg-[#ffe2e2] text-[#9b2727] hover:bg-[#ffcaca]" onClick={() => setRemove({ type: isTool ? "tool" : "category", id: item.id, name: item.name })}><Trash2 /> ลบ</Button></div>
        })}
      </div>
      {toolEditor !== undefined ? <ToolEditor key={toolEditor?.id ?? "new"} open tool={toolEditor} categories={data.categories} onClose={() => setToolEditor(undefined)} onSave={saveTool} /> : null}
      {categoryEditor !== undefined ? <CategoryEditor key={categoryEditor?.id ?? "new"} open category={categoryEditor} onClose={() => setCategoryEditor(undefined)} onSave={saveCategory} /> : null}
      <AlertDialog open={Boolean(remove)} onOpenChange={(open) => !open && setRemove(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>ลบ “{remove?.name}”?</AlertDialogTitle><AlertDialogDescription>รายการนี้จะหายไปทันทีและไม่สามารถย้อนกลับได้</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>ยกเลิก</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={confirmRemove}>ลบรายการ</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  )
}

function ToolEditor({ open, tool, categories, onClose, onSave }: { open: boolean; tool: PortalTool | null; categories: Category[]; onClose: () => void; onSave: (tool: PortalTool) => void }) {
  const [draft, setDraft] = useState<PortalTool>(() => tool ?? { ...emptyTool, categoryId: categories[0]?.id ?? "tools" })
  function submit(event: FormEvent) { event.preventDefault(); if (!isSafeHttpUrl(draft.url)) { toast.error("ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://"); return } onSave({ ...draft, id: draft.id || slugify(draft.name) }) }
  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}><DialogContent><DialogHeader><DialogTitle>{tool ? "แก้ไขเครื่องมือ" : "เพิ่มเครื่องมือ"}</DialogTitle><DialogDescription>รายละเอียดจะแสดงบนการ์ดใน Portal</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={submit}><Field label="ชื่อ" id="tool-name"><Input id="tool-name" required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field><Field label="คำอธิบาย" id="tool-description"><Input id="tool-description" required value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></Field><Field label="ลิงก์" id="tool-url"><Input id="tool-url" required inputMode="url" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} /></Field><div className="space-y-2"><Label>หมวดหมู่</Label><Select value={draft.categoryId} onValueChange={(value) => setDraft({ ...draft, categoryId: value })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div><div className="flex items-center justify-between rounded-xl border p-3"><Label htmlFor="published">เผยแพร่ให้ผู้ใช้ทั่วไป</Label><Switch id="published" checked={draft.published} onCheckedChange={(published) => setDraft({ ...draft, published })} /></div><DialogFooter><Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button><Button type="submit">บันทึก</Button></DialogFooter></form></DialogContent></Dialog>
}

function CategoryEditor({ open, category, onClose, onSave }: { open: boolean; category: Category | null; onClose: () => void; onSave: (category: Category) => void }) {
  const [name, setName] = useState(category?.name ?? "")
  const [color, setColor] = useState(category?.color ?? "#5da9e9")
  function submit(event: FormEvent) { event.preventDefault(); onSave({ id: category?.id ?? slugify(name), name, color, icon: category?.icon ?? "wrench" }) }
  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}><DialogContent><DialogHeader><DialogTitle>{category ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่"}</DialogTitle><DialogDescription>ใช้จัดกลุ่มเครื่องมือให้ค้นหาได้ง่าย</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={submit}><Field label="ชื่อหมวดหมู่" id="category-name"><Input id="category-name" required value={name} onChange={(event) => setName(event.target.value)} /></Field><Field label="สี" id="category-color"><Input id="category-color" type="color" className="h-12 p-2" value={color} onChange={(event) => setColor(event.target.value)} /></Field><DialogFooter><Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button><Button type="submit">บันทึก</Button></DialogFooter></form></DialogContent></Dialog>
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label>{children}</div>
}
