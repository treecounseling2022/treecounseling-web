"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type TherapistDetail = {
  letter: string;
  specialties: string[];
  approaches: string[];
  licenses?: string[];
  associations?: string[];
  experience?: { role: string; org: string; period: string }[];
  training?: string[];
  publications?: { title: string; year?: string; note?: string }[];
  services?: { name: string; fee: string; duration?: string; note?: string }[];
};

type Props = {
  detail: TherapistDetail;
  memberEducation: string[];
};

const TABS = [
  { id: "letter", label: "給來訪者的信" },
  { id: "profile", label: "資歷" },
  { id: "services", label: "服務與收費" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function TherapistTabs({ detail, memberEducation }: Props) {
  const [active, setActive] = useState<TabId>("letter");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-sand/20 mb-8">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              "px-5 py-3 text-xs font-sans tracking-widest transition-colors cursor-pointer",
              active === tab.id
                ? "text-forest border-b-2 border-forest -mb-px"
                : "text-muted hover:text-deep"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: 給來訪者的信 */}
      {active === "letter" && (
        detail.letter ? (
          <div className="bg-soft border border-sand/20 p-8 md:p-10 relative">
            <div className="absolute top-6 right-6 w-12 h-12 rounded-full border border-sand/30 flex items-center justify-center text-[8px] font-garamond text-sand/50 tracking-widest uppercase rotate-12 select-none">
              Tree Studio
            </div>
            <h3 className="font-serif text-deep text-lg mb-6 pb-2 border-b border-sand/10">
              給來訪者的一封信
            </h3>
            <div className="font-sans text-muted text-sm leading-relaxed whitespace-pre-line">
              {detail.letter}
            </div>
          </div>
        ) : (
          <p className="font-sans text-sm text-muted/40 py-8 text-center">尚未填寫</p>
        )
      )}

      {/* Tab: 資歷 */}
      {active === "profile" && (
        <div className="space-y-8">
          {/* 擅長議題 & 諮商取向 */}
          {(detail.specialties.length > 0 || detail.approaches.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {detail.specialties.length > 0 && (
                <Section title="擅長議題">
                  <ul className="space-y-2">
                    {detail.specialties.map((item) => (
                      <li key={item} className="font-sans text-muted text-sm flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-sand/60 rounded-full flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
              {detail.approaches.length > 0 && (
                <Section title="諮商取向">
                  <ul className="space-y-2">
                    {detail.approaches.map((item) => (
                      <li key={item} className="font-sans text-muted text-sm flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-forest/40 rounded-full flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
          )}

          {/* 學歷背景 */}
          {memberEducation.length > 0 && (
            <Section title="學歷背景">
              <ul className="space-y-2">
                {memberEducation.map((edu, idx) => (
                  <li key={idx} className="font-sans text-muted text-sm flex gap-2">
                    <span className="text-sand/50 flex-shrink-0">—</span>
                    <span>{edu}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* 證照 */}
          {detail.licenses && detail.licenses.length > 0 && (
            <Section title="專業證照">
              <ul className="space-y-2">
                {detail.licenses.map((item, idx) => (
                  <li key={idx} className="font-sans text-muted text-sm flex gap-2">
                    <span className="text-sand/50 flex-shrink-0">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* 專業學會 */}
          {detail.associations && detail.associations.length > 0 && (
            <Section title="專業學會">
              <ul className="space-y-2">
                {detail.associations.map((item, idx) => (
                  <li key={idx} className="font-sans text-muted text-sm flex gap-2">
                    <span className="text-sand/50 flex-shrink-0">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* 實務經驗 */}
          {detail.experience && detail.experience.length > 0 && (
            <Section title="實務經驗">
              <ul className="space-y-3">
                {detail.experience.map((exp, idx) => (
                  <li key={idx} className="font-sans text-sm">
                    <span className="text-deep font-medium">{exp.role}</span>
                    <span className="text-muted"> · {exp.org}</span>
                    <span className="block text-xs text-sand/70 mt-0.5">{exp.period}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* 訓練 */}
          {detail.training && detail.training.length > 0 && (
            <Section title="專業訓練">
              <ul className="space-y-2">
                {detail.training.map((item, idx) => (
                  <li key={idx} className="font-sans text-muted text-sm flex gap-2">
                    <span className="text-sand/50 flex-shrink-0">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* 著作 */}
          {detail.publications && detail.publications.length > 0 && (
            <Section title="著作與出版">
              <ul className="space-y-3">
                {detail.publications.map((pub, idx) => (
                  <li key={idx} className="font-sans text-sm">
                    <span className="text-deep">{pub.title}</span>
                    {pub.year && (
                      <span className="text-sand/70 ml-2 text-xs">({pub.year})</span>
                    )}
                    {pub.note && (
                      <span className="block text-xs text-muted/70 mt-0.5">{pub.note}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}

      {/* Tab: 服務與收費 */}
      {active === "services" && (
        <div className="space-y-6">
          {detail.services && detail.services.length > 0 ? (
            <>
              <div className="space-y-3">
                {detail.services.map((svc, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-5 border border-sand/20 bg-soft/50"
                  >
                    <div>
                      <p className="font-serif text-deep text-sm">{svc.name}</p>
                      {svc.duration && (
                        <p className="font-sans text-xs text-muted/70 mt-0.5">{svc.duration}</p>
                      )}
                      {svc.note && (
                        <p className="font-sans text-xs text-muted/60 mt-1 italic">{svc.note}</p>
                      )}
                    </div>
                    <p className="font-garamond text-forest text-base whitespace-nowrap">
                      {svc.fee}
                    </p>
                  </div>
                ))}
              </div>
              <p className="font-sans text-xs text-muted/60 leading-relaxed border-t border-sand/15 pt-4">
                收費以澳門幣 (MOP) 計算。如有特殊情況或優惠需求，歡迎聯絡行政洽詢。
              </p>
            </>
          ) : (
            <div className="p-8 text-center border border-dashed border-sand/30">
              <p className="font-sans text-sm text-muted/60">收費詳情請直接聯絡行政查詢。</p>
              <Link
                href="/booking"
                className="inline-block mt-4 px-5 py-2 border border-forest/50 text-forest text-xs font-sans tracking-widest hover:bg-forest hover:text-paper transition-colors"
              >
                聯絡行政
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="font-serif text-deep text-lg border-b border-sand/15 pb-2">{title}</h3>
      {children}
    </div>
  );
}
