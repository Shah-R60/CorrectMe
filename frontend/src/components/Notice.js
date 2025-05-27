import React from 'react';
import { FaInfoCircle, FaExclamationTriangle, FaBell, FaTimes } from 'react-icons/fa';
import styles from './Notice.module.css';

function Notice({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.noticeContainer}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <FaBell className={styles.bellIcon} />
            <h2 className={styles.title}>Important Notice</h2>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.noticeItem}>
            <FaInfoCircle className={styles.infoIcon} />
            <div className={styles.noticeText}>
              <h3>Platform Updates</h3>
              <p>We've enhanced our chat experience with improved real-time messaging and better user interface.</p>
            </div>
          </div>

          <div className={styles.noticeItem}>
            <FaExclamationTriangle className={styles.warningIcon} />
            <div className={styles.noticeText}>
              <h3>Maintenance Schedule</h3>
              <p>Scheduled maintenance will occur every Sunday from 2:00 AM - 4:00 AM EST for optimal performance.</p>
            </div>
          </div>

          <div className={styles.noticeItem}>
            <FaInfoCircle className={styles.infoIcon} />
            <div className={styles.noticeText}>
              <h3>Community Guidelines</h3>
              <p>Please maintain respectful communication and follow our community guidelines for a positive experience.</p>
            </div>
          </div>

          <div className={styles.noticeItem}>
            <FaBell className={styles.updateIcon} />
            <div className={styles.noticeText}>
              <h3>New Features</h3>
              <p>Explore our new emoji reactions, file sharing capabilities, and enhanced notification system.</p>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.acknowledgeButton} onClick={onClose}>
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}

export default Notice;
