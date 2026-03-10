import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.services';
import { CheckinService } from '../../../services/checkin.service';
import { CheckInRecord } from '../../../models/checkin.model';

@Component({
  selector: 'app-check-in',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './check-in.html',
  styleUrl: './check-in.css',
})
export class CheckIn implements OnInit {
  employeeName = '';
  scannedQrValue = '';
  previewActivityName = '';

  feedbackMessage = '';
  feedbackType: 'success' | 'error' = 'success';

  matchedRecord?: CheckInRecord;
  validationMessage = '';
  validationType: 'valid' | 'invalid' | '' = '';

  constructor(
    private checkinService: CheckinService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.employeeName = this.auth.getName() || 'Alice Tan';
    this.refreshPreview();
  }

  private showFeedback(message: string, type: 'success' | 'error'): void {
    this.feedbackMessage = message;
    this.feedbackType = type;

    setTimeout(() => {
      this.feedbackMessage = '';
    }, 3000);
  }

  refreshPreview(): void {
    this.scannedQrValue = this.scannedQrValue.trimStart();

    this.previewActivityName =
      this.checkinService.getActivityByQrValue(this.scannedQrValue) || '';

    this.matchedRecord = this.checkinService.findEmployeeRecordByNameAndQr(
      this.employeeName,
      this.scannedQrValue
    );

    const validation = this.checkinService.validateCheckInInput(
      this.employeeName,
      this.scannedQrValue
    );

    if (!this.employeeName.trim() && !this.scannedQrValue.trim()) {
      this.validationMessage = '';
      this.validationType = '';
    } else if (validation.valid) {
      this.validationMessage = validation.message;
      this.validationType = 'valid';
    } else {
      this.validationMessage = validation.message;
      this.validationType = 'invalid';
    }

    this.feedbackMessage = '';
  }

  submitCheckIn(): void {
    this.scannedQrValue = this.scannedQrValue.trim();

    const result = this.checkinService.checkInEmployeeByQr(
      this.employeeName,
      this.scannedQrValue
    );

    this.showFeedback(result.message, result.success ? 'success' : 'error');

    this.previewActivityName =
      result.activityName ||
      this.checkinService.getActivityByQrValue(this.scannedQrValue) ||
      '';

    this.matchedRecord = this.checkinService.findEmployeeRecordByNameAndQr(
      this.employeeName,
      this.scannedQrValue
    );

    this.refreshPreview();
  }

  get alreadyCheckedIn(): boolean {
    return this.matchedRecord?.status === 'Present';
  }

  get canSubmit(): boolean {
    const validation = this.checkinService.validateCheckInInput(
      this.employeeName,
      this.scannedQrValue
    );

    return validation.valid;
  }
}