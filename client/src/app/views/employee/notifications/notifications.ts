import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppNotification } from '../../../models/notification.model';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
})
export class Notifications implements OnInit {
  notifications: AppNotification[] = [];
  loading = false;
  errorMessage = '';

  constructor(public notificationService: NotificationService) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading = true;
    this.errorMessage = '';

    try {
      this.notifications = this.notificationService
        .getNotificationList()
        .filter(
          (item: AppNotification) =>
            (item.audience === 'Employee' || item.audience === 'All') &&
            item.status === 'Sent'
        )
        .sort(
          (a: AppNotification, b: AppNotification) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      this.loading = false;
    } catch {
      this.loading = false;
      this.errorMessage = 'Failed to load notifications.';
    }
  }

  getBadgeClass(type: string): string {
    switch (type) {
      case 'Urgent Update':
        return 'badge-urgent';
      case 'Reminder':
        return 'badge-reminder';
      case 'Registration':
        return 'badge-registration';
      case 'Cancellation':
        return 'badge-cancellation';
      default:
        return 'badge-broadcast';
    }
  }
}