import cron from "node-cron";
import { ObjectId } from "mongodb";
import { collections } from "./database";

async function alreadySent(
    activityId: string,
    userId: string,
    type: string,
    label: string
): Promise<boolean> {
   // Query with both string and ObjectId formats to be safe
    const existing = await collections.notifications?.findOne({
        $or: [
            // String format (from frontend-created notifications)
            { activity_id: activityId, user_id: userId, type, reminder_label: label },
            // ObjectId format (in case stored differently)
            { activity_id: new ObjectId(activityId), user_id: new ObjectId(userId), type, reminder_label: label },
        ]
    });
    return !!existing;
}

async function createNotification(data: {
    user_id: string;
    activity_id: string;
    type: string;
    title: string;
    message: string;
    reminder_label: string;
}) {
    await collections.notifications?.insertOne({
        user_id: data.user_id,
        activity_id: data.activity_id,
        type: data.type,
        title: data.title,
        message: data.message,
        reminder_label: data.reminder_label,
        is_broadcast: false,
        is_read_by: [],
        deleted_by: [],
        sent_at: new Date(),
        scheduled_at: null,
        repeat_interval_minutes: null,
        repeat_until: null,
    });
}

function getDaysUntil(activityDate: Date): number {
    const now = new Date();
    const nowDateOnly = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
    ));

    const activityDateOnly = new Date(Date.UTC(
        activityDate.getUTCFullYear(),
        activityDate.getUTCMonth(),
        activityDate.getUTCDate()
    ));

    const diff = activityDateOnly.getTime() - nowDateOnly.getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function startNotificationScheduler() {
    // Activity reminders: run every hour
    cron.schedule("* * * * *", async () => {
        try {
            const now = new Date();

            const activities = await collections.activites?.find({
                status: { $ne: "Closed" }
            }).toArray();

            if (!activities?.length) return;

            for (const activity of activities) {
                const activityId = activity._id?.toString() ?? "";
                const activityDate = new Date(activity.date);

                if (activityDate <= now) continue;

                const daysUntil = getDaysUntil(activityDate);
                const activityName = activity.name ?? `Activity ${activityId.slice(-4)}`;

                const registrations = await collections.registrations?.find({
                    activity_id: new ObjectId(activityId),
                    status: "Registered"
                }).toArray() ?? [];

                for (const registration of registrations) {
                    const userId = registration.user_id?.toString() ?? "";
                    if (!userId) continue;

                    if (daysUntil === 7) {
                        const label = "7-day";
                        if (!(await alreadySent(activityId, userId, "Reminder", label))) {
                            await createNotification({
                                user_id: userId,
                                activity_id: activityId,
                                type: "Reminder",
                                title: "7-Day Reminder",
                                message: `Reminder: "${activityName}" is coming up in 7 days. Don't forget to prepare!`,
                                reminder_label: label,
                            });
                            console.log(`[Reminder] Sent 7-day reminder to user ${userId} for activity ${activityName}`);
                        }
                    }

                    if (daysUntil === 3) {
                        const label = "3-day";
                        if (!(await alreadySent(activityId, userId, "Reminder", label))) {
                            await createNotification({
                                user_id: userId,
                                activity_id: activityId,
                                type: "Reminder",
                                title: "3-Day Reminder",
                                message: `Reminder: "${activityName}" is in 3 days. Make sure you are ready!`,
                                reminder_label: label,
                            });
                            console.log(`[Reminder] Sent 3-day reminder to user ${userId} for activity ${activityName}`);
                        }
                    }

                    if (daysUntil === 1) {
                        const label = "1-day";
                        if (!(await alreadySent(activityId, userId, "Reminder", label))) {
                            await createNotification({
                                user_id: userId,
                                activity_id: activityId,
                                type: "Reminder",
                                title: "Tomorrow Reminder",
                                message: `Reminder: "${activityName}" is TOMORROW. Don't forget to bring your QR code!`,
                                reminder_label: label,
                            });
                            console.log(`[Reminder] Sent 1-day reminder to user ${userId} for activity ${activityName}`);
                        }
                    }
                }

                const remaining = activity.max_slots - activity.slots_taken;
                const threshold = Math.ceil(activity.max_slots * 0.2);

               if (remaining > 0 && remaining <= threshold) {
                    const registeredUserIds = new Set(
                        registrations.map((r: any) => r.user_id?.toString()).filter(Boolean)
                    );

                    //console.log(`[LastSlots] Registered user IDs:`, [...registeredUserIds]);

                    const allEmployees = await collections.users?.find({
                        role: "Employee"
                    }).toArray() ?? [];

                    for (const user of allEmployees) {
                        const userId = user._id?.toString() ?? "";
                        if (!userId) continue;

                        //console.log(`[LastSlots] Checking user ${userId}, is registered: ${registeredUserIds.has(userId)}`);

                        if (registeredUserIds.has(userId)) continue;

                        const label = "last-slots";
                        if (!(await alreadySent(activityId, userId, "Update", label))) {
                            await createNotification({
                                user_id: userId,
                                activity_id: activityId,
                                type: "Update",
                                title: "Limited Slots Available",
                                message: `Only ${remaining} slot(s) left for "${activityName}"! Register now before it is full.`,
                                reminder_label: label,
                            });
                            console.log(`[LastSlots] Sent last-slots warning to user ${userId} for activity ${activityName}`);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("[Reminder] Error:", error);
        }
    });

    // Scheduled notifications: run every minute
    cron.schedule("*/5 * * * * *", async () => {
        try {
            const now = new Date();

            const pending = await collections.notifications?.find({
                sent_at: null,
                scheduled_at: { $lte: now },
            }).toArray();

            if (!pending?.length) return;

            for (const notification of pending) {
                try {
                    const result = await collections.notifications?.updateOne(
                        { _id: notification._id },
                        { $set: { sent_at: now } }
                    );
                    console.log(`[Scheduled] Sent notification ${notification._id}, modified: ${result?.modifiedCount}`);
                } catch (updateError) {
                    console.error(`[Scheduled] Failed to send notification ${notification._id}:`, updateError);
                }
            }
        } catch (error) {
            console.error("[Scheduled] Error:", error);
        }
    });
}