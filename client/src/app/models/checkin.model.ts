export type CheckInStatus = 'Present' | 'Pending';

export interface CheckInRecord {
  id: number;
  employeeName: string;
  activityName: string;
  activityQrValue: string;
  checkInTime: string;
  status: CheckInStatus;
}