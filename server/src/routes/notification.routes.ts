import * as express from "express";
import { ObjectId } from "mongodb";
import { collections } from "../database";

export const notificationRouter = express.Router();
notificationRouter.use(express.json());

notificationRouter.get("/", async(_req, res) => {
    try {
        const notifications = await collections?.notifications?.find({}).toArray();
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json(error instanceof Error ? 
            error.message : "Unkown Error");
    }
})

notificationRouter.get("/:id", async(req, res) => {
    try {
        const id = req?.params?.id;
        const querry = { _id: new ObjectId(id) };
        const user = await collections?.notifications?.findOne(querry);

        if (user) {
            res.status(200).json(user);
        } else {
            res.status(404).json(`Failed to find an employee: ID: ${id}`);
        }
    } catch (error) {
        res.status(500).json(error instanceof Error ? 
            error.message : "Unkown Error");
    }
})

notificationRouter.post("/", async (req, res) => {
    try {
        const notification = req.body;
        const result = await collections?.notifications?.insertOne(notification);

        if (result?.acknowledged) {
            res.status(201).json(`Created a new notification: ID ${result.insertedId}.`);
        } else {
            res.status(500).json("Failed to create a new notification.");
        }
    } catch (error) {
        console.error(error);
        res.status(400).json(error instanceof Error ? error.message : "Unknown error");
    }
});

notificationRouter.put("/:id", async (req, res) => {
    try {
        const id = req?.params?.id;
        const notification = req.body;
        const query = { _id: new ObjectId(id) };
        const result = await collections?.notifications?.updateOne(query, { $set: notification });

        if (result && result.matchedCount) {
            res.status(200).json(`Updated an notification: ID ${id}.`);
        } else if (!result?.matchedCount) {
            res.status(404).json(`Failed to find an notification: ID ${id}`);
        } else {
            res.status(304).json(`Failed to update an notification: ID ${id}`);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(message);
        res.status(400).json(message);
    }
});

notificationRouter.delete("/:id", async (req, res) => {
    try {
        const id = req?.params?.id;
        const query = { _id: new ObjectId(id) };
        const result = await collections?.notifications?.deleteOne(query);

        if (result && result.deletedCount) {
            res.status(202).json(`Removed an notification: ID ${id}`);
        } else if (!result) {
            res.status(400).json(`Failed to remove an notification: ID ${id}`);
        } else if (!result.deletedCount) {
            res.status(404).json(`Failed to find an notification: ID ${id}`);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(message);
        res.status(400).json(message);
    }
});