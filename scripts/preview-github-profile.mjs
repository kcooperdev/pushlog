import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../github_profile/', import.meta.url))
const port = 3000

const types = {
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
}

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Khalif Cooper — GitHub profile preview</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560;9..144,680&family=Outfit:wght@380;500;640&display=swap" rel="stylesheet" />
    <style>
      :root {
        color-scheme: dark;
        --bg: #070b14;
        --ink: #e7eefc;
        --muted: #93a0bb;
        --line: rgba(255, 255, 255, 0.1);
        --teal: #2dd4bf;
        --ease: cubic-bezier(0.22, 1, 0.36, 1);
      }
      * { box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      body {
        margin: 0;
        background:
          radial-gradient(900px 420px at 50% -80px, rgba(79, 70, 229, 0.35), transparent 70%),
          var(--bg);
        color: var(--ink);
        font-family: Outfit, sans-serif;
        font-weight: 380;
        line-height: 1.6;
      }
      .progress {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 5;
        width: 100%;
        height: 3px;
        transform: scaleX(0);
        transform-origin: left center;
        background: linear-gradient(90deg, var(--teal), #818cf8);
      }
      #readme { max-width: 920px; margin: 0 auto; padding: 48px 24px 96px; }
      .hero, .block { margin: 0 0 28px; }
      .block { padding: 8px 4px 12px; border-top: 1px solid var(--line); }
      #readme, .hero, .block, h1, h2, h3, p, li, blockquote, td { text-align: center; }
      h1, h2, h3 { font-family: Fraunces, serif; font-weight: 560; letter-spacing: -0.03em; line-height: 1.15; }
      h1 { margin: 18px 0 8px; font-size: clamp(40px, 6vw, 64px); }
      h2 { margin: 8px 0 16px; font-size: 32px; }
      h3 { margin: 22px 0 8px; font-size: 22px; color: #dbe7ff; }
      p { color: #c9d4ea; }
      strong { color: var(--ink); font-weight: 640; }
      a { color: var(--teal); text-decoration-thickness: 1px; text-underline-offset: 3px; }
      ul { list-style-position: inside; padding-left: 0; }
      blockquote {
        margin: 8px auto 0;
        max-width: 640px;
        padding: 16px 0 0;
        border-left: 0;
        border-top: 2px solid var(--teal);
        color: #d5def2;
        font-family: Fraunces, serif;
        font-size: 22px;
        line-height: 1.45;
      }
      li::marker { color: var(--teal); }
      li { margin: 0.35rem 0; color: #c9d4ea; }
      blockquote p { color: inherit; }
      hr { display: none; }
      img { max-width: 100%; height: auto; }
      .hero img[alt*="Khalif Cooper"],
      img[alt*="Pushlog"],
      img[alt*="Bmore Tech Nights"],
      img[alt*="Baltimore Tech Week"] {
        border-radius: 16px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
        outline: 1px solid rgba(255, 255, 255, 0.72);
        outline-offset: 6px;
      }
      a img { transition: transform 0.35s var(--ease), outline-color 0.35s var(--ease); }
      a:hover img[alt*="Bmore Tech Nights"],
      a:hover img[alt*="Baltimore Tech Week"] {
        outline-color: var(--teal);
        transform: translateY(-4px);
      }
      table { width: 100%; border-collapse: separate; border-spacing: 10px 0; margin: 0 auto; }
      td {
        padding: 14px 8px 10px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.035);
        color: var(--muted);
        font-size: 13px;
        vertical-align: top;
        text-align: center;
      }
      .block td img { display: block; margin: 0 auto 8px; border-radius: 0; box-shadow: none; }
      sub, sub a { color: var(--muted); }
      .reveal > * { opacity: 0; transform: translateY(28px); filter: blur(8px); }
      .reveal.in > * { animation: rise 0.85s var(--ease) forwards; }
      .reveal.in > *:nth-child(2) { animation-delay: 0.08s; }
      .reveal.in > *:nth-child(3) { animation-delay: 0.14s; }
      .reveal.in > *:nth-child(4) { animation-delay: 0.2s; }
      .reveal.in > *:nth-child(5) { animation-delay: 0.26s; }
      .reveal.in > *:nth-child(n + 6) { animation-delay: 0.32s; }
      .reveal.in li, .reveal.in td { animation: rise 0.7s var(--ease) both; }
      .reveal.in li:nth-child(1), .reveal.in td:nth-child(1) { animation-delay: 0.16s; }
      .reveal.in li:nth-child(2), .reveal.in td:nth-child(2) { animation-delay: 0.22s; }
      .reveal.in li:nth-child(3), .reveal.in td:nth-child(3) { animation-delay: 0.28s; }
      .reveal.in li:nth-child(4), .reveal.in td:nth-child(4) { animation-delay: 0.34s; }
      .reveal.in li:nth-child(5), .reveal.in td:nth-child(5) { animation-delay: 0.4s; }
      .reveal.in li:nth-child(n + 6), .reveal.in td:nth-child(n + 6) { animation-delay: 0.46s; }
      @keyframes rise { to { opacity: 1; transform: none; filter: blur(0); } }
      @media (prefers-reduced-motion: reduce) {
        html { scroll-behavior: auto; }
        .reveal > *, .reveal.in li, .reveal.in td { opacity: 1; transform: none; filter: none; animation: none; }
      }
    </style>
    
  </head>
  <body>
    <div class="progress" id="progress"></div>
    <article id="readme">Loading profile…</article>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script>
      const readme = document.getElementById('readme')
      const progress = document.getElementById('progress')

      fetch('/README.md')
        .then((response) => response.text())
        .then((markdown) => {
          readme.innerHTML = marked.parse(markdown)
          const hero = document.createElement('header')
          hero.className = 'hero reveal'
          const sections = []
          let current = null
          for (const node of [...readme.children]) {
            if (node.tagName === 'HR') continue
            if (node.tagName === 'H2') {
              current = document.createElement('section')
              current.className = 'block reveal'
              current.append(node)
              sections.push(current)
            } else if (current) {
              current.append(node)
            } else {
              hero.append(node)
            }
          }
          readme.replaceChildren(hero, ...sections)
          for (const node of hero.children) {
            const image = node.querySelector?.('img')
            if (node.tagName === 'H1') continue
            if (!image) {
              node.classList.add('lede')
              continue
            }
            if (node.querySelector('a')) node.classList.add('social')
            else if ((image.getAttribute('alt') || '').includes('Khalif')) node.classList.add('banner')
            else node.classList.add('views')
          }

          const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          if (motion) {
            document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'))
            return
          }
          const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue
              entry.target.classList.add('in')
              observer.unobserve(entry.target)
            }
          }, { threshold: 0.16, rootMargin: '0px 0px -10% 0px' })
          document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
        })
        .catch(() => {
          readme.textContent = 'Could not load README.md'
        })

      const onScroll = () => {
        const height = document.documentElement.scrollHeight - window.innerHeight
        progress.style.transform = 'scaleX(' + (height > 0 ? window.scrollY / height : 0) + ')'
      }
      onScroll()
      window.addEventListener('scroll', onScroll, { passive: true })
    </script>
  </body>
</html>`

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost')
  if (url.pathname === '/' || url.pathname === '/index.html') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    response.end(page)
    return
  }

  const relative = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '')
  const filePath = join(root, relative)
  if (!filePath.startsWith(root)) {
    response.writeHead(403)
    response.end('Forbidden')
    return
  }

  try {
    const body = await readFile(filePath)
    response.writeHead(200, { 'content-type': types[extname(filePath)] ?? 'application/octet-stream' })
    response.end(body)
  } catch {
    response.writeHead(404)
    response.end('Not found')
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Profile preview at http://localhost:${port}`)
})
