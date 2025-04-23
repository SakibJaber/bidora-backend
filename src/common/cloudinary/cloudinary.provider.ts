import { v2 as cloudinary } from 'cloudinary';

export const CloudinaryProvider = {
  provide: 'CLOUDINARY',
  useFactory: () => {
    const name = process.env.CLOUDINARY_CLOUD_NAME;
    const key = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;

    if (!name || !key || !secret) {
      throw new Error('Cloudinary config missing');
    }

    return cloudinary.config({
      cloud_name: name,
      api_key: key,
      api_secret: secret,
    });
  },
};
