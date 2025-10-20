import { indexEmail } from "../services/indexEmail.js";
import type{ EmailDocument } from "../types/emailDocument.js";
const newEmail: EmailDocument = {
    id: '',
    accountId: '',
    folder: '',
    subject: '',
    from: '',
    to: [],
    date: new Date(),
    body: '',
    aiCategory: "Interested",
    indexedAt: new Date()
}; // Define newEmail with appropriate email data
await indexEmail(newEmail)