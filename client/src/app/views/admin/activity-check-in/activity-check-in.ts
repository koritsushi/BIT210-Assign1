import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Activity } from '../../../models/activity.model';
import { User } from '../../../models/user.model';

type CheckInStatus = 'Absent' | 'Attended';

interface CheckInRecord {
  id: string;
  name: string;
  department: string;
  checkInTime: string;
  status: CheckInStatus;
  activity: string;
}

type ApiActivity = Activity & {
  ngo_name?: string;
  location?: string;
  description?: string;
};

type ApiRegistration = {
  _id?: string;
  user_id: string;
  activity_id: string;
  registered_at: Date | string;
  updated_at: Date | string;
  status: 'Registered' | 'Cancelled' | 'Attended';
};

type ApiNgo = {
  _id?: string;
  name: string;
  description: string;
  location: string;
  service_type: string;
  is_active: boolean;
};

const API_URL = 'http://localhost:3000';
const DELETED_ACTIVITY_IDS_KEY = 'adminDeletedActivityIds';

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
    private httpClient: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
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
    if (!this.totalEmployees) return 0;
    return Math.round((this.attendedCount / this.totalEmployees) * 100);
  }

  get qrCodeNumber(): string {
    if (!this.generatedActivityName) return '-';
    return this.activityQrIndexMap[this.generatedActivityName] ?? '-';
  }

  get qrImageUrl(): string {
    const indexText = this.qrCodeNumber;
    const numericId = Number(indexText);
    if (!Number.isInteger(numericId) || numericId < 1 || numericId > 10) return '';
    return `/qrcodes/${numericId}.png`;
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
        record.checkInTime = this.formatDateTime(new Date());
      }
    }
  }

  private loadCheckInData(): void {
    forkJoin({
      activities: this.httpClient.get<ApiActivity[]>(`${API_URL}/activity`),
      registrations: this.httpClient.get<ApiRegistration[]>(`${API_URL}/registration`),
      users: this.httpClient.get<User[]>(`${API_URL}/users`),
      ngos: this.httpClient.get<ApiNgo[]>(`${API_URL}/ngo`),
    }).subscribe({
      next: ({ activities, registrations, users, ngos }) => {
        const deletedIds = this.getDeletedActivityIds();
        const visibleActivities = activities.filter(
          (activity) => !deletedIds.includes(String(activity._id ?? '')),
        );
        const visibleRegistrations = registrations.filter(
          (registration) => !deletedIds.includes(String(registration.activity_id ?? '')),
        );
        this.applyActivityOptions(visibleActivities, ngos);
        this.buildCheckInRecords(visibleActivities, visibleRegistrations, users);
        this.cdr.detectChanges();
      },
      error: () => {
        this.activityOptions = [];
        this.records = [];
        this.cdr.detectChanges();
      },
    });
  }

  private applyActivityOptions(activities: ApiActivity[], ngos: ApiNgo[]): void {
    for (const key of Object.keys(this.activityIdMap)) delete this.activityIdMap[key];
    for (const key of Object.keys(this.activityQrIndexMap)) delete this.activityQrIndexMap[key];
    for (const key of Object.keys(this.activityMeta)) delete this.activityMeta[key];

    this.activityOptions = activities.map((activity) => this.toActivityName(activity, ngos));

    activities.forEach((activity, index) => {
      const name = this.toActivityName(activity, ngos);
      const id = String(activity._id ?? '').trim();
      if (name && id) this.activityIdMap[name] = id;
      if (name) this.activityQrIndexMap[name] = String(index + 1);
      if (name) {
        this.activityMeta[name] = {
          date: this.formatActivityDate(activity),
          location: this.resolveActivityLocation(activity, ngos),
        };
      }
    });

    if (!this.selectedActivity || !this.activityOptions.includes(this.selectedActivity)) {
      this.selectedActivity = this.activityOptions[0] ?? '';
    }
  }

  private buildCheckInRecords(
    activities: ApiActivity[],
    registrations: ApiRegistration[],
    users: User[],
  ): void {
    const activityMap = new Map<string, ApiActivity>();
    activities.forEach((activity) => activityMap.set(String(activity._id ?? ''), activity));

    const userMap = new Map<string, User>();
    users.forEach((user) => userMap.set(String(user._id ?? ''), user));

    this.records = registrations
      .filter((registration) => registration.status !== 'Cancelled')
      .map((registration) => {
        const activity = activityMap.get(String(registration.activity_id ?? ''));
        const user = userMap.get(String(registration.user_id ?? ''));
        if (!activity || !user) return null;

        const recordId = String(registration._id ?? `${registration.activity_id}-${registration.user_id}`);
        const currentStatus = this.checkInStatusMap[recordId]
          ?? (registration.status === 'Attended' ? 'Attended' : 'Absent');
        this.checkInStatusMap[recordId] = currentStatus;

        return {
          id: recordId,
          name: user.name,
          department: user.department,
          checkInTime: this.formatDateTime(registration.updated_at || registration.registered_at),
          status: currentStatus,
          activity: this.activityOptions.find((name) => this.activityIdMap[name] === String(activity._id ?? '')) ?? 'Activity',
        } satisfies CheckInRecord;
      })
      .filter((record): record is CheckInRecord => !!record);
  }

  private toActivityName(activity: ApiActivity, ngos: ApiNgo[]): string {
    const activityName = String(activity.name ?? '').trim();
    if (activityName) return activityName;

    const ngoName = String(activity.ngo_name ?? '').trim();
    if (ngoName) return ngoName;

    const ngo = ngos.find((item) => String(item._id ?? '') === String(activity.ngo_id ?? ''));
    if (ngo?.name) return ngo.name;

    return `Activity ${String(activity._id ?? '').slice(-4)}`;
  }

  private resolveActivityLocation(activity: ApiActivity, ngos: ApiNgo[]): string {
    const location = String(activity.location ?? '').trim();
    if (location) return location;

    const ngo = ngos.find((item) => String(item._id ?? '') === String(activity.ngo_id ?? ''));
    return ngo?.location ?? 'N/A';
  }

  private formatActivityDate(activity: ApiActivity): string {
    const rawDate = String(activity.date ?? '').split('T')[0] ?? '';
    if (!rawDate) return 'N/A';
    return rawDate;
  }

  private formatDateTime(value: string | Date): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value ?? '');

    const date = parsed.toISOString().slice(0, 10);
    const time = parsed.toTimeString().slice(0, 5);
    return `${date} ${time}`;
  }

  private getDeletedActivityIds(): string[] {
    const text = sessionStorage.getItem(DELETED_ACTIVITY_IDS_KEY) ?? '[]';
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }
}
