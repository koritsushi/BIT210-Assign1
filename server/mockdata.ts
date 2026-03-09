import { User } from "./src/user";
import { Ngo } from "./src/ngo";
import { Activity } from "./src/activity";
import { Registration } from "./src/registration";
import { ObjectId } from "mongodb";

// --- Pre-defined IDs for relational linking ---
const userId1 = new ObjectId("507f1f77bcf86cd799439001");
const userId2 = new ObjectId("507f1f77bcf86cd799439002");

const ngoId1 = new ObjectId("507f1f77bcf86cd799439011");
const ngoId2 = new ObjectId("507f1f77bcf86cd799439012");

const activityId1 = new ObjectId("507f1f77bcf86cd799439021");
const activityId2 = new ObjectId("507f1f77bcf86cd799439022");

const registered1 = new ObjectId("507f1f77bcf86cd799439031");

// --- Mock Data ---
export const mockUsers: User[] = [
  { _id: userId1, name: "Alice Tan", email: "alice@company.com", department: "IT", role: "Employee" },
  { _id: userId2, name: "Bob Lee", email: "bob@company.com", department: "HR", role: "Admin" },
];

export const mockNgos: Ngo[] = [
  { _id: ngoId1, name: "Food Bank KL", description: "Food distribution", location: "Kuala Lumpur", service_type: "Food Aid", is_active: true },
  { _id: ngoId2, name: "Green Earth", description: "Tree planting", location: "Shah Alam", service_type: "Environment", is_active: true },
];

export const mockActivities: Activity[] = [
  { _id: activityId1, ngo_id: ngoId1, date: new Date("2026-04-10"), start_time: new Date("2026-04-10T08:00:00").getTime(), end_time: new Date("2026-08-12T10:00:00").getTime(), max_slots: 20, slots_taken: 5, cutoff_datetime: new Date("2026-04-08T23:59:00"), status: "Open", qr_code: "test" },
  { _id: activityId2, ngo_id: ngoId2, date: new Date("2026-04-10"), start_time: new Date("2026-08-12T00:00:00").getTime(), end_time: new Date("2026-08-22T12:00:00").getTime(), max_slots: 15, slots_taken: 15, cutoff_datetime: new Date("2026-04-08T23:59:00"), status: "Full", qr_code: "test" },
];

export const mockRegistrations: Registration[] = [  
  { _id: registered1, user_id: userId1, activity_id: activityId1, registered_at: new Date("2026-03-01T10:00:00"), updated_at: new Date("2026-03-01T10:00:00"), status: "Registered" },
];