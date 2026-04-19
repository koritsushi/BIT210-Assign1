import * as mongodb from "mongodb";
import { SchemaValidation } from "./validationSchema";
import { User } from "./modal/user";
import { Activity } from "./modal/activity";
import { Registration } from "./modal/registration";
import { Ngo } from "./modal/ngo";
import { Notification } from "./modal/notification";
import { mockUsers, mockActivities, mockNgos, mockRegistrations, mockNotifications } from "../mockdata";
import { MockCollection } from "./mockCollection";

export const collections: {
    users?: mongodb.Collection<User> | any;
    activites?: mongodb.Collection<Activity> | any;
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
    const registrationsCollection = db.collection<Registration>("registration");
    const ngosCollection = db.collection<Ngo>("ngos");
    const notificationCollection = db.collection<Ngo>("notification");

    collections.users = userCollection;
    collections.activites = activitesCollection;
    collections.registrations = registrationsCollection;
    collections.ngos = ngosCollection;
    collections.notifications = notificationCollection;
}

export async function connectMockDB(uri: string) {
    collections.users = new MockCollection<User>(mockUsers);
    collections.activites = new MockCollection<Activity>(mockActivities);
    collections.registrations = new MockCollection<Registration>(mockRegistrations);
    collections.ngos = new MockCollection<Ngo>(mockNgos);
    collections.notifications = new MockCollection<Notification>(mockNotifications);
}