import * as express from "express";
import { ObjectId } from "mongodb";
import { collections } from "./database";

export const registrationRouter = express.Router();
registrationRouter.use(express.json());

registrationRouter.get("/", async(_req, res) => {
    try {
        const registration = await collections?.registrations?.find({}).
        toArray();
        res.status(200).send(registration);
    } catch (error) {
        res.status(500).send(error instanceof Error ? 
            error.message : "Unkown Error");
    }
})

registrationRouter.get("/:id", async(req, res) => {
    try {
        const id = req?.params?.id;
        const querry = { _id: new ObjectId(id) };
        const registration = await collections?.registrations?.findOne(querry);

        if (registration) {
            res.status(200).send(registration);
        } else {
            res.status(404).send(`Failed to find an registration: ID: ${id}`);
        }
    } catch (error) {
        res.status(500).send(error instanceof Error ? 
            error.message : "Unkown Error");
    }
})

registrationRouter.post("/", async (req, res) => {
    try {
        const registration = req.body;
        const result = await collections?.registrations?.insertOne(registration);

        if (result?.acknowledged) {
            res.status(201).send(`Created a new registration: ID ${result.insertedId}.`);
        } else {
            res.status(500).send("Failed to create a new registration.");
        }
    } catch (error) {
        console.error(error);
        res.status(400).send(error instanceof Error ? error.message : "Unknown error");
    }
});

registrationRouter.put("/:id", async (req, res) => {
    try {
        const id = req?.params?.id;
        const registration = req.body;
        const query = { _id: new ObjectId(id) };
        const result = await collections?.registrations?.updateOne(query, { $set: registration });

        if (result && result.matchedCount) {
            res.status(200).send(`Updated an registration: ID ${id}.`);
        } else if (!result?.matchedCount) {
            res.status(404).send(`Failed to find an registration: ID ${id}`);
        } else {
            res.status(304).send(`Failed to update an registration: ID ${id}`);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(message);
        res.status(400).send(message);
    }
});

registrationRouter.delete("/:id", async (req, res) => {
    try {
        const id = req?.params?.id;
        const query = { _id: new ObjectId(id) };
        const result = await collections?.registrations?.deleteOne(query);

        if (result && result.deletedCount) {
            res.status(202).send(`Removed an registration: ID ${id}`);
        } else if (!result) {
            res.status(400).send(`Failed to remove an registration: ID ${id}`);
        } else if (!result.deletedCount) {
            res.status(404).send(`Failed to find an registration: ID ${id}`);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(message);
        res.status(400).send(message);
    }
});