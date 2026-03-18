"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import {
  formatMonthKey,
  getPrevMonthKey,
  getNextMonthKey,
  getCurrentMonthKey,
  formatCurrency,
} from "@/lib/paisa-utils"
import { CATEGORY_INFO, GOAL_INFO, ROLE_INFO, calculateAge } from "@/lib/paisa-types"
import type { ExpenseCategory, GoalType, FamilyRole } from "@/lib/paisa-types"
import { createClient } from "@/lib/supabase/client"

// Database types
interface Profile {
  id: string
  name: string
  role: string
  monthly_income: number
  avatar_url?: string
  date_of_birth?: string
  created_at?: string
}

interface Household {
  id: string
  name: string
  invite_code: string
}

interface Settings {
  needs_percent: number
  wants_percent: number
  savings_percent: number
}

interface Category {
  id: string
  name: string
  icon: string
  budget_type: string
  budgeted_amount: number
}

interface Expense {
  id: string
  category_name: string
  amount: number
  description?: string
  expense_date: string
  user_id: string
}

interface Goal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  icon?: string
}

interface Investment {
  id: string
  type: string
  name: string
  monthly_sip: number
  current_value: number
  expected_return?: number
  investment_date: string
}

interface DetectedExpense {
  id: string
  household_id: string
  user_id: string
  amount: string
  merchant: string | null
  category: string | null
  raw_sms: string
  status: "pending" | "confirmed" | "ignored"
  transaction_date: string | null
  created_at: string
}

interface IncomeHistory {
  id: string
  household_id: string
  user_id: string
  amount: number
  type: "increment" | "bonus" | "other"
  effective_date: string
  note: string | null
  created_at: string
}

interface DashboardDbProps {
  profile: Profile | null
  household: Household | null
  settings: Settings | null
  categories: Category[]
  expenses: Expense[]
  goals: Goal[]
  investments: Investment[]
  detectedExpenses: DetectedExpense[]
  incomeHistory: IncomeHistory[]
  householdMembers: Profile[]
  onUpdateSettings: (settings: Partial<Settings>) => Promise<void>
  onUpdateCategory: (id: string, amount: number) => Promise<void>
  onAddExpense: (expense: { category_name: string; amount: number; description?: string }) => Promise<void>
  onDeleteExpense: (id: string) => Promise<void>
  onUpdateExpense: (id: string, updates: Partial<Expense>) => Promise<void>
  onUpdateGoal: (id: string, updates: Partial<Goal>) => Promise<void>
  onDeleteGoal: (id: string) => Promise<void>
  onAddGoal: (goal: Omit<Goal, "id">) => Promise<void>
  onUpdateInvestment: (id: string, updates: Partial<Investment>) => Promise<void>
  onAddInvestment: (investment: Omit<Investment, "id">) => Promise<void>
  onDeleteInvestment: (id: string) => Promise<void>
  onConfirmDetectedExpense: (id: string) => Promise<void>
  onIgnoreDetectedExpense: (id: string) => Promise<void>
  onDeleteDetectedExpense: (id: string) => Promise<void>
  onClearAllDetectedExpenses: () => Promise<void>
  onAddIncomeEntry: (entry: { amount: number; type: "increment" | "bonus" | "other"; effective_date: string; note?: string }) => Promise<void>
  onUpdateIncomeEntry: (id: string, updates: Partial<IncomeHistory>) => Promise<void>
  onDeleteIncomeEntry: (id: string) => Promise<void>
  onDeleteAccount: () => Promise<void>
  onRefetch: () => void
}

// Main bottom navigation tabs (most used)
const MAIN_TABS = [
  { id: "overview", label: "Home", icon: "home" },
  { id: "expenses", label: "Expenses", icon: "wallet" },
  { id: "budget", label: "Budget", icon: "piechart" },
  { id: "invest", label: "Investments", icon: "trending" },
  { id: "more", label: "More", icon: "menu" },
] as const

// Additional tabs shown in "More" menu
const MORE_TABS = [
  { id: "history", label: "Financial Report", icon: "chart" },
  { id: "goals", label: "Goals", icon: "target" },
  { id: "projections", label: "Projections", icon: "chart" },
  { id: "family", label: "Family", icon: "users" },
  { id: "profile", label: "Profile", icon: "user" },
] as const

// Tab icon component
function TabIcon({ icon, className }: { icon: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    home: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    wallet: <><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4z" /></>,
    piechart: <><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></>,
    trending: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>,
    menu: <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
    chart: <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[icon]}
    </svg>
  )
}

