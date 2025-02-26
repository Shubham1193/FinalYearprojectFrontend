import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import bg from '../assets/bg.jpg';
import MainNavbar from '../components/MainNavbar';
import Friends from '../components/Friends';
import { useSelector } from 'react-redux';
import { useSocket } from "../context/SocketProvider";

const Home = () => {
  const socket = useSocket();
  const { currentUser } = useSelector((state) => state.user);

  useEffect(() => {
    if (socket && currentUser?.username) {
      socket.emit("online", { username: currentUser.username });
    }
  }, [socket, currentUser]);

  return (
    <div className="h-[100vh] bg-[#1A1A2E] text-white">
      <MainNavbar />
      <div className="container mx-auto px-4 py-20">
        {/* Top Section: Welcome Text & Image using flex layout */}
        <div className="flex justify-between items-center  ">
          {/* Left Column: Welcome Text */}
          <div className="w-full md:w-1/2 text-center md:text-left">
            <h1 className="text-4xl font-bold mb-4">Welcome To SyncCode</h1>
            <p className="text-lg mb-6">
              Introducing SyncCode, the ultimate collaborative coding platform where two users can solve DSA questions
              together in real-time. Featuring video conferencing and code synchronization. Experience seamless collaboration with SyncCode today.
            </p>
            <Link
              to="/create"
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Create Room
            </Link>
          </div>
          {/* Right Column: Image */}
          <div className="w-full md:w-2/6 flex justify-center">
            <img 
              src={bg} 
              alt="Background" 
              className="rounded-xl" 
            />
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[#2A2F4A] border border-gray-700 rounded-xl p-6 text-center">
            <h2 className="text-2xl font-semibold mb-3">DSA Problem</h2>
            <p className="text-base">
              Solve data structure and algorithm problems collaboratively with your friends in real-time.
            </p>
          </div>
          <div className="bg-[#2A2F4A] border border-gray-700 rounded-xl p-6 text-center">
            <h2 className="text-2xl font-semibold mb-3">Video Call</h2>
            <p className="text-base">
              Utilize built-in video conferencing to discuss problems and strategies face-to-face.
            </p>
          </div>
          <div className="bg-[#2A2F4A] border border-gray-700 rounded-xl p-6 text-center">
            <h2 className="text-2xl font-semibold mb-3">Code Synchronization</h2>
            <p className="text-base">
              Sync your code in real-time to work simultaneously on the same problem, ensuring seamless collaboration.
            </p>
          </div>
        </div>
      </div>
      <Friends />
    </div>
  );
};

export default Home;
