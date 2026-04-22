import express from "express";
import QRCode from "qrcode";
import nodemailer from "nodemailer";
import { ObjectId } from "mongodb";
import { collections } from "../database";

export const qrEmailRouter = express.Router();
qrEmailRouter.use(express.json());

// ─────────────────────────────────────────────
// Email transporter (reuse your existing one)
// ─────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ─────────────────────────────────────────────
// POST /qr-email/send
// Body: { activityId: string }
// Sends QR code emails to all registered employees
// ─────────────────────────────────────────────
qrEmailRouter.post("/send", async (req, res) => {
    try {
        const { activityId } = req.body;

        if (!activityId || !ObjectId.isValid(activityId)) {
            return res.status(400).json({ message: "Valid activityId is required." });
        }

        // Get activity details
        const activity = await collections.activites?.findOne({
            _id: new ObjectId(activityId)
        });

        if (!activity) {
            return res.status(404).json({ message: "Activity not found." });
        }

        // Get activity date for email
        const activityDate = activity.date
            ? new Date(activity.date).toISOString().split('T')[0]
            : 'N/A';
        const activityLabel = activity.name ?? `Activity ${activityId.slice(-4)}`;

        // Get all active registrations for this activity
        const registrations = await collections.registrations?.find({
            activity_id: new ObjectId(activityId),
            status: { $ne: "Cancelled" }
        }).toArray() ?? [];

        if (!registrations.length) {
            return res.status(404).json({ message: "No registered employees found for this activity." });
        }


        
        // Get unique user IDs from registrations
        const userIds = [...new Set(
            registrations.map((r: any) => r.user_id?.toString()).filter((id: string): id is string => !!id)
        )] as string[];

        //  Get employee users
        const users = await collections.users?.find({
            _id: { $in: userIds.map(id => new ObjectId(id)) },
            role: "Employee"
        }).toArray() ?? [];

        if (!users.length) {
            return res.status(404).json({ message: "No employee accounts found." });
        }

        let sent = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const user of users) {
            const employeeId = user._id?.toString();
            const email = user.email?.trim();

            if (!employeeId || !email) {
                skipped++;
                continue;
            }

            try {
                // Generate QR code payload (matches frontend parseEmployeeQrPayload)
                const qrPayload = JSON.stringify({ u: employeeId, a: activityId });

                // Generate QR code as base64 image
                const qrBase64 = await QRCode.toDataURL(qrPayload, {
                    type: 'image/png',
                    width: 420,
                    errorCorrectionLevel: 'L',
                    margin: 2,
                });

                // Extract base64 data (remove data:image/png;base64, prefix)
                const qrImageData = qrBase64.split(',')[1];

                // Send email with QR code
                await transporter.sendMail({
                    from: `"Service Day Dashboard" <${process.env.EMAIL_USER}>`,
                    to: email,
                    subject: `Your check-in QR code for ${activityLabel}`,
                    html: `
                        <p>Hi ${user.name},</p>
                        <p>Your QR code for <strong>${activityLabel}</strong> is attached below.</p>
                        <p>Date: ${activityDate}</p>
                        <p>Please present this QR code to the admin at check-in.</p>
                        <br/>
                        <img src="cid:qrcode" alt="QR Code" style="width:200px;height:200px;" />
                        <p style="color:#888;font-size:12px;">
                            Service Day Dashboard
                        </p>
                    `,
                    attachments: [
                        {
                            filename: 'qrcode.png',
                            content: qrImageData,
                            encoding: 'base64',
                            cid: 'qrcode',  // inline image reference
                        }
                    ]
                });

                sent++;
                console.log(`QR sent to ${email}`);
            } catch (error) {
                skipped++;
                errors.push(`Failed to send to ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                console.error(`Failed to send QR to ${email}:`, error);
            }
        }

        res.status(200).json({
            success: true,
            sent,
            skipped,
            total: users.length,
            errors: errors.length ? errors : undefined,
            message: `QR email dispatch finished. Sent ${sent}${skipped ? `, skipped ${skipped}` : ''}.`
        });

    } catch (error) {
        console.error("POST /qr-email/send error:", error);
        res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
});