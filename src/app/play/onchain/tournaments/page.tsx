'use client'

import Link from 'next/link'
import { ArrowLeft, Trophy, Globe2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function OnchainTournamentsPage() {
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
            <h1 className="text-3xl font-black md:text-4xl">On-chain tournaments</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80 md:text-base">
              Blockchain-enabled competitive circuits are coming soon. We&apos;re wiring the
              ranked ladder into automated brackets with verifiable rewards.
            </p>
          </div>
        </header>

        <Card className="border-[#FFB6B3] bg-white/90 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Trophy className="h-5 w-5" /> Tournament roadmap
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-[#570000]/80">
            <p>
              We&apos;re integrating wallet sign-in, prize pools, and audited match verification.
              Once live, you&apos;ll be able to queue for seasonal events directly from the ranked
              lobby.
            </p>
            <p>
              Until then, sharpen your skills in the{' '}
              <Link href="/play/online" className="font-semibold text-[#570000] underline">
                online ladder
              </Link>{' '}
              — tournament invites will prioritize top performers.
            </p>
            <Button asChild className="bg-[#570000] text-white hover:bg-[#570000]/90">
              <Link href="/leaderboard">Track the current leaders</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-dashed border-[#FFB6B3] bg-[#FFF5F5]/80">
          <CardContent className="flex items-center gap-4 text-sm text-[#570000]/70">
            <Globe2 className="h-5 w-5" />
            <p>
              Global qualifiers will open after stress-testing the matchmaking infrastructure.
              Stay tuned for announcements.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
