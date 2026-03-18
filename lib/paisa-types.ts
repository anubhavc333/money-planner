export type FamilyRole = 'husband' | 'wife' | 'son' | 'daughter' | 'parent' | 'other'

export type GoalType = 
  | 'emergency' 
  | 'home' 
  | 'car' 
  | 'education' 
  | 'retirement' 
  | 'travel' 
  | 'wedding' 
  | 'custom'

export type ExpenseCategory = 
  | 'housing' 
  | 'groceries' 
  | 'transport' 
  | 'utilities' 
  | 'healthcare' 
  | 'education' 
  | 'entertainment' 
  | 'shopping' 
  | 'dining' 
  | 'subscriptions' 
  | 'personal' 
  | 'other'

export interface FamilyMember {
  id: string
  name: string
  age?: number
  role: FamilyRole
  salary: number
  isPrimary: boolean
}

export interface Goal {
  id: string
  type: GoalType
  name: string
  targetAmount: number
  savedAmount: number
  icon: string
}

export interface Expense {
  id: string
  amount: number
  category: ExpenseCategory
  paidBy: string
  note?: string
  date: string
  monthKey: string
}

export interface MonthlyBudget {
  [key: string]: number
}

export interface MonthlyData {
  income: number
  expenses: Expense[]
  budgets: MonthlyBudget
}

export interface InvestmentAllocation {
  mutualFunds: number
  ppf: number
  fixedDeposits: number
  stocks: number
  gold: number
}

export interface MonthlySplit {
  needs: number
  wants: number
  save: number
}

export interface AppState {
  // User data
  currentUser: FamilyMember | null
  familyMembers: FamilyMember[]
  
  // Financial data
  existingSavings: number
  goals: Goal[]
  monthlySplit: MonthlySplit
  investmentAllocation: InvestmentAllocation
  
  // Monthly data indexed by YYYY-MM
  monthlyData: { [monthKey: string]: MonthlyData }
  
  // Current view state
  currentMonth: string
  activeTab: string
  
  // Onboarding state
  isOnboarded: boolean
}

export const CATEGORY_INFO: Record<ExpenseCategory, { icon: string; name: string; type: 'need' | 'want' }> = {
  housing: { icon: '🏠', name: 'Housing/Rent', type: 'need' },
  groceries: { icon: '🛒', name: 'Groceries', type: 'need' },
  transport: { icon: '🚌', name: 'Transport', type: 'need' },
  utilities: { icon: '⚡', name: 'Utilities', type: 'need' },
  healthcare: { icon: '🏥', name: 'Healthcare', type: 'need' },
  education: { icon: '📚', name: 'Education', type: 'need' },
  entertainment: { icon: '🎬', name: 'Entertainment', type: 'want' },
  shopping: { icon: '🛍', name: 'Shopping', type: 'want' },
  dining: { icon: '🍽', name: 'Dining', type: 'want' },
  subscriptions: { icon: '📱', name: 'Subscriptions', type: 'want' },
  personal: { icon: '💇', name: 'Personal Care', type: 'want' },
  other: { icon: '📦', name: 'Other', type: 'want' },
}

export const ROLE_INFO: Record<FamilyRole, { label: string; icon: string }> = {
  husband: { label: 'Husband', icon: '👨' },
  wife: { label: 'Wife', icon: '👩' },
  son: { label: 'Son', icon: '👦' },
  daughter: { label: 'Daughter', icon: '👧' },
  parent: { label: 'Parent', icon: '🧓' },
  other: { label: 'Other', icon: '👤' },
}

export const GOAL_INFO: Record<GoalType, { icon: string; name: string; defaultTarget: number }> = {
  emergency: { icon: '🛡', name: 'Emergency fund', defaultTarget: 0 },
  home: { icon: '🏠', name: 'Buy a home', defaultTarget: 5000000 },
  car: { icon: '🚗', name: 'Buy a car', defaultTarget: 1500000 },
  education: { icon: '🎓', name: "Children's education", defaultTarget: 3000000 },
  retirement: { icon: '☀', name: 'Retirement', defaultTarget: 20000000 },
  travel: { icon: '✈', name: 'Travel fund', defaultTarget: 500000 },
  wedding: { icon: '💍', name: 'Wedding fund', defaultTarget: 2000000 },
  custom: { icon: '⭐', name: 'Custom goal', defaultTarget: 0 },
}

// Database-backed types
export interface OnboardingData {
  userName: string
  dateOfBirth?: string // YYYY-MM-DD format
  userRole: FamilyRole
  monthlyIncome: number
  existingSavings: number
  householdName: string
  goals: { type: GoalType; targetAmount: number }[]
}

// Helper to calculate age from date of birth
export function calculateAge(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}
