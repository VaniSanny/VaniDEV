"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Globe, Zap, Network, Database, CheckCircle2, AlertCircle, ArrowLeft, RefreshCcw, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function StatusPage() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uptime, setUptime] = useState('00:00:00');

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/bot/status');
            const data = await res.json();
            setStatus(data);
        } catch (err) {
            console.error('Failed to fetch status:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 10000);
        return () => clearInterval(interval);
    }, []);

    const services = [
        {
            name: 'Bot Status',
            desc: 'Discord WebSocket Connection',
            icon: Bot,
            status: status?.wsStatus === 'READY' ? 'ON' : 'OFF',
            metric: status?.wsStatus || 'OFFLINE'
        },
        {
            name: 'Dashboard Status',
            desc: 'Web Interface & React Hydration',
            icon: Globe,
            status: 'ON',
            metric: 'FUNCTIONAL'
        },
        {
            name: 'API Status',
            desc: 'Backend Endpoint Latency',
            icon: Zap,
            status: status?.apiPing ? 'ON' : 'OFF',
            metric: status?.apiPing ? `${status.apiPing}ms` : 'TIMEOUT'
        },
        {
            name: 'Bridge Status',
            desc: 'Real-time SSE Event Stream',
            icon: Network,
            status: status?.bridge?.status === 'READY' ? 'ON' : 'OFF',
            metric: 'CONNECTED'
        },
        {
            name: 'Shard Status',
            desc: 'Discord Gateway Sharding',
            icon: Database,
            status: status?.shard?.status === 'READY' ? 'ON' : 'OFF',
            metric: status?.shard?.status === 'READY' ? `Shard #${status.shard.id} (${status.shard.ping}ms)` : 'NOT INITIALIZED'
        }
    ];

    const isMaintenance = status?.statusConfig?.mode === 'maintenance';
    const forceIssues = status?.statusConfig?.mode === 'issues';
    const customMessage = status?.statusConfig?.message;

    const allSystemsOperational = !isMaintenance && !forceIssues && services.every(s => s.status === 'ON');

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8 font-[family-name:var(--font-geist-sans)] selection:bg-indigo-500/30">
            {/* Background Glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse shadow-2xl"></div>
            </div>

            <main className="max-w-4xl mx-auto relative z-10">
                <div className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-6">
                        <Link href="/" className="p-3 rounded-2xl glass hover:bg-white/5 transition-all group">
                            <ArrowLeft size={20} className="text-gray-400 group-hover:-translate-x-1 transition-transform" />
                        </Link>
                        <div className="flex items-center gap-3 font-black text-2xl tracking-tighter group cursor-default">
                            <div className="w-10 h-10 rounded-xl glass border border-white/10 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                                <span className="text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40">V</span>
                            </div>
                            Vani<span className="text-indigo-400">DEV</span>
                        </div>
                    </div>
                    <button
                        onClick={fetchStatus}
                        className={`p-3 rounded-2xl glass hover:bg-white/5 transition-all ${loading ? 'animate-spin' : ''}`}
                    >
                        <RefreshCcw size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Main Health Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`glass-card p-10 rounded-4xl border ${isMaintenance ? 'border-orange-500/20 shadow-orange-500/5' : allSystemsOperational ? 'border-green-500/20 shadow-green-500/5' : 'border-red-500/20 shadow-red-500/5'} mb-10 text-center relative overflow-hidden`}
                >
                    {allSystemsOperational ? (
                        <div className="absolute top-4 right-4 text-green-500 animate-pulse">
                            <CheckCircle2 size={32} />
                        </div>
                    ) : isMaintenance ? (
                        <div className="absolute top-4 right-4 text-orange-500 animate-pulse">
                            <ShieldAlert size={32} />
                        </div>
                    ) : (
                        <div className="absolute top-4 right-4 text-red-500 animate-pulse">
                            <AlertCircle size={32} />
                        </div>
                    )}

                    <h1 className="text-5xl font-black mb-4 tracking-tighter">
                        {isMaintenance ? (
                            <span className="text-orange-500">Maintenance</span>
                        ) : (
                            <>System <span className={allSystemsOperational ? 'text-green-500' : 'text-red-500'}>Status</span></>
                        )}
                    </h1>
                    <p className="text-xl text-gray-400 font-medium max-w-lg mx-auto leading-relaxed">
                        {customMessage ? customMessage : (
                            isMaintenance
                                ? "Wir führen derzeit Wartungsarbeiten durch. Bitte schau später wieder vorbei."
                                : allSystemsOperational
                                    ? "Alle Services sind funktionsfähig. Unser System läuft mit maximaler Performance."
                                    : "Es gibt Probleme im Service. Unser Team wurde bereits benachrichtigt."
                        )}
                    </p>
                </motion.div>

                {/* Service Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((service, i) => (
                        <motion.div
                            key={service.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="glass-card p-8 rounded-3xl border border-white/5 hover:border-white/10 transition-all group flex flex-col justify-between h-full"
                        >
                            <div>
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`p-4 rounded-2xl ${service.status === 'ON' ? 'bg-indigo-500/10 text-indigo-400' : isMaintenance ? 'bg-orange-500/10 text-orange-400' : 'bg-red-500/10 text-red-400'}`}>
                                        <service.icon size={24} />
                                    </div>
                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${service.status === 'ON' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : isMaintenance ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${service.status === 'ON' ? 'bg-green-500' : isMaintenance ? 'bg-orange-500' : 'bg-red-500'} animate-pulse`}></div>
                                        {service.status === 'ON' ? 'Operational' : isMaintenance ? 'Maintenance' : 'Issues'}
                                    </div>
                                </div>
                                <h3 className="text-xl font-black mb-2 tracking-tight group-hover:text-indigo-400 transition-colors">{service.name}</h3>
                                <p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed">{service.desc}</p>
                            </div>
                            <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Metric</span>
                                <span className="text-sm font-bold text-gray-300">{service.metric}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <footer className="mt-12 text-center text-gray-600 text-[10px] font-black uppercase tracking-[0.2em]">
                    Vani Dashboard Status Engine &bull; Updated every 10 seconds
                </footer>
            </main>
        </div>
    );
}

const styles = `
.glass-card {
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
`;
