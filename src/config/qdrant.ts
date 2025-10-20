import { QdrantClient } from "@qdrant/js-client-rest";
const QDRANT_HOST = process.env.QDRANT_HOST || "localhost";
const QDRANT_PORT = process.env.QDRANT_PORT || "6333";

export const qdrantClient = new QdrantClient({
  url: `http://${QDRANT_HOST}:${QDRANT_PORT}`,
});

export const COLLECTION_NAME = "product_knowledge";
export const EMBEDDING_SIZE = 768; // Gemini text-embedding-004 dimension
