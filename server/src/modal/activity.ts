import * as mongodb from "mongodb";

export interface Activity {
    _id?: mongodb.ObjectId | number;
    ngo_id: mongodb.ObjectId | number;
    name: string,
    date: Date;
    start_time: number;
    end_time: number;
    max_slots: number;
    slots_taken: number;
    cutoff_datetime: Date;
    status: "Open" | "Full" | "Closed";
    qr_code: string;
    location?: string;
    description?: string;
    ngo_name?: string;
    participant_user_ids?: string[];
}