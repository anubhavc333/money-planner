'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { AppState, Expense, ExpenseCategory } from '@/lib/paisa-types'
import { CATEGORY_INFO } from '@/lib/paisa-types'
import { formatCurrency, getMonthlyExpenseTotal } from '@/lib/paisa-utils'

interface ExpensesTabProps {
  state: AppState
  onAddExpense: (expense: Omit<Expense, 'id' | 'monthKey'>) => void
  showModal: boolean
  onCloseModal: () => void
}

export function ExpensesTab({ state, onAddExpense, showModal, onCloseModal }: ExpensesTabProps) {
  const [localShowModal, setLocalShowModal] = useState(false)
  
  const monthData = state.monthlyData[state.currentMonth]
  const expenses = monthData?.expenses || []
  const totalSpent = getMonthlyExpenseTotal(expenses)
  const avgPerExpense = expenses.length > 0 ? totalSpent / expenses.length : 0
  
  // Sort expenses by date (newest first)
  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  
  const getMemberName = (memberId: string) => {
    const member = state.familyMembers.find(m => m.id === memberId)
    return member?.name || 'Unknown'
  }
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short' 
    })
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {expenses.length} expense{expenses.length !== 1 ? 's' : ''} this month
        </p>
        <button
          onClick={() => setLocalShowModal(true)}
          className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          + Add
        </button>
      </div>
      
      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Total spent</p>
          <p className="text-xl font-semibold text-foreground mt-1">
            {formatCurrency(totalSpent, true)}
          </p>
        </div>
        <div className="bg-secondary rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Average per expense</p>
          <p className="text-xl font-semibold text-foreground mt-1">
            {formatCurrency(avgPerExpense, true)}
          </p>
        </div>
      </div>
      
      {/* Expense List */}
      <div className="space-y-2">
        {sortedExpenses.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">No expenses recorded this month</p>
            <button
              onClick={() => setLocalShowModal(true)}
              className="mt-2 text-primary hover:underline text-sm"
            >
              Add your first expense
            </button>
          </div>
        ) : (
          sortedExpenses.map(expense => {
            const categoryInfo = CATEGORY_INFO[expense.category]
            
            return (
              <div 
                key={expense.id}
                className="bg-card border border-border rounded-lg p-3 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg">
                  {categoryInfo.icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">{categoryInfo.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {getMemberName(expense.paidBy)}
                    {expense.note && ` • ${expense.note}`}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="font-medium text-foreground">
                    {formatCurrency(expense.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(expense.date)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
      
      {/* Local Add Expense Modal */}
      {localShowModal && (
        <ExpenseModal
          state={state}
          onAdd={(expense) => {
            onAddExpense(expense)
            setLocalShowModal(false)
          }}
          onClose={() => setLocalShowModal(false)}
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
  
  const categories = Object.entries(CATEGORY_INFO).map(([id, info]) => ({
    id,
    icon: info.icon,
    name: info.name,
  }))
  
  const canSubmit = amount && parseInt(amount) > 0 && category
  
  const handleSubmit = () => {
    if (!canSubmit) return
    
    onAdd({
      amount: parseInt(amount),
      category: category as ExpenseCategory,
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
