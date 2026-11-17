// SmiTriX — Body Type Targeted Workout Protocols
// Scientifically tailored training programs optimized for distinct metabolic & physiological body types:
// Ectomorph (Fast metabolism / Hardgainer), Mesomorph (Athletic power & hypertrophy), Endomorph (Metabolic conditioning & strength)

import { uid } from './format.js'

export const BODY_TYPE_PLANS = {
  'ectomorph-mass': {
    id: 'ectomorph-mass',
    name: 'Ectomorph: Heavy Mass Foundation',
    category: 'body-type',
    bodyType: 'Ectomorph',
    badge: 'Hardgainer Hypertrophy',
    tagline: 'Low volume, maximum mechanical tension, heavy compound mass builders.',
    days: 3,
    about: 'Engineered for fast metabolisms and slender frames. Focuses on heavy multi-joint compounds with longer rest periods (2.5–3 min) to minimize unnecessary caloric burn while maximizing myofibrillar hypertrophy.',
    tips: [
      'Keep sessions under 55 minutes to prevent excessive catabolic stress.',
      'Prioritize progressive overload on the Big 3 compounds.',
      'Rest 2 to 3 minutes between heavy working sets.',
      'Maintain a caloric surplus with 1.8–2.2g of protein per kg of bodyweight.'
    ],
    routines: [
      [
        'ecto-chest-arms',
        'Ecto: Chest, Shoulders & Biceps',
        'barbell',
        [
          ['0025', 4, 6],   // Barbell Bench Press (Heavy 4x6)
          ['0314', 3, 8],   // Dumbbell Incline Bench Press
          ['0426', 3, 8],   // Barbell Overhead Press
          ['0334', 3, 10],  // Dumbbell Lateral Raise
          ['0031', 3, 8],   // Barbell Biceps Curl
          ['0060', 3, 8]    // Barbell Skull Crusher
        ]
      ],
      [
        'ecto-back-triceps',
        'Ecto: Back, Rear Delts & Triceps',
        'pullup',
        [
          ['0085', 4, 5],   // Barbell Romanian Deadlift (Heavy 4x5)
          ['2330', 4, 6],   // Wide Pull Up / Weighted
          ['0027', 3, 8],   // Barbell Bent Over Row
          ['1323', 3, 8],   // Lat Pulldown
          ['0241', 3, 10],  // Cable Triceps Pushdown
          ['0375', 3, 10]   // Dumbbell Pullover
        ]
      ],
      [
        'ecto-legs',
        'Ecto: Lower Body Heavy Density',
        'legs',
        [
          ['0043', 4, 6],   // Barbell Back Squat
          ['0739', 3, 8],   // Leg Press
          ['0586', 3, 10],  // Lying Leg Curl
          ['0585', 3, 10],  // Leg Extension
          ['0605', 4, 12]   // Standing Calf Raise
        ]
      ]
    ],
    schedule: [
      [1, 'ecto-chest-arms'],   // Monday
      [3, 'ecto-back-triceps'], // Wednesday
      [5, 'ecto-legs']          // Friday
    ]
  },

  'mesomorph-phul': {
    id: 'mesomorph-phul',
    name: 'Mesomorph: Power & Hypertrophy (PHUL)',
    category: 'body-type',
    bodyType: 'Mesomorph',
    badge: 'Athletic Power & Pump',
    tagline: 'High responsiveness split fusing raw power days with high-volume hypertrophy work.',
    days: 4,
    about: 'Tailored for naturally athletic builds that respond aggressively to varied training stimuli. Uses 2 Power days (3–5 reps, heavy loads) and 2 Hypertrophy days (8–12 reps, intense muscle pumps and metabolic stress).',
    tips: [
      'Explode on the concentric phase during power days.',
      'Control the 3-second eccentric tempo during hypertrophy days.',
      'Mesomorphs thrive on high training frequency and versatile stimulus.',
      'Balance clean carbohydrates around workout windows.'
    ],
    routines: [
      [
        'meso-upper-power',
        'Upper Body Power',
        'barbell',
        [
          ['0025', 4, 5],   // Barbell Bench Press (Heavy Power)
          ['0027', 4, 5],   // Barbell Bent Over Row
          ['0426', 3, 6],   // Overhead Press
          ['2330', 3, 6],   // Pull Up
          ['0031', 3, 6],   // Barbell Curl
          ['0060', 3, 6]    // Skull Crusher
        ]
      ],
      [
        'meso-lower-power',
        'Lower Body Power',
        'legs',
        [
          ['0043', 4, 5],   // Barbell Squat
          ['0085', 3, 5],   // Barbell Deadlift
          ['0739', 3, 8],   // Leg Press
          ['0586', 3, 8],   // Leg Curl
          ['0605', 4, 10]   // Standing Calf Raise
        ]
      ],
      [
        'meso-upper-hyper',
        'Upper Body Hypertrophy',
        'figureStrength',
        [
          ['0314', 3, 10],  // Dumbbell Incline Bench Press
          ['1323', 3, 10],  // Lat Pulldown
          ['0308', 3, 12],  // Dumbbell Fly
          ['0334', 4, 12],  // Dumbbell Lateral Raise
          ['0315', 3, 10],  // Dumbbell Incline Curl
          ['0241', 3, 12]   // Cable Triceps Pushdown
        ]
      ],
      [
        'meso-lower-hyper',
        'Lower Body Hypertrophy',
        'legs',
        [
          ['0042', 3, 8],   // Barbell Front Squat
          ['0085', 3, 10],  // Romanian Deadlift
          ['0585', 3, 12],  // Leg Extension
          ['0586', 3, 12],  // Leg Curl
          ['0605', 4, 15]   // Standing Calf Raise
        ]
      ]
    ],
    schedule: [
      [1, 'meso-upper-power'], // Monday
      [2, 'meso-lower-power'], // Tuesday
      [4, 'meso-upper-hyper'], // Thursday
      [5, 'meso-lower-hyper']  // Friday
    ]
  },

  'endomorph-shred': {
    id: 'endomorph-shred',
    name: 'Endomorph: High-Density Metabolic Shred',
    category: 'body-type',
    bodyType: 'Endomorph',
    badge: 'Metabolic Fat Incinerator',
    tagline: 'High density, short rest intervals, compound complexes to ignite metabolic rate.',
    days: 4,
    about: 'Optimized for slower metabolisms prone to fat retention. Features high-density compound training, paired agonist/antagonist supersets, and shorter rest intervals (45–60 sec) to sustain elevated EPOC (excess post-exercise oxygen consumption) and preserve dense muscle mass.',
    tips: [
      'Keep rest periods strictly timed at 45 to 60 seconds.',
      'Squeeze the contraction at the peak of each rep to maximize muscle density.',
      'Endomorphs excel at handling higher set volumes and work capacity.',
      'Pair this split with a high-protein, moderate-carb diet.'
    ],
    routines: [
      [
        'endo-push-core',
        'Density Push & Core Burn',
        'barbell',
        [
          ['0025', 4, 10],  // Barbell Bench Press
          ['0314', 3, 12],  // Dumbbell Incline Press
          ['0426', 3, 10],  // Overhead Press
          ['0334', 3, 15],  // Dumbbell Lateral Raise
          ['0241', 3, 12],  // Cable Triceps Pushdown
          ['0001', 3, 20]   // 3/4 Sit-up Core Circuit
        ]
      ],
      [
        'endo-pull-burn',
        'Metabolic Pull & Posterior',
        'pullup',
        [
          ['0085', 4, 8],   // Barbell Romanian Deadlift
          ['2330', 3, 8],   // Pull Up
          ['0027', 3, 10],  // Barbell Bent Over Row
          ['1323', 3, 12],  // Lat Pulldown
          ['0031', 3, 12],  // Barbell Curl
          ['0375', 3, 12]   // Dumbbell Pullover
        ]
      ],
      [
        'endo-leg-inferno',
        'Leg Compound Inferno',
        'legs',
        [
          ['0043', 4, 10],  // Barbell Squat
          ['0739', 3, 12],  // Leg Press
          ['0585', 3, 15],  // Leg Extension
          ['0586', 3, 15],  // Leg Curl
          ['0605', 4, 20]   // Standing Calf Raise
        ]
      ],
      [
        'endo-full-complex',
        'Full Body Metabolic Gauntlet',
        'figureStrength',
        [
          ['0042', 3, 10],  // Front Squat
          ['0025', 3, 10],  // Bench Press
          ['0027', 3, 10],  // Barbell Row
          ['0334', 3, 12],  // Lateral Raise
          ['0003', 3, 25]   // Air Bike Core Finisher
        ]
      ]
    ],
    schedule: [
      [1, 'endo-push-core'],    // Monday
      [2, 'endo-pull-burn'],    // Tuesday
      [4, 'endo-leg-inferno'],   // Thursday
      [6, 'endo-full-complex']  // Saturday
    ]
  }
}

const build = routines =>
  routines.map(([, name, emoji, list]) => ({
    id: uid(),
    name,
    emoji,
    ex: list.map(([id, sets, reps]) => ({ id, sets, reps, weight: 0 }))
  }))

export const bodyTypePlanOptions = () =>
  Object.entries(BODY_TYPE_PLANS).map(([id, plan]) => ({
    id,
    name: plan.name,
    days: plan.schedule.length,
    bodyType: plan.bodyType,
    badge: plan.badge,
    tagline: plan.tagline,
    about: plan.about,
    tips: plan.tips
  }))

export const bodyTypePlanDays = id => BODY_TYPE_PLANS[id]?.schedule.map(([day]) => day) ?? null

export const buildBodyTypePlan = id => {
  const plan = BODY_TYPE_PLANS[id]
  if (!plan) return null
  const routines = build(plan.routines)
  const byKey = Object.fromEntries(plan.routines.map(([key], i) => [key, routines[i].id]))
  return {
    routines,
    schedule: plan.schedule.map(([day, key]) => ({ day, routineId: byKey[key] }))
  }
}
