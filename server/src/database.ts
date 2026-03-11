import * as mongodb from "mongodb";
import { User } from "./modal/user";
import { Activity } from "./modal/activity";
import { Registration } from "./modal/registration";
import { Ngo } from "./modal/ngo";
import { Notification } from "./modal/notification";
import { mockUsers, mockActivities, mockNgos, mockRegistrations, mockNotifications } from "../mockdata";

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

    const db = client.db("example");
    await applySchemaValidation(db);

    const userCollection = db.collection<User>("user");
    const activitesCollection = db.collection<Activity>("activity");
    const registrationsCollection = db.collection<Registration>("registration");
    const ngosCollection = db.collection<Ngo>("ngo");
    const notificationCollection = db.collection<Ngo>("notification");

    collections.users = userCollection;
    collections.activites = activitesCollection;
    collections.registrations = registrationsCollection;
    collections.ngos = ngosCollection;
}

export async function connectMockDB(uri: string) {
    collections.users = new MockCollection<User>(mockUsers);
    collections.activites = new MockCollection<Activity>(mockActivities);
    collections.registrations = new MockCollection<Registration>(mockRegistrations);
    collections.ngos = new MockCollection<Ngo>(mockNgos);
    collections.notifications = new MockCollection<Notification>(mockNotifications);
}

async function applySchemaValidation(db: mongodb.Db) {
    const userSchema = {
        $jsonSchema: {
        bsonType: "object",
        required: ["name", "email", "department", "role"],
        additionalProperties: false,
        properties: {
            _id: { bsonType: "objectId" },
            name: { bsonType: "string" },
            email: { bsonType: "string" },
            department: { bsonType: "string" },
            role: { enum: ["Admin", "Employee"] },
        },
        },
    };

    const ngoSchema = {
        $jsonSchema: {
        bsonType: "object",
        required: ["name", "description", "location", "service_type", "is_active"],
        additionalProperties: false,
        properties: {
            _id: { bsonType: "objectId" },
            name: { bsonType: "string" },
            description: { bsonType: "string" },
            location: { bsonType: "string" },
            service_type: { bsonType: "string" },
            is_active: { bsonType: "bool" },
        },
        },
    };

    const activitySchema = {
        $jsonSchema: {
        bsonType: "object",
        required: ["ngo_id", "date", "start_time", "end_time", "max_slots", "slots_taken", "cutoff_datetime", "status", "qr_code"],
        additionalProperties: false,
        properties: {
            _id: { bsonType: "objectId" },
            ngo_id: { bsonType: "objectId" },
            date: { bsonType: "date" },
            start_time: { bsonType: "number" },
            end_time: { bsonType: "number" },
            max_slots: { bsonType: "int" },
            slots_taken: { bsonType: "int" },
            cutoff_datetime: { bsonType: "date" },
            status: { enum: ["Open", "Full", "Closed"] },
            qr_code: { bsonType: "string" },
        },
        },
    };

    const registrationSchema = {
        $jsonSchema: {
        bsonType: "object",
        required: ["user_id", "activity_id", "registered_at", "updated_at", "status"],
        additionalProperties: false,
        properties: {
            _id: { bsonType: "objectId" },
            user_id: { bsonType: "objectId" },
            activity_id: { bsonType: "objectId" },
            registered_at: { bsonType: "date" },
            updated_at: { bsonType: "date" },
            status: { bsonType: "bool" },
        },
        },
    };

    const notificationSchema = {
        $jsonSchema: {
        bsonType: "object",
        required: ["type", "message", "is_broadcast", "is_read_by", "deleted_by", "sent_at"],
        properties: {
            _id: { bsonType: "objectId" },
            user_id: { bsonType: "string" },        // not required — optional for broadcasts
            activity_id: { bsonType: "string" },    // not required — optional
            type: { enum: ["Registration", "Cancellation", "Reminder", "Update", "Broadcast"] },
            message: { bsonType: "string" },
            is_broadcast: { bsonType: "bool" },
            is_read_by: { bsonType: "array" },
            deleted_by: { bsonType: "array" },
            sent_at: { bsonType: "date" },
            scheduled_at: { bsonType: ["date", "null"] },
            repeat_interval_minutes: { bsonType: ["int", "null"] },
            repeat_until: { bsonType: ["date", "null"] },
        }
    }
    };

  // Apply all schemas
    const collections = [
        { name: "users", schema: userSchema },
        { name: "ngos", schema: ngoSchema },
        { name: "activities", schema: activitySchema },
        { name: "registrations", schema: registrationSchema },
        { name: "notification", schema: notificationSchema}
    ];

    for (const { name, schema } of collections) {
        const existingCollections = await db.listCollections({ name }).toArray();

        if (existingCollections.length === 0) {
        // Collection doesn't exist — create with schema
        await db.createCollection(name, { validator: schema });
        } else {
        // Collection exists — update schema
        await db.command({ collMod: name, validator: schema });
        }
    }
}

class MockCollection<T> {
    private data: T[];

    constructor(data: T[]) {
        this.data = data;
    }

    find(_filter = {}) {
        return {
            toArray: async () => this.data
        };
    }

    async findOne(filter: any) {
        return this.data.find(item =>
        Object.entries(filter).every(([k, v]) => (item as any)[k]?.toString() === v?.toString())
        ) || null;
    }

    async insertOne(doc: T) {
       const newDoc = { 
            _id: new mongodb.ObjectId(), //auto generate _id
            ...(doc as any) 
        };
        this.data.push(newDoc as T);
        return { 
            acknowledged: true,          //route checks this
            insertedId: (newDoc as any)._id 
        };
    }

    async updateOne(filter: Partial<T>, update: { $set: Partial<T> }) {
        const index = this.data.findIndex(item =>
            Object.entries(filter).every(([k, v]) => (item as any)[k]?.toString() === v?.toString())
        );
        if (index !== -1) {
            this.data[index] = { ...this.data[index], ...update.$set };
        }
        return { 
            modifiedCount: index !== -1 ? 1 : 0,
            matchedCount: index !== -1 ? 1 : 0 
        };
    }

    async deleteOne(filter: Partial<T>) { 
        const index = this.data.findIndex(item =>
        Object.entries(filter).every(([k, v]) => (item as any)[k]?.toString() === v?.toString())
        );
        if (index !== -1) this.data.splice(index, 1);
        return { deletedCount: index !== -1 ? 1 : 0 };
    }
}