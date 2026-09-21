export default async (request, context) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const subject = url.searchParams.get('subject') || 'CLASSIFIED AGENT';
  const vector = url.searchParams.get('vector') || 'ANOMALOUS PATHWAY';
  const reason = url.searchParams.get('reason') || 'Classified mortality telemetry record.';

  // If no dossier token exists, let standard static routing handle the request
  if (!token) {
    return context.next();
  }

  // Detect social crawler bots
  const userAgent = request.headers.get('user-agent') || '';
  const isCrawler = /bot|crawl|spider|discordbot|twitterbot|whatsapp|telegrambot|facebookexternalhit/i.test(userAgent);

  if (isCrawler) {
    const title = `PROJECT AEGIS // ${subject.toUpperCase()} [${token}]`;
    const description = `[DIRECTIVE: ${vector.toUpperCase()}] "${reason}"`;

    const previewHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="title" content="${title}">
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook / Discord -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="PROJECT AEGIS // CLASSIFIED TERMINAL">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${url.href}">
  <meta name="theme-color" content="#e11d48">

  <!-- Twitter Cards -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
</head>
<body style="background:#04060b; color:#e2e8f0; font-family:monospace; padding:2rem;">
  <h2>${title}</h2>
  <p>${description}</p>
</body>
</html>`;

    return new Response(previewHtml, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=3600'
      }
    });
  }

  // Human visitor: serve the actual SPA
  return context.next();
};

export const config = {
  path: '/*'
};