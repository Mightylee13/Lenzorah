import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Clock, RefreshCw, CheckCircle2,
  Calendar, Shield, CalendarDays, Loader2, Info
} from 'lucide-react';
import { cn } from '../utils/cn';

export default function Sports() {
  const [activeTab, setActiveTab] = useState<'live' | 'standings'>('live');
  const [scoresSubTab, setScoresSubTab] = useState<'live' | 'past'>('live');
  const [standingsSubTab, setStandingsSubTab] = useState<'nba' | 'nfl' | 'soccer'>('soccer');
  
  // API states initialized completely empty
  const [liveScores, setLiveScores] = useState<any[]>([]);
  const [pastScores, setPastScores] = useState<any[]>([]);
  const [standings, setStandings] = useState<any>({
    soccer: [],
    nba: [],
    nfl: []
  });
  
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial APIs
  useEffect(() => {
    fetchSportsData();
  }, []);

  const normalizeScoreItem = (item: any, idx: number, defaultStatus = 'LIVE', defaultSport = 'Soccer') => {
    const homeTeam = item.homeTeam || item.home || 'Home Team';
    const awayTeam = item.awayTeam || item.away || 'Away Team';
    
    // Parse scores safely from strings like "2 - 1" or separate fields
    let homeScore = 0;
    let awayScore = 0;
    
    if (item.homeScore !== undefined && item.homeScore !== null) {
      homeScore = Number(item.homeScore);
    } else if (item.score && typeof item.score === 'string') {
      homeScore = Number(item.score.split('-')[0]) || 0;
    }

    if (item.awayScore !== undefined && item.awayScore !== null) {
      awayScore = Number(item.awayScore);
    } else if (item.score && typeof item.score === 'string') {
      awayScore = Number(item.score.split('-')[1]) || 0;
    }

    return {
      id: item.id || `${defaultStatus.toLowerCase()}-${idx}`,
      sport: item.sport || defaultSport,
      league: item.league || item.competition || `${defaultSport} League`,
      homeTeam,
      homeLogo: item.homeLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(homeTeam)}&background=1e293b&color=38bdf8&bold=true`,
      awayTeam,
      awayLogo: item.awayLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(awayTeam)}&background=1e293b&color=f43f5e&bold=true`,
      homeScore,
      awayScore,
      status: item.status || defaultStatus,
      time: item.time || item.matchTime || (defaultStatus === 'LIVE' ? "75'" : "FT"),
      venue: item.venue || item.stadium || 'Arena Stadium',
      eventInfo: item.eventInfo || item.description || '',
      date: item.date || item.matchDate || (defaultStatus === 'FINISHED' ? 'Completed' : undefined)
    };
  };

  const fetchSportsData = async () => {
    setIsLoading(true);
    
    // Reset states so we are completely clean
    setLiveScores([]);
    setPastScores([]);
    setStandings({ soccer: [], nba: [], nfl: [] });

    try {
      // 1. Fetch Live Scores
      try {
        const liveRes = await fetch('https://apis.davidcyril.name.ng/sports/live');
        if (liveRes.ok) {
          const liveData = await liveRes.json();
          if (Array.isArray(liveData) && liveData.length > 0) {
            setLiveScores(liveData.map((item: any, idx: number) => normalizeScoreItem(item, idx, 'LIVE')));
          }
        }
      } catch (err) {
        console.error("Failed to fetch live scores:", err);
      }

      // 2. Fetch Recent Past Results (Soccer, NBA, NFL Scores)
      const pastResults: any[] = [];
      
      // Fetch Soccer scores
      try {
        const soccerRes = await fetch('https://apis.davidcyril.name.ng/sports/soccer/scores');
        if (soccerRes.ok) {
          const soccerData = await soccerRes.json();
          if (Array.isArray(soccerData)) {
            pastResults.push(...soccerData.slice(0, 10).map((item: any, idx: number) => normalizeScoreItem(item, idx, 'FINISHED', 'Soccer')));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch soccer scores:", err);
      }

      // Fetch NBA scores
      try {
        const nbaRes = await fetch('https://apis.davidcyril.name.ng/sports/nba/scores');
        if (nbaRes.ok) {
          const nbaData = await nbaRes.json();
          if (Array.isArray(nbaData)) {
            pastResults.push(...nbaData.slice(0, 10).map((item: any, idx: number) => normalizeScoreItem(item, idx, 'FINISHED', 'NBA')));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch nba scores:", err);
      }

      // Fetch NFL scores
      try {
        const nflRes = await fetch('https://apis.davidcyril.name.ng/sports/nfl/scores');
        if (nflRes.ok) {
          const nflData = await nflRes.json();
          if (Array.isArray(nflData)) {
            pastResults.push(...nflData.slice(0, 10).map((item: any, idx: number) => normalizeScoreItem(item, idx, 'FINISHED', 'NFL')));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch nfl scores:", err);
      }

      if (pastResults.length > 0) {
        setPastScores(pastResults);
      }

      // 3. Fetch Standings
      // Soccer Standings
      try {
        const soccerStandRes = await fetch('https://apis.davidcyril.name.ng/sports/soccer/standings');
        if (soccerStandRes.ok) {
          const soccerData = await soccerStandRes.json();
          if (Array.isArray(soccerData)) {
            setStandings((prev: any) => ({
              ...prev,
              soccer: soccerData.map((team: any, idx: number) => ({
                rank: team.rank || team.position || (idx + 1),
                name: team.name || team.teamName || 'Team',
                played: team.played || team.matchesPlayed || 38,
                wins: team.wins || 0,
                draws: team.draws || 0,
                losses: team.losses || 0,
                points: team.points || team.pts || 0,
                gd: team.gd || team.goalDifference || '0',
                form: team.form || 'W-D-L'
              }))
            }));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch soccer standings:", err);
      }

      // NBA Standings
      try {
        const nbaStandRes = await fetch('https://apis.davidcyril.name.ng/sports/nba/standings');
        if (nbaStandRes.ok) {
          const nbaData = await nbaStandRes.json();
          if (Array.isArray(nbaData)) {
            setStandings((prev: any) => ({
              ...prev,
              nba: nbaData.map((team: any, idx: number) => ({
                rank: team.rank || team.position || (idx + 1),
                name: team.name || team.teamName || 'Team',
                conference: team.conference || 'Eastern',
                wins: team.wins || 0,
                losses: team.losses || 0,
                pct: team.pct || team.winPercentage || '.000',
                streak: team.streak || '-',
                diff: team.diff || team.gamesBehind || '-'
              }))
            }));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch nba standings:", err);
      }

      // NFL Standings
      try {
        const nflStandRes = await fetch('https://apis.davidcyril.name.ng/sports/nfl/standings');
        if (nflStandRes.ok) {
          const nflData = await nflStandRes.json();
          if (Array.isArray(nflData)) {
            setStandings((prev: any) => ({
              ...prev,
              nfl: nflData.map((team: any, idx: number) => ({
                rank: team.rank || team.position || (idx + 1),
                name: team.name || team.teamName || 'Team',
                division: team.division || 'AFC East',
                wins: team.wins || 0,
                losses: team.losses || 0,
                pct: team.pct || team.winPercentage || '.000',
                streak: team.streak || '-',
                pf: team.pf || team.pointsFor || 0
              }))
            }));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch nfl standings:", err);
      }

    } catch (e) {
      console.error("General sports data fetching error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const activeScores = scoresSubTab === 'live' ? liveScores : pastScores;

  return (
    <div className="min-h-screen bg-[var(--rf-black)] pt-4 pb-20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
        
        {/* ============ TOP SPORTING BANNER ============ */}
        <div className="relative rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border border-white/[0.05] shadow-2xl mb-8 group bg-gradient-to-r from-emerald-950/20 via-black to-zinc-950">
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--rf-black)] via-transparent to-black/40 z-[2]" />
          
          {/* Glowing Ambient */}
          <div className="absolute top-0 right-0 w-72 sm:w-96 h-72 sm:h-96 bg-emerald-500/10 blur-[100px] rounded-full opacity-50 pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-60 sm:w-80 h-60 sm:h-80 bg-emerald-600/5 blur-[80px] rounded-full opacity-35 pointer-events-none" />

          {/* Action Contents */}
          <div className="relative z-10 p-6 sm:p-8 md:p-12 flex flex-col justify-between min-h-[250px] sm:min-h-[300px]">
            <div>
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-emerald-400 text-xs font-bold w-fit mb-4 uppercase tracking-widest">
                <Shield size={12} className="text-emerald-400" /> RUNFlix Sports Center Live
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight text-white mb-3 max-w-2xl leading-none">
                Experience the Thrill of <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Live Athletics</span>
              </h1>
              <p className="text-xs sm:text-sm text-[var(--rf-text-muted)] max-w-md leading-relaxed">
                Stay updated with absolute real-time live scores, recent match history records, and comprehensive standings tables fetched directly from active APIs!
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 mt-8">
              <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-white/50 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5">
                <CheckCircle2 size={12} className="text-emerald-400" />
                <span>Live Matches & Results</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-white/50 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5">
                <CheckCircle2 size={12} className="text-emerald-400" />
                <span>Soccer, NBA, NFL Stats</span>
              </div>
              <button 
                onClick={fetchSportsData}
                disabled={isLoading}
                className="ml-auto text-[10px] sm:text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 bg-emerald-500/5 border border-emerald-500/15 py-1.5 px-3.5 rounded-xl transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw size={11} className={cn(isLoading && "animate-spin")} />
                Refresh Data
              </button>
            </div>
          </div>
        </div>

        {/* ============ NAVIGATION TABS (Strictly Only Live Scores and Standings) ============ */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-white/5 pb-4 mb-6 gap-4">
          <div className="grid grid-cols-2 bg-white/[0.02] border border-white/5 rounded-2xl p-1 gap-1 w-full sm:w-fit">
            <button
              onClick={() => setActiveTab('live')}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                activeTab === 'live' 
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/15" 
                  : "text-white/60 hover:text-white"
              )}
            >
              <Clock size={14} /> Matches & Results
            </button>
            <button
              onClick={() => setActiveTab('standings')}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                activeTab === 'standings' 
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/15" 
                  : "text-white/60 hover:text-white"
              )}
            >
              <Trophy size={14} /> Standings
            </button>
          </div>
        </div>

        {/* ============ TAB VIEW CONTAINERS ============ */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="animate-spin text-emerald-400" />
            <span className="text-xs font-bold text-white/50 tracking-wider uppercase">Loading live sports stats...</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* ============ TAB 1: LIVE & PAST SCORES ============ */}
            {activeTab === 'live' && (
              <motion.div
                key="live-scores-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Secondary Navigation for Live vs Past Scores */}
                <div className="flex bg-white/[0.02] border border-white/5 p-1 rounded-xl w-fit gap-1">
                  <button
                    onClick={() => setScoresSubTab('live')}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
                      scoresSubTab === 'live' 
                        ? "bg-rose-500/15 text-rose-400 border border-rose-500/25" 
                        : "text-white/50 hover:text-white border border-transparent"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    Live Matches
                  </button>
                  <button
                    onClick={() => setScoresSubTab('past')}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
                      scoresSubTab === 'past' 
                        ? "bg-white/10 text-white border border-white/10" 
                        : "text-white/50 hover:text-white border border-transparent"
                    )}
                  >
                    <CalendarDays size={12} />
                    Recent Results
                  </button>
                </div>

                {/* Match Card Grid / Empty State */}
                {activeScores.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {activeScores.map((score, index) => (
                      <div 
                        key={score.id || index}
                        className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-4 sm:p-5 hover:border-emerald-500/20 transition-all duration-300 relative group overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                        {/* Header Row */}
                        <div className="flex justify-between items-center mb-4 sm:mb-5 pb-3 border-b border-white/5">
                          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1">
                            🏁 {score.league || 'League Match'}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            {score.date && (
                              <span className="text-[8px] sm:text-[9px] font-bold text-white/30 uppercase">
                                {score.date}
                              </span>
                            )}
                            <span className={cn(
                              "text-[8px] sm:text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider",
                              score.status === 'LIVE' 
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse" 
                                : "bg-white/5 text-white/50 border border-white/5"
                            )}>
                              {score.status === 'LIVE' ? `● ${score.status} • ${score.time}` : score.status}
                            </span>
                          </div>
                        </div>

                        {/* Teams vs Scores Grid */}
                        <div className="grid grid-cols-7 items-center justify-center gap-1 sm:gap-2 mb-4 text-center">
                          
                          {/* Home Team */}
                          <div className="col-span-3 flex flex-col items-center justify-center gap-1.5 sm:gap-2 min-w-0">
                            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-lg p-1">
                              <img 
                                src={score.homeLogo} 
                                alt={score.homeTeam} 
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(score.homeTeam)}&background=1a1a2e&color=fff&size=64&bold=true`;
                                }}
                              />
                            </div>
                            <h4 className="text-[11px] sm:text-xs md:text-sm font-bold text-white truncate w-full">{score.homeTeam}</h4>
                          </div>

                          {/* SCORE MIDDLE CARD */}
                          <div className="col-span-1 flex flex-col items-center justify-center">
                            <div className="flex items-center gap-0.5 sm:gap-1">
                              <span className="text-lg sm:text-xl md:text-3xl font-black text-white">{score.homeScore}</span>
                              <span className="text-[10px] sm:text-xs text-white/30 font-bold">:</span>
                              <span className="text-lg sm:text-xl md:text-3xl font-black text-white">{score.awayScore}</span>
                            </div>
                            <span className="text-[7px] sm:text-[8px] text-white/40 uppercase tracking-widest mt-1 block">VS</span>
                          </div>

                          {/* Away Team */}
                          <div className="col-span-3 flex flex-col items-center justify-center gap-1.5 sm:gap-2 min-w-0">
                            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-lg p-1">
                              <img 
                                src={score.awayLogo} 
                                alt={score.awayTeam} 
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(score.awayTeam)}&background=1a1a2e&color=fff&size=64&bold=true`;
                                }}
                              />
                            </div>
                            <h4 className="text-[11px] sm:text-xs md:text-sm font-bold text-white truncate w-full">{score.awayTeam}</h4>
                          </div>
                        </div>

                        {/* Venue and Live Event updates */}
                        {score.eventInfo && (
                          <div className="bg-white/[0.01] border border-white/[0.03] p-2.5 sm:p-3 rounded-2xl flex items-start gap-2 mt-4 text-[9px] sm:text-[10px] md:text-xs text-[var(--rf-text-muted)] leading-relaxed">
                            <span className="text-emerald-400 font-bold uppercase shrink-0 tracking-wider">Info:</span>
                            <p className="flex-1">{score.eventInfo} • <span className="text-white/40 italic">{score.venue || 'Arena'}</span></p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white/[0.01] border border-white/5 rounded-3xl">
                    <Calendar className="mx-auto text-[var(--rf-text-muted)] mb-3" size={32} />
                    <h3 className="text-base font-bold text-white mb-1.5">No Matches Scheduled</h3>
                    <p className="text-xs text-[var(--rf-text-muted)] max-w-xs mx-auto leading-relaxed">
                      There are currently no {scoresSubTab === 'live' ? 'active live' : 'recent completed'} matches returned by the API scheduler.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ============ TAB 2: STANDINGS ============ */}
            {activeTab === 'standings' && (
              <motion.div
                key="standings-tab-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Standings sub tabs */}
                <div className="flex bg-white/[0.02] border border-white/5 p-1 rounded-xl w-fit gap-1 flex-wrap">
                  <button
                    onClick={() => setStandingsSubTab('soccer')}
                    className={cn(
                      "px-3.5 sm:px-4 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all",
                      standingsSubTab === 'soccer' ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
                    )}
                  >
                    Soccer
                  </button>
                  <button
                    onClick={() => setStandingsSubTab('nba')}
                    className={cn(
                      "px-3.5 sm:px-4 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all",
                      standingsSubTab === 'nba' ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
                    )}
                  >
                    NBA Basketball
                  </button>
                  <button
                    onClick={() => setStandingsSubTab('nfl')}
                    className={cn(
                      "px-3.5 sm:px-4 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all",
                      standingsSubTab === 'nfl' ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
                    )}
                  >
                    NFL Football
                  </button>
                </div>

                {/* If standings data exists */}
                {standings[standingsSubTab] && standings[standingsSubTab].length > 0 ? (
                  <>
                    {/* ==========================================
                        MOBILE LAYOUT: CUSTOM SPECIFICATION CARDS
                        (No Table, Shows Everything Beautifully!)
                       ========================================== */}
                    <div className="block md:hidden space-y-4">
                      {standings[standingsSubTab].map((team: any, index: number) => (
                        <div 
                          key={index}
                          className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-4.5 space-y-3.5 relative overflow-hidden"
                        >
                          {/* Glowing Rank Badge */}
                          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/[0.02] rounded-bl-[2rem] border-l border-b border-white/5 flex items-center justify-center">
                            <span className="text-xs font-black text-white/40">#{team.rank}</span>
                          </div>

                          {/* Team Profile Row */}
                          <div className="flex items-center gap-3">
                            <img 
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(team.name)}&background=1e293b&color=e50914&bold=true&size=64`}
                              alt=""
                              className="w-8 h-8 rounded-full border border-white/10 p-0.5" 
                            />
                            <div>
                              <h4 className="text-sm font-black text-white leading-none">{team.name}</h4>
                              {team.conference && (
                                <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider block mt-1">
                                  {team.conference} Conf
                                </span>
                              )}
                              {team.division && (
                                <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider block mt-1">
                                  {team.division}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Dynamic Details Stats Badges */}
                          <div className="grid grid-cols-3 gap-2.5 pt-2">
                            {standingsSubTab === 'soccer' && (
                              <>
                                <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-2 text-center">
                                  <span className="text-[8px] font-bold text-[var(--rf-text-dim)] uppercase block mb-0.5">Played</span>
                                  <span className="text-xs font-black text-white">{team.played}</span>
                                </div>
                                <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-2 text-center">
                                  <span className="text-[8px] font-bold text-green-400 uppercase block mb-0.5">W - D - L</span>
                                  <span className="text-xs font-black text-white">{team.wins} - {team.draws} - {team.losses}</span>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-2 text-center">
                                  <span className="text-[8px] font-black text-emerald-400 uppercase block mb-0.5">Points</span>
                                  <span className="text-xs font-black text-emerald-400">{team.points} <span className="text-[9px] text-white/30 font-medium">({team.gd})</span></span>
                                </div>
                              </>
                            )}

                            {standingsSubTab === 'nba' && (
                              <>
                                <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-2 text-center">
                                  <span className="text-[8px] font-bold text-[var(--rf-text-dim)] uppercase block mb-0.5">Record</span>
                                  <span className="text-xs font-black text-white">{team.wins}W - {team.losses}L</span>
                                </div>
                                <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-2 text-center">
                                  <span className="text-[8px] font-bold text-[var(--rf-text-dim)] uppercase block mb-0.5">Win %</span>
                                  <span className="text-xs font-black text-white">{team.pct}</span>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-2 text-center">
                                  <span className="text-[8px] font-black text-emerald-400 uppercase block mb-0.5">Streak</span>
                                  <span className="text-xs font-black text-emerald-400">{team.streak} <span className="text-[9px] text-white/30 font-medium">({team.diff} GB)</span></span>
                                </div>
                              </>
                            )}

                            {standingsSubTab === 'nfl' && (
                              <>
                                <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-2 text-center">
                                  <span className="text-[8px] font-bold text-[var(--rf-text-dim)] uppercase block mb-0.5">Record</span>
                                  <span className="text-xs font-black text-white">{team.wins} - {team.losses}</span>
                                </div>
                                <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-2 text-center">
                                  <span className="text-[8px] font-bold text-[var(--rf-text-dim)] uppercase block mb-0.5">Points For</span>
                                  <span className="text-xs font-black text-white">{team.pf}</span>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-2 text-center">
                                  <span className="text-[8px] font-black text-emerald-400 uppercase block mb-0.5">Streak</span>
                                  <span className="text-xs font-black text-emerald-400">{team.streak} <span className="text-[9px] text-white/30 font-medium">({team.pct})</span></span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ==========================================
                        DESKTOP LAYOUT: CLEAN TABULAR VIEW
                       ========================================== */}
                    <div className="hidden md:block bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden shadow-2xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/[0.03] border-b border-white/5 text-[9px] font-black uppercase tracking-wider text-[var(--rf-text-dim)]">
                            <th className="py-4.5 px-6 w-16 text-center">Rank</th>
                            <th className="py-4.5 px-2">Team Name</th>
                            {standingsSubTab === 'soccer' && (
                              <>
                                <th className="py-4.5 px-4 text-center">Played</th>
                                <th className="py-4.5 px-4 text-center">Wins</th>
                                <th className="py-4.5 px-4 text-center">Draws</th>
                                <th className="py-4.5 px-4 text-center">Losses</th>
                                <th className="py-4.5 px-4 text-center">GD</th>
                                <th className="py-4.5 px-6 text-center text-emerald-400">Points</th>
                              </>
                            )}
                            {standingsSubTab === 'nba' && (
                              <>
                                <th className="py-4.5 px-4 text-center">Conference</th>
                                <th className="py-4.5 px-4 text-center">Wins</th>
                                <th className="py-4.5 px-4 text-center">Losses</th>
                                <th className="py-4.5 px-4 text-center">Win %</th>
                                <th className="py-4.5 px-4 text-center">GB</th>
                                <th className="py-4.5 px-6 text-center text-emerald-400">Streak</th>
                              </>
                            )}
                            {standingsSubTab === 'nfl' && (
                              <>
                                <th className="py-4.5 px-4 text-center">Division</th>
                                <th className="py-4.5 px-4 text-center">Wins</th>
                                <th className="py-4.5 px-4 text-center">Losses</th>
                                <th className="py-4.5 px-4 text-center">Win %</th>
                                <th className="py-4.5 px-4 text-center font-semibold">PF</th>
                                <th className="py-4.5 px-6 text-center text-emerald-400">Streak</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {standings[standingsSubTab].map((team: any, index: number) => (
                            <tr 
                              key={index}
                              className="border-b border-white/[0.03] text-xs hover:bg-white/[0.01] transition-colors"
                            >
                              <td className="py-4 px-6 text-center font-bold text-white/50">{team.rank}</td>
                              <td className="py-4 px-2 font-bold text-white flex items-center gap-2">
                                <img 
                                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(team.name)}&background=1e293b&color=e50914&bold=true`}
                                  alt=""
                                  className="w-5 h-5 rounded-full overflow-hidden" 
                                />
                                <span>{team.name}</span>
                              </td>
                              
                              {standingsSubTab === 'soccer' && (
                                <>
                                  <td className="py-4 px-4 text-center text-white/70">{team.played}</td>
                                  <td className="py-4 px-4 text-center text-white/70">{team.wins}</td>
                                  <td className="py-4 px-4 text-center text-white/70">{team.draws}</td>
                                  <td className="py-4 px-4 text-center text-white/70">{team.losses}</td>
                                  <td className="py-4 px-4 text-center text-white/50">{team.gd}</td>
                                  <td className="py-4 px-6 text-center font-black text-emerald-400 bg-emerald-500/[0.02]">{team.points}</td>
                                </>
                              )}
                              {standingsSubTab === 'nba' && (
                                <>
                                  <td className="py-4 px-4 text-center text-white/50 font-bold">{team.conference}</td>
                                  <td className="py-4 px-4 text-center text-white/70">{team.wins}</td>
                                  <td className="py-4 px-4 text-center text-white/70">{team.losses}</td>
                                  <td className="py-4 px-4 text-center text-white/70">{team.pct}</td>
                                  <td className="py-4 px-4 text-center text-white/50">{team.diff}</td>
                                  <td className="py-4 px-6 text-center font-black text-emerald-400 bg-emerald-500/[0.02]">{team.streak}</td>
                                </>
                              )}
                              {standingsSubTab === 'nfl' && (
                                <>
                                  <td className="py-4 px-4 text-center text-white/50 font-bold">{team.division}</td>
                                  <td className="py-4 px-4 text-center text-white/70">{team.wins}</td>
                                  <td className="py-4 px-4 text-center text-white/70">{team.losses}</td>
                                  <td className="py-4 px-4 text-center text-white/70">{team.pct}</td>
                                  <td className="py-4 px-4 text-center text-white/70 font-semibold">{team.pf}</td>
                                  <td className="py-4 px-6 text-center font-black text-emerald-400 bg-emerald-500/[0.02]">{team.streak}</td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16 bg-white/[0.01] border border-white/5 rounded-3xl">
                    <Info className="mx-auto text-[var(--rf-text-muted)] mb-3" size={32} />
                    <h3 className="text-base font-bold text-white mb-1.5">No Standings Data</h3>
                    <p className="text-xs text-[var(--rf-text-muted)] max-w-xs mx-auto leading-relaxed">
                      Standings information is currently not returned by the API servers for this sports league.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
