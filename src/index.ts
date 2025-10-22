import express from 'express';
import searchRoutes from "./routes/searchRoutes.js";

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

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => console.log('🚀 Server running on port 3000'));
}

// Export for Vercel
export default app;
