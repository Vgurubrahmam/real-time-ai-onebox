// Simple script to manually create and seed the Qdrant collection
// Run with: node manual-seed.js

import fetch from 'node-fetch';

const QDRANT_URL = 'http://localhost:6333';
const COLLECTION_NAME = 'product_knowledge';

// Simple product knowledge (we'll use hardcoded embeddings for testing)
async function createCollection() {
  console.log('Creating collection...');
  
  // Delete if exists
  try {
    await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
      method: 'DELETE',
    });
    console.log('Deleted existing collection');
  } catch (e) {
    // Collection might not exist
  }
  
  // Create collection
  const response = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vectors: {
        size: 768,
        distance: 'Cosine',
      },
    }),
  });
  
  const result = await response.json();
  console.log('Collection created:', result);
}

async function seedData() {
  console.log('Seeding data with dummy embeddings...');
  
  // For now, use dummy embeddings (all zeros) - you'll need to replace with real embeddings
  const dummyEmbedding = new Array(768).fill(0.1);
  
  const points = [
    {
      id: 1,
      vector: dummyEmbedding,
      payload: {
        text: "Our product ReachInbox is an AI-powered email management platform that helps sales teams organize, categorize, and respond to emails efficiently.",
        category: "product-overview"
      }
    },
    {
      id: 2,
      vector: dummyEmbedding,
      payload: {
        text: "To schedule a meeting with our team, please use this link: https://calendly.com/reachinbox-demo.",
        category: "meeting-link"
      }
    },
    {
      id: 3,
      vector: dummyEmbedding,
      payload: {
        text: "Our pricing starts at $49/month for the Starter plan, $99/month for Professional, and $199/month for Enterprise.",
        category: "pricing"
      }
    }
  ];
  
  const response = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      points: points
    }),
  });
  
  const result = await response.json();
  console.log('Data seeded:', result);
}

async function main() {
  try {
    await createCollection();
    await seedData();
    console.log('\n✅ Setup complete! Collection created with dummy data.');
    console.log('Note: Using dummy embeddings. For production, generate real embeddings with Gemini API.');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
