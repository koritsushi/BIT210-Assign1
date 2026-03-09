import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Activity } from '../models/activity.model';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private activitiesSubject = new BehaviorSubject<Activity[]>([
    {
      _id: 'A001',
      ngo_id: 'NGO001',
      ngo_name: 'Green Earth',
      location: 'Port Klang Beach',
      description: 'Beach cleaning activity',
      date: '2026-03-20',
      start_time: '09:00',
      end_time: '12:00',
      max_slots: 12,
      slots_taken: 0,
      cutoff_datetime: '2026-03-18T18:00',
      status: 'Open',
      qr_code: 'QR-A001',
    },
    {
      _id: 'A002',
      ngo_id: 'NGO002',
      ngo_name: 'Food Bank',
      location: 'PJ Community Center',
      description: 'Food packing activity',
      date: '2026-03-22',
      start_time: '09:00',
      end_time: '13:00',
      max_slots: 18,
      slots_taken: 0,
      cutoff_datetime: '2026-03-21T12:00',
      status: 'Open',
      qr_code: 'QR-A002',
    },
  ]);

  activities$ = this.activitiesSubject.asObservable();

  getCurrentActivities(): Activity[] {
    return this.activitiesSubject.value;
  }

  addActivity(activity: Activity) {
    const current = this.activitiesSubject.value;

    const newActivity: Activity = {
      ...activity,
      _id: 'A' + Date.now(),
      slots_taken: activity.slots_taken ?? 0,
    };

    this.activitiesSubject.next([...current, newActivity]);
  }

  updateActivity(updatedActivity: Activity) {
    const current = this.activitiesSubject.value;

    const updatedList = current.map((activity) =>
      activity._id === updatedActivity._id ? updatedActivity : activity,
    );

    this.activitiesSubject.next(updatedList);
  }

  deleteActivity(id: string) {
    const current = this.activitiesSubject.value;
    const filtered = current.filter((activity) => activity._id !== id);
    this.activitiesSubject.next(filtered);
  }
}
