"use client";

import { useState } from "react";
import Link from "next/link";
import FadeIn from "@/components/ui/FadeIn";
import { SproutVine, SwayingFlower } from "@/components/ui/VibrantPlants";

const QUESTIONS = [
  { id: 1, text: "睡眠困難，例如不易入睡、易醒或早醒" },
  { id: 2, text: "感覺緊張不安或神經過敏" },
  { id: 3, text: "覺得容易發怒或生氣" },
  { id: 4, text: "感覺憂鬱、心情沮喪或悲傷" },
  { id: 5, text: "覺得比不上別人、缺乏自信" },
  { id: 6, text: "最近一星期中，你是否有自殺的想法？", isSuicidalQuery: true },
];

const OPTIONS = [
  { value: 0, label: "無" },
  { value: 1, label: "輕微" },
  { value: 2, label: "中等程度" },
  { value: 3, label: "厲害" },
  { value: 4, label: "非常厲害" },
];

export default function AssessmentPage() {
  const [step, setStep] = useState<"intro" | "quiz" | "result">("intro");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const handleStart = () => {
    setAnswers({});
    setCurrentIdx(0);
    setStep("quiz");
  };

  const handleSelect = (score: number) => {
    const newAnswers = { ...answers, [QUESTIONS[currentIdx].id]: score };
    setAnswers(newAnswers);

    if (currentIdx < QUESTIONS.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setStep("result");
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    } else {
      setStep("intro");
    }
  };

  // 計算分數 (前五題計分)
  const totalScore = QUESTIONS.filter(q => !q.isSuicidalQuery)
    .reduce((sum, q) => sum + (answers[q.id] || 0), 0);

  const suicidalScore = answers[6] || 0;

  // 身心狀態評語
  const getAnalysis = () => {
    let status = "";
    let advice = "";
    let colorClass = "";

    if (totalScore <= 5) {
      status = "身心適應狀況良好";
      advice = "您目前的情緒狀態相對穩定，調適能力良好。請繼續保持健康的生活作息，在忙碌之餘給自己留出安靜放鬆的空間。";
      colorClass = "text-forest border-forest/20 bg-forest/5";
    } else if (totalScore <= 9) {
      status = "輕度情緒困擾";
      advice = "您目前面臨輕微的心理壓力。建議您多留意身心變化，給自己喘息與休息的機會。可以試著和信任的家人或朋友談談，抒解積壓的焦慮；也可以藉由散步、運動或寫日記等方式放鬆心情。";
      colorClass = "text-sand border-sand/20 bg-sand/5";
    } else if (totalScore <= 14) {
      status = "中度情緒困擾";
      advice = "您目前的情緒壓力和困擾已達到中等程度。這些困擾可能已經開始影響您的日常生活、睡眠或工作。強烈建議您尋求專業心理輔導，由輔導人員陪伴您一起梳理混亂的思緒，找出壓力的來源與調適方式。";
      colorClass = "text-amber-800 border-amber-500/15 bg-amber-500/5";
    } else {
      status = "重度情緒困擾";
      advice = "您目前承受著極為沉重的身心壓力和負擔，這已嚴重影響您的生活品質。請不要獨自硬撐，強烈建議您儘快尋求專業諮商與醫療協助，由專業團隊為您量身規劃合適的調適方案，陪伴您度過這段艰难的時期。";
      colorClass = "text-red-800 border-red-500/15 bg-red-500/5";
    }

    // 自殺想法警示
    let suicidalWarning = "";
    if (suicidalScore >= 2) {
      suicidalWarning = "特別提醒：您在「自殺想法」一題中評分為中等程度以上。當出現這些念頭時，代表您的痛苦已超出負荷，請立即向身邊的人傾訴，或尋求專業心理輔導與醫療資源協助。";
    }

    return { status, advice, colorClass, suicidalWarning };
  };

  const analysis = getAnalysis();

  return (
    <div className="relative w-full overflow-hidden bg-background isolate">
      {/* 頁面級全景水墨背景層 (z-[-1], 超低不透明度，30秒緩慢發芽) */}
      
      {/* 1. 左上角水墨禪竹 (落在 Header 背後) */}
      <SproutVine className="absolute left-[2%] top-[80px] w-[280px] h-[480px] sm:w-[380px] sm:h-[650px] opacity-[0.06] z-[-1] pointer-events-none" variant="forest" />
      
      {/* 2. 右下角水墨寫意荷花 (落在卡片與底部背後) */}
      <SwayingFlower className="absolute right-[2%] bottom-[100px] w-[280px] h-[400px] sm:w-[380px] sm:h-[540px] opacity-[0.08] z-[-1] pointer-events-none" mirror={true} variant="default" />

      {/* 前景內容層 (z-10, bg-transparent) */}
      <div className="relative z-10 bg-transparent">
        
        {/* Header */}
        <section className="bg-transparent pt-36 pb-16">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <p className="text-xs font-sans tracking-widest text-sand uppercase mb-4">Self-Assessment</p>
              <h1 className="font-serif text-deep text-4xl md:text-5xl leading-tight mb-6">
                免費心理自評
              </h1>
              <p className="font-sans text-muted text-sm max-w-lg leading-relaxed">
                本測驗採用簡式健康量表 (BSRS-5)，協助您快速評估最近一星期內的心理健康與壓力狀態。
                所有答題完全保密，本站不會收集您的個人識別資訊。
              </p>
            </FadeIn>
          </div>
        </section>

        {/* Main Body */}
        <section className="bg-transparent py-16 md:py-20">
          <div className="max-w-3xl mx-auto px-6">
            {step === "intro" && (
              <FadeIn>
                <div className="bg-paper/40 backdrop-blur-[2px] border border-sand/15 p-8 md:p-12 text-center space-y-6">
                  <div className="w-14 h-14 border border-sand/15 rounded-full flex items-center justify-center mx-auto text-sand font-garamond text-lg bg-paper/20">
                    BSRS
                  </div>
                  <h2 className="font-serif text-deep text-2xl">簡式健康量表（心情溫度計）</h2>
                  <div className="text-sm text-muted leading-relaxed max-w-lg mx-auto space-y-3 text-left">
                    <p>這份量表能幫助您了解您的情緒困擾程度：</p>
                    <ul className="list-disc pl-5 space-y-1.5 text-xs">
                      <li>測驗包含 5 題核心症狀與 1 題自殺意念加問。</li>
                      <li>請根據您<strong>「最近一星期（包括今天）」</strong>的真實感覺來作答。</li>
                      <li>填寫大約需要 1 分鐘，回答完畢後將為您即時計算得分與提供專業調適建議。</li>
                    </ul>
                  </div>
                  <div className="pt-4">
                    <button
                      onClick={handleStart}
                      className="px-10 py-4 bg-forest text-paper text-sm font-sans tracking-wide hover:bg-deep transition-all cursor-pointer inline-flex items-center gap-2 hover:shadow-sm active:scale-[0.98]"
                    >
                      開始自評測驗 →
                    </button>
                  </div>
                </div>
              </FadeIn>
            )}

            {step === "quiz" && (
              <div className="bg-paper/40 backdrop-blur-[2px] border border-sand/15 p-8 md:p-12 space-y-8 min-h-[400px] flex flex-col justify-between">
                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-muted font-sans mb-2">
                    <span>進度</span>
                    <span>{currentIdx + 1} / {QUESTIONS.length}</span>
                  </div>
                  <div className="w-full h-[2px] bg-sand/10 relative">
                    <div
                      className="h-full bg-forest/70 transition-all duration-300"
                      style={{ width: `${((currentIdx + 1) / QUESTIONS.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Question text */}
                <div className="space-y-4 my-8">
                  <p className="font-sans text-xs text-sand tracking-widest uppercase">
                    {QUESTIONS[currentIdx].isSuicidalQuery ? "加問項目" : `問題 0${currentIdx + 1}`}
                  </p>
                  <h3 className="font-serif text-deep text-xl md:text-2xl leading-relaxed">
                    在最近一星期中，您感到：<br />
                    <span className="text-forest mt-2 block">{QUESTIONS[currentIdx].text}</span>
                  </h3>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleSelect(opt.value)}
                      className="w-full text-left px-6 py-4 bg-paper/30 border border-sand/15 hover:border-forest/40 hover:bg-paper/85 text-deep text-sm font-sans transition-all duration-200 cursor-pointer flex items-center justify-between group"
                    >
                      <span>{opt.label}</span>
                      <span className="w-5 h-5 rounded-full border border-sand/30 group-hover:border-forest/40 group-hover:bg-forest/5 flex items-center justify-center text-xs text-forest opacity-0 group-hover:opacity-100 transition-all">
                        ✓
                      </span>
                    </button>
                  ))}
                </div>

                {/* Navigation Back */}
                <div className="pt-6 border-t border-sand/10 flex justify-between">
                  <button
                    onClick={handleBack}
                    className="text-xs font-sans text-muted hover:text-forest transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    ← 上一步
                  </button>
                  <span className="text-xs text-muted/40 font-sans">請點選上方選項自動進入下一題</span>
                </div>
              </div>
            )}

            {step === "result" && (
              <FadeIn>
                <div className="bg-paper/40 backdrop-blur-[2px] border border-sand/15 p-8 md:p-12 space-y-8">
                  <div className="text-center space-y-3">
                    <p className="font-sans text-xs text-sand tracking-widest uppercase">自評分析結果</p>
                    <h2 className="font-serif text-deep text-3xl">您的心情溫度</h2>
                    <div className="pt-4">
                      <div className="inline-block px-8 py-5 border border-sand/15 bg-paper/20 rounded-none text-center">
                        <p className="text-xs font-sans text-muted">BSRS-5 得分</p>
                        <p className="font-garamond text-deep text-5xl font-light my-2">{totalScore}</p>
                        <p className="text-xs text-muted/40">滿分 20 分</p>
                      </div>
                    </div>
                  </div>

                  {/* Analysis Box */}
                  <div className={`p-6 border border-sand/20 backdrop-blur-[1px] rounded-none space-y-3 ${analysis.colorClass}`}>
                    <h3 className="font-serif text-lg font-bold">檢測狀態：{analysis.status}</h3>
                    <p className="font-sans text-sm leading-relaxed whitespace-pre-line">
                      {analysis.advice}
                    </p>
                  </div>

                  {/* Suicidal Warning */}
                  {analysis.suicidalWarning && (
                    <div className="p-6 border border-red-800/20 bg-red-500/5 text-red-800/90 space-y-2">
                      <p className="font-sans text-sm font-bold">⚠️ 安全提示</p>
                      <p className="font-sans text-xs leading-relaxed">
                        {analysis.suicidalWarning}
                      </p>
                    </div>
                  )}

                  {/* Action CTA */}
                  <div className="pt-6 border-t border-sand/20 space-y-6">
                    <h4 className="font-serif text-deep text-lg text-center">我們隨時在這裡陪伴您</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Link
                        href={`/booking?score=${totalScore}`}
                        className="py-4 bg-forest text-paper text-sm font-sans tracking-wide hover:bg-deep transition-all text-center cursor-pointer block hover:shadow-sm"
                      >
                        預約專業心理輔導
                      </Link>
                      <a
                        href="https://wa.me/85362772234"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-4 border border-forest text-forest text-sm font-sans tracking-wide hover:bg-forest hover:text-paper transition-all text-center cursor-pointer block hover:shadow-sm"
                      >
                        透過 WhatsApp 諮詢行政
                      </a>
                    </div>
                    <div className="text-center">
                      <button
                        onClick={handleStart}
                        className="text-xs font-sans text-muted hover:text-forest border-b border-muted/30 hover:border-forest pb-px transition-all cursor-pointer"
                      >
                        重新進行自評
                      </button>
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <div className="pt-4 text-center">
                    <p className="text-[10px] font-sans text-muted/40 leading-relaxed">
                      聲明：本心理自評結果僅供參考，不能替代專業的心理諮商或輔導評估。<br />
                      如遇到即時性的生命威脅或緊急危機，請立即致電澳門生命熱線：2852 5777 或求助警方。
                    </p>
                  </div>
                </div>
              </FadeIn>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
