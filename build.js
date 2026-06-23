#!/usr/bin/env node
// build.js — reads content.yaml, writes docs/index.html
// Run locally:  node build.js
// Run in CI:    same command (GitHub Actions installs deps first)

const fs   = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ── tiny markdown-inline renderer (bold, italic, links only) ─────────────────
function md(str) {
  if (!str) return '';
  return str
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
}

// ── load content ─────────────────────────────────────────────────────────────
const raw = fs.readFileSync(path.join(__dirname, 'content.yaml'), 'utf8');
const c   = yaml.load(raw);

// ── SVG icon snippets ────────────────────────────────────────────────────────
const ICONS = {
  email:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>`,
  telegram:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.11 14.6 4.17 13.7c-.646-.203-.658-.646.136-.958l11.21-4.322c.538-.194 1.01.132.838.958z"/></svg>`,
  github:  `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.113.793-.258.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>`,
  orcid:   `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zM7.369 4.378c.525 0 .947.431.947.947s-.422.947-.947.947-.947-.431-.947-.947.422-.947.947-.947zm-.722 3.038h1.444v10.041H6.647V7.416zm3.562 0h3.9c3.712 0 5.344 2.653 5.344 5.025 0 2.578-2.016 5.025-5.325 5.025h-3.919V7.416zm1.444 1.303v7.444h2.297c3.272 0 3.872-2.853 3.872-3.722 0-2.016-1.284-3.722-3.884-3.722h-2.285z"/></svg>`,
  x:       `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835-8.16-10.665h6.008l4.262 5.633 5.656-5.633zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>`,
  lab:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
  scholar: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 24a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm0-24L0 9.5l4.838 3.94A8 8 0 0 1 12 10a8 8 0 0 1 7.162 3.44L24 9.5z"/></svg>`,
};

// ── attribute escaper (safe for data-* values) ──────────────────────────────
function escAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '&#10;')
    .replace(/\r/g, '');
}

// ── section builders ─────────────────────────────────────────────────────────

function buildHeroChips(chips) {
  return chips.map(ch => `<span class="chip">${ch}</span>`).join('\n      ');
}

function buildAboutLinks(links) {
  return links.map(l => `
        <a href="${l.url}" ${l.url.startsWith('http') ? 'target="_blank"' : ''} class="about-link">
          <span class="about-link-icon">${ICONS[l.icon] || ''}</span>
          ${l.label}
        </a>`).join('');
}

function buildAboutBio(bio) {
  return bio.map(p => `<p>${md(p)}</p>`).join('\n      ');
}

function buildResearch(items) {
  return items.map(r => `
      <div class="research-card fade-in">
        <div class="research-icon">${r.icon}</div>
        <h3>${r.title}</h3>
        <p>${r.description}</p>
      </div>`).join('');
}

function buildExperience(items) {
  return items.map(e => `
      <div class="timeline-item">
        <div class="timeline-left"><div class="timeline-dot"></div><div class="timeline-line"></div></div>
        <div class="timeline-body">
          <div class="timeline-year">${e.period}</div>
          <div class="timeline-role">${e.role}</div>
          <div class="timeline-place">${e.place}</div>
          <div class="timeline-desc">${md(e.description)}</div>
        </div>
      </div>`).join('');
}

function buildPublications(pubs) {
  return pubs.map(p => `
      <div class="pub-card">
        <div class="pub-number">${p.number}</div>
        <div class="pub-content">
          <div class="pub-title">${p.title}</div>
          <div class="pub-meta">${p.authors} &nbsp;<span>${p.venue}</span></div>
          <div class="pub-tags-row">
            ${p.tags.map(t => `<span class="pub-note">${t}</span>`).join(' ')}
          </div>
          <div class="pub-actions">
            ${p.url  ? `<a href="${escAttr(p.url)}" target="_blank" rel="noopener" class="pub-btn pub-btn-link">View Paper ↗</a>` : ''}
            ${p.bibtex ? `<button class="pub-btn pub-btn-copy" onclick="copyBibtex(this)" data-bib="${escAttr(p.bibtex)}">Copy BibTeX</button>` : ''}
          </div>
        </div>
      </div>`).join('');
}

function buildService(items) {
  return items.map(s => `
      <div class="service-card">
        <div class="service-role">${s.role}</div>
        <div class="service-name">${s.name}</div>
        <div class="service-detail">${s.detail}</div>
        ${s.link ? `<a href="${s.link}" target="_blank" class="service-link">${new URL(s.link).hostname} ↗</a>` : ''}
      </div>`).join('');
}

