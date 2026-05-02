/**
 * Fetch shared LLM configuration from D1 (via server API)
 * Falls back to local store config if server is unavailable
 */
export async function getSharedLLMConfig(): Promise<{
  apiEndpoint: string;
  apiKey: string;
  selectedModel: string;
}> {
  try {
    const res = await fetch('/api/llm-config');
    if (res.ok) {
      const data = await res.json();
      return {
        apiEndpoint: data.config.apiEndpoint || '',
        apiKey: data.config.apiKey || '',
        selectedModel: data.config.selectedModel || 'gemini-2.5-pro',
      };
    }
  } catch { /* fallback */ }

  // Fallback to local store
  const { useAppStore } = await import('@/store/app-store');
  const store = useAppStore.getState();
  return {
    apiEndpoint: store.apiEndpoint,
    apiKey: store.apiKey,
    selectedModel: store.selectedModel,
  };
}
