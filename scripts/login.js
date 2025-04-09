const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args)); // Ensure node-fetch is installed: npm install node-fetch
const { createWriteStream } = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

async function loginWithPuppeteer(accessId = 'jcialumni', password = 'KonBanwa999@') {
    console.log("Using Puppeteer for login...");
    try {
        const browser = await puppeteer.launch({ headless: false }); // Set to false to see the browser actions
        const page = await browser.newPage();

        await page.goto('https://jcimalaysia.cc/roadmap', { waitUntil: 'networkidle2' });

        console.log("Entering credentials slowly like a human...");
        for (const char of accessId) {
            await page.type('#icnumber', char, { delay: Math.floor(Math.random() * 200) + 100 });
        }
        await new Promise(resolve => setTimeout(resolve, 500));
        for (const char of password) {
            await page.type('input[name="password"]', char, { delay: Math.floor(Math.random() * 200) + 100 });
        }
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log("Clicking signin slowly...");
        await page.hover('.signin');
        await new Promise(resolve => setTimeout(resolve, 500));
        await page.click('.signin', { delay: 500 }); // Simulates human-like click

        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 90000 });
        console.log("✅ Login successful");

        console.log("Navigating to Meeting Report...");
        const meetingReport = await page.waitForSelector("span.menu-item.text-truncate[data-i18n='Meeting Report']", { visible: true, timeout: 10000 });
        await meetingReport.evaluate(el => el.scrollIntoView());
        await new Promise(resolve => setTimeout(resolve, 500));
        await page.evaluate(el => el.click(), meetingReport);

        console.log("✅ Successfully navigated to Meeting Report");

        console.log("Triggering modal popup...");
        const detailReport = await page.waitForSelector("a.detail-report.text-info", { visible: true, timeout: 10000 });
        await detailReport.evaluate(el => el.scrollIntoView());
        await new Promise(resolve => setTimeout(resolve, 500));
        await page.evaluate(el => el.click(), detailReport);

        console.log("✅ Modal popup triggered");

        console.log("Downloading PDF...");
        await page.waitForSelector("a.modal-pdf-viewer", { visible: true, timeout: 10000 });
        const pdfLink = await page.$eval("a.modal-pdf-viewer", el => el.getAttribute("path"));
        const baseUrl = 'https://jcimalaysia.cc/roadmap/';
        const pdfUrl = new URL(pdfLink, baseUrl).href; // Ensure absolute URL

        console.log(`🔍 Checking PDF URL: ${pdfUrl}`);

        const pdfResponse = await fetch(pdfUrl);
        if (!pdfResponse.ok) {
            throw new Error(`❌ Failed to download PDF: ${pdfResponse.statusText} (HTTP ${pdfResponse.status}) - ${pdfUrl}`);
        }
        
        // Ensure "statement" folder exists
        const statementDir = path.join(__dirname, "statement");
        if (!fs.existsSync(statementDir)) {
            fs.mkdirSync(statementDir);
        }
        
        // Generate unique folder name with "xxxxxx-xxxx" format
        const uniqueCode = `${Math.random().toString(36).substr(2, 6)}-${Math.random().toString(36).substr(2, 4)}`;
        const pdfDir = path.join(statementDir, uniqueCode);
        fs.mkdirSync(pdfDir);
        
        // Download the PDF using stream to avoid corruption
        const pdfPath = path.join(pdfDir, path.basename(pdfUrl));
        //const pdfResponse = await fetch(pdfUrl);
        if (!pdfResponse.ok) {
            throw new Error(`Failed to download PDF: ${pdfResponse.statusText}`);
        }
        const pdfStream = createWriteStream(pdfPath);
        await streamPipeline(pdfResponse.body, pdfStream);
        
        console.log(`✅ PDF downloaded successfully: ${pdfPath}`);

        console.log("Logging out...");
        const profileIcon = await page.waitForSelector("div.avatar.bg-light-info", { visible: true, timeout: 10000 });
        await profileIcon.evaluate(el => el.click());
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const logoutButton = await page.waitForSelector("a.dropdown-item[href='functions/logout.php']", { visible: true, timeout: 10000 });
        await logoutButton.evaluate(el => el.click());
        
        console.log("✅ Successfully logged out");
        
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait before closing
        await browser.close();
    } catch (error) {
        console.error("❌ Puppeteer login or navigation failed:", error);
    }
}


console.log("🔎 Starting login test...");
loginWithPuppeteer('jcialumni', 'KonBanwa999@');
