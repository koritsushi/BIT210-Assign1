export interface Notification {
    _id?: string;
    user_id: string | null;
    activity_id: string | null;
    type: "Registration"
        | "Cancellation"
        | "Reminder"
        | "Update"
        | "Broadcast";
    title: string;
    message: string;
    is_broadcast: boolean;          // true = sent to all employees
    is_read_by: string[];           // array of user_ids who read it
    deleted_by: string[];           // array of user_ids who soft deleted it
    sent_at: Date | null;
    scheduled_at: Date | null;
    repeat_interval_minutes: number | null,
    repeat_until: Date | null;
    reminder_label: string | null;
}