import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import QRCode from 'qrcode';
import { CheckinService } from '../../../services/checkin.service';

@Component({
  selector: 'app-activity-check-in',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activity-check-in.html',
  styleUrl: './activity-check-in.css',
})
export class ActivityCheckIn implements OnInit {
  selectedActivity = 'Beach Cleaning';
  generatedQrValue = '';
  generatedQrImageUrl = '';

  constructor(public checkinService: CheckinService) {}

  ngOnInit(): void {
    this.selectedActivity = this.checkinService.getSelectedAdminActivity();
    this.generateActivityQr();
  }

  get checkins() {
    return this.checkinService.getCheckinsSignal()();
  }

  get summary() {
    return this.checkinService.getCheckinSummary();
  }

  get activityReport() {
    return this.checkinService.getActivityReport();
  }

  get activities() {
    return this.checkinService.getActivities();
  }

  get selectedActivitySummary() {
    return this.checkinService.getSelectedActivitySummary(this.selectedActivity);
  }

  async generateActivityQr(): Promise<void> {
    this.checkinService.setSelectedAdminActivity(this.selectedActivity);
    this.generatedQrValue = this.checkinService.getQrValueForActivity(this.selectedActivity);

    try {
      this.generatedQrImageUrl = await QRCode.toDataURL(this.generatedQrValue);
    } catch {
      this.generatedQrImageUrl = '';
    }
  }
}