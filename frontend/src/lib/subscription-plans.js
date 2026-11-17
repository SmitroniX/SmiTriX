/**
 * Modular Plans & Feature Management for SmiTriX.
 * Allows adding, modifying, or retiring tiers without rewriting application logic.
 */

export const PLANS = [
  {
    id: 'free',
    name: 'Free Plan',
    tierCode: 'TIER_FREE_COMMUNITY',
    subtitle: 'Full-featured self-hosted core',
    badge: 'Standard Core',
    isLegacy: false,
    price: '$0',
    billingPeriod: 'Forever Free',
    description: 'Autonomous, private workout logging, local history, and essential bodyweight tracking with zero subscription fees.',
    highlights: [
      '100% Local-first data control',
      'No ads, no forced tracking',
      'Full exercise library with animated instructions'
    ],
    features: [
      { key: 'unlimited_workouts', label: 'Unlimited Workout Logging', included: true, isLegacy: false },
      { key: 'exercise_library', label: '1,324 Exercise Database with Form Demos', included: true, isLegacy: false },
      { key: 'starter_splits', label: 'Classic Starter Splits (PPL, Upper/Lower, 5x5)', included: true, isLegacy: false },
      { key: 'body_map', label: 'Interactive 3D Body & Muscle Explorer', included: true, isLegacy: false },
      { key: 'bodyweight_chart', label: 'Bodyweight Trend & Goal Line Charting', included: true, isLegacy: false },
      { key: 'custom_routines', label: 'Up to 5 Custom Training Routines', included: true, isLegacy: false, limit: '5 Routines' },
      { key: 'local_storage', label: 'Local-Device Data Persistence', included: true, isLegacy: false },
      { key: 'qr_routine_share', label: 'In-Person QR Routine Sharing', included: true, isLegacy: false },
      { key: 'cloud_sync', label: 'Real-time Multi-Device Cloud Sync', included: false, isLegacy: false },
      { key: 'legend_splits', label: 'Golden Era Legend Protocols (Arnold, Mentzer, Yates)', included: false, isLegacy: true },
      { key: 'somatotype_engine', label: 'Somatotype Metabolic Conditioning Plans', included: false, isLegacy: false },
      { key: 'ai_coach_cadence', label: 'Autonomous AI Coach Weekly Progression', included: false, isLegacy: false }
    ],
    benefits: [
      'Complete privacy: workout logs never leave your personal device unless opted in',
      'Zero vendor lock-in with one-tap JSON export & backup',
      'Fast, offline-capable PWA with zero latency during gym sessions'
    ],
    limitations: [
      'Routines limited to 5 concurrent active routines',
      'Manual backup required when switching browsers without cloud sync',
      'Excludes Golden Era Legend training templates and AI Coach progression reviews'
    ]
  },
  {
    id: 'legacy',
    name: 'Legacy Plan',
    tierCode: 'TIER_GOLDEN_ERA_LEGACY',
    subtitle: 'Classic Golden Era & Elite Athletic Vault',
    badge: 'Legacy Tier',
    isLegacy: true,
    price: 'Lifetime',
    billingPeriod: 'Grandfathered / Founder Access',
    description: 'Dedicated legacy archive providing classic Golden Era bodybuilding protocols, Somatotype training matrices, and advanced telemetry.',
    highlights: [
      'All 5 Golden Era Legend Splits included',
      'Ectomorph, Mesomorph & Endomorph custom protocols',
      'Unlimited routine slots and cloud synchronization'
    ],
    features: [
      { key: 'unlimited_workouts', label: 'Unlimited Workout Logging', included: true, isLegacy: false },
      { key: 'exercise_library', label: '1,324 Exercise Database with Form Demos', included: true, isLegacy: false },
      { key: 'starter_splits', label: 'Classic Starter Splits (PPL, Upper/Lower, 5x5)', included: true, isLegacy: false },
      { key: 'body_map', label: 'Interactive 3D Body & Muscle Explorer', included: true, isLegacy: false },
      { key: 'bodyweight_chart', label: 'Bodyweight Trend & Goal Line Charting', included: true, isLegacy: false },
      { key: 'custom_routines', label: 'Unlimited Custom Training Routines', included: true, isLegacy: false, limit: 'Unlimited' },
      { key: 'local_storage', label: 'Local-Device Data Persistence', included: true, isLegacy: false },
      { key: 'qr_routine_share', label: 'In-Person QR Routine Sharing & Import', included: true, isLegacy: false },
      { key: 'cloud_sync', label: 'Real-time Multi-Device Cloud Sync', included: true, isLegacy: false },
      { key: 'legend_splits', label: 'Golden Era Legend Protocols (Arnold, Mentzer, Yates, Zane, Platz)', included: true, isLegacy: true, highlight: true },
      { key: 'somatotype_engine', label: 'Somatotype Metabolic Conditioning Plans', included: true, isLegacy: true, highlight: true },
      { key: 'ai_coach_cadence', label: 'Autonomous AI Coach Weekly Progression & Reviews', included: true, isLegacy: false, highlight: true }
    ],
    benefits: [
      'Lifetime access to historical Golden Era high-intensity and volume splits',
      'Tailored rep-range and recovery advice tailored to your physical somatotype',
      'Automated cloud synchronization across all devices and phones with passkey encryption',
      'Priority access to all experimental athletic analytics and 1,000-lb club badges'
    ],
    limitations: [
      'Legacy split templates adhere strictly to historic training doctrines',
      'Certain high-intensity HIT protocols require strict adherence to recovery intervals'
    ]
  }
]

export function getPlanById(id) {
  return PLANS.find(p => p.id === id) || PLANS[0]
}

export function getFreePlan() {
  return PLANS.find(p => p.id === 'free')
}

export function getLegacyPlan() {
  return PLANS.find(p => p.id === 'legacy')
}

export function isFeatureAllowed(planId, featureKey) {
  const plan = getPlanById(planId)
  const item = plan?.features?.find(f => f.key === featureKey)
  return !!item?.included
}
