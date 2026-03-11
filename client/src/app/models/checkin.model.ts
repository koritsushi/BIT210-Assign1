export interface Checkin {
    _id?: string;
    registration_id: string;
    checkin_time: Date | string;
    method: string;
}

export type CheckInStatus = 'Absent' | 'Attended';

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
