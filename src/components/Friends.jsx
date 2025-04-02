import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSocket } from '../context/SocketProvider';

const FriendsList = () => {
  // State declarations
  const [friends, setFriends] = useState([]);
  const [onlineFriends, setOnlineFriends] = useState([]);
  const [chatOpen, setChatOpen] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState({});
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [pendingRequests, setPendingRequests] = useState({ sent: [], received: [] });
  const [activeTab, setActiveTab] = useState('friends'); // Added for tab navigation

  // Socket and user context
  const socket = useSocket();
  const { currentUser } = useSelector((state) => state.user);

  // Fetch friends list
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const response = await fetch(`https://finalyearprojectbackend-2lbw.onrender.com/api/user/friends/${currentUser?.username}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch friends');
        setFriends(data.friends || []);
      } catch (err) {
        console.error('Error fetching friends:', err);
      }
    };
    if (currentUser?.username) fetchFriends();
  }, [currentUser]);

  // Fetch pending friend requests
  useEffect(() => {
    const fetchPendingRequests = async () => {
      try {
        const response = await fetch(`http://192.168.134.50:8000/api/user/friend-requests/${currentUser?.username}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch requests');
        setPendingRequests({
          sent: data.sent || [],
          received: data.received || [],
        });
      } catch (err) {
        console.error('Error fetching pending requests:', err);
      }
    };
    if (currentUser?.username) fetchPendingRequests();
  }, [currentUser]);

  // Notify server of user's online status
  useEffect(() => {
    if (socket && currentUser?.username) socket.emit('online', { username: currentUser.username });
  }, [socket, currentUser]);

  // Handle socket events for online users and messages
  useEffect(() => {
    if (!socket) return;
    socket.on('onlineUsers', (onlineUsers) => setOnlineFriends(onlineUsers));
    socket.on('receiveMessage', ({ sender, message }) => {
      setMessages((prev) => ({
        ...prev,
        [sender]: [...(prev[sender] || []), { sender, message }],
      }));
      if (sender !== currentUser?.username && chatOpen !== sender) {
        setUnreadCounts((prev) => ({
          ...prev,
          [sender]: (prev[sender] || 0) + 1,
        }));
      }
    });
    return () => {
      socket.off('onlineUsers');
      socket.off('receiveMessage');
    };
  }, [socket, currentUser, chatOpen]);

  // Reset unread count when chat is opened
  useEffect(() => {
    if (chatOpen) setUnreadCounts((prev) => ({ ...prev, [chatOpen]: 0 }));
  }, [chatOpen]);

  // Search for users
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const response = await fetch(`http://192.168.134.50:8000/api/user/search/${searchQuery}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to search users');
      setSearchResults(data);
    } catch (err) {
      console.error('Error searching users:', err);
    }
  };

  // Send a friend request
  const handleSendRequest = async (receiver) => {
    try {
      const response = await fetch('http://192.168.134.50:8000/api/user/friend-request/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: currentUser.username, receiver }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to send request');
      // Refresh pending requests
      const requestsResponse = await fetch(`http://192.168.134.50:8000/api/user/friend-requests/${currentUser.username}`);
      const requestsData = await requestsResponse.json();
      setPendingRequests({
        sent: requestsData.sent || [],
        received: requestsData.received || [],
      });
      // Clear search results after sending request
      setSearchResults([]);
      setSearchQuery('');
    } catch (err) {
      console.error('Error sending friend request:', err);
    }
  };

  // Accept a friend request
  const handleAcceptRequest = async (sender) => {
    try {
      const response = await fetch('http://192.168.134.50:8000/api/user/friend-request/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptor: currentUser.username, sender }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to accept request');
      // Refresh friends and pending requests
      const friendsResponse = await fetch(`http://192.168.134.50:8000/api/user/friends/${currentUser.username}`);
      const friendsData = await friendsResponse.json();
      setFriends(friendsData.friends || []);
      const requestsResponse = await fetch(`http://192.168.134.50:8000/api/user/friend-requests/${currentUser.username}`);
      const requestsData = await requestsResponse.json();
      setPendingRequests({
        sent: requestsData.sent || [],
        received: requestsData.received || [],
      });
    } catch (err) {
      console.error('Error accepting friend request:', err);
    }
  };

  // Cancel or reject a friend request
  const handleCancelRequest = async (user) => {
    try {
      const response = await fetch('http://192.168.134.50:8000/api/user/friend-request/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: currentUser.username, receiver: user }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to cancel request');
      // Refresh pending requests
      const requestsResponse = await fetch(`http://192.168.134.50:8000/api/user/friend-requests/${currentUser.username}`);
      const requestsData = await requestsResponse.json();
      setPendingRequests({
        sent: requestsData.sent || [],
        received: requestsData.received || [],
      });
    } catch (err) {
      console.error('Error canceling friend request:', err);
    }
  };

  // Toggle chat window for a friend
  const handleChatOpen = (friend) => setChatOpen(chatOpen === friend ? null : friend);

  // Send a chat message
  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!message.trim() || !chatOpen) return;
    socket.emit('sendMessage', {
      sender: currentUser.username,
      receiver: chatOpen,
      message,
    });
    setMessages((prev) => ({
      ...prev,
      [chatOpen]: [...(prev[chatOpen] || []), { sender: currentUser.username, message }],
    }));
    setMessage('');
  };

  // Handle key press in message input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get total unread messages count
  const getTotalUnreadCount = () => {
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat button to open popup */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-200 relative"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {getTotalUnreadCount() > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {getTotalUnreadCount()}
            </span>
          )}
        </button>
      )}

      {/* Popup container */}
      {isOpen && (
        <div className="bg-gray-900 text-gray-100 rounded-lg shadow-2xl overflow-hidden flex flex-col w-80 h-96 transition-all duration-200 animate-fade-in">
          {/* Header with title and close button */}
          <div className="bg-indigo-600 p-3 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Chat</h2>
            <button onClick={() => setIsOpen(false)} className="text-gray-200 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs navigation */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 py-2 font-medium text-sm ${
                activeTab === 'friends' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Friends
              {getTotalUnreadCount() > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1">{getTotalUnreadCount()}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-2 font-medium text-sm ${
                activeTab === 'requests' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Requests
              {pendingRequests.received.length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1">{pendingRequests.received.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 py-2 font-medium text-sm ${
                activeTab === 'search' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Search
            </button>
          </div>

          {/* Content container */}
          <div className="flex-1 overflow-hidden">
            {/* Friends tab */}
            {activeTab === 'friends' && (
              <div className="h-full flex flex-col">
                {chatOpen ? (
                  <div className="flex flex-col h-full">
                    {/* Chat header */}
                    <div className="p-3 bg-gray-800 flex items-center">
                      <button onClick={() => setChatOpen(null)} className="mr-2 text-gray-400 hover:text-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <div className="flex items-center">
                        <span className="font-medium">{chatOpen}</span>
                        <span
                          className={`w-2 h-2 rounded-full ml-2 ${
                            onlineFriends.includes(chatOpen) ? 'bg-green-500' : 'bg-gray-500'
                          }`}
                        />
                      </div>
                    </div>
                    
                    {/* Messages container */}
                    <div className="flex-1 overflow-y-auto p-3 bg-gray-800">
                      {messages[chatOpen]?.length ? (
                        messages[chatOpen].map((msg, index) => (
                          <div
                            key={index}
                            className={`mb-2 max-w-3/4 ${
                              msg.sender === currentUser.username ? 'ml-auto' : 'mr-auto'
                            }`}
                          >
                            <div
                              className={`px-3 py-2 rounded-lg ${
                                msg.sender === currentUser.username
                                  ? 'bg-indigo-600 text-white rounded-br-none'
                                  : 'bg-gray-700 text-gray-100 rounded-bl-none'
                              }`}
                            >
                              {msg.message}
                            </div>
                            <div
                              className={`text-xs mt-1 text-gray-500 ${
                                msg.sender === currentUser.username ? 'text-right' : 'text-left'
                              }`}
                            >
                              {msg.sender}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                          <p>No messages yet. Start a conversation!</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Message input */}
                    <form onSubmit={handleSendMessage} className="p-2 bg-gray-800 border-t border-gray-700 flex">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type a message..."
                        className="flex-1 bg-gray-700 text-gray-100 rounded-l-lg py-2 px-3 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-r-lg transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="overflow-y-auto h-full">
                    {friends.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <p>No friends yet. Search for users to add!</p>
                      </div>
                    ) : (
                      <ul>
                        {friends.map((friend) => (
                          <li
                            key={friend}
                            onClick={() => handleChatOpen(friend)}
                            className="p-3 flex items-center justify-between hover:bg-gray-800 cursor-pointer border-b border-gray-800"
                          >
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center mr-3">
                                {friend.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium">{friend}</p>
                                <p className="text-xs text-gray-400">
                                  {onlineFriends.includes(friend) ? 'Online' : 'Offline'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <span
                                className={`w-3 h-3 rounded-full ${
                                  onlineFriends.includes(friend) ? 'bg-green-500' : 'bg-gray-500'
                                }`}
                              />
                              {unreadCounts[friend] > 0 && (
                                <span className="ml-2 bg-red-500 text-white rounded-full px-2 py-0.5 text-xs">
                                  {unreadCounts[friend]}
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Requests tab */}
            {activeTab === 'requests' && (
              <div className="h-full overflow-y-auto p-2">
                {/* Received Requests */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
                    Received Requests
                  </h3>
                  {pendingRequests.received.length > 0 ? (
                    <ul>
                      {pendingRequests.received.map((sender) => (
                        <li
                          key={sender}
                          className="p-2 rounded mb-1 bg-gray-800 flex items-center justify-between"
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center mr-2">
                              {sender.charAt(0).toUpperCase()}
                            </div>
                            <span>{sender}</span>
                          </div>
                          <div className="flex">
                            <button
                              onClick={() => handleAcceptRequest(sender)}
                              className="bg-green-600 text-white px-2 py-1 rounded mr-1 text-xs hover:bg-green-700 transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleCancelRequest(sender)}
                              className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm px-2">No received requests</p>
                  )}
                </div>

                {/* Sent Requests */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
                    Sent Requests
                  </h3>
                  {pendingRequests.sent.length > 0 ? (
                    <ul>
                      {pendingRequests.sent.map((receiver) => (
                        <li
                          key={receiver}
                          className="p-2 rounded mb-1 bg-gray-800 flex items-center justify-between"
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center mr-2">
                              {receiver.charAt(0).toUpperCase()}
                            </div>
                            <span>{receiver}</span>
                          </div>
                          <button
                            onClick={() => handleCancelRequest(receiver)}
                            className="bg-yellow-600 text-white px-2 py-1 rounded text-xs hover:bg-yellow-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm px-2">No sent requests</p>
                  )}
                </div>
              </div>
            )}

            {/* Search tab */}
            {activeTab === 'search' && (
              <div className="p-3">
                <div className="flex mb-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search users..."
                    className="flex-1 bg-gray-800 text-gray-100 p-2 rounded-l border border-gray-700 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleSearch}
                    className="bg-indigo-600 text-white px-4 rounded-r hover:bg-indigo-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
                
                {/* Search results */}
                <div className="overflow-y-auto max-h-48">
                  {searchResults.length > 0 ? (
                    <ul>
                      {searchResults.map((user) => (
                        <li
                          key={user.username}
                          className="p-2 rounded mb-1 bg-gray-800 flex items-center justify-between"
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center mr-2">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <span>{user.username}</span>
                          </div>
                          {!friends.includes(user.username) && 
                            !pendingRequests.sent.includes(user.username) && 
                            user.username !== currentUser?.username && (
                            <button
                              onClick={() => handleSendRequest(user.username)}
                              className="bg-indigo-600 text-white px-2 py-1 rounded text-xs hover:bg-indigo-700 transition-colors"
                            >
                              Add Friend
                            </button>
                          )}
                          {pendingRequests.sent.includes(user.username) && (
                            <span className="text-yellow-500 text-xs">Request Sent</span>
                          )}
                          {friends.includes(user.username) && (
                            <span className="text-green-500 text-xs">Friend</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : searchQuery && (
                    <p className="text-gray-500 text-center">No users found</p>
                  )}
                </div>

                {!searchQuery && (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p>Search for users to add</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendsList;