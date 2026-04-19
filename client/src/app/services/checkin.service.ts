import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Checkin } from '../models/checkin.model';

@Injectable({
  providedIn: 'root',
})
export class CheckinService {
  checkins$ = signal<Checkin[]>([]);
  checkin$ = signal<Checkin>({} as Checkin);

  constructor(private httpClient: HttpClient) {}

  private refreshCheckins(): void {
    this.httpClient.get<Checkin[]>(`/checkin`)
      .subscribe((checkins) => {
        this.checkins$.set(checkins);
      });
  }

  getCheckins(): Checkin[] {
    this.refreshCheckins();
    return this.checkins$();
  }

  getCheckin(id: string): void {
    this.httpClient.get<Checkin>(`/checkin/${id}`).subscribe((checkin) => {
      this.checkin$.set(checkin);
    });
  }

  createCheckin(user_id: string, activity_id: string) {
    return this.httpClient.post(`/checkin`, { user_id, activity_id }, { responseType: 'text' });
  }
}
