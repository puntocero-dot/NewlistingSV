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

  async updateProperty(id: string, data: any) {
    return await prisma.property.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
    });
  }

  async updatePropertyStatus(id: string, status: string) {
    return await prisma.property.update({
      where: { id },
      data: { status },
    });
  }

  async deleteProperty(id: string) {
    return await prisma.property.delete({
      where: { id },
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
          query.status ? { status: query.status } : {}, // Status filtering
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const propertyService = new PropertyService();
