import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';
import QrScanner from 'qr-scanner';
import { ActivityMeta } from '../../../models/checkin.model';
import { Activity } from '../../../models/activity.model';
import { Ngo } from '../../../models/ngo.model';
import { Registration } from '../../../models/registration.model';
import { User } from '../../../models/user.model';
import { ActivityService } from '../../../services/activity.service';
import { CheckinService } from '../../../services/checkin.service';
import { NgoService } from '../../../services/ngo.service';
import { RegistrationService } from '../../../services/registration.servicce';
import { UserService } from '../../../services/user.service';

type AdminCheckInStatus = 'Attended' | '-';
type ScannerMessageKind = 'info' | 'success' | 'error';

interface AdminCheckInRecord {
  id: string;
  name: string;
  department: string;
  checkInTime: string;
  status: AdminCheckInStatus;
  activity: string;
  activityId: string;
}

interface EmployeeQrPayload {
  userId?: string;
  email?: string;
}

export interface ActivityOption {
  id: string;
  label: string;
}

@Component({
  selector: 'app-activity-check-in',
  imports: [CommonModule],
  templateUrl: './activity-check-in.html',
  styleUrl: './activity-check-in.css',
})
export class ActivityCheckIn implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('video', { static: false }) video?: ElementRef<HTMLVideoElement>;

  private activityService = inject(ActivityService);
  private checkinService = inject(CheckinService);
  private registrationService = inject(RegistrationService);
  private userService = inject(UserService);
  private ngoService = inject(NgoService);
  private cdr = inject(ChangeDetectorRef);

  activities = this.activityService.activities$;
  registrations = this.registrationService.registrations$;
  users = this.userService.users$;
  ngos = this.ngoService.ngos$;

  selectedActivityId = '';
  showReport = false;

  cameraErrorMessage = '';
  scannerMessage = '';
  scannerMessageKind: ScannerMessageKind = 'info';
  private qrScanner?: QrScanner;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private isSubmitting = false;
  private lastScannedValue = '';

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  ngOnInit(): void {
    this.loadData();
    this.startPolling();
  }

  ngAfterViewInit(): void {
    this.startScanner();
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.qrScanner?.destroy();
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

  get currentActivityId(): string {
    return resolveSelectedActivityId(this.selectedActivityId, this.activityOptions);
  }

  get reportActivityName(): string {
    return this.currentActivitySelection || 'All Activities';
  }

  get reportDate(): string {
    return getActivityMeta(this.currentActivityId, this.activities(), this.ngos()).date;
  }

  get reportLocation(): string {
    return getActivityMeta(this.currentActivityId, this.activities(), this.ngos()).location;
  }

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

  generateReport(): void {
    this.showReport = true;
  }

  selectActivity(activityId: string): void {
    if (this.selectedActivityId !== activityId) {
      this.showReport = false;
    }

    this.selectedActivityId = activityId;
    this.setScannerMessage('info', this.currentActivityId
      ? 'Scanner ready. Scan an employee QR code.'
      : '');
  }

  private loadData(): void {
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

  private startScanner(): void {
    if (!isPlatformBrowser(this.platformId) || !this.video?.nativeElement) {
      return;
    }

    this.qrScanner = new QrScanner(
      this.video.nativeElement,
      (result: unknown) => this.handleScanResult(extractScanText(result)),
      () => undefined,
      calculateCenteredSquareScanRegion,
      'environment',
    );

    this.qrScanner.start().then(() => {
      this.cameraErrorMessage = '';
      this.setScannerMessage('info', this.currentActivityId
        ? 'Scanner ready. Scan an employee QR code.'
        : '');
      this.cdr.detectChanges();
    }).catch(() => {
      this.cameraErrorMessage = 'Unable to start the camera. Please allow camera access and try again.';
      this.setScannerMessage('error', 'Camera unavailable for scanning.');
      this.cdr.detectChanges();
    });
  }

  private handleScanResult(rawResult: string): void {
    const scannedText = rawResult.trim();
    if (!scannedText || this.isSubmitting || scannedText === this.lastScannedValue) {
      return;
    }

    this.lastScannedValue = scannedText;

    if (!this.currentActivityId) {
      this.setScannerMessage('error', 'Please select an activity before scanning.');
      this.cdr.detectChanges();
      this.resetScan();
      return;
    }

    const employeePayload = parseEmployeeQrPayload(scannedText);
    const employee = resolveEmployeeFromQr(employeePayload, this.users());

    if (!employee?._id || employee.role !== 'Employee') {
      this.setScannerMessage('error', 'QR code does not match an employee account.');
      this.cdr.detectChanges();
      this.resetScan();
      return;
    }

    this.isSubmitting = true;
    this.setScannerMessage('info', `Recording check-in for ${employee.name}...`);
    this.cdr.detectChanges();

    this.checkinService.createCheckin(String(employee._id), this.currentActivityId).subscribe({
      next: (message) => {
        this.setScannerMessage('success', `${employee.name}: ${message}`);
        this.refreshDynamicData();
        this.cdr.detectChanges();
      },
      error: (error) => {
        const fallback = 'Unable to record check-in.';
        const serverMessage =
          typeof error?.error === 'string' && error.error.trim()
            ? error.error.trim()
            : fallback;

        this.setScannerMessage('error', `${employee.name}: ${serverMessage}`);
        this.cdr.detectChanges();
      },
      complete: () => {
        this.resetScan();
      },
    });
  }

  private resetScan(): void {
    this.isSubmitting = false;
    setTimeout(() => {
      this.lastScannedValue = '';
      this.cdr.detectChanges();
    }, 1200);
  }

  private setScannerMessage(kind: ScannerMessageKind, message: string): void {
    this.scannerMessageKind = kind;
    this.scannerMessage = message;
  }
}

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

export function getActivityMeta(activityId: string, activities: Activity[], ngos: Ngo[]): ActivityMeta {
  const activity = activities.find((item) => getActivityId(item) === activityId);
  if (!activity) {
    return { date: 'N/A', location: 'N/A' };
  }

  return {
    date: toDateOnly(activity.date),
    location: getActivityLocation(activity, ngos),
  };
}

export function formatDateTime(value: string | Date): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return toText(value);

  const date = formatLocalDate(parsed);
  const time = `${padNumber(parsed.getHours())}:${padNumber(parsed.getMinutes())}`;
  return `${date} ${time}`;
}

