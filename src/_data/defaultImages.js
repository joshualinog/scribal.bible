// Default hero images per post template.
// Local SVG files in src/assets/posts/defaults/ — no external dependencies.
// Each template has its own gradient + icon so posts without a mainImage still look distinct.
// To use a real image array (e.g. after uploading photography), change any value to an array
// and update the templates to do: imgs[post.id % imgs.length]

module.exports = {
  'bible-study':        ['/assets/posts/defaults/bible-study.svg'],
  'youtube':            ['/assets/posts/defaults/youtube.svg'],
  'short-quote':        ['/assets/posts/defaults/short-quote.svg'],
  'art':                ['/assets/posts/defaults/art.svg'],
  'foundation':         ['/assets/posts/defaults/foundation.svg'],
  'sketching-reality':  ['/assets/posts/defaults/sketching-reality.svg'],
  'practice-tutorial':  ['/assets/posts/defaults/practice-tutorial.svg'],
  'parable-story':      ['/assets/posts/defaults/parable-story.svg'],
  'default':            ['/assets/posts/defaults/default.svg'],
};
