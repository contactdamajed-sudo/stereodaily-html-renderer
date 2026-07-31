import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import path from 'path';

export default async function handler(req, res) {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const executablePath = await chromium.executablePath();

    // Direct the Linux dynamic linker to libnspr4.so and libnss3.so
    process.env.LD_LIBRARY_PATH = path.dirname(executablePath);

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    
    // Load page and wait for network activity to settle
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 15000 });
    
    // Give Translera 1.5 seconds to finish updating the DOM
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const renderedHtml = await page.content();
    await browser.close();

    // Set cache header so Cloudflare caches this result
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=15552000, s-maxage=15552000');
    return res.status(200).send(renderedHtml);
  } catch (error) {
    return res.status(500).send(`Rendering error: ${error.message}`);
  }
}
