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
    message: string;
    is_read: boolean;               // track if employee has read it
    is_broadcast: boolean;          // true = sent to all employees
    sent_at: Date;
    scheduled_at: Date;  
}