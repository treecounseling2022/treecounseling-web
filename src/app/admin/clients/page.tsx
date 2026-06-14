import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, isAdminLevel } from "@/lib/auth-role";
import { redirect } from "next/navigation";

const GENDER_LABEL: Record<string, string> = {
  male: "男",
  female: "女",
  other: "其他",
  prefer_not_to_say: "不透露",
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const auth = await requireAuth();
  if (!isAdminLevel(auth.role)) redirect("/admin");

  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("clients")
    .select("id, full_name, gender, phone, email, assigned_therapist_id, created_at, is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (q?.trim()) query = query.ilike("full_name", `%${q.trim()}%`);

  const { data: clients } = await query;

  // Build therapist name map
  const therapistIds = [...new Set((clients ?? []).map((c) => c.assigned_therapist_id).filter(Boolean))] as string[];
  let therapistMap: Record<string, string> = {};
  if (therapistIds.length > 0) {
    const { data: therapists } = await supabase
      .from("therapist_profiles")
      .select("id, name")
      .in("id", therapistIds);
    therapistMap = Object.fromEntries((therapists ?? []).map((t) => [t.id, t.name]));
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-sans text-xs text-muted mb-1">
            <a href="/admin" className="hover:text-forest">後台</a> / 個案管理
          </p>
          <h1 className="font-serif text-deep text-2xl">個案管理</h1>
          <p className="font-sans text-xs text-muted mt-0.5">
            共 {clients?.length ?? 0} 位個案
          </p>
        </div>
        <Link
          href="/admin/clients/new"
          className="font-sans text-xs bg-deep text-paper px-4 py-2 hover:bg-forest transition-colors flex-shrink-0"
        >
          + 新增個案
        </Link>
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="搜尋姓名…"
          className="flex-1 border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50 max-w-xs"
        />
        <button
          type="submit"
          className="font-sans text-xs px-4 py-2 bg-sand/20 text-muted hover:bg-sand/30 transition-colors"
        >
          搜尋
        </button>
        {q && (
          <Link
            href="/admin/clients"
            className="font-sans text-xs px-4 py-2 text-muted/60 hover:text-muted transition-colors"
          >
            清除
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-white border border-sand/20 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-sand/20">
              <th className="font-sans text-[11px] text-muted text-left px-4 py-3">姓名</th>
              <th className="font-sans text-[11px] text-muted text-left px-4 py-3 hidden sm:table-cell">性別</th>
              <th className="font-sans text-[11px] text-muted text-left px-4 py-3 hidden md:table-cell">聯絡方式</th>
              <th className="font-sans text-[11px] text-muted text-left px-4 py-3">負責心理師</th>
              <th className="font-sans text-[11px] text-muted text-left px-4 py-3 hidden lg:table-cell">建立日期</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(clients ?? []).map((client, i) => (
              <tr
                key={client.id}
                className={`border-b border-sand/10 hover:bg-sand/5 transition-colors ${
                  i % 2 === 0 ? "" : "bg-sand/5"
                }`}
              >
                <td className="px-4 py-3">
                  <p className="font-sans text-sm text-deep">{client.full_name}</p>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="font-sans text-xs text-muted">
                    {client.gender ? GENDER_LABEL[client.gender] ?? client.gender : "—"}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="font-sans text-xs text-muted">
                    {client.phone || client.email || "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-sans text-xs text-muted">
                    {client.assigned_therapist_id
                      ? therapistMap[client.assigned_therapist_id] ?? "—"
                      : <span className="text-muted/40">未指派</span>}
                  </span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="font-sans text-[11px] text-muted/60">
                    {new Date(client.created_at).toLocaleDateString("zh-TW")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/clients/${client.id}`}
                    className="font-sans text-[11px] text-forest hover:underline"
                  >
                    編輯 →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(clients ?? []).length === 0 && (
          <div className="text-center py-16 font-sans text-xs text-muted/40">
            {q ? `找不到「${q}」的相關個案。` : "尚未建立任何個案。"}
          </div>
        )}
      </div>
    </div>
  );
}
