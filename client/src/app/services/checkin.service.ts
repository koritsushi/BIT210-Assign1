import { Injectable, signal } from '@angular/core';
import { CheckInRecord } from '../models/checkin.model';

@Injectable({
  providedIn: 'root',
})
export class CheckinService {
  private readonly activityQrMap: Record<string, string> = {
    'Beach Cleaning': 'ACTIVITY|Beach Cleaning',
    'Tree Planting': 'ACTIVITY|Tree Planting',
    'Food Distribution': 'ACTIVITY|Food Distribution',
    'Animal Shelter Support': 'ACTIVITY|Animal Shelter Support',
  };

  private readonly availableActivities = Object.keys(this.activityQrMap);

  private selectedAdminActivity = signal<string>('Beach Cleaning');

  private checkins = signal<CheckInRecord[]>([
    {
      id: 1,
      employeeName: 'Alice Tan',
      activityName: 'Beach Cleaning',
      activityQrValue: 'ACTIVITY|Beach Cleaning',
      checkInTime: '',
      status: 'Pending',
    },
    {
      id: 2,
      employeeName: 'John Lee',
      activityName: 'Tree Planting',
      activityQrValue: 'ACTIVITY|Tree Planting',
      checkInTime: '',
      status: 'Pending',
    },
    {
      id: 3,
      employeeName: 'Siti Aminah',
      activityName: 'Food Distribution',
      activityQrValue: 'ACTIVITY|Food Distribution',
      checkInTime: '',
      status: 'Pending',
    },
    {
      id: 4,
      employeeName: 'Daniel Wong',
      activityName: 'Animal Shelter Support',
      activityQrValue: 'ACTIVITY|Animal Shelter Support',
      checkInTime: '',
      status: 'Pending',
    },
  ]);

  getActivities(): string[] {
    return this.availableActivities;
  }

  getQrValueForActivity(activityName: string): string {
    return this.activityQrMap[activityName] ?? '';
  }

  getActivityByQrValue(qrValue: string): string | null {
    const cleanValue = qrValue.trim();

    const entry = Object.entries(this.activityQrMap).find(
      ([, value]) => value === cleanValue
    );

    return entry ? entry[0] : null;
  }

  getSelectedAdminActivity(): string {
    return this.selectedAdminActivity();
  }

  setSelectedAdminActivity(activityName: string): void {
    if (this.availableActivities.includes(activityName)) {
      this.selectedAdminActivity.set(activityName);
    }
  }

  getCheckinsSignal() {
    return this.checkins;
  }

  getAllCheckins(): CheckInRecord[] {
    return this.checkins();
  }

  getCheckinSummary() {
    const list = this.checkins();
    const total = list.length;
    const present = list.filter((item) => item.status === 'Present').length;
    const pending = list.filter((item) => item.status === 'Pending').length;
    const attendanceRate = total === 0 ? 0 : Math.round((present / total) * 100);

    return {
      total,
      present,
      pending,
      attendanceRate,
    };
  }

  getActivityReport() {
    const list = this.checkins();

    return this.availableActivities.map((activityName) => {
      const activityList = list.filter((item) => item.activityName === activityName);
      const total = activityList.length;
      const present = activityList.filter((item) => item.status === 'Present').length;
      const pending = activityList.filter((item) => item.status === 'Pending').length;

      return {
        activityName,
        total,
        present,
        pending,
      };
    });
  }

  getSelectedActivitySummary(activityName: string) {
    const list = this.checkins().filter((item) => item.activityName === activityName);
    const total = list.length;
    const present = list.filter((item) => item.status === 'Present').length;
    const pending = list.filter((item) => item.status === 'Pending').length;
    const attendanceRate = total === 0 ? 0 : Math.round((present / total) * 100);

    return {
      total,
      present,
      pending,
      attendanceRate,
    };
  }

  findEmployeeRecordByNameAndQr(
    employeeName: string,
    qrValue: string
  ): CheckInRecord | undefined {
    const activityName = this.getActivityByQrValue(qrValue);

    if (!activityName) {
      return undefined;
    }

    return this.checkins().find(
      (item) =>
        item.employeeName.toLowerCase() === employeeName.trim().toLowerCase() &&
        item.activityName === activityName
    );
  }

  validateCheckInInput(
    employeeName: string,
    scannedQrValue: string
  ): {
    valid: boolean;
    message: string;
    activityName?: string;
    record?: CheckInRecord;
  } {
    if (!employeeName.trim()) {
      return {
        valid: false,
        message: 'Please enter employee name.',
      };
    }

    if (!scannedQrValue.trim()) {
      return {
        valid: false,
        message: 'Please enter the scanned QR value.',
      };
    }

    const activityName = this.getActivityByQrValue(scannedQrValue);

    if (!activityName) {
      return {
        valid: false,
        message: 'Invalid QR code. No matching activity was found.',
      };
    }

    const record = this.findEmployeeRecordByNameAndQr(employeeName, scannedQrValue);

    if (!record) {
      return {
        valid: false,
        message: 'No matching employee registration was found for this QR code.',
        activityName,
      };
    }

    if (record.status === 'Present') {
      return {
        valid: false,
        message: 'This employee has already checked in.',
        activityName,
        record,
      };
    }

    return {
      valid: true,
      message: 'Valid registration found. Ready to check in.',
      activityName,
      record,
    };
  }

  checkInEmployeeByQr(
    employeeName: string,
    scannedQrValue: string
  ): { success: boolean; message: string; activityName?: string } {
    const validation = this.validateCheckInInput(employeeName, scannedQrValue);

    if (!validation.valid) {
      return {
        success: false,
        message: validation.message,
        activityName: validation.activityName,
      };
    }

    const activityName = validation.activityName!;
    const current = this.checkins();

    const index = current.findIndex(
      (item) =>
        item.employeeName.toLowerCase() === employeeName.trim().toLowerCase() &&
        item.activityName === activityName
    );

    if (index === -1) {
      return {
        success: false,
        message: 'No matching employee registration was found for this QR code.',
        activityName,
      };
    }

    const updated = [...current];
    updated[index] = {
      ...updated[index],
      checkInTime: new Date().toLocaleString(),
      status: 'Present',
      activityQrValue: scannedQrValue.trim(),
    };

    this.checkins.set(updated);

    return {
      success: true,
      message: 'Check-in successful. Arrival time has been recorded.',
      activityName,
    };
  }
}