import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import puppeteer from 'puppeteer'

// ✅ Log errors manually to a file
const logFilePath = path.join(os.tmpdir(), 'scraper-error.log')

function logError(errorMessage) {
  fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] ${errorMessage}\n`)
}

const tempDir = path.join(os.tmpdir(), 'puppeteer_profile')

async function loginWithPuppeteer(bank, accessId, password) {
  console.log(`🔍 Attempting login for bank: ${bank}...`)

  try {
    console.log('🕒 Starting Puppeteer...')

    const browser = await puppeteer.launch({
      headless: false,
      executablePath: 'C:\\Users\\WilsonOoi\\.cache\\puppeteer\\chrome\\win64-133.0.6943.98\\chrome-win64\\chrome.exe',
      args: [
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--start-maximized',
        '--proxy-server=direct://', // ✅ Force Puppeteer to use a direct connection
        '--proxy-bypass-list=*', // ✅ Bypass all proxies (no restrictions)
        '--enable-features=NetworkService,NetworkServiceInProcess',
        '--disable-features=IsolateOrigins,site-per-process',
        '--dns-prefetch-disable',
        '--ignore-certificate-errors', // ✅ Ignore SSL certificate errors
        '--disable-background-networking', // ✅ Prevent background network requests
        '--enable-logging', // ✅ Enable debugging logs
        '--v=1', // ✅ Verbose logging to track network failures
      ],
      timeout: 90000,
    })

    console.log('✅ Puppeteer launched successfully.')

    // Get open pages
    let pages = await browser.pages()
    console.log(`🔍 Found ${pages.length} open page(s).`)

    if (pages.length === 0) {
      console.log('📄 No open pages found. Creating a new one...')
      pages[0] = await browser.newPage()
    }

    const page = pages[0]

    await page.bringToFront() // ✅ Ensure Puppeteer is controlling the page

    // ✅ Debugging: Log the current page URL before navigating
    console.log(`📄 Current page URL before navigation: ${await page.url()}`)

    const isOnline = await page.evaluate(() => navigator.onLine)

    console.log(`🌍 Browser is ${isOnline ? 'ONLINE' : 'OFFLINE'}`)

    // Navigate to the login page
    console.log('🌐 Navigating to login page...')
    await page.goto('https://jcimalaysia.cc/roadmap', { waitUntil: 'networkidle2' })

    console.log('🔍 Debugging Pages...')
    pages = await browser.pages()
    console.log(`📄 Puppeteer opened ${pages.length} page(s).`)

    for (let i = 0; i < pages.length; i++)
      console.log(`📄 Page ${i} URL: ${await pages[i].url()}`)

    console.log('🔑 Entering credentials...')
    await page.type('#icnumber', accessId, { delay: 100 })
    await page.type('input[name="password"]', password, { delay: 100 })

    console.log('🚀 Clicking login...')
    await page.click('.signin')

    console.log('⏳ Waiting for navigation...')
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 })

    console.log('✅ Login successful!')
    await browser.close()

    return { status: 'success', message: 'Login successful!' }
  }
  catch (error) {
    console.error('❌ Puppeteer login failed:', error)
    logError(error.stack || error.message) // ✅ Log error to file

    return { status: 'error', message: error.message || 'Login failed. Please try again.' }
  }
}

// ✅ Get command-line arguments
const [, , bank, accessId, password] = process.argv

if (!bank || !accessId || !password) {
  console.error(JSON.stringify({ status: 'error', message: 'Missing required fields (bank, access_id, password)' }))
  process.exit(1)
}

// ✅ Run script and ensure only JSON is returned
loginWithPuppeteer(bank, accessId, password)
  .then(result => console.log(JSON.stringify(result)))
  .catch(err => {
    console.error(JSON.stringify({ status: 'error', message: err.message }))
    logError(err.stack || err.message)
  })
