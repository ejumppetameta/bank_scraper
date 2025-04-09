import fs from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import csvParser from 'csv-parser' // ✅ CSV parser
import axios from 'axios'
import { chromium } from 'playwright'

// process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:\\Users\\WilsonOoi\\AppData\\Local\\ms-playwright'

let screenshotCounter = 1 // Global counter to ensure sequence
const uniqueCode = generateUniqueCode()

console.log('⏳ Generated unique code:', uniqueCode)

const streamPipeline = promisify(pipeline)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DOWNLOAD_DIR = path.join(__dirname, 'statement') // Base directory for statements

const month_length = 2

const DATE_TIME = getFormattedDateTime()

console.log(`Download directory set to: ${DOWNLOAD_DIR}`)

const basePath = '/var/www/html/scripts/'
const newBasePath = 'statement/'

// Read command-line arguments
const args = process.argv.slice(2)

// If no bank is provided, default to "pbe bank"
const bank = args[0] || 'PBE'
const accessId = args[1]
const password = args[2]

const bankNameMap = {
  pbe: 'Public Bank Berhad',
  maybank: 'Malayan Banking Berhad',
  cimb: 'CIMB Bank Berhad',
  rhb: 'RHB Bank Berhad',
  hlb: 'Hong Leong Bank Berhad',
  ambank: 'AmBank (M) Berhad',
}

// Preset the bank URL if the bank is "pbe bank"
const BANK_URL = 'https://www2.pbebank.com/pbemain.html'

// Show log and screenshot in one function
async function logAndScreenshot(page, message) {
  console.log(message)

  // Ensure the screenshots directory exists
  const screenshotDir = `screenshots/${uniqueCode}`
  if (!fs.existsSync(screenshotDir))
    fs.mkdirSync(screenshotDir, { recursive: true })

  // Generate a sequential filename
  const sanitizedMessage = message.replace(/[^\w- ]/g, '').replace(/\s+/g, '_')
  const screenshotPath = path.join(screenshotDir, `${screenshotCounter}_${sanitizedMessage}.png`)

  try {
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.log(`📸 Screenshot saved: ${screenshotPath}`)
    screenshotCounter++ // Increment for the next screenshot
  }
  catch (error) {
    console.error(`❌ Failed to capture screenshot for: ${message}`, error)
  }
}

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

// Function to format date and time for folder naming
function getFormattedDateTime() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0') // Ensure 2-digit format
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  return `${year}${month}${day}_${hours}${minutes}${seconds}`
}

// Example helper from earlier
function getPDFFilePath(accountName, statementDate) {
  const safeAccountName = sanitizeFilename(accountName)
  const pdfFolder = path.join(DOWNLOAD_DIR, `${DATE_TIME}_${bank}_${uniqueCode}`, 'pdf', safeAccountName)

  if (!fs.existsSync(pdfFolder))
    fs.mkdirSync(pdfFolder, { recursive: true })

  // e.g. "12-02-2025.pdf"
  return path.join(pdfFolder, `${statementDate}.pdf`)
}

function getCSVFilePath(accountName, monthValue) {
  // e.g. your global base folder for downloads

  // sanitize the account name to avoid invalid filesystem characters
  const safeAccountName = sanitizeFilename(accountName)

  // e.g. => /.../downloads/<uniqueCode>/csv/<accountName>/
  const csvFolder = path.join(DOWNLOAD_DIR, `${DATE_TIME}_${bank}_${uniqueCode}`, 'csv', safeAccountName)

  if (!fs.existsSync(csvFolder))
    fs.mkdirSync(csvFolder, { recursive: true })

  // e.g. => statement_202501.csv
  const fileName = `statement_${monthValue}.csv`

  return path.join(csvFolder, fileName)
}

async function downloadStatementsForAllAccounts(page) {
  // console.log('🔍 Retrieving account options...')
  await logAndScreenshot(page, '🔍 Retrieving account options...')

  // Get all account options
  const accountOptions = await page.$$eval('select[name="selected_acc"] option', options =>
    options
      .filter(opt => opt.value) // Remove empty options
      .map(opt => ({ value: opt.value, text: opt.innerText.trim() })),
  )

  // console.log(`✅ Found ${accountOptions.length} accounts.`)
  await logAndScreenshot(page, `✅ Found ${accountOptions.length} accounts.`)

  for (const account of accountOptions) {
    // console.log(`🔄 Selecting account: ${account.text} (${account.value})`)
    await logAndScreenshot(page, `🔄 Selecting account: ${account.text} (${account.value})`)

    // await page.screenshot({ path: 'screenshots/debug_before_statement_page.png', fullPage: true })

    // Select the account using selectOption
    await page.selectOption('select[name="selected_acc"]', account.value)
    await page.waitForTimeout(2000)

    // Click the Next button and wait for navigation
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }),
      page.click('button[onclick="javascript:doSubmit();"]'),
    ])

    // console.log('✅ Loaded Statement Page')
    await logAndScreenshot(page, '✅ Loaded Statement Page')

    // Download latest 3 months of statements
    const sanitizedAccName = account.text.replace(/[/\\]/g, '-')

    await downloadLatestStatements(page, account.value, sanitizedAccName)

    // Go back to the statement selection page
    // console.log('🔄 Returning to Statement Selection Page...')
    await logAndScreenshot(page, '🔄 Returning to Statement Selection Page...')
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }),
      page.click('a[href*="MethodName=formStatementDownload"]'),
    ])

    // console.log('✅ Returned to Statement Selection Page')
    await logAndScreenshot(page, '✅ Returned to Statement Selection Page')
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

