import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import FadeIn from "@/components/ui/FadeIn";
import ScrollDivider from "@/components/ui/ScrollDivider";
import { VibrantTreeCrown, LushFern } from "@/components/ui/VibrantPlants";
import { TEAM } from "@/lib/data";

export const metadata: Metadata = {
  title: "專業團隊",
  description:
    "樹心理工作室的專業輔導團隊均持有輔導心理學碩士學歷，擁有豐富的跨機構實務經驗並持續進修。",
};

export default function TeamPage() {
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
              {TEAM.map((member, i) => (
                <FadeIn key={member.id} direction="up" delay={i * 80}>
                  <div className="group flex flex-row gap-6 items-start h-full">
                    
                    {/* Photo (彩色, 精緻小尺寸) */}
                    <Link 
                      href={`/team/${member.id}`} 
                      className="block group cursor-pointer overflow-hidden bg-sand/5 flex-shrink-0 w-28 sm:w-36"
                    >
                      <div className="relative aspect-[3/4] w-full overflow-hidden">
                        <Image
                          src={member.photo}
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
                          <p className="font-sans text-[10px] text-sand tracking-widest uppercase">
                            {member.title}
                          </p>
                          <h2 className="font-serif text-deep text-xl group-hover:text-forest transition-colors">
                            <Link href={`/team/${member.id}`}>{member.name}</Link>
                          </h2>
                          {member.nameEn !== member.name && (
                            <p className="font-garamond text-muted/60 text-xs tracking-wide">{member.nameEn}</p>
                          )}
                        </div>

                        <p className="font-sans text-muted text-xs leading-relaxed line-clamp-3">
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

                        {/* Social Links */}
                        {(member.instagram || member.facebook) && (
                          <div className="flex items-center gap-3 pt-2 border-t border-sand/15">
                            {member.facebook && (
                              <a
                                href={member.facebook}
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
                            {member.instagram && (
                              <a
                                href={member.instagram}
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
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
