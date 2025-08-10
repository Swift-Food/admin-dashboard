import { useEffect, useRef, useState, useCallback } from "react";
import {io, Socket } from "socket.io-client";
import {BASE_URL} from "../constants";

export default function useSocket<T>(eventName: string, 
    opts: { namespace?: string; query?: Record<string,string> } = {}
) {
    const { namespace = "", query = {} } = opts;
    const socketRef = useRef<Socket | null>(null);
    const [data, setData] = useState<T | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        //establish a connection
        //potential path: {path: "/socket.io", transports: ["websocket"]}
        //const url = BASE_URL;
        
        const fullUrl = namespace ? `${BASE_URL}${namespace}` : BASE_URL;
        const socket = io(fullUrl, {
            path: "/socket.io",
            transports: ["polling", "websocket"],
            query,
        });
        socketRef.current = socket;

        //track conection state 
        socket.on("connect", () => {setConnected(true);
            console.log("Socket connected")
        });
        socket.on("disconnect", () => setConnected(false));

        //subscribe to named event
        socket.on(eventName, (payload: T) => {
            console.log(`📥  ${eventName} received:`, payload);
            setData(payload);
        });

        //clean up on unmount 
        return () => {
            socket.off(eventName);
            socket.disconnect();
        };
    }, [eventName, namespace, JSON.stringify(query)]);

    //send arbitrary event 
    const sendEvent = useCallback((evt: string, payload: any, callback?: (response: any) => void) => {
    if (socketRef.current && connected) {
      console.log(`📤 Emitting ${evt}:`, payload);
      
      if (callback) {
        // Use acknowledgment callback
        socketRef.current.emit(evt, payload, (response: any) => {
          console.log(`📥 ${evt} acknowledgment:`, response);
          callback(response);
        });
      } else {
        socketRef.current.emit(evt, payload);
      }
    } else {
      console.warn(`Cannot emit ${evt}: socket not connected`);
    }
  }, [connected]);
    return {data, connected, sendEvent};
}