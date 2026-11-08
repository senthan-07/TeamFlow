/** Backend origin without a trailing slash, e.g. https://api.teamflow.app */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

/** Absolute URL for a backend-relative path like "/uploads/abc.png". */
export const apiAsset = (path: string) => (/^https?:\/\//.test(path) ? path : `${API_URL}${path}`);
