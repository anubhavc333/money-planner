'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { AppState, ExpenseCategory } from '@/lib/paisa-types'
import { CATEGORY_INFO } from '@/lib/paisa-types'
import { 
  formatCurrency, 
  getCurrentMonthKey, 
  getLastNMonths,
  getMonthlyExpenseTotal,
  getSavingsRate,
  getExpensesByCategory,
  parseMonthKey
} from '@/lib/paisa-utils'

type ViewType = 'monthly' | 'yearly' | 'category'

interface HistoryTabProps {
  state: AppState
}

export function HistoryTab({ state }: HistoryTabProps) {
  const [view, setView] = useState<ViewType>('monthly')
  
  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex bg-muted rounded-lg p-1">
        {(['monthly', 'yearly', 'category'] as ViewType[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-md transition-colors capitalize',
              view === v 
                ? 'bg-card text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {v === 'category' ? 'By Category' : v}
          </button>
        ))}
      </div>
      
      {view === 'monthly' && <MonthlyView state={state} />}
      {view === 'yearly' && <YearlyView state={state} />}
      {view === 'category' && <CategoryView state={state} />}
    </div>
  )
}

// Monthly View
function MonthlyView({ state }: { state: AppState }) {
  const currentMonth = getCurrentMonthKey()
  const last12Months = getLastNMonths(12, currentMonth)
  
  // Calculate monthly data
  const monthlyStats = last12Months.map(monthKey => {
    const data = state.monthlyData[monthKey]
    const income = data?.income || 0
    const spent = data ? getMonthlyExpenseTotal(data.expenses) : 0
    const saved = income - spent
    const rate = getSavingsRate(income, spent)
    
    return { monthKey, income, spent, saved, rate }
  })
  
  const maxSpent = Math.max(...monthlyStats.map(m => m.spent), 1)
  const maxSaved = Math.max(...monthlyStats.map(m => Math.max(m.saved, 0)), 1)
  
  const formatMonthShort = (monthKey: string) => {
    const date = parseMonthKey(monthKey)
    return date.toLocaleDateString('en-IN', { month: 'short' })
  }
  
  return (
    <div className="space-y-4">
      {/* Spending Trend */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-medium text-foreground mb-3">Monthly Spending</h3>
        <div className="flex items-end gap-1 h-32">
          {monthlyStats.map(({ monthKey, spent }) => {
            const height = (spent / maxSpent) * 100
            const isCurrent = monthKey === currentMonth
            
            return (
              <div key={monthKey} className="flex-1 flex flex-col items-center">
                <div 
                  className={cn(
                    'w-full rounded-t transition-all',
                    isCurrent ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                  style={{ height: `${Math.max(height, 4)}%` }}
                />
              </div>
            )
          })}
        </div>
        <div className="flex mt-1 text-[10px] text-muted-foreground">
          {monthlyStats.map(({ monthKey }) => (
            <div key={monthKey} className="flex-1 text-center">
              {formatMonthShort(monthKey)}
            </div>
          ))}
        </div>
      </div>
      
      {/* Savings Trend */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-medium text-foreground mb-3">Monthly Savings</h3>
        <div className="flex items-end gap-1 h-32">
          {monthlyStats.map(({ monthKey, saved }) => {
            const height = saved > 0 ? (saved / maxSaved) * 100 : 0
            const isCurrent = monthKey === currentMonth
            
            return (
              <div key={monthKey} className="flex-1 flex flex-col items-center">
                <div 
                  className={cn(
                    'w-full rounded-t transition-all',
                    isCurrent ? 'bg-[var(--paisa-green)]' : 'bg-[var(--paisa-green)]/30'
                  )}
                  style={{ height: `${Math.max(height, 4)}%` }}
                />
              </div>
            )
          })}
        </div>
        <div className="flex mt-1 text-[10px] text-muted-foreground">
          {monthlyStats.map(({ monthKey }) => (
            <div key={monthKey} className="flex-1 text-center">
              {formatMonthShort(monthKey)}
            </div>
          ))}
        </div>
      </div>
      
      {/* Month Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-foreground">Month</th>
              <th className="text-right p-3 font-medium text-foreground">Income</th>
              <th className="text-right p-3 font-medium text-foreground">Spent</th>
              <th className="text-right p-3 font-medium text-foreground">Rate</th>
            </tr>
          </thead>
          <tbody>
            {[...monthlyStats].reverse().map(({ monthKey, income, spent, rate }) => {
              const isCurrent = monthKey === currentMonth
              const date = parseMonthKey(monthKey)
              const monthName = date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
              
              return (
                <tr 
                  key={monthKey} 
                  className={cn(
                    'border-t border-border',
                    isCurrent && 'bg-accent'
                  )}
                >
                  <td className="p-3 text-foreground">
                    {monthName}
                    {isCurrent && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                        now
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right text-foreground">{formatCurrency(income, true)}</td>
                  <td className="p-3 text-right text-foreground">{formatCurrency(spent, true)}</td>
                  <td className="p-3 text-right">
                    <span className={cn(
                      'px-1.5 py-0.5 rounded-full text-xs text-white',
                      rate >= 20 ? 'bg-[var(--paisa-green)]' : 
                      rate >= 10 ? 'bg-[var(--paisa-amber)]' : 
                      'bg-[var(--paisa-red)]'
                    )}>
                      {rate}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Yearly View
function YearlyView({ state }: { state: AppState }) {
  // Group data by year
  const yearlyStats: { [year: string]: { income: number; spent: number; saved: number; months: number } } = {}
  
  for (const [monthKey, data] of Object.entries(state.monthlyData)) {
    const year = monthKey.split('-')[0]
    if (!yearlyStats[year]) {
      yearlyStats[year] = { income: 0, spent: 0, saved: 0, months: 0 }
    }
    const spent = getMonthlyExpenseTotal(data.expenses)
    yearlyStats[year].income += data.income
    yearlyStats[year].spent += spent
    yearlyStats[year].saved += data.income - spent
    yearlyStats[year].months++
  }
  
  const years = Object.keys(yearlyStats).sort()
  const currentYear = new Date().getFullYear().toString()
  const maxSpent = Math.max(...Object.values(yearlyStats).map(y => y.spent), 1)
  
  return (
    <div className="space-y-4">
      {/* Year Chart */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-medium text-foreground mb-3">Yearly Spending</h3>
        <div className="flex items-end gap-4 h-32 px-4">
          {years.map(year => {
            const stats = yearlyStats[year]
            const height = (stats.spent / maxSpent) * 100
            const isCurrent = year === currentYear
            
            return (
              <div key={year} className="flex-1 flex flex-col items-center">
                <div 
                  className={cn(
                    'w-full max-w-16 rounded-t transition-all',
                    isCurrent ? 'bg-[var(--paisa-amber)]' : 'bg-[var(--paisa-amber)]/40'
                  )}
                  style={{ height: `${Math.max(height, 8)}%` }}
                />
                <p className="mt-2 text-sm text-foreground">{year}</p>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Year Cards */}
      {years.reverse().map(year => {
        const stats = yearlyStats[year]
        const rate = getSavingsRate(stats.income, stats.spent)
        const isCurrent = year === currentYear
        
        return (
          <div 
            key={year} 
            className={cn(
              'bg-card border rounded-lg p-4',
              isCurrent ? 'border-primary' : 'border-border'
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-foreground">{year}</h3>
              <span className="text-xs text-muted-foreground">{stats.months} months</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Total income</p>
                <p className="font-medium text-foreground">{formatCurrency(stats.income, true)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total spent</p>
                <p className="font-medium text-foreground">{formatCurrency(stats.spent, true)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total saved</p>
                <p className="font-medium text-[var(--paisa-green)]">{formatCurrency(stats.saved, true)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Savings rate</p>
                <p className={cn(
                  'font-medium',
                  rate >= 20 ? 'text-[var(--paisa-green)]' : 'text-[var(--paisa-amber)]'
                )}>{rate}%</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Category View
function CategoryView({ state }: { state: AppState }) {
  const currentMonth = getCurrentMonthKey()
  const last6Months = getLastNMonths(6, currentMonth)
  
  // Calculate spending by category for each month
  const categoryData: { [cat: string]: number[] } = {}
  
  for (const monthKey of last6Months) {
    const data = state.monthlyData[monthKey]
    const byCategory = data ? getExpensesByCategory(data.expenses) : {}
    
    for (const cat of Object.keys(CATEGORY_INFO) as ExpenseCategory[]) {
      if (!categoryData[cat]) categoryData[cat] = []
      categoryData[cat].push(byCategory[cat] || 0)
    }
  }
  
  // Filter to categories with data
  const categoriesWithData = Object.entries(categoryData)
    .filter(([, amounts]) => amounts.some(a => a > 0))
    .map(([cat, amounts]) => {
      const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length
      const total = amounts.reduce((s, a) => s + a, 0)
      return { cat, amounts, avg, total }
    })
    .sort((a, b) => b.total - a.total)
  
  const formatMonthShort = (monthKey: string) => {
    const date = parseMonthKey(monthKey)
    return date.toLocaleDateString('en-IN', { month: 'short' })
  }
  
  return (
    <div className="space-y-3">
      {categoriesWithData.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No expense data yet</p>
        </div>
      ) : (
        categoriesWithData.map(({ cat, amounts, avg }) => {
          const info = CATEGORY_INFO[cat as ExpenseCategory]
          const max = Math.max(...amounts, 1)
          
          return (
            <div key={cat} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{info.icon}</span>
                  <span className="font-medium text-foreground">{info.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  Avg: {formatCurrency(avg, true)}
                </span>
              </div>
              
              {/* Mini bar chart */}
              <div className="flex items-end gap-1 h-12">
                {amounts.map((amount, i) => {
                  const height = (amount / max) * 100
                  const isCurrent = i === amounts.length - 1
                  
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div 
                        className={cn(
                          'w-full rounded-t transition-all',
                          isCurrent ? 'bg-primary' : 'bg-primary/30'
                        )}
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="flex mt-1 text-[10px] text-muted-foreground">
                {last6Months.map(mk => (
                  <div key={mk} className="flex-1 text-center">
                    {formatMonthShort(mk)}
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
