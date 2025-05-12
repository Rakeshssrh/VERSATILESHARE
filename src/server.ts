import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import connectDB from './lib/db/connect';
import authRoutes from './server/routes/auth.routes';
import { errorHandler } from './server/middleware/error.middleware';
import { initializeSocketIO } from './lib/realtime/socket';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Connect to MongoDB
const initializeServices = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Connected to MongoDB');

    // Initialize Socket.io (after server is created)
    initializeSocketIO(server);
    console.log('Socket.io initialized');
  } catch (err) {
    console.error('Service initialization error:', err);
  }
};

// Initialize all services
initializeServices();

// API Routes
app.use('/api/auth', authRoutes);

// Mock API endpoints for testing
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../client');
  app.use(express.static(clientBuildPath));
  
  // The "catchall" handler: for any request that doesn't
  // match one above, send back the index.html file.
  app.get('*', (req, res) => {
    // Skip API routes
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    }
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;