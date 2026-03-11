import { Injectable } from '@angular/core';
import { Activity } from '../models/activity.model';
import { ActivityMeta, CheckInRecord, CheckInStatus } from '../models/checkin.model';
import { Ngo } from '../models/ngo.model';
import { Registration } from '../models/registration.model';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class CheckinService {
  getActivityOptions(activities: Activity[], ngos: Ngo[]): string[] {
    return [...new Set(activities.map((activity) => this.getActivityName(activity, ngos)))];
  }

  buildRecords(
    activities: Activity[],
    registrations: Registration[],
    users: User[],
    ngos: Ngo[],
    checkInStatusMap: Record<string, CheckInStatus>,
    checkInTimeMap: Record<string, string>,
  ): CheckInRecord[] {
    const activityMap = new Map<string, Activity>();
    activities.forEach((activity) => activityMap.set(this.getActivityId(activity), activity));

    const userMap = new Map<string, User>();
    users.forEach((user) => userMap.set(this.toText(user._id), user));

    return registrations
      .filter((registration) => registration.status !== 'Cancelled')
      .map((registration) => {
        const activity = activityMap.get(this.toText(registration.activity_id));
        const user = userMap.get(this.toText(registration.user_id));
        if (!activity || !user) return null;

        const recordId = this.getRecordId(registration);
        const status = checkInStatusMap[recordId]
          ?? (registration.status === 'Attended' ? 'Attended' : 'Absent');

        return {
          id: recordId,
          name: user.name,
          department: user.department,
          checkInTime: checkInTimeMap[recordId] ?? this.formatDateTime(registration.updated_at || registration.registered_at),
          status,
          activity: this.getActivityName(activity, ngos),
        };
      })
      .filter((record): record is CheckInRecord => !!record);
  }

  getActivityMeta(activityName: string, activities: Activity[], ngos: Ngo[]): ActivityMeta {
    const activity = activities.find((item) => this.getActivityName(item, ngos) === activityName);
    if (!activity) {
      return { date: 'N/A', location: 'N/A' };
    }

    return {
      date: this.toDateOnly(activity.date),
      location: this.getActivityLocation(activity, ngos),
    };
  }

  getQrCodeNumber(activityName: string, activityOptions: string[]): string {
    if (!activityName) return '-';
    const index = activityOptions.findIndex((item) => item === activityName);
    return index >= 0 ? String(index + 1) : '-';
  }

  findRegistration(registrations: Registration[], recordId: string): Registration | undefined {
    return registrations.find((registration) => this.getRecordId(registration) === recordId);
  }

  createStatusUpdatePayload(registration: Registration, status: CheckInStatus): Registration {
    return {
      ...registration,
      updated_at: new Date().toISOString(),
      status: status === 'Attended' ? 'Attended' : 'Registered',
    };
  }

  formatDateTime(value: string | Date): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return this.toText(value);

    const date = parsed.toISOString().slice(0, 10);
    const time = parsed.toTimeString().slice(0, 5);
    return `${date} ${time}`;
  }

  getActivityName(activity: Activity, ngos: Ngo[]): string {
    const activityName = this.toText(activity.name);
    if (activityName) return activityName;

    const ngoName = this.toText(activity.ngo_name);
    if (ngoName) return ngoName;

    const ngo = this.getNgo(activity.ngo_id, ngos);
    if (ngo?.name) return ngo.name;

    return `Activity ${this.getActivityId(activity).slice(-4)}`;
  }

  getActivityId(activity: Activity): string {
    return this.toText(activity._id);
  }

  private getActivityLocation(activity: Activity, ngos: Ngo[]): string {
    const location = this.toText(activity.location);
    if (location) return location;

    return this.getNgo(activity.ngo_id, ngos)?.location ?? 'N/A';
  }

  private getNgo(ngoId: string, ngos: Ngo[]): Ngo | undefined {
    const targetId = this.toText(ngoId);
    return ngos.find((ngo) => this.toText(ngo._id) === targetId);
  }

  private getRecordId(registration: Registration): string {
    return this.toText(registration._id) || `${registration.activity_id}-${registration.user_id}`;
  }

  private toDateOnly(value: string | Date): string {
    return this.toText(value).replaceAll('/', '-').split('T')[0] ?? 'N/A';
  }

  private toText(value: unknown): string {
    return String(value ?? '').trim();
  }
}
