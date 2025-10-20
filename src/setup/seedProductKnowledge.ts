import "dotenv/config";
import { qdrantClient, COLLECTION_NAME, EMBEDDING_SIZE } from "../config/qdrant.js";
import { generateEmbedding } from "../services/embeddingService.js";

// Product knowledge base - customize this with your actual product data
const productKnowledge = [
  {
    id: 1,
    text: "Our product ReachInbox is an AI-powered email management platform that helps sales teams organize, categorize, and respond to emails efficiently. It uses machine learning to automatically categorize emails into Interested, Meeting Booked, Not Interested, Spam, and Out of Office.",
    category: "product-overview"
  },
  {
    id: 2,
    text: "To schedule a meeting with our team, please use this link: https://calendly.com/reachinbox-demo. We offer 30-minute demo sessions where we walk through the platform and answer any questions you may have.",
    category: "meeting-link"
  },
  {
    id: 3,
    text: "Our pricing starts at $49/month for the Starter plan (up to 1,000 emails), $99/month for the Professional plan (up to 5,000 emails), and $199/month for the Enterprise plan (unlimited emails with advanced features).",
    category: "pricing"
  },
  {
    id: 4,
    text: "Key features include: AI-powered email categorization, smart search with Elasticsearch, automated webhook notifications, vector search for similar emails, suggested replies using RAG, and integration with popular CRM systems.",
    category: "features"
  },
  {
    id: 5,
    text: "We offer a 14-day free trial with no credit card required. You can sign up at https://reachinbox.com/signup and get instant access to all features.",
    category: "trial"
  },
  {
    id: 6,
    text: "Our support team is available Monday-Friday, 9 AM - 6 PM EST. You can reach us at support@reachinbox.com or through our live chat on the website. Premium customers get 24/7 priority support.",
    category: "support"
  },
  {
    id: 7,
    text: "ReachInbox integrates seamlessly with Gmail, Outlook, Salesforce, HubSpot, and Slack. We use OAuth for secure authentication and support IMAP/SMTP for custom email servers.",
    category: "integrations"
  },
  {
    id: 8,
    text: "Yes, we are SOC 2 Type II certified and GDPR compliant. All data is encrypted in transit and at rest. We never share your data with third parties and you maintain full ownership of your email data.",
    category: "security"
  }
];

/**
 * Initialize the Qdrant collection for product knowledge
 */
async function initializeCollection() {
  try {
    // Check if collection exists
    const collections = await qdrantClient.getCollections();
    const collectionExists = collections.collections.some(
      (col:any) => col.name === COLLECTION_NAME
    );

    if (collectionExists) {
      console.log(`Collection "${COLLECTION_NAME}" already exists. Deleting...`);
      await qdrantClient.deleteCollection(COLLECTION_NAME);
    }

    // Create collection
    console.log(`Creating collection "${COLLECTION_NAME}"...`);
    await qdrantClient.createCollection(COLLECTION_NAME, {
      vectors: {
        size: EMBEDDING_SIZE,
        distance: "Cosine",
      },
    });

    console.log("Collection created successfully!");
  } catch (error) {
    console.error("Error initializing collection:", error);
    throw error;
  }
}

/**
 * Seed product knowledge into Qdrant
 */
async function seedProductKnowledge() {
  try {
    console.log("Generating embeddings for product knowledge...");
    
    const points = [];
    
    for (const item of productKnowledge) {
      console.log(`Processing: ${item.id}`);
      const embedding = await generateEmbedding(item.text);
      
      points.push({
        id: item.id,
        vector: embedding,
        payload: {
          text: item.text,
          category: item.category,
          indexed_at: new Date().toISOString(),
        },
      });
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`Uploading ${points.length} points to Qdrant...`);
    await qdrantClient.upsert(COLLECTION_NAME, {
      wait: true,
      points: points,
    });

    console.log("Product knowledge seeded successfully!");
    
    // Verify
    const info = await qdrantClient.getCollection(COLLECTION_NAME);
    console.log(`Collection info:`, info);
    
  } catch (error) {
    console.error("Error seeding product knowledge:", error);
    throw error;
  }
}

/**
 * Main function to set up the knowledge base
 */
async function setupKnowledgeBase() {
  console.log("=== Setting up Product Knowledge Base ===");
  
  try {
    await initializeCollection();
    await seedProductKnowledge();
    console.log("\n✅ Knowledge base setup complete!");
  } catch (error) {
    console.error("\n❌ Setup failed:", error);
    process.exit(1);
  }
}

// Run if called directly
(async () => {
  try {
    await setupKnowledgeBase();
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
})();

export { setupKnowledgeBase, productKnowledge };
