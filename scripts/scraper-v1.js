import path from 'node:path'
import { pipeline } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import puppeteer from 'puppeteer'

const streamPipeline = promisify(pipeline)

// Fix "__dirname" and "__filename" in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Use dynamic import for `node-fetch`
// const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

// Define supported banks
const banks = {
  'JCIM Bank': {
    url: 'https://jcimalaysia.cc/roadmap',
    usernameSelector: '#icnumber',
    passwordSelector: 'input[name=\'password\']',
    loginButtonSelector: '.signin',
  },
  'XYZ Bank': {
    url: 'https://xyzbank.com/login',
    usernameSelector: '#user-id',
    passwordSelector: '#user-pass',
    loginButtonSelector: '#login-btn',
  },
  'ABC Bank': {
    url: 'https://abcbank.com/auth',
    usernameSelector: '#email',
    passwordSelector: '#password',
    loginButtonSelector: '.submit-btn',
  },
}

async function loginWithPuppeteer(bank, accessId, password) {
  console.log(`🔍 Attempting login for bank: ${bank}...`)

  if (!banks[bank]) {
    console.error(JSON.stringify({ status: 'error', message: `Bank "${bank}" is not supported.` }))
    process.exit(1)
  }

  const bankData = banks[bank]
  const startTime = Date.now() // Start time tracking

  try {
    console.log('🕒 Starting Puppeteer...')

    const browser = await puppeteer.launch({
      headless: false, // ✅ Forces headless mode for faster execution
      // args: ['--no-sandbox', '--disable-setuid-sandbox'], // ✅ Improves stability
    })

    const page = await browser.newPage()

    console.log(`🌐 Navigating to ${bankData.url}...`)

    const navStartTime = Date.now()

    await page.goto(bankData.url, { waitUntil: 'networkidle2' })
    console.log(`✅ Navigation took ${(Date.now() - navStartTime) / 1000} seconds`)

    console.log('🔑 Entering credentials...')
    await page.type(bankData.usernameSelector, accessId, { delay: Math.floor(Math.random() * 200) + 100 })
    await new Promise(resolve => setTimeout(resolve, 500))
    await page.type(bankData.passwordSelector, password, { delay: Math.floor(Math.random() * 200) + 100 })

    console.log('🚀 Clicking login...')

    const loginStartTime = Date.now()

    await page.click(bankData.loginButtonSelector)
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 })
    console.log(`✅ Login process took ${(Date.now() - loginStartTime) / 1000} seconds`)

    console.log('✅ Login successful!')

    await browser.close()

    const endTime = Date.now()

    console.log(`✅ Scraper completed in ${(endTime - startTime) / 1000} seconds.`)

    return { status: 'success', message: 'Login successful!' }
  }
  catch (error) {
    console.error('❌ Puppeteer login failed:', error)

    return { status: 'error', message: error.message || 'Login failed. Please try again.' }
  }
}

// Get command-line arguments if running via Laravel Process
const [,, bank, accessId, password] = process.argv

if (!bank || !accessId || !password) {
  console.error(JSON.stringify({ status: 'error', message: 'Missing required fields (bank, access_id, password)' }))
  process.exit(1)
}

loginWithPuppeteer(bank, accessId, password)
  .then(result => console.log(JSON.stringify(result)))
  .catch(err => console.error('❌ Script error:', err))
