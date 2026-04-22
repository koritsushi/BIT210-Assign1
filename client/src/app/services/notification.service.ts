import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Notification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
    private http = inject(HttpClient);

    // Make signal writable and expose a setter
    private _notifications$ = signal<Notification[]>([]);
    notifications$ = this._notifications$.asReadonly();

    getNotifications(): void {
        this.http.get<Notification[]>('/notification').subscribe({
            next: (data) => this._notifications$.set(data),
            error: (err) => console.error('Failed to fetch notifications:', err)
        });
    }

    // Add this method to allow optimistic updates
    setNotifications(notifications: Notification[]): void {
        this._notifications$.set(notifications);
    }

    createNotification(notification: Notification) {
        return this.http.post('/notification', notification);
    }

    updateNotification(id: string, notification: Partial<Notification>) {
        return this.http.put(`/notification/${id}`, notification);
    }

    deleteNotification(id: string) {
        return this.http.delete(`/notification/${id}`, { responseType: 'text' });
    }
}