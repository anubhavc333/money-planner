"use client"

import { useCallback } from "react"
import useSWR, { mutate } from "swr"
import { createClient } from "@/lib/supabase/client"

// Income history type
export interface IncomeEntry {
  id: string
  household_id: string
  user_id: string
  amount: number
  type: "salary" | "increment" | "bonus" | "other"
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
      return data as IncomeEntry[]
    }
  )

  const addIncomeEntry = useCallback(async (entry: Omit<IncomeEntry, "id" | "created_at" | "household_id" | "user_id">) => {
    if (!householdId || !userId) return
    const { error } = await supabase
      .from("income_history")
      .insert({ ...entry, household_id: householdId, user_id: userId })
    if (error) throw error
    mutate(`income-history-${householdId}`)
  }, [supabase, householdId, userId])

  const updateIncomeEntry = useCallback(async (id: string, updates: Partial<IncomeEntry>) => {
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
