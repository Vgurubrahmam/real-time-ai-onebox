import { Client } from "@elastic/elasticsearch";
import dotenv from "dotenv";
dotenv.config();

// Create Elasticsearch client with error handling
export const esClient = new Client({
    node: process.env.ELASTIC_URL || 'http://localhost:9200',
    maxRetries: 1,
    requestTimeout: 5000,
    pingTimeout: 3000
});

// Helper function to check if Elasticsearch is available
export async function isElasticsearchAvailable(): Promise<boolean> {
    try {
        await esClient.ping();
        return true;
    } catch (error) {
        console.warn("Elasticsearch is not available");
        return false;
    }
}