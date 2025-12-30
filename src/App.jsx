import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Trophy, Timer, Crown, Zap, Trash2, Power, UserPlus, X, Gamepad2, Star, Plus } from 'lucide-react'

// --- Supabase Config ---
const SUPABASE_URL = 'https://paoqibuvmgeftsgoselx.supabase.co'
const SUPABASE_KEY = 'sb_publishable_vnyiIlTELYxtmUXAoliKpA_CciU2R2s'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// --- Components ---

const Card = ({ children, className = '', glow = 'blue' }) => (
    <div className={`
    relative p-6 rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden
    ${glow === 'red' ? 'border-neon-red shadow-[0_0_10px_rgba(255,60,40,0.2)]' : 'border-neon-blue shadow-[0_0_10px_rgba(10,185,230,0.2)]'}
    ${className}
  `}>
        <div className={`absolute inset-0 opacity-5 ${glow === 'red' ? 'bg-red-900' : 'bg-blue-900'}`}></div>
        <div className="relative z-10 h-full">{children}</div>
    </div>
)

const RankItem = ({ rank, name, score, game }) => {
    const getRankColor = (r) => {
        if (r === 1) return 'text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]'
        if (r === 2) return 'text-gray-300 drop-shadow-[0_0_5px_rgba(209,213,219,0.8)]'
        if (r === 3) return 'text-amber-700 drop-shadow-[0_0_5px_rgba(180,83,9,0.8)]'
        return 'text-white'
    }

    return (
        <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 hover:bg-white/5 transition px-2">
            <div className="flex items-center gap-4 overflow-hidden">
                <span className={`text-xl font-black w-8 text-center ${getRankColor(rank)}`}>
                    {rank}
                </span>
                <div className="flex flex-col min-w-0">
                    <span className="text-lg font-bold truncate text-gray-100">
                        {name}
                    </span>
                    {game && <span className="text-[10px] text-gray-500 uppercase">{game}</span>}
                </div>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-xl font-mono font-bold text-neon-blue">
                    {typeof score === 'number' ? score.toFixed(2) : score}
                </span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">秒</span>
            </div>
        </div>
    )
}

