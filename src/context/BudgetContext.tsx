import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BudgetSettings, ResourceLedgerState } from '../types';
import { INITIAL_LEDGER } from '../data/mockData';

interface BudgetContextType {
  totalBudget: number;
  totalCrewHours: number;
  allocatedBudget: number;
  allocatedCrewHours: number;
  remainingBudget: number;
  remainingCrewHours: number;
  cycleStartDate: string;
  cycleEndDate: string;
  cycleName: string;
  cycleDaysRemaining: number;
  budgetSettings: BudgetSettings;
  updateBudgetSettings: (settings: Partial<BudgetSettings>) => Promise<void>;
  updateAllocatedTotals: (budget: number, crewHours: number) => void;
  availableEquipment: ResourceLedgerState['availableEquipment'];
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

const STORAGE_KEY = 'kpg_budget_settings';

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Budget limits & cycle configuration state
  const [totalBudget, setTotalBudget] = useState<number>(INITIAL_LEDGER.totalBudgetInr);
  const [totalCrewHours, setTotalCrewHours] = useState<number>(INITIAL_LEDGER.totalCrewHours);
  const [cycleStartDate, setCycleStartDate] = useState<string>('2026-08-15');
  const [cycleEndDate, setCycleEndDate] = useState<string>('2026-08-31');
  const [cycleName, setCycleName] = useState<string>(INITIAL_LEDGER.cycleName);
  const [cycleDaysRemaining, setCycleDaysRemaining] = useState<number>(INITIAL_LEDGER.cycleDaysRemaining);

  // Dynamic commitments (derived from actioned issues)
  const [allocatedBudget, setAllocatedBudget] = useState<number>(0);
  const [allocatedCrewHours, setAllocatedCrewHours] = useState<number>(0);

  // Machinery fleet inventory
  const [availableEquipment] = useState<ResourceLedgerState['availableEquipment']>(INITIAL_LEDGER.availableEquipment);

  // Load persisted budget settings if any
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.totalBudget) setTotalBudget(parsed.totalBudget);
        if (parsed.totalCrewHours) setTotalCrewHours(parsed.totalCrewHours);
        if (parsed.cycleStartDate) setCycleStartDate(parsed.cycleStartDate);
        if (parsed.cycleEndDate) setCycleEndDate(parsed.cycleEndDate);
        if (parsed.cycleName) setCycleName(parsed.cycleName);
      }
    } catch {
      // ignore
    }
  }, []);

  // Update budget settings function (used by Admin Dashboard)
  const updateBudgetSettings = useCallback(async (settings: Partial<BudgetSettings>) => {
    // =========================================================================
    // [EXPRESS BACKEND INTEGRATION POINT]
    // In production with an Express backend, this would make an API PUT call:
    //
    // try {
    //   const response = await fetch('/api/budget', {
    //     method: 'PUT',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(settings)
    //   });
    //   const data = await response.json();
    //   if (!response.ok) throw new Error(data.message);
    // } catch (err) {
    //   console.error('Failed to sync budget to Express server:', err);
    // }
    // =========================================================================

    if (settings.totalBudget !== undefined) setTotalBudget(settings.totalBudget);
    if (settings.totalCrewHours !== undefined) setTotalCrewHours(settings.totalCrewHours);
    if (settings.cycleStartDate) setCycleStartDate(settings.cycleStartDate);
    if (settings.cycleEndDate) setCycleEndDate(settings.cycleEndDate);
    if (settings.cycleName) setCycleName(settings.cycleName);

    try {
      setTotalBudget(prevBudget => {
        setTotalCrewHours(prevCrew => {
          const current = {
            totalBudget: settings.totalBudget ?? prevBudget,
            totalCrewHours: settings.totalCrewHours ?? prevCrew,
            cycleStartDate: settings.cycleStartDate ?? cycleStartDate,
            cycleEndDate: settings.cycleEndDate ?? cycleEndDate,
            cycleName: settings.cycleName ?? cycleName
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
          return prevCrew;
        });
        return prevBudget;
      });
    } catch {
      // ignore
    }
  }, [cycleStartDate, cycleEndDate, cycleName]);

  const updateAllocatedTotals = useCallback((budget: number, crewHours: number) => {
    // =========================================================================
    // [EXPRESS BACKEND INTEGRATION POINT]
    // In production, when issues are scheduled/actioned, this can be synced via:
    // POST /api/budget/allocate { allocatedBudget: budget, allocatedCrewHours: crewHours }
    // =========================================================================
    setAllocatedBudget(budget);
    setAllocatedCrewHours(crewHours);
  }, []);

  const remainingBudget = totalBudget - allocatedBudget;
  const remainingCrewHours = totalCrewHours - allocatedCrewHours;

  const budgetSettings: BudgetSettings = {
    totalBudget,
    totalCrewHours,
    cycleStartDate,
    cycleEndDate,
    cycleName
  };

  return (
    <BudgetContext.Provider
      value={{
        totalBudget,
        totalCrewHours,
        allocatedBudget,
        allocatedCrewHours,
        remainingBudget,
        remainingCrewHours,
        cycleStartDate,
        cycleEndDate,
        cycleName,
        cycleDaysRemaining,
        budgetSettings,
        updateBudgetSettings,
        updateAllocatedTotals,
        availableEquipment
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
};

export const useBudget = (): BudgetContextType => {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
};
