import * as express from "express";
import { ObjectId } from "mongodb";
import { collections } from "../database";

export const activityRouter = express.Router();
activityRouter.use(express.json());

activityRouter.get("/", async(_req, res) => {
    try {
        const activites = await collections?.activites?.find({}).
        toArray();
        res.status(200).send(activites);
    } catch (error) {
        res.status(500).send(error instanceof Error ? 
            error.message : "Unkown Error");
    }
})

activityRouter.get("/:id", async(req, res) => {
    try {
        const id = String(req?.params?.id ?? "").trim();
        let activity: any = null;

        // Some old records use ObjectId, some use string _id.
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
        res.status(500).send(error instanceof Error ? 
            error.message : "Unkown Error");
    }
})

activityRouter.post("/", async (req, res) => {
    try {
        const activity = req.body;

        // Skip schema validation here so existing old-format activity data can still be saved.
        const result = await collections?.activites?.insertOne(activity, {
            bypassDocumentValidation: true,
        });

        if (!result?.acknowledged) {
            return res.status(500).send("Failed to create a new activity.");
        }

        res.status(201).send(`Created a new activity: ID ${result.insertedId}.`);
    } catch (error) {
        console.error(error);
        res.status(400).send(error instanceof Error ? error.message : "Unknown error");
    }
});

activityRouter.put("/:id", async (req, res) => {
    try {
        const id = String(req?.params?.id ?? "").trim();
        const activity = req.body;
        let result: any = null;

        // Try both possible _id formats.
        for (const query of getActivityQueries(id)) {
            result = await collections?.activites?.updateOne(
                query,
                { $set: activity },
                { bypassDocumentValidation: true },
            );

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
        console.error(message);
        res.status(400).send(message);
    }
});

activityRouter.delete("/:id", async (req, res) => {
    try {
        const id = String(req?.params?.id ?? "").trim();
        let result: any = null;

        // Try both possible _id formats.
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
        console.error(message);
        res.status(400).send(message);
    }
});

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
