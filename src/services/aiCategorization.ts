import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { triggerWebhook } from "./webhookTrigger.js";
import dotenv from "dotenv";
import { esClient } from "../config/elasticsearch.js";
import type { EmailDocument } from "../types/emailDocument.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY||"");

const systemInstruction =
  "You are an expert email classifier. Analyze the provided email text and categorize it into exactly one of these labels: Interested, Meeting Booked, Not Interested, Spam, or Out of Office.";

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    category: {
      type: SchemaType.STRING,
      format: "enum" as const,
      enum: [
        "Interested",
        "Meeting Booked",
        "Not Interested",
        "Spam",
        "Out of Office",
      ],
    },
  },
  required: ["category"],
};

/**
 * Analyze email text using Gemini API and update Elasticsearch document.
 */
export async function categorizeEmail(email: EmailDocument): Promise<string | undefined> {
  // Using gemini-1.5-flash-001 which should be available in v1beta API
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const prompt = `${systemInstruction}

Email to categorize:
Subject: ${email.subject}
Body: ${email.body}

Respond with ONLY ONE of these exact categories: Interested, Meeting Booked, Not Interested, Spam, Out of Office`;

  let attempt = 0;
  const maxRetries = 3;

  while (attempt < maxRetries) {
    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      
      // Extract category from response
      const validCategories = ["Interested", "Meeting Booked", "Not Interested", "Spam", "Out of Office"];
      let aiCategory = validCategories.find(cat => responseText.includes(cat)) || "Uncategorized";

      //  Update email document in Elasticsearch
      await esClient.update({
        index: "emails",
        id: email.id,
        doc: { aiCategory },
      });

      console.log(`Email categorized as: ${aiCategory}`);
      
      //  Trigger webhook if email is categorized as "Interested"
      if (aiCategory === "Interested") {
        await triggerWebhook(email);
      }
      
      return aiCategory;
    } catch (error: any) {
      attempt++;
      console.error(`Attempt ${attempt} failed:`, error.message);
      if (attempt >= maxRetries) {
        console.error(" Failed after retries");
        break;
      }
      await new Promise((res) => setTimeout(res, 2000 * attempt)); // exponential backoff
    }
  }
}