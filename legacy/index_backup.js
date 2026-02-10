require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events } = require('discord.js');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

// Initialize Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Landing Page Route
app.get('/', (req, res) => {
    res.render('index');
});

// Dashboard Route
app.get('/dashboard', (req, res) => {
    res.render('dashboard', {
        user: client.user,
        activities: [
            { name: 'Playing', value: ActivityType.Playing },
            { name: 'Streaming', value: ActivityType.Streaming },
            { name: 'Listening', value: ActivityType.Listening },
            { name: 'Watching', value: ActivityType.Watching },
            { name: 'Competing', value: ActivityType.Competing }
        ]
    });
});

// Update Activity Route
app.post('/activity', async (req, res) => {
    const { activityType, activityName, status } = req.body;

    if (!client.user) {
        return res.send('Bot is not online yet.');
    }

    try {
        await client.user.setPresence({
            activities: [{
                name: activityName,
                type: parseInt(activityType)
            }],
            status: status
        });
        res.redirect('/dashboard');
    } catch (error) {
        console.error(error);
        res.send('Error updating activity: ' + error.message);
    }
});

// Start Express Server
app.listen(PORT, () => {
    console.log(`Dashboard running on http://localhost:${PORT}`);
});

// Start Discord Bot
client.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.login(process.env.TOKEN);
