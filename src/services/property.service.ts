import { prisma } from '../models';

export class PropertyService {
  async getAllProperties() {
    return await prisma.property.findMany();
  }

  async getPropertyById(id: string) {
    return await prisma.property.findUnique({
      where: { id },
    });
  }

  async createProperty(data: any) {
    return await prisma.property.create({
      data,
    });
  }

  async searchProperties(query: any) {
    // Basic search for now
    return await prisma.property.findMany({
      where: {
        AND: [
          query.mode ? { mode: query.mode } : {},
          query.category ? { category: query.category } : {},
          query.zone ? { zone: { contains: query.zone, mode: 'insensitive' } } : {},
          query.maxPrice ? { price: { lte: parseFloat(query.maxPrice) } } : {},
        ],
      },
    });
  }
}

export const propertyService = new PropertyService();
