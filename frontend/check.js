import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request =>
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText)
  );

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });

  // Type in username and password
  await page.type('#login-username', 'admin');
  await page.type('#login-password', 'admin123'); // assuming test credentials
  await page.click('#login-submit');

  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  
  // Also dump body to see if it's blank
  const html = await page.content();
  console.log('HTML length:', html.length);
  
  await browser.close();
})();
