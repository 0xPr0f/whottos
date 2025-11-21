'use client'

import Link from 'next/link'
import { ArrowLeft, LineChart, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function PlayerStatsPage() {
  return (
    <div className="min-h-full bg-background px-4 py-10 text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-3xl bg-primary px-6 py-10 text-primary-foreground shadow-xl">
          <Link
            href="/play"
            className="inline-flex items-center gap-2 text-sm text-primary-foreground/80 hover:text-primary-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to play hub
          </Link>
          <div>
            <h1 className="text-3xl font-black md:text-4xl">Player analytics</h1>
            <p className="mt-2 max-w-2xl text-sm text-primary-foreground/80 md:text-base">
              Detailed performance analytics are in the works. Soon you&apos;ll see your win rate,
              most-played cards, streaks, and matchup insights powered by the ranked ladder.
            </p>
          </div>
        </header>

        <Card className="border border-border bg-card/90 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <LineChart className="h-5 w-5" /> Roadmap
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-foreground/80">
            <p>
              We&apos;re aggregating telemetry from competitive matches to power this dashboard.
              Expect trend lines for rating progress, efficiency metrics, and highlights of
              your signature plays.
            </p>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/leaderboard">See current ladder standings</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-dashed border-border bg-secondary/80">
          <CardContent className="flex items-center gap-4 text-sm text-foreground/70">
            <Sparkles className="h-5 w-5" />
            <p>
              Have ideas for the stats you want to see? Drop suggestions in the Discord and help
              us fine-tune the analytics rollout.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
