import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  try {
    const musicDir = path.join(process.cwd(), 'assets', 'music');
    
    if (!fs.existsSync(musicDir)) {
      return res.status(404).json({ 
        error: 'Music directory not found', 
        path: musicDir,
        cwd: process.cwd()
      });
    }

    const files = fs.readdirSync(musicDir).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    
    const musicFiles = files
      .filter(file => file.toLowerCase().endsWith('.mp3'))
      .map(file => {
        let name = file.replace(/\.mp3$/i, '');
        let artist = "Unknown";
        
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

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json(musicFiles);
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
}
