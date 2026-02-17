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
    expectedBytes: 59_721_011,
    checksumSha256:
      "323473b7c41bfb7fb994c1e9526abdcc7c55d3a909c8fa0c29f753005e87d372"
  },
  {
    id: "llm-qwen2.5-3b-instruct-q4_k_m",
    capability: "llm",
    displayName: "Assistant Brain (Qwen2.5 3B Instruct)",
    progressLabel: "Assistant language model",
    fileName: "qwen2.5-3b-instruct-q4_k_m.gguf",
    downloadUrl:
      "https://huggingface.co/bartowski/Qwen2.5-3B-Instruct-GGUF/resolve/main/Qwen2.5-3B-Instruct-Q4_K_M.gguf",
    expectedBytes: 1_929_903_264,
    checksumSha256:
      "7f4e1a6aed07702952a1dd402b9d23382d8083c34c8095e8751d2c5f40b116b3"
  },
  {
    id: "tts-kokoro-v0_19-fp16",
    capability: "tts",
    displayName: "Voice Output (Kokoro v0.19)",
    progressLabel: "Text to speech model",
    fileName: "kokoro-v0_19.onnx",
    downloadUrl: "https://huggingface.co/onnx-community/Kokoro-82M-ONNX/resolve/main/onnx/model_fp16.onnx",
    expectedBytes: 163_227_585,
    checksumSha256:
      "179746a6ff0aca35bd19801ce91e820205c15a9f3135cc8831cd90c04c08741e"
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
