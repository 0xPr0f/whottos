'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/hooks/use-theme'

export default function Settings() {
  const { theme, setTheme, themes } = useTheme()

  return (
    <div className="min-h-full bg-background px-4 py-10 text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Personalize the look and feel of your Whot table.
          </p>
        </header>

        <Card className="border border-border bg-card/90">
          <CardHeader>
            <CardTitle className="text-lg">Theme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose a color theme. This controls the background, primary accents, and card
              surfaces across the app.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {themes.map((entry) => {
                const isActive = entry.id === theme
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setTheme(entry.id)}
                    className={`flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background ${
                      isActive
                        ? 'border-accent bg-accent/10 shadow-sm'
                        : 'border-border bg-card hover:border-accent/60 hover:bg-accent/5'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-sm font-medium">{entry.name}</span>
                      {isActive && <Badge variant="outline">Active</Badge>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] uppercase text-muted-foreground">
                        Preview
                      </span>
                      <div className="flex gap-1">
                        <span
                          className="h-4 w-4 rounded-sm border border-border"
                          style={{ backgroundColor: entry.preview.background }}
                        />
                        <span
                          className="h-4 w-4 rounded-sm border border-border"
                          style={{ backgroundColor: entry.preview.primary }}
                        />
                        <span
                          className="h-4 w-4 rounded-sm border border-border"
                          style={{ backgroundColor: entry.preview.accent }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{entry.description}</p>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg">More coming soon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Additional settings like sound effects, animation density, and accessibility
              options will appear here as the app evolves.
            </p>
            <p>
              If there&apos;s something specific you want to configure, let us know in the
              community channels.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
