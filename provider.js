/// <reference path="./online-streaming-provider.d.ts" />

class Provider {
  constructor() {
    this.base = "https://aniworld.to";
  }

  getSettings() {
    return {
      episodeServers: ["VidMoly"],
      supportsDub: true,
    };
  }

  async search(query) {
    try {
      const cleanQuery = query.query
        .replace(/season\s+\d+/i, "")
        .replace(/\bmovie\b/i, "")
        .trim();

      const res = await fetch(`${this.base}/ajax/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          "Referer": `${this.base}/`,
        },
        body: `keyword=${encodeURIComponent(cleanQuery)}`,
      });

      const text = await res.text();
      if (!text || text.startsWith("<!DOCTYPE")) return [];

      const data = JSON.parse(text);
      if (!Array.isArray(data)) return [];

      return data
        .filter(item => item.link && item.link.startsWith("/anime/stream/"))
        .map(item => ({
          id: item.link.replace("/anime/stream/", "") + (query.dub ? "|dub" : ""),
          title: item.title.replace(/<\/?[^>]+(>|$)/g, "").replace(/&#8230;/g, "..."),
          url: `${this.base}${item.link}`,
          subOrDub: query.dub ? "dub" : "sub",
        }));
    } catch (e) {
      return [];
    }
  }

  async findEpisodes(id) {
    const parts = id.split("|");
    const slug = parts[0];
    const isDub = parts.includes("dub");

    let baseUrl = `${this.base}/anime/stream/${slug}`;
    let allEpisodes = [];

    console.log(`[AniWorld] Fetching episodes for: ${baseUrl}`);

    // Fetch main page
    const res = await fetch(baseUrl);
    const html = await res.text();

    // Find all season links with multiple patterns
    const seasonLinks = new Map(); // Use Map to avoid duplicates
    
    // Pattern 1: Standard href with staffel-X
    const regex1 = /href="([^"]*\/staffel-(\d+)[^"]*)"/gi;
    let match;
    while ((match = regex1.exec(html)) !== null) {
      const seasonNum = parseInt(match[2]);
      const url = match[1].startsWith('/') ? match[1] : '/' + match[1];
      seasonLinks.set(seasonNum, `${this.base}${url}`);
    }

    console.log(`[AniWorld] Found ${seasonLinks.size} seasons:`, Array.from(seasonLinks.keys()).sort((a,b) => a-b));

    // If no explicit seasons found, scrape the main page
    if (seasonLinks.size === 0) {
      console.log(`[AniWorld] No seasons found, scraping main page directly`);
      
      const epRegex = /<tr[^>]*data-episode-id="(\d+)"[^>]*>.*?<meta itemprop="episodeNumber" content="(\d+)".*?<a itemprop="url" href="([^"]+)">/gs;
      let match;
      while ((match = epRegex.exec(html)) !== null) {
        allEpisodes.push({
          id: match[1] + (isDub ? "|dub" : ""),
          title: `Episode ${match[2]}`,
          number: parseInt(match[2]),
          url: `${this.base}${match[3]}`,
        });
      }
      
      console.log(`[AniWorld] Main page episodes found: ${allEpisodes.length}`);
      return allEpisodes;
    }

    // Sort seasons by number
    const sortedSeasons = Array.from(seasonLinks.entries()).sort((a, b) => a[0] - b[0]);
    
    // Fetch episodes from all seasons
    let globalEpisodeNumber = 1;

    for (const [seasonNum, seasonUrl] of sortedSeasons) {
      try {
        console.log(`[AniWorld] Fetching season ${seasonNum} from: ${seasonUrl}`);
        
        const seasonRes = await fetch(seasonUrl);
        const seasonHtml = await seasonRes.text();
        
        const epRegex = /<tr[^>]*data-episode-id="(\d+)"[^>]*>.*?<meta itemprop="episodeNumber" content="(\d+)".*?<a itemprop="url" href="([^"]+)">/gs;
        const seasonEpisodes = [];
        let match;
        
        while ((match = epRegex.exec(seasonHtml)) !== null) {
          seasonEpisodes.push({
            id: match[1] + (isDub ? "|dub" : ""),
            origNumber: parseInt(match[2]),
            url: `${this.base}${match[3]}`,
          });
        }

        // Sort by original episode number
        seasonEpisodes.sort((a, b) => a.origNumber - b.origNumber);

        console.log(`[AniWorld] Season ${seasonNum}: Found ${seasonEpisodes.length} episodes`);

        // Add episodes with continuous global numbering
        for (const ep of seasonEpisodes) {
          allEpisodes.push({
            id: ep.id,
            title: `Episode ${globalEpisodeNumber}`,
            number: globalEpisodeNumber,
            url: ep.url,
          });
          globalEpisodeNumber++;
        }

      } catch (e) {
        console.error(`[AniWorld] Failed to fetch season ${seasonNum}:`, e);
      }
    }

    console.log(`[AniWorld] Total episodes collected: ${allEpisodes.length}`);
    return allEpisodes;
  }

  async findEpisodeServer(episode, _server) {
    const res = await fetch(episode.url);
    const html = await res.text();

    const isDub = episode.id.includes("|dub");
    const priority = isDub ? ["1"] : ["3", "1", "2"];

    let redirectUrl = null;
    const liBlocks = html.split(/<li/g);

    for (const key of priority) {
      for (const block of liBlocks) {
        if (block.includes(`data-lang-key="${key}"`) && block.toLowerCase().includes('icon vidmoly')) {
          const urlMatch = block.match(/data-link-target="([^"]+)"/);
          if (urlMatch) {
            redirectUrl = `${this.base}${urlMatch[1]}`;
            break;
          }
        }
      }
      if (redirectUrl) break;
    }

    if (!redirectUrl) throw new Error("Source not available for requested language.");

    const hosterRes = await fetch(redirectUrl);
    const hosterHtml = await hosterRes.text();

    const m3u8Regex = /file\s*:\s*["'](https?:\/\/[^"']+\/master\.m3u8[^"']*)["']/;
    const fileMatch = hosterHtml.match(m3u8Regex);

    const videoUrl = fileMatch ? fileMatch[1] : (hosterHtml.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/)?.[1]);
    if (!videoUrl) throw new Error("M3U8 not found.");

    return {
      server: "VidMoly",
      videoSources: [{ url: videoUrl, quality: "auto", type: "hls", subtitles: [] }],
    };
  }
}
