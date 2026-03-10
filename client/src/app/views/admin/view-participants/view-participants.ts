import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

interface Participant {
  id: string;
  name: string;
  email: string;
  department: string;
}

type ApiRegistration = {
  _id?: string;
  user_id: string;
  activity_id: string;
  registered_at: Date | string;
  updated_at: Date | string;
  status: 'Registered' | 'Cancelled' | 'Attended';
};

type ApiUser = {
  _id?: string;
  name: string;
  email: string;
  department: string;
  role: 'Admin' | 'Employee';
};

const API_URL = 'http://localhost:3000';

@Component({
  selector: 'app-view-participants',
  imports: [CommonModule, RouterLink],
  templateUrl: './view-participants.html',
  styleUrl: './view-participants.css',
})
export class ViewParticipants implements OnInit {
  activityId = '';
  participants: Participant[] = [];

  constructor(
    private route: ActivatedRoute,
    private httpClient: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {
    this.activityId = this.route.snapshot.paramMap.get('activityId') ?? '';
  }

  ngOnInit(): void {
    this.loadParticipants();
  }

  private loadParticipants(): void {
    forkJoin({
      registrations: this.httpClient.get<ApiRegistration[]>(`${API_URL}/registration`),
      users: this.httpClient.get<ApiUser[]>(`${API_URL}/users`),
    }).subscribe({
      next: ({ registrations, users }) => {
        this.participants = registrations
          .filter(
            (registration) =>
              String(registration.activity_id ?? '') === this.activityId &&
              registration.status !== 'Cancelled',
          )
          .map((registration, index) => {
            const user = users.find(
              (item) => String(item._id ?? '') === String(registration.user_id ?? ''),
            );

            return {
              id: String(user?._id ?? registration._id ?? `P-${index + 1}`),
              name: user?.name ?? 'Unknown User',
              email: user?.email ?? '-',
              department: user?.department ?? '-',
            };
          });

        this.cdr.detectChanges();
      },
      error: () => {
        this.participants = [];
        this.cdr.detectChanges();
      },
    });
  }
}
