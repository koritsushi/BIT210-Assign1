import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckInRecord, CheckInStatus } from '../../../models/checkin.model';
import { ActivityService } from '../../../services/activity.service';
import { CheckinService } from '../../../services/checkin.service';
import { NgoService } from '../../../services/ngo.service';
import { RegistrationService } from '../../../services/registration.servicce';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-activity-check-in',
  imports: [CommonModule, FormsModule],
  templateUrl: './activity-check-in.html',
  styleUrl: './activity-check-in.css',
})
export class ActivityCheckIn implements OnInit {
  private activityService = inject(ActivityService);
  private checkinService = inject(CheckinService);
  private registrationService = inject(RegistrationService);
  private userService = inject(UserService);
  private ngoService = inject(NgoService);

  activities = this.activityService.activities$;
  registrations = this.registrationService.registrations$;
  users = this.userService.users$;
  ngos = this.ngoService.ngos$;

  selectedActivity = '';
  generatedActivityName: string | null = null;
  showReport = false;

  private readonly checkInStatusMap: Record<string, CheckInStatus> = {};
  private readonly checkInTimeMap: Record<string, string> = {};

  ngOnInit(): void {
    this.loadData();
  }

  get activityOptions(): string[] {
    return this.checkinService.getActivityOptions(this.activities(), this.ngos());
  }

  get records(): CheckInRecord[] {
    return this.checkinService.buildRecords(
      this.activities(),
      this.registrations(),
      this.users(),
      this.ngos(),
      this.checkInStatusMap,
      this.checkInTimeMap,
    );
  }

  get filteredRecords(): CheckInRecord[] {
    const currentActivity = this.selectedActivity || this.activityOptions[0] || '';
    if (!currentActivity) return this.records;
    return this.records.filter((record) => record.activity === currentActivity);
  }

  generateReport(): void {
    this.showReport = true;
  }

  generateQrCode(): void {
    this.generatedActivityName = this.selectedActivity || this.activityOptions[0] || null;
  }

  get reportActivityName(): string {
    return this.selectedActivity || this.activityOptions[0] || 'All Activities';
  }

  get reportDate(): string {
    return this.checkinService.getActivityMeta(this.reportActivityName, this.activities(), this.ngos()).date;
  }

  get reportLocation(): string {
    return this.checkinService.getActivityMeta(this.reportActivityName, this.activities(), this.ngos()).location;
  }

  get totalEmployees(): number {
    return this.filteredRecords.length;
  }

  get attendedCount(): number {
    return this.filteredRecords.filter((record) => record.status === 'Attended').length;
  }

  get absentCount(): number {
    return this.filteredRecords.filter((record) => record.status === 'Absent').length;
  }

  get attendanceRate(): number {
    if (!this.filteredRecords.length) return 0;
    return Math.round((this.attendedCount / this.filteredRecords.length) * 100);
  }

  get qrCodeNumber(): string {
    const activityName = (this.generatedActivityName ?? this.selectedActivity) || '';
    return this.checkinService.getQrCodeNumber(activityName, this.activityOptions);
  }

  get qrImageUrl(): string {
    const id = Number(this.qrCodeNumber);
    if (!Number.isInteger(id) || id < 1 || id > 10) return '';
    return `/qrcodes/${id}.png`;
  }

  get hasQrImage(): boolean {
    return this.qrImageUrl !== '';
  }

  get qrActivityName(): string {
    return (this.generatedActivityName ?? this.selectedActivity) || 'N/A';
  }

  onStatusChange(recordId: string, status: CheckInStatus): void {
    const registration = this.checkinService.findRegistration(this.registrations(), recordId);
    if (!registration?._id) return;

    const previousStatus = this.checkInStatusMap[recordId]
      ?? (registration.status === 'Attended' ? 'Attended' : 'Absent');
    const previousTime = this.checkInTimeMap[recordId];
    const nextTime = status === 'Attended'
      ? this.checkinService.formatDateTime(new Date())
      : this.checkinService.formatDateTime(registration.updated_at || registration.registered_at);

    this.checkInStatusMap[recordId] = status;
    this.checkInTimeMap[recordId] = nextTime;

    const payload = this.checkinService.createStatusUpdatePayload(registration, status);

    this.registrationService.updateRegistration(String(registration._id), payload).subscribe({
      next: () => {
        this.registrationService.getRegistrations();
      },
      error: () => {
        this.checkInStatusMap[recordId] = previousStatus;
        if (previousTime) {
          this.checkInTimeMap[recordId] = previousTime;
        } else {
          delete this.checkInTimeMap[recordId];
        }
        alert('Failed to update check-in status.');
      },
    });
  }

  private loadData(): void {
    this.activityService.getActivities();
    this.registrationService.getRegistrations();
    this.userService.getUsers();
    this.ngoService.getNgos();
  }
}
