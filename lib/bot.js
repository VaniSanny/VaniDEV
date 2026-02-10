const { Client, GatewayIntentBits, Events, ActivityType, Partials, REST, Routes, PermissionFlagsBits, ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

let client;
const MAX_LOG_SIZE = 250;
const MESSAGES_FILE = path.join(process.cwd(), 'messages.json');
const LOGS_FILE = path.join(process.cwd(), 'bot_logs.json');
const COMMANDS_FILE = path.join(process.cwd(), 'commands.json');
const STATUS_CONFIG_FILE = path.join(process.cwd(), 'status_config.json');
const WAITLIST_FILE = path.join(process.cwd(), 'waitlist.json');
const GUILD_CONFIG_FILE = path.join(process.cwd(), 'guild_configs.json');

const STANDARD_COMMANDS = [
    {
        name: 'ping',
        description: 'Prüfe die Latenz des Bots.',
        options: []
    },
    {
        name: 'status',
        description: 'Zeige aktuelle System-Statistiken an.',
        options: []
    },
    {
        name: 'help',
        description: 'Zeige eine Liste aller verfügbaren Befehle an.',
        options: []
    },
    {
        name: 'kick',
        description: 'Kickt ein Mitglied vom Server.',
        default_member_permissions: PermissionFlagsBits.KickMembers.toString(),
        options: [
            { name: 'nutzer', description: 'Der zu kickende Nutzer', type: ApplicationCommandOptionType.User, required: true },
            { name: 'grund', description: 'Grund für den Kick', type: ApplicationCommandOptionType.String, required: false }
        ]
    },
    {
        name: 'ban',
        description: 'Bannt ein Mitglied vom Server.',
        default_member_permissions: PermissionFlagsBits.BanMembers.toString(),
        options: [
            { name: 'nutzer', description: 'Der zu bannende Nutzer', type: ApplicationCommandOptionType.User, required: true },
            { name: 'grund', description: 'Grund für den Bann', type: ApplicationCommandOptionType.String, required: false }
        ]
    },
    {
        name: 'timeout',
        description: 'Versetzt ein Mitglied für eine bestimmte Zeit in den Timeout.',
        default_member_permissions: PermissionFlagsBits.ModerateMembers.toString(),
        options: [
            { name: 'nutzer', description: 'Der Nutzer für den Timeout', type: ApplicationCommandOptionType.User, required: true },
            { name: 'dauer', description: 'Dauer in Minuten', type: ApplicationCommandOptionType.Integer, required: true },
            { name: 'grund', description: 'Grund für den Timeout', type: ApplicationCommandOptionType.String, required: false }
        ]
    },
    {
        name: 'addrole',
        description: 'Weist einem Nutzer eine Rolle zu.',
        default_member_permissions: PermissionFlagsBits.ManageRoles.toString(),
        options: [
            { name: 'nutzer', description: 'Der Zielnutzer', type: ApplicationCommandOptionType.User, required: true },
            { name: 'rolle', description: 'Die zuzuweisende Rolle', type: ApplicationCommandOptionType.Role, required: true }
        ]
    },
    {
        name: 'removerole',
        description: 'Entfernt einem Nutzer eine Rolle.',
        default_member_permissions: PermissionFlagsBits.ManageRoles.toString(),
        options: [
            { name: 'nutzer', description: 'Der Zielnutzer', type: ApplicationCommandOptionType.User, required: true },
            { name: 'rolle', description: 'Die zu entfernende Rolle', type: ApplicationCommandOptionType.Role, required: true }
        ]
    }
];

// Persistence utility
const loadData = (file) => {
    try {
        if (fs.existsSync(file)) {
            const data = fs.readFileSync(file, 'utf8');
            if (data && data.trim()) {
                return JSON.parse(data);
            }
        }
    } catch (err) {
        console.error(`[BOT] Failed to load ${file}:`, err.message);
    }
    return [];
};

const saveData = (file, data) => {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(`[BOT] Failed to save ${file}:`, err.message);
    }
};

