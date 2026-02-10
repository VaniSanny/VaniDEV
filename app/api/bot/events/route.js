import { NextResponse } from 'next/server';
import bot from '@/lib/bot';

export async function GET(req) {
    const stream = new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();

            const onUpdate = (data) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            bot.events.on('update', onUpdate);

            // Periodically send a keep-alive comment
            const keepAlive = setInterval(() => {
                controller.enqueue(encoder.encode(': keep-alive\n\n'));
            }, 30000);

            req.signal.addEventListener('abort', () => {
                bot.events.off('update', onUpdate);
                clearInterval(keepAlive);
                controller.close();
            });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    });
}
