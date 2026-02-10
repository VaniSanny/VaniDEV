import bot from '@/lib/bot';
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ commands: bot.getCommands() });
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { action, name, description, content } = body;

        if (action === 'add') {
            const registeredName = await bot.addCommand({
                name,
                description,
                content,
                guildId: body.guildId,
                requiredRoleId: body.requiredRoleId
            });
            return NextResponse.json({ success: true, message: `Command /${registeredName} saved & registered!` });
        }

        if (action === 'delete') {
            await bot.removeCommand(name, body.guildId);
            return NextResponse.json({ success: true, message: `Command /${name} deleted.` });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('[API] Command error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
