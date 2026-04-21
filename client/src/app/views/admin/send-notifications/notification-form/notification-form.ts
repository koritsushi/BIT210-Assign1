import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

type NotificationType = 'Registration' | 'Cancellation' | 'Reminder' | 'Update' | 'Broadcast';

export interface NotificationFormValue {
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
  selector: 'app-notification-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-form.html',
  styleUrl: './notification-form.css',
})
export class NotificationFormComponent {
  // --- Inputs from parent ---
  @Input() title = '';
  @Input() type: NotificationType = 'Reminder';
  @Input() selectedActivityId = '';
  @Input() message = '';
  @Input() scheduledAt = '';
  @Input() repeatIntervalMinutes: number | null = null;  // ✅ fixed spelling
  @Input() repeatUntil = '';
  @Input() isBroadcastMode = false;
  @Input() activities: any[] = [];
  @Input() enableScheduleTime = false;
  @Input() enableIntervalTime = false;

  // --- Outputs to parent ---
  @Output() formChange = new EventEmitter<NotificationFormValue>();
  @Output() formAction = new EventEmitter<'sendNow' | 'schedule' | 'clear'>();
  @Output() modeChange = new EventEmitter<'standard' | 'broadcast'>();
  @Output() typeChangeEvent = new EventEmitter<string>();

  // --- Emit current form state to parent ---
  emitFormChange(): void {
    this.formChange.emit({
      title: this.title,
      type: this.type,
      selectedActivityId: this.selectedActivityId,
      message: this.message,
      scheduledAt: this.scheduledAt,
      repeatIntervalMinutes: this.repeatIntervalMinutes,
      repeatUntil: this.repeatUntil,
      enableScheduleTime: this.enableScheduleTime,
      enableIntervalTime: this.enableIntervalTime,
    });
  }

  // --- Mode switches ---
  setStandardMode(): void  { this.modeChange.emit('standard'); }
  setBroadcastMode(): void { this.modeChange.emit('broadcast'); }

  // --- Type change ---
  onTypeChange(): void {
    this.typeChangeEvent.emit(this.type);
    this.emitFormChange();
  }

  // --- Toggle handlers ---
  onScheduleToggle(): void {
    if (!this.enableScheduleTime) this.scheduledAt = '';
    this.emitFormChange();
  }

  onIntervalToggle(): void {
    if (!this.enableIntervalTime) {
      this.repeatIntervalMinutes = null;
      this.repeatUntil = '';
    }
    this.emitFormChange();
  }

  // --- Actions ---
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