import bot from '@/lib/bot';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        return NextResponse.json({
            logs: bot.getBotLogs ? bot.getBotLogs() : []
        });
    } catch (error) {
        console.error('[API] Logs fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const { action } = await req.json();
        if (action === 'clear') {
            if (bot.clearLogs) bot.clearLogs();
            return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
