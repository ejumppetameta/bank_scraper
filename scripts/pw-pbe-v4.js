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

// Read command-line arguments
const args = process.argv.slice(2)

// If no bank is provided, default to "pbe bank"
const bank = args[0] || 'PBEBank'
const accessId = args[1]
const password = args[2]

// Preset the bank URL if the bank is "pbe bank"
let BANK_URL
BANK_URL = 'https://www2.pbebank.com/pbemain.html'

// if (bank.toLowerCase() === 'PBEBank') {
//   BANK_URL = 'https://www2.pbebank.com/pbemain.html'
// }
// else {
//   // Optionally handle other banks or set a default
//   BANK_URL = 'https://www2.pbebank.com/pbemain.html'
// }

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

    await page.screenshot({ path: 'screenshots/debug_before_statement_page.png', fullPage: true })

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
// Replace non-breaking spaces (\u00A0) with normal spaces.
// You can expand this to remove other invalid filename chars if needed.
function sanitizeFilename(str) {
  return str.replace(/\u00A0/g, ' ')
}

// Main function
async function downloadLatestStatements(page, accountNumber, accountName, uniqueCode) {
  console.log(`🔍 Retrieving available statements for ${accountNumber} (${accountName})...`)

  const statementLinks = await page.$$eval('a[name="STMT_DATE"]', links =>
    links.map(link => ({
      text: link.innerText.trim(),
      onclick: link.getAttribute('onclick'),
    })),
  )

  console.log(`✅ Found ${statementLinks.length} statements.`)

  // Sanitize the account number & name before creating the folder
  const safeAccountNumber = sanitizeFilename(accountNumber)
  const safeAccountName = sanitizeFilename(accountName)

  // Construct the folder path using sanitized strings
  const accountFolderPath = path.join(
    DOWNLOAD_DIR,
    uniqueCode,
    `${safeAccountNumber} (${safeAccountName})`,
  )

  // Create the folder if it doesn't exist
  if (!fs.existsSync(accountFolderPath))
    fs.mkdirSync(accountFolderPath, { recursive: true })

  // Only take the latest 3 statements
  const latestStatements = statementLinks.slice(0, 3)

  for (const stmt of latestStatements) {
    console.log(`⬇️ Downloading statement: ${stmt.text}`)

    // Example onclick="openStmt('UNID','HASH_UNID','REPO_ID')"
    const match = stmt.onclick.match(/openStmt\('([^']+)',\s*'([^']+)',\s*'([^']+)'\)/)
    if (match) {
      const [_, unid, hashUnid, repoId] = match

      // Wait for the new popup page, then trigger form submission
      const [newPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.evaluate(({ unid, hashUnid, repoId }) => {
          document.querySelector('input[name="UNID"]').value = unid
          document.querySelector('input[name="HASH_UNID"]').value = hashUnid
          document.querySelector('input[name="REPOSITORY_ID"]').value = repoId
          document.forms.frm2.submit()
        }, { unid, hashUnid, repoId }),
      ])

      console.log('🔗 Waiting for the PDF viewer to load...')
      await newPage.locator('embed, object, iframe').waitFor({ state: 'visible' })

      const base64Pdf = await newPage.evaluate(() => {
        const pdfEmbed = document.querySelector('embed, object, iframe')

        return pdfEmbed ? pdfEmbed.getAttribute('src') : null
      })

      if (base64Pdf && base64Pdf.startsWith('data:application/pdf;base64,')) {
        const pdfBuffer = Buffer.from(base64Pdf.split(',')[1], 'base64')

        // Also sanitize the statement text for the PDF filename
        const rawPdfName = `${stmt.text.replace(/\//g, '-')}.pdf`
        const safePdfFileName = sanitizeFilename(rawPdfName)

        const pdfFilePath = path.join(accountFolderPath, safePdfFileName)

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
      headless: true, // Must run headless in Docker container
      // executablePath: 'C:\\Users\\WilsonOoi\\AppData\\Local\\Chromium\\Application\\chrome.exe',
    //   args: [
    //     // '--disable-blink-features=AutomationControlled',
    //     '--no-sandbox',
    //     '--disable-setuid-sandbox',
    //     '--disable-infobars',
    //     '--disable-dev-shm-usage',
    //     '--window-size=1280,800',
    //   ],
    })

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },

      userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.6943.16 Safari/537.36',
    })

    const page = await context.newPage()

    // await context.addInitScript(() => {
    //   Object.defineProperty(navigator, 'webdriver', { get: () => false })
    //   window.chrome = { runtime: {} }
    //   Object.defineProperty(navigator, 'plugins', {
    //     get: () => [1, 2, 3, 4, 5],
    //   })
    //   Object.defineProperty(navigator, 'languages', {
    //     get: () => ['en-US', 'en'],
    //   })
    // })

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

    let frame = page
    const iframeElement = await page.$('iframe')
    if (iframeElement) {
      console.log('✅ Found iframe, switching context...')
      frame = await iframeElement.contentFrame()
    }

    console.log('⏳ Waiting for username field...')
    await frame.locator('input[name="tempusername"]').waitFor({ state: 'visible' })

    console.log('📝 Typing Username...')
    await typeLikeHuman(frame, 'input[name="tempusername"]', accessId)

    console.log('✅ Clicking Next Button...')
    await frame.locator('#NextBtn').click()

    console.log('⏳ Waiting for "Yes" radio button...')
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
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
      frame.locator('#SubmitBtn').click(),
    ])

    console.log('✅ Login successful!')

    await page.screenshot({ path: 'screenshots/debug_before_account_page.png', fullPage: true })

    // After you've done your final login step:

    console.log('⏳ Checking for duplicate login or main page...')
    await page.waitForTimeout(2000) // short wait to let the page finalize

    // 1) Try to detect the duplicate login modal
    const duplicateDialog = await page.$('#DuplicateLoginDialog')

    if (duplicateDialog) {
      console.log('⚠️ Duplicate login detected...')

      // Wait for the “Proceed to login” button
      const proceedBtnSelector = 'button.btn.red[name="accept"]:has-text("Proceed to login")'

      await page.waitForSelector(proceedBtnSelector, { timeout: 30000 })
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
        page.click(proceedBtnSelector),
      ])
      console.log('✅ Successfully cleared duplicate login prompt.')
    }

    // 2) Now handle the main page
    //    Either it has an iframe or direct tiles
    await page.screenshot({ path: 'screenshots/debug_before_account_page1.png', fullPage: true })
    console.log('⏳ Checking if iframe (#new-ebank-container) is present...')

    const iframeHandle = await page.$('iframe#new-ebank-container')

    if (iframeHandle) {
      console.log('✅ Found iframe. Switching context...')

      const iframe = await iframeHandle.contentFrame()

      // Wait for the ACCOUNT tile link
      console.log('⏳ Waiting for ACCOUNT tile in iframe...')
      await iframe.waitForSelector('a[href*="BxxxAccountInfo_sum"]', { timeout: 30000 })
      console.log('✅ Clicking ACCOUNT tile in iframe...')
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
        iframe.click('a[href*="BxxxAccountInfo_sum"]'),
      ])
    }
    else {
      console.log('ℹ️ No iframe found. Checking for direct tile link...')

      // Wait for the tile that has the text "ACCOUNT"
      // await page.waitForSelector('div.tile.bg-red:has-text("ACCOUNT")', { timeout: 30000 })
      await page.screenshot({ path: 'screenshots/debug_before_account_page2.png', fullPage: true })

      console.log('⏳ Navigating to Account Page...')
      await page.evaluate(() => {
        const accountLink = document.querySelector('a[href*=\'BxxxAccountInfo_sum\']')
        if (accountLink)
          accountLink.click()
      })
    }

    console.log('✅ Successfully navigated to Account Page!')

    console.log('⏳ Navigating to Statement Page...')

    const statementSelector = 'a[href*="MethodName=formStatementDownload"]'

    // await page.screenshot({ path: './screenshots/debug_statement.png', fullPage: true })

    await page.locator(statementSelector).waitFor({ state: 'visible', timeout: 40000 })

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 40000 }),
      page.locator(statementSelector).click(),
    ])

    console.log('✅ Successfully opened Statement Page!')
    await page.screenshot({ path: 'screenshots/debug_before_account_page3.png', fullPage: true })

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

