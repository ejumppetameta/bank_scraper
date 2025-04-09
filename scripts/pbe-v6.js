import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteerExtra from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DOWNLOAD_DIR = path.join(__dirname, 'statements') // Save directory
const BANK_URL = 'https://www2.pbebank.com/pbemain.html'
const BANK_USERNAME = 'your-username' // Replace with actual username
const BANK_PASSWORD = 'your-password' // Replace with actual password

// Enable stealth plugin for Puppeteer
puppeteerExtra.use(StealthPlugin())

// Simulate human-like typing
async function typeLikeHuman(page, selector, text) {
  for (const char of text)
    await page.type(selector, char, { delay: Math.floor(Math.random() * 200) + 50 })
}

// Generate a unique session code
function generateUniqueCode() {
  return `${Math.random().toString(36).substring(2, 8)}-${Math.random().toString(36).substring(2, 8)}`
}

async function loginWithPuppeteer(username, password) {
  console.log('🔵 Using Puppeteer for login...')
  try {
    const browser = await puppeteerExtra.launch({
      headless: false,
    })

    const page = await browser.newPage()

    // **Spoof the latest Chrome User-Agent**
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    )

    // **Set additional headers**
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Upgrade-Insecure-Requests': '1',
    })

    console.log(`🔍 Navigating to ${BANK_URL}`)
    await page.goto(BANK_URL, { waitUntil: 'networkidle2', timeout: 60000 })

    console.log('⏳ Extracting actual login URL...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    const loginUrlElement = await page.$('input#pbb_eai')

    const loginUrl = loginUrlElement
      ? await page.$eval('input#pbb_eai', el => el.value)
      : 'https://www2.pbebank.com/myIBK/apppbb/servlet/BxxxServlet?RDOName=BxxxAuth&MethodName=login'

    console.log(`🔀 Redirecting to actual login page: ${loginUrl}`)
    await page.goto(loginUrl, { waitUntil: 'networkidle2' })

    console.log('⏳ Checking for iframe...')
    let frame = page
    const iframeElement = await page.$('iframe')
    if (iframeElement) {
      console.log('✅ Found iframe, switching context...')
      frame = await iframeElement.contentFrame()
    }

    console.log('⏳ Waiting for username field...')
    await frame.waitForSelector('input[name="tempusername"]', { visible: true, timeout: 30000 })

    console.log('📝 Typing Username...')
    await typeLikeHuman(frame, 'input[name="tempusername"]', username)

    console.log('✅ Clicking Next Button...')
    await frame.waitForSelector('#NextBtn', { visible: true, timeout: 10000 })
    await frame.click('#NextBtn')

    console.log('⏳ Waiting for "Yes" radio button...')
    await frame.waitForSelector('input[name="passcred"][value="YES"]', { visible: true, timeout: 20000 })

    console.log('✅ Clicking "Yes" radio button...')
    await frame.click('input[name="passcred"][value="YES"]')

    console.log('⏳ Waiting for password field...')
    await frame.waitForFunction(() => {
      const el = document.querySelector('input[name="password"]')

      return el && !el.disabled
    }, { timeout: 30000 })

    console.log('📝 Typing Password...')
    await typeLikeHuman(frame, 'input[name="password"]', password)

    console.log('✅ Clicking Login Button...')
    await frame.waitForSelector('#SubmitBtn', { visible: true, timeout: 30000 })
    await frame.click('#SubmitBtn')

    console.log('⏳ Waiting for dashboard to load...')
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 45000 })

    console.log('✅ Login successful!')

    console.log('⏳ Navigating to Statement Page...')

    const statementSelector = 'a[href*="MethodName=formStatementDownload"]'

    await page.waitForSelector(statementSelector, { visible: true, timeout: 30000 })

    console.log('✅ Clicking Statement Page link...')
    await page.click(statementSelector)

    console.log('⏳ Waiting for Statement Page to load...')
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })

    console.log('✅ Successfully opened Statement Page!')

    await downloadStatementsForAllAccounts(page)

    await browser.close()

    return true
  }
  catch (error) {
    console.error('❌ Puppeteer login failed:', error)

    return false
  }
}

/**
 * Function to retrieve and download statements for all accounts
 */
async function downloadStatementsForAllAccounts(page) {
  console.log('🔍 Retrieving account options...')

  const uniqueCode = generateUniqueCode()

  const accountOptions = await page.$$eval('select[name="selected_acc"] option', options =>
    options
      .filter(opt => opt.value)
      .map(opt => ({ value: opt.value, text: opt.innerText.trim() })),
  )

  console.log(`✅ Found ${accountOptions.length} accounts.`)

  for (const account of accountOptions) {
    console.log(`🔄 Selecting account: ${account.text} (${account.value})`)

    await page.select('select[name="selected_acc"]', account.value)
    await new Promise(resolve => setTimeout(resolve, 2000))

    await page.click('button[onclick="javascript:doSubmit();"]')
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 })

    console.log('✅ Loaded Statement Page')

    await downloadLatestStatements(page, account.value, account.text, uniqueCode)

    console.log('🔄 Returning to Statement Selection Page...')
    await page.click('a[href*="MethodName=formStatementDownload"]')
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 })

    console.log('✅ Returned to Statement Selection Page')
  }
}

/**
 * Function to download the last 3 statements
 */
async function downloadLatestStatements(page, accountNumber, accountName, uniqueCode) {
  console.log(`🔍 Retrieving available statements for ${accountNumber} (${accountName})...`)

  const sanitizedAccountName = accountName.replace(/\\/g, '-')

  const statementLinks = await page.$$eval('a[name="STMT_DATE"]', links =>
    links.map(link => ({ text: link.innerText.trim(), onclick: link.getAttribute('onclick') })),
  )

  console.log(`✅ Found ${statementLinks.length} statements.`)

  const latestStatements = statementLinks.slice(0, 3)
  const accountFolderPath = path.join(DOWNLOAD_DIR, uniqueCode, `${accountNumber} (${sanitizedAccountName})`)
  if (!fs.existsSync(accountFolderPath))
    fs.mkdirSync(accountFolderPath, { recursive: true })

  for (const stmt of latestStatements) {
    console.log(`⬇️ Downloading statement: ${stmt.text}`)

    const match = stmt.onclick.match(/openStmt\('([^']+)',\s*'([^']+)',\s*'([^']+)'\)/)
    if (match) {
      const [_, unid, hashUnid, repoId] = match

      const [newPage] = await Promise.all([
        new Promise(resolve => page.once('popup', resolve)),
        page.evaluate((unid, hashUnid, repoId) => {
          document.querySelector('input[name="UNID"]').value = unid
          document.querySelector('input[name="HASH_UNID"]').value = hashUnid
          document.querySelector('input[name="REPOSITORY_ID"]').value = repoId
          document.frm2.submit()
        }, unid, hashUnid, repoId),
      ])

      console.log('✅ Statement opened in new page.')

      await newPage.waitForTimeout(5000)
      await newPage.close()
    }
  }
}

(async () => {
  const session = await loginWithPuppeteer(BANK_USERNAME, BANK_PASSWORD)
  if (session) {
    await downloadStatements(session.page)
    console.log('🚪 Logging out...')
    await session.browser.close()
    console.log('✅ Finished.')
  }
  else {
    console.log('❌ Unable to log in.')
  }
})()
