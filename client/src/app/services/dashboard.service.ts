import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Activity } from '../models/activity.model';
import {
  ActivityStatus,
  ApiActivity,
  ApiNgo,
  ApiRegistration,
  ApiUser,
  DashboardActivity,
} from '../models/dashboard.model';

const DEFAULT_NGO_ID = '507f1f77bcf86cd799439011';
const API_URL = 'http://localhost:3000';
const DELETED_ACTIVITY_IDS_KEY = 'adminDeletedActivityIds';

export interface ActivityFormValue { // Form values for creating/editing an activity
  activityName: string;
  cutoff: string;
  description: string;
  endTime: string;
  id: string;
  location: string;
  offered: number;
  startTime: string;
  whenDate: string;
}

export interface ActivityFormContext { // editing state and existing values of the activity being edited
  editingId: string | null;
  editingNgoId: string;
  editingQrCode: string;
  editingStatus: ActivityStatus;
  editingTaken: number;
  isEditing: boolean;
}

export interface DashboardEditState {
  editingId: string | null;
  editingNgoId: string;
  editingQrCode: string;
  editingStatus: ActivityStatus;
  editingTaken: number;
  formValue: ActivityFormValue;
  isEditing: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  readonly activities = signal<DashboardActivity[]>([]);

  constructor(private httpClient: HttpClient) {}

  refreshActivities(): void {
    this.httpClient.get<ApiActivity[]>(`${API_URL}/activity`).subscribe({
      next: (activities) => {
        this.httpClient.get<ApiNgo[]>(`${API_URL}/ngo`).subscribe({
          next: (ngos) => {
            this.httpClient.get<ApiRegistration[]>(`${API_URL}/registration`).subscribe({
              next: (registrations) => {
                this.httpClient.get<ApiUser[]>(`${API_URL}/users`).subscribe({
                  next: (users) => {
                    const deletedIds = this.getDeletedActivityIds();
                    const visibleActivities = activities.filter(
                      (activity) => !deletedIds.includes(String(activity._id ?? '')),
                    );
                    const rows = visibleActivities.map((activity) =>
                      this.fromApiActivity(activity, ngos, registrations, users),
                    );
                    const dashboardRows = rows.map((row, index) => ({
                      ...row,
                      displayId: this.toDisplayId(index + 1),
                    }));

                    this.activities.set(dashboardRows);
                  },
                  error: () => this.activities.set([]),
                });
              },
              error: () => this.activities.set([]),
            });
          },
          error: () => this.activities.set([]),
        });
      },
      error: () => this.activities.set([]),
    });
  }

  createActivity(activity: Activity): Observable<string> {
    return this.httpClient.post(`${API_URL}/activity`, activity, { responseType: 'text' });
  }

  updateActivity(id: string, activity: Activity): Observable<string> {
    return this.httpClient.put(`${API_URL}/activity/${id}`, activity, { responseType: 'text' });
  }

  deleteActivity(id: string): Observable<string> {
    return this.httpClient.delete(`${API_URL}/activity/${id}`, { responseType: 'text' });
  }

  saveActivity(raw: ActivityFormValue, context: ActivityFormContext): Observable<string> {
    const payload = this.buildActivityPayload(raw, context);

    if (context.isEditing && context.editingId) {
      return this.updateActivity(context.editingId, payload);
    }

    return this.createActivity(payload);
  }

  applyLocalSave(raw: ActivityFormValue, context: ActivityFormContext): void {
    const payload = this.buildActivityPayload(raw, context);
    const currentRows = this.activities();

    if (context.isEditing && context.editingId) {
      const updatedRow = this.buildUpdatedRow(payload, currentRows);
      const nextRows = currentRows.map((row) => (row.id === context.editingId ? updatedRow : row));
      this.activities.set(nextRows);
      return;
    }

    const newRow = this.buildUpdatedRow(payload, currentRows);
    this.activities.set([...currentRows, newRow]);
  }

