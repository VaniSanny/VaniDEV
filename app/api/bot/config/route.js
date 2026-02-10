import bot from '@/lib/bot';
import { NextResponse } from 'next/server';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const guildId = searchParams.get('guildId');
    if (!guildId) return NextResponse.json({ error: 'Missing guildId' }, { status: 400 });

    try {
        const config = bot.getGuildConfig(guildId);
        return NextResponse.json(config);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { guildId, config } = body;
        if (!guildId) return NextResponse.json({ error: 'Missing guildId' }, { status: 400 });

        await bot.updateGuildConfig(guildId, config);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
