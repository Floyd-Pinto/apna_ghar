import { apiRequest } from "./api";

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: "buyer" | "builder";
  is_admin: boolean;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const parse = async <T>(res: Response): Promise<T> => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.detail || `Request failed (${res.status})`);
  return data as T;
};

export const adminAPI = {
  listUsers: async (params: { search?: string; page?: number; adminsOnly?: boolean } = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.page) query.set("page", String(params.page));
    if (params.adminsOnly) query.set("admins_only", "true");
    const res = await apiRequest(`/api/auth/admin/users/?${query.toString()}`);
    return parse<Paginated<AdminUser>>(res);
  },

  promote: async (userId: string) =>
    parse<{ message: string; user: AdminUser }>(
      await apiRequest(`/api/auth/admin/users/${userId}/promote/`, { method: "POST" }),
    ),

  demote: async (userId: string) =>
    parse<{ message: string; user: AdminUser }>(
      await apiRequest(`/api/auth/admin/users/${userId}/demote/`, { method: "POST" }),
    ),
};
