import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import React from "react";
import FadeIn from "@/components/ui/FadeIn";
import TherapistTabs, { type TherapistDetail } from "@/components/ui/TherapistTabs";
import { TEAM } from "@/lib/data";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return TEAM.map((member) => ({
    id: member.id,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const member = TEAM.find((m) => m.id === id);
  if (!member) return {};

  return {
    title: `${member.name} ${member.nameEn !== member.name ? member.nameEn : ""} - ${member.title}`,
    description: member.bio,
  };
}

const THERAPIST_DETAILS: Record<string, TherapistDetail> = {
  tanky: {
    letter: `你好，我是國章。

在日常的繁忙與壓力中，我們有時會覺得自己像是被卡在岩石縫隙中的樹苗，呼吸被壓縮得極其微弱。在與個案工作的過程中，我最常看見的是生命在逆境中的堅韌。

輔導對我而言，不是一個由上而下的指導過程，而是一段平等的陪伴。在諮商室這個安全、保密的空間裡，我們將一起去整理那些繁雜的情緒，理解困擾背後的意義，並在岩石的縫隙中，尋找土壤與光線，長出屬於你自己的獨特年輪。無論你正面臨焦慮、憂鬱、還是生活中的各種抉擇，我都願意與你一起，在對話中找回內在的力量。`,
    specialties: ["憂鬱與焦慮情緒調適", "強迫行為與囤積行為諮商", "多元性別 (LGBTQIA+) 議題", "生涯發展與學習困擾", "人際與親密關係"],
    approaches: ["認知行為治療 (CBT)", "接納承諾治療 (ACT)", "存在主義取向心理諮商"],
    licenses: [],
    associations: [],
    experience: [],
    training: [],
    publications: [],
    services: [],
  },
  veronica: {
    letter: `你好，我是 Veronica。

生命是由無數個關係交織而成的。在這些關係中，我們有時會迷失了自己，忘記了如何傾聽內心深處那溫暖且真實的聲音。

我深信，每個人都擁有自我療癒的潛能。在我們的諮商旅程中，我會提供一個溫柔、沒有評判的空間，像是一片安靜的森林，讓你能夠卸下疲憊與防備，好好安頓自己。我們將一起探索你的內心世界、親密關係，以及在家庭或教養中的挑戰，協助你重新建立與自己、與他人的連結。`,
    specialties: ["自我探索與個人成長", "親密關係與伴侶諮商", "親子互動與親職教養諮商", "工作與生活壓力調適"],
    approaches: ["人本主義心理治療", "情緒取向伴侶諮商 (EFT)", "薩提爾家族治療模式"],
    licenses: [],
    associations: [],
    experience: [],
    training: [],
    publications: [],
    services: [],
  },
  joyce: {
    letter: `你好，我是文靜（Joyce）。

在迷惘與焦慮的陰影下，我們常常會懷疑自己的價值，或者在人際的互動中感到疲憊不堪。這些掙扎，其實都是心靈在向我們發出渴望被理解的訊號。

在諮商中，我注重的是「此時此刻」的真實相遇。我希望能陪你一起慢下來，去感覺、去理解那些被壓抑的情緒。我們將在對話中梳理那些糾纏不清的思緒，看見你身上的資源與特質，陪伴你度過自我探索的混亂期，走向更加自在與統整的自己。`,
    specialties: ["人際關係與情感依附", "自我探索與認同發展", "情緒困擾與壓力管理", "性別認同與多元文化"],
    approaches: ["焦點解決短期治療 (SFBT)", "敘事治療 (Narrative Therapy)", "關係動力取向諮商"],
    licenses: [],
    associations: [],
    experience: [],
    training: [],
    publications: [],
    services: [],
  },
  mfok: {
    letter: `你好，我是 M Fok。

不論你正經歷著多大的風雨，或者在社會、關係的邊緣感到孤單，我都希望能為你提供一個可以安心棲息的角落。

我擁有在多元文化與跨國背景下工作的經驗。在輔導中，我會以極大的接納與專業，陪你一同面對生命中的創傷、深刻的情緒困擾、以及自我認同的挑戰。在這裡，你不需要去迎合任何人的期待，只需要呈現你最真實的樣子，我們將一起尋求重建心靈和諧的方法。`,
    specialties: ["創傷經歷與創傷後壓力調適", "深刻情緒困擾 (抑鬱、強迫等)", "LGBTQIA+ 及性別認同諮商", "跨文化適應與生涯規劃"],
    approaches: ["創傷知情心理治療", "精神動力取向諮商", "正念與認知治療"],
    licenses: [],
    associations: [],
    experience: [],
    training: [],
    publications: [],
    services: [],
  },
};

// Social media icons as inline SVG
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function ThreadsIcon() {
  return (
    <svg viewBox="0 0 192 192" fill="currentColor" className="w-4 h-4">
      <path d="M141.537 88.988a66 66 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-45.488 16.351-22.809-.169-40.06-7.484-51.275-21.742C35.236 139.966 29.808 120.682 29.605 96c.203-24.682 5.63-43.966 16.133-57.317C56.954 24.425 74.204 17.11 97.013 16.94c22.975.17 40.526 7.52 52.171 21.847 5.71 7.026 10.015 15.86 12.853 26.162l16.147-4.308c-3.44-12.68-8.853-23.606-16.219-32.668C147.036 9.607 125.202.195 97.07 0h-.113C68.882.195 47.292 9.642 32.788 28.08 19.882 44.485 13.224 67.315 13.001 96v.5c.223 28.685 6.88 51.515 19.787 67.92C47.292 182.358 68.882 191.805 96.957 192h.113c24.96-.173 42.554-6.708 57.048-21.189 18.963-18.945 18.392-42.692 12.142-57.27-4.484-10.454-13.033-18.945-24.723-24.553ZM98.44 129.507c-10.44.588-21.286-4.098-21.82-14.135-.396-7.442 5.278-15.746 22.427-16.735 1.961-.113 3.887-.169 5.778-.169 6.118 0 11.88.588 17.14 1.717-1.955 24.375-13.309 28.713-23.525 29.322Z" />
    </svg>
  );
}

async function getProfileFromDB(id: string): Promise<Partial<TherapistDetail> | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase
      .from("therapist_profiles")
      .select("licenses, associations, experience, training, publications, services")
      .eq("id", id)
      .single();
    return data ?? null;
  } catch {
    return null;
  }
}

