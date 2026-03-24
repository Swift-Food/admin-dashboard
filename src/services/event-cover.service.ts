import http from "./http";

interface EventCoverResponse {
  id: string;
  images: string[];
  category: string;
  featured: boolean;
}

class EventCoverService {
  private readonly baseUrl = "/event-covers";
  private cache: Record<string, string[]> | null = null;
  private featuredCategories: Set<string> | null = null;

  private async fetchAll(): Promise<EventCoverResponse[]> {
    const response = await http.get<EventCoverResponse[]>(`${this.baseUrl}/all`);
    return response.data;
  }

  async getAll(): Promise<Record<string, string[]>> {
    if (this.cache) return this.cache;

    const data = await this.fetchAll();
    const result: Record<string, string[]> = {};
    const featured = new Set<string>();

    for (const entry of data) {
      result[entry.category] = entry.images;
      if (entry.featured) {
        featured.add(entry.category);
      }
    }

    this.cache = result;
    this.featuredCategories = featured;

    return result;
  }

  async getFeaturedCategories(): Promise<Set<string>> {
    if (this.featuredCategories) return this.featuredCategories;
    await this.getAll();
    return this.featuredCategories ?? new Set<string>();
  }
}

export const eventCoverService = new EventCoverService();
