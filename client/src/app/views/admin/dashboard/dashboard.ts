import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Activity } from '../../../models/activity.model';
import { Ngo } from '../../../models/ngo.model';
import { ActivityFormContext, ActivityFormValue, ActivityService } from '../../../services/activity.service';
import { NgoService } from '../../../services/ngo.service';
import { RegistrationService } from '../../../services/registration.servicce';

const DEFAULT_NGO_ID = '507f1f77bcf86cd799439011'; 
// Default NGO ID for new activities

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})

// Inject necessary services and form builder
export class Dashboard implements OnInit {
  private activityService = inject(ActivityService); // service for CRUD activities
  private ngoService = inject(NgoService); // service for fetching NGO data
  private registrationService = inject(RegistrationService); // service for fetching registration data

  private fb = inject(FormBuilder); // build form

  // -----signal for activities list, NGO list and registration list
  activities = this.activityService.activities$; // signal for activities list
  ngos = this.ngoService.ngos$;
  registrations = this.registrationService.registrations$;

  // --------form state variables
  showForm = false;
  isEditing = false;

  // ---------store activity Information when edit, null, create
  editingId: string | null = null;
  editingTaken = 0;
  editingStatus: Activity['status'] = 'Open';
  editingNgoId = DEFAULT_NGO_ID; //store ngoId when edit
  editingQrCode = '';

  //------------ form for creating/editing activities
  form = this.fb.group({
    id: [{ value: '', disabled: true }],
    activityName: ['', Validators.required],
    location: ['', Validators.required],
    whenDate: ['', Validators.required],
    startTime: ['', Validators.required],
    endTime: ['', Validators.required],
    offered: [1, [Validators.required, Validators.min(1)]],
    description: [''],
    cutoff: ['', Validators.required],
  });

  // load initial data when component initializes
  ngOnInit(): void {
    this.loadData();
  }

  openCreateForm(): void {     // --------when create new activity
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

  submit(): void {  // -------------avoid submit when form is invalid
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      alert('Please fill all required fields using a valid date and time format.');
      return;
    }

    const raw = this.form.getRawValue() as ActivityFormValue; // store create/edit form value in raw, 
                                                              // then build payload to send to backend
    const context: ActivityFormContext = {
      editingId: this.editingId,
      editingNgoId: this.editingNgoId,
      editingQrCode: this.editingQrCode,
      editingStatus: this.editingStatus,
      editingTaken: this.editingTaken,
      isEditing: this.isEditing,
    };
    const payload = this.activityService.buildActivityPayload(raw, context);

    const request = this.isEditing && this.editingId // api request
      ? this.activityService.updateActivity(this.editingId, payload)
      : this.activityService.createActivity(payload);

    request.subscribe({
      next: () => {
        this.closeForm();
        this.loadData();
      },
      error: () => {
        alert(this.isEditing ? 'Failed to update activity.' : 'Failed to create activity.');
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
    const formValue = this.activityService.toFormValue(activity);
    this.form.reset({
      ...formValue,
      location: this.getLocation(activity),
      description: this.getDescription(activity),
    });
  }

  remove(id: string): void {
    if (!id) return;

    this.activityService.deleteActivity(id).subscribe({ // Remove activity and refresh list
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

  // ------------------------------------getters for displaying activity information in HTML
  getDisplayId(index: number): string {
    return `NGO-${index + 1}`;
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
    return this.activityService.displayWhen(activity);
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
    return this.activityService.getRemainingSlots(activity, this.getTaken(activity));
  }

  getStatus(activity: Activity): Activity['status'] {
    return this.activityService.getStatus(activity, this.getTaken(activity));
  }

  getParticipantCount(activity: Activity): number {
    return this.getTaken(activity);
  }

  cutoffParts(cutoff: string | Date): { date: string; time: string } {
    return this.activityService.cutoffParts(cutoff);
  }

  trackActivity(index: number, activity: Activity): string {
    return this.getActivityId(activity) || String(index);
  }


  // ------------------------------------  dashboard data load/ refresh/ formatting helper methods
  private loadData(): void {
    this.activityService.getActivities();
    this.ngoService.getNgos();
    this.registrationService.getRegistrations();
  }


  // ------------------------------------  data formatting helper methods
  private toText(value: unknown): string {
    return String(value ?? '').trim();
  }
}