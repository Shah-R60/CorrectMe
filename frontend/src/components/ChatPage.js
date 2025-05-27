import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { FaPhoneAlt, FaBolt, FaExclamationTriangle, FaInfoCircle, FaCog } from 'react-icons/fa';
import styles from './ChatPage.module.css';

const SIGNAL_SERVER = 'https://correct-me-backend.vercel.app';

function ChatPage({ topic }) {
  const [status, setStatus] = useState('Connecting to server...');
  const [partnerId, setPartnerId] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const socketRef = useRef();
  const pcRef = useRef();
  const localStreamRef = useRef();
  const remoteAudioRef = useRef();
  const pendingStreamRef = useRef(null);
  const navigate = useNavigate();  const [myId, setMyId]  = useState(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [showConnectedMsg, setShowConnectedMsg] = useState(false);
  const [showSafetyMsg, setShowSafetyMsg] = useState(true);

  useEffect(() => {
    socketRef.current = io(SIGNAL_SERVER);
    socketRef.current.on('connect', () => {
      setMyId(socketRef.current.id);
    });
    setStatus('Looking for a partner...');
    socketRef.current.emit('find_partner');

    socketRef.current.on('partner_found', async ({ partnerId, startTime, shouldInitiate }) => {
      setPartnerId(partnerId);
      setStartTime(startTime);
      setStatus('Partner found! Connecting...');
      await startCall(partnerId, shouldInitiate); // ← Use shouldInitiate flag
    });

    socketRef.current.on('signal', async ({ from, data }) => {
      if (!pcRef.current) {
        console.log('No peer connection available');
        return;
      }
      
      try {
        if (data.type === 'offer') {
          console.log('Received offer from', from);
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          socketRef.current.emit('signal', { to: from, data: answer });
          console.log('Sent answer to', from);
        } else if (data.type === 'answer') {
          console.log('Received answer from', from);
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data));
        } else if (data.candidate) {
          console.log('Received ICE candidate from', from);
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (error) {
        console.error('Error handling signal:', error);
      }
    });

    socketRef.current.on('partner_disconnected', ({ id }) => {
      if (id === partnerId) {
        cleanup();
        setStatus('Your partner has disconnected.');
        setCallActive(false);
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
        { urls: 'stun:stun.l.google.com:19302' },
        // { urls: 'stun:stun1.l.google.com:19302' } // Add backup STUN server
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
      console.log('Received remote audio stream'); // ← Add logging
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      } else {
        pendingStreamRef.current = event.streams[0];
      }
    };

    // BOTH users need to get their microphone stream
    try {
      console.log('Getting user media...'); // ← Add logging
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }, 
        video: false 
      });
      localStreamRef.current = stream;
      
      // Add all tracks to the peer connection
      stream.getTracks().forEach(track => {
        console.log('Adding local track:', track.kind); // ← Add logging
        pcRef.current.addTrack(track, stream);
      });
    } catch (err) {
      console.error('Microphone access error:', err); // ← Add logging
      setStatus('Microphone access denied.');
      return;
    }

    // Only the initiator creates the offer
    if (isInitiator) {
      console.log('Creating offer as initiator'); // ← Add logging
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      socketRef.current.emit('signal', { to: partnerId, data: offer });
    } else {
      console.log('Waiting for offer from partner'); // ← Add logging
    }
    
    setCallActive(true);
    setStatus('Connected! You are now talking.');
    setShowConnectedMsg(true);
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
    }, 1000);    return () => clearInterval(interval);
  }, [callActive, startTime]);

  // Auto-hide safety message after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSafetyMsg(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Show connected message when call becomes active and hide after 5 seconds
  useEffect(() => {
    if (callActive) {
      setShowConnectedMsg(true);
      const timer = setTimeout(() => {
        setShowConnectedMsg(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [callActive]);

  return (
    <div className={styles.container}>
      {/* Top Action Buttons */}
      <div className={styles.topActions}>
        <button className={`${styles.actionButton} ${styles.warning}`}>
          <FaExclamationTriangle />
          Report
        </button>
        <button className={`${styles.actionButton} ${styles.info}`}>
          <FaInfoCircle />
          Info
        </button>
        <button className={styles.actionButton}>
          <FaCog />
          Settings
        </button>
      </div>

      {/* Main Call Area */}
      <div className={styles.callArea}>
        <div className={styles.card}>
          <div className={styles.callIconCircle}>
            <FaPhoneAlt className={styles.callIcon} />
            <FaBolt className={styles.boltIcon} />
          </div>
          
          <div className={styles.status}>{status}</div>
          
          {callActive && (
            <div>
              <audio ref={remoteAudioRef} autoPlay />
              <div className={styles.talking}>Talking to a stranger...</div>
              <div className={styles.timer}>
                {String(Math.floor(duration / 60)).padStart(2, '0')}:{String(duration % 60).padStart(2, '0')}
              </div>
              
              {/* Star Rating */}
              <div className={styles.starRow}>
                <span className={styles.star}>⭐</span>
                <span className={styles.star}>⭐</span>
                <span className={styles.star}>⭐</span>
                <span className={styles.star}>⭐</span>
                <span className={styles.star}>⭐</span>
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
      </div>      {/* Status Bar */}
      {callActive && showConnectedMsg && (
        <div className={styles.statusBar}>
          <div className={styles.statusConnected}>
            🟢 Connected
          </div>
        </div>
      )}

      {/* Safety Info Bar */}
      {showSafetyMsg && (
        <div className={styles.infoBar}>
          <div className={styles.infoMsg}>
            ⚠️ Stay safe: Don't share personal information
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatPage;
