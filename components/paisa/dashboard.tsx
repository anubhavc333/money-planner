'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { 
  AppState, 
  MonthlySplit, 
  InvestmentAllocation, 
  Expense,
  FamilyMember,
  MonthlyBudget
} from '@/lib/paisa-types'
import { 
  formatMonthKey, 
  getPrevMonthKey, 
  getNextMonthKey, 
  getCurrentMonthKey 
} from '@/lib/paisa-utils'
import { OverviewTab } from './tabs/overview-tab'
import { BudgetTab } from './tabs/budget-tab'
import { ExpensesTab } from './tabs/expenses-tab'
import { HistoryTab } from './tabs/history-tab'
import { GoalsTab } from './tabs/goals-tab'
import { InvestTab } from './tabs/invest-tab'
import { ProjectionsTab } from './tabs/projections-tab'
import { FamilyTab } from './tabs/family-tab'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'budget', label: 'Budget' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'history', label: 'History' },
  { id: 'goals', label: 'Goals' },
  { id: 'invest', label: 'Invest' },
  { id: 'projections', label: 'Projections' },
  { id: 'family', label: 'Family' },
]

interface DashboardProps {
  state: AppState
  onUpdateSplit: (split: MonthlySplit) => void
  onUpdateBudgets: (budgets: MonthlyBudget) => void
  onUpdateInvestment: (allocation: InvestmentAllocation) => void
  onAddExpense: (expense: Omit<Expense, 'id' | 'monthKey'>) => void
  onAddMember: (member: Omit<FamilyMember, 'id' | 'isPrimary'>) => void
  onSetMonth: (month: string) => void
  onSetTab: (tab: string) => void
}

