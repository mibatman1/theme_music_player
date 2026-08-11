/**
 * Built-in nostalgia stations.
 * Each theme has its own curated track list in tracks.js — listeners just press play.
 */

import { tracksByTheme } from './tracks.js'

/** @typedef {{
 *   id: string,
 *   name: string,
 *   tagline: string,
 *   playlistUrl: string,
 *   spotifyUrl: string,
 *   ytMusicUrl: string,
 *   bg: string,
 *   bgFallback: string,
 *   presenceLabel: string,
 *   accent: string,
 * }} Theme */

/** @type {Theme[]} */
export const themes = [
  {
    id: 'bus',
    name: 'Highway Express',
    tagline: 'Old-time bus bangers for long dusty rides',
    playlistUrl: 'https://www.youtube.com/playlist?list=PLiqQAY6N4wHJ0PSuhtNtsYh6xPyir9yPY',
    spotifyUrl: '',
    ytMusicUrl: 'https://music.youtube.com/playlist?list=PLiqQAY6N4wHJ0PSuhtNtsYh6xPyir9yPY',
    bg: '/themes/bus/bg.webp',
    bgFallback: '/themes/bus/bg.jpg',
    presenceLabel: 'on the bus',
    accent: '#f59e0b',
  },
  {
    id: 'saloon',
    name: 'Deluxe Saloon',
    tagline: '₹20 haircuts and soul-fixing 90s hits',
    playlistUrl: 'https://www.youtube.com/playlist?list=PLTJ1PnzCWyFw',
    spotifyUrl: 'https://open.spotify.com/playlist/2AVjI8Z57bqMJVtU3V9X1Q',
    ytMusicUrl: 'https://music.youtube.com/playlist?list=PLTJ1PnzCWyFw',
    bg: '/themes/saloon/bg.webp',
    bgFallback: '/themes/saloon/bg.jpg',
    presenceLabel: 'in the saloon',
    accent: '#34d399',
  },
  {
    id: 'chat-puja',
    name: 'Chat Puja',
    tagline: 'Chhath Puja geet — Sharda Sinha, Anuradha Paudwal & classic arghya songs',
    playlistUrl: 'https://www.youtube.com/playlist?list=PLPlNvrjDXABmd-q-lwgFguM7hjuRWUm7J',
    spotifyUrl: '',
    ytMusicUrl: 'https://music.youtube.com/playlist?list=PLPlNvrjDXABmd-q-lwgFguM7hjuRWUm7J',
    bg: '/themes/chat-puja/bg.webp',
    bgFallback: '/themes/chat-puja/bg.jpg',
    presenceLabel: 'at the ghat',
    accent: '#fb7185',
  },
  {
    id: 'gym',
    name: 'Iron Temple',
    tagline: 'Sweaty gym anthems — Zinda, Sultan, Lakshya & more pump tracks',
    playlistUrl: 'https://www.youtube.com/playlist?list=PLBWZKm-dhAC7ZZ0EI-XWhwQNsvKi06hDw',
    spotifyUrl: '',
    ytMusicUrl: 'https://music.youtube.com/playlist?list=PLBWZKm-dhAC7ZZ0EI-XWhwQNsvKi06hDw',
    bg: '/themes/gym/bg.webp',
    bgFallback: '/themes/gym/bg.jpg',
    presenceLabel: 'on the floor',
    accent: '#38bdf8',
  },
  {
    id: 'baarat',
    name: 'Baarat Boulevard',
    tagline: 'Dhol, sehra & shaadi bangers for the loudest night of the year',
    playlistUrl: 'https://www.youtube.com/playlist?list=PLThTVQcJpVcPx6vSjBdirOrcHAA1Y8SJH',
    spotifyUrl: '',
    ytMusicUrl: 'https://music.youtube.com/playlist?list=PLThTVQcJpVcPx6vSjBdirOrcHAA1Y8SJH',
    bg: '/themes/baarat/bg.webp',
    bgFallback: '/themes/baarat/bg.jpg',
    presenceLabel: 'in the baarat',
    accent: '#f472b6',
  },
]

/**
 * @param {string} id
 * @returns {Theme | undefined}
 */
export function getThemeById(id) {
  return themes.find((t) => t.id === id)
}

/**
 * Station-specific track queue (never shared across themes).
 * @param {Theme | string} themeOrId
 * @returns {import('./tracks.js').Track[]}
 */
export function getThemeTracks(themeOrId) {
  const id = typeof themeOrId === 'string' ? themeOrId : themeOrId?.id
  return tracksByTheme[id] || []
}
