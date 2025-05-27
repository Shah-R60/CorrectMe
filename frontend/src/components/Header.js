import React from 'react';
import styles from './Header.module.css';

function Header({ topic }) {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.topicLabel}>
          <span className={styles.decorativeIcon}>💬</span>
          Topic of the Day
          <span className={styles.decorativeIcon}>✨</span>
        </div>
        
        <h1 className={styles.title}>Daily Discussion</h1>
        
        <div className={styles.topicText}>
          {topic ? (
            <span>"{topic}"</span>
          ) : (
            <span className={styles.loadingText}>Loading today's topic...</span>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header; 