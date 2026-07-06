import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import FadeIn from "@/components/ui/FadeIn";
import ScrollDivider from "@/components/ui/ScrollDivider";
import { VibrantTreeCrown, LushFern } from "@/components/ui/VibrantPlants";
import { TEAM } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "專業團隊",
  description:
    "樹心理工作室的專業輔導團隊均持有輔導心理學碩士學歷，擁有豐富的跨機構實務經驗並持續進修。",
};

type Socials = { instagram?: string; facebook?: string; threads?: string };

function ThreadsIcon() {
  return (
    <svg viewBox="0 0 192 192" fill="currentColor" className="w-4 h-4">
      <path d="M141.537 88.988a66 66 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-45.488 16.351-22.809-.169-40.06-7.484-51.275-21.742C35.236 139.966 29.808 120.682 29.605 96c.203-24.682 5.63-43.966 16.133-57.317C56.954 24.425 74.204 17.11 97.013 16.94c22.975.17 40.526 7.52 52.171 21.847 5.71 7.026 10.015 15.86 12.853 26.162l16.147-4.308c-3.44-12.68-8.853-23.606-16.219-32.668C147.036 9.607 125.202.195 97.07 0h-.113C68.882.195 47.292 9.642 32.788 28.08 19.882 44.485 13.224 67.315 13.001 96v.5c.223 28.685 6.88 51.515 19.787 67.92C47.292 182.358 68.882 191.805 96.957 192h.113c24.96-.173 42.554-6.708 57.048-21.189 18.963-18.945 18.392-42.692 12.142-57.27-4.484-10.454-13.033-18.945-24.723-24.553ZM98.44 129.507c-10.44.588-21.286-4.098-21.82-14.135-.396-7.442 5.278-15.746 22.427-16.735 1.961-.113 3.887-.169 5.778-.169 6.118 0 11.88.588 17.14 1.717-1.955 24.375-13.309 28.713-23.525 29.322Z" />
    </svg>
  );
}

export default async function TeamPage() {
  // Fetch social links from Supabase (DB is source of truth; data.ts is fallback)
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("therapist_profiles")
    .select("id, socials, photo_url");
  const socialsMap: Record<string, Socials> = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, (p.socials as Socials) ?? {}])
  );
  const photoMap: Record<string, string | null> = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p.photo_url as string | null])
  );
  return (
    <div className="relative w-full overflow-hidden bg-background isolate">
      {/* 頁面級全景水墨背景層 (z-[-1], 超低不透明度，30秒慢生長) */}
      
      {/* 1. 頁尾水墨生命樹 (縮小並精準定位至右下角 Footer 交界處) */}
      <VibrantTreeCrown 
        className="absolute right-[2%] bottom-[-20px] sm:bottom-[-30px] lg:bottom-[-40px] w-[300px] h-auto aspect-[12/11] sm:w-[450px] lg:w-[600px] opacity-[0.04] z-[-1] pointer-events-none origin-bottom" 
        variant="default" 
      />
      
      {/* 2. 左下水墨野蕨 (底部背景，置底淡墨) */}
      <LushFern 
        className="absolute left-[2%] bottom-[200px] w-[280px] h-[450px] sm:w-[380px] sm:h-[600px] opacity-[0.08] z-[-1] pointer-events-none" 
        mirror={true} 
        variant="cool" 
      />

      {/* 前景內容層 (z-10, bg-transparent) */}
      <div className="relative z-10 bg-transparent">
        
        {/* Header */}
        <section className="bg-transparent pt-36 pb-16 relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <p className="text-xs font-sans tracking-widest text-sand uppercase mb-4">Team</p>
              <h1 className="font-serif text-deep text-4xl md:text-5xl leading-tight mb-6">
                專業團隊
              </h1>
              <p className="font-sans text-muted text-sm max-w-lg leading-relaxed">
                團隊均起碼擁有心理輔導碩士學歷，並於多種不同場域擁有實務經驗，
                持有多個地方的專業認證，並持續接受專業培訓。
              </p>
            </FadeIn>
          </div>
        </section>

        {/* Team Members Grid (並列網格，成員改為左右卡片) */}
        <section className="bg-transparent py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-x-16 lg:gap-y-16">
              {TEAM.map((member, i) => {
                const dbSocials = socialsMap[member.id] ?? {};
                const instagram = dbSocials.instagram ?? ("instagram" in member ? (member as {instagram?:string}).instagram : undefined);
                const facebook  = dbSocials.facebook  ?? ("facebook"  in member ? (member as {facebook?:string}).facebook   : undefined);
                const threads   = dbSocials.threads   ?? ("threads"   in member ? (member as {threads?:string}).threads     : undefined);
                return (
                <FadeIn key={member.id} direction="up" delay={i * 80}>
                  <div className="group flex flex-row gap-6 items-start h-full">
                    
                    {/* Photo (彩色, 精緻小尺寸) */}
                    <Link 
                      href={`/team/${member.id}`} 
                      className="block group cursor-pointer overflow-hidden bg-sand/5 flex-shrink-0 w-28 sm:w-36"
                    >
                      <div className="relative aspect-[3/4] w-full overflow-hidden">
                        <Image
                          src={photoMap[member.id] || member.photo}
                          alt={member.name}
                          fill
                          className="object-cover object-top transition-transform duration-700 group-hover:scale-103"
                          sizes="(max-width: 768px) 120px, 150px"
                          unoptimized
                        />
                      </div>
                    </Link>

                    {/* Info */}
                    <div className="flex flex-col justify-between h-full space-y-4">
                      <div className="space-y-2">
                        <div className="space-y-0.5">
                          <p className="font-sans text-xs text-sand tracking-widest uppercase">
                            {member.title}
                          </p>
                          <h2 className="font-serif text-deep text-xl group-hover:text-forest transition-colors">
                            <Link href={`/team/${member.id}`}>{member.name}</Link>
                          </h2>
                          {member.nameEn !== member.name && (
                            <p className="font-garamond text-muted/60 text-xs tracking-wide">{member.nameEn}</p>
                          )}
                        </div>

                        <p className="font-sans text-muted text-sm leading-relaxed line-clamp-3">
                          {member.bio}
                        </p>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div>
                          <Link
                            href={`/team/${member.id}`}
                            className="text-[11px] font-sans text-muted group-hover:text-forest transition-colors link-underline pb-0.5"
                          >
                            閱讀更多 →
                          </Link>
                        </div>

                        {/* Social Links — source: Supabase socials, fallback: data.ts */}
                        {(instagram || facebook || threads) && (
                          <div className="flex items-center gap-3 pt-2 border-t border-sand/15">
                            {facebook && (
                              <a
                                href={facebook}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Facebook"
                                className="text-muted/60 hover:text-forest transition-colors cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                                </svg>
                              </a>
                            )}
                            {instagram && (
                              <a
                                href={instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Instagram"
                                className="text-muted/60 hover:text-forest transition-colors cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                                </svg>
                              </a>
                            )}
                            {threads && (
                              <a
                                href={threads}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Threads"
                                className="text-muted/60 hover:text-forest transition-colors cursor-pointer"
                              >
                                <ThreadsIcon />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </FadeIn>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
