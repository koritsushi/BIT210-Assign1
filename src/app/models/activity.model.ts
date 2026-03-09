
export interface Activity {
    _id?: string;
    activity_name: string;
    ngo_id: string;
    date: Date;
    start_time: number;
    end_time: number;
    max_slots: number;
    slots_taken: number;
    cutoff_datetime: Date;
    status: "Open" | "Full" | "Closed";
    qr_code: string;
}