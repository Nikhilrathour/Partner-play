import React from 'react';

const ICON_MAP = {
  paintbrush: '/icons/paintbrush.svg',
  canvas: '/icons/paintbrush.svg',
  music: '/icons/music.svg',
  stickynote: '/icons/stickynote.svg',
  notes: '/icons/stickynote.svg',
  smartphone: '/icons/smartphone.svg',
  widget: '/icons/smartphone.svg',
  settings: '/icons/settings.svg',
  server: '/icons/settings.svg',
  logout: '/icons/logout.svg',
  unpair: '/icons/logout.svg',
  app: '/icon.png',
};

export default function AppIcon({ name, className = 'w-5 h-5', alt = '' }) {
  const src = ICON_MAP[name?.toLowerCase()] || ICON_MAP.paintbrush;
  return (
    <img 
      src={src} 
      alt={alt || name} 
      className={`inline-block object-contain select-none pointer-events-none drop-shadow-xs ${className}`} 
      loading="eager"
    />
  );
}