  buildActivityPayload(raw: ActivityFormValue, context: ActivityFormContext): Activity {
    const baseDate = this.normalizeDate(raw.whenDate);
    const id = context.isEditing && context.editingId ? context.editingId : this.generateId();
    const offered = Math.max(1, Number(raw.offered ?? 1));
    const taken = Math.min(context.isEditing ? context.editingTaken : 0, offered);
    const cutoff = this.normalizeDateTime(raw.cutoff);
    const status = this.resolveStatus(taken, offered, cutoff, context.editingStatus);

    return {
      _id: id,
      ngo_id: context.editingNgoId || DEFAULT_NGO_ID,
      name: raw.activityName,
      ngo_name: this.resolveNgoName(context.editingNgoId || DEFAULT_NGO_ID),
      location: raw.location,
      description: raw.description ?? '',
      date: baseDate as unknown as Date,
      start_time: this.toTimestamp(baseDate, raw.startTime),
      end_time: this.toTimestamp(baseDate, raw.endTime),
      max_slots: offered,
      slots_taken: taken,
      cutoff_datetime: cutoff as unknown as Date,
      status,
      qr_code: context.editingQrCode || '',
      participant_user_ids: [],
    } as unknown as Activity;
  }

  buildUpdatedRow(payload: Activity, currentRows: DashboardActivity[]): DashboardActivity {
    const idText = String(payload._id ?? '');
    const existingIndex = currentRows.findIndex((row) => row.id === idText);
    const displayId =
      existingIndex >= 0 ? currentRows[existingIndex].displayId : this.toDisplayId(currentRows.length + 1);

    return {
      id: idText,
      displayId,
      ngoId: String(payload.ngo_id ?? DEFAULT_NGO_ID),
      qrCode: payload.qr_code ?? '',
      activityName: String((payload as ApiActivity).name ?? '').trim() || 'Activity',
      description: String((payload as ApiActivity).description ?? '').trim() || '-',
      whenDate: this.toDateOnly(payload.date),
      startTime: this.formatTime(payload.start_time, payload.date),
      endTime: this.formatTime(payload.end_time, payload.date),
      location: String((payload as ApiActivity).location ?? '').trim() || '-',
      ngoName: this.resolveNgoName(String(payload.ngo_id ?? DEFAULT_NGO_ID)),
      offered: Number(payload.max_slots ?? 0),
      taken: Number(payload.slots_taken ?? 0),
      remaining: this.calculateRemaining(
        Number(payload.max_slots ?? 0),
        Number(payload.slots_taken ?? 0),
      ),
      cutoff: this.toDateTimeLocal(payload.cutoff_datetime),
      status: payload.status ?? 'Open',
      participantCount: 0,
      participantNames: [],
    };
  }

  removeActivity(rows: DashboardActivity[], id: string): DashboardActivity[] {
    this.saveDeletedActivityId(id);

    return rows
      .filter((activity) => activity.id !== id)
      .map((activity, index) => ({
        ...activity,
        displayId: this.toDisplayId(index + 1),
      }));
  }

  clearDeletedActivityId(id: string): void {
    const ids = this.getDeletedActivityIds().filter((item) => item !== id);
    sessionStorage.setItem(DELETED_ACTIVITY_IDS_KEY, JSON.stringify(ids));
  }

  displayWhen(activity: DashboardActivity): string {
    return `${activity.whenDate} ${activity.startTime}-${activity.endTime}`;
  }

  cutoffParts(cutoff: string): { date: string; time: string } {
    const [date, time = ''] = cutoff.split('T');
    return { date, time };
  }

  createEmptyEditState(): DashboardEditState {
    return {
      editingId: null,
      editingNgoId: DEFAULT_NGO_ID,
      editingQrCode: '',
      editingStatus: 'Open',
      editingTaken: 0,
      isEditing: false,
      formValue: {
        id: '',
        activityName: '',
        location: '',
        whenDate: '',
        startTime: '',
        endTime: '',
        offered: 1,
        description: '',
        cutoff: '',
      },
    };
  }

