import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";
dotenv.config();

// Qdrant Cloud client with API key authentication
export const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY || undefined,
});

export const COLLECTION_NAME = "product_knowledge";
export const EMBEDDING_SIZE = 768; // Gemini text-embedding-004 dimension

// Helper function to check if Qdrant is available
export async function isQdrantAvailable(): Promise<boolean> {
  try {
    await qdrantClient.getCollections();
    console.log('✅ Qdrant Cloud connected successfully');
    return true;
  } catch (error) {
    console.error("❌ Qdrant connection failed:", error);
    return false;
  }
}
