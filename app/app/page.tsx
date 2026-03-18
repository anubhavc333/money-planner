"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

// Type for Android WebView bridge
interface AndroidWindow extends Window {
  AndroidBridge: {
    setUserId: (userId: string) => void
  }
}

import { usePaisaData, useJoinHousehold } from "@/hooks/use-paisa-data"
import { Onboarding } from "@/components/paisa/onboarding"
import { Dashboard } from "@/components/paisa/dashboard-db"
import { Spinner } from "@/components/ui/spinner"
import type { OnboardingData } from "@/lib/paisa-types"

// Helper — retries until AndroidBridge is injected by the WebView
function sendUserIdToAndroid(id: string | null) {
  if (!id || typeof window === "undefined") return

  const attempt = () => {
    const bridge = (window as AndroidWindow).AndroidBridge
    if (bridge) {
      try {
        bridge.setUserId(id)
      } catch (e) {
        console.error("AndroidBridge error:", e)
      }
    } else {
      // Bridge not injected yet — retry in 500ms
      setTimeout(attempt, 500)
    }
  }

  attempt()
}

export default function AppPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const {
    profile,
    household,
    settings,
    categories,
    expenses,
    goals,
    investments,
    detectedExpenses,
    householdMembers,
    isLoading,
    completeOnboarding,
    updateSettings,
    updateCategory,
    addExpense,
    deleteExpense,
    updateExpense,
    updateGoal,
    deleteGoal,
    addGoal,
    updateInvestment,
    addInvestment,
    deleteInvestment,
    confirmDetectedExpense,
    ignoreDetectedExpense,
    deleteDetectedExpense,
    clearAllDetectedExpenses,
    incomeHistory,
    addIncomeEntry,
    updateIncomeEntry,
    deleteIncomeEntry,
    deleteAccount,
    refetch,
  } = usePaisaData(userId)

  const { joinHousehold } = useJoinHousehold()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const id = user?.id ?? null
      setUserId(id)
      setLoading(false)
      sendUserIdToAndroid(id)
    }

    getUser()

    // FIX: Also fire on login/logout so Android always has the latest user_id
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user?.id ?? null
      setUserId(id)
      sendUserIdToAndroid(id)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleOnboardingComplete = async (data: OnboardingData) => {
    await completeOnboarding(data)
    refetch()
  }

  const handleJoinHousehold = async (
    inviteCode: string,
    userData: { name: string; role: string; monthlyIncome: number; dateOfBirth?: string }
  ) => {
    if (!userId) throw new Error("Not authenticated")
    await joinHousehold(userId, inviteCode, userData)
    refetch()
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-muted-foreground">Loading Money Planner...</p>
        </div>
      </div>
    )
  }

  if (!household) {
    return <Onboarding onComplete={handleOnboardingComplete} onJoinHousehold={handleJoinHousehold} />
  }

  return (
    <main className="max-w-[520px] mx-auto">
      <Dashboard
        profile={profile}
        household={household}
        settings={settings}
        categories={categories}
        expenses={expenses}
        goals={goals}
        investments={investments}
        detectedExpenses={detectedExpenses}
        householdMembers={householdMembers}
        onUpdateSettings={updateSettings}
        onUpdateCategory={updateCategory}
        onAddExpense={addExpense}
        onDeleteExpense={deleteExpense}
        onUpdateExpense={updateExpense}
        onUpdateGoal={updateGoal}
        onDeleteGoal={deleteGoal}
        onAddGoal={addGoal}
        onUpdateInvestment={updateInvestment}
        onAddInvestment={addInvestment}
        onDeleteInvestment={deleteInvestment}
        onConfirmDetectedExpense={confirmDetectedExpense}
        onIgnoreDetectedExpense={ignoreDetectedExpense}
        onDeleteDetectedExpense={deleteDetectedExpense}
        onClearAllDetectedExpenses={clearAllDetectedExpenses}
        incomeHistory={incomeHistory}
        onAddIncomeEntry={addIncomeEntry}
        onUpdateIncomeEntry={updateIncomeEntry}
        onDeleteIncomeEntry={deleteIncomeEntry}
        onDeleteAccount={deleteAccount}
        onRefetch={refetch}
      />
    </main>
  )
}