  createEditState(activity: DashboardActivity): DashboardEditState {
    return {
      editingId: activity.id,
      editingNgoId: activity.ngoId,
      editingQrCode: activity.qrCode,
      editingStatus: activity.status,
      editingTaken: activity.taken,
      isEditing: true,
      formValue: {
        id: activity.id,
        activityName: activity.activityName,
        location: activity.location,
        whenDate: this.normalizeDateForInput(activity.whenDate),
        startTime: this.normalizeTimeForInput(activity.startTime),
        endTime: this.normalizeTimeForInput(activity.endTime),
        offered: activity.offered,
        description: activity.description,
        cutoff: this.normalizeDateTimeForInput(activity.cutoff),
      },
    };
  }

  private fromApiActivity( // Convert API activity data to Dashboard Activity from format
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
      .map(
        (registration) =>
          users.find((user) => String(user._id ?? '') === String(registration.user_id ?? ''))?.name ?? '',
      )
      .filter((name) => !!name);

    return {
      id: idText,
      displayId: '',
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
      remaining: this.calculateRemaining(
        Number(activity.max_slots ?? 0),
        Number(activity.slots_taken ?? 0),
      ),
      cutoff: this.toDateTimeLocal(activity.cutoff_datetime),
      status: this.resolveStatus(
        Number(activity.slots_taken ?? 0),
        Number(activity.max_slots ?? 0),
        activity.cutoff_datetime,
        activity.status,
      ),
      participantCount: participantNames.length,
      participantNames,
    };
  }

  private toDateOnly(value: string | Date): string {
    const text = this.normalizeDate(String(value ?? ''));
    return text.includes('T') ? text.split('T')[0] : text;
  }

  private toDateTimeLocal(value: string | Date): string {
    const text = this.normalizeDateTime(String(value ?? ''));
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
    if (/^\d{1,2}:\d{2}$/.test(text)) return text.padStart(5, '0');
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(text)) return text.slice(0, 5).padStart(5, '0');

    const maybeNumber = Number(text);
    if (!Number.isNaN(maybeNumber) && text.length >= 10) {
      return new Date(maybeNumber).toTimeString().slice(0, 5);
    }

    return text.slice(0, 5).padStart(5, '0');
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

  private normalizeDateForInput(value: string): string {
    return String(value ?? '').trim().replaceAll('/', '-');
  }

  private normalizeDateTimeForInput(value: string): string {
    const text = String(value ?? '').trim().replaceAll('/', '-');
    if (!text) return '';
    return text.includes('T') ? text.slice(0, 16) : text.replace(' ', 'T').slice(0, 16);
  }

  private normalizeTimeForInput(value: string): string {
    const text = String(value ?? '').trim();
    if (/^\d{1,2}:\d{2}$/.test(text)) {
      return text.padStart(5, '0');
    }

    if (/^\d{1,2}:\d{2}:\d{2}$/.test(text)) {
      return text.slice(0, 5).padStart(5, '0');
    }

    return text;
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

  private toDisplayId(index: number): string {
    return `NGO-${index}`;
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

  private saveDeletedActivityId(id: string): void {
    const ids = this.getDeletedActivityIds();

    if (!ids.includes(id)) {
      ids.push(id);
      sessionStorage.setItem(DELETED_ACTIVITY_IDS_KEY, JSON.stringify(ids));
    }
  }

  private resolveStatus(
    taken: number,
    offered: number,
    cutoff: string | Date | undefined,
    fallback?: ActivityStatus,
  ): ActivityStatus {
    const cutoffTime = new Date(String(cutoff ?? '')).getTime();
    if (!Number.isNaN(cutoffTime) && cutoffTime <= Date.now()) {
      return 'Closed';
    }

    if (taken >= offered) {
      return 'Full';
    }

    return fallback === 'Closed' ? 'Closed' : 'Open';
  }

  private calculateRemaining(offered: number, taken: number): number {
    return Math.max(0, offered - taken);
  }
}
