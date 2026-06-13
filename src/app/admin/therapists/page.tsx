import Link from "next/link";
import { TEAM } from "@/lib/data";

export default function TherapistsAdminPage() {
  return (
    <div className="space-y-6 pt-4">
      <div>
        <h1 className="font-serif text-deep text-2xl mb-1">心理師資料</h1>
        <p className="font-sans text-xs text-muted">選擇心理師以編輯其延伸資料。</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TEAM.map((member) => (
          <Link
            key={member.id}
            href={`/admin/therapists/${member.id}`}
            className="flex items-center gap-4 p-5 bg-white border border-sand/20 hover:border-forest/40 hover:shadow-sm transition-all"
          >
            <div className="w-12 h-16 flex-shrink-0 overflow-hidden bg-sand/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={member.photo} alt={member.name} className="w-full h-full object-cover object-top" />
            </div>
            <div>
              <p className="font-serif text-deep">{member.name}</p>
              <p className="font-garamond text-muted/70 text-sm">{member.nameEn}</p>
              <p className="font-sans text-[11px] text-sand mt-0.5">{member.title}</p>
            </div>
            <span className="ml-auto font-sans text-xs text-muted/40">編輯 →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
