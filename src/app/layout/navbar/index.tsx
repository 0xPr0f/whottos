'use client'

import type React from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  WholeWordIcon as WhotLogo,
  Play,
  Puzzle,
  BookOpen,
  Trophy,
  Search,
  Menu,
  X,
  ChevronLeft,
  Settings,
  HelpCircle,
  Users,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
  SheetHeader,
  SheetDescription,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useTheme } from '@/hooks/use-theme'

const navItems = [
  {
    name: 'Play',
    icon: <Play className="h-5 w-5" />,
    color: 'hover:bg-[#3D0000] group-hover:rotate-12',
    textColor: 'text-white',
    href: '/play',
  },
  {
    name: 'Puzzles',
    icon: <Puzzle className="h-5 w-5" />,
    color: 'hover:bg-[#3D0000] group-hover:rotate-12',
    textColor: 'text-white',
    href: '/puzzles',
  },
  {
    name: 'Leaderboard',
    icon: <Trophy className="h-5 w-5" />,
    color: 'hover:bg-[#3D0000] group-hover:rotate-12',
    textColor: 'text-white',
    href: '/leaderboard',
  },
  {
    name: 'Learn',
    icon: <BookOpen className="h-5 w-5" />,
    color: 'hover:bg-[#3D0000] group-hover:rotate-12',
    textColor: 'text-white',
    href: '/learn',
  },
  {
    name: 'Community',
    icon: <Users className="h-5 w-5" />,
    color: 'hover:bg-[#3D0000] group-hover:rotate-12',
    textColor: 'text-white',
    href: '/community',
  },
]

