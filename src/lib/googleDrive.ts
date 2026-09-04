export interface DrivePhoto {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  webViewLink?: string;
  resourceKey?: string;
  width?: number;
  height?: number;
}

export interface DrivePage<T> {
  items: T[];
  nextPageToken: string | null;
}

const MEDIA_CACHE_TTL = 5 * 60 * 1000;
const PAGE_SIZE = 60;
const MAX_THUMBNAIL_SIZE = 1600;

function splitFolderIds(folderId: string): string[] {
  return String(folderId || "").split(",").map((id) => id.trim()).filter(Boolean);
}

function encodeMultiFolderToken(tokens: Array<string | null>): string {
  return `multi:${btoa(JSON.stringify(tokens))}`;
}

function decodeMultiFolderToken(token: string | undefined, count: number): Array<string | undefined> {
  if (!token || !token.startsWith("multi:")) return Array(count).fill(undefined);
  try {
    const parsed = JSON.parse(atob(token.slice(6))) as unknown;
    if (Array.isArray(parsed)) return parsed.slice(0, count).map((value) => typeof value === "string" && value ? value : undefined);
  } catch { /* fall back to first-page requests */ }
  return Array(count).fill(undefined);
}

function readMediaCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { timestamp: number; data: T };
    if (!parsed || typeof parsed.timestamp !== "number") return null;
    if (Date.now() - parsed.timestamp > MEDIA_CACHE_TTL) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeMediaCache<T>(key: string, data: T) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({ timestamp: Date.now(), data }),
    );
  } catch {
    // Cache is optional.
  }
}

export const DRIVE_FOLDER_ID =
  import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID || "";

function requireDriveConfig(folderId: string) {
  if (!folderId) throw new Error("Google Drive folder ID is missing.");
}

async function fetchDrivePage<T extends DrivePhoto>(
  event: string,
  folderId: string,
  mimePrefix: "image/" | "video/",
  pageToken?: string,
): Promise<DrivePage<T>> {
  const serverParams = new URLSearchParams({ event: event || "", type: mimePrefix === "video/" ? "video" : "image", folderId });
  if (pageToken) serverParams.set("pageToken", pageToken);

  const response = await fetch(`/api/drive?${serverParams.toString()}`, { credentials: "same-origin", headers: { Accept: "application/json" }, cache: "no-store" });

  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail = body?.error?.message ? ` ${body.error.message}` : (body?.error ? ` ${body.error}` : "");
    } catch {
      // Ignore non-JSON error responses.
    }

    throw new Error(`Unable to load Google Drive media.${detail}`);
  }

  const data = (await response.json()) as {
    files?: Array<Record<string, unknown>>;
    nextPageToken?: string;
  };

  const items = (data.files ?? []).map((file) => ({
    id: String(file.id ?? ""),
    name: String(file.name ?? ""),
    mimeType: String(file.mimeType ?? ""),
    thumbnailLink: typeof file.thumbnailLink === "string" ? file.thumbnailLink : undefined,
    webContentLink: typeof file.webContentLink === "string" ? file.webContentLink : undefined,
    webViewLink: typeof file.webViewLink === "string" ? file.webViewLink : undefined,
    resourceKey: typeof file.resourceKey === "string" ? file.resourceKey : undefined,
    width:
      typeof (file.imageMediaMetadata as { width?: unknown } | undefined)?.width === "number"
        ? (file.imageMediaMetadata as { width: number }).width
        : typeof (file.videoMediaMetadata as { width?: unknown } | undefined)?.width === "number"
          ? (file.videoMediaMetadata as { width: number }).width
          : undefined,
    height:
      typeof (file.imageMediaMetadata as { height?: unknown } | undefined)?.height === "number"
        ? (file.imageMediaMetadata as { height: number }).height
        : typeof (file.videoMediaMetadata as { height?: unknown } | undefined)?.height === "number"
          ? (file.videoMediaMetadata as { height: number }).height
          : undefined,
  })) as T[];

  return {
    items,
    nextPageToken: data.nextPageToken || null,
  };
}

async function getDriveMultiFolderPage<T extends DrivePhoto>(
  event: string,
  folderIdsValue: string,
  mimePrefix: "image/" | "video/",
  pageToken?: string,
): Promise<DrivePage<T>> {
  const folderIds = splitFolderIds(folderIdsValue);
  if (!folderIds.length) throw new Error("Google Drive folder ID is missing.");
  if (folderIds.length === 1) return fetchDrivePage<T>(event, folderIds[0], mimePrefix, pageToken);

  const tokens = decodeMultiFolderToken(pageToken, folderIds.length);
  const pages = await Promise.all(folderIds.map((folderId, index) => fetchDrivePage<T>(event, folderId, mimePrefix, tokens[index])));
  const nextTokens = pages.map((page) => page.nextPageToken);
  return {
    items: pages.flatMap((page) => page.items),
    nextPageToken: nextTokens.some(Boolean) ? encodeMultiFolderToken(nextTokens) : null,
  };
}

