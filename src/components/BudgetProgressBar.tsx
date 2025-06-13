import styles from '../styles/BudgetDetail.module.css';

interface BudgetProgressBarProps {
  name: string;
  spent: number;
  limit: number;
  startDate: string;
  endDate: string;
  isOverall?: boolean;
  hidePercentLabel?: boolean;
  isCategory?: boolean;
  overallBudgetStatus?: {
    isOver: boolean;
    totalSpent: number;
    totalLimit: number;
  };
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
  overallBudgetStatus 
}) => {
  const today = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  const daysElapsed = Math.min(Math.max((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24), 0), totalDays);
  const percentSpent = Math.min((spent / limit) * 100, 100);
  const percentTime = Math.min((daysElapsed / totalDays) * 100, 100);

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
      <div className={styles.progressBarContainer} style={{ ...(isOverall ? { height: '24px' } : {}), marginBottom: hidePercentLabel ? 0 : undefined, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            left: `calc(${percentTime}% - 22px)`,
            top: -18,
            fontSize: 11,
            color: '#ffb800',
            background: '#fffbe6',
            borderRadius: 4,
            padding: '0 4px',
            fontWeight: 600,
            zIndex: 3,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 1px 4px #ffb80022',
          }}
        >
          {today.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }).toUpperCase()}
        </div>
        <div className={styles.progressBarBg}>
          <div
            className={styles.progressBarFill}
            style={{
              width: `${percentSpent}%`,
              background: isOverall
                ? 'linear-gradient(90deg, #1a4d2e 60%, #3b6ea5 100%)'
                : hasBudgetFlexibility
                ? 'linear-gradient(90deg, #3b6ea5 60%, #232946 100%)'
                : undefined,
              height: isOverall ? '100%' : undefined,
            }}
          />
          <div className={styles.todayMarker} style={{ left: `${percentTime}%`, height: isOverall ? '32px' : undefined, top: isOverall ? '-6px' : undefined }} />
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
        <span style={{ flex: 1, textAlign: 'left' }}>
          <span style={{ color: '#3b6ea5', fontWeight: 500 }}>Spent:</span> 
          <span style={{ fontWeight: 700 }}>€{spent.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </span>
        <span style={{ flex: 1, textAlign: 'center', fontWeight: 700, color: '#232946' }}>{Math.round(percentSpent)}%</span>
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