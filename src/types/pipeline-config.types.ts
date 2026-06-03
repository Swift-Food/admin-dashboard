// Mirrors the backend pipeline_v1 model-config contract
// (backend: src/features/catering-chat/pipeline/pipeline-config.types.ts).

export interface StageModelConfig {
  model: string;
  fallback: string;
  temperature: number;
}

export type ToolOverride = Partial<StageModelConfig>;

export interface PerToolStageConfig extends StageModelConfig {
  toolOverrides: Record<string, ToolOverride>;
}

export interface PipelineConfig {
  intent_classifier: StageModelConfig;
  slot_extractor: PerToolStageConfig;
  pro_disambiguator: StageModelConfig;
  pro_cart_fallback: PerToolStageConfig;
  reply_polisher: StageModelConfig;
  qa_composer: StageModelConfig;
}

export type StageName = keyof PipelineConfig;

export interface PipelineConfigOptions {
  models: string[];
  stages: StageName[];
  perToolStages: StageName[];
  tools: string[];
}

export interface PipelineConfigResponse {
  config: PipelineConfig;
  options: PipelineConfigOptions;
}

// ── PATCH shape (a tool override set to null deletes it) ────────────────

export type ToolOverridePatch = ToolOverride | null;

export type StagePatch = Partial<StageModelConfig> & {
  toolOverrides?: Record<string, ToolOverridePatch>;
};

export type PipelineConfigPatch = Partial<Record<StageName, StagePatch>>;
