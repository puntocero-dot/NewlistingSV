import { FastifyInstance } from 'fastify';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadRoutes(app: FastifyInstance) {
  // Upload a single photo (base64) to Cloudinary
  // Returns the secure URL and public_id
  app.post('/photo', {
    preValidation: [app.authenticate],
  }, async (request, reply) => {
    const { image, mimeType, folder, roomType } = request.body as {
      image: string;   // base64 string
      mimeType: string;
      folder?: string;
      roomType?: string;
    };

    if (!image) {
      return reply.status(400).send({ error: 'No image provided' });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return reply.status(503).send({ error: 'Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env' });
    }

    try {
      const dataUri = `data:${mimeType || 'image/jpeg'};base64,${image}`;
      const result = await cloudinary.uploader.upload(dataUri, {
        folder: folder || 'newlisting-sv/properties',
        resource_type: 'image',
        context: roomType ? `room_type=${roomType}` : undefined,
        transformation: [
          { width: 1920, height: 1080, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
        ],
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        roomType: roomType || null,
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to upload image', detail: error.message });
    }
  });
}
