/**
 * UI helpers: clock, theatrical presence, player chrome bindings.
 */

/**
 * @param {HTMLElement | null} el
 * @param {string} [timeZone]
 */
export function startClock(el, timeZone = 'Asia/Kolkata') {
  if (!el) return () => {}

  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  const tick = () => {
    const parts = formatter.formatToParts(new Date())
    const hour = parts.find((p) => p.type === 'hour')?.value ?? ''
    const minute = parts.find((p) => p.type === 'minute')?.value ?? ''
    const period = parts.find((p) => p.type === 'dayPeriod')?.value ?? ''
    el.innerHTML = `${hour}<span class="clock-blink">:</span>${minute}<span class="clock-period">${period}</span>`
  }

  tick()
  const id = setInterval(tick, 1000)
  return () => clearInterval(id)
}

/**
 * Theatrical online counter (random walk), like saloon.wtf.
 * @param {HTMLElement | null} countEl
 * @param {{ min?: number, max?: number, start?: number }} [opts]
 */
export function startPresence(countEl, opts = {}) {
  if (!countEl) return () => {}
  const min = opts.min ?? 14
  const max = opts.max ?? 58
  const start = opts.start ?? 30
  let value = start
  countEl.textContent = String(value)

  let timeoutId = 0

  const step = () => {
    const biasUp = value < 36 ? 0.58 : 0.42
    const dir = Math.random() < biasUp ? 1 : -1
    const delta = 1 + Math.floor(Math.random() * 3)
    value = Math.max(min, Math.min(max, value + dir * delta))
    countEl.textContent = String(value)
    timeoutId = window.setTimeout(step, 2500 + 3500 * Math.random())
  }

  timeoutId = window.setTimeout(step, 2500 + 3500 * Math.random())
  return () => clearTimeout(timeoutId)
}

/**
 * @param {number} seconds
 */
export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

/**
 * Bind room player chrome to a player instance.
 * @param {ReturnType<import('./player.js').createPlayer>} player
 * @param {Record<string, HTMLElement | null>} els
 */
export function bindPlayerChrome(player, els) {
  const {
    playBtn,
    iconPlay,
    iconPause,
    prevBtn,
    nextBtn,
    progressContainer,
    progressBar,
    timeCurrent,
    timeTotal,
    titleEl,
    artistEl,
    coverEl,
    coverFallback,
    albumArtContainer,
    placeholderEl,
    controlsRoot,
  } = els

  let playing = false
  let progressTimer = 0

  function setPlaying(next) {
    playing = next
    iconPlay?.classList.toggle('hidden', playing)
    iconPause?.classList.toggle('hidden', !playing)
    albumArtContainer?.classList.toggle('is-spinning', playing)
  }

  function setEnabled(enabled) {
    ;[playBtn, prevBtn, nextBtn].forEach((btn) => {
      if (!btn) return
      if (btn instanceof HTMLButtonElement) btn.disabled = !enabled
      btn.classList.toggle('opacity-50', !enabled)
      btn.classList.toggle('pointer-events-none', !enabled)
    })
    progressContainer?.classList.toggle('pointer-events-none', !enabled)
    progressContainer?.classList.toggle('opacity-50', !enabled)
    placeholderEl?.classList.toggle('hidden', enabled)
    controlsRoot?.classList.toggle('opacity-60', !enabled)
  }

  function syncProgress() {
    const { current, duration } = player.getProgress()
    if (timeCurrent) timeCurrent.textContent = formatTime(current)
    if (timeTotal) timeTotal.textContent = formatTime(duration)
    if (progressBar && duration > 0) {
      progressBar.style.width = `${(current / duration) * 100}%`
    }
  }

  playBtn?.addEventListener('click', () => player.toggle())
  prevBtn?.addEventListener('click', () => player.previous())
  nextBtn?.addEventListener('click', () => player.next())

  progressContainer?.addEventListener('click', (e) => {
    const rect = progressContainer.getBoundingClientRect()
    const fraction = (e.clientX - rect.left) / rect.width
    player.seekToFraction(fraction)
    syncProgress()
  })

  return {
    setEnabled,
    setPlaying,
    onMeta(meta) {
      if (titleEl) titleEl.textContent = meta.title || 'Untitled'
      if (artistEl) artistEl.textContent = meta.author || 'YouTube'
      if (coverEl && meta.cover) {
        coverEl.src = meta.cover
        coverEl.alt = `${meta.title} artwork`
        coverEl.classList.remove('hidden')
        coverFallback?.classList.add('hidden')
      }
    },
    onState({ playing: isPlaying, ended }) {
      setPlaying(isPlaying)
      if (isPlaying) {
        clearInterval(progressTimer)
        progressTimer = window.setInterval(syncProgress, 400)
        syncProgress()
      } else {
        clearInterval(progressTimer)
        syncProgress()
      }
      if (ended) {
        // Playlist auto-advances via YT; reset bar briefly.
        if (progressBar) progressBar.style.width = '0%'
      }
    },
    showPlaceholder(message) {
      setEnabled(false)
      setPlaying(false)
      if (placeholderEl) {
        placeholderEl.textContent = message
        placeholderEl.classList.remove('hidden')
      }
      if (titleEl) titleEl.textContent = 'Unavailable'
      if (artistEl) artistEl.textContent = 'Try another station'
      if (coverEl) coverEl.classList.add('hidden')
      coverFallback?.classList.remove('hidden')
      if (progressBar) progressBar.style.width = '0%'
      if (timeCurrent) timeCurrent.textContent = '0:00'
      if (timeTotal) timeTotal.textContent = '0:00'
    },
    destroy() {
      clearInterval(progressTimer)
    },
  }
}
