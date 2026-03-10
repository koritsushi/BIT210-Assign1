import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-notification',
  imports: [CommonModule],
  templateUrl: './notification.html',
  styleUrl: './notification.css',
})
export class Notification {
    // --- Local state ---
    notifications: string[] = [];
    notificationsCollapsed = false;

    clearNotifications() {
        this.notifications = [];
    }

    toggleNotifications() {
        this.notificationsCollapsed = !this.notificationsCollapsed;
    }

}
