import * as express from "express";
import { ObjectId } from "mongodb";
import { collections } from "../database";

export const registrationRouter = express.Router();
registrationRouter.use(express.json());

// ─────────────────────────────────────────────
// Helper: convert and validate registration fields
// ─────────────────────────────────────────────
const convertRegistrationFields = (data: any): void => {
    // Convert string IDs to ObjectId
    if (data.user_id && typeof data.user_id === 'string') {
        data.user_id = new ObjectId(data.user_id);
    }
    if (data.activity_id && typeof data.activity_id === 'string') {
        data.activity_id = new ObjectId(data.activity_id);
    }

    // Convert date strings to Date objects
    if (data.registered_at && typeof data.registered_at === 'string') {
        data.registered_at = new Date(data.registered_at);
    }
    if (data.updated_at && typeof data.updated_at === 'string') {
        data.updated_at = new Date(data.updated_at);
    }

    // checkedin_at can be null or a date string
    if (data.checkedin_at && typeof data.checkedin_at === 'string') {
        data.checkedin_at = new Date(data.checkedin_at);
    } else if (data.checkedin_at === undefined) {
        data.checkedin_at = null; // ensure field exists
    }
};

registrationRouter.get("/", async (_req, res) => {
    try {
        const registrations = await collections?.registrations?.find({}).toArray();
        res.status(200).send(registrations);
    } catch (error) {
        res.status(500).send(error instanceof Error ? error.message : "Unknown Error");
    }
});

registrationRouter.get("/:id", async (req, res) => {
    try {
        const id = req?.params?.id;
        const query = { _id: new ObjectId(id) };
        const registration = await collections?.registrations?.findOne(query);

        if (registration) {
            res.status(200).send(registration);
        } else {
            res.status(404).send(`Failed to find a registration: ID: ${id}`);
        }
    } catch (error) {
        res.status(500).send(error instanceof Error ? error.message : "Unknown Error");
    }
});

registrationRouter.post("/", async (req, res) => {
    try {
        const data = req.body;

        //console.log("Received registration:", JSON.stringify(data, null, 2));

        // Convert fields before inserting
        convertRegistrationFields(data);

        //console.log("Inserting registration:", JSON.stringify(data, null, 2));

        const result = await collections?.registrations?.insertOne(data);

        if (result?.acknowledged) {
            res.status(201).json({ success: true, id: result.insertedId });
        } else {
            res.status(500).send("Failed to create a new registration.");
        }
    } catch (error) {
        console.error("POST /registration error:", error);
        res.status(400).send(error instanceof Error ? error.message : "Unknown error");
    }
});

registrationRouter.put("/:id", async (req, res) => {
    try {
        const id = req?.params?.id;
        const { _id, ...updateData } = req.body;
        convertRegistrationFields(updateData);

        const query = { _id: new ObjectId(id) };
        const result = await collections?.registrations?.updateOne(query, { $set: updateData });


        if (result && result.matchedCount) {
            res.status(200).send(`Updated a registration: ID ${id}.`);
        } else if (!result?.matchedCount) {
            res.status(404).send(`Failed to find a registration: ID ${id}`);
        } else {
            res.status(304).send(`Failed to update a registration: ID ${id}`);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("PUT /registration/:id error:", message);
        res.status(400).send(message);
    }
});

registrationRouter.delete("/:id", async (req, res) => {
    try {
        const id = req?.params?.id;
        const query = { _id: new ObjectId(id) };
        const result = await collections?.registrations?.deleteOne(query);

        if (result && result.deletedCount) {
            res.status(202).send(`Removed a registration: ID ${id}`);
        } else if (!result) {
            res.status(400).send(`Failed to remove a registration: ID ${id}`);
        } else if (!result.deletedCount) {
            res.status(404).send(`Failed to find a registration: ID ${id}`);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("DELETE /registration/:id error:", message);
        res.status(400).send(message);
    }
});