let messageLog = loadData(MESSAGES_FILE);
let botLogs = loadData(LOGS_FILE);
let customCommands = loadData(COMMANDS_FILE);
let statusConfig = loadData(STATUS_CONFIG_FILE);

let waitlist = loadData(WAITLIST_FILE);
let guildConfigs = loadData(GUILD_CONFIG_FILE);

const saveGuildConfigs = () => saveData(GUILD_CONFIG_FILE, guildConfigs);

const hasPermission = (member, guildId, level) => {
    // level: 'owner', 'admin', 'mod'
    const config = guildConfigs[guildId] || { roles: { owner: [], admin: [], mod: [] } };
    const userRoles = member.roles.cache.map(r => r.id);

    // Check specific role IDs
    if (level === 'owner') {
        if (config.roles.owner.some(id => userRoles.includes(id))) return true;
        if (member.id === member.guild.ownerId) return true;
    }
    if (level === 'admin') {
        if (config.roles.owner.some(id => userRoles.includes(id))) return true;
        if (config.roles.admin.some(id => userRoles.includes(id))) return true;
        if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    }
    if (level === 'mod') {
        if (config.roles.owner.some(id => userRoles.includes(id))) return true;
        if (config.roles.admin.some(id => userRoles.includes(id))) return true;
        if (config.roles.mod.some(id => userRoles.includes(id))) return true;
        if (member.permissions.has(PermissionFlagsBits.ModerateMembers)) return true;
    }
    return false;
};

// Default status config if empty
if (Array.isArray(statusConfig) || !statusConfig.mode) {
    statusConfig = { mode: 'auto', message: '' };
}

if (!Array.isArray(waitlist)) {
    waitlist = [];
}

const botEvents = new EventEmitter();

const addActionLog = (type, message, status = 'success') => {
    botLogs.unshift({
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        type, // 'system', 'moderation', 'identity'
        message,
        status,
        timestamp: new Date()
    });
    if (botLogs.length > MAX_LOG_SIZE) botLogs.pop();
    saveData(LOGS_FILE, botLogs);
    botEvents.emit('update', { type: 'logs' });
};