async function downloadLatestStatements(page, accountNumber, accountName) {
  // console.log(`🔍 Retrieving available statements for ${accountNumber} (${accountName})...`)
  await logAndScreenshot(page, `🔍 Retrieving available statements for ${accountNumber} (${accountName})...`)

  const statementLinks = await page.$$eval('a[name="STMT_DATE"]', links =>
    links.map(link => ({
      text: link.innerText.trim(),
      onclick: link.getAttribute('onclick'),
    })),
  )

  // console.log(`✅ Found ${statementLinks.length} statements.`)
  await logAndScreenshot(page, `✅ Found ${statementLinks.length} statements.`)

  // -- (No need to build accountFolderPath or create folder here) --
  // -- We'll rely on getPDFFilePath() to do that. --

  // e.g., just take the latest statement or top 3
  const latestStatements = statementLinks.slice(0, month_length)

  for (const stmt of latestStatements) {
    // console.log(`⬇️ Downloading statement: ${stmt.text}`)
    await logAndScreenshot(page, `⬇️ Downloading statement: ${stmt.text}`)

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

      // console.log('🔗 Waiting for the PDF viewer to load...')
      await logAndScreenshot(page, '🔗 Waiting for the PDF viewer to load...')
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
        const pdfFilePath = getPDFFilePath(accountName, statementDate)

        fs.writeFileSync(pdfFilePath, pdfBuffer)

        // console.log(`✅ Statement saved: ${pdfFilePath}`)
        await logAndScreenshot(page, `✅ Statement saved: ${pdfFilePath}`)
      }
      else {
        // console.error(`❌ Failed to extract PDF for ${stmt.text}`)
        await logAndScreenshot(page, `❌ Failed to extract PDF for ${stmt.text}`)
      }

      await newPage.close()
    }
    else {
      // console.error(`❌ Failed to extract parameters for statement: ${stmt.text}`)
      await logAndScreenshot(page, `❌ Failed to extract parameters for statement: ${stmt.text}`)
    }
  }
}

// async function processAccountRows(page, accountRows) {
//   for (const row of accountRows) {
//     if (page.isClosed()) {
//       console.error('❌ Page was closed unexpectedly! Stopping process.')

//       return // Stop processing if the page is closed
//     }

//     if (row) {
//       const rowHTML = await row.evaluate(el => el.outerHTML).catch(() => null)
//       if (!rowHTML) {
//         console.error('⚠️ Failed to retrieve row HTML. Skipping...')
//         continue // Skip this row if it's unavailable
//       }

//       // console.log(`🧐 Inspecting row HTML:\n${rowHTML}`)

//       const accountLink = await row.$('a[href*="viewDetails"]')

//       console.log(`✅ Checking the link for Account: ${accountLink}`)

//       if (accountLink) {
//         const accountNumber = await accountLink.innerText()

//         console.log(`🔗 Found active account: ${accountNumber}`)

//         // Ensure navigation doesn't break execution context
//         await Promise.race([
//           page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => console.log('⚠️ Navigation timeout, continuing...')),
//           accountLink.click(),
//         ])

//         console.log(`✅ Checking transactions for account ${accountNumber}...`)

//         await page.waitForSelector('text=View Transaction History')
//         await Promise.all([
//           page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
//           page.click('text=View Transaction History'),
//         ])

//         console.log('✅ Now on the transaction history page!')
//         await downloadMostRecentMonths(page, accountNumber)
//       }
//       else {
//         const accountNumber = await row.innerText()

//         console.log(`❌ Inactive or no <a> found in row: ${accountNumber}`)
//       }
//     }
//     else {
//       console.log('❌ No valid row found')
//     }
//   }
// }

// async function downloadMostRecentMonths(page, accountName) {
//   // 1. Wait for the month <select> to appear
//   await page.waitForSelector('select[name="mState"]')

//   // 2. Extract valid months
//   const allMonthOptions = await page.$$eval(
//     'select[name="mState"] option[value]:not([value=""])',
//     options => options.map(o => ({
//       value: o.value,
//       text: o.textContent.trim(),
//     })),
//   )

//   console.log('All month options found:', allMonthOptions)

//   // 3. Pick the first 3 months
//   const recentThree = allMonthOptions.slice(0, month_length)

//   console.log('Selecting these months:', recentThree)

//   for (const month of recentThree) {
//     console.log(`\nSelecting month ${month.value} (${month.text})...`)

//     // a) Select the month -> triggers form submit
//     await Promise.all([
//       page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
//       page.selectOption('select[name="mState"]', month.value),
//     ])
//     console.log(`Page reloaded for month: ${month.text}`)

//     // b) Trigger CSV download from the "sel_link" dropdown
//     console.log(`Triggering CSV download for month ${month.value}...`)

