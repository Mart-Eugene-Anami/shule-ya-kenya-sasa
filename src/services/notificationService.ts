
import { supabase } from "@/integrations/supabase/client";

export interface YearTransitionNotification {
  id: string;
  schoolId: string;
  academicYearId: string;
  notificationType: 'term_transition' | 'year_end' | 'year_start';
  message: string;
  isRead: boolean;
  createdForUserId?: string;
  createdAt: string;
  scheduledFor?: string;
}

// Get all notifications for a school
export const getNotifications = async (schoolId: string) => {
  const { data, error } = await supabase
    .from("year_transition_notifications")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
    
  if (error) throw error;
  
  return data.map(mapNotification);
};

// Get unread notifications for a school
export const getUnreadNotifications = async (schoolId: string) => {
  const { data, error } = await supabase
    .from("year_transition_notifications")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_read", false)
    .order("created_at", { ascending: false });
    
  if (error) throw error;
  
  return data.map(mapNotification);
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string) => {
  const { error } = await supabase
    .from("year_transition_notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
    
  if (error) throw error;
};

// Mark all notifications as read for a school
export const markAllNotificationsAsRead = async (schoolId: string) => {
  const { error } = await supabase
    .from("year_transition_notifications")
    .update({ is_read: true })
    .eq("school_id", schoolId)
    .eq("is_read", false);
    
  if (error) throw error;
};

// Create a new notification
export const createNotification = async (notification: {
  schoolId: string;
  academicYearId: string;
  notificationType: 'term_transition' | 'year_end' | 'year_start';
  message: string;
  createdForUserId?: string;
  scheduledFor?: string;
}) => {
  const { data, error } = await supabase
    .from("year_transition_notifications")
    .insert({
      school_id: notification.schoolId,
      academic_year_id: notification.academicYearId,
      notification_type: notification.notificationType,
      message: notification.message,
      created_for_user_id: notification.createdForUserId,
      scheduled_for: notification.scheduledFor
    })
    .select()
    .single();
    
  if (error) throw error;
  return mapNotification(data);
};

function mapNotification(notification: any): YearTransitionNotification {
  return {
    id: notification.id,
    schoolId: notification.school_id,
    academicYearId: notification.academic_year_id,
    notificationType: notification.notification_type,
    message: notification.message,
    isRead: notification.is_read,
    createdForUserId: notification.created_for_user_id,
    createdAt: notification.created_at,
    scheduledFor: notification.scheduled_for
  };
}
