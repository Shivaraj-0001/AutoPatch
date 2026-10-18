import { NextRequest } from 'next/server';
import * as orchestrator from '@/server/services/orchestrator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const run = orchestrator.getRun(id);
  if (!run) {
    return new Response(JSON.stringify({ error: 'Run not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 1. Initial State
      const safeState = orchestrator.getSafeRunState(run);
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ eventType: 'run.state', run: safeState })}\n\n`),
      );

      // 2. Event Subscription
      const unsubscribe = orchestrator.subscribeToEvents(id, (event) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Stream closed or client disconnected
        }
      });

      // 3. Heartbeat every 15 seconds to prevent client timeout
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15_000);

      // 4. Abort listener
      const cleanup = () => {
        unsubscribe();
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      };

      request.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      // Stream cancellation handled via signal abort
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
