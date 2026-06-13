import type { Metadata } from "next";
import FadeIn from "@/components/ui/FadeIn";
import { VibrantTreeCrown } from "@/components/ui/VibrantPlants";
import { getAllArticles } from "@/lib/articles";
import NewsClient from "./NewsClient";

export const metadata: Metadata = {
  title: "最新消息與文章",
  description: "樹心理工作室持續分享專業的心理健康知識、工作室的最新公告以及工作坊活動資訊。",
};

export default async function NewsPage() {
  const articles = await getAllArticles();

  return (
    <div className="relative w-full overflow-hidden bg-background isolate">
      <VibrantTreeCrown
        className="absolute left-1/2 -translate-x-1/2 bottom-[-80px] sm:bottom-[-110px] lg:bottom-[-135px] w-[800px] h-auto aspect-[12/11] sm:w-[1400px] lg:w-[2000px] opacity-[0.04] z-[-1] pointer-events-none origin-bottom"
        variant="default"
      />

      <div className="relative z-10 bg-transparent">
        <section className="bg-transparent pt-36 pb-16">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <p className="text-xs font-sans tracking-widest text-sand uppercase mb-4">News & Articles</p>
              <h1 className="font-serif text-deep text-4xl md:text-5xl leading-tight mb-6">
                最新消息與文章
              </h1>
              <p className="font-sans text-muted text-sm max-w-lg leading-relaxed">
                我們持續分享專業的心理健康知識、工作室的最新公告以及工作坊活動資訊。
                讓心理輔導文化溫柔地融入日常生活。
              </p>
            </FadeIn>
          </div>
        </section>

        <section className="bg-transparent py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-6">
            <NewsClient articles={articles} />
          </div>
        </section>
      </div>
    </div>
  );
}
