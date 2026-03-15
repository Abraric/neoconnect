'use client';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const accessToken = useAuthStore(s => s.accessToken);

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      auth: { token: accessToken },
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [accessToken]);

  const on = (event: string, callback: (..._args: unknown[]) => void) => {
    socketRef.current?.on(event, callback);
  };

  const off = (event: string, callback: (..._args: unknown[]) => void) => {
    socketRef.current?.off(event, callback);
  };

  return { socket: socketRef.current, connected, on, off };
}
