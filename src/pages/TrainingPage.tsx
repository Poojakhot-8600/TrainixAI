import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trainingTopics, type WeekModule, type DayContent, type QuizQuestion } from "@/data/trainingData";
import {
  CheckCircle2, Lock, Clock, ChevronDown, ChevronRight,
  BookOpen, Code2, Rocket, Brain, ArrowLeft, Trophy, AlertCircle, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import InlineChatbot from "@/components/InlineChatbot";

// --- Progress Store (localStorage-backed for demo) ---
function loadProgress(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem("trainix-progress") || "{}");
  } catch { return {}; }
}
function saveProgress(p: Record<string, boolean>) {
  localStorage.setItem("trainix-progress", JSON.stringify(p));
}

// --- Shuffle utility ---
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function shuffleQuiz(questions: QuizQuestion[]): QuizQuestion[] {
  return shuffleArray(questions).map(q => {
    // Shuffle options and update correctAnswer index
    const optionIndices = q.options.map((_, i) => i);
    const shuffledIndices = shuffleArray(optionIndices);
    const newOptions = shuffledIndices.map(i => q.options[i]);
    const newCorrect = shuffledIndices.indexOf(q.correctAnswer);
    return { ...q, options: newOptions, correctAnswer: newCorrect };
  });
}

const TrainingPage = () => {
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>(loadProgress);
  const [selectedWeek, setSelectedWeek] = useState<{ topicId: string; week: WeekModule } | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayContent | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [shuffledQuiz, setShuffledQuiz] = useState<QuizQuestion[]>([]);

  const markComplete = useCallback((key: string) => {
    setCompletedMap((prev) => {
      const next = { ...prev, [key]: true };
      saveProgress(next);
      return next;
    });
  }, []);

  const isDayCompleted = (topicId: string, weekNum: number, dayNum: number) =>
    !!completedMap[`${topicId}-w${weekNum}-d${dayNum}`];

  const isDayUnlocked = (topicId: string, weekNum: number, dayNum: number, weekIndex: number) => {
    if (dayNum === 1) {
      if (weekIndex === 0) return true;
      const topic = trainingTopics.find(t => t.id === topicId);
      if (!topic) return false;
      const prevWeek = topic.weeks[weekIndex - 1];
      return prevWeek.days.every((_, di) => isDayCompleted(topicId, prevWeek.week, di + 1));
    }
    return isDayCompleted(topicId, weekNum, dayNum - 1);
  };

  const isWeekCompleted = (topicId: string, week: WeekModule) =>
    week.days.every((_, di) => isDayCompleted(topicId, week.week, di + 1));

  const isWeekUnlocked = (topicId: string, weekIndex: number) => {
    if (weekIndex === 0) return true;
    const topic = trainingTopics.find(t => t.id === topicId);
    if (!topic) return false;
    return isWeekCompleted(topicId, topic.weeks[weekIndex - 1]);
  };

  const getWeekProgress = (topicId: string, week: WeekModule) => {
    const total = week.days.length;
    const done = week.days.filter((_, di) => isDayCompleted(topicId, week.week, di + 1)).length;
    return { done, total, pct: Math.round((done / total) * 100) };
  };

  // --- Quiz Logic ---
  const startQuiz = () => {
    if (!selectedDay) return;
    setQuizAnswers({});
    setQuizSubmitted(false);
    setCurrentQuizIndex(0);
    setShuffledQuiz(shuffleQuiz(selectedDay.quiz));
    setShowQuiz(true);
  };

  const handleQuizSubmit = (topicId: string, weekNum: number, dayNum: number) => {
    if (!selectedDay || shuffledQuiz.length === 0) return;
    const correct = shuffledQuiz.filter(q => quizAnswers[q.id] === q.correctAnswer).length;
    const total = shuffledQuiz.length;
    const passed = correct >= Math.ceil(total * 0.6);

    setQuizSubmitted(true);

    if (passed) {
      const key = `${topicId}-w${weekNum}-d${dayNum}`;
      markComplete(key);
      toast.success(`Day ${dayNum} completed! ${dayNum < 5 ? `Day ${dayNum + 1} unlocked.` : "Week completed! 🎉"}`);
    } else {
      toast.error(`You scored ${correct}/${total}. Need ${Math.ceil(total * 0.6)} to pass. Try again!`);
    }
  };

  const retryQuiz = () => {
    if (!selectedDay) return;
    setQuizAnswers({});
    setQuizSubmitted(false);
    setCurrentQuizIndex(0);
    setShuffledQuiz(shuffleQuiz(selectedDay.quiz));
  };

  const resetQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setShowQuiz(false);
    setCurrentQuizIndex(0);
    setShuffledQuiz([]);
  };

  // Current quiz question
  const currentQuestion = shuffledQuiz[currentQuizIndex];
  const allAnswered = shuffledQuiz.length > 0 && Object.keys(quizAnswers).length >= shuffledQuiz.length;

  // --- VIEWS ---

  // Day Detail View
  if (selectedDay && selectedWeek) {
    const topicId = selectedWeek.topicId;
    const weekNum = selectedWeek.week.week;
    const dayNum = selectedDay.day;
    const dayKey = `${topicId}-w${weekNum}-d${dayNum}`;
    const completed = !!completedMap[dayKey];

    return (
      <div className="flex h-full">
        {/* Main content - adjusts width for chatbot sidebar */}
        <div className="flex-1 min-w-0 p-3 sm:p-4 md:p-8 pb-20 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <button onClick={() => { setSelectedDay(null); resetQuiz(); }} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground mb-4 sm:mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Week {weekNum}
            </button>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3 mb-2">
                {completed && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
                <h1 className="text-lg sm:text-2xl font-bold font-display text-foreground">
                  Day {dayNum}: {selectedDay.title}
                </h1>
              </div>
              {completed && <span className="inline-block text-xs font-medium bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full mb-6">Completed</span>}

              {/* Reading Content */}
              <div className="bg-card rounded-xl border border-border p-4 sm:p-6 mb-4 sm:mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Concept Reading</h2>
                </div>
                <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                  {selectedDay.readingContent.split("\n").map((line, i) => {
                    if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold mt-3 mb-1 text-foreground">{line.replace(/\*\*/g, "")}</p>;
                    if (line.startsWith("- ")) return <li key={i} className="ml-4 list-disc text-foreground/70">{line.slice(2)}</li>;
                    return <p key={i} className="mb-2">{line}</p>;
                  })}
                </div>
              </div>

              {/* Code Snippets */}
              {selectedDay.codeSnippets?.map((snippet, i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-4 sm:p-6 mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Code2 className="w-5 h-5 text-secondary" />
                    <h3 className="text-md font-semibold text-foreground">{snippet.description}</h3>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground ml-auto">{snippet.language}</span>
                  </div>
                  <pre className="bg-muted/50 rounded-lg p-3 sm:p-4 overflow-x-auto text-xs sm:text-sm font-mono text-foreground/90 border border-border">
                    <code>{snippet.code}</code>
                  </pre>
                </div>
              ))}

              {/* Hands-on */}
              {selectedDay.handsOn && (
                <div className="bg-card rounded-xl border border-border p-4 sm:p-6 mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Rocket className="w-5 h-5 text-accent" />
                    <h3 className="text-md font-semibold text-foreground">Hands-On Exercise</h3>
                  </div>
                  <p className="text-sm text-foreground/70 mb-3">{selectedDay.handsOn.description}</p>
                  {selectedDay.handsOn.link && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={selectedDay.handsOn.link} target="_blank" rel="noopener noreferrer">Open Editor</a>
                    </Button>
                  )}
                </div>
              )}

              {/* Mini Project */}
              {selectedDay.miniProject && (
                <div className="bg-primary/5 rounded-xl border border-primary/20 p-4 sm:p-6 mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-5 h-5 text-primary" />
                    <h3 className="text-md font-semibold text-foreground">Mini Project: {selectedDay.miniProject.title}</h3>
                  </div>
                  <p className="text-sm text-foreground/70 mb-4">{selectedDay.miniProject.description}</p>
                  <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10">
                    Submit Project
                  </Button>
                </div>
              )}

              {/* Quiz Button */}
              {!completed && (
                <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Day {dayNum} Quiz</h3>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{selectedDay.quiz.length} questions</span>
                  </div>
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-4">Complete the quiz to unlock the next day's content.</p>
                    <Button onClick={startQuiz} className="gradient-primary text-primary-foreground shadow-primary-glow">
                      Start Quiz
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Right-side AI Chatbot - fixed sidebar */}
        <div className="hidden lg:flex w-[380px] border-l border-border shrink-0 h-full flex-col">
          <InlineChatbot dayTitle={selectedDay.title} />
        </div>

        {/* Mobile: floating chatbot */}
        <div className="lg:hidden fixed bottom-4 right-4 z-40 w-[calc(100%-2rem)] max-w-[360px]">
          <InlineChatbot dayTitle={selectedDay.title} />
        </div>

        {/* Quiz Lightbox - one question at a time */}
        <Dialog open={showQuiz} onOpenChange={(open) => { if (!open) resetQuiz(); }}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Day {dayNum} Quiz
              </DialogTitle>
            </DialogHeader>

            {currentQuestion && !quizSubmitted && (
              <div className="mt-2">
                {/* Progress indicator */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-muted-foreground">
                    Question {currentQuizIndex + 1} of {shuffledQuiz.length}
                  </span>
                  <Progress value={((currentQuizIndex + 1) / shuffledQuiz.length) * 100} className="w-32 h-1.5" />
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="text-sm font-medium text-foreground mb-4">
                      {currentQuestion.question}
                    </p>
                    <div className="space-y-2">
                      {currentQuestion.options.map((opt, oi) => {
                        const isSelected = quizAnswers[currentQuestion.id] === oi;
                        return (
                          <button
                            key={oi}
                            onClick={() => setQuizAnswers(prev => ({ ...prev, [currentQuestion.id]: oi }))}
                            className={`w-full text-left text-sm p-3 rounded-lg border transition-all flex items-center gap-3
                              ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 bg-card"}`}
                          >
                            <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium shrink-0
                              ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground"}`}>
                              {String.fromCharCode(65 + oi)}
                            </span>
                            <span className="text-foreground/80">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </AnimatePresence>

                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentQuizIndex === 0}
                    onClick={() => setCurrentQuizIndex(i => i - 1)}
                  >
                    Previous
                  </Button>

                  {currentQuizIndex < shuffledQuiz.length - 1 ? (
                    <Button
                      size="sm"
                      disabled={quizAnswers[currentQuestion.id] === undefined}
                      onClick={() => setCurrentQuizIndex(i => i + 1)}
                      className="gradient-primary text-primary-foreground"
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={!allAnswered}
                      onClick={() => handleQuizSubmit(topicId, weekNum, dayNum)}
                      className="gradient-primary text-primary-foreground shadow-primary-glow"
                    >
                      Submit Quiz
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Results */}
            {quizSubmitted && (() => {
              const correctCount = shuffledQuiz.filter(q => quizAnswers[q.id] === q.correctAnswer).length;
              const passed = correctCount >= Math.ceil(shuffledQuiz.length * 0.6);
              return (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-2">
                {/* Score header */}
                <div className="text-center pb-4">
                  <div className={`w-14 h-14 rounded-full ${passed ? "bg-emerald-500/10" : "bg-destructive/10"} flex items-center justify-center mx-auto mb-3`}>
                    {passed ? <Trophy className="w-7 h-7 text-emerald-500" /> : <AlertCircle className="w-7 h-7 text-destructive" />}
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">{passed ? "Quiz Passed! 🎉" : "Not Quite!"}</h3>
                  <p className="text-sm text-muted-foreground">
                    You scored {correctCount}/{shuffledQuiz.length}
                    {!passed && ` — Need ${Math.ceil(shuffledQuiz.length * 0.6)} to pass`}
                  </p>
                </div>

                {/* Question-by-question summary */}
                <div className="max-h-[40vh] overflow-y-auto space-y-3 mb-4 pr-1">
                  {shuffledQuiz.map((q, qi) => {
                    const userAnswer = quizAnswers[q.id];
                    const isCorrect = userAnswer === q.correctAnswer;
                    return (
                      <div key={q.id} className={`rounded-lg border p-3 text-sm ${isCorrect ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                        <div className="flex items-start gap-2 mb-2">
                          {isCorrect
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                            : <X className="w-4 h-4 text-destructive mt-0.5 shrink-0" />}
                          <span className="font-medium text-foreground">Q{qi + 1}: {q.question}</span>
                        </div>
                        <div className="ml-6 space-y-1">
                          <p className={`text-xs ${isCorrect ? "text-emerald-600" : "text-destructive"}`}>
                            Your answer: {q.options[userAnswer] ?? "—"}
                          </p>
                          {!isCorrect && (
                            <p className="text-xs text-emerald-600">
                              Correct answer: {q.options[q.correctAnswer]}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={resetQuiz}>{passed ? "Continue" : "Close"}</Button>
                  {!passed && (
                    <Button onClick={retryQuiz} className="gradient-primary text-primary-foreground shadow-primary-glow">
                      Retry with New Questions
                    </Button>
                  )}
                </div>
              </motion.div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Week Detail View
  if (selectedWeek) {
    const topic = trainingTopics.find(t => t.id === selectedWeek.topicId)!;
    const weekIndex = topic.weeks.findIndex(w => w.week === selectedWeek.week.week);
    const week = selectedWeek.week;
    const progress = getWeekProgress(selectedWeek.topicId, week);

    return (
      <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto pb-20">
        <button onClick={() => setSelectedWeek(null)} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground mb-4 sm:mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Curriculum
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground mb-1">
            Week {week.week}: {week.title}
          </h1>
          <p className="text-muted-foreground mb-4">{week.description}</p>

          <div className="flex items-center gap-3 mb-8">
            <Progress value={progress.pct} className="flex-1 h-2" />
            <span className="text-sm font-medium text-foreground">{progress.done}/{progress.total} days</span>
          </div>

          <div className="space-y-3">
            {week.days.map((day, di) => {
              const completed = isDayCompleted(selectedWeek.topicId, week.week, day.day);
              const unlocked = isDayUnlocked(selectedWeek.topicId, week.week, day.day, weekIndex);
              const isCurrent = !completed && unlocked;

              return (
                <TooltipProvider key={day.day}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.button
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: di * 0.05 }}
                        onClick={() => unlocked ? setSelectedDay(day) : null}
                        disabled={!unlocked}
                        className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all text-left
                          ${completed
                            ? "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10"
                            : isCurrent
                              ? "bg-card border-primary/30 hover:border-primary/50 shadow-sm"
                              : "bg-muted/30 border-border opacity-60 cursor-not-allowed"
                          }`}
                      >
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold shrink-0
                          ${completed ? "bg-emerald-500/10 text-emerald-600" : isCurrent ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          {completed ? <CheckCircle2 className="w-5 h-5" /> : unlocked ? `D${day.day}` : <Lock className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm">Day {day.day}: {day.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {completed && <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">Completed</span>}
                            {isCurrent && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">In Progress</span>}
                            {!unlocked && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Locked</span>}
                            {day.miniProject && <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">📦 Mini Project</span>}
                          </div>
                        </div>
                        {unlocked && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </motion.button>
                    </TooltipTrigger>
                    {!unlocked && (
                      <TooltipContent side="top">
                        <p>Complete Day {day.day - 1} quiz to unlock this topic</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </motion.div>
      </div>
    );
  }

  // --- Main Week Listing ---
  const topic = trainingTopics[0];
  const totalDays = topic.weeks.reduce((s, w) => s + w.days.length, 0);
  const completedDays = topic.weeks.reduce((s, w) => s + w.days.filter((_, di) => isDayCompleted(topic.id, w.week, di + 1)).length, 0);
  const overallPct = Math.round((completedDays / totalDays) * 100);

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto pb-20">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground mb-2">Training Curriculum</h1>
        <p className="text-muted-foreground mb-6">
          Complete each week's daily topics in order. Pass the quiz to unlock the next day.
        </p>

        <div className="bg-card rounded-xl border border-border p-4 sm:p-5 mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Overall Progress</span>
            <span className="text-sm font-bold text-primary">{overallPct}%</span>
          </div>
          <Progress value={overallPct} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">{completedDays} of {totalDays} days completed</p>
        </div>
      </motion.div>

      <div className="space-y-3">
        {topic.weeks.map((week, wi) => {
          const weekCompleted = isWeekCompleted(topic.id, week);
          const weekUnlocked = isWeekUnlocked(topic.id, wi);
          const progress = getWeekProgress(topic.id, week);
          const hasProgress = progress.done > 0 && !weekCompleted;

          return (
            <TooltipProvider key={week.week}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: wi * 0.06 }}
                    onClick={() => weekUnlocked ? setSelectedWeek({ topicId: topic.id, week }) : null}
                    disabled={!weekUnlocked}
                    className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-5 rounded-xl border text-left transition-all
                      ${weekCompleted
                        ? "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10"
                        : weekUnlocked
                          ? "bg-card border-border hover:border-primary/30 hover:shadow-md"
                          : "bg-muted/30 border-border opacity-60 cursor-not-allowed"
                      }`}
                  >
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xs sm:text-sm font-bold shrink-0
                      ${weekCompleted ? "bg-emerald-500/10 text-emerald-600" : weekUnlocked ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {weekCompleted ? <CheckCircle2 className="w-6 h-6" /> : weekUnlocked ? `W${week.week}` : <Lock className="w-5 h-5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground mb-0.5">
                        Week {week.week}: {week.title}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-1">{week.description}</p>

                      {weekUnlocked && (
                        <div className="mt-2 flex items-center gap-3">
                          <Progress value={progress.pct} className="flex-1 h-1.5 max-w-[200px]" />
                          <span className="text-xs text-muted-foreground">{progress.done}/{progress.total}</span>
                        </div>
                      )}
                    </div>

                    <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                      {weekCompleted && <span className="text-xs font-medium bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full">Completed ✓</span>}
                      {hasProgress && <span className="text-xs font-medium bg-amber-500/10 text-amber-600 px-3 py-1 rounded-full">In Progress</span>}
                      {!weekUnlocked && <span className="text-xs font-medium bg-muted text-muted-foreground px-3 py-1 rounded-full">Locked 🔒</span>}
                      {weekUnlocked && !weekCompleted && !hasProgress && <span className="text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">Start →</span>}
                    </div>
                  </motion.button>
                </TooltipTrigger>
                {!weekUnlocked && (
                  <TooltipContent side="top">
                    <p>Complete all days in Week {week.week - 1} to unlock</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
};

export default TrainingPage;
