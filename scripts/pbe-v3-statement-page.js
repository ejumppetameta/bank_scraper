import puppeteer from 'puppeteer'
import { Builder, By, until } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'

// ---------------------------
// ✅ LOGIN USING PUPPETEER (ENHANCED WITH IFRAME HANDLING)
// ---------------------------
// async function loginWithPuppeteer(accessId, password) {
//   console.log('🔵 Using Puppeteer for login...')
//   try {
//     const browser = await puppeteer.launch({ headless: false })
//     const page = await browser.newPage()

//     await page.setViewport({ width: 1280, height: 800 })

//     console.log(`🔍 Navigating to ${BANK_URL}`)
//     await page.goto(BANK_URL, { waitUntil: 'domcontentloaded' })

//     console.log('⏳ Extracting actual login URL...')
//     await new Promise(resolve => setTimeout(resolve, 3000))

//     const loginUrlElement = await page.$('input#pbb_eai')

//     const loginUrl = loginUrlElement
//       ? await page.$eval('input#pbb_eai', el => el.value)
//       : 'https://www2.pbebank.com/myIBK/apppbb/servlet/BxxxServlet?RDOName=BxxxAuth&MethodName=login'

//     console.log(`🔀 Redirecting to actual login page: ${loginUrl}`)
//     await page.goto(loginUrl, { waitUntil: 'networkidle2' })

//     console.log('⏳ Checking for iframe...')
//     await new Promise(resolve => setTimeout(resolve, 3000))

//     let frame = page
//     const iframeElement = await page.$('iframe')
//     if (iframeElement) {
//       console.log('✅ Found iframe, switching context...')
//       frame = await iframeElement.contentFrame()
//     }

//     console.log('⏳ Waiting for username field...')
//     await frame.waitForSelector('input[name="tempusername"]', { visible: true, timeout: 20000 })

//     console.log('📝 Typing Username...')
//     await typeLikeHuman(frame, 'input[name="tempusername"]', accessId)

//     console.log('✅ Clicking Next Button...')
//     await frame.waitForSelector('#NextBtn', { visible: true, timeout: 10000 })
//     await frame.click('#NextBtn')

//     console.log('⏳ Waiting for "Yes" radio button...')
//     await frame.waitForSelector('input[name="passcred"][value="YES"]', { visible: true, timeout: 15000 })

//     console.log('✅ Clicking "Yes" radio button...')
//     await frame.click('input[name="passcred"][value="YES"]')

//     console.log('⏳ Waiting for password field to be enabled...')
//     await frame.waitForFunction(() => {
//       const el = document.querySelector('input[name="password"]')

//       return el && !el.disabled
//     }, { timeout: 30000 })

//     console.log('📝 Typing Password...')
//     await typeLikeHuman(frame, 'input[name="password"]', password)

//     console.log('✅ Clicking Login Button...')
//     await frame.waitForSelector('#SubmitBtn', { visible: true, timeout: 30000 })
//     await frame.click('#SubmitBtn')

//     console.log('⏳ Waiting for dashboard to load...')
//     await page.waitForSelector('.page-title', { visible: true, timeout: 15000 })

//     console.log('✅ Login successful!')

//     console.log('⏳ Navigating to Account Page...')

//     const accountSelector = 'a[href*="BxxxAccountInfo_sum"]'

//     await page.waitForSelector(accountSelector, { visible: true, timeout: 15000 })

//     console.log('✅ Clicking Account Page link...')
//     await page.waitForTimeout(3000) // 3 seconds delay
//     await page.click(accountSelector)

//     console.log('⏳ Waiting for Account Page to load...')
//     await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })

//     console.log('✅ Successfully opened Account Page!')

//     // ✅ Wait 10 seconds before logout
//     console.log('⏳ Waiting 10 seconds before logging out...')
//     await page.waitForTimeout(10000)

//     console.log('🔍 Searching for logout button...')

//     const logoutButton = await page.waitForSelector('a[href*="MethodName=logout"]', { visible: true, timeout: 10000 })

//     console.log('🚪 Logging out...')
//     await logoutButton.click()

//     console.log('✅ Successfully logged out.')

//     await browser.close()

//     return true
//   }
//   catch (error) {
//     console.error('❌ Puppeteer login failed:', error)

//     return false
//   }
// }

const BANK_URL = 'https://www2.pbebank.com/pbemain.html'
const BANK_USERNAME = 'your-username' // Replace with actual username
const BANK_PASSWORD = 'your-password' // Replace with actual password

// Simulate human-like typing speed
async function typeLikeHuman(page, selector, text) {
  for (const char of text)
    await page.type(selector, char, { delay: Math.floor(Math.random() * 200) + 50 })
}