export default function WhotNavbar({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const isMobile = useMediaQuery('(max-width: 768px)')
  const { theme, setTheme, themes } = useTheme()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const bottomNavItems = [
    {
      name: 'Collapse',
      icon: (
        <ChevronLeft
          className={cn('h-5 w-5', isSidebarCollapsed && 'rotate-180')}
        />
      ),
      onClick: () => setIsSidebarCollapsed((prev) => !prev),
      color: 'hover:bg-[#3D0000] group-hover:rotate-12',
    },
    {
      name: 'Settings',
      icon: <Settings className="h-5 w-5" />,
      onClick: () => console.log('Settings clicked'),
      href: '/settings',
      color: 'hover:bg-[#3D0000] group-hover:rotate-12',
    },
    {
      name: 'Support',
      icon: <HelpCircle className="h-5 w-5" />,
      onClick: () => console.log('Support clicked'),
      href: '/support',
      color: 'hover:bg-[#3D0000] group-hover:rotate-12',
    },
  ]

  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const handleNavClick = () => {
    setIsSheetOpen(false)
  }

  const bottomNavContentRender = (item: any) => {
    return (
      <>
        <span
          className={cn(
            'flex-shrink-0 relative z-10',
            isSidebarCollapsed && 'mx-auto'
          )}
        >
          {item.icon}
        </span>
        <span
          className={cn(
            'ml-3 overflow-hidden whitespace-nowrap relative z-10 transition-all duration-300',
            isSidebarCollapsed ? 'hidden opacity-0' : 'w-auto opacity-100',
            'group-hover:font-medium'
          )}
        >
          {item.name}
        </span>
      </>
    )
  }

  if (!isMounted) return null

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-20 hidden md:flex flex-col bg-sidebar text-sidebar-foreground',
          isSidebarCollapsed ? 'w-16' : 'w-[170px]'
        )}
      >
        <div className="p-4 flex items-center h-16">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold group"
          >
            <WhotLogo
              className={cn(
                isSidebarCollapsed ? 'h-full w-full' : 'h-6 w-6',
                'text-white flex-shrink-0 transition-transform duration-300 group-hover:rotate-12'
              )}
            />
            <span
              className={cn(
                'overflow-hidden whitespace-nowrap',
                isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
              )}
            >
              Whot.gg
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-hide">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center rounded-md px-3 py-2 text-sm group relative overflow-hidden text-sidebar-foreground',
                    isSidebarCollapsed
                      ? 'justify-center'
                      : 'justify-start gap-3',
                    'hover:bg-sidebar-accent/70'
                  )}
                >
                  <span className="absolute inset-0 bg-sidebar-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></span>
                  <span className="flex-shrink-0 relative z-10 transition-transform duration-300 group-hover:rotate-12">
                    {item.icon}
                  </span>
                  <span
                    className={cn(
                      'overflow-hidden whitespace-nowrap relative z-10 transition-all duration-300',
                      isSidebarCollapsed
                        ? 'w-0 opacity-0'
                        : 'w-auto opacity-100',
                      item.textColor,
                      'group-hover:font-medium'
                    )}
                  >
                    {item.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {/*
        <div
          className={cn(
            'overflow-hidden transition-all duration-300',
            isSidebarCollapsed ? 'h-0 opacity-0' : 'opacity-100 p-4'
          )}
        >
          <form onSubmit={handleSearch} className="mb-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transform text-zinc-400" />
              <Input
                placeholder="Search"
                className="bg-[#3D0000] pl-8 text-white placeholder:text-zinc-400 focus-visible:ring-[#FFA7A6] border-[#3D0000] transition-transform duration-300 focus:scale-105"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
          <Button className="mb-2 cursor-pointer w-full bg-[#FFA7A6] hover:bg-[#FF8A89] text-[#570000] font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg">
            Sign Up
          </Button>
          <Button
            variant="outline"
            className="cursor-pointer w-full font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg border-[#570000] text-[#570000] hover:bg-[#570000] hover:text-white group"
          >
            Log In
          </Button>
        </div>
*/}
        <div className="mt-auto border-t border-sidebar-border p-2">
          <ul className="space-y-1">
            {bottomNavItems.map((item) => (
              <li key={item.name}>
                {item.href ? (
                  <Link href={item.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        'cursor-pointer',
                        'w-full text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group relative overflow-hidden',
                        isSidebarCollapsed
                          ? 'justify-center px-0 py-0'
                          : 'justify-start px-3 py-2'
                      )}
                      onClick={item.onClick}
                    >
                      {bottomNavContentRender(item)}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="ghost"
                    className={cn(
                      'cursor-pointer',
                      'w-full text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group relative overflow-hidden',
                      isSidebarCollapsed
                        ? 'justify-center px-0 py-0'
                        : 'justify-start px-3 py-2'
                    )}
                    onClick={item.onClick}
                  >
                    {bottomNavContentRender(item)}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div
        className={cn(
          'flex flex-col w-full bg-background min-h-screen overflow-y-auto',
          !isMobile && !isSidebarCollapsed && 'md:ml-[170px]',
          !isMobile && isSidebarCollapsed && 'md:ml-16'
        )}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between bg-primary p-4 text-primary-foreground md:hidden">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-transform duration-300 hover:scale-110"
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[170px] p-0 bg-sidebar text-sidebar-foreground border-sidebar-border"
              aria-describedby="mobile:navigation-description"
            >
              <SheetHeader className="p-4 flex flex-row items-center h-16 justify-between">
                <SheetTitle className="text-sidebar-foreground">
                  <Link
                    href="/"
                    className="flex items-center gap-2 text-lg font-bold group"
                    onClick={handleNavClick}
                  >
                    <WhotLogo className="h-6 w-6 text-sidebar-foreground transition-transform duration-300 group-hover:rotate-12" />
                    <span>Whot.gg</span>
                  </Link>
                </SheetTitle>
                <SheetDescription
                  id="mobile:navigation-description"
                  className="sr-only"
                >
                  Navigation menu for Whot.gg
                </SheetDescription>
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-sidebar-accent h-8 w-8 p-0 transition-transform duration-300 hover:scale-110"
                  >
                    <X className="h-5 w-5 text-sidebar-foreground/70" />
                    <span className="sr-only">Close</span>
                  </Button>
                </SheetClose>
              </SheetHeader>

              <nav className="flex-1 overflow-y-auto">
                <ul className="space-y-1 px-2">
                  {navItems.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-300 ease-in-out group relative overflow-hidden'
                        )}
                        onClick={handleNavClick}
                      >
                        <span className="absolute inset-0 bg-sidebar-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out"></span>
                        <span className="text-sidebar-foreground flex-shrink-0 relative z-10 transition-transform duration-300 ease-in-out group-hover:scale-110 group-hover:rotate-12">
                          {item.icon}
                        </span>
                        <span
                          className={cn(
                            'transition-all duration-500 ease-in-out overflow-hidden whitespace-nowrap relative z-10',
                            item.textColor,
                            'group-hover:font-medium'
                          )}
                        >
                          {item.name}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              {/*} <div className="p-4">
                <form onSubmit={handleSearch} className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transform text-zinc-400" />
                    <Input
                      placeholder="Search"
                      className="bg-[#3D0000] pl-8 text-white placeholder:text-zinc-400 focus-visible:ring-[#FFA7A6] border-[#3D0000] h-10 transition-transform duration-300 focus:scale-105"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </form>
                <Button className="cursor-pointer mb-2 w-full bg-[#FFA7A6] hover:bg-[#FF8A89] text-[#570000] font-medium h-10 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                  Sign Up
                </Button>
                <Button
                  variant="outline"
                  className="cursor-pointer w-full font-medium h-10 border-[#570000] text-[#570000] hover:bg-[#570000] hover:text-white transition-all duration-300 group"
                >
                  Log In
                </Button>
              </div>*/}

              <div className="mt-auto border-t border-sidebar-border p-2">
                <ul className="space-y-1">
                  {bottomNavItems.slice(1).map((item) => (
                    <li key={item.name}>
                      <Button
                        variant="ghost"
                        className="w-full cursor-pointer justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group relative overflow-hidden px-3 py-2"
                        onClick={() => {
                          item.onClick?.()
                          handleNavClick()
                        }}
                      >
                        <span className="absolute inset-0 bg-sidebar-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></span>
                        <span className="relative z-10 transition-transform duration-300 group-hover:rotate-12">
                          {item.icon}
                        </span>
                        <span className="ml-3 relative z-10 transition-all duration-300 group-hover:font-medium">
                          {item.name}
                        </span>
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </SheetContent>
          </Sheet>
          {/*} <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-[#3D0000] hover:text-white transition-transform duration-300 hover:scale-110"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            {isSearchOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Search className="h-6 w-6" />
            )}
            <span className="sr-only">
              {isSearchOpen ? 'Close search' : 'Open search'}
            </span>
          </Button>*/}
        </header>

        {/*}  <div
          className={cn(
            'bg-[#570000] overflow-hidden md:hidden transition-all duration-300',
            isSearchOpen
              ? 'max-h-16 py-2 px-4 opacity-100'
              : 'max-h-0 py-0 px-4 opacity-0'
          )}
        >
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transform text-zinc-400" />
              <Input
                placeholder="Search"
                className="bg-[#3D0000] pl-8 text-white placeholder:text-zinc-400 focus-visible:ring-[#FFA7A6] border-[#3D0000] transition-transform duration-300 focus:scale-105"
                autoFocus={isSearchOpen}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
        </div>*/}

        {children}
      </div>
    </div>
  )
}
