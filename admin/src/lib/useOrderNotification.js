import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { Howl } from 'howler';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4100', { transports: ['websocket'] });
const sound = new Howl({ src: ['/sounds/notify.mp3'] });

export default function useOrderNotification(onReceive = () => {}) {
  useEffect(() => {
    function handler(data) {
      try {
        sound.play();
      } catch {
        // Audio feedback is optional for muted sessions or unsupported browsers.
      }
      onReceive(data);
    }
    socket.on('new_order', handler);
    return () => socket.off('new_order', handler);
  }, [onReceive]);
}