// // ---------------------------
// // ✅ START SCRAPING PROCESS
// // ---------------------------

// async function loginWithPlaywright(accessId, password) {
//   console.log('🔵 Using Playwright for login...')
//   try {
//     const browser = await chromium.launch({
//       headless: false, // Must run headless in Docker container
//       args: [
//         '--disable-blink-features=AutomationControlled',
//         '--no-sandbox',
//         '--disable-setuid-sandbox',
//         '--disable-infobars',
//         '--disable-dev-shm-usage',
//         '--window-size=1280,800',
//       ],
//     })

//     const context = await browser.newContext({
//       viewport: { width: 1280, height: 800 },
//       userAgent:
//         'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.6943.16 Safari/537.36',
//     })

//     await context.addInitScript(() => {
//       Object.defineProperty(navigator, 'webdriver', { get: () => false })
//       window.chrome = { runtime: {} }
//       Object.defineProperty(navigator, 'plugins', {
//         get: () => [1, 2, 3, 4, 5],
//       })
//       Object.defineProperty(navigator, 'languages', {
//         get: () => ['en-US', 'en'],
//       })
//     })

//     const page = await context.newPage()

//     console.log(`🔍 Navigating to ${BANK_URL}`)
//     await page.goto(BANK_URL, { waitUntil: 'domcontentloaded' })
//     await page.waitForTimeout(3000)