//     const [download] = await Promise.all([
//       page.waitForEvent('download'),
//       page.selectOption('select[name="sel_link"]', 'CD'),
//     ])

//     // c) Build the final file path with your helper
//     const filePath = getCSVFilePath(accountName, month.value)

//     // d) Save the CSV
//     await download.saveAs(filePath)
//     console.log(`✔ CSV saved for ${month.text} at ${filePath}`)
//   }

//   console.log('✅ Done downloading CSV files for the 3 most recent months!')
// }

async function processAccountRows(page, accountRows) {
  for (const row of accountRows) {
    if (page.isClosed()) {
      console.error('❌ Page was closed unexpectedly! Stopping process.')

      return // Stop processing if the page is closed
    }

    if (row) {
      const rowHTML = await row.evaluate(el => el.outerHTML).catch(() => null)
      if (!rowHTML) {
        console.error('⚠️ Failed to retrieve row HTML. Skipping...')
        continue // Skip this row if it's unavailable
      }

      // console.log(`🧐 Inspecting row HTML:\n${rowHTML}`)

      const accountLink = await row.$('a[href*="viewDetails"]')

      console.log(`✅ Checking the link for Account: ${accountLink}`)

      if (accountLink) {
        const accountNumber = await accountLink.innerText()

        console.log(`🔗 Found active account: ${accountNumber}`)

        // Ensure navigation doesn't break execution context
        await Promise.race([
          page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => console.log('⚠️ Navigation timeout, continuing...')),
          accountLink.click(),
        ])

        console.log(`✅ Checking transactions for account ${accountNumber}...`)

        await page.waitForSelector('text=View Transaction History')
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
          page.click('text=View Transaction History'),
        ])

        console.log('✅ Now on the transaction history page!')
        await downloadMostRecentMonths(page, accountNumber)
      }
      else {
        const accountNumber = await row.innerText()

        console.log(`❌ Inactive or no <a> found in row: ${accountNumber}`)
      }
    }
    else {
      console.log('❌ No valid row found')
    }
  }
}

async function downloadLatestCreditCardTransactions(page, accountName) {
  console.log('🔄 Starting process to download latest credit card transactions...')

  // ✅ Step 1: Wait for the select box to be available before interacting
  await page.waitForSelector('select[name="sel_link"]', { timeout: 10000 })

  // ✅ Step 2: Retrieve the latest 3 months safely
  const latestMonths = await page.evaluate(month_length => {
    return Array.from(document.querySelectorAll('select[name="sel_link"] option'))
      .filter(opt => opt.value && opt.value !== 'CD' && opt.value !== 'TH') // Exclude "CD" and "TH"
      .slice(0, month_length) // Select first 3 months
      .map(opt => ({
        value: opt.value,
        text: opt.textContent.trim(),
      }))
  }, month_length) // Pass month_length as an argument

  console.log('📅 Selecting first 3 months:', latestMonths)

  let lastMonthName = '' // Store the last processed month name

  // ✅ Step 3: Loop through each month selection
  for (const month of latestMonths) {
    console.log(`🔄 Selecting month option: ${month.value} (${month.text})`)

    await Promise.all([
      page.selectOption('select[name="sel_link"]', month.value),
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }), // Handle page refresh
    ])

    console.log(`✅ Transactions loaded for month ${month.text}`)

    // ✅ Ensure transactions table is fully loaded
    await page.waitForSelector('#table-column-toggle tbody tr', { timeout: 5000 })

    // ✅ Debug: Log available transactions
    const transactions = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#table-column-toggle tbody tr')).map(row => ({
        cardUsed: row.cells[0]?.innerText.trim(),
        postingDate: row.cells[1]?.innerText.trim(),
        transactionDate: row.cells[2]?.innerText.trim(),
        description: row.cells[3]?.innerText.trim(),
        amount: row.cells[4]?.innerText.trim(),
        type: row.cells[5]?.innerText.trim(),
      }))
    })

    console.log(`📊 Transactions for ${month.text}:`, transactions)

    // Store the last processed month name (for file naming)
    lastMonthName = month.text.replace(/\s+/g, '_') // Replace spaces with underscores

    // ✅ Step 4: Select "CSV Download" and trigger the file download
    console.log('📥 Selecting CSV Download option...')

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.selectOption('select[name="sel_link"]', 'CD'),
    ])

    // ✅ Step 5: Save the file using `getCSVFilePath()`
    const filePath = getCSVFilePath(accountName, lastMonthName)

    await download.saveAs(filePath)
    console.log(`✔ CSV downloaded: ${filePath}`)

    // ✅ e) Call the function to store bank statement **after CSV download**
    const bankStatementId = await scrapeAndStoreBankStatement(page, filePath)

    console.log(`✅ Bank Statement ID for ${month.text}: ${bankStatementId}`)

    // ✅ Step 3: Now Store Transactions
    await storeBankStatementTransactions(bankStatementId, filePath)
  }
}

