import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Activity } from '../../../models/activity.model';
import { Ngo } from '../../../models/ngo.model';
import { ActivityService } from '../../../services/activity.service';
import { NgoService } from '../../../services/ngo.service';
import { RegistrationService } from '../../../services/registration.servicce';
import { ActivityFormComponent } from './activity-form/activity-form';

const DEFAULT_NGO_ID = '507f1f77bcf86cd799439011';

export interface ActivityFormValue {
  activityName: string;
  ngoName: string;
  cutoff: string;
  description: string;
  endTime: string;
  id: string;
  location: string;
  offered: number;
  startTime: string;
  whenDate: string;
}

export interface ActivityFormContext {
  editingId: string | null;
  editingNgoId: string;
  editingQrCode: string;
  editingTaken: number;
  isEditing: boolean;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, ActivityFormComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private activityService = inject(ActivityService);
  private ngoService = inject(NgoService);
  private registrationService = inject(RegistrationService);
  private fb = inject(FormBuilder);

  activities = this.activityService.activities$;
  ngos = this.ngoService.ngos$;
  registrations = this.registrationService.registrations$;

  showForm = false;
  isEditing = false;

  editingId: string | null = null;
  editingNgoId = DEFAULT_NGO_ID;
  editingQrCode = '';

  form = this.fb.group({
    id: [{ value: '', disabled: true }],
    activityName: ['', Validators.required],
    ngoName: ['', Validators.required],
    location: ['', Validators.required],
    whenDate: ['', Validators.required],
    startTime: ['', Validators.required],
    endTime: ['', Validators.required],
    offered: [1, [Validators.required, Validators.min(1)]],
    description: [''],
    cutoff: ['', Validators.required],
  });

  ngOnInit(): void {
    this.loadData();
  }

  openCreateForm(): void {
    this.showForm = true;
    this.isEditing = false;
    this.editingId = null;
    this.editingNgoId = DEFAULT_NGO_ID;
    this.editingQrCode = '';

    this.form.reset({
      id: '',
      activityName: '',
      ngoName: '',
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

  onFormValueChange(value: ActivityFormValue): void {
    this.form.patchValue(value, { emitEvent: false });
  }

  onFormAction(action: 'submit' | 'clear' | 'close'): void {
    if (action === 'submit') {
      this.submit();
      return;
    }

    if (action === 'clear') {
      this.openCreateForm();
      return;
    }

    this.closeForm();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      alert('Please fill all required fields using a valid date and time format.');
      return;
    }

    const raw = this.form.getRawValue() as ActivityFormValue;
    const currentTaken = this.isEditing ? this.getEditingTakenCount() : 0;
    const offered = Math.max(1, Number(raw.offered || 1));

    if (this.isEditing && offered < currentTaken) {
      alert(`Total slots cannot be lower than the current registered count (${currentTaken}).`);
      return;
    }

    if (raw.ngoName) {
      const ngo = this.ngos().find((n) => n.name === raw.ngoName);
      if (ngo?._id) {
        this.editingNgoId = String(ngo._id);
      }
    }

    const context: ActivityFormContext = {
      editingId: this.editingId,
      editingNgoId: this.editingNgoId,
      editingQrCode: this.editingQrCode,
      editingTaken: currentTaken,
      isEditing: this.isEditing,
    };

    const payload = buildActivityPayload(raw, context);

    const request =
      this.isEditing && this.editingId
        ? this.activityService.updateActivity(this.editingId, payload)
        : this.activityService.createActivity(payload);

    request.subscribe({
      next: () => {
        this.closeForm();
        this.loadData();
      },
      error: (error) => {
        const fallback = this.isEditing ? 'Failed to update activity.' : 'Failed to create activity.';
        alert(this.getRequestErrorMessage(error, fallback));
      },
    });
  }

  edit(activity: Activity): void {
    this.showForm = true;
    this.isEditing = true;
    this.editingId = this.getActivityId(activity);
    this.editingNgoId = this.toText(activity.ngo_id) || DEFAULT_NGO_ID;
    this.editingQrCode = activity.qr_code ?? '';

    const formValue = toFormValue(activity);
    this.form.reset({
      ...formValue,
      ngoName: this.getNgo(this.toText(activity.ngo_id))?.name || '',
      location: this.getLocation(activity),
      description: this.getDescription(activity),
    });
  }

  remove(id: string): void {
    if (!id) return;

    this.activityService.deleteActivity(id).subscribe({
      next: () => {
        if (this.editingId === id) {
          this.closeForm();
        }
        this.loadData();
      },
      error: () => {
        alert('Failed to delete activity.');
      },
    });
  }

  getDisplayId(activity: Activity): string {
    return this.getActivityId(activity) || '-';
  }

  getNgoName(activity: Activity): string {
    if (activity.ngo_name) {
      return activity.ngo_name;
    }
    return this.getNgo(this.toText(activity.ngo_id))?.name || '-';
  }

  getActivityId(activity: Activity): string {
    return this.toText(activity._id);
  }

  getNgo(ngoId: string): Ngo | undefined {
    const targetId = this.toText(ngoId);
    return this.ngos().find((ngo) => this.toText(ngo._id) === targetId);
  }

  getLocation(activity: Activity): string {
    return String(activity.location ?? '').trim()
      || this.getNgo(this.toText(activity.ngo_id))?.location
      || '-';
  }

  getDescription(activity: Activity): string {
    return String(activity.description ?? '').trim()
      || this.getNgo(this.toText(activity.ngo_id))?.description
      || '-';
  }

  displayWhen(activity: Activity): string {
    return displayWhen(activity);
  }

  getTaken(activity: Activity): number {
    const activityId = this.getActivityId(activity);
    return this.registrations().filter(
      (registration) =>
        this.toText(registration.activity_id) === activityId &&
        registration.status !== 'Cancelled',
    ).length;
  }

  getRemaining(activity: Activity): number {
    return getRemainingSlots(activity, this.getTaken(activity));
  }

  getStatus(activity: Activity): Activity['status'] {
    return getStatus(activity, this.getTaken(activity));
  }

  cutoffParts(cutoff: string | Date): { date: string; time: string } {
    return cutoffParts(cutoff);
  }

  trackActivity(index: number, activity: Activity): string {
    return this.getActivityId(activity) || String(index);
  }

  private loadData(): void {
    this.activityService.getActivities();
    this.ngoService.getNgos();
    this.registrationService.getRegistrations();
  }

  private getEditingTakenCount(): number {
    if (!this.editingId) {
      return 0;
    }

    return this.registrations().filter(
      (registration) =>
        this.toText(registration.activity_id) === this.editingId &&
        registration.status !== 'Cancelled',
    ).length;
  }

  private toText(value: unknown): string {
    return String(value ?? '').trim();
  }

  private getRequestErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const serverMessage =
        typeof error.error === 'string'
          ? error.error.trim()
          : typeof error.error?.message === 'string'
            ? error.error.message.trim()
            : '';

      return serverMessage || fallback;
    }

    return fallback;
  }
}

