'use client'

import { cn } from '@/lib/utils'
import type { AppState } from '@/lib/paisa-types'
import { 
  formatCurrency, 
  getMonthlyExpenseTotal,
  getTotalFamilyIncome
} from '@/lib/paisa-utils'

interface GoalsTabProps {
  state: AppState
}

export function GoalsTab({ state }: GoalsTabProps) {
  // Calculate total cumulative savings
  let totalSaved = state.existingSavings
  for (const data of Object.values(state.monthlyData)) {
    const spent = getMonthlyExpenseTotal(data.expenses)
    const saved = data.income - spent
    totalSaved += Math.max(0, saved)
  }
  
  // Calculate monthly savings rate
  const totalIncome = getTotalFamilyIncome(state.familyMembers)
  const monthlySavingsTarget = (totalIncome * state.monthlySplit.save) / 100
  
  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="bg-secondary rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Total saved</p>
            <p className="text-xl font-semibold text-[var(--paisa-green)]">
              {formatCurrency(totalSaved, true)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Monthly target</p>
            <p className="text-xl font-semibold text-foreground">
              {formatCurrency(monthlySavingsTarget, true)}
            </p>
          </div>
        </div>
      </div>
      
      {/* Goal Cards */}
      {state.goals.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No goals set yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {state.goals.map(goal => {
            // Calculate progress toward this goal
            const goalShare = totalSaved / state.goals.length
            const savedForGoal = Math.min(goalShare, goal.targetAmount)
            const progress = (savedForGoal / goal.targetAmount) * 100
            
            // Estimate years to reach goal
            const remaining = goal.targetAmount - savedForGoal
            const yearsToReach = monthlySavingsTarget > 0 
              ? Math.ceil(remaining / (monthlySavingsTarget * 12 / state.goals.length))
              : Infinity
            
            return (
              <div 
                key={goal.id}
                className="bg-card border border-border rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{goal.icon}</span>
                    <div>
                      <h3 className="font-medium text-foreground">{goal.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Target: {formatCurrency(goal.targetAmount, true)}
                      </p>
                    </div>
                  </div>
                  {yearsToReach !== Infinity && yearsToReach > 0 && (
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      ~{yearsToReach} year{yearsToReach !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        'h-full rounded-full transition-all',
                        progress >= 100 ? 'bg-[var(--paisa-green)]' : 'bg-primary'
                      )}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatCurrency(savedForGoal, true)} saved
                    </span>
                    <span className={cn(
                      'font-medium',
                      progress >= 100 ? 'text-[var(--paisa-green)]' : 'text-foreground'
                    )}>
                      {Math.round(progress)}% complete
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
