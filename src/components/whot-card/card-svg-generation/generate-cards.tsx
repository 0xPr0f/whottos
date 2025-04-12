import React from 'react'

// Styled Components (Example - Can also use regular CSS Modules)
const CardContainer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <div className="w-full h-full p-0 m-0">{children}</div>

const CardBackground = () => (
  <path
    className="st0"
    d="M182.9,237.7c0,7.8-6.3,14.2-14.2,14.2H18.5c-7.8,0-14.2-6.3-14.2-14.2V16.6c0-7.8,6.3-14.2,14.2-14.2h150.2
			c7.8,0,14.2,6.3,14.2,14.2V237.7z"
    fill="#F4F4F2"
    stroke="#000000"
  />
)

const CardNumberText = ({ cardNumber }: { cardNumber: number }) => (
  <text
    transform="matrix(1 0 0 1 13.2988 34.2585)"
    fill="#791026"
    fontFamily="MyriadPro-Regular"
    fontSize="24"
    style={{ fontWeight: 'bolder' }}
  >
    {cardNumber}
  </text>
)

const generateBaseCard = ({
  cardNumber,
  children,
}: {
  cardNumber: number
  children: React.ReactNode
}) => {
  return (
    <CardContainer>
      <svg
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        x="0px"
        y="0px"
        viewBox="0 0 186.3 255.5"
        style={{ background: 'new 0 0 186.3 255.5' }}
        xmlSpace="preserve"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
      >
        <g id="ace">
          <g>
            <CardBackground />
          </g>
          <CardNumberText cardNumber={Number(cardNumber)} />
          <text
            transform="matrix(1 0 0 1 147.3851 236.655)"
            fill="#791026"
            fontFamily="MyriadPro-Regular"
            fontSize="24"
            style={{ fontWeight: 'bolder' }}
          >
            {cardNumber}
          </text>
          {children}
        </g>
      </svg>
    </CardContainer>
  )
}

function generateCircleCard(cardNumber: number) {
  return generateBaseCard({
    cardNumber: cardNumber,
    children: (
      <>
        <circle fill="#7D1228" cx="97.8" cy="127.8" r="57.2" />
        <circle fill="#7D1228" cx="23.6" cy="54.5" r="9.3" />
        <circle fill="#7D1228" cx="155.1" cy="198.2" r="9.3" />
      </>
    ),
  })
}

function generateSquareCard(cardNumber: number) {
  return generateBaseCard({
    cardNumber: cardNumber,
    children: (
      <>
        <rect x="33.1" y="67.9" fill="#7D1228" width="121.1" height="121.1" />
        <rect x="11.9" y="45.3" fill="#7D1228" width="21.2" height="18.5" />
        <rect x="144.5" y="195.5" fill="#7D1228" width="21.2" height="18.5" />
      </>
    ),
  })
}
function generateTriangleCard(cardNumber: number) {
  return generateBaseCard({
    cardNumber: cardNumber,
    children: (
      <>
        <g transform="translate(40, 75) scale(2)">
          <polygon
            stroke="#791026"
            points="25, 0, 0, 48, 50, 48"
            fillOpacity="null"
            strokeOpacity="null"
            strokeWidth="2"
            fill="#791026"
          />
        </g>
        <g transform="translate(13, 42) scale(0.4)">
          <polygon
            stroke="#791026"
            points="25, 0, 0, 48, 50, 48"
            fillOpacity="null"
            strokeOpacity="null"
            strokeWidth="5"
            fill="#791026"
          />
        </g>
        <g transform="translate(166.5, 210) scale(0.4) rotate(180)">
          <polygon
            stroke="#791026"
            points="25, 0, 0, 48, 50, 48"
            fillOpacity="null"
            strokeOpacity="null"
            strokeWidth="5"
            fill="#791026"
          />
        </g>
      </>
    ),
  })
}

function generateStarCard(cardNumber: number) {
  return generateBaseCard({
    cardNumber: cardNumber,
    children: (
      <>
        <polygon
          fill="#791026"
          points="93.6,56.9 114.5,99.2 161.2,106 127.4,138.9 135.4,185.4 93.6,163.5 51.9,185.4 59.8,138.9 26.1,106
		72.8,99.2 	"
        />
        <polygon
          fill="#791026"
          points="21,37.8 24.1,44 31,45.1 26,50 27.2,56.9 21,53.6 14.8,56.9 16,50 10.9,45.1 17.9,44 	"
        />
        <polygon
          fill="#791026"
          points="155.1,192.3 158.2,198.6 165.1,199.6 160.1,204.5 161.3,211.4 155.1,208.2 148.9,211.4 150,204.5
		145,199.6 152,198.6 	"
        />
      </>
    ),
  })
}