function buildConferences(items) {
  return items.map(conf => `
      <div class="conf-card">
        <div class="conf-date">${conf.date.replace(/\n/g, '<br>')}</div>
        <div class="conf-content">
          <div class="conf-name">${conf.name}</div>
          <div class="conf-desc">${md(conf.description)}</div>
          ${conf.tags.map(t => `<span class="conf-tag">${t}</span>`).join('')}
          ${conf.link ? `<a href="${conf.link}" target="_blank" class="conf-link">${conf.link} ↗</a>` : ''}
        </div>
      </div>`).join('');
}

function buildThesisStudents(students) {
  return students.map(s => `
          <div class="thesis-card">
            <div class="thesis-year">${s.year}</div>
            <div class="thesis-content">
              <div class="thesis-student">${s.student}</div>
              <div class="thesis-topic">${s.topic}</div>
              <div class="thesis-badge">${s.degree}</div>
            </div>
          </div>`).join('');
}

function buildSkills(groups) {
  return groups.map(g => `
      <div class="skill-group">
        <h4>${g.group}</h4>
        <div class="skill-tags">
          ${g.tags.map(t => `<span class="skill-tag">${t}</span>`).join('\n          ')}
        </div>
      </div>`).join('');
}

// ── HTML template ─────────────────────────────────────────────────────────────
const { meta, hero, about, research, experience, publications, service,
        conferences, teaching, skills, contact } = c;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${meta.name} — ${meta.title}</title>
