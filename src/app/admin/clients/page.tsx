import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, isAdminLevel } from "@/lib/auth-role";

const GENDER_LABEL: Record<string, string> = {
  male: "男",
  female: "女",
  other: "其他",
  prefer_not_to_say: "不透露",
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const auth = await requireAuth();
  const isAdmin = isAdminLevel(auth.role);

  const { q, status = "active" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("clients")
    .select("id, full_name, gender, phone, email, assigned_therapist_id, created_at, is_active, service_type, couple_partner_id")
    .order("created_at", { ascending: false });

  if (status === "active") query = query.eq("is_active", true);
  else if (status === "archived") query = query.eq("is_active", false);

  // Therapists see assigned clients + clients with confirmed/locked appointments
  if (!isAdmin) {
    if (!auth.profileId) return <div className="pt-4 font-sans text-xs text-muted">帳號尚未連結至心理師資料。</div>;

    const { data: apptClients } = await supabase
      .from("appointments")
      .select("client_id")
      .eq("therapist_id", auth.profileId)
      .in("booking_status", ["confirmed", "locked"]);

    const apptClientIds = [
      ...new Set((apptClients ?? []).map((a) => a.client_id).filter(Boolean)),
    ] as string[];

    if (apptClientIds.length > 0) {
      query = query.or(
        `assigned_therapist_id.eq.${auth.profileId},id.in.(${apptClientIds.join(",")})`
      );
    } else {
      query = query.eq("assigned_therapist_id", auth.profileId);
    }
  }

  if (q?.trim()) query = query.ilike("full_name", `%${q.trim()}%`);
  const { data: clients } = await query;

  // Build therapist name map (only needed for admin view)
  let therapistMap: Record<string, string> = {};
  let partnerNameMap: Record<string, string> = {};
  if (isAdmin) {
    const therapistIds = [...new Set((clients ?? []).map((c) => c.assigned_therapist_id).filter(Boolean))] as string[];
    const partnerIds = [...new Set((clients ?? []).map((c) => (c as { couple_partner_id?: string | null }).couple_partner_id).filter(Boolean))] as string[];

    const [therapistsRes, partnersRes] = await Promise.all([
      therapistIds.length > 0
        ? supabase.from("therapist_profiles").select("id, name").in("id", therapistIds)
        : Promise.resolve({ data: [] }),
      partnerIds.length > 0
        ? supabase.from("clients").select("id, full_name").in("id", partnerIds)
        : Promise.resolve({ data: [] }),
    ]);
    therapistMap = Object.fromEntries(((therapistsRes.data ?? []) as { id: string; name: string }[]).map((t) => [t.id, t.name]));
    partnerNameMap = Object.fromEntries(((partnersRes.data ?? []) as { id: string; full_name: string }[]).map((c) => [c.id, c.full_name]));
  }

  const statusTabs = [
    { value: "active", label: "使用中" },
    { value: "archived", label: "已封存" },
    { value: "all", label: "全部" },
  ];

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-deep text-2xl">
            {isAdmin ? "個案管理" : "我的個案"}
          </h1>
          <p className="font-sans text-xs text-muted mt-0.5">
            共 {clients?.length ?? 0} 位個案
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/admin/clients/new"
            className="font-sans text-xs bg-deep text-paper px-4 py-2 hover:bg-forest transition-colors flex-shrink-0"
          >
            + 新增個案
          </Link>
        )}
      </div>

      {/* Status tabs — admin only */}
      {isAdmin && (
        <div className="flex gap-1 border-b border-sand/20">
          {statusTabs.map((tab) => (
            <Link
              key={tab.value}
              href={`/admin/clients?status=${tab.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`font-sans text-xs px-4 py-2 transition-colors border-b-2 -mb-px ${
                status === tab.value
                  ? "border-forest text-forest"
                  : "border-transparent text-muted hover:text-deep"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      )}

      {/* Search */}
      <form method="GET" className="flex gap-2">
        <input type="hidden" name="status" value={status} />
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
            href={`/admin/clients?status=${status}`}
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
              {isAdmin && (
                <th className="font-sans text-[11px] text-muted text-left px-4 py-3">負責心理師</th>
              )}
              <th className="font-sans text-[11px] text-muted text-left px-4 py-3 hidden lg:table-cell">建立日期</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(clients ?? []).map((client, i) => {
              const ext = client as typeof client & { service_type?: string; couple_partner_id?: string | null };
              const isCouple = ext.service_type === "couple";
              const partnerName = ext.couple_partner_id ? partnerNameMap[ext.couple_partner_id] : null;
              return (
              <tr
                key={client.id}
                className={`border-b border-sand/10 hover:bg-sand/5 transition-colors ${
                  i % 2 === 0 ? "" : "bg-sand/5"
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-sans text-sm ${client.is_active ? "text-deep" : "text-muted/50 line-through"}`}>{client.full_name}</p>
                    {isCouple && (
                      <span className="font-sans text-[10px] bg-rose-50 text-rose-500 border border-rose-200 px-1.5 py-0.5 leading-none flex-shrink-0">
                        伴侶
                      </span>
                    )}
                    {!client.is_active && (
                      <span className="font-sans text-[10px] bg-sand/20 text-muted/60 px-1.5 py-0.5 leading-none flex-shrink-0">
                        已封存
                      </span>
                    )}
                  </div>
                  {isCouple && partnerName && (
                    <p className="font-sans text-[11px] text-muted/60 mt-0.5">配偶：{partnerName}</p>
                  )}
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
                {isAdmin && (
                  <td className="px-4 py-3">
                    <span className="font-sans text-xs text-muted">
                      {client.assigned_therapist_id
                        ? therapistMap[client.assigned_therapist_id] ?? "—"
                        : <span className="text-muted/40">未指派</span>}
                    </span>
                  </td>
                )}
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
                    {isAdmin ? "編輯 →" : "查看 →"}
                  </Link>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
        {(clients ?? []).length === 0 && (
          <div className="text-center py-16 font-sans text-xs text-muted/40">
            {q ? `找不到「${q}」的相關個案。` : status === "archived" ? "沒有已封存的個案。" : "尚未有個案資料。"}
          </div>
        )}
      </div>
    </div>
  );
}
