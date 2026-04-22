import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const stored = localStorage.getItem("trainix_notifications");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.map((n: { id: string; title: string; message: string; timestamp: string; read: boolean }) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [lastCheckDate, setLastCheckDate] = useState<string>(() => {
    return localStorage.getItem("trainix_last_notification_check") || "";
  });

  useEffect(() => {
    localStorage.setItem("trainix_notifications", JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem("trainix_last_notification_check", lastCheckDate);
  }, [lastCheckDate]);

  const addNotification = useCallback((notif: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotif: Notification = {
      ...notif,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date(),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // Show toast notification
    toast(newNotif.title, {
      description: newNotif.message,
      duration: 5000,
    });
  }, []);

  const markAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Daily Notification Logic
  useEffect(() => {
    const checkNotification = () => {
      const now = new Date();
      // Local date format (YYYY-MM-DD)
      const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // 1. Shoot Notification at 6:03 PM (18:03)
      const isPastTriggerTime = hours > 18 || (hours === 18 && minutes >= 3);

      if (isPastTriggerTime && lastCheckDate !== today) {
        const quizResult = sessionStorage.getItem("quiz-result-w1-d1");

        // Shoot only when session storage has the key
        if (quizResult) {
          addNotification({
            title: "Daily Quiz Reminder",
            message: "🧠 Time for your daily quiz! Ready to test your knowledge?",
          });
          setLastCheckDate(today);
        }
      }

      // 2. Automatically remove/reset at 9 PM (21:00)
      if (hours >= 21) {
        setNotifications((prev) => {
          const filtered = prev.filter((n) => {
            const isDailyQuiz = n.title === "Daily Quiz Reminder";
            const dateStr = n.timestamp.getFullYear() + '-' + String(n.timestamp.getMonth() + 1).padStart(2, '0') + '-' + String(n.timestamp.getDate()).padStart(2, '0');
            return !(isDailyQuiz && dateStr === today);
          });
          return filtered.length !== prev.length ? filtered : prev;
        });

        // Reset lastCheckDate if it's late night to allow fresh check for tomorrow
        // actually, our 'today' string handles the daily reset at midnight naturally.
      }
    };

    checkNotification();
    const interval = setInterval(checkNotification, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [lastCheckDate, addNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};
