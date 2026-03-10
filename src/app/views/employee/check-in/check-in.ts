import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CheckinService } from '../../../services/checkin.service';
import { NotificationService } from '../../../services/notification.service';
import { Activity } from '../../../models/activity.model';

@Component({
  selector: 'app-check-in',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './check-in.html',
  styleUrl: './check-in.css',
})
export class CheckIn {
  private checkinService = inject(CheckinService);
  private notificationService = inject(NotificationService);

  qrInput = '';
  message = '';
  employeeName = 'Bin Hangyu';
  selectedActivityId = '';

  checkins = this.checkinService.getCheckins();

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

  submitCheckIn() {
    const activity = this.activities().find(
      item => String(item._id) === this.selectedActivityId
    );

    if (!activity) {
      this.message = 'Please select an activity.';
      return;
    }

    const result = this.checkinService.checkIn(
      String(activity._id),
      this.employeeName,
      this.qrInput
    );

    this.message = result.message;

    if (result.success) {
      this.notificationService.addNotification(
        `You have checked in successfully for ${activity.activity_name}.`,
        'Update',
        activity._id,
        activity.activity_name,
        'Employee'
      );
    }
  }

  myCheckins() {
    return this.checkins().filter(
      item => item.employee_name.toLowerCase() === this.employeeName.toLowerCase()
    );
  }
}