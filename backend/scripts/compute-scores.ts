/**
 * CLI script for manual score recomputation.
 *
 * Usage:
 *   tsx scripts/compute-scores.ts --all
 *   tsx scripts/compute-scores.ts --user <userId>
 */

import {
  recomputeUserCalibration,
  recomputeAllCalibration,
} from '../src/services/scoring.service.ts'

function printUsage() {
  // eslint-disable-next-line no-console
  console.log(`
Usage:
  tsx scripts/compute-scores.ts --all              Recompute scores for all users
  tsx scripts/compute-scores.ts --user <userId>    Recompute scores for a specific user
`)
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    printUsage()
    process.exit(1)
  }

  if (args.includes('--all')) {
    // eslint-disable-next-line no-console
    console.log('Recomputing calibration scores for all users...')
    const result = await recomputeAllCalibration()
    // eslint-disable-next-line no-console
    console.log(`Done. Recomputed scores for ${result.count.toString()} users.`)
    process.exit(0)
  }

  const userFlagIndex = args.indexOf('--user')
  if (userFlagIndex !== -1) {
    const userId = args[userFlagIndex + 1]
    if (!userId) {
      // eslint-disable-next-line no-console
      console.error('Error: --user requires a userId argument')
      printUsage()
      process.exit(1)
    }

    // eslint-disable-next-line no-console
    console.log(`Recomputing calibration scores for user ${userId}...`)
    await recomputeUserCalibration(userId)
    // eslint-disable-next-line no-console
    console.log('Done.')
    process.exit(0)
  }

  // eslint-disable-next-line no-console
  console.error('Error: Unrecognized arguments')
  printUsage()
  process.exit(1)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error:', err)
  process.exit(1)
})
