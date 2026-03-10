import { User } from "./src/user";
import { Ngo } from "./src/ngo";
import { Activity } from "./src/activity";
import { Registration } from "./src/registration";
import { Notification } from "./src/notification";
import { ObjectId } from "mongodb";

// --- Pre-defined IDs for relational linking ---
const userId1 = new ObjectId("507f1f77bcf86cd799439001");
const userId2 = new ObjectId("507f1f77bcf86cd799439002");

const ngoId1 = new ObjectId("507f1f77bcf86cd799439011");
const ngoId2 = new ObjectId("507f1f77bcf86cd799439012");
const ngoId3 = new ObjectId("507f1f77bcf86cd799439013");
const ngoId4 = new ObjectId("507f1f77bcf86cd799439014");
const ngoId5 = new ObjectId("507f1f77bcf86cd799439015");
const ngoId6 = new ObjectId("507f1f77bcf86cd799439016");

const activityId1 = new ObjectId("507f1f77bcf86cd799439021");
const activityId2 = new ObjectId("507f1f77bcf86cd799439022");
const activityId3 = new ObjectId("507f1f77bcf86cd799439023");
const activityId4 = new ObjectId("507f1f77bcf86cd799439024");
const activityId5 = new ObjectId("507f1f77bcf86cd799439025");
const activityId6 = new ObjectId("507f1f77bcf86cd799439026");

const registered1 = new ObjectId("507f1f77bcf86cd799439031");

const notification1 = new ObjectId("507f1f77bcf86cd799439041")
const notification2 = new ObjectId("507f1f77bcf86cd799439042")
const notification3 = new ObjectId("507f1f77bcf86cd799439043")
const notification4 = new ObjectId("507f1f77bcf86cd799439044")
const notification5 = new ObjectId("507f1f77bcf86cd799439045")
const notification6 = new ObjectId("507f1f77bcf86cd799439046")
const notification7 = new ObjectId("507f1f77bcf86cd799439047")
const notification8 = new ObjectId("507f1f77bcf86cd799439048")
// --- Mock Data ---
export const mockUsers: User[] = [
  { _id: userId1, name: "Alice Tan", email: "alice@company.com", department: "IT", role: "Employee" },
  { _id: userId2, name: "Bob Lee", email: "bob@company.com", department: "HR", role: "Admin" },
];

export const mockNgos: Ngo[] = [
  { _id: ngoId1, name: "Food Bank KL", description: "Food distribution", location: "Kuala Lumpur", service_type: "Food Aid", is_active: true },
  { _id: ngoId2, name: "Green Earth", description: "Tree planting", location: "Shah Alam", service_type: "Environment", is_active: true },
  { _id: ngoId3, name: "Waste Saver", description: "Tree planting", location: "Shah Alam", service_type: "Environment", is_active: true },
  { _id: ngoId4, name: "Recycler", description: "Tree planting", location: "Shah Alam", service_type: "Environment", is_active: true },
  { _id: ngoId5, name: "Green Light", description: "Tree planting", location: "Shah Alam", service_type: "Environment", is_active: true },
  { _id: ngoId6, name: "Green Leaves", description: "Tree planting", location: "Shah Alam", service_type: "Environment", is_active: true },
];

export const mockActivities: Activity[] = [
  { _id: activityId1, ngo_id: ngoId1, name: "Food Charity", date: new Date("2026-04-10"), start_time: new Date("2026-04-10T08:00:00").getTime(), end_time: new Date("2026-08-12T10:00:00").getTime(), max_slots: 20, slots_taken: 5, cutoff_datetime: new Date("2026-04-08T23:59:00"), status: "Open", qr_code: "test" },
  { _id: activityId2, ngo_id: ngoId2, name: "Plant Trees", date: new Date("2026-04-10"), start_time: new Date("2026-08-12T00:00:00").getTime(), end_time: new Date("2026-08-22T12:00:00").getTime(), max_slots: 15, slots_taken: 15, cutoff_datetime: new Date("2026-04-08T23:59:00"), status: "Full", qr_code: "test" },
  { _id: activityId3, ngo_id: ngoId3, name: "Clean River", date: new Date("2026-04-10"), start_time: new Date("2026-04-10T08:00:00").getTime(), end_time: new Date("2026-08-12T10:00:00").getTime(), max_slots: 20, slots_taken: 5, cutoff_datetime: new Date("2026-04-08T23:59:00"), status: "Open", qr_code: "test" },
  { _id: activityId4, ngo_id: ngoId4, name: "Animal Shelter Support", date: new Date("2026-04-10"), start_time: new Date("2026-08-12T00:00:00").getTime(), end_time: new Date("2026-08-22T12:00:00").getTime(), max_slots: 15, slots_taken: 15, cutoff_datetime: new Date("2026-04-08T23:59:00"), status: "Full", qr_code: "test" },
  { _id: activityId5, ngo_id: ngoId5, name: "Clean River", date: new Date("2026-04-10"), start_time: new Date("2026-04-10T08:00:00").getTime(), end_time: new Date("2026-08-12T10:00:00").getTime(), max_slots: 20, slots_taken: 5, cutoff_datetime: new Date("2026-04-08T23:59:00"), status: "Open", qr_code: "test" },
  { _id: activityId6, ngo_id: ngoId6, name: "Animal Shelter Support", date: new Date("2026-04-10"), start_time: new Date("2026-08-12T00:00:00").getTime(), end_time: new Date("2026-08-22T12:00:00").getTime(), max_slots: 15, slots_taken: 15, cutoff_datetime: new Date("2026-04-08T23:59:00"), status: "Full", qr_code: "test" }

];

