import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface Participant {
  id: string;
  name: string;
  email: string;
  department: string;
}

@Component({
  selector: 'app-view-participants',
  imports: [CommonModule, RouterLink],
  templateUrl: './view-participants.html',
  styleUrl: './view-participants.css',
})
export class ViewParticipants {
  activityId = '';
  participants: Participant[] = [
    { id: 'P-001', name: 'Alice Tan', email: 'alice.tan@company.com', department: 'HR' },
    { id: 'P-002', name: 'John Lim', email: 'john.lim@company.com', department: 'IT' },
    { id: 'P-003', name: 'Siti Rahman', email: 'siti.rahman@company.com', department: 'Finance' },
  ];

  constructor(private route: ActivatedRoute) {
    this.activityId = this.route.snapshot.paramMap.get('activityId') ?? '';
  }
}
