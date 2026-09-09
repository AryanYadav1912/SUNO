import { useEffect, useRef, useState } from 'react'
import { Heart, LoaderCircle, Moon, Pause, Play, Search, SkipBack, SkipForward, Sun, Volume2 } from 'lucide-react'
import { fetchPlaylistTracks, playlists } from './youtubeCatalog'
import './App.css'
import './interface-fix.css'

const fallbackTracks = [
  { id: 'fSS_R91Nimw', title: 'Iktara', artist: 'Kavita Seth', album: 'Wake Up Sid', duration: '3:28', thumbnail: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=300&q=85' },
  { id: 'PZ0pzk2RZ6g', title: 'Kho Gaye Hum Kahan', artist: 'Jasleen Royal, Prateek Kuhad', album: 'Baar Baar Dekho', duration: '3:33', thumbnail: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=300&q=85' },
]

const loadYouTubeApi = () => new Promise((resolve) => {
  if (window.YT?.Player) { resolve(window.YT); return }
  const script = document.createElement('script')
  script.src = 'https://www.youtube.com/iframe_api'
  document.head.append(script)
  window.onYouTubeIframeAPIReady = () => resolve(window.YT)
})

function App() {
  const [tracks, setTracks] = useState(fallbackTracks)
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [liked, setLiked] = useState(false)
  const [progress, setProgress] = useState(0)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('suno-theme') === 'dark')
  const [selectedPlaylist, setSelectedPlaylist] = useState('punjabiPop')
  const [catalogState, setCatalogState] = useState(import.meta.env.VITE_YOUTUBE_API_KEY ? 'loading' : 'needs-key')
  const [catalogError, setCatalogError] = useState('')
  const playerRef = useRef(null)
  const song = tracks[active] ?? fallbackTracks[0]
  const playlist = playlists[selectedPlaylist]

  useEffect(() => {
    localStorage.setItem('suno-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY
    if (!apiKey) return
    let activeRequest = true
    setCatalogState('loading')
    setCatalogError('')
    fetchPlaylistTracks(apiKey, playlist)
      .then((catalog) => {
        if (!activeRequest || !catalog.length) return
        setTracks(catalog)
        setActive(0)
        setCatalogState('ready')
      })
      .catch((error) => {
        if (!activeRequest) return
        setCatalogError(error.message || 'YouTube could not load this music selection.')
        setCatalogState('error')
      })
    return () => { activeRequest = false }
  }, [playlist])

  useEffect(() => {
    let mounted = true
    loadYouTubeApi().then((YT) => {
      if (!mounted) return
      playerRef.current = new YT.Player('youtube-player', {
        height: '1', width: '1', videoId: fallbackTracks[0].id,
        playerVars: { origin: window.location.origin, playsinline: 1, rel: 0 },
        events: { onStateChange: (event) => setPlaying(event.data === YT.PlayerState.PLAYING) },
      })
    })
    return () => { mounted = false; playerRef.current?.destroy() }
  }, [])

  useEffect(() => {
    if (!playing) return undefined
    const updateTimer = () => {
      const player = playerRef.current
      const nextDuration = player?.getDuration?.() ?? 0
      const nextTime = player?.getCurrentTime?.() ?? 0
      setProgress(nextDuration ? (nextTime / nextDuration) * 100 : 0)
    }
    updateTimer()
    const timer = window.setInterval(updateTimer, 250)
    return () => window.clearInterval(timer)
  }, [playing])

  const selectTrack = (index) => {
    setActive(index)
    setProgress(0)
    playerRef.current?.loadVideoById(tracks[index].id)
  }
  const moveTrack = (amount) => selectTrack((active + amount + tracks.length) % tracks.length)
  const choosePlaylist = (playlistKey) => {
    setPlaying(false)
    setProgress(0)
    setActive(0)
    setSelectedPlaylist(playlistKey)
  }
  const togglePlayback = () => playing ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo()
  const seekAndPlay = (event) => {
    const nextProgress = Number(event.target.value)
    const player = playerRef.current
    const seekTime = (nextProgress / 100) * (player?.getDuration?.() || 0)
    setProgress(nextProgress)
    player?.seekTo(seekTime, true)
    player?.playVideo()
  }
  const catalogMessage = catalogState === 'loading' ? `Loading ${playlist.name}...` : catalogState === 'needs-key' ? 'Add VITE_YOUTUBE_API_KEY to .env.local to load this playlist.' : catalogState === 'error' ? catalogError : `${tracks.length} ${playlist.name} songs loaded from YouTube.`

  return <main className={`app-shell ${darkMode ? 'dark-mode' : ''}`}>
    <aside className="sidebar"><a className="brand" href="#top">SUNO<span>.</span></a><nav><a className="active" href="#top">For you</a><a href="#library"><Search size={16} /> Discover</a></nav><div className="library"><p>Your playlists</p>{Object.entries(playlists).map(([key, item]) => <button className={`playlist-button ${selectedPlaylist === key ? 'selected' : ''}`} type="button" key={key} onClick={() => choosePlaylist(key)}>{item.name}</button>)}</div><small>Made for unhurried days.</small></aside>
    <section className="content" id="top">
      <header><span className="back">‹</span><div className="header-actions"><button className="theme-toggle" type="button" onClick={() => setDarkMode(!darkMode)} aria-label={darkMode ? 'Use light mode' : 'Use dark mode'} title={darkMode ? 'Use light mode' : 'Use dark mode'}>{darkMode ? <Sun size={17} /> : <Moon size={17} />}</button><button className="profile">AR</button></div></header>
      <section className="hero"><div><p>Curated YouTube playlist</p><h1>{playlist.name}</h1><article>{playlist.description}</article><button className="dark-button" onClick={() => selectTrack(0)}><Play size={17} fill="currentColor" /> Play mix</button></div><img src={song.thumbnail} alt="Current song artwork" /></section>
      <section className="queue" id="library"><div className="title-row"><div><p>Curated for you</p><h2>{playlist.name}</h2></div><button type="button">{tracks.length} songs</button></div>
        <p className={`catalog-status ${catalogState}`}>{catalogState === 'loading' && <LoaderCircle size={14} />} {catalogMessage}</p>
        <div className="tracks">{tracks.map((track, index) => <button className={`track ${index === active ? 'selected' : ''}`} key={track.id} onClick={() => selectTrack(index)}><i>{index === active && playing ? '||| ' : String(index + 1).padStart(2, '0')}</i><img src={track.thumbnail} alt="" /><span><b>{track.title}</b><small>{track.artist}</small></span><em>{track.album}</em><time>{track.duration}</time></button>)}</div>
      </section>
    </section>
    <div id="youtube-player" className="youtube-player" aria-hidden="true" />
    <footer><div className="now"><img src={song.thumbnail} alt="" /><span><b>{song.title}</b><small>{song.artist}</small></span><button onClick={() => setLiked(!liked)} className={liked ? 'liked' : ''} aria-label="Like song"><Heart size={17} fill={liked ? 'currentColor' : 'none'} /></button></div><div className="player"><div className="transport"><button aria-label="Previous song" onClick={() => moveTrack(-1)}><SkipBack size={18} fill="currentColor" /></button><button className="play" aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlayback}>{playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button><button aria-label="Next song" onClick={() => moveTrack(1)}><SkipForward size={18} fill="currentColor" /></button></div><label className="progress-slider"><input aria-label="Song progress" type="range" value={progress} onChange={seekAndPlay} /></label></div><label className="volume"><Volume2 size={18} /><input aria-label="Volume" type="range" defaultValue="65" onChange={(event) => playerRef.current?.setVolume(event.target.value)} /></label></footer>
  </main>
}

export default App