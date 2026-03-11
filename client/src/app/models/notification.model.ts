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
    is_broadcast: boolean;          // true = sent to all employees
    is_read_by: string[];           // array of user_ids who read it
    deleted_by: string[];           // array of user_ids who soft deleted it
    sent_at: Date;
    scheduled_at: Date | null;
    repeat_interval_minutes: number | null,
    repeat_until: Date | null;
}