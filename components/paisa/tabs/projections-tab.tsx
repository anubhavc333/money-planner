'use client'

import type { AppState } from '@/lib/paisa-types'
import { formatCurrency, getTotalFamilyIncome, calculateProjection } from '@/lib/paisa-utils'

interface ProjectionsTabProps {
  state: AppState
}

export function ProjectionsTab({ state }: ProjectionsTabProps) {
  const totalIncome = getTotalFamilyIncome(state.familyMembers)
  const monthlySavings = (totalIncome * state.monthlySplit.save) / 100
  
  // Calculate projections at different time horizons
  const projections = [
    { years: 5, value: calculateProjection(monthlySavings, 5, 0.10) },
    { years: 10, value: calculateProjection(monthlySavings, 10, 0.10) },
    { years: 15, value: calculateProjection(monthlySavings, 15, 0.10) },
    { years: 20, value: calculateProjection(monthlySavings, 20, 0.10) },
    { years: 25, value: calculateProjection(monthlySavings, 25, 0.10) },
    { years: 30, value: calculateProjection(monthlySavings, 30, 0.10) },
  ]
  
  const maxValue = Math.max(...projections.map(p => p.value))
  
  // Calculate retirement wealth (assuming retirement at 60)
  const userAge = state.currentUser?.age || 30
  const yearsToRetirement = Math.max(60 - userAge, 1)
  const retirementWealth = calculateProjection(monthlySavings, yearsToRetirement, 0.10) + state.existingSavings
  
  // 5 year milestone
  const fiveYearWealth = projections[0].value + state.existingSavings
  
  return (
    <div className="space-y-4">
      {/* Wealth Projection Chart */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-medium text-foreground mb-4">Wealth Projection @10% CAGR</h3>
        
        <div className="space-y-3">
          {projections.map(({ years, value }) => {
            const width = (value / maxValue) * 100
            
            return (
              <div key={years} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{years} years</span>
                </div>
                <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 rounded-lg transition-all"
                    style={{ 
                      width: `${Math.max(width, 15)}%`,
                      background: 'linear-gradient(90deg, var(--paisa-purple), var(--paisa-blue))'
                    }}
                  />
                  <span className="absolute inset-0 flex items-center px-3 text-sm font-medium text-white mix-blend-difference">
                    {formatCurrency(value, true)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        
        <p className="mt-4 text-xs text-muted-foreground text-center">
          Based on monthly SIP of {formatCurrency(monthlySavings)} at 10% annual returns
        </p>
      </div>
      
      {/* Milestone Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary rounded-lg p-4">
          <p className="text-xs text-muted-foreground">At retirement (60)</p>
          <p className="text-xl font-semibold text-[var(--paisa-green)] mt-1">
            {formatCurrency(retirementWealth, true)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            In {yearsToRetirement} years
          </p>
        </div>
        <div className="bg-secondary rounded-lg p-4">
          <p className="text-xs text-muted-foreground">5-year milestone</p>
          <p className="text-xl font-semibold text-foreground mt-1">
            {formatCurrency(fiveYearWealth, true)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Including existing savings
          </p>
        </div>
      </div>
      
      {/* Assumptions */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-2">Assumptions</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Annual return rate: 10% (historical equity market average)</li>
          <li>• Monthly investment: {formatCurrency(monthlySavings)}</li>
          <li>• Retirement age: 60 years</li>
          <li>• Existing savings: {formatCurrency(state.existingSavings)}</li>
        </ul>
      </div>
    </div>
  )
}
