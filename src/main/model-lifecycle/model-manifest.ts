export type ModelCapability = "stt" | "llm" | "tts";

export interface RequiredModelArtifact {
  id: string;
  capability: ModelCapability;
  displayName: string;
  progressLabel: string;
  fileName: string;
  downloadUrl: string;
  expectedBytes: number;
  checksumSha256: string;
}

export interface RequiredModelBundleManifest {
  id: string;
  displayName: string;
  artifacts: ReadonlyArray<RequiredModelArtifact>;
}

const REQUIRED_ARTIFACTS: readonly RequiredModelArtifact[] = [
  {
    id: "stt-whisper-base-en-q5_1",
    capability: "stt",
    displayName: "Speech to Text (Whisper Base EN)",
    progressLabel: "Speech recognition model",
    fileName: "ggml-base.en-q5_1.bin",
    downloadUrl:
      "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en-q5_1.bin",
    expectedBytes: 620_075_328,
    checksumSha256:
      "08b0e143c1841eeb5f6b5379f624ecf8ef8a7f4631efdb413725bc5ef164481e"
  },
  {
    id: "llm-qwen2.5-3b-instruct-q4_k_m",
    capability: "llm",
    displayName: "Assistant Brain (Qwen2.5 3B Instruct)",
    progressLabel: "Assistant language model",
    fileName: "qwen2.5-3b-instruct-q4_k_m.gguf",
    downloadUrl:
      "https://huggingface.co/bartowski/Qwen2.5-3B-Instruct-GGUF/resolve/main/Qwen2.5-3B-Instruct-Q4_K_M.gguf",
    expectedBytes: 1_995_479_040,
    checksumSha256:
      "e06ffd648c7b0476f3a9f8a6f9f997f3afec45dd03f65fdc5a14566f70c188f4"
  },
  {
    id: "tts-kokoro-v0_19-fp16",
    capability: "tts",
    displayName: "Voice Output (Kokoro v0.19)",
    progressLabel: "Text to speech model",
    fileName: "kokoro-v0_19.onnx",
    downloadUrl:
      "https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/kokoro-v0_19.onnx",
    expectedBytes: 327_810_048,
    checksumSha256:
      "f4f95a656f7ec5592d2788f63edd8f7d110f18ff5095ee3ecef0d83f2f8ca170"
  }
];

export const REQUIRED_MODEL_BUNDLE_MANIFEST: RequiredModelBundleManifest = {
  id: "scribe-valet-required-bundle-v1",
  displayName: "Downloading AI models",
  artifacts: REQUIRED_ARTIFACTS
};

export function getRequiredModelBundleArtifacts(): ReadonlyArray<RequiredModelArtifact> {
  return REQUIRED_MODEL_BUNDLE_MANIFEST.artifacts;
}
