import * as express from "express";
import { ObjectId } from "mongodb";
import { collections } from "../database";
import { Checkin } from "../modal/checkin";

export const checkinRouter = express.Router();
checkinRouter.use(express.json());

checkinRouter.get("/", async (_req, res) => {
    try {
        const checkins = await collections?.checkins?.find({}).toArray();
        res.status(200).send(checkins);
    } catch (error) {
        res.status(500).send(error instanceof Error ? error.message : "Unknown error");
    }
});

checkinRouter.get("/:id", async (req, res) => {
    try {
        const id = req?.params?.id;
        const query = { _id: new ObjectId(id) };
        const checkin = await collections?.checkins?.findOne(query);

        if (checkin) {
            res.status(200).send(checkin);
        } else {
            res.status(404).send(`Failed to find a check-in record: ID ${id}`);
        }
    } catch (error) {
        res.status(500).send(error instanceof Error ? error.message : "Unknown error");
    }
});

checkinRouter.post("/", async (req, res) => {
    try {
        const { user_id, activity_id } = req.body;
        if (!user_id || !activity_id) {
            return res.status(400).send("user_id and activity_id are required.");
        }

        if (!ObjectId.isValid(user_id) || !ObjectId.isValid(activity_id)) {
            return res.status(400).send("user_id or activity_id is invalid.");
        }

        const userId = new ObjectId(user_id);
        const activityId = new ObjectId(activity_id);

        const registration = await collections?.registrations?.findOne({
            user_id: userId,
            activity_id: activityId,
            status: { $ne: "Cancelled" },
        });

        if (!registration) {
            return res.status(404).send("No active registration found for this user and activity.");
        }

        const registrationId = toObjectId(registration._id);
        if (!registrationId) {
            return res.status(500).send("Registration record has an invalid ID.");
        }

        const existingCheckin = await collections?.checkins?.findOne({
            $or: [
                { registration_id: registrationId },
                { user_id: userId, activity_id: activityId },
            ],
        });

        const attendanceTime =
            toDate(existingCheckin?.checkin_time)
            ?? toDate(registration.checkedin_at)
            ?? new Date();

        if (existingCheckin || registration.status === "Attended") {
            await collections?.registrations?.updateOne(
                { _id: registrationId },
                {
                    $set: {
                        status: "Attended",
                        checkedin_at: attendanceTime,
                        updated_at: attendanceTime,
                    },
                },
            );
            return res.status(200).send("Check-in already recorded.");
        }

        const checkin: Checkin = {
            registration_id: registrationId,
            user_id: userId,
            activity_id: activityId,
            checkin_time: attendanceTime,
            status: "Attended",
        };

        const result = await collections?.checkins?.insertOne(checkin);

        if (result?.acknowledged) {
            await collections?.registrations?.updateOne(
                { _id: registrationId },
                {
                    $set: {
                        status: "Attended",
                        checkedin_at: attendanceTime,
                        updated_at: attendanceTime,
                    },
                },
            );
            return res.status(201).send(`Created a new check-in record: ID ${result.insertedId}.`);
        }

        return res.status(500).send("Failed to create a new check-in record.");
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(message);
        res.status(400).send(message);
    }
});

function toObjectId(value: unknown): ObjectId | null {
    if (value instanceof ObjectId) {
        return value;
    }

    const text = String(value ?? "").trim();
    return ObjectId.isValid(text) ? new ObjectId(text) : null;
}

function toDate(value: unknown): Date | null {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
}
