import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckInRecord, CheckInStatus, ActivityMeta } from '../../../models/checkin.model';
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
  imports: [CommonModule, FormsModule],
  templateUrl: './activity-check-in.html',
  styleUrl: './activity-check-in.css',
})
export class ActivityCheckIn implements OnInit {
  private activityService = inject(ActivityService);
  private checkinService = inject(CheckinService);
  private registrationService = inject(RegistrationService);
  private userService = inject(UserService);
  private ngoService = inject(NgoService);

  // Observables for activities, registrations, users, and NGOs
  activities = this.activityService.activities$;
  registrations = this.registrationService.registrations$;
  users = this.userService.users$;
  ngos = this.ngoService.ngos$;

  // State for selected activity index and report visibility
  selectedActivityIndex = 0; // index into activityOptions
  showReport = false;

  // store check-in status and time updates locally (casue mock data)
  private readonly checkInStatusMap: Record<string, CheckInStatus> = {};
  private readonly checkInTimeMap: Record<string, string> = {};

  ngOnInit(): void {
    this.loadData();
  }

  get activityOptions(): string[] {// Generate unique activity options for dropdown based on activities and NGOs
    return getActivityOptions(this.activities(), this.ngos());
  }

  get records(): CheckInRecord[] {
    return buildRecords(
      this.activities(),
      this.registrations(),
      this.users(),
      this.ngos(),
      this.checkInStatusMap,
      this.checkInTimeMap,
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

  generateReport(): void {
    this.showReport = true;
  }

  selectActivity(index: number): void {
    this.selectedActivityIndex = index;
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



  // QR code related getters
  get qrCodeNumber(): string {
    // use the position in the options array (1-based) so duplicates get unique codes
    return String(this.selectedActivityIndex + 1);
  }

  get qrImageUrl(): string {
    const codeNumber = Number(this.qrCodeNumber);
    if (!Number.isInteger(codeNumber) || codeNumber < 1) return '';
    return `/qrcodes/${codeNumber}.png`;
  }

  get hasQrImage(): boolean {
    return this.qrImageUrl !== '';
  }

  get qrActivityName(): string {
    return this.currentQrActivityName || 'N/A';
  }


  onStatusChange(recordId: string, status: CheckInStatus): void {
    const registration = this.checkinService.findRegistration(this.registrations(), recordId);
    if (!registration?._id) return;

    const previousStatus = this.checkInStatusMap[recordId]
      ?? (registration.status === 'Attended' ? 'Attended' : 'Absent');
    const previousTime = this.checkInTimeMap[recordId];
    const nextTime = status === 'Attended'
      ? formatDateTime(new Date())
      : formatDateTime(registration.updated_at || registration.registered_at);

    this.checkInStatusMap[recordId] = status;
    this.checkInTimeMap[recordId] = nextTime;

    const payload = this.checkinService.createStatusUpdatePayload(registration, status);

    this.registrationService.updateRegistration(String(registration._id), payload).subscribe({
      next: () => {
        this.registrationService.getRegistrations();
      },
      error: () => {
        this.checkInStatusMap[recordId] = previousStatus;
        if (previousTime) {
          this.checkInTimeMap[recordId] = previousTime;
        } else {
          delete this.checkInTimeMap[recordId];
        }
        alert('Failed to update check-in status.');
      },
    });
  }

  private loadData(): void { // Load check-in list data for the component
    this.activityService.getActivities();
    this.registrationService.getRegistrations();
    this.userService.getUsers();
    this.ngoService.getNgos();
  }

  private get currentQrActivityName(): string { // Determine the activity name for QR code generation based on selection
    return this.currentActivitySelection;
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
    users: User[],
    ngos: Ngo[],
    checkInStatusMap: Record<string, CheckInStatus>,
    checkInTimeMap: Record<string, string>,
): CheckInRecord[] {
    const activityMap = new Map<string, Activity>();
    activities.forEach((activity) => activityMap.set(getActivityId(activity), activity));

    const userMap = new Map<string, User>();
    users.forEach((user) => userMap.set(toText(user._id), user));

    return registrations
      .filter((registration) => registration.status !== 'Cancelled')
      .map((registration) => {
        const activity = activityMap.get(toText(registration.activity_id));
        const user = userMap.get(toText(registration.user_id));
        if (!activity || !user) return null;

        const recordId = getRecordId(registration);
        const status = checkInStatusMap[recordId]
          ?? (registration.status === 'Attended' ? 'Attended' : 'Absent');

        return {
          id: recordId,
          name: user.name,
          department: user.department,
          checkInTime: checkInTimeMap[recordId] ?? 
          formatDateTime(registration.updated_at || registration.registered_at),
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
