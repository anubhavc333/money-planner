"use client"

import { useEffect, useState, useCallback } from "react"
import useSWR, { mutate } from "swr"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

// Types for database records
export interface Profile {
  id: string
  household_id: string | null
  name: string
  role: string
  avatar_url: string | null
  monthly_income: number
  created_at: string
}

export interface Household {
  id: string
  name: string
  invite_code: string
  created_at: string
}

export interface HouseholdSettings {
  id: string
  household_id: string
  needs_percent: number
  wants_percent: number
  savings_percent: number
  currency: string
}

export interface BudgetCategory {
  id: string
  household_id: string
  name: string
  icon: string | null
  budget_type: "needs" | "wants" | "savings"
  budgeted_amount: number
}

export interface Expense {
  id: string
  household_id: string
  user_id: string
  category_id: string | null
  category_name: string
  amount: number
  description: string | null
  expense_date: string
  created_at: string
  profiles?: { name: string }
}

export interface Goal {
  id: string
  household_id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  icon: string | null
}

export interface Investment {
  id: string
  household_id: string
  type: "mutual_funds" | "ppf" | "fd" | "stocks" | "gold" | "other"
  name: string
  monthly_sip: number
  current_value: number
  expected_return?: number
  investment_date: string
}

// Custom hook for auth state
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = "/auth/login"
  }

  return { user, loading, signOut }
}

// Custom hook for profile data
export function useProfile(userId: string | undefined) {
  const supabase = createClient()
  
  const { data: profile, error, isLoading } = useSWR(
    userId ? `profile-${userId}` : null,
    async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .single()
      if (error) throw error
      return data as Profile
    }
  )

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId!)
    if (error) throw error
    mutate(`profile-${userId}`)
  }, [supabase, userId])

  return { profile, error, isLoading, updateProfile }
}

// Custom hook for household data
export function useHousehold(householdId: string | undefined) {
  const supabase = createClient()
  
  const { data: household, error, isLoading } = useSWR(
    householdId ? `household-${householdId}` : null,
    async () => {
      const { data, error } = await supabase
        .from("households")
        .select("*")
        .eq("id", householdId!)
        .single()
      if (error) throw error
      return data as Household
    }
  )

  return { household, error, isLoading }
}

// Custom hook for household settings
export function useHouseholdSettings(householdId: string | undefined) {
  const supabase = createClient()
  
  const { data: settings, error, isLoading } = useSWR(
    householdId ? `settings-${householdId}` : null,
    async () => {
      const { data, error } = await supabase
        .from("household_settings")
        .select("*")
        .eq("household_id", householdId!)
        .single()
      if (error && error.code !== "PGRST116") throw error
      return data as HouseholdSettings | null
    }
  )

  const updateSettings = useCallback(async (updates: Partial<HouseholdSettings>) => {
    if (!householdId) {
      console.error("[v0] updateSettings: no householdId")
      return
    }
    
    console.log("[v0] updateSettings called with:", { householdId, updates })
    
    const { data, error } = await supabase
      .from("household_settings")
      .upsert(
        { household_id: householdId, ...updates },
        { onConflict: 'household_id' }
      )
      .select()
    
    console.log("[v0] updateSettings response:", { data, error })
    
    if (error) {
      console.error("[v0] Error updating settings:", error)
      throw error
    }
    mutate(`settings-${householdId}`)
  }, [supabase, householdId])

  return { settings, error, isLoading, updateSettings }
}

// Custom hook for household members
export function useHouseholdMembers(householdId: string | undefined) {
  const supabase = createClient()
  
  const { data: members, error, isLoading } = useSWR(
    householdId ? `members-${householdId}` : null,
    async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("household_id", householdId!)
      if (error) throw error
      return data as Profile[]
    }
  )

  return { members: members || [], error, isLoading }
}

