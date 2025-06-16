import { NavLink } from 'react-router-dom';
import styles from '../styles/Sidebar.module.css';
import useMediaQuery from '@mui/material/useMediaQuery';

const Sidebar = () => {
  const isDesktop = useMediaQuery('(min-width:900px)');
  if (!isDesktop) return null;
  return (
    <nav className={styles.sidebar}>
      <div className={styles.logo}>Receipts</div>
      <ul className={styles.navList}>
        {isDesktop && <li><NavLink to="/dashboard" className={({isActive}) => isActive ? styles.active : ''}>Dashboard</NavLink></li>}
        <li><NavLink to="/submit-receipt" className={({isActive}) => isActive ? styles.active : ''}>Submit Receipt</NavLink></li>
        <li><NavLink to="/admin-receipt" className={({isActive}) => isActive ? styles.active : ''}>Admin Receipt Entry</NavLink></li>
        <li><NavLink to="/test-mode" className={({isActive}) => isActive ? styles.active : ''}>Test Mode</NavLink></li>
      </ul>
    </nav>
  );
};

export default Sidebar; 