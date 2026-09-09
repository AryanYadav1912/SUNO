const PLAYLIST_ITEMS_URL = 'https://www.googleapis.com/youtube/v3/playlistItems'
const PAGE_SIZE = 50
const MAX_TRACKS = 50

export const playlists = {
  punjabiPop: {
    name: 'Punjabi Pop',
    description: 'High-energy Punjabi tracks from Karan Aujla and more.',
    playlistId: 'PLO7-VO1D0_6NYoMAN0XncJu4tvibirSmN',
  },
  softSongs: {
    name: 'Soft Songs',
    description: 'A softer, unhurried collection for quiet moments.',
    playlistId: 'PL1gfuz7ZYcaM2Z7sCGOWORCF0CGmonzOv',
  },
}

export async function fetchPlaylistTracks(apiKey, playlist) {
  const cacheKey = `suno-playlist-${playlist.playlistId}-v1`
  const cachedCatalog = sessionStorage.getItem(cacheKey)
  if (cachedCatalog) return JSON.parse(cachedCatalog)

  const tracks = []
  const seenVideoIds = new Set()
  let pageToken = ''

  while (tracks.length < MAX_TRACKS) {
    const params = new URLSearchParams({
      key: apiKey,
      part: 'snippet,contentDetails',
      playlistId: playlist.playlistId,
      maxResults: String(PAGE_SIZE),
      ...(pageToken && { pageToken }),
    })
    const response = await fetch(`${PLAYLIST_ITEMS_URL}?${params}`)
    if (!response.ok) {
      if (response.status === 429) throw new Error('YouTube API rate limit reached. Wait a few minutes before trying again.')
      throw new Error('YouTube could not load this music selection.')
    }

    const data = await response.json()
    data.items.forEach((item) => {
      const videoId = item.contentDetails.videoId
      if (!videoId || seenVideoIds.has(videoId) || tracks.length >= MAX_TRACKS) return
      seenVideoIds.add(videoId)
      tracks.push({
        id: videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        album: playlist.name,
        duration: '--:--',
        thumbnail: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url,
      })
    })

    pageToken = data.nextPageToken
    if (!pageToken) break
  }

  sessionStorage.setItem(cacheKey, JSON.stringify(tracks))
  return tracks
}