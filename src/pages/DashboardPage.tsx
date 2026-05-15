import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { trainingTopics } from "@/data/trainingData";
import NotificationBell from "@/components/NotificationBell";
import {
  BookOpen, Clock, Trophy, TrendingUp, Sparkles,
  Building2, Code2, Users, ChevronRight, CheckCircle2, Circle, Lock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getRoadmapAction } from "@/lib/roadmap-actions";
import { TrainingTopic } from "@/data/trainingData";

const iconMap: Record<string, React.ElementType> = { Building2, Code2, Users };
const colorMap = {
  primary: "gradient-primary",
  secondary: "gradient-secondary",
  accent: "gradient-accent",
};

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dynamicTopics, setDynamicTopics] = useState<TrainingTopic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);

  // Use dynamic topics if available, otherwise fall back to static
  const displayTopics = dynamicTopics.length > 0 ? dynamicTopics : trainingTopics;

  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        setLoadingTopics(true);
        const result = await getRoadmapAction();

        if (result.status === "success" && result.data) {
          // Transform DB data to TrainingTopic format (similar to TrainingPage)
          let topics: TrainingTopic[] = [];

          if (Array.isArray(result.data) && result.data.length > 0) {
            const allWeeks = result.data.map((weekData, weekIdx) => {
              const days = (weekData.roadmap as Record<string, unknown>[]).map((dayItem, dayIdx) => ({
                day: dayIdx + 1,
                title: (dayItem.topics as Record<string, unknown>[])[0]?.title as string || `Day ${dayIdx + 1}`,
                status: ((weekIdx === 0 && dayIdx === 0) ? "in-progress" : "locked") as "completed" | "in-progress" | "locked",
                readingContent: "",
                quiz: [],
              }));

              return {
                week: weekData.week_number as number,
                title: weekData.week_topic as string,
                description: `Detailed training for ${weekData.week_topic as string}`,
                status: (weekIdx === 0 ? "in-progress" : "locked") as "in-progress" | "locked" | "completed",
                days,
              };
            });

            const topic: TrainingTopic = {
              id: "company-training-roadmap",
              title: "Technical Training Roadmap",
              description: "Your structured path to technical mastery",
              icon: "BookOpen",
              color: "primary",
              weeks: allWeeks,
            };
            topics = [topic];
          }

          setDynamicTopics(topics);
        }
      } catch (error) {
        console.error("Error fetching roadmap for dashboard:", error);
        // Fall back to static topics
      } finally {
        setLoadingTopics(false);
      }
    };

    fetchRoadmap();
  }, []);

  const totalModules = displayTopics.reduce((s, t) => s + t.weeks.length, 0);
  const completedModules = displayTopics.reduce(
    (s, t) => s + t.weeks.filter((w) => w.status === "completed").length, 0
  );
  const inProgress = displayTopics.reduce(
    (s, t) => s + t.weeks.filter((w) => w.status === "in-progress").length, 0
  );
  const progressPercent = Math.round((completedModules / totalModules) * 100);

  const stats = [
    { label: "Completed", value: completedModules, icon: Trophy, gradient: "gradient-secondary" },
    { label: "In Progress", value: inProgress, icon: Clock, gradient: "gradient-accent" },
    { label: "Total Modules", value: totalModules, icon: BookOpen, gradient: "gradient-primary" },
    { label: "Progress", value: `${progressPercent}%`, icon: TrendingUp, gradient: "gradient-secondary" },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto relative">
      {/* Top Header Actions */}
      <div className="absolute top-8 right-8 z-10">
        <NotificationBell />
      </div>

      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold font-display text-foreground mb-1">
          Welcome back, {user?.name?.split(" ")[0]}! 👋
        </h1>
        <p className="text-muted-foreground mr-12">
          {user?.role === "admin"
            ? "Monitor trainee progress and manage training content."
            : "Continue your personalized learning journey."}
        </p>
      </motion.div>

      {/* Role badge + info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-xl shadow-card border border-border p-6 mb-8 flex flex-wrap gap-6 items-center"
      >
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            user?.role === "admin"
              ? "gradient-accent text-accent-foreground"
              : "gradient-primary text-primary-foreground"
          }`}>
            {user?.role === "admin" ? "Administrator" : "Trainee"}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{user?.department}</span> · Joined {user?.joinDate}
        </div>
        {user?.role === "trainee" && (
          <div className="ml-auto flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-muted-foreground">AI recommends: <span className="font-medium text-foreground">Architecture & Patterns</span></span>
          </div>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            className="bg-card rounded-xl shadow-card border border-border p-5"
          >
            <div className={`w-10 h-10 rounded-lg ${stat.gradient} flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="text-2xl font-bold font-display text-foreground">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Training Topics */}
      <h2 className="text-xl font-bold font-display text-foreground mb-4">Training Tracks</h2>
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {displayTopics.map((topic, i) => {
          const Icon = iconMap[topic.icon] || BookOpen;
          const completed = topic.weeks.filter((w) => w.status === "completed").length;
          return (
            <motion.button
              key={topic.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              onClick={() => navigate("/training")}
              className="bg-card rounded-xl shadow-card border border-border p-6 text-left hover:shadow-card-hover transition-shadow group"
            >
              <div className={`w-11 h-11 rounded-lg ${colorMap[topic.color]} flex items-center justify-center mb-4`}>
                <Icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold font-display text-foreground mb-1">{topic.title}</h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{topic.description}</p>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {completed}/{topic.weeks.length} weeks
                </div>
                <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${colorMap[topic.color]}`}
                    style={{ width: `${(completed / topic.weeks.length) * 100}%` }}
                  />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Current Week Modules */}
      <h2 className="text-xl font-bold font-display text-foreground mb-4">This Week's Modules</h2>
      <div className="space-y-3">
        {displayTopics.flatMap((topic) =>
          topic.weeks
            .filter((w) => w.status === "in-progress")
            .map((week) => (
              <motion.div
                key={`${topic.id}-${week.week}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card rounded-xl shadow-card border border-border p-5 flex items-center gap-4 hover:shadow-card-hover transition-shadow cursor-pointer group"
                onClick={() => navigate("/training")}
              >
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{week.title}</p>
                  <p className="text-sm text-muted-foreground">{topic.title} · Week {week.week}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </motion.div>
            ))
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
