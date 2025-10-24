import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import searchRoutes from "./routes/searchRoutes.js";
import { isElasticsearchAvailable } from './config/elasticsearch.js';

const app = express();

// Enable CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use("/", searchRoutes);

// Start server (Render, local, etc.)
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Start server immediately
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Test Elasticsearch connection after server starts (non-blocking)
      isElasticsearchAvailable().catch(err => {
        console.warn('⚠️  Elasticsearch not available:', err.message);
      });
    });
  } catch (error: any) {
    console.error('❌ Failed to start server:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

startServer();// Export for Vercel
export default app;
