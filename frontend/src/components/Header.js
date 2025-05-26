import React from 'react';

function Header({ topic }) {
  return (
    <header style={{ padding: '1rem', background: '#282c34', color: 'white', textAlign: 'center' }}>
      <h2>Topic of the Day</h2>
      <h3>{topic || 'Loading topic...'}</h3>
    </header>
  );
}

export default Header; 