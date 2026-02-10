"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Save, Bot, RefreshCcw, Activity, Users, LogOut, ShieldAlert, Shield, MessageSquare, Ban, UserMinus, Clock, Mail, ScrollText, Terminal, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
    const [botStatus, setBotStatus] = useState(null);
    const [selectedGuild, setSelectedGuild] = useState(null);
    const [messages, setMessages] = useState([]);
    const [commands, setCommands] = useState([]);
    const [newCommand, setNewCommand] = useState({ name: '', description: '', content: '', guildId: '', requiredRoleId: '' });
    const [members, setMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [loadingCommands, setLoadingCommands] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState('status'); // status, messages, logs, commands, waitlist
    const [waitlist, setWaitlist] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const [form, setForm] = useState({
        activityType: '0',
        activityName: '',
        status: 'online'
    });
    const [identityForm, setIdentityForm] = useState({
        username: '',
        avatarUrl: '',
        syncNicknames: false
    });
    const [modForm, setModForm] = useState({
        userId: '',
        action: 'kick',
        reason: '',
        duration: '60',
        message: ''
    });
    const [statusOverrideForm, setStatusOverrideForm] = useState({
        mode: 'auto',
        message: ''
    });
    const [guildConfig, setGuildConfig] = useState({ roles: { owner: [], admin: [], mod: [] } });
    const [configForm, setConfigForm] = useState({ owner: '', admin: '', mod: '' });

    const isJson = (str) => {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    };

    const fetchCommands = () => {
        setLoadingCommands(true);
        fetch('/api/bot/commands')
            .then(res => res.json())
            .then(data => setCommands(data.commands || []))
            .catch(err => console.error("Fetch commands failed:", err))
            .finally(() => setLoadingCommands(false));
    };

    const fetchGuildConfig = (guildId) => {
        setLoading(true);
        fetch(`/api/bot/config?guildId=${guildId}`)
            .then(res => res.json())
            .then(data => {
                setGuildConfig(data);
                setConfigForm({
                    owner: (data.roles?.owner || []).join(', '),
                    admin: (data.roles?.admin || []).join(', '),
                    mod: (data.roles?.mod || []).join(', ')
                });
            })
            .catch(err => console.error("Fetch config failed:", err))
            .finally(() => setLoading(false));
    };

    const handleAddCommand = (e) => {
        e.preventDefault();
        setLoading(true);
        fetch('/api/bot/commands', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'add',
                ...newCommand,
                name: newCommand.name.trim().toLowerCase()
            })
        })
            .then(res => res.json())
            .then(data => {
                setLoading(false);
                if (data.success) {
                    setMessage(data.message);
                    setNewCommand({ name: '', description: '', content: '', guildId: '', requiredRoleId: '' });
                    setIsEditing(false);
                    fetchCommands();
                    setTimeout(() => setMessage(''), 3000);
                } else {
                    setMessage('Error: ' + data.error);
                }
            });
    };

    const handleDeleteCommand = (name, guildId) => {
        if (!confirm(`Delete ${name}?`)) return;
        fetch('/api/bot/commands', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', name, guildId })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setMessage(data.message);
                    fetchCommands();
                    setTimeout(() => setMessage(''), 3000);
                }
            });
    };

    const fetchLogs = () => {
        fetch('/api/bot/logs')
            .then(async res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                setBotStatus(prev => ({ ...prev, botLogs: data.logs || [] }));
            })
            .catch(err => console.error("Fetch logs failed:", err));
    };

    const fetchWaitlist = async () => {
        try {
            const res = await fetch('/api/bot/waitlist');
            const data = await res.json();
            setWaitlist(data);
        } catch (err) {
            console.error('Failed to fetch waitlist:', err);
        }
    };

    const handleDeleteWaitlist = async (id) => {
        if (!confirm('Entry löschen?')) return;
        try {
            const res = await fetch('/api/bot/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id })
            });
            if (res.ok) {
                setMessage('Eintrag gelöscht');
                fetchWaitlist();
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) {
            console.error('Delete waitlist error:', err);
        }
    };

    const fetchStatus = () => {
        fetch('/api/bot/status')
            .then(async res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (data.statusConfig) setStatusOverrideForm(data.statusConfig);
                setBotStatus(data);
                if (data.messages) setMessages(data.messages);
                if (data.user && !identityForm.username) setIdentityForm(prev => ({ ...prev, username: data.user.username }));
                if (data.presence?.activity && !form.activityName) {
                    setForm(prev => ({
                        ...prev,
                        activityType: data.presence.activity.type.toString(),
                        activityName: data.presence.activity.name,
                        status: data.presence.status
                    }));
                }
            })
            .catch(err => {
                console.error("Fetch failed:", err);
                setMessage('API Error: ' + err.message);
            });
    };

    const fetchMembers = async (guildId) => {
        setLoadingMembers(true);
        try {
            const res = await fetch(`/api/bot/status?guildId=${guildId}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.members) setMembers(data.members);
        } catch (err) {
            console.error("Failed to fetch members:", err);
        } finally {
            setLoadingMembers(false);
        }
    };

    const handleStatusOverride = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/bot/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'setSystemStatus',
                    statusMode: statusOverrideForm.mode,
                    statusMessage: statusOverrideForm.message
                })
            });
            const data = await res.json();
            if (data.success) {
                setMessage('Systemstatus aktualisiert');
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) {
            setMessage(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action, extra = {}) => {
        setLoading(true);
        try {
            const res = await fetch('/api/bot/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...extra })
            });
            const data = await res.json();
            if (data.success) {
                setMessage(data.message);
                if (action === 'leaveGuild') setSelectedGuild(null);
                setTimeout(fetchStatus, 2000);
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) {
            setMessage('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleModeration = async (userId, modAction, customMsg) => {
        setLoading(true);
        try {
            const payload = {
                action: 'moderateMember',
                guildId: selectedGuild?.id || 'dm',
                userId,
                modAction,
                modOptions: {
                    reason: modForm.reason,
                    duration: modForm.duration,
                    message: customMsg || modForm.message
                }
            };
            const res = await fetch('/api/bot/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                setMessage(data.message);
                if (selectedGuild) fetchMembers(selectedGuild.id);
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) {
            setMessage('Network error');
        } finally {
            setLoading(false);
        }
    };

    const getActivityTypeLabel = (type) => {
        const labels = ['Playing', 'Streaming', 'Listening', 'Watching', '', 'Competing'];
        return labels[type] || 'Activity';
    };

    const handleIdentitySubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/bot/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'updateIdentity', ...identityForm })
            });
            const data = await res.json();
            if (data.success) {
                setMessage('Identität gespeichert');
                fetchStatus();
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) {
            setMessage('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleConfigSubmit = async (e) => {
        e.preventDefault();
        if (!selectedGuild) return;
        setLoading(true);
        try {
            const config = {
                roles: {
                    owner: configForm.owner.split(',').map(s => s.trim()).filter(s => s),
                    admin: configForm.admin.split(',').map(s => s.trim()).filter(s => s),
                    mod: configForm.mod.split(',').map(s => s.trim()).filter(s => s)
                }
            };
            const res = await fetch('/api/bot/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guildId: selectedGuild.id, config })
            });
            const data = await res.json();
            if (data.success) {
                setMessage('Berechtigungen gespeichert');
                fetchGuildConfig(selectedGuild.id);
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) {
            setMessage('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/bot/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (data.success) {
                setMessage('Status aktualisiert');
                fetchStatus();
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) {
            setMessage('Network error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        fetchLogs();
        fetchCommands();
        fetchWaitlist();
        const interval = setInterval(() => {
            fetchStatus();
            fetchLogs();
            fetchWaitlist();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen mesh-gradient text-white p-6 md:p-12">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-12">
                    <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Back to Home
                    </Link>
                    <div className="flex items-center gap-3 font-black text-2xl tracking-tighter group cursor-default">
                        <div className="w-10 h-10 rounded-xl glass border border-white/10 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                            <span className="text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40">V</span>
                        </div>
                        Vani<span className="text-indigo-400">DEV</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="glass-card p-8 rounded-3xl text-center">
                            {botStatus?.user ? (
                                <>
                                    <div className="relative inline-block mb-4">
                                        <div className="w-24 h-24 rounded-full border-4 border-white/5 shadow-2xl overflow-hidden bg-zinc-800">
                                            <img src={botStatus.user.avatar} className="w-full h-full object-cover" alt="Avatar" />
                                        </div>
                                        <div className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-zinc-900 ${botStatus.presence?.status === 'online' ? 'bg-green-500' : 'bg-zinc-500'}`}></div>
                                    </div>
                                    <h2 className="text-xl font-bold truncate">{botStatus.user.username}</h2>
                                    <p className="text-gray-400 text-[10px] mb-4">@{botStatus.user.tag}</p>
                                    <div className="flex items-center justify-center gap-2 text-indigo-400 font-bold text-[10px] bg-indigo-500/10 py-1.5 px-3 rounded-full border border-indigo-500/20">
                                        <Activity size={12} /> {botStatus.presence?.activity ? `${getActivityTypeLabel(botStatus.presence.activity.type)} ${botStatus.presence.activity.name}` : 'No Activity'}
                                    </div>
                                </>
                            ) : (
                                <div className="py-10 text-gray-400 italic font-medium">Connecting...</div>
                            )}

                            <div className="grid grid-cols-2 gap-2 mt-6 mb-2">
                                <button onClick={() => handleAction('start')} disabled={loading || botStatus?.wsStatus === 'READY'} className="py-3 rounded-2xl glass hover:bg-green-500/20 text-xs font-bold text-green-400 disabled:opacity-30 transition-all">Start</button>
                                <button onClick={() => handleAction('stop')} disabled={loading || botStatus?.wsStatus !== 'READY'} className="py-3 rounded-2xl glass hover:bg-red-500/20 text-xs font-bold text-red-400 disabled:opacity-30 transition-all">Stop</button>
                            </div>
                            <button onClick={() => handleAction('restart')} disabled={loading} className="w-full py-3 rounded-2xl glass hover:bg-white/5 text-sm font-bold flex items-center justify-center gap-2">
                                <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} /> Restart
                            </button>
                        </div>

                        <div className="glass-card p-2 rounded-3xl border border-white/5 grid grid-cols-1 gap-1">
                            <button onClick={() => { setActiveTab('status'); setSelectedGuild(null); }} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all font-bold ${activeTab === 'status' && !selectedGuild ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-400 hover:bg-white/5'}`}>
                                <Bot size={20} /> System Config
                            </button>
                            <button onClick={() => { setActiveTab('messages'); setSelectedGuild(null); }} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all font-bold ${activeTab === 'messages' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-400 hover:bg-white/5'}`}>
                                <Mail size={20} /> Messages Log
                                {messages.length > 0 && <span className="ml-auto bg-white/20 px-2 py-0.5 rounded-full text-[10px]">{messages.length}</span>}
                            </button>
                            <button onClick={() => { setActiveTab('logs'); setSelectedGuild(null); }} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all font-bold ${activeTab === 'logs' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-400 hover:bg-white/5'}`}>
                                <ScrollText size={20} /> Bot Logs
                            </button>
                            <button onClick={() => { setActiveTab('commands'); setSelectedGuild(null); }} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all font-bold ${activeTab === 'commands' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-400 hover:bg-white/5'}`}>
                                <Terminal size={20} /> Commands
                            </button>
                            <button onClick={() => { setActiveTab('waitlist'); setSelectedGuild(null); }} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all font-bold ${activeTab === 'waitlist' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-400 hover:bg-white/5'}`}>
                                <Users size={20} /> Waitlist
                            </button>
                        </div>

                        <div className="glass-card p-6 rounded-3xl border border-white/5">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Active Servers ({botStatus?.guilds?.length || 0})</h3>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {botStatus?.guilds?.map(guild => (
                                    <button
                                        key={guild.id}
                                        onClick={() => { setActiveTab('guild'); setSelectedGuild(guild); fetchMembers(guild.id); }}
                                        className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${selectedGuild?.id === guild.id ? 'bg-indigo-500/20 border border-indigo-500/30' : 'hover:bg-white/5 border border-transparent'}`}
                                    >
                                        <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center font-bold text-[10px]">
                                            {guild.icon ? <img src={guild.icon} className="w-full h-full object-cover" alt="G" /> : guild.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0 text-left">
                                            <div className="text-xs font-bold truncate">{guild.name}</div>
                                            <div className="text-[9px] text-gray-500">{guild.memberCount} Members</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-8">
                        <AnimatePresence mode="wait">
                            {activeTab === 'waitlist' ? (
                                <motion.div key="waitlist" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-3xl font-black tracking-tight">Waitlist <span className="text-indigo-400">Management</span></h2>
                                        <div className="px-4 py-2 rounded-xl glass border border-white/5 text-xs font-bold text-gray-500">{waitlist.length} Entries</div>
                                    </div>
                                    <div className="glass-card rounded-[2rem] border border-white/5 overflow-hidden overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-white/2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                    <th className="px-8 py-5">Nutzer</th>
                                                    <th className="px-8 py-5">E-Mail</th>
                                                    <th className="px-8 py-5">Grund / Invite</th>
                                                    <th className="px-8 py-5">Datum</th>
                                                    <th className="px-8 py-5 text-right">Aktion</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5 text-sm">
                                                {waitlist.map(entry => (
                                                    <tr key={entry.id} className="hover:bg-white/2 transition-colors">
                                                        <td className="px-8 py-5 font-bold">{entry.name}</td>
                                                        <td className="px-8 py-5 text-gray-400">{entry.email}</td>
                                                        <td className="px-8 py-5">
                                                            <div className="text-gray-300 mb-1 truncate max-w-[200px]">{entry.reason}</div>
                                                            {entry.invite && <div className="text-[10px] text-indigo-400 font-bold uppercase">{entry.invite}</div>}
                                                        </td>
                                                        <td className="px-8 py-5 text-gray-500 text-xs">{new Date(entry.timestamp).toLocaleDateString()}</td>
                                                        <td className="px-8 py-5 text-right">
                                                            <button onClick={() => handleDeleteWaitlist(entry.id)} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {waitlist.length === 0 && <tr><td colSpan="5" className="px-8 py-20 text-center text-gray-500 italic">No submissions yet.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.div>
                            ) : activeTab === 'logs' ? (
                                <motion.div key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-card p-8 rounded-4xl border border-white/5 min-h-[600px]">
                                    <div className="flex justify-between items-center mb-8">
                                        <h1 className="text-3xl font-black flex items-center gap-3"><ScrollText size={24} className="text-purple-500" /> Bot Logs</h1>
                                        <button onClick={() => handleAction('clearLogs')} className="px-4 py-2 rounded-xl glass hover:bg-red-500/20 text-red-400 text-xs font-bold transition-all">Clear All</button>
                                    </div>
                                    <div className="space-y-3 max-h-[700px] overflow-y-auto pr-4 custom-scrollbar">
                                        {botStatus?.botLogs?.map(log => (
                                            <div key={log.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
                                                <div className={`w-1.5 h-10 rounded-full ${log.status === 'error' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]'}`}></div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{log.type}</span>
                                                        <span className="text-[10px] text-gray-500 font-bold">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-200 font-medium">{log.message}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            ) : activeTab === 'messages' ? (
                                <motion.div key="messages" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-card p-8 rounded-4xl border border-white/5 min-h-[600px]">
                                    <h1 className="text-4xl font-black mb-8 flex items-center gap-4"><Mail size={32} className="text-indigo-400" /> Message Logs</h1>
                                    <div className="space-y-4 max-h-[700px] overflow-y-auto pr-4 custom-scrollbar">
                                        {messages.map(msg => (
                                            <div key={msg.id} className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-zinc-800">
                                                            <img src={msg.author.avatar} className="w-full h-full object-cover" alt="A" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold">{msg.author.username} <span className="text-[10px] text-gray-500 font-medium">@{msg.author.tag}</span></div>
                                                            <div className="text-[10px] text-indigo-400 font-bold">{new Date(msg.timestamp).toLocaleString()}</div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => { const rep = prompt('Reply:'); if (rep) handleModeration(msg.author.id, 'dm', rep); }} className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/20"><MessageSquare size={16} /></button>
                                                </div>
                                                <div className="text-gray-300 text-sm leading-relaxed p-4 bg-black/20 rounded-2xl border border-white/5 mb-3 whitespace-pre-wrap break-all">{msg.content}</div>
                                                {msg.attachments?.map((url, i) => <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex px-3 py-2 rounded-xl bg-zinc-800 text-[10px] text-zinc-400 font-bold border border-white/5 mr-2">Link {i + 1}</a>)}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            ) : activeTab === 'commands' ? (
                                <motion.div key="commands" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                                    <div className="flex justify-between items-center">
                                        <h1 className="text-4xl font-black tracking-tight">Slash <span className="text-indigo-500">Commands</span></h1>
                                        <button onClick={fetchCommands} className="p-2 rounded-xl glass hover:bg-white/10 text-gray-400 transition-all"><RefreshCcw size={16} /></button>
                                    </div>
                                    <div className="glass-card p-8 rounded-4xl border border-white/5 mb-8">
                                        <h2 className="text-xl font-black mb-6 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">{isEditing ? <RefreshCcw size={18} /> : <Plus size={18} />}</div>
                                            {isEditing ? 'Edit Command' : 'New Command'}
                                        </h2>
                                        <form onSubmit={handleAddCommand} className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-gray-500 ml-1 tracking-widest">Name</label>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">/</span>
                                                        <input type="text" value={newCommand.name} onChange={e => setNewCommand({ ...newCommand, name: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="w-full bg-black/40 border border-white/10 rounded-2xl px-8 py-4 focus:border-indigo-500/50 outline-none transition-all font-bold" placeholder="ping" disabled={isEditing} required />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-gray-500 ml-1 tracking-widest">Description</label>
                                                    <input type="text" value={newCommand.description} onChange={e => setNewCommand({ ...newCommand, description: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-indigo-500/50 outline-none transition-all font-medium" placeholder="What does it do?" required />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-gray-500 ml-1 tracking-widest">Server (Instant)</label>
                                                    <select value={newCommand.guildId} onChange={e => setNewCommand({ ...newCommand, guildId: e.target.value, requiredRoleId: '' })} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-indigo-500/50 outline-none appearance-none" disabled={isEditing}>
                                                        <option value="">Global (Slow)</option>
                                                        {botStatus?.guilds?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-gray-500 ml-1 tracking-widest">Required Role</label>
                                                    <select value={newCommand.requiredRoleId || ''} onChange={e => setNewCommand({ ...newCommand, requiredRoleId: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-indigo-500/50 outline-none appearance-none disabled:opacity-30" disabled={!newCommand.guildId}>
                                                        <option value="" className="bg-zinc-900">@everyone</option>
                                                        {newCommand.guildId && botStatus?.guilds?.find(g => g.id === newCommand.guildId)?.roles?.map(r => (
                                                            <option key={r.id} value={r.id} style={{ color: r.color }} className="bg-zinc-900 font-bold">
                                                                {r.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-gray-500 ml-1 tracking-widest">Response {isJson(newCommand.content) && <span className="text-indigo-400 ml-2">JSON DETECTED</span>}</label>
                                                <textarea value={newCommand.content} onChange={e => setNewCommand({ ...newCommand, content: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-indigo-500/50 outline-none h-32 resize-none text-sm font-medium" required placeholder="Text or JSON Embed..."></textarea>
                                            </div>
                                            <button type="submit" className={`w-full py-5 rounded-2xl font-black text-lg transition-all shadow-xl ${isEditing ? 'bg-indigo-500 text-white' : 'bg-white text-zinc-900 hover:scale-[1.01]'}`}>{isEditing ? 'Update Command' : 'Add Command'}</button>
                                            {isEditing && <button type="button" onClick={() => { setIsEditing(false); setNewCommand({ name: '', description: '', content: '', guildId: '', requiredRoleId: '' }); }} className="w-full py-3 text-gray-400 font-bold hover:text-white transition-all text-xs">Abbrechen</button>}
                                        </form>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {commands.map(cmd => (
                                            <div key={cmd.name + (cmd.guildId || 'global')} className="glass-card p-6 rounded-3xl border border-white/10 hover:border-white/20 transition-all group">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                        <span className="text-lg font-black tracking-tight">/{cmd.name}</span>
                                                        <div className="flex gap-1 items-center">
                                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">{cmd.guildId ? 'Guild' : 'Global'}</span>
                                                            {cmd.requiredRoleId && (
                                                                <span
                                                                    className="text-[9px] font-black px-2 py-0.5 rounded-full bg-white/5 border border-white/5"
                                                                    style={{ color: cmd.guildId ? botStatus?.guilds?.find(g => g.id === cmd.guildId)?.roles?.find(r => r.id === cmd.requiredRoleId)?.color : '#fff' }}
                                                                >
                                                                    @{cmd.guildId ? botStatus?.guilds?.find(g => g.id === cmd.guildId)?.roles?.find(r => r.id === cmd.requiredRoleId)?.name : 'everyone'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        {!cmd.isStandard && (
                                                            <>
                                                                <button onClick={() => { setNewCommand({ ...cmd, guildId: cmd.guildId || '', requiredRoleId: cmd.requiredRoleId || '' }); setIsEditing(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"><RefreshCcw size={14} /></button>
                                                                <button onClick={() => handleDeleteCommand(cmd.name, cmd.guildId)} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white"><Trash2 size={14} /></button>
                                                            </>
                                                        )}
                                                        {cmd.isStandard && (
                                                            <div className="p-2 text-[8px] font-black uppercase text-gray-500 tracking-widest border border-white/5 rounded-lg flex items-center gap-1">
                                                                <Shield size={10} /> System
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-400 font-medium line-clamp-2">{cmd.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            ) : selectedGuild ? (
                                <motion.div key="guild" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-8 rounded-4xl border border-white/5">
                                    <div className="flex justify-between items-center mb-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 flex items-center justify-center text-3xl font-black text-indigo-400 border border-white/10">
                                                {selectedGuild.icon ? <img src={selectedGuild.icon} className="w-full h-full object-cover rounded-3xl" alt="S" /> : selectedGuild.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h1 className="text-2xl font-black">{selectedGuild.name}</h1>
                                                <p className="text-gray-400 text-sm">{selectedGuild.memberCount} Members • Management</p>
                                            </div>
                                        </div>
                                        <button onClick={() => { if (confirm('Leave server?')) handleAction('leaveGuild', { guildId: selectedGuild.id }) }} className="px-6 py-3 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white text-xs font-bold transition-all flex items-center gap-2"><LogOut size={14} /> Leave</button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 block mb-2">Mod Reason / DM Message</label>
                                                <input type="text" value={modForm.reason} onChange={e => setModForm({ ...modForm, reason: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-indigo-500/50 outline-none text-sm" placeholder="Reason or Message..." />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 block mb-2">Mod Duration (Timeout)</label>
                                                <input type="number" value={modForm.duration} onChange={e => setModForm({ ...modForm, duration: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-indigo-500/50 outline-none text-sm" placeholder="Seconds" />
                                            </div>
                                        </div>
                                        <div className="bg-white/2 p-6 rounded-3xl border border-white/5 flex flex-col justify-center">
                                            <ShieldAlert className="text-indigo-400 mb-2" size={24} />
                                            <p className="text-xs text-gray-400 leading-relaxed">Actions are permanent and require the bot role to be higher than the target user role in the hierarchy.</p>
                                        </div>
                                    </div>

                                    <div className="glass-card p-8 rounded-4xl border border-white/5 mb-8">
                                        <h3 className="text-xl font-black mb-6 flex items-center gap-3"><Shield className="text-indigo-500" size={24} /> Berechtigungen & Rollen</h3>
                                        <p className="text-xs text-gray-400 mb-6">Gib die Rollen-IDs an, die berechtigt sind, die globalen Befehle (Kick, Ban, etc.) zu nutzen. Trenne mehrere IDs mit Kommas.</p>
                                        <form onSubmit={handleConfigSubmit} className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-gray-500 ml-1 tracking-widest">Owner Rollen (Full Access)</label>
                                                    <input type="text" value={configForm.owner} onChange={e => setConfigForm({ ...configForm, owner: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 focus:border-indigo-500/50 outline-none text-xs font-mono" placeholder="ID1, ID2..." />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-gray-500 ml-1 tracking-widest">Admin Rollen (Ban/Role)</label>
                                                    <input type="text" value={configForm.admin} onChange={e => setConfigForm({ ...configForm, admin: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 focus:border-indigo-500/50 outline-none text-xs font-mono" placeholder="ID1, ID2..." />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-gray-500 ml-1 tracking-widest">Mod Rollen (Kick/Timeout)</label>
                                                    <input type="text" value={configForm.mod} onChange={e => setConfigForm({ ...configForm, mod: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 focus:border-indigo-500/50 outline-none text-xs font-mono" placeholder="ID1, ID2..." />
                                                </div>
                                            </div>
                                            <button type="submit" disabled={loading} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/5 flex items-center justify-center gap-2">
                                                <Save size={18} /> Konfiguration Speichern
                                            </button>
                                        </form>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest flex items-center gap-2"><Users size={14} /> Server Members {loadingMembers && <RefreshCcw size={12} className="animate-spin" />}</h3>
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                                            {members.map(m => (
                                                <div key={m.id} className="glass-card p-4 rounded-2xl flex items-center gap-4 hover:bg-white/5 transition-all group">
                                                    <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-zinc-800">
                                                        <img src={m.avatar} className="w-full h-full object-cover" alt="M" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-bold truncate group-hover:text-indigo-400 transition-colors">{m.displayName}</div>
                                                        <div className="text-[10px] text-gray-500 truncate mb-1">@{m.tag}</div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {m.roles?.map(r => (
                                                                <span key={r.id} className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5" style={{ color: r.color }}>
                                                                    {r.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button onClick={() => handleModeration(m.id, 'dm', modForm.reason)} title="Direktnachricht senden" className="p-2 rounded-xl bg-white/5 hover:bg-blue-500/20 text-blue-400"><Mail size={16} /></button>
                                                        <button onClick={() => handleModeration(m.id, 'timeout')} title="Timeout" className="p-2 rounded-xl bg-white/5 hover:bg-yellow-500/20 text-yellow-400"><Clock size={16} /></button>
                                                        <button onClick={() => handleModeration(m.id, 'kick')} title="Kick" className="p-2 rounded-xl bg-white/5 hover:bg-orange-500/20 text-orange-400"><UserMinus size={16} /></button>
                                                        <button onClick={() => handleModeration(m.id, 'ban')} title="Ban" className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-red-500"><Ban size={16} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div key="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                                    <div className="glass-card p-10 rounded-4xl border border-white/5 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8">
                                            <div className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest ${botStatus?.wsStatus === 'READY' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{botStatus?.wsStatus || 'UNKNOWN'}</div>
                                        </div>
                                        <h1 className="text-4xl font-black mb-10 flex items-center gap-4"><Bot size={40} className="text-indigo-400" /> Bot Identity</h1>
                                        <form onSubmit={handleIdentitySubmit} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-gray-400 uppercase tracking-widest ml-1">Bot Username</label>
                                                    <input type="text" value={identityForm.username} onChange={e => setIdentityForm({ ...identityForm, username: e.target.value })} className="w-full glass-card bg-transparent px-6 py-5 rounded-2xl border border-white/10 focus:border-indigo-500 outline-none text-lg font-bold" placeholder="Username..." required />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-gray-400 uppercase tracking-widest ml-1">Avatar Content (URL)</label>
                                                    <input type="text" value={identityForm.avatarUrl} onChange={e => setIdentityForm({ ...identityForm, avatarUrl: e.target.value })} className="w-full glass-card bg-transparent px-6 py-5 rounded-2xl border border-white/10 focus:border-indigo-500 outline-none text-sm" placeholder="https://..." />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-4 bg-white/2 rounded-2xl border border-white/5">
                                                <input type="checkbox" id="sync" checked={identityForm.syncNicknames} onChange={e => setIdentityForm({ ...identityForm, syncNicknames: e.target.checked })} className="w-5 h-5 rounded border-white/10 bg-transparent text-indigo-500" />
                                                <label htmlFor="sync" className="text-sm font-medium text-gray-400">Force name on all servers (Removes nicknames)</label>
                                            </div>
                                            <button type="submit" disabled={loading} className="w-full bg-indigo-500 py-5 rounded-3xl font-black text-xl hover:scale-[1.01] active:scale-95 transition-all shadow-2xl shadow-indigo-500/20 flex items-center justify-center gap-3"><Save size={24} /> Save Profile</button>
                                        </form>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="glass-card p-10 rounded-4xl border border-white/5">
                                            <h2 className="text-2xl font-black mb-8 flex items-center gap-3"><Activity size={24} className="text-green-400" /> Presence</h2>
                                            <form onSubmit={handleSubmit} className="space-y-6">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Type</label>
                                                    <select value={form.activityType} onChange={e => setForm({ ...form, activityType: e.target.value })} className="w-full glass-card bg-transparent px-4 py-4 rounded-2xl border border-white/10 outline-none appearance-none">
                                                        <option value="0" className="bg-zinc-900">Playing</option>
                                                        <option value="1" className="bg-zinc-900">Streaming</option>
                                                        <option value="2" className="bg-zinc-900">Listening</option>
                                                        <option value="3" className="bg-zinc-900">Watching</option>
                                                        <option value="5" className="bg-zinc-900">Competing</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Status</label>
                                                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full glass-card bg-transparent px-4 py-4 rounded-2xl border border-white/10 outline-none appearance-none">
                                                        <option value="online" className="bg-zinc-900">Online</option>
                                                        <option value="idle" className="bg-zinc-900">Idle</option>
                                                        <option value="dnd" className="bg-zinc-900">Do Not Disturb</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">What is the bot doing?</label>
                                                    <input type="text" value={form.activityName} onChange={e => setForm({ ...form, activityName: e.target.value })} className="w-full glass-card bg-transparent px-6 py-4 rounded-2xl border border-white/10 outline-none" placeholder="Gaming, Music, etc." required />
                                                </div>
                                                <button type="submit" className="w-full bg-white text-zinc-900 py-4 rounded-2xl font-black transition-all hover:bg-gray-100">Update Presence</button>
                                            </form>
                                        </div>

                                        <div className="glass-card p-10 rounded-4xl border border-white/5">
                                            <h2 className="text-2xl font-black mb-8 flex items-center gap-3"><ShieldAlert size={24} className="text-red-400" /> System Metrics</h2>
                                            <form onSubmit={handleStatusOverride} className="space-y-6">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Health Mode</label>
                                                    <select value={statusOverrideForm.mode} onChange={e => setStatusOverrideForm({ ...statusOverrideForm, mode: e.target.value })} className="w-full glass-card bg-transparent px-4 py-4 rounded-2xl border border-white/10 outline-none appearance-none">
                                                        <option value="auto" className="bg-zinc-900">Automatic Health Check</option>
                                                        <option value="issues" className="bg-zinc-900">Force Global Issues Alert</option>
                                                        <option value="maintenance" className="bg-zinc-900">Force Maintenance Mode</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Alert Message</label>
                                                    <input type="text" value={statusOverrideForm.message} onChange={e => setStatusOverrideForm({ ...statusOverrideForm, message: e.target.value })} className="w-full glass-card bg-transparent px-6 py-4 rounded-2xl border border-white/10 outline-none text-sm" placeholder="Custom text for status page..." />
                                                </div>
                                                <div className="p-4 rounded-2xl bg-indigo-500/5 text-[10px] text-indigo-300 font-medium leading-relaxed border border-indigo-500/10">Controls the public Status Page display and bot performance metrics reporting.</div>
                                                <button type="submit" className="w-full py-4 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 font-black hover:bg-red-500 hover:text-white transition-all">Save System Override</button>
                                            </form>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {message && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-3xl text-center font-black shadow-2xl border backdrop-blur-2xl ${message.includes('Error') ? 'bg-red-500 text-white border-red-400' : 'bg-white text-black border-white/20'}`}>
                    {message}
                </motion.div>
            )}
        </div>
    );
}
