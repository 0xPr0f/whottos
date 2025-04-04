'use client'

import { useEffect, useState } from 'react'
import WhotCard from '@/components/whot-card'
import { Button } from '@/components/ui/button'
import { Coins, Zap, Users, ArrowRight } from 'lucide-react'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const howToPlay = [
    {
      step: 1,
      title: 'Deal the Cards',
      description:
        'Each player receives 7 cards. The remaining cards form the draw pile.',
    },
    {
      step: 2,
      title: 'Match Cards',
      description:
        'Play cards that match the number or shape of the top card on the discard pile.',
    },
    {
      step: 3,
      title: 'Special Cards',
      description:
        'Whot cards and other special cards have unique effects that can change the game.',
    },
  ]
  useEffect(() => {
    setMounted(true)

    // Add floating animation to cards
    const interval = setInterval(() => {
      document.querySelectorAll('.floating-card').forEach((card) => {
        const randomY = Math.random() * 10 - 5
        const randomRotate = Math.random() * 5 - 2.5
        const element = card as HTMLElement
        element.style.transform = `translateY(${randomY}px) rotate(${randomRotate}deg)`
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="relative min-h-[70vh] md:min-h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-3 gap-4 md:gap-8 transform rotate-12 scale-110">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <div
                key={i}
                className="floating-card transform transition-all duration-2000 ease-in-out hover:scale-110 hover:-translate-y-4 hover:rotate-0 hover:z-50"
                style={{
                  transform: `rotate(${Math.random() * 20 - 10}deg)`,
                  zIndex: Math.floor(Math.random() * 10),
                  transition: 'all 2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                <WhotCard
                  number={Math.floor(Math.random() * 14) + 1}
                  shape={Math.floor(Math.random() * 5)}
                  className="hover:shadow-2xl"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-center px-4 py-16 bg-[#570000]/90 backdrop-blur-md rounded-xl max-w-3xl mx-4 shadow-2xl border border-[#3D0000]/50 transform transition-transform duration-500 hover:scale-[1.02]">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            Play Whot Online
          </h1>
          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-xl mx-auto">
            The classic Whot card game, now available online. Play onchain or
            offchain
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
            <Button
              size="lg"
              className=" cursor-pointer bg-[#FFA7A6] hover:bg-[#FF8A89] text-[#570000] font-bold text-lg py-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 group relative before:absolute before:inset-0 before:rounded-xl before:border-2 before:border-[#FFA7A6]/50 before:shadow-[0_0_15px_rgba(255,167,166,0.7)] before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
            >
              <Coins className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
              <span>Play Onchain</span>
            </Button>

            <Button
              size="lg"
              className="cursor-pointer bg-white hover:bg-gray-100 text-[#570000] font-bold text-lg py-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 group relative before:absolute before:inset-0 before:rounded-xl before:border-2 before:border-white/50 before:shadow-[0_0_15px_rgba(255,255,255,0.7)] before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
            >
              <Zap className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
              <span>Play Offchain</span>
            </Button>
            {/*}
            <Button
              size="lg"
              className="cursor-pointer bg-[#3D0000] hover:bg-[#2D0000] text-white font-bold text-lg py-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 group md:col-span-2 relative before:absolute before:inset-0 before:rounded-xl before:border-2 before:border-[#3D0000]/50 before:shadow-[0_0_15px_rgba(61,0,0,0.7)] before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
            >
              <Users className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
              <span>Play With Friends</span>
            </Button> */}
          </div>
        </div>
      </div>

      <div className="bg-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-[#570000] text-center mb-12 relative inline-block mx-auto">
            How to Play Whot
            <span className="absolute bottom-0 left-0 w-full h-1 bg-[#FFA7A6] transform -translate-y-1"></span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {howToPlay.map((item) => (
              <div
                key={item.step}
                className="bg-[#FFF0F0] p-6 rounded-lg shadow-md transition-all duration-300 hover:shadow-xl hover:scale-105 hover:bg-[#FFE5E5] group"
              >
                <div className="w-12 h-12 bg-[#570000] text-white rounded-full flex items-center justify-center mb-4 text-xl font-bold transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-[#570000] mb-2">
                  {item.title}
                </h3>
                <p className="text-[#570000]/80">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button
              variant="outline"
              className="cursor-pointer border-[#570000] text-[#570000] hover:bg-[#570000] hover:text-white transition-all duration-300 group"
            >
              Learn More{' '}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-[#570000] py-16 px-4 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="grid grid-cols-8 h-full">
            {Array.from({ length: 32 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-center text-6xl font-bold opacity-50"
              >
                W
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">
            Join Our Community
          </h2>
          <p className="text-lg md:text-xl mb-8 text-white/80 max-w-2xl mx-auto">
            Connect with other Whot players, participate in tournaments, and
            improve your skills.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button className="bg-[#FFA7A6] hover:bg-[#FF8A89] text-[#570000] font-medium transition-all duration-300 hover:scale-105 group">
              Join Discord{' '}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
            <Button
              variant="outline"
              className="cursor-pointer border-[#570000] text-[#570000] hover:bg-[#570000] hover:text-white transition-all duration-300 group"
            >
              View Leaderboard{' '}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </div>

      <footer className="bg-[#3D0000] text-white py-8 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <WhotLogo className="h-5 w-5 mr-2" /> Whot.gg
            </h3>
            <p className="text-white/70">
              The premier platform for playing the classic whot card game
              online.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-3">Play</h4>
            <ul className="space-y-2 text-white/70">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Quick Play
                </a>
              </li>
              {/*}
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Tournaments
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Custom Games
                </a>
              </li>
*/}
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3">Learn</h4>
            <ul className="space-y-2 text-white/70">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Rules
                </a>
              </li>

              <li>
                <a href="#" className="hover:text-white transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3">Connect</h4>
            <ul className="space-y-2 text-white/70">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Twitter
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Contact Us (email)
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-white/20 text-center text-white/50 text-sm">
          &copy; {new Date().getFullYear()} Whot.gg. All rights reserved.
        </div>
      </footer>
    </main>
  )
}

import { Logo as WhotLogo } from '@/components/logo'
