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

const month_length = 1

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

// Example helper from earlier
function getPDFFilePath(uniqueCode, accountName, statementDate) {
  const safeAccountName = sanitizeFilename(accountName)
  const pdfFolder = path.join(DOWNLOAD_DIR, uniqueCode, 'pdf', safeAccountName)

  if (!fs.existsSync(pdfFolder))
    fs.mkdirSync(pdfFolder, { recursive: true })

  // e.g. "12-02-2025.pdf"
  return path.join(pdfFolder, `${statementDate}.pdf`)
}

function getCSVFilePath(uniqueCode, accountName, monthValue) {
  // e.g. your global base folder for downloads

  // sanitize the account name to avoid invalid filesystem characters
  const safeAccountName = sanitizeFilename(accountName)

  // e.g. => /.../downloads/<uniqueCode>/csv/<accountName>/
  const csvFolder = path.join(DOWNLOAD_DIR, uniqueCode, 'csv', safeAccountName)

  if (!fs.existsSync(csvFolder))
    fs.mkdirSync(csvFolder, { recursive: true })

  // e.g. => statement_202501.csv
  const fileName = `statement_${monthValue}.csv`

  return path.join(csvFolder, fileName)
}

async function downloadStatementsForAllAccounts(page, uniqueCode) {
  console.log('🔍 Retrieving account options...')

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
// async function downloadLatestStatements(page, accountNumber, accountName, uniqueCode) {
//   console.log(`🔍 Retrieving available statements for ${accountNumber} (${accountName})...`)

//   const statementLinks = await page.$$eval('a[name="STMT_DATE"]', links =>
//     links.map(link => ({
//       text: link.innerText.trim(),
//       onclick: link.getAttribute('onclick'),
//     })),
//   )

//   console.log(`✅ Found ${statementLinks.length} statements.`)

//   // Sanitize the account number & name before creating the folder
//   const safeAccountNumber = sanitizeFilename(accountNumber)
//   const safeAccountName = sanitizeFilename(accountName)

//   // Construct the folder path using sanitized strings
//   const accountFolderPath = path.join(
//     DOWNLOAD_DIR,
//     uniqueCode,
//     `${safeAccountNumber} (${safeAccountName})`,
//   )

//   // Create the folder if it doesn't exist
//   if (!fs.existsSync(accountFolderPath))
//     fs.mkdirSync(accountFolderPath, { recursive: true })

//   // Only take the latest 3 statements
//   const latestStatements = statementLinks.slice(0, 1)

//   for (const stmt of latestStatements) {
//     console.log(`⬇️ Downloading statement: ${stmt.text}`)

//     // Example onclick="openStmt('UNID','HASH_UNID','REPO_ID')"
//     const match = stmt.onclick.match(/openStmt\('([^']+)',\s*'([^']+)',\s*'([^']+)'\)/)
//     if (match) {
//       const [_, unid, hashUnid, repoId] = match

//       // Wait for the new popup page, then trigger form submission
//       const [newPage] = await Promise.all([
//         page.waitForEvent('popup'),
//         page.evaluate(({ unid, hashUnid, repoId }) => {
//           document.querySelector('input[name="UNID"]').value = unid
//           document.querySelector('input[name="HASH_UNID"]').value = hashUnid
//           document.querySelector('input[name="REPOSITORY_ID"]').value = repoId
//           document.forms.frm2.submit()
//         }, { unid, hashUnid, repoId }),
//       ])

//       console.log('🔗 Waiting for the PDF viewer to load...')
//       await newPage.locator('embed, object, iframe').waitFor({ state: 'visible' })

//       const base64Pdf = await newPage.evaluate(() => {
//         const pdfEmbed = document.querySelector('embed, object, iframe')

//         return pdfEmbed ? pdfEmbed.getAttribute('src') : null
//       })

//       if (base64Pdf && base64Pdf.startsWith('data:application/pdf;base64,')) {
//         const pdfBuffer = Buffer.from(base64Pdf.split(',')[1], 'base64')

//         // Also sanitize the statement text for the PDF filename
//         const rawPdfName = `${stmt.text.replace(/\//g, '-')}.pdf`
//         const safePdfFileName = sanitizeFilename(rawPdfName)

//         const pdfFilePath = path.join(accountFolderPath, safePdfFileName)

//         fs.writeFileSync(pdfFilePath, pdfBuffer)

//         console.log(`✅ Statement saved: ${pdfFilePath}`)
//       }
//       else {
//         console.error(`❌ Failed to extract PDF for ${stmt.text}`)
//       }

//       await newPage.close()
//     }
//     else {
//       console.error(`❌ Failed to extract parameters for statement: ${stmt.text}`)
//     }
//   }
// }
async function downloadLatestStatements(page, accountNumber, accountName, uniqueCode) {
  console.log(`🔍 Retrieving available statements for ${accountNumber} (${accountName})...`)

  const statementLinks = await page.$$eval('a[name="STMT_DATE"]', links =>
    links.map(link => ({
      text: link.innerText.trim(),
      onclick: link.getAttribute('onclick'),
    })),
  )

  console.log(`✅ Found ${statementLinks.length} statements.`)

  // -- (No need to build accountFolderPath or create folder here) --
  // -- We'll rely on getPDFFilePath() to do that. --

  // e.g., just take the latest statement or top 3
  const latestStatements = statementLinks.slice(0, month_length)

  for (const stmt of latestStatements) {
    console.log(`⬇️ Downloading statement: ${stmt.text}`)

    // e.g. onclick="openStmt('UNID','HASH_UNID','REPO_ID')"
    const match = stmt.onclick.match(/openStmt\('([^']+)',\s*'([^']+)',\s*'([^']+)'\)/)
    if (match) {
      const [_, unid, hashUnid, repoId] = match

      // Wait for the new popup page
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

        // Convert "12/02/2025" -> "12-02-2025" for the filename
        const statementDate = stmt.text.replace(/\//g, '-')

        // Build the final file path using your getPDFFilePath() function
        // e.g. => <DOWNLOAD_DIR>/<uniqueCode>/pdf/<accountName>/12-02-2025.pdf
        const pdfFilePath = getPDFFilePath(uniqueCode, accountName, statementDate)

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

// async function downloadMostRecentMonths(page) {
//   // Ensure the target folder exists (create if not)
//   const csvFolder = path.join(__dirname, 'scipts', 'csv')
//   if (!fs.existsSync(csvFolder))
//     fs.mkdirSync(csvFolder, { recursive: true })

//   // Wait for the month select element to be visible
//   await page.waitForSelector('select[name="mState"]')

//   // Extract all valid month options (excluding placeholder)
//   const allMonthOptions = await page.$$eval(
//     'select[name="mState"] option[value]:not([value=""])',
//     options => options.map(o => ({
//       value: o.value,
//       text: o.textContent.trim(),
//     })),
//   )

//   console.log('All month options found:', allMonthOptions)

//   // Assume the first 3 options are the desired months
//   const recentThree = allMonthOptions.slice(0, 3)

//   console.log('Selecting these months:', recentThree)

//   for (const month of recentThree) {
//     console.log(`\nSelecting month ${month.value} (${month.text})...`)

//     // Select the month (wait for page navigation if the form submits)
//     await Promise.all([
//       page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
//       page.selectOption('select[name="mState"]', month.value),
//     ])

//     console.log(`Page reloaded for month: ${month.text}`)

//     // Trigger CSV download by selecting the CSV option from the other select
//     console.log(`Triggering CSV download for month ${month.value}...`)

//     const [download] = await Promise.all([
//       page.waitForEvent('download'),
//       page.selectOption('select[name="sel_link"]', 'CD'),
//     ])

//     // Define the file path using the target folder
//     const filePath = path.join(csvFolder, `statement_${month.value}.csv`)

//     await download.saveAs(filePath)
//     console.log(`✔ CSV saved for ${month.text} at ${filePath}`)

//     // Optionally, navigate back or reinitialize the page for the next iteration
//   }

//   console.log('✅ Done downloading CSV files for the 3 most recent months!')
// }

async function downloadMostRecentMonths(page, uniqueCode, accountName) {
  // 1. Wait for the month <select> to appear
  await page.waitForSelector('select[name="mState"]')

  // 2. Extract valid months
  const allMonthOptions = await page.$$eval(
    'select[name="mState"] option[value]:not([value=""])',
    options => options.map(o => ({
      value: o.value,
      text: o.textContent.trim(),
    })),
  )

  console.log('All month options found:', allMonthOptions)

  // 3. Pick the first 3 months
  const recentThree = allMonthOptions.slice(0, month_length)

  console.log('Selecting these months:', recentThree)

  for (const month of recentThree) {
    console.log(`\nSelecting month ${month.value} (${month.text})...`)

    // a) Select the month -> triggers form submit
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
      page.selectOption('select[name="mState"]', month.value),
    ])
    console.log(`Page reloaded for month: ${month.text}`)

    // b) Trigger CSV download from the "sel_link" dropdown
    console.log(`Triggering CSV download for month ${month.value}...`)

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.selectOption('select[name="sel_link"]', 'CD'),
    ])

    // c) Build the final file path with your helper
    const filePath = getCSVFilePath(uniqueCode, accountName, month.value)

    // d) Save the CSV
    await download.saveAs(filePath)
    console.log(`✔ CSV saved for ${month.text} at ${filePath}`)
  }

  console.log('✅ Done downloading CSV files for the 3 most recent months!')
}

/**
 * Helper function to perform login using Playwright
 */
async function loginWithPlaywright(accessId, password, uniqueCode) {
  console.log('🔵 Using Playwright for login...')
  try {
    const browser = await chromium.launch({
      headless: false, // Must run headless in Docker container
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

    console.log('⏳Step 1 of 3 Get the 3 Months Statements ...')

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
    await downloadStatementsForAllAccounts(page, uniqueCode)

    console.log('⏳Step 2 of 3 Get the 3 Months Transaction Details in CSV ...')

    // --- New lines start here ---
    console.log('🔙 Navigating back to Home Page...')

    // Click the “Home” link by text or by a more specific selector
    await page.click('a.btn.blue >> text=Home')
    console.log('✅ Reached Home Page!')

    console.log('⏳ Navigating to Account Page...')
    await page.evaluate(() => {
      const accountLink = document.querySelector('a[href*=\'BxxxAccountInfo_sum\']')
      if (accountLink)
        accountLink.click()
    })

    // 1. Wait for the table to be visible
    await page.waitForSelector('#table-column-toggle1')

    // 2. Get all table rows within tbody
    const accountRows = await page.$$('#table-column-toggle1 tbody tr')

    // 3. Iterate over each row
    // for (const row of accountRows) {
    //   // Try to find an anchor tag in the row
    //   const accountLink = await row.$('td.text-center a')

    //   if (accountLink) {
    //     // => This means the account is active (has <a>)

    //     // For debugging, extract the account number
    //     // e.g. from the link text or from the <a> href attribute
    //     const accountNumber = await accountLink.innerText()

    //     console.log(`🔗 Found active account: ${accountNumber}`)

    //     // 4. Click the link to navigate to transaction details
    //     await Promise.all([
    //       page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
    //       accountLink.click(),
    //     ])

    //     // 5. Now on the transaction history/details page, do your checks
    //     // e.g. gather transaction data, or do further actions
    //     console.log(`✅ Checking transactions for account ${accountNumber}...`)

    //     // 1. Wait for the "View Transaction History" button/link to appear
    //     await page.waitForSelector('text=View Transaction History')

    //     // 2. Click it and wait for navigation
    //     await Promise.all([
    //       page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
    //       page.click('text=View Transaction History'),
    //     ])

    //     console.log('✅ Now on the transaction history page!')

    //     await downloadMostRecentMonths(page)

    //     // Next, proceed to scrape transactions...

    //     // ... your scraping or logic here ...

    //     // If you need to go back to the account page to process the next row:
    //     //    (In many real flows, you might just open details in a new tab or iFrame)
    //     //    Otherwise, if there's no direct link back, you might do:
    //     // await page.goBack({ waitUntil: 'networkidle' });
    //     // or
    //     // await page.goto('https://...accountPageUrlAgain...', { waitUntil: 'networkidle' });
    //   }
    //   else {
    //     // => This means the row is for an inactive or dormant account
    //     const accountNumber = await row.innerText()

    //     console.log(`❌ Inactive or no <a> found in row: ${accountNumber}`)
    //   }
    // }
    for (const row of accountRows) {
      const accountLink = await row.$('td.text-center a')

      if (accountLink) {
        // => The account is active
        const accountNumber = await accountLink.innerText()

        console.log(`🔗 Found active account: ${accountNumber}`)

        // 1) Click the account link to go to details
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
          accountLink.click(),
        ])

        console.log(`✅ Checking transactions for account ${accountNumber}...`)

        // 2) Click "View Transaction History"
        await page.waitForSelector('text=View Transaction History')
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
          page.click('text=View Transaction History'),
        ])

        console.log('✅ Now on the transaction history page!')

        // 3) Download the CSV for the top 3 months
        //    Here we pass `accountNumber` as the "accountName" param.
        //    If you actually have a separate variable for the account name,
        //    e.g. `accountName`, use that instead.
        await downloadMostRecentMonths(page, uniqueCode, accountNumber)

        // Next steps ...
        // e.g. page.goBack() or continue
      }
      else {
        // => Inactive account
        const accountNumber = await row.innerText()

        console.log(`❌ Inactive or no <a> found in row: ${accountNumber}`)
      }
    }

    // --- New lines end here ---

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

async function startScraping() {
  console.log('🔎 Starting login test...')

  const uniqueCode = generateUniqueCode()

  console.log('⏳ Generated unique code:', uniqueCode)

  const playwrightSuccess = await loginWithPlaywright(accessId, password, uniqueCode)
  if (!playwrightSuccess)
    console.log('Playwright login failed.')
}

// ---------------------------
// ✅ RUN THE SCRIPT
// ---------------------------
startScraping()
