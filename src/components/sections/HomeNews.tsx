import Link from "next/link";
import FadeIn from "@/components/ui/FadeIn";
import ScrollDivider from "@/components/ui/ScrollDivider";
import { getAllArticles } from "@/lib/articles";

export default async function HomeNews() {
  const articles = await getAllArticles();
  const latestArticles = articles.slice(0, 3);

  return (
    <section className="bg-transparent py-24 md:py-32 relative overflow-hidden">
      <ScrollDivider className="absolute top-0 left-0" />
      
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <FadeIn>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <p className="text-xs font-sans tracking-widest text-sand uppercase mb-4">
                News & Articles
              </p>
              <h2 className="font-serif text-deep text-3xl md:text-4xl leading-snug">
                最新消息與文章
              </h2>
            </div>
            <Link
              href="/news"
              className="text-sm font-sans text-muted hover:text-forest transition-colors link-underline pb-1 self-start md:self-auto cursor-pointer"
            >
              查看所有消息與文章 →
            </Link>
          </div>
        </FadeIn>

        {/* 3-column list using fine lines and minimalist paper cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {latestArticles.map((article, i) => (
            <FadeIn key={article.id} delay={i * 80} direction="up">
              <Link href={`/news/${article.id}`} className="group block h-full cursor-pointer">
                <div className="flex flex-col justify-between h-full p-6 bg-paper/40 border border-sand/15 hover:border-sand/40 hover:bg-paper/60 transition-all duration-300 relative min-h-[280px]">
                  <div className="space-y-4">
                    {/* Category & Date */}
                    <div className="flex items-center gap-3 text-xs font-sans text-muted/60">
                      <span className="text-forest font-medium">{article.category}</span>
                      <span>·</span>
                      <span>{article.date}</span>
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-deep text-xl group-hover:text-forest transition-colors line-clamp-2 leading-snug">
                      {article.title}
                    </h3>

                    {/* Excerpt */}
                    <p className="font-sans text-muted text-sm leading-relaxed line-clamp-3">
                      {article.excerpt}
                    </p>
                  </div>

                  {/* Read More Link */}
                  <div className="pt-6 border-t border-sand/10 flex items-center justify-between text-xs font-sans text-muted group-hover:text-forest transition-colors mt-6">
                    <span>作者：{article.author}</span>
                    <span className="border-b border-transparent group-hover:border-forest pb-0.5 transition-all">
                      閱讀更多 →
                    </span>
                  </div>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
