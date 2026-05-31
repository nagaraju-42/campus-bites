const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

// Find Google Chrome path
const paths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Users\\NAGARAJU\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
];

let executablePath = null;
for (const p of paths) {
  if (fs.existsSync(p)) {
    executablePath = p;
    break;
  }
}

if (!executablePath) {
  console.error('❌ Could not find Google Chrome installation. Checked paths:\n', paths.join('\n'));
  process.exit(1);
}

console.log(`🌐 Google Chrome found at: ${executablePath}`);

// Setup artifact directory for saving screenshots
const artifactDir = 'C:\\Users\\NAGARAJU\\.gemini\\antigravity\\brain\\7ec59eb2-079d-499a-ba95-0cc9af9a3c85';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('🚀 Starting end-to-end portal testing with Puppeteer...');
  
  const browser = await puppeteer.launch({
    executablePath,
    headless: true, // Run headlessly for speed and automation
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Forward browser console logs to Node console
  page.on('console', msg => {
    console.log(`BROWSER [${msg.type().toUpperCase()}]:`, msg.text());
  });

  page.on('pageerror', err => {
    console.error('BROWSER ERROR:', err.toString());
  });

  // Log network requests and responses to/from supabase
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('supabase.co') && (url.includes('token') || url.includes('user'))) {
      try {
        const status = response.status();
        const text = await response.text();
        console.log(`📡 NETWORK RESPONSE: ${url} | Status: ${status} | Body: ${text.substring(0, 300)}`);
      } catch (e) {
        // Ignore binary or failed responses
      }
    }
  });

  await page.setViewport({ width: 1280, height: 800 });

  const BASE_URL = 'http://localhost:3000';

  try {
    // ----------------------------------------------------
    // TEST 1: STUDENT PORTAL
    // ----------------------------------------------------
    console.log('\n🎓 --- Testing Student App ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    console.log('✓ Navigated to Student Login page');

    await page.type('input[type="email"]', 'student@campusbites.com');
    await page.type('input[type="password"]', 'password123');
    console.log('✓ Typed Student credentials');

    await page.click('button[type="submit"]');
    console.log('✓ Clicked login button. Waiting for dashboard...');
    await delay(4000); // Wait for transition
    
    let currentUrl = page.url();
    console.log(`✓ Redirected to: ${currentUrl}`);
    if (currentUrl.includes('/student/home')) {
      console.log('✅ Student Login Successful!');
    } else {
      throw new Error(`Failed to log in. Landed on: ${currentUrl}`);
    }

    const studentScreenshotPath = path.join(artifactDir, 'student_home.png');
    await page.screenshot({ path: studentScreenshotPath });
    console.log(`✓ Student home screenshot saved to: ${studentScreenshotPath}`);

    // Logout
    console.log('⚙️ Logging out of Student portal...');
    await page.goto(`${BASE_URL}/student/profile`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const logout = buttons.find(b => b.textContent.includes('Log Out') || b.textContent.includes('Logout'));
      if (logout) logout.click();
    });
    await delay(4000);
    console.log(`✓ Student logged out cleanly. Active URL: ${page.url()}`);

    // ----------------------------------------------------
    // TEST 2: ADMIN PORTAL
    // ----------------------------------------------------
    console.log('\n🛡️ --- Testing Admin Portal ---');
    await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle2' });
    console.log('✓ Navigated to Admin Login page');
    await delay(3000); // Wait for potential checks to run

    await page.type('input[type="email"]', 'admin@campusbites.com');
    await page.type('input[type="password"]', 'password123');
    console.log('✓ Typed Admin credentials');

    await page.click('button[type="submit"]');
    console.log('✓ Clicked login button. Waiting for dashboard...');
    await delay(5000);

    currentUrl = page.url();
    console.log(`✓ Redirected to: ${currentUrl}`);
    if (currentUrl.includes('/admin/dashboard')) {
      console.log('✅ Admin Login Successful!');
    } else {
      throw new Error(`Failed to log in. Landed on: ${currentUrl}`);
    }

    const adminScreenshotPath = path.join(artifactDir, 'admin_dashboard.png');
    await page.screenshot({ path: adminScreenshotPath });
    console.log(`✓ Admin dashboard screenshot saved to: ${adminScreenshotPath}`);

    // Logout
    console.log('⚙️ Logging out of Admin portal...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const logout = buttons.find(b => b.textContent.includes('Sign Out') || b.textContent.includes('Logout'));
      if (logout) logout.click();
    });
    await delay(3000);
    console.log(`✓ Admin logged out cleanly. Active URL: ${page.url()}`);

  } catch (err) {
    console.error('\n❌ Browser test flow failed:', err.message);
    const errScreenshot = path.join(artifactDir, 'error_state.png');
    await page.screenshot({ path: errScreenshot });
    console.error(`📸 Error screenshot saved to: ${errScreenshot}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTest();