// Custom hook for budget categories
export function useBudgetCategories(householdId: string | undefined) {
  const supabase = createClient()
  
  const { data: categories, error, isLoading } = useSWR(
    householdId ? `categories-${householdId}` : null,
    async () => {
      const { data, error } = await supabase
        .from("budget_categories")
        .select("*")
        .eq("household_id", householdId!)
      if (error) throw error
      return data as BudgetCategory[]
    }
  )

  const updateCategory = useCallback(async (id: string, updates: Partial<BudgetCategory>) => {
    const { error } = await supabase
      .from("budget_categories")
      .update(updates)
      .eq("id", id)
    if (error) throw error
    mutate(`categories-${householdId}`)
  }, [supabase, householdId])

  const addCategory = useCallback(async (category: Omit<BudgetCategory, "id">) => {
    const { error } = await supabase
      .from("budget_categories")
      .insert(category)
    if (error) throw error
    mutate(`categories-${householdId}`)
  }, [supabase, householdId])

  return { categories: categories || [], error, isLoading, updateCategory, addCategory }
}

// Custom hook for expenses
export function useExpenses(householdId: string | undefined, month?: string) {
  const supabase = createClient()
  
  const { data: expenses, error, isLoading } = useSWR(
    householdId ? `expenses-${householdId}-${month || "all"}` : null,
    async () => {
      let query = supabase
        .from("expenses")
        .select("*")
        .eq("household_id", householdId!)
        .order("expense_date", { ascending: false })
      
      if (month) {
        const [year, monthNum] = month.split("-")
        const startDate = `${year}-${monthNum}-01`
        // Get last day of month: day 0 of next month = last day of current month
        const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate()
        const endDate = `${year}-${monthNum}-${lastDay.toString().padStart(2, '0')}`
        query = query.gte("expense_date", startDate).lte("expense_date", endDate)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data as Expense[]
    }
  )

  const addExpense = useCallback(async (expense: Omit<Expense, "id" | "created_at" | "profiles">) => {
    const { error } = await supabase
      .from("expenses")
      .insert(expense)
    if (error) throw error
    mutate(`expenses-${householdId}-${month || "all"}`)
    mutate(`expenses-${householdId}-all`)
  }, [supabase, householdId, month])

  const deleteExpense = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id)
    if (error) throw error
    mutate(`expenses-${householdId}-${month || "all"}`)
    mutate(`expenses-${householdId}-all`)
  }, [supabase, householdId, month])

  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    const { error } = await supabase
      .from("expenses")
      .update(updates)
      .eq("id", id)
    if (error) throw error
    mutate(`expenses-${householdId}-${month || "all"}`)
    mutate(`expenses-${householdId}-all`)
  }, [supabase, householdId, month])

  return { expenses: expenses || [], error, isLoading, addExpense, deleteExpense, updateExpense }
}

// Custom hook for goals
export function useGoals(householdId: string | undefined) {
  const supabase = createClient()
  
  const { data: goals, error, isLoading } = useSWR(
    householdId ? `goals-${householdId}` : null,
    async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("household_id", householdId!)
      if (error) throw error
      return data as Goal[]
    }
  )

  const updateGoal = useCallback(async (id: string, updates: Partial<Goal>) => {
    const { error } = await supabase
      .from("goals")
      .update(updates)
      .eq("id", id)
    if (error) throw error
    mutate(`goals-${householdId}`)
  }, [supabase, householdId])

  const addGoal = useCallback(async (goal: Omit<Goal, "id">) => {
    const { error } = await supabase
      .from("goals")
      .insert(goal)
    if (error) throw error
    mutate(`goals-${householdId}`)
  }, [supabase, householdId])

  const deleteGoal = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", id)
    if (error) throw error
    mutate(`goals-${householdId}`)
  }, [supabase, householdId])

  return { goals: goals || [], error, isLoading, updateGoal, addGoal, deleteGoal }
}

