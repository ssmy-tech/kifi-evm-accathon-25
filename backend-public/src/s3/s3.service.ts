import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private readonly bucketName: string;

  constructor() {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
      throw new Error('Missing required AWS configuration');
    }

    this.bucketName = bucketName;
    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async uploadBase64Image(imageData: Buffer, key: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: imageData,
        ContentType: 'image/jpeg',
        ACL: 'public-read',
      });

      await this.s3Client.send(command);
      return `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (error) {
      throw error;
    }
  }
} 