import * as express from "express";
import { ObjectId } from "mongodb";
import { collections } from "../database";

export const activityRouter = express.Router();
activityRouter.use(express.json());

function convertActivityFields(data: any): void {
    if (data.ngo_id && typeof data.ngo_id === "string") {
        if (!ObjectId.isValid(data.ngo_id)) {
            throw new Error("Invalid ngo_id.");
        }
        data.ngo_id = new ObjectId(data.ngo_id);
    }

    if (data.date && typeof data.date === "string") {
        data.date = new Date(data.date);
    }

    if (data.cutoff_datetime && typeof data.cutoff_datetime === "string") {
        data.cutoff_datetime = parseStoredDateTime(data.cutoff_datetime);
    }

    if (data.max_slots !== undefined) {
        data.max_slots = Number.parseInt(String(data.max_slots), 10);
    }

    if (data.slots_taken !== undefined) {
        data.slots_taken = Number.parseInt(String(data.slots_taken), 10);
    }
}

function parseStoredDateTime(value: string): Date {
    const text = String(value ?? "").trim();
    if (text.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(text)) {
        return new Date(text);
    }

    if (!text.includes("T")) {
        return new Date(text);
    }

    const [datePart, timePart = "00:00"] = text.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hours, minutes] = timePart.split(":").map(Number);

    return new Date(Date.UTC(year, month - 1, day, hours - 8, minutes, 0));
}

function getActivityQueries(id: string): any[] {
    const text = String(id ?? "").trim();
    const queries: any[] = [];

    if (!text) {
        return queries;
    }

    if (ObjectId.isValid(text)) {
        queries.push({ _id: new ObjectId(text) });
    }

    queries.push({ _id: text });
    return queries;
}

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
        const id = String(req?.params?.id ?? "").trim();
        let activity: any = null;

        for (const query of getActivityQueries(id)) {
            activity = await collections?.activites?.findOne(query);
            if (activity) {
                break;
            }
        }

        if (!activity) {
            return res.status(404).send(`Failed to find an activity: ID: ${id}`);
        }

        res.status(200).send(activity);
    } catch (error) {
        res.status(500).send(error instanceof Error ? error.message : "Unknown Error");
    }
});

activityRouter.post("/", async (req, res) => {
    try {
        const data = req.body;
        convertActivityFields(data);

        const result = await collections?.activites?.insertOne(data);

        if (!result?.acknowledged) {
            return res.status(500).send("Failed to create a new activity.");
        }

        res.status(201).send(`Created a new activity: ID ${result.insertedId}.`);
    } catch (error) {
        console.error("POST /activity error:", error);
        res.status(400).send(error instanceof Error ? error.message : "Unknown error");
    }
});

activityRouter.put("/:id", async (req, res) => {
    try {
        const id = String(req?.params?.id ?? "").trim();
        const data = req.body;
        let result: any = null;

        convertActivityFields(data);

        for (const query of getActivityQueries(id)) {
            result = await collections?.activites?.updateOne(query, { $set: data });
            if (result?.matchedCount) {
                break;
            }
        }

        if (!result?.matchedCount) {
            return res.status(404).send(`Failed to find an activity: ID ${id}`);
        }

        res.status(200).send(`Updated an activity: ID ${id}.`);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("PUT /activity/:id error:", message);
        res.status(400).send(message);
    }
});

activityRouter.delete("/:id", async (req, res) => {
    try {
        const id = String(req?.params?.id ?? "").trim();
        let result: any = null;

        for (const query of getActivityQueries(id)) {
            result = await collections?.activites?.deleteOne(query);
            if (result?.deletedCount) {
                break;
            }
        }

        if (!result?.deletedCount) {
            return res.status(404).send(`Failed to find an activity: ID ${id}`);
        }

        res.status(202).send(`Removed an activity: ID ${id}`);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("DELETE /activity/:id error:", message);
        res.status(400).send(message);
    }
});
