"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Shield, Music, Zap, Bot, ChevronRight, CheckCircle2, AlertCircle, Search, Mail, User, MessageSquare, Plus, Minus, ExternalLink, ScrollText, Terminal } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [botStatus, setBotStatus] = useState(null);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistForm, setWaitlistForm] = useState({ name: '', email: '', reason: '', invite: '' });
  const [formStatus, setFormStatus] = useState({ type: '', msg: '' });
  const [selectedServer, setSelectedServer] = useState('global');
  const [commands, setCommands] = useState([]);
  const [commandSearch, setCommandSearch] = useState('');
  const [serverSearch, setServerSearch] = useState('');
  const [showServerDropdown, setShowServerDropdown] = useState(false);

  useEffect(() => {
    const fetchStatus = () => {
      fetch('/api/bot/status')
        .then(res => res.json())
        .then(data => setBotStatus(data))
        .catch(err => console.error('Status fetch failed:', err));
    };
    const fetchCommands = () => {
      fetch('/api/bot/commands')
        .then(res => res.json())
        .then(data => setCommands(data.commands || []))
        .catch(err => console.error('Commands fetch failed:', err));
    };
    fetchStatus();
    fetchCommands();
    const interval = setInterval(() => {
      fetchStatus();
      fetchCommands();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleWaitlistSubmit = async (e) => {
    e.preventDefault();
    setFormStatus({ type: 'loading', msg: 'Sende Daten...' });
    try {
      const res = await fetch('/api/bot/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(waitlistForm)
      });
      const data = await res.json();
      if (data.success) {
        setFormStatus({ type: 'success', msg: 'Erfolgreich hinzugefügt! Wir melden uns.' });
        setWaitlistForm({ name: '', email: '', reason: '', invite: '' });
        setTimeout(() => setShowWaitlist(false), 3000);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setFormStatus({ type: 'error', msg: err.message });
    }
  };

  const faqs = [
    { q: "Was ist VaniDEV?", a: "VaniDEV ist eine leistungsstarke Discord-Management-Plattform, die Bot-Steuerung, Moderation und Echtzeit-Monitoring in einem schicken Dashboard vereint." },
    { q: "Warum ist der Bot aktuell privat?", a: "Wir befinden uns in der Beta-Phase. Um Stabilität und Performance zu garantieren, schalten wir den Bot aktuell nur für ausgewählte Nutzer frei." },
    { q: "Wie lange dauert die Warteliste?", a: "Das hängt von der aktuellen Auslastung ab. Wir prüfen jede Anfrage individuell und melden uns per Discord oder E-Mail." },
    { q: "Kann ich eigene Commands erstellen?", a: "Ja! VaniDEV erlaubt es dir, komplett eigene Slash-Commands mit Text-Antworten direkt über das Dashboard zu konfigurieren." }
  ];

  const features = [
    { icon: <Shield className="text-indigo-400" />, title: "Mod-Management", desc: "Verwalte Mitglieder mit Timeouts, Kicks und Bans direkt aus dem Web." },
    { icon: <ScrollText className="text-purple-400" />, title: "Echtzeit-Logs", desc: "Jede Aktion, jede Nachricht – alles wird live im Dashboard geloggt." },
    { icon: <Zap className="text-yellow-400" />, title: "Live Updates", desc: "Kein Neuladen nötig. Dank SSE-Technologie siehst du alles sofort." },
    { icon: <Terminal className="text-green-400" />, title: "Custom Commands", desc: "Erstelle eigene Slash-Commands ohne eine Zeile Code zu schreiben." },
    { icon: <Bot className="text-blue-400" />, title: "Identity Sync", desc: "Passe Name und Avatar deines Bots global über alle Server an." }
  ];

  const allServers = [
    { id: 'global', name: 'Global Commands' },
    ...(botStatus?.guilds || [])
  ];

  const filteredServers = allServers.filter(s => s.name.toLowerCase().includes(serverSearch.toLowerCase()));

  const currentCommands = selectedServer === 'global'
    ? commands.filter(c => !c.guildId)
    : commands.filter(c => c.guildId === selectedServer);

  const filteredCommands = currentCommands.filter(c =>
    c.name.toLowerCase().includes(commandSearch.toLowerCase()) ||
    c.desc?.toLowerCase().includes(commandSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen mesh-gradient text-white selection:bg-indigo-500/30 font-[family-name:var(--font-geist-sans)]">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center glass border-b border-white/5">
        <div className="flex items-center gap-3 font-black text-2xl tracking-tighter group cursor-default">
          <div className="w-10 h-10 rounded-xl glass border border-white/10 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40">V</span>
          </div>
          Vani<span className="text-indigo-400">DEV</span>
          <span className="ml-2 px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-black uppercase text-gray-400 border border-white/5">BETA</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/status" className="hidden md:flex px-4 py-2 rounded-full glass hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${botStatus?.wsStatus === 'READY' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'} animate-pulse`}></div>
            System
          </Link>
          <Link href="/dashboard" className="px-6 py-2.5 rounded-full bg-indigo-500 hover:bg-indigo-600 transition-all text-xs font-black shadow-lg shadow-indigo-500/20 active:scale-95">DASHBOARD</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-6 max-w-7xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-gray-400 mb-8 hover:bg-white/10 transition-colors cursor-default">
            <CheckCircle2 size={14} className="text-indigo-400" /> Professional Discord Infrastructure
          </div>
          <h1 className="text-7xl md:text-9xl font-black mb-8 tracking-tighter leading-[0.9] text-white">
            Beyond <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400">Ordinary</span> <br />
            Bot Power.
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
            Entfessle das volle Potential deines Servers. VaniDEV bietet modernste Dashboard-Technologie für ambitionierte Communities.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => setShowWaitlist(true)}
              className="group bg-white text-black px-10 py-5 rounded-full font-black text-lg hover:scale-105 transition-all flex items-center gap-3 shadow-2xl shadow-white/10"
            >
              Add to Discord <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <Link href="/status" className="px-8 py-5 rounded-full glass border border-white/10 flex items-center gap-3 hover:bg-white/5 transition-all group shadow-2xl">
              <div className={`w-2 h-2 rounded-full ${botStatus?.wsStatus === 'READY' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <span className="text-sm font-bold text-gray-300">System Live Status</span>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="px-6 py-32 max-w-7xl mx-auto" id="features">
        <h2 className="text-4xl font-black mb-16 text-center tracking-tight">Powerful <span className="text-indigo-400">Features</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-10 rounded-[2.5rem] border border-white/5 hover:border-indigo-500/30 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-150 group-hover:rotate-12 duration-500">
                {f.icon}
              </div>
              <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center mb-8 border border-white/10 group-hover:bg-indigo-500/20 group-hover:text-white transition-all shadow-xl">
                {f.icon}
              </div>
              <h3 className="text-2xl font-black mb-4 tracking-tight">{f.title}</h3>
              <p className="text-gray-400 font-medium leading-relaxed">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Commands & Dropdown Section */}
      <section className="px-6 py-32 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black mb-4 tracking-tight">Command <span className="text-indigo-400">Explorer</span></h2>
          <p className="text-gray-500 font-medium italic text-sm">Durchsuche Commands nach Servern</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Wähle Server</h3>
            <div className="relative">
              <button
                onClick={() => setShowServerDropdown(!showServerDropdown)}
                className="w-full glass-card px-4 py-3 rounded-2xl border border-white/10 flex items-center justify-between text-sm font-bold hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <Globe size={16} className="text-indigo-400 shrink-0" />
                  <span className="truncate">{allServers.find(s => s.id === selectedServer)?.name}</span>
                </div>
                <ChevronRight size={14} className={`text-gray-500 transition-transform ${showServerDropdown ? 'rotate-90' : ''}`} />
              </button>

              <AnimatePresence>
                {showServerDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute top-full left-0 w-full mt-2 glass-card rounded-2xl border border-white/10 overflow-hidden z-20 shadow-2xl backdrop-blur-3xl"
                  >
                    <div className="p-3 border-b border-white/5 sticky top-0 bg-zinc-900/50">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Suchen..."
                          value={serverSearch}
                          onChange={(e) => setServerSearch(e.target.value)}
                          className="w-full bg-black/40 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs outline-none focus:border-indigo-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                      {filteredServers.map(server => (
                        <button
                          key={server.id}
                          onClick={() => { setSelectedServer(server.id); setShowServerDropdown(false); }}
                          className={`w-full text-left px-4 py-3 text-xs font-bold transition-all flex items-center gap-3 ${selectedServer === server.id ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-white/5 text-gray-400'}`}
                        >
                          <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center text-[10px] shrink-0">
                            {server.icon ? <img src={server.icon} className="w-full h-full object-cover rounded-md" /> : server.name.charAt(0)}
                          </div>
                          <span className="truncate">{server.name}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="glass-card rounded-[2rem] border border-white/10 overflow-hidden flex flex-col min-h-[400px]">
              <div className="p-6 border-b border-white/10 bg-white/2 flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="text-xl font-black">
                  {selectedServer === 'global' ? 'Global Commands' : botStatus?.guilds?.find(g => g.id === selectedServer)?.name}
                </h3>
                <div className="relative w-full md:w-64">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Command suchen..."
                    value={commandSearch}
                    onChange={(e) => setCommandSearch(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-full py-2.5 pl-12 pr-6 text-sm outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                      <th className="px-8 py-5 border-b border-white/5">Command</th>
                      <th className="px-8 py-5 border-b border-white/5">Beschreibung</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredCommands.map((cmd, i) => (
                      <tr key={i} className="hover:bg-white/2 transition-colors group">
                        <td className="px-8 py-5">
                          <code className="text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-xl font-bold text-sm border border-indigo-500/20 group-hover:scale-105 inline-block transition-transform tracking-tight">
                            {cmd.name}
                          </code>
                        </td>
                        <td className="px-8 py-5 text-gray-400 text-sm font-medium leading-relaxed">
                          {cmd.desc || cmd.description || "Keine Beschreibung verfügbar."}
                        </td>
                      </tr>
                    ))}
                    {filteredCommands.length === 0 && (
                      <tr>
                        <td colSpan="2" className="px-8 py-20 text-center text-gray-500 italic font-medium">
                          Keine Commands gefunden für diese Auswahl.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-6 py-32 max-w-4xl mx-auto">
        <h2 className="text-4xl font-black mb-16 text-center tracking-tight">Häufige <span className="text-indigo-400">Fragen</span></h2>
        <div className="space-y-4">
          {faqs.map((f, i) => (
            <div key={i} className="glass-card rounded-3xl border border-white/5 overflow-hidden">
              <details className="group">
                <summary className="flex items-center justify-between p-8 font-bold cursor-pointer list-none list-item">
                  <span className="text-lg pr-4 group-open:text-indigo-400 transition-colors">{f.q}</span>
                  <div className="w-8 h-8 rounded-full h-8 flex items-center justify-center bg-white/5 group-open:rotate-180 transition-all">
                    <Plus size={16} className="group-open:hidden" />
                    <Minus size={16} className="hidden group-open:block" />
                  </div>
                </summary>
                <div className="px-8 pb-8 text-gray-400 font-medium leading-relaxed border-t border-white/5 pt-6">
                  {f.a}
                </div>
              </details>
            </div>
          ))}
        </div>
      </section>

      {/* Waitlist Modal */}
      <AnimatePresence>
        {showWaitlist && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card w-full max-w-2xl rounded-[3rem] border border-white/10 overflow-hidden relative"
            >
              <button
                onClick={() => setShowWaitlist(false)}
                className="absolute top-8 right-8 w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors z-10"
              >
                <Plus size={20} className="rotate-45" />
              </button>

              <div className="p-10 md:p-16">
                <div className="mb-10">
                  <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-6">
                    <Bot size={24} className="text-indigo-400" />
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black mb-4 text-white">Werde Teil der <span className="text-indigo-400">Zukunft</span></h2>
                  <p className="text-gray-400 text-lg font-medium max-w-sm mx-auto">Melde dich für die exklusive Waitlist an und erfahre als einer der Ersten von neuen VaniDEV Features.</p>
                </div>

                <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-4">Dein Name</label>
                      <div className="relative">
                        <User size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          type="text"
                          required
                          value={waitlistForm.name}
                          onChange={(e) => setWaitlistForm({ ...waitlistForm, name: e.target.value })}
                          placeholder="Max Mustermann"
                          className="w-full bg-white/5 border border-white/10 rounded-3xl py-4 pl-14 pr-6 outline-none focus:border-indigo-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-4">E-Mail Adresse</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          type="email"
                          required
                          value={waitlistForm.email}
                          onChange={(e) => setWaitlistForm({ ...waitlistForm, email: e.target.value })}
                          placeholder="max@example.com"
                          className="w-full bg-white/5 border border-white/10 rounded-3xl py-4 pl-14 pr-6 outline-none focus:border-indigo-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-4">Was ist dein Grund? (Warum VaniDEV?)</label>
                    <div className="relative">
                      <MessageSquare size={16} className="absolute left-6 top-6 text-gray-500" />
                      <textarea
                        required
                        rows="3"
                        value={waitlistForm.reason}
                        onChange={(e) => setWaitlistForm({ ...waitlistForm, reason: e.target.value })}
                        placeholder="Ich möchte meinen Server besser verwalten..."
                        className="w-full bg-white/5 border border-white/10 rounded-3xl py-4 pl-14 pr-6 outline-none focus:border-indigo-500 transition-all resize-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-4">Discord Server Invite (Optional)</label>
                    <div className="relative">
                      <ExternalLink size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        value={waitlistForm.invite}
                        onChange={(e) => setWaitlistForm({ ...waitlistForm, invite: e.target.value })}
                        placeholder="discord.gg/dein-server"
                        className="w-full bg-white/5 border border-white/10 rounded-3xl py-4 pl-14 pr-6 outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={formStatus.type === 'loading'}
                    className="w-full bg-white text-zinc-900 py-5 rounded-3xl font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {formStatus.type === 'loading' ? <RefreshCcw className="animate-spin" size={20} /> : <Zap size={20} />}
                    HINZUFÜGEN
                  </button>

                  <AnimatePresence>
                    {formStatus.msg && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={`text-center font-bold text-sm p-4 rounded-2xl ${formStatus.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}
                      >
                        {formStatus.msg}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="py-20 px-6 border-t border-white/5 text-center">
        <div className="flex items-center justify-center gap-3 font-black text-2xl tracking-tighter mb-6 opacity-30 grayscale pointer-events-none">
          <div className="w-8 h-8 rounded-lg border border-white/40 flex items-center justify-center">V</div>
          VaniDEV
        </div>
        <p className="text-gray-600 text-xs font-black uppercase tracking-[0.3em]">
          &copy; 2026 VaniDEV Infrastructure &bull; All Rights Reserved
        </p>
      </footer>

      <style jsx global>{`
        .mesh-gradient {
          background-color: #050505;
          background-image: 
            radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), 
            radial-gradient(at 50% 0%, hsla(225,39%,10%,1) 0, transparent 50%), 
            radial-gradient(at 100% 0%, hsla(339,49%,10%,1) 0, transparent 50%);
        }
        .glass {
          background: rgba(255, 255, 255, 0.01);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}

function RefreshCcw({ size, className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function Globe({ size, className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
