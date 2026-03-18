import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: Request) {
  const supabase = await createClient()

  const body = await req.json()
  const sms = body.sms || ""
  const shouldSave = body.save === true

  // Support both authenticated users and Android WebView with user_id
  let userId: string | null = null
  let isAndroidRequest = false

  if (body.user_id) {
    userId = body.user_id
    isAndroidRequest = true
  } else {
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id || null
  }

  const text = sms.toLowerCase()
  const cleanSms = sms.replace(/https?:\/\/\S+/gi, "").trim()

  // ── Amount ──────────────────────────────────────────────────────────────────
  const amountMatch = sms.match(/(?:₹|rs\.?|inr)\s?(\d+(?:,\d+)?(?:\.\d+)?)/i)
  const amount = amountMatch ? amountMatch[1].replace(/,/g, "") : null

  // ── Merchant ─────────────────────────────────────────────────────────────────
  // FIX 1: Strip UPI prefix (UPI_SWIGGY → swiggy, UPI/SWIGGY → swiggy)
  let merchant = "Unknown"

  const merchantPatterns = [
    /@([A-Za-z0-9_\-\s]+)/,
    /to\s([A-Za-z0-9_\-\s]+)/i,
    /from your\s([A-Za-z0-9_\-]+)/i,
    /at\s([A-Za-z0-9_\-\s]+)/i,
    /on\s([A-Za-z0-9_\-\s]+)/i,
  ]

  for (const pattern of merchantPatterns) {
    const match = sms.match(pattern)
    if (match) {
      // Strip common UPI prefixes like UPI_, UPI/, UPI- then take first word
      merchant = match[1]
        .trim()
        .replace(/^UPI[_\/\-]/i, "")  // remove UPI_ / UPI/ / UPI-
        .split(/[\s_]/)[0]            // take first word only (e.g. "SWIGGY" from "SWIGGY 15-11-2025")
        .toLowerCase()
      break
    }
  }

  // ── Category ─────────────────────────────────────────────────────────────────
  const merchantCategories: Record<string, string> = {
    swiggy: "Food",
    zomato: "Food",
    dominos: "Food",
    pizzahut: "Food",
    kfc: "Food",
    mcdonalds: "Food",
    burgerking: "Food",
    subway: "Food",
    starbucks: "Food",
    chai: "Food",
    haldiram: "Food",
    barbeque: "Food",
    momo: "Food",
    eatfit: "Food",
    faasos: "Food",
    behrouz: "Food",
    biryani: "Food",

    uber: "Transport",
    ola: "Transport",
    rapido: "Transport",
    blusmart: "Transport",
    yulu: "Transport",
    bounce: "Transport",
    metro: "Transport",

    amazon: "Shopping",
    flipkart: "Shopping",
    myntra: "Shopping",
    ajio: "Shopping",
    meesho: "Shopping",
    nykaa: "Shopping",
    tatacliq: "Shopping",
    shopclues: "Shopping",
    lenskart: "Shopping",
    firstcry: "Shopping",
    decathlon: "Shopping",

    reliance: "Groceries",
    bigbasket: "Groceries",
    zepto: "Groceries",
    blinkit: "Groceries",
    dmart: "Groceries",
    spencers: "Groceries",
    spar: "Groceries",
    supermarket: "Groceries",
    basket: "Groceries",

    netflix: "Entertainment",
    hotstar: "Entertainment",
    spotify: "Entertainment",
    prime: "Entertainment",
    bookmyshow: "Entertainment",
    zee5: "Entertainment",
    sony: "Entertainment",
    gaana: "Entertainment",
    wynk: "Entertainment",

    hpcl: "Fuel",
    iocl: "Fuel",
    bpcl: "Fuel",
    indianoil: "Fuel",
    petroleum: "Fuel",
    petrol: "Fuel",
    fuel: "Fuel",

    irctc: "Travel",
    makemytrip: "Travel",
    goibibo: "Travel",
    yatra: "Travel",
    cleartrip: "Travel",
    agoda: "Travel",
    airbnb: "Travel",
    oyo: "Travel",

    paytm: "Finance",
    phonepe: "Finance",
    gpay: "Finance",
    googlepay: "Finance",
    mobikwik: "Finance",
    cred: "Finance",
    razorpay: "Finance",

    jio: "Bills",
    airtel: "Bills",
    vodafone: "Bills",
    vi: "Bills",
    bsnl: "Bills",
    tatapower: "Bills",
    adani: "Bills",
    electricity: "Bills",

    apollo: "Health",
    pharmeasy: "Health",
    netmeds: "Health",
    medplus: "Health",
    onemg: "Health",
    mg: "Health",
    practo: "Health",

    byju: "Education",
    unacademy: "Education",
    coursera: "Education",
    udemy: "Education",
    upgrad: "Education",
    vedantu: "Education",
  }

  let category = "Other"

  const merchantLower = merchant.toLowerCase()
  for (const key in merchantCategories) {
    if (merchantLower.includes(key)) {
      category = merchantCategories[key]
      break
    }
  }

  if (category === "Other") {
    for (const key in merchantCategories) {
      if (text.includes(key)) {
        category = merchantCategories[key]
        if (merchant === "Unknown") merchant = key
        break
      }
    }
  }

  // ── Date + Time → ISO 8601 ────────────────────────────────────────────────────
  // FIX 2: Parse DD-MM-YYYY + HH:MM:SS am/pm into a proper ISO timestamp
  let transaction_date: string | null = null

  const dateTimeMatch = sms.match(
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(am|pm)?/i
  )

  if (dateTimeMatch) {
    let [, day, month, year, hours, minutes, seconds, meridiem] = dateTimeMatch
    let h = parseInt(hours, 10)
    const m = parseInt(minutes, 10)
    const s = parseInt(seconds, 10)

    // Normalise 2-digit year
    if (year.length === 2) year = `20${year}`

    // Convert 12-hour → 24-hour
    if (meridiem) {
      if (meridiem.toLowerCase() === "pm" && h < 12) h += 12
      if (meridiem.toLowerCase() === "am" && h === 12) h = 0
    }

    const pad = (n: number) => String(n).padStart(2, "0")
    transaction_date = `${year}-${pad(parseInt(month))}-${pad(parseInt(day))}T${pad(h)}:${pad(m)}:${pad(s)}`
  } else {
    // Fallback: date only
    const dateOnlyMatch = sms.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
    if (dateOnlyMatch) {
      const [, day, month, year] = dateOnlyMatch
      const y = year.length === 2 ? `20${year}` : year
      const pad = (n: string) => n.padStart(2, "0")
      transaction_date = `${y}-${pad(month)}-${pad(day)}`
    }
  }

  // ── Result ────────────────────────────────────────────────────────────────────
  // FIX 3: Include user_id in the response
  const result = {
    amount,
    merchant,
    category,
    transaction_date,
    user_id: userId,
    raw_sms: sms,
  }

  // ── Save to DB ────────────────────────────────────────────────────────────────
  if (shouldSave && userId && amount) {
    // Use admin client to bypass RLS when saving from Android (no auth session)
    const dbClient = isAndroidRequest ? createAdminClient() : supabase
    
    const { data: profile } = await dbClient
      .from("profiles")
      .select("household_id")
      .eq("id", userId)
      .single()

    if (profile?.household_id) {
      const { error } = await dbClient
        .from("detected_expenses")
        .upsert(
          {
            household_id: profile.household_id,
            user_id: userId,
            amount,
            merchant,
            category,
            raw_sms: sms,
            status: "pending",
            transaction_date,
          },
          { onConflict: "raw_sms" }
        )

      if (error) {
        console.error("Error saving detected expense:", error)
      }
    }
  }

  return Response.json(result)
}
