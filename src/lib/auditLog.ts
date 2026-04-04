import { prisma } from "@/lib/prisma";

export async function logAction(
  action: string,
  entity: string,
  entityId?: string,
  details?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId: entityId || null,
        details: JSON.stringify(details || {}),
      },
    });
  } catch (e) {
    console.error("Audit log error:", e);
  }
}
