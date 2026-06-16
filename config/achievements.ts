export interface AchievementDef {
  id:          string
  name:        string
  description: string
  icon:        string
  category:    'milestone' | 'accuracy' | 'score' | 'difficulty' | 'mode' | 'career' | 'combined' | 'mastery' | 'prestige'
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Milestone
  { id: 'first_voyage',        name: 'First Voyage',           description: 'Complete your first game.',                                         icon: '⛵', category: 'milestone'  },
  { id: 'seasoned_traveler',   name: 'Seasoned Traveler',      description: 'Complete 10 games.',                                                icon: '🧭', category: 'milestone'  },
  { id: 'veteran_explorer',    name: 'Veteran Explorer',        description: 'Complete 50 games.',                                                icon: '⚓', category: 'milestone'  },
  { id: 'world_wanderer',      name: 'World Wanderer',          description: 'Complete 100 games.',                                               icon: '🌍', category: 'milestone'  },
  // Accuracy
  { id: 'sharpshooter',        name: 'Sharpshooter',           description: 'Get 100% accuracy in a game of 5 or more rounds.',                  icon: '🎯', category: 'accuracy'   },
  { id: 'marathon_ace',        name: 'Marathon Ace',            description: 'Get 100% accuracy in a 20-round game.',                            icon: '🏅', category: 'accuracy'   },
  { id: 'perfectionist',       name: 'Perfectionist',           description: 'Complete 5 separate games each with 100% accuracy.',                icon: '💯', category: 'accuracy'   },
  // Score
  { id: 'high_achiever',       name: 'High Achiever',           description: 'Score 1,000+ points in a single game.',                            icon: '⭐', category: 'score'      },
  { id: 'elite_scorer',        name: 'Elite Scorer',            description: 'Score 3,000+ points in a single game.',                            icon: '🌟', category: 'score'      },
  { id: 'legend',              name: 'Legend',                  description: 'Score 5,000+ points in a single game.',                            icon: '👑', category: 'score'      },
  // Difficulty — the hardest setting is shown to players as the "Obscure" country pool.
  { id: 'expert_initiate',     name: 'Expert Initiate',         description: 'Complete any game on the Obscure country pool.',                    icon: '🔥', category: 'difficulty' },
  { id: 'expert_veteran',      name: 'Expert Veteran',          description: 'Complete 10 games on the Obscure country pool.',                    icon: '💎', category: 'difficulty' },
  { id: 'no_easy_roads',       name: 'No Easy Roads',           description: 'Complete 25 games on the Obscure country pool.',                   icon: '🗻', category: 'difficulty' },
  // Mode
  { id: 'grand_tourist',       name: 'Grand Tourist',           description: 'Complete a Grand Tour game.',                                       icon: '🗺️', category: 'mode'       },
  { id: 'globe_trotter',       name: 'Globe Trotter',           description: 'Play every game mode at least once.',                              icon: '🌐', category: 'mode'       },
  // Career
  { id: 'consistent_adventurer', name: 'Consistent Adventurer', description: 'Maintain 80%+ overall accuracy across 20 or more games.',          icon: '📊', category: 'career'     },
  { id: 'master_navigator',    name: 'Master Navigator',        description: 'Maintain 90%+ overall accuracy across 10 or more games.',          icon: '🧠', category: 'career'     },
  // Combined
  { id: 'expert_marksman',     name: 'Expert Marksman',         description: 'Get 100% accuracy on an Obscure-pool game.',                       icon: '🏆', category: 'combined'   },
  { id: 'hard_carry',          name: 'Hard Carry',              description: 'Get 100% accuracy on a Familiar-pool game.',                       icon: '🎖️', category: 'combined'   },
  { id: 'globe_scholar',       name: 'Globe Scholar',           description: 'Complete 10 games across 5 or more different modes.',              icon: '📚', category: 'combined'   },
  // Mastery — perfect runs on the Obscure country pool, 20 rounds, timer on, all correct.
  { id: 'perfect_region',   name: 'Continental Command',   description: 'Get a perfect score in The Continental — 20 rounds, Obscure pool, timer on.',      icon: '🌍', category: 'mastery' },
  { id: 'perfect_language', name: 'Supreme Linguist',      description: 'Get a perfect score in The Linguist — 20 rounds, Obscure pool, timer on.',         icon: '🗣️', category: 'mastery' },
  { id: 'perfect_banner',   name: 'Master Vexillologist',  description: 'Get a perfect score in The Banner Game — 20 rounds, Obscure pool, timer on.',      icon: '🏴', category: 'mastery' },
  { id: 'perfect_pin',      name: 'Eagle-Eyed Navigator',  description: 'Get a perfect score in The Pin Drop — 20 rounds, Obscure pool, timer on.',         icon: '📍', category: 'mastery' },
  { id: 'perfect_cart',     name: 'Flawless Cartographer', description: 'Get a perfect score in The Cartographer — 20 rounds, Obscure pool, timer on.',     icon: '🗺️', category: 'mastery' },
  { id: 'perfect_capital',  name: 'Capital Mastermind',    description: 'Get a perfect score in The Capital Cities — 20 rounds, Obscure pool, timer on.',   icon: '🏛️', category: 'mastery' },
  { id: 'perfect_shape',    name: 'Shadow Reader',         description: 'Get a perfect score in The Silhouette — 20 rounds, Obscure pool, timer on.',       icon: '🌑', category: 'mastery' },
  { id: 'perfect_province', name: 'Sovereign Surveyor',    description: 'Get a perfect score in The Province — 20 rounds, Obscure pool, timer on.',         icon: '📋', category: 'mastery' },
  // Prestige — meta-achievements awarded for completing entire achievement sets.
  { id: 'meridian_conqueror', name: 'Meridian Conqueror', description: 'Earn all 8 Mastery achievements — a flawless Obscure-pool run across every game mode.',                icon: '🌐', category: 'prestige' },
  { id: 'true_meridian',      name: 'True Meridian',      description: 'Unlock every other achievement.',                                                                        icon: '✨', category: 'prestige' },
]

export const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map((a) => [a.id, a]))
