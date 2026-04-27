import { supabase } from "./supabase";

export interface RoadmapInsertData {
  week_number: number;
  week_topic: string;
  roadmap: unknown;
}

/**
 * Server Action equivalent for Vite/Supabase
 * Stores the generated roadmap in the roadmap_data table
 */
export async function confirmRoadmapAction(data: RoadmapInsertData) {
  try {
    console.log("[DB Action] Inserting roadmap data:", data);

    const { data: result, error } = await supabase
      .from("roadmap_data")
      .insert([
        {
          week_number: data.week_number,
          week_topic: data.week_topic,
          roadmap: data.roadmap,
          // created_at is handled by DB default
        }
      ])
      .select();

    if (error) {
      console.error("[DB Action] Insert error:", error);
      throw new Error(error.message);
    }

    console.log("[DB Action] Success:", result);
    return {
      status: "success",
      message: "Roadmap successfully stored in database",
      data: result
    };
  } catch (error: unknown) {
    console.error("[DB Action] Catch error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to store roadmap in database";
    return {
      status: "error",
      message: errorMessage
    };
  }
}

/**
 * Fetches all roadmaps from the database, ordered by week number
 */
export async function getRoadmapAction() {
  try {
    console.log("[DB Action] Fetching all roadmaps...");

    const { data, error } = await supabase
      .from("roadmap_data")
      .select("*")
      .order("week_number", { ascending: true });

    if (error) {
      console.error("[DB Action] Fetch error:", error);
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      return {
        status: "success",
        data: null,
        message: "No roadmap found in database"
      };
    }

    // Transform DB format to a list of week data
    const formattedData = data.map(item => ({
      week_number: item.week_number,
      week_topic: item.week_topic,
      roadmap: item.roadmap
    }));

    return {
      status: "success",
      data: formattedData
    };
  } catch (error: unknown) {
    console.error("[DB Action] Fetch catch error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch roadmap from database";
    return {
      status: "error",
      message: errorMessage
    };
  }
}

/**
 * Server Action for Quiz Submission
 * Evaluates answers and stores passing scores in the database
 */
export async function submitQuizAction(payload: {
  userAnswers: number[];
  correctAnswers: number[];
  week: number;
  day: number;
}) {
  const { userAnswers, correctAnswers, week, day } = payload;

  // Validation
  if (!userAnswers || !correctAnswers || week === undefined || day === undefined) {
    return { status: "error", message: "Missing required quiz inputs" };
  }

  // Calculate score
  let score = 0;
  const length = Math.min(userAnswers.length, correctAnswers.length);
  for (let i = 0; i < length; i++) {
    if (userAnswers[i] === correctAnswers[i]) {
      score++;
    }
  }

  const passed = score >= 7;

  try {
    if (passed) {
      console.log(`[DB Action] Quiz passed (score: ${score}). Upserting score...`);
      
      // Upsert into learner_scores
      const { error } = await supabase
        .from("learner_scores")
        .upsert(
          {
            week,
            day,
            score,
            nextLevel: true
          },
          { onConflict: "week,day" }
        );

      if (error) {
        console.error("[DB Action] Score storage error:", error);
        // We still return the result even if storage fails, but with an error message
      }
    }

    return {
      week,
      day,
      score,
      passed,
      nextLevel: passed,
      message: passed ? "Quiz passed" : "You need at least 7 correct answers to pass"
    };
  } catch (err: unknown) {
    console.error("[DB Action] Quiz catch error:", err);
    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred during evaluation";
    return {
      status: "error",
      message: errorMessage
    };
  }
}
