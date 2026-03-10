import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  effect,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ActivityService } from '../../../services/activity.service';
import { NotificationService } from '../../../services/notification.service';
import { Notification } from '../../../models/notification.model';

type NotificationType =
  | 'Registration'
  | 'Cancellation'
  | 'Reminder'
  | 'Update'
  | 'Broadcast';

type AudienceType = 'Employees' | 'NGOs' | 'All';
type NotificationStatus = 'Scheduled' | 'Sent';

interface NotificationViewItem {
  id: number;
  backendId?: string;
  title: string;
  type: NotificationType;
  audience: AudienceType;
  message: string;
  scheduledAt: string;
  sentAt?: string;
  status: NotificationStatus;
  activityId?: string;
  activityName?: string;
  repeatIntervelMinutes: number | null;
  repeatUntil: string;
}

interface RecipientUser {
  userId: string;
  role: string;
}

@Component({
  selector: 'app-send-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './send-notifications.html',
  styleUrl: './send-notifications.css',
})
export class SendNotifications implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private activityService = inject(ActivityService);
  private cdr = inject(ChangeDetectorRef);
  private httpClient = inject(HttpClient);

  activities = this.activityService.activities$;

  title = '';
  type: NotificationType = 'Reminder';
  audience: AudienceType = 'All';
  selectedActivityId = '';
  message = '';
  scheduledAt = '';

  repeatIntervelMinutes: number | null = null;
  repeatUntil = '';

  loading = true;
  feedbackMessage = '';
  feedbackType: 'success' | 'error' = 'success';

  notifications: NotificationViewItem[] = [];
  private fallbackTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const serviceData = this.notificationService.notifications$?.() ?? [];
      const mapped = this.mapAndGroupNotifications(serviceData);

      this.notifications = this.dedupeViewItems(mapped);
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  ngOnInit(): void {
    this.loading = true;

    if (typeof this.notificationService.getNotifications === 'function') {
      this.notificationService.getNotifications();
    }

    if (typeof this.activityService.getActivities === 'function') {
      this.activityService.getActivities();
    }

    this.fallbackTimer = setTimeout(() => {
      if (this.notifications.length === 0) {
        this.notifications = this.getFallbackNotifications();
        this.loading = false;
        this.cdr.detectChanges();
      }
    }, 800);
  }

  ngOnDestroy(): void {
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
    }
  }

  scheduleNotification(): void {
    if (!this.scheduledAt) {
      this.feedbackType = 'error';
      this.feedbackMessage = 'Please select a schedule date and time.';
      this.cdr.detectChanges();
      return;
    }

    this.submitNotification(false);
  }

  sendNow(): void {
    this.submitNotification(true);
  }

  private submitNotification(sendNow: boolean): void {
    if (!this.title.trim() || !this.message.trim()) {
      this.feedbackType = 'error';
      this.feedbackMessage = 'Please complete the title and message.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.selectedActivityId) {
      this.feedbackType = 'error';
      this.feedbackMessage = 'Please select a related activity.';
      this.cdr.detectChanges();
      return;
    }

    if (
      (this.repeatIntervelMinutes !== null && !this.repeatUntil) ||
      (this.repeatIntervelMinutes === null && this.repeatUntil)
    ) {
      this.feedbackType = 'error';
      this.feedbackMessage =
        'Please fill in both Repeat Interval and Repeat Until, or leave both empty.';
      this.cdr.detectChanges();
      return;
    }

    if (
      this.repeatIntervelMinutes !== null &&
      Number(this.repeatIntervelMinutes) <= 0
    ) {
      this.feedbackType = 'error';
      this.feedbackMessage = 'Repeat Interval must be greater than 0.';
      this.cdr.detectChanges();
      return;
    }

    const now = new Date();
    const targetDate = sendNow ? now : new Date(this.scheduledAt);

    if (isNaN(targetDate.getTime())) {
      this.feedbackType = 'error';
      this.feedbackMessage = 'Invalid schedule date/time.';
      this.cdr.detectChanges();
      return;
    }

    const repeatUntilDate =
      this.repeatUntil && !isNaN(new Date(this.repeatUntil).getTime())
        ? new Date(this.repeatUntil)
        : null;

    const summaryItem: NotificationViewItem = {
      id: Date.now(),
      title: this.title.trim(),
      type: this.type,
      audience: this.audience,
      message: this.message.trim(),
      scheduledAt: sendNow ? '-' : this.formatDateValue(targetDate.toISOString()),
      sentAt: this.formatDateValue(now.toISOString()),
      status: sendNow ? 'Sent' : 'Scheduled',
      activityId: this.selectedActivityId,
      activityName: this.getActivityNameById(this.selectedActivityId),
      repeatIntervelMinutes:
        this.repeatIntervelMinutes !== null
          ? Number(this.repeatIntervelMinutes)
          : null,
      repeatUntil: repeatUntilDate
        ? this.formatDateValue(repeatUntilDate.toISOString())
        : '',
    };

    this.resolveRecipients(this.audience).subscribe((recipients) => {
      if (recipients.length === 0) {
        this.feedbackType = 'error';
        this.feedbackMessage =
          'No target users found for this audience. Notification was not sent.';
        this.cdr.detectChanges();
        return;
      }

      const requests = recipients.map((recipient) => {
        const payload = this.buildNotificationPayload(
          recipient.userId,
          summaryItem,
          targetDate,
          now,
          sendNow
        );

        return this.notificationService.createNotification(payload as any);
      });

      forkJoin(requests).subscribe({
        next: () => {
          this.feedbackType = 'success';
          this.feedbackMessage = sendNow
            ? 'Notification sent successfully.'
            : 'Notification scheduled successfully.';
          this.resetForm();
          this.refreshNotifications();
          this.cdr.detectChanges();
        },
        error: () => {
          this.feedbackType = 'error';
          this.feedbackMessage = 'Failed to send notification.';
          this.cdr.detectChanges();
        },
      });
    });
  }

  resetForm(): void {
    this.title = '';
    this.type = 'Reminder';
    this.audience = 'All';
    this.selectedActivityId = '';
    this.message = '';
    this.scheduledAt = '';
    this.repeatIntervelMinutes = null;
    this.repeatUntil = '';
  }

  getIntervalSummary(item: NotificationViewItem): string {
    if (item.repeatIntervelMinutes === null) {
      return 'No interval';
    }

    return `Every ${item.repeatIntervelMinutes} minute(s)`;
  }

  deleteNotification(item: NotificationViewItem): void {
    const serviceData = this.notificationService.notifications$?.() ?? [];

    const matchedBackendIds = serviceData
      .filter((raw: any) => this.isSameNotificationGroup(raw, item))
      .map((raw: any) => raw?._id?.toString?.())
      .filter((id: string | undefined): id is string => Boolean(id));

    const uniqueIds = Array.from(new Set(matchedBackendIds));

    if (uniqueIds.length === 0) {
      this.feedbackType = 'error';
      this.feedbackMessage = 'This notification cannot be deleted.';
      this.cdr.detectChanges();
      return;
    }

    const deleteRequests = uniqueIds.map((id) =>
      this.notificationService.deleteNotification(id)
    );

    forkJoin(deleteRequests).subscribe({
      next: () => {
        this.feedbackType = 'success';
        this.feedbackMessage = 'Notification deleted successfully.';
        this.refreshNotifications();
        this.cdr.detectChanges();
      },
      error: () => {
        this.feedbackType = 'error';
        this.feedbackMessage = 'Failed to delete notification.';
        this.cdr.detectChanges();
      },
    });
  }

  private isSameNotificationGroup(raw: any, item: NotificationViewItem): boolean {
    const rawType = this.normalizeType(raw?.type);
    const rawMessage = raw?.message ?? '';
    const rawActivityId = raw?.activity_id?.toString?.() ?? '';
    const rawScheduledAt = this.formatDateValue(raw?.scheduled_at);
    const rawSentAt = this.formatDateValue(raw?.sent_at);
    const rawRepeatMinutes =
      typeof raw?.repeat_intervel_minutes === 'number'
        ? raw.repeat_intervel_minutes
        : null;
    const rawRepeatUntil = this.formatDateValue(raw?.repeat_until);

    return (
      rawType === item.type &&
      rawMessage === item.message &&
      rawActivityId === (item.activityId ?? '') &&
      rawScheduledAt === item.scheduledAt &&
      rawSentAt === (item.sentAt ?? '-') &&
      rawRepeatMinutes === item.repeatIntervelMinutes &&
      rawRepeatUntil === item.repeatUntil
    );
  }

  private refreshNotifications(): void {
    if (typeof this.notificationService.getNotifications === 'function') {
      this.notificationService.getNotifications();
    }
  }

  private buildNotificationPayload(
    userId: string,
    summaryItem: NotificationViewItem,
    targetDate: Date,
    now: Date,
    sendNow: boolean
  ) {
    return {
      user_id: userId,
      activity_id: summaryItem.activityId ? summaryItem.activityId : undefined,
      type: summaryItem.type,
      message: summaryItem.message,
      is_read: false,
      is_broadcast: false,
      sent_at: now.toISOString(),
      scheduled_at: sendNow ? null : targetDate.toISOString(),
      repeat_intervel_minutes: summaryItem.repeatIntervelMinutes,
      repeat_until: summaryItem.repeatUntil
        ? new Date(summaryItem.repeatUntil).toISOString()
        : null,
      title: summaryItem.title,
      audience: summaryItem.audience,
    };
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

  private mapAndGroupNotifications(serviceData: Notification[]): NotificationViewItem[] {
    const mapped = serviceData.map((item, index) =>
      this.mapNotificationToView(item, index + 1)
    );

    return this.dedupeViewItems(mapped);
  }

  private dedupeViewItems(items: NotificationViewItem[]): NotificationViewItem[] {
    const map = new Map<string, NotificationViewItem>();

    items.forEach((item) => {
      const key = [
        item.type,
        item.message,
        item.activityId ?? '',
        item.scheduledAt,
        item.sentAt ?? '',
        item.repeatIntervelMinutes ?? '',
        item.repeatUntil ?? '',
        item.status,
      ].join('|');

      if (!map.has(key)) {
        map.set(key, item);
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const aTime = new Date(a.sentAt || a.scheduledAt).getTime();
      const bTime = new Date(b.sentAt || b.scheduledAt).getTime();
      return bTime - aTime;
    });
  }

  private mapNotificationToView(
    item: Notification,
    index: number
  ): NotificationViewItem {
    const raw = item as Notification &
      Partial<{
        id: number;
        notification_id: number;
        title: string;
        audience: AudienceType;
        activity_id: string;
        is_broadcast: boolean;
        repeat_intervel_minutes: number | null;
        repeat_until: string | Date | null;
      }>;

    const type = this.normalizeType((raw as any).type);
    const scheduledValue = (raw as any).scheduled_at;
    const sentValue = (raw as any).sent_at;
    const idValue = (raw as any).id ?? (raw as any).notification_id ?? index;
    const activityId = (raw as any).activity_id ?? '';
    const isBroadcast = Boolean((raw as any).is_broadcast);
    const backendId = (raw as any)._id?.toString?.() ?? '';

    return {
      id: Number(idValue),
      backendId,
      title: (raw as any).title?.trim()
        ? (raw as any).title
        : this.buildTitleFromType(type),
      type,
      audience: (raw as any).audience ?? (isBroadcast ? 'All' : 'Employees'),
      message: (raw as any).message ?? '',
      scheduledAt: this.formatDateValue(scheduledValue),
      sentAt: this.formatDateValue(sentValue),
      status: this.getStatusFromDates(scheduledValue),
      activityId,
      activityName: this.getActivityNameById(activityId),
      repeatIntervelMinutes:
        typeof (raw as any).repeat_intervel_minutes === 'number'
          ? (raw as any).repeat_intervel_minutes
          : null,
      repeatUntil: this.formatDateValue((raw as any).repeat_until),
    };
  }

  private getActivityNameById(activityId: string | undefined): string {
    if (!activityId) return '';

    const activity = this.activities().find(
      (item: any) => item?._id?.toString() === activityId?.toString()
    );

    return activity?.name ?? '';
  }

  private getStatusFromDates(
    scheduledAt: Date | string | undefined | null
  ): NotificationStatus {
    if (!scheduledAt) {
      return 'Sent';
    }

    const date = new Date(scheduledAt);

    if (isNaN(date.getTime())) {
      return 'Sent';
    }

    return date.getTime() > Date.now() ? 'Scheduled' : 'Sent';
  }

  private normalizeType(type: string): NotificationType {
    if (
      type === 'Registration' ||
      type === 'Cancellation' ||
      type === 'Reminder' ||
      type === 'Update' ||
      type === 'Broadcast'
    ) {
      return type;
    }

    return 'Reminder';
  }

  private buildTitleFromType(type: string): string {
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

  private formatDateValue(value: Date | string | undefined | null): string {
    if (!value) return '-';

    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString();
  }

  private getFallbackNotifications(): NotificationViewItem[] {
    return [
      {
        id: 1,
        title: 'Broadcast Message',
        type: 'Broadcast',
        audience: 'Employees',
        message: 'System sample notification.',
        scheduledAt: '-',
        sentAt: '12/3/2026, 9:00:00 AM',
        status: 'Sent',
        activityId: '',
        activityName: '',
        repeatIntervelMinutes: 60,
        repeatUntil: '12/3/2026, 6:00:00 PM',
      },
    ];
  }
}