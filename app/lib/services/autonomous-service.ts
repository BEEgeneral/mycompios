/**
 * Autonomous Mode Service - God Mode equivalent
 * Pricing tiers for continuous AI agent operation
 */

export interface AutonomousTier {
  id: string
  duration: number // hours
  durationLabel: string // "1H", "2H", "3H", etc.
  price: number // in cents
  priceLabel: string // "€19", "€35", etc.
  hourlyRate: number // cents per hour
  hourlyRateLabel: string // "€19/hr"
  features: string[]
}

export const AUTONOMOUS_TIERS: AutonomousTier[] = [
  {
    id: '1h',
    duration: 1,
    durationLabel: '1H',
    price: 1900,
    priceLabel: '€19',
    hourlyRate: 1900,
    hourlyRateLabel: '€19/hr',
    features: ['1 hora de ejecución autónoma', 'Acceso a todos los agentes', 'Toma de decisiones automática']
  },
  {
    id: '2h',
    duration: 2,
    durationLabel: '2H',
    price: 3500,
    priceLabel: '€35',
    hourlyRate: 1750,
    hourlyRateLabel: '€17.50/hr',
    features: ['2 horas de ejecución autónoma', 'Acceso a todos los agentes', 'Toma de decisiones automática', '8% descuento']
  },
  {
    id: '3h',
    duration: 3,
    durationLabel: '3H',
    price: 4900,
    priceLabel: '€49',
    hourlyRate: 1633,
    hourlyRateLabel: '€16.33/hr',
    features: ['3 horas de ejecución autónoma', 'Acceso a todos los agentes', 'Toma de decisiones automática', '14% descuento']
  },
  {
    id: '6h',
    duration: 6,
    durationLabel: '6H',
    price: 7900,
    priceLabel: '€79',
    hourlyRate: 1317,
    hourlyRateLabel: '€13.17/hr',
    features: ['6 horas de ejecución autónoma', 'Acceso a todos los agentes', 'Toma de decisiones automática', '31% descuento']
  },
  {
    id: '12h',
    duration: 12,
    durationLabel: '12H',
    price: 14900,
    priceLabel: '€149',
    hourlyRate: 1242,
    hourlyRateLabel: '€12.42/hr',
    features: ['12 horas de ejecución autónoma', 'Acceso a todos los agentes', 'Toma de decisiones automática', '35% descuento']
  },
  {
    id: '24h',
    duration: 24,
    durationLabel: '24H',
    price: 24900,
    priceLabel: '€249',
    hourlyRate: 1038,
    hourlyRateLabel: '€10.38/hr',
    features: ['24 horas de ejecución autónoma', 'Acceso a todos los agentes', 'Toma de decisiones automática', '45% descuento']
  },
  {
    id: '48h',
    duration: 48,
    durationLabel: '48H',
    price: 37900,
    priceLabel: '€379',
    hourlyRate: 790,
    hourlyRateLabel: '€7.90/hr',
    features: ['48 horas de ejecución autónoma', 'Acceso a todos los agentes', 'Toma de decisiones automática', '58% descuento']
  },
  {
    id: '72h',
    duration: 72,
    durationLabel: '3D',
    price: 49900,
    priceLabel: '€499',
    hourlyRate: 693,
    hourlyRateLabel: '€6.93/hr',
    features: ['72 horas de ejecución autónoma', 'Acceso a todos los agentes', 'Toma de decisiones automática', '64% descuento']
  },
  {
    id: '7d',
    duration: 168,
    durationLabel: '7D',
    price: 99900,
    priceLabel: '€999',
    hourlyRate: 595,
    hourlyRateLabel: '€5.95/hr',
    features: ['7 días de ejecución autónoma', 'Acceso a todos los agentes', 'Toma de decisiones automática', '69% descuento', 'Soporte prioritario']
  }
]

export function getTier(tierId: string): AutonomousTier | undefined {
  return AUTONOMOUS_TIERS.find(t => t.id === tierId)
}

export function getCheapestTier(): AutonomousTier {
  return AUTONOMOUS_TIERS[AUTONOMOUS_TIERS.length - 1]
}

export function getMostPopular(): AutonomousTier {
  // 24H is the sweet spot
  return AUTONOMOUS_TIERS[5]
}

// Stripe price IDs (would need to be configured in Stripe dashboard)
export const STRIPE_PRICES: Record<string, string> = {
  '1h': process.env.STRIPE_PRICE_1H || 'price_1h_autonomous',
  '2h': process.env.STRIPE_PRICE_2H || 'price_2h_autonomous',
  '3h': process.env.STRIPE_PRICE_3H || 'price_3h_autonomous',
  '6h': process.env.STRIPE_PRICE_6H || 'price_6h_autonomous',
  '12h': process.env.STRIPE_PRICE_12H || 'price_12h_autonomous',
  '24h': process.env.STRIPE_PRICE_24H || 'price_24h_autonomous',
  '48h': process.env.STRIPE_PRICE_48H || 'price_48h_autonomous',
  '72h': process.env.STRIPE_PRICE_72H || 'price_72h_autonomous',
  '7d': process.env.STRIPE_PRICE_7D || 'price_7d_autonomous'
}