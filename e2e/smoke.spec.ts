import { test, expect, type BrowserContext, type Page } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8080'
const LOGIN = `e2e_${Date.now()}`
const PASSWORD = 'password123'

const NO_DUE_DATE_TITLE = 'Без срока'
const HTTP_TITLE = 'Задача без randomUUID'
const HTTP_TITLE_EDITED = 'Задача без randomUUID (изменено)'

let context: BrowserContext
let page: Page

// The scenarios are one flow: they share the registered session and run in order.
test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext({ baseURL })
  page = await context.newPage()
})

test.afterAll(async () => {
  await context.close()
})

test('1. register and land on the dashboard', async () => {
  await page.goto('/register')
  await page.getByLabel('Логин', { exact: true }).fill(LOGIN)
  await page.getByLabel('Пароль', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Повторите пароль', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Привет!' })).toBeVisible()
})

test('2. create a task with no due date and see it in the list', async () => {
  await page.goto('/tasks')
  await page.getByRole('button', { name: 'Добавить задачу' }).click()

  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Название', { exact: true }).fill(NO_DUE_DATE_TITLE)
  await dialog.getByRole('button', { name: 'Сохранить' }).click()

  await expect(page.getByText(NO_DUE_DATE_TITLE, { exact: true })).toBeVisible()
})

test('3. create and edit a task without crypto.randomUUID', async () => {
  // Simulate a plain-HTTP origin, where crypto.randomUUID is unavailable.
  await page.addInitScript(() => {
    Object.defineProperty(window.crypto, 'randomUUID', { value: undefined, configurable: true })
  })
  await page.reload()
  expect(await page.evaluate(() => typeof crypto.randomUUID === 'function')).toBe(false)

  await page.goto('/tasks')
  await page.getByRole('button', { name: 'Добавить задачу' }).click()
  await page.getByRole('dialog').getByLabel('Название', { exact: true }).fill(HTTP_TITLE)
  await page.getByRole('dialog').getByRole('button', { name: 'Сохранить' }).click()
  await expect(page.getByText(HTTP_TITLE, { exact: true })).toBeVisible()

  const row = page.locator('li').filter({ hasText: HTTP_TITLE })
  await row.getByRole('button', { name: 'Редактировать' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Название', { exact: true }).fill(HTTP_TITLE_EDITED)
  await dialog.getByRole('button', { name: 'Сохранить' }).click()

  await page.reload()
  await expect(page.getByText(HTTP_TITLE_EDITED, { exact: true })).toBeVisible()
})

test('4. log out and back in, the tasks persist', async () => {
  await page.goto('/tasks')
  await page.locator('aside').getByRole('button', { name: 'Выйти' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible()

  await page.getByLabel('Логин', { exact: true }).fill(LOGIN)
  await page.getByLabel('Пароль', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page).toHaveURL(/\/$/)

  await page.goto('/tasks')
  await expect(page.getByText(NO_DUE_DATE_TITLE, { exact: true })).toBeVisible()
  await expect(page.getByText(HTTP_TITLE_EDITED, { exact: true })).toBeVisible()
})

test('5. an expired session returns to login with a toast', async () => {
  // Still "logged in" in the UI from scenario 4; drop the server session.
  await context.clearCookies()
  await page.getByRole('button', { name: 'Добавить задачу' }).click()
  await page.getByRole('dialog').getByLabel('Название', { exact: true }).fill('Задача с истёкшей сессией')
  await page.getByRole('dialog').getByRole('button', { name: 'Сохранить' }).click()

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('alert')).toHaveText('Сессия истекла, войдите снова')
})
