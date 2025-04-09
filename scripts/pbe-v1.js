import puppeteer from 'puppeteer'
import { Builder, By, until } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'

const BANK_URL = 'https://www2.pbebank.com/pbemain.html'
const BANK_USERNAME = 'your-username' // Replace with actual username
const BANK_PASSWORD = 'your-password' // Replace with actual password

// Simulate human-like typing speed
async function typeLikeHuman(page, selector, text) {
  for (const char of text)
    await page.type(selector, char, { delay: Math.floor(Math.random() * 200) + 50 })
}

// ---------------------------
// ✅ LOGIN USING PUPPETEER (ENHANCED WITH IFRAME HANDLING)
// ---------------------------

async function loginWithPuppeteer(accessId, password) {
  console.log('🔵 Using Puppeteer for login...')
  try {
    const browser = await puppeteer.launch({ headless: false }) // Set to true for headless mode
    const page = await browser.newPage()

    await page.setViewport({ width: 1280, height: 800 })

    console.log(`🔍 Navigating to ${BANK_URL}`)
    await page.goto(BANK_URL, { waitUntil: 'domcontentloaded' })

    console.log('⏳ Extracting actual login URL...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    const loginUrlElement = await page.$('input#pbb_eai')

    const loginUrl = loginUrlElement
      ? await page.$eval('input#pbb_eai', el => el.value)
      : 'https://www2.pbebank.com/myIBK/apppbb/servlet/BxxxServlet?RDOName=BxxxAuth&MethodName=login'

    console.log(`🔀 Redirecting to actual login page: ${loginUrl}`)
    await page.goto(loginUrl, { waitUntil: 'networkidle2' })

    console.log('⏳ Checking for iframe...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    const iframeElement = await page.$('iframe')
    const frame = iframeElement ? await iframeElement.contentFrame() : page

    console.log('⏳ Waiting for username field...')
    await frame.waitForSelector('input[name="tempusername"]', { visible: true, timeout: 20000 })

    console.log('📝 Typing Username...')
    await typeLikeHuman(frame, 'input[name="tempusername"]', accessId)

    console.log('✅ Clicking Next Button...')
    await frame.waitForSelector('#NextBtn', { visible: true, timeout: 10000 })
    await frame.click('#NextBtn')

    console.log('⏳ Waiting for "Yes" radio button...')
    await frame.waitForSelector('#passcred', { visible: true, timeout: 30000 })

    console.log('✅ Clicking "Yes" radio button...')
    await frame.click('#passcred')

    console.log('⏳ Waiting for password field to be enabled...')
    await frame.waitForFunction(() => {
      const el = document.querySelector('input[name="password"]')

      return el && !el.disabled
    }, { timeout: 30000 })

    console.log('📝 Typing Password...')
    await typeLikeHuman(frame, 'input[name="password"]', password)

    console.log('✅ Clicking Login Button...')
    await frame.waitForSelector('#SubmitBtn', { visible: true, timeout: 30000 })
    await frame.click('#SubmitBtn')

    console.log('⏳ Waiting for page redirection after login...')
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {
      console.log('⚠️ Page might not have fully reloaded.')
    })

    console.log('🔍 Checking if login is successful...')

    // ✅ Check for dashboard elements
    const logoutButton = await page.$('a[href*="MethodName=logout"]')
    const dashboardContainer = await page.$('.dashboard-container')
    const accountOverview = await page.$('#account-overview')

    if (logoutButton || dashboardContainer || accountOverview) {
      console.log('✅ Login successful with Puppeteer!')

      console.log('⏳ Waiting for 10 seconds before logging out...')
      await page.waitForTimeout(10000)

      console.log('🚪 Logging out...')
      await logoutButton.click()

      console.log('✅ Successfully logged out.')
    }
    else {
      console.log('❌ Login not detected. Check for MFA or errors.')
    }

    await browser.close()

    return true
  }
  catch (error) {
    console.error('❌ Puppeteer login failed:', error)

    return false
  }
}

// ---------------------------
// ✅ LOGIN USING SELENIUM (IMPROVED IFRAME HANDLING)
// ---------------------------
async function loginWithSelenium(accessId, password) {
  console.log('🔵 Using Selenium for login...')
  try {
    const options = new chrome.Options()

    options.addArguments('--headless') // Run headless mode

    const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build()

    console.log(`🔍 Navigating to ${BANK_URL}`)
    await driver.get(BANK_URL)

    console.log('⏳ Extracting actual login URL...')
    await driver.sleep(3000)

    let loginUrl
    try {
      const loginUrlElement = await driver.wait(until.elementLocated(By.id('pbb_eai')), 10000)

      loginUrl = await loginUrlElement.getAttribute('value')
    }
    catch {
      console.log('⚠️ Login URL not found, using default.')
      loginUrl = 'https://www2.pbebank.com/myIBK/apppbb/servlet/BxxxServlet?RDOName=BxxxAuth&MethodName=login'
    }

    console.log(`🔀 Redirecting to actual login page: ${loginUrl}`)
    await driver.get(loginUrl)

    console.log('⏳ Checking for iframe...')
    await driver.sleep(3000)

    const iframes = await driver.findElements(By.tagName('iframe'))

    console.log(`🧐 Found ${iframes.length} iframes.`)

    if (iframes.length > 1) {
      console.log('✅ Switching to the second iframe...')
      await driver.switchTo().frame(iframes[1])
    }

    console.log('⏳ Waiting for username field...')

    const usernameField = await driver.wait(until.elementLocated(By.name('tempusername')), 20000)

    console.log('📝 Typing Username...')
    for (const char of accessId) {
      await usernameField.sendKeys(char)
      await driver.sleep(Math.floor(Math.random() * 300) + 100)
    }

    console.log('✅ Clicking Next Button...')

    const nextButton = await driver.wait(until.elementLocated(By.id('NextBtn')), 10000)

    await nextButton.click()

    console.log('⏳ Waiting for "Yes" radio button...')
    await driver.wait(until.elementLocated(By.id('passcred')), 15000)

    console.log('✅ Clicking "Yes" radio button...')

    const yesRadioButton = await driver.findElement(By.css('input[name="passcred"][value="YES"]'))

    await yesRadioButton.click()

    console.log('⏳ Waiting for password field to be enabled...')
    await driver.wait(async () => {
      const el = await driver.findElement(By.name('password'))

      return el.isEnabled()
    }, 10000)

    console.log('📝 Typing Password...')

    const passwordField = await driver.findElement(By.name('password'))
    for (const char of password) {
      await passwordField.sendKeys(char)
      await driver.sleep(Math.floor(Math.random() * 300) + 100)
    }

    console.log('✅ Clicking Login Button...')

    const loginButton = await driver.wait(until.elementLocated(By.id('SubmitBtn')), 10000)

    await loginButton.click()

    console.log('⏳ Checking if login is successful...')
    try {
      await driver.wait(until.elementLocated(By.id('new-ebank-container')), 8000)
      console.log('✅ Login successful with Selenium!')

      // ✅ Wait for 10 seconds before logout
      console.log('⏳ Waiting 10 seconds before logging out...')
      await driver.sleep(10000)

      console.log('🔍 Searching for logout button...')

      const logoutButton = await driver.wait(
        until.elementLocated(By.xpath('//a[contains(@href, "MethodName=logout")]')),
        10000,
      )

      console.log('🚪 Logging out...')
      await logoutButton.click()

      console.log('✅ Successfully logged out.')
    }
    catch (error) {
      console.log('⚠️ Login might have failed or encountered MFA.')
    }

    await driver.quit()
  }
  catch (error) {
    console.error('❌ Selenium login failed:', error)
  }
}

// ---------------------------
// ✅ START SCRAPING PROCESS
// ---------------------------
async function startScraping() {
  console.log('🔎 Starting login test...')

  const puppeteerSuccess = await loginWithPuppeteer(BANK_USERNAME, BANK_PASSWORD)
  if (!puppeteerSuccess) {
    console.log('Puppeteer failed, switching to Selenium...')
    await loginWithSelenium(BANK_USERNAME, BANK_PASSWORD)
  }
}

// ---------------------------
// ✅ RUN THE SCRIPT
// ---------------------------
startScraping()
