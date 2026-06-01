import http from './http';
import type { AxiosResponse } from 'axios';
import type {
  PipelineConfig,
  PipelineConfigPatch,
  PipelineConfigResponse,
} from '../types/pipeline-config.types';

const BASE = '/admin/catering/pipeline-config';

class PipelineConfigService {
  async get(): Promise<PipelineConfigResponse> {
    const res: AxiosResponse<PipelineConfigResponse> = await http.get(BASE);
    return res.data;
  }

  async update(patch: PipelineConfigPatch): Promise<{ config: PipelineConfig }> {
    const res: AxiosResponse<{ config: PipelineConfig }> = await http.patch(
      BASE,
      { config: patch },
    );
    return res.data;
  }
}

export default new PipelineConfigService();
