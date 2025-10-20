import { esClient } from "../config/elasticsearch.js";
import type { EmailDocument } from "../types/emailDocument.js";
import { categorizeEmail } from "./aiCategorization.js";

export async function indexEmail(email: EmailDocument) {
  try {
    // Index with explicit ID so we can update it later
    await esClient.index({
      index: 'emails',
      id: email.id,
      document: email,
      refresh: 'wait_for' // Wait for the document to be available for search
    });
    console.log('Email indexed:', email.subject);
    
    // Now categorize the email
    await categorizeEmail(email);
  } catch (error) {
    console.error('Failed to index email:', error);
  }
}