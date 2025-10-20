# RAG (Retrieval-Augmented Generation) Setup Guide

## Overview

The RAG system provides AI-powered suggested replies for incoming emails by:
1. **Retrieving** relevant context from a product knowledge base (Vector Database)
2. **Augmenting** the LLM prompt with this context
3. **Generating** personalized, context-aware reply suggestions

## Architecture

```
Email → Embedding Model → Vector Search (Qdrant) → Context Retrieval
                                                          ↓
                                            Prompt Assembly with Context
                                                          ↓
                                            LLM (Gemini) → Suggested Reply
```

## Prerequisites

1. **Docker running** with Qdrant container on port 6333
2. **Gemini API Key** in `.env` file
3. **Node.js dependencies** installed

## Setup Steps

### Step 1: Install Qdrant Client

```bash
npm install @qdrant/js-client-rest
```

### Step 2: Ensure Qdrant is Running

Check your `docker-compose.yml` includes:

```yaml
services:
  qdrant:
    image: qdrant/qdrant:v1.7.4
    container_name: qdrant-onebox
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage
```

Start the container:

```bash
docker-compose up -d qdrant
```

Verify Qdrant is running:
```bash
curl http://localhost:6333/collections
```

### Step 3: Seed Product Knowledge Base

Run the setup script to create the collection and seed data:

```bash
npm run setup:knowledge
```

This script will:
- Create a Qdrant collection named `product_knowledge`
- Generate embeddings for product information using Gemini's `text-embedding-004` model
- Store vectors with metadata (text, category) in Qdrant

Expected output:
```
=== Setting up Product Knowledge Base ===
Creating collection "product_knowledge"...
Collection created successfully!
Generating embeddings for product knowledge...
Processing: prod-1
Processing: prod-2
...
Uploading 8 points to Qdrant...
Product knowledge seeded successfully!
✅ Knowledge base setup complete!
```

### Step 4: Customize Product Knowledge

Edit `src/setup/seedProductKnowledge.ts` to add your own product data:

```typescript
const productKnowledge = [
  {
    id: "prod-1",
    text: "Your product description here",
    category: "product-overview"
  },
  // Add more entries...
];
```

Categories can include:
- `product-overview` - General product information
- `meeting-link` - Calendar/demo scheduling links
- `pricing` - Pricing plans and details
- `features` - Product features and capabilities
- `trial` - Free trial information
- `support` - Support contact information
- `integrations` - Integration capabilities
- `security` - Security and compliance info

### Step 5: Test the RAG Pipeline

You can test the RAG system directly:

```bash
node --loader ts-node/esm -e "import('./src/services/ragService.js').then(m => m.testRAG())"
```

## API Usage

### Generate Suggested Reply

**Endpoint:** `POST /api/emails/:id/suggest-reply`

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/emails/email-123/suggest-reply
```

**Example Response:**
```json
{
  "emailId": "email-123",
  "suggestedReply": "Hi John,\n\nThank you for your interest in ReachInbox!...",
  "confidence": 87,
  "context": [
    {
      "category": "pricing",
      "score": 0.89
    },
    {
      "category": "meeting-link",
      "score": 0.85
    },
    {
      "category": "features",
      "score": 0.83
    }
  ],
  "timestamp": "2025-10-19T20:30:00.000Z"
}
```

## Frontend Integration

The frontend includes a "✨ Suggest Reply" button on each email card:

1. Click the button to trigger the RAG pipeline
2. A modal displays the loading state
3. Once complete, the modal shows:
   - Confidence score (0-100%)
   - Context sources used
   - Suggested reply text
   - Copy to clipboard and edit options

## RAG Pipeline Details

### 1. Embedding Generation (`embeddingService.ts`)

Uses Gemini's `text-embedding-004` model to convert text into 768-dimensional vectors.

```typescript
const embedding = await generateEmbedding(emailText);
// Returns: number[] (768 dimensions)
```

### 2. Vector Search (`ragService.ts`)

Searches Qdrant for the top-K most similar knowledge chunks:

```typescript
const context = await retrieveContext(emailText, topK=3);
// Returns: Array of {text, category, score}
```

### 3. Prompt Assembly

Constructs a comprehensive prompt with:
- System instructions (act as email assistant)
- Retrieved context (top-3 knowledge chunks)
- Original email content
- Generation instructions

### 4. Reply Generation

Sends the prompt to Gemini `gemini-2.0-flash-exp` model:

```typescript
const reply = await generateReplyWithContext(email, context);
// Returns: String (suggested reply text)
```

## Performance Optimization

### Embedding Cache
Consider caching embeddings for common queries to reduce API calls.

### Batch Processing
For multiple emails, process in batches to optimize throughput.

### Vector Search Parameters
Adjust `topK` (number of context chunks) based on your needs:
- Lower (1-2): Faster, more focused
- Higher (5-10): More comprehensive context

## Troubleshooting

### Error: "Knowledge base not initialized"

**Solution:** Run `npm run setup:knowledge` to seed the database.

### Error: "Cannot connect to Qdrant"

**Solution:** 
1. Check Docker: `docker ps | grep qdrant`
2. Start if not running: `docker-compose up -d qdrant`
3. Verify: `curl http://localhost:6333/collections`

### Low Confidence Scores

**Causes:**
- Email content doesn't match knowledge base
- Knowledge base needs more diverse entries
- Embedding model mismatch

**Solutions:**
1. Add more relevant product knowledge
2. Include common customer questions
3. Expand coverage of product features

### Slow Response Times

**Optimization:**
1. Reduce `topK` from 3 to 2
2. Use faster LLM model (e.g., `gemini-2.0-flash-exp` instead of `gemini-2.0-pro`)
3. Cache embeddings for repeated queries

## Configuration

### Environment Variables

Add to `.env`:

```env
GEMINI_API_KEY=your_api_key_here
QDRANT_HOST=localhost
QDRANT_PORT=6333
```

### Qdrant Configuration

Edit `src/config/qdrant.ts`:

```typescript
export const COLLECTION_NAME = "product_knowledge";
export const EMBEDDING_SIZE = 768;  // Gemini embedding dimension
```

## Production Considerations

1. **Rate Limiting:** Add rate limiting to prevent API quota exhaustion
2. **Error Handling:** Implement retry logic with exponential backoff
3. **Monitoring:** Track confidence scores and user feedback
4. **A/B Testing:** Compare RAG vs non-RAG responses
5. **User Feedback Loop:** Allow users to rate suggestions for improvement

## Next Steps

- [ ] Add copy-to-clipboard functionality
- [ ] Implement edit and send workflow
- [ ] Track user acceptance rate of suggestions
- [ ] Add multiple language support
- [ ] Implement conversation history for better context

## Resources

- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [RAG Best Practices](https://www.pinecone.io/learn/retrieval-augmented-generation/)
