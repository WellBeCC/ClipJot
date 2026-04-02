const WORKER_URL = import.meta.env.PUBLIC_SUBSCRIBE_WORKER_URL as string;

export async function subscribeEmail(email: string): Promise<void> {
  if (!WORKER_URL) {
    throw new Error('Subscription service is not configured');
  }

  const response = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(`Subscription failed: ${response.status}`);
  }
}
