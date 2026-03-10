import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-employee-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-notifications.html',
  styleUrl: './employee-notifications.css'
})
export class EmployeeNotifications {
  private notificationService = inject(NotificationService);

  notifications = this.notificationService.getNotifications();

  myNotifications() {
    return this.notifications().filter(
      item => item.targetRole === 'Employee' || item.targetRole === 'All'
    );
  }

  reminderNotifications() {
    return this.myNotifications().filter(item => item.type === 'Reminder');
  }

  generalNotifications() {
    return this.myNotifications().filter(item => item.type !== 'Reminder');
  }
}