import { CommonModule } from '@angular/common';
import { Component, OnInit, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Activity } from '../../../models/activity.model';
import { ActivityService } from '../../../services/activity.service';
import { User } from '../../../models/user.model';
import { UserService } from '../../../services/user.service';

type CheckInStatus = 'Absent' | 'Attended';

interface CheckInRecord {
  id: string;
  name: string;
  department: string;
  when: string;
  status: CheckInStatus;
  activity: string;
}

interface CheckInParticipantEntry {
  entryId: string;
  user: User;
}

type ApiActivity = Activity & {
  ngo_name?: string;
  location?: string;
  participant_user_ids?: string[];
};

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
    private activityService: ActivityService,
    private userService: UserService,
  ) {
    effect(() => {
      const activities = this.activityService.activities$() as ApiActivity[];
      const users = this.userService.users$();

      this.applyActivityOptions(activities);
      this.buildCheckInRecords(activities, users);
    });
  }

  ngOnInit(): void {
    this.records = [];
    this.loadActivitiesAndUsers();
  }

  get filteredRecords(): CheckInRecord[] {
    if (!this.selectedActivity) return this.records;
    return this.records.filter((r) => r.activity === this.selectedActivity);
  }

  generateReport(): void {
    this.showReport = true;
  }

  generateQrCode(): void {
    const activityId = this.activityIdMap[this.selectedActivity];
    if (!activityId) return;
    this.generatedActivityId = activityId;
    this.generatedActivityName = this.selectedActivity;
    alert(`QR Code\nActivity ID: ${activityId}\nGenerated successfully`);
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
    return this.filteredRecords.filter((r) => r.status === 'Attended').length;
  }

  get absentCount(): number {
    return this.filteredRecords.filter((r) => r.status === 'Absent').length;
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
    return `/qrcodes/${indexText}.png`;
  }

  get hasQrImage(): boolean {
    return this.qrImageUrl !== '';
  }

  get qrActivityName(): string {
    return this.generatedActivityName ?? this.selectedActivity;
  }

  onStatusChange(recordId: string, status: CheckInStatus): void {
    this.checkInStatusMap[recordId] = status;
  }

  private loadActivitiesAndUsers(): void {
    this.activityService.getActivities();
    this.userService.getUsers();
  }

  private applyActivityOptions(activities: ApiActivity[]): void {
    for (const key of Object.keys(this.activityIdMap)) delete this.activityIdMap[key];
    for (const key of Object.keys(this.activityQrIndexMap)) delete this.activityQrIndexMap[key];
    for (const key of Object.keys(this.activityMeta)) delete this.activityMeta[key];

    const names = activities.map((a) => this.toActivityName(a));
    this.activityOptions = [...new Set(names)];

    for (let i = 0; i < activities.length; i += 1) {
      const activity = activities[i];
      const name = this.toActivityName(activity);
      const id = String(activity._id ?? '').trim();
      if (name && id) this.activityIdMap[name] = id;
      if (name) this.activityQrIndexMap[name] = String((i % 10) + 1);
      if (name) {
        this.activityMeta[name] = {
          date: this.formatActivityDate(activity),
          location: String(activity.location ?? 'N/A'),
        };
      }
    }

    if (!this.selectedActivity || !this.activityOptions.includes(this.selectedActivity)) {
      this.selectedActivity = this.activityOptions[0] ?? '';
    }
  }

  private buildCheckInRecords(activities: ApiActivity[], users: User[]): void {
    const userMap: Record<string, User> = {};
    for (const user of users) {
      const id = String(user._id ?? '').trim();
      if (id) userMap[id] = user;
    }

    const nextRecords: CheckInRecord[] = [];
    for (const activity of activities) {
      const activityName = this.toActivityName(activity);
      const participants = this.resolveParticipants(activity, users, userMap);
      for (const participant of participants) {
        const recordId = `${activity._id}-${participant.entryId}`;
        const previousStatus = this.checkInStatusMap[recordId] ?? 'Absent';
        this.checkInStatusMap[recordId] = previousStatus;
        nextRecords.push({
          id: recordId,
          name: participant.user.name,
          department: participant.user.department,
          when: this.formatActivityWhen(activity),
          status: previousStatus,
          activity: activityName,
        });
      }
    }

    this.records = nextRecords;
  }

  private resolveParticipants(
    activity: ApiActivity,
    users: User[],
    userMap: Record<string, User>,
  ): CheckInParticipantEntry[] {
    const maxAllowed = 10;
    const targetCount = Math.min(Number(activity.slots_taken ?? 0), maxAllowed, users.length);
    if (targetCount <= 0) return [];

    const explicit = (activity.participant_user_ids ?? [])
      .map((id) => String(id))
      .filter((id, idx, arr) => arr.indexOf(id) === idx)
      .filter((id) => !!userMap[id]);

    const selectedIds: string[] = [];
    for (const id of explicit) {
      if (selectedIds.length >= targetCount) break;
      selectedIds.push(id);
    }

    if (selectedIds.length < targetCount) {
      for (const user of users) {
        const id = String(user._id ?? '');
        if (!id || selectedIds.includes(id)) continue;
        selectedIds.push(id);
        if (selectedIds.length >= targetCount) break;
      }
    }

    return selectedIds.map((id) => ({
      entryId: id,
      user: userMap[id],
    }));
  }

  private formatActivityWhen(activity: ApiActivity): string {
    const dateText = String(activity.date ?? '').split('T')[0] ?? '';
    let timeText = '';
    if (typeof activity.start_time === 'number') {
      timeText = new Date(activity.start_time).toTimeString().slice(0, 5);
    } else {
      timeText = String(activity.start_time ?? '').slice(0, 5);
    }
    return `${dateText} ${timeText}`.trim();
  }

  private formatActivityDate(activity: ApiActivity): string {
    const rawDate = String(activity.date ?? '').split('T')[0] ?? '';
    if (!rawDate) return 'N/A';

    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return rawDate;

    return parsed.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  private toActivityName(activity: ApiActivity): string {
    const activityName = String(activity.name ?? '').trim();
    if (activityName) return activityName;

    const ngoName = String(activity.ngo_name ?? '').trim();
    if (ngoName) return ngoName;

    const ngoId = String(activity.ngo_id ?? '');
    const ngoNameById: Record<string, string> = {
      '507f1f77bcf86cd799439011': 'Beach Cleaning',
      '507f1f77bcf86cd799439012': 'Food Bank Packing',
    };
    return ngoNameById[ngoId] ?? `Activity ${String(activity._id ?? '').slice(-4)}`;
  }
}
