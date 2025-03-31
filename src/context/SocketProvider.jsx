import React, { createContext, useMemo, useContext } from "react";
import { io } from "socket.io-client";


const SocketContext = createContext(null);

export const useSocket = () => {
  const socket = useContext(SocketContext);
  return socket;
};

export const SocketProvider = (props) => {
  // const socket = useMemo(() => io("https://webrtc-backend-t27s.onrender.com"), []);
  const socket = useMemo(() => io("http://192.168.134.50:8000"), []);
  return (
    <SocketContext.Provider value={socket}>
      {props.children}
    </SocketContext.Provider>
  );
};