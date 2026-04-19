export type CheckInStatus = 'Absent' | 'Attended';

export interface Checkin {
    _id?: string;
    registration_id: string;
    user_id: string;
    activity_id: string;
    checkin_time: Date | string;
    status: CheckInStatus;
}

export interface CheckInRecord {
    id: string;
    name: string;
    department: string;
    checkInTime: string;
    status: CheckInStatus;
    activity: string;
}

export interface ActivityMeta {
    date: string;
    location: string;
}
