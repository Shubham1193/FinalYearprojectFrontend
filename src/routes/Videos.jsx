import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketProvider';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearRoomId } from '../redux/room/roomSlice';
import { setPeerId, setPeerInstance, clearPeerState } from '../redux/peer/peerSlice';
import Peer from 'peerjs';

const Videos = () => {
    // Redux state for room and peer information
    const { roomId: id } = useSelector((state) => state.room);
    const { peerId, peerInstance } = useSelector((state) => state.peer);

    // Refs for local and remote video elements
    const remoteVideoRef = useRef(null);
    const currentUserVideoRef = useRef();

    // Hooks for socket, navigation, and dispatching actions
    const socket = useSocket();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // State to track mute and video status
    const [isMuted, setIsMuted] = useState(false); // Tracks if audio is muted
    const [isVideoOff, setIsVideoOff] = useState(false); // Tracks if video is off

    // Effect to handle peer connection and media stream setup
    useEffect(() => {
        // Initialize PeerJS instance if not already created
        if (!peerInstance) {
            const peer = new Peer();
            peer.on('open', (peerId) => {
                dispatch(setPeerId(peerId));
                // Emit join room event with room ID, peer ID, and username
                socket.emit('join room', { id, peerId, username: localStorage.getItem('access_token') });
            });
            dispatch(setPeerInstance(peer));
        }

        // Handle incoming calls from other peers
        if (peerInstance) {
            peerInstance.on('call', (call) => {
                navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                }).then((mediaStream) => {
                    // Set local video stream and mute to prevent echo
                    currentUserVideoRef.current.srcObject = mediaStream;
                    currentUserVideoRef.current.muted = true;
                    currentUserVideoRef.current.play();
                    call.answer(mediaStream); // Answer the call with local stream
                    call.on('stream', (remoteStream) => {
                        // Display remote user's video stream
                        remoteVideoRef.current.srcObject = remoteStream;
                        remoteVideoRef.current.play();
                    });
                });
            });
        }

        // Socket event listeners
        socket.on('other user', (data) => call(data[0])); // Call the other user
        socket.on('room full', handleRoomsfull); // Handle room full scenario
        socket.on('userdisconnect', handleUserDisconnect); // Handle user disconnect

        // Cleanup socket listeners on unmount
        return () => {
            socket.off('userdisconnect', handleUserDisconnect);
            socket.off('room full', handleRoomsfull);
        };
    }, [peerInstance, socket]);

    // Handle user disconnect by stopping remote video stream
    const handleUserDisconnect = (peerid) => {
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
            remoteVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
            remoteVideoRef.current.srcObject = null;
        }
    };

    // Handle room full by alerting and redirecting
    const handleRoomsfull = () => {
        alert('Room is full');
        navigate('/create');
    };

    // Initiate a call to a remote peer
    const call = (remotePeerId) => {
        navigator.mediaDevices.getUserMedia({
            video: true,
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        }).then((mediaStream) => {
            currentUserVideoRef.current.srcObject = mediaStream;
            currentUserVideoRef.current.muted = true; // Mute local audio to prevent echo
            currentUserVideoRef.current.play();
            const call = peerInstance.call(remotePeerId, mediaStream);
            call.on('stream', (remoteStream) => {
                remoteVideoRef.current.srcObject = remoteStream;
                remoteVideoRef.current.play();
            });
        });
    };

    // Leave the room and clean up resources
    const leaveRoom = () => {
        socket.emit('disco', { peerId, token: localStorage.getItem('access_token') });
        dispatch(clearPeerState());
        dispatch(clearRoomId());
        // Stop local video stream
        if (currentUserVideoRef.current && currentUserVideoRef.current.srcObject) {
            currentUserVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        // Stop remote video stream
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
            remoteVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        // Destroy peer instance and emit leave room event
        if (peerInstance) {
            peerInstance.destroy();
            dispatch(clearPeerState());
        }
        socket.emit('leave room', { roomId: id, peerId });
        navigate('/create');
    };

    // Toggle mute/unmute for local audio
    const toggleMute = () => {
        const mediaStream = currentUserVideoRef.current.srcObject;
        if (mediaStream) {
            const audioTracks = mediaStream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !track.enabled; // Toggle audio track
            });
            setIsMuted(!isMuted); // Update mute state
        }
    };

    // Toggle video on/off for local video
    const toggleVideo = () => {
        const mediaStream = currentUserVideoRef.current.srcObject;
        if (mediaStream) {
            const videoTracks = mediaStream.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = !track.enabled; // Toggle video track
            });
            setIsVideoOff(!isVideoOff); // Update video state
        }
    };

    return (
        <div className='w-[100%] flex flex-col items-center bg-[#262628] h-[100%]'>
            {/* Local video display */}
            <div className='mt-2'>
                <video
                    ref={currentUserVideoRef}
                    muted
                    className='rounded-lg border-gray-300 h-[25vh] mt-3'
                ></video>
            </div>
            {/* Remote video display */}
            <div className='mt-2'>
                <video
                    ref={remoteVideoRef}
                    className='rounded-lg border-gray-300 h-[25vh] mt-3'
                ></video>
            </div>
            {/* Control buttons */}
            <div className='mt-4 flex space-x-4'>
                {/* Mute/Unmute button */}
                <button
                    className={`border-2 p-2 rounded-xl ${isMuted ? 'bg-red-500' : 'bg-green-500'} text-white`}
                    onClick={toggleMute}
                >
                    {isMuted ? 'Unmute' : 'Mute'}
                </button>
                {/* Video on/off button */}
                <button
                    className={`border-2 p-2 rounded-xl ${isVideoOff ? 'bg-red-500' : 'bg-green-500'} text-white`}
                    onClick={toggleVideo}
                >
                    {isVideoOff ? 'Turn On Video' : 'Turn Off Video'}
                </button>
                {/* Leave room button */}
                <button
                    className='border-2 p-2 rounded-xl bg-white'
                    onClick={leaveRoom}
                >
                    Leave Room
                </button>
            </div>
        </div>
    );
};

export default Videos;