export interface notification {
  _id?: string;
  user_id?: string;
  activity_id?: string;
  type: string;
  message: string;
  sent_at: string | Date;
  scheduled_at?: string | Date;
}