function buildActivityPayload(raw: ActivityFormValue, context: ActivityFormContext): Activity {
  const date = normalizeDate(raw.whenDate);
  const maxSlots = Math.max(1, Number(raw.offered || 1));
  const taken = Number(context.editingTaken || 0);

  const startTime = toTimestamp(date, raw.startTime);
  const endTime = toTimestamp(date, raw.endTime);
  const cutoff = normalizeDateTime(raw.cutoff);

  const activity: Activity = {
    ngo_id: context.editingNgoId || DEFAULT_NGO_ID,
    name: raw.activityName,
    date,
    start_time: startTime,
    end_time: endTime,
    max_slots: maxSlots,
    slots_taken: taken,
    cutoff_datetime: cutoff,
    status: 'Open',
    qr_code: context.editingQrCode || '',
    location: raw.location,
    description: raw.description || '',
    ngo_name: raw.ngoName || '',
    participant_user_ids: [],
  };

  if (context.isEditing && context.editingId) {
    activity._id = context.editingId;
  }

  activity.status = getStatus(activity, taken);
  return activity;
}

function toFormValue(activity: Activity): ActivityFormValue {
  return {
    id: String(activity._id ?? '').trim(),
    activityName: activity.name,
    ngoName: String(activity.ngo_name ?? '').trim(),
    location: String(activity.location ?? '').trim(),
    whenDate: toDateOnly(activity.date),
    startTime: formatTime(activity.start_time),
    endTime: formatTime(activity.end_time),
    offered: Number(activity.max_slots ?? 1),
    description: String(activity.description ?? ''),
    cutoff: toDateTimeLocal(activity.cutoff_datetime),
  };
}

function displayWhen(activity: Activity): string {
  return `${toDateOnly(activity.date)} ${formatTime(activity.start_time)}-${formatTime(activity.end_time)}`;
}

function cutoffParts(cutoff: string | Date): { date: string; time: string } {
  const text = toDateTimeLocal(cutoff);
  const [date, time = ''] = text.split('T');
  return { date, time };
}

function getRemainingSlots(activity: Activity, taken = Number(activity.slots_taken ?? 0)): number {
  return Math.max(0, Number(activity.max_slots ?? 0) - taken);
}

function getStatus(activity: Activity, taken = Number(activity.slots_taken ?? 0)): Activity['status'] {
  const cutoffTime = new Date(String(activity.cutoff_datetime ?? '')).getTime();
  const maxSlots = Number(activity.max_slots ?? 0);

  if (!Number.isNaN(cutoffTime) && cutoffTime <= Date.now()) return 'Closed';
  if (taken >= maxSlots) return 'Full';
  return 'Open';
}

function toDateOnly(value: string | Date): string {
  return normalizeDate(String(value ?? '')).split('T')[0] ?? '';
}

function toDateTimeLocal(value: string | Date): string {
  const text = normalizeDateTime(String(value ?? ''));
  if (!text) return '';
  return text.includes('T') ? text.slice(0, 16) : text;
}

function formatTime(value: number | string): string {
  if (typeof value === 'number') {
    return new Date(value).toTimeString().slice(0, 5);
  }

  const text = String(value ?? '').trim();
  if (!text) return '';
  if (/^\d{1,2}:\d{2}$/.test(text)) return text.padStart(5, '0');
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(text)) return text.slice(0, 5).padStart(5, '0');

  const maybeNumber = Number(text);
  if (!Number.isNaN(maybeNumber) && text.length >= 10) {
    return new Date(maybeNumber).toTimeString().slice(0, 5);
  }

  return text.slice(0, 5).padStart(5, '0');
}

function toTimestamp(dateText: string, timeText: string): number {
  const time = (timeText || '00:00').padStart(5, '0');
  return new Date(`${dateText}T${time}:00`).getTime();
}

function normalizeDate(value: string): string {
  return String(value ?? '').trim().replaceAll('/', '-');
}

function normalizeDateTime(value: string): string {
  const text = String(value ?? '').trim().replaceAll('/', '-');
  if (!text) return '';
  return text.includes('T') ? text : text.replace(' ', 'T');
}
