import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, ChevronDown, ChevronUp, MessageCircle, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;

}

const QUICK_PROMPTS = [
  "Explain this concept",
  "Give me a hint",
  "Quiz me",
  "What's next?",
];

interface InlineChatbotProps {
  dayTitle: string;
}

const InlineChatbot = ({ dayTitle }: InlineChatbotProps) => {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      text: `Hi! I'm here to help you with "${dayTitle}". Ask me anything about today's topic!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const currentInput = input;
    const userMsg: Message = { id: Date.now(), role: "user", text: currentInput };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      console.log(`[Inline Chat] Calling AI with Input: "${currentInput}"`);
      const response = await fetch("https://harshadag14.app.n8n.cloud/webhook/68f69153-e7a0-4e90-ab01-1e2b22e26388/chat", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatInput: currentInput,
          message: currentInput, // Support for common n8n AI node defaults
          sessionId: user?.email || "training-session-inline",
          context: `User is studying: ${dayTitle}`
        }),
      });

      console.log(`[Inline Chat] Status: ${response.status}`);
      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Inline Chat] Error response: ${errText}`);
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      console.log("[Inline Chat] Response Data:", data);

      // Robust recursive parsing to handle double-stringified JSON or nested objects
      const extractText = (obj: unknown): string => {
        if (!obj) return "";
        if (typeof obj === 'string') {
          // Check if the string itself is a JSON object
          if (obj.trim().startsWith('{')) {
            try { return extractText(JSON.parse(obj)); } catch (e) { return obj; }
          }
          return obj;
        }
        if (Array.isArray(obj)) return extractText(obj[0]);

        const possibleObj = obj as Record<string, unknown>;
        return extractText(
          possibleObj.reply ||
          possibleObj.output ||
          possibleObj.response ||
          possibleObj.message ||
          possibleObj.text ||
          possibleObj.answer ||
          possibleObj.content ||
          JSON.stringify(obj)
        );
      };

      const assistantText = extractText(data);

      const aiMsg: Message = {
        id: Date.now() + 1,
        role: "assistant",
        text: assistantText,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("Inline Chat Error:", err);
      const errorMsg: Message = {
        id: Date.now() + 1,
        role: "assistant",
        text: "Sorry, I'm unable to connect to the AI service. If you're the developer, please ensure your n8n workflow is **Activated** and CORS is enabled.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Desktop: full sidebar panel
  // Mobile: floating toggle button + expandable chat
  return (
    <>
      {/* Desktop sidebar version */}
      <div className="hidden lg:flex flex-col h-full bg-card">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold font-display text-foreground">AI Training Assistant</h3>
            <p className="text-xs text-muted-foreground truncate">Help with: {dayTitle}</p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === "assistant" ? "bg-[#6366F1] text-white" : "bg-slate-200 text-slate-600"}`}>
                {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className={`max-w-[85%] rounded-[20px] px-4 py-3 text-[13px] leading-relaxed transition-all ${msg.role === "user" ? "bg-[#3B82F6] text-white rounded-tr-[4px] shadow-sm font-medium" : "bg-[#F3F4F6] text-[#374151] rounded-tl-[4px]"}`}>
                <div className={msg.role === "assistant" ? "prose prose-slate max-w-none" : ""}>
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="text-[16px] font-bold text-[#111827] mb-3 mt-1 leading-tight">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-[15px] font-bold text-[#111827] mb-2 mt-4 leading-tight">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-[13px] font-bold text-[#111827] mb-1.5 mt-3 leading-tight tracking-wide">{children}</h3>,
                      p: ({ children }) => <p className="mb-3 text-[#4B5563] leading-[1.6] last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="space-y-3.5 mb-3 list-none pl-0">{children}</ul>,
                      li: ({ children }) => (
                        <li className="flex items-start gap-3.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-200 mt-[7px] shrink-0" />
                          <span className="flex-1 text-[#4B5563] leading-[1.6]">{children}</span>
                        </li>
                      ),
                      strong: ({ children }) => <strong className="font-bold text-[#111827]">{children}</strong>,
                      code: ({ children }) => (
                        <code className="bg-white/50 px-1 rounded text-indigo-600 font-mono text-[11px] border border-slate-200">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-white border border-slate-200 p-3 rounded-lg overflow-x-auto my-3 text-[11px] text-[#374151] font-mono shadow-sm">
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 animate-pulse shadow-md">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 text-[11px] text-slate-400 shadow-sm flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-indigo-400/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-indigo-400/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-indigo-400/60 rounded-full animate-bounce"></span>
                </div>
                <span className="font-semibold text-slate-500">Searching...</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="px-4 pb-2 flex gap-1.5 flex-wrap shrink-0">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => setInput(prompt)}
              className="text-xs px-2.5 py-1 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border shrink-0">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about this topic..." className="h-10 flex-1 text-sm" />
            <Button type="submit" size="icon" className="h-10 w-10 gradient-primary text-primary-foreground shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Mobile floating version */}
      <div className="lg:hidden">
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="w-14 h-14 rounded-full gradient-primary shadow-lg flex items-center justify-center text-primary-foreground"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        )}

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="bg-card rounded-xl border border-border shadow-xl flex flex-col w-full max-h-[70vh]"
            >
              {/* Mobile header */}
              <div className="flex items-center gap-3 p-3 border-b border-border shrink-0">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
                <span className="text-sm font-bold text-foreground flex-1">AI Assistant</span>
                <button onClick={() => setExpanded(false)} className="p-1">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[250px] bg-slate-50/50">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-md ${msg.role === "assistant" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                      {msg.role === "assistant" ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    </div>
                    <div className={`max-w-[88%] rounded-[18px] px-3.5 py-2.5 text-[12px] leading-relaxed transition-all ${msg.role === "user" ? "bg-[#3B82F6] text-white rounded-tr-[4px] shadow-sm font-medium" : "bg-[#F3F4F6] text-[#374151] rounded-tl-[4px]"}`}>
                      <div className={msg.role === "assistant" ? "prose prose-sm max-w-none" : ""}>
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => <h1 className="text-[14px] font-bold text-[#111827] mb-2 mt-1 leading-tight">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-[13px] font-bold text-[#111827] mb-1.5 mt-3 leading-tight">{children}</h2>,
                            p: ({ children }) => <p className="mb-2 text-[#4B5563] leading-[1.6] last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="space-y-2 mb-2 list-none pl-0">{children}</ul>,
                            li: ({ children }) => (
                              <li className="flex items-start gap-2.5">
                                <div className="w-1 h-1 rounded-full bg-slate-300 mt-[7px] shrink-0" />
                                <span className="flex-1 text-[#4B5563] leading-[1.6]">{children}</span>
                              </li>
                            ),
                            strong: ({ children }) => <strong className="font-bold text-[#111827]">{children}</strong>,
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 animate-pulse shadow-md">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-2.5 text-[10px] text-slate-400 shadow-sm flex items-center gap-2">
                      <div className="flex gap-1 text-indigo-400">
                        <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
                      </div>
                      <span className="font-semibold text-slate-500">Searching...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border shrink-0">
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                  <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything..." className="h-9 flex-1 text-sm" />
                  <Button type="submit" size="icon" className="h-9 w-9 gradient-primary text-primary-foreground shrink-0">
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default InlineChatbot;
