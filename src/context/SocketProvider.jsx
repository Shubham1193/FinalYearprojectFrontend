import React, { createContext, useMemo, useContext } from "react";
import { io } from "socket.io-client";


const SocketContext = createContext(null);

export const useSocket = () => {
  const socket = useContext(SocketContext);
  return socket;
};

export const SocketProvider = (props) => {
  // const socket = useMemo(() => io("https://webrtc-backend-t27s.onrender.com"), []);
  const socket = useMemo(() => io("https://finalyearprojectbackend-2lbw.onrender.com"), []);
  return (
    <SocketContext.Provider value={socket}>
      {props.children}
    </SocketContext.Provider>
  );
};