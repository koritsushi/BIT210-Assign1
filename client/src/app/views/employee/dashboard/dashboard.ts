import { Component, inject, OnInit } from '@angular/core';
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

    // --- Signals from services ---
    activities = this.activityService.activities$;
    ngos = this.ngoService.ngos$;
    registrations = this.registrationService.registrations$;

    // --- Local state ---
    alert: string[] = [];
    currentSwapActivity: Activity | null = null;

    ngOnInit(): void {
        this.activityService.getActivities();
        this.ngoService.getNgos();
        this.registrationService.getRegistrations();
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
            r.status === 'Registered'
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
        return activity.max_slots - activity.slots_taken;
    }

    // --- Helper: check if cutoff has passed ---
    isCutoffPassed(activity: Activity): boolean {
        return new Date() > new Date(activity.cutoff_datetime);
    }

    // --- Action: Register ---
    register(activity: Activity) {
        const userId = this.authService.getUserId();
        if (!userId) {
            this.alert.unshift('Unable to register: user not found');
            return console.log("user not found or NULL!");
        }

        const newRegistration: Registration = {
            user_id: userId,
            activity_id: activity._id!,
            registered_at: new Date(),
            updated_at: new Date(),
            status: 'Registered'
        };

        this.registrationService.createRegistration(newRegistration).subscribe({
            next: () => {
                this.registrationService.getRegistrations();
                this.activityService.getActivities();
                const message = `Successfully registered for "${activity.name}"`;
                this.alert.unshift(message);
                this.sendNotification(userId, activity._id!, 'Registration', message);
            },
            error: () => {
                this.alert.unshift(`Failed to register for "${activity.name}"`);
            }
        });
    }

    // --- Action: Cancel ---
    cancel(activity: Activity) {
        const registration = this.getRegistration(activity._id);
        if (!registration?._id) return;

        const userId = this.authService.getUserId();
        if (!userId) return;

        this.registrationService.deleteRegistration(registration._id.toString()).subscribe({
            next: () => {
                this.registrationService.getRegistrations();
                this.activityService.getActivities();
                const message = `Cancelled registration for "${activity.name}"`;
                this.alert.unshift(message);
                this.sendNotification(userId, activity._id!, 'Cancellation', message);
            },
            error: () => {
                this.alert.unshift(`Failed to cancel "${activity.name}"`);
            }
        });
    }

    // --- Action: Set as swap source ---
    setAsCurrentSwap(activity: Activity) {
        this.currentSwapActivity = activity;
        this.alert.unshift(`Set "${activity.name}" as swap source`);
    }

    // --- Action: Swap to another activity ---
    swapTo(activity: Activity) {
        if (!this.currentSwapActivity) return;
        const from = this.currentSwapActivity;
        
        const registration = this.getRegistration(from._id);
        if (!registration?._id) return;

        const userId = this.authService.getUserId();
        if (!userId) return;

        // First cancel the old registration
        this.registrationService.deleteRegistration(registration._id.toString()).subscribe({
            next: () => {
                // Then register for the new activity
                const newRegistration: Registration = {
                    user_id: userId,
                    activity_id: activity._id!,
                    registered_at: new Date(),
                    updated_at: new Date(),
                    status: 'Registered'
                };

                this.registrationService.createRegistration(newRegistration).subscribe({
                    next: () => {
                        this.registrationService.getRegistrations();
                        this.activityService.getActivities();
                        const message = `Swapped from "${from.name}" to "${activity.name}"`;
                        this.alert.unshift(message);
                        this.sendNotification(userId, activity._id!, 'Update', message);
                        this.currentSwapActivity = null;
                    },
                    error: () => {
                        this.alert.unshift(`Failed to swap to "${activity.name}"`);
                    }
                });
            },
            error: () => {
                this.alert.unshift(`Failed to cancel "${from.name}" during swap`);
            }
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
        type: "Registration" | "Cancellation" | "Reminder" | "Update" | "Broadcast", 
        message: string
    ) {
        const notification: Notification = {
            user_id: userId,
            activity_id: activityId,
            type: type,
            message: message,
            sent_at: new Date(),
            scheduled_at: new Date(),
            repeat_intervel_minutes: 0,
            repeat_until: new Date()
        };

        this.notificationService.createNotification(notification).subscribe({
            error: (err) => {
                console.error('Failed to create notification:', err);
            }
        });
    }
}