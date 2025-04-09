import fs from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { chromium } from 'playwright'

const streamPipeline = promisify(pipeline)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DOWNLOAD_DIR = path.join(__dirname, 'statement') // Base directory for statements

console.log(`Download directory set to: ${DOWNLOAD_DIR}`)

// ---------------------------
// ✅ LOGIN USING PLAYWRIGHT (ENHANCED WITH IFRAME HANDLING)
// ---------------------------

const BANK_URL = 'https://www2.pbebank.com/pbemain.html'
const BANK_USERNAME = 'your-username' // Replace with actual username
const BANK_PASSWORD = 'your-password' // Replace with actual password

// Simulate human-like typing speed
async function typeLikeHuman(page, selector, text) {
  for (const char of text)
    await page.type(selector, char, { delay: Math.floor(Math.random() * 200) + 50 })
}

/**
 * Helper function to generate a unique session code (e.g., "46mku9-op7v")
 */
function generateUniqueCode() {
  return `${Math.random().toString(36).substring(2, 8)}-${Math.random().toString(36).substring(2, 8)}`
}

async function downloadStatementsForAllAccounts(page) {
  console.log('🔍 Retrieving account options...')

  // Generate a unique code for this session
  const uniqueCode = generateUniqueCode()

  // Get all account options
  const accountOptions = await page.$$eval('select[name="selected_acc"] option', options =>
    options
      .filter(opt => opt.value) // Remove empty options
      .map(opt => ({ value: opt.value, text: opt.innerText.trim() })),
  )

  console.log(`✅ Found ${accountOptions.length} accounts.`)

  for (const account of accountOptions) {
    console.log(`🔄 Selecting account: ${account.text} (${account.value})`)

    // Select the account using selectOption
    await page.selectOption('select[name="selected_acc"]', account.value)
    await page.waitForTimeout(2000)

    // Click the Next button and wait for navigation
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }),
      page.click('button[onclick="javascript:doSubmit();"]'),
    ])

    console.log('✅ Loaded Statement Page')

    // Download latest 3 months of statements
    const sanitizedAccName = account.text.replace(/[/\\]/g, '-')

    await downloadLatestStatements(page, account.value, sanitizedAccName, uniqueCode)

    // Go back to the statement selection page
    console.log('🔄 Returning to Statement Selection Page...')
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }),
      page.click('a[href*="MethodName=formStatementDownload"]'),
    ])

    console.log('✅ Returned to Statement Selection Page')
  }
}

/**
 * Function to download the last 3 statements
 */
async function downloadLatestStatements(page, accountNumber, accountName, uniqueCode) {
  console.log(`🔍 Retrieving available statements for ${accountNumber} (${accountName})...`)

  // const sanitizedAccountName = accountName.replace(/\\/g, '-')

  const statementLinks = await page.$$eval('a[name="STMT_DATE"]', links =>
    links.map(link => ({ text: link.innerText.trim(), onclick: link.getAttribute('onclick') })),
  )

  console.log(`✅ Found ${statementLinks.length} statements.`)

  const latestStatements = statementLinks.slice(0, 3)
  const accountFolderPath = path.join(DOWNLOAD_DIR, uniqueCode, `${accountNumber} (${accountName})`)
  if (!fs.existsSync(accountFolderPath))
    fs.mkdirSync(accountFolderPath, { recursive: true })

  for (const stmt of latestStatements) {
    console.log(`⬇️ Downloading statement: ${stmt.text}`)

    const match = stmt.onclick.match(/openStmt\('([^']+)',\s*'([^']+)',\s*'([^']+)'\)/)
    if (match) {
      const [_, unid, hashUnid, repoId] = match

      // Wait for the new popup page and trigger form submission
      const [newPage] = await Promise.all([
        page.waitForEvent('popup'),
        await page.evaluate(({ unid, hashUnid, repoId }) => {
          document.querySelector('input[name="UNID"]').value = unid
          document.querySelector('input[name="HASH_UNID"]').value = hashUnid
          document.querySelector('input[name="REPOSITORY_ID"]').value = repoId
          document.forms.frm2.submit()
        }, { unid, hashUnid, repoId }),

        // page.evaluate((unid, hashUnid, repoId) => {
        //   document.querySelector('input[name="UNID"]').value = unid
        //   document.querySelector('input[name="HASH_UNID"]').value = hashUnid
        //   document.querySelector('input[name="REPOSITORY_ID"]').value = repoId
        //   document.forms.frm2.submit()
        // }, unid, hashUnid, repoId),
      ])

      // console.log('🔗 Waiting for the PDF viewer to load...')
      // await newPage.waitForTimeout(5000)
      console.log('🔗 Waiting for the PDF viewer to load...')
      await newPage.locator('embed, object, iframe').waitFor({ state: 'visible' })

      const base64Pdf = await newPage.evaluate(() => {
        const pdfEmbed = document.querySelector('embed, object, iframe')

        return pdfEmbed ? pdfEmbed.getAttribute('src') : null
      })

      if (base64Pdf && base64Pdf.startsWith('data:application/pdf;base64,')) {
        const pdfBuffer = Buffer.from(base64Pdf.split(',')[1], 'base64')

        const pdfFileName = `${stmt.text.replace(/\//g, '-')}.pdf`
        const pdfFilePath = path.join(accountFolderPath, pdfFileName)

        fs.writeFileSync(pdfFilePath, pdfBuffer)

        console.log(`✅ Statement saved: ${pdfFilePath}`)
      }
      else {
        console.error(`❌ Failed to extract PDF for ${stmt.text}`)
      }

      await newPage.close()
    }
    else {
      console.error(`❌ Failed to extract parameters for statement: ${stmt.text}`)
    }
  }
}

