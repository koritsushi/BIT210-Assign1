import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QRCodeComponent } from 'angularx-qrcode';
import { Checkin, CheckInRecord, CheckInStatus, ActivityMeta } from '../../../models/checkin.model';
import { Activity } from '../../../models/activity.model';
import { Ngo } from '../../../models/ngo.model';
import { Registration } from '../../../models/registration.model';
import { User } from '../../../models/user.model';
import { ActivityService } from '../../../services/activity.service';
import { CheckinService } from '../../../services/checkin.service';
import { NgoService } from '../../../services/ngo.service';
import { RegistrationService } from '../../../services/registration.servicce';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-activity-check-in',
  imports: [CommonModule, FormsModule, QRCodeComponent],
  templateUrl: './activity-check-in.html',
  styleUrl: './activity-check-in.css',
})
export class ActivityCheckIn implements OnInit, OnDestroy {
  private activityService = inject(ActivityService);
  private checkinService = inject(CheckinService);
  private registrationService = inject(RegistrationService);
  private userService = inject(UserService);
  private ngoService = inject(NgoService);

  // Observables for activities, registrations, users, and NGOs
  activities = this.activityService.activities$;
  checkins = this.checkinService.checkins$;
  registrations = this.registrationService.registrations$;
  users = this.userService.users$;
  ngos = this.ngoService.ngos$;

  // State for selected activity index and report visibility
  selectedActivityIndex = 0; // index into activityOptions
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

  get activityOptions(): string[] {// Generate unique activity options for dropdown based on activities and NGOs
    return getActivityOptions(this.activities(), this.ngos());
  }

  get records(): CheckInRecord[] {
    return buildRecords(
      this.activities(),
      this.registrations(),
      this.checkins(),
      this.users(),
      this.ngos(),
    );
  }

  get filteredRecords(): CheckInRecord[] {
    const currentActivity = this.currentActivitySelection;
    if (!currentActivity) return this.records;
    return this.records.filter((record) => record.activity === currentActivity);
  }

  get currentActivitySelection(): string {
    return this.activityOptions[this.selectedActivityIndex] || '';
  }

  get currentActivity(): Activity | undefined {
    return this.activities()[this.selectedActivityIndex];
  }

  get hasGeneratedQr(): boolean {
    return this.generatedQrText.trim() !== '';
  }

  generateReport(): void {
    this.showReport = true;
  }

  selectActivity(index: number): void {
    this.selectedActivityIndex = index;
    this.generatedQrText = '';
  }

  get reportActivityName(): string {
    return this.currentActivitySelection || 'All Activities';
  }

  // report header getters
  get reportDate(): string {
    return getActivityMeta(this.reportActivityName, this.activities(), this.ngos()).date;
  }

  get reportLocation(): string {
    return getActivityMeta(this.reportActivityName, this.activities(), this.ngos()).location;
  }

  // report content getters
  get totalEmployees(): number {
    return this.filteredRecords.length;
  }

  get attendedCount(): number {
    return this.filteredRecords.filter((record) => record.status === 'Attended').length;
  }

  get absentCount(): number {
    return this.filteredRecords.filter((record) => record.status === 'Absent').length;
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
    this.checkinService.getCheckins();
  }

  private startPolling(): void {
    this.refreshTimer = setInterval(() => {
      this.refreshDynamicData();
    }, 4000);
  }
}

// ---------------------------------------------------------------------------
// copied helpers from checkin.service.ts (everything except lines 68-79)

export function getActivityOptions(activities: Activity[], ngos: Ngo[]): string[] { // list activity options by name (duplicates allowed)
    return activities.map((activity) => getActivityName(activity, ngos));
}

export function buildRecords(
    activities: Activity[],
    registrations: Registration[],
    checkins: Checkin[],
    users: User[],
    ngos: Ngo[],
): CheckInRecord[] {
    const activityMap = new Map<string, Activity>();
    activities.forEach((activity) => activityMap.set(getActivityId(activity), activity));

    const userMap = new Map<string, User>();
    users.forEach((user) => userMap.set(toText(user._id), user));

    const checkinByRegistrationId = new Map<string, Checkin>();
    const checkinByUserActivity = new Map<string, Checkin>();
    checkins.forEach((checkin) => {
      const registrationId = toText(checkin.registration_id);
      if (registrationId) {
        checkinByRegistrationId.set(registrationId, checkin);
      }

      const pairKey = `${toText(checkin.user_id)}::${toText(checkin.activity_id)}`;
      checkinByUserActivity.set(pairKey, checkin);
    });

    return registrations
      .filter((registration) => registration.status !== 'Cancelled')
      .map((registration) => {
        const activity = activityMap.get(toText(registration.activity_id));
        const user = userMap.get(toText(registration.user_id));
        if (!activity || !user) return null;

        const recordId = getRecordId(registration);
        const pairKey = `${toText(registration.user_id)}::${toText(registration.activity_id)}`;
        const matchedCheckin = checkinByRegistrationId.get(recordId)
          ?? checkinByUserActivity.get(pairKey);
        const isLegacyAttended = registration.status === 'Attended';
        const status: CheckInStatus = matchedCheckin || isLegacyAttended ? 'Attended' : 'Absent';
        const timeSource = matchedCheckin?.checkin_time
          ?? (isLegacyAttended ? (registration.updated_at || registration.registered_at) : undefined);

        return {
          id: recordId,
          name: user.name,
          department: user.department,
          checkInTime: timeSource ? formatDateTime(timeSource) : '--',
          status,
          activity: getActivityName(activity, ngos),
        };
      })
      .filter((record): record is CheckInRecord => !!record); 
}

export function getActivityMeta(activityName: string, activities: Activity[], ngos: Ngo[]): ActivityMeta { // for report header, get date and location of the activity
    const activity = activities.find((item) => getActivityName(item, ngos) === activityName);
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

    const date = parsed.toISOString().slice(0, 10);
    const time = parsed.toTimeString().slice(0, 5);
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

function getNgo(ngoId: string, ngos: Ngo[]): Ngo | undefined {
    const targetId = toText(ngoId);
    return ngos.find((ngo) => toText(ngo._id) === targetId);
}

// Generate a unique record ID based on registration ID or combination of activity and user IDs
function getRecordId(registration: Registration): string {
    return toText(registration._id) || `${registration.activity_id}-${registration.user_id}`;
}
  
// Convert date to YYYY-MM-DD format for report header
function toDateOnly(value: string | Date): string {
    return toText(value).replaceAll('/', '-').split('T')[0] ?? 'N/A';
}

function toText(value: unknown): string {
    return String(value ?? '').trim();
}