<meta name="description" content="${meta.description}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --navy:      #0A0F1E;
    --navy-card: #161D2F;
    --violet:    #6C3BF5;
    --violet-lt: #8B5CF6;
    --cyan:      #00E5FF;
    --cyan-dim:  rgba(0,229,255,0.15);
    --white:     #F0F4FF;
    --gray:      #8892A4;
    --gray-dim:  #3A4358;
    --fd:        'Space Grotesk', sans-serif;
    --fb:        'Inter', sans-serif;
    --fm:        'JetBrains Mono', monospace;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: var(--navy); color: var(--white); font-family: var(--fb); line-height: 1.65; overflow-x: hidden; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: var(--navy); }
  ::-webkit-scrollbar-thumb { background: var(--violet); border-radius: 3px; }

  /* NAV */
  nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 1rem 3rem; background: rgba(10,15,30,0.88); backdrop-filter: blur(14px); border-bottom: 1px solid rgba(108,59,245,0.2); }
  .nav-logo { font-family: var(--fd); font-weight: 700; font-size: 1.1rem; color: var(--white); text-decoration: none; letter-spacing: -.02em; }
  .nav-logo span { color: var(--cyan); }
  .nav-links { display: flex; gap: 1.6rem; list-style: none; }
  .nav-links a { color: var(--gray); text-decoration: none; font-size: .8rem; font-weight: 500; letter-spacing: .04em; text-transform: uppercase; transition: color .2s; }
  .nav-links a:hover { color: var(--cyan); }

  /* HERO */
  .hero { position: relative; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 8rem 3rem 4rem; overflow: hidden; }
  #neural-canvas { position: absolute; inset: 0; width: 100%; height: 100%; opacity: .55; }
  .hero-content { position: relative; z-index: 2; max-width: 820px; text-align: center; }
  .hero-eyebrow { font-family: var(--fm); font-size: .8rem; color: var(--cyan); letter-spacing: .15em; text-transform: uppercase; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: center; gap: .75rem; }
  .hero-eyebrow::before, .hero-eyebrow::after { content: ''; flex: 1; max-width: 60px; height: 1px; background: var(--cyan); opacity: .5; }
  .hero-name { font-family: var(--fd); font-size: clamp(3rem,8vw,6rem); font-weight: 700; line-height: 1.05; letter-spacing: -.03em; margin-bottom: 1rem; }
  .hero-name .highlight { background: linear-gradient(135deg,var(--violet),var(--cyan)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .hero-title { font-size: 1.1rem; color: var(--gray); max-width: 580px; margin: 0 auto 2.5rem; }
  .hero-chips { display: flex; flex-wrap: wrap; gap: .6rem; justify-content: center; margin-bottom: 2.5rem; }
  .chip { background: rgba(108,59,245,.12); border: 1px solid rgba(108,59,245,.35); color: var(--violet-lt); font-family: var(--fm); font-size: .72rem; padding: .3rem .8rem; border-radius: 100px; letter-spacing: .04em; transition: all .2s; }
  .chip:hover { background: rgba(108,59,245,.25); border-color: var(--violet); }
  .hero-cta { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
  .btn { padding: .75rem 2rem; border-radius: 8px; font-weight: 600; font-size: .9rem; text-decoration: none; transition: all .25s; cursor: pointer; font-family: var(--fb); border: none; display: inline-flex; align-items: center; gap: .5rem; }
  .btn-primary { background: linear-gradient(135deg,var(--violet),#9B59F5); color:#fff; box-shadow: 0 0 24px rgba(108,59,245,.4); }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 0 36px rgba(108,59,245,.6); }
  .btn-outline { background: transparent; color: var(--cyan); border: 1.5px solid rgba(0,229,255,.5); }
  .btn-outline:hover { background: var(--cyan-dim); border-color: var(--cyan); transform: translateY(-2px); }

  /* SECTIONS */
  section { padding: 5rem 3rem; max-width: 1100px; margin: 0 auto; }
  .section-label { font-family: var(--fm); font-size: .75rem; color: var(--cyan); letter-spacing: .15em; text-transform: uppercase; margin-bottom: .5rem; }
  .section-title { font-family: var(--fd); font-size: clamp(1.8rem,4vw,2.6rem); font-weight: 700; letter-spacing: -.025em; line-height: 1.1; margin-bottom: 1rem; }
  .section-rule { width: 2rem; height: 3px; background: linear-gradient(90deg,var(--violet),var(--cyan)); border-radius: 2px; margin-bottom: 2.5rem; }
  .section-divider { height: 1px; background: linear-gradient(90deg,transparent,var(--gray-dim),transparent); max-width: 1100px; margin: 0 auto; }

  /* ABOUT */
  .about-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 4rem; align-items: start; }
  .about-photo-wrap { position: relative; }
  .about-photo-wrap::before { content: ''; position: absolute; inset: -3px; background: linear-gradient(135deg,var(--violet),var(--cyan)); border-radius: 16px; z-index: 0; }
  .about-photo-placeholder { position: relative; z-index: 1; background: var(--navy-card); border-radius: 14px; aspect-ratio: 4/5; display: flex; align-items: center; justify-content: center; }
  .avatar-initials { font-family: var(--fd); font-size: 4rem; font-weight: 700; color: var(--violet-lt); opacity: .7; }
  .about-links { display: flex; flex-direction: column; gap: .6rem; margin-top: 1.5rem; }
  .about-link { display: flex; align-items: center; gap: .6rem; text-decoration: none; color: var(--gray); font-size: .875rem; transition: color .2s; }
  .about-link:hover { color: var(--cyan); }
  .about-link-icon { width: 18px; flex-shrink: 0; color: var(--violet-lt); }
  .about-link-icon svg { width: 18px; height: 18px; }
  .about-text p { color: var(--gray); margin-bottom: 1rem; font-size: .975rem; }
  .about-text p strong { color: var(--white); font-weight: 500; }

  /* RESEARCH */
  .research-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(280px,1fr)); gap: 1.2rem; }
  .research-card { background: var(--navy-card); border: 1px solid var(--gray-dim); border-radius: 12px; padding: 1.75rem; transition: all .3s; position: relative; overflow: hidden; }
  .research-card::before { content: ''; position: absolute; inset: 0; opacity: 0; background: linear-gradient(135deg,rgba(108,59,245,.07),rgba(0,229,255,.05)); transition: opacity .3s; }
  .research-card:hover { border-color: var(--violet); transform: translateY(-4px); }
  .research-card:hover::before { opacity: 1; }
  .research-icon { width: 44px; height: 44px; border-radius: 10px; margin-bottom: 1rem; background: rgba(108,59,245,.15); border: 1px solid rgba(108,59,245,.3); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; }
  .research-card h3 { font-family: var(--fd); font-weight: 600; font-size: 1rem; margin-bottom: .5rem; }
  .research-card p { color: var(--gray); font-size: .85rem; line-height: 1.6; }

  /* TIMELINE */
  .timeline { display: flex; flex-direction: column; }
  .timeline-item { display: flex; gap: 1.5rem; padding-bottom: 2.5rem; }
  .timeline-item:last-child { padding-bottom: 0; }
  .timeline-left { display: flex; flex-direction: column; align-items: center; }
  .timeline-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; background: var(--violet); border: 2px solid var(--navy); animation: pulse-glow 2.5s infinite; }
  .timeline-line { width: 1px; flex: 1; background: var(--gray-dim); margin-top: 4px; }
  .timeline-item:last-child .timeline-line { display: none; }
  .timeline-body { flex: 1; }
  .timeline-year { font-family: var(--fm); font-size: .75rem; color: var(--cyan); margin-bottom: .25rem; }
  .timeline-role { font-family: var(--fd); font-weight: 600; font-size: 1.05rem; margin-bottom: .15rem; }
  .timeline-place { color: var(--violet-lt); font-size: .875rem; margin-bottom: .5rem; }
  .timeline-desc { color: var(--gray); font-size: .875rem; }
  .timeline-desc strong { color: var(--white); font-weight: 500; }

  /* PUBLICATIONS */
  .pub-list { display: flex; flex-direction: column; gap: 1rem; }
  .pub-card { background: var(--navy-card); border: 1px solid var(--gray-dim); border-radius: 10px; padding: 1.25rem 1.5rem; display: flex; gap: 1rem; align-items: flex-start; transition: border-color .2s; }
  .pub-card:hover { border-color: var(--violet); }
  .pub-number { font-family: var(--fm); font-size: .85rem; color: var(--violet-lt); padding-top: 2px; flex-shrink: 0; min-width: 1.5rem; }
  .pub-content { flex: 1; }
  .pub-title { font-weight: 500; font-size: .925rem; margin-bottom: .3rem; line-height: 1.5; }
  .pub-meta { font-size: .8rem; color: var(--gray); margin-bottom: .3rem; }
  .pub-meta span { color: var(--cyan); font-family: var(--fm); font-size: .75rem; }
  .pub-note { font-size: .72rem; font-family: var(--fm); background: rgba(0,229,255,.1); color: var(--cyan); border: 1px solid rgba(0,229,255,.25); border-radius: 4px; padding: .1rem .5rem; display: inline-block; margin-right: .3rem; }
  .pub-tags-row { margin-bottom: .4rem; }
  .pub-actions { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .5rem; }
  .pub-btn { font-size: .72rem; font-family: var(--fm); padding: .22rem .65rem; border-radius: 4px; cursor: pointer; text-decoration: none; transition: all .2s; display: inline-flex; align-items: center; line-height: 1.4; }
  .pub-btn-link { background: rgba(108,59,245,.1); color: var(--violet-lt); border: 1px solid rgba(108,59,245,.3); }
  .pub-btn-link:hover { background: rgba(108,59,245,.22); border-color: var(--violet); color: var(--white); }
  .pub-btn-copy { background: rgba(0,229,255,.07); color: var(--cyan); border: 1px solid rgba(0,229,255,.25); }
  .pub-btn-copy:hover { background: rgba(0,229,255,.16); }
  .pub-btn-copy.copied { color: #4ade80; border-color: rgba(74,222,128,.4); background: rgba(74,222,128,.08); }

  /* SERVICE */
  .service-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(300px,1fr)); gap: 1.1rem; }
  .service-card { background: var(--navy-card); border: 1px solid var(--gray-dim); border-radius: 10px; padding: 1.1rem 1.4rem; transition: border-color .2s; }
  .service-card:hover { border-color: var(--violet); }
  .service-role { font-family: var(--fm); font-size: .7rem; color: var(--cyan); letter-spacing: .08em; text-transform: uppercase; margin-bottom: .35rem; }
  .service-name { font-weight: 600; font-size: .9rem; margin-bottom: .2rem; }
  .service-detail { color: var(--gray); font-size: .82rem; }
  .service-link { color: var(--violet-lt); font-size: .8rem; text-decoration: none; display: inline-block; margin-top: .35rem; }
  .service-link:hover { color: var(--cyan); }

  /* CONFERENCES */
  .conf-list { display: flex; flex-direction: column; gap: 1rem; }
  .conf-card { background: var(--navy-card); border: 1px solid var(--gray-dim); border-radius: 10px; padding: 1.1rem 1.5rem; display: flex; gap: 1.2rem; align-items: flex-start; transition: border-color .2s; }
  .conf-card:hover { border-color: var(--cyan); }
  .conf-date { font-family: var(--fm); font-size: .72rem; color: var(--cyan); flex-shrink: 0; padding-top: 3px; min-width: 5.5rem; line-height: 1.5; }
  .conf-content { flex: 1; }
  .conf-name { font-weight: 600; font-size: .92rem; margin-bottom: .15rem; }
  .conf-desc { color: var(--gray); font-size: .83rem; line-height: 1.55; }
  .conf-tag { font-size: .7rem; font-family: var(--fm); background: rgba(0,229,255,.08); color: var(--cyan); border: 1px solid rgba(0,229,255,.2); border-radius: 4px; padding: .1rem .5rem; display: inline-block; margin-top: .35rem; margin-right: .3rem; }
  .conf-link { color: var(--violet-lt); font-size: .8rem; text-decoration: none; display: inline-block; margin-top: .3rem; }
  .conf-link:hover { color: var(--cyan); }

  /* TEACHING */
  .cultore-card { background: var(--navy-card); border: 1px solid rgba(108,59,245,.4); border-radius: 12px; padding: 1.5rem 1.75rem; display: flex; gap: 1.25rem; align-items: flex-start; margin-bottom: 3rem; }
  .cultore-icon { font-size: 1.8rem; flex-shrink: 0; }
  .cultore-label { font-family: var(--fm); font-size: .72rem; color: var(--cyan); letter-spacing: .1em; text-transform: uppercase; margin-bottom: .35rem; }
  .cultore-title { font-family: var(--fd); font-weight: 600; font-size: 1.05rem; margin-bottom: .25rem; }
  .cultore-place { color: var(--violet-lt); font-size: .875rem; margin-bottom: .5rem; }
  .cultore-desc { color: var(--gray); font-size: .875rem; }
  .thesis-grid { display: flex; flex-direction: column; gap: .9rem; }
  .thesis-card { background: var(--navy-card); border: 1px solid var(--gray-dim); border-radius: 10px; padding: 1.1rem 1.4rem; display: flex; gap: 1.2rem; align-items: flex-start; transition: border-color .2s; }
  .thesis-card:hover { border-color: var(--violet); }
  .thesis-year { font-family: var(--fm); font-size: .75rem; color: var(--cyan); flex-shrink: 0; padding-top: 3px; min-width: 2.5rem; }
  .thesis-content { flex: 1; }
  .thesis-student { font-weight: 600; font-size: .9rem; margin-bottom: .15rem; }
  .thesis-topic { color: var(--gray); font-size: .85rem; line-height: 1.55; }
  .thesis-badge { font-size: .7rem; font-family: var(--fm); background: rgba(108,59,245,.12); color: var(--violet-lt); border: 1px solid rgba(108,59,245,.3); border-radius: 4px; padding: .1rem .5rem; display: inline-block; margin-top: .35rem; }

  /* SKILLS */
  .skills-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(200px,1fr)); gap: 1.5rem; }
  .skill-group h4 { font-family: var(--fm); font-size: .7rem; color: var(--cyan); letter-spacing: .1em; text-transform: uppercase; margin-bottom: .75rem; }
  .skill-tags { display: flex; flex-wrap: wrap; gap: .4rem; }
  .skill-tag { background: rgba(255,255,255,.04); border: 1px solid var(--gray-dim); color: var(--gray); font-size: .8rem; padding: .25rem .7rem; border-radius: 6px; }

  /* CONTACT */
  .contact-wrap { display: grid; grid-template-columns: 1fr 1.2fr; gap: 4rem; align-items: start; }
  .contact-info { display: flex; flex-direction: column; gap: 1.5rem; }
  .contact-item { display: flex; gap: .85rem; align-items: flex-start; }
  .contact-icon { width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0; background: rgba(108,59,245,.12); border: 1px solid rgba(108,59,245,.3); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
  .contact-item h4 { font-size: .8rem; color: var(--gray); text-transform: uppercase; letter-spacing: .08em; font-family: var(--fm); }
  .contact-item a { color: var(--white); text-decoration: none; font-size: .95rem; transition: color .2s; }
  .contact-item a:hover { color: var(--cyan); }
  .contact-form { display: flex; flex-direction: column; gap: 1rem; }
  .form-group { display: flex; flex-direction: column; gap: .35rem; }
  .form-group label { font-size: .8rem; color: var(--gray); font-weight: 500; }
  .form-group input, .form-group textarea { background: var(--navy-card); border: 1px solid var(--gray-dim); color: var(--white); font-family: var(--fb); font-size: .9rem; padding: .75rem 1rem; border-radius: 8px; outline: none; resize: vertical; transition: border-color .2s; }
  .form-group input::placeholder, .form-group textarea::placeholder { color: var(--gray-dim); }
  .form-group input:focus, .form-group textarea:focus { border-color: var(--violet); box-shadow: 0 0 0 3px rgba(108,59,245,.12); }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .form-status { font-size: .85rem; text-align: center; padding: .5rem; border-radius: 6px; display: none; }
  .form-status.success { background: rgba(0,229,255,.1); color: var(--cyan); display: block; }
  .form-status.error { background: rgba(245,59,59,.1); color: #f87171; display: block; }

  /* FOOTER */
  footer { border-top: 1px solid var(--gray-dim); padding: 2rem 3rem; text-align: center; color: var(--gray); font-size: .8rem; }
  footer a { color: var(--violet-lt); text-decoration: none; }
  footer a:hover { color: var(--cyan); }

  /* ANIMATIONS */
  @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 8px rgba(108,59,245,.7); } 50% { box-shadow: 0 0 22px rgba(0,229,255,.9),0 0 8px rgba(108,59,245,.7); } }
  .fade-in { opacity: 0; transform: translateY(24px); transition: opacity .6s ease,transform .6s ease; }
  .fade-in.visible { opacity: 1; transform: translateY(0); }

  @media (max-width:768px) {
    nav { padding: 1rem 1.25rem; }
    .nav-links { display: none; }
    section { padding: 3.5rem 1.25rem; }
    .about-grid, .contact-wrap { grid-template-columns: 1fr; }
    .about-photo-wrap { max-width: 220px; }
    .form-row { grid-template-columns: 1fr; }
    .hero { padding: 7rem 1.25rem 3rem; }
  }
  @media (prefers-reduced-motion:reduce) {
    *, *::before, *::after { animation: none !important; transition: none !important; }
    .fade-in { opacity: 1; transform: none; }
  }
