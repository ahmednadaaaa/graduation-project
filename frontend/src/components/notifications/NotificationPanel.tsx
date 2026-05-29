import { Bell, AlertTriangle, CheckCircle, Info, XCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { Notification } from "@/utils/data";
import { formatDistanceToNow } from "date-fns";

const typeIcons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: XCircle,
};

const typeStyles = {
  info: "text-primary",
  warning: "text-warning",
  success: "text-success",
  error: "text-destructive",
};

const NotificationPanel = () => {
  const [open, setOpen] = useState(false);
  const { notifications, markNotificationRead } = useAppStore();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 hover:bg-secondary transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] flex items-center justify-center text-destructive-foreground font-bold">
            {unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-80 glass-card-strong rounded-xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between p-3 border-b border-border/50">
                <h3 className="font-semibold text-sm">Notifications</h3>
                <button onClick={() => setOpen(false)}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground text-center">No notifications</p>
                ) : (
                  notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRead={() => markNotificationRead(notification.id)}
                    />
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const NotificationItem = ({ notification, onRead }: { notification: Notification; onRead: () => void }) => {
  const Icon = typeIcons[notification.type];
  return (
    <div
      onClick={onRead}
      className={`flex gap-3 p-3 border-b border-border/30 cursor-pointer hover:bg-secondary/50 transition-colors ${
        !notification.read ? "bg-primary/5" : ""
      }`}
    >
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${typeStyles[notification.type]}`} />
      <div className="min-w-0">
        <p className="text-sm font-medium">{notification.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{notification.message}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
        </p>
      </div>
      {!notification.read && (
        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
      )}
    </div>
  );
};

export default NotificationPanel;
