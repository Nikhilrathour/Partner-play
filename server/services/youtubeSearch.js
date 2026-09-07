async function searchYouTube(query) {
  if (!query || typeof query !== 'string') return [];
  const q = query.trim();
  if (!q) return [];

  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) {
      throw new Error(`YouTube responded with status ${res.status}`);
    }

    const html = await res.text();
    const startMarker = 'ytInitialData = ';
    const startIdx = html.indexOf(startMarker);
    if (startIdx === -1) {
      return [];
    }

    const jsonStart = startIdx + startMarker.length;
    let jsonEnd = html.indexOf(';</script>', jsonStart);
    if (jsonEnd === -1) {
      jsonEnd = html.indexOf('};', jsonStart) + 1;
    }
    const jsonStr = html.substring(jsonStart, jsonEnd);
    const data = JSON.parse(jsonStr);

    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    const videos = [];

    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const v = item?.videoRenderer;
        if (!v || !v.videoId) continue;

        const title = (v.title?.runs?.map((r) => r.text).join('') || v.title?.simpleText || 'Untitled').trim();
        const artist = (v.ownerText?.runs?.map((r) => r.text).join('') || v.shortBylineText?.runs?.map((r) => r.text).join('') || 'YouTube').trim();
        const timestamp = (v.lengthText?.simpleText || v.lengthText?.runs?.map((r) => r.text).join('') || '').trim();
        const thumbnail = v.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || '';

        let duration = 0;
        if (timestamp) {
          const parts = timestamp.split(':').map(Number);
          if (parts.length === 2) duration = parts[0] * 60 + parts[1];
          if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }

        videos.push({
          id: v.videoId,
          videoId: v.videoId,
          title,
          artist,
          duration,
          timestamp,
          thumbnail,
          source: 'youtube',
          genre: 'YouTube',
          icon: 'headphones',
          color: 'bg-rose-50 text-rose-600 border-rose-200',
        });
      }
    }

    return videos;
  } catch (err) {
    console.error('[YouTube Search Service Error]:', err.message);
    return [];
  }
}

module.exports = { searchYouTube };
