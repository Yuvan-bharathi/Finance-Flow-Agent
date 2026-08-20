import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = () => {
  if (!socket) {
    socket = io('http://localhost:5000', {
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
