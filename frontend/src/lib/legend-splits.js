// SmiTriX — Legendary Golden Era & Old School Bodybuilding Splits
// Authentic workout splits and training philosophies from the golden pantheon of bodybuilding:
// Arnold Schwarzenegger, Mike Mentzer, Dorian Yates, Frank Zane, and Tom Platz.

import { uid } from './format.js'

export const LEGEND_PLANS = {
  'arnold-golden-era': {
    id: 'arnold-golden-era',
    name: "Arnold Schwarzenegger: Golden Era Blueprint",
    legend: 'Arnold Schwarzenegger (7× Mr. Olympia)',
    era: '1970s Venice Beach',
    badge: 'The Oak Blueprint',
    tagline: 'High-volume antagonist supersets creating skin-splitting chest & back pumps.',
    days: 3,
    about: "Arnold's signature 3-day split revolving around antagonist supersets: pairing chest with back, and biceps with triceps. This protocol pumps immense blood volume through opposing muscle groups, expands ribcage capacity with pullovers, and builds the iconic 1970s V-taper.",
    philosophy: '“The pump is the greatest feeling in the gym. Your muscles feel like they are about to explode with blood. Shock the muscle; don’t let it adapt.”',
    routines: [
      [
        'arnold-chest-back',
        'Golden Era: Chest & Back Superset',
        'barbell',
        [
          ['0025', 4, 10],  // Barbell Bench Press (Heavy 4x10)
          ['2330', 4, 10],  // Wide-Grip Chin Up (Superset partner)
          ['0314', 4, 10],  // Dumbbell Incline Bench Press
          ['0027', 4, 10],  // Barbell Bent Over Row
          ['0308', 3, 12],  // Dumbbell Fly
          ['0375', 3, 15]   // Dumbbell Pullover (The Ribcage Expander)
        ]
      ],
      [
        'arnold-shoulders-arms',
        'Golden Era: Delts & Arm Cannon',
        'arm',
        [
          ['0426', 4, 8],   // Barbell Overhead Press
          ['0334', 4, 12],  // Dumbbell Lateral Raise (Strict side delt focus)
          ['0031', 4, 10],  // Standing Barbell Curl
          ['0060', 4, 10],  // Barbell Skull Crusher
          ['0315', 3, 12],  // Dumbbell Incline Biceps Curl
          ['0241', 3, 12]   // Cable Triceps Pushdown
        ]
      ],
      [
        'arnold-legs',
        'Golden Era: Leg Architecture',
        'legs',
        [
          ['0043', 5, 10],  // Barbell Back Squat (Full depth)
          ['0085', 4, 10],  // Romanian Deadlift
          ['0739', 4, 12],  // Leg Press
          ['0586', 4, 12],  // Leg Curl
          ['0585', 3, 15],  // Leg Extension
          ['0605', 5, 15]   // Standing Calf Raise (High volume)
        ]
      ]
    ],
    schedule: [
      [1, 'arnold-chest-back'],       // Monday
      [3, 'arnold-shoulders-arms'],   // Wednesday
      [5, 'arnold-legs']              // Friday
    ]
  },

  'mentzer-heavy-duty': {
    id: 'mentzer-heavy-duty',
    name: "Mike Mentzer: Heavy Duty (H.I.T.)",
    legend: 'Mike Mentzer (Mr. America & Mr. Universe 300 Max Score)',
    era: '1970s–1980s Scientific H.I.T.',
    badge: 'High Intensity Training',
    tagline: 'Ultra-low volume, maximum mental grit, 1 all-out set pushed far beyond failure.',
    days: 3,
    about: "Mike Mentzer's radical, hyper-scientific High Intensity Training (H.I.T.). Based on Arthur Jones' principles: muscle growth is triggered by maximum intensity, not endless sets. Every exercise features thorough warmups followed by strictly ONE or TWO all-out working sets taken to positive, static, and negative failure with rest-pause clusters.",
    philosophy: '“Man is not an infinite machine. You can train hard or you can train long, but you cannot do both. One set to 100% true failure is all nature requires.”',
    routines: [
      [
        'mentzer-chest-back',
        'Heavy Duty: Torso Annihilation',
        'barbell',
        [
          ['0308', 2, 8],   // Dumbbell Fly (Pre-exhaust isolate)
          ['0047', 2, 6],   // Incline Barbell Press (Failure compound)
          ['0375', 2, 8],   // Dumbbell Pullover (Pre-exhaust lat)
          ['1323', 2, 6],   // Lat Pulldown (To absolute failure)
          ['0085', 2, 6]    // Deadlift (Raw power overload)
        ]
      ],
      [
        'mentzer-legs',
        'Heavy Duty: Lower Body Threshold',
        'legs',
        [
          ['0585', 2, 10],  // Leg Extension (Pre-exhaust quads)
          ['0043', 2, 8],   // Barbell Squat (Brutal all-out set)
          ['0586', 2, 8],   // Leg Curl (Rest-pause to failure)
          ['0605', 2, 12]   // Standing Calf Raise (Peak hold 3s)
        ]
      ],
      [
        'mentzer-delts-arms',
        'Heavy Duty: Deltoids & Arms Peak',
        'arm',
        [
          ['0334', 2, 8],   // Lateral Raise (Pre-exhaust)
          ['0426', 2, 6],   // Barbell Overhead Press
          ['0031', 2, 6],   // Barbell Curl (Heavy slow eccentric)
          ['0241', 2, 6]    // Triceps Pushdown (Drop-set to failure)
        ]
      ]
    ],
    schedule: [
      [1, 'mentzer-chest-back'], // Monday
      [3, 'mentzer-legs'],       // Wednesday
      [5, 'mentzer-delts-arms']  // Friday
    ]
  },

  'dorian-blood-and-guts': {
    id: 'dorian-blood-and-guts',
    name: "Dorian Yates: Blood & Guts",
    legend: 'Dorian Yates (6× Mr. Olympia "The Shadow")',
    era: '1990s Temple Gym Birmingham',
    badge: 'Blood & Guts Intensity',
    tagline: 'Cold, gritty industrial intensity. 1 working set pushed to absolute destruction.',
    days: 4,
    about: 'Dorian Yates revolutionized the Olympia stage with inhuman muscle density forged in the underground dungeon of Temple Gym. 4-day split: 1-2 progressive warmups, followed by a terrifying final working set executed with immaculate form, followed by rest-pause, partials, and negative reps.',
    philosophy: '“I did not come here to play games. I came here to do what needs to be done. 45 minutes of pure hell, then walk away and let the muscle grow.”',
    routines: [
      [
        'dorian-delts-triceps',
        'Blood & Guts: Delts & Triceps',
        'arm',
        [
          ['0426', 3, 8],   // Barbell Overhead Press (Work set to failure)
          ['0334', 3, 10],  // DB Lateral Raise
          ['0241', 3, 8],   // Cable Triceps Pushdown
          ['0060', 3, 8]    // Barbell Skull Crusher
        ]
      ],
      [
        'dorian-back',
        'Blood & Guts: Barn Door Back',
        'pullup',
        [
          ['0375', 3, 10],  // DB Pullover (Pre-exhaust)
          ['1323', 3, 8],   // Lat Pulldown (Reverse underhand grip)
          ['0027', 3, 8],   // Barbell Bent Over Row (The Yates Row)
          ['0085', 3, 8]    // Romanian Deadlift
        ]
      ],
      [
        'dorian-chest-biceps',
        'Blood & Guts: Chest & Biceps',
        'barbell',
        [
          ['0314', 3, 8],   // Incline Dumbbell Bench Press
          ['0025', 3, 8],   // Flat Barbell Bench Press
          ['0308', 2, 10],  // Dumbbell Fly
          ['0070', 3, 8],   // Barbell Preacher Curl
          ['0315', 2, 8]    // DB Incline Curl
        ]
      ],
      [
        'dorian-legs',
        'Blood & Guts: Wheel Destruction',
        'legs',
        [
          ['0585', 3, 12],  // Leg Extension
          ['0739', 3, 10],  // Leg Press
          ['0046', 3, 10],  // Hack Squat
          ['0586', 3, 8],   // Leg Curl
          ['0605', 3, 12]   // Standing Calf Raise
        ]
      ]
    ],
    schedule: [
      [1, 'dorian-delts-triceps'], // Monday
      [2, 'dorian-back'],          // Tuesday
      [4, 'dorian-chest-biceps'],  // Thursday
      [5, 'dorian-legs']           // Friday
    ]
  },

  'frank-zane-aesthetic': {
    id: 'frank-zane-aesthetic',
    name: "Frank Zane: Golden Aesthetics & Vacuum",
    legend: 'Frank Zane (3× Mr. Olympia "The Chemist")',
    era: 'Late 1970s Aesthetics & Proportion',
    badge: 'Golden Ratio Symmetry',
    tagline: 'Mastery of lines, tapering waist, vacuum control, and sculptural definition.',
    days: 3,
    about: 'Frank Zane defeated giants by prioritizing aesthetic harmony, shoulder-to-waist tapering (the Golden Ratio), and muscle striations. This 3-way split targets Back/Biceps, Legs/Calves/Core, and Chest/Shoulders/Triceps with moderate-to-high reps and surgical mind-muscle connection.',
    philosophy: '“Numbers are meaningless if the mirror does not agree. Build proportion, create width at the top, shrink the waist, and master the stomach vacuum.”',
    routines: [
      [
        'zane-pull',
        'Aesthetics: Back & Biceps Width',
        'pullup',
        [
          ['2330', 4, 10],  // Wide Grip Chin Up
          ['0027', 3, 10],  // Barbell Bent Over Row
          ['1323', 3, 12],  // Lat Pulldown
          ['0375', 3, 12],  // Dumbbell Pullover
          ['0315', 3, 10],  // Dumbbell Incline Biceps Curl
          ['0031', 3, 12]   // Barbell Curl
        ]
      ],
      [
        'zane-legs-abs',
        'Aesthetics: Sculpted Legs & Waist',
        'legs',
        [
          ['0042', 4, 10],  // Barbell Front Squat (Quad teardrop focus)
          ['0739', 3, 12],  // Leg Press
          ['0586', 3, 12],  // Lying Leg Curl
          ['0605', 4, 15],  // Standing Calf Raise
          ['0001', 4, 25]   // 3/4 Sit-up (Core / vacuum control)
        ]
      ],
      [
        'zane-push',
        'Aesthetics: Upper Chest & V-Taper',
        'barbell',
        [
          ['0314', 4, 10],  // Dumbbell Incline Bench Press
          ['0025', 3, 10],  // Flat Barbell Bench Press
          ['0308', 3, 12],  // Dumbbell Fly
          ['0334', 4, 15],  // Dumbbell Lateral Raise (V-Taper builder)
          ['0060', 3, 12],  // Barbell Skull Crusher
          ['0241', 3, 12]   // Cable Triceps Pushdown
        ]
      ]
    ],
    schedule: [
      [1, 'zane-pull'],     // Monday
      [3, 'zane-legs-abs'], // Wednesday
      [5, 'zane-push']      // Friday
    ]
  },

  'tom-platz-legs': {
    id: 'tom-platz-legs',
    name: "Tom Platz: The Quadfather Split",
    legend: 'Tom Platz (The Golden Eagle)',
    era: '1980s High Volume Hell',
    badge: 'Quadfather Leg Protocol',
    tagline: 'Legendary high-rep squat intensity and extreme lower body conditioning.',
    days: 3,
    about: 'Tom Platz built legs that defied human anatomy through insane psychological threshold tolerance: 20–30 rep squat sets, drop-sets that left him crawling, and uncompromising range of motion. Paired with intense upper body support days.',
    philosophy: '“Don’t count the reps until it starts hurting. When your mind says you are finished, you have 10 more reps in you.”',
    routines: [
      [
        'platz-legs',
        'The Golden Eagle: Leg Massacre',
        'legs',
        [
          ['0043', 5, 15],  // Barbell Squat (Deep, 15-20 reps to tears)
          ['0046', 4, 15],  // Barbell Hack Squat
          ['0739', 4, 20],  // Leg Press (Burnout)
          ['0585', 4, 20],  // Leg Extension (Drop set finish)
          ['0586', 4, 15],  // Lying Leg Curl
          ['0605', 5, 25]   // Standing Calf Raise
        ]
      ],
      [
        'platz-upper-a',
        'Upper Support: Chest & Back Power',
        'barbell',
        [
          ['0025', 4, 8],   // Barbell Bench Press
          ['0027', 4, 8],   // Barbell Bent Over Row
          ['0314', 3, 10],  // Incline DB Bench Press
          ['2330', 3, 10],  // Pull Up
          ['0375', 3, 12]   // DB Pullover
        ]
      ],
      [
        'platz-upper-b',
        'Upper Support: Shoulders & Arms',
        'arm',
        [
          ['0426', 4, 8],   // Barbell Overhead Press
          ['0334', 4, 12],  // Dumbbell Lateral Raise
          ['0031', 4, 10],  // Barbell Curl
          ['0060', 4, 10],  // Skull Crusher
          ['0241', 3, 12]   // Triceps Pushdown
        ]
      ]
    ],
    schedule: [
      [1, 'platz-legs'],     // Monday
      [3, 'platz-upper-a'],  // Wednesday
      [5, 'platz-upper-b']   // Friday
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

export const legendPlanOptions = () =>
  Object.entries(LEGEND_PLANS).map(([id, plan]) => ({
    id,
    name: plan.name,
    legend: plan.legend,
    era: plan.era,
    badge: plan.badge,
    tagline: plan.tagline,
    days: plan.schedule.length,
    about: plan.about,
    philosophy: plan.philosophy
  }))

export const legendPlanDays = id => LEGEND_PLANS[id]?.schedule.map(([day]) => day) ?? null

export const buildLegendPlan = id => {
  const plan = LEGEND_PLANS[id]
  if (!plan) return null
  const routines = build(plan.routines)
  const byKey = Object.fromEntries(plan.routines.map(([key], i) => [key, routines[i].id]))
  return {
    routines,
    schedule: plan.schedule.map(([day, key]) => ({ day, routineId: byKey[key] }))
  }
}
