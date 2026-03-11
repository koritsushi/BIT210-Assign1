import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CheckInRecord,
  CheckInStatus,
} from '../../../models/activity-check-in.model';
import { ActivityCheckInService } from '../../../services/activity-check-in.service';

@Component({
  selector: 'app-activity-check-in',
  imports: [CommonModule, FormsModule],
  templateUrl: './activity-check-in.html',
  styleUrl: './activity-check-in.css',
})
export class ActivityCheckIn implements OnInit {
  readonly selectedActivity = signal('');
  readonly generatedActivityId = signal<string | null>(null);
  readonly generatedActivityName = signal<string | null>(null);
  readonly records = signal<CheckInRecord[]>([]);
  readonly showReport = signal(false);
  readonly activityOptions = computed(
    () => this.activityCheckInService.viewData()?.activityOptions ?? [],
  );
  readonly filteredRecords = computed(
    () => this.activityCheckInService.filterRecords(this.records(), this.selectedActivity()),
  );
  readonly attendanceSummary = computed(
    () => this.activityCheckInService.calculateAttendanceSummary(this.filteredRecords()),
  );
  readonly reportActivityName = computed(
    () => this.selectedActivity() || 'All Activities',
  );
  readonly reportDate = computed(
    () => this.activityMeta()[this.reportActivityName()]?.date ?? 'N/A',
  );
  readonly reportLocation = computed(
    () => this.activityMeta()[this.reportActivityName()]?.location ?? 'N/A',
  );
  readonly qrCodeNumber = computed(() => {
    const activityName = this.generatedActivityName();
    if (!activityName) return '-';
    return this.activityQrIndexMap()[activityName] ?? '-';
  });
  readonly qrImageUrl = computed(
    () => this.activityCheckInService.resolveQrImageUrl(this.qrCodeNumber()),
  );
  readonly hasQrImage = computed(() => this.qrImageUrl() !== '');
  readonly qrActivityName = computed(
    () => this.generatedActivityName() ?? this.selectedActivity(),
  );

  private readonly activityMeta = signal<Record<string, { date: string; location: string }>>({});
  private readonly activityIdMap = signal<Record<string, string>>({});
  private readonly activityQrIndexMap = signal<Record<string, string>>({});
  private readonly checkInStatusMap: Record<string, CheckInStatus> = {};

  constructor(private activityCheckInService: ActivityCheckInService) {
    effect(() => {
      const data = this.activityCheckInService.viewData();
      if (!data) {
        this.activityMeta.set({});
        this.activityIdMap.set({});
        this.activityQrIndexMap.set({});
        this.records.set([]);
        return;
      }

      this.activityMeta.set(data.activityMeta);
      this.activityIdMap.set(data.activityIdMap);
      this.activityQrIndexMap.set(data.activityQrIndexMap);
      this.records.set(data.records);

      const selectedActivity = this.selectedActivity();
      if (!selectedActivity || !data.activityOptions.includes(selectedActivity)) {
        this.selectedActivity.set(data.activityOptions[0] ?? '');
      }
    });
  }

  ngOnInit(): void {
    this.activityCheckInService.loadCheckInData(this.selectedActivity(), this.checkInStatusMap);
  }

  generateReport(): void {
    this.showReport.set(true);
  }

  generateQrCode(): void {
    const qrData = this.activityCheckInService.resolveQrData(
      this.selectedActivity(),
      this.activityIdMap(),
      this.activityQrIndexMap(),
    );
    this.generatedActivityId.set(qrData.generatedActivityId);
    this.generatedActivityName.set(qrData.generatedActivityName);
  }

  onStatusChange(recordId: string, status: CheckInStatus): void {
    const previousRecords = this.records();
    this.checkInStatusMap[recordId] = status;
    this.records.set(this.activityCheckInService.updateRecordStatus(previousRecords, recordId, status));

    this.activityCheckInService.persistCheckInStatus(recordId, status).subscribe({
      error: () => {
        delete this.checkInStatusMap[recordId];
        this.records.set(previousRecords);
      },
    });
  }
}
