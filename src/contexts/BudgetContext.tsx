import React, { createContext, useContext, useState } from 'react';

interface Budget {
  id: string;
  name: string;
  amount: number;
  monthlyLimit?: number;
}

interface BudgetContextType {
  budgets: Budget[];
  setBudgets: React.Dispatch<React.SetStateAction<Budget[]>>;
}

const BudgetContext = createContext<BudgetContextType>({
  budgets: [],
  setBudgets: () => {}
});

export const useBudgets = () => useContext(BudgetContext);

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);

  return (
    <BudgetContext.Provider value={{ budgets, setBudgets }}>
      {children}
    </BudgetContext.Provider>
  );
}; 