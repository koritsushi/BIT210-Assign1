import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Notification } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
    notifications$ = signal<Notification[]>([]);
    notification$ = signal<Notification>({} as Notification);
    
    constructor(private httpClient: HttpClient) { }

    private refreshNotification() {
        this.httpClient.get<Notification[]>(`/notification`)
        .subscribe(notification => {
            this.notifications$.set(notification);
        });
    }

    getNotifications() {
        this.refreshNotification();
        return this.notifications$();
    }

    getNotification(id: string) {
        this.httpClient.get<Notification>(`/notification/${id}`).subscribe(notification => {
        this.notification$.set(notification);
        return this.notifications$();
        });
    }

    createNotification(notification: Notification) {
        return this.httpClient.post(`/registration`, notification, { responseType: 'text' });
    }

    updateNotification(id: string, notification: Notification) {
        return this.httpClient.put(`/registration/${id}`, notification, { responseType: 'text' });
    }

    deleteNotification(id: string) {
        return this.httpClient.delete(`/notification/${id}`, { responseType: 'text' });
    }
}