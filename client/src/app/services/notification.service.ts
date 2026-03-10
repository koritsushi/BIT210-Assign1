import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AppNotification } from '../models/notification.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notifications = signal<AppNotification[]>([
    {
      id: 1,
      title: 'Registration Successful',
      message: 'Your Service Day registration has been recorded successfully.',
      type: 'Registration',
      audience: 'Employee',
      relatedActivity: 'Beach Cleaning',
      schedule: 'Immediate',
      createdAt: new Date().toLocaleString(),
      status: 'Sent',
    },
    {
      id: 2,
      title: 'Service Day Reminder',
      message: 'Please arrive 15 minutes early for your assigned activity.',
      type: 'Reminder',
      audience: 'Employee',
      relatedActivity: 'Tree Planting',
      schedule: '1 day before',
      createdAt: new Date().toLocaleString(),
      status: 'Scheduled',
    },
  ]);

  getNotificationsSignal() {
    return this.notifications;
  }

  getNotificationList(): AppNotification[] {
    return this.notifications();
  }

  getAllNotifications(): Observable<AppNotification[]> {
    return of(this.notifications());
  }

  addNotification(
    payload: Omit<AppNotification, 'id' | 'createdAt'>
  ): Observable<AppNotification> {
    const current = this.notifications();

    const newNotification: AppNotification = {
      id: current.length > 0 ? Math.max(...current.map((item) => item.id)) + 1 : 1,
      createdAt: new Date().toLocaleString(),
      ...payload,
    };

    this.notifications.set([newNotification, ...current]);
    return of(newNotification);
  }

  sendScheduledNotification(id: number): Observable<AppNotification | null> {
    const current = this.notifications();
    const target = current.find((item) => item.id === id);

    if (!target) {
      return of(null);
    }

    const updatedNotification: AppNotification = {
      ...target,
      status: 'Sent',
      createdAt: new Date().toLocaleString(),
    };

    const updatedList = current.map((item) =>
      item.id === id ? updatedNotification : item
    );

    this.notifications.set(updatedList);
    return of(updatedNotification);
  }

  getNotificationCounts() {
    const list = this.notifications();

    return {
      total: list.length,
      broadcast: list.filter((n) => n.type === 'Broadcast').length,
      reminders: list.filter((n) => n.type === 'Reminder').length,
      urgent: list.filter((n) => n.type === 'Urgent Update').length,
    };
  }
}