export interface Checkin {
  _id?: string;
  registration_id: string;

  activity_id?: string;
  token?: string;

  checkin_time: string | Date;
  method: string;
}
