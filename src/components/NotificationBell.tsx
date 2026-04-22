import React, { useState, useRef, useEffect } from "react";
import { Bell, X, Trash2, CheckCheck } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import { motion, AnimatePresence } from "framer-motion";

const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, clearNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      // markAsRead(); // Optional: mark as read only when closing or by button
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-full hover:bg-muted transition-colors focus:outline-none"
      >
        <Bell className={`w-6 h-6 ${unreadCount > 0 ? "text-primary animate-ring" : "text-muted-foreground"}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-background">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <h3 className="font-bold text-sm">Notifications</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => markAsRead()}
                  className="p-1 hover:text-primary transition-colors tooltip"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
                <button
                  onClick={() => clearNotifications()}
                  className="p-1 hover:text-destructive transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 border-b border-border last:border-0 transition-colors ${
                      !notif.read ? "bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`text-sm font-semibold ${!notif.read ? "text-primary" : "text-foreground"}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {notif.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {notif.message}
                    </p>
                    {!notif.read && (
                      <div className="mt-2 w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </div>
                ))
              )}
            </div>
            
            {notifications.length > 0 && (
              <div className="p-2 border-t border-border bg-muted/10 text-center">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