// Helper functions for image URLs
const getAvatar = (user) => {
    try {
        if (!user) return 'https://cdn.discordapp.com/embed/avatars/0.png';
        return user.displayAvatarURL({ extension: 'png', size: 1024, forceStatic: false }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
    } catch {
        return 'https://cdn.discordapp.com/embed/avatars/0.png';
    }
};
const getIcon = (guild) => {
    try {
        if (!guild) return 'https://cdn.discordapp.com/embed/avatars/0.png';
        return guild.iconURL({ extension: 'png', size: 1024 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
    } catch {
        return 'https://cdn.discordapp.com/embed/avatars/0.png';
    }
};



const initClient = () => {
    if (!client) {
        console.log('[BOT] Initializing new Client instance...');
        client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.DirectMessages, // For DMs
            ],
            partials: [Partials.Channel, Partials.Message], // Required for DMs
        });

        client.once(Events.ClientReady, async (c) => {
            console.log(`[BOT] Ready! Logged in as ${c.user.tag}`);
            addActionLog('system', `Bot logged in as ${c.user.tag}`);

            // Set default activity
            c.user.setPresence({
                activities: [{ name: 'Powered by Vani❤️', type: ActivityType.Custom }],
                status: 'online'
            });

            // Auto-register commands on startup
            try {
                await bot.refreshCommands();
            } catch (err) {
                console.error('[BOT] Initial command registration failed:', err.message);
            }
        });

        client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isChatInputCommand()) return;

            // 1. Handle Standard Commands
            const isStandard = STANDARD_COMMANDS.some(sc => sc.name === interaction.commandName);
            if (isStandard) {
                try {
                    switch (interaction.commandName) {
                        case 'ping':
                            const pingEmbed = new EmbedBuilder()
                                .setTitle('🏓 Pong!')
                                .setColor('#6366f1')
                                .addFields(
                                    { name: 'Bot Latenz', value: `\`${Math.round(client.ws.ping)}ms\``, inline: true },
                                    { name: 'API Latenz', value: `\`${Math.round(Date.now() - interaction.createdTimestamp)}ms\``, inline: true }
                                )
                                .setFooter({ text: 'VaniDEV infrastructure' })
                                .setTimestamp();
                            return await interaction.reply({ embeds: [pingEmbed] });

                        case 'status':
                            const shard = bot.getShardDetails();
                            const statusEmbed = new EmbedBuilder()
                                .setTitle('📊 System Status')
                                .setColor(shard.status === 'READY' ? '#10b981' : '#f59e0b')
                                .addFields(
                                    { name: 'WebSocket', value: `\`${bot.getStatus()}\``, inline: true },
                                    { name: 'Ping', value: `\`${shard.ping}ms\``, inline: true },
                                    { name: 'Server', value: `\`${client.guilds.cache.size}\``, inline: true },
                                    { name: 'Nutzer', value: `\`${client.users.cache.size}\``, inline: true },
                                    { name: 'Node.js', value: `\`${process.version}\``, inline: true },
                                    { name: 'Uptime', value: `<t:${Math.floor(Date.now() / 1000 - client.uptime / 1000)}:R>`, inline: true }
                                )
                                .setFooter({ text: 'VaniDEV Performance Monitoring' })
                                .setTimestamp();
                            return await interaction.reply({ embeds: [statusEmbed] });

                        case 'help':
                            const guildCmds = customCommands.filter(c => c.guildId === interaction.guildId);
                            const globalCmds = customCommands.filter(c => !c.guildId);

                            const helpEmbed = new EmbedBuilder()
                                .setTitle('📖 Befehlsübersicht')
                                .setDescription('Hier findest du alle verfügbaren Befehle für diesen Server.')
                                .setColor('#6366f1')
                                .addFields(
                                    { name: '🛠️ Basis-System', value: STANDARD_COMMANDS.map(sc => `\`/${sc.name}\``).join(', ') },
                                    { name: '🌍 Global Custom', value: globalCmds.length ? globalCmds.map(c => `\`/${c.name}\``).join(', ') : '_Keine_' },
                                    { name: '🏰 Server-Spezifisch', value: guildCmds.length ? guildCmds.map(c => `\`/${c.name}\``).join(', ') : '_Keine_' }
                                )
                                .setFooter({ text: 'Nutze die Slash-Commands für mehr Infos' })
                                .setTimestamp();
                            return await interaction.reply({ embeds: [helpEmbed] });

                        case 'kick':
                            if (!hasPermission(interaction.member, interaction.guildId, 'mod')) return interaction.reply({ content: '❌ Du hast keine Berechtigung diesen Befehl zu nutzen.', ephemeral: true });
                            const kickTarget = interaction.options.getMember('nutzer');
                            const kickReason = interaction.options.getString('grund') || 'Kein Grund angegeben';
                            if (!kickTarget.kickable) return interaction.reply({ content: '❌ Ich kann diesen Nutzer nicht kicken.', ephemeral: true });
                            await kickTarget.kick(kickReason);
                            addActionLog('moderation', `Gekickt: ${kickTarget.user.tag} (Grund: ${kickReason})`);
                            return interaction.reply({ content: `✅ **${kickTarget.user.tag}** wurde erfolgreich gekickt.\n**Grund:** ${kickReason}` });

                        case 'ban':
                            if (!hasPermission(interaction.member, interaction.guildId, 'admin')) return interaction.reply({ content: '❌ Du hast keine Berechtigung diesen Befehl zu nutzen.', ephemeral: true });
                            const banTarget = interaction.options.getMember('nutzer');
                            const banReason = interaction.options.getString('grund') || 'Kein Grund angegeben';
                            if (!banTarget.bannable) return interaction.reply({ content: '❌ Ich kann diesen Nutzer nicht bannen.', ephemeral: true });
                            await banTarget.ban({ reason: banReason });
                            addActionLog('moderation', `Gebannt: ${banTarget.user.tag} (Grund: ${banReason})`);
                            return interaction.reply({ content: `✅ **${banTarget.user.tag}** wurde permanent gebannt.\n**Grund:** ${banReason}` });

                        case 'timeout':
                            if (!hasPermission(interaction.member, interaction.guildId, 'mod')) return interaction.reply({ content: '❌ Du hast keine Berechtigung diesen Befehl zu nutzen.', ephemeral: true });
                            const toTarget = interaction.options.getMember('nutzer');
                            const toDauer = interaction.options.getInteger('dauer');
                            const toReason = interaction.options.getString('grund') || 'Kein Grund angegeben';
                            if (!toTarget.moderatable) return interaction.reply({ content: '❌ Ich kann diesen Nutzer nicht stummschalten.', ephemeral: true });
                            await toTarget.timeout(toDauer * 60 * 1000, toReason);
                            addActionLog('moderation', `Timeout: ${toTarget.user.tag} für ${toDauer}m (Grund: ${toReason})`);
                            return interaction.reply({ content: `✅ **${toTarget.user.tag}** ist nun für **${toDauer} Minuten** im Timeout.\n**Grund:** ${toReason}` });

                        case 'addrole':
                            if (!hasPermission(interaction.member, interaction.guildId, 'admin')) return interaction.reply({ content: '❌ Du hast keine Berechtigung diesen Befehl zu nutzen.', ephemeral: true });
                            const arTarget = interaction.options.getMember('nutzer');
                            const arRole = interaction.options.getRole('rolle');
                            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return interaction.reply({ content: '❌ Mir fehlt die Berechtigung Rollen zu verwalten.', ephemeral: true });
                            await arTarget.roles.add(arRole);
                            addActionLog('moderation', `Rolle hinzugefügt: ${arRole.name} zu ${arTarget.user.tag}`);
                            return interaction.reply({ content: `✅ Rolle **${arRole.name}** wurde **${arTarget.user.tag}** zugewiesen.` });

                        case 'removerole':
                            if (!hasPermission(interaction.member, interaction.guildId, 'admin')) return interaction.reply({ content: '❌ Du hast keine Berechtigung diesen Befehl zu nutzen.', ephemeral: true });
                            const rrTarget = interaction.options.getMember('nutzer');
                            const rrRole = interaction.options.getRole('rolle');
                            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return interaction.reply({ content: '❌ Mir fehlt die Berechtigung Rollen zu verwalten.', ephemeral: true });
                            await rrTarget.roles.remove(rrRole);
                            addActionLog('moderation', `Rolle entfernt: ${rrRole.name} von ${rrTarget.user.tag}`);
                            return interaction.reply({ content: `✅ Rolle **${rrRole.name}** wurde von **${rrTarget.user.tag}** entfernt.` });
                    }
                } catch (err) {
                    console.error('[BOT] Standard Command Error:', err);
                    return interaction.reply({ content: `❌ Fehler: ${err.message}`, ephemeral: true });
                }
            }

            // 2. Handle Custom Commands
            const command = customCommands.find(c => c.name === interaction.commandName && c.guildId === interaction.guildId)
                || customCommands.find(c => c.name === interaction.commandName && !c.guildId);

            if (command) {
                // Role Permission Check
                if (command.requiredRoleId && interaction.guild) {
                    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
                    if (!member || !member.roles.cache.has(command.requiredRoleId)) {
                        return interaction.reply({
                            content: `❌ You do not have the required role to use this command.`,
                            ephemeral: true
                        });
                    }
                }

                try {
                    // Try to parse as JSON for rich responses (embeds/components)
                    let response;
                    try {
                        response = JSON.parse(command.content);
                    } catch {
                        response = command.content;
                    }

                    await interaction.reply(response);
                } catch (err) {
                    console.error(`[BOT] Error executing command /${interaction.commandName}:`, err.message);
                    // Fallback to error message if JSON is invalid for Discord format
                    if (!interaction.replied) {
                        await interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
                    }
                }
            } else {
                await interaction.reply({ content: 'Unknown command.', ephemeral: true });
            }
        });

        client.on(Events.MessageCreate, (msg) => {
            if (msg.author.bot) return;
            // Capture DMs
            if (!msg.guild) {
                console.log(`[BOT] DM from ${msg.author.tag}: ${msg.content}`);
                const attachmentUrls = msg.attachments.map(a => a.url);
                let finalContent = msg.content;
                if (attachmentUrls.length > 0) {
                    finalContent += (finalContent ? '\n' : '') + attachmentUrls.join('\n');
                }

                messageLog.unshift({
                    id: msg.id,
                    author: {
                        id: msg.author.id,
                        tag: msg.author.tag,
                        username: msg.author.username,
                        avatar: getAvatar(msg.author)
                    },
                    content: finalContent,
                    attachments: attachmentUrls,
                    timestamp: msg.createdAt
                });
                if (messageLog.length > MAX_LOG_SIZE) messageLog.pop();
                saveData(MESSAGES_FILE, messageLog); // Persist to file
                botEvents.emit('update', { type: 'messages' });
            }
        });

        client.on(Events.Error, (err) => {
            console.error('[BOT] Client Error:', err);
        });

        client.on(Events.Warn, (info) => {
            console.log('[BOT] Warning:', info);
        });

        client.on(Events.ShardDisconnect, (event) => {
            console.log('[BOT] Disconnected from Discord Gateway.');
            addActionLog('system', 'Disconnected from Discord', 'error');
        });

        client.on(Events.GuildCreate, (guild) => {
            addActionLog('system', `Joined new server: ${guild.name}`);
            botEvents.emit('update', { type: 'guilds' });
        });

        client.on(Events.GuildDelete, (guild) => {
            addActionLog('system', `Removed from server: ${guild.name}`);
            botEvents.emit('update', { type: 'guilds' });
        });

        client.on(Events.GuildMemberAdd, (member) => {
            addActionLog('moderation', `New member joined ${member.guild.name}: ${member.user.tag}`);
            botEvents.emit('update', { type: 'members', guildId: member.guild.id });
        });

        client.on(Events.GuildMemberRemove, (member) => {
            addActionLog('moderation', `Member left ${member.guild.name}: ${member.user.tag}`);
            botEvents.emit('update', { type: 'members', guildId: member.guild.id });
        });
    }
    return client;
};

