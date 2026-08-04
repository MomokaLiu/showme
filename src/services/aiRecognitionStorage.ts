export type AiRecognitionConfig = {
  endpoint: string;
  apiKey: string;
  model: string;
};

const STORAGE_KEY = "buwangwu.aiRecognitionConfig";

const emptyConfig: AiRecognitionConfig = {
  endpoint: "",
  apiKey: "",
  model: "",
};

export function loadAiRecognitionConfig(
  storage: Pick<Storage, "getItem"> = window.localStorage,
): AiRecognitionConfig {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return emptyConfig;
  try {
    const parsed = JSON.parse(raw) as Partial<AiRecognitionConfig>;
    return {
      endpoint: parsed.endpoint?.trim() ?? "",
      apiKey: parsed.apiKey ?? "",
      model: parsed.model?.trim() ?? "",
    };
  } catch {
    return emptyConfig;
  }
}

export function saveAiRecognitionConfig(
  config: AiRecognitionConfig,
  storage: Pick<Storage, "setItem"> = window.localStorage,
) {
  storage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function isAiRecognitionConfigured(config: AiRecognitionConfig): boolean {
  return Boolean(config.endpoint.trim() && config.apiKey.trim() && config.model.trim());
}
