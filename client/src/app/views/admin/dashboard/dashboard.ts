import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Activity } from '../../../models/activity.model';
import { Ngo } from '../../../models/ngo.model';
import { ActivityService } from '../../../services/activity.service';
import { NgoService } from '../../../services/ngo.service';
import { RegistrationService } from '../../../services/registration.servicce';
import {
  cutoffParts,
  displayWhen,
  getRemainingSlots,
  getStatus,
} from '../activity-form/activity-form.helpers';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private router = inject(Router);
  private activityService = inject(ActivityService);
  private ngoService = inject(NgoService);
  private registrationService = inject(RegistrationService);

  activities = this.activityService.activities$;
  ngos = this.ngoService.ngos$;
  registrations = this.registrationService.registrations$;

  ngOnInit(): void {
    this.loadData();
  }

  openCreateForm(): void {
    this.router.navigate(['/admin/activities/new']);
  }

  edit(activity: Activity): void {
    const activityId = this.getActivityId(activity);
    if (!activityId) {
      return;
    }

    this.router.navigate(['/admin/activities', activityId, 'edit']);
  }

  remove(id: string): void {
    if (!id) return;

    this.activityService.deleteActivity(id).subscribe({
      next: () => this.loadData(),
      error: () => {
        alert('Failed to delete activity.');
      },
    });
  }

  getDisplayId(index: number): string {
    return `NGO-${index + 1}`;
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

  private toText(value: unknown): string {
    return String(value ?? '').trim();
  }
}