export function Dashboard({
  state,
  onUpdateSplit,
  onUpdateBudgets,
  onUpdateInvestment,
  onAddExpense,
  onAddMember,
  onSetMonth,
  onSetTab,
}: DashboardProps) {
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  
  const currentMonthKey = getCurrentMonthKey()
  const showMonthNav = ['overview', 'budget', 'expenses'].includes(state.activeTab)
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">P</span>
            </div>
            <span className="font-semibold text-foreground">Money Planner</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Hi, {state.currentUser?.name?.split(' ')[0]}
            </span>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
            >
              + Invite
            </button>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              + Expense
            </button>
          </div>
        </div>
        
        {/* Month Navigator */}
        {showMonthNav && (
          <div className="px-4 py-2 flex items-center justify-center gap-4 border-t border-border bg-muted/30">
            <button
              onClick={() => onSetMonth(getPrevMonthKey(state.currentMonth))}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="text-center min-w-[140px]">
              <p className="font-medium text-foreground">{formatMonthKey(state.currentMonth)}</p>
              {state.currentMonth === currentMonthKey && (
                <p className="text-xs text-muted-foreground">Current month</p>
              )}
            </div>
            <button
              onClick={() => onSetMonth(getNextMonthKey(state.currentMonth))}
              disabled={state.currentMonth === currentMonthKey}
              className={cn(
                'p-1 rounded transition-colors',
                state.currentMonth === currentMonthKey
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:bg-muted'
              )}
            >
              <ChevronRightIcon className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        )}
        
        {/* Tab Bar */}
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex px-4 gap-1 min-w-max">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => onSetTab(tab.id)}
                className={cn(
                  'px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  state.activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      
      {/* Tab Content */}
      <main className="flex-1 p-4 pb-8">
        {state.activeTab === 'overview' && (
          <OverviewTab state={state} onUpdateSplit={onUpdateSplit} />
        )}
        {state.activeTab === 'budget' && (
          <BudgetTab state={state} onUpdateBudgets={onUpdateBudgets} />
        )}
        {state.activeTab === 'expenses' && (
          <ExpensesTab 
            state={state} 
            onAddExpense={onAddExpense}
            showModal={showExpenseModal}
            onCloseModal={() => setShowExpenseModal(false)}
          />
        )}
        {state.activeTab === 'history' && (
          <HistoryTab state={state} />
        )}
        {state.activeTab === 'goals' && (
          <GoalsTab state={state} />
        )}
        {state.activeTab === 'invest' && (
          <InvestTab state={state} onUpdateInvestment={onUpdateInvestment} />
        )}
        {state.activeTab === 'projections' && (
          <ProjectionsTab state={state} />
        )}
        {state.activeTab === 'family' && (
          <FamilyTab 
            state={state} 
            onAddMember={onAddMember}
            showModal={showInviteModal}
            onCloseModal={() => setShowInviteModal(false)}
          />
        )}
      </main>
      
      {/* Expense Modal */}
      {showExpenseModal && (
        <ExpenseModal
          state={state}
          onAdd={(expense) => {
            onAddExpense(expense)
            setShowExpenseModal(false)
          }}
          onClose={() => setShowExpenseModal(false)}
        />
      )}
      
      {/* Invite Modal */}
      {showInviteModal && (
        <InviteMemberModal
          onAdd={(member) => {
            onAddMember(member)
            setShowInviteModal(false)
          }}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  )
}

// Expense Modal Component
function ExpenseModal({
  state,
  onAdd,
  onClose,
}: {
  state: AppState
  onAdd: (expense: Omit<Expense, 'id' | 'monthKey'>) => void
  onClose: () => void
}) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<string>('')
  const [paidBy, setPaidBy] = useState(state.currentUser?.id || '')
  const [note, setNote] = useState('')
  
  const categories = [
    { id: 'housing', icon: '🏠', name: 'Housing' },
    { id: 'groceries', icon: '🛒', name: 'Groceries' },
    { id: 'transport', icon: '🚌', name: 'Transport' },
    { id: 'utilities', icon: '⚡', name: 'Utilities' },
    { id: 'healthcare', icon: '🏥', name: 'Healthcare' },
    { id: 'education', icon: '📚', name: 'Education' },
    { id: 'entertainment', icon: '🎬', name: 'Entertainment' },
    { id: 'shopping', icon: '🛍', name: 'Shopping' },
    { id: 'dining', icon: '🍽', name: 'Dining' },
    { id: 'subscriptions', icon: '📱', name: 'Subscriptions' },
    { id: 'personal', icon: '💇', name: 'Personal' },
    { id: 'other', icon: '📦', name: 'Other' },
  ]
  
  const canSubmit = amount && parseInt(amount) > 0 && category
  
  const handleSubmit = () => {
    if (!canSubmit) return
    
    onAdd({
      amount: parseInt(amount),
      category: category as any,
      paidBy,
      note: note || undefined,
      date: new Date().toISOString().split('T')[0],
    })
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-[520px] bg-card rounded-t-2xl p-4 pb-8 animate-in slide-in-from-bottom duration-300">
        <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-4">Add Expense</h2>
        
        <div className="space-y-4">
          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          
          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    'p-2 rounded-lg border text-center transition-all',
                    category === cat.id
                      ? 'border-primary bg-accent'
                      : 'border-border hover:border-muted-foreground'
                  )}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <p className="text-xs text-foreground mt-1">{cat.name}</p>
                </button>
              ))}
            </div>
          </div>
          
          {/* Paid by */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Paid by</label>
            <select
              value={paidBy}
              onChange={e => setPaidBy(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {state.familyMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Note */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note..."
              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'w-full py-3 rounded-lg font-medium transition-colors',
              canSubmit
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            Add Expense
          </button>
        </div>
      </div>
    </div>
  )
}

// Invite Member Modal
function InviteMemberModal({
  onAdd,
  onClose,
}: {
  onAdd: (member: Omit<FamilyMember, 'id' | 'isPrimary'>) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [role, setRole] = useState<string>('other')
  const [salary, setSalary] = useState('')
  
  const roles = [
    { id: 'husband', label: 'Husband' },
    { id: 'wife', label: 'Wife' },
    { id: 'son', label: 'Son' },
    { id: 'daughter', label: 'Daughter' },
    { id: 'parent', label: 'Parent' },
    { id: 'other', label: 'Other' },
  ]
  
  const canSubmit = name.trim() !== ''
  
  const handleSubmit = () => {
    if (!canSubmit) return
    
    onAdd({
      name: name.trim(),
      role: role as any,
      salary: parseInt(salary) || 0,
    })
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-[520px] bg-card rounded-t-2xl p-4 pb-8 animate-in slide-in-from-bottom duration-300">
        <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-4">Invite Family Member</h2>
        
        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter name"
              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          {/* Role */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {roles.map(r => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Salary */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Monthly salary</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
              <input
                type="number"
                value={salary}
                onChange={e => setSalary(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          
          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'w-full py-3 rounded-lg font-medium transition-colors',
              canSubmit
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            Add Member
          </button>
        </div>
      </div>
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
