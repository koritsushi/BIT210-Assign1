import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Activity } from '../../../models/activity.model';
import { forkJoin } from 'rxjs';

type ActivityStatus = 'Open' | 'Full' | 'Closed';
type ApiActivity = Activity & {
  ngo_name?: string;
  location?: string;
  description?: string;
};
type ApiNgo = {
  _id?: string;
  name: string;
  description: string;
  location: string;
  service_type: string;
  is_active: boolean;
};
type ApiRegistration = {
  _id?: string;
  user_id: string;
  activity_id: string;
  registered_at: Date | string;
  updated_at: Date | string;
  status: 'Registered' | 'Cancelled' | 'Attended';
};
type ApiUser = {
  _id?: string;
  name: string;
  email: string;
  department: string;
  role: 'Admin' | 'Employee';
};

const DEFAULT_NGO_ID = '507f1f77bcf86cd799439011';
const API_URL = 'http://localhost:3000';

interface DashboardActivity {
  id: string;
  displayId: string;
  ngoId: string;
  qrCode: string;
  activityName: string;
  description: string;
  whenDate: string;
  startTime: string;
  endTime: string;
  location: string;
  ngoName: string;
  offered: number;
  taken: number;
  cutoff: string;
  status: ActivityStatus;
  participantCount: number;
  participantNames: string[];
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
  editingNgoId = DEFAULT_NGO_ID;
  editingQrCode = '';
  form: FormGroup;
  activities: DashboardActivity[] = [];

  constructor(
    private httpClient: HttpClient,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
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
    this.editingNgoId = DEFAULT_NGO_ID;
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      alert('Please fill all required fields using a valid date and time format.');
      return;
    }

    const raw = this.form.getRawValue();
    const payload = this.toApiActivity(raw);

