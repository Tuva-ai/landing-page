import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const [,, outFile = 'demo.mp4'] = process.argv;
const frames = JSON.parse(fs.readFileSync('frames/frames.json', 'utf8'));
let list = 'ffconcat version 1.0\n';
for (let i = 0; i < frames.length; i++) {
  const d = i + 1 < frames.length ? frames[i + 1].t - frames[i].t : 1.5;
  list += `file '${frames[i].file}'\nduration ${Math.max(d, 0.001).toFixed(4)}\n`;
}
list += `file '${frames[frames.length - 1].file}'\n`;
fs.writeFileSync('frames/list.txt', list);
execFileSync('node_modules/ffmpeg-static/ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'frames/list.txt',
  '-vf', 'scale=1920:1200:flags=lanczos,setsar=1,fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
  '-tune', 'stillimage', '-profile:v', 'high', '-g', '60', '-keyint_min', '60', '-movflags', '+faststart', '-an', outFile], { stdio: 'inherit' });
const total = frames[frames.length - 1].t - frames[0].t;
console.log('duration', total.toFixed(1), 's ->', outFile, (fs.statSync(outFile).size / 1e6).toFixed(1), 'MB');
