import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import LoginPage from "./pages/LoginPage";
import AppLayout from "./components/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import TrainingPage from "./pages/TrainingPage";
import ProgressPage from "./pages/ProgressPage";
import AdminPage from "./pages/AdminPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const checkDB = async () => {
      const { error } = await supabase.from('_probe_').select('count');
      // If we get an error or data, it means we reached the server.
      // A common reachable error is 42P01 (relation does not exist) or 401 (unauthorized).
      // Both prove the network connection to the Supabase instance is working.
      if (error && (error.code === '42P01' || error.status === 401 || error.status === 404)) {
        console.log("DB Connection Proved:", error.message);
        toast.success("Database Connected", {
          description: "Verified connection to your Supabase instance.",
          duration: 5000,
        });
      } else if (!error) {
        toast.success("Database Fully Connected!");
      }
    };
    checkDB();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <NotificationProvider>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/training" element={<TrainingPage />} />
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </NotificationProvider>
    </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
