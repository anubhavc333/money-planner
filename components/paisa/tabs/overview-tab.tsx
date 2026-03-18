'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { AppState, MonthlySplit } from '@/lib/paisa-types'
import { CATEGORY_INFO } from '@/lib/paisa-types'
import { 
  formatCurrency, 
  getTotalFamilyIncome, 
  getMonthlyExpenseTotal,
  getExpensesByCategory,
  getSavingsRate
} from '@/lib/paisa-utils'

interface OverviewTabProps {
  state: AppState
  onUpdateSplit: (split: MonthlySplit) => void
}

export function OverviewTab({ state, onUpdateSplit }: OverviewTabProps) {
  const [editingSplit, setEditingSplit] = useState(false)
  const [tempSplit, setTempSplit] = useState(state.monthlySplit)
  
  const monthData = state.monthlyData[state.currentMonth]
  const totalIncome = getTotalFamilyIncome(state.familyMembers)
  const totalSpent = monthData ? getMonthlyExpenseTotal(monthData.expenses) : 0
  const remaining = totalIncome - totalSpent
  const savingsRate = getSavingsRate(totalIncome, totalSpent)
  
  const spentRatio = totalIncome > 0 ? (totalSpent / totalIncome) * 100 : 0
  const isOverspent = spentRatio > 70
  const isGoodSavings = savingsRate >= 20
  
  // Top spending categories
  const expensesByCategory = monthData 
    ? getExpensesByCategory(monthData.expenses) 
    : {}
  const budgets = monthData?.budgets || {}
  
  const topCategories = Object.entries(expensesByCategory)
    .filter(([, amount]) => amount > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
  
  const handleSplitChange = (key: keyof MonthlySplit, value: number) => {
    const newSplit = { ...tempSplit, [key]: value }
    
    // Ensure total is 100
    const total = newSplit.needs + newSplit.wants + newSplit.save
    if (total !== 100) {
      // Adjust the save amount to make total 100
      if (key !== 'save') {
        newSplit.save = 100 - newSplit.needs - newSplit.wants
        if (newSplit.save < 0) {
          newSplit.save = 0
          if (key === 'needs') {
            newSplit.wants = 100 - newSplit.needs
          } else {
            newSplit.needs = 100 - newSplit.wants
          }
        }
      } else {
        newSplit.wants = 100 - newSplit.needs - newSplit.save
        if (newSplit.wants < 0) {
          newSplit.wants = 0
          newSplit.needs = 100 - newSplit.save
        }
      }
    }
    
    setTempSplit(newSplit)
  }
  
  const applySplit = () => {
    onUpdateSplit(tempSplit)
    setEditingSplit(false)
  }
  
  const cancelEdit = () => {
    setTempSplit(state.monthlySplit)
    setEditingSplit(false)
  }
  
  return (
    <div className="space-y-4">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard 
          label="Family income" 
          value={formatCurrency(totalIncome, true)} 
        />
        <MetricCard 
          label="Spent this month" 
          value={formatCurrency(totalSpent, true)}
          accent={isOverspent ? 'red' : undefined}
        />
        <MetricCard 
          label="Remaining" 
          value={formatCurrency(remaining, true)}
        />
        <MetricCard 
          label="Savings rate" 
          value={`${savingsRate}%`}
          accent={isGoodSavings ? 'green' : 'amber'}
        />
      </div>
      
      {/* Monthly Plan Card */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-foreground">Monthly Plan</h3>
          {!editingSplit && (
            <button
              onClick={() => setEditingSplit(true)}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <PencilIcon className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
        
        {/* Split Bar */}
        <div className="flex rounded-full overflow-hidden h-3 mb-3">
          <div 
            className="bg-[var(--paisa-blue)] transition-all" 
            style={{ width: `${state.monthlySplit.needs}%` }} 
          />
          <div 
            className="bg-[var(--paisa-amber)] transition-all" 
            style={{ width: `${state.monthlySplit.wants}%` }} 
          />
          <div 
            className="bg-[var(--paisa-green)] transition-all" 
            style={{ width: `${state.monthlySplit.save}%` }} 
          />
        </div>
        
        {/* Split Labels */}
        <div className="flex text-sm">
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[var(--paisa-blue)]" />
              <span className="text-muted-foreground">Needs</span>
            </div>
            <p className="font-medium text-foreground">
              {state.monthlySplit.needs}% ({formatCurrency(totalIncome * state.monthlySplit.needs / 100, true)})
            </p>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[var(--paisa-amber)]" />
              <span className="text-muted-foreground">Wants</span>
            </div>
            <p className="font-medium text-foreground">
              {state.monthlySplit.wants}% ({formatCurrency(totalIncome * state.monthlySplit.wants / 100, true)})
            </p>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[var(--paisa-green)]" />
              <span className="text-muted-foreground">Save</span>
            </div>
            <p className="font-medium text-foreground">
              {state.monthlySplit.save}% ({formatCurrency(totalIncome * state.monthlySplit.save / 100, true)})
            </p>
          </div>
        </div>
        
        {/* Edit Panel */}
        {editingSplit && (
          <div className="mt-4 pt-4 border-t border-border space-y-4">
            <SliderInput
              label="Needs"
              value={tempSplit.needs}
              onChange={v => handleSplitChange('needs', v)}
              color="blue"
            />
            <SliderInput
              label="Wants"
              value={tempSplit.wants}
              onChange={v => handleSplitChange('wants', v)}
              color="amber"
            />
            <SliderInput
              label="Save"
              value={tempSplit.save}
              onChange={v => handleSplitChange('save', v)}
              color="green"
            />
            
            <div className="flex gap-2">
              <button
                onClick={cancelEdit}
                className="flex-1 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={applySplit}
                className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Top Spending Categories */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-medium text-foreground mb-3">Top Spending Categories</h3>
        
        {topCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expenses this month</p>
        ) : (
          <div className="space-y-3">
            {topCategories.map(([cat, spent]) => {
              const info = CATEGORY_INFO[cat as keyof typeof CATEGORY_INFO]
              const budget = budgets[cat] || 0
              const progress = budget > 0 ? (spent / budget) * 100 : 0
              const isOver = progress > 100
              
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{info.icon}</span>
                      <span className="text-foreground">{info.name}</span>
                    </div>
                    <span className={cn(
                      'font-medium',
                      isOver ? 'text-[var(--paisa-red)]' : 'text-foreground'
                    )}>
                      {formatCurrency(spent, true)} / {formatCurrency(budget, true)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        'h-full rounded-full transition-all',
                        isOver ? 'bg-[var(--paisa-red)]' : 'bg-primary'
                      )}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Metric Card Component
function MetricCard({ 
  label, 
  value, 
  accent 
}: { 
  label: string
  value: string
  accent?: 'green' | 'amber' | 'red' 
}) {
  return (
    <div className="bg-secondary rounded-lg p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn(
        'text-xl font-semibold mt-1',
        accent === 'green' && 'text-[var(--paisa-green)]',
        accent === 'amber' && 'text-[var(--paisa-amber)]',
        accent === 'red' && 'text-[var(--paisa-red)]',
        !accent && 'text-foreground'
      )}>
        {value}
      </p>
    </div>
  )
}

// Slider Input Component
function SliderInput({
  label,
  value,
  onChange,
  color,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  color: 'blue' | 'amber' | 'green'
}) {
  const colorClass = {
    blue: 'accent-[var(--paisa-blue)]',
    amber: 'accent-[var(--paisa-amber)]',
    green: 'accent-[var(--paisa-green)]',
  }[color]
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className={cn('w-full h-2 rounded-lg cursor-pointer', colorClass)}
      />
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
