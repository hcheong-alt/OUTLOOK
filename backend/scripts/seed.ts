/**
 * Dev seed script for OUTLOOK.
 *
 * Creates users, teams, questions, predictions, calibration scores,
 * comments, and activity log entries with realistic data.
 *
 * Usage: tsx scripts/seed.ts
 */

import { db } from '../src/db/drizzle.ts'
import {
  userTable,
  teamTable,
  teamMemberTable,
  questionTable,
  predictionTable,
  calibrationScoreTable,
  commentTable,
  activityLogTable,
} from '../src/drizzle/schema.ts'
import type { AccuracyBuckets, ExternalRef } from '../src/drizzle/schema.ts'

// ─── Helpers ────────────────────────────────────────────────────────

function uuid(): string {
  return crypto.randomUUID()
}

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

function daysFromNow(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── User IDs ───────────────────────────────────────────────────────

const adminId = uuid()
const mod1Id = uuid()
const mod2Id = uuid()
const analyst1Id = uuid()
const analyst2Id = uuid()
const analyst3Id = uuid()
const analyst4Id = uuid()
const analyst5Id = uuid()

const allUserIds = [
  adminId, mod1Id, mod2Id,
  analyst1Id, analyst2Id, analyst3Id, analyst4Id, analyst5Id,
]

const analystIds = [analyst1Id, analyst2Id, analyst3Id, analyst4Id, analyst5Id]

// ─── Team IDs ───────────────────────────────────────────────────────

const team1Id = uuid()
const team2Id = uuid()

// ─── Question IDs ───────────────────────────────────────────────────

const q = Array.from({ length: 15 }, () => uuid())

async function seed() {
  // eslint-disable-next-line no-console
  console.log('Seeding OUTLOOK database...')

  // ─── Users ──────────────────────────────────────────────────────

  await db.insert(userTable).values([
    {
      id: adminId,
      displayName: 'Bob Martinez',
      email: 'bob.martinez@example.com',
      role: 'admin',
    },
    {
      id: mod1Id,
      displayName: 'Sarah Chen',
      email: 'sarah.chen@example.com',
      role: 'moderator',
    },
    {
      id: mod2Id,
      displayName: 'James Okafor',
      email: 'james.okafor@example.com',
      role: 'moderator',
    },
    {
      id: analyst1Id,
      displayName: 'Emily Richardson',
      email: 'emily.richardson@example.com',
      role: 'analyst',
    },
    {
      id: analyst2Id,
      displayName: 'David Park',
      email: 'david.park@example.com',
      role: 'analyst',
    },
    {
      id: analyst3Id,
      displayName: 'Natasha Petrov',
      email: 'natasha.petrov@example.com',
      role: 'analyst',
    },
    {
      id: analyst4Id,
      displayName: 'Marcus Thompson',
      email: 'marcus.thompson@example.com',
      role: 'analyst',
    },
    {
      id: analyst5Id,
      displayName: 'Aisha Rahman',
      email: 'aisha.rahman@example.com',
      role: 'analyst',
    },
  ])

  // eslint-disable-next-line no-console
  console.log('  Users created')

  // ─── Teams ──────────────────────────────────────────────────────

  await db.insert(teamTable).values([
    {
      id: team1Id,
      name: 'Geopolitical Forecasting',
      description: 'Tracks geopolitical events, elections, and international relations',
      createdBy: adminId,
    },
    {
      id: team2Id,
      name: 'Economic Indicators',
      description: 'Monitors economic trends, market movements, and fiscal policy',
      createdBy: mod1Id,
    },
  ])

  await db.insert(teamMemberTable).values([
    // Team 1: Geopolitical Forecasting
    { teamId: team1Id, userId: adminId, role: 'lead' },
    { teamId: team1Id, userId: mod1Id, role: 'member' },
    { teamId: team1Id, userId: analyst1Id, role: 'member' },
    { teamId: team1Id, userId: analyst2Id, role: 'member' },
    { teamId: team1Id, userId: analyst3Id, role: 'member' },
    // Team 2: Economic Indicators
    { teamId: team2Id, userId: mod1Id, role: 'lead' },
    { teamId: team2Id, userId: mod2Id, role: 'member' },
    { teamId: team2Id, userId: analyst3Id, role: 'member' },
    { teamId: team2Id, userId: analyst4Id, role: 'member' },
    { teamId: team2Id, userId: analyst5Id, role: 'member' },
  ])

  // eslint-disable-next-line no-console
  console.log('  Teams created')

  // ─── Questions ──────────────────────────────────────────────────

  const signetRef: ExternalRef = {
    source: 'signet',
    id: 'SIGNET-TR-2026-0042',
    url: 'https://signet.example.com/tasks/SIGNET-TR-2026-0042',
  }

  await db.insert(questionTable).values([
    // 5 open questions (varied deadlines/categories)
    {
      id: q[0],
      title: 'Will the Fed raise interest rates by Q2 2026?',
      description: 'Federal Reserve monetary policy decision on the federal funds rate target range.',
      category: 'Economics',
      resolutionCriteria: 'Resolves YES if the Federal Reserve announces an increase in the federal funds rate target range at any FOMC meeting before July 1, 2026.',
      deadline: daysFromNow(90),
      status: 'open',
      createdBy: mod1Id,
      teamId: team2Id,
      tags: ['fed', 'interest-rates', 'monetary-policy'],
      visibility: 'public',
      createdAt: daysAgo(30),
    },
    {
      id: q[1],
      title: 'Will Country X hold parliamentary elections before September 2026?',
      description: 'Tracking the likelihood of early elections being called following the coalition collapse.',
      category: 'Geopolitics',
      resolutionCriteria: 'Resolves YES if official parliamentary elections are held in Country X before September 1, 2026.',
      deadline: daysFromNow(180),
      status: 'open',
      createdBy: analyst1Id,
      teamId: team1Id,
      tags: ['elections', 'geopolitics'],
      visibility: 'team',
      createdAt: daysAgo(14),
    },
    {
      id: q[2],
      title: 'Will global oil prices exceed $100/barrel by end of Q3 2026?',
      description: 'Brent crude price forecast considering OPEC+ production decisions and geopolitical tensions.',
      category: 'Energy',
      resolutionCriteria: 'Resolves YES if Brent crude oil spot price exceeds $100 USD per barrel at any point before October 1, 2026.',
      deadline: daysFromNow(200),
      status: 'open',
      createdBy: analyst3Id,
      teamId: team2Id,
      tags: ['oil', 'energy', 'commodities'],
      visibility: 'public',
      createdAt: daysAgo(7),
    },
    {
      id: q[3],
      title: 'Will Company X acquire Company Y by end of 2026?',
      description: 'Rumors of acquisition talks between the two tech companies have been circulating since Q4 2025.',
      category: 'Technology',
      resolutionCriteria: 'Resolves YES if a definitive merger/acquisition agreement is signed and publicly announced before January 1, 2027.',
      deadline: daysFromNow(295),
      status: 'open',
      createdBy: mod2Id,
      tags: ['tech', 'M&A', 'corporate'],
      externalRef: signetRef,
      visibility: 'public',
      createdAt: daysAgo(45),
    },
    {
      id: q[4],
      title: 'Will the EU pass the Digital Markets Regulation amendment by Q2 2026?',
      description: 'The proposed amendment to the DMA has been in committee since January.',
      category: 'Regulation',
      resolutionCriteria: 'Resolves YES if the European Parliament and Council formally adopt the DMA amendment before July 1, 2026.',
      deadline: daysFromNow(110),
      status: 'open',
      createdBy: analyst2Id,
      teamId: team1Id,
      tags: ['EU', 'regulation', 'tech'],
      visibility: 'team',
      createdAt: daysAgo(21),
    },

    // 5 resolved YES questions
    {
      id: q[5],
      title: 'Will inflation in the US drop below 3% by Q4 2025?',
      description: 'Core PCE inflation trending downward through 2025.',
      category: 'Economics',
      resolutionCriteria: 'Resolves YES if the US Bureau of Economic Analysis reports Core PCE inflation below 3.0% year-over-year for any month in Q4 2025.',
      deadline: daysAgo(90),
      status: 'resolved_yes',
      resolutionNotes: 'Core PCE came in at 2.8% for October 2025. Resolved YES.',
      resolvedAt: daysAgo(85),
      resolvedBy: mod1Id,
      createdBy: analyst1Id,
      teamId: team2Id,
      tags: ['inflation', 'economics'],
      visibility: 'public',
      createdAt: daysAgo(200),
    },
    {
      id: q[6],
      title: 'Will the UN Climate Summit produce a binding emissions agreement?',
      description: 'COP31 negotiations on binding targets for major emitters.',
      category: 'Climate',
      resolutionCriteria: 'Resolves YES if COP31 produces a signed agreement with legally binding emissions reduction targets for at least 10 nations.',
      deadline: daysAgo(60),
      status: 'resolved_yes',
      resolutionNotes: '14 nations signed binding targets at COP31. Resolved YES.',
      resolvedAt: daysAgo(55),
      resolvedBy: mod2Id,
      createdBy: mod1Id,
      teamId: team1Id,
      tags: ['climate', 'UN', 'emissions'],
      visibility: 'public',
      createdAt: daysAgo(150),
    },
    {
      id: q[7],
      title: 'Will the S&P 500 reach a new all-time high in Q1 2026?',
      description: 'Market outlook following strong Q4 2025 earnings season.',
      category: 'Markets',
      resolutionCriteria: 'Resolves YES if the S&P 500 index closes at a new all-time high on any trading day in Q1 2026.',
      deadline: daysAgo(10),
      status: 'resolved_yes',
      resolutionNotes: 'S&P 500 closed at record high on February 18, 2026. Resolved YES.',
      resolvedAt: daysAgo(8),
      resolvedBy: mod1Id,
      createdBy: analyst4Id,
      teamId: team2Id,
      tags: ['markets', 'S&P500', 'equities'],
      visibility: 'public',
      createdAt: daysAgo(100),
    },
    {
      id: q[8],
      title: 'Will a major cybersecurity incident affect critical infrastructure in 2025?',
      description: 'Assessing the likelihood of a significant cyberattack on power grids, water systems, or transport networks.',
      category: 'Cybersecurity',
      resolutionCriteria: 'Resolves YES if a cybersecurity incident affecting critical infrastructure in any G7 nation is officially confirmed by government authorities in 2025.',
      deadline: daysAgo(70),
      status: 'resolved_yes',
      resolutionNotes: 'German rail network disruption in November 2025 confirmed as cyberattack by BSI.',
      resolvedAt: daysAgo(65),
      resolvedBy: adminId,
      createdBy: analyst3Id,
      tags: ['cybersecurity', 'infrastructure'],
      visibility: 'public',
      createdAt: daysAgo(250),
    },
    {
      id: q[9],
      title: 'Will at least 3 central banks cut rates in Q4 2025?',
      description: 'Global monetary easing cycle assessment.',
      category: 'Economics',
      resolutionCriteria: 'Resolves YES if at least 3 G20 central banks announce rate cuts in Q4 2025.',
      deadline: daysAgo(75),
      status: 'resolved_yes',
      resolutionNotes: 'ECB, BoE, BoC, and RBA all cut rates in Q4 2025. Resolved YES.',
      resolvedAt: daysAgo(72),
      resolvedBy: mod1Id,
      createdBy: mod2Id,
      teamId: team2Id,
      tags: ['central-banks', 'monetary-policy'],
      visibility: 'public',
      createdAt: daysAgo(180),
    },

    // 3 resolved NO questions
    {
      id: q[10],
      title: 'Will Country Z rejoin the international trade bloc by end of 2025?',
      description: 'Following diplomatic tensions, Country Z withdrew in 2023.',
      category: 'Geopolitics',
      resolutionCriteria: 'Resolves YES if Country Z formally rejoins the CPTPP or signs a re-accession agreement before January 1, 2026.',
      deadline: daysAgo(70),
      status: 'resolved_no',
      resolutionNotes: 'No re-accession occurred. Negotiations stalled in November 2025.',
      resolvedAt: daysAgo(68),
      resolvedBy: mod2Id,
      createdBy: analyst2Id,
      teamId: team1Id,
      tags: ['trade', 'geopolitics'],
      visibility: 'team',
      createdAt: daysAgo(200),
    },
    {
      id: q[11],
      title: 'Will autonomous vehicle legislation pass in the US Senate by Q1 2026?',
      description: 'The SELF-DRIVE Act has been reintroduced with bipartisan support.',
      category: 'Regulation',
      resolutionCriteria: 'Resolves YES if the US Senate passes federal autonomous vehicle legislation before April 1, 2026.',
      deadline: daysAgo(5),
      status: 'resolved_no',
      resolutionNotes: 'Bill did not reach floor vote. Committee held over to Q2. Resolved NO.',
      resolvedAt: daysAgo(3),
      resolvedBy: mod1Id,
      createdBy: analyst5Id,
      tags: ['regulation', 'autonomous-vehicles', 'US'],
      visibility: 'public',
      createdAt: daysAgo(120),
    },
    {
      id: q[12],
      title: 'Will global semiconductor supply fully normalize by Q1 2026?',
      description: 'Supply chain constraints have been gradually easing since 2024.',
      category: 'Technology',
      resolutionCriteria: 'Resolves YES if leading industry analysts (Gartner, IDC) report semiconductor supply-demand balance as "normalized" by April 1, 2026.',
      deadline: daysAgo(10),
      status: 'resolved_no',
      resolutionNotes: 'Gartner report Q1 2026 still shows 8% supply deficit in advanced nodes. Resolved NO.',
      resolvedAt: daysAgo(7),
      resolvedBy: adminId,
      createdBy: analyst4Id,
      teamId: team2Id,
      tags: ['semiconductors', 'supply-chain', 'tech'],
      visibility: 'public',
      createdAt: daysAgo(160),
    },

    // 1 ambiguous
    {
      id: q[13],
      title: 'Will the disputed territory referendum take place in 2025?',
      description: 'Multiple parties have proposed a referendum but the legal framework remains unclear.',
      category: 'Geopolitics',
      resolutionCriteria: 'Resolves YES if an internationally recognized referendum is held in the disputed territory before January 1, 2026.',
      deadline: daysAgo(70),
      status: 'ambiguous',
      resolutionNotes: 'A regional vote occurred but its legitimacy is disputed by the international community. Resolution criteria ambiguous.',
      resolvedAt: daysAgo(68),
      resolvedBy: adminId,
      createdBy: mod1Id,
      teamId: team1Id,
      tags: ['referendum', 'geopolitics'],
      visibility: 'team',
      createdAt: daysAgo(220),
    },

    // 1 cancelled
    {
      id: q[14],
      title: 'Will the bilateral summit between Country A and Country B occur in December 2025?',
      description: 'Summit was planned as part of ongoing diplomatic normalization.',
      category: 'Geopolitics',
      resolutionCriteria: 'Resolves YES if an official bilateral summit between heads of state of Country A and Country B takes place in December 2025.',
      deadline: daysAgo(100),
      status: 'cancelled',
      resolutionNotes: 'Question cancelled: Summit was indefinitely postponed due to unrelated diplomatic incident, making the question moot.',
      resolvedAt: daysAgo(105),
      resolvedBy: adminId,
      createdBy: analyst1Id,
      tags: ['diplomacy', 'summit'],
      visibility: 'public',
      createdAt: daysAgo(180),
    },
  ])

  // eslint-disable-next-line no-console
  console.log('  Questions created')

  // ─── Predictions ────────────────────────────────────────────────
  // Create 60+ predictions across questions with revision histories

  const predictions: Array<{
    questionId: string
    userId: string
    probability: string
    reasoning: string
    createdAt: Date
  }> = []

  // Helper: add prediction
  const addPred = (
    qIdx: number,
    userId: string,
    prob: number,
    reasoning: string,
    daysAgoVal: number,
  ) => {
    predictions.push({
      questionId: q[qIdx],
      userId,
      probability: prob.toFixed(4),
      reasoning,
      createdAt: daysAgo(daysAgoVal),
    })
  }

  // Q0: Will the Fed raise interest rates by Q2 2026? (open)
  addPred(0, analyst1Id, 0.35, 'Inflation is cooling, making a hike unlikely but not impossible.', 28)
  addPred(0, analyst2Id, 0.45, 'Labor market strength could force the Fed\'s hand.', 25)
  addPred(0, analyst3Id, 0.25, 'Forward guidance suggests holds through Q2.', 20)
  addPred(0, analyst4Id, 0.40, 'Geopolitical disruptions could reignite inflation pressures.', 15)
  addPred(0, analyst5Id, 0.30, 'Core PCE trend makes a hike very unlikely.', 10)
  // Revision: analyst1 updates
  addPred(0, analyst1Id, 0.20, 'Updated: January jobs report was weaker than expected, reducing hike probability.', 5)

  // Q1: Country X parliamentary elections (open, team)
  addPred(1, analyst1Id, 0.60, 'Coalition talks have broken down, elections look likely.', 12)
  addPred(1, analyst2Id, 0.70, 'Constitutional court ruling may force elections.', 10)
  addPred(1, analyst3Id, 0.55, 'Caretaker government may hold longer than expected.', 8)

  // Q2: Oil prices > $100 (open)
  addPred(2, analyst3Id, 0.40, 'OPEC+ production cuts are significant but demand is softening.', 6)
  addPred(2, analyst4Id, 0.50, 'Middle East tensions add upside risk to oil.', 5)
  addPred(2, analyst5Id, 0.35, 'US production at record highs acts as a cap.', 4)
  addPred(2, analyst1Id, 0.45, 'Balancing supply cuts against weak China demand.', 3)

  // Q3: Company X acquires Company Y (open)
  addPred(3, analyst2Id, 0.30, 'Antitrust concerns make this deal difficult.', 40)
  addPred(3, analyst4Id, 0.25, 'Regulatory environment is hostile to big tech M&A.', 35)
  addPred(3, analyst5Id, 0.35, 'Recent leadership change at Company X may accelerate deal.', 20)
  // Revision: analyst2 updates upward
  addPred(3, analyst2Id, 0.40, 'Updated: New reports suggest EU regulators may be more open than expected.', 10)

  // Q4: EU Digital Markets amendment (open, team)
  addPred(4, analyst1Id, 0.50, 'Strong committee support but political calendar is tight.', 18)
  addPred(4, analyst2Id, 0.60, 'Rapporteur pushing for fast track.', 15)

  // Q5: US inflation below 3% (resolved YES)
  addPred(5, analyst1Id, 0.75, 'Disinflationary trend is well established.', 195)
  addPred(5, analyst2Id, 0.65, 'Services inflation still sticky, but goods are deflating.', 190)
  addPred(5, analyst3Id, 0.80, 'Strong confidence in the disinflation narrative.', 180)
  addPred(5, analyst4Id, 0.55, 'More cautious - shelter costs remain elevated.', 170)
  addPred(5, analyst5Id, 0.70, 'Trend is clear but pace is uncertain.', 165)
  // Revisions closer to resolution
  addPred(5, analyst1Id, 0.85, 'September data confirms downtrend.', 100)
  addPred(5, analyst4Id, 0.72, 'Updated: Shelter costs finally turning down.', 95)

  // Q6: UN Climate Summit binding agreement (resolved YES)
  addPred(6, analyst1Id, 0.40, 'Historical COP track record is poor for binding agreements.', 145)
  addPred(6, analyst3Id, 0.55, 'New US commitment changes the dynamic significantly.', 130)
  addPred(6, analyst4Id, 0.35, 'Skeptical - too many competing interests.', 120)
  addPred(6, analyst2Id, 0.50, 'Draft text looks promising but enforcement is weak.', 110)
  // Revisions
  addPred(6, analyst1Id, 0.65, 'Pre-summit negotiations more productive than expected.', 70)
  addPred(6, analyst4Id, 0.60, 'Updated: China joining talks is a game-changer.', 65)

  // Q7: S&P 500 new ATH in Q1 2026 (resolved YES)
  addPred(7, analyst4Id, 0.80, 'Strong earnings + Fed pause = bullish setup.', 95)
  addPred(7, analyst5Id, 0.70, 'Valuation concerns limit upside but trend is up.', 90)
  addPred(7, analyst1Id, 0.75, 'Earnings revisions are positive, market breadth improving.', 85)
  addPred(7, analyst3Id, 0.60, 'Geopolitical risks could derail the rally.', 80)
  addPred(7, analyst2Id, 0.85, 'January effect + institutional inflows point to new highs.', 50)

  // Q8: Major cybersecurity incident (resolved YES)
  addPred(8, analyst3Id, 0.70, 'Threat landscape is increasingly hostile, it\'s a matter of when.', 240)
  addPred(8, analyst1Id, 0.60, 'Critical infrastructure security has improved but gaps remain.', 200)
  addPred(8, analyst5Id, 0.75, 'Nation-state capabilities are outpacing defenses.', 180)
  addPred(8, analyst2Id, 0.50, 'Major incident is possible but \'critical infrastructure\' bar is high.', 150)

  // Q9: At least 3 central banks cut rates Q4 2025 (resolved YES)
  addPred(9, analyst4Id, 0.85, 'Easing cycle is well underway globally.', 175)
  addPred(9, analyst5Id, 0.80, 'ECB, BoE, BoC all signaling cuts.', 170)
  addPred(9, analyst1Id, 0.70, 'Confident but exact timing uncertain.', 160)
  addPred(9, analyst3Id, 0.90, 'Forward guidance from multiple CBs is very clear.', 155)

  // Q10: Country Z rejoins trade bloc (resolved NO)
  addPred(10, analyst2Id, 0.20, 'Diplomatic signals are not encouraging.', 195)
  addPred(10, analyst1Id, 0.35, 'Some backchannels suggest willingness.', 180)
  addPred(10, analyst3Id, 0.15, 'Domestic politics make re-accession very unlikely.', 150)

  // Q11: Autonomous vehicle legislation (resolved NO)
  addPred(11, analyst5Id, 0.40, 'Bipartisan support exists but Senate calendar is packed.', 115)
  addPred(11, analyst4Id, 0.55, 'Overconfident - industry lobbying is strong and bill has momentum.', 100)
  addPred(11, analyst2Id, 0.30, 'Too many competing priorities this session.', 80)
  // Revision
  addPred(11, analyst4Id, 0.35, 'Updated: Committee markup delayed, reducing chances.', 30)

  // Q12: Semiconductor supply normalizes (resolved NO)
  addPred(12, analyst4Id, 0.25, 'Advanced node capacity still constrained.', 155)
  addPred(12, analyst1Id, 0.40, 'New fabs coming online may help.', 140)
  addPred(12, analyst5Id, 0.20, 'Demand for AI chips keeps supply tight.', 120)
  addPred(12, analyst3Id, 0.30, 'Partial normalization but full balance unlikely.', 100)

  // Q13: Disputed territory referendum (ambiguous)
  addPred(13, analyst1Id, 0.45, 'Legal framework exists but political will is uncertain.', 210)
  addPred(13, analyst3Id, 0.55, 'Regional pressure building for a vote.', 200)

  // Q14: Bilateral summit (cancelled)
  addPred(14, analyst1Id, 0.65, 'Both sides publicly committed to the summit.', 175)
  addPred(14, analyst2Id, 0.70, 'Diplomatic preparations are well advanced.', 160)

  await db.insert(predictionTable).values(predictions)

  // eslint-disable-next-line no-console
  console.log(`  ${predictions.length.toString()} predictions created`)

  // ─── Calibration Scores ─────────────────────────────────────────
  // Pre-computed scores for all analysts

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3)
  const currentPeriod = `${currentYear.toString()}-Q${currentQuarter.toString()}`

  const makeBuckets = (offsets: number[]): AccuracyBuckets => {
    const buckets: AccuracyBuckets = {}
    for (let i = 0; i < 10; i++) {
      const key = `${(i * 10).toString()}-${((i + 1) * 10).toString()}`
      const predicted = Math.floor(Math.random() * 5) + 1
      const offset = offsets[i] ?? 0
      const actual = Math.max(
        0,
        Math.min(predicted, Math.round(predicted * (i + 0.5) / 10 + offset)),
      )
      buckets[key] = { predicted, actual }
    }
    return buckets
  }

  const calibrationScores: Array<{
    userId: string
    period: string
    brierScore: string
    totalPredictions: number
    resolvedPredictions: number
    accuracyBuckets: AccuracyBuckets
  }> = []

  // analyst1 - well-calibrated
  calibrationScores.push(
    {
      userId: analyst1Id,
      period: 'all-time',
      brierScore: '0.142000',
      totalPredictions: 28,
      resolvedPredictions: 22,
      accuracyBuckets: makeBuckets([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    },
    {
      userId: analyst1Id,
      period: currentPeriod,
      brierScore: '0.128000',
      totalPredictions: 8,
      resolvedPredictions: 5,
      accuracyBuckets: makeBuckets([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    },
  )

  // analyst2 - slightly overconfident
  calibrationScores.push(
    {
      userId: analyst2Id,
      period: 'all-time',
      brierScore: '0.198000',
      totalPredictions: 25,
      resolvedPredictions: 20,
      accuracyBuckets: makeBuckets([0, 0, 1, 1, 0, -1, -1, -1, 0, 0]),
    },
    {
      userId: analyst2Id,
      period: currentPeriod,
      brierScore: '0.215000',
      totalPredictions: 7,
      resolvedPredictions: 4,
      accuracyBuckets: makeBuckets([0, 0, 1, 1, 0, -1, -1, 0, 0, 0]),
    },
  )

  // analyst3 - well-calibrated, best forecaster
  calibrationScores.push(
    {
      userId: analyst3Id,
      period: 'all-time',
      brierScore: '0.118000',
      totalPredictions: 30,
      resolvedPredictions: 24,
      accuracyBuckets: makeBuckets([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    },
    {
      userId: analyst3Id,
      period: currentPeriod,
      brierScore: '0.105000',
      totalPredictions: 9,
      resolvedPredictions: 6,
      accuracyBuckets: makeBuckets([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    },
  )

  // analyst4 - overconfident
  calibrationScores.push(
    {
      userId: analyst4Id,
      period: 'all-time',
      brierScore: '0.235000',
      totalPredictions: 22,
      resolvedPredictions: 18,
      accuracyBuckets: makeBuckets([0, 1, 1, 1, 0, -1, -2, -1, -1, 0]),
    },
    {
      userId: analyst4Id,
      period: currentPeriod,
      brierScore: '0.250000',
      totalPredictions: 6,
      resolvedPredictions: 4,
      accuracyBuckets: makeBuckets([0, 1, 1, 0, -1, -1, -1, 0, 0, 0]),
    },
  )

  // analyst5 - underconfident
  calibrationScores.push(
    {
      userId: analyst5Id,
      period: 'all-time',
      brierScore: '0.175000',
      totalPredictions: 20,
      resolvedPredictions: 16,
      accuracyBuckets: makeBuckets([0, -1, 0, 0, 1, 1, 1, 0, 0, 0]),
    },
    {
      userId: analyst5Id,
      period: currentPeriod,
      brierScore: '0.168000',
      totalPredictions: 5,
      resolvedPredictions: 3,
      accuracyBuckets: makeBuckets([0, 0, 0, 1, 1, 0, 0, 0, 0, 0]),
    },
  )

  await db.insert(calibrationScoreTable).values(calibrationScores)

  // eslint-disable-next-line no-console
  console.log(`  ${calibrationScores.length.toString()} calibration scores created`)

  // ─── Comments ───────────────────────────────────────────────────

  const comments = [
    {
      questionId: q[0],
      authorId: analyst2Id,
      body: 'The January CPI print came in hotter than expected. I think we should watch the February data closely before updating forecasts.',
      createdAt: daysAgo(22),
    },
    {
      questionId: q[0],
      authorId: mod1Id,
      body: 'Good point. Note that the Fed has emphasized they look at PCE, not CPI. The two can diverge significantly.',
      createdAt: daysAgo(21),
    },
    {
      questionId: q[0],
      authorId: analyst1Id,
      body: 'I revised my prediction downward after the weak jobs report. The labor market cooling should keep the Fed on hold.',
      createdAt: daysAgo(5),
    },
    {
      questionId: q[1],
      authorId: analyst3Id,
      body: 'The constitutional court has been deliberately vague. I would not read too much into their latest statement.',
      createdAt: daysAgo(7),
    },
    {
      questionId: q[3],
      authorId: analyst4Id,
      body: 'This SIGNET task reference is helpful - the intelligence assessment aligns with public reporting on the deal.',
      createdAt: daysAgo(30),
    },
    {
      questionId: q[5],
      authorId: mod1Id,
      body: 'Resolving this question YES based on the October Core PCE print of 2.8%. Well done to those who called this early.',
      createdAt: daysAgo(85),
    },
    {
      questionId: q[7],
      authorId: analyst4Id,
      body: 'Called it! The earnings season was the catalyst. Market breadth was the key indicator to watch.',
      createdAt: daysAgo(8),
    },
    {
      questionId: q[11],
      authorId: analyst5Id,
      body: 'Frustrated that the committee delayed markup. The bipartisan support was there but Congressional scheduling killed it.',
      createdAt: daysAgo(25),
    },
    {
      questionId: q[13],
      authorId: adminId,
      body: 'Marking this as ambiguous. The vote occurred but its international recognition is disputed, which makes applying the resolution criteria unclear.',
      createdAt: daysAgo(68),
    },
    {
      questionId: q[2],
      authorId: analyst5Id,
      body: 'OPEC+ just announced an extension of production cuts through Q3. This is bullish for oil prices.',
      createdAt: daysAgo(2),
    },
  ]

  await db.insert(commentTable).values(comments)

  // eslint-disable-next-line no-console
  console.log(`  ${comments.length.toString()} comments created`)

  // ─── Activity Log ───────────────────────────────────────────────

  const activities = [
    {
      entityType: 'question',
      entityId: q[0],
      action: 'created',
      actorId: mod1Id,
      details: { title: 'Will the Fed raise interest rates by Q2 2026?' },
      createdAt: daysAgo(30),
    },
    {
      entityType: 'question',
      entityId: q[5],
      action: 'resolved',
      actorId: mod1Id,
      details: { status: 'resolved_yes', title: 'Will inflation in the US drop below 3% by Q4 2025?' },
      createdAt: daysAgo(85),
    },
    {
      entityType: 'prediction',
      entityId: q[0],
      action: 'submitted',
      actorId: analyst1Id,
      details: { probability: 0.35 },
      createdAt: daysAgo(28),
    },
    {
      entityType: 'prediction',
      entityId: q[0],
      action: 'revised',
      actorId: analyst1Id,
      details: { oldProbability: 0.35, newProbability: 0.20 },
      createdAt: daysAgo(5),
    },
    {
      entityType: 'question',
      entityId: q[6],
      action: 'resolved',
      actorId: mod2Id,
      details: { status: 'resolved_yes', title: 'Will the UN Climate Summit produce a binding emissions agreement?' },
      createdAt: daysAgo(55),
    },
    {
      entityType: 'question',
      entityId: q[14],
      action: 'cancelled',
      actorId: adminId,
      details: { reason: 'Summit indefinitely postponed due to diplomatic incident' },
      createdAt: daysAgo(105),
    },
    {
      entityType: 'question',
      entityId: q[13],
      action: 'resolved',
      actorId: adminId,
      details: { status: 'ambiguous', title: 'Will the disputed territory referendum take place in 2025?' },
      createdAt: daysAgo(68),
    },
    {
      entityType: 'team',
      entityId: team1Id,
      action: 'created',
      actorId: adminId,
      details: { name: 'Geopolitical Forecasting' },
      createdAt: daysAgo(60),
    },
    {
      entityType: 'team',
      entityId: team2Id,
      action: 'created',
      actorId: mod1Id,
      details: { name: 'Economic Indicators' },
      createdAt: daysAgo(58),
    },
    {
      entityType: 'team',
      entityId: team1Id,
      action: 'member_added',
      actorId: adminId,
      details: { userId: analyst1Id, role: 'member' },
      createdAt: daysAgo(59),
    },
    {
      entityType: 'calibration',
      entityId: analyst3Id,
      action: 'recomputed',
      actorId: adminId,
      details: { trigger: 'manual', brierScore: 0.118 },
      createdAt: daysAgo(2),
    },
    {
      entityType: 'question',
      entityId: q[7],
      action: 'resolved',
      actorId: mod1Id,
      details: { status: 'resolved_yes', title: 'Will the S&P 500 reach a new all-time high in Q1 2026?' },
      createdAt: daysAgo(8),
    },
    {
      entityType: 'question',
      entityId: q[10],
      action: 'resolved',
      actorId: mod2Id,
      details: { status: 'resolved_no', title: 'Will Country Z rejoin the international trade bloc by end of 2025?' },
      createdAt: daysAgo(68),
    },
    {
      entityType: 'question',
      entityId: q[3],
      action: 'created',
      actorId: mod2Id,
      details: { title: 'Will Company X acquire Company Y by end of 2026?', externalRef: 'SIGNET-TR-2026-0042' },
      createdAt: daysAgo(45),
    },
    {
      entityType: 'comment',
      entityId: q[0],
      action: 'added',
      actorId: analyst2Id,
      details: { questionTitle: 'Will the Fed raise interest rates by Q2 2026?' },
      createdAt: daysAgo(22),
    },
  ]

  await db.insert(activityLogTable).values(activities)

  // eslint-disable-next-line no-console
  console.log(`  ${activities.length.toString()} activity log entries created`)

  // eslint-disable-next-line no-console
  console.log('\nSeed complete!')
  process.exit(0)
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err)
  process.exit(1)
})
