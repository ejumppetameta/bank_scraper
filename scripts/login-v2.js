import path from 'node:path'
import { pipeline } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import puppeteer from 'puppeteer'

const streamPipeline = promisify(pipeline)

// Fix "__dirname" and "__filename" in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Define supported banks and their login URLs + input selectors
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
  console.log(`Using Puppeteer for login to ${bank}...`)

  // Validate if bank is supported
  if (!banks[bank]) {
    console.error(`❌ Unsupported bank: ${bank}`)

    return { status: 'error', message: `Bank "${bank}" is not supported.` }
  }

  const bankData = banks[bank]

  try {
    const browser = await puppeteer.launch({ headless: false })
    const page = await browser.newPage()

    console.log(`Navigating to ${bankData.url}...`)
    await page.goto(bankData.url, { waitUntil: 'networkidle2' })

    console.log('Entering credentials...')
    await page.type(bankData.usernameSelector, accessId, {
      delay: Math.floor(Math.random() * 200) + 100,
    })
    await new Promise(resolve => setTimeout(resolve, 500))
    await page.type(bankData.passwordSelector, password, {
      delay: Math.floor(Math.random() * 200) + 100,
    })

    console.log('Clicking login...')
    await page.click(bankData.loginButtonSelector)
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 90000 })

    console.log('✅ Login successful!')

    // Check if bank supports statement download
    if (bank === 'JCIM Bank') {
      console.log('Navigating to Meeting Report...')
      await page.waitForSelector('span.menu-item.text-truncate[data-i18n=\'Meeting Report\']', { visible: true })
      await page.click('span.menu-item.text-truncate[data-i18n=\'Meeting Report\']')

      console.log('✅ Successfully navigated to Meeting Report')

      console.log('Triggering modal popup...')
      await page.waitForSelector('a.detail-report.text-info', { visible: true })
      await page.click('a.detail-report.text-info')

      console.log('✅ Modal popup triggered')

      console.log('Downloading PDF...')
      await page.waitForSelector('a.modal-pdf-viewer', { visible: true })

      const pdfLink = await page.$eval('a.modal-pdf-viewer', el => el.getAttribute('path'))
      const baseUrl = 'https://jcimalaysia.cc/roadmap/'
      const pdfUrl = new URL(pdfLink, baseUrl).href

      console.log(`🔍 Checking PDF URL: ${pdfUrl}`)

      const pdfResponse = await fetch(pdfUrl)
      if (!pdfResponse.ok)
        throw new Error(`❌ Failed to download PDF: ${pdfResponse.statusText} (HTTP ${pdfResponse.status})`)

      const statementDir = path.join(__dirname, 'statements')
      if (!fs.existsSync(statementDir))
        fs.mkdirSync(statementDir)

      const uniqueCode = `${Math.random().toString(36).substr(2, 6)}-${Math.random().toString(36).substr(2, 4)}`
      const pdfDir = path.join(statementDir, uniqueCode)

      fs.mkdirSync(pdfDir)

      const pdfPath = path.join(pdfDir, path.basename(pdfUrl))
      const pdfStream = createWriteStream(pdfPath)

      await streamPipeline(pdfResponse.body, pdfStream)

      console.log(`✅ PDF downloaded successfully: ${pdfPath}`)
    }

    console.log('Logging out...')
    await page.evaluate(() => {
      document.querySelector('div.avatar.bg-light-info')?.click()
    })

    await page.waitForSelector('a.dropdown-item[href=\'functions/logout.php\']', { visible: true })
    await page.click('a.dropdown-item[href=\'functions/logout.php\']')

    console.log('✅ Successfully logged out')
    await browser.close()

    return { status: 'success', message: 'Login successful!', pdf: pdfPath || null }
  }
  catch (error) {
    console.error('❌ Puppeteer login failed:', error)

    return { status: 'error', message: 'Login failed. Please try again.' }
  }
}

// Get command line arguments if running via Laravel Process
const [,, bank, accessId, password] = process.argv
if (bank && accessId && password) {
  loginWithPuppeteer(bank, accessId, password)
    .then(result => console.log(JSON.stringify(result)))
    .catch(err => console.error('❌ Script error:', err))
}
