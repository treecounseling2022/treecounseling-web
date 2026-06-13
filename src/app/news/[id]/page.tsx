import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import FadeIn from "@/components/ui/FadeIn";
import { WeepingWillow } from "@/components/ui/VibrantPlants";
import { ARTICLES } from "@/lib/data";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return ARTICLES.map((article) => ({
    id: article.id,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const article = ARTICLES.find((a) => a.id === id);
  if (!article) return {};

  return {
    title: `${article.title} - 最新消息與文章`,
    description: article.excerpt,
  };
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params;
  const article = ARTICLES.find((a) => a.id === id);
  if (!article) {
    notFound();
  }

  return (
    <div className="relative w-full overflow-hidden bg-background isolate">
      {/* 頁面級全景水墨背景層 */}
      {/* 1. 左側或右側淡淡的垂柳影 (營造安靜舒適的閱讀環境) */}
      <WeepingWillow 
        className="absolute right-[2%] top-[180px] w-[280px] h-[500px] sm:w-[380px] sm:h-[680px] opacity-[0.03] z-[-1] pointer-events-none" 
        mirror={true} 
        variant="default" 
      />

      {/* 前景內容層 (z-10, bg-transparent) */}
      <section className="pt-36 pb-24 bg-transparent min-h-screen relative z-10">
        <div className="max-w-3xl mx-auto px-6">
          
          {/* Back button */}
          <FadeIn className="mb-10">
            <Link
              href="/news"
              className="inline-flex items-center text-xs font-sans text-muted hover:text-forest transition-colors cursor-pointer group"
            >
              <span className="transform group-hover:-translate-x-1 transition-transform mr-1">←</span> 返回文章列表
            </Link>
          </FadeIn>

          <article className="space-y-8">
            {/* Meta */}
            <FadeIn className="space-y-4">
              <div className="flex gap-3 items-center text-xs font-sans text-sand tracking-widest uppercase">
                <span className="text-forest font-medium">{article.category}</span>
                <span>·</span>
                <span>{article.date}</span>
              </div>
              <h1 className="font-serif text-deep text-3xl md:text-4xl leading-tight">
                {article.title}
              </h1>
              <div className="flex items-center gap-4 text-xs font-sans text-muted/60 pt-2 border-b border-sand/15 pb-6">
                <span>作者：{article.author}</span>
                <span>·</span>
                <span>預估閱讀時間：{article.readTime}</span>
              </div>
            </FadeIn>

            {/* Photo */}
            <FadeIn delay={80}>
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-sand/10 border border-sand/15">
                <Image
                  src={article.photo}
                  alt={article.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 80vw"
                  unoptimized
                />
              </div>
            </FadeIn>

            {/* Content */}
            <FadeIn delay={120} className="prose max-w-none pt-4">
              <div className="font-sans text-muted text-base leading-relaxed whitespace-pre-line space-y-6">
                {article.content}
              </div>
            </FadeIn>
          </article>

          {/* Footer CTA & Share (重塑為精緻手寫紙底) */}
          <FadeIn delay={180} className="mt-20 p-8 border border-sand/15 bg-paper/40 backdrop-blur-[2px] flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 text-center sm:text-left">
              <p className="font-serif text-deep text-lg">對文章中的議題有共鳴，想進一步聊聊？</p>
              <p className="font-sans text-muted text-xs">我們的心理輔導師團隊隨時提供溫暖而專業的陪伴。</p>
            </div>
            <Link
              href="/booking"
              className="px-8 py-3.5 bg-forest text-paper text-xs font-sans tracking-wide hover:bg-deep transition-all cursor-pointer block text-center whitespace-nowrap hover:shadow-sm active:scale-[0.98]"
            >
              立即預約諮商
            </Link>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
