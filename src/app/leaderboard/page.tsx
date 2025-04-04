import {
  generateCardBack,
  generateCircleCard,
  generateCrossCard,
} from '@/components/whot-card/card-svg-generation/generate-cards'

export default function Leaderboard() {
  return (
    <div className=" overflow-y-auto">
      {[10, 2, 30].map((value) => (
        <div className="border border-red-500 w-36" key={value}>
          {generateCircleCard(value)}
        </div>
      ))}
      {[1, 2, 3].map((value) => (
        <div className="border border-red-500 w-36" key={value}>
          {generateCardBack()}
        </div>
      ))}
      {[10, 2, 30].map((value) => (
        <div className="border border-red-500 w-36" key={value}>
          {generateCrossCard(value)}
        </div>
      ))}
    </div>
  )
}
