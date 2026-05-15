import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import {
  Upload, FileText, FileType,
  X, Sparkles, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { confirmRoadmapAction } from "@/lib/roadmap-actions";

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
  const [isConfirmed, setIsConfirmed] = useState(false);
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
    setIsConfirmed(false);

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("prompt", prompt);

      const response = await fetch(`${import.meta.env.VITE_WEBHOOK_URL}roadmap-generator`, {
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
    console.log("[DB Action] Attempting to store roadmap...");

    try {
      let rawData;
      try {
        rawData = JSON.parse(generatedOutput);
      } catch (e) {
        toast.error("Invalid roadmap format. Please regenerate.");
        return;
      }

      // Handle both { data: { week_number, ... } } and direct format
      const roadmapObj = (rawData && rawData.data && rawData.data.roadmap) ? rawData.data : rawData;

      if (!roadmapObj.week_number) {
          throw new Error("Invalid roadmap data: week_number is missing.");
      }

      const result = await confirmRoadmapAction({
        week_number: Number(roadmapObj.week_number),
        week_topic: roadmapObj.week_topic || "Generated Topic",
        roadmap: roadmapObj.roadmap || roadmapObj,
      });

      if (result.status === "success") {
        toast.success(result.message);
        setIsConfirmed(true);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      console.error("[DB Action] Storage error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Storage failed: ${errorMessage}`);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground mb-2">Admin Panel</h1>
        <p className="text-muted-foreground mb-8">Monitor trainee progress and manage training content.</p>
      </motion.div>

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
                      // stgdf cvxfcg
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                                  <div className="grid gap-4">
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
                      //jfgjfj rty
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
                  {!isConfirmed && (
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
                  )}
                </div>

                {/* Visual fade effect at the bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-card via-card/80 to-transparent pointer-events-none rounded-b-2xl" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminPage;
