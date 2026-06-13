import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import React from "react";
import FadeIn from "@/components/ui/FadeIn";
import TherapistTabs, { type TherapistDetail } from "@/components/ui/TherapistTabs";
import { TEAM } from "@/lib/data";

export const dynamic = "force-dynamic";

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
  const db = await getProfileFromDB(id);
  if (!db?.name) return {};
  return {
    title: [db.name, db.name_en !== db.name ? db.name_en : null, db.title].filter(Boolean).join(" — "),
    description: db.bio ?? undefined,
  };
}


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

type DBProfile = {
  name?: string;
  name_en?: string;
  bio?: string;
  photo_url?: string;
  title?: string;
  client_letter?: string;
  specialties?: string[];
  orientations?: string[];
  education?: string[];
  socials?: { instagram?: string; facebook?: string; threads?: string; xiaohongshu?: string };
  licenses?: string[];
  associations?: string[];
  experience?: { role: string; org: string; period: string }[];
  training?: string[];
  publications?: { title: string; year?: string; note?: string }[];
  services?: { name: string; fee: string; duration?: string; note?: string }[];
};

async function getProfileFromDB(id: string): Promise<DBProfile | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase
      .from("therapist_profiles")
      .select("name, name_en, bio, photo_url, title, client_letter, specialties, orientations, education, socials, licenses, associations, experience, training, publications, services")
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

  const dbProfile = await getProfileFromDB(id);

  const displayName   = dbProfile?.name      || "";
  const displayNameEn = dbProfile?.name_en   || "";
  const displayTitle  = dbProfile?.title     || "";
  const displayPhoto  = dbProfile?.photo_url || "";
  const displayBio    = dbProfile?.bio       || "";

  const detail: TherapistDetail = {
    letter: dbProfile?.client_letter || "",
    specialties: dbProfile?.specialties ?? [],
    approaches: dbProfile?.orientations ?? [],
    licenses: dbProfile?.licenses ?? [],
    associations: dbProfile?.associations ?? [],
    experience: dbProfile?.experience ?? [],
    training: dbProfile?.training ?? [],
    publications: dbProfile?.publications ?? [],
    services: dbProfile?.services ?? [],
  };

  const education = dbProfile?.education ?? [];

  const dbSocials = dbProfile?.socials ?? {};
  const socialLinks = [
    dbSocials.instagram && { href: dbSocials.instagram, label: "Instagram", Icon: InstagramIcon },
    dbSocials.facebook  && { href: dbSocials.facebook,  label: "Facebook",  Icon: FacebookIcon  },
    dbSocials.threads   && { href: dbSocials.threads,   label: "Threads",   Icon: ThreadsIcon   },
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
                  {displayPhoto ? (
                    <Image
                      src={displayPhoto}
                      alt={displayName}
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 768px) 100vw, 30vw"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-sand/10" />
                  )}
                </div>
              </FadeIn>

              <FadeIn direction="left" delay={100} className="space-y-5 pt-2">
                {/* 姓名 + 頭銜 */}
                <div>
                  <h1 className="font-serif text-deep text-3xl mb-1">{displayName}</h1>
                  <p className="font-garamond text-muted text-lg">{displayNameEn}</p>
                  <p className="font-sans text-xs text-sand tracking-wider mt-1">{displayTitle}</p>
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
                    預約 {displayName} 諮詢
                  </Link>
                </div>
              </FadeIn>
            </div>

            {/* Right Column: Tabs */}
            <FadeIn direction="right" delay={150} className="md:col-span-8">
              <TherapistTabs
                detail={detail}
                memberEducation={education}
              />
            </FadeIn>
          </div>
        </div>
      </section>
    </>
  );
}