export default async function TherapistPage({ params }: Props) {
  const { id } = await params;
  const member = TEAM.find((m) => m.id === id);
  if (!member) {
    notFound();
  }

  const staticDetail = THERAPIST_DETAILS[id] ?? {
    letter: `你好，我是 ${member.name}。\n\n我們每個人都有感到疲倦與無助的時刻，我希望能提供一個安全的空間，陪伴你重新整理自己，在對話中看見新的方向。`,
    specialties: ["自我探索", "壓力調適"],
    approaches: ["折衷心理諮商"],
  };

  const dbProfile = await getProfileFromDB(id);

  // Merge: DB data overrides static optional fields; letter/specialties/approaches stay static
  const detail: TherapistDetail = {
    ...staticDetail,
    ...(dbProfile ?? {}),
  };

  const socialLinks = [
    member.instagram && { href: member.instagram, label: "Instagram", Icon: InstagramIcon },
    ("facebook" in member) && member.facebook && { href: member.facebook as string, label: "Facebook", Icon: FacebookIcon },
    ("threads" in member) && (member as { threads?: string }).threads && {
      href: (member as { threads?: string }).threads as string,
      label: "Threads",
      Icon: ThreadsIcon,
    },
  ].filter(Boolean) as { href: string; label: string; Icon: () => React.ReactElement }[];

  return (
    <>
      <section className="pt-32 pb-24 bg-paper min-h-screen">
        <div className="max-w-4xl mx-auto px-6">
          {/* Back button */}
          <FadeIn className="mb-10">
            <Link
              href="/team"
              className="inline-flex items-center text-xs font-sans text-muted hover:text-forest transition-colors cursor-pointer"
            >
              ← 返回團隊列表
            </Link>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16 items-start">
            {/* Left Column */}
            <div className="md:col-span-4 space-y-6">
              <FadeIn direction="left">
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-sand/10 border border-sand/10">
                  <Image
                    src={member.photo}
                    alt={member.name}
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 768px) 100vw, 30vw"
                    unoptimized
                  />
                </div>
              </FadeIn>

              <FadeIn direction="left" delay={100} className="space-y-5 pt-2">
                {/* 姓名 + 頭銜 */}
                <div>
                  <h1 className="font-serif text-deep text-3xl mb-1">{member.name}</h1>
                  <p className="font-garamond text-muted text-lg">{member.nameEn}</p>
                  <p className="font-sans text-xs text-sand tracking-wider mt-1">{member.title}</p>
                </div>

                {/* 社交媒體 */}
                {socialLinks.length > 0 && (
                  <div className="flex items-center gap-3 pt-1">
                    {socialLinks.map(({ href, label, Icon }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        className="text-muted/60 hover:text-forest transition-colors"
                      >
                        <Icon />
                      </a>
                    ))}
                  </div>
                )}

                {/* CTA */}
                <div className="pt-2">
                  <Link
                    href={`/booking?therapist=${member.id}`}
                    className="w-full inline-flex items-center justify-center py-3 bg-forest text-paper text-xs font-sans tracking-wide hover:bg-deep transition-colors cursor-pointer"
                  >
                    預約 {member.name} 諮詢
                  </Link>
                </div>
              </FadeIn>
            </div>

            {/* Right Column: Tabs */}
            <FadeIn direction="right" delay={150} className="md:col-span-8">
              <TherapistTabs
                detail={detail}
                memberEducation={member.education}
              />
            </FadeIn>
          </div>
        </div>
      </section>
    </>
  );
}
