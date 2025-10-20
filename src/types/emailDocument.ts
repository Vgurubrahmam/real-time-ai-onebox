
export interface EmailDocument {
    id: string;               // Unique message ID
    accountId: string;        // ID for which account this email belongs to
    folder: string;           // e.g., INBOX, Sent
    subject: string;          // Email subject line
    body: string;             // Plain text body
    from: string;             // Sender email
    to: string[];             // Recipient list
    date: Date;               // Sent/received date
    aiCategory: 
        | 'Interested'
        | 'Meeting Booked'
        | 'Not Interested'
        | 'Spam'
        | 'Out of Office'
        | 'Uncategorized';   // AI classification tag
    indexedAt: Date;          // When it was indexed into Elasticsearch
}
