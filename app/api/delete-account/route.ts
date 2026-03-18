import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
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

    // Delete user's expenses first
    await supabase
      .from("expenses")
      .delete()
      .eq("user_id", userId)

    // Clear profile data
    await supabase
      .from("profiles")
      .delete()
      .eq("id", userId)

    // Create admin client to delete the auth user
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

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
