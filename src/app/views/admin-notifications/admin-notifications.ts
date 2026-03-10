import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService, NotificationType } from '../../services/notification.service';
import { Activity } from '../../models/activity.model';

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-notifications.html',
  styleUrl: './admin-notifications.css',
})
export class AdminNotifications {
  private notificationService = inject(NotificationService);

  message = '';
  selectedType: NotificationType = 'General';
  targetRole: 'Admin' | 'Employee' | 'All' = 'Employee';

  selectedActivityId = '';
  reminderTime = '1 week';

  notifications = this.notificationService.getNotifications();

  mockActivities: Activity[] = [
    {
      _id: 'ACT001',
      activity_name: 'Beach Cleaning',
      ngo_id: 'NGO001',
      date: new Date('2026-03-20'),
      start_time: 9,
      end_time: 12,
      max_slots: 20,
      slots_taken: 15,
      cutoff_datetime: new Date('2026-03-18T18:00:00'),
      status: 'Open',
      qr_code: 'QR-BEACH-CLEANING'
    },
    {
      _id: 'ACT002',
      activity_name: 'Food Distribution',
      ngo_id: 'NGO002',
      date: new Date('2026-03-22'),
      start_time: 10,
      end_time: 13,
      max_slots: 25,
      slots_taken: 22,
      cutoff_datetime: new Date('2026-03-20T18:00:00'),
      status: 'Open',
      qr_code: 'QR-FOOD-DISTRIBUTION'
    },
    {
      _id: 'ACT003',
      activity_name: 'Tree Planting',
      ngo_id: 'NGO003',
      date: new Date('2026-03-25'),
      start_time: 8,
      end_time: 11,
      max_slots: 30,
      slots_taken: 28,
      cutoff_datetime: new Date('2026-03-23T18:00:00'),
      status: 'Open',
      qr_code: 'QR-TREE-PLANTING'
    }
  ];

  activities() {
    return this.mockActivities;
  }

  sendNotification() {
    const text = this.message.trim();

    if (!text) {
      return;
    }

    this.notificationService.addNotification(
      text,
      this.selectedType,
      undefined,
      undefined,
      this.targetRole
    );

    this.message = '';
    this.selectedType = 'General';
    this.targetRole = 'Employee';
  }

  sendReminder() {
    const activity = this.activities().find(
      item => String(item._id) === this.selectedActivityId
    );

    if (!activity) {
      return;
    }

    this.notificationService.scheduleReminder(
      activity.activity_name,
      this.reminderTime,
      activity._id
    );

    this.selectedActivityId = '';
    this.reminderTime = '1 week';
  }

  sendUrgentSlotsUpdate() {
    const activity = this.activities().find(
      item => String(item._id) === this.selectedActivityId
    );

    if (!activity) {
      return;
    }

    const remainingSlots = activity.max_slots - activity.slots_taken;

    this.notificationService.addNotification(
      `Urgent update: ${activity.activity_name} has only ${remainingSlots} slot(s) left.`,
      'Update',
      activity._id,
      activity.activity_name,
      'Employee'
    );
  }

  resetNotifications() {
    this.notificationService.clearAllNotifications();
  }

  reminderNotifications() {
    return this.notifications().filter(item => item.type === 'Reminder');
  }

  generalNotifications() {
    return this.notifications().filter(item => item.type !== 'Reminder');
  }
}