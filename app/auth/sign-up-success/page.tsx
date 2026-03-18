import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, Mail } from "lucide-react"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <DollarSign className="w-8 h-8 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground tracking-tight">Money Planner</span>
          </div>
          <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-green-500" />
          </div>
          <CardTitle className="text-xl">Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent you a confirmation link. Please check your inbox and click the link to verify your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/login">Back to login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
