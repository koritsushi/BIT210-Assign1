import cron from "node-cron";
import { ObjectId } from "mongodb";
import { collections } from "./database";

// ─────────────────────────────────────────────
// Helper: check if a notification was already sent
// to avoid duplicate reminders on each cron tick
// ─────────────────────────────────────────────
async function alreadySent(
    activityId: string,
    userId: string,
    type: string,
    label: string
): Promise<boolean> {
    const existing = await collections.notifications?.findOne({
        activity_id: activityId,
        user_id: userId,
        type,
        reminder_label: label,
    });
    return !!existing;
}

// ─────────────────────────────────────────────
// Helper: create a notification document
// ─────────────────────────────────────────────
async function createNotification(data: {
    user_id: string;
    activity_id: string;
    type: string;
    message: string;
    reminder_label: string;
}) {
    await collections.notifications?.insertOne({
        user_id: data.user_id,
        activity_id: data.activity_id,
        type: data.type,
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

// ─────────────────────────────────────────────
// Helper: get days difference between now and a date
// ─────────────────────────────────────────────
function getDaysUntil(date: Date): number {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─────────────────────────────────────────────
// SCHEDULER: runs every hour
// Checks all upcoming activities and sends
// reminders at 7 days, 3 days, and 1 day before
// ─────────────────────────────────────────────
export function startNotificationScheduler() {
    console.log("Notification scheduler started...");

    // Run every hour
    cron.schedule("0 * * * *", async () => {
        console.log(`[Scheduler] Running at ${new Date().toISOString()}`);

        try {
            const now = new Date();

            // Get all upcoming activities (not yet started)
            const activities = await collections.activites?.find({
                date: { $gt: now },
                status: { $ne: "Closed" }
            }).toArray();

            if (!activities?.length) return;

            for (const activity of activities) {
                const activityId = activity._id?.toString() ?? "";
                const daysUntil = getDaysUntil(new Date(activity.date));
                const activityName = activity.name ?? `Activity ${activityId.slice(-4)}`;

                // Get all registrations for this activity
                const registrations = await collections.registrations?.find({
                    activity_id: new ObjectId(activityId),
                    status: "Registered"
                }).toArray();

                if (!registrations?.length) continue;

                for (const registration of registrations) {
                    const userId = registration.user_id?.toString() ?? "";

                    // ── 7 days reminder ──
                    if (daysUntil === 7) {
                        const label = "7-day";
                        if (!(await alreadySent(activityId, userId, "Reminder", label))) {
                            await createNotification({
                                user_id: userId,
                                activity_id: activityId,
                                type: "Reminder",
                                message: `Reminder: "${activityName}" is coming up in 7 days. Don't forget to prepare!`,
                                reminder_label: label,
                            });
                        }
                    }

                    // ── 3 days reminder ──
                    if (daysUntil === 3) {
                        const label = "3-day";
                        if (!(await alreadySent(activityId, userId, "Reminder", label))) {
                            await createNotification({
                                user_id: userId,
                                activity_id: activityId,
                                type: "Reminder",
                                message: `Reminder: "${activityName}" is in 3 days. Make sure you are ready!`,
                                reminder_label: label,
                            });
                        }
                    }

                    // ── 1 day reminder ──
                    if (daysUntil === 1) {
                        const label = "1-day";
                        if (!(await alreadySent(activityId, userId, "Reminder", label))) {
                            await createNotification({
                                user_id: userId,
                                activity_id: activityId,
                                type: "Reminder",
                                message: `Reminder: "${activityName}" is TOMORROW. Don't forget to bring your QR code!`,
                                reminder_label: label,
                            });
                        }
                    }
                }

                // ── Urgent: last slots warning ──
                // triggers when only 20% or fewer slots remain
                const remaining = activity.max_slots - activity.slots_taken;
                const threshold = Math.ceil(activity.max_slots * 0.2);

                if (remaining > 0 && remaining <= threshold) {
                    // broadcast to all users who haven't registered
                    const registeredUserIds = registrations.map((r: { user_id: { toString: () => any; }; }) => r.user_id?.toString());

                    const allUsers = await collections.users?.find({
                        role: "Employee"
                    }).toArray();

                    for (const user of allUsers ?? []) {
                        const userId = user._id?.toString() ?? "";
                        if (registeredUserIds.includes(userId)) continue;

                        const label = "last-slots";
                        if (!(await alreadySent(activityId, userId, "Update", label))) {
                            await createNotification({
                                user_id: userId,
                                activity_id: activityId,
                                type: "Update",
                                message: `⚠ Only ${remaining} slot(s) left for "${activityName}"! Register now before it's full.`,
                                reminder_label: label,
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error("[Scheduler] Error:", error);
        }
    });

    // ── Scheduled notifications: run every minute ──
    // sends notifications where scheduled_at <= now and sent_at is null
    cron.schedule("* * * * *", async () => {
        try {
            const now = new Date();
            const pending = await collections.notifications?.find({
                scheduled_at: { $lte: now },
                sent_at: null,
            }).toArray();

            for (const notification of pending ?? []) {
                await collections.notifications?.updateOne(
                    { _id: notification._id },
                    { $set: { sent_at: now } }
                );
            }
        } catch (error) {
            console.error("[Scheduler] Scheduled notification error:", error);
        }
    });
}