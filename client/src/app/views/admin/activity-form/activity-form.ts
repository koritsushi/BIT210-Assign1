import { CommonModule, DOCUMENT } from '@angular/common';
import { AfterViewInit, Component, OnInit, effect, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Activity } from '../../../models/activity.model';
import { Ngo } from '../../../models/ngo.model';
import { Registration } from '../../../models/registration.model';
import { ActivityService } from '../../../services/activity.service';
import { NgoService } from '../../../services/ngo.service';
import { RegistrationService } from '../../../services/registration.servicce';
import {
  ActivityFormContext,
  ActivityFormValue,
  DEFAULT_NGO_ID,
  buildActivityPayload,
  getStatus,
  toFormValue,
} from './activity-form.helpers';

@Component({
  selector: 'app-activity-form-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './activity-form.html',
  styleUrl: './activity-form.css',
})
export class ActivityFormPage implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private document = inject(DOCUMENT);
  private activityService = inject(ActivityService);
  private ngoService = inject(NgoService);
  private registrationService = inject(RegistrationService);
  private fb = inject(FormBuilder);

  ngos = this.ngoService.ngos$;
  registrations = this.registrationService.registrations$;
  currentActivity = this.activityService.activity$;

  isEditing = false;
  editingId: string | null = null;
  editingTaken = 0;
  editingStatus: Activity['status'] = 'Open';
  editingNgoId = DEFAULT_NGO_ID;
  editingQrCode = '';
  private hasLoadedEditForm = false;

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

  constructor() {
    effect(() => {
      const activity = this.currentActivity();
      const registrations = this.registrations();

      if (!this.isEditing || !this.editingId || !activity?._id) {
        return;
      }

      if (this.getActivityId(activity) !== this.editingId) {
        return;
      }

      if (this.hasLoadedEditForm && this.form.dirty) {
        return;
      }

      this.loadEditForm(activity, registrations);
      this.hasLoadedEditForm = true;
    });
  }

  get title(): string {
    return this.isEditing ? 'Edit Activity' : 'Add New Activity';
  }

  ngOnInit(): void {
    this.ngoService.getNgos();
    this.registrationService.getRegistrations();

    const activityId = this.route.snapshot.paramMap.get('id');
    if (activityId) {
      this.openEditForm(activityId);
      return;
    }

    this.openCreateForm();
  }

  ngAfterViewInit(): void {
    this.scrollToTop();
  }

  openCreateForm(): void {
    this.isEditing = false;
    this.editingId = null;
    this.editingTaken = 0;
    this.editingStatus = 'Open';
    this.editingNgoId = DEFAULT_NGO_ID;
    this.editingQrCode = '';
    this.hasLoadedEditForm = true;
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

  openEditForm(activityId: string): void {
    this.isEditing = true;
    this.editingId = activityId;
    this.editingTaken = 0;
    this.editingStatus = 'Open';
    this.editingNgoId = DEFAULT_NGO_ID;
    this.editingQrCode = '';
    this.hasLoadedEditForm = false;
    this.activityService.getActivity(activityId);
  }

  closeForm(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  clearForm(): void {
    if (this.isEditing && this.editingId) {
      this.openEditForm(this.editingId);
      return;
    }

    this.openCreateForm();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      alert('Please fill all required fields using a valid date and time format.');
      return;
    }

    const raw = this.form.getRawValue() as ActivityFormValue;

    if (raw.ngoName) {
      const ngo = this.ngos().find((item) => item.name === raw.ngoName);
      if (ngo?._id) {
        this.editingNgoId = String(ngo._id);
      }
    }

    const context: ActivityFormContext = {
      editingId: this.editingId,
      editingNgoId: this.editingNgoId,
      editingQrCode: this.editingQrCode,
      editingStatus: this.editingStatus,
      editingTaken: this.editingTaken,
      isEditing: this.isEditing,
    };
    const payload = buildActivityPayload(raw, context);

    const request = this.isEditing && this.editingId
      ? this.activityService.updateActivity(this.editingId, payload)
      : this.activityService.createActivity(payload);

    request.subscribe({
      next: () => this.router.navigate(['/admin/dashboard']),
      error: () => {
        alert(this.isEditing ? 'Failed to update activity.' : 'Failed to create activity.');
      },
    });
  }

  getActivityId(activity: Activity): string {
    return this.toText(activity._id);
  }

  private loadEditForm(activity: Activity, registrations: Registration[]): void {
    this.editingTaken = Math.max(Number(activity.slots_taken ?? 0), this.getTaken(activity, registrations));
    this.editingStatus = getStatus(activity, this.editingTaken);
    this.editingNgoId = this.toText(activity.ngo_id) || DEFAULT_NGO_ID;
    this.editingQrCode = activity.qr_code ?? '';

    const formValue = toFormValue(activity);
    this.form.reset({
      ...formValue,
      ngoName: this.getNgo(this.toText(activity.ngo_id))?.name || formValue.ngoName,
      location: this.getLocation(activity),
      description: this.getDescription(activity),
    });
  }

  private getTaken(activity: Activity, registrations = this.registrations()): number {
    const activityId = this.getActivityId(activity);
    return registrations.filter(
      (registration) =>
        this.toText(registration.activity_id) === activityId &&
        registration.status !== 'Cancelled',
    ).length;
  }

  private getNgo(ngoId: string): Ngo | undefined {
    const targetId = this.toText(ngoId);
    return this.ngos().find((ngo) => this.toText(ngo._id) === targetId);
  }

  private getLocation(activity: Activity): string {
    return String(activity.location ?? '').trim()
      || this.getNgo(this.toText(activity.ngo_id))?.location
      || '';
  }

  private getDescription(activity: Activity): string {
    return String(activity.description ?? '').trim()
      || this.getNgo(this.toText(activity.ngo_id))?.description
      || '';
  }

  private scrollToTop(): void {
    const contentArea = this.document.querySelector('.content-area');
    if (contentArea instanceof HTMLElement) {
      contentArea.scrollTo({ top: 0, behavior: 'auto' });
    }

    this.document.defaultView?.scrollTo({ top: 0, behavior: 'auto' });
  }

  private toText(value: unknown): string {
    return String(value ?? '').trim();
  }
}
