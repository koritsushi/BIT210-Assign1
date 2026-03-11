import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ActivityService } from '../../../services/activity.service';
import { NotificationService } from '../../../services/notification.service';
import { Notification } from '../../../models/notification.model';
import { NotificationFormComponent } from './notification-form/notification-form';

type NotificationType =
  | 'Registration'
  | 'Cancellation'
  | 'Reminder'
  | 'Update'
  | 'Broadcast';

type AudienceType = 'Employees' | 'NGOs' | 'All';
type NotificationStatus = 'Scheduled' | 'Sent';

interface RecipientUser {
  userId: string;
  role: string;
}

interface NotificationFormValue {
  title: string;
  type: NotificationType;
  audience: AudienceType;
  selectedActivityId: string;
  message: string;
  scheduledAt: string;
  repeatIntervelMinutes: number | null;
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
  private httpClient = inject(HttpClient);

  activities = this.activityService.activities$;
  notifications = this.notificationService.notifications$;

  title = '';
  type: NotificationType = 'Reminder';
  audience: AudienceType = 'Employees';
  selectedActivityId = '';
  message = '';
  scheduledAt = '';
  repeatIntervelMinutes: number | null = null;
  repeatUntil = '';

  enableScheduleTime = false;
  enableIntervalTime = false;

  showBroadcastPanel = false;
  isBroadcastMode = false;

  loading = true;
  feedbackMessage = '';
  feedbackType: 'success' | 'error' = 'success';

  private fallbackTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.loading = true;

    if (typeof this.activityService.getActivities === 'function') {
      this.activityService.getActivities();
    }

    if (typeof this.notificationService.getNotifications === 'function') {
      this.notificationService.getNotifications();
    }

