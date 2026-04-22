import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { QRCodeComponent } from 'angularx-qrcode';
import { ActivityMeta } from '../../../models/checkin.model';
import { Activity } from '../../../models/activity.model';
import { Ngo } from '../../../models/ngo.model';
import { Registration } from '../../../models/registration.model';
import { User } from '../../../models/user.model';
import { ActivityService } from '../../../services/activity.service';
import { NgoService } from '../../../services/ngo.service';
import { RegistrationService } from '../../../services/registration.servicce';
import { UserService } from '../../../services/user.service';

type AdminCheckInStatus = 'Attended' | '-';

interface AdminCheckInRecord {
  id: string;
  name: string;
  department: string;
  checkInTime: string;
  status: AdminCheckInStatus;
  activity: string;
  activityId: string;
}

export interface ActivityOption {
  id: string;
  label: string;
}

@Component({
  selector: 'app-activity-check-in',
  imports: [CommonModule, QRCodeComponent],
  templateUrl: './activity-check-in.html',
  styleUrl: './activity-check-in.css',
})
export class ActivityCheckIn implements OnInit, OnDestroy {
  private activityService = inject(ActivityService);
  private registrationService = inject(RegistrationService);
  private userService = inject(UserService);
  private ngoService = inject(NgoService);

  // Observables for activities, registrations, users, and NGOs
  activities = this.activityService.activities$;
  registrations = this.registrationService.registrations$;
  users = this.userService.users$;
  ngos = this.ngoService.ngos$;

  // State for selected activity and report visibility
  selectedActivityId = '';
  showReport = false;
  generatedQrText = '';
  private refreshTimer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.loadData();
    this.startPolling();
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  get activityOptions(): ActivityOption[] {
    return getActivityOptions(this.activities(), this.ngos());
  }

  get records(): AdminCheckInRecord[] {
    return buildRecords(
      this.activities(),
      this.registrations(),
      this.users(),
      this.ngos(),
    );
  }

  get filteredRecords(): AdminCheckInRecord[] {
    const currentActivityId = this.currentActivityId;
    if (!currentActivityId) return this.records;
    return this.records.filter((record) => record.activityId === currentActivityId);
  }

  get currentActivitySelection(): string {
    return this.activityOptions.find((activity) => activity.id === this.currentActivityId)?.label || '';
  }

  get currentActivity(): Activity | undefined {
    const currentActivityId = this.currentActivityId;
    return this.activities().find((activity) => getActivityId(activity) === currentActivityId);
  }

  get currentActivityId(): string {
    return resolveSelectedActivityId(this.selectedActivityId, this.activityOptions);
  }

  get hasGeneratedQr(): boolean {
    return this.generatedQrText.trim() !== '';
  }

  generateReport(): void {
    this.showReport = true;
  }

  selectActivity(activityId: string): void {
    if (this.selectedActivityId !== activityId) {
      this.showReport = false;
    }
    this.selectedActivityId = activityId;
    this.generatedQrText = '';
  }

  get reportActivityName(): string {
    return this.currentActivitySelection || 'All Activities';
  }

  // report header getters
  get reportDate(): string {
    return getActivityMeta(this.currentActivityId, this.activities(), this.ngos()).date;
  }

  get reportLocation(): string {
    return getActivityMeta(this.currentActivityId, this.activities(), this.ngos()).location;
  }

  // report content getters
  get totalEmployees(): number {
    return this.filteredRecords.length;
  }

  get attendedCount(): number {
    return this.filteredRecords.filter((record) => record.status === 'Attended').length;
  }

  get absentCount(): number {
    return this.filteredRecords.filter((record) => record.status === '-').length;
  }

  get attendanceRate(): number {
    if (!this.filteredRecords.length) return 0;
    return Math.round((this.attendedCount / this.filteredRecords.length) * 100);
  }
  generateQrCode(): void {
    const activity = this.currentActivity;
    if (!activity) {
      this.generatedQrText = '';
      return;
    }

    this.generatedQrText = JSON.stringify(buildQrPayload(activity, this.ngos()));
  }

  private loadData(): void { // Load check-in list data for the component
    this.activityService.getActivities();
    this.userService.getUsers();
    this.ngoService.getNgos();
    this.refreshDynamicData();
  }

  private refreshDynamicData(): void {
    this.registrationService.getRegistrations();
  }

  private startPolling(): void {
    this.refreshTimer = setInterval(() => {
      this.refreshDynamicData();
    }, 4000);
  }
}

// ---------------------------------------------------------------------------
// component helpers

export function getActivityOptions(activities: Activity[], ngos: Ngo[]): ActivityOption[] {
    const baseLabels = activities.map((activity) => buildActivityOptionBaseLabel(activity, ngos));
    const labelCounts = new Map<string, number>();

    baseLabels.forEach((label) => {
      labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
    });

    return activities.map((activity, index) => {
      const id = getActivityId(activity);
      const baseLabel = baseLabels[index];
      const label = (labelCounts.get(baseLabel) ?? 0) > 1
        ? `${baseLabel} [${id.slice(-4) || String(index + 1)}]`
        : baseLabel;

      return { id, label };
    });
}

