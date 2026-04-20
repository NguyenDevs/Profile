const fs = require('fs');
const path = require('path');

export default function handler(req, res) {
  try {
    // Vercel path mapping can be tricky. Try relative to process.cwd()
    const musicDir = path.join(process.cwd(), 'assets', 'music');
    
    if (!fs.existsSync(musicDir)) {
      return res.status(404).json({ 
        error: 'Music directory not found', 
        path: musicDir,
        cwd: process.cwd()
      });
    }

    const files = fs.readdirSync(musicDir);
    
    // Filter for .mp3 files
    const musicFiles = files
      .filter(file => file.toLowerCase().endsWith('.mp3'))
      .map(file => {
        // Simple name cleaning: remove .mp3 and replace underscores/dashes with spaces
        let name = file.replace(/\.mp3$/i, '');
        let artist = "Unknown";
        
        // Try to parse "Artist - Name"
        if (name.includes(' - ')) {
          const parts = name.split(' - ');
          artist = parts[0].trim();
          name = parts[1].trim();
        } else if (name.includes(' x ')) {
          const parts = name.split(' x ');
          artist = parts[0].trim();
          name = parts[1].trim();
        }

        return {
          name: name,
          artist: artist,
          file: file
        };
      });

    // Set cache headers - 1 hour cache
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json(musicFiles);
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
}
