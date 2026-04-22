import * as express from "express";
import * as mongodb from "mongodb";
import speakeasy from "speakeasy";
import { ObjectId } from "mongodb";
import { collections } from "../database";

export const userRouter = express.Router();
userRouter.use(express.json());

userRouter.get("/", async(_req, res) => {
    try {
        const users = await collections?.users?.find({}).toArray();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json(error instanceof Error ? 
            error.message : "Unkown Error");
    }
})

userRouter.get("/:id", async(req, res) => {
    try {
        const id = req?.params?.id;
        const querry = { _id: new ObjectId(id) };
        const user = await collections?.users?.findOne(querry);

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

userRouter.post("/", async (req, res) => {
    try {
        const user = req.body;
        const result = await collections?.users?.insertOne(user);

        if (result?.acknowledged) {
            res.status(201).json(`Created a new user: ID ${result.insertedId}.`);
        } else {
            res.status(500).json("Failed to create a new user.");
        }
    } catch (error) {
        console.error(error);
        res.status(400).json(error instanceof Error ? error.message : "Unknown error");
    }
});

userRouter.put("/:id/toggle-2fa", async (req, res) => {
    try {
        const id = req.params.id;
        const { twofa_enabled } = req.body;
 
        if (typeof twofa_enabled !== "boolean") {
            return res.status(400).json({ message: "twofa_enabled must be a boolean." });
        }
 
        // Generate a new secret if enabling for first time
        let updateFields: any = { twofa_enabled };
 
        if (twofa_enabled) {
            const speakeasy = require("speakeasy");
            const existing = await collections.users?.findOne({
                _id: new mongodb.ObjectId(id)
            });
 
            // Only generate new secret if one doesn't exist yet
            if (!existing?.twofa_secret) {
                const secret = speakeasy.generateSecret({ length: 20 });
                updateFields.twofa_secret = secret.base32;
            }
        }
 
        const result = await collections.users?.updateOne(
            { _id: new mongodb.ObjectId(id) },
            { $set: updateFields }
        );
 
        if (!result?.matchedCount) {
            return res.status(404).json({ message: "User not found." });
        }
 
        res.status(200).json({
            message: twofa_enabled
                ? "Two-factor authentication has been enabled."
                : "Two-factor authentication has been disabled."
        });
    } catch (error) {
        console.error("Toggle 2FA error:", error);
        res.status(500).json({ message: "Failed to update 2FA setting." });
    }
});

userRouter.put("/:id", async (req, res) => {
    try {
        const id = req?.params?.id;
        const { _id, password, ...updateData } = req.body;

        const query = { _id: new ObjectId(id) };
        const result = await collections?.users?.updateOne(query, { $set: updateData });


        if (result && result.matchedCount) {
            res.status(200).json(`Updated an employee: ID ${id}.`);
        } else if (!result?.matchedCount) {
            res.status(404).json(`Failed to find an employee: ID ${id}`);
        } else {
            res.status(304).json(`Failed to update an employee: ID ${id}`);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(message);
        res.status(400).json(message);
    }
});

userRouter.delete("/:id", async (req, res) => {
    try {
        const id = req?.params?.id;
        const query = { _id: new ObjectId(id) };
        const result = await collections?.users?.deleteOne(query);

        if (result && result.deletedCount) {
            res.status(202).json(`Removed an employee: ID ${id}`);
        } else if (!result) {
            res.status(400).json(`Failed to remove an employee: ID ${id}`);
        } else if (!result.deletedCount) {
            res.status(404).json(`Failed to find an employee: ID ${id}`);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(message);
        res.status(400).json(message);
    }
});