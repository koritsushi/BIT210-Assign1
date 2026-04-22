import * as mongodb from "mongodb";

export async function SchemaValidation(db: mongodb.Db) {
    const userSchema = {
        $jsonSchema: {
            bsonType: "object",
            required: [
                "name", 
                "email", 
                "department", 
                "role",
                "password",
                "is_verified",
                "verify_token",
                "verify_expiry",
                "twofa_secret",
                "twofa_enabled"
            ],
            additionalProperties: false,
            properties: {
                _id: { bsonType: "objectId" },
                name: { bsonType: "string" },
                email: { bsonType: "string" },
                department: { bsonType: "string" },
                role: { enum: ["Admin", "Employee"] },
                password: { bsonType: "string" },
                is_verified: { bsonType: "bool" },
                verify_token: { bsonType: ["string", "null"] },
                verify_expiry: { bsonType: ["date", "null"] },
                twofa_secret: { bsonType: "string" },
                twofa_enabled: { bsonType: "bool" }
            },
        },
    };

    const ngoSchema = {
        $jsonSchema: {
        bsonType: "object",
        required: ["name", "location", "service_type", "is_active"],
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
            checkedin_at: { bsonType: ["date", "null"] },
            updated_at: { bsonType: "date" },
            status: { enum: ["Registered", "Cancelled", "Attended"] },
        },
        },
    };

    const checkinSchema = {
        $jsonSchema: {
        bsonType: "object",
        required: ["registration_id", "user_id", "activity_id", "checkin_time", "status"],
        additionalProperties: false,
        properties: {
            _id: { bsonType: "objectId" },
            registration_id: { bsonType: "objectId" },
            user_id: { bsonType: "objectId" },
            activity_id: { bsonType: "objectId" },
            checkin_time: { bsonType: "date" },
            status: { enum: ["Absent", "Attended"] },
        },
        },
    };

    const notificationSchema = {
        $jsonSchema: {
            bsonType: "object",
            required: ["type", "title", "message", "is_broadcast"],
            description: "Schema for storing user and broadcast notifications in the system",
            properties: {
                _id: {
                    bsonType: "objectId",
                    description: "Unique identifier for the notification document"
                },
                user_id: {
                    bsonType: ["string", "null"],
                    description: "ID of the target user. Null if the notification is a broadcast"
                },
                activity_id: {
                    bsonType: ["string", "null"],
                    description: "Associated activity or event ID related to this notification"
                },
                type: {
                    enum: ["Registration", "Cancellation", "Reminder", "Update", "Broadcast"],
                    description: "Type/category of the notification"
                },
                title: {
                    bsonType: "string",
                    description: "Short title or heading of the notification"
                },
                message: {
                    bsonType: "string",
                    description: "Detailed message content of the notification"
                },
                is_broadcast: {
                    bsonType: "bool",
                    description: "Indicates whether the notification is sent to all users (true) or a specific user (false)"
                },
                is_read_by: {
                    bsonType: "array",
                    description: "List of user IDs who have read this notification"
                },
                deleted_by: {
                    bsonType: "array",
                    description: "List of user IDs who have deleted or hidden this notification"
                },
                sent_at: {
                    bsonType: ["date", "null"],
                    description: "Timestamp when the notification was actually sent"
                },
                scheduled_at: {
                    bsonType: ["date", "null"],
                    description: "Timestamp when the notification is scheduled to be sent"
                },
                repeat_interval_minutes: {
                    bsonType: ["number", "null"],
                    description: "Interval in minutes for repeating the notification (e.g., reminders)"
                },
                repeat_until: {
                    bsonType: ["date", "null"],
                    description: "End date/time until which the notification should keep repeating"
                },
                reminder_label: {
                    bsonType: ["string", "null"],
                    description: "Custom label for the reminder (e.g., '1 hour before', 'Daily reminder')"
                }
            }
        }
    };

  // Apply all schemas
    const collections = [
        { name: "users", schema: userSchema },
        { name: "ngos", schema: ngoSchema },
        { name: "activity", schema: activitySchema },
        { name: "checkins", schema: checkinSchema },
        { name: "registration", schema: registrationSchema },
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
