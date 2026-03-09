import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckinService } from '../../../services/checkin.service';

@Component({
  selector: 'app-monitor-participation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './monitor-participation.html',
  styleUrl: './monitor-participation.css',
})
export class MonitorParticipation {
  private checkinService = inject(CheckinService);

  checkins = this.checkinService.getCheckins();
}