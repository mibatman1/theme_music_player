/**
 * Hidden YouTube IFrame API player — plays an explicit video-id queue.
 * Each station passes its own track list so themes never share a playlist.
 */

/** @typedef {{
 *   videoId: string,
 *   title: string,
 *   author: string,
 *   cover: string,
 * }} TrackMeta */

/** @typedef {{
 *   youtubeId: string,
 *   title?: string,
 *   artist?: string,
 * }} TrackInput */

/** @typedef {{
 *   onReady?: () => void,
 *   onMeta?: (meta: TrackMeta) => void,
 *   onState?: (state: { playing: boolean, ended: boolean }) => void,
 *   onError?: (message: string) => void,
 * }} PlayerCallbacks */

const YT_API_SRC = 'https://www.youtube.com/iframe_api'

/** @type {Promise<typeof window.YT> | null} */
let apiPromise = null

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise

  apiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(window.YT)
    }
    if (!document.querySelector(`script[src="${YT_API_SRC}"]`)) {
      const tag = document.createElement('script')
      tag.src = YT_API_SRC
      document.head.appendChild(tag)
    }
  })

  return apiPromise
}

/**
 * @param {string} videoId
 */
export function coverUrlFor(videoId) {
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ''
}

/**
 * Ensure a host element exists for YT.Player (API replaces the node with an iframe).
 * @param {string} elementId
 */
function ensureHost(elementId) {
  let host = document.getElementById(elementId)
  if (!host) {
    host = document.createElement('div')
    host.id = elementId
    host.className = 'pointer-events-none absolute h-px w-px overflow-hidden opacity-0'
    host.setAttribute('aria-hidden', 'true')
    document.body.appendChild(host)
    return host
  }
  // If a previous iframe replaced the host, recreate a fresh div.
  if (host.tagName !== 'DIV' || host.dataset.ytHost !== '1') {
    const next = document.createElement('div')
    next.id = elementId
    next.className = host.className || 'pointer-events-none absolute h-px w-px overflow-hidden opacity-0'
    next.setAttribute('aria-hidden', 'true')
    next.dataset.ytHost = '1'
    host.replaceWith(next)
    return next
  }
  host.dataset.ytHost = '1'
  return host
}

/**
 * @param {string} elementId
 * @param {PlayerCallbacks} [callbacks]
 */
