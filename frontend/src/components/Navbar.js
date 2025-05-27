import React, { useState } from 'react';
import { FaCheckCircle, FaBell } from 'react-icons/fa';
import Notice from './Notice';
import styles from './Navbar.module.css';

function Navbar() {
  const [showNotice, setShowNotice] = useState(false);

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.navLeft}>
          <FaCheckCircle className={styles.logoIcon} />
          <span className={styles.logoText}>CorrectMe</span>
        </div>
        <div className={styles.navRight}>
          <a href="/" className={styles.navLink}>Home</a>
          <button 
            className={styles.noticeButton}
            onClick={() => setShowNotice(true)}
          >
            <FaBell className={styles.noticeIcon} />
            Notice
          </button>
          <a href="#progress" className={styles.navLink}>Progress</a>
          <a href="#faq" className={styles.navLink}>FAQ</a>
        </div>
      </nav>

      <Notice 
        isOpen={showNotice} 
        onClose={() => setShowNotice(false)} 
      />
    </>
  );
}

export default Navbar;
