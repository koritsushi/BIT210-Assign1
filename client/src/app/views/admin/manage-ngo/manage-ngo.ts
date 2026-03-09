import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { Activity } from '../../../shared/models/activity.model';
import { ActivityService } from '../../../shared/services/activity.service';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './manage-ngo.html',
  styleUrls: ['./manage-ngo.css'],
})
export class ManageNgo {
  activities: Activity[] = [];
  form!: FormGroup;
  editingId: string | null = null;

  constructor(
    private activityService: ActivityService,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      ngo_id: ['', Validators.required],
      ngo_name: ['', Validators.required],
      location: ['', Validators.required],
      description: [''],
      date: ['', Validators.required],
      start_time: ['', Validators.required],
      end_time: ['', Validators.required],
      max_slots: [1, [Validators.required, Validators.min(1)]],
      cutoff_datetime: ['', Validators.required],
    });

    this.loadActivities();
  }

  async loadActivities() {
    this.activities = await firstValueFrom(this.activityService.activities$);
  }

  submit() {
    if (this.form.invalid) {
      return;
    }

    const formValue = this.form.value;

    const activity: Activity = {
      _id: this.editingId ?? undefined,
      ngo_id: formValue.ngo_id,
      ngo_name: formValue.ngo_name,
      location: formValue.location,
      description: formValue.description,
      date: formValue.date,
      start_time: formValue.start_time,
      end_time: formValue.end_time,
      max_slots: Number(formValue.max_slots),
      slots_taken: this.editingId ? this.getSlotsTaken(this.editingId) : 0,
      cutoff_datetime: formValue.cutoff_datetime,
      status: 'Open',
      qr_code: 'QR-' + Date.now(),
    };

    if (this.editingId) {
      this.activityService.updateActivity(activity);
    } else {
      this.activityService.addActivity(activity);
    }

    this.loadActivities();
    this.clearForm();
  }

  editActivity(activity: Activity) {
    this.editingId = activity._id ?? null;

    this.form.patchValue({
      ngo_id: activity.ngo_id,
      ngo_name: activity.ngo_name,
      location: activity.location,
      description: activity.description,
      date: this.formatDate(activity.date),
      start_time: activity.start_time,
      end_time: activity.end_time,
      max_slots: activity.max_slots,
      cutoff_datetime: this.formatDateTime(activity.cutoff_datetime),
    });
  }

  deleteActivity(id?: string) {
    if (!id) return;

    this.activityService.deleteActivity(id);
    this.loadActivities();

    if (this.editingId === id) {
      this.clearForm();
    }
  }

  clearForm() {
    this.editingId = null;
    this.form.reset({
      ngo_id: '',
      ngo_name: '',
      location: '',
      description: '',
      date: '',
      start_time: '',
      end_time: '',
      max_slots: 1,
      cutoff_datetime: '',
    });
  }

  getRemaining(activity: Activity): number {
    return activity.max_slots - (activity.slots_taken ?? 0);
  }

  private getSlotsTaken(id: string): number {
    const found = this.activities.find((a) => a._id === id);
    return found?.slots_taken ?? 0;
  }

  private formatDate(date: string | Date): string {
    return new Date(date).toISOString().split('T')[0];
  }

  private formatDateTime(date: string | Date): string {
    const d = new Date(date);
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
  }
}
