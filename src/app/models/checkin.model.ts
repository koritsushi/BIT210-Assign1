export interface Checkin {
  _id: string;
  registration_id: string;
  activity_id: string;
  activity_name: string;
  employee_name: string;
  qr_code: string;
  method: string;
  status: 'Pending' | 'Checked-In';
  checkin_time?: string;
}