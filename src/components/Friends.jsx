import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSocket } from "../context/SocketProvider"; // Custom hook for WebSocket

const FriendsList = () => {
  const [friends, setFriends] = useState([]);
  const [onlineFriends, setOnlineFriends] = useState([]);
  const [chatOpen, setChatOpen] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState({}); // Stores messages per friend
  const [isOpen, setIsOpen] = useState(false); // Controls popup visibility
  const [unreadCounts, setUnreadCounts] = useState({}); // Unread message count per friend

  const socket = useSocket();
  const { currentUser } = useSelector((state) => state.user);

  console.log("Initial render ->", { friends, onlineFriends, chatOpen, message, messages, isOpen, unreadCounts });

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const response = await fetch(
          `https://finalyearprojectbackend-2lbw.onrender.com/api/user/friends/${currentUser?.username}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch friends");
        }

        setFriends(data.friends);
        console.log("Fetched friends:", data.friends);
      } catch (err) {
        console.error("Error fetching friends:", err);
      }
    };

    if (currentUser?.username) {
      fetchFriends();
    }
  }, [currentUser]);

  useEffect(() => {
    console.log("Chat opened for:", chatOpen);
    if (chatOpen) {
      setUnreadCounts(prev => ({ ...prev, [chatOpen]: 0 }));
    }
  }, [chatOpen]);

  useEffect(() => {
    if (!socket) return;

    socket.on("onlineUsers", (onlineUsers) => {
      setOnlineFriends(onlineUsers);
      console.log("Online friends updated:", onlineUsers);
    });

    socket.on("receiveMessage", ({ sender, message }) => {
      console.log("Received message:", { sender, message });
      
      setMessages(prev => {
        const newMessages = {
          ...prev,
          [sender]: [...(prev[sender] || []), { sender, message }],
        };
        console.log("Updated messages state:", newMessages);
        return newMessages;
      });

      if (sender !== currentUser.username && chatOpen !== sender) {
        setUnreadCounts(prev => {
          const newCounts = {
            ...prev,
            [sender]: (prev[sender] || 0) + 1,
          };
          console.log("Updated unreadCounts:", newCounts);
          return newCounts;
        });
      }
    });

    return () => {
      socket.off("onlineUsers");
      socket.off("receiveMessage");
    };
  }, [socket, currentUser, chatOpen]);

  const handleChatOpen = (friend) => {
    console.log("Toggling chat for:", friend);
    setChatOpen(chatOpen === friend ? null : friend);
  };

  const handleSendMessage = () => {
    if (!message.trim() || !chatOpen) return;
    console.log("Sending message:", { sender: currentUser.username, receiver: chatOpen, message });

    socket.emit("sendMessage", {
      sender: currentUser.username,
      receiver: chatOpen,
      message,
    });

    setMessages(prev => {
      const newMessages = {
        ...prev,
        [chatOpen]: [...(prev[chatOpen] || []), { sender: currentUser.username, message }],
      };
      console.log("Messages after sending:", newMessages);
      return newMessages;
    });

    setMessage("");
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen && (
        <div className="relative">
          <button 
            onClick={() => setIsOpen(true)}
            className="bg-blue-500 text-white p-3 rounded-full shadow-lg"
          >
            Chat
          </button>
        </div>
      )}

      {isOpen && (
        <div className="bg-gray-800 text-white p-4 rounded-lg w-80 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Friends</h2>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-red-400 hover:text-red-600"
            >
              X
            </button>
          </div>
          {friends.length === 0 ? (
            <p>No friends found</p>
          ) : (
            <ul>
              {friends.map((friend) => (
                <li key={friend} className="py-2 border-b border-gray-600 flex flex-col">
                  <div
                    className="flex justify-between items-center cursor-pointer hover:bg-gray-700 p-2 rounded"
                    onClick={() => handleChatOpen(friend)}
                  >
                    <span>{friend}</span>
                    <div className="flex items-center">
                      {onlineFriends.includes(friend) ? "🟢" : "⚫"}
                      {unreadCounts[friend] > 0 && (
                        <span className="bg-red-500 text-white rounded-full px-2 text-xs">
                          {unreadCounts[friend]}
                        </span>
                      )}
                    </div>
                  </div>
                  {chatOpen === friend && (
                    <div className="bg-gray-700 p-3 mt-2 rounded">
                      <div className="h-40 overflow-y-auto bg-gray-600 p-2 rounded mb-2">
                        {messages[friend]?.map((msg, index) => (
                          <p key={index} className={msg.sender === currentUser.username ? "text-right text-green-400" : "text-left text-white"}>
                            <strong>{msg.sender}:</strong> {msg.message}
                          </p>
                        ))}
                      </div>
                      <div className="flex">
                        <input
                          type="text"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Type a message..."
                          className="w-full p-2 rounded bg-gray-800 border border-gray-500 text-white"
                        />
                        <button onClick={handleSendMessage} className="ml-2 bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-700">
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default FriendsList;
