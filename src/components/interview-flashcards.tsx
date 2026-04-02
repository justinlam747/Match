"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

export interface FlashcardQuestion {
  phase: string;
  question: string;
  suggestedAnswer: string;
  tip: string;
}

interface InterviewFlashcardsProps {
  companyName: string;
  questions: FlashcardQuestion[];
  interviewStyle: string;
  phaseMeta: Record<string, { label: string; icon: string; color: string }>;
  phaseOrder: string[];
  onReset: () => void;
}

export function InterviewFlashcards({
  companyName,
  questions,
  interviewStyle,
  phaseMeta,
  phaseOrder,
  onReset,
}: InterviewFlashcardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [direction, setDirection] = useState<"next" | "prev" | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const current = questions[currentIndex];
  const phase = phaseMeta[current.phase] || { label: current.phase, icon: "?", color: "bg-muted text-muted-foreground" };

  const phaseGroups = phaseOrder.map((p) => ({
    phase: p,
    ...(phaseMeta[p] || { label: p, icon: "?", color: "" }),
    questions: questions
      .map((q, i) => ({ ...q, globalIndex: i }))
      .filter((q) => q.phase === p),
  })).filter((g) => g.questions.length > 0);

  const navigate = useCallback((newIndex: number) => {
    if (newIndex === currentIndex) return;
    setDirection(newIndex > currentIndex ? "next" : "prev");
    setFlipped(false);
    // Tiny delay so the slide class applies before index change
    requestAnimationFrame(() => {
      setCurrentIndex(newIndex);
      // Clear direction after transition
      setTimeout(() => setDirection(null), 200);
    });
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < questions.length - 1) navigate(currentIndex + 1);
  }, [currentIndex, questions.length, navigate]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) navigate(currentIndex - 1);
  }, [currentIndex, navigate]);

  const markCompleted = useCallback(() => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) next.delete(currentIndex);
      else next.add(currentIndex);
      return next;
    });
  }, [currentIndex]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case "ArrowRight":
        case "l":
          goNext();
          break;
        case "ArrowLeft":
        case "h":
          goPrev();
          break;
        case " ":
          e.preventDefault();
          setFlipped((f) => !f);
          break;
        case "Enter":
          markCompleted();
          break;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, markCompleted]);

  const completedCount = completed.size;
  const progress = Math.round((completedCount / questions.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {companyName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {questions.length} questions &middot;{" "}
            <span className="capitalize">{interviewStyle}</span> &middot;{" "}
            {completedCount}/{questions.length} practiced
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onReset}>
          Back
        </Button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* Phase sidebar */}
        <div className="hidden lg:block space-y-1">
          {phaseGroups.map((group) => (
            <div key={group.phase} className="space-y-0.5">
              <div className="text-xs font-medium text-muted-foreground px-2 pt-2">
                {group.icon} {group.label}
              </div>
              {group.questions.map((q, i) => (
                <button
                  key={q.globalIndex}
                  onClick={() => navigate(q.globalIndex)}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded-md truncate transition-colors ${
                    q.globalIndex === currentIndex
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {completed.has(q.globalIndex) ? (
                      <svg className="w-3 h-3 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="w-3 h-3 rounded-full border border-current shrink-0 opacity-40" />
                    )}
                    Q{i + 1}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Flashcard area */}
        <div className="space-y-4">
          {/* Phase badge + question number */}
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${phase.color}`}>
              {phase.icon} {phase.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {currentIndex + 1} / {questions.length}
            </span>
            {completed.has(currentIndex) && (
              <span className="text-xs text-green-600 font-medium">Practiced</span>
            )}
          </div>

          {/* 3D Flip Card */}
          <div
            ref={cardRef}
            onClick={() => setFlipped((f) => !f)}
            className="cursor-pointer select-none"
            style={{ perspective: "1200px" }}
          >
            <div
              className={`relative min-h-[340px] transition-transform duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                direction === "next" ? "animate-slide-in-right" : direction === "prev" ? "animate-slide-in-left" : ""
              }`}
              style={{
                transformStyle: "preserve-3d",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front (question) */}
              <div
                className="absolute inset-0 border rounded-xl p-8 bg-background"
                style={{ backfaceVisibility: "hidden" }}
              >
                <div className="flex flex-col h-full">
                  <div className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">
                    Question
                  </div>
                  <p className="text-lg font-medium leading-relaxed flex-1">
                    {current.question}
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>{current.tip}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 mt-3">
                    Click or press Space to reveal answer
                  </p>
                </div>
              </div>

              {/* Back (answer) */}
              <div
                className="absolute inset-0 border border-primary/20 bg-primary/[0.02] rounded-xl p-8"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <div className="flex flex-col h-full">
                  <div className="text-xs text-primary mb-4 uppercase tracking-wider font-medium">
                    Suggested Answer
                  </div>
                  <div className="text-sm leading-relaxed flex-1 whitespace-pre-line overflow-y-auto">
                    {current.suggestedAnswer}
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 mt-3">
                    Click or press Space to flip back
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={goPrev}
              disabled={currentIndex === 0}
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Prev
            </Button>

            <Button
              variant={completed.has(currentIndex) ? "default" : "outline"}
              size="sm"
              onClick={markCompleted}
            >
              {completed.has(currentIndex) ? (
                <>
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Practiced
                </>
              ) : (
                "Mark practiced"
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={goNext}
              disabled={currentIndex === questions.length - 1}
            >
              Next
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>

          {/* Keyboard hints */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground/50">
            <span><kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px]">Space</kbd> flip</span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px]">&larr;</kbd>
              <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] ml-0.5">&rarr;</kbd> navigate
            </span>
            <span><kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px]">Enter</kbd> practiced</span>
          </div>

          {completedCount === questions.length && (
            <div className="text-center py-6 border rounded-xl bg-green-500/5">
              <p className="font-medium text-green-700">All done! You&apos;re ready.</p>
              <p className="text-sm text-muted-foreground mt-1">
                You&apos;ve practiced all {questions.length} questions for {companyName}.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile phase dots */}
      <div className="lg:hidden flex items-center justify-center gap-1 flex-wrap">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => navigate(i)}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i === currentIndex
                ? "bg-primary scale-125"
                : completed.has(i)
                ? "bg-green-500"
                : "bg-muted-foreground/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
