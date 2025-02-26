import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setRoomId, clearRoomId } from "../redux/room/roomSlice";
import { clearPeerState } from "../redux/peer/peerSlice";
import { useSocket } from "../context/SocketProvider";
import MainNavbar from "../components/MainNavbar";
import Friends from "../components/Friends";
// import createRoomImage from "../assets/createRoom.jpeg"; // Optional image

const CreateRoom = () => {
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const socket = useSocket();
  const [joinRoomCode, setJoinRoomCode] = useState("");

  useEffect(() => {
    dispatch(clearPeerState());
    dispatch(clearRoomId());
  }, [dispatch]);

  const handleCreateRoom = () => {
    const randomRoomId = Math.floor(Math.random() * 100000000 + 1).toString();
    dispatch(setRoomId(randomRoomId));
    navigate("/room");
  };

  const handleJoinRoom = () => {
    if (joinRoomCode) {
      dispatch(setRoomId(joinRoomCode));
      navigate("/room");
    } else {
      alert("Please enter a room code to join.");
    }
  };

  return (
    <>
      <MainNavbar />
      <div className="h-[90vh] flex  justify-center bg-[#1A1A2E]">
        <div className="bg-[#22223B] h-[42vh] mt-28 shadow-lg rounded-lg overflow-hidden max-w-xl w-full flex justify-center">
          <div className="w-[80%] p-8 ">
            <div className="mb-6 text-center w-full">
              <h2 className="text-3xl font-bold text-white">SyncCode</h2>
            </div>
            <div className="mb-4 w-full">
              <button
                onClick={handleCreateRoom}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-md transition-colors"
              >
                Create Room
              </button>
            </div>
            <div className="mb-4 w-full">
              <input
                type="text"
                placeholder="Enter room code to join"
                value={joinRoomCode}
                onChange={(e) => setJoinRoomCode(e.target.value)}
                className="w-full p-3 border border-gray-500 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="w-full">
              <button
                onClick={handleJoinRoom}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-md transition-colors"
              >
                Join Room
              </button>
            </div>
          </div>
        </div>
      </div>
      <Friends />
    </>
  );
};

export default CreateRoom;
