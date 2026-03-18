'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { AppState, MonthlyBudget, ExpenseCategory } from '@/lib/paisa-types'
import { CATEGORY_INFO } from '@/lib/paisa-types'
import { 
  formatCurrency, 
  getExpensesByCategory 
} from '@/lib/paisa-utils'

interface BudgetTabProps {
  state: AppState
  onUpdateBudgets: (budgets: MonthlyBudget) => void
}

export function BudgetTab({ state, onUpdateBudgets }: BudgetTabProps) {
  const [editing, setEditing] = useState(false)
  const [tempBudgets, setTempBudgets] = useState<MonthlyBudget>({})
  
  const monthData = state.monthlyData[state.currentMonth]
  const budgets = monthData?.budgets || {}
  const expensesByCategory = monthData 
    ? getExpensesByCategory(monthData.expenses) 
    : {}
  
  const startEditing = () => {
    setTempBudgets({ ...budgets })
    setEditing(true)
  }
  
  const applyChanges = () => {
    onUpdateBudgets(tempBudgets)
    setEditing(false)
  }
  
  const cancelEdit = () => {
    setTempBudgets({})
    setEditing(false)
  }
  
  const categories = Object.keys(CATEGORY_INFO) as ExpenseCategory[]
  
  return (
    <div className="space-y-4">
      {/* Budget Card */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-foreground">Monthly Budgets</h3>
          {!editing && (
            <button
              onClick={startEditing}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <PencilIcon className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
        
        <div className="space-y-3">
          {categories.map(cat => {
            const info = CATEGORY_INFO[cat]
            const budget = editing ? (tempBudgets[cat] || 0) : (budgets[cat] || 0)
            const spent = expensesByCategory[cat] || 0
            const progress = budget > 0 ? (spent / budget) * 100 : 0
            const isOver = progress > 100
            const isWarning = progress > 80 && progress <= 100
            
            // Determine badge color
            let badgeColor = 'bg-[var(--paisa-green)] text-white'
            if (isOver) {
              badgeColor = 'bg-[var(--paisa-red)] text-white'
            } else if (isWarning) {
              badgeColor = 'bg-[var(--paisa-amber)] text-white'
            }
            
            return (
              <div key={cat} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{info.icon}</span>
                    <span className="text-sm text-foreground">{info.name}</span>
                    {!editing && budget > 0 && (
                      <span className={cn('text-xs px-1.5 py-0.5 rounded-full', badgeColor)}>
                        {Math.round(progress)}%
                      </span>
                    )}
                  </div>
                  
                  {editing ? (
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                      <input
                        type="number"
                        value={tempBudgets[cat] || ''}
                        onChange={e => setTempBudgets({
                          ...tempBudgets,
                          [cat]: parseInt(e.target.value) || 0
                        })}
                        placeholder="0"
                        className="w-24 pl-5 pr-2 py-1 text-sm rounded border border-input bg-background text-foreground text-right focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  ) : (
                    <span className={cn(
                      'text-sm font-medium',
                      isOver ? 'text-[var(--paisa-red)]' : 'text-foreground'
                    )}>
                      {formatCurrency(spent, true)} / {formatCurrency(budget, true)}
                    </span>
                  )}
                </div>
                
                {!editing && budget > 0 && (
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        'h-full rounded-full transition-all',
                        isOver ? 'bg-[var(--paisa-red)]' : 
                        isWarning ? 'bg-[var(--paisa-amber)]' : 
                        'bg-[var(--paisa-green)]'
                      )}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        
        {editing && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-border">
            <button
              onClick={cancelEdit}
              className="flex-1 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={applyChanges}
              className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Apply
            </button>
          </div>
        )}
      </div>
      
      {/* Budget Summary */}
      <div className="bg-secondary rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-2">Budget Summary</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">Total budgeted</p>
            <p className="font-medium text-foreground">
              {formatCurrency(
                Object.values(budgets).reduce((sum, b) => sum + b, 0)
              )}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Total spent</p>
            <p className="font-medium text-foreground">
              {formatCurrency(
                Object.values(expensesByCategory).reduce((sum, s) => sum + s, 0)
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Pencil Icon
function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
