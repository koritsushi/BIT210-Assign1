export interface Activity {
  _id: string;
  ngo_id: string;
  ngo_name?: string;
  location?: string;
  description?: string;
  date: string | Date;
  start_time: number | string;
  end_time: number | string;
  max_slots: number;
  slots_taken: number;
  cutoff_datetime: string | Date;
  status: 'Open' | 'Full' | 'Closed';
  qr_code: string;
  participant_user_ids?: string[];
}
