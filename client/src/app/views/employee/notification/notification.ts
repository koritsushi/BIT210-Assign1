import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { NotificationService } from '../../../services/notification.service';
import { ActivityService } from '../../../services/activity.service';
import { AuthService } from '../../../services/auth.services';
import { Notification } from '../../../models/notification.model';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.html',
  styleUrl: './notification.css',
})
export class NotificationComponent implements OnInit {
    // --- Services via inject() ---
    private notificationService = inject(NotificationService);
    private activityService = inject(ActivityService);
    private authService = inject(AuthService);

    // --- Signals from services ---
    notifications = this.notificationService.notifications$;
    activities = this.activityService.activities$;

    // --- Local state ---
    notificationsCollapsed = false;

    ngOnInit(): void {
        this.notificationService.getNotifications();
        this.activityService.getActivities();
    }

    // --- Get user's visible notifications ---
    // Includes: targeted to user + broadcasts
    // Excludes: soft deleted by user
    getUserNotifications(): Notification[] {
        const userId = this.authService.getUserId();
        if (!userId) return [];

        return this.notifications()
            .filter(n =>
                // not soft deleted by this user
                !n.deleted_by?.includes(userId) &&
                // targeted to this user OR broadcast to all
                (n.is_broadcast === true || n.user_id?.toString() === userId.toString())
            )
            .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
    }

    // --- Get activity name by activity_id ---
    getActivityName(activityId: string | undefined): string {
        if (!activityId) return 'General';
        const activity = this.activities().find(a => a._id?.toString() === activityId?.toString());
        return activity?.name || 'Unknown Activity';
    }

    // --- Soft delete all visible notifications for the user ---
    clearNotifications() {
        const userId = this.authService.getUserId();
        if (!userId) return;

        const userNotifications = this.getUserNotifications();
        if (userNotifications.length === 0) return;

        let completedCount = 0;
        userNotifications.forEach(notification => {
            if (notification._id) {
                this.softDeleteNotification(notification._id, userId, () => {
                    completedCount++;
                    if (completedCount === userNotifications.length) {
                        this.notificationService.getNotifications();
                    }
                });
            }
        });
    }

    // --- Soft delete single notification ---
    deleteNotification(notification: Notification) {
        const userId = this.authService.getUserId();
        if (!notification._id || !userId) return;

        this.softDeleteNotification(notification._id, userId, () => {
            this.notificationService.getNotifications();
        });
    }

    // --- Helper: push userId into deleted_by via PUT ---
    private softDeleteNotification(notificationId: string, userId: string, onSuccess: () => void) {
        // Get current notification to update deleted_by array
        const notification = this.notifications().find(n => n._id === notificationId);
        if (!notification) return;

        const updatedNotification: Notification = {
            ...notification,
            deleted_by: [...(notification.deleted_by || []), userId]
        };

        this.notificationService.updateNotification(notificationId, updatedNotification).subscribe({
            next: () => onSuccess(),
            error: (err) => console.error('Failed to soft delete notification:', err)
        });
    }

    // --- Mark notification as read ---
    markAsRead(notification: Notification) {
        const userId = this.authService.getUserId();
        if (!notification._id || !userId) return;

        // Only update if not already read
        if (notification.is_read_by?.includes(userId)) return;

        const updatedNotification: Notification = {
            ...notification,
            is_read_by: [...(notification.is_read_by || []), userId]
        };

        this.notificationService.updateNotification(notification._id, updatedNotification).subscribe({
            next: () => this.notificationService.getNotifications(),
            error: (err) => console.error('Failed to mark as read:', err)
        });
    }

    // --- Check if current user has read notification ---
    isRead(notification: Notification): boolean {
        const userId = this.authService.getUserId();
        if (!userId) return false;
        return notification.is_read_by?.includes(userId) ?? false;
    }

    // --- Toggle collapse ---
    toggleNotifications() {
        this.notificationsCollapsed = !this.notificationsCollapsed;
    }

    // --- Get notification icon based on type ---
    getNotificationIcon(type: string): string {
        switch (type) {
            case 'Registration': return '✓';
            case 'Cancellation': return '✗';
            case 'Reminder': return '⏰';
            case 'Update': return '🔄';
            case 'Broadcast': return '📢';
            default: return 'ℹ';
        }
    }

    // --- Get notification type class ---
    getNotificationTypeClass(type: string): string {
        switch (type) {
            case 'Registration': return 'notification-registration';
            case 'Cancellation': return 'notification-cancellation';
            case 'Reminder': return 'notification-reminder';
            case 'Update': return 'notification-update';
            case 'Broadcast': return 'notification-broadcast';
            default: return '';
        }
    }

    // --- Format notification timestamp ---
    formatTimestamp(date: Date): string {
        const now = new Date();
        const notificationDate = new Date(date);
        const diffMs = now.getTime() - notificationDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return notificationDate.toLocaleDateString();
    }

    // --- Get count by type ---
    getCountByType(type: "Registration" | "Cancellation" | "Reminder" | "Update" | "Broadcast"): number {
        return this.getUserNotifications().filter(n => n.type === type).length;
    }
}