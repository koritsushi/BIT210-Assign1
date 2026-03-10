import { Injectable, signal } from '@angular/core';

export type NotificationType =
  | 'Reminder'
  | 'Update'
  | 'Cancellation'
  | 'General'
  | 'Registration';

export interface AppNotification {
  id: number;
  message: string;
  type: NotificationType;
  sentAt: string;
  activityId?: string | number;
  activityName?: string;
  targetRole?: 'Admin' | 'Employee' | 'All';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private storageKey = 'bit210_notifications';
  private nextIdKey = 'bit210_notifications_next_id';

  private getDefaultNotifications(): AppNotification[] {
    return [
      {
        id: 1,
        message: 'Welcome to Service Day',
        type: 'General',
        sentAt: new Date().toLocaleString(),
        targetRole: 'All'
      }
    ];
  }

  private loadNotifications(): AppNotification[] {
    if (typeof window === 'undefined') {
      return this.getDefaultNotifications();
    }

    const raw = localStorage.getItem(this.storageKey);

    if (!raw) {
      const initialData = this.getDefaultNotifications();
      localStorage.setItem(this.storageKey, JSON.stringify(initialData));
      localStorage.setItem(this.nextIdKey, '2');
      return initialData;
    }

    try {
      return JSON.parse(raw) as AppNotification[];
    } catch {
      return this.getDefaultNotifications();
    }
  }

  private loadNextId(): number {
    if (typeof window === 'undefined') {
      return 2;
    }

    const raw = localStorage.getItem(this.nextIdKey);
    return raw ? Number(raw) : 2;
  }

  private saveNotifications(data: AppNotification[]) {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  private saveNextId(value: number) {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(this.nextIdKey, String(value));
  }

  private nextId = this.loadNextId();

  notifications = signal<AppNotification[]>(this.loadNotifications());

  addNotification(
    message: string,
    type: NotificationType = 'Reminder',
    activityId?: string | number,
    activityName?: string,
    targetRole: 'Admin' | 'Employee' | 'All' = 'Employee'
  ) {
    const newNotification: AppNotification = {
      id: this.nextId++,
      message,
      type,
      sentAt: new Date().toLocaleString(),
      activityId,
      activityName,
      targetRole
    };

    this.notifications.update(current => {
      const updated = [newNotification, ...current];
      this.saveNotifications(updated);
      return updated;
    });

    this.saveNextId(this.nextId);
  }

  getNotifications() {
    return this.notifications;
  }

  getNotificationsByRole(role: 'Admin' | 'Employee') {
    return this.notifications().filter(
      n => n.targetRole === role || n.targetRole === 'All'
    );
  }

  scheduleReminder(
    activityName: string,
    intervalLabel: string,
    activityId?: string | number
  ) {
    this.addNotification(
      `Reminder scheduled: ${activityName} (${intervalLabel} before activity).`,
      'Reminder',
      activityId,
      activityName,
      'Admin'
    );

    this.addNotification(
      `Reminder: ${activityName} is coming up in ${intervalLabel}.`,
      'Reminder',
      activityId,
      activityName,
      'Employee'
    );
  }

  sendRegistrationNotification(
    activityName: string,
    activityId?: string | number
  ) {
    this.addNotification(
      `You have successfully registered for ${activityName}.`,
      'Registration',
      activityId,
      activityName,
      'Employee'
    );
  }

  sendCancellationNotification(
    activityName: string,
    activityId?: string | number
  ) {
    this.addNotification(
      `Your registration for ${activityName} has been cancelled.`,
      'Cancellation',
      activityId,
      activityName,
      'Employee'
    );
  }

  sendUpdateNotification(
    activityName: string,
    activityId?: string | number
  ) {
    this.addNotification(
      `The activity details for ${activityName} have been updated.`,
      'Update',
      activityId,
      activityName,
      'Employee'
    );
  }

  clearAllNotifications() {
    const initialData = this.getDefaultNotifications();
    this.notifications.set(initialData);
    this.nextId = 2;
    this.saveNotifications(initialData);
    this.saveNextId(this.nextId);
  }
}