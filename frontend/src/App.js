import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import ChatPage from './components/ChatPage';
import Header from './components/Header';
import Navbar from './components/Navbar';
import './app.css';


function App() {
  const [topic, setTopic] = useState('');

  useEffect(() => {
    fetch('https://correct-me-backend.vercel.app/topic')
      .then(res => res.json())
      .then(data => setTopic(data.topic));
  }, []);
  return (
    <div>
      <Navbar />
      <Header topic={topic} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/chat" element={<ChatPage topic={topic} />} />
      </Routes>
    </div>
  );
}

export default App; 
