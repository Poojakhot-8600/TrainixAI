import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    role: "assistant",
    text: "Hi! I'm your AI training assistant. I can help you with training topics, answer questions about company policies, quiz you on what you've learned, or suggest what to study next. What would you like help with?",
  },
];

const QUICK_PROMPTS = [
  "Quiz me on Company Culture",
  "Explain our architecture patterns",
  "What should I study next?",
  "Summarize this week's topics",
];

const AssistantPage = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const currentInput = input;
    const userMsg: Message = { id: Date.now(), role: "user", text: currentInput };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      console.log(`[Chat Webhook] Calling AI with Input: "${currentInput}"`);
      const response = await fetch("https://pooja33.app.n8n.cloud/webhook/68f69153-e7a0-4e90-ab01-1e2b22e26388/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatInput: currentInput,
          message: currentInput, // Support for common n8n AI node defaults
          sessionId: user?.email || "training-session-assistant",
        }),
      });

      console.log(`[Chat Webhook] Status: ${response.status}`);
      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Chat Webhook] Error response: ${errText}`);
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      console.log("[Chat Webhook] Response Data:", data);
      
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
      console.error("Chat Webhook Error:", err);
      const errorMsg: Message = {
        id: Date.now() + 1,
        role: "assistant",
        text: "I'm having trouble reaching my neural network. If you're the developer, please ensure your n8n workflow is **Activated** and CORS is enabled.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">AI Training Assistant</h1>
            <p className="text-sm text-muted-foreground">Ask questions, take quizzes, get personalized guidance</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 space-y-8 bg-slate-50/50">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === "assistant" 
              ? "bg-[#6366F1] text-white" 
              : "bg-slate-200 text-slate-600"
              }`}>
              {msg.role === "assistant" ? (
                <Bot className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            <div className={`max-w-[85%] sm:max-w-[600px] rounded-[24px] px-6 py-4 text-[14px] leading-relaxed transition-all ${msg.role === "user"
              ? "bg-[#3B82F6] text-white rounded-tr-[4px] shadow-sm font-medium"
              : "bg-[#F3F4F6] text-[#374151] rounded-tl-[4px] border border-transparent shadow-none"
              }`}>
              <div className={msg.role === "assistant" ? "prose prose-slate max-w-none" : ""}>
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h1 className="text-[18px] font-bold text-[#111827] mb-4 mt-0 tracking-tight leading-tight">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-[17px] font-bold text-[#111827] mb-3 mt-6 leading-tight">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-[15px] font-bold text-[#111827] mb-2 mt-4 leading-tight">{children}</h3>,
                    p: ({ children }) => <p className="mb-4 text-[#4B5563] leading-[1.6] font-normal">{children}</p>,
                    ul: ({ children }) => <ul className="space-y-4 mb-4 list-none pl-0">{children}</ul>,
                    li: ({ children }) => (
                      <li className="flex items-start gap-4 group">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-[9px] shrink-0" />
                        <span className="flex-1 text-[#4B5563] leading-[1.6]">{children}</span>
                      </li>
                    ),
                    strong: ({ children }) => <strong className="font-bold text-[#111827]">{children}</strong>,
                    code: ({ children }) => (
                      <code className="bg-white/50 px-1.5 py-0.5 rounded text-indigo-600 font-mono text-[13px] border border-slate-200">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="bg-white border border-slate-200 p-4 rounded-xl overflow-x-auto my-4 shadow-sm text-[#374151] font-mono text-[13px]">
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
            className="flex gap-4"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0 animate-pulse">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl rounded-tl-none px-6 py-4 text-sm text-slate-400 shadow-sm flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-indigo-400/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-indigo-400/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-indigo-400/60 rounded-full animate-bounce"></span>
              </div>
              <span className="font-semibold">Searching for answers...</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick prompts */}
      <div className="px-6 pb-2 flex gap-2 flex-wrap">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => { setInput(prompt); }}
            className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex gap-2 max-w-3xl mx-auto"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your training..."
            className="h-11 flex-1"
          />
          <Button type="submit" className="h-11 gradient-primary text-primary-foreground shadow-primary-glow">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AssistantPage;