// async function loginWithPuppeteer(accessId, password) {
//   console.log('🔵 Using Puppeteer for login...')
//   try {
//     const browser = await puppeteer.launch({ headless: false })
//     const page = await browser.newPage()

//     await page.setViewport({ width: 1280, height: 800 })

//     console.log(`🔍 Navigating to ${BANK_URL}`)
//     await page.goto(BANK_URL, { waitUntil: 'domcontentloaded' })

//     console.log('⏳ Extracting actual login URL...')
//     await new Promise(resolve => setTimeout(resolve, 3000))

//     const loginUrlElement = await page.$('input#pbb_eai')

//     const loginUrl = loginUrlElement
//       ? await page.$eval('input#pbb_eai', el => el.value)
//       : 'https://www2.pbebank.com/myIBK/apppbb/servlet/BxxxServlet?RDOName=BxxxAuth&MethodName=login'

//     console.log(`🔀 Redirecting to actual login page: ${loginUrl}`)
//     await page.goto(loginUrl, { waitUntil: 'networkidle2' })

//     console.log('⏳ Checking for iframe...')
//     await new Promise(resolve => setTimeout(resolve, 3000))

//     let frame = page
//     const iframeElement = await page.$('iframe')
//     if (iframeElement) {
//       console.log('✅ Found iframe, switching context...')
//       frame = await iframeElement.contentFrame()
//     }

//     console.log('⏳ Waiting for username field...')
//     await frame.waitForSelector('input[name="tempusername"]', { visible: true, timeout: 20000 })

//     console.log('📝 Typing Username...')
//     await frame.type('input[name="tempusername"]', accessId, { delay: 100 })

//     console.log('✅ Clicking Next Button...')
//     await frame.waitForSelector('#NextBtn', { visible: true, timeout: 10000 })
//     await frame.click('#NextBtn')

//     console.log('⏳ Waiting for "Yes" radio button...')
//     await frame.waitForSelector('input[name="passcred"][value="YES"]', { visible: true, timeout: 15000 })

//     console.log('✅ Clicking "Yes" radio button...')
//     await frame.click('input[name="passcred"][value="YES"]')

//     console.log('⏳ Waiting for password field to be enabled...')
//     await frame.waitForFunction(() => {
//       const el = document.querySelector('input[name="password"]')

//       return el && !el.disabled
//     }, { timeout: 30000 })

//     console.log('📝 Typing Password...')
//     await frame.type('input[name="password"]', password, { delay: 100 })

//     console.log('✅ Clicking Login Button...')
//     await frame.waitForSelector('#SubmitBtn', { visible: true, timeout: 30000 })
//     await frame.click('#SubmitBtn')

//     console.log('⏳ Waiting for dashboard to load...')
//     await page.waitForSelector('.page-title', { visible: true, timeout: 15000 })

//     console.log('✅ Login successful!')

//     console.log('⏳ Taking a screenshot before navigating to Account Page...')
//     await page.screenshot({ path: 'debug_before_account_page.png', fullPage: true })

//     console.log('⏳ Navigating to Account Page...')

//     // ✅ Click the "Account" link by triggering JavaScript instead of normal clicking
//     await page.evaluate(() => {
//       const accountLink = document.querySelector('a[href*=\'BxxxAccountInfo_sum\']')
//       if (accountLink)
//         accountLink.click()
//     })

//     console.log('⏳ Waiting for Account Page to load...')

//     // ✅ Wait for account summary text
//     await page.waitForFunction(() => {
//       return document.body.innerText.includes('Account Summary')
//     }, { timeout: 20000 })

//     console.log('✅ Successfully opened Account Page!')

//     // ✅ Wait 10 seconds before logout
//     console.log('⏳ Waiting 10 seconds before logging out...')
//     await new Promise(resolve => setTimeout(resolve, 10000))

//     console.log('🔍 Searching for logout button...')

//     const logoutButton = await page.waitForSelector('a[href*="MethodName=logout"]', { visible: true, timeout: 10000 })

//     console.log('🚪 Logging out...')
//     await logoutButton.click()

//     console.log('✅ Successfully logged out.')

//     await browser.close()

//     return true
//   }
//   catch (error) {
//     console.error('❌ Puppeteer login failed:', error)

//     return false
//   }
// }

