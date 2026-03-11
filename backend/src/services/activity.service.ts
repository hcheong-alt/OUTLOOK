import { db } from '../db/drizzle.ts'
import { activityLogTable } from '../drizzle/schema.ts'

export async function logActivity(params: {
  entityType: string
  entityId: string
  action: string
  actorId: string
  details?: Record<string, unknown>
}) {
  await db.insert(activityLogTable).values({
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    actorId: params.actorId,
    details: params.details ?? {},
  })
}
