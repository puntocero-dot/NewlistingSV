import { prisma } from '../models';

export class UsageService {
  /**
   * Logs token usage for a user and updates their total counter.
   */
  async logTokenUsage(userId: string | null | undefined, tokens: number, modelName: string, action: string = 'chat') {
    if (!tokens || tokens <= 0) return;

    try {
      const p = prisma as any;
      console.log(`[UsageService] Logging ${tokens} tokens for User ${userId || 'Anonymous'} using ${modelName}`);

      // 1. Create a detailed log entry
      await p.usageLog.create({
        data: {
          userId: userId || null,
          tokensUsed: tokens,
          model: modelName,
          action,
        }
      });

      // 2. Update user's aggregate counter if logged in
      if (userId) {
        await p.user.update({
          where: { id: userId },
          data: {
            totalTokens: {
              increment: tokens
            }
          }
        });
      }
    } catch (error) {
      console.error('[UsageService] Failed to log usage:', error);
    }
  }

  /**
   * Gets global stats for the Admin.
   */
  async getGlobalStats() {
    const p = prisma as any;
    const totalTokens = await p.usageLog.aggregate({
      _sum: { tokensUsed: true }
    });

    const totalLeads = await prisma.lead.count();
    const totalProperties = await prisma.property.count();
    
    // Top users by usage
    const topUsers = await p.user.findMany({
      where: { totalTokens: { gt: 0 } },
      orderBy: { totalTokens: 'desc' },
      take: 5,
      select: { email: true, totalTokens: true, role: true }
    });

    return {
      globalTokens: totalTokens._sum.tokensUsed || 0,
      totalLeads,
      totalProperties,
      topUsers,
      estimatedCostUSD: ((totalTokens._sum.tokensUsed || 0) / 1000000) * 0.15 // Rough estimate for Flash model
    };
  }
}

export const usageService = new UsageService();
