import http from "./http";
import type {
  PartnerSpace,
  CreatePartnerSpaceDto,
  UpdatePartnerSpaceDto,
} from "../types/partner-spaces.types";

const partnerSpacesService = {
  getAll: async (): Promise<PartnerSpace[]> => {
    const { data } = await http.get<PartnerSpace[]>("/admin/partner-spaces");
    return data;
  },

  create: async (dto: CreatePartnerSpaceDto): Promise<PartnerSpace> => {
    const { data } = await http.post<PartnerSpace>("/admin/partner-spaces", dto);
    return data;
  },

  update: async (id: string, dto: UpdatePartnerSpaceDto): Promise<PartnerSpace> => {
    const { data } = await http.patch<PartnerSpace>(`/admin/partner-spaces/${id}`, dto);
    return data;
  },

  rotateKey: async (id: string): Promise<PartnerSpace> => {
    const { data } = await http.post<PartnerSpace>(
      `/admin/partner-spaces/${id}/rotate-key`
    );
    return data;
  },
};

export default partnerSpacesService;
