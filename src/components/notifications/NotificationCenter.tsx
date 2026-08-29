
import { useState, useEffect } from "react";
import { Bell, X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { getUnreadNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/services/notificationService";
import type { YearTransitionNotification } from "@/services/notificationService";
import { useToast } from "@/hooks/use-toast";

const NotificationCenter = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<YearTransitionNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.schoolId) {
      fetchNotifications();
    }
  }, [user?.schoolId]);

  const fetchNotifications = async () => {
    if (!user?.schoolId) return;
    
    try {
      setIsLoading(true);
      const data = await getUnreadNotifications(user.schoolId);
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast({
        title: "Notification marked as read",
        description: "The notification has been marked as read.",
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read.",
        variant: "destructive"
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.schoolId) return;
    
    try {
      await markAllNotificationsAsRead(user.schoolId);
      setNotifications([]);
      toast({
        title: "All notifications marked as read",
        description: "All notifications have been marked as read.",
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read.",
        variant: "destructive"
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'term_transition':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'year_end':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'year_start':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'term_transition':
        return 'bg-blue-50 border-blue-200';
      case 'year_end':
        return 'bg-orange-50 border-orange-200';
      case 'year_start':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {notifications.length > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
            {notifications.length}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-12 w-96 z-50 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="text-xs h-7"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No new notifications
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-l-4 ${getNotificationColor(notification.notificationType)} hover:bg-gray-50 transition-colors`}
                    >
                      <div className="flex items-start gap-3">
                        {getNotificationIcon(notification.notificationType)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.notificationType.replace('_', ' ').toUpperCase()}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-xs h-6 px-2"
                        >
                          Mark read
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotificationCenter;
