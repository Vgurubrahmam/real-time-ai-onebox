import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Qdrant Cloud client with API key authentication
const qdrantConfig: any = {
  url: process.env.QDRANT_URL || "http://localhost:6333",
};

if (process.env.QDRANT_API_KEY) {
  qdrantConfig.apiKey = process.env.QDRANT_API_KEY;
}

export const qdrantClient = new QdrantClient(qdrantConfig);

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
