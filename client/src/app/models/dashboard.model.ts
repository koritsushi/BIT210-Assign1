import { Activity } from './activity.model';

export type ActivityStatus = 'Open' | 'Full' | 'Closed';

export type ApiActivity = Activity & {
  ngo_name?: string;
  location?: string;
  description?: string;
  participant_user_ids?: string[];
};

export interface ApiNgo {
  _id?: string;
  name: string;
  description: string;
  location: string;
  service_type: string;
  is_active: boolean;
}

export interface ApiRegistration {
  _id?: string;
  user_id: string;
  activity_id: string;
  registered_at: Date | string;
  updated_at: Date | string;
  status: 'Registered' | 'Cancelled' | 'Attended';
}

export interface ApiUser {
  _id?: string;
  name: string;
  email: string;
  department: string;
  role: 'Admin' | 'Employee';
}

export interface DashboardActivity {
  id: string;
  displayId: string;
  ngoId: string;
  qrCode: string;
  activityName: string;
  description: string;
  whenDate: string;
  startTime: string;
  endTime: string;
  location: string;
  ngoName: string;
  offered: number;
  taken: number;
  cutoff: string;
  status: ActivityStatus;
  participantCount: number;
  participantNames: string[];
}
