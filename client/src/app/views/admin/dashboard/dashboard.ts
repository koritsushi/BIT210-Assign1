import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Activity } from '../../../models/activity.model';
import { ActivityService } from '../../../services/activity.service';

type ActivityStatus = 'Open' | 'Full' | 'Closed';

interface DashboardActivity {
  id: string;
  ngoId: string;
  qrCode: string;
  activityName: string;
  description: string;
  whenDate: string;
  startTime: string;
  endTime: string;
  location: string;
  offered: number;
  taken: number;
  cutoff: string;
  status: ActivityStatus;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  showForm = false;
  isEditing = false;
  editingId: string | null = null;
  editingTaken = 0;
  editingStatus: ActivityStatus = 'Open';
  editingNgoId = 'NGO-1';
  editingQrCode = '';
  form: FormGroup;
  activities: DashboardActivity[] = [];

  constructor(
    private fb: FormBuilder,
    private activityService: ActivityService,
  ) {
    this.form = this.fb.group({
      id: [{ value: '', disabled: true }],
      activityName: ['', Validators.required],
      location: ['', Validators.required],
      whenDate: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      offered: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
      description: [''],
      cutoff: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadActivities();
  }

  openCreateForm(): void {
    this.showForm = true;
    this.isEditing = false;
    this.editingId = null;
    this.editingTaken = 0;
    this.editingStatus = 'Open';
    this.editingNgoId = 'NGO-1';
    this.editingQrCode = '';
    this.form.reset({
      id: '',
      activityName: '',
      location: '',
      whenDate: '',
      startTime: '',
      endTime: '',
      offered: 1,
      description: '',
      cutoff: '',
    });
  }

  closeForm(): void {
    this.showForm = false;
  }

  submit(): void {
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const payload = this.toApiActivity(raw);

    if (this.isEditing && this.editingId) {
      this.activityService.updateActivity(this.editingId, payload).subscribe({
        next: () => {
          this.loadActivities();
          this.closeForm();
        },
        error: () => alert('Update activity failed'),
      });
    } else {
      this.activityService.createActivity(payload).subscribe({
        next: () => {
          this.loadActivities();
          this.closeForm();
        },
        error: () => alert('Create activity failed'),
      });
    }
  }

  edit(activity: DashboardActivity): void {
    this.showForm = true;
    this.isEditing = true;
    this.editingId = activity.id;
    this.editingTaken = activity.taken;
    this.editingStatus = activity.status;
    this.editingNgoId = activity.ngoId;
    this.editingQrCode = activity.qrCode;
    this.form.reset({
      id: activity.id,
      activityName: activity.activityName,
      location: activity.location,
      whenDate: activity.whenDate,
      startTime: activity.startTime,
      endTime: activity.endTime,
      offered: activity.offered,
      description: activity.description,
      cutoff: activity.cutoff,
    });
  }

  remove(id: string): void {
    this.activityService.deleteActivity(id).subscribe({
      next: () => {
        this.loadActivities();
        if (this.editingId === id) this.closeForm();
      },
      error: () => alert('Delete activity failed'),
    });
  }

  displayWhen(a: DashboardActivity): string {
    return `${a.whenDate} ${a.startTime}-${a.endTime}`;
  }

  cutoffParts(cutoff: string): { date: string; time: string } {
    const [date, time = ''] = cutoff.split('T');
    return { date, time };
  }

  private loadActivities(): void {
    this.activityService.getActivities().subscribe({
      next: (activities) => {
        this.activities = activities.map((a) => this.fromApiActivity(a));
      },
      error: () => {
        this.activities = [];
        alert('Load activities failed');
      },
    });
  }

  private fromApiActivity(activity: Activity): DashboardActivity {
    const idText = String(activity._id ?? '');
    return {
      id: idText,
      ngoId: String(activity.ngo_id ?? '507f1f77bcf86cd799439011'),
      qrCode: activity.qr_code ?? '',
      activityName: this.resolveActivityName(activity, idText),
      description: activity.description ?? '-',
      whenDate: this.toDateOnly(activity.date),
      startTime: this.formatTime(activity.start_time, activity.date),
      endTime: this.formatTime(activity.end_time, activity.date),
      location: activity.location ?? '-',
      offered: Number(activity.max_slots ?? 0),
      taken: Number(activity.slots_taken ?? 0),
      cutoff: this.toDateTimeLocal(activity.cutoff_datetime),
      status: activity.status ?? 'Open',
    };
  }

  private toApiActivity(raw: any): Activity {
    const baseDate = raw.whenDate || new Date().toISOString().slice(0, 10);
    const id = this.isEditing && this.editingId ? this.editingId : this.generateId();
    const offered = Math.min(10, Math.max(1, Number(raw.offered ?? 1)));
    const taken = Math.min(this.isEditing ? this.editingTaken : 0, offered);
    const status: ActivityStatus = this.editingStatus === 'Closed'
      ? 'Closed'
      : (taken >= offered ? 'Full' : 'Open');
    return {
      _id: id,
      ngo_id: this.editingNgoId || '507f1f77bcf86cd799439011',
      ngo_name: raw.activityName,
      location: raw.location,
      description: raw.description ?? '',
      date: baseDate,
      start_time: this.toTimestamp(baseDate, raw.startTime),
      end_time: this.toTimestamp(baseDate, raw.endTime),
      max_slots: offered,
      slots_taken: taken,
      cutoff_datetime: raw.cutoff,
      status,
      qr_code: this.editingQrCode || '',
    };
  }

  private toDateOnly(value: string | Date): string {
    const text = String(value ?? '');
    return text.includes('T') ? text.split('T')[0] : text;
  }

  private toDateTimeLocal(value: string | Date): string {
    const text = String(value ?? '');
    if (!text) return '';
    if (text.includes('T')) return text.slice(0, 16);
    return text;
  }

  private formatTime(value: number | string, date: string | Date): string {
    if (typeof value === 'number') {
      return new Date(value).toTimeString().slice(0, 5);
    }
    const text = String(value ?? '');
    if (!text) return '';
    if (/^\d{1,2}:\d{2}$/.test(text)) return text;
    const maybeNumber = Number(text);
    if (!Number.isNaN(maybeNumber) && text.length >= 10) {
      return new Date(maybeNumber).toTimeString().slice(0, 5);
    }
    return text;
  }

  private toTimestamp(dateText: string, timeText: string): number {
    const time = (timeText || '00:00').padStart(5, '0');
    return new Date(`${dateText}T${time}:00`).getTime();
  }

  private resolveActivityName(activity: Activity, idText: string): string {
    const ngoName = String(activity.ngo_name ?? '').trim();
    if (ngoName) return ngoName;

    const ngoId = String(activity.ngo_id ?? '');
    const ngoNameById: Record<string, string> = {
      '507f1f77bcf86cd799439011': 'Beach Cleaning',
      '507f1f77bcf86cd799439012': 'Food Bank Packing',
    };

    return ngoNameById[ngoId] ?? (idText ? `Activity ${idText.slice(-4)}` : 'Activity');
  }

  private generateId(): string {
    return Date.now().toString();
  }
}
