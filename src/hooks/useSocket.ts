import { useEffect, useRef, useState, useCallback } from "react";
import {io, Socket } from "socket.io-client";
import {BASE_URL} from "../constants";

export default function useSocket<T>(eventName: string) {
    const socketRef = useRef<Socket | null>(null);
    const [data, setData] = useState<T | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {

        const socket = io(BASE_URL, {path: "/socket.io", transports: ["websocket"]});
        socketRef.current = socket;

        socket.on("connect", () => setConnected(true));
        socket.on("disconnect", () => setConnected(false));

        socket.on(eventName, (payload: T) => {
            setData(payload);
        });

        return () => {
            socket.off(eventName);
            socket.disconnect();
        };
    }, [eventName]);

    const sendEvent = useCallback((evt: string, payload:any) => {
        socketRef.current?.emit(evt, payload);
    }, []);

    return {data, connected, sendEvent};
}