import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryResponse } from './cloudinary-response';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  async uploadFile(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<CloudinaryResponse> {
    return new Promise((resolve, reject) => {
      if (!file || !file.buffer) return reject(new Error('No file buffer'));

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder, // Optional folder
          resource_type: 'auto', // Automatically detect image/video
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result as CloudinaryResponse);
        },
      );
      const readable = new Readable();
      readable.push(file.buffer);
      readable.push(null);

      readable.pipe(uploadStream);
    });
  }
  async deleteFile(publicId: string) {
    return cloudinary.uploader.destroy(publicId);
  }
}
