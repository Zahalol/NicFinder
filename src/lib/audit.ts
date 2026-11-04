import { prisma } from "./db";

export async function audit(
  action: string,
  opts: {
    userId?: string | null;
    targetType?: string;
    targetId?: string;
    detail?: Record<string, unknown>;
  } = {}
): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      action,
      userId: opts.userId ?? null,
      targetType: opts.targetType,
      targetId: opts.targetId,
      detailJson: JSON.stringify(opts.detail ?? {}),
    },
  });
}
