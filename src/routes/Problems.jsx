import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { clearPeerState } from "../redux/peer/peerSlice";
import { useSocket } from "../context/SocketProvider";
import MainNavbar from "../components/MainNavbar";
import Friends from "../components/Friends";

const Problems = () => {
  const socket = useSocket();
  const { roomId } = useSelector((state) => state.room);
  const { peerId } = useSelector((state) => state.peer);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Problems state
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);

  // Filters state
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [category, setCategory] = useState("");
  const [selectedTopFilter, setSelectedTopFilter] = useState("");

  useEffect(() => {
    dispatch(clearPeerState());
    socket.emit("disco", { peerId, token: localStorage.getItem("access_token") });
  }, [dispatch, socket, peerId]);

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const response = await axios.get("https://finalyearprojectbackend-2lbw.onrender.com/api/user/problems");
        setQuestions(response.data);
        setFilteredQuestions(response.data);
      } catch (error) {
        console.error("Error fetching problems:", error);
      }
    };
    fetchProblems();
  }, []);

  const handleFilter = () => {
    let filtered = questions;
    if (selectedTopFilter) {
      filtered = filtered.filter((q) => q.highlight === selectedTopFilter);
    }
    if (search) {
      filtered = filtered.filter((q) =>
        q.title.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (difficulty) {
      filtered = filtered.filter((q) => q.difficulty === difficulty);
    }
    if (category) {
      filtered = filtered.filter((q) => q.category === category);
    }
    setFilteredQuestions(filtered);
  };

  useEffect(() => {
    handleFilter();
  }, [search, difficulty, category, selectedTopFilter, questions]);

  const problemClick = (que) => {
    if (roomId) {
      navigate("/room", { state: { question: que } });
    } else {
      navigate("/create");
    }
  };

  return (
    <div>
      <MainNavbar />
      <div className="min-h-screen bg-[#262646] text-white">
        <div className="container mx-auto py-10 px-4">
          {/* Filter Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
            <input
              type="text"
              placeholder="Search question..."
              className="p-3 w-full md:w-1/3 border border-gray-500 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex space-x-4 w-full md:w-auto">
              <select
                className="p-3 border border-gray-500 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setCategory(e.target.value)}
                value={category}
              >
                <option value="">Category</option>
                <option value="Array">Array</option>
                <option value="strings">String</option>
                <option value="LinkedList">Linked List</option>
              </select>
              <select
                className="p-3 border border-gray-500 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setDifficulty(e.target.value)}
                value={difficulty}
              >
                <option value="">Difficulty</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>
          {/* Table Layout */}
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 border border-gray-600 text-left text-sm font-semibold uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 border border-gray-600 text-left text-sm font-semibold uppercase tracking-wider">
                    Difficulty
                  </th>
                  <th className="px-6 py-4 border border-gray-600 text-left">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredQuestions.map((ques, index) => (
                  <tr
                    key={ques._id || index}
                    onClick={() => problemClick(ques)}
                    className="cursor-pointer hover:bg-gray-600 transition-colors"
                  >
                    <td className="px-6 py-4 border border-gray-600">{ques.title}</td>
                    <td className="px-6 py-4 border border-gray-600">{ques.difficulty}</td>
                    <td className="px-6 py-4 border border-gray-600">{ques.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Friends />
    </div>
  );
};

export default Problems;
