import * as express from "express";
import { ObjectId } from "mongodb";
import { collections } from "../database";

export const activityRouter = express.Router();
activityRouter.use(express.json());

// ─────────────────────────────────────────────
// Helper: convert and validate activity fields
// ─────────────────────────────────────────────
const convertActivityFields = (data: any): void => {
    if (data.ngo_id && typeof data.ngo_id === 'string') {
        data.ngo_id = new ObjectId(data.ngo_id);
    }

    if (data.date && typeof data.date === 'string') {
        data.date = new Date(data.date);
    }
    if (data.cutoff_datetime && typeof data.cutoff_datetime === 'string') {
        data.cutoff_datetime = new Date(data.cutoff_datetime);  // ⭐ No -8 hours!
    }

    // Ensure int fields are integers
    if (data.max_slots !== undefined) {
        data.max_slots = parseInt(data.max_slots);
    }
    if (data.slots_taken !== undefined) {
        data.slots_taken = parseInt(data.slots_taken ?? 0);
    }
};

activityRouter.get("/", async (_req, res) => {
    try {
        const activities = await collections?.activites?.find({}).toArray();
        res.status(200).send(activities);
    } catch (error) {
        res.status(500).send(error instanceof Error ? error.message : "Unknown Error");
    }
});

activityRouter.get("/:id", async (req, res) => {
    try {
        const id = req?.params?.id;
        const query = { _id: new ObjectId(id) };
        const activity = await collections?.activites?.findOne(query);

        if (activity) {
            res.status(200).send(activity);
        } else {
            res.status(404).send(`Failed to find an activity: ID: ${id}`);
        }
    } catch (error) {
        res.status(500).send(error instanceof Error ? error.message : "Unknown Error");
    }
});

activityRouter.post("/", async (req, res) => {
    try {
        const data = req.body;

        //console.log("Received activity:", JSON.stringify(data, null, 2));

        // Convert fields before inserting
        convertActivityFields(data);

        //console.log("Inserting activity:", JSON.stringify(data, null, 2));

        const result = await collections?.activites?.insertOne(data);

        if (result?.acknowledged) {
            res.status(201).json({ success: true, id: result.insertedId });
        } else {
            res.status(500).send("Failed to create a new activity.");
        }
    } catch (error) {
        console.error("POST /activity error:", error);
        res.status(400).send(error instanceof Error ? error.message : "Unknown error");
    }
});

activityRouter.put("/:id", async (req, res) => {
    try {
        const id = req?.params?.id;
        const data = req.body;

        // Convert fields before updating
        const { _id, ...updateData } = req.body;
        convertActivityFields(updateData);
        const query = { _id: new ObjectId(id) };
        const result = await collections?.activites?.updateOne(query, { $set: updateData });

        if (result && result.matchedCount) {
            res.status(200).send(`Updated an activity: ID ${id}.`);
        } else if (!result?.matchedCount) {
            res.status(404).send(`Failed to find an activity: ID ${id}`);
        } else {
            res.status(304).send(`Failed to update an activity: ID ${id}`);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("PUT /activity/:id error:", message);
        res.status(400).send(message);
    }
});

activityRouter.delete("/:id", async (req, res) => {
    try {
        const id = req?.params?.id;
        const query = { _id: new ObjectId(id) };
        const result = await collections?.activites?.deleteOne(query);

        if (result && result.deletedCount) {
            res.status(202).send(`Removed an activity: ID ${id}`);
        } else if (!result) {
            res.status(400).send(`Failed to remove an activity: ID ${id}`);
        } else if (!result.deletedCount) {
            res.status(404).send(`Failed to find an activity: ID ${id}`);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("DELETE /activity/:id error:", message);
        res.status(400).send(message);
    }
});