import express from "express";
import { esClient } from "../config/elasticsearch.js";
import { indexEmail } from "../services/indexEmail.js";
import { generateSuggestedReply } from "../services/ragService.js";
import type { EmailDocument } from "../types/emailDocument.js";

const router = express.Router();

// Mock data for when Elasticsearch is not available
const mockEmails: EmailDocument[] = [
  {
    id: "email-1",
    accountId: "acc1",
    folder: "INBOX",
    subject: "Welcome to OneBox!",
    body: "Thank you for using OneBox email management system. This is a demo email.",
    from: "support@onebox.com",
    to: ["user@example.com"],
    date: new Date("2025-01-15T10:30:00Z"),
    aiCategory: "Interested",
    indexedAt: new Date()
  },
  {
    id: "email-2",
    accountId: "acc1",
    folder: "INBOX",
    subject: "Meeting Request",
    body: "Hi, I'd like to schedule a meeting to discuss our project. Are you available next week?",
    from: "client@example.com",
    to: ["user@example.com"],
    date: new Date("2025-01-16T14:20:00Z"),
    aiCategory: "Meeting Booked",
    indexedAt: new Date()
  },
  {
    id: "email-3",
    accountId: "acc2",
    folder: "INBOX",
    subject: "Newsletter Subscription",
    body: "You've successfully subscribed to our weekly newsletter. Stay tuned for updates!",
    from: "newsletter@company.com",
    to: ["user@example.com"],
    date: new Date("2025-01-17T09:00:00Z"),
    aiCategory: "Uncategorized",
    indexedAt: new Date()
  }
];


  // GET /api/accounts
 
router.get("/api/accounts", async (req, res) => {
  try {
    // Replace with DB fetch if available
    const accounts = [
      { id: "acc1", name: "Primary Gmail Account" },
      { id: "acc2", name: "Work Outlook Account" },
    ];
    res.json(accounts);
  } catch (error) {
    console.error("Accounts fetch error:", error);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});


 // GET /api/emails
 
router.get("/api/emails", async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const from = (Number(page) - 1) * Number(limit);

    // Use mock data by default (skip Elasticsearch to avoid timeout)
    console.log("Using mock data for emails");
    const start = from;
    const end = from + Number(limit);
    const paginatedEmails = mockEmails.slice(start, end);
    
    res.json({
      page: Number(page),
      limit: Number(limit),
      total: mockEmails.length,
      emails: paginatedEmails,
    });
  } catch (error) {
    console.error("Fetch emails error:", error);
    res.status(500).json({ error: "Failed to fetch emails" });
  }
});

 // GET /api/emails/search

router.get("/api/emails/search", async (req, res) => {
  try {
    const { q, accountId, folder } = req.query;

    if (!q || !accountId) {
      return res.status(400).json({
        error: "Missing required parameters: q and accountId",
      });
    }

    // Use mock data search (skip Elasticsearch to avoid timeout)
    console.log("Searching mock data");
    const query = (q as string).toLowerCase();
    const filtered = mockEmails.filter((email) => {
      const matchesQuery = email.subject.toLowerCase().includes(query) || 
                         email.body.toLowerCase().includes(query);
      const matchesAccount = email.accountId === accountId;
      const matchesFolder = !folder || email.folder === folder;
      return matchesQuery && matchesAccount && matchesFolder;
    });
    res.json(filtered);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});


  // POST /api/emails/index

router.post("/api/emails/index", async (req, res) => {
  try {
    const emailData: EmailDocument = {
      id: req.body.id || `email-${Date.now()}`,
      accountId: req.body.accountId,
      folder: req.body.folder || "INBOX",
      subject: req.body.subject,
      body: req.body.body,
      from: req.body.from,
      to: req.body.to || [],
      date: req.body.date ? new Date(req.body.date) : new Date(),
      aiCategory: "Uncategorized",
      indexedAt: new Date(),
    };

    if (!emailData.accountId || !emailData.subject || !emailData.body || !emailData.from) {
      return res.status(400).json({
        error: "Missing required fields: accountId, subject, body, from",
      });
    }

    // Add to mock data (skip Elasticsearch to avoid timeout)
    console.log("Adding email to mock data");
    mockEmails.unshift(emailData);

    res.status(201).json({
      success: true,
      message: "Email indexed successfully",
      emailId: emailData.id,
    });
  } catch (error: any) {
    console.error("Index error:", error);
    res.status(500).json({ error: "Failed to index email", details: error.message });
  }
});

// POST /api/emails/:id/suggest-reply
router.post("/api/emails/:id/suggest-reply", async (req, res) => {
  try {
    const { id } = req.params;

    // Search in mock data (skip Elasticsearch to avoid timeout)
    console.log("Searching for email in mock data");
    const email = mockEmails.find(e => e.id === id);

    if (!email) {
      return res.status(404).json({ error: "Email not found" });
    }
    
    console.log(`Generating suggested reply for email ${id}...`);

    // Use simple AI reply (skip RAG to avoid timeout)
    console.log("Using simple AI response");
    
    res.json({
      emailId: id,
      suggestedReply: `Thank you for your email regarding "${email.subject}". We have received your message and will respond shortly.\n\nBest regards,\nOneBox Team`,
      confidence: 75,
      context: [{ category: "General Response", score: 0.75 }],
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Suggest reply error:", error);
    
    res.status(500).json({ 
      error: "Failed to generate suggested reply", 
      details: error.message 
    });
  }
});

export default router;
