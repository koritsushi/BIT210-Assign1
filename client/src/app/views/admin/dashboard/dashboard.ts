import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ActivityStatus,
  DashboardActivity,
} from '../../../models/dashboard.model';
import { DashboardService } from '../../../services/dashboard.service';

const DEFAULT_NGO_ID = '507f1f77bcf86cd799439011'; 
// Default NGO ID for new activities

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})

export class Dashboard {
  showForm = false;
  isEditing = false;

  editingId: string | null = null;// store activityId when edit, null when create
  editingTaken = 0;
  editingStatus: ActivityStatus = 'Open';
  editingNgoId = DEFAULT_NGO_ID; //store ngoId when edit
  editingQrCode = '';
  form: FormGroup; // Reactive form for create/edit activity
  activities: DashboardActivity[] = []; // List of activities 

  constructor(
    private dashboardService: DashboardService, // Service for CRUD operations and data handling
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,// change detection after async operations
  ) {
    this.form = this.fb.group({
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
  }

  ngOnInit(): void { // Subscribe to activities observable to update the list when data changes
    this.dashboardService.activities$.subscribe((activities) => {
      this.activities = activities;
      this.cdr.detectChanges();
    });
    this.loadActivities(); // Initial load of activities when component initializes
  }



  openCreateForm(): void { // show create form when create new activity
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
    this.dashboardService.applyLocalSave(raw, {
      editingId: this.editingId,
      editingNgoId: this.editingNgoId,
      editingQrCode: this.editingQrCode,
      editingStatus: this.editingStatus,
      editingTaken: this.editingTaken,
      isEditing: this.isEditing,
    });
    this.closeForm();
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
      whenDate: this.normalizeDateForInput(activity.whenDate),
      startTime: this.normalizeTimeForInput(activity.startTime),
      endTime: this.normalizeTimeForInput(activity.endTime),
      offered: activity.offered,
      description: activity.description,
      cutoff: this.normalizeDateTimeForInput(activity.cutoff),
    });
  }

  remove(id: string): void {
    this.dashboardService.deleteActivity(id).subscribe({ // Remove activity and refresh list
      next: () => {
        this.dashboardService.clearDeletedActivityId(id);
        if (this.editingId === id) {
          this.closeForm();
        }
        this.dashboardService.refreshActivities();
      },
      error: () => {
        this.activities = this.dashboardService.removeActivity(this.activities, id);

        if (this.editingId === id) {
          this.closeForm();
        }

        this.cdr.detectChanges();
      },
    });
  }

  displayWhen(a: DashboardActivity): string {
    return this.dashboardService.displayWhen(a);
  }

  cutoffParts(cutoff: string): { date: string; time: string } {
    return this.dashboardService.cutoffParts(cutoff);
  }

  private loadActivities(): void { // Load activities from the server and handle success/error cases
    this.dashboardService.refreshActivities();
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
}
