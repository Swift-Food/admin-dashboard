import http from "./http";

export interface CacheSectionMeta {
  id: string;
  label: string;
  description: string;
  group: string;
  /** When true, clearing disrupts live users (not just a transparent recompute). */
  disruptive?: boolean;
}

export interface CacheStats {
  /** DBSIZE — total keys in Redis, including non-cache operational keys. */
  totalKeys: number;
  /** Keys actually walked while bucketing. */
  scannedKeys: number;
  /** Human-readable used memory, e.g. "12.4M". */
  usedMemoryHuman: string;
  /** Per-section key count keyed by section id. */
  sections: Record<string, number>;
}

export interface ClearSectionResult {
  sectionId: string;
  clearedCount: number;
}

export interface ClearAllResult {
  totalCleared: number;
  perSection: Record<string, number>;
}

class CacheControlService {
  async getSections(): Promise<CacheSectionMeta[]> {
    const res = await http.get<CacheSectionMeta[]>("/admin/cache/sections");
    return res.data;
  }

  async getStats(): Promise<CacheStats> {
    const res = await http.get<CacheStats>("/admin/cache/stats");
    return res.data;
  }

  async clearSection(id: string): Promise<ClearSectionResult> {
    const res = await http.post<ClearSectionResult>(
      `/admin/cache/sections/${encodeURIComponent(id)}/clear`,
    );
    return res.data;
  }

  async clearAll(): Promise<ClearAllResult> {
    const res = await http.post<ClearAllResult>("/admin/cache/clear-all");
    return res.data;
  }
}

export default new CacheControlService();
