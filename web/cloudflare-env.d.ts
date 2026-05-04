interface CloudflareEnv {
  ASSETS: Fetcher;
  WHISPERX_ENDPOINT: string;
  QWEN_ASR_ENDPOINT: string;
  CF_ACCESS_CLIENT_ID: string;
  CF_ACCESS_CLIENT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
  DB: D1Database;
  AUDIO_BUCKET: R2Bucket;
}
