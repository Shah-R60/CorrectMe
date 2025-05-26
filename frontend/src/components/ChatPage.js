import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';

const SIGNAL_SERVER = 'http://localhost:5000';

function ChatPage({ topic }) {
  const [status, setStatus] = useState('Connecting to server...');
  const [partnerId, setPartnerId] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const socketRef = useRef();
  const pcRef = useRef();
  const localStreamRef = useRef();
  const remoteAudioRef = useRef();
  const pendingStreamRef = useRef(null);
  const navigate = useNavigate();
  const [myId, setMyId]  = useState(null);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SIGNAL_SERVER);
    socketRef.current.on('connect', () => {
      setMyId(socketRef.current.id);
    });
    setStatus('Looking for a partner...');
    socketRef.current.emit('find_partner');

    socketRef.current.on('partner_found', async ({ partnerId }) => {
      setPartnerId(partnerId);
      setStatus('Partner found! Connecting...');
      await startCall(partnerId, true);
    });

    socketRef.current.on('signal', async ({ from, data }) => {
      if (!pcRef.current) return;
      if (data.type === 'offer') {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socketRef.current.emit('signal', { to: from, data: answer });
      } else if (data.type === 'answer') {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data));
      } else if (data.candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {}
      }
    });

    socketRef.current.on('partner_disconnected', ({ id }) => {
      if (id === partnerId) {
        setStatus('Your partner has disconnected, Due to Network Issues');
        setCallActive(false);
        cleanup();
        setTimeout(() => {
          navigate('/');
        }, 10000);
      }
    });

    return () => {
      cleanup();
      socketRef.current.disconnect();
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    // If a stream was received before the audio element was mounted
    if (remoteAudioRef.current && pendingStreamRef.current) {
      remoteAudioRef.current.srcObject = pendingStreamRef.current;
      pendingStreamRef.current = null;
    }
  }, []);

  async function startCall(partnerId, isInitiator) {
    pcRef.current = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    pcRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('signal', {
          to: partnerId,
          data: { candidate: event.candidate }
        });
      }
    };

    pcRef.current.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      } else {
        pendingStreamRef.current = event.streams[0];
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      stream.getTracks().forEach(track => pcRef.current.addTrack(track, stream));
    } catch (err) {
      setStatus('Microphone access denied.');
      return;
    }

    if (isInitiator) {
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      socketRef.current.emit('signal', { to: partnerId, data: offer });
    }
    setCallActive(true);
    setStatus('Connected! You are now talking.');
    setDuration(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  }

  function cleanup() {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setCallActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function leaveCall() {
    // Notify partner before leaving
    if (socketRef.current && partnerId) {
      socketRef.current.emit('leave_call', { to: partnerId });
    }
    cleanup();
    navigate('/');
  }

  useEffect(() => {
    if (!socketRef.current) return;
    // Listen for forced disconnect from partner
    socketRef.current.on('force_disconnect', () => {
      setStatus('Partner left the call.');
      setTimeout(() => {
        cleanup();
        navigate('/');
      }, 15000);
    });
    return () => {
      if (socketRef.current) {
        socketRef.current.off('force_disconnect');
      }
    };
    // eslint-disable-next-line
  }, [navigate]);

  return (
    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
      <h2>Topic: {topic}</h2>
      <p><strong>Your Socket ID:</strong> {myId || 'Connecting...'}</p>
      <p>Status: {status}</p>
      {callActive && (
        <div>
          <audio ref={remoteAudioRef} autoPlay />
          <p>Talking to a stranger...</p>
          <p><strong>Duration:</strong> {String(Math.floor(duration / 60)).padStart(2, '0')}:{String(duration % 60).padStart(2, '0')}</p>
          <p><strong>Partner Socket ID:</strong> {partnerId}</p>
        </div>
      )}
      <button onClick={leaveCall} style={{ marginTop: '2rem', padding: '0.7rem 2rem' }}>
        Leave
      </button>
    </div>
  );
}

export default ChatPage; 