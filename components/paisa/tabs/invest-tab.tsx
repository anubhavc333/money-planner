'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { AppState, InvestmentAllocation } from '@/lib/paisa-types'
import { formatCurrency, getTotalFamilyIncome, calculateProjection } from '@/lib/paisa-utils'

interface InvestTabProps {
  state: AppState
  onUpdateInvestment: (allocation: InvestmentAllocation) => void
}

const INVESTMENT_TYPES = [
  { key: 'mutualFunds', label: 'Mutual Funds', icon: '📊' },
  { key: 'ppf', label: 'PPF', icon: '🏛️' },
  { key: 'fixedDeposits', label: 'Fixed Deposits', icon: '🔒' },
  { key: 'stocks', label: 'Direct Stocks', icon: '📈' },
  { key: 'gold', label: 'Gold/SGBs', icon: '🪙' },
] as const

export function InvestTab({ state, onUpdateInvestment }: InvestTabProps) {
  const [editing, setEditing] = useState(false)
  const [tempAllocation, setTempAllocation] = useState(state.investmentAllocation)
  
  const totalIncome = getTotalFamilyIncome(state.familyMembers)
  const monthlySavings = (totalIncome * state.monthlySplit.save) / 100
  
  const handleChange = (key: keyof InvestmentAllocation, value: number) => {
    const newAllocation = { ...tempAllocation, [key]: value }
    
    // Calculate total
    const total = Object.values(newAllocation).reduce((sum, v) => sum + v, 0)
    
    // If total exceeds 100, adjust other values proportionally
    if (total > 100) {
      const excess = total - 100
      const otherKeys = Object.keys(newAllocation).filter(k => k !== key) as (keyof InvestmentAllocation)[]
      const otherTotal = otherKeys.reduce((sum, k) => sum + newAllocation[k], 0)
      
      if (otherTotal > 0) {
        for (const k of otherKeys) {
          newAllocation[k] = Math.max(0, Math.round(newAllocation[k] - (excess * (newAllocation[k] / otherTotal))))
        }
      }
    }
    
    setTempAllocation(newAllocation)
  }
  
  const applyChanges = () => {
    onUpdateInvestment(tempAllocation)
    setEditing(false)
  }
  
  const cancelEdit = () => {
    setTempAllocation(state.investmentAllocation)
    setEditing(false)
  }
  
  const allocation = editing ? tempAllocation : state.investmentAllocation
  const total = Object.values(allocation).reduce((sum, v) => sum + v, 0)
  
  // Calculate projections
  const annualInvestment = monthlySavings * 12
  const projection10yr = calculateProjection(monthlySavings, 10, 0.10)
  
  return (
    <div className="space-y-4">
      {/* SIP Allocation Card */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-foreground">Monthly SIP Allocation</h3>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <PencilIcon className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
        
        <div className="space-y-3">
          {INVESTMENT_TYPES.map(({ key, label, icon }) => {
            const percent = allocation[key]
            const amount = (monthlySavings * percent) / 100
            
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>{icon}</span>
                    <span className="text-foreground">{label}</span>
                  </div>
                  {editing ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={percent}
                      onChange={e => handleChange(key, parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 text-sm rounded border border-input bg-background text-foreground text-right focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  ) : (
                    <span className="text-foreground font-medium">
                      {formatCurrency(amount, true)} ({percent}%)
                    </span>
                  )}
                </div>
                {!editing && (
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        
        {editing && (
          <>
            <div className={cn(
              'mt-3 p-2 rounded text-sm text-center',
              total === 100 
                ? 'bg-[var(--paisa-green)]/10 text-[var(--paisa-green)]' 
                : 'bg-[var(--paisa-amber)]/10 text-[var(--paisa-amber)]'
            )}>
              Total: {total}% {total !== 100 && '(must equal 100%)'}
            </div>
            
            <div className="flex gap-2 mt-4">
              <button
                onClick={cancelEdit}
                className="flex-1 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={applyChanges}
                disabled={total !== 100}
                className={cn(
                  'flex-1 py-2 rounded-lg font-medium transition-colors',
                  total === 100
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                Apply
              </button>
            </div>
          </>
        )}
      </div>
      
      {/* Investment Summary */}
      <div className="bg-secondary rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Investment Summary</h4>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Monthly SIP</p>
            <p className="font-semibold text-foreground">{formatCurrency(monthlySavings, true)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Annual</p>
            <p className="font-semibold text-foreground">{formatCurrency(annualInvestment, true)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">10yr @10%</p>
            <p className="font-semibold text-[var(--paisa-green)]">{formatCurrency(projection10yr, true)}</p>
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
