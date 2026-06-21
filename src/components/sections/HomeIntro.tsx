import FadeIn from "@/components/ui/FadeIn";
import ScrollDivider from "@/components/ui/ScrollDivider";

export default function HomeIntro() {
  return (
    <section className="bg-transparent py-24 md:py-32 relative overflow-hidden">
      <ScrollDivider className="absolute top-0 left-0" />
      
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          {/* Left: Studio intro */}
          <FadeIn direction="left" className="lg:col-span-5 space-y-6">
            <p className="text-xs font-sans tracking-widest text-sand uppercase">
              關於樹心理工作室
            </p>
            <h2 className="font-serif text-deep text-3xl md:text-4xl leading-snug">
              以「樹」之名，
              <br />
              見證內在的生長
            </h2>
            <div className="space-y-4 text-muted font-sans text-sm leading-relaxed">
              <p>
                我們相信人與樹十分相似——即使被困擾壓縮得只剩裂縫的喘息空間，
                也能透過默默地向下扎根，蓄積強大的生命力，長成令人敬畏的繁茂。
              </p>
              <p>
                樹心理工作室成立於 2022 年，是澳門專業的心理輔導私營機構。
                我們致力於將溫暖、專業且去標籤化的輔導文化植根於這座城市，
                讓每位前來的朋友都能在安靜的空間中，找回面對生活的勇氣。
              </p>
            </div>
          </FadeIn>

          {/* Right: Values grid without card shapes */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-10">
            {[
              { num: "01", title: "保密", desc: "獨立運作，保密是我們服務的首要底線，提供安全無虞的隱私環境。" },
              { num: "02", title: "專業", desc: "團隊均持有輔導心理學碩士或在讀博士學位，持續接受督導與進修。" },
              { num: "03", title: "責任", desc: "竭盡社會與專業責任，持續推廣大眾心理健康教育，提供學子實習訓練。" },
              { num: "04", title: "突破", desc: "開創本地輔導發展新模式，去標籤化、去病理化，提供更具溫度與自主的選擇。" },
            ].map((v, i) => (
              <FadeIn key={v.num} delay={i * 100} direction="up">
                <div className="space-y-3 pb-6 border-b border-sand/15 h-full flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-2">
                      <span className="font-garamond text-sand text-lg font-light">{v.num}</span>
                      <h3 className="font-serif text-deep text-lg">{v.title}</h3>
                    </div>
                    <p className="font-sans text-muted text-sm leading-relaxed">{v.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
