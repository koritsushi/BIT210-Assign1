import * as mongodb from "mongodb";

export interface Registration {
    _id?: mongodb.ObjectId | number;
    user_id: mongodb.ObjectId | number;
    activity_id: mongodb.ObjectId | number;
    registered_at: Date;
    updated_at: Date;
    status: "Registered" | "Cancelled" | "Attended";
}