export type NotificationType =
  | 'Broadcast'
  | 'Reminder'
  | 'Urgent Update'
  | 'Registration'
  | 'Cancellation';

export type NotificationAudience = 'Employee' | 'NGO' | 'All';

export type NotificationStatus = 'Sent' | 'Scheduled';

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  audience: NotificationAudience;
  relatedActivity: string;
  schedule: string;
  createdAt: string;
  status: NotificationStatus;
}