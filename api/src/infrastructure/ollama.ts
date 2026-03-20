const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const MODEL = "mxbai-embed-large";

let available = false;

export async function checkOllama(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!res.ok) return (available = false);
    const data = (await res.json()) as { models?: { name: string }[] };
    available = data.models?.some((m) => m.name.startsWith(MODEL)) ?? false;
    if (available) console.log(`[ollama] ${MODEL} ready`);
    else console.warn(`[ollama] ${MODEL} not found — embeddings disabled`);
    return available;
  } catch {
    console.warn("[ollama] unavailable — embeddings disabled");
    return (available = false);
  }
}

export function isOllamaAvailable(): boolean {
  return available;
}

export async function embed(text: string): Promise<number[] | null> {
  if (!available) return null;
  try {
    const res = await fetch(`${OLLAMA_URL}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, input: text }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { embeddings: number[][] };
    return data.embeddings[0] ?? null;
  } catch {
    return null;
  }
}

export async function embedBatch(texts: string[]): Promise<(number[] | null)[]> {
  if (!available || texts.length === 0) return texts.map(() => null);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, input: texts }),
    });
    if (!res.ok) return texts.map(() => null);
    const data = (await res.json()) as { embeddings: number[][] };
    return texts.map((_, i) => data.embeddings[i] ?? null);
  } catch {
    return texts.map(() => null);
  }
}