export async function getDrivePhotosPage(
  _event?: string,
  folderId = DRIVE_FOLDER_ID,
  pageToken?: string,
): Promise<DrivePage<DrivePhoto>> {
  requireDriveConfig(folderId);
  const cacheKey = `drive-photos:${folderId}:${pageToken || "first"}`;
  const cached = readMediaCache<DrivePage<DrivePhoto>>(cacheKey);
  if (cached) return cached;

  const page = await getDriveMultiFolderPage<DrivePhoto>(_event || "", folderId, "image/", pageToken);
  writeMediaCache(cacheKey, page);
  return page;
}

export async function getDriveVideosPage(
  _event?: string,
  folderId = DRIVE_FOLDER_ID,
  pageToken?: string,
): Promise<DrivePage<DriveVideo>> {
  requireDriveConfig(folderId);
  const cacheKey = `drive-videos:${folderId}:${pageToken || "first"}`;
  const cached = readMediaCache<DrivePage<DriveVideo>>(cacheKey);
  if (cached) return cached;

  const page = await getDriveMultiFolderPage<DriveVideo>(_event || "", folderId, "video/", pageToken);
  writeMediaCache(cacheKey, page);
  return page;
}

export type DriveVideo = DrivePhoto;

export async function getDrivePhotos(
  event?: string,
  folderId = DRIVE_FOLDER_ID,
): Promise<DrivePhoto[]> {
  return (await getDrivePhotosPage(event, folderId)).items;
}

export async function getDriveVideos(
  event?: string,
  folderId = DRIVE_FOLDER_ID,
): Promise<DriveVideo[]> {
  return (await getDriveVideosPage(event, folderId)).items;
}

export function getDriveVideoPreviewUrl(file: DriveVideo): string {
  if (!file.id) return "";
  const url = new URL(
    `https://drive.google.com/file/d/${encodeURIComponent(file.id)}/preview`,
  );
  if (file.resourceKey) {
    url.searchParams.set("resourcekey", file.resourceKey);
  }
  return url.toString();
}

function resizeThumbnailUrl(thumbnailLink: string, size: number): string {
  const safeSize = Math.max(120, Math.min(size, MAX_THUMBNAIL_SIZE));
  if (/=s\d+(?:-[^&]*)?$/.test(thumbnailLink)) {
    return thumbnailLink.replace(/=s\d+(?:-[^&]*)?$/, `=s${safeSize}`);
  }
  if (thumbnailLink.includes("?")) {
    return `${thumbnailLink}&sz=${safeSize}`;
  }
  return thumbnailLink;
}

export function getDriveThumbnailUrl(
  file: DrivePhoto,
  size = 800,
): string {
  if (file.thumbnailLink) {
    return resizeThumbnailUrl(file.thumbnailLink, size);
  }
  return getDriveImageUrl(file, Math.min(size, MAX_THUMBNAIL_SIZE));
}

export function getDriveImageUrl(
  file: DrivePhoto,
  size = 2200,
): string {
  if (file.thumbnailLink) {
    return resizeThumbnailUrl(file.thumbnailLink, Math.min(size, 2200));
  }
  if (!file.id) return "";
  const params = new URLSearchParams({ id: file.id, size: String(Math.max(400, Math.min(size, 2000))) });
  if (file.resourceKey) params.set("resourceKey", file.resourceKey);
  return `/api/media?${params.toString()}`;
}

export function getDriveCoverImageUrl(
  fileId?: string | null,
  size = 1600,
  cacheKey?: string | null,
): string {
  const id = String(fileId || "").trim();
  if (!id) return "";
  const params = new URLSearchParams({
    id,
    size: String(Math.max(400, Math.min(size, 2000))),
  });
  if (cacheKey) params.set("v", String(cacheKey));
  return `/api/media?${params.toString()}`;
}

export function getDriveFolderUrl(folderId?: string | null): string {
  const id = String(folderId || "").trim();
  if (!id) return "";
  return `https://drive.google.com/drive/folders/${encodeURIComponent(id)}`;
}

export function getDriveDirectThumbnailUrl(fileId?: string | null, size = 1600): string {
  const id = String(fileId || "").trim();
  if (!id) return "";
  const safeSize = Math.max(400, Math.min(size, 2000));
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${safeSize}`;
}

export function getDriveViewUrl(file: DrivePhoto): string {
  if (file.webViewLink) return file.webViewLink;
  return `https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view`;
}

export function getDriveVideoDownloadUrl(file: DriveVideo): string {
  if (!file.id) return "";
  const params = new URLSearchParams({ id: file.id });
  if (file.resourceKey) params.set("resourceKey", file.resourceKey);
  return `/api/media?${params.toString()}`;
}
