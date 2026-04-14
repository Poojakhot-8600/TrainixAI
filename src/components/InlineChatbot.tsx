import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      text: `Hi! I'm here to help you with "${dayTitle}". Ask me anything about today's topic, request hints, or get help with exercises!`,
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now(), role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    setTimeout(() => {
      const responses = [
        "Great question! This concept is about structuring your code so each part has a single responsibility.",
        "Here's a hint: try breaking the problem into smaller steps first. Start with the structure, then add styling, and finally the interactivity.",
        "Let me quiz you: What's the difference between `margin` and `padding` in CSS? Think about the box model!",
        "Based on your progress, I'd suggest reviewing the code snippets above one more time, then try the hands-on exercise.",
        "That's a common question! The key thing to remember is that practice matters more than memorization.",
      ];
      const aiMsg: Message = {
        id: Date.now() + 1,
        role: "assistant",
        text: responses[Math.floor(Math.random() * responses.length)],
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 700);
  };

  return (
    <div className="bg-card h-full flex flex-col lg:border-0 rounded-xl lg:rounded-none border border-border overflow-hidden">
      {/* Header - toggle on mobile, static on desktop */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="lg:cursor-default w-full flex items-center gap-3 p-4 hover:bg-muted/30 lg:hover:bg-transparent transition-colors border-b border-border"
      >
        <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <h3 className="text-sm font-bold font-display text-foreground">AI Training Assistant</h3>
          <p className="text-xs text-muted-foreground truncate">Get help with today's topic</p>
        </div>
        <span className="lg:hidden">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </span>
      </button>

      {/* Chat area - always visible on desktop, toggle on mobile */}
      <div className={`flex-1 flex flex-col ${expanded || 'hidden'} lg:flex`}>
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 h-[300px] lg:h-auto">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "assistant" ? "gradient-primary" : "gradient-secondary"
                }`}
              >
                {msg.role === "assistant" ? (
                  <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                ) : (
                  <User className="w-3.5 h-3.5 text-secondary-foreground" />
                )}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Prompts */}
        <div className="px-4 pb-2 flex gap-1.5 flex-wrap">
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
        <div className="p-3 border-t border-border">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this topic..."
              className="h-10 flex-1 text-sm"
            />
            <Button type="submit" size="icon" className="h-10 w-10 gradient-primary text-primary-foreground shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InlineChatbot;
