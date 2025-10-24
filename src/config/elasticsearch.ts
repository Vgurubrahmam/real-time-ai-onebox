import { Client } from "@elastic/elasticsearch";
import dotenv from "dotenv";
dotenv.config();

// Create Elasticsearch Cloud client
// Supports both API key and username/password authentication
const authConfig = process.env.ELASTIC_API_KEY
  ? { apiKey: process.env.ELASTIC_API_KEY }
  : {
      username: process.env.ELASTIC_USERNAME || 'elastic',
      password: process.env.ELASTIC_PASSWORD || ''
    };

export const esClient = new Client({
    cloud: {
        id: process.env.ELASTIC_CLOUD_ID || ''
    },
    auth: authConfig,
    maxRetries: 3,
    requestTimeout: 30000,
    pingTimeout: 3000
});

// Helper function to check if Elasticsearch is available
export async function isElasticsearchAvailable(): Promise<boolean> {
    try {
        const info = await esClient.info();
        console.log('✅ Elasticsearch Cloud connected successfully');
        console.log(`   Cluster: ${info.cluster_name}`);
        console.log(`   Version: ${info.version.number}`);
        return true;
    } catch (error: any) {
        console.error("❌ Elasticsearch connection failed:", error.message);
        return false;
    }
}