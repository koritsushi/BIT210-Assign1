import { Injectable, signal } from '@angular/core';
import { Checkin } from '../models/checkin.model';

@Injectable({
  providedIn: 'root'
})
export class CheckinService {
  private storageKey = 'bit210_checkins';

  private getDefaultCheckins(): Checkin[] {
    return [
      {
        _id: '1',
        registration_id: 'REG001',
        activity_id: 'ACT001',
        activity_name: 'Beach Cleaning',
        employee_name: 'Bin Hangyu',
        qr_code: 'CHECKIN-ACT001-BEACH-CLEANING',
        method: 'QR Code',
        status: 'Pending'
      },
      {
        _id: '2',
        registration_id: 'REG002',
        activity_id: 'ACT002',
        activity_name: 'Food Distribution',
        employee_name: 'Bin Hangyu',
        qr_code: 'CHECKIN-ACT002-FOOD-DISTRIBUTION',
        method: 'QR Code',
        status: 'Pending'
      },
      {
        _id: '3',
        registration_id: 'REG003',
        activity_id: 'ACT003',
        activity_name: 'Tree Planting',
        employee_name: 'Bin Hangyu',
        qr_code: 'CHECKIN-ACT003-TREE-PLANTING',
        method: 'QR Code',
        status: 'Pending'
      }
    ];
  }

  private loadCheckins(): Checkin[] {
    if (typeof window === 'undefined') {
      return this.getDefaultCheckins();
    }

    const raw = localStorage.getItem(this.storageKey);

    if (!raw) {
      const initialData = this.getDefaultCheckins();
      localStorage.setItem(this.storageKey, JSON.stringify(initialData));
      return initialData;
    }

    try {
      return JSON.parse(raw) as Checkin[];
    } catch {
      return this.getDefaultCheckins();
    }
  }

  private saveCheckins(data: Checkin[]) {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  checkins = signal<Checkin[]>(this.loadCheckins());

  getCheckins() {
    return this.checkins;
  }

  generateQrForActivity(activityId: string, activityName: string): string {
    const qrCode = `CHECKIN-${activityId}-${activityName.replace(/\s+/g, '-').toUpperCase()}`;

    this.checkins.update(current => {
      const exists = current.some(item => item.activity_id === activityId);

      let updated: Checkin[];

      if (exists) {
        updated = current.map(item =>
          item.activity_id === activityId
            ? { ...item, qr_code: qrCode }
            : item
        );
      } else {
        updated = [
          ...current,
          {
            _id: Date.now().toString(),
            registration_id: `REG${Date.now()}`,
            activity_id: activityId,
            activity_name: activityName,
            employee_name: 'Bin Hangyu',
            qr_code: qrCode,
            method: 'QR Code',
            status: 'Pending' as const
          }
        ];
      }

      this.saveCheckins(updated);
      return updated;
    });

    return qrCode;
  }

  checkIn(activityId: string, employeeName: string, inputCode: string) {
    const record = this.checkins().find(
      item =>
        item.activity_id === activityId &&
        item.employee_name.toLowerCase() === employeeName.toLowerCase()
    );

    if (!record) {
      return { success: false, message: 'Registration record not found.' };
    }

    if (record.status === 'Checked-In') {
      return { success: false, message: 'You have already checked in.' };
    }

    if (record.qr_code !== inputCode) {
      return { success: false, message: 'Invalid QR code.' };
    }

    this.checkins.update(current => {
      const updated: Checkin[] = current.map(item =>
        item.activity_id === activityId &&
        item.employee_name.toLowerCase() === employeeName.toLowerCase()
          ? {
              ...item,
              status: 'Checked-In' as const,
              checkin_time: new Date().toLocaleString()
            }
          : item
      );

      this.saveCheckins(updated);
      return updated;
    });

    return { success: true, message: 'Check-in successful.' };
  }

  resetCheckins() {
    const initialData = this.getDefaultCheckins();
    this.checkins.set(initialData);
    this.saveCheckins(initialData);
  }
}