const bot = {
    getClient: () => initClient(),
    start: async () => {
        console.log('[BOT] Start requested...');
        const c = initClient();
        const status = c.ws.status;
        console.log(`[BOT] Current WS status: ${status} (${bot.getStatus()})`);

        // If not READY (0) and not already CONNECTING (1), we attempt login
        if (status !== 0 && status !== 1) {
            console.log('[BOT] Not Ready. Logging in...');
            try {
                await c.login(process.env.DISCORD_TOKEN);
                console.log('[BOT] Login sequence initiated successfully.');
            } catch (error) {
                console.error('[BOT] Login failed:', error.message);
                addActionLog('system', `Login failed: ${error.message}`, 'error');
                throw error;
            }
        } else if (status === 1) {
            console.log('[BOT] Bot is already in CONNECTING state. Please wait.');
        } else {
            console.log('[BOT] Bot is already READY (Online).');
        }
        return c;
    },
    stop: async () => {
        console.log('[BOT] Stop requested...');
        if (client) {
            client.destroy();
            client = null; // Clear local reference
            console.log('[BOT] Client destroyed and reference cleared.');
            addActionLog('system', 'Bot stopped');
        } else {
            console.log('[BOT] Stop requested but no client instance exists.');
        }
    },
    restart: async () => {
        console.log('[BOT] Restart sequence started...');
        await bot.stop();
        // Wait a bit longer for cleanup
        await new Promise(r => setTimeout(r, 2000));
        await bot.start();
        console.log('[BOT] Restart sequence finished.');
    },
    getStatus: () => {
        if (statusConfig.mode !== 'auto') {
            return statusConfig.mode.toUpperCase();
        }
        if (!client) return 'OFFLINE';
        const statusMap = {
            0: 'READY',
            1: 'CONNECTING',
            2: 'RECONNECTING',
            3: 'IDLE',
            4: 'NEARLY',
            5: 'DISCONNECTED'
        };
        return statusMap[client.ws.status] || 'UNKNOWN';
    },
    getShardDetails: () => {
        if (!client || !client.ws.shards.size) return { status: 'OFFLINE', ping: 0 };
        const shard = client.ws.shards.first();
        if (!shard) return { status: 'OFFLINE', ping: 0 };
        return {
            status: shard.status === 0 ? 'READY' : 'ISSUES',
            ping: shard.ping,
            id: shard.id
        };
    },
    getApiPing: () => client ? client.ws.ping : 0,
    getStatusConfig: () => statusConfig,
    setSystemStatus: (mode, message = '') => {
        statusConfig = { mode, message };
        saveData(STATUS_CONFIG_FILE, statusConfig);
        botEvents.emit('update', { type: 'status_override' });
    },
    getGuilds: () => {
        if (!client || client.ws.status !== 0) return [];
        return client.guilds.cache.map(g => ({
            id: g.id,
            name: g.name,
            icon: bot.getIcon(g),
            memberCount: g.memberCount,
            roles: g.roles.cache
                .filter(r => r.name !== '@everyone' && !r.managed)
                .map(r => ({ id: r.id, name: r.name, color: r.hexColor }))
                .sort((a, b) => b.position - a.position)
        }));
    },
    getWaitlist: () => waitlist,
    addWaitlistEntry: (entry) => {
        const newEntry = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...entry
        };
        waitlist.push(newEntry);
        saveData(WAITLIST_FILE, waitlist);
        botEvents.emit('update', { type: 'waitlist_update', entry: newEntry });
        return newEntry;
    },
    removeWaitlistEntry: (id) => {
        waitlist = waitlist.filter(e => e.id !== id);
        saveData(WAITLIST_FILE, waitlist);
        botEvents.emit('update', { type: 'waitlist_update' });
    },
    updateIdentity: async ({ username, avatarUrl, syncNicknames }) => {
        if (!client || client.ws.status !== 0) throw new Error('Bot is not online');

        const results = [];

        // 1. Update Username
        if (username && username !== client.user.username) {
            console.log(`[BOT] Updating username to: ${username}`);
            try {
                await client.user.setUsername(username);
                results.push('Username updated');
            } catch (err) {
                console.error(`[BOT] Username update failed: ${err.message}`);
                if (err.message.includes('rate limited')) {
                    addActionLog('identity', `Username update failed: Rate limited`, 'error');
                    throw new Error('Discord rate limit for name changes reached (max 2/hour).');
                }
                addActionLog('identity', `Username update failed: ${err.message}`, 'error');
                throw err;
            }
        }

        // 2. Update Avatar
        if (avatarUrl) {
            console.log(`[BOT] Updating avatar URL: ${avatarUrl}`);
            try {
                await client.user.setAvatar(avatarUrl);
                results.push('Avatar updated');
                addActionLog('identity', 'Bot avatar updated');
            } catch (err) {
                console.error(`[BOT] Avatar update failed: ${err.message}`);
                addActionLog('identity', `Avatar update failed: ${err.message}`, 'error');
                throw new Error(`Avatar update failed: ${err.message}. Ensure the URL is a direct image link.`);
            }
        }

        // 3. Sync Nicknames (Remove them to show global name)
        if (syncNicknames) {
            console.log(`[BOT] Syncing nicknames across ${client.guilds.cache.size} guilds...`);
            let successCount = 0;
            let failCount = 0;

            for (const [id, guild] of client.guilds.cache) {
                try {
                    const me = await guild.members.fetchMe();
                    if (me.nickname) {
                        await me.setNickname(null);
                        successCount++;
                    }
                } catch (err) {
                    failCount++;
                }
            }
            results.push(`Nickname reset: ${successCount} servers updated, ${failCount} skipped.`);
            addActionLog('identity', `Global name sync: ${successCount} servers updated`);
        }

        return results.join('. ') || 'No changes requested.';
    },
    refreshCommands: async () => {
        if (!client || !process.env.DISCORD_TOKEN) return;

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        // Group commands by guildId (null/undefined = global)
        const globalCommands = [
            ...STANDARD_COMMANDS,
            ...customCommands.filter(c => !c.guildId).map(c => ({
                name: c.name.toLowerCase(),
                description: c.description || 'Benutzerdefinierter Befehl'
            }))
        ];

        const guildGroups = {};
        customCommands.filter(c => c.guildId).forEach(c => {
            if (!guildGroups[c.guildId]) guildGroups[c.guildId] = [];
            guildGroups[c.guildId].push({
                name: c.name.toLowerCase(),
                description: c.description || 'Custom command'
            });
        });

        try {
            // Register Global Commands
            console.log(`[BOT] Registering ${globalCommands.length} global commands...`);
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: globalCommands },
            );

            // Register Guild-specific Commands
            for (const [guildId, commands] of Object.entries(guildGroups)) {
                console.log(`[BOT] Registering ${commands.length} commands for guild ${guildId}...`);
                await rest.put(
                    Routes.applicationGuildCommands(client.user.id, guildId),
                    { body: commands },
                ).catch(err => console.error(`[BOT] Failed to register commands for guild ${guildId}:`, err.message));
            }

            console.log('[BOT] Command registration complete.');
            addActionLog('system', `Registered commands (${globalCommands.length} global, ${Object.keys(guildGroups).length} guilds)`);
        } catch (error) {
            console.error('[BOT] Command registration failed:', error);
            addActionLog('system', `Command registration failed: ${error.message}`, 'error');
            throw error;
        }
    },
    getCommands: () => [
        ...STANDARD_COMMANDS.map(sc => ({
            name: sc.name,
            description: sc.description,
            content: '_System Command_',
            isStandard: true,
            guildId: null
        })),
        ...customCommands
    ],
    addCommand: async (cmd) => {
        // Validation: lowercase only, no spaces
        const name = cmd.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
        if (!name) throw new Error('Invalid command name');

        // Prevent overriding standard commands
        if (STANDARD_COMMANDS.some(sc => sc.name === name)) {
            throw new Error(`Command /${name} is a protected system command.`);
        }

        // Find if command exists FOR THIS GUILD (or global)
        const existingIndex = customCommands.findIndex(c => c.name === name && c.guildId === (cmd.guildId || null));
        const newCmd = {
            name,
            description: cmd.description,
            content: cmd.content,
            guildId: cmd.guildId || null,
            requiredRoleId: cmd.requiredRoleId || null
        };

        if (existingIndex > -1) {
            customCommands[existingIndex] = newCmd;
        } else {
            customCommands.push(newCmd);
        }
        saveData(COMMANDS_FILE, customCommands);
        await bot.refreshCommands();
        botEvents.emit('update', { type: 'commands' });
        return name;
    },
    removeCommand: async (name, guildId = null) => {
        if (STANDARD_COMMANDS.some(sc => sc.name === name)) {
            throw new Error(`Command /${name} is a protected system command.`);
        }
        customCommands = customCommands.filter(c => !(c.name === name && c.guildId === (guildId || null)));
        saveData(COMMANDS_FILE, customCommands);
        await bot.refreshCommands();
        botEvents.emit('update', { type: 'commands' });
    },
    updatePresence: async ({ activityName, activityType, status }) => {
        if (!client || client.ws.status !== 0) throw new Error('Bot is not online');
        await client.user.setPresence({
            activities: [{
                name: activityName,
                type: parseInt(activityType)
            }],
            status: status
        });
        addActionLog('system', `Status updated: ${status} | ${activityName}`);
        return true;
    },
    leaveGuild: async (guildId) => {
        if (!client || client.ws.status !== 0) throw new Error('Bot is not online');
        const guild = await client.guilds.fetch(guildId);
        if (!guild) throw new Error('Guild not found');
        console.log(`[BOT] Leaving guild: ${guild.name} (${guildId})`);
        await guild.leave();
        addActionLog('system', `Left guild: ${guild.name}`);
        return `Left ${guild.name}`;
    },
    getGuildMembers: async (guildId) => {
        if (!client || client.ws.status !== 0) throw new Error('Bot is not online');
        const guild = await client.guilds.fetch(guildId);
        if (!guild) throw new Error('Guild not found');

        // Fetch all members. Requires privileged intent.
        const members = await guild.members.fetch();
        return members.map(m => ({
            id: m.user.id,
            username: m.user.username,
            displayName: m.displayName,
            avatar: getAvatar(m.user),
            tag: m.user.tag,
            joinedAt: m.joinedAt,
            roles: m.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
            isModeratable: m.moderatable,
            isKickable: m.kickable,
            isBannable: m.bannable
        }));
    },
    moderateMember: async (guildId, userId, action, options = {}) => {
        if (!client || client.ws.status !== 0) throw new Error('Bot is not online');
        const guild = await client.guilds.fetch(guildId);
        if (!guild) throw new Error('Guild not found');
        const member = await guild.members.fetch(userId);
        if (!member) throw new Error('Member not found');

        switch (action) {
            case 'kick':
                await member.kick(options.reason || 'Kicked via Dashboard');
                addActionLog('moderation', `Kicked ${member.user.tag} from ${guild.name}`);
                return `Kicked ${member.user.tag}`;
            case 'ban':
                await member.ban({ reason: options.reason || 'Banned via Dashboard', deleteMessageSeconds: 60 * 60 * 24 });
                addActionLog('moderation', `Banned ${member.user.tag} from ${guild.name}`);
                return `Banned ${member.user.tag}`;
            case 'timeout':
                const duration = parseInt(options.duration) || 60; // seconds
                await member.timeout(duration * 1000, options.reason || 'Timed out via Dashboard');
                addActionLog('moderation', `Timed out ${member.user.tag} in ${guild.name} for ${duration}s`);
                return `Timed out ${member.user.tag} for ${duration}s`;
            case 'dm':
                if (!options.message) throw new Error('No DM message provided');
                await member.send(options.message);
                addActionLog('moderation', `Sent DM to ${member.user.tag}`);
                return `Sent DM to ${member.user.tag}`;
            default:
                throw new Error('Invalid moderation action');
        }
    },
    getGuildConfig: (guildId) => {
        return guildConfigs[guildId] || { roles: { owner: [], admin: [], mod: [] } };
    },
    updateGuildConfig: async (guildId, config) => {
        guildConfigs[guildId] = {
            roles: {
                owner: Array.isArray(config.roles?.owner) ? config.roles.owner : [],
                admin: Array.isArray(config.roles?.admin) ? config.roles.admin : [],
                mod: Array.isArray(config.roles?.mod) ? config.roles.mod : []
            }
        };
        saveGuildConfigs();
        botEvents.emit('update', { type: 'guild_config', guildId });
        return true;
    },
    getMessages: () => messageLog,
    clearMessages: () => {
        messageLog = [];
        saveData(MESSAGES_FILE, messageLog);
        botEvents.emit('update', { type: 'messages' });
    },
    getBotLogs: () => botLogs,
    clearLogs: () => {
        botLogs = [];
        saveData(LOGS_FILE, botLogs);
        botEvents.emit('update', { type: 'logs' });
    },
    events: botEvents,
    getAvatar,
    getIcon
};

if (!global._discordBot) {
    global._discordBot = bot;
    console.log('[BOT] Global bot singleton established.');
    if (process.env.DISCORD_TOKEN && process.env.DISCORD_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
        console.log('[BOT] Auto-starting enabled...');
        bot.start().catch(err => console.error('[BOT] Auto-start failed:', err.message));
    } else {
        console.warn('[BOT] DISCORD_TOKEN is missing or placeholder. Waiting for user input.');
    }
} else {
    // Update existing singleton with new methods for hot-reloading
    Object.assign(global._discordBot, bot);
}

module.exports = global._discordBot;