function App() {
    const [leaderboard, setLeaderboard] = useState([])
    const [adminOpen, setAdminOpen] = useState(false)
    const [secretCount, setSecretCount] = useState(0)
    const [gameStandards, setGameStandards] = useState({})
    const [standardInput, setStandardInput] = useState('')
    const [wheelOpen, setWheelOpen] = useState(false)
    const [spinning, setSpinning] = useState(false)
    const [spinRotation, setSpinRotation] = useState(0)
    const [spinWinner, setSpinWinner] = useState('')

    // Game Modes State (Synced from Supabase)
    const [availableGames, setAvailableGames] = useState([])
    const [targetGame, setTargetGame] = useState('')
    const [newGameName, setNewGameName] = useState('')
    const [isAddingGame, setIsAddingGame] = useState(false)

    // Admin Entry State
    const [playerName, setPlayerName] = useState('')
    const [score, setScore] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Fetch initial data
    const fetchLeaderboard = async () => {
        try {
            const { data, error } = await supabase
                .from('leaderboard')
                .select('*')
                .order('score', { ascending: true })

            if (!error && data) {
                setLeaderboard(data)
            }
        } catch (e) {
            console.error(e)
        }
    }

    const fetchGameStandards = async () => {
        try {
            const { data, error } = await supabase
                .from('game_standards')
                .select('game, standard')

            if (!error && data) {
                const map = {}
                data.forEach(row => {
                    if (row.game && typeof row.standard === 'number') {
                        map[row.game] = row.standard
                    }
                })
                setGameStandards(map)
            }
        } catch (e) {
            console.error('Failed to fetch game standards', e)
        }
    }

    const fetchGames = async () => {
        try {
            const { data, error } = await supabase
                .from('games')
                .select('name')
                .order('created_at', { ascending: true })

            if (!error && data) {
                const gameNames = data.map(row => row.name)
                setAvailableGames(gameNames)
            }
        } catch (e) {
            console.error('Failed to fetch games', e)
        }
    }

    useEffect(() => {
        if (!targetGame && availableGames.length > 0) {
            setTargetGame(availableGames[0])
        }
    }, [availableGames])

    useEffect(() => {
        fetchLeaderboard()
        fetchGameStandards()
        fetchGames()

        const leaderboardChannel = supabase
            .channel('public:leaderboard')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, () => {
                fetchLeaderboard()
            })
            .subscribe()

        const standardsChannel = supabase
            .channel('public:game_standards')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'game_standards' }, () => {
                fetchGameStandards()
            })
            .subscribe()

        const gamesChannel = supabase
            .channel('public:games')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => {
                fetchGames()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(leaderboardChannel)
            supabase.removeChannel(standardsChannel)
            supabase.removeChannel(gamesChannel)
        }
    }, [])

    // Fallback轮询，避免部分设备丢失实时推送
    useEffect(() => {
        const timer = setInterval(() => {
            fetchLeaderboard()
            fetchGameStandards()
            fetchGames()
        }, 10000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        const current = gameStandards[targetGame]
        if (typeof current === 'number') {
            setStandardInput(String(current))
        } else {
            setStandardInput('')
        }
    }, [targetGame, gameStandards])

    // Derived state for display
    const filteredLeaderboard = useMemo(() => {
        if (!targetGame) return leaderboard
        return leaderboard.filter(item => !item.game || item.game === targetGame)
    }, [leaderboard, targetGame])

    const top10 = useMemo(() => filteredLeaderboard.slice(0, 10), [filteredLeaderboard])

    const bestScore = useMemo(() => {
        if (filteredLeaderboard.length === 0) return null
        return filteredLeaderboard[0].score
    }, [filteredLeaderboard])

    const standardForCurrentGame = useMemo(() => {
        const value = gameStandards[targetGame]
        return typeof value === 'number' ? value : null
    }, [gameStandards, targetGame])

    const displayStandard = standardForCurrentGame ?? null

    const wheelGradient = useMemo(() => {
        if (availableGames.length === 0) return 'radial-gradient(circle at center, #111 0%, #111 100%)'
        const colors = ['#0ab9e6', '#ff3c28', '#ffc107', '#7c3aed', '#22c55e', '#f97316']
        const parts = availableGames.map((name, idx) => {
            const color = colors[idx % colors.length]
            const start = (idx / availableGames.length) * 100
            const end = ((idx + 1) / availableGames.length) * 100
            return `${color} ${start}%, ${color} ${end}%`
        })
        return `conic-gradient(${parts.join(',')})`
    }, [availableGames])

    const handleLogoClick = () => {
        setSecretCount(prev => {
            const newCount = prev + 1
            if (newCount >= 3) {
                setAdminOpen(true)
                return 0
            }
            return newCount
        })
        setTimeout(() => setSecretCount(0), 1000)
    }

    const handleAddGame = (e) => {
        e.preventDefault()
        if (newGameName && !availableGames.includes(newGameName)) {
            addGameToDatabase(newGameName)
            setNewGameName('')
            setIsAddingGame(false)
        }
    }

    const addGameToDatabase = async (gameName) => {
        const { error } = await supabase
            .from('games')
            .insert([{ name: gameName }])

        if (error) {
            alert('新增游戏失败: ' + error.message)
        }
    }

    const handleRemoveGame = async (name) => {
        if (confirm(`确定要删除游戏 "${name}" 吗？`)) {
            const { error } = await supabase
                .from('games')
                .delete()
                .eq('name', name)

            if (error) {
                alert('删除游戏失败: ' + error.message)
            }
        }
    }

    const handleAddScore = async (e) => {
        e.preventDefault()
        if (!playerName || !score) return

        setSubmitting(true)
        const { error } = await supabase
            .from('leaderboard')
            .insert([{
                player_name: playerName,
                score: parseFloat(score),
                game: targetGame
            }])

        setSubmitting(false)
        if (!error) {
            setPlayerName('')
            setScore('')
            fetchLeaderboard() // ensure immediate refresh
            alert('录入成功！')
        } else {
            alert('错误: ' + error.message)
        }
    }

    const handleSaveStandard = async (e) => {
        e.preventDefault()
        const numeric = standardInput === '' ? null : Number(standardInput)
        const payload = { game: targetGame, standard: numeric }

        const { error } = await supabase
            .from('game_standards')
            .upsert(payload, { onConflict: 'game' })

        if (error) {
            alert('更新达标线失败：' + error.message)
        } else {
            if (numeric === null) {
                alert('已清空达标线')
            } else {
                alert('达标线已更新')
            }
        }
    }

    const handleDeleteItem = async (id) => {
        if (confirm('确定要删除这条成绩吗？')) {
            const { error } = await supabase.from('leaderboard').delete().eq('id', id)
            if (error) alert(error.message)
        }
    }

    const handleClearBoard = async () => {
        if (confirm(`⚠️ 警告：确定要清空【${targetGame}】的所有数据吗？`)) {
            const { error } = await supabase
                .from('leaderboard')
                .delete()
                .eq('game', targetGame)

            if (error) alert(error.message)
        }
    }

    const handleSpin = () => {
        if (availableGames.length === 0 || spinning) return
        const winnerIndex = Math.floor(Math.random() * availableGames.length)
        const winnerName = availableGames[winnerIndex]
        const anglePer = 360 / availableGames.length
        const targetAngle = 360 * 5 + (360 - (winnerIndex * anglePer + anglePer / 2))

        setSpinning(true)
        setSpinWinner('')
        setSpinRotation(prev => prev + targetAngle)

        setTimeout(() => {
            setSpinning(false)
            setSpinWinner(winnerName)
            setTargetGame(winnerName)
        }, 4200)
    }

    return (
        <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=60&w=1280&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat font-sans selection:bg-neon-blue selection:text-black text-gray-100 overflow-hidden">
            <div className="absolute inset-0 bg-black/85"></div>

            <div className="relative z-10 px-6 py-6 h-screen flex flex-col max-w-[1920px] mx-auto">
                {/* Header */}
                <header className="flex justify-between items-center mb-6 shrink-0">
                    <div onClick={handleLogoClick} className="group cursor-pointer flex items-center gap-4">
                        <div className="bg-black/80 p-2 rounded-full border border-white/10 group-hover:border-neon-blue transition">
                            <Zap className="w-6 h-6 text-neon-blue" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black italic tracking-tighter uppercase text-white">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-red">Switch</span> 体验区
                            </h1>
                            <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
                                <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                ZONE A • LIVE
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setWheelOpen(true)}
                            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neon-blue text-neon-blue font-bold hover:bg-neon-blue/10 transition"
                        >
                            <Star className="w-4 h-4" /> 转盘随机
                        </button>
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-xs text-gray-500 uppercase tracking-widest">当前挑战</span>
                            <span className="text-xl font-bold text-neon-red glow-text shadow-neon-red">{targetGame}</span>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden min-h-0">

                    {/* LEFT: Rules (4 cols) */}
                    <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">

                        <Card glow="red" className="flex-none space-y-6">
                            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                <h2 className="text-2xl font-black text-white italic tracking-wider flex items-center gap-2">
                                    <Crown className="text-neon-red" /> 挑战福利
                                </h2>
                            </div>

                            <div className="space-y-4">
                                {/* Rule 1 */}
                                <div className="flex items-start gap-4 p-3 rounded-lg bg-white/5 border border-white/5">
                                    <div className="bg-blue-600/20 p-2 rounded text-neon-blue font-bold text-xl">1</div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">赢一把 (Win 1)</h3>
                                        <p className="text-sm text-gray-400">获得 <span className="text-white font-bold">“擂主”</span> 称号，暂无奖券，请继续守擂！</p>
                                    </div>
                                </div>

                                {/* Rule 2 */}
                                <div className="flex items-start gap-4 p-3 rounded-lg bg-white/5 border border-white/5 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-1 bg-neon-red/20 rounded-bl text-[10px] text-neon-red font-bold uppercase">Ticket</div>
                                    <div className="bg-red-600/20 p-2 rounded text-neon-red font-bold text-xl">2</div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">两连胜 (Win 2)</h3>
                                        <p className="text-sm text-gray-400">获得 <span className="text-neon-red font-bold">1 张抽奖券</span> 并强制退场，给其他人机会。</p>
                                    </div>
                                </div>

                                {/* Rule 3 */}
                                <div className="flex items-start gap-4 p-3 rounded-lg bg-white/5 border border-white/5">
                                    <div className="bg-yellow-600/20 p-2 rounded text-yellow-400 font-bold text-xl">★</div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">破纪录 (Best)</h3>
                                        <p className="text-sm text-gray-400">成绩只要超过“标准线”，直接获得 <span className="text-yellow-400 font-bold">额外奖券！</span></p>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Standard Time Display */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/60 border border-white/10 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                                <span className="text-xs text-gray-500 uppercase mb-1">达标及格线</span>
                                <span className="text-3xl font-mono font-bold text-white">
                                    {typeof displayStandard === 'number' ? `${displayStandard.toFixed(2)}s` : '--'}
                                </span>
                                <span className="text-[10px] text-gray-500 mt-1">后台配置·按游戏读取</span>
                            </div>
                            <div className="bg-black/60 border border-white/10 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                                <span className="text-xs text-gray-500 uppercase mb-1">全场最佳</span>
                                <span className="text-3xl font-mono font-bold text-neon-blue animate-pulse">
                                    {bestScore ? bestScore.toFixed(2) : '-.--'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Leaderboard (7 cols) */}
                    <div className="lg:col-span-7 h-full min-h-0">
                        <Card glow="blue" className="h-full flex flex-col p-0! bg-black/60!">
                            <div className="p-6 flex items-center justify-between border-b border-white/10 shrink-0 bg-black/20">
                                <div className="flex flex-col">
                                    <h3 className="text-2xl font-bold text-neon-blue uppercase flex items-center gap-2">
                                        <Trophy className="w-6 h-6" /> {targetGame}
                                    </h3>
                                    <span className="text-xs text-gray-500">实时排行榜 Top 10</span>
                                </div>
                                <div className="flex items-center gap-2 bg-neon-blue/10 px-3 py-1 rounded-full border border-neon-blue/20">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-blue opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-blue"></span>
                                    </span>
                                    <span className="text-xs font-bold text-neon-blue">实时更新</span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar space-y-1">
                                {top10.length === 0 ? (
                                    <div className="h-full flex flex-col gap-4 items-center justify-center text-gray-600 opacity-50">
                                        <Gamepad2 className="w-16 h-16" />
                                        <p className="text-lg">暂无数据 / 等待挑战者...</p>
                                    </div>
                                ) : (
                                    top10.map((entry, idx) => (
                                        <RankItem
                                            key={entry.id || idx}
                                            rank={idx + 1}
                                            name={entry.player_name}
                                            score={entry.score}
                                            game={targetGame}
                                        />
                                    ))
                                )}
                            </div>
                        </Card>
                    </div>
                </main>
            </div>

            {/* Admin Panel (Mobile Friendly) */}
            <button
                onClick={() => setWheelOpen(true)}
                className="sm:hidden fixed bottom-5 right-5 z-40 px-4 py-3 rounded-full bg-neon-blue text-black font-bold shadow-[0_10px_30px_rgba(10,185,230,0.35)] border border-neon-blue/60"
            >
                转盘随机
            </button>

            {adminOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
                    <div className="w-full sm:max-w-md bg-zinc-900 border-t sm:border border-zinc-700 p-6 rounded-t-2xl sm:rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setAdminOpen(false)}
                            className="absolute top-4 right-4 p-2 bg-zinc-800 rounded-full text-gray-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-neon-red/10 rounded-xl">
                                <Power className="text-neon-red w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">后台管理 (Admin)</h2>
                                <p className="text-xs text-gray-400">录入成绩 / 管理榜单</p>
                            </div>
                        </div>

                        {/* Game Selector */}
                        <div className="mb-6 space-y-2">
                            <label className="block text-xs uppercase text-gray-500 font-bold">当前游戏 (切换/新增)</label>
                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                {availableGames.map(mode => (
                                    <div key={mode} className="flex items-center gap-1 flex-none">
                                        <button
                                            onClick={() => setTargetGame(mode)}
                                            className={`px-4 py-2 text-sm font-bold rounded-lg border transition whitespace-nowrap ${targetGame === mode ? 'bg-neon-blue text-black border-neon-blue' : 'bg-black/50 text-gray-400 border-zinc-700'}`}
                                        >
                                            {mode}
                                        </button>
                                        <button
                                            onClick={() => handleRemoveGame(mode)}
                                            className="p-2 rounded-lg bg-black/40 border border-zinc-700 text-gray-500 hover:text-red-400 hover:border-red-400 transition"
                                            aria-label={`删除 ${mode}`}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => setIsAddingGame(true)}
                                    className="flex-none px-3 py-2 text-sm border border-zinc-700 rounded-lg text-gray-400 hover:border-white hover:text-white transition"
                                >
                                    + 新增
                                </button>
                            </div>

                            {isAddingGame && (
                                <form onSubmit={handleAddGame} className="flex gap-2 animate-in fade-in slide-in-from-top-1">
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="输入新游戏名称..."
                                        value={newGameName}
                                        onChange={(e) => setNewGameName(e.target.value)}
                                        className="flex-1 bg-black/80 border border-neon-blue rounded px-3 py-2 text-sm focus:outline-none"
                                    />
                                    <button className="bg-neon-blue text-black font-bold px-4 rounded text-sm">确定</button>
                                </form>
                            )}
                        </div>

                        {/* Standard Line Config */}
                        <form onSubmit={handleSaveStandard} className="mb-6 p-4 bg-white/5 rounded-xl border border-white/5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-200">达标及格线（秒）</h3>
                                    <p className="text-[11px] text-gray-500">为空表示无达标线；保存后实时同步。</p>
                                </div>
                                <span className="text-xs text-gray-500">{targetGame}</span>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    step="0.01"
                                    value={standardInput}
                                    onChange={e => setStandardInput(e.target.value)}
                                    className="flex-1 bg-black/60 border border-zinc-700 rounded-lg p-3 text-white font-mono focus:border-neon-blue focus:outline-none"
                                    placeholder="例如：45.00，留空则清除"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-neon-blue text-black font-bold rounded-lg hover:opacity-90"
                                >
                                    保存
                                </button>
                            </div>
                        </form>

                        <form onSubmit={handleAddScore} className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-4 mb-6">
                            <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                                <UserPlus size={16} /> 录入新成绩 ({targetGame})
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <input
                                        type="text"
                                        value={playerName}
                                        onChange={e => setPlayerName(e.target.value)}
                                        className="w-full bg-black/50 border border-zinc-600 rounded-lg p-3 text-white focus:border-neon-blue focus:outline-none transition"
                                        placeholder="玩家昵称"
                                    />
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={score}
                                        onChange={e => setScore(e.target.value)}
                                        className="w-full bg-black/50 border border-zinc-600 rounded-lg p-3 text-white font-mono focus:border-neon-blue focus:outline-none transition"
                                        placeholder="成绩(秒)"
                                    />
                                </div>
                            </div>
                            <button
                                disabled={submitting}
                                className="w-full bg-gradient-to-r from-neon-blue to-cyan-400 text-black font-bold py-3 rounded-lg hover:opacity-90 transition shadow-lg shadow-cyan-500/20"
                            >
                                {submitting ? '提交中...' : '确认录入'}
                            </button>
                        </form>

                        {/* Score List for Modification */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xs uppercase text-gray-500 font-bold">当前榜单数据 (可删除)</h3>
                                <button onClick={handleClearBoard} className="text-xs text-red-500 hover:text-red-400 underline">
                                    清空本游戏所有数据
                                </button>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto border border-zinc-700 rounded-lg">
                                {filteredLeaderboard.length === 0 && <div className="p-4 text-center text-gray-500 text-sm">暂无数据</div>}
                                {filteredLeaderboard.map((item, idx) => (
                                    <div key={item.id} className="flex justify-between items-center p-3 border-b border-zinc-800 bg-black/30 last:border-0 hover:bg-white/5">
                                        <div className="flex items-center gap-3">
                                            <span className={`font-mono w-6 text-center ${idx < 3 ? 'text-neon-blue font-bold' : 'text-gray-500'}`}>#{idx + 1}</span>
                                            <span>{item.player_name}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-mono text-neon-blue">{item.score.toFixed(2)}s</span>
                                            <button
                                                onClick={() => handleDeleteItem(item.id)}
                                                className="p-2 text-gray-500 hover:text-red-500 transition bg-white/5 rounded"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Wheel Modal */}
            {wheelOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
                    <div className="absolute top-4 right-4">
                        <button onClick={() => setWheelOpen(false)} className="p-2 bg-zinc-800 rounded-full text-gray-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="w-full max-w-4xl px-6">
                        <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-6 shadow-2xl">
                            <div className="flex flex-col sm:flex-row gap-6 items-center">
                                <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
                                    <div className="absolute -top-4 z-30 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[24px] border-b-neon-red drop-shadow-[0_0_10px_rgba(255,60,40,0.7)]"></div>
                                    <div
                                        className={`relative w-full h-full rounded-full border-[6px] border-white/15 shadow-[0_0_40px_rgba(0,0,0,0.55)] transition-transform duration-[4200ms] ease-out will-change-transform overflow-hidden bg-black/40`}
                                        style={{
                                            background: wheelGradient,
                                            transform: `rotate(${spinRotation}deg)`
                                        }}
                                    >
                                        <div className="absolute inset-4 rounded-full border border-white/10 backdrop-blur-[2px]"></div>
                                        {availableGames.length > 0 && availableGames.map((game, idx) => {
                                            const angle = (360 / availableGames.length) * idx
                                            return (
                                                <div
                                                    key={game}
                                                    className="absolute inset-0 flex items-start justify-center"
                                                    style={{ transform: `rotate(${angle}deg)` }}
                                                >
                                                    <div className="translate-y-3/4 -rotate-[var(--r,0deg)] text-center w-20 text-[12px] font-bold text-white/90 drop-shadow-md" style={{ ['--r']: `${angle}deg` }}>
                                                        <div className="px-2 py-1 rounded-lg bg-black/60 border border-white/10">
                                                            {game}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-20 h-20 rounded-full bg-black/85 border border-white/20 flex flex-col items-center justify-center text-center px-2 shadow-[0_0_25px_rgba(0,0,0,0.6)]">
                                                <span className="text-[11px] text-gray-500">随机游戏</span>
                                                <span className="text-lg font-bold text-white">Spin</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 space-y-4 w-full">
                                    <div className="flex items-center gap-2">
                                        <Star className="text-neon-blue" />
                                        <h3 className="text-xl font-bold">随机选择下一轮游戏</h3>
                                    </div>
                                    <p className="text-sm text-gray-400">点击“开始转动”后将随机选择一个游戏，并自动切换到该游戏，方便继续录入达标线和成绩。</p>

                                    <div className="flex flex-wrap gap-2 text-sm">
                                        {availableGames.map(game => (
                                            <span key={game} className={`px-3 py-1 rounded-full border ${game === targetGame ? 'border-neon-blue text-neon-blue' : 'border-white/10 text-gray-300'}`}>
                                                {game}
                                            </span>
                                        ))}
                                        {availableGames.length === 0 && (
                                            <span className="text-gray-500">请先在后台添加游戏</span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleSpin}
                                            disabled={availableGames.length === 0 || spinning}
                                            className={`px-5 py-3 rounded-lg font-bold ${spinning ? 'bg-gray-700 text-gray-400' : 'bg-neon-blue text-black hover:opacity-90'} transition`}
                                        >
                                            {spinning ? '转动中...' : '开始转动'}
                                        </button>
                                        {spinWinner && (
                                            <span className="text-sm text-gray-300">本轮结果：<span className="text-neon-red font-bold">{spinWinner}</span></span>
                                        )}
                                    </div>

                                    <p className="text-xs text-gray-500">提示：可在后台管理中新增/删除游戏，转盘会实时更新。</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default App