async function downloadMostRecentMonths(page, accountName) {
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
    const filePath = getCSVFilePath(accountName, month.value)

    // d) Save the CSV
    await download.saveAs(filePath)
    console.log(`✔ CSV saved for ${month.text} at ${filePath}`)

    // ✅ e) Call the function to store bank statement **after CSV download**
    const bankStatementId = await scrapeAndStoreBankStatement(page, filePath)

    console.log(`✅ Bank Statement ID for ${month.text}: ${bankStatementId}`)

    // ✅ Step 3: Now Store Transactions
    await storeBankStatementTransactions(bankStatementId, filePath)
  }

  console.log('✅ Done downloading CSV files for the 3 most recent months!')
}

async function scrapeAndStoreBankStatement(page, filePath) {
  // const axios = require('axios')

  // ✅ Scrape account details
  const accountDetails = await page.$$eval('#TABLE_2 tr', rows => {
    const data = {}

    rows.forEach(row => {
      const cells = row.querySelectorAll('td')
      if (cells.length >= 3) {
        const key = cells[0].textContent.trim()
        const value = cells[2].textContent.trim()

        if (key.includes('Account No'))
          data.accountNumber = value
        if (key.includes('Account Name'))
          data.accountName = value
        if (key.includes('Account Type'))
          data.accountType = value
        if (key.includes('Current Balance'))
          data.closingBalance = value.replace(/,/g, '') // Remove commas
        if (key.includes('Opening Balance'))
          data.openingBalance = value.replace(/,/g, '')
      }
    })

    return data
  })

  // ✅ Convert `From Date` (e.g., "01-03-2025") to `YYYY-MM`
  let statementMonth = null
  if (accountDetails.fromDate) {
    const dateParts = accountDetails.fromDate.split('-') // Split "01-03-2025" into ["01", "03", "2025"]
    if (dateParts.length === 3)
      statementMonth = `${dateParts[2]}-${dateParts[1]}` // Format as "2025-03"
  }

  // ✅ Now, you can access the extracted values:
  const fullName = accountDetails.accountName
  const accountNumber = accountDetails.accountNumber
  const accountType = await page.$eval('#TABLE_2 tr:nth-child(3) td:nth-child(3)', el => el.textContent.trim())
  const openingBalance = Number.parseFloat(accountDetails.openingBalance) || 0
  const closingBalance = Number.parseFloat(accountDetails.closingBalance) || null

  console.log(`✅ Extracted Account Name: ${fullName}`)
  console.log(`✅ Extracted Account Number: ${accountNumber}`)
  console.log(`✅ Extracted Account Type: ${accountType}`)
  console.log('✅ Extracted Account Details:', accountDetails)
  console.log('✅ Extracted Statement Month:', statementMonth)

  // ✅ Extract details from `filePath`
  // const fileParts = filePath.split('/')

  // ✅ Extract only the relative path

  // // Get relative path from basePath
  // const relativePath = path.relative(basePath, filePath)

  // // Construct the new path safely
  // const relativeFilePath = path.join(newBasePath, relativePath)

  const relativeFilePath = filePath.replace('/var/www/html/scripts/', 'scripts/')

  // const uniqueCode = fileParts[fileParts.length - 3] // Extract uniqueCode from path
  // const statementMonth = fileParts[fileParts.length - 2] // Extract YYYYMM

  const bankName = bankNameMap[bank.toLowerCase()] || bank.toUpperCase()

  // ✅ Send data to Laravel API **after** downloading the CSV
  const response = await axios.post('http://localhost/api/store-bank-statement', {
    full_name: fullName,
    bank_name: bankName,
    unique_code: uniqueCode,
    account_no: accountNumber,
    account_type: accountType,
    account_name: fullName,
    statement_month: statementMonth,
    opening_balance: openingBalance,
    closing_balance: closingBalance,
    method: 'csv',
    path: relativeFilePath, // ✅ Store the correct file path
  }).catch(error => {
    console.error('❌ API Error:', error.response ? error.response.data : error.message)

    return null
  })

  if (!response || !response.data) {
    console.error('❌ No response received from API')

    return null // Stop if no response
  }

  console.log('✅ Bank statement stored with ID:', response.data.id)

  return response.data.id // ✅ Return `bank_statement_id` for transactions
}

