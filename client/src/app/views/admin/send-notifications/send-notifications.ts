import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivityService } from '../../../services/activity.service';
import { NotificationService } from '../../../services/notification.service';
import { Notification } from '../../../models/notification.model';
import { NotificationFormComponent } from './notification-form/notification-form';

type NotificationType = 'Registration' | 'Cancellation' | 'Reminder' | 'Update' | 'Broadcast';
type NotificationStatus = 'Scheduled' | 'Sent';
 
interface NotificationFormValue {
  title: string;
  type: NotificationType;
  selectedActivityId: string;
  message: string;
  scheduledAt: string;
  repeatIntervalMinutes: number | null;
  repeatUntil: string;
  enableScheduleTime: boolean;
  enableIntervalTime: boolean;
}
 
@Component({
  selector: 'app-send-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationFormComponent],
  templateUrl: './send-notifications.html',
  styleUrl: './send-notifications.css',
})
export class SendNotifications implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private activityService = inject(ActivityService);
  private cdr = inject(ChangeDetectorRef);
 
  activities = this.activityService.activities$;
  notifications = this.notificationService.notifications$;
 
  // --- Form state ---
  title = '';
  type: NotificationType = 'Reminder';
  selectedActivityId = '';
  message = '';
  scheduledAt = '';
  repeatIntervalMinutes: number | null = null;
  repeatUntil = '';
  enableScheduleTime = false;
  enableIntervalTime = false;
 
  // --- UI state ---
  showBroadcastPanel = false;
  isBroadcastMode = false;
  loading = true;
  feedbackMessage = '';
  feedbackType: 'success' | 'error' = 'success';
 
  private fallbackTimer?: ReturnType<typeof setTimeout>;
 
  ngOnInit(): void {
    this.activityService.getActivities();
    this.notificationService.getNotifications();
    this.fallbackTimer = setTimeout(() => {
      this.loading = false;
      this.cdr.detectChanges();
    }, 800);
  }
 
  ngOnDestroy(): void {
    clearTimeout(this.fallbackTimer);
  }
 
  // --- Panel controls ---
  openBroadcastPanel(): void {
    this.showBroadcastPanel = true;
    this.isBroadcastMode = false;
    this.type = 'Reminder';
    this.feedbackMessage = '';
    this.detect();
  }
 
  closeBroadcastPanel(): void {
    this.showBroadcastPanel = false;
    this.isBroadcastMode = false;
    this.resetForm();
    this.detect();
  }
 
  goBackToOverview(): void {
    this.closeBroadcastPanel();
  }
 
  // --- Mode controls ---
  setStandardMode(): void {
    this.isBroadcastMode = false;
    if (this.type === 'Broadcast') this.type = 'Reminder';
    if (this.type !== 'Reminder') this.clearScheduleFields();
    this.feedbackMessage = '';
    this.detect();
  }
 
  setBroadcastMode(): void {
    this.isBroadcastMode = true;
    this.type = 'Broadcast';
    this.selectedActivityId = '';
    this.clearScheduleFields();
    this.feedbackMessage = '';
    this.detect();
  }
 
  onTypeChange(): void {
    if (!this.isBroadcastMode && this.type !== 'Reminder') {
      this.clearScheduleFields();
    }
    this.feedbackMessage = '';
    this.detect();
  }
 
  // --- Child component event handlers ---
  onFormChange(formValue: NotificationFormValue): void {
    this.title = formValue.title;
    this.type = formValue.type;
    this.selectedActivityId = formValue.selectedActivityId;
    this.message = formValue.message;
    this.scheduledAt = formValue.scheduledAt;
    this.repeatIntervalMinutes = formValue.repeatIntervalMinutes;
    this.repeatUntil = formValue.repeatUntil;
    this.enableScheduleTime = formValue.enableScheduleTime;
    this.enableIntervalTime = formValue.enableIntervalTime;
  }
 
  onFormAction(action: 'sendNow' | 'schedule' | 'clear'): void {
    if (action === 'sendNow') return this.sendNow();
    if (action === 'schedule') return this.scheduleNotification();
    this.resetForm();
    this.feedbackMessage = '';
    this.detect();
  }
 
  onModeChange(mode: 'standard' | 'broadcast'): void {
    mode === 'standard' ? this.setStandardMode() : this.setBroadcastMode();
  }
 
  onChildTypeChange(type: string): void {
    this.type = type as NotificationType;
    this.onTypeChange();
  }
 
  // --- Submit actions ---
  sendNow(): void {
    this.submitNotification(true);
  }
 
  scheduleNotification(): void {
    if (!this.isBroadcastMode && this.type !== 'Reminder') {
      return this.showFeedback('error', 'Scheduling is only available for reminders and broadcasts.');
    }
    if (!this.enableScheduleTime) {
      return this.showFeedback('error', 'Please tick Enable Schedule Time first.');
    }
    if (!this.scheduledAt) {
      return this.showFeedback('error', 'Please select a schedule date and time.');
    }
    this.submitNotification(false);
  }
 
  // --- Core submit ---
 private submitNotification(sendNow: boolean): void {
    if (!this.title.trim() || !this.message.trim()) {
      return this.showFeedback('error', 'Please complete the title and message.');
    }
 
    if (!this.isBroadcastMode && !this.selectedActivityId) {
      return this.showFeedback('error', 'Please select a related activity.');
    }
 
    const needsInterval = !this.isBroadcastMode &&
      this.type === 'Reminder' &&
      this.enableIntervalTime;
 
    if (needsInterval) {
      if ((this.repeatIntervalMinutes !== null) !== Boolean(this.repeatUntil)) {
        return this.showFeedback('error', 'Please fill in both Repeat Interval and Repeat Until, or leave both empty.');
      }
      if (this.repeatIntervalMinutes !== null && Number(this.repeatIntervalMinutes) <= 0) {
        return this.showFeedback('error', 'Repeat Interval must be greater than 0.');
      }
    }
 
    const now = new Date();
    
    //FIX: Handle timezone conversion for scheduled time
    let targetDate: Date;
    if (!sendNow && this.enableScheduleTime) {
        // this.scheduledAt format: "2026-04-21T12:21"
        // Parse as Malaysia time (UTC+8) and convert to UTC
        
        const [datePart, timePart] = this.scheduledAt.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        
        // Create date in UTC, adjusting for Malaysia timezone (UTC+8)
        targetDate = new Date(Date.UTC(
            year, 
            month - 1,  // Month is 0-indexed
            day, 
            hours - 8,  // Subtract 8 hours to convert Malaysia time to UTC
            minutes, 
            0
        ));
        
        if (isNaN(targetDate.getTime())) {
            return this.showFeedback('error', 'Invalid schedule date/time.');
        }
        
        // DEBUG
        console.log('Selected (Malaysia time):', this.scheduledAt);
        console.log('Converted to UTC:', targetDate.toISOString());
        console.log('Current UTC:', now.toISOString());
        console.log('Will trigger in minutes:', Math.round((targetDate.getTime() - now.getTime()) / 60000));
    } else {
        targetDate = now;
    }
 
    // Handle repeat_until with same timezone conversion
    let repeatUntilDate: Date | null = null;
    if (needsInterval && this.repeatUntil) {
        const [datePart, timePart] = this.repeatUntil.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        
        repeatUntilDate = new Date(Date.UTC(
            year, 
            month - 1,
            day, 
            hours - 8,
            minutes, 
            0
        ));
        
        if (isNaN(repeatUntilDate.getTime())) {
            repeatUntilDate = null;
        }
    }
 
    // Payload conforms strictly to Notification model
    const payload: Omit<Notification, '_id'> = {
        user_id: this.isBroadcastMode ? null : '',
        activity_id: this.isBroadcastMode ? null : this.selectedActivityId,
        type: this.isBroadcastMode ? 'Broadcast' : this.type,
        title: this.title.trim(),
        message: this.message.trim(),
        is_broadcast: this.isBroadcastMode,
        is_read_by: [],
        deleted_by: [],
        sent_at: sendNow ? now : null,
        scheduled_at: !sendNow && this.enableScheduleTime ? targetDate : null,
        repeat_interval_minutes: needsInterval && this.repeatIntervalMinutes !== null
            ? Number(this.repeatIntervalMinutes)
            : null,
        repeat_until: repeatUntilDate,
        reminder_label: null
    };
    
    try {
        const result = this.notificationService.createNotification(payload as any).subscribe({
            next: () => {
                this.resetForm();
                this.notificationService.getNotifications();
                this.showFeedback('success', sendNow
                ? 'Notification sent successfully.'
                : 'Notification scheduled successfully.'
                );
            },
            error: (err) => {
                this.showFeedback('error', 'Failed to send notification.');
                console.error('=== FULL MONGODB VALIDATION ERROR ===');
        
                if (err?.errInfo?.details?.schemaRulesNotSatisfied) {
                    console.dir(err.errInfo.details, { depth: null });
                } else {
                    console.dir(err, { depth: null });
                }

                throw err;
            }
        });
        
        console.log('Notification payload:', payload);

    } catch (error: any) {
        console.error('=== FULL MONGODB VALIDATION ERROR ===');
        
        if (error?.errInfo?.details?.schemaRulesNotSatisfied) {
            console.dir(error.errInfo.details, { depth: null });
        } else {
            console.dir(error, { depth: null });
        }

        throw error;
    }
}
 
  // --- Delete ---
  deleteNotification(item: Notification): void {
    if (!item._id) return this.showFeedback('error', 'This notification cannot be deleted.');
 
    this.notificationService.deleteNotification(item._id).subscribe({
      next: () => {
        this.notificationService.getNotifications();
        this.showFeedback('success', 'Notification deleted successfully.');
      },
      error: () => this.showFeedback('error', 'Failed to delete notification.')
    });
  }
 
  // --- Form helpers ---
  resetForm(): void {
    this.title = '';
    this.type = this.isBroadcastMode ? 'Broadcast' : 'Reminder';
    this.selectedActivityId = '';
    this.message = '';
    this.clearScheduleFields();
    this.feedbackMessage = '';
  }
 
  private clearScheduleFields(): void {
    this.scheduledAt = '';
    this.repeatIntervalMinutes = null;
    this.repeatUntil = '';
    this.enableScheduleTime = false;
    this.enableIntervalTime = false;
  }
 
