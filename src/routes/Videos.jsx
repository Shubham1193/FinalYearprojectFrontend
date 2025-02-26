import React, { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketProvider';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearRoomId } from '../redux/room/roomSlice';
import { setPeerId, setPeerInstance, clearPeerState } from '../redux/peer/peerSlice';
import Peer from 'peerjs';

const Videos = () => {
    const { roomId: id } = useSelector((state) => state.room);
    const { peerId, peerInstance } = useSelector((state) => state.peer);
    const remoteVideoRef = useRef(null);
    const currentUserVideoRef = useRef();
    const socket = useSocket();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    useEffect(() => {
        if (!peerInstance) {
            const peer = new Peer();
            peer.on('open', (peerId) => {
                dispatch(setPeerId(peerId));
                socket.emit('join room', { id, peerId: peerId, username: localStorage.getItem('access_token') });
            });
            dispatch(setPeerInstance(peer));
        }

        if (peerInstance) {
            peerInstance.on('call', (call) => {
                navigator.mediaDevices.getUserMedia({ video: true }).then((mediaStream) => {
                    currentUserVideoRef.current.srcObject = mediaStream;
                    currentUserVideoRef.current.play();
                    call.answer(mediaStream);
                    call.on('stream', (remoteStream) => {
                        remoteVideoRef.current.srcObject = remoteStream;
                        remoteVideoRef.current.play();
                    });
                });
            });
        }

        socket.on('other user', (data) => {
            console.log(data)
            call(data[0]);
        });
        socket.on("room full", handleRoomsfull)
        socket.on('userdisconnect', handleUserDisconnect);

        return () => {
            socket.off('userdisconnect', handleUserDisconnect);
            socket.off('room full', handleRoomsfull)
        };
    }, [peerInstance, socket]);

    const handleUserDisconnect = (peerid) => {
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
            remoteVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
            remoteVideoRef.current.srcObject = null;
        }
    };

    const handleRoomsfull = () => {
        alert("room is full")
        navigate('/create')
    }

    const call = (remotePeerId) => {
        navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then((mediaStream) => {
            currentUserVideoRef.current.srcObject = mediaStream;
            currentUserVideoRef.current.play();
            const call = peerInstance.call(remotePeerId, mediaStream);
            call.on('stream', (remoteStream) => {
                remoteVideoRef.current.srcObject = remoteStream;
                remoteVideoRef.current.play();
            });
        });
    };

    const leaveRoom = () => {
        // const token = localStorage.getItem("access_token")
        socket.emit("disco", { peerId, token: localStorage.getItem("access_token") })
        dispatch(clearPeerState())
        dispatch(clearRoomId());
        if (currentUserVideoRef.current && currentUserVideoRef.current.srcObject) {
            currentUserVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
            remoteVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        if (peerInstance) {
            peerInstance.destroy();
            dispatch(clearPeerState());
        }
        socket.emit('leave room', { roomId: id, peerId });
        navigate('/create');
    };

    return (
        <div className='w-[100%] flex flex-col items-center bg-[#262628] h-[100%]'>
            <div className='mt-2'>
                <video ref={currentUserVideoRef} className='rounded-lg border-gray-300 h-[25vh] mt-3'></video>
            </div>
            <div className='mt-2'>
                <video ref={remoteVideoRef} className='rounded-lg border-gray-300 h-[25vh] mt-3'></video>
            </div>
            <div><button className='border-2 p-2 rounded-xl bg-white mt-4' onClick={leaveRoom}>Leave room</button></div>
        </div>
    );
};

export default Videos;