/**
 * Helper function to perform login using Playwright
 */
async function loginWithPlaywright(accessId, password) {
  console.log('🔵 Using Playwright for login...')
  try {
    const browser = await chromium.launch({
      headless: false,

    })

    // const context = await browser.newContext({
    //   userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    //   viewport: { width: 1280, height: 800 },
    //   locale: 'en-US',
    // })

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const page = await context.newPage()

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      })
    })

    console.log(`🔍 Navigating to ${BANK_URL}`)
    await page.goto(BANK_URL, { waitUntil: 'domcontentloaded' })

    console.log('⏳ Extracting actual login URL...')
    await page.waitForTimeout(3000)

    let loginUrl = await page.$eval('input#pbb_eai', el => el.value).catch(() => null)
    if (!loginUrl)
      loginUrl = 'https://www2.pbebank.com/myIBK/apppbb/servlet/BxxxServlet?RDOName=BxxxAuth&MethodName=login'

    console.log(`🔀 Redirecting to actual login page: ${loginUrl}`)
    await page.goto(loginUrl, { waitUntil: 'networkidle' })

    console.log('⏳ Checking for iframe...')

    // await page.waitForTimeout(3000)

    let frame = page
    const iframeElement = await page.$('iframe')
    if (iframeElement) {
      console.log('✅ Found iframe, switching context...')
      frame = await iframeElement.contentFrame()
    }

    console.log('⏳ Waiting for username field...')

    // await frame.waitForSelector('input[name="tempusername"]', { state: 'visible', timeout: 20000 })
    await frame.locator('input[name="tempusername"]').waitFor({ state: 'visible' })

    console.log('📝 Typing Username...')
    await typeLikeHuman(frame, 'input[name="tempusername"]', accessId)

    console.log('✅ Clicking Next Button...')

    // await frame.waitForSelector('#NextBtn', { state: 'visible', timeout: 10000 })
    // await frame.click('#NextBtn')
    await frame.locator('#NextBtn').click()

    console.log('⏳ Waiting for "Yes" radio button...')

    // await frame.waitForSelector('input[name="passcred"][value="YES"]', { state: 'visible', timeout: 15000 })
    await frame.locator('input[name="passcred"][value="YES"]').waitFor({ state: 'visible' })

    console.log('✅ Clicking "Yes" radio button...')
    await frame.click('input[name="passcred"][value="YES"]')

    console.log('⏳ Waiting for password field to be enabled...')
    await frame.waitForFunction(() => {
      const el = document.querySelector('input[name="password"]')

      return el && !el.disabled
    }, { timeout: 30000 })

    console.log('📝 Typing Password...')
    await typeLikeHuman(frame, 'input[name="password"]', password)

    console.log('✅ Clicking Login Button...')

    // await frame.waitForSelector('#SubmitBtn', { state: 'visible', timeout: 30000 })
    // await frame.click('#SubmitBtn')
    // await frame.locator('#SubmitBtn').click()

    // console.log('⏳ Waiting for dashboard to load...')
    // await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 })

    // console.log('✅ Login successful!')
    // await Promise.all([
    //   page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
    //   frame.locator('#SubmitBtn').click(),
    // ])
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      frame.locator('#SubmitBtn').click(),
    ])

    console.log('✅ Login successful!')

    console.log('⏳ Taking a screenshot before navigating to Account Page...')
    await page.screenshot({ path: 'debug_before_account_page.png', fullPage: true })

    console.log('⏳ Navigating to Account Page...')
    await page.evaluate(() => {
      const accountLink = document.querySelector('a[href*=\'BxxxAccountInfo_sum\']')
      if (accountLink)
        accountLink.click()
    })

    console.log('⏳ Waiting for Account Page to load...')

    // await page.waitForTimeout(5000)

    console.log('✅ Successfully opened Account Page!')

    console.log('⏳ Navigating to Statement Page...')

    const statementSelector = 'a[href*="MethodName=formStatementDownload"]'

    await page.screenshot({ path: './screenshots/debug_statement.png', fullPage: true })

    // await page.waitForSelector(statementSelector, { state: 'visible', timeout: 5000 })
    await page.locator(statementSelector).waitFor({ state: 'visible', timeout: 30000 })

    // await page.waitForTimeout(3000)
    // await Promise.all([
    //   page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }),
    //   page.click(statementSelector),
    // ])
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
      page.locator(statementSelector).click(),
    ])

    // await Promise.all([
    //   page.waitForNavigation({ waitUntil: 'networkidle' }),
    //   frame.locator(statementSelector).click(),
    // ])

    console.log('✅ Successfully opened Statement Page!')

    // Process accounts and download statements
    await downloadStatementsForAllAccounts(page)

    console.log('⏳ Waiting 10 seconds before logging out...')
    await page.waitForTimeout(10000)

    console.log('🔍 Searching for logout button...')

    const logoutButton = await page.waitForSelector('a[href*="MethodName=logout"]', { state: 'visible', timeout: 10000 })

    console.log('🚪 Logging out...')
    await logoutButton.click()

    console.log('✅ Successfully logged out.')
    await browser.close()

    return true
  }
  catch (error) {
    console.error('❌ Playwright login failed:', error)

    return false
  }
}

// ---------------------------
// ✅ START SCRAPING PROCESS
// ---------------------------
async function startScraping() {
  console.log('🔎 Starting login test...')

  const playwrightSuccess = await loginWithPlaywright(BANK_USERNAME, BANK_PASSWORD)
  if (!playwrightSuccess)
    console.log('Playwright login failed.')
}

// ---------------------------
// ✅ RUN THE SCRIPT
// ---------------------------
startScraping()
