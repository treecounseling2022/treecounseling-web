"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import FadeIn from "@/components/ui/FadeIn";
import type { Article } from "@/lib/articles";

const CATEGORIES = ["全部", "公告", "心理知識", "活動"];

export default function NewsClient({ articles }: { articles: Article[] }) {
  const [activeCategory, setActiveCategory] = useState("全部");

  const filtered = articles.filter(
    (a) => activeCategory === "全部" || a.category === activeCategory
  );

  return (
    <>
      {/* Category Filter */}
      <FadeIn className="flex flex-wrap gap-3 mb-16 border-b border-sand/15 pb-6 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 border font-sans text-xs tracking-wide transition-all cursor-pointer rounded-none whitespace-nowrap ${
              activeCategory === cat
                ? "border-forest bg-forest text-paper font-medium"
                : "border-sand/15 bg-paper/20 text-muted hover:border-forest/40 hover:text-forest"
            }`}
          >
            {cat}
          </button>
        ))}
      </FadeIn>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12">
          {filtered.map((article, idx) => (
            <FadeIn key={article.id} direction="up" delay={idx * 60}>
              <Link href={`/news/${article.id}`} className="group block h-full cursor-pointer">
                <div className="flex flex-col h-full bg-paper/40 backdrop-blur-[2px] border border-sand/15 hover:border-sand/40 hover:bg-paper/75 transition-all duration-300 transform hover:-translate-y-0.5">
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-sand/10">
                    {article.photo ? (
                      <Image
                        src={article.photo}
                        alt={article.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                        sizes="(max-width: 768px) 100vw, 45vw"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full bg-soft flex items-center justify-center">
                        <span className="font-garamond text-sand/40 text-2xl">樹</span>
                      </div>
                    )}
                    <div className="absolute top-4 left-4 bg-paper/90 backdrop-blur-sm text-forest text-[10px] font-sans px-3 py-1 tracking-widest uppercase">
                      {article.category}
                    </div>
                  </div>

                  <div className="p-6 md:p-8 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex gap-4 text-xs font-sans text-muted/60">
                        <span>{article.date}</span>
                        <span>·</span>
                        <span>{article.readTime} 閱讀</span>
                      </div>
                      <h2 className="font-serif text-deep text-xl md:text-2xl group-hover:text-forest transition-colors line-clamp-2 leading-snug">
                        {article.title}
                      </h2>
                      <p className="font-sans text-muted text-sm leading-relaxed line-clamp-3">
                        {article.excerpt}
                      </p>
                    </div>
                    <div className="pt-4 flex items-center justify-between text-xs font-sans text-muted group-hover:text-forest transition-colors border-t border-sand/10">
                      <span>作者：{article.author}</span>
                      <span className="border-b border-transparent group-hover:border-forest pb-0.5 transition-all">
                        閱讀更多 →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-sand/20 bg-paper/30 backdrop-blur-[2px]">
          <p className="font-sans text-muted text-sm">目前該分類下尚無文章，敬請期待。</p>
        </div>
      )}
    </>
  );
}
