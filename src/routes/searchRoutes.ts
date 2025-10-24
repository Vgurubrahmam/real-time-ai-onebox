import express from "express";
import { esClient } from "../config/elasticsearch.js";
import { indexEmail } from "../services/indexEmail.js";
import { generateSuggestedReply } from "../services/ragService.js";
import type { EmailDocument } from "../types/emailDocument.js";

const router = express.Router();


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

    const result = await esClient.search({
      index: "emails",
      from,
      size: Number(limit),
      sort: [{ date: { order: "desc" } }],
      query: { match_all: {} },
    });

    const emails = result.hits.hits.map((hit: any) => ({
      id: hit._id,
      ...hit._source
    }));
    
    res.json({
      page: Number(page),
      limit: Number(limit),
      total: typeof result.hits.total === 'object' ? result.hits.total.value : result.hits.total,
      emails,
    });
  } catch (error: any) {
    console.error("Fetch emails error:", error);
    res.status(500).json({ 
      error: "Failed to fetch emails",
      details: error.message 
    });
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

    const must: any[] = [
      { 
        multi_match: { 
          query: q as string, 
          fields: ["subject", "body"],
          type: "best_fields"
        } 
      }
    ];
    
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

    const emails = result.hits.hits.map((hit: any) => ({
      id: hit._id,
      ...hit._source
    }));
    
    res.json(emails);
  } catch (error: any) {
    console.error("Search error:", error);
    res.status(500).json({ 
      error: "Search failed",
      details: error.message 
    });
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

    // Index email in Elasticsearch
    await indexEmail(emailData);

    res.status(201).json({
      success: true,
      message: "Email indexed successfully",
      emailId: emailData.id,
    });
  } catch (error: any) {
    console.error("Index error:", error);
    res.status(500).json({ 
      error: "Failed to index email", 
      details: error.message 
    });
  }
});

// POST /api/emails/:id/suggest-reply
router.post("/api/emails/:id/suggest-reply", async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the email from Elasticsearch
    const result = await esClient.get({
      index: "emails",
      id: id,
    });

    if (!result.found) {
      return res.status(404).json({ error: "Email not found" });
    }

    const email: any = result._source;
    
    // Construct the full email text for RAG
    const emailText = `Subject: ${email.subject}\nFrom: ${email.from}\nDate: ${email.date}\n\n${email.body}`;

    console.log(`Generating suggested reply for email ${id}...`);

    // Run RAG pipeline
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
  } catch (error: any) {
    console.error("Suggest reply error:", error);
    
    if (error.message?.includes("knowledge base")) {
      return res.status(503).json({ 
        error: "Knowledge base not initialized. Please run the setup script first.",
        details: error.message 
      });
    }
    
    res.status(500).json({ 
      error: "Failed to generate suggested reply", 
      details: error.message 
    });
  }
});

export default router;
