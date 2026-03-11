import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { User } from '../models/user.model';
import {
  ActivityCheckInViewData,
  ActivityMeta,
  ApiActivity,
  ApiNgo,
  ApiRegistration,
  CheckInRecord,
  CheckInStatus,
} from '../models/activity-check-in.model';

const API_URL = 'http://localhost:3000';
const DELETED_ACTIVITY_IDS_KEY = 'adminDeletedActivityIds';

@Injectable({
  providedIn: 'root',
})
export class ActivityCheckInService {
  private viewDataSubject = new BehaviorSubject<ActivityCheckInViewData | null>(null);
  viewData$ = this.viewDataSubject.asObservable();

  constructor(private httpClient: HttpClient) {}

  loadCheckInData(
    selectedActivity: string,
    checkInStatusMap: Record<string, CheckInStatus>,
  ): void {
    this.httpClient.get<ApiActivity[]>(`${API_URL}/activity`).subscribe({
      next: (activities) => {
        this.httpClient.get<ApiRegistration[]>(`${API_URL}/registration`).subscribe({
          next: (registrations) => {
            this.httpClient.get<User[]>(`${API_URL}/users`).subscribe({
              next: (users) => {
                this.httpClient.get<ApiNgo[]>(`${API_URL}/ngo`).subscribe({
                  next: (ngos) => {
                    const deletedIds = this.getDeletedActivityIds();
                    const visibleActivities = activities.filter(
                      (activity) => !deletedIds.includes(String(activity._id ?? '')),
                    );
                    const visibleRegistrations = registrations.filter(
                      (registration) => !deletedIds.includes(String(registration.activity_id ?? '')),
                    );
                    const optionsData = this.buildActivityOptions(visibleActivities, ngos, selectedActivity);
                    const records = this.buildCheckInRecords(
                      visibleActivities,
                      visibleRegistrations,
                      users,
                      optionsData.activityIdMap,
                      optionsData.activityOptions,
                      checkInStatusMap,
                    );

                    this.viewDataSubject.next({
                      activityIdMap: optionsData.activityIdMap,
                      activityMeta: optionsData.activityMeta,
                      activityOptions: optionsData.activityOptions,
                      activityQrIndexMap: optionsData.activityQrIndexMap,
                      records,
                    });
                  },
                  error: () => this.viewDataSubject.next(null),
                });
              },
              error: () => this.viewDataSubject.next(null),
            });
          },
          error: () => this.viewDataSubject.next(null),
        });
      },
      error: () => this.viewDataSubject.next(null),
    });
  }

  formatDateTime(value: string | Date): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value ?? '');

    const date = parsed.toISOString().slice(0, 10);
    const time = parsed.toTimeString().slice(0, 5);
    return `${date} ${time}`;
  }

  private buildActivityOptions(
    activities: ApiActivity[],
    ngos: ApiNgo[],
    selectedActivity: string,
  ): {
    activityIdMap: Record<string, string>;
    activityMeta: Record<string, ActivityMeta>;
    activityOptions: string[];
    activityQrIndexMap: Record<string, string>;
    selectedActivity: string;
  } {
    const activityIdMap: Record<string, string> = {};
    const activityQrIndexMap: Record<string, string> = {};
    const activityMeta: Record<string, ActivityMeta> = {};
    const activityOptions = activities.map((activity) => this.toActivityName(activity, ngos));

    activities.forEach((activity, index) => {
      const name = this.toActivityName(activity, ngos);
      const id = String(activity._id ?? '').trim();
      if (name && id) activityIdMap[name] = id;
      if (name) activityQrIndexMap[name] = String(index + 1);
      if (name) {
        activityMeta[name] = {
          date: this.formatActivityDate(activity),
          location: this.resolveActivityLocation(activity, ngos),
        };
      }
    });

    return {
      activityIdMap,
      activityMeta,
      activityOptions,
      activityQrIndexMap,
      selectedActivity: !selectedActivity || !activityOptions.includes(selectedActivity)
        ? activityOptions[0] ?? ''
        : selectedActivity,
    };
  }

  private buildCheckInRecords(
    activities: ApiActivity[],
    registrations: ApiRegistration[],
    users: User[],
    activityIdMap: Record<string, string>,
    activityOptions: string[],
    checkInStatusMap: Record<string, CheckInStatus>,
  ): CheckInRecord[] {
    const activityMap = new Map<string, ApiActivity>();
    activities.forEach((activity) => activityMap.set(String(activity._id ?? ''), activity));

    const userMap = new Map<string, User>();
    users.forEach((user) => userMap.set(String(user._id ?? ''), user));

    return registrations
      .filter((registration) => registration.status !== 'Cancelled')
      .map((registration) => {
        const activity = activityMap.get(String(registration.activity_id ?? ''));
        const user = userMap.get(String(registration.user_id ?? ''));
        if (!activity || !user) return null;

        const recordId = String(registration._id ?? `${registration.activity_id}-${registration.user_id}`);
        const currentStatus = checkInStatusMap[recordId]
          ?? (registration.status === 'Attended' ? 'Attended' : 'Absent');
        checkInStatusMap[recordId] = currentStatus;

        return {
          id: recordId,
          name: user.name,
          department: user.department,
          checkInTime: this.formatDateTime(registration.updated_at || registration.registered_at),
          status: currentStatus,
          activity: activityOptions.find((name) => activityIdMap[name] === String(activity._id ?? '')) ?? 'Activity',
        };
      })
      .filter((record): record is CheckInRecord => !!record);
  }

  private toActivityName(activity: ApiActivity, ngos: ApiNgo[]): string {
    const activityName = String(activity.name ?? '').trim();
    if (activityName) return activityName;

    const ngoName = String(activity.ngo_name ?? '').trim();
    if (ngoName) return ngoName;

    const ngo = ngos.find((item) => String(item._id ?? '') === String(activity.ngo_id ?? ''));
    if (ngo?.name) return ngo.name;

    return `Activity ${String(activity._id ?? '').slice(-4)}`;
  }

  private resolveActivityLocation(activity: ApiActivity, ngos: ApiNgo[]): string {
    const location = String(activity.location ?? '').trim();
    if (location) return location;

    const ngo = ngos.find((item) => String(item._id ?? '') === String(activity.ngo_id ?? ''));
    return ngo?.location ?? 'N/A';
  }

  private formatActivityDate(activity: ApiActivity): string {
    const rawDate = String(activity.date ?? '').split('T')[0] ?? '';
    if (!rawDate) return 'N/A';
    return rawDate;
  }

  private getDeletedActivityIds(): string[] {
    const text = sessionStorage.getItem(DELETED_ACTIVITY_IDS_KEY) ?? '[]';
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }
}
