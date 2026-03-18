import type { 
  AppState, 
  Expense, 
  ExpenseCategory, 
  MonthlyBudget,
  MonthlySplit,
  FamilyMember
} from './paisa-types'
import { CATEGORY_INFO } from './paisa-types'

// Currency formatting in Indian format
export function formatCurrency(amount: number, abbreviated = false): string {
  if (abbreviated) {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)}Cr`
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`
    }
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

// Get current month key
export function getCurrentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Parse month key to Date
export function parseMonthKey(monthKey: string): Date {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

// Format month key for display
export function formatMonthKey(monthKey: string): string {
  const date = parseMonthKey(monthKey)
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

// Get previous month key
export function getPrevMonthKey(monthKey: string): string {
  const date = parseMonthKey(monthKey)
  date.setMonth(date.getMonth() - 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// Get next month key
export function getNextMonthKey(monthKey: string): string {
  const date = parseMonthKey(monthKey)
  date.setMonth(date.getMonth() + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// Get last N months
export function getLastNMonths(n: number, fromMonth?: string): string[] {
  const months: string[] = []
  let current = fromMonth || getCurrentMonthKey()
  for (let i = 0; i < n; i++) {
    months.unshift(current)
    current = getPrevMonthKey(current)
  }
  return months
}

// Calculate total family income
export function getTotalFamilyIncome(members: FamilyMember[]): number {
  return members.reduce((sum, m) => sum + m.salary, 0)
}

// Calculate total expenses for a month
export function getMonthlyExpenseTotal(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0)
}

// Calculate expenses by category
export function getExpensesByCategory(expenses: Expense[]): Record<ExpenseCategory, number> {
  const result = {} as Record<ExpenseCategory, number>
  for (const cat of Object.keys(CATEGORY_INFO) as ExpenseCategory[]) {
    result[cat] = 0
  }
  for (const expense of expenses) {
    result[expense.category] += expense.amount
  }
  return result
}

// Calculate suggested budgets based on split
export function calculateSuggestedBudgets(
  totalIncome: number,
  split: MonthlySplit
): MonthlyBudget {
  const needsAmount = (totalIncome * split.needs) / 100
  const wantsAmount = (totalIncome * split.wants) / 100
  
  // Needs allocation (approximate percentages of needs budget)
  const needsCategories: Record<ExpenseCategory, number> = {
    housing: 0.56,      // 28% of total
    groceries: 0.24,    // 12% of total
    transport: 0.12,    // 6% of total
    utilities: 0.04,    // 2% of total
    healthcare: 0.02,   // 1% of total
    education: 0.02,    // 1% of total
    entertainment: 0,
    shopping: 0,
    dining: 0,
    subscriptions: 0,
    personal: 0,
    other: 0,
  }
  
  // Wants allocation
  const wantsCategories: Record<ExpenseCategory, number> = {
    housing: 0,
    groceries: 0,
    transport: 0,
    utilities: 0,
    healthcare: 0,
    education: 0,
    entertainment: 0.25,
    shopping: 0.25,
    dining: 0.20,
    subscriptions: 0.10,
    personal: 0.10,
    other: 0.10,
  }
  
  const budgets: MonthlyBudget = {}
  for (const cat of Object.keys(CATEGORY_INFO) as ExpenseCategory[]) {
    budgets[cat] = Math.round(
      needsAmount * needsCategories[cat] + wantsAmount * wantsCategories[cat]
    )
  }
  return budgets
}

// Generate sample expenses for a month
export function generateSampleExpenses(
  monthKey: string,
  budgets: MonthlyBudget,
  members: FamilyMember[]
): Expense[] {
  const expenses: Expense[] = []
  const date = parseMonthKey(monthKey)
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  
  // Generate 15-25 expenses per month
  const numExpenses = 15 + Math.floor(Math.random() * 10)
  
  const categories = Object.keys(budgets) as ExpenseCategory[]
  const primaryMember = members.find(m => m.isPrimary) || members[0]
  
  for (let i = 0; i < numExpenses; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)]
    const budget = budgets[category] || 0
    if (budget === 0) continue
    
    // Generate amount between 5% and 30% of category budget
    const amount = Math.round(budget * (0.05 + Math.random() * 0.25))
    const day = 1 + Math.floor(Math.random() * daysInMonth)
    const expenseDate = new Date(date.getFullYear(), date.getMonth(), day)
    
    expenses.push({
      id: `${monthKey}-${i}`,
      amount,
      category,
      paidBy: members.length > 1 && Math.random() > 0.7 
        ? members[Math.floor(Math.random() * members.length)].id 
        : primaryMember.id,
      date: expenseDate.toISOString().split('T')[0],
      monthKey,
    })
  }
  
  return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

// Seed initial data
export function seedInitialData(state: AppState): AppState {
  const currentMonth = getCurrentMonthKey()
  const totalIncome = getTotalFamilyIncome(state.familyMembers)
  const suggestedBudgets = calculateSuggestedBudgets(totalIncome, state.monthlySplit)
  
  const monthlyData = { ...state.monthlyData }
  
  // Generate 12 months of data
  let month = currentMonth
  for (let i = 0; i < 12; i++) {
    // Slight variation in budgets per month
    const monthBudgets = { ...suggestedBudgets }
    for (const cat of Object.keys(monthBudgets) as ExpenseCategory[]) {
      monthBudgets[cat] = Math.round(monthBudgets[cat] * (0.9 + Math.random() * 0.2))
    }
    
    const expenses = generateSampleExpenses(month, monthBudgets, state.familyMembers)
    
    monthlyData[month] = {
      income: totalIncome,
      expenses,
      budgets: suggestedBudgets,
    }
    
    month = getPrevMonthKey(month)
  }
  
  // Update goals with saved amounts based on cumulative savings
  const goals = state.goals.map(goal => {
    // Calculate cumulative savings
    let totalSaved = state.existingSavings
    for (const mk of Object.keys(monthlyData)) {
      const data = monthlyData[mk]
      const spent = getMonthlyExpenseTotal(data.expenses)
      const saved = data.income - spent
      totalSaved += Math.max(0, saved)
    }
    
    // Distribute savings across goals proportionally
    const goalShare = totalSaved / state.goals.length
    return {
      ...goal,
      savedAmount: Math.min(goalShare, goal.targetAmount),
    }
  })
  
  return {
    ...state,
    monthlyData,
    goals,
    currentMonth,
  }
}

// Calculate savings rate
export function getSavingsRate(income: number, expenses: number): number {
  if (income === 0) return 0
  return Math.round(((income - expenses) / income) * 100)
}

// Calculate projection with compound interest
export function calculateProjection(
  monthlyInvestment: number,
  years: number,
  annualRate = 0.10
): number {
  const monthlyRate = annualRate / 12
  const months = years * 12
  // Future value of annuity formula
  return Math.round(
    monthlyInvestment * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
  )
}

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}
