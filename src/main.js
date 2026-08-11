import './style.css'
import { themes, getThemeById, getThemeTracks } from './themes.js'
import { createPlayer } from './player.js'
import { startClock, startPresence, bindPlayerChrome } from './ui.js'

const hubView = document.getElementById('hub-view')
const roomView = document.getElementById('room-view')
const hubCards = document.getElementById('hub-cards')
const themeSwitcher = document.getElementById('theme-switcher')

const roomTitle = document.getElementById('room-title')
const roomTagline = document.getElementById('room-tagline')
const presenceLabel = document.getElementById('presence-label')
const spotifyLink = document.getElementById('spotify-link')
const ytMusicLink = document.getElementById('yt-music-link')

const player = createPlayer('yt-player', {
  onReady: () => {
    // Room may already be active; chrome handles enablement on loadPlaylist.
  },
  onMeta: (meta) => chrome?.onMeta(meta),
  onState: (state) => chrome?.onState(state),
  onError: (message) => {
    const el = document.getElementById('player-placeholder')
    if (el) {
      el.textContent = message
      el.classList.remove('hidden')
    }
  },
})

const chrome = bindPlayerChrome(player, {
  playBtn: document.getElementById('btn-play-pause'),
  iconPlay: document.getElementById('icon-play'),
  iconPause: document.getElementById('icon-pause'),
  prevBtn: document.getElementById('btn-prev'),
  nextBtn: document.getElementById('btn-next'),
  progressContainer: document.getElementById('progress-container'),
  progressBar: document.getElementById('progress-bar'),
  timeCurrent: document.getElementById('time-current'),
  timeTotal: document.getElementById('time-total'),
  titleEl: document.getElementById('track-title'),
  artistEl: document.getElementById('track-artist'),
  coverEl: document.getElementById('album-art'),
  coverFallback: document.getElementById('album-art-fallback'),
  albumArtContainer: document.getElementById('album-art-container'),
  placeholderEl: document.getElementById('player-placeholder'),
  controlsRoot: document.getElementById('player-widget'),
})

startClock(document.getElementById('live-clock'))
startPresence(document.getElementById('presence-count'))

/** @type {string | null} */
let activeThemeId = null

function parseRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '')
  if (!hash || hash === 'hub') return { view: 'hub', themeId: null }
  const theme = getThemeById(hash)
  if (theme) return { view: 'room', themeId: theme.id }
  return { view: 'hub', themeId: null }
}

function setExternalLink(anchor, url) {
  if (!(anchor instanceof HTMLAnchorElement)) return
  if (url) {
    anchor.href = url
    anchor.classList.remove('hidden')
  } else {
    anchor.href = '#'
    anchor.classList.add('hidden')
  }
}

/**
 * @param {import('./themes.js').Theme} theme
 */
async function enterRoom(theme) {
  const roomToken = Symbol(theme.id)
  activeThemeId = theme.id
  enterRoom.token = roomToken

  document.body.dataset.theme = theme.id
  document.title = `${theme.name} | HelloThere`

  // Full-bleed photographic background (webp + jpeg fallback), saloon.wtf style
  document.documentElement.style.setProperty('--room-bg', `url("${theme.bg}")`)
  document.documentElement.style.setProperty(
    '--room-bg-fallback',
    `url("${theme.bgFallback || theme.bg}")`,
  )

  if (roomTitle) roomTitle.textContent = theme.name
  if (roomTagline) roomTagline.textContent = theme.tagline
  if (presenceLabel) presenceLabel.textContent = theme.presenceLabel

  setExternalLink(spotifyLink, theme.spotifyUrl)
  setExternalLink(ytMusicLink, theme.ytMusicUrl)

  document.documentElement.style.setProperty('--theme-accent', theme.accent)

  hubView?.classList.add('hidden')
  roomView?.classList.remove('hidden')
  highlightSwitcher(theme.id)

  // Reset chrome so the previous theme's track doesn't linger visually.
  const titleEl = document.getElementById('track-title')
  const artistEl = document.getElementById('track-artist')
  const coverEl = document.getElementById('album-art')
  const coverFallback = document.getElementById('album-art-fallback')
  const progressBar = document.getElementById('progress-bar')
  if (titleEl) titleEl.textContent = 'Loading…'
  if (artistEl) artistEl.textContent = `${theme.name} playlist`
  if (coverEl) {
    coverEl.classList.add('hidden')
    coverEl.removeAttribute('src')
  }
  coverFallback?.classList.remove('hidden')
  if (progressBar) progressBar.style.width = '0%'
  chrome.setPlaying(false)

  const tracks = getThemeTracks(theme)
  if (!tracks.length) {
    chrome.showPlaceholder('This station is temporarily offline. Try another one.')
    return
  }

  chrome.setEnabled(true)
  document.getElementById('player-placeholder')?.classList.add('hidden')

  const ok = await player.loadTracks(tracks)
  if (enterRoom.token !== roomToken) return
  if (!ok) {
    chrome.showPlaceholder('Couldn’t load this station’s music. Try again in a moment.')
  }
}

function showHub() {
  activeThemeId = null
  document.body.dataset.theme = ''
  document.title = 'HelloThere | Nostalgia Stations'
  player.pause()
  player.destroy()
  roomView?.classList.add('hidden')
  hubView?.classList.remove('hidden')
}

function navigate(path) {
  const nextHash = path === 'hub' || path === '' ? '#/' : `#/${path}`
  if (window.location.hash === nextHash || (nextHash === '#/' && !window.location.hash)) {
    applyRoute()
    return
  }
  window.location.hash = nextHash
}

function applyRoute() {
  const route = parseRoute()
  if (route.view === 'room' && route.themeId) {
    const theme = getThemeById(route.themeId)
    if (theme) {
      void enterRoom(theme)
      return
    }
  }
  showHub()
}

function highlightSwitcher(themeId) {
  themeSwitcher?.querySelectorAll('[data-theme-id]').forEach((btn) => {
    const active = btn.getAttribute('data-theme-id') === themeId
    btn.classList.toggle('is-active', active)
    btn.setAttribute('aria-current', active ? 'page' : 'false')
  })
}

function renderHubCards() {
  if (!hubCards) return
  hubCards.innerHTML = themes
    .map(
      (theme) => `
    <button type="button" class="hub-card" data-theme-id="${theme.id}" style="--card-accent:${theme.accent}">
      <div class="hub-card-media">
        <picture>
          <source srcset="${theme.bg}" type="image/webp" />
          <img src="${theme.bgFallback || theme.bg}" alt="" loading="lazy" />
        </picture>
      </div>
      <div class="hub-card-body">
        <h2 class="hub-card-title">${theme.name}</h2>
        <p class="hub-card-tagline">${theme.tagline}</p>
        <span class="hub-card-cta">Enter station</span>
      </div>
    </button>`,
    )
    .join('')

  hubCards.querySelectorAll('[data-theme-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-theme-id')
      if (id) navigate(id)
    })
  })
}

function renderThemeSwitcher() {
  if (!themeSwitcher) return
  themeSwitcher.innerHTML = themes
    .map(
      (theme) => `
    <button type="button" class="theme-chip" data-theme-id="${theme.id}" title="${theme.name}">
      ${theme.name}
    </button>`,
    )
    .join('')

  themeSwitcher.querySelectorAll('[data-theme-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-theme-id')
      if (id && id !== activeThemeId) navigate(id)
    })
  })
}

document.getElementById('btn-back-hub')?.addEventListener('click', () => navigate('hub'))

renderHubCards()
renderThemeSwitcher()
window.addEventListener('hashchange', applyRoute)
applyRoute()
