import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ActivityStatus,
  DashboardActivity,
} from '../../../models/dashboard.model';
import { DashboardService } from '../../../services/dashboard.service';

const DEFAULT_NGO_ID = '507f1f77bcf86cd799439011';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})

export class Dashboard {
  protected readonly dashboardService = inject(DashboardService);
  showForm = false;
  isEditing = false;

  editingId: string | null = null;// store activityId when edit, null when create
  editingTaken = 0;
  editingStatus: ActivityStatus = 'Open';
  editingNgoId = DEFAULT_NGO_ID; //store ngoId when edit
  editingQrCode = '';
  form: FormGroup; // Reactive form for create/edit activity
  protected readonly activities = this.dashboardService.activities;

  constructor(
    private fb: FormBuilder,
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

  ngOnInit(): void {
    this.dashboardService.refreshActivities();
  }



  openCreateForm(): void { // show create form when create new activity
    const state = this.dashboardService.createEmptyEditState();
    this.showForm = true;
    this.applyEditState(state);
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
    this.dashboardService.saveActivity(raw, {
      editingId: this.editingId,
      editingNgoId: this.editingNgoId,
      editingQrCode: this.editingQrCode,
      editingStatus: this.editingStatus,
      editingTaken: this.editingTaken,
      isEditing: this.isEditing,
    }).subscribe({
      next: () => {
        this.dashboardService.refreshActivities();
        this.closeForm();
      },
      error: () => {
        alert('Failed to save activity.');
      },
    });
  }



  edit(activity: DashboardActivity): void {
    const state = this.dashboardService.createEditState(activity);
    this.showForm = true;
    this.applyEditState(state);
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
        alert('Failed to delete activity.');
      },
    });
  }

  displayWhen(a: DashboardActivity): string {
    return this.dashboardService.displayWhen(a);
  }

  cutoffParts(cutoff: string): { date: string; time: string } {
    return this.dashboardService.cutoffParts(cutoff);
  }
  private applyEditState(state: ReturnType<DashboardService['createEmptyEditState']>): void {
    this.isEditing = state.isEditing;
    this.editingId = state.editingId;
    this.editingTaken = state.editingTaken;
    this.editingStatus = state.editingStatus;
    this.editingNgoId = state.editingNgoId;
    this.editingQrCode = state.editingQrCode;
    this.form.reset(state.formValue);
  }
}