getActivityNameById(activityId: string | null): string {
  if (!activityId) return 'Not selected';

  const activity = this.activities().find((a: any) => {
    return String(a._id) === String(activityId);
  });

  if (!activity) return 'Unknown Activity';

  return activity.name || `Activity ${activity.qr_code}`;
}
 
  getStatusFromDates(
    scheduledAt: Date | string | undefined | null,
    sentAt?: Date | string | undefined | null
  ): NotificationStatus {
    if (sentAt && !isNaN(new Date(sentAt).getTime())) return 'Sent';
    if (scheduledAt && new Date(scheduledAt).getTime() > Date.now()) return 'Scheduled';
    return 'Sent';
  }
 
  buildTitleFromType(type: string | undefined): string {
    const map: Record<string, string> = {
      Registration: 'Registration Notification',
      Cancellation: 'Cancellation Notice',
      Reminder: 'Activity Reminder',
      Update: 'Activity Update',
      Broadcast: 'Broadcast Message',
    };
    return map[type ?? ''] ?? 'Notification';
  }
 
formatDateValue(value: Date | string | undefined | null): string {
  if (!value) return '-';

  const date = new Date(value);

  if (isNaN(date.getTime())) return String(value);

  return date.toLocaleString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}
 
  getIntervalSummary(item: Notification): string {
    if (item.is_broadcast) return 'Not used for broadcast';
    if (!item.repeat_interval_minutes) return 'No interval';
    return `Every ${item.repeat_interval_minutes} minute(s)`;
  }
 
  getSortedNotifications(): Notification[] {
    return [...this.notifications()].sort((a: any, b: any) =>
      new Date(b?.sent_at || b?.scheduled_at || 0).getTime() -
      new Date(a?.sent_at || a?.scheduled_at || 0).getTime()
    );
  }
 
  // --- Utilities ---
  private showFeedback(type: 'success' | 'error', message: string): void {
    this.feedbackType = type;
    this.feedbackMessage = message;
    this.detect();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
 
  private detect(): void {
    this.cdr.detectChanges();
  }
}
