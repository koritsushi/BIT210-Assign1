import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

type NotificationType =
  | 'Registration'
  | 'Cancellation'
  | 'Reminder'
  | 'Update'
  | 'Broadcast';

type AudienceType = 'Employees' | 'NGOs' | 'All';

@Component({
  selector: 'app-notification-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-form.html',
  styleUrl: './notification-form.css',
})
export class NotificationFormComponent {
  @Input() title = '';
  @Input() type: NotificationType = 'Reminder';
  @Input() audience: AudienceType = 'Employees';
  @Input() selectedActivityId = '';
  @Input() message = '';
  @Input() scheduledAt = '';
  @Input() repeatIntervelMinutes: number | null = null;
  @Input() repeatUntil = '';
  @Input() isBroadcastMode = false;
  @Input() activities: any[] = [];

  @Input() enableScheduleTime = false;
  @Input() enableIntervalTime = false;

  @Output() formChange = new EventEmitter<{
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
  }>();

  @Output() formAction = new EventEmitter<'sendNow' | 'schedule' | 'clear'>();
  @Output() modeChange = new EventEmitter<'standard' | 'broadcast'>();
  @Output() typeChangeEvent = new EventEmitter<string>();

  emitFormChange(): void {
    this.formChange.emit({
      title: this.title,
      type: this.type,
      audience: this.audience,
      selectedActivityId: this.selectedActivityId,
      message: this.message,
      scheduledAt: this.scheduledAt,
      repeatIntervelMinutes: this.repeatIntervelMinutes,
      repeatUntil: this.repeatUntil,
      enableScheduleTime: this.enableScheduleTime,
      enableIntervalTime: this.enableIntervalTime,
    });
  }

  setStandardMode(): void {
    this.modeChange.emit('standard');
  }

  setBroadcastMode(): void {
    this.modeChange.emit('broadcast');
  }

  onTypeChange(): void {
    this.typeChangeEvent.emit(this.type);
    this.emitFormChange();
  }

  onScheduleToggle(): void {
    if (!this.enableScheduleTime) {
      this.scheduledAt = '';
    }
    this.emitFormChange();
  }

  onIntervalToggle(): void {
    if (!this.enableIntervalTime) {
      this.repeatIntervelMinutes = null;
      this.repeatUntil = '';
    }
    this.emitFormChange();
  }

  sendNow(): void {
    this.emitFormChange();
    this.formAction.emit('sendNow');
  }

  schedule(): void {
    this.emitFormChange();
    this.formAction.emit('schedule');
  }

  clear(): void {
    this.formAction.emit('clear');
  }
}