</style>
</head>
<body>

<nav>
  <a href="#" class="nav-logo">Danny<span>.</span>DeNovi</a>
  <ul class="nav-links">
    <li><a href="#about">About</a></li>
    <li><a href="#research">Research</a></li>
    <li><a href="#education">Experience</a></li>
    <li><a href="#publications">Publications</a></li>
    <li><a href="#service">Service</a></li>
    <li><a href="#teaching">Teaching</a></li>
    <li><a href="#contact">Contact</a></li>
  </ul>
</nav>

<div class="hero">
  <canvas id="neural-canvas"></canvas>
  <div class="hero-content">
    <div class="hero-eyebrow">${hero.eyebrow}</div>
    <h1 class="hero-name">${hero.name_line1}<br><span class="highlight">${hero.name_line2}</span></h1>
    <p class="hero-title">${hero.subtitle}</p>
    <div class="hero-chips">
      ${buildHeroChips(hero.chips)}
    </div>
    <div class="hero-cta">
      <a href="#contact" class="btn btn-primary">Get in Touch</a>
      <a href="#publications" class="btn btn-outline">View Publications</a>
    </div>
  </div>
</div>

<section id="about">
  <div class="fade-in">
    <p class="section-label">// About me</p>
    <h2 class="section-title">AI Researcher,<br>Engineer &amp; Builder</h2>
    <div class="section-rule"></div>
  </div>
  <div class="about-grid fade-in">
    <div>
      <div class="about-photo-wrap">
        <div class="about-photo-placeholder">
          <div class="avatar-initials">DDN</div>
        </div>
      </div>
      <div class="about-links">
        ${buildAboutLinks(about.links)}
      </div>
    </div>
    <div class="about-text">
      ${buildAboutBio(about.bio)}
    </div>
  </div>
