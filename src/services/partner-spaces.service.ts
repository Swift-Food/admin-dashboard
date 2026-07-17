import http from "./http";
import type {
  PartnerSpace,
  CreatePartnerSpaceDto,
  UpdatePartnerSpaceDto,
} from "../types/partner-spaces.types";

// TypeORM hydrates `decimal` columns (e.g. commission) as strings.
// Normalize to a real number at the service boundary.
const normalize = (space: PartnerSpace): PartnerSpace => ({
  ...space,
  commission: Number(space.commission) || 0,
});

const partnerSpacesService = {
  getAll: async (): Promise<PartnerSpace[]> => {
    const { data } = await http.get<PartnerSpace[]>("/admin/partner-spaces");
    return data.map(normalize);
  },

  create: async (dto: CreatePartnerSpaceDto): Promise<PartnerSpace> => {
    const { data } = await http.post<PartnerSpace>("/admin/partner-spaces", dto);
    return normalize(data);
  },

  update: async (id: string, dto: UpdatePartnerSpaceDto): Promise<PartnerSpace> => {
    const { data } = await http.patch<PartnerSpace>(`/admin/partner-spaces/${id}`, dto);
    return normalize(data);
  },

  rotateKey: async (id: string): Promise<PartnerSpace> => {
    const { data } = await http.post<PartnerSpace>(
      `/admin/partner-spaces/${id}/rotate-key`
    );
    return normalize(data);
  },

  updateCommission: async (
    id: string,
    commission: number
  ): Promise<{ commission: number }> => {
    const { data } = await http.patch<{ commission: number }>(
      `/admin/partner-spaces/${id}/commission`,
      { commission }
    );
    return { commission: Number(data.commission) || 0 };
  },
};

export default partnerSpacesService;
