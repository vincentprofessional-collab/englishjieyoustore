import { pipeline, env } from "@huggingface/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm!.numThreads = 1;

self.onmessage = async (event: MessageEvent<{ audio: Float32Array }>) => {
  try {
    const transcriber = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en", {
      device: "wasm", dtype: "q8",
      progress_callback: (progress) => {
        if (progress.status === "progress") self.postMessage({ status: "progress", message: `正在加载语音模型 ${Math.round(progress.progress ?? 0)}%` });
      },
    });
    self.postMessage({ status: "progress", message: "正在本地识别原声并生成逐句时间轴……" });
    const result = await transcriber(event.data.audio, { return_timestamps: "word", chunk_length_s: 30, stride_length_s: 5 });
    self.postMessage({ status: "complete", result });
    await transcriber.dispose();
  } catch (error) { self.postMessage({ status: "error", message: error instanceof Error ? error.message : "音频时间轴分析失败。" }); }
};
