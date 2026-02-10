import bot from '@/lib/bot';
import { NextResponse } from 'next/server';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const guildId = searchParams.get('guildId');
    const client = bot.getClient();
    const wsStatus = bot.getStatus();

    if (wsStatus !== 'READY' || !client.user) {
        return NextResponse.json({
            offline: true,
            wsStatus,
            statusConfig: bot.getStatusConfig()
        }, { status: 200 });
    }

    // If guildId is provided, fetch members for that guild
    if (guildId) {
        try {
            const members = await bot.getGuildMembers(guildId);
            return NextResponse.json({ members });
        } catch (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    }

    const activity = client.user?.presence?.activities?.[0];
    const guilds = bot.getGuilds();
    const messages = bot.getMessages();
    const botLogs = bot.getBotLogs();
    const shard = bot.getShardDetails();
    const apiPing = bot.getApiPing();
    const statusConfig = bot.getStatusConfig();

    return NextResponse.json({
        wsStatus: wsStatus,
        statusConfig: statusConfig,
        user: {
            username: client.user.username,
            avatar: bot.getAvatar(client.user),
            tag: client.user.tag,
        },
        presence: {
            status: client.user?.presence?.status || 'online',
            activity: activity ? {
                name: activity.name,
                type: activity.type,
            } : null,
        },
        guilds: guilds,
        messages: messages,
        botLogs: botLogs,
        shard: shard,
        apiPing: apiPing,
        bridge: { status: 'READY' } // Bridge (SSE) is working if they can fetch this
    });
}

export async function POST(req) {
    try {
        const body = await req.json();
        const {
            activityType, activityName, status, action,
            username, avatarUrl, syncNicknames,
            guildId, userId, modAction, modOptions,
            statusMode, statusMessage
        } = body;

        // Handle Lifecycle Actions & Identity Updates & Moderation & Status Control
        if (action) {
            switch (action) {
                case 'start':
                    await bot.start();
                    return NextResponse.json({ success: true, message: 'Bot started' });
                case 'stop':
                    await bot.stop();
                    return NextResponse.json({ success: true, message: 'Bot stopped' });
                case 'restart':
                    await bot.restart();
                    return NextResponse.json({ success: true, message: 'Bot restarted' });
                case 'updateIdentity':
                    const msg = await bot.updateIdentity({ username, avatarUrl, syncNicknames });
                    return NextResponse.json({ success: true, message: msg });
                case 'setSystemStatus':
                    bot.setSystemStatus(statusMode, statusMessage);
                    return NextResponse.json({ success: true, message: `System status set to ${statusMode}` });
                case 'leaveGuild':
                    if (!guildId) return NextResponse.json({ error: 'guildId missing' }, { status: 400 });
                    const leaveMsg = await bot.leaveGuild(guildId);
                    return NextResponse.json({ success: true, message: leaveMsg });
                case 'moderateMember':
                    if (!guildId || !userId || !modAction) {
                        return NextResponse.json({ error: 'Missing mod fields' }, { status: 400 });
                    }
                    const modMsg = await bot.moderateMember(guildId, userId, modAction, modOptions);
                    return NextResponse.json({ success: true, message: modMsg });
                case 'clearLogs':
                    bot.clearLogs();
                    return NextResponse.json({ success: true, message: 'Logs cleared' });
                default:
                    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
            }
        }

        // Handle Activity Updates
        await bot.updatePresence({ activityName, activityType, status });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