</section>

<div class="section-divider"></div>

<section id="research">
  <div class="fade-in">
    <p class="section-label">// Research areas</p>
    <h2 class="section-title">What I Work On</h2>
    <div class="section-rule"></div>
  </div>
  <div class="research-grid">
    ${buildResearch(research)}
  </div>
</section>

<div class="section-divider"></div>

<section id="education">
  <div class="fade-in">
    <p class="section-label">// Education &amp; Experience</p>
    <h2 class="section-title">Academic &amp; Professional Path</h2>
    <div class="section-rule"></div>
  </div>
  <div class="timeline fade-in">
    ${buildExperience(experience)}
  </div>
</section>

<div class="section-divider"></div>

<section id="publications">
  <div class="fade-in">
    <p class="section-label">// Publications</p>
    <h2 class="section-title">Research Output</h2>
    <div class="section-rule"></div>
    <p style="color:var(--gray);font-size:.9rem;margin-bottom:1.5rem;">
      Full list on <a href="${about.links.find(l=>l.icon==='scholar').url}" target="_blank" style="color:var(--violet-lt);text-decoration:none;">Google Scholar</a>
      &amp; <a href="${about.links.find(l=>l.icon==='orcid').url}" target="_blank" style="color:var(--violet-lt);text-decoration:none;">ORCID</a>.
    </p>
  </div>
  <div class="pub-list fade-in">
    ${buildPublications(publications)}
  </div>