async function storeBankStatementTransactions(bankStatementId, csvFilePath) {
  console.log(`📂 Reading transactions from: ${csvFilePath}`)

  let statementMonth = null
  let openingBalance = null
  let closingBalance = null
  const transactions = []
  let headers = null
  let previousRowEmpty = false
  let hasTransactions = false
  let noTransactionPlaceholderAdded = false

  return new Promise((resolve, reject) => {
    let rowIndex = 0
    let foundHeaders = false

    fs.createReadStream(csvFilePath)
      .pipe(csvParser({ skipEmptyLines: true, trim: true }))
      .on('data', row => {
        const rowArray = Object.values(row).map(v => (v ? v.trim() : ''))

        console.log(`🔍 Parsed Row ${rowIndex}:`, rowArray)

        if (rowArray.length < 2) {
          console.warn(`⚠️ Skipping empty row at index ${rowIndex}`)
          previousRowEmpty = true

          return
        }

        if (rowIndex < 6) {
          const key = rowArray[0].replace(/:/g, '').trim()
          const value = rowArray[1] ? rowArray[1].trim() : null

          if (key.includes('From Date')) {
            const fromDateParts = value.split('-')
            if (fromDateParts.length === 3)
              statementMonth = `${fromDateParts[2]}-${fromDateParts[1]}`.trim()
          }

          if (key.includes('Opening Balance'))
            openingBalance = Number.parseFloat(value) || 0
          if (key.includes('Current Balance'))
            closingBalance = Number.parseFloat(value) || 0
        }
        else if (!foundHeaders && previousRowEmpty) {
          headers = rowArray
          foundHeaders = true
          console.log('📄 Extracted Headers:', headers)
        }
        else if (foundHeaders) {
          if (!headers) {
            console.warn('⚠️ Skipping row because headers were not detected!')

            return
          }

          const transactionData = {}

          headers.forEach((header, index) => {
            transactionData[header] = rowArray[index] || null
          })

          // ✅ Detect "-- No Transactions --"
          if (rowArray.includes('-- No Transactions --')) {
            if (!noTransactionPlaceholderAdded) {
              transactions.push({
                bank_statement_id: bankStatementId,
                posting_date: null,
                transaction_date: null,
                ref_no: null,
                description: 'No Transactions',
                amount: null,
                balance: openingBalance !== null ? openingBalance : closingBalance,
                transaction_type: null,
              })

              console.warn('⚠️ No transactions found. Storing single placeholder record.')
              noTransactionPlaceholderAdded = true
            }

            return
          }

          // ✅ Assign transaction fields
          const transactionDate = transactionData['Trn. Date'] || transactionData['Transaction Date'] || null
          const postingDate = transactionData['Post Date'] || transactionData['Posting Date'] || null
          const refNo = transactionData['Cheque No/Ref No'] || transactionData['Card Used'] || null
          const desc = transactionData['Transaction Description'] || 'N/A'

          const debitAmount = Number.parseFloat(transactionData['Debit Amount']) || 0
          const creditAmount = Number.parseFloat(transactionData['Credit Amount']) || 0
          const amount = debitAmount > 0 ? debitAmount : creditAmount
          const transactionType = debitAmount > 0 ? 'DR' : 'CR'

          if (transactionDate && amount > 0) {
            hasTransactions = true
            transactions.push({
              bank_statement_id: bankStatementId,
              posting_date: postingDate || null,
              transaction_date: transactionDate,
              ref_no: refNo,
              description: desc.trim(),
              amount,
              balance: null, // ✅ Balance will be computed later
              transaction_type: transactionType,
            })
          }
        }

        previousRowEmpty = false
        rowIndex++
      })
      .on('end', async () => {
        console.log('✅ Final Extracted Data:', {
          statement_month: statementMonth,
          opening_balance: openingBalance,
          closing_balance: closingBalance,
        })

        // ✅ Update bank statement
        try {
          await axios.put(
            `http://localhost/api/update-bank-statement/${bankStatementId}`,
            {
              statement_month: statementMonth,
              opening_balance: openingBalance,
              closing_balance: closingBalance,
            },
          )
          console.log('✅ Bank statement updated successfully.')
        }
        catch (error) {
          console.error('❌ API Error (Bank Statement Update):', error.response?.data || error.message)
        }

        // ✅ Compute Balances and Debug
        console.log('🔄 Calculating Balances...')

        if (transactions.length > 0) {
          if (openingBalance !== null) {
            console.log(`🔹 Using Opening Balance: ${openingBalance}`)
            let currentBalance = openingBalance

            transactions.forEach(transaction => {
              if (transaction.transaction_type === 'CR')
                currentBalance += transaction.amount
              else if (transaction.transaction_type === 'DR')
                currentBalance -= transaction.amount

              transaction.balance = currentBalance // ✅ Store computed balance
            })
          }
          else if (closingBalance !== null) {
            console.log(`🔹 Using Closing Balance (Latest Available): ${closingBalance}`)
            let currentBalance = closingBalance

            // ✅ Initialize object to track monthly opening balances
            const openingBalanceByMonth = {}

            // ✅ Sort transactions from latest to earliest
            transactions.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))

            // ✅ Reverse transactions order to calculate balance backwards
            transactions.forEach(transaction => {
              if (transaction.transaction_type === 'CR')
                currentBalance -= transaction.amount
              else if (transaction.transaction_type === 'DR')
                currentBalance += transaction.amount

              transaction.balance = currentBalance // ✅ Store computed balance

              // ✅ If this is the last transaction of a month, store the opening balance for that month
              const transactionDate = new Date(transaction.transaction_date)
              const monthYear = `${transactionDate.getFullYear()}-${(transactionDate.getMonth() + 1).toString().padStart(2, '0')}`

              if (!openingBalanceByMonth[monthYear]) {
                openingBalanceByMonth[monthYear] = currentBalance
                console.log(`📌 Computed Opening Balance for ${monthYear}: ${currentBalance}`)
              }
            })

            // ✅ Assign the computed Opening Balance for the earliest available month
            openingBalance = openingBalanceByMonth[Object.keys(openingBalanceByMonth).pop()] || currentBalance
            console.log(`✅ Final Computed Opening Balance: ${openingBalance}`)

            // console.log(`🔹 Using Closing Balance: ${closingBalance}`)
            // let currentBalance = closingBalance

            // // Reverse transactions order to calculate balance backwards
            // transactions.reverse().forEach(transaction => {
            //   if (transaction.transaction_type === 'CR')
            //     currentBalance -= transaction.amount
            //   else if (transaction.transaction_type === 'DR')
            //     currentBalance += transaction.amount

            //   transaction.balance = currentBalance // ✅ Store computed balance
            // })

            // // ✅ Assign the computed Opening Balance
            // openingBalance = currentBalance
            // console.log(`🔹 Computed Opening Balance: ${openingBalance}`)
          }
        }

        // ✅ Ensure at least one transaction is stored
        if (!hasTransactions && !noTransactionPlaceholderAdded) {
          console.warn('⚠️ No valid transactions found! Storing a placeholder.')
          transactions.push({
            bank_statement_id: bankStatementId,
            posting_date: null,
            transaction_date: null,
            ref_no: null,
            description: 'No Transactions',
            amount: null,
            balance: openingBalance !== null ? openingBalance : closingBalance,
            transaction_type: null,
          })
        }

        // ✅ Send transactions to API
        console.log('📡 Sending Transactions to API:', JSON.stringify(transactions, null, 2))

        try {
          const response = await axios.post(
            'http://localhost/api/store-bank-transactions',
            { transactions },
          )

          console.log('✅ Transactions stored successfully:', response.data)
        }
        catch (error) {
          console.error('❌ API Error (Transaction Store):', error.response?.data || error.message)
        }

        resolve()
      })
      .on('error', error => {
        console.error('❌ Error parsing CSV:', error)
        reject(error)
      })
  })
}

