import { useEffect, useRef, useState, useCallback } from "react";
import {io, Socket } from "socket.io-client";
import {BASE_URL} from "../constants";

export default function useSocket<T>(eventName: string) {
    const socketRef = useRef<Socket | null>(null);
    const [data, setData] = useState<T | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        //establish a connection
        //potential path: {path: "/socket.io", transports: ["websocket"]}
        const socket = io(BASE_URL);
        socketRef.current = socket;

        //track conection state 
        socket.on("connect", () => setConnected(true));
        socket.on("disconnect", () => setConnected(false));

        //subscribe to named event
        socket.on(eventName, (payload: T) => {
            setData(payload);
        });

        //clean up on unmount 
        return () => {
            socket.off(eventName);
            socket.disconnect();
        };
    }, [eventName]);

    //send arbitrary event 
    const sendEvent = useCallback((evt: string, payload:any) => {
        socketRef.current?.emit(evt, payload);
    }, []);

    return {data, connected, sendEvent};
}