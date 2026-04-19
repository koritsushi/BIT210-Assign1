import { ChangeDetectorRef, Component, inject, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService } from '../../../services/activity.service';
import { NgoService } from '../../../services/ngo.service';
import { RegistrationService } from '../../../services/registration.servicce';
import { NotificationService } from '../../../services/notification.service';
import { Ngo } from '../../../models/ngo.model';
import { Activity } from '../../../models/activity.model';
import { Registration } from '../../../models/registration.model';
import { Notification } from '../../../models/notification.model';
import { AuthService } from '../../../services/auth.services';
import { switchMap } from 'rxjs/operators';
import { forkJoin } from 'rxjs';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  leaving: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  // --- Services via inject() ---
  private activityService = inject(ActivityService);
  private ngoService = inject(NgoService);
  private registrationService = inject(RegistrationService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  // --- Signals from services ---
  activities = this.activityService.activities$;
  ngos = this.ngoService.ngos$;
  registrations = this.registrationService.registrations$;

  // --- Toast state ---
  toasts: Toast[] = [];
  currentSwapActivity: Activity | null = null;

  ngOnInit(): void {
    this.activityService.getActivities();
    this.ngoService.getNgos();
    this.registrationService.getRegistrations();
  }

  // --- Toast system ---
  private showToast(message: string, type: ToastType): void {
    const id = Date.now();
    this.toasts.push({ id, message, type, leaving: false });
    this.cdr.detectChanges();          // force render when toast appears
    setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id);
        this.cdr.detectChanges();      // force render when toast disappears
    }, 3500);
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  // --- Helper: get NGO by ngo_id ---
  getNgo(ngoId: any): Ngo | undefined {
    return this.ngos().find(n => n._id?.toString() === ngoId?.toString());
  }

  // --- Helper: check if logged-in user is registered for an activity ---
  isRegistered(activityId: any): boolean {
    const userId = this.authService.getUserId();
    return this.registrations().some(
      r => r.activity_id?.toString() === activityId?.toString() &&
        r.user_id?.toString() === userId?.toString() &&
        r.status === "Registered"
    );
  }

  // --- Helper: get registration object for an activity ---
  getRegistration(activityId: any): Registration | undefined {
    const userId = this.authService.getUserId();
    return this.registrations().find(
      r => r.activity_id?.toString() === activityId?.toString() &&
        r.user_id?.toString() === userId?.toString()
    );
  }

  // --- Helper: remaining slots ---
  getRemainingSlots(activity: Activity): number {
    return Math.max(0, activity.max_slots - activity.slots_taken);
  }

  // --- Helper: check if cutoff has passed ---
  isCutoffPassed(activity: Activity): boolean {
    return new Date() > new Date(activity.cutoff_datetime);
  }

  // --- Action: Register ---
  register(activity: Activity): void {
    const userId = this.authService.getUserId();
    if (!userId) {
      this.showToast('Unable to register: user not found.', 'error');
      return;
    }

    const newRegistration: Registration = {
      user_id: userId,
      activity_id: activity._id!,
      registered_at: new Date(),
      checkedin_at: null,
      updated_at: new Date(),
      status: "Registered"
    };

    this.registrationService.createRegistration(newRegistration).subscribe({
      next: () => {
        const updated = { ...activity, slots_taken: activity.slots_taken + 1 };
        this.activityService.updateActivity(activity._id!, updated).subscribe({
          next: () => {
            this.registrationService.getRegistrations();
            this.activityService.getActivities();
            const message = `Registered for "${activity.name}"`;
            this.showToast(message, 'success');
            this.sendNotification(userId, activity._id!, 'Registration', message);
          },
          error: () => this.showToast(`Failed to update slots for "${activity.name}"`, 'error')
        });
      },
      error: () => this.showToast(`Failed to register for "${activity.name}"`, 'error')
    });
  }

  // --- Action: Cancel ---
  cancel(activity: Activity): void {
    const registration = this.getRegistration(activity._id);
    if (!registration?._id) return;

    const userId = this.authService.getUserId();
    if (!userId) return;

    this.registrationService.deleteRegistration(registration._id.toString()).subscribe({
      next: () => {
        const updated = { ...activity, slots_taken: Math.max(0, activity.slots_taken - 1) };
        this.activityService.updateActivity(activity._id!, updated).subscribe({
          next: () => {
            this.registrationService.getRegistrations();
            this.activityService.getActivities();
            const message = `Cancelled registration for "${activity.name}"`;
            this.showToast(message, 'info');
            this.sendNotification(userId, activity._id!, 'Cancellation', message);
          },
          error: () => this.showToast(`Failed to update slots for "${activity.name}"`, 'error')
        });
      },
      error: () => this.showToast(`Failed to cancel "${activity.name}"`, 'error')
    });
  }

  // --- Action: Set as swap source ---
  setAsCurrentSwap(activity: Activity): void {
    this.currentSwapActivity = activity;
    this.showToast(`"${activity.name}" set as swap source.`, 'info');
  }

  // --- Action: Swap ---
  swapTo(activity: Activity): void {
    if (!this.currentSwapActivity) return;
    const from = this.currentSwapActivity;

    const registration = this.getRegistration(from._id);
    if (!registration?._id) return;

    const userId = this.authService.getUserId();
    if (!userId) return;

    const updatedFrom = { ...from, slots_taken: Math.max(0, from.slots_taken - 1) };
    const updatedTo = { ...activity, slots_taken: activity.slots_taken + 1 };

    const newRegistration: Registration = {
      user_id: userId,
      activity_id: activity._id!,
      registered_at: new Date(),
      checkedin_at: null,
      updated_at: new Date(),
      status: "Registered"
    };

    this.registrationService.deleteRegistration(registration._id.toString()).pipe(
      switchMap(() => forkJoin([
        this.registrationService.createRegistration(newRegistration),
        this.activityService.updateActivity(from._id!, updatedFrom),
        this.activityService.updateActivity(activity._id!, updatedTo),
      ]))
    ).subscribe({
      next: () => {
        this.registrationService.getRegistrations();
        this.activityService.getActivities();
        const message = `Swapped from "${from.name}" to "${activity.name}"`;
        this.showToast(message, 'success');
        this.sendNotification(userId, activity._id!, 'Update', message);
        this.currentSwapActivity = null;
      },
      error: () => this.showToast(`Failed to swap from "${from.name}" to "${activity.name}"`, 'error')
    });
  }

  // --- Swap eligibility check ---
  canSwapTo(activity: Activity): boolean {
    return !!this.currentSwapActivity &&
      this.currentSwapActivity._id?.toString() !== activity._id?.toString() &&
      activity.status === 'Open' &&
      this.getRemainingSlots(activity) > 0 &&
      !this.isRegistered(activity._id) &&
      !this.isCutoffPassed(activity);
  }

  // --- Helper: Send notification ---
  private sendNotification(
    userId: string,
    activityId: string,
    type: 'Registration' | 'Cancellation' | 'Reminder' | 'Update' | 'Broadcast',
    message: string
  ): void {
    const notification: Notification = {
      user_id: userId,
      activity_id: activityId,
      type,
      message,
      is_broadcast: false,
      is_read_by: [],
      deleted_by: [],
      sent_at: new Date(),
      scheduled_at: null,
      repeat_interval_minutes: null,
      repeat_until: null
    };

    this.notificationService.createNotification(notification).subscribe({
      error: (err) => console.error('Failed to create notification:', err)
    });
  }
}