/**
 * Helper function to perform login using Playwright
 */
async function loginWithPlaywright(accessId, password) {
  console.log('🔵 Using Playwright for login...')
  try {
    const browser = await chromium.launch({
      headless: true, // Must run headless in Docker container
      // executablePath: 'C:\\Users\\WilsonOoi\\AppData\\Local\\ms-playwright\\chromium-1155\\chrome-win\\chrome.exe',

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

    // console.log(`🔀 Redirecting to actual login page: ${loginUrl}`)
    await logAndScreenshot(page, `🔀 Redirecting to actual login page: ${loginUrl}`)

    await page.goto(loginUrl, { waitUntil: 'networkidle' })

    // console.log('⏳ Checking for iframe...')
    await logAndScreenshot(page, '⏳ Checking for iframe...')
    let frame = page
    const iframeElement = await page.$('iframe')
    if (iframeElement) {
      // console.log('✅ Found iframe, switching context...')
      await logAndScreenshot(page, '✅ Found iframe, switching context...')
      frame = await iframeElement.contentFrame()
    }

    // console.log('⏳ Waiting for username field...')
    await logAndScreenshot(page, '⏳ Waiting for username field...')
    await frame.locator('input[name="tempusername"]').waitFor({ state: 'visible' })

    // console.log('📝 Typing Username...')
    await logAndScreenshot(page, '📝 Typing Username...')
    await typeLikeHuman(frame, 'input[name="tempusername"]', accessId)

    // console.log('✅ Clicking Next Button...')
    await logAndScreenshot(page, '✅ Clicking Next Button...')
    await frame.locator('#NextBtn').click()

    // console.log('⏳ Waiting for "Yes" radio button...')
    await logAndScreenshot(page, '⏳ Waiting for "Yes" radio button...')
    await frame.locator('input[name="passcred"][value="YES"]').waitFor({ state: 'visible' })

    // console.log('✅ Clicking "Yes" radio button...')
    await logAndScreenshot(page, '✅ Clicking "Yes" radio button...')
    await frame.click('input[name="passcred"][value="YES"]')

    // console.log('⏳ Waiting for password field to be enabled...')
    await logAndScreenshot(page, '⏳ Waiting for password field to be enabled...')
    await frame.waitForFunction(() => {
      const el = document.querySelector('input[name="password"]')

      return el && !el.disabled
    }, { timeout: 30000 })

    // console.log('📝 Typing Password...')
    await logAndScreenshot(page, '📝 Typing Password...')
    await typeLikeHuman(frame, 'input[name="password"]', password)

    // console.log('✅ Clicking Login Button...')
    await logAndScreenshot(page, '✅ Clicking Login Button...')
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
      frame.locator('#SubmitBtn').click(),
    ])

    // console.log('✅ Login successful!')
    await logAndScreenshot(page, '✅ Login successful!')

    // await page.screenshot({ path: 'screenshots/debug_before_account_page.png', fullPage: true })

    // After you've done your final login step:

    // console.log('⏳ Checking for duplicate login or main page...')
    await logAndScreenshot(page, '⏳ Checking for duplicate login or main page...')
    await page.waitForTimeout(2000) // short wait to let the page finalize

    // 1) Try to detect the duplicate login modal
    const duplicateDialog = await page.$('#DuplicateLoginDialog')

    if (duplicateDialog) {
      // console.log('⚠️ Duplicate login detected...')
      await logAndScreenshot(page, '⚠️ Duplicate login detected...')

      // Wait for the “Proceed to login” button
      const proceedBtnSelector = 'button.btn.red[name="accept"]:has-text("Proceed to login")'

      await page.waitForSelector(proceedBtnSelector, { timeout: 30000 })
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
        page.click(proceedBtnSelector),
      ])

      // console.log('✅ Successfully cleared duplicate login prompt.')
      await logAndScreenshot(page, '✅ Successfully cleared duplicate login prompt.')
    }

    // 2) Now handle the main page
    //    Either it has an iframe or direct tiles
    // await page.screenshot({ path: 'screenshots/debug_before_account_page1.png', fullPage: true })

    // console.log('⏳ Checking if iframe (#new-ebank-container) is present...')
    await logAndScreenshot(page, '⏳ Checking if iframe (#new-ebank-container) is present...')

    const iframeHandle = await page.$('iframe#new-ebank-container')

    if (iframeHandle) {
      // console.log('✅ Found iframe. Switching context...')
      await logAndScreenshot(page, '✅ Found iframe. Switching context...')

      const iframe = await iframeHandle.contentFrame()

      // Wait for the ACCOUNT tile link
      // console.log('⏳ Waiting for ACCOUNT tile in iframe...')
      await logAndScreenshot(page, '⏳ Waiting for ACCOUNT tile in iframe...')
      await iframe.waitForSelector('a[href*="BxxxAccountInfo_sum"]', { timeout: 30000 })

      // console.log('✅ Clicking ACCOUNT tile in iframe...')
      await logAndScreenshot(page, '✅ Clicking ACCOUNT tile in iframe...')
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
        iframe.click('a[href*="BxxxAccountInfo_sum"]'),
      ])
    }
    else {
      // console.log('ℹ️ No iframe found. Checking for direct tile link...')
      await logAndScreenshot(page, 'ℹ️ No iframe found. Checking for direct tile link...')

      // Wait for the tile that has the text "ACCOUNT"
      // await page.waitForSelector('div.tile.bg-red:has-text("ACCOUNT")', { timeout: 30000 })
      // await page.screenshot({ path: 'screenshots/debug_before_account_page2.png', fullPage: true })

      // console.log('⏳ Navigating to Account Page...')
      await logAndScreenshot(page, '⏳ Navigating to Account Page...')
      await page.evaluate(() => {
        const accountLink = document.querySelector('a[href*=\'BxxxAccountInfo_sum\']')
        if (accountLink)
          accountLink.click()
      })
    }

    // console.log('✅ Successfully navigated to Account Page!')
    await logAndScreenshot(page, '✅ Successfully navigated to Account Page!')

    /////////////////////////////////////////////////////////////////////////
    ////
    /// // STEP 1  - PDF STATEMENTS
    ////
    /////////////////////////////////////////////////////////////////////////
    // console.log('⏳Step 1 of 3 Get the 3 Months Statements ...')

    // // console.log('⏳ Navigating to Statement Page...')
    // await logAndScreenshot(page, '⏳ Navigating to Statement Page...')

    // const statementSelector = 'a[href*="MethodName=formStatementDownload"]'

    // // await page.screenshot({ path: './screenshots/debug_statement.png', fullPage: true })

    // await page.locator(statementSelector).waitFor({ state: 'visible', timeout: 40000 })

    // await Promise.all([
    //   page.waitForNavigation({ waitUntil: 'networkidle', timeout: 40000 }),
    //   page.locator(statementSelector).click(),
    // ])

    // console.log('✅ Successfully opened Statement Page!')

    // // await page.screenshot({ path: 'screenshots/debug_before_account_page3.png', fullPage: true })

    // // Process accounts and download statements
    // await downloadStatementsForAllAccounts(page)

    /////////////////////////////////////////////////////////////////////////
    //////
    /// /// STEP 2 - CSV Transactions
    //////
    /////////////////////////////////////////////////////////////////////////
    console.log('⏳Step 2 of 3 Get the 3 Months Transaction Details in CSV ...')

    // // --- New lines start here ---
    // // console.log('🔙 Navigating back to Home Page...')
    // await logAndScreenshot(page, '🔙 Navigating back to Home Page...')

    // // Click the “Home” link by text or by a more specific selector
    // await page.click('a.btn.blue >> text=Home')
    // await page.waitForTimeout(2000)
    // console.log('✅ Reached Home Page!')

    // // await logAndScreenshot(page, '✅ Reached Home Page!')

    // // console.log('⏳ Navigating to Account Page...')
    // await logAndScreenshot(page, '⏳ Navigating to Account Page...')
    // await page.evaluate(() => {
    //   const accountLink = document.querySelector('a[href*=\'BxxxAccountInfo_sum\']')
    //   if (accountLink)
    //     accountLink.click()
    // })

    // 1. Wait for the table to be visible
    await page.waitForSelector('#table-column-toggle1')

    // 2. Get all table rows within tbody
    const accountRows = await page.$$('#table-column-toggle1 tbody tr')

    // console.log('🔍 For future checking purpose, DO NOT DELETE below code')
    await logAndScreenshot(page, '🔍 For future checking purpose, DO NOT DELETE below code')

    // const rows = await page.$$eval('#table-column-toggle1 tbody tr', trs =>
    //   trs.map(tr => ({
    //     text: tr.innerText.trim(),
    //     html: tr.outerHTML.trim(),
    //   })),
    // )

    // console.log('🧐 Found table rows with HTML:\n', rows)

    // console.log(`🔍 Found ${accountRows} of account`)
    await logAndScreenshot(page, `🔍 Found ${accountRows} of account`)

    // 3. Loop for get how many accounts in the table

    if (accountRows.length > 0) {
      // console.log(`✅ Found ${accountRows.length} account rows. Processing...`)
      await logAndScreenshot(page, `✅ Found ${accountRows.length} account rows. Processing...`)
      await processAccountRows(page, accountRows)
    }
    else {
      // console.error('❌ No account rows found!')
      await logAndScreenshot(page, '❌ No account rows found!')
    }

    // console.log('🔙 Navigating back to Account Page...')
    await logAndScreenshot(page, '🔙 Navigating back to Account Page...')

    // await page.screenshot({ path: 'screenshots/debug_before_account_page4.png', fullPage: true })

    console.log('⏳ Waiting for Account Page link...')

    await page.evaluate(() => {
      const accountLink2 = document.querySelector('a[href*=\'BxxxAccountInfo_sum\']')
      if (accountLink2)
        accountLink2.click()
    })

    // --- Grab Credit Card Account ---
    // 1. Wait for the table to be visible
    const creditCardTableExists = await page
      .locator('#table-column-toggle3')
      .isVisible({ timeout: 3000 }) // ✅ Short timeout to prevent long waits

    if (!creditCardTableExists) {
      console.log('⚠️ No Credit Card Accounts Found! Skipping to the next step...')
    }
    else {
      console.log('✅ Found Credit Card Account Table. Processing...')

      // 1. Wait for the table to be visible
      await page.waitForSelector('#table-column-toggle3')

      // 2. Get all table rows within tbody
      const account2Rows = await page.$$('#table-column-toggle3 tbody tr:visible') // Ensure only visible rows are selected

      // console.log(`🔍 Found ${account2Rows} of credit card account`)
      await logAndScreenshot(page, `🔍 Found ${account2Rows} of credit card account`)

      // 3. Loop for get how many accounts in the table
      for (const row of account2Rows) {
        const accountLink = await row.$('td.text-center a')

        if (accountLink) {
        // => The account is active
          const accountNumber = await accountLink.innerText()

          // console.log(`🔗 Found active account: ${accountNumber}`)
          await logAndScreenshot(page, `🔗 Found active account: ${accountNumber}`)

          // 1) Click the account link to go to details
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
            accountLink.click(),
          ])

          // console.log(`✅ Checking transactions for account ${accountNumber}...`)
          await logAndScreenshot(page, `✅ Checking transactions for account ${accountNumber}...`)

          // 2) Click "View Transaction History"
          await page.evaluate(() => viewTrnxHist())

          console.log('✅ Now on the View Latest Statement page!')

          // 3) Download the CSV for the top 3 months
          //    Here we pass `accountNumber` as the "accountName" param.
          //    If you actually have a separate variable for the account name,
          //    e.g. `accountName`, use that instead.
          await downloadLatestCreditCardTransactions(page, accountNumber)

          // Next steps ...
          console.log('🔙 Navigating back to Account Page...')

          // await page.screenshot({ path: 'screenshots/debug_before_account_page2.png', fullPage: true })

          // console.log('⏳ Navigating to Account Page...')
          await logAndScreenshot(page, '⏳ Navigating to Account Page...')
          await page.evaluate(() => {
            const accountLink2 = document.querySelector('a[href*=\'BxxxAccountInfo_sum\']')
            if (accountLink2)
              accountLink2.click()
          })
        }
        else {
        // => Inactive account
          const accountNumber = await row.innerText()

          console.log(`❌ Inactive or no <a> found in row: ${accountNumber}`)
          await logAndScreenshot(page, `❌ Inactive or no <a> found in row: ${accountNumber}`)
        }
      }
    }

    /////////////////////////////////////////////////////////////////////////
    ////
    /// // STEP 3  - HTML STATEMENTS
    ////
    /////////////////////////////////////////////////////////////////////////
    console.log('⏳Step 3 of 3 Get the 3 Months HTML Statements ...')

    console.log('⏳ Waiting 10 seconds before logging out...')
    await page.waitForTimeout(10000)

    // console.log('🔍 Searching for logout button...')
    await logAndScreenshot(page, '🔍 Searching for logout button...')

    const logoutButton = await page.waitForSelector('a[href*="MethodName=logout"]', { state: 'visible', timeout: 10000 })

    console.log('🚪 Logging out...')
    await logoutButton.click()

    await page.waitForTimeout(2000)

    // console.log('✅ Successfully logged out.')
    await logAndScreenshot(page, '✅ Successfully logged out.')
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

  const playwrightSuccess = await loginWithPlaywright(accessId, password, uniqueCode)
  if (!playwrightSuccess)
    console.log('Playwright login failed.')
}

// ---------------------------
// ✅ RUN THE SCRIPT
// ---------------------------
startScraping()
