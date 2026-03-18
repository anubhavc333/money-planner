'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { 
  FamilyRole, 
  GoalType, 
  OnboardingData
} from '@/lib/paisa-types'
import { ROLE_INFO, GOAL_INFO, calculateAge } from '@/lib/paisa-types'
import { formatCurrency } from '@/lib/paisa-utils'

interface OnboardingProps {
  onComplete: (data: OnboardingData) => void | Promise<void>
  onJoinHousehold?: (inviteCode: string, userData: { name: string; role: string; monthlyIncome: number; dateOfBirth?: string }) => void | Promise<void>
}

export function Onboarding({ onComplete, onJoinHousehold }: OnboardingProps) {
  const [step, setStep] = useState(1)
  const [householdMode, setHouseholdMode] = useState<'create' | 'join' | null>(null)
  
  // Step 1
  const [name, setName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  
  // Step 2
  const [role, setRole] = useState<FamilyRole | null>(null)
  
  // Step 3
  const [salary, setSalary] = useState('')
  const [savings, setSavings] = useState('')
  
  // Step 4
  const [selectedGoals, setSelectedGoals] = useState<GoalType[]>([])
  const [customGoalAmount, setCustomGoalAmount] = useState('')
  
  // Join household
  const [inviteCode, setInviteCode] = useState('')
  const [joinError, setJoinError] = useState('')
  
  const canContinue = () => {
    switch (step) {
      case 1: return name.trim() !== '' && dateOfBirth !== ''
      case 2: return role !== null
      case 3: return salary !== '' && parseInt(salary) > 0 && householdMode !== null
      case 4: 
        if (householdMode === 'join') return inviteCode.trim().length >= 6
        return selectedGoals.length > 0
      case 5: return true
      default: return false
    }
  }
  
  const userAge = calculateAge(dateOfBirth)
  
  const handleComplete = () => {
    const salaryNum = parseInt(salary) || 0
    const savingsNum = parseInt(savings) || 0
    
    const goals = selectedGoals.map(type => {
      let targetAmount = GOAL_INFO[type].defaultTarget
      if (type === 'emergency') {
        targetAmount = salaryNum * 6
      } else if (type === 'custom') {
        targetAmount = parseInt(customGoalAmount) || 500000
      }
      return { type, targetAmount }
    })
    
    onComplete({
      userName: name.trim(),
      dateOfBirth: dateOfBirth || undefined,
      userRole: role!,
      monthlyIncome: salaryNum,
      existingSavings: savingsNum,
      householdName: `${name.trim()}'s Family`,
      goals,
    })
  }
  
  const handleJoinHousehold = async () => {
    if (!onJoinHousehold) return
    setJoinError('')
    try {
      await onJoinHousehold(inviteCode.trim(), {
        name: name.trim(),
        role: role!,
        monthlyIncome: parseInt(salary) || 0,
        dateOfBirth: dateOfBirth || undefined,
      })
    } catch (error: unknown) {
      setJoinError(error instanceof Error ? error.message : 'Invalid invite code')
    }
  }
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="flex gap-1 p-4">
        {[1, 2, 3, 4, 5].map(s => (
          <div
            key={s}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              s <= step ? 'bg-primary' : 'bg-muted'
            )}
          />
        ))}
      </div>
      
      <div className="flex-1 px-4 pb-24 overflow-auto">
        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-3 py-4">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                <svg className="w-9 h-9 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-foreground">Welcome to Money Planner</h1>
              <p className="text-muted-foreground">Let's set up your family financial plan</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">What's your name?</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Date of birth</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={e => setDateOfBirth(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {userAge !== null && (
                  <p className="text-sm text-muted-foreground">Age: {userAge} years</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Step 2: Family role */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">Your role in the family</h1>
              <p className="text-muted-foreground">This helps personalize your experience</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(ROLE_INFO) as FamilyRole[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={cn(
                    'p-4 rounded-lg border-2 text-left transition-all',
                    role === r 
                      ? 'border-primary bg-accent' 
                      : 'border-border bg-card hover:border-muted-foreground'
                  )}
                >
                  <span className="text-2xl">{ROLE_INFO[r].icon}</span>
                  <p className="mt-2 font-medium text-foreground">{ROLE_INFO[r].label}</p>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Step 3: Income & Household Choice */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">Your income</h1>
              <p className="text-muted-foreground">We'll use this to create your budget</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Monthly salary (after tax)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <input
                    type="number"
                    value={salary}
                    onChange={e => setSalary(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-3 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Existing savings / investments</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <input
                    type="number"
                    value={savings}
                    onChange={e => setSavings(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-3 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
            
            {/* Household Mode Selection */}
            <div className="space-y-3 pt-4 border-t border-border">
              <p className="text-sm font-medium text-foreground">Household Setup</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setHouseholdMode('create')}
                  className={cn(
                    'p-4 rounded-lg border-2 text-left transition-all',
                    householdMode === 'create' 
                      ? 'border-primary bg-accent' 
                      : 'border-border bg-card hover:border-muted-foreground'
                  )}
                >
                  <span className="text-2xl">🏠</span>
                  <p className="mt-2 font-medium text-foreground text-sm">Create New</p>
                  <p className="text-xs text-muted-foreground">Start a new household</p>
                </button>
                <button
                  onClick={() => setHouseholdMode('join')}
                  className={cn(
                    'p-4 rounded-lg border-2 text-left transition-all',
                    householdMode === 'join' 
                      ? 'border-primary bg-accent' 
                      : 'border-border bg-card hover:border-muted-foreground'
                  )}
                >
                  <span className="text-2xl">👨‍👩‍👧‍👦</span>
                  <p className="mt-2 font-medium text-foreground text-sm">Join Family</p>
                  <p className="text-xs text-muted-foreground">Use invite code</p>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Step 4: Goals (create) or Invite Code (join) */}
        {step === 4 && householdMode === 'join' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">Join your family</h1>
              <p className="text-muted-foreground">Enter the invite code shared by your family member</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Invite Code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={e => {
                    setInviteCode(e.target.value)
                    setJoinError('')
                  }}
                  placeholder="e.g. abc12def"
                  maxLength={10}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-lg tracking-wider text-center"
                />
              </div>
              
              {joinError && (
                <p className="text-sm text-destructive">{joinError}</p>
              )}
              
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Ask the primary account holder to share the invite code from their Family tab.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {step === 4 && householdMode !== 'join' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">Financial goals</h1>
              <p className="text-muted-foreground">Select all that apply</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(GOAL_INFO) as GoalType[]).map(type => {
                const info = GOAL_INFO[type]
                const isSelected = selectedGoals.includes(type)
                const salaryNum = parseInt(salary) || 50000
                
                let targetDisplay = ''
                if (type === 'emergency') {
                  targetDisplay = `(6x salary = ${formatCurrency(salaryNum * 6, true)})`
                } else if (type !== 'custom' && info.defaultTarget > 0) {
                  targetDisplay = `(${formatCurrency(info.defaultTarget, true)})`
                }
                
                return (
                  <button
                    key={type}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedGoals(selectedGoals.filter(g => g !== type))
                      } else {
                        setSelectedGoals([...selectedGoals, type])
                      }
                    }}
                    className={cn(
                      'p-4 rounded-lg border-2 text-left transition-all',
                      isSelected 
                        ? 'border-primary bg-accent' 
                        : 'border-border bg-card hover:border-muted-foreground'
                    )}
                  >
                    <span className="text-2xl">{info.icon}</span>
                    <p className="mt-2 font-medium text-foreground text-sm">{info.name}</p>
                    {targetDisplay && (
                      <p className="text-xs text-muted-foreground">{targetDisplay}</p>
                    )}
                  </button>
                )
              })}
            </div>
            
            {selectedGoals.includes('custom') && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Custom goal amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <input
                    type="number"
                    value={customGoalAmount}
                    onChange={e => setCustomGoalAmount(e.target.value)}
                    placeholder="500000"
                    className="w-full pl-8 pr-4 py-3 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Step 5: Review */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">Review your plan</h1>
              <p className="text-muted-foreground">Make sure everything looks correct</p>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-card border border-border">
                <p className="text-sm text-muted-foreground">Personal Info</p>
                <p className="font-medium text-foreground">{name}{userAge !== null ? `, ${userAge} years` : ''}</p>
                <p className="text-sm text-muted-foreground">{role && ROLE_INFO[role].label}</p>
                {dateOfBirth && (
                  <p className="text-xs text-muted-foreground mt-1">
                    DOB: {new Date(dateOfBirth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
              
              <div className="p-4 rounded-lg bg-card border border-border">
                <p className="text-sm text-muted-foreground">Monthly Income</p>
                <p className="text-xl font-semibold text-foreground">
                  {formatCurrency(parseInt(salary) || 0)}
                </p>
                {savings && parseInt(savings) > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Existing savings: {formatCurrency(parseInt(savings))}
                  </p>
                )}
              </div>
              
              <div className="p-4 rounded-lg bg-card border border-border">
                <p className="text-sm text-muted-foreground mb-2">Selected Goals</p>
                <div className="flex flex-wrap gap-2">
                  {selectedGoals.map(type => (
                    <span 
                      key={type}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent text-accent-foreground text-sm"
                    >
                      {GOAL_INFO[type].icon} {GOAL_INFO[type].name}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-accent border border-primary/20">
                <p className="text-sm text-muted-foreground">Suggested Budget Split (50-20-30)</p>
                <div className="mt-2 flex gap-2">
                  <div className="flex-1 text-center">
                    <div className="h-2 rounded-full bg-[var(--app-blue)]" />
                    <p className="mt-1 text-xs text-muted-foreground">Needs 50%</p>
                  </div>
                  <div className="flex-[0.4] text-center">
                    <div className="h-2 rounded-full bg-[var(--app-amber)]" />
                    <p className="mt-1 text-xs text-muted-foreground">Wants 20%</p>
                  </div>
                  <div className="flex-[0.6] text-center">
                    <div className="h-2 rounded-full bg-[var(--app-green)]" />
                    <p className="mt-1 text-xs text-muted-foreground">Save 30%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Navigation buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <div className="max-w-[520px] mx-auto flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-3 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-muted transition-colors"
            >
              Back
            </button>
          )}
          
          {/* Join flow: step 4 is the final step */}
          {step === 4 && householdMode === 'join' ? (
            <button
              onClick={handleJoinHousehold}
              disabled={!canContinue()}
              className={cn(
                'flex-1 px-6 py-3 rounded-lg font-medium transition-colors',
                canContinue()
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              Join Household
            </button>
          ) : step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canContinue()}
              className={cn(
                'flex-1 px-6 py-3 rounded-lg font-medium transition-colors',
                canContinue()
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex-1 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Generate my plan
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
