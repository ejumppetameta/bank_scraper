const puppeteer = require('puppeteer');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { createWriteStream } = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

async function loginWithPuppeteer(accessId, password) {
    console.log("Using Puppeteer for login...");
    try {
        const browser = await puppeteer.launch({ headless: false });
        // const browser = await puppeteer.launch({
        //     headless: false,
        //     args: [
        //         `--proxy-server=http://brd.superproxy.io:33335` // Bright Data Proxy
        //     ]
        // });

        const page = await browser.newPage();
        // Authenticate Proxy
        // await page.authenticate({
        //     username: "brd-customer-hl_22e2f6b0-zone-residential_proxy1",
        //     password: "v5zrgmr43ohv"
        // });
        
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
        await page.click('.signin', { delay: 500 });
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
        const pdfUrl = new URL(pdfLink, 'https://jcimalaysia.cc/roadmap/').href;

        console.log(`🔍 Checking PDF URL: ${pdfUrl}`);
        const pdfResponse = await fetch(pdfUrl);
        if (!pdfResponse.ok) {
            throw new Error(`❌ Failed to download PDF: ${pdfResponse.statusText} (HTTP ${pdfResponse.status}) - ${pdfUrl}`);
        }
        
        const statementDir = path.join(__dirname, "statement");
        if (!fs.existsSync(statementDir)) {
            fs.mkdirSync(statementDir);
        }
        
        const uniqueCode = `${Math.random().toString(36).substr(2, 6)}-${Math.random().toString(36).substr(2, 4)}`;
        const pdfDir = path.join(statementDir, uniqueCode);
        fs.mkdirSync(pdfDir);
        
        const pdfPath = path.join(pdfDir, path.basename(pdfUrl));
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
        
        await browser.close();
        return { pdfPath };
    } catch (error) {
        console.error("❌ Puppeteer login failed, switching to Selenium...", error);
        return null;
    }
}

async function loginWithSelenium(accessId, password) {
    console.log("Using Selenium for login...");
    try {
        let options = new chrome.Options();
        options.addArguments("--headless");
        // let options = new chrome.Options();
        // options.addArguments("--headless");
        // options.addArguments("--proxy-server=http://zproxy.lum-superproxy.io:22225"); // Bright Data Proxy

        let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
        
        await driver.get('https://jcimalaysia.cc/roadmap');
        await driver.findElement(By.id('icnumber')).sendKeys(accessId);
        await driver.findElement(By.name('password')).sendKeys(password);
        await driver.findElement(By.css('.signin')).click();
        await driver.wait(until.urlContains('dashboard'), 90000);
        console.log("✅ Login successful with Selenium");
        
        return driver;
    } catch (error) {
        console.error("❌ Selenium login failed:", error);
        return null;
    }
}

async function downloadPdfWithSelenium(driver) {
    try {
        console.log("Navigating to Meeting Report with Selenium...");
        await driver.findElement(By.css("span.menu-item.text-truncate[data-i18n='Meeting Report']")).click();
        await driver.wait(until.elementLocated(By.css("a.detail-report.text-info")), 10000);
        await driver.findElement(By.css("a.detail-report.text-info")).click();
        
        console.log("✅ Modal popup triggered");

        let pdfElement = await driver.wait(until.elementLocated(By.css("a.modal-pdf-viewer")), 10000);
        let pdfUrl = await pdfElement.getAttribute("path");
        pdfUrl = new URL(pdfUrl, 'https://jcimalaysia.cc/roadmap/').href;
        
        console.log(`🔍 Checking PDF URL: ${pdfUrl}`);
        const pdfResponse = await fetch(pdfUrl);
        if (!pdfResponse.ok) {
            throw new Error(`❌ Failed to download PDF: ${pdfResponse.statusText} (HTTP ${pdfResponse.status}) - ${pdfUrl}`);
        }
        
        const statementDir = path.join(__dirname, "statement");
        if (!fs.existsSync(statementDir)) {
            fs.mkdirSync(statementDir);
        }
        
        const uniqueCode = `${Math.random().toString(36).substr(2, 6)}-${Math.random().toString(36).substr(2, 4)}`;
        const pdfDir = path.join(statementDir, uniqueCode);
        fs.mkdirSync(pdfDir);
        
        const pdfPath = path.join(pdfDir, path.basename(pdfUrl));
        const pdfStream = createWriteStream(pdfPath);
        await streamPipeline(pdfResponse.body, pdfStream);
        
        console.log(`✅ PDF downloaded successfully: ${pdfPath}`);
        console.log("Logging out from Selenium...");
        await driver.findElement(By.css("div.avatar.bg-light-info")).click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await driver.findElement(By.css("a.dropdown-item[href='functions/logout.php']")).click();
        
        console.log("✅ Successfully logged out from Selenium");
        
        await driver.quit();
        return pdfPath;
    } catch (error) {
        console.error("❌ Failed to download PDF with Selenium:", error);
        return null;
    }
}

async function startScraping(accessId, password) {
    let puppeteerSession = await loginWithPuppeteer(accessId, password);
    if (puppeteerSession) {
        const { browser, page } = puppeteerSession;
        console.log("Proceeding with Puppeteer session...");
    } else {
        let seleniumSession = await loginWithSelenium(accessId, password);
        if (seleniumSession) {
            console.log("Proceeding with Selenium session...");
            await downloadPdfWithSelenium(seleniumSession);
        } else {
            console.error("Both Puppeteer and Selenium failed.");
        }
    }
}
console.log("🔎 Starting login test...");
startScraping('jcialumni', 'KonBanwa999@');
