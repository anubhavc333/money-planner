import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, AlertCircle } from "lucide-react"

export default function AuthErrorPage() {
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
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">Authentication Error</CardTitle>
          <CardDescription>
            Something went wrong during authentication. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild className="w-full">
            <Link href="/auth/login">Try again</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Go home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
