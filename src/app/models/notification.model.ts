export interface notification {
    _id?: string,
    user_id: string,
    activity_id: string,
    type: string,
    message: string,
    sent_at: Date,
    scheduled_at: Date
}