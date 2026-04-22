import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type WeekModule, type DayContent, type QuizQuestion, type TrainingTopic } from "@/data/trainingData";
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
import ReactMarkdown from "react-markdown";

// --- Progress Store (sessionStorage-backed for demo as requested) ---
function loadProgress(): Record<string, boolean> {
  try {
    return JSON.parse(sessionStorage.getItem("trainix-progress") || "{}");
  } catch { return {}; }
}
function saveProgress(p: Record<string, boolean>) {
  sessionStorage.setItem("trainix-progress", JSON.stringify(p));
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
  // --- Enhanced Content Formatter (Formatting Engine) ---
  const structurizeContent = (text: string): string => {
    if (!text) return "";

    // 1. First, strip any existing markdown symbols that might be broken
    // This allows us to "rebuild from scratch" as requested
    const cleanText = text
      .replace(/#{1,6}\s?/g, "") // Remove hashtag headers
      .replace(/\*\*/g, "")      // Remove existing bolds
      .replace(/^\s*[-*+]\s+/gm, "") // Remove existing bullet markers
      .replace(/---/g, "")       // Remove horizontal rules
      .trim();

    // 2. Identify potential sections (originally separated by multiple newlines or headers)
    const sections = cleanText.split(/\n\n+/);
    const result: string[] = [];

    sections.forEach(section => {
      const lines = section.split("\n");
      if (lines.length === 0) return;

      // The first line often acts as a heading or main topic
      const title = lines[0].trim();
      const body = lines.slice(1).join(" ").trim();

      if (!title) return;

      // Format as a bold Section Heading
      result.push(`\n**${title}**\n`);

      if (!body) return;

      // 3. Convert all paragraphs into bullet points
      // Split body into short sentences
      const sentences = body.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);

      sentences.forEach((sentence, idx) => {
        const cleanSentence = sentence.trim();
        if (!cleanSentence) return;

        // Final polish of the sentence text
        // - Bold text before colons if present (list headings)
        const colonIndex = cleanSentence.indexOf(":");
        let finalSentence = cleanSentence;

        if (colonIndex > 0 && colonIndex < 60 && (cleanSentence[colonIndex + 1] === " " || colonIndex === cleanSentence.length - 1)) {
          const subTitle = cleanSentence.substring(0, colonIndex + 1);
          const subRest = cleanSentence.substring(colonIndex + 1);
          finalSentence = `**${subTitle}**${subRest}`;
        }

        // Apply indentation for hierarchy
        if (idx === 0) {
          result.push(`- ${finalSentence}`);
        } else {
          result.push(`  - ${finalSentence}`);
        }
      });
    });

    return result.join("\n").trim();
  };

  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>(loadProgress);
  const [selectedWeek, setSelectedWeek] = useState<{ topicId: string; week: WeekModule } | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayContent | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [shuffledQuiz, setShuffledQuiz] = useState<QuizQuestion[]>([]);
  const [trainingTopics, setTrainingTopics] = useState<TrainingTopic[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const markComplete = useCallback((key: string) => {
    setCompletedMap((prev) => {
      const next = { ...prev, [key]: true };
      saveProgress(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check sessionStorage first
        const cachedRoadmap = sessionStorage.getItem("trainix-roadmap");
        let responseData = cachedRoadmap ? JSON.parse(cachedRoadmap) : null;

        // If not cached, fetch from webhook
        if (!responseData) {
          const response = await fetch("https://pooja35.app.n8n.cloud/webhook-test/getRoadmap", {
            method: "GET",
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          responseData = await response.json();

          // Store in sessionStorage for future use
          sessionStorage.setItem("trainix-roadmap", JSON.stringify(responseData));
        }

        console.log("Roadmap response:", responseData);

        // Transform webhook data to TrainingTopic format
        let topics: TrainingTopic[] = [];

        if (responseData.data && responseData.data.week_number !== undefined && responseData.data.roadmap) {
          // New format from webhook: {status, data: {week_number, week_topic, roadmap}}
          const weekData = responseData.data as Record<string, unknown>;

          const days: DayContent[] = (weekData.roadmap as Array<Record<string, unknown>>).map((dayItem, idx) => {
            const topics = dayItem.topics as Array<Record<string, unknown>> || [];

            // Build reading content from topics and subtopics
            const readingContent = topics
              .map((topic) => {
                let content = `**${topic.title || ""}**\n`;
                if (topic.subtopics && Array.isArray(topic.subtopics)) {
                  content += (topic.subtopics as string[]).map((st) => `- ${st}`).join("\n");
                }
                return content;
              })
              .join("\n\n");

            // Extract day title: use first topic title if available, otherwise use topic count
            const dayTitle = topics.length > 0
              ? (topics[0].title as string)
              : (dayItem.day as string || `Day ${idx + 1}`).replace(/Day\s*/i, "").trim();

            return {
              day: idx + 1,
              title: dayTitle,
              readingContent,
              status: idx === 0 ? "in-progress" : "locked",
              quiz: [
                {
                  id: `q${idx}-1`,
                  question: `What is the main topic of Day ${idx + 1}?`,
                  options: ["Option A", "Option B", "Option C", "Option D"],
                  correctAnswer: 0,
                  type: "mcq" as const,
                },
              ],
            };
          });

          const topic: TrainingTopic = {
            id: "week-1-oops",
            title: "Week 1: OOPS",
            description: `Week 1: OOPS`,
            icon: "BookOpen",
            color: "primary",
            weeks: [
              {
                week: 1,
                title: "OOPS",
                description: `Learn about OOPS`,
                status: "in-progress",
                days,
              },
            ],
          };
          topics = [topic];
        } else if (Array.isArray(responseData.data)) {
          // Array format
          topics = responseData.data;
        } else if (Array.isArray(responseData)) {
          // Direct array
          topics = responseData;
        }

        if (!topics || topics.length === 0) {
          throw new Error("No roadmap data available");
        }

        setTrainingTopics(topics);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch roadmap";
        console.error("Error fetching roadmap:", err);
        setError(errorMessage);
        toast.error("Error loading training roadmap");
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmap();
  }, []);

  const fetchDayData = useCallback(async (day: DayContent) => {
    const dayNum = day.day;
    const cacheKey = `trainix-day${dayNum}`;

    // Check sessionStorage first to see if we already have this content
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit for day ${dayNum}`);
      setSelectedDay(JSON.parse(cached));
      return;
    }

    console.log(`[Webhook] Cache miss. Fetching content for day ${dayNum}...`);
    setLoadingDay(true);
    // Set basic day info immediately for better UX
    setSelectedDay(day);

    try {
      setLoadingDay(true);
      setError(null);

      console.log(`[Webhook] Calling day content for Day ${dayNum}: ${day.title}`);

      // Extract topic and subtopic from roadmap stored in sessionStorage
      let topicTitle = "OOPS";
      let subtopic = "Introduction";
      let subtopicsArray: string[] = [];

      const roadmapData = sessionStorage.getItem("trainix-roadmap");
      if (roadmapData) {
        try {
          const roadmap = JSON.parse(roadmapData);
          if (roadmap.data && Array.isArray(roadmap.data.roadmap)) {
            // Find the day in the roadmap (dayNum is 1-indexed)
            const dayData = roadmap.data.roadmap[dayNum - 1];
            if (dayData && Array.isArray(dayData.topics) && dayData.topics.length > 0) {
              // Get first topic as the primary topic
              const firstTopic = dayData.topics[0] as Record<string, unknown>;
              topicTitle = (firstTopic.title as string) || topicTitle;

              // Get subtopics from first topic
              if (Array.isArray(firstTopic.subtopics)) {
                subtopicsArray = firstTopic.subtopics as string[];
                subtopic = subtopicsArray[0] || subtopic;
              }
            }
          }
        } catch (err) {
          console.warn("Failed to extract topic/subtopic from roadmap:", err);
        }
      }

      // Prepare POST body with topic, subtopic, and all subtopics from that day
      const requestBody = {
        topic: topicTitle,
        subtopic: subtopic,
        subtopics: subtopicsArray,
        day: dayNum,
        day_title: day.title,
        timestamp: new Date().toISOString()
      };

      console.log(`[Webhook] Sending POST to https://pooja35.app.n8n.cloud/webhook-test/day1 with body:`, requestBody);

      // Fetch from webhook - URL is hardcoded as requested
      const response = await fetch("https://pooja35.app.n8n.cloud/webhook-test/day1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      console.log(response)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check if response has content
      const responseText = await response.text();
      console.log(`[Webhook] Day ${dayNum} raw response:`, responseText);

      if (!responseText || responseText.trim().length === 0) {
        console.warn(`[Webhook] Empty response for day${dayNum}`);
        return; // Keep existing day content
      }

      let dayData;
      try {
        dayData = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn(`[Webhook] Failed to parse day${dayNum} response:`, parseErr);
        return;
      }

      console.log(`[Webhook] Day ${dayNum} parsed response:`, dayData);

      // Transform webhook response to DayContent format
      // We support both { data: { topics, content ... } } and flat { topic, subtopics, content ... }
      let readingContent = "";
      let updatedTitle = day.title;
      const data = dayData.data || dayData; // Handle both wrapped and flat structures

      if (data.content) {
        // If the webhook provides a direct content string, use it
        readingContent = data.content;

        // If topic and subtopics are provided separately, prepend them for structure
        if (data.topic || data.subtopics) {
          let header = "";
          if (data.topic) {
            header += `### ${data.topic}\n\n`;
            updatedTitle = data.topic;
          }
          if (Array.isArray(data.subtopics) && data.subtopics.length > 0) {
            header += "**Key areas for today:**\n";
            header += data.subtopics.map((st: string) => `- ${st}`).join("\n") + "\n\n---\n\n";
          }
          readingContent = header + readingContent;
        }
      } else if (data.topics && Array.isArray(data.topics)) {
        // Roadmap-style nested structure
        readingContent = (data.topics as Array<Record<string, unknown>>)
          .map((topic) => {
            let content = `### ${topic.title || ""}\n`;
            if (topic.subtopics && Array.isArray(topic.subtopics)) {
              content += (topic.subtopics as string[]).map((st) => `- ${st}`).join("\n") ;
            }
            return content;
          })
          .join("\n\n"); 
      }

      if (readingContent) {
        // Clean the content to remove references to the source/PDF extraction
        const cleanedReadingContent = readingContent
          .replace(/(The PDF extracts?|The retrieved (material|text|content|excerpts?)|The document|The fragments|The material) (list|identifies|sets out|notes|points out|frames|describes|highlights|refers to|states|says|contains|give|presents?).*?(:|—|\. )/gi, "")
          .replace(/According to the retrieved material,?/gi, "")
          .replace(/—using only the retrieved content—/gi, "")
          .replace(/which are important to understand when mapping real-world scenarios to code/gi, "")
          .replace(/Finally, the retrieved excerpts present/gi, "")
          .replace(/Together these pieces from the provided material present a coherent, document-sourced explanation of OOP:/gi, "")
          .replace(/The retrieved text emphasizes practical outcomes such as/gi, "")
          .replace(/The document frames the idea of /gi, "")
          .trim();

        const formattedContent = structurizeContent(cleanedReadingContent);

        const updatedDay: DayContent = {
          ...day,
          title: updatedTitle,
          readingContent: formattedContent,
          // Merge in extra fields if available
          codeSnippets: data.codeSnippets || day.codeSnippets,
          handsOn: data.handsOn || day.handsOn,
          miniProject: data.miniProject || day.miniProject,
        };

        // Update the selected day with new content
        setSelectedDay(updatedDay);

        // Update cache
        const cacheKey = `trainix-day${dayNum}`;
        sessionStorage.setItem(cacheKey, JSON.stringify(updatedDay));
      } else {
        console.warn(`[Webhook] No valid content found in day${dayNum} response:`, dayData);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch day data";
      console.error(`[Webhook] Error fetching day${dayNum}:`, err);
      toast.error(`Error loading content: ${errorMessage}`);
    } finally {
      setLoadingDay(false);
    }
  }, []);

  const isDayCompleted = (topicId: string, weekNum: number, dayNum: number) => {
    // Normalize parameters to strings to avoid key mismatches
    const key = `${topicId}-w${weekNum}-d${dayNum}`;
    return !!completedMap[key];
  };

  const isDayUnlocked = (topicId: string, weekNum: number, dayNum: number, weekIndex: number) => {
    // Day 1 is always unlocked for the first week
    if (dayNum === 1) {
      if (weekIndex === 0) return true;
      const topic = trainingTopics.find(t => t.id === topicId);
      if (!topic) return false;
      const prevWeek = topic.weeks[weekIndex - 1];
      if (!prevWeek) return false;
      return prevWeek.days.every((d) => isDayCompleted(topicId, prevWeek.week, d.day));
    }

    // For any other day, it's unlocked if the previous day is completed
    const prevDayDone = isDayCompleted(topicId, weekNum, dayNum - 1);

    // Explicit debug log for Day 2 unlocking Day 1
    if (dayNum === 2) {
      console.log(`[Unlock Check] Day 2 check: Day 1 (key: ${topicId}-w${weekNum}-d1) is ${prevDayDone ? 'DONE' : 'LOCKED'}`);
    }

    return prevDayDone;
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
  const startQuiz = async () => {
    if (!selectedDay) return;

    setLoadingDay(true);
    try {
      console.log(`[Quiz Webhook] Fetching quiz for: ${selectedDay.title}`);
      const response = await fetch("https://pooja35.app.n8n.cloud/webhook-test/quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatInput: "start quiz",
          topic: selectedDay.title,
          content: selectedDay.readingContent,
        }),
      });

      if (response.ok) {
        const quizData = await response.json();
        console.log("[Quiz Webhook] Received:", quizData);

        // Robust parsing strategy:
        // 1. Check for the new strict 'quiz' format
        // 2. Check for 'questions' array
        // 3. Check for 'reply' string which might contain JSON or raw text
        // 4. Fallback to 'data' or the object itself

        let rawQuestions: { id?: string; question?: string; options?: string[] | Record<string, string>; correctAnswer?: number; answer?: string; type?: string }[] = [];

        // Check for the new strict format: { quiz: [ { question, options: {A, B, C, D}, answer } ] }
        if (quizData.quiz && Array.isArray(quizData.quiz)) {
          rawQuestions = quizData.quiz.map((q: { question: string; options: Record<string, string>; answer: string; id?: string; correctAnswer?: number }, i: number) => {
            const options = q.options
              ? [q.options.A, q.options.B, q.options.C, q.options.D]
              : ["A", "B", "C", "D"];

            const answerMap: Record<string, number> = { "A": 0, "B": 1, "C": 2, "D": 3 };
            const correctAnswer = typeof q.answer === 'string'
              ? answerMap[q.answer.toUpperCase()] ?? 0
              : (typeof q.correctAnswer === 'number' ? q.correctAnswer : 0);

            return {
              id: q.id || `q-strict-${Date.now()}-${i}`,
              question: q.question || "Question missing",
              options: options.map(opt => opt || "Option missing"),
              correctAnswer,
              type: "mcq"
            };
          });
        }

        if (rawQuestions.length === 0) {
          const reply = quizData.reply || quizData.output;

          if (reply && typeof reply === 'string') {
            // Try to parse the reply as JSON first (as per user's "ONLY JSON" requirement)
            try {
              const parsed = JSON.parse(reply.replace(/```json|```/g, "").trim());
              if (Array.isArray(parsed)) {
                rawQuestions = parsed;
              } else if (parsed && parsed.quiz && Array.isArray(parsed.quiz)) {
                // Nested quiz format in reply
                rawQuestions = parsed.quiz.map((q: { id?: string; question?: string; options?: Record<string, string>; answer?: string }, i: number) => {
                  const options = q.options ? [q.options.A, q.options.B, q.options.C, q.options.D] : ["A", "B", "C", "D"];
                  const answerMap: Record<string, number> = { "A": 0, "B": 1, "C": 2, "D": 3 };
                  return {
                    id: q.id || `q-reply-strict-${Date.now()}-${i}`,
                    question: q.question || "Question missing",
                    options: options.map(opt => opt || "Option missing"),
                    correctAnswer: typeof q.answer === 'string' ? answerMap[q.answer.toUpperCase()] ?? 0 : 0,
                    type: "mcq"
                  };
                });
              }
            } catch (e) {
              // If JSON parse fails, attempt manual text parsing (as per user's raw format example)
              console.log("[Quiz Parser] JSON parse failed, trying text-basis parsing...");
              const qBlocks = reply.split(/Q\d+[.:\s]+|Question\s*\d+[.:\s]+/i).filter(b => b.trim());

              rawQuestions = qBlocks.map((block, idx) => {
                const lines = block.split("\n").map(l => l.trim()).filter(l => l);
                const question = lines[0] || "";

                const options: string[] = [];
                let correctAnswer = 0;

                lines.forEach(line => {
                  const optMatch = line.match(/^([A-D])[.:\s]+(.*)/i);
                  if (optMatch) {
                    options.push(optMatch[2].trim());
                  }
                  const ansMatch = line.match(/Answer[\s:]+([A-D])/i);
                  if (ansMatch) {
                    correctAnswer = ansMatch[1].toUpperCase().charCodeAt(0) - 65;
                  }
                });

                return {
                  id: `q-gen-${Date.now()}-${idx}`,
                  question: question.replace(/^[A-D][.:\s]+(.*)/i, "").trim(),
                  options: options.length ? options : ["A", "B", "C", "D"],
                  correctAnswer: correctAnswer,
                  type: "mcq"
                };
              });
            }
          }
        }

        if (rawQuestions.length === 0) {
          rawQuestions = quizData.questions || quizData.data || (Array.isArray(quizData) ? quizData : []);
        }

        if (rawQuestions && Array.isArray(rawQuestions) && rawQuestions.length > 0) {
          const formattedQuestions: QuizQuestion[] = rawQuestions.map((q: { id?: string; question?: string; options?: string[] | Record<string, string>; correctAnswer?: number; answer?: string; text?: string; type?: string }, i: number) => {
            // Even if already formatted, we re-structure to ensure TypeScript is happy with the interface
            let options = q.options;
            let correctAnswer = q.correctAnswer;

            if (options && typeof options === 'object' && !Array.isArray(options)) {
              const optionsObj = options as Record<string, string>;
              options = [optionsObj.A, optionsObj.B, optionsObj.C, optionsObj.D].filter(Boolean);
              const answerMap: Record<string, number> = { "A": 0, "B": 1, "C": 2, "D": 3 };
              if (typeof q.answer === 'string') correctAnswer = answerMap[q.answer.toUpperCase()] ?? 0;
            }

            return {
              id: q.id || `q-${Date.now()}-${i}`,
              question: q.question || q.text || "Question text missing",
              options: Array.isArray(options) ? options : ["A", "B", "C", "D"],
              correctAnswer: typeof correctAnswer === 'number' ? correctAnswer : 0,
              type: (q.type as "mcq" | "true-false") || "mcq",
            };
          });
          setShuffledQuiz(shuffleQuiz(formattedQuestions));
        } else {
          console.warn("[Quiz Webhook] No questions found, using fallback");
          setShuffledQuiz(shuffleQuiz(selectedDay.quiz));
        }
      } else {
        console.warn("[Quiz Webhook] Failed, using fallback quiz");
        setShuffledQuiz(shuffleQuiz(selectedDay.quiz));
      }
    } catch (err) {
      console.error("[Quiz Webhook] Error:", err);
      setShuffledQuiz(shuffleQuiz(selectedDay.quiz));
    } finally {
      setLoadingDay(false);
      setQuizAnswers({});
      setQuizSubmitted(false);
      setCurrentQuizIndex(0);
      setShowQuiz(true);
    }
  };

  const handleQuizSubmit = async (topicId: string, weekNum: number, dayNum: number) => {
    if (!selectedDay || shuffledQuiz.length === 0) return;

    setLoadingDay(true);
    try {
      const userAnswers = shuffledQuiz.map(q => quizAnswers[q.id] ?? -1);
      const correctAnswers = shuffledQuiz.map(q => q.correctAnswer);

      console.log(`[Quiz Submit] Sending assessment for Day ${dayNum}...`);
      const response = await fetch("https://pooja35.app.n8n.cloud/webhook-test/quiz-submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userAnswers,
          correctAnswers,
          week: weekNum,
          day: dayNum
        }),
      });

      if (!response.ok) throw new Error("Failed to evaluate quiz");

      const result = await response.json();
      console.log("[Quiz Result] Received:", result);

      setQuizSubmitted(true);

      // The response format: { week: number, day: number, score: number, nextLevel: boolean }
      // Condition: If nextLevel is true, only then unlock the next day
      if (result.nextLevel) {
        // Store the specific result in sessionStorage as requested
        sessionStorage.setItem(`quiz-result-w${weekNum}-d${dayNum}`, JSON.stringify(result));

        const key = `${topicId}-w${weekNum}-d${dayNum}`;
        console.log(`[Progress] Level Cleared! Marking complete: ${key}`);
        markComplete(key);

        toast.success(`Day ${dayNum} Passed! Score: ${result.score}/10. Day ${dayNum + 1} is now unlocked.`);
      } else {
        toast.error(`Assessment not cleared (Score: ${result.score}/10). Please retry to reach the next level!`);
      }
    } catch (err) {
      console.error("[Quiz Submit] Error:", err);
      toast.error("Internal service error during evaluation. Please try again.");
    } finally {
      setLoadingDay(false);
    }
  };

  const retryQuiz = () => {
    // Call startQuiz again to generate brand new questions from the AI
    startQuiz();
  };

  const resetQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setShowQuiz(false);
    setCurrentQuizIndex(0);
    setShuffledQuiz([]);
  };

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
        <div className="flex-1 min-w-0 p-3 sm:p-4 md:p-8 pb-20 overflow-y-auto custom-scrollbar">
          <div className="max-w-5xl mx-auto lg:mx-0 lg:ml-auto lg:mr-8">
            <button onClick={() => { setSelectedDay(null); resetQuiz(); }} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground mb-4 sm:mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Week {weekNum}
            </button>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3 mb-2">
                {completed && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
                <h1 className="text-xl sm:text-3xl font-black font-display text-foreground tracking-tight leading-none">
                  {selectedDay.title}
                </h1>
              </div>
              <div className="flex items-center gap-2 mb-8">
                <div className="h-1 w-12 bg-primary rounded-full" />
                <span className="text-xs font-bold text-primary uppercase tracking-widest">Training Curriculum • Day {dayNum}</span>
                {completed && <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full uppercase ml-auto">Verified Mastery</span>}
              </div>

              {loadingDay && (
                <div className="bg-primary/5 rounded-xl border border-primary/10 p-4 sm:p-6 mb-8 text-center animate-pulse flex items-center justify-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p className="text-sm font-medium text-primary">Enhancing your learning material...</p>
                </div>
              )}

              {/* Reading Content */}
              <div className="bg-card rounded-2xl border border-border p-6 sm:p-10 mb-6 shadow-xl shadow-primary/5">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-foreground">Course Content</h2>
                      <p className="text-xs text-muted-foreground">Deep dive into the core concepts</p>
                    </div>
                  </div>
                </div>

                <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-black prose-headings:tracking-tight prose-strong:text-primary prose-strong:bg-primary/5 prose-strong:px-1 prose-strong:rounded prose-li:marker:text-primary">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <div className="mb-6 text-justify">{children}</div>,
                      strong: ({ children }) => (
                        <strong className="font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border-b border-primary/20 cursor-default hover:bg-primary/20 transition-colors">
                          {children}
                        </strong>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-2xl sm:text-3xl font-black mt-12 mb-6 text-foreground border-l-4 border-primary pl-5 leading-tight tracking-tight">
                          {children}
                        </h3>
                      ),
                      li: ({ children }) => (
                        <li className="ml-4 mb-3 text-foreground/80 leading-relaxed group text-justify">
                          {children}
                        </li>
                      )
                    }}
                  >
                    {selectedDay.readingContent}
                  </ReactMarkdown>
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
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{shuffledQuiz.length} questions</span>
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
        <div className="hidden lg:flex w-[480px] border-l border-border shrink-0 h-full flex-col shadow-2xl">
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

            <div className="space-y-6 mt-4">
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
                      <Button
                        variant={passed ? "default" : "outline"}
                        className={passed ? "gradient-primary text-primary-foreground shadow-primary-glow" : ""}
                        onClick={() => {
                          if (passed) {
                            const currentDayNum = selectedDay.day;
                            const nextDay = selectedWeek.week.days.find(d => d.day === currentDayNum + 1);

                            // 1. Clear quiz state
                            resetQuiz();

                            // Explicitly sync progress state from storage to be 100% sure the UI has it
                            const freshProgress = loadProgress();
                            setCompletedMap(freshProgress);

                            // 2. Return to the curriculum page to show updated progress
                            setSelectedDay(null);

                            if (nextDay) {
                              toast.success(`Day ${currentDayNum} completed! Day ${currentDayNum + 1} is now unlocked.`);
                              console.log(`[Flow] Unlocked day ${currentDayNum + 1}. Progress map:`, freshProgress);
                            } else {
                              toast.success("Week completed! 🎉");
                            }
                          } else {
                            resetQuiz();
                          }
                        }}
                      >
                        {passed ? "Continue" : "Close"}
                      </Button>
                      {!passed && (
                        <Button onClick={retryQuiz} className="gradient-primary text-primary-foreground shadow-primary-glow">
                          Retry with New Questions
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })()}
            </div>
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
                        onClick={() => unlocked ? fetchDayData(day) : null}
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
                            {completed ? (
                              <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold">Completed</span>
                            ) : isCurrent ? (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold animate-pulse">In Progress</span>
                            ) : (
                              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Locked</span>
                            )}
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

  // --- Loading State ---
  if (loading) {
    return (
      <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading training roadmap...</p>
        </div>
      </div>
    );
  }

  if (error || trainingTopics.length === 0) {
    return (
      <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-foreground font-semibold mb-2">Unable to load training roadmap</p>
          <p className="text-muted-foreground text-sm mb-4">{error || "No roadmap data available"}</p>
          <Button
            onClick={() => window.location.reload()}
            className="gradient-primary text-primary-foreground"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // --- Main Week Listing ---
  const currentTopic = trainingTopics[0];
  const totalDays = currentTopic.weeks.reduce((s, w) => s + w.days.length, 0);
  const completedDays = currentTopic.weeks.reduce((s, w) => s + w.days.filter((_, di) => isDayCompleted(currentTopic.id, w.week, di + 1)).length, 0);
  const overallPct = Math.round((completedDays / totalDays) * 100);

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto pb-20">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground mb-2">Training Curriculum</h1>
        <p className="text-muted-foreground mb-6">
          Complete each week's daily topics in order. Pass the quiz to unlock the next day.
        </p>
        {/* Topic Tabs */}
        {trainingTopics.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {trainingTopics.map((t) => (
              <button
                key={t.id}
                className="px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap bg-primary text-primary-foreground shadow-md"
              >
                {t.title}
              </button>
            ))}
          </div>
        )}
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
        {currentTopic.weeks.map((week, wi) => {
          const weekCompleted = isWeekCompleted(currentTopic.id, week);
          const weekUnlocked = isWeekUnlocked(currentTopic.id, wi);
          const progress = getWeekProgress(currentTopic.id, week);
          const hasProgress = progress.done > 0 && !weekCompleted;

          return (
            <TooltipProvider key={week.week}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: wi * 0.06 }}
                    onClick={() => weekUnlocked ? setSelectedWeek({ topicId: currentTopic.id, week }) : null}
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

// --- Quiz Question Card ---
interface QuizCardProps {
  question: QuizQuestion;
  index: number;
  selected?: number;
  onSelect: (val: number) => void;
  submitted: boolean;
}

const QuizQuestionCard = ({ question, index, selected, onSelect, submitted }: QuizCardProps) => (
  <div className="bg-muted/30 rounded-lg p-4 border border-border">
    <p className="text-sm font-medium text-foreground mb-3">
      {index + 1}. {question.question}
    </p>
    <div className="space-y-2">
      {question.options.map((opt, oi) => {
        const isSelected = selected === oi;
        const isCorrect = question.correctAnswer === oi;
        let optionClass = "border-border hover:border-primary/30 bg-card";
        if (submitted) {
          if (isCorrect) optionClass = "border-emerald-500 bg-emerald-500/10";
          else if (isSelected && !isCorrect) optionClass = "border-destructive bg-destructive/10";
        } else if (isSelected) {
          optionClass = "border-primary bg-primary/5";
        }

        return (
          <button
            key={oi}
            onClick={() => !submitted && onSelect(oi)}
            disabled={submitted}
            className={`w-full text-left text-sm p-3 rounded-lg border transition-all flex items-center gap-3 ${optionClass}`}
          >
            <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium shrink-0
              ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground"}`}>
              {String.fromCharCode(65 + oi)}
            </span>
            <span className="text-foreground/80">{opt}</span>
            {submitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
            {submitted && isSelected && !isCorrect && <AlertCircle className="w-4 h-4 text-destructive ml-auto" />}
          </button>
        );
      })}
    </div>
  </div>
);
