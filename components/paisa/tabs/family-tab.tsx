'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { AppState, FamilyMember, FamilyRole } from '@/lib/paisa-types'
import { ROLE_INFO } from '@/lib/paisa-types'
import { 
  formatCurrency, 
  getTotalFamilyIncome,
  getMonthlyExpenseTotal
} from '@/lib/paisa-utils'

interface FamilyTabProps {
  state: AppState
  onAddMember: (member: Omit<FamilyMember, 'id' | 'isPrimary'>) => void
  showModal: boolean
  onCloseModal: () => void
}

export function FamilyTab({ state, onAddMember, showModal, onCloseModal }: FamilyTabProps) {
  const [localShowModal, setLocalShowModal] = useState(false)
  
  const totalIncome = getTotalFamilyIncome(state.familyMembers)
  
  // Calculate total spent across all months for the current month
  const currentMonthData = state.monthlyData[state.currentMonth]
  const totalSpent = currentMonthData ? getMonthlyExpenseTotal(currentMonthData.expenses) : 0
  const totalSavings = totalIncome - totalSpent
  
  // Calculate spent by each member this month
  const spentByMember: { [memberId: string]: number } = {}
  if (currentMonthData) {
    for (const expense of currentMonthData.expenses) {
      spentByMember[expense.paidBy] = (spentByMember[expense.paidBy] || 0) + expense.amount
    }
  }
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  
  return (
    <div className="space-y-4">
      {/* Member Cards */}
      <div className="space-y-3">
        {state.familyMembers.map(member => {
          const memberSpent = spentByMember[member.id] || 0
          
          return (
            <div 
              key={member.id}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-semibold">
                    {getInitials(member.name)}
                  </span>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">{member.name}</h3>
                    {member.isPrimary && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {ROLE_INFO[member.role].label}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Monthly salary</p>
                  <p className="font-medium text-foreground">
                    {member.salary > 0 ? formatCurrency(member.salary, true) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Spent this month</p>
                  <p className="font-medium text-foreground">
                    {formatCurrency(memberSpent, true)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Add Member Button */}
      <button
        onClick={() => setLocalShowModal(true)}
        className="w-full py-3 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        + Invite member
      </button>
      
      {/* Household Summary */}
      <div className="bg-secondary rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Household Summary</h4>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Combined income</p>
            <p className="font-semibold text-foreground">{formatCurrency(totalIncome, true)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Combined spend</p>
            <p className="font-semibold text-foreground">{formatCurrency(totalSpent, true)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Combined savings</p>
            <p className="font-semibold text-[var(--paisa-green)]">{formatCurrency(totalSavings, true)}</p>
          </div>
        </div>
      </div>
      
      {/* Add Member Modal */}
      {localShowModal && (
        <AddMemberModal
          onAdd={(member) => {
            onAddMember(member)
            setLocalShowModal(false)
          }}
          onClose={() => setLocalShowModal(false)}
        />
      )}
    </div>
  )
}

// Add Member Modal
function AddMemberModal({
  onAdd,
  onClose,
}: {
  onAdd: (member: Omit<FamilyMember, 'id' | 'isPrimary'>) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [role, setRole] = useState<FamilyRole>('other')
  const [salary, setSalary] = useState('')
  
  const canSubmit = name.trim() !== ''
  
  const handleSubmit = () => {
    if (!canSubmit) return
    
    onAdd({
      name: name.trim(),
      role,
      salary: parseInt(salary) || 0,
    })
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-[520px] bg-card rounded-t-2xl p-4 pb-8 animate-in slide-in-from-bottom duration-300">
        <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-4">Invite Family Member</h2>
        
        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter name"
              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          {/* Role */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Role</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(ROLE_INFO) as FamilyRole[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={cn(
                    'p-2 rounded-lg border text-center transition-all',
                    role === r
                      ? 'border-primary bg-accent'
                      : 'border-border hover:border-muted-foreground'
                  )}
                >
                  <span className="text-lg">{ROLE_INFO[r].icon}</span>
                  <p className="text-xs text-foreground mt-1">{ROLE_INFO[r].label}</p>
                </button>
              ))}
            </div>
          </div>
          
          {/* Salary */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Monthly salary</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
              <input
                type="number"
                value={salary}
                onChange={e => setSalary(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          
          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'w-full py-3 rounded-lg font-medium transition-colors',
              canSubmit
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            Add Member
          </button>
        </div>
      </div>
    </div>
  )
}