export const mockRegistrations: Registration[] = [  
  { _id: registered1, user_id: userId1, activity_id: activityId1, registered_at: new Date("2026-03-01T10:00:00"), updated_at: new Date("2026-03-01T10:00:00"), status: "Registered" },
];

export const mockNotifications: Notification[] = [
    // --- Registration confirmation ---
    {
        _id: notification1,
        user_id: userId1,
        activity_id: activityId1,
        type: "Registration",
        message: "You have successfully registered for Beach Cleaning on 2026-04-10.",
        is_read: false,
        is_broadcast: false,
        sent_at: new Date("2026-03-01T10:00:00"),
        scheduled_at: new Date("2026-03-01T10:00:00"),
    },

    // --- Cancellation notification ---
    {
        _id: notification2,
        user_id: userId2,
        activity_id: activityId2,
        type: "Cancellation",
        message: "Your registration for Food Bank Packing has been cancelled.",
        is_read: true,
        is_broadcast: false,
        sent_at: new Date("2026-03-05T09:00:00"),
        scheduled_at: new Date("2026-03-05T09:00:00"),
    },

    // --- Scheduled reminder — 1 week before ---
    {
        _id: notification3,
        user_id: userId1,
        activity_id: activityId1,
        type: "Reminder",
        message: "Reminder: Beach Cleaning is coming up in 1 week on 2026-04-10. Please be prepared!",
        is_read: false,
        is_broadcast: false,
        sent_at: new Date("2026-04-03T08:00:00"),
        scheduled_at: new Date("2026-04-03T08:00:00"),
    },

    // --- Scheduled reminder — 3 days before ---
    {
        _id: notification4,
        user_id: userId1,
        activity_id: activityId1,
        type: "Reminder",
        message: "Reminder: Beach Cleaning is in 3 days on 2026-04-10. Check your schedule!",
        is_read: false,
        is_broadcast: false,
        sent_at: new Date("2026-04-07T08:00:00"),
        scheduled_at: new Date("2026-04-07T08:00:00"),
    },

    // --- Scheduled reminder — 1 day before ---
    {
        _id: notification5,
        user_id: userId1,
        activity_id: activityId1,
        type: "Reminder",
        message: "Reminder: Beach Cleaning is TOMORROW on 2026-04-10. Don't forget to bring your QR code!",
        is_read: false,
        is_broadcast: false,
        sent_at: new Date("2026-04-09T08:00:00"),
        scheduled_at: new Date("2026-04-09T08:00:00"),
    },

    // --- Activity update ---
    {
        _id: notification6,
        user_id: userId2,
        activity_id: activityId2,
        type: "Update",
        message: "Food Bank Packing activity details have been updated. New location: PJ Community Center Level 2.",
        is_read: false,
        is_broadcast: false,
        sent_at: new Date("2026-03-15T14:00:00"),
        scheduled_at: new Date("2026-03-15T14:00:00"),
    },

    // --- Urgent update — last available slots ---
    {
        _id: notification7,
        user_id: userId2,
        activity_id: activityId2,
        type: "Update",
        message: "Urgent: Only 2 slots remaining for Food Bank Packing on 2026-04-10. Register now!",
        is_read: false,
        is_broadcast: false,
        sent_at: new Date("2026-03-20T10:00:00"),
        scheduled_at: new Date("2026-03-20T10:00:00"),
    },

    // --- Admin broadcast to all employees ---
    {
        _id: notification8,
        user_id: undefined,            // no specific user — broadcast to all
        activity_id: undefined,        // not activity specific
        type: "Broadcast",
        message: "Service Day 2026 is coming! Browse available NGO activities and register before the cut-off dates. Let's make a difference together!",
        is_read: false,
        is_broadcast: true,
        sent_at: new Date("2026-03-01T09:00:00"),
        scheduled_at: new Date("2026-03-01T09:00:00"),
    },
]