// Custom hook for investments
export function useInvestments(householdId: string | undefined) {
  const supabase = createClient()
  
  const { data: investments, error, isLoading } = useSWR(
    householdId ? `investments-${householdId}` : null,
    async () => {
      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .eq("household_id", householdId!)
      if (error) throw error
      return data as Investment[]
    }
  )

  const updateInvestment = useCallback(async (id: string, updates: Partial<Investment>) => {
    const { error } = await supabase
      .from("investments")
      .update(updates)
      .eq("id", id)
    if (error) throw error
    mutate(`investments-${householdId}`)
  }, [supabase, householdId])

  const addInvestment = useCallback(async (investment: Omit<Investment, "id">) => {
    if (!householdId) return
    const { error } = await supabase
      .from("investments")
      .insert({ ...investment, household_id: householdId })
    if (error) throw error
    mutate(`investments-${householdId}`)
  }, [supabase, householdId])

  const deleteInvestment = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("investments")
      .delete()
      .eq("id", id)
    if (error) throw error
    mutate(`investments-${householdId}`)
  }, [supabase, householdId])

  return { investments: investments || [], error, isLoading, updateInvestment, addInvestment, deleteInvestment }
}

// Income History type (no salary - that's the base monthly_income in profile)
export interface IncomeHistory {
  id: string
  household_id: string
  user_id: string
  amount: number
  type: "increment" | "bonus" | "other"
  effective_date: string
  note: string | null
  created_at: string
}

// Custom hook for income history
export function useIncomeHistory(householdId: string | undefined, userId: string | undefined) {
  const supabase = createClient()
  
  const { data: incomeHistory, error, isLoading } = useSWR(
    householdId ? `income-history-${householdId}` : null,
    async () => {
      const { data, error } = await supabase
        .from("income_history")
        .select("*")
        .eq("household_id", householdId!)
        .order("effective_date", { ascending: false })
      if (error) throw error
      return data as IncomeHistory[]
    }
  )

  const addIncomeEntry = useCallback(async (entry: {
    amount: number
    type: "increment" | "bonus" | "other"
    effective_date: string
    note?: string
  }) => {
    if (!householdId || !userId) return
    const { error } = await supabase
      .from("income_history")
      .insert({ 
        ...entry, 
        household_id: householdId,
        user_id: userId 
      })
    if (error) throw error
    mutate(`income-history-${householdId}`)
  }, [supabase, householdId, userId])

  const updateIncomeEntry = useCallback(async (id: string, updates: Partial<IncomeHistory>) => {
    const { error } = await supabase
      .from("income_history")
      .update(updates)
      .eq("id", id)
    if (error) throw error
    mutate(`income-history-${householdId}`)
  }, [supabase, householdId])

  const deleteIncomeEntry = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("income_history")
      .delete()
      .eq("id", id)
    if (error) throw error
    mutate(`income-history-${householdId}`)
  }, [supabase, householdId])

  return { 
    incomeHistory: incomeHistory || [], 
    error, 
    isLoading,
    addIncomeEntry,
    updateIncomeEntry,
    deleteIncomeEntry
  }
}

// Detected expense type
export interface DetectedExpense {
  id: string
  household_id: string
  user_id: string
  amount: string
  merchant: string | null
  category: string | null
  raw_sms: string
  status: "pending" | "confirmed" | "ignored"
  transaction_date: string | null
  created_at: string
}

// Custom hook for detected expenses (SMS-based)
export function useDetectedExpenses(householdId: string | undefined) {
  const supabase = createClient()
  
  const { data: detectedExpenses, error, isLoading } = useSWR(
    householdId ? `detected-expenses-${householdId}` : null,
    async () => {
      const { data, error } = await supabase
        .from("detected_expenses")
        .select("*")
        .eq("household_id", householdId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
      if (error) throw error
      return data as DetectedExpense[]
    }
  )

  const confirmExpense = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("detected_expenses")
      .update({ status: "confirmed" })
      .eq("id", id)
    if (error) throw error
    mutate(`detected-expenses-${householdId}`)
  }, [supabase, householdId])

  const ignoreExpense = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("detected_expenses")
      .update({ status: "ignored" })
      .eq("id", id)
    if (error) throw error
    mutate(`detected-expenses-${householdId}`)
  }, [supabase, householdId])

  const deleteDetectedExpense = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("detected_expenses")
      .delete()
      .eq("id", id)
    if (error) throw error
    mutate(`detected-expenses-${householdId}`)
  }, [supabase, householdId])

  const clearAllDetectedExpenses = useCallback(async () => {
    if (!householdId) return
    const { error } = await supabase
      .from("detected_expenses")
      .delete()
      .eq("household_id", householdId)
      .eq("status", "pending")
    if (error) throw error
    mutate(`detected-expenses-${householdId}`)
  }, [supabase, householdId])

  return { 
    detectedExpenses: detectedExpenses || [], 
    error, 
    isLoading, 
    confirmExpense, 
    ignoreExpense,
    deleteDetectedExpense,
    clearAllDetectedExpenses
  }
}