</section>

<div class="section-divider"></div>

<section id="service">
  <div class="fade-in">
    <p class="section-label">// Academic service</p>
    <h2 class="section-title">Reviewing &amp; Program Committees</h2>
    <div class="section-rule"></div>
  </div>
  <div class="service-grid fade-in">
    ${buildService(service)}
  </div>
</section>

<div class="section-divider"></div>

<section id="conferences">
  <div class="fade-in">
    <p class="section-label">// Conferences &amp; Events</p>
    <h2 class="section-title">Talks &amp; Participation</h2>
    <div class="section-rule"></div>
  </div>
  <div class="conf-list fade-in">
    ${buildConferences(conferences)}
  </div>
</section>

<div class="section-divider"></div>

<section id="teaching">
  <div class="fade-in">
    <p class="section-label">// Teaching &amp; Supervision</p>
    <h2 class="section-title">Teaching &amp; Thesis Supervision</h2>
    <div class="section-rule"></div>
  </div>
  <div class="fade-in">
    <div class="cultore-card">
      <div class="cultore-icon">🎓</div>
      <div>
        <div class="cultore-label">Cultore della Materia · ${teaching.cultore.period}</div>
        <div class="cultore-title">${teaching.cultore.subject}</div>
        <div class="cultore-place">${teaching.cultore.institution}</div>
        <div class="cultore-desc">${teaching.cultore.description}</div>
      </div>
    </div>
  </div>
  <div class="fade-in">
    <p style="color:var(--gray);font-size:.875rem;margin-bottom:1.25rem;">Students I have co-supervised or supported in their thesis work:</p>
    <div class="thesis-grid">
      ${buildThesisStudents(teaching.thesis_students)}
    </div>
  </div>
