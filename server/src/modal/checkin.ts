import * as mongodb from "mongodb";

export type CheckInStatus = "Absent" | "Attended";

export interface Checkin {
    _id?: mongodb.ObjectId | number;
    registration_id: mongodb.ObjectId | number;
    user_id: mongodb.ObjectId | number;
    activity_id: mongodb.ObjectId | number;
    checkin_time: Date;
    status: CheckInStatus;
}
