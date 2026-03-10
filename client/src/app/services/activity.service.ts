import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Activity } from '../models/activity.model';

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  //private url = 'http://localhost:3000';
   private url = '';
  activities$ = signal<Activity[]>([]);
  activity$ = signal<Activity>({} as Activity);
  
  constructor(private httpClient: HttpClient) { }

  private refreshActivities() {
    this.httpClient.get<Activity[]>(`${this.url}/activity`)
      .subscribe(activities => {
        this.activities$.set(activities);
      });
  }

  getActivities() {
    this.refreshActivities();
    return this.activities$();
  }

  getActivity(id: string) {
    this.httpClient.get<Activity>(`${this.url}/activity/${id}`).subscribe(activity => {
      this.activity$.set(activity);
      return this.activity$();
    });
  }

  createActivity(activity: Activity) {
    return this.httpClient.post(`${this.url}/activity`, activity, { responseType: 'text' });
  }

  updateActivity(id: string, activity: Activity) {
    return this.httpClient.put(`${this.url}/activity/${id}`, activity, { responseType: 'text' });
  }

  deleteActivity(id: string) {
    return this.httpClient.delete(`${this.url}/activity/${id}`, { responseType: 'text' });
  }
}