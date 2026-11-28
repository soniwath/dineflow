import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";

const MAX_SIZE = 5 * 1024 * 1024;
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const IMAGE_DIR = path.join(process.cwd(), "public", "images");

export async function saveImage(file: File): Promise<string> {
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) throw new Error("Unsupported image type");
  if (file.size > MAX_SIZE) throw new Error("Image too large");

  // Generate the name; never trust file.name (path traversal, collisions)
  const filename = `${randomUUID()}${ext}`;
  await mkdir(IMAGE_DIR, { recursive: true });
  await writeFile(
    path.join(IMAGE_DIR, filename),
    Buffer.from(await file.arrayBuffer()),
  );

  return `/images/${filename}`; // this is what goes in the DB
}

export async function deleteImage(imagePath?: string | null) {
  if (!imagePath?.startsWith("/images/")) return;
  const filename = path.basename(imagePath); // strips any ../
  await unlink(path.join(IMAGE_DIR, filename)).catch(() => {});
}
