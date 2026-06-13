import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import FadeIn from "@/components/ui/FadeIn";
import { WeepingWillow } from "@/components/ui/VibrantPlants";
import { getArticleById, getAllArticleIds } from "@/lib/articles";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const ids = await getAllArticleIds();
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) return {};
  return {
    title: `${article.title} - 最新消息與文章`,
    description: article.excerpt,
  };
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) notFound();

  return (
    <div className="relative w-full overflow-hidden bg-background isolate">
      <WeepingWillow
        className="absolute right-[2%] top-[180px] w-[280px] h-[500px] sm:w-[380px] sm:h-[680px] opacity-[0.03] z-[-1] pointer-events-none"
        mirror={true}
        variant="default"
      />

      <section className="pt-36 pb-24 bg-transparent min-h-screen relative z-10">
        <div className="max-w-3xl mx-auto px-6">
          <FadeIn className="mb-10">
            <Link
              href="/news"
              className="inline-flex items-center text-xs font-sans text-muted hover:text-forest transition-colors cursor-pointer group"
            >
              <span className="transform group-hover:-translate-x-1 transition-transform mr-1">←</span>
              返回文章列表
            </Link>
          </FadeIn>

          <article className="space-y-8">
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

            {article.photo && (
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
            )}

            <FadeIn delay={120}>
              <div className="font-sans text-muted text-base leading-relaxed prose-article">
                <ReactMarkdown
                  components={{
                    h2: ({ children }) => (
                      <h2 className="font-serif text-deep text-2xl mt-10 mb-4">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="font-serif text-deep text-xl mt-8 mb-3">{children}</h3>
                    ),
                    p: ({ children }) => (
                      <p className="mb-5 leading-relaxed">{children}</p>
                    ),
                    strong: ({ children }) => (
                      <strong className="text-deep font-medium">{children}</strong>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal pl-6 space-y-2 mb-5">{children}</ol>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc pl-6 space-y-2 mb-5">{children}</ul>
                    ),
                    li: ({ children }) => (
                      <li className="leading-relaxed">{children}</li>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-sand pl-5 italic text-muted/70 my-6">
                        {children}
                      </blockquote>
                    ),
                    hr: () => <hr className="border-sand/20 my-8" />,
                    a: ({ href, children }) => (
                      <a href={href} className="text-forest underline underline-offset-2 hover:text-deep transition-colors" target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    ),
                  }}
                >
                  {article.content}
                </ReactMarkdown>
              </div>
            </FadeIn>
          </article>

          <FadeIn delay={180} className="mt-20 p-8 border border-sand/15 bg-paper/40 backdrop-blur-[2px] flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 text-center sm:text-left">
              <p className="font-serif text-deep text-lg">對文章中的議題有共鳴，想進一步聊聊？</p>
              <p className="font-sans text-muted text-xs">我們的心理輔導師團隊隨時提供溫暖而專業的陪伴。</p>
            </div>
            <Link
              href="/booking"
              className="px-8 py-3.5 bg-forest text-paper text-xs font-sans tracking-wide hover:bg-deep transition-all cursor-pointer block text-center whitespace-nowrap"
            >
              立即預約諮商
            </Link>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
