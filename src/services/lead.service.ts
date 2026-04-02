import { prisma } from '../models';

export class LeadService {
  /**
   * Assigns an agent to a lead based on:
   * 1. Affinity: Same email or phone previously worked with an agent.
   * 2. Load Balancing (Round Robin): Agent who hasn't received a lead for the longest time.
   */
  async getSmartAgentAssignment(email?: string, phone?: string): Promise<string | null> {
    try {
      // 1. Check for Affinity (Returning Customer)
      // Check by Email
      if (email) {
        const previousByEmail = await prisma.lead.findFirst({
          where: { email: { equals: email, mode: 'insensitive' }, agentId: { not: null } },
          orderBy: { createdAt: 'desc' },
          select: { agentId: true }
        });
        if (previousByEmail?.agentId) {
          console.log(`[LeadService] Affinity Match by Email for ${email}: Reassigning to Agent ${previousByEmail.agentId}`);
          return previousByEmail.agentId;
        }
      }

      // Check by Phone
      if (phone) {
        const previousByPhone = await prisma.lead.findFirst({
          where: { phone: { contains: phone }, agentId: { not: null } },
          orderBy: { createdAt: 'desc' },
          select: { agentId: true }
        });
        if (previousByPhone?.agentId) {
          console.log(`[LeadService] Affinity Match by Phone for ${phone}: Reassigning to Agent ${previousByPhone.agentId}`);
          return previousByPhone.agentId;
        }
      }

      // 2. Load Balancing (Round Robin)
      // Find the agent with the oldest lastAssignedAt (nulls first)
      const nextAgent = await prisma.agent.findFirst({
        orderBy: [
          { lastAssignedAt: 'asc' },
          { createdAt: 'asc' }
        ]
      });

      if (nextAgent) {
        console.log(`[LeadService] Round-Robin assignment: New Lead assigned to Agent ${nextAgent.name} (${nextAgent.id})`);
        
        // Update lastAssignedAt to move this agent to the end of the queue
        await prisma.agent.update({
          where: { id: nextAgent.id },
          data: { lastAssignedAt: new Date() }
        });

        return nextAgent.id;
      }

      return null;
    } catch (error) {
      console.error('[LeadService] Error in smart assignment:', error);
      // Fallback: try to get any agent
      const fallbackAgent = await prisma.agent.findFirst();
      return fallbackAgent?.id || null;
    }
  }
}

export const leadService = new LeadService();
