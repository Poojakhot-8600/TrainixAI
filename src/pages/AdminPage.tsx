import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import {
  Users, BookOpen, TrendingUp, AlertCircle, Upload, FileText, FileType,
  X, Sparkles, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"];

const AdminPage = () => {
  const { user } = useAuth();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load cached roadmap on mount
  useEffect(() => {
    const cached = sessionStorage.getItem("trainix-admin-generated-roadmap");
    if (cached) setGeneratedOutput(cached);
  }, []);

  const validateFile = useCallback((file: File): boolean => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext) && !ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Only PDF (.pdf) and Word (.doc, .docx) files are allowed.");
      return false;
    }
    return true;
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) setUploadedFile(file);
  }, [validateFile]);

  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) setUploadedFile(file);
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith(".pdf")) return <FileText className="w-6 h-6 text-red-500" />;
    return <FileType className="w-6 h-6 text-blue-500" />;
  };

  const handleGenerate = async () => {
    if (!uploadedFile) { toast.error("Please upload a file first."); return; }
    if (!prompt.trim()) { toast.error("Please enter a prompt."); return; }

    setGenerating(true);
    setGeneratedOutput(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("prompt", prompt);

      const response = await fetch("https://pooja33.app.n8n.cloud/webhook-test/roadmap-generator", {
        method: "POST",
        body: formData,
        // Content-Type is set automatically for FormData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Generated Roadmap Data:", data);

      // If we get back a string, we store it. If we get back a structured object, we handle it.
      const output = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      setGeneratedOutput(output);

      // Cache in sessionStorage
      sessionStorage.setItem("trainix-admin-generated-roadmap", output);

      toast.success("Roadmap generated successfully!");
    } catch (err) {
      console.error("Error generating roadmap:", err);
      toast.error("Failed to generate roadmap.");
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirm = async () => {
    if (!generatedOutput) {
      toast.error("No roadmap content to confirm.");
      return;
    }

    setConfirming(true);
    console.log("[Webhook] Attempting to confirm roadmap...");

    try {
      let roadmapData;
      try {
        roadmapData = JSON.parse(generatedOutput);
      } catch (e) {
        roadmapData = generatedOutput;
      }

      console.log("[Webhook] Payload:", {
        roadmap: roadmapData,
        confirmedBy: user?.email,
        timestamp: new Date().toISOString()
      });

      const response = await fetch("https://pooja29.app.n8n.cloud/webhook-test/confirmRoadmap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roadmap: roadmapData,
          confirmedBy: user?.email,
          timestamp: new Date().toISOString()
        }),
      });

      const responseText = await response.text();
      console.log("[Webhook] Response status:", response.status);
      console.log("[Webhook] Response text:", responseText);

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${responseText || "No error detail provided"}`);
      }

      toast.success("Roadmap confirmed and saved to database!");
    } catch (err) {
      console.error("[Webhook] Confirmation error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Confirmation failed: ${errorMessage}`);

      if (errorMessage.includes("Failed to fetch")) {
        toast.info("Tip: This might be a CORS error. Ensure your n8n webhook allows requests from this origin.");
      }
    } finally {
      setConfirming(false);
    }
  };

  const mockTrainees = [
    { name: "Alex Johnson", progress: 30, status: "active", lastActive: "Today" },
    { name: "Maria Garcia", progress: 65, status: "active", lastActive: "Today" },
    { name: "James Lee", progress: 12, status: "behind", lastActive: "3 days ago" },
    { name: "Priya Patel", progress: 80, status: "active", lastActive: "Yesterday" },
    { name: "Tom Wilson", progress: 5, status: "inactive", lastActive: "1 week ago" },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground mb-2">Admin Panel</h1>
        <p className="text-muted-foreground mb-8">Monitor trainee progress and manage training content.</p>
      </motion.div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {[
          { label: "Active Trainees", value: "5", icon: Users, gradient: "gradient-primary" },
          { label: "Training Tracks", value: "3", icon: BookOpen, gradient: "gradient-secondary" },
          { label: "Avg. Progress", value: "38%", icon: TrendingUp, gradient: "gradient-accent" },
          { label: "Need Attention", value: "2", icon: AlertCircle, gradient: "gradient-primary" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="bg-card rounded-xl shadow-card border border-border p-4 sm:p-5"
          >
            <div className={`w-10 h-10 rounded-lg ${card.gradient} flex items-center justify-center mb-3`}>
              <card.icon className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-display text-foreground">{card.value}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">{card.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Generate Roadmap Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card rounded-xl shadow-card border border-border overflow-hidden mb-8"
      >
        <div className="p-5 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <h2 className="text-lg font-semibold font-display text-foreground">Generate Roadmap</h2>
        </div>

        <div className="p-5 space-y-5">
          {/* File Upload */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Upload Document</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                ${dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/30"
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className={`w-8 h-8 mx-auto mb-3 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
              <p className="text-sm font-medium text-foreground">
                Drag & drop your file here, or <span className="text-primary">browse</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">Supports PDF, DOC, DOCX</p>
            </div>
          </div>

          {/* Uploaded File Preview */}
          <AnimatePresence>
            {uploadedFile && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border"
              >
                {getFileIcon(uploadedFile.name)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{uploadedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadedFile.size / 1024).toFixed(1)} KB • {uploadedFile.name.split(".").pop()?.toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
                  className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Prompt Input */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Custom Instructions</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='e.g. "Extract all topics and subtopics in detail", "Convert content into structured notes", "Generate question-answer format from content"'
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={generating || !uploadedFile || !prompt.trim()}
            className="gradient-primary text-primary-foreground shadow-primary-glow w-full sm:w-auto"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Output
              </>
            )}
          </Button>

          {/* Generated Output */}
          <AnimatePresence>
            {generatedOutput && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl border border-border p-5 relative overflow-hidden shadow-2xl shadow-primary/5"
              >
                <div className="flex items-center justify-between mb-6 px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-lg font-black text-foreground tracking-tight">System Generated Roadmap</h3>
                  </div>
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                </div>

                {/* Scrollable Area */}
                <div className="max-h-[650px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                  <div className="space-y-8 pb-24">
                    {(() => {
                      let roadmapObj;
                      try {
                        roadmapObj = JSON.parse(generatedOutput);
                      } catch (e) {
                        roadmapObj = null;
                      }

                      // Handle both { data: { roadmap ... } } and direct { roadmap ... } structure
                      const rd = (roadmapObj && roadmapObj.data && roadmapObj.data.roadmap) ? roadmapObj.data : roadmapObj;

                      if (rd && rd.roadmap && Array.isArray(rd.roadmap)) {
                        return (
                          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {/* Week Header */}
                            <div className="bg-primary/5 p-6 rounded-2xl border-l-8 border-primary shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="w-8 h-px bg-primary/40" />
                                <h4 className="text-xs uppercase tracking-widest font-black text-primary">Week {rd.week_number}</h4>
                              </div>
                              <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{rd.week_topic}</p>
                            </div>

                            {/* Day List */}
                            <div className="grid gap-6">
                            {rd.roadmap.map((dayItem: { day: string; topics: { title: string; subtopics: string[] }[] }, idx: number) => (
                                <div key={idx} className="bg-card border border-border p-6 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 border-t-4 border-t-primary/20">
                                  <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
                                        {idx + 1}
                                      </div>
                                      <div>
                                        <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-widest">Schedule</span>
                                        <h5 className="text-xl font-black text-foreground tracking-tight">{dayItem.day}</h5>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid sm:grid-cols-2 gap-4">
                                    {(dayItem.topics || []).map((topic: { title: string; subtopics: string[] }, tIdx: number) => (
                                      <div key={tIdx} className="bg-muted/30 p-4 rounded-xl border border-border/50 hover:border-primary/30 transition-colors group">
                                        <h6 className="text-sm font-black text-foreground mb-3 flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-primary group-hover:scale-150 transition-transform" />
                                          {topic.title}
                                        </h6>
                                        {topic.subtopics && (
                                          <div className="space-y-2 ml-3.5">
                                            {topic.subtopics.map((st: string, sIdx: number) => (
                                              <p key={sIdx} className="text-xs text-muted-foreground flex items-start gap-2 leading-relaxed">
                                                <span className="w-1 h-1 bg-primary/40 rounded-full mt-1.5 shrink-0" />
                                                {st}
                                              </p>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      // Fallback to text rendering
                      return (
                        <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line bg-muted/20 p-6 rounded-xl border border-border">
                          {generatedOutput.split("\n").map((line, i) => {
                            const trimmed = line.trim();
                            if (trimmed.startsWith("# ")) return <h2 key={i} className="text-2xl font-black mt-6 mb-4 text-foreground border-b border-border pb-2">{trimmed.slice(2)}</h2>;
                            if (trimmed.startsWith("## ")) return <h3 key={i} className="text-xl font-black mt-8 mb-4 text-primary leading-tight">{trimmed.slice(3)}</h3>;
                            if (trimmed.startsWith("### ")) return <h4 key={i} className="text-lg font-bold mt-6 mb-2 text-foreground">{trimmed.slice(4)}</h4>;
                            if (trimmed.startsWith("- ")) return (
                              <li key={i} className="ml-4 flex items-start gap-3 mb-3 text-foreground/90 font-semibold group">
                                <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0 group-hover:scale-125 transition-transform" />
                                <span>{trimmed.slice(2).replace(/\*\*/g, "")}</span>
                              </li>
                            );
                            if (trimmed.startsWith("  - ")) return (
                              <li key={i} className="ml-12 flex items-start gap-2 mb-2 text-muted-foreground text-xs leading-relaxed">
                                <span className="w-1 h-1 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                                <span>{trimmed.slice(4)}</span>
                              </li>
                            );
                            if (trimmed === "---") return <div key={i} className="my-10 h-px bg-gradient-to-r from-transparent via-border to-transparent" />;
                            if (!trimmed) return <div key={i} className="h-4" />;
                            return <p key={i} className="mb-3 pl-2 border-l-2 border-transparent">{line}</p>;
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Confirm Button Overlay */}
                <div className="absolute bottom-6 right-8 z-10">
                  <Button
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="gradient-secondary text-primary-foreground shadow-2xl px-10 h-14 rounded-full font-black text-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    {confirming ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving to DB...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Confirm Roadmap
                      </>
                    )}
                  </Button>
                </div>

                {/* Visual fade effect at the bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-card via-card/80 to-transparent pointer-events-none rounded-b-2xl" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Trainee table */}
      <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-semibold font-display text-foreground">Trainee Overview</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-muted-foreground font-medium">Name</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Progress</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {mockTrainees.map((t) => (
                <tr key={t.name} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium text-foreground">{t.name}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full gradient-primary" style={{ width: `${t.progress}%` }} />
                      </div>
                      <span className="text-muted-foreground">{t.progress}%</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${t.status === "active" ? "bg-success/10 text-success" :
                      t.status === "behind" ? "bg-warning/10 text-warning" :
                        "bg-destructive/10 text-destructive"
                      }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">{t.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
