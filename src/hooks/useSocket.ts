import { useEffect, useRef, useState, useCallback } from "react";
import {io, Socket } from "socket.io-client";
import {BASE_URL} from "../constants";

export default function useSocket<T>(eventName: string, 
    opts: { namespace?: string; 
            query?: Record<string,string> 
            enabled?:boolean;} = {}
) {
    const { namespace = "", query = {} } = opts;
    const socketRef = useRef<Socket | null>(null);
    const [data, setData] = useState<T | null>(null);
    const [connected, setConnected] = useState(false);
    const mountedRef = useRef(true); 

    useEffect(() => {
      mountedRef.current = true;

      //clean up existing sockets
      if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
      }
          
      const fullUrl = namespace ? `${BASE_URL}${namespace}` : BASE_URL;
      const socket = io(fullUrl, {
          path: "/socket.io",
          transports: ["polling", "websocket"],
          query,
      });
      socketRef.current = socket;
  
      const handleConnect = () => {
          if (mountedRef.current) {
            setConnected(true);
           console.log(`✅ Socket connected for driver ${query.driverId || 'unknown'}`);
          }
      };
  
      const handleDisconnect = () => {
          if (mountedRef.current) {
            setConnected(false);
            console.log(`❌ Socket disconnected for driver ${query.driverId || 'unknown'}`);
          }
      };
  
      const handleEvent = (payload: T) => {
        if (mountedRef.current) {
            console.log(`📥 ${eventName} received for driver ${query.driverId}:`, payload);
            setData(payload);
        }
      };

          //Add event listeners
      socket.on("connect", handleConnect);
      socket.on("disconnect", handleDisconnect);
      socket.on(eventName, handleEvent);

      //clean up on unmount 
      return () => {
        mountedRef.current = false;
    
        if (socket) {
          // ✅ Remove specific event listeners
          socket.off("connect", handleConnect);
          socket.off("disconnect", handleDisconnect);
          socket.off(eventName, handleEvent);
                
          //console.log(`🧹 Cleaning up socket for driver ${query.driverId || 'unknown'}`);
          socket.disconnect();
        }

        socketRef.current = null;
      };
    }, [eventName, namespace, JSON.stringify(query)]);
        
        // Additional cleanup on unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []); 

    //send arbitrary event 
    const sendEvent = useCallback((evt: string, payload: any, callback?: (response: any) => void) => {
      // ✅ Check both connected state AND socket readyState
    //   const socket = socketRef.current;
      const isSocketReady = socketRef.current && 
                            connected && 
                            socketRef.current.connected; // Double-check socket's internal state

      if (!isSocketReady) {
          console.warn(`Cannot emit ${evt} for driver ${query.driverId}: socket not ready`, {
              hasSocket: !!socketRef.current,
              connected: connected,   
              socketConnected: socketRef.current?.connected             
          });
          if (callback && mountedRef.current) {
              callback({ error: 'Socket not ready' });
          }
          return;
      }   
    
       if (!mountedRef.current && evt  !== "update-location" ) {
            console.warn(`Cannot emit ${evt}: component unmounted`);
            return;
        }

      //console.log(`📤 Emitting ${evt} for driver ${query.driverId}:`, payload);  
          
      if (callback) {
          const timeoutId = setTimeout(() => {
              if (mountedRef.current) {
                  //console.warn(`${evt} acknowledgment timeout for driver ${query.driverId}`);
                  callback({ error: 'Timeout' });
              }
          }, 10000);

          socketRef.current!.emit(evt, payload, (response: any) => {
              clearTimeout(timeoutId);
              if (mountedRef.current) {
                  //console.log(`📥 ${evt} acknowledgment for driver ${query.driverId}:`, response);
                  callback(response);
              }
          });
      } else {
          socketRef.current!.emit(evt, payload);
      }
  }, [connected, query.driverId]);

  return { data, connected, sendEvent };
}