// Hook for creating a new household during onboarding
export function useCreateHousehold() {
  const supabase = createClient()
  
  const createHousehold = useCallback(async (
    userId: string,
    data: {
      householdName: string
      userName: string
      userRole: string
      monthlyIncome: number
      dateOfBirth?: string | null
      needsPercent: number
      wantsPercent: number
      savingsPercent: number
      goals: Array<{ name: string; targetAmount: number; icon?: string }>
      categories: Array<{ name: string; icon: string; budgetType: "needs" | "wants" | "savings"; budgetedAmount: number }>
    }
  ) => {
    // 1. Setup household using security definer function (bypasses RLS)
    const { data: householdId, error: setupError } = await supabase
      .rpc("setup_household", {
        p_user_id: userId,
        p_household_name: data.householdName,
        p_user_name: data.userName,
        p_user_role: data.userRole,
        p_monthly_income: data.monthlyIncome,
        p_date_of_birth: data.dateOfBirth || null,
        p_needs_percent: data.needsPercent,
        p_wants_percent: data.wantsPercent,
        p_savings_percent: data.savingsPercent,
      })
    
    if (setupError) throw setupError

    // 2. Add budget categories using security definer function
    for (const cat of data.categories) {
      const { error: catError } = await supabase
        .rpc("add_budget_category", {
          p_household_id: householdId,
          p_name: cat.name,
          p_icon: cat.icon,
          p_budget_type: cat.budgetType,
          p_budgeted_amount: cat.budgetedAmount,
        })
      if (catError) throw catError
    }

    // 3. Add goals using security definer function
    for (const goal of data.goals) {
      const { error: goalError } = await supabase
        .rpc("add_goal", {
          p_household_id: householdId,
          p_name: goal.name,
          p_target_amount: goal.targetAmount,
          p_icon: goal.icon || null,
        })
      if (goalError) throw goalError
    }

    return { id: householdId }
  }, [supabase])

  return { createHousehold }
}

// Hook for joining a household via invite code
export function useJoinHousehold() {
  const supabase = createClient()
  
  const joinHousehold = useCallback(async (
    userId: string,
    inviteCode: string,
    userData: { name: string; role: string; monthlyIncome: number; dateOfBirth?: string }
  ) => {
    // Use security definer function to join household (bypasses RLS)
    const { data: householdId, error } = await supabase
      .rpc("join_household_by_code", {
        p_user_id: userId,
        p_invite_code: inviteCode,
        p_user_name: userData.name,
        p_user_role: userData.role,
        p_monthly_income: userData.monthlyIncome,
        p_date_of_birth: userData.dateOfBirth || null,
      })
    
    if (error) {
      if (error.message.includes("Invalid invite code")) {
        throw new Error("Invalid invite code. Please check and try again.")
      }
      throw error
    }

    return { id: householdId }
  }, [supabase])

  return { joinHousehold }
}

// Main hook combining all data
import type { OnboardingData, GoalType, GOAL_INFO as GoalInfo } from "@/lib/paisa-types"
import { GOAL_INFO, CATEGORY_INFO } from "@/lib/paisa-types"