//     let loginUrl = await page.$eval('input#pbb_eai', el => el.value).catch(() => null)
//     if (!loginUrl)
//       loginUrl = 'https://www2.pbebank.com/myIBK/apppbb/servlet/BxxxServlet?RDOName=BxxxAuth&MethodName=login'

//     console.log(`🔀 Redirecting to actual login page: ${loginUrl}`)
//     await page.goto(loginUrl, { waitUntil: 'networkidle' })

//     let frame = page
//     const iframeElement = await page.$('iframe')
//     if (iframeElement)
//       frame = await iframeElement.contentFrame()

//     await frame.locator('input[name="tempusername"]').waitFor({ state: 'visible' })
//     await typeLikeHuman(frame, 'input[name="tempusername"]', accessId)
//     await frame.locator('#NextBtn').click()

//     await frame.locator('input[name="passcred"][value="YES"]').waitFor({ state: 'visible' })
//     await frame.click('input[name="passcred"][value="YES"]')

//     await frame.waitForFunction(() => {
//       const el = document.querySelector('input[name="password"]')

//       return el && !el.disabled
//     }, { timeout: 30000 })

//     await typeLikeHuman(frame, 'input[name="password"]', password)

//     await Promise.all([
//       page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
//       frame.locator('#SubmitBtn').click(),
//     ])

//     console.log('✅ Login successful!')

//     console.log('⏳ Taking a screenshot before navigating to Account Page...')
//     await page.screenshot({ path: 'debug_before_account_page1.png', fullPage: true })

//     await page.evaluate(() => {
//       document.querySelector('a[href*=\'BxxxAccountInfo_sum\']')?.click()
//     })
//     await page.waitForLoadState('networkidle')

//     const statementSelector = 'a[href*="MethodName=formStatementDownload"]'

//     await page.locator(statementSelector).waitFor({ state: 'visible', timeout: 40000 })
//     await Promise.all([
//       page.waitForNavigation({ waitUntil: 'networkidle', timeout: 40000 }),
//       page.locator(statementSelector).click(),
//     ])

//     await downloadStatementsForAllAccounts(page)

//     await page.waitForTimeout(5000)

//     const logoutButton = await page.waitForSelector('a[href*="MethodName=logout"]', { state: 'visible', timeout: 10000 })

//     await logoutButton.click()

//     console.log('✅ Successfully logged out.')
//     await browser.close()

//     return true
//   }
//   catch (error) {
//     console.error('❌ Playwright login failed:', error)

//     return false
//   }
// }

async function startScraping() {
  console.log('🔎 Starting login test...')

  const playwrightSuccess = await loginWithPlaywright(accessId, password)
  if (!playwrightSuccess)
    console.log('Playwright login failed.')
}

// ---------------------------
// ✅ RUN THE SCRIPT
// ---------------------------
startScraping()
