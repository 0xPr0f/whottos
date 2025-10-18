'use client'

import Link from 'next/link'
import { ArrowLeft, Clock, Compass } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function PlayHistoryPage() {
  return (
    <div className="min-h-screen bg-[#FFE2E1] px-4 py-10 text-[#570000]">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-3xl bg-[#570000] px-6 py-10 text-white shadow-xl">
          <Link
            href="/play"
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to play hub
          </Link>
          <div>
            <h1 className="text-3xl font-black md:text-4xl">Match history</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80 md:text-base">
              Ranked match history will live here. We are tracking every game routed through
              the online ladder so you can review past opponents, rating changes, and learn
              from each battle.
            </p>
          </div>
        </header>

        <Card className="border-[#FFB6B3] bg-white/90 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Clock className="h-5 w-5" /> Coming soon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-[#570000]/80">
            <p>
              We&apos;re finalizing the ranked data pipeline. Once complete, this page will
              display your recent matches, rating adjustments, and quick links to rematch
              previous rivals.
            </p>
            <p>
              Head back to the{' '}
              <Link href="/play/online" className="font-semibold text-[#570000] underline">
                ranked queue
              </Link>{' '}
              to keep climbing while we finish this view.
            </p>
            <Button asChild className="bg-[#570000] text-white hover:bg-[#570000]/90">
              <Link href="/play/online">Queue for a ranked match</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-dashed border-[#FFB6B3] bg-[#FFF5F5]/80">
          <CardContent className="flex items-center gap-4 text-sm text-[#570000]/70">
            <Compass className="h-5 w-5" />
            <p>
              Want to help design this dashboard? Share feedback in the community Discord so we
              can prioritize the insights you care about most.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
