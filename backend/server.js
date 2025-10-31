import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// Import routes
import mainRoutes from './routes/main.js';
import dataRoutes from './routes/data.js';
import actionRoutes from './routes/actions.js';

// Load environment variables from .env file
dotenv.config();

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON bodies

// API Routes
app.use('/api', mainRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/actions', actionRoutes);


// Root route for health check
app.get("/", (req, res) => {
  res.send("Smart School Express API is running...");
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
