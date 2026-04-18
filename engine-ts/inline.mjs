import fs from 'fs';
const js = fs.readFileSync('../static/engine.js', 'utf8');
let html = fs.readFileSync('../static/index.html', 'utf8');
html = html.replace(
  /<!-- ENGINE_BUNDLE_START -->[\s\S]*?<!-- ENGINE_BUNDLE_END -->/,
  `<!-- ENGINE_BUNDLE_START --><script>${js}<\/script><!-- ENGINE_BUNDLE_END -->`
);
fs.writeFileSync('../static/index.html', html);
console.log('Inlined engine.js into index.html');
