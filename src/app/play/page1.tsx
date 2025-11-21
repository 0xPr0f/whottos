'use client'

import { useState, useEffect } from 'react'
import GameBoard from '@/app/whot-game/game-board'
import { Loader2 } from 'lucide-react'
import {
  generateCircleCard,
  generateCrossCard,
  generateSquareCard,
  generateStarCard,
} from '@/components/whot-card/card-svg-generation/generate-cards'

export default function PlayPage() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading game assets
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-bold text-primary">Loading Game...</h2>
        <p className="text-muted-foreground">
          Shuffling cards and preparing the table
        </p>
      </div>
    )
  }

  return <GameBoard />
}

{
  /*}
            <div className="space-y-4">

              <GameTimer
                time={gameTime}
                isActive={gameState?.gameStatus === 'playing'}
              />

              <Tabs defaultValue="game" className="w-full">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="game">Game</TabsTrigger>
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="stats">Stats</TabsTrigger>
                </TabsList>

                <TabsContent value="game" className="space-y-4 mt-4">
                  <GameOptions onStartGame={startGame} />

                  <Card className="w-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          New Game
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start"
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Chat
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start"
                        >
                          <History className="mr-2 h-4 w-4" size="sm" />
                          History
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start"
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Players
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="profile" className="space-y-4 mt-4">
                  <PlayerProfile />
                </TabsContent>

                <TabsContent value="stats" className="space-y-4 mt-4">
                  <GameStats gameState={previewGameState} />

                  <Card className="w-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Game History</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between items-center py-2 border-b">
                        <div className="flex items-center">
                          <Badge className="mr-2" variant="outline">
                            Win
                          </Badge>
                          <span>vs Bot</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          2 hours ago
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <div className="flex items-center">
                          <Badge className="mr-2" variant="destructive">
                            Loss
                          </Badge>
                          <span>vs Bot</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Yesterday
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <div className="flex items-center">
                          <Badge className="mr-2" variant="outline">
                            Win
                          </Badge>
                          <span>vs Bot</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          3 days ago
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <Card className="w-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Online Players</CardTitle>
                    <Badge variant="outline" className="ml-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                      1,245
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarFallback>JD</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">John Doe</p>
                        <p className="text-xs text-muted-foreground">Level 8</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarFallback>AS</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">Alice Smith</p>
                        <p className="text-xs text-muted-foreground">
                          Level 12
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div> */
}
