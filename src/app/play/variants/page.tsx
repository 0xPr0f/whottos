'use client'

import Link from 'next/link'
import { ArrowLeft, Puzzle, Layers } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const variants = [
  {
    title: 'Speed Whot',
    description:
      'Blitz-style rounds with shorter turn timers and a smaller deck. Great for practicing quick decision making.',
  },
  {
    title: 'Team Relay',
    description:
      'Queue with a partner and alternate turns against another duo. Coordinate plays to chain combos.',
  },
  {
    title: 'Endurance Gauntlet',
    description:
      'Climb through escalating AI opponents with unique rule twists. Perfect for warmups before ranked matches.',
  },
]

export default function GameVariantsPage() {
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
            <h1 className="text-3xl font-black md:text-4xl">Upcoming variants</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80 md:text-base">
              New experimental modes are in development. We&apos;re polishing the rulesets below
              before opening public playtests.
            </p>
          </div>
        </header>

        <Card className="border-[#FFB6B3] bg-white/90 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Puzzle className="h-5 w-5" /> Design lab
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-[#570000]/80">
            {variants.map((variant) => (
              <div key={variant.title} className="rounded-2xl border border-[#FFB6B3]/70 bg-white/70 px-4 py-3">
                <h2 className="text-lg font-semibold text-[#570000]">{variant.title}</h2>
                <p className="mt-1 text-[#570000]/80">{variant.description}</p>
              </div>
            ))}
            <p>
              Have a mode idea? Share it with the team on Discord—we&apos;re always looking for
              community-driven twists to test.
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed border-[#FFB6B3] bg-[#FFF5F5]/80">
          <CardContent className="flex items-center gap-4 text-sm text-[#570000]/70">
            <Layers className="h-5 w-5" />
            <p>
              Ranked queue updates ship first. Variants will rotate into limited-time events
              after the competitive ladder stabilizes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
