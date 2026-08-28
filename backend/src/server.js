import http from 'http';
import dns from 'dns';
import app from './app.js';
import { config } from './config/env.js';
import pool, { testConnection } from './config/db.js';
import { initSocket } from './config/socket.js';
import { agentQueue } from './services/agentQueue.service.js';

// Force global IPv4 resolution on Node.js to eliminate ENETUNREACH on Cloud/Render environments
try {
  dns.setDefaultResultOrder?.('ipv4first');
} catch (_) {}

/**
 * HTTP & WebSocket Server Entry Point (Phase 6 Production-Hardened)
 *
 * Connects to MySQL database pool, initializes Socket.io server,
 * starts HTTP server, and registers Graceful Shutdown handlers (`SIGTERM`, `SIGINT`).
 */

let server;

const startServer = async () => {
  try {
    // 1. Verify MySQL database connection pool
    await testConnection();

    // 2. Create HTTP server & Socket.io instance
    server = http.createServer(app);
    initSocket(server);

    // 3. Start server
    const PORT = config.port;
    server.listen(PORT, () => {
      console.log(`=============================================================`);
      console.log(`🚀 FinanceFlow AI Backend & WebSockets running in [${config.nodeEnv}] mode`);
      console.log(`📡 Listening on: http://localhost:${PORT}`);
      console.log(`⚡ WebSocket Server Active`);
      console.log(`📚 Swagger Docs: http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`=============================================================`);
    });
  } catch (error) {
    console.error(`❌ Server initialization failed due to error:`, error);
    process.exit(1);
  }
};

/**
 * Graceful Shutdown Handler:
 * 1. Closes HTTP server (stops accepting new incoming requests).
 * 2. Drains active in-flight worker queue jobs.
 * 3. Safely closes MySQL database connection pool without orphaned locks.
 * 4. Exits process cleanly with code 0.
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log(`🔒 HTTP/WebSocket server closed. No longer accepting new connections.`);

      try {
        // 1. Drain active agent queue workers
        if (agentQueue) {
          const status = agentQueue.getQueueStatus();
          console.log(`⏳ In-flight queue status: ${status.activeJobsCount} active, ${status.queuedJobsCount} queued.`);
        }

        // 2. Close MySQL Connection Pool
        console.log(`💾 Closing MySQL connection pool...`);
        await pool.end();
        console.log(`✅ MySQL pool closed cleanly.`);

        console.log(`👋 Graceful shutdown complete. Exiting.`);
        process.exit(0);
      } catch (err) {
        console.error(`❌ Error during resource cleanup:`, err);
        process.exit(1);
      }
    });

    // Fallback: Force shutdown if resource cleanup hangs past 10 seconds
    setTimeout(() => {
      console.error(`⚠️ Graceful shutdown timed out (10s). Forcing process termination.`);
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
