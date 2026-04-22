import * as mongodb from "mongodb";

export interface Registration {
    _id?: mongodb.ObjectId;
    user_id: mongodb.ObjectId;
    activity_id: mongodb.ObjectId;
    registered_at: Date;
    checkedin_at: Date | null;
    updated_at: Date;
    status: "Registered" | "Cancelled" | "Attended";
}