async function loginWithPuppeteer(accessId, password) {
  console.log('🔵 Using Puppeteer for login...')
  try {
    const browser = await puppeteer.launch({ headless: false })
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

    let frame = page
    const iframeElement = await page.$('iframe')
    if (iframeElement) {
      console.log('✅ Found iframe, switching context...')
      frame = await iframeElement.contentFrame()
    }

    console.log('⏳ Waiting for username field...')
    await frame.waitForSelector('input[name="tempusername"]', { visible: true, timeout: 20000 })

    console.log('📝 Typing Username...')
    await typeLikeHuman(frame, 'input[name="tempusername"]', accessId)

    console.log('✅ Clicking Next Button...')
    await frame.waitForSelector('#NextBtn', { visible: true, timeout: 10000 })
    await frame.click('#NextBtn')

    console.log('⏳ Waiting for "Yes" radio button...')
    await frame.waitForSelector('input[name="passcred"][value="YES"]', { visible: true, timeout: 15000 })

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
    await frame.waitForSelector('#SubmitBtn', { visible: true, timeout: 30000 })
    await frame.click('#SubmitBtn')

    console.log('⏳ Waiting for dashboard to load...')
    await page.waitForSelector('.page-title', { visible: true, timeout: 15000 })

    console.log('✅ Login successful!')

    console.log('⏳ Taking a screenshot before navigating to Account Page...')
    await page.screenshot({ path: 'debug_before_account_page.png', fullPage: true })

    console.log('⏳ Navigating to Account Page...')

    // ✅ Click the "Account" link by triggering JavaScript instead of normal clicking
    await page.evaluate(() => {
      const accountLink = document.querySelector('a[href*=\'BxxxAccountInfo_sum\']')
      if (accountLink)
        accountLink.click()
    })

    console.log('⏳ Waiting for Account Page to load...')

    // ✅ Wait for account summary text
    // await page.waitForFunction(() => {
    //   return document.body.innerText.includes('Account Summary')
    // }, { timeout: 20000 })

    console.log('✅ Successfully opened Account Page!')

    // ✅ Navigate to Statement Page
    console.log('⏳ Navigating to Statement Page...')

    const statementSelector = 'a[href*="MethodName=formStatementDownload"]'

    await page.waitForSelector(statementSelector, { visible: true, timeout: 15000 })

    console.log('✅ Clicking Statement Page link...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    await page.click(statementSelector)

    console.log('⏳ Waiting for Statement Page to load...')
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })

    console.log('✅ Successfully opened Statement Page!')

    // ✅ Wait 10 seconds before logout
    console.log('⏳ Waiting 10 seconds before logging out...')
    await new Promise(resolve => setTimeout(resolve, 10000))

    console.log('🔍 Searching for logout button...')

    const logoutButton = await page.waitForSelector('a[href*="MethodName=logout"]', { visible: true, timeout: 10000 })

    console.log('🚪 Logging out...')
    await logoutButton.click()

    console.log('✅ Successfully logged out.')
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

    options.addArguments('--headless') // Change to false if you want to see the browser

    const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build()

    console.log(`🔍 Navigating to ${BANK_URL}`)
    await driver.get(BANK_URL)

    console.log('⏳ Extracting actual login URL...')
    await driver.sleep(3000) // Short sleep to allow DOM to load

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

    // Detect if iframe is present
    const iframes = await driver.findElements(By.tagName('iframe'))
    if (iframes.length > 0) {
      console.log('✅ Found iframe, switching to it...')
      await driver.switchTo().frame(iframes[0]) // Switch to the first iframe
    }

    console.log('⏳ Waiting for username field...')

    const usernameField = await driver.wait(until.elementLocated(By.name('tempusername')), 20000)

    console.log('📝 Typing Username...')
    for (const char of accessId) {
      await usernameField.sendKeys(char)
      await driver.sleep(Math.floor(Math.random() * 300) + 100) // Simulate human typing
    }

    console.log('✅ Clicking Next Button...')

    const nextButton = await driver.wait(until.elementLocated(By.id('NextBtn')), 10000)

    await nextButton.click()

    console.log('⏳ Waiting for "Yes" radio button...')
    await driver.wait(until.elementLocated(By.css('input[name="passcred"][value="YES"]')), 15000)

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
      await driver.sleep(Math.floor(Math.random() * 300) + 100) // Simulate human typing
    }

    console.log('✅ Clicking Login Button...')

    const loginButton = await driver.wait(until.elementLocated(By.id('SubmitBtn')), 10000)

    await loginButton.click()

    console.log('⏳ Checking if login is successful...')
    try {
      await driver.wait(until.elementLocated(By.id('new-ebank-container')), 8000)
      console.log('✅ Login successful with Selenium!')

      // ✅ Navigate to Account Page Before Logout
      console.log('⏳ Navigating to Account Page...')
      await driver.wait(until.elementLocated(By.xpath('//a[contains(@href, "BxxxAccountInfo_sum")]')), 15000)

      const accountPageLink = await driver.findElement(By.xpath('//a[contains(@href, "BxxxAccountInfo_sum")]'))

      await accountPageLink.click()

      console.log('⏳ Waiting for Account Page to load...')
      await driver.sleep(5000) // Allow time for page transition

      console.log('✅ Account Page loaded successfully!')

      // ✅ Wait 10 seconds before logging out
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
