import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CheckInRecord,
  CheckInStatus,
} from '../../../models/activity-check-in.model';
import { ActivityCheckInService } from '../../../services/activity-check-in.service';

@Component({
  selector: 'app-activity-check-in',
  imports: [CommonModule, FormsModule],
  templateUrl: './activity-check-in.html',
  styleUrl: './activity-check-in.css',
})
export class ActivityCheckIn implements OnInit {
  selectedActivity = '';
  generatedActivityId: string | null = null;
  generatedActivityName: string | null = null;

  activityOptions: string[] = [];
  records: CheckInRecord[] = [];
  showReport = false;

  private readonly activityMeta: Record<string, { date: string; location: string }> = {};
  private readonly activityIdMap: Record<string, string> = {};
  private readonly activityQrIndexMap: Record<string, string> = {};
  private readonly checkInStatusMap: Record<string, CheckInStatus> = {};

  constructor(
    private activityCheckInService: ActivityCheckInService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.activityCheckInService.viewData$.subscribe((data) => {
      if (!data) {
        this.activityOptions = [];
        this.records = [];
        this.cdr.detectChanges();
        return;
      }

      this.syncLookupMap(this.activityIdMap, data.activityIdMap);
      this.syncLookupMap(this.activityQrIndexMap, data.activityQrIndexMap);
      this.syncLookupMap(this.activityMeta, data.activityMeta);
      this.activityOptions = data.activityOptions;
      this.records = data.records;
      if (!this.selectedActivity || !this.activityOptions.includes(this.selectedActivity)) {
        this.selectedActivity = this.activityOptions[0] ?? '';
      }
      this.cdr.detectChanges();
    });
    this.loadCheckInData();
  }

  get filteredRecords(): CheckInRecord[] {
    if (!this.selectedActivity) return this.records;
    return this.records.filter((record) => record.activity === this.selectedActivity);
  }

  generateReport(): void {
    this.showReport = true;
  }

  generateQrCode(): void {
    const activityId = this.activityIdMap[this.selectedActivity];
    if (!activityId) return;
    this.generatedActivityId = this.activityQrIndexMap[this.selectedActivity] ?? null;
    this.generatedActivityName = this.selectedActivity;
  }

  get reportActivityName(): string {
    return this.selectedActivity || 'All Activities';
  }

  get reportDate(): string {
    return this.activityMeta[this.reportActivityName]?.date ?? 'N/A';
  }

  get reportLocation(): string {
    return this.activityMeta[this.reportActivityName]?.location ?? 'N/A';
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
    if (!this.generatedActivityName) return '-';
    return this.activityQrIndexMap[this.generatedActivityName] ?? '-';
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
    return this.generatedActivityName ?? this.selectedActivity;
  }

  onStatusChange(recordId: string, status: CheckInStatus): void {
    this.checkInStatusMap[recordId] = status;
    const record = this.records.find((item) => item.id === recordId);
    if (record) {
      record.status = status;
      if (status === 'Attended') {
        record.checkInTime = this.activityCheckInService.formatDateTime(new Date());
      }
    }
  }

  private loadCheckInData(): void {
    this.activityCheckInService.loadCheckInData(this.selectedActivity, this.checkInStatusMap);
  }

  private syncLookupMap<T>(target: Record<string, T>, source: Record<string, T>): void {
    for (const key of Object.keys(target)) delete target[key];
    Object.assign(target, source);
  }
}