export function getActivityName(activity: Activity, ngos: Ngo[]): string {
  const activityName = toText(activity.name);
  if (activityName) return activityName;

  const ngoName = toText(activity.ngo_name);
  if (ngoName) return ngoName;

  const ngo = getNgo(activity.ngo_id, ngos);
  if (ngo?.name) return ngo.name;

  return `Activity ${getActivityId(activity).slice(-4)}`;
}

export function getActivityId(activity: Activity): string {
  return toText(activity._id);
}

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

function getRecordId(registration: Registration): string {
  return toText(registration._id) || `${registration.activity_id}-${registration.user_id}`;
}

function getDisplayStatus(status: Registration['status']): AdminCheckInStatus {
  return status === 'Attended' ? 'Attended' : '-';
}

function parseEmployeeQrPayload(rawValue: string): EmployeeQrPayload {
  const text = toText(rawValue);
  if (!text) return {};

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return {
        userId: pickText(parsed, ['userId', 'user_id', 'employeeId', 'employee_id', '_id', 'id']),
        email: pickText(parsed, ['email', 'employeeEmail', 'employee_email']),
      };
    }
  } catch {
    // fall through to plain-text parsing
  }

  if (looksLikeObjectId(text)) {
    return { userId: text };
  }

  if (looksLikeEmail(text)) {
    return { email: text };
  }

  return {};
}

function resolveEmployeeFromQr(payload: EmployeeQrPayload, users: User[]): User | undefined {
  const userId = toText(payload.userId);
  if (userId) {
    return users.find((user) => toText(user._id) === userId && user.role === 'Employee');
  }

  const email = toText(payload.email).toLowerCase();
  if (email) {
    return users.find((user) => toText(user.email).toLowerCase() === email && user.role === 'Employee');
  }

  return undefined;
}

function pickText(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = toText(record[key]);
    if (value) return value;
  }

  return '';
}

function looksLikeObjectId(value: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(value);
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function extractScanText(result: unknown): string {
  if (typeof result === 'string') {
    return result;
  }

  if (result && typeof result === 'object' && 'data' in result) {
    return toText((result as { data?: unknown }).data);
  }

  return '';
}

function calculateCenteredSquareScanRegion(video: HTMLVideoElement) {
  const baseSize = Math.floor(Math.min(video.videoWidth, video.videoHeight) * 0.42);
  const size = Math.max(180, Math.min(baseSize, 230));
  const x = Math.floor((video.videoWidth - size) / 2);
  const y = Math.floor((video.videoHeight - size) / 2);

  return {
    x,
    y,
    width: size,
    height: size,
    downScaledWidth: 320,
    downScaledHeight: 320,
  };
}

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
