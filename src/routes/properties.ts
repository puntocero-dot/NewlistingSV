import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { propertyService } from '../services/property.service';

const PROPERTY_STATUSES = ['AVAILABLE', 'SOLD', 'RENTED', 'RESERVED'] as const;

const searchQuerySchema = z.object({
  mode: z.string().optional(),
  category: z.string().optional(),
  zone: z.string().optional(),
  maxPrice: z.string().regex(/^\d+(\.\d+)?$/, 'maxPrice must be a number').optional(),
  status: z.enum(PROPERTY_STATUSES).optional(),
});

const createPropertySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  price: z.number().positive('Price must be positive'),
  mode: z.string().min(1, 'Mode is required'),
  category: z.string().min(1, 'Category is required'),
  zone: z.string().optional(),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  agentId: z.string().optional(),
}).passthrough();

const updateStatusSchema = z.object({
  status: z.enum(PROPERTY_STATUSES, { message: `Status must be one of: ${PROPERTY_STATUSES.join(', ')}` }),
});

export async function propertyRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    const parsed = searchQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }
    return await propertyService.searchProperties(parsed.data);
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const property = await propertyService.getPropertyById(id);
    if (!property) return reply.status(404).send({ error: 'Property not found' });
    return property;
  });

  // Protected: only AGENT or ADMIN can create properties
  app.post('/', {
    preValidation: [app.requireAgent],
  }, async (request, reply) => {
    const parsed = createPropertySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }
    try {
      const property = await propertyService.createProperty(parsed.data);
      return property;
    } catch (error) {
      app.log.error(error);
      return reply.status(400).send({ error: 'Failed to create property' });
    }
  });

  // Protected: only AGENT or ADMIN can update status
  app.patch('/:id/status', {
    preValidation: [app.requireAgent],
  }, async (request, reply) => {
    const parsed = updateStatusSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }
    try {
      const { id } = request.params as { id: string };
      return await propertyService.updatePropertyStatus(id, parsed.data.status);
    } catch (error) {
      app.log.error(error);
      return reply.status(400).send({ error: 'Failed to update property status' });
    }
  });
}
