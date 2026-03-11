import { activityRouter } from './routers/activity.router.ts'
import { appConfigRouter } from './routers/app-config.router.ts'
import { calibrationRouter } from './routers/calibration.router.ts'
import { commentRouter } from './routers/comment.router.ts'
import { predictionRouter } from './routers/prediction.router.ts'
import { questionRouter } from './routers/question.router.ts'
import { teamRouter } from './routers/team.router.ts'
import { userRouter } from './routers/user.router.ts'
import { router } from './trpc-init.ts'

export const appRouter = router({
  user: userRouter,
  team: teamRouter,
  question: questionRouter,
  prediction: predictionRouter,
  calibration: calibrationRouter,
  comment: commentRouter,
  activity: activityRouter,
  appConfig: appConfigRouter,
})

export type AppRouter = typeof appRouter
