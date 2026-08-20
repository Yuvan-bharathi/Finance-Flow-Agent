import http from 'http';
import app from './app.js';
import { config } from './config/env.js';
import { testConnection } from './config/db.js';
import { initSocket } from './config/socket.js';

/**
 * HTTP & WebSocket Server Entry Point
 * Connects to MySQL database pool, initializes Socket.io server, and starts HTTP server.
 */

const startServer = async () => {
  try {
    // 1. Verify MySQL database connection pool
    await testConnection();

    // 2. Create HTTP server & Socket.io instance
    const server = http.createServer(app);
    initSocket(server);

    // 3. Start server
    const PORT = config.port;
    server.listen(PORT, () => {
      console.log(`=============================================================`);
      console.log(`🚀 FinanceFlow AI Backend & WebSockets running in [${config.nodeEnv}] mode`);
      console.log(`📡 Listening on: http://localhost:${PORT}`);
      console.log(`⚡ WebSocket Server Active`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
      console.log(`=============================================================`);
    });
  } catch (error) {
    console.error(`❌ Server initialization failed due to error:`, error);
    process.exit(1);
  }
};

startServer();