export function DashboardDb({
  profile,
  household,
  settings,
  categories,
  expenses,
  goals,
  investments,
  detectedExpenses,
  incomeHistory,
  householdMembers,
  onUpdateSettings,
  onUpdateCategory,
  onAddExpense,
  onDeleteExpense,
  onUpdateExpense,
  onUpdateGoal,
  onDeleteGoal,
  onAddGoal,
  onUpdateInvestment,
  onAddInvestment,
  onDeleteInvestment,
  onConfirmDetectedExpense,
  onIgnoreDetectedExpense,
  onDeleteDetectedExpense,
  onClearAllDetectedExpenses,
  onAddIncomeEntry,
  onUpdateIncomeEntry,
  onDeleteIncomeEntry,
  onDeleteAccount,
  onRefetch,
}: DashboardDbProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonthKey())
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  
  // Check if current tab is in "more" menu
  const isMoreTab = MORE_TABS.some(t => t.id === activeTab)

  const currentMonthKey = getCurrentMonthKey()
  const showMonthNav = ["overview", "budget", "expenses", "invest"].includes(activeTab)
  
  // Get user join month to restrict navigation
  const userJoinMonthKey = useMemo(() => {
    console.log("[v0] profile?.created_at:", profile?.created_at)
    if (profile?.created_at) {
      const date = new Date(profile.created_at)
      const joinMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      console.log("[v0] userJoinMonthKey calculated:", joinMonth)
      return joinMonth
    }
    console.log("[v0] No profile.created_at, using currentMonthKey:", currentMonthKey)
    return currentMonthKey // Fallback to current month if no profile
  }, [profile, currentMonthKey])

  // Filter expenses for current month
  const currentMonthExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const expenseMonth = e.expense_date.substring(0, 7)
      return expenseMonth === currentMonth
    })
  }, [expenses, currentMonth])

  // Calculate totals
  const totalIncome = useMemo(() => {
    return householdMembers.reduce((sum, m) => sum + (m.monthly_income || 0), 0)
  }, [householdMembers])

  const totalSpent = useMemo(() => {
    return currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0)
  }, [currentMonthExpenses])

  const totalBudgeted = useMemo(() => {
    return categories.reduce((sum, c) => sum + c.budgeted_amount, 0)
  }, [categories])

  // Calculate spending by category
  const spendingByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    currentMonthExpenses.forEach((e) => {
      map[e.category_name] = (map[e.category_name] || 0) + e.amount
    })
    return map
  }, [currentMonthExpenses])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/auth/login"
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-[520px] mx-auto">
      {/* Header - Modern Gradient */}
      <header className="sticky top-0 z-20 glass-card">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-foreground text-lg tracking-tight">Money Planner</h1>
              <p className="text-xs text-muted-foreground">Hi, {profile?.name?.split(" ")[0]}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInviteModal(true)}
              className="w-10 h-10 rounded-xl border border-border bg-card/80 text-muted-foreground hover:text-foreground hover:bg-card transition-all duration-200 flex items-center justify-center"
              title="Invite"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </button>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="h-10 px-4 rounded-xl font-semibold text-sm gradient-primary text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              + Add
            </button>
          </div>
        </div>

        {/* Month Navigator - Refined */}
        {showMonthNav && (
          <div className="px-4 py-3 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentMonth(getPrevMonthKey(currentMonth))}
              disabled={currentMonth <= userJoinMonthKey}
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
                currentMonth <= userJoinMonthKey
                  ? "opacity-30 cursor-not-allowed bg-muted/30"
                  : "bg-muted/60 hover:bg-muted active:scale-95"
              )}
            >
              <ChevronLeftIcon className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="text-center min-w-[160px] py-1.5 px-4 rounded-xl bg-muted/40">
              <p className="font-semibold text-foreground">{formatMonthKey(currentMonth)}</p>
              {currentMonth === currentMonthKey && (
                <p className="text-[10px] text-primary font-medium uppercase tracking-wide">Current</p>
              )}
            </div>
            <button
              onClick={() => setCurrentMonth(getNextMonthKey(currentMonth))}
              disabled={currentMonth === currentMonthKey}
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
                currentMonth === currentMonthKey 
                  ? "opacity-30 cursor-not-allowed bg-muted/30" 
                  : "bg-muted/60 hover:bg-muted active:scale-95"
              )}
            >
              <ChevronRightIcon className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        )}

      </header>

      {/* Tab Content */}
      <main className="flex-1 p-4 pb-24 animate-fade-in">
        {activeTab === "overview" && (
          <OverviewTabDb
            totalIncome={totalIncome}
            totalSpent={totalSpent}
            totalBudgeted={totalBudgeted}
            settings={settings}
            spendingByCategory={spendingByCategory}
            categories={categories}
            expenses={expenses}
            investments={investments}
            detectedExpenses={detectedExpenses}
            onUpdateSettings={onUpdateSettings}
            onConfirmDetectedExpense={onConfirmDetectedExpense}
            onIgnoreDetectedExpense={onIgnoreDetectedExpense}
            onClearAllDetectedExpenses={onClearAllDetectedExpenses}
            onAddExpense={onAddExpense}
          />
        )}
        {activeTab === "budget" && (
          <BudgetTabDb
            categories={categories}
            spendingByCategory={spendingByCategory}
            onUpdateCategory={onUpdateCategory}
          />
        )}
        {activeTab === "expenses" && (
          <ExpensesTabDb
            expenses={currentMonthExpenses}
            householdMembers={householdMembers}
            onDeleteExpense={onDeleteExpense}
            onUpdateExpense={onUpdateExpense}
          />
        )}
        {activeTab === "history" && (
          <HistoryTabDb 
            expenses={expenses} 
            investments={investments}
            categories={categories}
            householdMembers={householdMembers}
            incomeHistory={incomeHistory}
            profile={profile}
          />
        )}
        {activeTab === "goals" && (
          <GoalsTabDb 
            goals={goals} 
            totalIncome={totalIncome} 
            onUpdateGoal={onUpdateGoal}
            onDeleteGoal={onDeleteGoal}
            onAddGoal={onAddGoal}
          />
        )}
        {activeTab === "invest" && (
        <InvestTabDb
            investments={investments}
            totalIncome={totalIncome}
            currentMonth={currentMonth}
            onUpdateInvestment={onUpdateInvestment}
            onAddInvestment={onAddInvestment}
            onDeleteInvestment={onDeleteInvestment}
          />
        )}
        {activeTab === "projections" && (
          <ProjectionsTabDb investments={investments} totalIncome={totalIncome} totalSpent={totalSpent} />
        )}
        {activeTab === "family" && (
          <FamilyTabDb
            household={household}
            householdMembers={householdMembers}
            totalIncome={totalIncome}
            totalSpent={totalSpent}
            incomeHistory={incomeHistory}
            profile={profile}
            onAddIncomeEntry={onAddIncomeEntry}
            onDeleteIncomeEntry={onDeleteIncomeEntry}
            onLogout={handleLogout}
          />
        )}

        {activeTab === "profile" && (
          <ProfileTabDb profile={profile} onLogout={handleLogout} onDeleteAccount={onDeleteAccount} />
        )}
      </main>

      {/* Expense Modal */}
      {showExpenseModal && (
        <ExpenseModalDb
          categories={categories}
          onAdd={async (expense) => {
            await onAddExpense(expense)
            setShowExpenseModal(false)
          }}
          onClose={() => setShowExpenseModal(false)}
        />
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModalDb inviteCode={household?.invite_code || ""} onClose={() => setShowInviteModal(false)} />
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 max-w-[520px] mx-auto">
        <div className="glass-card border-t border-border/50 px-2 pb-safe">
          <div className="flex items-center justify-around py-2">
            {MAIN_TABS.map((tab) => {
              const isActive = tab.id === "more" ? isMoreTab : activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === "more") {
                      setShowMoreMenu(true)
                    } else {
                      setActiveTab(tab.id)
                      setShowMoreMenu(false)
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[60px]",
                    isActive 
                      ? "text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-xl transition-all duration-200",
                    isActive && "bg-primary/10"
                  )}>
                    <TabIcon icon={tab.icon} className="w-5 h-5" />
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium",
                    isActive && "font-semibold"
                  )}>
                    {tab.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* More Menu Overlay */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-40 flex items-end justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" 
            onClick={() => setShowMoreMenu(false)} 
          />
          <div className="relative w-full max-w-[520px] bg-card rounded-t-3xl p-5 pb-8 animate-slide-up shadow-2xl">
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-bold text-foreground mb-4">More</h2>
            <div className="grid grid-cols-3 gap-3">
              {MORE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    setShowMoreMenu(false)
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all active:scale-95",
                    activeTab === tab.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <div className={cn(
                    "p-2.5 rounded-xl",
                    activeTab === tab.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <TabIcon icon={tab.icon} className="w-5 h-5" />
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    activeTab === tab.id ? "text-primary" : "text-foreground"
                  )}>
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Pending SMS Expenses Widget
function PendingExpensesWidget({
  detectedExpenses,
  onConfirm,
  onIgnore,
  onClearAll,
}: {
  detectedExpenses: DetectedExpense[]
  onConfirm: (expense: { id: string; category: string; merchant: string; amount: number; note: string }) => Promise<void>
  onIgnore: (id: string) => Promise<void>
  onClearAll: () => Promise<void>
}) {
  const [selectedExpense, setSelectedExpense] = useState<DetectedExpense | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearingAll, setClearingAll] = useState(false)

  const handleClearAll = async () => {
    setClearingAll(true)
    await onClearAll()
    setClearingAll(false)
    setShowClearConfirm(false)
  }

  return (
    <>
      <div className="card-elevated p-4 border-2 border-[var(--app-amber)]/30 bg-gradient-to-br from-[var(--app-amber)]/5 to-transparent">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--app-amber)]/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-[var(--app-amber)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Pending Review</h3>
              <p className="text-xs text-muted-foreground">{detectedExpenses.length} expense{detectedExpenses.length > 1 ? 's' : ''} detected from SMS</p>
            </div>
          </div>
          {detectedExpenses.length > 1 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-xs font-medium text-destructive hover:text-destructive/80 transition-colors px-2 py-1 rounded-lg hover:bg-destructive/10"
            >
              Clear All
            </button>
          )}
        </div>
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {detectedExpenses.map((expense) => {
            const categoryInfo = CATEGORY_INFO[expense.category?.toLowerCase() as ExpenseCategory]
            return (
              <button
                key={expense.id}
                onClick={() => setSelectedExpense(expense)}
                disabled={processingId !== null}
                className={cn(
                  "w-full p-3 rounded-xl bg-card border border-border flex items-center gap-3 text-left transition-all hover:border-primary/50 hover:shadow-sm active:scale-[0.98]",
                  processingId === expense.id && "opacity-50"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg">
                  {categoryInfo?.icon || "📦"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">Rs. {expense.amount}</span>
                    {expense.category && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {expense.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{expense.merchant || 'Unknown merchant'}</p>
                  {expense.transaction_date && (
                    <p className="text-[10px] text-muted-foreground/70">{new Date(expense.transaction_date).toLocaleDateString()}</p>
                  )}
                </div>
                <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )
          })}
        </div>
      </div>

      {/* Clear All Confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm mx-4 p-6 rounded-2xl bg-card border border-border shadow-2xl animate-slide-up">
            <h3 className="text-lg font-bold text-foreground mb-2">Clear All Pending?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will remove all {detectedExpenses.length} detected expenses. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={clearingAll}
                className="flex-1 py-2.5 px-4 rounded-xl border-2 border-border bg-card text-foreground font-semibold hover:bg-muted active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                disabled={clearingAll}
                className="flex-1 py-2.5 px-4 rounded-xl bg-destructive text-white font-semibold hover:bg-destructive/90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {clearingAll ? "Clearing..." : "Clear All"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Detected Expense Modal */}
      {selectedExpense && (
        <DetectedExpenseModal
          expense={selectedExpense}
          onConfirm={async (data) => {
            setProcessingId(selectedExpense.id)
            await onConfirm({ id: selectedExpense.id, ...data })
            setProcessingId(null)
            setSelectedExpense(null)
          }}
          onReject={async () => {
            setProcessingId(selectedExpense.id)
            await onIgnore(selectedExpense.id)
            setProcessingId(null)
            setSelectedExpense(null)
          }}
          onClose={() => setSelectedExpense(null)}
        />
      )}
    </>
  )
}

// Detected Expense Edit Modal
function DetectedExpenseModal({
  expense,
  onConfirm,
  onReject,
  onClose,
}: {
  expense: DetectedExpense
  onConfirm: (data: { category: string; merchant: string; amount: number; note: string }) => Promise<void>
  onReject: () => Promise<void>
  onClose: () => void
}) {
  const [category, setCategory] = useState(expense.category || "Other")
  const [merchant, setMerchant] = useState(expense.merchant || "")
  const [amount, setAmount] = useState(expense.amount.replace(/,/g, ''))
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)

  const categories = Object.entries(CATEGORY_INFO)

  const handleConfirm = async () => {
    if (loading) return
    setLoading(true)
    await onConfirm({
      category,
      merchant,
      amount: parseInt(amount) || 0,
      note
    })
    setLoading(false)
  }

  const handleReject = async () => {
    if (loading) return
    setLoading(true)
    await onReject()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md p-6 rounded-t-3xl sm:rounded-2xl bg-card border border-border shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-5 sm:hidden" />
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-foreground">Review Expense</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <svg className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* SMS Preview */}
        <div className="p-3 rounded-xl bg-muted/50 border border-border mb-5">
          <p className="text-xs text-muted-foreground font-medium mb-1">Original SMS</p>
          <p className="text-xs text-foreground/80 leading-relaxed">{expense.raw_sms}</p>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">Rs.</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-input bg-background text-foreground font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setCategory(info.name)}
                  className={cn(
                    "p-2 rounded-xl flex flex-col items-center gap-1 transition-all text-center",
                    category === info.name || category?.toLowerCase() === key
                      ? "bg-primary/10 border-2 border-primary"
                      : "bg-muted border-2 border-transparent hover:border-muted-foreground/30"
                  )}
                >
                  <span className="text-lg">{info.icon}</span>
                  <span className="text-[10px] font-medium text-foreground leading-tight">{info.name.split('/')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Merchant */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Merchant / Description</label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="e.g., Swiggy, Amazon, etc."
              className="w-full px-4 py-3.5 rounded-xl border-2 border-input bg-background text-foreground font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            />
          </div>

          {/* Note */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note..."
              className="w-full px-4 py-3.5 rounded-xl border-2 border-input bg-background text-foreground font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            />
          </div>

          {/* Date Display */}
          {expense.transaction_date && (
            <div className="p-3 rounded-xl bg-muted/30 flex items-center gap-3">
              <svg className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="text-sm text-foreground">{new Date(expense.transaction_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleReject}
            disabled={loading}
            className="flex-1 py-3.5 px-4 rounded-xl border-2 border-destructive/30 text-destructive font-semibold hover:bg-destructive/10 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? "..." : "Reject"}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !amount}
            className={cn(
              "flex-1 py-3.5 px-4 rounded-xl font-semibold transition-all active:scale-[0.98]",
              amount && !loading
                ? "gradient-primary text-white shadow-lg shadow-primary/25 hover:shadow-primary/40"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {loading ? "Adding..." : "Add Expense"}
          </button>
        </div>
      </div>
    </div>
  )
}

// Overview Tab
function OverviewTabDb({
  totalIncome,
  totalSpent,
  totalBudgeted,
  settings,
  spendingByCategory,
  categories,
  expenses,
  investments,
  detectedExpenses,
  onUpdateSettings,
  onConfirmDetectedExpense,
  onIgnoreDetectedExpense,
  onClearAllDetectedExpenses,
  onAddExpense,
}: {
  totalIncome: number
  totalSpent: number
  totalBudgeted: number
  settings: Settings | null
  spendingByCategory: Record<string, number>
  categories: Category[]
  expenses: Expense[]
  investments: Investment[]
  detectedExpenses: DetectedExpense[]
  onUpdateSettings: (settings: Partial<Settings>) => Promise<void>
  onConfirmDetectedExpense: (id: string) => Promise<void>
  onIgnoreDetectedExpense: (id: string) => Promise<void>
  onClearAllDetectedExpenses: () => Promise<void>
  onAddExpense: (expense: { category_name: string; amount: number; description?: string }) => Promise<void>
}) {
  const [showBudgetSplitModal, setShowBudgetSplitModal] = useState(false)
  
  const remaining = totalIncome - totalSpent
  const needsBudget = totalIncome * ((settings?.needs_percent || 50) / 100)
  const wantsBudget = totalIncome * ((settings?.wants_percent || 30) / 100)
  const savingsBudget = totalIncome * ((settings?.savings_percent || 20) / 100)

  // Calculate actual spending by needs vs wants
  const { needsSpent, wantsSpent } = useMemo(() => {
    let needs = 0
    let wants = 0
    Object.entries(spendingByCategory).forEach(([cat, amount]) => {
      const info = CATEGORY_INFO[cat as ExpenseCategory]
      if (info?.type === 'need') {
        needs += amount
      } else {
        wants += amount
      }
    })
    return { needsSpent: needs, wantsSpent: wants }
  }, [spendingByCategory])

  // Top spending categories
  const topCategories = Object.entries(spendingByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  // Weekly spending data (last 7 days)
  const weeklySpendingData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const today = new Date()
    const data: { day: string; amount: number; date: string }[] = []
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayName = days[date.getDay()]
      
      const dayTotal = expenses
        .filter(e => e.expense_date === dateStr)
        .reduce((sum, e) => sum + e.amount, 0)
      
      data.push({ 
        day: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : dayName, 
        amount: dayTotal,
        date: dateStr
      })
    }
    return data
  }, [expenses])

  // Category spending for pie/donut visualization
  const categorySpendingData = useMemo(() => {
    return Object.entries(spendingByCategory)
      .map(([cat, amount]) => {
        const info = CATEGORY_INFO[cat as ExpenseCategory]
        return {
          name: info?.name || cat,
          value: amount,
          icon: info?.icon || '📦',
          type: info?.type || 'want'
        }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [spendingByCategory])

  // Total investments value - use current_value if set, otherwise estimate from monthly SIP
  const totalInvestments = useMemo(() => {
    const today = new Date()
    return investments.reduce((sum, inv) => {
      if (inv.current_value && inv.current_value > 0) {
        return sum + inv.current_value
      }
      // Estimate value based on monthly SIP and time if current_value not set
      const startDate = new Date(inv.investment_date)
      const monthsDiff = Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)))
      return sum + (inv.monthly_sip || 0) * monthsDiff
    }, 0)
  }, [investments])

  // Investment growth (current vs invested) - estimate invested from monthly SIP * months
  const investmentGrowth = useMemo(() => {
    const today = new Date()
    let totalInvested = 0
    let current = 0
    
    investments.forEach(inv => {
      current += inv.current_value || 0
      // Estimate invested amount based on monthly SIP and time
      const startDate = new Date(inv.investment_date)
      const monthsDiff = Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)))
      totalInvested += (inv.monthly_sip || 0) * monthsDiff
    })
    
    return { invested: totalInvested, current, growth: current - totalInvested }
  }, [investments])

  // Max value for the weekly chart scaling
  const maxWeeklySpend = Math.max(...weeklySpendingData.map(d => d.amount), 1)

  return (
    <div className="space-y-5">
      {/* Hero Summary Card */}
      <div className="card-elevated p-5 gradient-primary text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <p className="text-sm text-white/80 font-medium">Remaining Balance</p>
          <p className={cn("text-3xl font-bold mt-1", remaining < 0 && "text-red-200")}>
            {formatCurrency(remaining)}
          </p>
          <div className="flex items-center gap-4 mt-4">
            <div>
              <p className="text-xs text-white/60">Income</p>
              <p className="text-sm font-semibold">{formatCurrency(totalIncome, true)}</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <p className="text-xs text-white/60">Spent</p>
              <p className="text-sm font-semibold">{formatCurrency(totalSpent, true)}</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <p className="text-xs text-white/60">Budgeted</p>
              <p className="text-sm font-semibold">{formatCurrency(totalBudgeted, true)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending SMS Expenses */}
      {detectedExpenses.length > 0 && (
        <PendingExpensesWidget
          detectedExpenses={detectedExpenses}
          onConfirm={async (data) => {
            // Add the expense to the actual expenses with edited values
            await onAddExpense({
              category_name: data.category || "Other",
              amount: data.amount,
              description: data.note || data.merchant || "SMS detected expense"
            })
            // Mark as confirmed (will be removed from pending)
            await onConfirmDetectedExpense(data.id)
          }}
          onIgnore={onIgnoreDetectedExpense}
          onClearAll={onClearAllDetectedExpenses}
        />
      )}

      {/* Budget Split - Spending Breakdown */}
      <div className="card-elevated p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Spending Breakdown</h3>
          <button
            onClick={() => setShowBudgetSplitModal(true)}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Edit Split
          </button>
        </div>
        
        {/* Actual Spending Row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-[var(--app-blue)]/10 to-[var(--app-blue)]/5 border border-[var(--app-blue)]/15">
            <p className="text-[10px] text-[var(--app-blue)] font-semibold uppercase tracking-wide">Needs</p>
            <p className="text-base font-bold text-foreground mt-0.5">{formatCurrency(needsSpent, true)}</p>
            <p className="text-[10px] text-muted-foreground">of {formatCurrency(needsBudget, true)}</p>
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-br from-[var(--app-amber)]/10 to-[var(--app-amber)]/5 border border-[var(--app-amber)]/15">
            <p className="text-[10px] text-[var(--app-amber)] font-semibold uppercase tracking-wide">Wants</p>
            <p className="text-base font-bold text-foreground mt-0.5">{formatCurrency(wantsSpent, true)}</p>
            <p className="text-[10px] text-muted-foreground">of {formatCurrency(wantsBudget, true)}</p>
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-br from-[var(--app-green)]/10 to-[var(--app-green)]/5 border border-[var(--app-green)]/15">
            <p className="text-[10px] text-[var(--app-green)] font-semibold uppercase tracking-wide">Savings</p>
            <p className="text-base font-bold text-foreground mt-0.5">{formatCurrency(remaining > 0 ? remaining : 0, true)}</p>
            <p className="text-[10px] text-muted-foreground">of {formatCurrency(savingsBudget, true)}</p>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] w-12 text-[var(--app-blue)]">{settings?.needs_percent || 50}%</span>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full bg-[var(--app-blue)] rounded-full transition-all" 
                style={{ width: `${Math.min((needsSpent / needsBudget) * 100, 100)}%` }} 
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] w-12 text-[var(--app-amber)]">{settings?.wants_percent || 30}%</span>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full bg-[var(--app-amber)] rounded-full transition-all" 
                style={{ width: `${Math.min((wantsSpent / wantsBudget) * 100, 100)}%` }} 
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] w-12 text-[var(--app-green)]">{settings?.savings_percent || 20}%</span>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full bg-[var(--app-green)] rounded-full transition-all" 
                style={{ width: `${Math.min((remaining > 0 ? remaining : 0) / savingsBudget * 100, 100)}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* This Week's Spending Chart */}
      <div className="card-elevated p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">This Week</h3>
          <span className="text-xs text-muted-foreground">
            Total: {formatCurrency(weeklySpendingData.reduce((sum, d) => sum + d.amount, 0), true)}
          </span>
        </div>
        <div className="flex items-end justify-between gap-2">
          {weeklySpendingData.map((day, idx) => {
            const height = maxWeeklySpend > 0 ? (day.amount / maxWeeklySpend) * 100 : 0
            const barHeight = Math.max(height, 8)
            const isToday = idx === weeklySpendingData.length - 1
            return (
              <div key={day.date} className="flex flex-col items-center flex-1 gap-1.5">
                <span className="text-[10px] text-muted-foreground font-medium h-4">
                  {day.amount > 0 ? formatCurrency(day.amount, true) : '-'}
                </span>
                <div className="w-full h-24 flex items-end">
                  <div 
                    className={cn(
                      "w-full rounded-t-lg transition-all min-h-[4px]",
                      isToday ? "bg-gradient-to-t from-primary to-primary/70" : "bg-muted",
                      day.amount === 0 && "opacity-40"
                    )}
                    style={{ height: `${barHeight}%` }}
                  />
                </div>
                <span className={cn(
                  "text-[10px] font-medium",
                  isToday ? "text-primary" : "text-muted-foreground"
                )}>
                  {day.day}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Category Breakdown Visual */}
      {categorySpendingData.length > 0 && (
        <div className="card-elevated p-4">
          <h3 className="font-semibold text-foreground mb-4">Category Breakdown</h3>
          <div className="space-y-3">
            {categorySpendingData.map((cat, idx) => {
              const percentage = totalSpent > 0 ? (cat.value / totalSpent) * 100 : 0
              const colors = ['var(--app-purple)', 'var(--app-blue)', 'var(--app-green)', 'var(--app-amber)', 'var(--app-red)']
              const color = colors[idx % colors.length]
              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span className="text-sm font-medium text-foreground">{cat.name}</span>
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase",
                        cat.type === 'need' 
                          ? "bg-[var(--app-blue)]/10 text-[var(--app-blue)]" 
                          : "bg-[var(--app-amber)]/10 text-[var(--app-amber)]"
                      )}>
                        {cat.type}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(cat.value, true)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ width: `${percentage}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Investment Overview Widget */}
      {investments.length > 0 && (
        <div className="card-elevated p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Investments</h3>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[var(--app-green)]/10 text-[var(--app-green)]">
              {investments.length} Active
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalInvestments, true)}</p>
            </div>
            <div className="w-px h-12 bg-border" />
            <div className="flex-1 text-right">
              <p className="text-xs text-muted-foreground">Monthly SIP</p>
              <p className="text-lg font-semibold text-[var(--app-blue)]">
                {formatCurrency(investments.reduce((sum, inv) => sum + (inv.monthly_sip || 0), 0), true)}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {investments.slice(0, 4).map((inv) => {
              // Calculate display value - use current_value if set, otherwise estimate
              let displayValue = inv.current_value || 0
              if (displayValue === 0 && inv.monthly_sip) {
                const startDate = new Date(inv.investment_date)
                const monthsDiff = Math.max(1, Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)))
                displayValue = inv.monthly_sip * monthsDiff
              }
              return (
                <div key={inv.id} className="p-2 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground truncate">{inv.name}</p>
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(displayValue, true)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top Spending */}
      {topCategories.length > 0 && (
        <div className="card-elevated p-4">
          <h3 className="font-semibold text-foreground mb-3">Top Spending</h3>
          <div className="space-y-2">
            {topCategories.map(([category, amount]) => {
              const info = CATEGORY_INFO[category as ExpenseCategory]
              return (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{info?.icon || "📦"}</span>
                    <span className="text-sm text-foreground">{info?.name || category}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{formatCurrency(amount)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Budget Split Modal */}
      {showBudgetSplitModal && (
        <BudgetSplitModal
          settings={settings}
          onSave={async (newSettings) => {
            await onUpdateSettings(newSettings)
            setShowBudgetSplitModal(false)
          }}
          onClose={() => setShowBudgetSplitModal(false)}
        />
      )}
    </div>
  )
}

// Budget Split Modal
function BudgetSplitModal({
  settings,
  onSave,
  onClose,
}: {
  settings: Settings | null
  onSave: (settings: { needs_percent: number; wants_percent: number; savings_percent: number }) => Promise<void>
  onClose: () => void
}) {
  const [needs, setNeeds] = useState(settings?.needs_percent || 50)
  const [wants, setWants] = useState(settings?.wants_percent || 30)
  const [savings, setSavings] = useState(settings?.savings_percent || 20)
  const [loading, setLoading] = useState(false)

  const total = needs + wants + savings
  const isValid = total === 100

  const handleSave = async () => {
    if (!isValid || loading) return
    setLoading(true)
    console.log("[v0] BudgetSplitModal saving:", { needs_percent: needs, wants_percent: wants, savings_percent: savings })
    try {
      await onSave({ needs_percent: needs, wants_percent: wants, savings_percent: savings })
      console.log("[v0] BudgetSplitModal saved successfully")
    } catch (error) {
      console.error("[v0] BudgetSplitModal save error:", error)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md p-6 rounded-t-3xl sm:rounded-2xl bg-card border border-border shadow-2xl animate-slide-up">
        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-5 sm:hidden" />
        <h3 className="text-lg font-semibold text-foreground mb-4">Edit Budget Split</h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Needs</label>
              <span className="text-sm text-[var(--app-blue)]">{needs}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={needs}
              onChange={(e) => setNeeds(parseInt(e.target.value))}
              className="w-full accent-[var(--app-blue)]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Wants</label>
              <span className="text-sm text-[var(--app-amber)]">{wants}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={wants}
              onChange={(e) => setWants(parseInt(e.target.value))}
              className="w-full accent-[var(--app-amber)]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Savings/Invest</label>
              <span className="text-sm text-[var(--app-green)]">{savings}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={savings}
              onChange={(e) => setSavings(parseInt(e.target.value))}
              className="w-full accent-[var(--app-green)]"
            />
          </div>

          <div className={cn(
            "p-3 rounded-lg text-center text-sm",
            isValid ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"
          )}>
            Total: {total}% {isValid ? "(Valid)" : "(Must equal 100%)"}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || loading}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg font-medium transition-colors",
              isValid && !loading
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

// Budget Tab
function BudgetTabDb({
  categories,
  spendingByCategory,
  onUpdateCategory,
}: {
  categories: Category[]
  spendingByCategory: Record<string, number>
  onUpdateCategory: (id: string, amount: number) => Promise<void>
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  const handleSave = async (id: string) => {
    const amount = parseInt(editValue) || 0
    await onUpdateCategory(id, amount)
    setEditingId(null)
  }

  // Sort categories by spent amount (high to low)
  const sortedCategories = [...categories].sort((a, b) => {
    const spentA = spendingByCategory[a.name.toLowerCase()] || 0
    const spentB = spendingByCategory[b.name.toLowerCase()] || 0
    return spentB - spentA
  })

  return (
    <div className="space-y-3">
      {sortedCategories.map((cat) => {
        const spent = spendingByCategory[cat.name.toLowerCase()] || 0
        const percent = cat.budgeted_amount > 0 ? Math.min((spent / cat.budgeted_amount) * 100, 100) : 0
        const isOver = spent > cat.budgeted_amount && cat.budgeted_amount > 0
        const info = CATEGORY_INFO[cat.name.toLowerCase() as ExpenseCategory]

        return (
          <div key={cat.id} className="p-3 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span>{info?.icon || cat.icon || "📦"}</span>
                <span className="text-sm font-medium text-foreground">{info?.name || cat.name}</span>
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase",
                  info?.type === 'need' 
                    ? "bg-[var(--app-blue)]/10 text-[var(--app-blue)]" 
                    : "bg-[var(--app-amber)]/10 text-[var(--app-amber)]"
                )}>
                  {info?.type === 'need' ? 'Need' : 'Want'}
                </span>
              </div>
              {editingId === cat.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-24 px-2 py-1 text-sm rounded border border-input bg-background text-foreground"
                    autoFocus
                  />
                  <button onClick={() => handleSave(cat.id)} className="text-xs text-primary">
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingId(cat.id)
                    setEditValue(cat.budgeted_amount.toString())
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {formatCurrency(cat.budgeted_amount)}
                </button>
              )}
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", isOver ? "bg-[var(--app-red)]" : "bg-primary")}
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>Spent {formatCurrency(spent)}</span>
              <span className={isOver ? "text-[var(--app-red)]" : ""}>
                {isOver ? `Over by ${formatCurrency(spent - cat.budgeted_amount)}` : `Left ${formatCurrency(cat.budgeted_amount - spent)}`}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Expenses Tab
function ExpensesTabDb({
  expenses,
  householdMembers,
  onDeleteExpense,
  onUpdateExpense,
}: {
  expenses: Expense[]
  householdMembers: Profile[]
  onDeleteExpense: (id: string) => Promise<void>
  onUpdateExpense: (id: string, updates: Partial<Expense>) => Promise<void>
}) {
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  const getMemberName = (userId: string) => {
    const member = householdMembers.find((m) => m.id === userId)
    return member?.name || "Unknown"
  }

  const handleDelete = async (id: string) => {
    // Immediately mark as deleting for visual feedback
    setDeletingIds(prev => new Set(prev).add(id))
    try {
      await onDeleteExpense(id)
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No expenses this month</p>
        <p className="text-sm text-muted-foreground mt-1">Tap + Expense to add one</p>
      </div>
    )
  }

  // Filter out deleting expenses for immediate visual feedback
  const visibleExpenses = expenses.filter(e => !deletingIds.has(e.id))

  return (
    <>
      <div className="space-y-2">
        {visibleExpenses
          .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime())
          .map((expense) => {
            const info = CATEGORY_INFO[expense.category_name.toLowerCase() as ExpenseCategory]
            return (
              <div 
                key={expense.id} 
                className="p-3 rounded-xl bg-card border border-border flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => setEditingExpense(expense)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{info?.icon || "📦"}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{info?.name || expense.category_name}</p>
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase",
                        info?.type === 'need' 
                          ? "bg-[var(--app-blue)]/10 text-[var(--app-blue)]" 
                          : "bg-[var(--app-amber)]/10 text-[var(--app-amber)]"
                      )}>
                        {info?.type === 'need' ? 'Need' : 'Want'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {expense.description || getMemberName(expense.user_id)} • {expense.expense_date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">{formatCurrency(expense.amount)}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(expense.id)
                    }}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
      </div>

      {/* Edit Expense Modal */}
      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          onSave={async (updates) => {
            await onUpdateExpense(editingExpense.id, updates)
            setEditingExpense(null)
          }}
          onClose={() => setEditingExpense(null)}
        />
      )}
    </>
  )
}

// Edit Expense Modal
function EditExpenseModal({
  expense,
  onSave,
  onClose,
}: {
  expense: Expense
  onSave: (updates: Partial<Expense>) => Promise<void>
  onClose: () => void
}) {
  const [amount, setAmount] = useState(expense.amount.toString())
  const [categoryName, setCategoryName] = useState(expense.category_name.toLowerCase())
  const [description, setDescription] = useState(expense.description || "")
  const [expenseDate, setExpenseDate] = useState(expense.expense_date)
  const [loading, setLoading] = useState(false)

  const defaultCategories = [
    { id: "housing", icon: "🏠", name: "Housing" },
    { id: "groceries", icon: "🛒", name: "Groceries" },
    { id: "transport", icon: "🚌", name: "Transport" },
    { id: "utilities", icon: "⚡", name: "Utilities" },
    { id: "healthcare", icon: "🏥", name: "Healthcare" },
    { id: "education", icon: "📚", name: "Education" },
    { id: "entertainment", icon: "🎬", name: "Entertainment" },
    { id: "shopping", icon: "🛍", name: "Shopping" },
    { id: "dining", icon: "🍽", name: "Dining" },
    { id: "subscriptions", icon: "📱", name: "Subscriptions" },
    { id: "personal", icon: "💇", name: "Personal" },
    { id: "other", icon: "📦", name: "Other" },
  ]

  const canSubmit = amount && parseInt(amount) > 0 && categoryName

  const handleSubmit = async () => {
    if (!canSubmit || loading) return
    setLoading(true)
    await onSave({
      category_name: categoryName,
      amount: parseInt(amount),
      description: description || undefined,
      expense_date: expenseDate,
    })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md p-4 pb-5 rounded-t-3xl sm:rounded-2xl bg-card border border-border shadow-2xl animate-slide-up">
        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-3 sm:hidden" />
        <h2 className="text-base font-bold text-foreground mb-3">Edit Expense</h2>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rs.</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-input bg-background text-foreground text-lg font-bold focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Category</label>
            <div className="grid grid-cols-6 gap-1">
              {defaultCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryName(cat.id)}
                  className={cn(
                    "p-1.5 rounded-lg border-2 text-center transition-all active:scale-95",
                    categoryName === cat.id 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <span className="text-base">{cat.icon}</span>
                  <p className="text-[7px] font-medium text-foreground truncate">{cat.name}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Date</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border-2 border-input bg-background text-foreground text-xs focus:border-primary transition-all outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Note</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
                className="w-full px-2.5 py-2 rounded-lg border-2 border-input bg-background text-foreground text-xs focus:border-primary transition-all outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border-2 border-border bg-card text-foreground font-semibold hover:bg-muted active:scale-[0.98] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className={cn(
              "flex-1 py-2.5 rounded-xl font-semibold transition-all active:scale-[0.98]",
              canSubmit && !loading
                ? "gradient-primary text-white shadow-lg shadow-primary/25"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

// Financial Report Tab (formerly History)
function HistoryTabDb({ 
  expenses, 
  investments,
  categories,
  householdMembers,
  incomeHistory,
  profile,
}: { 
  expenses: Expense[]
  investments: Investment[]
  categories: Category[]
  householdMembers: Profile[]
  incomeHistory: IncomeHistory[]
  profile: Profile | null
}) {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  
  // Get user join date (start of tracking)
  const userJoinDate = useMemo(() => {
    if (profile?.created_at) {
      return new Date(profile.created_at)
    }
    return new Date()
  }, [profile])

  const userJoinMonthKey = useMemo(() => {
    const year = userJoinDate.getFullYear()
    const month = String(userJoinDate.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }, [userJoinDate])
  
  // Get available years from data (starting from join year)
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    const joinYear = userJoinDate.getFullYear()
    years.add(joinYear)
    years.add(currentYear)
    expenses.forEach(e => years.add(parseInt(e.expense_date.substring(0, 4))))
    investments.forEach(i => i.investment_date && years.add(parseInt(i.investment_date.substring(0, 4))))
    return Array.from(years).filter(y => y >= joinYear).sort((a, b) => b - a)
  }, [expenses, investments, currentYear, userJoinDate])

  // Base monthly income (sum of all household members)
  const baseMonthlyIncome = useMemo(() => 
    householdMembers.reduce((sum, m) => sum + (m.monthly_income || 0), 0),
    [householdMembers]
  )

  // Current total budgeted
  const totalBudgeted = useMemo(() => 
    categories.reduce((sum, c) => sum + c.budgeted_amount, 0),
    [categories]
  )

  // Helper function to calculate income for a specific month
  // Income = base salary + cumulative increments effective by that month + bonuses for that month
  const getIncomeForMonth = useMemo(() => {
    return (monthKey: string) => {
      const monthEnd = new Date(monthKey + '-28') // Approximate end of month
      
      // Cumulative increments: all increments with effective_date <= end of this month
      const cumulativeIncrements = incomeHistory
        .filter(entry => entry.type === 'increment' && entry.effective_date <= monthKey + '-31')
        .reduce((sum, entry) => sum + entry.amount, 0)
      
      // Bonuses: only bonuses in this specific month
      const monthBonuses = incomeHistory
        .filter(entry => entry.type === 'bonus' && entry.effective_date.startsWith(monthKey))
        .reduce((sum, entry) => sum + entry.amount, 0)
      
      // Other income for this month
      const otherIncome = incomeHistory
        .filter(entry => entry.type === 'other' && entry.effective_date.startsWith(monthKey))
        .reduce((sum, entry) => sum + entry.amount, 0)
      
      return baseMonthlyIncome + cumulativeIncrements + monthBonuses + otherIncome
    }
  }, [baseMonthlyIncome, incomeHistory])

  // Filter data for selected year
  const yearExpenses = useMemo(() => 
    expenses.filter(e => e.expense_date.startsWith(selectedYear.toString())),
    [expenses, selectedYear]
  )
  
  const yearInvestments = useMemo(() => 
    investments.filter(i => i.investment_date?.startsWith(selectedYear.toString())),
    [investments, selectedYear]
  )

  // Monthly breakdown with dynamic income calculation
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthKey = `${selectedYear}-${String(i + 1).padStart(2, '0')}`
      const monthExpenses = yearExpenses.filter(e => e.expense_date.startsWith(monthKey))
      const monthInvestments = yearInvestments.filter(inv => inv.investment_date?.startsWith(monthKey))
      const spent = monthExpenses.reduce((sum, e) => sum + e.amount, 0)
      const invested = monthInvestments.reduce((sum, inv) => sum + inv.monthly_sip, 0)
      
      // Check if this month is before user joined
      const isBeforeJoin = monthKey < userJoinMonthKey
      
      // Calculate income for this month (includes increments & bonuses)
      const income = isBeforeJoin ? 0 : getIncomeForMonth(monthKey)
      const budgeted = isBeforeJoin ? 0 : totalBudgeted
      
      return {
        month: monthKey,
        monthName: new Date(selectedYear, i).toLocaleString('default', { month: 'short' }),
        fullMonthName: new Date(selectedYear, i).toLocaleString('default', { month: 'long' }),
        income,
        budgeted,
        spent,
        invested,
        exceededBudget: spent > budgeted && budgeted > 0,
        isBeforeJoin,
      }
    })
    return months
  }, [selectedYear, yearExpenses, yearInvestments, getIncomeForMonth, totalBudgeted, userJoinMonthKey])

  // Year totals - sum of all monthly incomes (accounts for increments/bonuses)
  const yearTotals = useMemo(() => {
    const validMonths = monthlyData.filter(m => !m.isBeforeJoin)
    
    return {
      income: validMonths.reduce((sum, m) => sum + m.income, 0),
      budgeted: validMonths.reduce((sum, m) => sum + m.budgeted, 0),
      spent: yearExpenses.reduce((sum, e) => sum + e.amount, 0),
      invested: yearInvestments.reduce((sum, i) => sum + i.monthly_sip, 0),
    }
  }, [monthlyData, yearExpenses, yearInvestments])

  // Max value for chart scaling
  const maxChartValue = Math.max(
    ...monthlyData.map(m => Math.max(m.income, m.budgeted, m.spent, m.invested)),
    1
  )

  return (
    <div className="space-y-4">
      {/* Year Selector */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-lg">Financial Report</h3>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {availableYears.slice(0, 3).map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                selectedYear === year 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Year Summary - 4 Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground mb-1">Total Income</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(yearTotals.income)}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground mb-1">Total Budgeted</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(yearTotals.budgeted)}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
          <p className={cn(
            "text-xl font-bold",
            yearTotals.spent > yearTotals.budgeted ? "text-destructive" : "text-foreground"
          )}>
            {formatCurrency(yearTotals.spent)}
          </p>
          {yearTotals.spent > yearTotals.budgeted && (
            <p className="text-[10px] text-destructive">Exceeded budget</p>
          )}
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground mb-1">Total Invested</p>
          <p className="text-xl font-bold text-[var(--app-green)]">{formatCurrency(yearTotals.invested)}</p>
        </div>
      </div>

      {/* Monthly Breakdown Chart - 4 bars per month */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <h4 className="text-sm font-medium text-foreground mb-4">Monthly Overview</h4>
        <div className="flex gap-1 overflow-x-auto pb-2">
          {monthlyData.map((month) => (
            <div key={month.month} className="flex-1 min-w-[40px] flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center gap-[2px] h-28">
                {/* Income bar */}
                <div 
                  className="w-2 bg-[var(--app-blue)]/60 rounded-t-sm transition-all" 
                  style={{ height: `${(month.income / maxChartValue) * 100}%`, minHeight: '2px' }}
                  title={`Income: ${formatCurrency(month.income)}`}
                />
                {/* Budgeted bar */}
                <div 
                  className="w-2 bg-muted-foreground/40 rounded-t-sm transition-all" 
                  style={{ height: `${(month.budgeted / maxChartValue) * 100}%`, minHeight: '2px' }}
                  title={`Budgeted: ${formatCurrency(month.budgeted)}`}
                />
                {/* Spent bar */}
                <div 
                  className={cn(
                    "w-2 rounded-t-sm transition-all",
                    month.exceededBudget ? "bg-destructive" : "bg-[var(--app-amber)]"
                  )}
                  style={{ height: `${(month.spent / maxChartValue) * 100}%`, minHeight: month.spent > 0 ? '2px' : '0' }}
                  title={`Spent: ${formatCurrency(month.spent)}`}
                />
                {/* Invested bar */}
                <div 
                  className="w-2 bg-[var(--app-green)] rounded-t-sm transition-all" 
                  style={{ height: `${(month.invested / maxChartValue) * 100}%`, minHeight: month.invested > 0 ? '2px' : '0' }}
                  title={`Invested: ${formatCurrency(month.invested)}`}
                />
              </div>
              <span className="text-[9px] text-muted-foreground font-medium">{month.monthName}</span>
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-[var(--app-blue)]/60" />
            <span className="text-[10px] text-muted-foreground">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-muted-foreground/40" />
            <span className="text-[10px] text-muted-foreground">Budgeted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-[var(--app-amber)]" />
            <span className="text-[10px] text-muted-foreground">Spent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-[var(--app-green)]" />
            <span className="text-[10px] text-muted-foreground">Invested</span>
          </div>
        </div>
      </div>

      {/* Monthly Details - 4 Metrics per month */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <h4 className="text-sm font-medium text-foreground mb-3">Monthly Details</h4>
        <div className="space-y-3">
          {monthlyData.filter(m => m.spent > 0 || m.invested > 0).reverse().map((month) => (
            <div key={month.month} className="p-3 rounded-xl bg-muted/30 border border-border">
              <p className="text-sm font-semibold text-foreground mb-2">{month.fullMonthName} {selectedYear}</p>
              <div className="grid grid-cols-2 gap-2">
                {/* Income */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Income</span>
                  <span className="text-sm font-medium text-foreground">{formatCurrency(month.income, true)}</span>
                </div>
                {/* Budgeted */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Budgeted</span>
                  <span className="text-sm font-medium text-foreground">{formatCurrency(month.budgeted, true)}</span>
                </div>
                {/* Spent */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Spent</span>
                  <span className={cn(
                    "text-sm font-medium",
                    month.exceededBudget ? "text-destructive" : "text-[var(--app-amber)]"
                  )}>
                    -{formatCurrency(month.spent, true)}
                  </span>
                </div>
                {/* Invested */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Invested</span>
                  <span className="text-sm font-medium text-[var(--app-green)]">+{formatCurrency(month.invested, true)}</span>
                </div>
              </div>
            </div>
          ))}
          {monthlyData.every(m => m.spent === 0 && m.invested === 0) && (
            <p className="text-muted-foreground text-center py-4">No data for {selectedYear}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Goals Tab
function GoalsTabDb({
  goals,
  totalIncome,
  onUpdateGoal,
  onDeleteGoal,
  onAddGoal,
}: {
  goals: Goal[]
  totalIncome: number
  onUpdateGoal: (id: string, updates: Partial<Goal>) => Promise<void>
  onDeleteGoal: (id: string) => Promise<void>
  onAddGoal: (goal: Omit<Goal, "id">) => Promise<void>
}) {
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [showAddGoalModal, setShowAddGoalModal] = useState(false)
  
  return (
    <div className="space-y-4">
      {/* Add Goal Button */}
      <button
        onClick={() => setShowAddGoalModal(true)}
        className="w-full py-3.5 px-4 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-all active:scale-[0.98]"
      >
        + Add Custom Goal
      </button>

      {goals.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No goals set up yet</p>
      ) : (
        goals.map((goal) => {
          const percent = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0
          const remaining = goal.target_amount - goal.current_amount
          const monthsToGoal = totalIncome > 0 ? Math.ceil(remaining / (totalIncome * 0.2)) : 0

          return (
            <div 
              key={goal.id} 
              className="card-elevated p-4 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setEditingGoal(goal)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{goal.icon || "🎯"}</span>
                  <span className="font-semibold text-foreground">{goal.name}</span>
                </div>
                <span className="text-sm font-medium text-primary">{percent.toFixed(0)}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden mb-2">
                <div 
                  className="h-full bg-gradient-to-r from-[var(--app-green)] to-[var(--app-blue)] rounded-full transition-all" 
                  style={{ width: `${percent}%` }} 
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                </span>
                {monthsToGoal > 0 && <span>~{monthsToGoal} months at 20% savings</span>}
              </div>
            </div>
          )
        })
      )}

      {/* Edit Goal Modal */}
      {editingGoal && (
        <GoalEditModal
          goal={editingGoal}
          onSave={async (updates) => {
            await onUpdateGoal(editingGoal.id, updates)
            setEditingGoal(null)
          }}
          onDelete={async () => {
            await onDeleteGoal(editingGoal.id)
            setEditingGoal(null)
          }}
          onClose={() => setEditingGoal(null)}
        />
      )}

      {/* Add Goal Modal */}
      {showAddGoalModal && (
        <AddGoalModal
          onSave={async (goal) => {
            await onAddGoal(goal)
            setShowAddGoalModal(false)
          }}
          onClose={() => setShowAddGoalModal(false)}
        />
      )}
    </div>
  )
}

// Goal Edit Modal
function GoalEditModal({
  goal,
  onSave,
  onDelete,
  onClose,
}: {
  goal: Goal
  onSave: (updates: { current_amount?: number; target_amount?: number }) => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
}) {
  const [currentAmount, setCurrentAmount] = useState(goal.current_amount.toString())
  const [targetAmount, setTargetAmount] = useState(goal.target_amount.toString())
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleSave = async () => {
    if (loading) return
    setLoading(true)
    await onSave({
      current_amount: parseInt(currentAmount) || 0,
      target_amount: parseInt(targetAmount) || 0,
    })
    setLoading(false)
  }

  const handleDelete = async () => {
    if (loading) return
    setLoading(true)
    await onDelete()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md p-6 rounded-t-3xl sm:rounded-2xl bg-card border border-border shadow-2xl animate-slide-up">
        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-5 sm:hidden" />
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-2xl">{goal.icon || "🎯"}</span>
            </div>
            <h3 className="text-xl font-bold text-foreground">{goal.name}</h3>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete goal"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
        
        {showDeleteConfirm ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive font-medium">Are you sure you want to delete this goal?</p>
              <p className="text-xs text-muted-foreground mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-border bg-card text-foreground font-semibold hover:bg-muted active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl bg-destructive text-white font-semibold hover:bg-destructive/90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Current Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">Rs.</span>
                  <input
                    type="number"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-input bg-background text-foreground font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Target Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">Rs.</span>
                  <input
                    type="number"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-input bg-background text-foreground font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/10">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Progress</span>
                  <span className="text-lg font-bold gradient-text">
                    {((parseInt(currentAmount) || 0) / (parseInt(targetAmount) || 1) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-border bg-card text-foreground font-semibold hover:bg-muted active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl gradient-primary text-white font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Add Goal Modal
function AddGoalModal({
  onSave,
  onClose,
}: {
  onSave: (goal: Omit<Goal, "id">) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [currentAmount, setCurrentAmount] = useState("0")
  const [selectedIcon, setSelectedIcon] = useState("🎯")
  const [loading, setLoading] = useState(false)

  const icons = ["🎯", "🏠", "🚗", "✈️", "📚", "💍", "🎓", "💰", "🏖️", "📱", "💻", "🎁"]

  const handleSave = async () => {
    if (!name || !targetAmount || loading) return
    setLoading(true)
    await onSave({
      name,
      target_amount: parseInt(targetAmount) || 0,
      current_amount: parseInt(currentAmount) || 0,
      icon: selectedIcon,
    })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md p-6 rounded-t-3xl sm:rounded-2xl bg-card border border-border shadow-2xl animate-slide-up">
        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-5 sm:hidden" />
        <h3 className="text-xl font-bold text-foreground mb-6">Add New Goal</h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Goal Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Emergency Fund, New Car..."
              className="w-full px-4 py-3.5 rounded-xl border-2 border-input bg-background text-foreground font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Icon</label>
            <div className="flex flex-wrap gap-2">
              {icons.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setSelectedIcon(icon)}
                  className={cn(
                    "w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all active:scale-95",
                    selectedIcon === icon
                      ? "bg-primary/10 border-2 border-primary"
                      : "bg-muted border-2 border-transparent hover:border-muted-foreground/30"
                  )}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Target Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">Rs.</span>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-input bg-background text-foreground font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Current Amount (optional)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">Rs.</span>
              <input
                type="number"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-input bg-background text-foreground font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border-2 border-border bg-card text-foreground font-semibold hover:bg-muted active:scale-[0.98] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name || !targetAmount || loading}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl font-semibold transition-all active:scale-[0.98]",
              name && targetAmount && !loading
                ? "gradient-primary text-white shadow-lg shadow-primary/25 hover:shadow-primary/40"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {loading ? "Adding..." : "Add Goal"}
          </button>
        </div>
      </div>
    </div>
  )
}

// Investment type mapping (database value -> display label)
const INVESTMENT_TYPES: { value: string; label: string; icon: string }[] = [
  { value: "mutual_funds", label: "Mutual Funds", icon: "📊" },
  { value: "stocks", label: "Stocks", icon: "📈" },
  { value: "etf", label: "ETF", icon: "🔄" },
  { value: "ppf", label: "PPF", icon: "🏛️" },
  { value: "fd", label: "FD", icon: "🏦" },
  { value: "gold", label: "Gold", icon: "🪙" },
  { value: "other", label: "Other", icon: "💼" },
]

// Invest Tab
function InvestTabDb({
  investments,
  totalIncome,
  currentMonth,
  onUpdateInvestment,
  onAddInvestment,
  onDeleteInvestment,
}: {
  investments: Investment[]
  totalIncome: number
  currentMonth: string
  onUpdateInvestment: (id: string, updates: Partial<Investment>) => Promise<void>
  onAddInvestment: (investment: Omit<Investment, "id">) => Promise<void>
  onDeleteInvestment: (id: string) => Promise<void>
}) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Filter investments for current month
  const currentMonthInvestments = useMemo(() => {
    return investments.filter((inv) => {
      if (!inv.investment_date) return false
      const investMonth = inv.investment_date.substring(0, 7)
      return investMonth === currentMonth
    })
  }, [investments, currentMonth])
  
  // Calculate totals for current month
  const monthlyTotal = currentMonthInvestments.reduce((sum, i) => sum + i.monthly_sip, 0)
  
  // Calculate all-time totals
  const totalValue = useMemo(() => {
    const today = new Date()
    return investments.reduce((sum, inv) => {
      if (inv.current_value && inv.current_value > 0) {
        return sum + inv.current_value
      }
      // Estimate value based on monthly SIP and time
      const startDate = new Date(inv.investment_date)
      const monthsDiff = Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)))
      return sum + (inv.monthly_sip || 0) * monthsDiff
    }, 0)
  }, [investments])

  // Calculate totals by investment type
  const totalsByType = useMemo(() => {
    const today = new Date()
    const totals: Record<string, number> = {}
    
    investments.forEach(inv => {
      let value = inv.current_value || 0
      if (value === 0 && inv.monthly_sip) {
        const startDate = new Date(inv.investment_date)
        const monthsDiff = Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)))
        value = inv.monthly_sip * monthsDiff
      }
      totals[inv.type] = (totals[inv.type] || 0) + value
    })
    
    return totals
  }, [investments])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingId(id)
    await onDeleteInvestment(id)
    setDeletingId(null)
  }

  return (
    <div className="space-y-4">
      {/* All Time Summary - Hero Card with Animation */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--app-green)] via-[var(--app-green)]/90 to-[var(--app-blue)] p-6 shadow-xl">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full animate-pulse" style={{ animationDuration: '3s' }} />
          <div className="absolute top-20 -left-10 w-32 h-32 bg-white/5 rounded-full animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }} />
          <div className="absolute -bottom-5 right-20 w-24 h-24 bg-white/10 rounded-full animate-pulse" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />
        </div>
        
        <div className="relative z-10">
          <p className="text-white/80 text-sm font-medium mb-1">Total Portfolio Value</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white tracking-tight">
              {formatCurrency(totalValue, true)}
            </span>
          </div>
          <p className="text-white/70 text-xs mt-2">{investments.length} investment{investments.length !== 1 ? 's' : ''} across {Object.keys(totalsByType).length} type{Object.keys(totalsByType).length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Investment Types Breakdown */}
      {Object.keys(totalsByType).length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {INVESTMENT_TYPES.filter(t => totalsByType[t.value] > 0).map((type) => (
            <div 
              key={type.value}
              className="p-3 rounded-xl bg-card border border-border text-center transition-all hover:border-primary/30 hover:shadow-sm"
            >
              <span className="text-xl">{type.icon}</span>
              <p className="text-[10px] text-muted-foreground font-medium mt-1 truncate">{type.label}</p>
              <p className="text-sm font-bold text-foreground">{formatCurrency(totalsByType[type.value], true)}</p>
            </div>
          ))}
        </div>
      )}

      {/* This Month's Investments */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
        <p className="text-sm text-muted-foreground">This Month&apos;s Investments</p>
        <p className="text-2xl font-semibold text-primary">{formatCurrency(monthlyTotal)}</p>
        <p className="text-xs text-muted-foreground mt-1">{currentMonthInvestments.length} investment(s) added</p>
      </div>

      {/* Add Investment Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        + Add Investment / SIP
      </button>

      {/* Investment list for current month */}
      {currentMonthInvestments.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No investments added this month</p>
      ) : (
        <div className="space-y-2">
          {currentMonthInvestments.map((inv) => {
            const typeInfo = INVESTMENT_TYPES.find(t => t.value === inv.type)
            return (
              <div 
                key={inv.id} 
                className={cn(
                  "p-3 rounded-xl bg-card border border-border cursor-pointer hover:border-primary/50 transition-all",
                  deletingId === inv.id && "opacity-50 pointer-events-none"
                )}
                onClick={() => setEditingInvestment(inv)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg">
                    {typeInfo?.icon || "💼"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{inv.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {typeInfo?.label || inv.type} • {inv.investment_date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(inv.monthly_sip)}</p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(inv.id, e)}
                    disabled={deletingId !== null}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete investment"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Investment Modal */}
      {showAddModal && (
        <InvestmentModal
          onSave={async (investment) => {
            await onAddInvestment(investment)
            setShowAddModal(false)
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Edit Investment Modal */}
      {editingInvestment && (
        <InvestmentModal
          investment={editingInvestment}
          onSave={async (updates) => {
            await onUpdateInvestment(editingInvestment.id, updates)
            setEditingInvestment(null)
          }}
          onClose={() => setEditingInvestment(null)}
        />
      )}
    </div>
  )
}

// Investment Modal (Add/Edit)
function InvestmentModal({
  investment,
  onSave,
  onClose,
}: {
  investment?: Investment
  onSave: (data: Omit<Investment, "id">) => Promise<void>
  onClose: () => void
}) {
  const [type, setType] = useState(investment?.type || "mutual_funds")
  const [name, setName] = useState(investment?.name || "")
  const [monthlySip, setMonthlySip] = useState(investment?.monthly_sip?.toString() || "")
  const [currentValue, setCurrentValue] = useState(investment?.current_value?.toString() || "0")
  const [investmentDate, setInvestmentDate] = useState(investment?.investment_date || new Date().toISOString().split("T")[0])
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!name || !monthlySip || loading) return
    setLoading(true)
    await onSave({
      type,
      name,
      monthly_sip: parseInt(monthlySip) || 0,
      current_value: parseInt(currentValue) || 0,
      investment_date: investmentDate,
    })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md p-6 rounded-t-3xl sm:rounded-2xl bg-card border border-border shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-5 sm:hidden" />
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {investment ? "Edit Investment" : "Add Investment"}
        </h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Type</label>
            <div className="grid grid-cols-4 gap-2">
              {INVESTMENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={cn(
                    "p-2 rounded-xl flex flex-col items-center gap-1 transition-all text-center",
                    type === t.value
                      ? "bg-primary/10 border-2 border-primary"
                      : "bg-muted border-2 border-transparent hover:border-muted-foreground/30"
                  )}
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className="text-[10px] font-medium text-foreground leading-tight">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Axis Bluechip Fund"
              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Monthly SIP Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">Rs.</span>
              <input
                type="number"
                value={monthlySip}
                onChange={(e) => setMonthlySip(e.target.value)}
                placeholder="5000"
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-input bg-background text-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Current Value (optional)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">Rs.</span>
              <input
                type="number"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder="0"
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-input bg-background text-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Date</label>
            <input
              type="date"
              value={investmentDate}
              onChange={(e) => setInvestmentDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border-2 border-border bg-card text-foreground font-semibold hover:bg-muted active:scale-[0.98] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name || !monthlySip || loading}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl font-semibold transition-all active:scale-[0.98]",
              name && monthlySip && !loading
                ? "gradient-primary text-white shadow-lg shadow-primary/25 hover:shadow-primary/40"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

// Projections Tab
function ProjectionsTabDb({
  investments,
  totalIncome,
  totalSpent,
}: {
  investments: Investment[]
  totalIncome: number
  totalSpent: number
}) {
  const monthlySavings = totalIncome - totalSpent
  const totalSIP = investments.reduce((sum, i) => sum + i.monthly_sip, 0)
  const avgReturn = 0.12 // 12% average return

  // Calculate future value
  const calculateFV = (years: number) => {
    const monthlyRate = avgReturn / 12
    const months = years * 12
    const fv = totalSIP * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate)
    return fv
  }

  const projections = [
    { years: 5, value: calculateFV(5) },
    { years: 10, value: calculateFV(10) },
    { years: 20, value: calculateFV(20) },
    { years: 30, value: calculateFV(30) },
  ]

  const maxValue = Math.max(...projections.map((p) => p.value), 1)

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-card border border-border">
        <h3 className="font-medium text-foreground mb-1">Projected Wealth</h3>
        <p className="text-xs text-muted-foreground mb-4">Based on {formatCurrency(totalSIP)}/mo SIP at 12% avg return</p>

        <div className="space-y-3">
          {projections.map((p) => (
            <div key={p.years}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{p.years} years</span>
                <span className="font-medium text-foreground">{formatCurrency(p.value)}</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--app-purple)] to-[var(--app-green)]"
                  style={{ width: `${(p.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Income entry type icons (no salary - that's the base monthly_income in profile)
const INCOME_TYPE_INFO: Record<string, { label: string; icon: string; color: string }> = {
  increment: { label: "Increment", icon: "📈", color: "var(--app-green)" },
  bonus: { label: "Bonus", icon: "🎁", color: "var(--app-amber)" },
  other: { label: "Other", icon: "💵", color: "var(--primary)" },
}

// Family Tab
function FamilyTabDb({
  household,
  householdMembers,
  totalIncome,
  totalSpent,
  incomeHistory,
  profile,
  onAddIncomeEntry,
  onDeleteIncomeEntry,
  onLogout,
}: {
  household: Household | null
  householdMembers: Profile[]
  totalIncome: number
  totalSpent: number
  incomeHistory: IncomeHistory[]
  profile: Profile | null
  onAddIncomeEntry: (entry: { amount: number; type: "increment" | "bonus" | "other"; effective_date: string; note?: string }) => Promise<void>
  onDeleteIncomeEntry: (id: string) => Promise<void>
  onLogout: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Get user join date for date restriction
  const userJoinDate = useMemo(() => {
    if (profile?.created_at) {
      const date = new Date(profile.created_at)
      // Return first day of join month
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
    }
    return new Date().toISOString().split('T')[0]
  }, [profile])
  
  const copyInviteCode = async () => {
    if (household?.invite_code) {
      await navigator.clipboard.writeText(household.invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDeleteIncome = async (id: string) => {
    setDeletingId(id)
    await onDeleteIncomeEntry(id)
    setDeletingId(null)
  }

  // Get current year's income entries
  const currentYear = new Date().getFullYear()
  const thisYearIncome = incomeHistory.filter(entry => 
    entry.effective_date.startsWith(currentYear.toString())
  )

  // Calculate total bonuses and increments this year
  const yearlyBonuses = thisYearIncome
    .filter(e => e.type === "bonus")
    .reduce((sum, e) => sum + e.amount, 0)
  const yearlyIncrements = thisYearIncome
    .filter(e => e.type === "increment")
    .reduce((sum, e) => sum + e.amount, 0)
  
  return (
    <div className="space-y-5">
      {/* Household info & Invite Code */}
      <div className="card-elevated p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">{household?.name || "My Family"}</h3>
            <p className="text-sm text-muted-foreground">Share code to invite members</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-4 py-3 rounded-xl bg-muted/60 font-mono text-xl text-center tracking-[0.25em] font-bold text-foreground">
            {household?.invite_code || "..."}
          </div>
          <button
            onClick={copyInviteCode}
            className={cn(
              "px-5 py-3 rounded-xl font-semibold transition-all active:scale-[0.98]",
              copied 
                ? "bg-[var(--app-green)]/10 text-[var(--app-green)]" 
                : "gradient-primary text-white shadow-lg shadow-primary/25"
            )}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Family summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-elevated p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Monthly Income</p>
          <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Monthly Savings</p>
          <p className="text-xl font-bold text-[var(--app-green)] mt-1">{formatCurrency(totalIncome - totalSpent)}</p>
        </div>
      </div>

      {/* Income Management Section */}
      <div className="card-elevated p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold text-foreground">Income Management</h4>
            <p className="text-xs text-muted-foreground">Track salary changes, increments & bonuses</p>
          </div>
          <button
            onClick={() => setShowIncomeModal(true)}
            className="px-3 py-1.5 rounded-lg gradient-primary text-white text-sm font-medium shadow-sm"
          >
            + Add
          </button>
        </div>

        {/* Year Summary */}
        {(yearlyBonuses > 0 || yearlyIncrements > 0) && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {yearlyIncrements > 0 && (
              <div className="p-3 rounded-xl bg-[var(--app-green)]/10 border border-[var(--app-green)]/20">
                <p className="text-[10px] text-muted-foreground font-medium">Increments ({currentYear})</p>
                <p className="text-sm font-bold text-[var(--app-green)]">+{formatCurrency(yearlyIncrements)}</p>
              </div>
            )}
            {yearlyBonuses > 0 && (
              <div className="p-3 rounded-xl bg-[var(--app-amber)]/10 border border-[var(--app-amber)]/20">
                <p className="text-[10px] text-muted-foreground font-medium">Bonuses ({currentYear})</p>
                <p className="text-sm font-bold text-[var(--app-amber)]">+{formatCurrency(yearlyBonuses)}</p>
              </div>
            )}
          </div>
        )}

        {/* Income History List */}
        {incomeHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No income entries yet. Add your first entry to start tracking.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {incomeHistory.slice(0, 10).map((entry) => {
              const typeInfo = INCOME_TYPE_INFO[entry.type]
              return (
                <div 
                  key={entry.id} 
                  className={cn(
                    "p-3 rounded-xl bg-muted/30 border border-border flex items-center gap-3",
                    deletingId === entry.id && "opacity-50"
                  )}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: `${typeInfo.color}15` }}>
                    {typeInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">{formatCurrency(entry.amount)}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${typeInfo.color}15`, color: typeInfo.color }}>
                        {typeInfo.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {new Date(entry.effective_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      {entry.note && ` - ${entry.note}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteIncome(entry.id)}
                    disabled={deletingId !== null}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Members */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Family Members</h4>
        {householdMembers.map((member) => (
          <div key={member.id} className="card-elevated p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-lg">{member.name?.charAt(0)}</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">{member.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
              </div>
            </div>
            <span className="text-sm font-medium text-muted-foreground">{formatCurrency(member.monthly_income || 0)}/mo</span>
          </div>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full py-3.5 rounded-xl border-2 border-destructive/30 text-destructive font-semibold hover:bg-destructive/5 active:scale-[0.98] transition-all"
      >
        Sign Out
      </button>

      {/* Add Income Modal */}
      {showIncomeModal && (
        <AddIncomeModal
          onAdd={async (entry) => {
            await onAddIncomeEntry(entry)
            setShowIncomeModal(false)
          }}
          onClose={() => setShowIncomeModal(false)}
          minDate={userJoinDate}
        />
      )}
    </div>
  )
}

// Add Income Modal
function AddIncomeModal({
  onAdd,
  onClose,
  minDate,
}: {
  onAdd: (entry: { amount: number; type: "increment" | "bonus" | "other"; effective_date: string; note?: string }) => Promise<void>
  onClose: () => void
  minDate: string // User's join date - cannot add entries before this
}) {
  const [amount, setAmount] = useState("")
  const [type, setType] = useState<"increment" | "bonus" | "other">("increment")
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0])
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!amount || loading) return
    // Validate date is not before join date
    if (effectiveDate < minDate) {
      alert(`Cannot add entries before your join date (${new Date(minDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })})`)
      return
    }
    setLoading(true)
    await onAdd({
      amount: parseInt(amount),
      type,
      effective_date: effectiveDate,
      note: note || undefined,
    })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md p-6 rounded-t-3xl sm:rounded-2xl bg-card border border-border shadow-2xl animate-slide-up">
        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-5 sm:hidden" />
        
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-foreground">Add Income Entry</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <svg className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(INCOME_TYPE_INFO).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setType(key as typeof type)}
                  className={cn(
                    "p-3 rounded-xl flex flex-col items-center gap-1 transition-all text-center",
                    type === key
                      ? "bg-primary/10 border-2 border-primary"
                      : "bg-muted border-2 border-transparent hover:border-muted-foreground/30"
                  )}
                >
                  <span className="text-xl">{info.icon}</span>
                  <span className="text-xs font-medium text-foreground">{info.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {type === 'increment' && 'Increments add to your base salary from the effective date onwards'}
              {type === 'bonus' && 'Bonuses are one-time additions counted only for that month'}
              {type === 'other' && 'Other income like freelance, side hustle counted for that month'}
            </p>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">Rs.</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-input bg-background text-foreground font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
          </div>

          {/* Effective Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Effective From</label>
            <input
              type="date"
              value={effectiveDate}
              min={minDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-input bg-background text-foreground font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            />
            <p className="text-[10px] text-muted-foreground">
              Tracking starts from {new Date(minDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Annual increment, Diwali bonus"
              className="w-full px-4 py-3.5 rounded-xl border-2 border-input bg-background text-foreground font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3.5 px-4 rounded-xl border-2 border-border bg-card text-foreground font-semibold hover:bg-muted active:scale-[0.98] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!amount || loading}
            className={cn(
              "flex-1 py-3.5 px-4 rounded-xl font-semibold transition-all active:scale-[0.98]",
              amount && !loading
                ? "gradient-primary text-white shadow-lg shadow-primary/25"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {loading ? "Adding..." : "Add Entry"}
          </button>
        </div>
      </div>
    </div>
  )
}

// Expense Modal
function ExpenseModalDb({
  categories,
  onAdd,
  onClose,
}: {
  categories: Category[]
  onAdd: (expense: { category_name: string; amount: number; description?: string; expense_date?: string }) => Promise<void>
  onClose: () => void
}) {
  const [amount, setAmount] = useState("")
  const [categoryName, setCategoryName] = useState("")
  const [description, setDescription] = useState("")
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0])
  const [loading, setLoading] = useState(false)

  const defaultCategories = [
    { id: "housing", icon: "🏠", name: "Housing" },
    { id: "groceries", icon: "🛒", name: "Groceries" },
    { id: "transport", icon: "🚌", name: "Transport" },
    { id: "utilities", icon: "⚡", name: "Utilities" },
    { id: "healthcare", icon: "🏥", name: "Healthcare" },
    { id: "education", icon: "📚", name: "Education" },
    { id: "entertainment", icon: "🎬", name: "Entertainment" },
    { id: "shopping", icon: "🛍", name: "Shopping" },
    { id: "dining", icon: "🍽", name: "Dining" },
    { id: "subscriptions", icon: "📱", name: "Subscriptions" },
    { id: "personal", icon: "💇", name: "Personal" },
    { id: "other", icon: "���", name: "Other" },
  ]

  const canSubmit = amount && parseInt(amount) > 0 && categoryName

  const handleSubmit = async () => {
    if (!canSubmit || loading) return
    setLoading(true)
    await onAdd({
      category_name: categoryName,
      amount: parseInt(amount),
      description: description || undefined,
      expense_date: expenseDate,
    })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-t-3xl sm:rounded-2xl p-4 pb-5 animate-slide-up shadow-2xl">
        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-3 sm:hidden" />
        <h2 className="text-base font-bold text-foreground mb-3">Add Expense</h2>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rs.</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-input bg-background text-foreground text-lg font-bold focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Category</label>
            <div className="grid grid-cols-6 gap-1">
              {defaultCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryName(cat.id)}
                  className={cn(
                    "p-1.5 rounded-lg border-2 text-center transition-all active:scale-95",
                    categoryName === cat.id 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <span className="text-base">{cat.icon}</span>
                  <p className="text-[7px] font-medium text-foreground truncate">{cat.name}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Date</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border-2 border-input bg-background text-foreground text-xs focus:border-primary transition-all outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Note</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
                className="w-full px-2.5 py-2 rounded-lg border-2 border-input bg-background text-foreground text-xs focus:border-primary transition-all outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className={cn(
              "w-full py-2.5 rounded-xl font-semibold transition-all active:scale-[0.98]",
              canSubmit && !loading
                ? "gradient-primary text-white shadow-lg shadow-primary/25"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {loading ? "Adding..." : "Add Expense"}
          </button>
        </div>
      </div>
    </div>
  )
}

// Invite Modal
function InviteModalDb({ inviteCode, onClose }: { inviteCode: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-[520px] bg-card rounded-t-3xl p-5 pb-8 animate-slide-up shadow-2xl">
        <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-4">Invite Family Member</h2>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share this invite code with your family members. They can join your household during sign up.
          </p>

          <div className="p-4 rounded-xl bg-muted text-center">
            <p className="text-2xl font-mono font-bold text-primary tracking-wider">{inviteCode}</p>
          </div>

          <button
            onClick={handleCopy}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            {copied ? "Copied!" : "Copy Code"}
          </button>

          <button onClick={onClose} className="w-full py-3 rounded-lg border border-border text-foreground font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Profile Tab
function ProfileTabDb({ profile, onLogout, onDeleteAccount }: { profile: Profile | null; onLogout: () => void; onDeleteAccount: () => void }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  
  if (!profile) return null

  const age = calculateAge(profile.date_of_birth)
  const roleInfo = ROLE_INFO[profile.role as keyof typeof ROLE_INFO]

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="p-6 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-4xl">{roleInfo?.icon || "👤"}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-foreground">{profile.name}</h2>
            <p className="text-muted-foreground">{roleInfo?.label || profile.role}</p>
          </div>
        </div>
      </div>

      {/* Personal Details */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <h3 className="font-medium text-foreground mb-4">Personal Details</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-muted-foreground">Name</span>
            <span className="text-foreground font-medium">{profile.name}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-muted-foreground">Role</span>
            <span className="text-foreground font-medium">{roleInfo?.label || profile.role}</span>
          </div>
          {profile.date_of_birth && (
            <>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Date of Birth</span>
                <span className="text-foreground font-medium">
                  {new Date(profile.date_of_birth).toLocaleDateString('en-IN', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Age</span>
                <span className="text-foreground font-medium">{age} years</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground">Monthly Income</span>
            <span className="text-foreground font-medium">{formatCurrency(profile.monthly_income)}</span>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <h3 className="font-medium text-foreground mb-4">Account</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground">User ID</span>
            <span className="text-foreground font-mono text-xs truncate max-w-[180px]">{profile.id}</span>
          </div>
        </div>
      </div>

      {/* Sign Out Button */}
      <button
        onClick={onLogout}
        className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
      >
        Sign Out
      </button>
      
      {/* Delete Account Section */}
      <div className="p-4 rounded-xl bg-card border border-destructive/30">
        <h3 className="font-medium text-destructive mb-2">Danger Zone</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account. This action cannot be undone.
        </p>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full py-3 px-4 rounded-xl border border-destructive text-destructive font-medium hover:bg-destructive/10 transition-colors"
        >
          Delete Account
        </button>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }} />
          <div className="relative w-full max-w-md p-6 rounded-t-3xl sm:rounded-2xl bg-card border border-border shadow-2xl animate-slide-up">
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-5 sm:hidden" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Account</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will permanently delete your profile and remove you from your household. Your expenses and data will be removed.
            </p>
            <p className="text-sm text-foreground mb-2">
              Type <span className="font-mono font-bold">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-4 py-2 mb-4 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText('')
                }}
                className="flex-1 py-2 px-4 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteConfirmText === 'DELETE') {
                    onDeleteAccount()
                  }
                }}
                disabled={deleteConfirmText !== 'DELETE'}
                className={cn(
                  'flex-1 py-2 px-4 rounded-lg font-medium transition-colors',
                  deleteConfirmText === 'DELETE'
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Icons
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

// Re-export the Dashboard component
export { DashboardDb as Dashboard }
