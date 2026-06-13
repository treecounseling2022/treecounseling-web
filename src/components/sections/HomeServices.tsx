import Link from "next/link";
import FadeIn from "@/components/ui/FadeIn";
import ScrollDivider from "@/components/ui/ScrollDivider";

const FEATURED_SERVICES = [
  {
    id: "individual",
    title: "個人心理輔導",
    subtitle: "情緒困擾・生涯探索・感情與人際關係",
    desc: "在混亂的生活步調中慢下來，陪你釐清那些糾結的情緒、焦慮與行為困擾，探索更自在的生活方式。",
  },
  {
    id: "couple",
    title: "伴侶心理輔導",
    subtitle: "親密溝通・關係修復・依附盲點探索",
    desc: "協助伴侶雙方看見互動中的防衛與期待，重建彼此的理解與信任橋樑，找回相處的親密共鳴。",
  },
  {
    id: "workshop",
    title: "講座和工作坊",
    subtitle: "心理推廣・企業學校・主題客製化",
    desc: "針對不同群體量身設計的心理講座與體驗式工作坊。以預防與自我覺察為主，需提前一個月預約。",
  },
];

export default function HomeServices() {
  return (
    <section className="bg-transparent py-24 md:py-32 relative overflow-hidden">
      <ScrollDivider className="absolute top-0 left-0" />
      
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <FadeIn>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-6">
            <div>
              <p className="text-xs font-sans tracking-widest text-sand uppercase mb-4">
                Services
              </p>
              <h2 className="font-serif text-deep text-3xl md:text-4xl leading-snug">
                我們能如何陪伴你
              </h2>
            </div>
            <Link
              href="/services"
              className="text-sm font-sans text-muted hover:text-forest transition-colors link-underline pb-1 self-start md:self-auto cursor-pointer"
            >
              查看所有服務項目及收費 →
            </Link>
          </div>
        </FadeIn>

        {/* Clean list layout without boxes - Three columns for better balance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 lg:gap-x-12 gap-y-12">
          {FEATURED_SERVICES.map((s, i) => (
            <FadeIn key={s.id} delay={i * 80} direction="up">
              <div className="group space-y-4 pb-8 border-b border-sand/15 h-full flex flex-col justify-between">
                <div className="space-y-3">
                  <p className="font-garamond text-sand text-lg font-light">
                    0{i + 1}
                  </p>
                  <h3 className="font-serif text-deep text-xl group-hover:text-forest transition-colors">
                    {s.title}
                  </h3>
                  <p className="font-sans text-sand text-xs tracking-wider">
                    {s.subtitle}
                  </p>
                  <p className="font-sans text-muted text-sm leading-relaxed pt-2">
                    {s.desc}
                  </p>
                </div>
                <div className="pt-4">
                  <Link
                    href={`/booking?service=${s.id}`}
                    className="text-xs font-sans text-muted group-hover:text-forest transition-colors link-underline pb-0.5"
                  >
                    預約此項服務 →
                  </Link>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
