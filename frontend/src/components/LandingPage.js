import React from 'react';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center', marginTop: '5rem' }}>
      <h1>Welcome to Voice Omegle!</h1>
      <p>Connect with a random stranger for a voice-only chat.</p>
      <button
        style={{ padding: '1rem 2rem', fontSize: '1.2rem', cursor: 'pointer' }}
        onClick={() => navigate('/chat')}
      >
        Start Chat
      </button>
    </div>
  );
}

export default LandingPage; 