    this.fallbackTimer = setTimeout(() => {
      this.loading = false;
      this.cdr.detectChanges();
    }, 800);
  }

  ngOnDestroy(): void {
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
    }
  }

  private scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  private showFeedback(
    type: 'success' | 'error',
    message: string
  ): void {
    this.feedbackType = type;
    this.feedbackMessage = message;
    this.cdr.detectChanges();
    this.scrollToTop();
  }

  goBackToOverview(): void {
    this.closeBroadcastPanel();
  }

  openBroadcastPanel(): void {
    this.showBroadcastPanel = true;
    this.isBroadcastMode = false;
    this.type = 'Reminder';
    this.audience = 'Employees';
    this.enableScheduleTime = false;
    this.enableIntervalTime = false;
    this.feedbackMessage = '';
    this.cdr.detectChanges();
  }

  closeBroadcastPanel(): void {
    this.showBroadcastPanel = false;
    this.isBroadcastMode = false;
    this.resetForm();
    this.feedbackMessage = '';
    this.cdr.detectChanges();
  }

  setStandardMode(): void {
    this.isBroadcastMode = false;
    this.audience = 'Employees';

    if (this.type === 'Broadcast') {
      this.type = 'Reminder';
    }

    if (this.type !== 'Reminder') {
      this.enableScheduleTime = false;
      this.enableIntervalTime = false;
      this.repeatIntervelMinutes = null;
      this.repeatUntil = '';
      this.scheduledAt = '';
    }

    this.feedbackMessage = '';
    this.cdr.detectChanges();
  }

  setBroadcastMode(): void {
    this.isBroadcastMode = true;
    this.type = 'Broadcast';
    this.audience = 'All';
    this.selectedActivityId = '';
    this.enableScheduleTime = false;
    this.enableIntervalTime = false;
    this.repeatIntervelMinutes = null;
    this.repeatUntil = '';
    this.feedbackMessage = '';
    this.cdr.detectChanges();
  }

  onTypeChange(): void {
    if (this.isBroadcastMode) {
      return;
    }

    if (this.type !== 'Reminder') {
      this.enableScheduleTime = false;
      this.enableIntervalTime = false;
      this.repeatIntervelMinutes = null;
      this.repeatUntil = '';
      this.scheduledAt = '';
    }

    this.feedbackMessage = '';
    this.cdr.detectChanges();
  }

  onFormChange(formValue: NotificationFormValue): void {
    this.title = formValue.title;
    this.type = formValue.type;
    this.audience = formValue.audience;
    this.selectedActivityId = formValue.selectedActivityId;
    this.message = formValue.message;
    this.scheduledAt = formValue.scheduledAt;
    this.repeatIntervelMinutes = formValue.repeatIntervelMinutes;
    this.repeatUntil = formValue.repeatUntil;
    this.enableScheduleTime = formValue.enableScheduleTime;
    this.enableIntervalTime = formValue.enableIntervalTime;
  }

  onFormAction(action: 'sendNow' | 'schedule' | 'clear' | 'close'): void {
    if (action === 'sendNow') {
      this.sendNow();
      return;
    }

    if (action === 'schedule') {
      this.scheduleNotification();
      return;
    }

    if (action === 'close') {
      this.closeBroadcastPanel();
      return;
    }

    this.resetForm();
    this.feedbackMessage = '';
    this.cdr.detectChanges();
  }

  onModeChange(mode: 'standard' | 'broadcast'): void {
    if (mode === 'standard') {
      this.setStandardMode();
    } else {
      this.setBroadcastMode();
    }
  }

  onChildTypeChange(type: string): void {
    this.type = type as NotificationType;
    this.onTypeChange();
  }

  scheduleNotification(): void {
    if (!this.canScheduleCurrentMode()) {
      this.showFeedback(
        'error',
        'Scheduling is only available for reminder notifications and broadcast messages.'
      );
      return;
    }

    if (!this.enableScheduleTime) {
      this.showFeedback('error', 'Please tick Enable Schedule Time first.');
      return;
    }

    if (!this.scheduledAt) {
      this.showFeedback('error', 'Please select a schedule date and time.');
      return;
    }

    this.submitNotification(false);
  }

  sendNow(): void {
    this.submitNotification(true);
  }

  private canScheduleCurrentMode(): boolean {
    return this.isBroadcastMode || this.type === 'Reminder';
  }

  private submitNotification(sendNow: boolean): void {
    if (!this.title.trim() || !this.message.trim()) {
      this.showFeedback('error', 'Please complete the title and message.');
      return;
    }

    if (!this.isBroadcastMode && !this.selectedActivityId) {
      this.showFeedback('error', 'Please select a related activity.');
      return;
    }

    const needsReminderInterval =
      !this.isBroadcastMode && this.type === 'Reminder' && this.enableIntervalTime;

    if (
      needsReminderInterval &&
      (
        (this.repeatIntervelMinutes !== null && !this.repeatUntil) ||
        (this.repeatIntervelMinutes === null && this.repeatUntil)
      )
    ) {
      this.showFeedback(
        'error',
        'Please fill in both Repeat Interval and Repeat Until, or leave both empty.'
      );
      return;
    }

    if (
      needsReminderInterval &&
      this.repeatIntervelMinutes !== null &&
      Number(this.repeatIntervelMinutes) <= 0
    ) {
      this.showFeedback('error', 'Repeat Interval must be greater than 0.');
      return;
    }

    const now = new Date();
    const targetDate =
      !sendNow && this.enableScheduleTime ? new Date(this.scheduledAt) : now;

    if (!sendNow && this.enableScheduleTime && isNaN(targetDate.getTime())) {
      this.showFeedback('error', 'Invalid schedule date/time.');
      return;
    }

    const repeatUntilDate =
      needsReminderInterval &&
      this.repeatUntil &&
      !isNaN(new Date(this.repeatUntil).getTime())
        ? new Date(this.repeatUntil)
        : null;

    const currentType: NotificationType = this.isBroadcastMode
      ? 'Broadcast'
      : this.type;

    const basePayload = {
      activity_id: !this.isBroadcastMode ? this.selectedActivityId : undefined,
      type: currentType,
      message: this.message.trim(),
      is_read: false,
      is_broadcast: this.isBroadcastMode,
      sent_at: sendNow ? now.toISOString() : null,
      scheduled_at:
        !sendNow && this.enableScheduleTime ? targetDate.toISOString() : null,
      repeat_intervel_minutes:
        needsReminderInterval && this.repeatIntervelMinutes !== null
          ? Number(this.repeatIntervelMinutes)
          : null,
      repeat_until: repeatUntilDate ? repeatUntilDate.toISOString() : null,
      title: this.title.trim(),
      audience: this.isBroadcastMode ? this.audience : 'Employees',
    };

    if (this.isBroadcastMode) {
      const payload = {
        ...basePayload,
        user_id: undefined,
        activity_id: undefined,
        repeat_intervel_minutes: null,
        repeat_until: null,
      };

      this.notificationService.createNotification(payload as any).subscribe({
        next: () => {
          this.resetForm();
          this.refreshNotifications();
          this.showFeedback(
            'success',
            sendNow
              ? 'Notification sent successfully.'
              : 'Notification scheduled successfully.'
          );
        },
        error: () => {
          this.showFeedback('error', 'Failed to send notification.');
        },
      });

      return;
    }

    this.resolveRecipients('Employees').subscribe((recipients) => {
      if (recipients.length === 0) {
        this.showFeedback(
          'error',
          'No target users found for this audience. Notification was not sent.'
        );
        return;
      }

      const requests = recipients.map((recipient) => {
        const payload = {
          ...basePayload,
          user_id: recipient.userId,
        };

        return this.notificationService.createNotification(payload as any);
      });

      forkJoin(requests).subscribe({
        next: () => {
          this.resetForm();
          this.refreshNotifications();
          this.showFeedback(
            'success',
            sendNow
              ? 'Notification sent successfully.'
              : 'Notification scheduled successfully.'
          );
        },
        error: () => {
          this.showFeedback('error', 'Failed to send notification.');
        },
      });
    });
  }

  resetForm(): void {
    this.title = '';
    this.type = this.isBroadcastMode ? 'Broadcast' : 'Reminder';
    this.audience = this.isBroadcastMode ? 'All' : 'Employees';
    this.selectedActivityId = '';
    this.message = '';
    this.scheduledAt = '';
    this.repeatIntervelMinutes = null;
    this.repeatUntil = '';
    this.enableScheduleTime = false;
    this.enableIntervalTime = false;
  }

  deleteNotification(item: Notification): void {
    if (!item._id) {
      this.showFeedback('error', 'This notification cannot be deleted.');
      return;
    }

    this.notificationService.deleteNotification(item._id).subscribe({
      next: () => {
        this.refreshNotifications();
        this.showFeedback('success', 'Notification deleted successfully.');
      },
      error: () => {
        this.showFeedback('error', 'Failed to delete notification.');
      },
    });
  }

  private refreshNotifications(): void {
    if (typeof this.notificationService.getNotifications === 'function') {
      this.notificationService.getNotifications();
    }
  }

  private resolveRecipients(audience: AudienceType): Observable<RecipientUser[]> {
    const endpointConfigs: Array<{ url: string; forcedRole?: string }> = [
      { url: '/users' },
      { url: '/user' },
      { url: '/employees', forcedRole: 'Employee' },
      { url: '/employee', forcedRole: 'Employee' },
      { url: '/ngos', forcedRole: 'NGO' },
      { url: '/ngo', forcedRole: 'NGO' },
    ];

    const requests = endpointConfigs.map((config) =>
      this.httpClient.get<any>(config.url).pipe(
        map((response) => this.normalizeRecipients(response, config.forcedRole)),
        catchError(() => of([] as RecipientUser[]))
      )
    );

    return forkJoin(requests).pipe(
      map((results) => {
        const merged = results.flat();
        const deduped = this.dedupeRecipients(merged);
        const filtered = this.filterRecipientsByAudience(deduped, audience);

        if (filtered.length > 0) {
          return filtered;
        }

        return this.getFallbackRecipientsFromExistingNotifications(audience);
      })
    );
  }

  private normalizeRecipients(response: any, forcedRole?: string): RecipientUser[] {
    const rawList = this.extractArray(response);

    return rawList
      .map((item: any) => {
        const userId =
          item?._id?.toString?.() ??
          item?.id?.toString?.() ??
          item?.user_id?.toString?.() ??
          '';

        const roleRaw =
          forcedRole ??
          item?.role ??
          item?.userType ??
          item?.type ??
          item?.accountType ??
          item?.account_type ??
          '';

        const role = String(roleRaw).trim();

        if (!userId) {
          return null;
        }

        return {
          userId,
          role,
        } as RecipientUser;
      })
      .filter((item: RecipientUser | null): item is RecipientUser => item !== null);
  }

  private extractArray(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.users)) return response.users;
    if (Array.isArray(response?.user)) return response.user;
    if (Array.isArray(response?.employees)) return response.employees;
    if (Array.isArray(response?.employee)) return response.employee;
    if (Array.isArray(response?.ngos)) return response.ngos;
    if (Array.isArray(response?.ngo)) return response.ngo;
    return [];
  }

  private dedupeRecipients(recipients: RecipientUser[]): RecipientUser[] {
    const map = new Map<string, RecipientUser>();

    recipients.forEach((recipient) => {
      if (!map.has(recipient.userId)) {
        map.set(recipient.userId, recipient);
      }
    });

    return Array.from(map.values());
  }

  private filterRecipientsByAudience(
    recipients: RecipientUser[],
    audience: AudienceType
  ): RecipientUser[] {
    if (audience === 'All') {
      return recipients;
    }

    if (audience === 'Employees') {
      return recipients.filter((recipient) =>
        recipient.role.toLowerCase().includes('employee')
      );
    }

    if (audience === 'NGOs') {
      return recipients.filter((recipient) =>
        recipient.role.toLowerCase().includes('ngo')
      );
    }

    return [];
  }

  private getFallbackRecipientsFromExistingNotifications(
    audience: AudienceType
  ): RecipientUser[] {
    if (audience === 'NGOs') {
      return [];
    }

    const existing = this.notificationService.notifications$?.() ?? [];
    const ids = existing
      .map((item: any) => item?.user_id?.toString?.())
      .filter((id: string | undefined): id is string => Boolean(id));

    const uniqueIds = Array.from(new Set(ids));

    return uniqueIds.map((id) => ({
      userId: id,
      role: audience === 'Employees' ? 'Employee' : 'Unknown',
    }));
  }

  getActivityNameById(activityId: string | undefined): string {
    if (!activityId) return 'Not selected';

    const activity = this.activities().find(
      (item: any) => item?._id?.toString() === activityId?.toString()
    );

    return activity?.name ?? 'Unknown Activity';
  }

  getStatusFromDates(
    scheduledAt: Date | string | undefined | null,
    sentAt?: Date | string | undefined | null
  ): NotificationStatus {
    if (sentAt) {
      const sentDate = new Date(sentAt);
      if (!isNaN(sentDate.getTime())) {
        return 'Sent';
      }
    }

    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (!isNaN(scheduledDate.getTime()) && scheduledDate.getTime() > Date.now()) {
        return 'Scheduled';
      }
    }

    return 'Sent';
  }

  buildTitleFromType(type: string | undefined): string {
    switch (type) {
      case 'Registration':
        return 'Registration Notification';
      case 'Cancellation':
        return 'Cancellation Notice';
      case 'Reminder':
        return 'Activity Reminder';
      case 'Update':
        return 'Activity Update';
      case 'Broadcast':
        return 'Broadcast Message';
      default:
        return 'Notification';
    }
  }

  formatDateValue(value: Date | string | undefined | null): string {
    if (!value) return '-';

    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString();
  }

  getIntervalSummary(item: any): string {
    if (item?.type === 'Broadcast' || item?.is_broadcast) {
      return 'Not used for broadcast';
    }

    if (
      item?.repeat_intervel_minutes === null ||
      item?.repeat_intervel_minutes === undefined
    ) {
      return 'No interval';
    }

    return `Every ${item.repeat_intervel_minutes} minute(s)`;
  }

  getSortedNotifications(): Notification[] {
    return [...this.notifications()].sort((a: any, b: any) => {
      const aTime = new Date(a?.sent_at || a?.scheduled_at || 0).getTime();
      const bTime = new Date(b?.sent_at || b?.scheduled_at || 0).getTime();
      return bTime - aTime;
    });
  }
}