</section>

<div class="section-divider"></div>

<section>
  <div class="fade-in">
    <p class="section-label">// Tech stack</p>
    <h2 class="section-title">Skills &amp; Tools</h2>
    <div class="section-rule"></div>
  </div>
  <div class="skills-grid fade-in">
    ${buildSkills(skills)}
  </div>
</section>

<div class="section-divider"></div>

<section id="contact">
  <div class="fade-in">
    <p class="section-label">// Get in touch</p>
    <h2 class="section-title">Let's Connect</h2>
    <div class="section-rule"></div>
  </div>
  <div class="contact-wrap fade-in">
    <div class="contact-info">
      <p style="color:var(--gray);font-size:.925rem;margin-bottom:.5rem;">Open to collaborations on research in secure, reproducible, and sustainable AI — or a conversation about distributed intelligence, orbital FL, or blockchain certification.</p>
      <div class="contact-item">
        <div class="contact-icon">✉️</div>
        <div><h4>Email</h4><a href="mailto:${contact.email}">${contact.email}</a></div>
      </div>
      <div class="contact-item">
        <div class="contact-icon">💬</div>
        <div><h4>Telegram</h4><a href="${contact.telegram_url}" target="_blank">${contact.telegram}</a></div>
      </div>
      <div class="contact-item">
        <div class="contact-icon">🐙</div>
        <div><h4>GitHub</h4><a href="${contact.github_url}" target="_blank">${contact.github}</a></div>
      </div>
      <div class="contact-item">
        <div class="contact-icon">🎓</div>
        <div><h4>Scholar</h4><a href="${contact.scholar_url}" target="_blank">Google Scholar Profile</a></div>
      </div>
      <div class="contact-item">
        <div class="contact-icon">🔬</div>
        <div><h4>Lab</h4><a href="${contact.fcrlab_url}" target="_blank">FCRLab @ UniME</a></div>
      </div>
      <div class="contact-item">
        <div class="contact-icon">🌐</div>
        <div><h4>Project</h4><a href="${contact.project_url}" target="_blank">${contact.project_name}</a></div>
      </div>
    </div>
    <form class="contact-form" id="contact-form" action="${contact.formspree_endpoint}" method="POST">
      <div class="form-row">
        <div class="form-group">
          <label for="name">Name</label>
          <input type="text" id="name" name="name" placeholder="Your name" required>
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" placeholder="your@email.com" required>
        </div>
      </div>
      <div class="form-group">
        <label for="subject">Subject</label>
        <input type="text" id="subject" name="subject" placeholder="Collaboration, question, etc.">
      </div>
      <div class="form-group">
        <label for="message">Message</label>
        <textarea id="message" name="message" rows="5" placeholder="Tell me about your project or idea..." required></textarea>
      </div>
      <input type="hidden" name="_replyto" value="${contact.email}">
      <button type="submit" class="btn btn-primary" style="align-self:flex-start;">Send Message →</button>
      <div class="form-status" id="form-status"></div>
    </form>
  </div>
</section>

<footer>
  <p>${meta.name} © ${new Date().getFullYear()} · PhD Researcher @ <a href="https://fcrlab.unime.it" target="_blank">FCRLab, UniME</a> · <a href="${contact.project_url}" target="_blank">${contact.project_name}</a></p>
