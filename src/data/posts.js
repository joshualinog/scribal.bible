const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, 'posts');
const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.json'));
const posts = files.map(f => {
  const content = fs.readFileSync(path.join(postsDir, f), 'utf8');
  return JSON.parse(content);
}).sort((a, b) => b.id - a.id); // sort by id descending

module.exports = posts;