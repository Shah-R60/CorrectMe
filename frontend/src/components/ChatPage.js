import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import styles from './ChatPage.module.css';

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
  const [startTime, setStartTime] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    socketRef.current = io(SIGNAL_SERVER);
    socketRef.current.on('connect', () => {
      setMyId(socketRef.current.id);
    });
    setStatus('Looking for a partner...');
    socketRef.current.emit('find_partner');

    socketRef.current.on('partner_found', async ({ partnerId, startTime }) => {
      setPartnerId(partnerId);
      setStartTime(startTime);
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
        cleanup();
        setStatus('Your partner has disconnected.');
        setCallActive(false);
        // Do not navigate away
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
    setDuration(0); // Reset duration, but will be set by useEffect
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
      cleanup();
      setStatus('Partner left the call.');
      setTimeout(() => {
        navigate('/');
      }, 1000);
    });
    return () => {
      if (socketRef.current) {
        socketRef.current.off('force_disconnect');
      }
    };
    // eslint-disable-next-line
  }, [navigate]);

  useEffect(() => {
    if (!callActive || !startTime) return;
    setDuration(Math.floor((Date.now() - startTime) / 1000)); // Set initial duration
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setDuration(elapsed);
      if (elapsed >= 900) { // 15 minutes
        cleanup();
        setStatus('Call ended: 15 minute time limit reached.');
        setCallActive(false);
        clearInterval(interval);
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [callActive, startTime]);

  return (
    <div className={styles.container + (darkMode ? ' ' + styles.dark : '')}>
      <div className={styles.card}>
        <button
          style={{
            position: 'absolute',
            top: 18,
            right: 24,
            background: 'none',
            border: 'none',
            fontSize: '1.3rem',
            cursor: 'pointer',
            color: darkMode ? '#fff' : '#222',
            zIndex: 2
          }}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={() => setDarkMode(dm => !dm)}
        >
          {darkMode ? '🌙' : '☀️'}
        </button>
        <h2 className={styles.topic}>Topic: <span>{topic}</span></h2>
        <div className={styles.myId} style={{ marginBottom: '1.2rem', fontSize: '1rem' }}>
          <strong>Your Socket ID:</strong>
          <div className={styles.myId}>{myId || 'Connecting...'}</div>
        </div>
        <div className={styles.status}>{status}</div>
        {callActive && (
          <div style={{ marginBottom: '1.5rem' }}>
            <audio ref={remoteAudioRef} autoPlay />
            <div className={styles.talking}>Talking to a stranger...</div>
            <div className={styles.timer}>
              {String(Math.floor(duration / 60)).padStart(2, '0')}:{String(duration % 60).padStart(2, '0')}
            </div>
            <div className={styles.partnerId} style={{ fontSize: '0.98rem', marginTop: '0.5rem' }}>
              <strong>Partner Socket ID:</strong>
              <div className={styles.partnerId}>{partnerId}</div>
            </div>
          </div>
        )}
        <button
          onClick={leaveCall}
          className={styles.leaveBtn}
        >
          Leave
        </button>
      </div>
    </div>
  );
}

export default ChatPage; 