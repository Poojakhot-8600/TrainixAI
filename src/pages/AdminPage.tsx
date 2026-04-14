import { useState, useRef, useCallback } from "react";
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
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext) && !ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Only PDF (.pdf) and Word (.doc, .docx) files are allowed.");
      return false;
    }
    return true;
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) setUploadedFile(file);
  }, []);

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

    // Simulated processing
    setTimeout(() => {
      setGeneratedOutput(
        `# Generated Roadmap\n\n**Based on:** ${uploadedFile.name}\n**Prompt:** ${prompt}\n\n---\n\n## Module 1: Introduction\n- Overview of key concepts\n- Learning objectives and prerequisites\n- Setting up the environment\n\n## Module 2: Core Concepts\n- **Topic 2.1:** Fundamental principles\n  - Detailed explanation of base concepts\n  - Key terminology and definitions\n  - Practical examples and use cases\n\n- **Topic 2.2:** Advanced patterns\n  - Design patterns overview\n  - Implementation strategies\n  - Best practices and common pitfalls\n\n## Module 3: Hands-On Practice\n- Exercise 1: Build a basic component\n- Exercise 2: Implement data flow\n- Exercise 3: Integration testing\n\n## Module 4: Assessment & Review\n- Quiz covering all modules\n- Project submission guidelines\n- Review and feedback process\n\n---\n\n*This roadmap was generated from the uploaded document content processed with your custom instructions.*`
      );
      setGenerating(false);
      toast.success("Roadmap generated successfully!");
    }, 2000);
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
                className="bg-muted/30 rounded-xl border border-border p-5"
              >
                <h3 className="text-md font-semibold text-foreground mb-3">Generated Output</h3>
                <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                  {generatedOutput.split("\n").map((line, i) => {
                    if (line.startsWith("# ")) return <h2 key={i} className="text-xl font-bold mt-4 mb-2 text-foreground">{line.slice(2)}</h2>;
                    if (line.startsWith("## ")) return <h3 key={i} className="text-lg font-semibold mt-3 mb-1 text-foreground">{line.slice(3)}</h3>;
                    if (line.startsWith("**") && line.includes(":**")) {
                      const [bold, rest] = line.split(":**");
                      return <p key={i} className="font-semibold mt-2"><span>{bold.replace(/\*\*/g, "")}:</span>{rest}</p>;
                    }
                    if (line.startsWith("- **")) return <li key={i} className="ml-4 list-disc font-medium mt-1">{line.slice(2).replace(/\*\*/g, "")}</li>;
                    if (line.startsWith("- ")) return <li key={i} className="ml-6 list-disc text-foreground/70">{line.slice(2)}</li>;
                    if (line.startsWith("  - ")) return <li key={i} className="ml-10 list-circle text-foreground/60 text-xs">{line.slice(4)}</li>;
                    if (line.startsWith("---")) return <hr key={i} className="my-3 border-border" />;
                    if (line.startsWith("*") && line.endsWith("*")) return <p key={i} className="text-xs text-muted-foreground italic mt-2">{line.replace(/\*/g, "")}</p>;
                    if (!line.trim()) return <br key={i} />;
                    return <p key={i} className="mb-1">{line}</p>;
                  })}
                </div>
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
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      t.status === "active" ? "bg-success/10 text-success" :
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
