const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend/.env regardless of whether process is started from root or backend
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const { isConfigured } = require('./config/supabase');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const quizRoutes = require('./routes/quizRoutes');
const flashcardRoutes = require('./routes/flashcardRoutes');
const adaptiveRoutes = require('./routes/adaptiveRoutes');
const plannerRoutes = require('./routes/plannerRoutes');
const progressRoutes = require('./routes/progressRoutes');
const achievementRoutes = require('./routes/achievementRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow loading CDN scripts (Chart.js, Lucide, Supabase)
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(morgan('dev'));

// Serve Frontend Static Assets directly from root server
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/adaptive', adaptiveRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/achievements', achievementRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    platform: 'NexaLearn AI',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      gemini_ai: process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' ? 'connected' : 'resilient-mode',
      gemini_model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      supabase: isConfigured ? 'connected' : 'local-mode'
    }
  });
});

// Serve frontend SPA fallback for landing and pages
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 NexaLearn AI Backend running on port ${PORT}`);
  console.log(`🌐 Web Platform: http://localhost:${PORT}`);
  console.log(`🩺 Health API:   http://localhost:${PORT}/api/health`);
  console.log(`⚡ Supabase:     ${isConfigured ? 'Connected' : 'Local Dynamic Store'}`);
  console.log(`🧠 Gemini3.5 Flash AI:    ${process.env.GEMINI_API_KEY ? 'Configured' : 'Resilient Educational Mode'}`);
  console.log('====================================================');
});

module.exports = app;

