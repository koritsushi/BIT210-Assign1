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
            checkedin_at: { bsonType: "date" },
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