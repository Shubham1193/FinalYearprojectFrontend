import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketProvider';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearRoomId } from '../redux/room/roomSlice';
import { setPeerId, setPeerInstance, clearPeerState } from '../redux/peer/peerSlice';
import Peer from 'peerjs';
import { Mic, MicOff, Video, VideoOff, LogOut } from 'lucide-react';

const Videos = () => {
    // Redux state for room and peer information
    const { roomId: id } = useSelector((state) => state.room);
    const { peerId, peerInstance } = useSelector((state) => state.peer);

    // Refs for local and remote video elements
    const remoteVideoRef = useRef(null);
    const currentUserVideoRef = useRef(null);

    // Hooks for socket, navigation, and dispatching actions
    const socket = useSocket();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // State to track mute and video status
    const [isMuted, setIsMuted] = useState(false); 
    const [isVideoOff, setIsVideoOff] = useState(false);

    // Effect to handle peer connection and media stream setup
    useEffect(() => {
        // Initialize PeerJS instance if not already created
        if (!peerInstance) {
            const peer = new Peer();
            peer.on('open', (peerId) => {
                dispatch(setPeerId(peerId));
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
                    currentUserVideoRef.current.srcObject = mediaStream;
                    currentUserVideoRef.current.muted = true;
                    console.log('Local video muted on call answer:', currentUserVideoRef.current.muted);
                    currentUserVideoRef.current.play();
                    call.answer(mediaStream); // Answer the call with local stream
                    call.on('stream', (remoteStream) => {
                        remoteVideoRef.current.srcObject = remoteStream;
                        remoteVideoRef.current.play();
                    });
                }).catch((err) => console.error('Error accessing media devices:', err));
            });
        }

        // Socket event listeners
        socket.on('other user', (data) => call(data[0])); // Call the other user
        socket.on('room full', handleRoomsfull); // Handle room full scenario
        socket.on('userdisconnect', handleUserDisconnect); // Handle user disconnect

        // Cleanup on unmount
        return () => {
            socket.off('userdisconnect', handleUserDisconnect);
            socket.off('room full', handleRoomsfull);
            socket.off('other user');
            // Cleanup peer instance and streams if component unmounts
            if (peerInstance) {
                peerInstance.off('call');
            }
            if (currentUserVideoRef.current && currentUserVideoRef.current.srcObject) {
                currentUserVideoRef.current.pause();
                currentUserVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
                currentUserVideoRef.current.srcObject = null;
            }
            if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
                remoteVideoRef.current.pause();
                remoteVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
                remoteVideoRef.current.srcObject = null;
            }
        };
    }, [peerInstance, socket, dispatch, id]);

    // Handle user disconnect by stopping remote video stream
    const handleUserDisconnect = (peerid) => {
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
            remoteVideoRef.current.pause();
            remoteVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
            remoteVideoRef.current.srcObject = null;
            console.log('Remote stream stopped due to user disconnect');
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
            currentUserVideoRef.current.muted = true;
            console.log('Local video muted on call initiation:', currentUserVideoRef.current.muted);
            currentUserVideoRef.current.play();
            const call = peerInstance.call(remotePeerId, mediaStream);
            call.on('stream', (remoteStream) => {
                remoteVideoRef.current.srcObject = remoteStream;
                remoteVideoRef.current.play();
            });
        }).catch((err) => console.error('Error accessing media devices:', err));
    };

    // Leave the room and clean up resources
    const leaveRoom = () => {
        socket.emit('disco', { peerId, token: localStorage.getItem('access_token') });
        if (currentUserVideoRef.current && currentUserVideoRef.current.srcObject) {
            currentUserVideoRef.current.pause();
            currentUserVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
            currentUserVideoRef.current.srcObject = null;
            console.log('Local stream stopped on leave');
        }
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
            remoteVideoRef.current.pause();
            remoteVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
            remoteVideoRef.current.srcObject = null;
            console.log('Remote stream stopped on leave');
        }
        if (peerInstance) {
            peerInstance.destroy();
            console.log('Peer instance destroyed');
        }
        dispatch(clearPeerState());
        dispatch(clearRoomId());
        socket.emit('leave room', { roomId: id, peerId });
        navigate('/create');
    };

    // Toggle mute/unmute for local audio
    const toggleMute = () => {
        const mediaStream = currentUserVideoRef.current.srcObject;
        if (mediaStream) {
            const audioTracks = mediaStream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
                console.log('Audio track enabled:', track.enabled);
            });
            setIsMuted(!isMuted);
        } else {
            console.log('No media stream to toggle mute');
        }
    };

    // Toggle video on/off for local video
    const toggleVideo = () => {
        const mediaStream = currentUserVideoRef.current.srcObject;
        if (mediaStream) {
            const videoTracks = mediaStream.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = !track.enabled;
                console.log('Video track enabled:', track.enabled);
            });
            setIsVideoOff(!isVideoOff);
        } else {
            console.log('No media stream to toggle video');
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
                    autoPlay
                ></video>
            </div>
            {/* Remote video display */}
            <div className='mt-2'>
                <video
                    ref={remoteVideoRef}
                    className='rounded-lg border-gray-300 h-[25vh] mt-3'
                    autoPlay
                ></video>
            </div>
            {/* Control buttons */}
            <div className='mt-4 flex space-x-4'>
                {/* Mute/Unmute button */}
                <button
                    className={`flex items-center justify-center border-2 p-2 rounded-xl ${isMuted ? 'bg-red-500' : 'bg-green-500'} text-white w-12 h-12`}
                    onClick={toggleMute}
                    title={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
                {/* Video on/off button */}
                <button
                    className={`flex items-center justify-center border-2 p-2 rounded-xl ${isVideoOff ? 'bg-red-500' : 'bg-green-500'} text-white w-12 h-12`}
                    onClick={toggleVideo}
                    title={isVideoOff ? 'Turn On Video' : 'Turn Off Video'}
                >
                    {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                </button>
                {/* Leave room button */}
                <button
                    className='flex items-center justify-center border-2 p-2 rounded-xl bg-white w-12 h-12'
                    onClick={leaveRoom}
                    title='Leave Room'
                >
                    <LogOut size={24} color="#000" />
                </button>
            </div>
        </div>
    );
};

export default Videos;