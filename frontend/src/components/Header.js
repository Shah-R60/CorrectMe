import React from 'react';
import { FaCheckCircle } from 'react-icons/fa';
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
          
          <div className={styles.topicText}>
            {topic ? (
              <span>"{topic}"</span>
            ) : (
              <span className={styles.loadingText}>Loading today's topic...</span>
            )}
          </div>        </div>
      </header>
    );
}

export default Header;