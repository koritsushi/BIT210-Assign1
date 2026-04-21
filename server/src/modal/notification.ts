import * as mongodb from "mongodb";

export interface Notification {
    _id?: mongodb.ObjectId;
    user_id?: mongodb.ObjectId;               // optional — null means broadcast to all
    activity_id?: mongodb.ObjectId;           // optional — some notifications are not activity-specific
    type: "Registration"            // employee registered successfully
        | "Cancellation"            // employee cancelled
        | "Reminder"                // scheduled reminder (1 week, 3 days, 1 day before)
        | "Update"                  // activity details changed
        | "Broadcast";              // admin broadcast message to all
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