export function usePaisaData(userId: string | null) {
  const supabase = createClient()
  
  // Get profile
  const { profile, isLoading: profileLoading, updateProfile } = useProfile(userId || undefined)
  
  // Get household data based on profile's household_id
  const householdId = profile?.household_id || undefined
  const { household, isLoading: householdLoading } = useHousehold(householdId)
  const { settings, updateSettings } = useHouseholdSettings(householdId)
  const { members: householdMembers } = useHouseholdMembers(householdId)
  const { categories, updateCategory: updateCategoryRaw, addCategory } = useBudgetCategories(householdId)
  const { expenses, addExpense: addExpenseRaw, deleteExpense: deleteExpenseRaw, updateExpense: updateExpenseRaw } = useExpenses(householdId)
  const { goals, updateGoal: updateGoalRaw, addGoal, deleteGoal: deleteGoalRaw } = useGoals(householdId)
  const { investments, updateInvestment: updateInvestmentRaw, addInvestment, deleteInvestment: deleteInvestmentRaw } = useInvestments(householdId)
  const { detectedExpenses, confirmExpense, ignoreExpense, deleteDetectedExpense, clearAllDetectedExpenses } = useDetectedExpenses(householdId)
  const { incomeHistory, addIncomeEntry, updateIncomeEntry, deleteIncomeEntry } = useIncomeHistory(householdId, userId || undefined)
  
  const { createHousehold } = useCreateHousehold()
  
  const isLoading = profileLoading || householdLoading
  
  // Refetch all data
  const refetch = useCallback(() => {
    mutate(`profile-${userId}`)
    if (householdId) {
      mutate(`household-${householdId}`)
      mutate(`settings-${householdId}`)
      mutate(`members-${householdId}`)
      mutate(`categories-${householdId}`)
      mutate(`expenses-${householdId}-all`)
      mutate(`goals-${householdId}`)
      mutate(`investments-${householdId}`)
      mutate(`detected-expenses-${householdId}`)
      mutate(`income-history-${householdId}`)
    }
  }, [userId, householdId])
  
  // Delete user account (completely removes user from auth and database)
  const deleteAccount = useCallback(async () => {
    if (!userId) return
    
    // Call the server-side API to delete the account
    const response = await fetch("/api/delete-account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })
    
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || "Failed to delete account")
    }
    
    // Redirect to login page
    window.location.href = "/auth/login"
  }, [userId])
  
  // Complete onboarding - create household and initial data
  const completeOnboarding = useCallback(async (data: OnboardingData) => {
    if (!userId) return
    
    // Default budget categories
    const defaultCategories = [
      { name: "Housing", icon: "🏠", budgetType: "needs" as const, budgetedAmount: Math.round(data.monthlyIncome * 0.25) },
      { name: "Groceries", icon: "🛒", budgetType: "needs" as const, budgetedAmount: Math.round(data.monthlyIncome * 0.10) },
      { name: "Transport", icon: "🚌", budgetType: "needs" as const, budgetedAmount: Math.round(data.monthlyIncome * 0.08) },
      { name: "Utilities", icon: "⚡", budgetType: "needs" as const, budgetedAmount: Math.round(data.monthlyIncome * 0.05) },
      { name: "Healthcare", icon: "🏥", budgetType: "needs" as const, budgetedAmount: Math.round(data.monthlyIncome * 0.02) },
      { name: "Education", icon: "📚", budgetType: "needs" as const, budgetedAmount: 0 },
      { name: "Entertainment", icon: "🎬", budgetType: "wants" as const, budgetedAmount: Math.round(data.monthlyIncome * 0.05) },
      { name: "Shopping", icon: "🛍", budgetType: "wants" as const, budgetedAmount: Math.round(data.monthlyIncome * 0.08) },
      { name: "Dining", icon: "🍽", budgetType: "wants" as const, budgetedAmount: Math.round(data.monthlyIncome * 0.05) },
      { name: "Subscriptions", icon: "📱", budgetType: "wants" as const, budgetedAmount: Math.round(data.monthlyIncome * 0.02) },
      { name: "Personal", icon: "💇", budgetType: "wants" as const, budgetedAmount: Math.round(data.monthlyIncome * 0.05) },
      { name: "Other", icon: "📦", budgetType: "wants" as const, budgetedAmount: Math.round(data.monthlyIncome * 0.05) },
    ]
    
    // Map goals
    const goalsMapped = data.goals.map(g => ({
      name: GOAL_INFO[g.type].name,
      targetAmount: g.targetAmount,
      icon: GOAL_INFO[g.type].icon,
    }))
    
    await createHousehold(userId, {
      householdName: data.householdName,
      userName: data.userName,
      userRole: data.userRole,
      monthlyIncome: data.monthlyIncome,
      dateOfBirth: data.dateOfBirth || null,
      needsPercent: 50,
      wantsPercent: 30,
      savingsPercent: 20,
      goals: goalsMapped,
      categories: defaultCategories,
    })
  }, [userId, createHousehold])
  
  // Wrapper for updateSettings
  const updateSettingsWrapper = useCallback(async (updates: Partial<{
    needs_percent: number
    wants_percent: number
    savings_percent: number
  }>) => {
    await updateSettings(updates)
  }, [updateSettings])
  
  // Wrapper for updateCategory
  const updateCategoryWrapper = useCallback(async (id: string, amount: number) => {
    await updateCategoryRaw(id, { budgeted_amount: amount })
  }, [updateCategoryRaw])
  
  // Wrapper for addExpense
  const addExpenseWrapper = useCallback(async (expense: {
    category_name: string
    amount: number
    description?: string
    expense_date?: string
  }) => {
    if (!userId || !householdId) return
    await addExpenseRaw({
      household_id: householdId,
      user_id: userId,
      category_id: null,
      category_name: expense.category_name,
      amount: expense.amount,
      description: expense.description || null,
      expense_date: expense.expense_date || new Date().toISOString().split("T")[0],
    })
  }, [userId, householdId, addExpenseRaw])
  
  // Wrapper for deleteExpense
  const deleteExpenseWrapper = useCallback(async (id: string) => {
    await deleteExpenseRaw(id)
  }, [deleteExpenseRaw])
  
  // Wrapper for updateGoal
  const updateGoalWrapper = useCallback(async (id: string, updates: Partial<Goal>) => {
    await updateGoalRaw(id, updates)
  }, [updateGoalRaw])
  
  // Wrapper for deleteGoal
  const deleteGoalWrapper = useCallback(async (id: string) => {
    await deleteGoalRaw(id)
  }, [deleteGoalRaw])
  
  // Wrapper for addGoal
  const addGoalWrapper = useCallback(async (goal: Omit<Goal, "id">) => {
    if (!householdId) return
    await addGoal({
      ...goal,
      household_id: householdId,
    })
  }, [householdId, addGoal])
  
  // Wrapper for updateInvestment
  const updateInvestmentWrapper = useCallback(async (id: string, updates: Partial<Investment>) => {
    await updateInvestmentRaw(id, updates)
  }, [updateInvestmentRaw])
  
  return {
    profile,
    household,
    settings,
    categories,
    expenses,
    goals,
    investments,
    detectedExpenses,
    incomeHistory,
    householdMembers,
    isLoading,
    completeOnboarding,
    updateSettings: updateSettingsWrapper,
    updateCategory: updateCategoryWrapper,
    addExpense: addExpenseWrapper,
    deleteExpense: deleteExpenseWrapper,
    updateExpense: updateExpenseRaw,
    updateGoal: updateGoalWrapper,
    deleteGoal: deleteGoalWrapper,
    addGoal: addGoalWrapper,
    updateInvestment: updateInvestmentWrapper,
    addInvestment,
    deleteInvestment: deleteInvestmentRaw,
    confirmDetectedExpense: confirmExpense,
    ignoreDetectedExpense: ignoreExpense,
    deleteDetectedExpense,
    clearAllDetectedExpenses,
    addIncomeEntry,
    updateIncomeEntry,
    deleteIncomeEntry,
    deleteAccount,
    refetch,
  }
  }
