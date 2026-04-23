import * as mongodb from "mongodb";
import { SchemaValidation } from "./validationSchema";
import { User } from "./modal/user";
import { Activity } from "./modal/activity";
import { Checkin } from "./modal/checkin";
import { Registration } from "./modal/registration";
import { Ngo } from "./modal/ngo";
import { Notification } from "./modal/notification";
import { mockUsers, mockActivities, mockCheckins, mockNgos, mockRegistrations, mockNotifications } from "../mockdata";
import { MockCollection } from "./mockCollection";

export const collections: {
    users?: mongodb.Collection<User> | any;
    activites?: mongodb.Collection<Activity> | any;
    checkins?: mongodb.Collection<Checkin> | any;
    registrations?: mongodb.Collection<Registration> | any;
    ngos?: mongodb.Collection<Ngo> | any;
    notifications?: mongodb.Collection<Notification> | any;
} = {};

export async function connectDB(uri: string) {
    const client = new mongodb.MongoClient(uri);
    await client.connect();

    const db = client.db("BIT210");
    await SchemaValidation(db);

    const userCollection = db.collection<User>("users");
    const activitesCollection = db.collection<Activity>("activity");
    const checkinsCollection = db.collection<Checkin>("checkins");
    const registrationsCollection = db.collection<Registration>("registration");
    const ngosCollection = db.collection<Ngo>("ngos");
    const notificationCollection = db.collection<Notification>("notification");

    collections.users = userCollection;
    collections.activites = activitesCollection;
    collections.checkins = checkinsCollection;
    collections.registrations = registrationsCollection;
    collections.ngos = ngosCollection;
    collections.notifications = notificationCollection;

    await notificationCollection.createIndex(
        {
            activity_id: 1,
            user_id: 1,
            reminder_label: 1
        },
        {
            unique: true,
            partialFilterExpression: {
                reminder_label: { $type: "string" }  // only apply to docs that have reminder_label
            },
            name: "unique_reminder_per_user_activity"
        }
    );
}

export async function connectMockDB(uri: string) {
    collections.users = new MockCollection<User>(mockUsers);
    collections.activites = new MockCollection<Activity>(mockActivities);
    collections.checkins = new MockCollection<Checkin>(mockCheckins);
    collections.registrations = new MockCollection<Registration>(mockRegistrations);
    collections.ngos = new MockCollection<Ngo>(mockNgos);
    collections.notifications = new MockCollection<Notification>(mockNotifications);
}
