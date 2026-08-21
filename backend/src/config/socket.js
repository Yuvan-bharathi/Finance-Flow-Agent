import { Server } from 'socket.io';
import { config } from './env.js';

let ioInstance = null;

export const initSocket = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      credentials: true
    }
  });

  ioInstance.on('connection', (socket) => {
    console.log('⚡ [WebSocket Connected] Client ID:', socket.id);

    socket.on('disconnect', () => {
      console.log('⚡ [WebSocket Disconnected] Client ID:', socket.id);
    });
  });

  return ioInstance;
};

export const emitSocketEvent = (eventName, payload) => {
  if (ioInstance) {
    ioInstance.emit(eventName, payload);
  }
};