</footer>

<script>
(function(){
  const canvas=document.getElementById('neural-canvas'),ctx=canvas.getContext('2d');
  let W,H,nodes;const mouse={x:-999,y:-999},N=60,MD=165;
  function resize(){W=canvas.width=canvas.offsetWidth;H=canvas.height=canvas.offsetHeight;if(!nodes)init();}
  function init(){nodes=Array.from({length:N},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.42,vy:(Math.random()-.5)*.42,r:Math.random()*2.2+1.2,t:Math.random()>.4?'v':'c'}));}
  function draw(){
    ctx.clearRect(0,0,W,H);
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i],b=nodes[j],dx=a.x-b.x,dy=a.y-b.y,d=Math.sqrt(dx*dx+dy*dy);
        if(d<MD){const al=(1-d/MD)*.35,g=ctx.createLinearGradient(a.x,a.y,b.x,b.y);g.addColorStop(0,\`rgba(108,59,245,\${al})\`);g.addColorStop(1,\`rgba(0,229,255,\${al*.6})\`);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=g;ctx.lineWidth=1;ctx.stroke();}
      }
      const mdx=nodes[i].x-mouse.x,mdy=nodes[i].y-mouse.y,md=Math.sqrt(mdx*mdx+mdy*mdy);
      if(md<180){ctx.beginPath();ctx.moveTo(nodes[i].x,nodes[i].y);ctx.lineTo(mouse.x,mouse.y);ctx.strokeStyle=\`rgba(0,229,255,\${(1-md/180)*.6})\`;ctx.lineWidth=1.2;ctx.stroke();}
    }
    for(const n of nodes){
      const mdx=n.x-mouse.x,mdy=n.y-mouse.y,p=Math.max(0,1-Math.sqrt(mdx*mdx+mdy*mdy)/180);
      ctx.beginPath();ctx.arc(n.x,n.y,n.r+p*2,0,Math.PI*2);ctx.fillStyle=n.t==='v'?\`rgba(108,59,245,\${.7+p*.3})\`:\`rgba(0,229,255,\${.6+p*.4})\`;ctx.fill();
      ctx.beginPath();ctx.arc(n.x,n.y,(n.r+p*2)*2.5,0,Math.PI*2);ctx.fillStyle=n.t==='v'?\`rgba(108,59,245,\${.05+p*.1})\`:\`rgba(0,229,255,\${.04+p*.1})\`;ctx.fill();
      n.x+=n.vx;n.y+=n.vy;if(n.x<0||n.x>W)n.vx*=-1;if(n.y<0||n.y>H)n.vy*=-1;
    }
    requestAnimationFrame(draw);
  }
  window.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top;});
  window.addEventListener('resize',resize);resize();draw();
})();
function copyBibtex(btn){
  const bib=btn.getAttribute('data-bib');
  const done=()=>{btn.textContent='Copied!';btn.classList.add('copied');setTimeout(()=>{btn.textContent='Copy BibTeX';btn.classList.remove('copied');},2000);};
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(bib).then(done).catch(()=>fallback(bib,done));}else{fallback(bib,done);}
  function fallback(text,cb){const ta=document.createElement('textarea');ta.value=text;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');cb();}catch(e){}document.body.removeChild(ta);}
}
(function(){
  const els=document.querySelectorAll('.fade-in');
  const obs=new IntersectionObserver((entries)=>{entries.forEach((e,i)=>{if(e.isIntersecting){setTimeout(()=>e.target.classList.add('visible'),i*60);obs.unobserve(e.target);}});},{threshold:.08});
  els.forEach(el=>obs.observe(el));
})();
(function(){
  const form=document.getElementById('contact-form'),status=document.getElementById('form-status');
  if(!form)return;
  form.addEventListener('submit',async(e)=>{
    e.preventDefault();const btn=form.querySelector('button[type=submit]');
    btn.textContent='Sending…';btn.disabled=true;
    try{const res=await fetch(form.action,{method:'POST',body:new FormData(form),headers:{'Accept':'application/json'}});
      if(res.ok){status.className='form-status success';status.textContent="✓ Message sent! I'll get back to you soon.";form.reset();}else throw new Error();}
    catch{status.className='form-status error';status.textContent='✗ Something went wrong. Please email ${contact.email} directly.';}
    btn.textContent='Send Message →';btn.disabled=false;});
})();
</script>
</body>
</html>`;

// ── write output ──────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, 'docs');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
console.log(`✓ Built docs/index.html  (${(html.length/1024).toFixed(1)} KB)`);
