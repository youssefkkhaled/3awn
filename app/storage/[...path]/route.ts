import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { getUploadsPath } from "@/lib/env";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{ path?: string[] }>;
  },
) {
  const { path: pathSegments } = await context.params;

  if (!pathSegments || pathSegments.length === 0) {
    return NextResponse.json(
      { code: "FILE_NOT_FOUND", error: "الملف غير موجود." },
      { status: 404 },
    );
  }

  const uploadsRoot = path.resolve(getUploadsPath());
  const targetPath = path.resolve(uploadsRoot, ...pathSegments);

  if (!targetPath.startsWith(`${uploadsRoot}${path.sep}`)) {
    return NextResponse.json(
      { code: "INVALID_FILE_PATH", error: "مسار الملف غير صالح." },
      { status: 400 },
    );
  }

  try {
    const file = await readFile(targetPath);
    const extension = path.extname(targetPath).toLowerCase();

    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json(
      { code: "FILE_NOT_FOUND", error: "الملف غير موجود." },
      { status: 404 },
    );
  }
}
