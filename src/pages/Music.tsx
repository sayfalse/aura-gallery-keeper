import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ModuleSwitcher from "@/components/ModuleSwitcher";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Play, Pause, SkipBack, SkipForward, Heart, Music2,
  Shuffle, Repeat, Volume2, VolumeX, ChevronDown, ListMusic, Home, Library, Disc3
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  Song, searchSongs, getTrendingSongs, getSongSuggestions,
  addToHistory, getHistory, getFavorites, addToFavorites, removeFromFavorites, isFavorite
} from "@/lib/musicService";
import { toast } from "sonner";

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

type Tab = "home" | "search" | "library";

const MusicPage = () => {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement>(null);

  const [tab, setTab] = useState<Tab>("home");
  const [libraryTab, setLibraryTab] = useState<"favorites" | "history">("favorites");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [trending, setTrending] = useState<Song[]>([]);
  const [favorites, setFavoritesList] = useState<Song[]>([]);
  const [history, setHistoryList] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [current, setCurrent] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("off");
  const [expanded, setExpanded] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [suggestions, setSuggestions] = useState<Song[]>([]);

  useEffect(() => { getTrendingSongs().then(setTrending); }, []);

  useEffect(() => {
    if (user) {
      getFavorites(user.id).then(setFavoritesList);
      getHistory(user.id).then(setHistoryList);
    }
  }, [tab, user]);

  useEffect(() => {
    if (current && user) isFavorite(user.id, current.id).then(setIsFav);
  }, [current, user]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    const songs = await searchSongs(query);
    setResults(songs);
    setLoading(false);
  };

  const playSong = useCallback(async (song: Song, list?: Song[], idx?: number) => {
    if (!song.url) { toast.error("Song not available"); return; }
    
    // Start playback immediately in user gesture context
    const audio = audioRef.current;
    if (audio) {
      audio.src = song.url;
      audio.volume = muted ? 0 : volume / 100;
      try {
        await audio.play();
      } catch (err) {
        console.warn("Playback failed, retrying:", err);
        // Retry once
        setTimeout(() => audio.play().catch(() => {}), 100);
      }
    }
    
    setCurrent(song);
    if (list) { setQueue(list); setQueueIndex(idx ?? 0); }
    setPlaying(true);
    setExpanded(true);
    if (user) addToHistory(user.id, song);
    getSongSuggestions(song.id).then(setSuggestions);
  }, [user, muted, volume]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume / 100;
  }, [volume, muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setProgress(audio.currentTime);
    const onDur = () => setDuration(audio.duration || 0);
    const onEnd = () => {
      if (repeat === "one") { audio.currentTime = 0; audio.play(); }
      else playNext();
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDur);
    audio.addEventListener("ended", onEnd);
    return () => { audio.removeEventListener("timeupdate", onTime); audio.removeEventListener("loadedmetadata", onDur); audio.removeEventListener("ended", onEnd); };
  }, [repeat, queue, queueIndex, shuffle]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause(); else audioRef.current.play();
    setPlaying(!playing);
  };

  const seek = (val: number[]) => { if (audioRef.current) audioRef.current.currentTime = val[0]; };

  const playNext = () => {
    if (queue.length === 0) return;
    let nextIdx: number;
    if (shuffle) { nextIdx = Math.floor(Math.random() * queue.length); }
    else { nextIdx = queueIndex + 1; if (nextIdx >= queue.length) { if (repeat === "all") nextIdx = 0; else { setPlaying(false); return; } } }
    setQueueIndex(nextIdx);
    playSong(queue[nextIdx], queue, nextIdx);
  };

  const playPrev = () => {
    if (audioRef.current && audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return; }
    if (queue.length === 0) return;
    const prevIdx = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
    setQueueIndex(prevIdx);
    playSong(queue[prevIdx], queue, prevIdx);
  };

  const toggleFav = async () => {
    if (!user || !current) return;
    if (isFav) { await removeFromFavorites(user.id, current.id); setIsFav(false); toast.success("Removed from Liked Songs 💔"); }
    else { await addToFavorites(user.id, current); setIsFav(true); toast.success("Added to Liked Songs 💚"); }
  };

  const SongCard = ({ song, list, idx }: { song: Song; list: Song[]; idx: number }) => (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: idx * 0.03 }}
      onClick={() => playSong(song, list, idx)}
      className="flex flex-col gap-2 min-w-[140px] max-w-[160px]"
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-muted shadow-lg group">
        {song.image ? (
          <img src={song.image} alt={song.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-accent"><Music2 className="w-8 h-8 text-muted-foreground" /></div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-end p-2">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
            <Play className="w-4 h-4 text-primary-foreground ml-0.5" />
          </div>
        </div>
        {current?.id === song.id && playing && (
          <div className="absolute top-2 left-2 flex gap-0.5 items-end">
            {[1,2,3].map(i => <div key={i} className="w-[3px] bg-primary rounded-full animate-pulse" style={{ height: `${6+i*4}px`, animationDelay: `${i*0.15}s` }} />)}
          </div>
        )}
      </div>
      <div className="px-1">
        <p className={`text-[13px] font-semibold truncate ${current?.id === song.id ? "text-primary" : "text-foreground"}`}>{song.name}</p>
        <p className="text-[11px] text-muted-foreground truncate">{song.artist}</p>
      </div>
    </motion.button>
  );

  const SongRow = ({ song, list, idx }: { song: Song; list: Song[]; idx: number }) => (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.02 }}
      onClick={() => playSong(song, list, idx)}
      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all active:scale-[0.98] group ${
        current?.id === song.id ? "bg-primary/10" : "hover:bg-accent/60"
      }`}
    >
      <span className="text-xs text-muted-foreground w-5 text-center font-medium">{idx + 1}</span>
      <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-muted shrink-0">
        {song.image ? <img src={song.image} alt={song.name} className="w-full h-full object-cover" /> : <Music2 className="w-5 h-5 m-auto text-muted-foreground" />}
        {current?.id === song.id && playing && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="flex gap-0.5 items-end">{[1,2,3].map(i => <div key={i} className="w-[2px] bg-white rounded-full animate-pulse" style={{ height: `${5+i*3}px`, animationDelay: `${i*0.15}s` }} />)}</div>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className={`text-sm font-medium truncate ${current?.id === song.id ? "text-primary" : "text-foreground"}`}>{song.name}</p>
        <p className="text-[11px] text-muted-foreground truncate">{song.artist}{song.album ? ` · ${song.album}` : ""}</p>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Play className="w-4 h-4 text-muted-foreground" />
      </div>
      {song.duration > 0 && <span className="text-[11px] text-muted-foreground tabular-nums">{formatTime(song.duration)}</span>}
    </motion.button>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <audio ref={audioRef} preload="auto" />

      {/* Content Area */}
      <main className={`flex-1 overflow-y-auto ${current ? "pb-44" : "pb-28"}`}>
        {/* HOME TAB */}
        {tab === "home" && (
          <div className="px-5 pt-[env(safe-area-inset-top)]">
            {/* Greeting */}
            <div className="py-5">
              <h1 className="text-2xl font-bold text-foreground">
                {new Date().getHours() < 12 ? "Good Morning ☀️" : new Date().getHours() < 18 ? "Good Afternoon 🎵" : "Good Evening 🌙"}
              </h1>
            </div>

            {/* Quick picks - horizontal cards */}
            {trending.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-foreground">Trending Now 🔥</h2>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-4 -mx-5 px-5 scrollbar-hide">
                  {trending.slice(0, 10).map((s, i) => <SongCard key={s.id + i} song={s} list={trending} idx={i} />)}
                </div>
              </>
            )}

            {/* Recently played */}
            {history.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-bold text-foreground mb-3">Recently Played ⏱️</h2>
                <div className="flex gap-3 overflow-x-auto pb-4 -mx-5 px-5 scrollbar-hide">
                  {history.slice(0, 10).map((s, i) => <SongCard key={s.id + i} song={s} list={history} idx={i} />)}
                </div>
              </div>
            )}

            {/* Made for you */}
            {trending.length > 10 && (
              <div className="mt-6">
                <h2 className="text-lg font-bold text-foreground mb-3">Made For You ✨</h2>
                <div className="space-y-1">
                  {trending.slice(10, 20).map((s, i) => <SongRow key={s.id + i} song={s} list={trending.slice(10)} idx={i} />)}
                </div>
              </div>
            )}

            {trending.length > 0 && trending.length <= 10 && (
              <div className="mt-6">
                <h2 className="text-lg font-bold text-foreground mb-3">All Songs 🎶</h2>
                <div className="space-y-1">
                  {trending.map((s, i) => <SongRow key={s.id + i} song={s} list={trending} idx={i} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SEARCH TAB */}
        {tab === "search" && (
          <div className="px-5 pt-[env(safe-area-inset-top)]">
            <div className="py-5">
              <h1 className="text-2xl font-bold text-foreground">Search 🔍</h1>
            </div>
            <div className="relative mb-5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="What do you want to listen to?"
                className="w-full h-12 pl-12 pr-4 rounded-xl bg-muted border-0 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {loading && <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>}
            
            {!loading && searched && results.length === 0 && (
              <div className="text-center py-16">
                <p className="text-lg font-semibold text-foreground mb-1">No results found 😔</p>
                <p className="text-sm text-muted-foreground">Try different keywords</p>
              </div>
            )}

            {!loading && searched && results.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Results</p>
                {results.map((s, i) => <SongRow key={s.id + i} song={s} list={results} idx={i} />)}
              </div>
            )}

            {!searched && (
              <div className="text-center py-16">
                <Disc3 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Search for songs, artists, or albums</p>
              </div>
            )}
          </div>
        )}

        {/* LIBRARY TAB */}
        {tab === "library" && (
          <div className="px-5 pt-[env(safe-area-inset-top)]">
            <div className="py-5">
              <h1 className="text-2xl font-bold text-foreground">Your Library 📚</h1>
            </div>

            <div className="flex gap-2 mb-5">
              <button
                onClick={() => setLibraryTab("favorites")}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  libraryTab === "favorites" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >💚 Liked Songs</button>
              <button
                onClick={() => setLibraryTab("history")}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  libraryTab === "history" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >⏱️ History</button>
            </div>

            {libraryTab === "favorites" && (
              <div className="space-y-1">
                {favorites.length === 0 ? (
                  <div className="text-center py-16">
                    <Heart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-foreground mb-1">No Liked Songs yet 💚</p>
                    <p className="text-sm text-muted-foreground">Songs you like will appear here</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-4 p-4 rounded-2xl bg-gradient-to-r from-primary/20 to-primary/5">
                      <Heart className="w-8 h-8 text-primary fill-primary" />
                      <div>
                        <p className="text-sm font-bold text-foreground">{favorites.length} Liked Songs</p>
                        <p className="text-xs text-muted-foreground">Your personal collection</p>
                      </div>
                    </div>
                    {favorites.map((s, i) => <SongRow key={s.id + i} song={s} list={favorites} idx={i} />)}
                  </>
                )}
              </div>
            )}

            {libraryTab === "history" && (
              <div className="space-y-1">
                {history.length === 0 ? (
                  <div className="text-center py-16">
                    <Music2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-foreground mb-1">No history yet 🎧</p>
                    <p className="text-sm text-muted-foreground">Start listening to see your history</p>
                  </div>
                ) : history.map((s, i) => <SongRow key={s.id + i} song={s} list={history} idx={i} />)}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation (Spotify-style) */}
      <div className={`fixed ${current ? "bottom-[130px]" : "bottom-[68px]"} left-0 right-0 z-10 bg-card/95 backdrop-blur-xl border-t border-border`}>
        <div className="flex items-center justify-around py-2">
          {([
            { id: "home" as Tab, icon: Home, label: "Home" },
            { id: "search" as Tab, icon: Search, label: "Search" },
            { id: "library" as Tab, icon: Library, label: "Library" },
          ]).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${
                tab === id ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mini Player */}
      <AnimatePresence>
        {current && !expanded && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="fixed bottom-[68px] left-0 right-0 z-20 px-2"
          >
            <button
              onClick={() => setExpanded(true)}
              className="w-full flex items-center gap-3 p-2 rounded-2xl bg-card/95 backdrop-blur-2xl border border-border shadow-2xl"
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0 shadow-md">
                {current.image ? <img src={current.image} className="w-full h-full object-cover" /> : <Music2 className="w-5 h-5 m-auto text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold truncate text-foreground">{current.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{current.artist}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); toggleFav(); }} className={`p-2 ${isFav ? "text-primary" : "text-muted-foreground"}`}>
                <Heart className={`w-5 h-5 ${isFav ? "fill-current" : ""}`} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="p-2">
                {playing ? <Pause className="w-6 h-6 text-foreground" /> : <Play className="w-6 h-6 text-foreground" />}
              </button>
            </button>
            <div className="mx-4 h-[3px] bg-muted rounded-full overflow-hidden -mt-1">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${duration ? (progress/duration)*100 : 0}%` }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Player */}
      <AnimatePresence>
        {expanded && current && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{
              background: `linear-gradient(180deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--background)) 40%)`,
            }}
          >
            <div className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top)] py-4">
              <button onClick={() => setExpanded(false)} className="p-1"><ChevronDown className="w-7 h-7 text-muted-foreground" /></button>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Now Playing</p>
              <button onClick={() => setShowQueue(!showQueue)} className={`p-1 ${showQueue ? "text-primary" : "text-muted-foreground"}`}>
                <ListMusic className="w-5 h-5" />
              </button>
            </div>

            {!showQueue ? (
              <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8">
                <motion.div
                  animate={{ scale: playing ? 1 : 0.92 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="w-72 h-72 sm:w-80 sm:h-80 rounded-2xl overflow-hidden shadow-2xl shadow-black/30 bg-muted"
                >
                  {current.image ? (
                    <img src={current.image} alt={current.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-accent"><Music2 className="w-20 h-20 text-muted-foreground" /></div>
                  )}
                </motion.div>

                <div className="w-full flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-foreground truncate">{current.name}</h2>
                    <p className="text-sm text-muted-foreground truncate">{current.artist}</p>
                  </div>
                  <button onClick={toggleFav} className={`p-2 ${isFav ? "text-primary" : "text-muted-foreground"}`}>
                    <Heart className={`w-6 h-6 ${isFav ? "fill-current" : ""}`} />
                  </button>
                </div>

                <div className="w-full space-y-1.5">
                  <Slider value={[progress]} max={duration || 1} step={1} onValueChange={seek} className="w-full" />
                  <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full max-w-xs">
                  <button onClick={() => setShuffle(!shuffle)} className={`p-2 ${shuffle ? "text-primary" : "text-muted-foreground"}`}>
                    <Shuffle className="w-5 h-5" />
                  </button>
                  <button onClick={playPrev} className="p-3 text-foreground"><SkipBack className="w-7 h-7 fill-current" /></button>
                  <button onClick={togglePlay} className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center shadow-xl">
                    {playing ? <Pause className="w-7 h-7 text-background" /> : <Play className="w-7 h-7 text-background ml-1" />}
                  </button>
                  <button onClick={playNext} className="p-3 text-foreground"><SkipForward className="w-7 h-7 fill-current" /></button>
                  <button onClick={() => setRepeat(repeat === "off" ? "all" : repeat === "all" ? "one" : "off")}
                    className={`p-2 relative ${repeat !== "off" ? "text-primary" : "text-muted-foreground"}`}>
                    <Repeat className="w-5 h-5" />
                    {repeat === "one" && <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold text-primary">1</span>}
                  </button>
                </div>

                <div className="flex items-center gap-3 w-full max-w-xs">
                  <button onClick={() => setMuted(!muted)} className="text-muted-foreground">
                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <Slider value={[muted ? 0 : volume]} max={100} step={1} onValueChange={(v) => { setVolume(v[0]); setMuted(false); }} className="flex-1" />
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 pb-8">
                <h3 className="text-base font-bold text-foreground mb-4">Queue 🎶 ({queue.length})</h3>
                <div className="space-y-1">
                  {queue.map((s, i) => (
                    <button
                      key={s.id + i}
                      onClick={() => { setQueueIndex(i); playSong(s, queue, i); }}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors ${i === queueIndex ? "bg-primary/10" : "hover:bg-accent/50"}`}
                    >
                      <span className="text-xs text-muted-foreground w-5 text-center">{i + 1}</span>
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                        {s.image ? <img src={s.image} className="w-full h-full object-cover" /> : <Music2 className="w-4 h-4 m-auto text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-sm truncate ${i === queueIndex ? "text-primary font-semibold" : "text-foreground"}`}>{s.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{s.artist}</p>
                      </div>
                    </button>
                  ))}
                </div>
                {suggestions.length > 0 && (
                  <>
                    <h3 className="text-base font-bold text-foreground mt-8 mb-4">Up Next ✨</h3>
                    <div className="space-y-1">
                      {suggestions.map((s, i) => (
                        <button
                          key={s.id + i}
                          onClick={() => playSong(s, [...queue, ...suggestions], queue.length + i)}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent/50"
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                            {s.image ? <img src={s.image} className="w-full h-full object-cover" /> : <Music2 className="w-4 h-4 m-auto text-muted-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm text-foreground truncate">{s.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{s.artist}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ModuleSwitcher />
    </div>
  );
};

export default MusicPage;
