import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import profile from '../assets/profile.png';
import { useSelector, useDispatch } from 'react-redux';
import { signoutSuccess } from "../redux/user/userSlice";

const MainNavbar = () => {
  const { currentUser } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const [dropdownOpen, setDropdownOpen] = useState(false);



  const handleProfileClick = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleLogout = () => {
    dispatch(signoutSuccess());
    setDropdownOpen(false);
  };

  return (
    <nav className="relative flex justify-between items-center p-6 px-8 h-[10vh] bg-[#1A1A2E] shadow-md">
      <div>
        <Link to="/" className="text-3xl font-bold text-white">
          SyncCode
        </Link>
      </div>
      <div className="flex space-x-6">
        <Link to="/" className="text-xl text-white hover:text-blue-400 transition-colors">
          Home
        </Link>
        <Link to="/create" className="text-xl text-white hover:text-blue-400 transition-colors">
          Room
        </Link>
        <Link to="/submission" className="text-xl text-white hover:text-blue-400 transition-colors">
          Submission
        </Link>
        <Link to="/problems" className="text-xl text-white hover:text-blue-400 transition-colors">
          Problems
        </Link>
      </div>
      <div className="relative">
        {!currentUser ? (
          <Link to="/sign-in" className="text-xl text-white hover:text-blue-400 transition-colors">
            Sign In
          </Link>
        ) : (
          <div>
            <img
              src={
                currentUser.profilePicture
                  ? `https://finalyearprojectbackend-2lbw.onrender.com/proxy-image?url=${encodeURIComponent(currentUser.profilePicture)}`
                  : profile
              }
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover cursor-pointer"
              onClick={handleProfileClick}
              onError={(e) => (e.target.src = profile)}
            />
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-[#2A2F4A] rounded-md shadow-lg z-10">
                <Link
                  to="/profile"
                  className="block px-4 py-2 text-white hover:bg-[#3A3F5A] transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left block px-4 py-2 text-white hover:bg-[#3A3F5A] transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default MainNavbar;