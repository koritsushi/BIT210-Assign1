import * as express from "express";
import { ObjectId } from "mongodb";
import { collections } from "../database";

export const ngoRouter = express.Router();
ngoRouter.use(express.json());

ngoRouter.get("/", async(_req, res) => {
    try {
        const ngos = await collections?.ngos?.find({}).
        toArray();
        res.status(200).send(ngos);
    } catch (error) {
        res.status(500).send(error instanceof Error ? 
            error.message : "Unkown Error");
    }
})

ngoRouter.get("/:id", async(req, res) => {
    try {
        const id = req?.params?.id;
        const querry = { _id: new ObjectId(id) };
        const ngo = await collections?.ngos?.findOne(querry);

        if (ngo) {
            res.status(200).send(ngo);
        } else {
            res.status(404).send(`Failed to find an Ngo: ID: ${id}`);
        }
    } catch (error) {
        res.status(500).send(error instanceof Error ? 
            error.message : "Unkown Error");
    }
})

ngoRouter.post("/", async (req, res) => {
    try {
        const ngo = normalizeNgoPayload(req.body);
        const result = await collections?.ngos?.insertOne(ngo);

        if (result?.acknowledged) {
            res.status(201).send(`Created a new Ngo: ID ${result.insertedId}.`);
        } else {
            res.status(500).send("Failed to create a new Ngo.");
        }
    } catch (error) {
        console.error(error);
        res.status(400).send(error instanceof Error ? error.message : "Unknown error");
    }
});

ngoRouter.put("/:id", async (req, res) => {
    try {
        const id = req?.params?.id;
        const { _id, ...updateData } = req.body;
        const ngo = normalizeNgoPayload(updateData);

        const query = { _id: new ObjectId(id) };
        const result = await collections?.ngos?.updateOne(query, { $set: ngo });

        if (result && result.matchedCount) {
            res.status(200).send(`Updated an Ngo: ID ${id}.`);
        } else if (!result?.matchedCount) {
            res.status(404).send(`Failed to find an Ngo: ID ${id}`);
        } else {
            res.status(304).send(`Failed to update an Ngo: ID ${id}`);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(message);
        res.status(400).send(message);
    }
});

ngoRouter.delete("/:id", async (req, res) => {
    try {
        const id = String(req?.params?.id ?? "").trim();
        let ngo: any = null;

        for (const query of getNgoQueries(id)) {
            ngo = await collections?.ngos?.findOne(query);
            if (ngo) {
                break;
            }
        }

        if (!ngo) {
            return res.status(404).send(`Failed to find an Ngo: ID ${id}`);
        }

        const activities = await collections?.activites?.find({})?.toArray() ?? [];
        const isReferenced = activities.some((activity: any) => activityUsesNgo(activity, ngo, id));

        if (isReferenced) {
            return res.status(409).send("Cannot delete NGO because it is used by one or more activities.");
        }

        let result: any = null;

        for (const query of getNgoQueries(id)) {
            result = await collections?.ngos?.deleteOne(query);
            if (result?.deletedCount) {
                break;
            }
        }

        if (result && result.deletedCount) {
            res.status(202).send(`Removed an Ngo: ID ${id}`);
        } else if (!result) {
            res.status(400).send(`Failed to remove an Ngo: ID ${id}`);
        } else if (!result.deletedCount) {
            res.status(404).send(`Failed to find an Ngo: ID ${id}`);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(message);
        res.status(400).send(message);
    }
});

function getNgoQueries(id: string): any[] {
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

function activityUsesNgo(activity: any, ngo: any, rawNgoId: string): boolean {
    const activityNgoId = normalizeText(activity?.ngo_id);
    const ngoId = normalizeText(rawNgoId) || normalizeText(ngo?._id);

    if (activityNgoId && ngoId && activityNgoId === ngoId) {
        return true;
    }

    if (activityNgoId) {
        return false;
    }

    const activityNgoName = normalizeText(activity?.ngo_name).toLowerCase();
    const ngoName = normalizeText(ngo?.name).toLowerCase();
    return Boolean(activityNgoName && ngoName && activityNgoName === ngoName);
}

function normalizeText(value: unknown): string {
    return String(value ?? "").trim();
}

function normalizeNgoPayload(payload: any) {
    const { _id, ...rest } = payload;
    return {
        ...rest,
        description: normalizeText(payload?.description),
    };
}
