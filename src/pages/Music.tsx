import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ModuleSwitcher from "@/components/ModuleSwitcher";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Play, Pause, SkipBack, SkipForward, Heart, Clock, Music2,
  Shuffle, Repeat, Volume2, VolumeX, ChevronDown, ListMusic, X, MoreHorizontal
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

type Tab = "browse" | "favorites" | "history";

const MusicPage = () => {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement>(null);

  const [tab, setTab] = useState<Tab>("browse");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [trending, setTrending] = useState<Song[]>([]);
  const [favorites, setFavoritesList] = useState<Song[]>([]);
  const [history, setHistoryList] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Player state
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

  // Load trending on mount
  useEffect(() => {
    getTrendingSongs().then(setTrending);
  }, []);

  useEffect(() => {
    if (tab === "favorites" && user) getFavorites(user.id).then(setFavoritesList);
    if (tab === "history" && user) getHistory(user.id).then(setHistoryList);
  }, [tab, user]);

  // Check fav status
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
    if (!song.url) {
      toast.error("Song not available for streaming");
      return;
    }
    setCurrent(song);
    if (list) {
      setQueue(list);
      setQueueIndex(idx ?? 0);
    }
    setPlaying(true);
    setExpanded(true);
    if (user) addToHistory(user.id, song);
    // Load suggestions
    getSongSuggestions(song.id).then(setSuggestions);
  }, [user]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    audio.src = current.url;
    audio.volume = muted ? 0 : volume / 100;
    audio.play().catch(() => {});
  }, [current]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume / 100;
  }, [volume, muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setProgress(audio.currentTime);
    const onDur = () => setDuration(audio.duration || 0);
    const onEnd = () => {
      if (repeat === "one") {
        audio.currentTime = 0;
        audio.play();
      } else {
        playNext();
      }
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDur);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onDur);
      audio.removeEventListener("ended", onEnd);
    };
  }, [repeat, queue, queueIndex, shuffle]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
    setPlaying(!playing);
  };

  const seek = (val: number[]) => {
    if (audioRef.current) audioRef.current.currentTime = val[0];
  };

  const playNext = () => {
    if (queue.length === 0) return;
    let nextIdx: number;
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else {
      nextIdx = queueIndex + 1;
      if (nextIdx >= queue.length) {
        if (repeat === "all") nextIdx = 0;
        else { setPlaying(false); return; }
      }
    }
    setQueueIndex(nextIdx);
    playSong(queue[nextIdx], queue, nextIdx);
  };

  const playPrev = () => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    if (queue.length === 0) return;
    const prevIdx = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
    setQueueIndex(prevIdx);
    playSong(queue[prevIdx], queue, prevIdx);
  };

  const toggleFav = async () => {
    if (!user || !current) return;
    if (isFav) {
      await removeFromFavorites(user.id, current.id);
      setIsFav(false);
      toast.success("Removed from favorites");
    } else {
      await addToFavorites(user.id, current);
      setIsFav(true);
      toast.success("Added to favorites");
    }
  };

  const SongRow = ({ song, list, idx }: { song: Song; list: Song[]; idx: number }) => (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.02 }}
      onClick={() => playSong(song, list, idx)}
      className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-[0.98] ${
        current?.id === song.id ? "bg-primary/10" : "hover:bg-accent/50"
      }`}
    >
      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0">
        {song.image ? (
          <img src={song.image} alt={song.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Music2 className="w-5 h-5 text-muted-foreground" /></div>
        )}
        {current?.id === song.id && playing && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="flex gap-0.5">
              {[1,2,3].map(i => <div key={i} className="w-0.5 bg-white rounded-full animate-pulse" style={{ height: `${8+i*4}px`, animationDelay: `${i*0.15}s` }} />)}
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className={`text-sm font-medium truncate ${current?.id === song.id ? "text-primary" : "text-foreground"}`}>{song.name}</p>
        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
      </div>
      {song.duration > 0 && <span className="text-xs text-muted-foreground">{formatTime(song.duration)}</span>}
    </motion.button>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <audio ref={audioRef} preload="auto" />

      {/* Header */}
      <header className="px-5 pt-[env(safe-area-inset-top)] py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-md">
          <Music2 className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold text-foreground flex-1">Music</h1>
      </header>

      {/* Search */}
      <div className="px-5 mb-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search songs, artists, albums..."
            className="w-full h-11 pl-10 pr-4 rounded-2xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 mb-4 flex gap-2">
        {(["browse", "favorites", "history"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-xs font-semibold capitalize transition-all ${
              tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {t === "browse" ? "Browse" : t === "favorites" ? "♥ Favorites" : "⏱ History"}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className={`flex-1 px-5 overflow-y-auto ${current ? "pb-44" : "pb-28"}`}>
        {tab === "browse" && (
          <>
            {loading && <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}
            {!loading && searched && results.length === 0 && (
              <p className="text-center text-muted-foreground py-12 text-sm">No songs found</p>
            )}
            {!loading && searched && results.length > 0 && (
              <div className="space-y-1">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Search Results</h2>
                {results.map((s, i) => <SongRow key={s.id + i} song={s} list={results} idx={i} />)}
              </div>
            )}
            {!searched && trending.length > 0 && (
              <div className="space-y-1">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Trending</h2>
                {trending.map((s, i) => <SongRow key={s.id + i} song={s} list={trending} idx={i} />)}
              </div>
            )}
          </>
        )}

        {tab === "favorites" && (
          <div className="space-y-1">
            {favorites.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 text-sm">No favorites yet</p>
            ) : favorites.map((s, i) => <SongRow key={s.id + i} song={s} list={favorites} idx={i} />)}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-1">
            {history.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 text-sm">No listening history yet</p>
            ) : history.map((s, i) => <SongRow key={s.id + i} song={s} list={history} idx={i} />)}
          </div>
        )}
      </main>

      {/* Mini Player */}
      <AnimatePresence>
        {current && !expanded && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="fixed bottom-[68px] left-0 right-0 z-20 px-3"
          >
            <button
              onClick={() => setExpanded(true)}
              className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-card/95 backdrop-blur-2xl border border-border shadow-xl"
            >
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-muted shrink-0">
                {current.image ? <img src={current.image} className="w-full h-full object-cover" /> : <Music2 className="w-5 h-5 m-auto text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold truncate text-foreground">{current.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{current.artist}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="p-2">
                {playing ? <Pause className="w-5 h-5 text-foreground" /> : <Play className="w-5 h-5 text-foreground" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); playNext(); }} className="p-2">
                <SkipForward className="w-4 h-4 text-muted-foreground" />
              </button>
            </button>
            {/* Mini progress */}
            <div className="mx-4 h-0.5 bg-muted rounded-full overflow-hidden -mt-0.5">
              <div className="h-full bg-primary transition-all" style={{ width: `${duration ? (progress/duration)*100 : 0}%` }} />
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
            className="fixed inset-0 z-50 bg-background flex flex-col"
          >
            {/* Player Header */}
            <div className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top)] py-4">
              <button onClick={() => setExpanded(false)} className="p-1"><ChevronDown className="w-6 h-6 text-muted-foreground" /></button>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Now Playing</p>
              <button onClick={() => setShowQueue(!showQueue)} className={`p-1 ${showQueue ? "text-primary" : "text-muted-foreground"}`}>
                <ListMusic className="w-5 h-5" />
              </button>
            </div>

            {!showQueue ? (
              <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
                {/* Album Art */}
                <motion.div
                  animate={{ scale: playing ? 1 : 0.9 }}
                  transition={{ duration: 0.4 }}
                  className="w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden shadow-2xl shadow-black/20 bg-muted"
                >
                  {current.image ? (
                    <img src={current.image} alt={current.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Music2 className="w-16 h-16 text-muted-foreground" /></div>
                  )}
                </motion.div>

                {/* Song Info */}
                <div className="w-full text-center">
                  <h2 className="text-xl font-bold text-foreground truncate">{current.name}</h2>
                  <p className="text-sm text-muted-foreground truncate mt-1">{current.artist}</p>
                  {current.album && <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{current.album}</p>}
                </div>

                {/* Progress */}
                <div className="w-full space-y-2">
                  <Slider
                    value={[progress]}
                    max={duration || 1}
                    step={1}
                    onValueChange={seek}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between w-full max-w-xs">
                  <button onClick={() => setShuffle(!shuffle)} className={shuffle ? "text-primary" : "text-muted-foreground"}>
                    <Shuffle className="w-5 h-5" />
                  </button>
                  <button onClick={playPrev} className="p-2 text-foreground"><SkipBack className="w-6 h-6" /></button>
                  <button onClick={togglePlay} className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                    {playing ? <Pause className="w-7 h-7 text-primary-foreground" /> : <Play className="w-7 h-7 text-primary-foreground ml-1" />}
                  </button>
                  <button onClick={playNext} className="p-2 text-foreground"><SkipForward className="w-6 h-6" /></button>
                  <button onClick={() => setRepeat(repeat === "off" ? "all" : repeat === "all" ? "one" : "off")}
                    className={repeat !== "off" ? "text-primary relative" : "text-muted-foreground"}>
                    <Repeat className="w-5 h-5" />
                    {repeat === "one" && <span className="absolute -top-1 -right-1 text-[8px] font-bold">1</span>}
                  </button>
                </div>

                {/* Volume + Actions */}
                <div className="flex items-center gap-4 w-full max-w-xs">
                  <button onClick={() => setMuted(!muted)} className="text-muted-foreground">
                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <Slider value={[muted ? 0 : volume]} max={100} step={1} onValueChange={(v) => { setVolume(v[0]); setMuted(false); }} className="flex-1" />
                  <button onClick={toggleFav} className={isFav ? "text-red-500" : "text-muted-foreground"}>
                    <Heart className={`w-5 h-5 ${isFav ? "fill-current" : ""}`} />
                  </button>
                </div>
              </div>
            ) : (
              /* Queue View */
              <div className="flex-1 overflow-y-auto px-5 pb-8">
                <h3 className="text-sm font-semibold text-foreground mb-3">Queue ({queue.length})</h3>
                <div className="space-y-1">
                  {queue.map((s, i) => (
                    <button
                      key={s.id + i}
                      onClick={() => { setQueueIndex(i); playSong(s, queue, i); }}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                        i === queueIndex ? "bg-primary/10" : "hover:bg-accent/50"
                      }`}
                    >
                      <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-muted shrink-0">
                        {s.image ? <img src={s.image} className="w-full h-full object-cover" /> : <Music2 className="w-4 h-4 m-auto text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-sm truncate ${i === queueIndex ? "text-primary font-medium" : "text-foreground"}`}>{s.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{s.artist}</p>
                      </div>
                    </button>
                  ))}
                </div>
                {suggestions.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold text-foreground mt-6 mb-3">Up Next (Suggestions)</h3>
                    <div className="space-y-1">
                      {suggestions.map((s, i) => (
                        <button
                          key={s.id + i}
                          onClick={() => playSong(s, [...queue, ...suggestions], queue.length + i)}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent/50"
                        >
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-muted shrink-0">
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
