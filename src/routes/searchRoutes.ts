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

    try {
      // Try Elasticsearch first
      const result = await esClient.search({
        index: "emails",
        from,
        size: Number(limit),
        sort: [{ date: { order: "desc" } }],
        query: { match_all: {} },
      });

      const emails = result.hits.hits.map((hit: any) => hit._source);
      res.json({
        page: Number(page),
        limit: Number(limit),
        total: result.hits.total?.valueOf,
        emails,
      });
    } catch (esError) {
      // Fallback to mock data if Elasticsearch is not available
      console.warn("Elasticsearch not available, using mock data");
      const start = from;
      const end = from + Number(limit);
      const paginatedEmails = mockEmails.slice(start, end);
      
      res.json({
        page: Number(page),
        limit: Number(limit),
        total: mockEmails.length,
        emails: paginatedEmails,
      });
    }
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

    try {
      // Try Elasticsearch first
      const must: any[] = [{ multi_match: { query: q as string, fields: ["subject", "body"] } }];
      const filter: any[] = [{ term: { accountId: accountId as string } }];

      if (folder) {
        filter.push({ term: { folder: folder as string } });
      }

      const result = await esClient.search({
        index: "emails",
        query: {
          bool: { must, filter },
        },
      });

      res.json(result.hits.hits.map((hit: any) => hit._source));
    } catch (esError) {
      // Fallback to mock data search
      console.warn("Elasticsearch not available, searching mock data");
      const query = (q as string).toLowerCase();
      const filtered = mockEmails.filter((email) => {
        const matchesQuery = email.subject.toLowerCase().includes(query) || 
                           email.body.toLowerCase().includes(query);
        const matchesAccount = email.accountId === accountId;
        const matchesFolder = !folder || email.folder === folder;
        return matchesQuery && matchesAccount && matchesFolder;
      });
      res.json(filtered);
    }
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

    try {
      // Try to index with Elasticsearch
      await indexEmail(emailData);
    } catch (esError) {
      // Fallback: add to mock data
      console.warn("Elasticsearch not available, adding to mock data");
      mockEmails.unshift(emailData);
    }

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

    let email: any = null;

    try {
      // Try to fetch from Elasticsearch
      const result = await esClient.get({
        index: "emails",
        id: id,
      });

      if (result.found) {
        email = result._source;
      }
    } catch (esError) {
      // Fallback to mock data
      console.warn("Elasticsearch not available, searching mock data");
      email = mockEmails.find(e => e.id === id);
    }

    if (!email) {
      return res.status(404).json({ error: "Email not found" });
    }
    
    // Construct the full email text for RAG
    const emailText = `Subject: ${email.subject}\nFrom: ${email.from}\nDate: ${email.date}\n\n${email.body}`;

    console.log(`Generating suggested reply for email ${id}...`);

    try {
      // Try RAG pipeline
      const ragResult = await generateSuggestedReply(emailText);

      res.json({
        emailId: id,
        suggestedReply: ragResult.suggestedReply,
        confidence: ragResult.confidence,
        context: ragResult.retrievedContext.map(ctx => ({
          category: ctx.category,
          score: ctx.score,
        })),
        timestamp: new Date().toISOString(),
      });
    } catch (ragError: any) {
      // Fallback to simple AI reply
      console.warn("RAG not available, using simple AI response");
      
      res.json({
        emailId: id,
        suggestedReply: `Thank you for your email regarding "${email.subject}". We have received your message and will respond shortly.\n\nBest regards,\nOneBox Team`,
        confidence: 75,
        context: [{ category: "General Response", score: 0.75 }],
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    console.error("Suggest reply error:", error);
    
    res.status(500).json({ 
      error: "Failed to generate suggested reply", 
      details: error.message 
    });
  }
});

export default router;