    if (this.isEditing && this.editingId) {
      this.httpClient.put(`${API_URL}/activity/${this.editingId}`, payload, { responseType: 'text' }).subscribe({
        next: () => {
          this.loadActivities();
          this.closeForm();
        },
        error: () => alert('Update activity failed'),
      });
    } else {
      this.httpClient.post(`${API_URL}/activity`, payload, { responseType: 'text' }).subscribe({
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
    this.httpClient.delete(`${API_URL}/activity/${id}`, { responseType: 'text' }).subscribe({
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
    forkJoin({
      activities: this.httpClient.get<ApiActivity[]>(`${API_URL}/activity`),
      ngos: this.httpClient.get<ApiNgo[]>(`${API_URL}/ngo`),
      registrations: this.httpClient.get<ApiRegistration[]>(`${API_URL}/registration`),
      users: this.httpClient.get<ApiUser[]>(`${API_URL}/users`),
    }).subscribe({
      next: ({ activities, ngos, registrations, users }) => {
        this.activities = activities.map((activity) =>
          this.fromApiActivity(activity, ngos, registrations, users),
        );
        this.cdr.detectChanges();
      },
      error: () => {
        this.activities = [];
        this.cdr.detectChanges();
        alert('Load activities failed');
      },
    });
  }

  private fromApiActivity(
    activity: ApiActivity,
    ngos: ApiNgo[],
    registrations: ApiRegistration[],
    users: ApiUser[],
  ): DashboardActivity {
    const idText = String(activity._id ?? '');
    const ngo = ngos.find((item) => String(item._id ?? '') === String(activity.ngo_id ?? ''));
    const activityRegistrations = registrations.filter(
      (registration) =>
        String(registration.activity_id ?? '') === idText &&
        registration.status !== 'Cancelled',
    );
    const participantNames = activityRegistrations
      .map((registration) =>
        users.find((user) => String(user._id ?? '') === String(registration.user_id ?? ''))?.name ?? '',
      )
      .filter((name) => !!name);

    return {
      id: idText,
      displayId: this.toDisplayId(String(activity.ngo_id ?? '')),
      ngoId: String(activity.ngo_id ?? DEFAULT_NGO_ID),
      qrCode: activity.qr_code ?? '',
      activityName: this.resolveActivityName(activity, idText, ngo),
      description: activity.description ?? ngo?.description ?? '-',
      whenDate: this.toDateOnly(activity.date),
      startTime: this.formatTime(activity.start_time, activity.date),
      endTime: this.formatTime(activity.end_time, activity.date),
      location: activity.location ?? ngo?.location ?? '-',
      ngoName: ngo?.name ?? '-',
      offered: Number(activity.max_slots ?? 0),
      taken: Number(activity.slots_taken ?? 0),
      cutoff: this.toDateTimeLocal(activity.cutoff_datetime),
      status: activity.status ?? 'Open',
      participantCount: participantNames.length,
      participantNames,
    };
  }

  private toApiActivity(raw: any): Activity {
    const baseDate = this.normalizeDate(raw.whenDate);
    const id = this.isEditing && this.editingId ? this.editingId : this.generateId();
    const offered = Math.min(10, Math.max(1, Number(raw.offered ?? 1)));
    const taken = Math.min(this.isEditing ? this.editingTaken : 0, offered);
    const status: ActivityStatus = this.editingStatus === 'Closed'
      ? 'Closed'
      : (taken >= offered ? 'Full' : 'Open');
    return {
      _id: id,
      ngo_id: this.editingNgoId || DEFAULT_NGO_ID,
      name: raw.activityName,
      ngo_name: this.resolveNgoName(this.editingNgoId || DEFAULT_NGO_ID),
      location: raw.location,
      description: raw.description ?? '',
      date: baseDate,
      start_time: this.toTimestamp(baseDate, raw.startTime),
      end_time: this.toTimestamp(baseDate, raw.endTime),
      max_slots: offered,
      slots_taken: taken,
      cutoff_datetime: this.normalizeDateTime(raw.cutoff),
      status,
      qr_code: this.editingQrCode || '',
      participant_user_ids: [],
    } as unknown as Activity;
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

  private normalizeDate(value: string): string {
    const text = String(value ?? '').trim();
    return text.replaceAll('/', '-');
  }

  private normalizeDateTime(value: string): string {
    const text = String(value ?? '').trim().replaceAll('/', '-');
    return text.includes('T') ? text : text.replace(' ', 'T');
  }

  private resolveActivityName(activity: ApiActivity, idText: string, ngo?: ApiNgo): string {
    const activityName = String(activity.name ?? '').trim();
    if (activityName) return activityName;

    const ngoName = String(activity.ngo_name ?? '').trim();
    if (ngoName) return ngoName;

    if (ngo?.name) return ngo.name;

    const ngoId = String(activity.ngo_id ?? '');
    const ngoNameById: Record<string, string> = {
      '507f1f77bcf86cd799439011': 'Beach Cleaning',
      '507f1f77bcf86cd799439012': 'Food Bank Packing',
    };

    return ngoNameById[ngoId] ?? (idText ? `Activity ${idText.slice(-4)}` : 'Activity');
  }

  private generateId(): string {
    const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
    let random = '';
    while (random.length < 16) {
      random += Math.random().toString(16).slice(2);
    }
    return (timestamp + random.slice(0, 16)).slice(0, 24);
  }

  private resolveNgoName(ngoId: string): string {
    const ngoNameById: Record<string, string> = {
      '507f1f77bcf86cd799439011': 'Food Bank KL',
      '507f1f77bcf86cd799439012': 'Green Earth',
    };

    return ngoNameById[ngoId] ?? 'NGO Activity';
  }

  private toDisplayId(ngoId: string): string {
    const idLabelByNgoId: Record<string, string> = {
      '507f1f77bcf86cd799439011': 'NGO-1',
      '507f1f77bcf86cd799439012': 'NGO-2',
    };

    return idLabelByNgoId[String(ngoId ?? '').trim()] ?? 'NGO';
  }
}
