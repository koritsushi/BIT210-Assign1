export interface Registration {
    _id?: string;
    user_id: string;
    activity_id: string;
    registered_at: Date | string;
    checkin_at: Date | string;
    updated_at: Date | string;
    status: "Registered" | "Cancelled" | "Attended";
}
