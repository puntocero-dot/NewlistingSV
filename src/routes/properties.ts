import { FastifyInstance } from 'fastify';
import { propertyService } from '../services/property.service';

export async function propertyRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    const query = request.query || {};
    return await propertyService.searchProperties(query);
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
    try {
      const property = await propertyService.createProperty(request.body);
      return property;
    } catch (error) {
      return reply.status(400).send({ error: 'Failed to create property' });
    }
  });

  // Protected: only AGENT or ADMIN can update status
  app.patch('/:id/status', {
    preValidation: [app.requireAgent],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { status } = request.body as { status: string };
      return await propertyService.updatePropertyStatus(id, status);
    } catch (error) {
      return reply.status(400).send({ error: 'Failed to update property status' });
    }
  });
}
