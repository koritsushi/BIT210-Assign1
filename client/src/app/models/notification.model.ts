export interface Notification {
    _id?: string;
    user_id: string;
    activity_id: string;
    type: "Registration"
        | "Cancellation"
        | "Reminder"
        | "Update"
        | "Broadcast";
    message: string;
    sent_at: Date;
    scheduled_at: Date | null;
    repeat_intervel_minutes: number | null,
    repeat_until: Date | null;
}