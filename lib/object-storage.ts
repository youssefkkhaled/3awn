import { put } from "@vercel/blob";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import {
  getS3AccessKeyId,
  getS3Bucket,
  getS3Endpoint,
  getS3PublicBaseUrl,
  getS3Region,
  getS3SecretAccessKey,
  isBlobStorageConfigured,
  isObjectStorageConfigured,
} from "@/lib/env";

const globalForS3 = globalThis as typeof globalThis & {
  __iftarS3Client?: S3Client;
};

function getS3Client() {
  if (!globalForS3.__iftarS3Client) {
    globalForS3.__iftarS3Client = new S3Client({
      region: getS3Region(),
      endpoint: getS3Endpoint() || undefined,
      credentials: {
        accessKeyId: getS3AccessKeyId(),
        secretAccessKey: getS3SecretAccessKey(),
      },
    });
  }

  return globalForS3.__iftarS3Client;
}

export async function uploadObjectToStorage(args: {
  key: string;
  body: Buffer;
  contentType: string;
}) {
  if (!isObjectStorageConfigured()) {
    throw new Error("Object storage is not configured.");
  }

  if (isBlobStorageConfigured()) {
    const result = await put(args.key, args.body, {
      access: "public",
      contentType: args.contentType,
      addRandomSuffix: true,
    });

    return result.url;
  }

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getS3Bucket(),
      Key: args.key,
      Body: args.body,
      ContentType: args.contentType,
    }),
  );

  return `${getS3PublicBaseUrl()}/${args.key}`;
}
