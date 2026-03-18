import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    // Get the current user from the session
    const supabase = await createServerClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const userId = user.id

    // Use admin client to bypass RLS when deleting user data
    const supabaseAdmin = createAdminClient()

    // Delete user's detected expenses
    await supabaseAdmin
      .from("detected_expenses")
      .delete()
      .eq("user_id", userId)

    // Delete user's income history
    await supabaseAdmin
      .from("income_history")
      .delete()
      .eq("user_id", userId)

    // Delete user's expenses
    await supabaseAdmin
      .from("expenses")
      .delete()
      .eq("user_id", userId)

    // Clear profile data
    await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId)

    // Delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (deleteError) {
      console.error("Error deleting auth user:", deleteError)
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete account error:", error)
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
}
