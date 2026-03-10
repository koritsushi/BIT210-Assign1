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
    scheduled_at: Date;
}