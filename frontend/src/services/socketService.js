import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = () => {
  if (!socket) {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? 'https://finance-flow-agent.onrender.com' : 'http://localhost:5000');
    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('⚡ [Frontend Socket Connected] ID:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('⚡ [Frontend Socket Disconnected]');
    });
  }
  return socket;
};

export const getSocket = () => socket;
