import * as express from "express";
import { ObjectId } from "mongodb";
import { collections } from "../database";

export const notificationRouter = express.Router();
notificationRouter.use(express.json());

const convertDateFields = (data: any): void => {
      const dateFields = ['sent_at', 'scheduled_at', 'repeat_until'];
        dateFields.forEach(field => {
            if (data[field]) {
                const originalValue = data[field];
                const originalType = typeof originalValue;
                
                // Convert string or ensure it's a Date object
                if (typeof data[field] === 'string') {
                    data[field] = new Date(data[field]);
                } else if (!(data[field] instanceof Date)) {
                    data[field] = new Date(data[field]);
                }
                
                console.log(`${field}: ${originalValue} (${originalType}) -> ${data[field]} (Date: ${data[field] instanceof Date})`);
            }
        });
}

notificationRouter.get("/", async(_req, res) => {
    try {
        const notifications = await collections?.notifications?.find({}).toArray();
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json(error instanceof Error ? 
            error.message : "Unknown Error");
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
            error.message : "Unknown Error");
    }
})

notificationRouter.post("/", async (req, res) => {
    try {
        const data = req.body;
        
        // Convert ISO string dates back to Date objects
        convertDateFields(data);
    
        // Insert into MongoDB
        const result = await collections?.notifications.insertOne(data);
    
        res.status(201).json({ 
            success: true, 
            id: result.insertedId 
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(message);
        res.status(400).json(message);
    }
});

notificationRouter.put("/:id", async (req, res) => {
    try {
        const id = req?.params?.id;
        const notification = req.body;
        convertDateFields(notification);
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