export function createPlayer(elementId, callbacks = {}) {
  /** @type {YT.Player | null} */
  let player = null
  let ready = false
  /** @type {Promise<void> | null} */
  let readyPromise = null
  /** @type {TrackInput[]} */
  let queue = []
  let index = 0
  let loadGen = 0

  function currentTrack() {
    return queue[index] || null
  }

  function emitMetaFromTrack(track, data) {
    if (!track) return
    const videoId = data?.video_id || track.youtubeId
    /** @type {TrackMeta} */
    const meta = {
      videoId,
      title: (data?.title && data.title !== '') ? data.title : (track.title || 'Untitled'),
      author: (data?.author && data.author !== '') ? data.author : (track.artist || ''),
      cover: coverUrlFor(videoId),
    }
    callbacks.onMeta?.(meta)
  }

  function emitMeta() {
    const track = currentTrack()
    if (!track) return
    let data = null
    try {
      data = player?.getVideoData?.() || null
    } catch {
      data = null
    }
    emitMetaFromTrack(track, data)
  }

  async function init() {
    const YT = await loadYouTubeApi()
    if (player && readyPromise) {
      await readyPromise
      return
    }

    ensureHost(elementId)

    readyPromise = new Promise((resolve) => {
      player = new YT.Player(elementId, {
        height: '0',
        width: '0',
        playerVars: {
          playsinline: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            ready = true
            callbacks.onReady?.()
            resolve()
          },
          onStateChange: (event) => {
            const playing = event.data === YT.PlayerState.PLAYING
            const ended = event.data === YT.PlayerState.ENDED
            if (
              playing ||
              event.data === YT.PlayerState.CUED ||
              event.data === YT.PlayerState.BUFFERING
            ) {
              emitMeta()
            }
            if (ended) {
              // Auto-advance within this station's queue only.
              next(true)
            }
            callbacks.onState?.({ playing, ended: false })
          },
          onError: () => {
            // Skip blocked videos inside the same queue.
            callbacks.onError?.('Skipping an unavailable track…')
            setTimeout(() => next(true), 400)
          },
        },
      })
    })

    await readyPromise
  }

  /**
   * Tear down the iframe so the next station starts completely fresh.
   * @param {{ bump?: boolean }} [opts]
   */
  function destroy(opts = {}) {
    if (opts.bump !== false) loadGen += 1
    try {
      player?.stopVideo?.()
      player?.destroy?.()
    } catch {
      // ignore
    }
    player = null
    ready = false
    readyPromise = null
    queue = []
    index = 0
    ensureHost(elementId)
  }

  /**
   * Replace the queue with this station's tracks and cue the first video.
   * @param {TrackInput[]} tracks
   */
  async function loadTracks(tracks) {
    const gen = ++loadGen
    destroy({ bump: false })

    queue = Array.isArray(tracks)
      ? tracks.filter((t) => t && t.youtubeId)
      : []
    index = 0

    if (!queue.length) return false

    await init()
    if (gen !== loadGen) return false

    const track = queue[0]
    emitMetaFromTrack(track, null)
    try {
      player?.cueVideoById?.({
        videoId: track.youtubeId,
        startSeconds: 0,
      })
    } catch {
      return false
    }

    setTimeout(() => {
      if (gen === loadGen) emitMeta()
    }, 700)
    return true
  }

  function play() {
    player?.playVideo?.()
  }

  function pause() {
    player?.pauseVideo?.()
  }

  function toggle() {
    if (!player || typeof player.getPlayerState !== 'function') return
    const state = player.getPlayerState()
    if (state === window.YT.PlayerState.PLAYING) pause()
    else play()
  }

  /**
   * @param {boolean} [auto]
   */
  function next(auto = false) {
    if (!queue.length || !player) return
    index = (index + 1) % queue.length
    const track = queue[index]
    emitMetaFromTrack(track, null)
    if (auto) {
      player.loadVideoById({ videoId: track.youtubeId, startSeconds: 0 })
    } else {
      const wasPlaying = player.getPlayerState?.() === window.YT.PlayerState.PLAYING
      if (wasPlaying) player.loadVideoById({ videoId: track.youtubeId, startSeconds: 0 })
      else player.cueVideoById({ videoId: track.youtubeId, startSeconds: 0 })
    }
  }

  function previous() {
    if (!queue.length || !player) return
    index = (index - 1 + queue.length) % queue.length
    const track = queue[index]
    emitMetaFromTrack(track, null)
    const wasPlaying = player.getPlayerState?.() === window.YT.PlayerState.PLAYING
    if (wasPlaying) player.loadVideoById({ videoId: track.youtubeId, startSeconds: 0 })
    else player.cueVideoById({ videoId: track.youtubeId, startSeconds: 0 })
  }

  /**
   * @param {number} fraction 0–1
   */
  function seekToFraction(fraction) {
    if (!player) return
    const duration = player.getDuration?.() || 0
    if (!duration) return
    player.seekTo(duration * Math.min(1, Math.max(0, fraction)), true)
  }

  function getProgress() {
    if (!player || typeof player.getCurrentTime !== 'function') {
      return { current: 0, duration: 0 }
    }
    return {
      current: player.getCurrentTime() || 0,
      duration: player.getDuration() || 0,
    }
  }

  function hasQueue() {
    return queue.length > 0
  }

  function isReady() {
    return ready
  }

  return {
    init,
    loadTracks,
    play,
    pause,
    toggle,
    next: () => next(false),
    previous,
    seekToFraction,
    getProgress,
    hasQueue,
    isReady,
    destroy,
  }
}
