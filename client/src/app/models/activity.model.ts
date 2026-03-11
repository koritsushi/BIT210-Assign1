
export interface Activity {
    _id?: string;
    ngo_id: string;
    name: string,
    date: Date | string;
    start_time: number | string;
    end_time: number | string;
    max_slots: number;
    slots_taken: number;
    cutoff_datetime: Date | string;
    status: "Open" | "Full" | "Closed";
    qr_code: string;
    location?: string;
    description?: string;
    ngo_name?: string;
    participant_user_ids?: string[];
}
