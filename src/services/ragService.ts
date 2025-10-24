import { GoogleGenerativeAI } from "@google/generative-ai";
import { qdrantClient, COLLECTION_NAME } from "../config/qdrant.js";
import { generateEmbedding } from "./embeddingService.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface RetrievedContext {
  text: string;
  category: string;
  score: number;
}

interface RAGResult {
  suggestedReply: string;
  retrievedContext: RetrievedContext[];
  confidence: number;
}

/**
 * Retrieve relevant context from the vector database
 * @param queryText The email text to find relevant context for
 * @param topK Number of top results to retrieve (default: 3)
 * @returns Array of retrieved context chunks with scores
 */
async function retrieveContext(queryText: string, topK: number = 3): Promise<RetrievedContext[]> {
  try {
    // Generate embedding for the query
    console.log("Generating query embedding...");
    const queryEmbedding = await generateEmbedding(queryText);

    // Search in Qdrant
    console.log("Searching vector database...");
    const searchResults = await qdrantClient.search(COLLECTION_NAME, {
      vector: queryEmbedding,
      limit: topK,
      with_payload: true,
    });

    // Format results
    const context: RetrievedContext[] = searchResults.map((result: any) => ({
      text: result.payload?.text || '',
      category: result.payload?.category || 'Unknown',
      score: result.score,
    }));

    console.log(`Retrieved ${context.length} relevant context chunks`);
    return context;
  } catch (error: any) {
    console.error("Error retrieving context:", error.message);
    // Return empty array if collection doesn't exist yet
    if (error.message?.includes('Not found') || error.message?.includes('doesn\'t exist')) {
      console.warn('Knowledge base collection not found. Please seed it first.');
      return [];
    }
    throw new Error("Failed to retrieve context from vector database");
  }
}

/**
 * Generate a reply using RAG (Retrieval-Augmented Generation)
 * @param originalEmail The original email to reply to
 * @param context Retrieved context from vector database
 * @returns Generated reply text
 */
async function generateReplyWithContext(
  originalEmail: string,
  context: RetrievedContext[]
): Promise<string> {
  try {
    // Assemble the prompt
    const contextText = context
      .map((ctx, idx) => `[Context ${idx + 1} - ${ctx.category}]:\n${ctx.text}`)
      .join("\n\n");

    const prompt = `You are a helpful and professional email assistant. Your task is to draft a reply to an incoming email based ONLY on the provided context and the original email.

CONTEXT (Product Knowledge):
${contextText}

ORIGINAL EMAIL:
${originalEmail}

INSTRUCTIONS:
1. Based ONLY on the context provided above, draft a professional and helpful email reply.
2. Be concise, friendly, and address the sender's questions or concerns directly.
3. If the context contains a meeting link, include it naturally in your response.
4. If the context mentions pricing, features, or other details, include them as appropriate.
5. Do NOT make up information that is not in the context.
6. Use a professional tone suitable for business communication.
7. Sign off appropriately (e.g., "Best regards," or "Looking forward to hearing from you,").

Draft the reply now:`;

    // Call Gemini API
    console.log("Generating reply with LLM...");
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    return reply;
  } catch (error) {
    console.error("Error generating reply:", error);
    throw new Error("Failed to generate reply");
  }
}

/**
 * Complete RAG pipeline: Retrieve context and generate reply
 * @param emailText The original email text
 * @returns RAG result with suggested reply and context
 */
export async function generateSuggestedReply(emailText: string): Promise<RAGResult> {
  try {
    console.log("=== Starting RAG Pipeline ===");
    
    // Step 1: Retrieve relevant context
    const retrievedContext = await retrieveContext(emailText, 3);
    
    if (retrievedContext.length === 0) {
      console.warn("No relevant context found in knowledge base");
      throw new Error("No relevant context found. Please ensure the knowledge base is seeded.");
    }

    // Step 2: Generate reply using context
    const suggestedReply = await generateReplyWithContext(emailText, retrievedContext);

    // Step 3: Calculate confidence based on retrieval scores
    const avgScore = retrievedContext.reduce((sum, ctx) => sum + ctx.score, 0) / retrievedContext.length;
    const confidence = Math.round(avgScore * 100);

    console.log("=== RAG Pipeline Complete ===");
    console.log(`Confidence: ${confidence}%`);

    return {
      suggestedReply,
      retrievedContext,
      confidence,
    };
  } catch (error) {
    console.error("RAG pipeline error:", error);
    throw error;
  }
}

/**
 * Test function to verify RAG pipeline
 */
export async function testRAG() {
  const testEmail = `Hi there,

I'm interested in learning more about your email management platform. 
Can you tell me about the pricing and features? 
Also, I'd like to schedule a demo if possible.

Thanks,
John Smith`;

  console.log("Testing RAG with sample email...\n");
  console.log("Original Email:");
  console.log(testEmail);
  console.log("\n" + "=".repeat(60) + "\n");

  const result = await generateSuggestedReply(testEmail);

  console.log("\nRetrieved Context:");
  result.retrievedContext.forEach((ctx, idx) => {
    console.log(`\n[${idx + 1}] Category: ${ctx.category} (Score: ${ctx.score.toFixed(3)})`);
    console.log(ctx.text);
  });

  console.log("\n" + "=".repeat(60) + "\n");
  console.log("Suggested Reply:");
  console.log(result.suggestedReply);
  console.log(`\nConfidence: ${result.confidence}%`);
}
