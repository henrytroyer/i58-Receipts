import styles from '../styles/BudgetDetail.module.css';
import React, { useState } from 'react';

interface BudgetProgressBarProps {
  name: string;
  spent: number;
  limit: number;
  startDate: string;
  endDate: string;
  isOverall?: boolean;
  hidePercentLabel?: boolean;
  isCategory?: boolean;
  isLoading?: boolean;
  overallBudgetStatus?: {
    isOver: boolean;
    totalSpent: number;
    totalLimit: number;
  };
  proportionalBorrowed?: number;
  equalizedPercent?: number;
}

const BudgetProgressBar: React.FC<BudgetProgressBarProps> = ({ 
  name, 
  spent, 
  limit, 
  startDate, 
  endDate, 
  isOverall, 
  hidePercentLabel,
  isCategory,
  isLoading,
  overallBudgetStatus,
  proportionalBorrowed,
  equalizedPercent
}) => {
  const today = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  const daysElapsed = Math.min(Math.max((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24), 0), totalDays);
  const percentSpent = (spent / limit) * 100;
  const percentTime = Math.min((daysElapsed / totalDays) * 100, 100);
  const [showDateLabel, setShowDateLabel] = useState(false);

  // Handle unlimited category
  if (limit === 0) {
    return (
      <div className={styles.budgetRow} style={isOverall ? { marginBottom: '2.5rem' } : {}}>
        {hidePercentLabel && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <span style={{ fontWeight: 700, color: '#1a4d2e', fontSize: 15 }}>{name}</span>
            <span style={{ fontWeight: 600, color: '#232946', fontSize: 13 }}>—</span>
          </div>
        )}
        {!hidePercentLabel && (
          <div className={styles.header} style={isOverall ? { fontSize: '1.2rem', color: '#1a4d2e' } : {}}>{name}</div>
        )}
        <div className={styles.labels}>
          <span>No budget</span>
        </div>
        <div className={styles.amounts}>
          <span>Spent: ${spent.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
      </div>
    );
  }

  // Check if category is overspent but overall budget is under
  const isCategoryOver = isCategory && spent > limit;
  const hasBudgetFlexibility = isCategoryOver && overallBudgetStatus && !overallBudgetStatus.isOver;

  // Proportional borrowed visualization
  const showProportionalViz = proportionalBorrowed && proportionalBorrowed > 0 && equalizedPercent;
  const percentProportional = equalizedPercent || percentSpent;

  return (
    <div className={styles.budgetRow} style={{ ...(isOverall ? { marginBottom: '2.5rem' } : {}), marginBottom: hidePercentLabel ? 0 : undefined }}>
      {hidePercentLabel && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 2 }}>
          <span style={{ fontWeight: 700, color: '#1a4d2e', fontSize: 15 }}>{name}</span>
          {hasBudgetFlexibility && (
            <span style={{ 
              marginLeft: 8, 
              fontSize: 12, 
              color: '#3b6ea5',
              background: '#e8eefd',
              padding: '2px 6px',
              borderRadius: 4,
              fontWeight: 500
            }}>
              Flexible Budget Available
            </span>
          )}
        </div>
      )}
      {!hidePercentLabel && (
        <div className={styles.header} style={isOverall ? { fontSize: '1.2rem', color: '#1a4d2e' } : {}}>{name}</div>
      )}
      {/* Borrowed label above the bar, right-aligned */}
      {proportionalBorrowed && proportionalBorrowed > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', width: '100%', marginBottom: 2 }}>
          <span style={{ color: '#3b6ea5', fontWeight: 500, fontSize: 13 }}>
            €{proportionalBorrowed.toLocaleString(undefined, { maximumFractionDigits: 2 })} Borrowed
          </span>
        </div>
      )}
      <div className={styles.progressBarContainer} style={{ ...(isOverall ? { height: '24px' } : {}), marginBottom: hidePercentLabel ? 0 : undefined, position: 'relative' }}>
        <div className={styles.progressBarBg}>
          {/* Main progress bar */}
          <div
            className={styles.progressBarFill}
            style={{
              width: `${Math.min(percentSpent, 100)}%`,
              background: 'linear-gradient(90deg, #4a90e2 0%, #7db7ea 100%)',
              height: isOverall ? '100%' : undefined,
            }}
          />
          
          {/* Proportional borrowed visualization */}
          {showProportionalViz && (
            <div
              style={{
                position: 'absolute',
                left: `${Math.min(percentSpent, 100)}%`,
                top: 0,
                width: `${Math.max(Math.min(percentProportional - percentSpent, 100 - percentSpent), 0)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #a8d4f2 0%, #c5e3f7 100%)',
                borderLeft: '1px solid #4a90e2',
                zIndex: 2,
              }}
            />
          )}
          
          {/* Wrapper for today marker with larger hit area */}
          <div
            style={{
              position: 'absolute',
              left: `calc(${percentTime}% - 10px)`,
              top: isOverall ? '-14px' : '-12px',
              width: '24px',
              height: isOverall ? '44px' : '38px',
              zIndex: 3,
              background: 'transparent',
              cursor: 'pointer',
            }}
            onMouseEnter={() => setShowDateLabel(true)}
            onMouseLeave={() => setShowDateLabel(false)}
          >
            <div
              className={styles.todayMarker}
              style={{
                left: '10px',
                top: isOverall ? '8px' : '6px',
                position: 'absolute',
                height: isOverall ? '32px' : '26px',
              }}
            />
            {/* Date label - only show on hover */}
            {showDateLabel && (
              <div
                style={{
                  position: 'absolute',
                  left: '-24px',
                  top: isOverall ? '-28px' : '-24px',
                  fontSize: 13,
                  color: '#111',
                  background: 'white',
                  borderRadius: 4,
                  padding: '2px 8px',
                  fontWeight: 600,
                  zIndex: 9999,
                  pointerEvents: 'auto',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 1px 4px #1112',
                }}
              >
                {today.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
              </div>
            )}
          </div>
        </div>
      </div>
      {!hidePercentLabel && (
        <div className={styles.labels}>
          <span>{startDate}</span>
          <span>{Math.round(percentSpent)}%</span>
          <span>{endDate}</span>
        </div>
      )}
      {/* Amounts row with left/center/right layout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#232946', marginTop: 4, marginBottom: 0 }}>
        <span style={{ flex: 1, textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ color: '#3b6ea5', fontWeight: 500 }}>
            Spent: {isLoading ? (
              <span style={{ fontWeight: 700, color: '#999' }}>Loading...</span>
            ) : (
              <span style={{ fontWeight: 700, color: '#232946' }}>€{spent.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            )}
          </span>
        </span>
        <span style={{ flex: 1, textAlign: 'center', fontWeight: 700, color: '#232946' }}>
          {isLoading ? '...' : `${Math.round(percentSpent)}%`}
        </span>
        <span style={{ flex: 1, textAlign: 'right' }}>
          <span style={{ fontWeight: 700 }}>€{limit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          <span style={{ color: '#3b6ea5', fontWeight: 500 }}> Budgeted</span>
          {hasBudgetFlexibility && (
            <span style={{ 
              marginLeft: 4, 
              fontSize: 11, 
              color: '#3b6ea5',
              background: '#e8eefd',
              padding: '1px 4px',
              borderRadius: 3,
              fontWeight: 500
            }}>
              Flexible
            </span>
          )}
        </span>
      </div>
    </div>
  );
};

export default BudgetProgressBar; 