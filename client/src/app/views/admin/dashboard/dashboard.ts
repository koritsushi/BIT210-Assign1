import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  editingStatus: Activity['status'];
  editingTaken: number;
  isEditing: boolean;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, ReactiveFormsModule, ActivityFormComponent],
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
  editingTaken = 0;
  editingStatus: Activity['status'] = 'Open';
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
    this.editingTaken = 0;
    this.editingStatus = 'Open';
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
      editingStatus: this.editingStatus,
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
    this.editingTaken = this.getTaken(activity);
    this.editingStatus = this.getStatus(activity);
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

function buildActivityPayload(raw: ActivityFormValue, context: ActivityFormContext): Omit<Activity, '_id'> & { _id?: string } {
    const dateStr = normalizeDate(raw.whenDate); // "2026-04-22"
    
    const maxSlots = Math.max(1, Number(raw.offered || 1));
    const taken = Math.min(Number(context.editingTaken || 0), maxSlots);

    // Convert date string to proper Date object (Malaysia UTC+8)
    const [year, month, day] = dateStr.split('-').map(Number);
    const activityDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

    //Timestamps using Malaysia timezone
    const startTime = toTimestampMY(dateStr, raw.startTime);
    const endTime = toTimestampMY(dateStr, raw.endTime);

    // cutoff_datetime as proper Date object (Malaysia UTC+8)
    const cutoffDate = parseDateTimeMY(raw.cutoff);

    const activity: any = {
        ngo_id: context.editingNgoId || DEFAULT_NGO_ID,
        name: raw.activityName,
        date: activityDate,           // Date object
        start_time: startTime,        // number (UTC ms)
        end_time: endTime,            // number (UTC ms)
        max_slots: maxSlots,          // number
        slots_taken: taken,           // number
        cutoff_datetime: cutoffDate,  // Date object
        status: 'Open' as Activity['status'],
        qr_code: context.editingQrCode || '',
        location: raw.location,
        description: raw.description || '',
        ngo_name: raw.ngoName || '',
        participant_user_ids: [],
    };

    // Only include _id when editing, let MongoDB generate it on create
    if (context.isEditing && context.editingId) {
        activity._id = context.editingId;
    }

    activity.status = getStatus(activity, taken);
    return activity;
}

//Parse datetime-local string as Malaysia time (UTC+8)
function parseDateTimeMY(value: string): Date {
    const text = normalizeDateTime(value); // "2026-04-22T00:00"
    if (!text || !text.includes('T')) return new Date(text);
    
    const [datePart, timePart] = text.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = (timePart || '00:00').split(':').map(Number);
    
    // Subtract 8 hours to convert Malaysia time (UTC+8) to UTC
    return new Date(Date.UTC(year, month - 1, day, hours - 8, minutes, 0));
}

// Timestamp using Malaysia timezone
function toTimestampMY(dateText: string, timeText: string): number {
    const time = (timeText || '00:00').padStart(5, '0');
    const [year, month, day] = dateText.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    
    // Subtract 8 hours to convert Malaysia time (UTC+8) to UTC
    return new Date(Date.UTC(year, month - 1, day, hours - 8, minutes, 0)).getTime();
}

function toFormValue(activity: Activity): ActivityFormValue {
    return {
        id: String(activity._id ?? '').trim(),
        activityName: activity.name,
        ngoName: String(activity.ngo_name ?? '').trim(),
        location: String(activity.location ?? '').trim(),
        whenDate: toDateOnlyMY(activity.date),
        startTime: formatTimeMY(activity.start_time),   // Use MY version
        endTime: formatTimeMY(activity.end_time),       // Use MY version
        offered: Number(activity.max_slots ?? 1),
        description: String(activity.description ?? ''),
        cutoff: toDateTimeLocalMY(activity.cutoff_datetime),
    };
}

//Convert UTC date to Malaysia date string for display
function toDateOnlyMY(value: string | Date): string {
    const date = new Date(String(value ?? ''));
    if (isNaN(date.getTime())) return '';
    // Add 8 hours for Malaysia time
    const myDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return myDate.toISOString().split('T')[0];
}

// Convert UTC datetime to Malaysia datetime-local string for display
function toDateTimeLocalMY(value: string | Date): string {
    const date = new Date(String(value ?? ''));
    if (isNaN(date.getTime())) return '';
    // Add 8 hours for Malaysia time
    const myDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return myDate.toISOString().slice(0, 16); // "2026-04-22T08:00"
}

function displayWhen(activity: Activity): string {
    return `${toDateOnlyMY(activity.date)} ${formatTimeMY(activity.start_time)}-${formatTimeMY(activity.end_time)}`;
}

// Use Malaysia timezone for cutoff display
function cutoffParts(cutoff: string | Date): { date: string; time: string } {
    const text = toDateTimeLocalMY(cutoff);
    const [date, time = ''] = text.split('T');
    return { date, time };
}

//Format timestamp in Malaysia time
function formatTimeMY(value: number | string): string {
    if (typeof value === 'number') {
        // Add 8 hours offset for Malaysia time
        const myDate = new Date(value + 8 * 60 * 60 * 1000);
        return myDate.toISOString().slice(11, 16); // "HH:MM"
    }

    const text = String(value ?? '').trim();
    if (!text) return '';

    const maybeNumber = Number(text);
    if (!Number.isNaN(maybeNumber) && text.length >= 10) {
        const myDate = new Date(maybeNumber + 8 * 60 * 60 * 1000);
        return myDate.toISOString().slice(11, 16);
    }

    return text.slice(0, 5).padStart(5, '0');
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

function normalizeDate(value: string): string {
  return String(value ?? '').trim().replaceAll('/', '-');
}

function normalizeDateTime(value: string): string {
  const text = String(value ?? '').trim().replaceAll('/', '-');
  if (!text) return '';
  return text.includes('T') ? text : text.replace(' ', 'T');
}