export function resolveSelectedActivityId(selectedActivityId: string, options: ActivityOption[]): string {
    if (selectedActivityId && options.some((option) => option.id === selectedActivityId)) {
      return selectedActivityId;
    }

    return options[0]?.id || '';
}

export function buildRecords(
    activities: Activity[],
    registrations: Registration[],
    users: User[],
    ngos: Ngo[],
): AdminCheckInRecord[] {
    const activityMap = new Map<string, Activity>();
    activities.forEach((activity) => activityMap.set(getActivityId(activity), activity));

    const userMap = new Map<string, User>();
    users.forEach((user) => userMap.set(toText(user._id), user));

    return registrations
      .map((registration) => {
        const activity = activityMap.get(toText(registration.activity_id));
        const user = userMap.get(toText(registration.user_id));
        if (!activity || !user) return null;

        const recordId = getRecordId(registration);
        const status = getDisplayStatus(registration.status);
        const timeSource = status === 'Attended' ? registration.checkedin_at : null;

        return {
          id: recordId,
          name: user.name,
          department: toText(user.department) || '-',
          checkInTime: timeSource ? formatDateTime(timeSource) : '-',
          status,
          activityId: getActivityId(activity),
          activity: getActivityName(activity, ngos),
        };
      })
      .filter((record): record is AdminCheckInRecord => !!record); 
}

export function getActivityMeta(activityId: string, activities: Activity[], ngos: Ngo[]): ActivityMeta { // for report header, get date and location of the activity
    const activity = activities.find((item) => getActivityId(item) === activityId);
    if (!activity) {
      return { date: 'N/A', location: 'N/A' };
    }

    return {
      date: toDateOnly(activity.date),
      location: getActivityLocation(activity, ngos),
    };
}

export interface ActivityQrPayload {
    activityId: string;
    activityName: string;
}

export function buildQrPayload(activity: Activity, ngos: Ngo[]): ActivityQrPayload {
    return {
      activityId: getActivityId(activity),
      activityName: getActivityName(activity, ngos),
    };
}

// format date time 
export function formatDateTime(value: string | Date): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return toText(value);

    const date = formatLocalDate(parsed);
    const time = `${padNumber(parsed.getHours())}:${padNumber(parsed.getMinutes())}`;
    return `${date} ${time}`;
}

// generate activity name based on activity name, ngo name, or fallback to id
export function getActivityName(activity: Activity, ngos: Ngo[]): string {
    const activityName = toText(activity.name);
    if (activityName) return activityName;

    const ngoName = toText(activity.ngo_name);
    if (ngoName) return ngoName;

    const ngo = getNgo(activity.ngo_id, ngos);
    if (ngo?.name) return ngo.name;

    return `Activity ${getActivityId(activity).slice(-4)}`;
}

// generate activity id based on activity _id or fallback to random string
export function getActivityId(activity: Activity): string {
    return toText(activity._id);
}

// getters
function getActivityLocation(activity: Activity, ngos: Ngo[]): string {
    const location = toText(activity.location);
    if (location) return location;

    return getNgo(activity.ngo_id, ngos)?.location ?? 'N/A';
}

function buildActivityOptionBaseLabel(activity: Activity, ngos: Ngo[]): string {
    const parts = [
      getActivityName(activity, ngos),
      toDateOnly(activity.date),
      getActivityLocation(activity, ngos),
    ].filter((part) => part && part !== 'N/A');

    return parts.join(' | ') || `Activity ${getActivityId(activity).slice(-4)}`;
}

function getNgo(ngoId: string, ngos: Ngo[]): Ngo | undefined {
    const targetId = toText(ngoId);
    return ngos.find((ngo) => toText(ngo._id) === targetId);
}

// Generate a unique record ID based on registration ID or combination of activity and user IDs
function getRecordId(registration: Registration): string {
    return toText(registration._id) || `${registration.activity_id}-${registration.user_id}`;
}

function getDisplayStatus(status: Registration['status']): AdminCheckInStatus {
    return status === 'Attended' ? 'Attended' : '-';
}
  
// Convert date to YYYY-MM-DD format for report header
function toDateOnly(value: string | Date): string {
    if (value instanceof Date) {
      return formatLocalDate(value);
    }

    const text = toText(value).replaceAll('/', '-');
    if (!text) return 'N/A';
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      return text.slice(0, 10);
    }

    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      return formatLocalDate(parsed);
    }

    return text.split('T')[0] || 'N/A';
}

function toText(value: unknown): string {
    return String(value ?? '').trim();
}

function formatLocalDate(value: Date): string {
    return `${value.getFullYear()}-${padNumber(value.getMonth() + 1)}-${padNumber(value.getDate())}`;
}

function padNumber(value: number): string {
    return String(value).padStart(2, '0');
}
