const API_URL = (
  process.env.NEXT_PUBLIC_ADMIN_API_URL || "http://localhost:4001"
).replace(/\/$/, "");

const SESSION_KEY = "p1p_admin_session";
const LEGACY_KEY = "p1p_admin_key";

export type AdminUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
  lastLoginAt?: string | null;
};

export function getSessionToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(SESSION_KEY) || "";
}

export function setSessionToken(token: string) {
  localStorage.setItem(SESSION_KEY, token);
}

export function clearSessionToken() {
  localStorage.removeItem(SESSION_KEY);
}

/** @deprecated Prefer session auth; kept for emergency API-key access in Settings */
export function getAdminKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LEGACY_KEY) || "";
}

export function setAdminKey(key: string) {
  localStorage.setItem(LEGACY_KEY, key);
}

export function clearAdminKey() {
  localStorage.removeItem(LEGACY_KEY);
}

export function clearAllAuth() {
  clearSessionToken();
  clearAdminKey();
}

async function request(path: string, init: RequestInit = {}, auth = true) {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getSessionToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const key = getAdminKey();
    if (key) headers.set("x-admin-key", key);
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : `Request failed (${res.status})`,
    );
  }
  return data;
}

export async function requestAuthCode(email: string, mode: "signin" | "signup") {
  return request(
    "/api/auth/request",
    {
      method: "POST",
      body: JSON.stringify({ email, mode }),
    },
    false,
  );
}

export async function verifyAuthCode(input: {
  email: string;
  code?: string;
  token?: string;
}) {
  return request(
    "/api/auth/verify",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    false,
  );
}

export async function fetchMe() {
  return request("/api/auth/me");
}

export async function logoutSession() {
  try {
    await request("/api/auth/logout", { method: "POST" });
  } finally {
    clearAllAuth();
  }
}

export async function fetchProducts() {
  return request("/api/admin/products");
}

export async function fetchProduct(idOrSlug: string) {
  return request(`/api/admin/products/${encodeURIComponent(idOrSlug)}`);
}

export async function createProduct(body: Record<string, unknown>) {
  return request("/api/admin/products", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateProduct(id: string, body: Record<string, unknown>) {
  return request(`/api/admin/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteProduct(id: string) {
  return request(`/api/admin/products/${id}`, { method: "DELETE" });
}

export async function uploadProductImage(file: File, productId?: string) {
  const imageBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });

  return request("/api/admin/uploads", {
    method: "POST",
    body: JSON.stringify({
      imageBase64,
      contentType: file.type || "image/jpeg",
      productId,
      folder: "products",
    }),
  }) as Promise<{
    asset: {
      url: string;
      thumbUrl: string;
      width: number;
      height: number;
      bytes: number;
    };
  }>;
}

export async function fetchCollections() {
  return request("/api/admin/collections");
}

export async function fetchCollection(id: string) {
  return request(`/api/admin/collections/${encodeURIComponent(id)}`);
}

export async function createCollection(body: Record<string, unknown>) {
  return request("/api/admin/collections", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateCollection(id: string, body: Record<string, unknown>) {
  return request(`/api/admin/collections/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteCollection(id: string) {
  return request(`/api/admin/collections/${id}`, { method: "DELETE" });
}

export async function setHomepageCollection(homepageCollectionId: string | null) {
  return request("/api/admin/collections/settings/homepage", {
    method: "PUT",
    body: JSON.stringify({ homepageCollectionId }),
  });
}

export async function fetchOrderRequests() {
  return request("/api/admin/order-requests");
}

export async function updateOrderStatus(id: string, status: string) {
  return request(`/api/admin/order-requests/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function ssStatus() {
  return request("/api/admin/ss/status");
}

export async function fetchSsCredentials() {
  return request("/api/admin/ss/credentials");
}

export async function saveSsCredentials(body: {
  accountNumber: string;
  apiKey: string;
}) {
  return request("/api/admin/ss/credentials", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function clearSsCredentials() {
  return request("/api/admin/ss/credentials", { method: "DELETE" });
}

export async function testSsCredentials(body?: {
  accountNumber?: string;
  apiKey?: string;
}) {
  return request("/api/admin/ss/credentials/test", {
    method: "POST",
    body: JSON.stringify(body || {}),
  });
}

export async function ssBrands(options: { refresh?: boolean } = {}) {
  const qs = options.refresh ? "?refresh=1" : "";
  return request(`/api/admin/ss/brands${qs}`);
}

export async function ssSearch(q: string, brand?: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (brand) params.set("brand", brand);
  return request(`/api/admin/ss/search?${params.toString()}`);
}

export async function ssImport(styleId: string | number) {
  return request("/api/admin/ss/import", {
    method: "POST",
    body: JSON.stringify({ styleId }),
  });
}

export async function ssRefreshProduct(productId: string) {
  return request(`/api/admin/ss/refresh-product/${encodeURIComponent(productId)}`, {
    method: "POST",
  });
}

export async function fetchUsers() {
  return request("/api/admin/users");
}

export async function inviteUser(body: {
  email: string;
  name?: string;
  role?: string;
}) {
  return request("/api/admin/users/invite", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function removeUser(id: string) {
  return request(`/api/admin/users/${id}`, { method: "DELETE" });
}

export async function fetchSiteSettings() {
  return request("/api/admin/settings");
}

export async function savePricingSettings(body: {
  defaultMarkupPercent: number;
}) {
  return request("/api/admin/settings/pricing", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function saveDecorationSettings(body: {
  decorationMethods: Array<{
    id?: string;
    label: string;
    askInkColors?: boolean;
    locations: string[];
  }>;
}) {
  return request("/api/admin/settings/decoration", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function saveNavigationSettings(body: {
  apparelMegaMenu: {
    columns: Array<{
      id?: string;
      title: string;
      items: Array<{
        id?: string;
        label: string;
        collectionSlug?: string;
        brand?: string;
        href?: string;
      }>;
      viewAllLabel?: string;
      viewAllHref?: string;
      helpText?: string;
      ctaLabel?: string;
      ctaHref?: string;
    }>;
  };
}) {
  return request("/api/admin/settings/navigation", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export { API_URL };
