import Link from "next/link";
import Image from "next/image";
import FadeIn from "@/components/ui/FadeIn";
import { TEAM } from "@/lib/data";

export default function HomeTeam() {
  return (
    <section className="bg-paper py-24 md:py-32 border-t border-sand/10">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-6">
            <div>
              <p className="text-xs font-sans tracking-widest text-sand uppercase mb-4">
                Team
              </p>
              <h2 className="font-serif text-deep text-3xl md:text-4xl leading-snug">
                陪伴你扎根的心理師
              </h2>
            </div>
            <Link
              href="/team"
              className="text-sm font-sans text-muted hover:text-forest transition-colors border-b border-muted/30 hover:border-forest pb-1 self-start md:self-auto cursor-pointer"
            >
              認識我們的心理師團隊 →
            </Link>
          </div>
        </FadeIn>

        {/* Clean team grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
          {TEAM.map((member, i) => (
            <FadeIn key={member.id} delay={i * 100} direction="up">
              <Link href={`/team/${member.id}`} className="group block cursor-pointer space-y-4">
                <div className="relative aspect-[3/4] overflow-hidden bg-sand/5 border border-sand/10">
                  <Image
                    src={member.photo}
                    alt={member.name}
                    fill
                    className="object-cover object-top filter grayscale contrast-[0.95] brightness-[1.02] transition-[transform,filter] duration-500 group-hover:scale-102 group-hover:grayscale-0"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  {/* Subtle paper-like grain filter overlay */}
                  <div className="absolute inset-0 bg-deep/5 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                </div>
                <div className="space-y-1">
                  <p className="font-sans text-xs text-sand tracking-widest uppercase">
                    {member.title}
                  </p>
                  <h3 className="font-serif text-deep text-base group-hover:text-forest transition-colors">
                    {member.name}
                    {member.nameEn !== member.name && (
                      <span className="font-garamond text-muted text-xs ml-2 font-light">
                        {member.nameEn}
                      </span>
                    )}
                  </h3>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
