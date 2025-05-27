import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import styles from './LandingPage.module.css';

const SIGNAL_SERVER = 'http://localhost:5000';

function LandingPage() {
  const navigate = useNavigate();
  const [liveUsers, setLiveUsers] = useState(0);

  useEffect(() => {
    const socket = io(SIGNAL_SERVER);
    socket.on('user_count', ({ count }) => {
      setLiveUsers(count);
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.mainCard}>
        <div className={styles.liveUsersCounter}>
          <div className={styles.statusDot}></div>
          <span>{liveUsers} users online</span>
        </div>
        
        <h1 className={styles.title}>CorrectMe</h1>
        <p className={styles.subtitle}>
          Connect instantly with strangers worldwide for authentic voice conversations. 
          Anonymous, secure, and always surprising.
        </p>
        
        <button
          className={styles.startButton}
          onClick={() => navigate('/chat')}
        >
          Start Talking Now
        </button>
      </div>
    </div>
  );
}

export default LandingPage;