function generateCrossCard(cardNumber: number) {
  return generateBaseCard({
    cardNumber: cardNumber,
    children: (
      <>
        <rect x="17.9" y="91.9" fill="#7D1228" width="153.3" height="52.3" />
        <rect x="68.4" y="45.3" fill="#7D1228" width="52.3" height="153.3" />
        <rect x="10.3" y="49.4" fill="#7D1228" width="21.3" height="7.3" />
        <rect x="17.3" y="42.9" fill="#7D1228" width="7.3" height="21.3" />
        <rect x="144.4" y="200" fill="#7D1228" width="21.3" height="7.3" />
        <rect x="151.4" y="193.5" fill="#7D1228" width="7.3" height="21.3" />
      </>
    ),
  })
}

function generateWhotCard(cardNumber: number) {
  return generateBaseCard({
    cardNumber: 20,
    children: (
      <>
        {/* Override default card number display with custom styling */}
        <g style={{ opacity: 0 }}>
          <CardNumberText cardNumber={20} />
          <text
            transform="matrix(1 0 0 1 147.3851 236.655)"
            fill="#791026"
            fontFamily="MyriadPro-Regular"
            fontSize="24"
            style={{ fontWeight: 'bold' }}
          >
            20
          </text>
        </g>

        {/* Upper left corner */}
        <text
          x="24"
          y="50"
          fill="#791026"
          fontFamily="MyriadPro-Regular"
          fontSize="14"
          style={{ fontStyle: 'italic', fontWeight: 'bold' }}
        >
          w
        </text>

        <text
          x="93.15"
          y="135"
          fill="#791026"
          fontFamily="MyriadPro-Regular"
          fontSize="28"
          textAnchor="middle"
          style={{ fontWeight: 'bold', fontStyle: 'italic' }}
        >
          Whot
        </text>

        {/* Bottom right corner (rotated 180 degrees) */}
        <g transform="translate(166, 220) rotate(180)">
          <text
            x="4"
            y="15"
            fill="#791026"
            fontFamily="MyriadPro-Regular"
            fontSize="14"
            style={{ fontStyle: 'italic', fontWeight: 'bold' }}
          >
            w
          </text>
        </g>
      </>
    ),
  })
}

function generateCardBack() {
  const cardWidth = 186.3
  const cardHeight = 255.5

  // Approximate center
  const centerX = cardWidth / 2
  const centerY = cardHeight / 2

  // Vertical offset so the two texts don't overlap
  const offset = 40

  return (
    <CardContainer>
      <svg
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        width="100%"
        height="100%"
        viewBox={`0 0 ${cardWidth} ${cardHeight}`}
        style={{ background: 'none' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Outer card outline with rounded corners */}
        <path
          d={`
            M ${cardWidth - 3.4},${cardHeight - 17.8}
            c 0,7.8 -6.3,14.2 -14.2,14.2
            H 18.5
            c -7.8,0 -14.2 -6.3 -14.2 -14.2
            V 16.6
            c 0 -7.8 6.3 -14.2 14.2 -14.2
            h 150.2
            c 7.8,0 14.2,6.3 14.2,14.2
            V ${cardHeight - 17.8} z
          `}
          fill="#7D1228"
          stroke="#000"
          strokeWidth="2"
        />

        {/* Inner rectangle (optional). Adjust if you want a thinner or thicker border */}
        <rect
          x="23.5"
          y="21.5"
          width="140"
          height="210"
          fill="#7D1228"
          rx="5"
          ry="5"
        />

        {/* Top "Whot" text (unrotated), placed above the center */}
        <g transform={`translate(${centerX}, ${centerY - offset})`}>
          <text
            x="0"
            y="0"
            fill="#FFF"
            fontFamily="MyriadPro-Regular"
            fontSize="32"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            Whot
          </text>
        </g>

        {/* Bottom "Whot" text (rotated 180°), placed below the center */}
        <g transform={`translate(${centerX}, ${centerY + offset}) rotate(180)`}>
          <text
            x="0"
            y="0"
            fill="#FFF"
            fontFamily="MyriadPro-Regular"
            fontSize="32"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            Whot
          </text>
        </g>
      </svg>
    </CardContainer>
  )
}

export function generateWhotCards({
  cardType,
  cardNumber,
}: {
  cardType: 'circle' | 'square' | 'triangle' | 'cross' | 'star' | 'whot'
  cardNumber: number
}) {
  switch (cardType) {
    case 'circle':
      return generateCircleCard(cardNumber)
    case 'square':
      return generateSquareCard(cardNumber)
    case 'triangle':
      return generateTriangleCard(cardNumber)
    case 'cross':
      return generateCrossCard(cardNumber)
    case 'star':
      return generateStarCard(cardNumber)
    case 'whot':
      return generateWhotCard(cardNumber)
    default:
      throw new Error(`Unsupported card type: ${cardType}`)
  }
}

export {
  generateCircleCard,
  generateCrossCard,
  generateStarCard,
  generateTriangleCard,
  generateSquareCard,
  generateWhotCard,
  generateCardBack,
}
