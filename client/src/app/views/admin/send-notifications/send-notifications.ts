import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppNotification } from '../../../models/notification.model';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-send-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './send-notifications.html',
  styleUrl: './send-notifications.css',
})
export class SendNotifications implements OnInit {
  notifications: AppNotification[] = [];

  broadcastTitle = '';
  broadcastMessage = '';
  broadcastAudience: 'Employee' | 'NGO' | 'All' = 'Employee';
  broadcastActivity = 'General Announcement';

  reminderTitle = 'Service Day Reminder';
  reminderMessage = 'Please remember to attend your assigned activity on time.';
  reminderAudience: 'Employee' | 'NGO' | 'All' = 'Employee';
  reminderActivity = 'Beach Cleaning';
  reminderSchedule = '1 day before';

  loading = false;
  feedbackMessage = '';
  feedbackType: 'success' | 'error' = 'success';

  constructor(public notificationService: NotificationService) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading = true;

    try {
      this.notifications = this.notificationService
        .getNotificationList()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      this.loading = false;
    } catch {
      this.loading = false;
      this.showFeedback('Failed to load notifications.', 'error');
    }
  }

  showFeedback(message: string, type: 'success' | 'error'): void {
    this.feedbackMessage = message;
    this.feedbackType = type;

    setTimeout(() => {
      this.feedbackMessage = '';
    }, 3000);
  }

  clearBroadcastForm(): void {
    this.broadcastTitle = '';
    this.broadcastMessage = '';
    this.broadcastAudience = 'Employee';
    this.broadcastActivity = 'General Announcement';
  }

  sendBroadcast(): void {
    if (!this.broadcastTitle.trim() || !this.broadcastMessage.trim()) {
      this.showFeedback('Please complete all broadcast fields.', 'error');
      return;
    }

    this.loading = true;

    this.notificationService
      .addNotification({
        title: this.broadcastTitle.trim(),
        message: this.broadcastMessage.trim(),
        type: 'Broadcast',
        audience: this.broadcastAudience,
        relatedActivity: this.broadcastActivity,
        schedule: 'Immediate',
        status: 'Sent',
      })
      .subscribe({
        next: () => {
          this.loadNotifications();
          this.loading = false;
          this.showFeedback('Broadcast message sent successfully.', 'success');
          this.clearBroadcastForm();
        },
        error: () => {
          this.loading = false;
          this.showFeedback('Unable to send broadcast message.', 'error');
        },
      });
  }

  scheduleReminder(): void {
    if (!this.reminderTitle.trim() || !this.reminderMessage.trim()) {
      this.showFeedback('Please complete all reminder fields.', 'error');
      return;
    }

    this.loading = true;

    this.notificationService
      .addNotification({
        title: this.reminderTitle.trim(),
        message: this.reminderMessage.trim(),
        type: 'Reminder',
        audience: this.reminderAudience,
        relatedActivity: this.reminderActivity,
        schedule: this.reminderSchedule,
        status: 'Scheduled',
      })
      .subscribe({
        next: () => {
          this.loadNotifications();
          this.loading = false;
          this.showFeedback('Reminder scheduled successfully.', 'success');
        },
        error: () => {
          this.loading = false;
          this.showFeedback('Unable to schedule reminder.', 'error');
        },
      });
  }

  sendUrgentSlotsAlert(): void {
    this.loading = true;

    this.notificationService
      .addNotification({
        title: 'Last Available Slots',
        message:
          'Urgent update: only a few volunteer slots are remaining. Please register as soon as possible.',
        type: 'Urgent Update',
        audience: 'Employee',
        relatedActivity: 'Food Distribution',
        schedule: 'Immediate',
        status: 'Sent',
      })
      .subscribe({
        next: () => {
          this.loadNotifications();
          this.loading = false;
          this.showFeedback('Urgent slot alert sent successfully.', 'success');
        },
        error: () => {
          this.loading = false;
          this.showFeedback('Unable to send urgent slot alert.', 'error');
        },
      });
  }

  sendNow(item: AppNotification): void {
    if (item.status !== 'Scheduled') {
      return;
    }

    this.loading = true;

    this.notificationService.sendScheduledNotification(item.id).subscribe({
      next: (result) => {
        this.loading = false;

        if (!result) {
          this.showFeedback('Reminder not found.', 'error');
          return;
        }

        this.loadNotifications();
        this.showFeedback('Scheduled reminder has been sent.', 'success');
      },
      error: () => {
        this.loading = false;
        this.showFeedback('Unable to send scheduled reminder.', 'error');
      },
    });
  }

  get counts() {
    return this.notificationService.getNotificationCounts();
  }
}