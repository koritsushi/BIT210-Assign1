import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import QRCode from 'qrcode';
import { CheckinService } from '../../services/checkin.service';
import { Activity } from '../../models/activity.model';

@Component({
  selector: 'app-qr-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './qr-generator.html',
  styleUrl: './qr-generator.css',
})
export class QrGenerator {
  constructor(private checkinService: CheckinService) {}

  selectedActivityId = '';
  qrCode = '';
  qrImageUrl = '';

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

  async generateQR() {
    const activity = this.activities().find(
      item => String(item._id) === this.selectedActivityId
    );

    if (!activity) {
      return;
    }

    this.qrCode = this.checkinService.generateQrForActivity(
      String(activity._id),
      activity.activity_name
    );

    try {
      this.qrImageUrl = await QRCode.toDataURL(this.qrCode);
    } catch (error) {
      console.error('QR generation failed:', error);
    }
  }

  resetCheckins() {
    this.checkinService.resetCheckins();
    this.qrCode = '';
    this.qrImageUrl = '';
    this.selectedActivityId = '';
  }
}