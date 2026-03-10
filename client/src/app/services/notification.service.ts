import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Notification } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotiifcationService {
    notifications$ = signal<Notification[]>([]);
    notification$ = signal<Notification>({} as Notification);
    
    constructor(private httpClient: HttpClient) { }

    private refreshRegistration() {
        this.httpClient.get<Notification[]>(`/notification`)
        .subscribe(notification => {
            this.notifications$.set(notification);
        });
    }

    getNotifications() {
        this.refreshRegistration();
        return this.notifications$();
    }

    getRegistration(id: string) {
        this.httpClient.get<Notification>(`/notification/${id}`).subscribe(notification => {
        this.notification$.set(notification);
        return this.notifications$();
        });
    }

    createRegistration(notification: Notification) {
        return this.httpClient.post(`/registration`, notification, { responseType: 'text' });
    }

    updateRegistration(id: string, notification: Notification) {
        return this.httpClient.put(`/registration/${id}`, notification, { responseType: 'text' });
    }

    deleteRegistration(id: string) {
        return this.httpClient.delete(`/notification/${id}`, { responseType: 'text' });
    }
}