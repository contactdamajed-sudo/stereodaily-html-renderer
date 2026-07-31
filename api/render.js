import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import path from 'path';

export default async function handler(req, res) {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    if (typeof chromium.setGraphicsMode === 'function') {
      chromium.setGraphicsMode(false);
    }

    const executablePath = await chromium.executablePath();
    const execDir = path.dirname(executablePath);
    process.env.LD_LIBRARY_PATH = `${execDir}:${process.env.LD_LIBRARY_PATH || ''}`;

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    
    await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((resolve) => setTimeout(resolve, 4000));

    const renderedHtml = await page.content();
    await browser.close();

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=15552000, s-maxage=15552000');
    return res.status(200).send(renderedHtml);
  } catch (error) {
    return res.status(500).send(`Rendering error: ${error.message}`);
  }
}
