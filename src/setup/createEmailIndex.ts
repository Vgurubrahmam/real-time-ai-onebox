import { esClient } from "../config/elasticsearch.js";

async function createEmailIndex() {
  const indexName = 'emails';

  // Check if index already exists
  const exists = await esClient.indices.exists({ index: indexName });
  if (exists) {
    console.log('✅ Index already exists');
    return;
  }

  // Create index with mapping
  await esClient.indices.create({
    index: indexName,
    mappings: {
      properties: {
        subject: { type: 'text' },
        body: { type: 'text' },
        accountId: { type: 'keyword' },
        folder: { type: 'keyword' },
        date: { type: 'date' },
        aiCategory: { type: 'keyword' }
      }
    }
  });

  console.log('✅ Elasticsearch index created');
}

createEmailIndex().catch(console.error);
