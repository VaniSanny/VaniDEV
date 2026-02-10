import { NextResponse } from 'next/server';
const bot = require('../../../../lib/bot');

export async function GET() {
    return NextResponse.json(bot.getWaitlist());
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { name, email, reason, invite, action, id } = body;

        if (action === 'delete') {
            bot.removeWaitlistEntry(id);
            return NextResponse.json({ success: true });
        }

        if (!name || !email) {
            return NextResponse.json({ error: 'Name and Email are required' }, { status: 400 });
        }

        const entry = bot.addWaitlistEntry({ name, email, reason, invite });
        return NextResponse.json({ success: true, entry });
    } catch (err) {
        console.error('Waitlist API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
