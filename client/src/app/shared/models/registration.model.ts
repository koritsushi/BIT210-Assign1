export interface Registration {
    registration_id: string;
    user_id: string;
    activity_id: string;
    registered_at: Date;
    updated_at: Date;
    status: "Registered" | "Cancelled" | "Attended";
}