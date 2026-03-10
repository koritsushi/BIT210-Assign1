import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Activity } from '../models/activity.model';

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private readonly storageKey = 'bit210_activities_v1';
  private memoryActivities: Activity[] = [];
  private readonly seedActivities: Activity[] = [
    {
      _id: '1',
      ngo_id: '507f1f77bcf86cd799439011',
      ngo_name: 'Beach Cleaning',
      location: 'Port Klang Beach',
      description: 'Collect plastic waste and sort recyclables.',
      date: '2026-03-20',
      start_time: 1742432400000,
      end_time: 1742443200000,
      max_slots: 20,
      slots_taken: 5,
      cutoff_datetime: '2026-03-18T18:00',
      status: 'Open',
      qr_code: '1',
      participant_user_ids: ['U001', 'U002', 'U003', 'U004', 'U005'],
    },
    {
      _id: '2',
      ngo_id: '507f1f77bcf86cd799439012',
      ngo_name: 'Food Bank Packing',
      location: 'PJ Community Center',
      description: 'Pack and label food packs for families.',
      date: '2026-03-22',
      start_time: 1742605200000,
      end_time: 1742619600000,
      max_slots: 18,
      slots_taken: 10,
      cutoff_datetime: '2026-03-21T12:00',
      status: 'Open',
      qr_code: '2',
      participant_user_ids: ['U001', 'U002', 'U003', 'U004', 'U005', 'U006', 'U007', 'U008', 'U009', 'U010'],
    },
    {
      _id: '3',
      ngo_id: '507f1f77bcf86cd799439013',
      ngo_name: 'Campus Tree Planting',
      location: 'Subang Campus',
      description: 'Plant native trees around campus.',
      date: '2026-03-28',
      start_time: 1743123600000,
      end_time: 1743134400000,
      max_slots: 25,
      slots_taken: 6,
      cutoff_datetime: '2026-03-26T20:00',
      status: 'Open',
      qr_code: '3',
      participant_user_ids: ['U001', 'U002', 'U003', 'U004', 'U005', 'U006'],
    },
    {
      _id: '4',
      ngo_id: '507f1f77bcf86cd799439014',
      ngo_name: 'Senior Center Visit',
      location: 'SS15 Senior Home',
      description: 'Run light activities and companionship.',
      date: '2026-04-02',
      start_time: 1743552000000,
      end_time: 1743562800000,
      max_slots: 12,
      slots_taken: 10,
      cutoff_datetime: '2026-03-31T18:00',
      status: 'Open',
      qr_code: '4',
      participant_user_ids: ['U001', 'U002', 'U003', 'U004', 'U005', 'U006', 'U007', 'U008', 'U009', 'U010'],
    },
    {
      _id: '5',
      ngo_id: '507f1f77bcf86cd799439015',
      ngo_name: 'Donation Sorting',
      location: 'Shah Alam Warehouse',
      description: 'Sort and pack donated clothes and books.',
      date: '2026-04-05',
      start_time: 1743811200000,
      end_time: 1743822000000,
      max_slots: 15,
      slots_taken: 3,
      cutoff_datetime: '2026-04-03T21:00',
      status: 'Open',
      qr_code: '5',
      participant_user_ids: ['U001', 'U002', 'U003'],
    },
  ];

  constructor() {
    this.ensureSeedData();
  }

  getActivities(): Observable<Activity[]> {
    return of(this.readActivities());
  }

  getActivity(id: string): Observable<Activity> {
    const activity = this.readActivities().find((a) => String(a._id) === id);
    return of(activity as Activity);
  }

  createActivity(activity: Activity): Observable<string> {
    const current = this.readActivities();
    const record = this.normalizeActivity({
      ...activity,
      _id: String(activity._id),
    });
    current.push(record);
    this.writeActivities(current);
    return of(`Created activity: ${record._id}`);
  }

  updateActivity(id: string, activity: Activity): Observable<string> {
    const current = this.readActivities();
    const index = current.findIndex((a) => String(a._id) === id);
    if (index === -1) return of(`Activity not found: ${id}`);

    current[index] = this.normalizeActivity({
      ...current[index],
      ...activity,
      _id: id,
    });
    this.writeActivities(current);
    return of(`Updated activity: ${id}`);
  }

  deleteActivity(id: string): Observable<string> {
    const current = this.readActivities();
    const next = current.filter((a) => String(a._id) !== id);
    this.writeActivities(next);
    return of(`Deleted activity: ${id}`);
  }

  private ensureSeedData(): void {
    const existing = this.readActivities();
    if (existing.length > 0) return;
    this.writeActivities(this.seedActivities.map((a) => this.normalizeActivity(a)));
  }

  private readActivities(): Activity[] {
    const storage = this.getStorage();
    if (!storage) return this.memoryActivities.map((a) => this.normalizeActivity(a));

    const raw = storage.getItem(this.storageKey);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as Activity[];
      if (!Array.isArray(parsed)) return [];
      const normalized = parsed.map((a) => this.normalizeActivity(a));
      if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
        this.writeActivities(normalized);
      }
      return normalized;
    } catch {
      return [];
    }
  }

  private writeActivities(activities: Activity[]): void {
    const storage = this.getStorage();
    if (!storage) {
      this.memoryActivities = [...activities];
      return;
    }
    storage.setItem(this.storageKey, JSON.stringify(activities));
  }

  private generateId(): string {
    return Date.now().toString();
  }

  private getStorage(): Storage | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  }

  private normalizeActivity(activity: Activity): Activity {
    const offered = Math.min(10, Math.max(1, Number(activity.max_slots ?? 1)));
    const taken = Math.min(Math.max(0, Number(activity.slots_taken ?? 0)), offered);
    const participantIds = (activity.participant_user_ids ?? []).slice(0, offered);

    let status = activity.status;
    if (status !== 'Closed') {
      status = taken >= offered ? 'Full' : 'Open';
    }

    return {
      ...activity,
      _id: String(activity._id),
      max_slots: offered,
      slots_taken: taken,
      status,
      participant_user_ids: participantIds,
    };
  }
}
