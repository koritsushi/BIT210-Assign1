import { Activity } from './activity.model';

export type CheckInStatus = 'Absent' | 'Attended';

export interface CheckInRecord {
  id: string;
  name: string;
  department: string;
  checkInTime: string;
  status: CheckInStatus;
  activity: string;
}

export type ApiActivity = Activity & {
  ngo_name?: string;
  location?: string;
  description?: string;
};

export interface ApiRegistration {
  _id?: string;
  user_id: string;
  activity_id: string;
  registered_at: Date | string;
  updated_at: Date | string;
  status: 'Registered' | 'Cancelled' | 'Attended';
}

export interface ApiNgo {
  _id?: string;
  name: string;
  description: string;
  location: string;
  service_type: string;
  is_active: boolean;
}

export interface ActivityMeta {
  date: string;
  location: string;
}

export interface ActivityCheckInViewData {
  activityIdMap: Record<string, string>;
  activityMeta: Record<string, ActivityMeta>;
  activityOptions: string[];
  activityQrIndexMap: Record<string, string>;
  records: CheckInRecord[];
}
