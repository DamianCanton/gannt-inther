import { expect, test } from '@playwright/test'

test('login -> /obras -> /obra/[id] -> /obra/[id]/print happy path', async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL
  const password = process.env.E2E_USER_PASSWORD
  const obraId = process.env.E2E_OBRA_ID

  test.skip(!email || !password || !obraId, 'Missing E2E_USER_EMAIL, E2E_USER_PASSWORD or E2E_OBRA_ID')

  await page.goto('/auth/login')

  await page.getByLabel('Email').fill(email!)
  await page.getByLabel('Contraseña').fill(password!)
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page).toHaveURL(/\/obras$/)

  await page.goto(`/obra/${obraId!}`)
  await expect(page).toHaveURL(new RegExp(`/obra/${obraId!}$`))

  const exportLink = page.getByRole('link', { name: 'Exportar PDF/Imprimir' })
  await expect(exportLink).toBeVisible()
  await expect(exportLink).toHaveAttribute('href', `/obra/${obraId!}/print`)

  await page.context().addInitScript(() => {
    ;(window as Window & { __printCalls?: number }).__printCalls = 0
    window.print = () => {
      ;(window as Window & { __printCalls?: number }).__printCalls =
        ((window as Window & { __printCalls?: number }).__printCalls ?? 0) + 1
    }
  })

  const [printPage] = await Promise.all([
    page.context().waitForEvent('page'),
    exportLink.click(),
  ])

  await printPage.waitForLoadState()
  await expect(printPage).toHaveURL(new RegExp(`/obra/${obraId!}/print$`))
  await expect(printPage.getByText('Escala:')).toBeVisible()
  await expect(
    printPage.getByText(/El PDF ya no depende de la impresión del navegador\./)
  ).toBeVisible()

  await expect
    .poll(async () => printPage.evaluate(() => (window as Window & { __printCalls?: number }).__printCalls ?? 0))
    .toBe(0)

  await expect(printPage.getByTestId('print-format-contract')).toHaveAttribute('data-print-format', 'auto-fit')
  await expect(printPage.getByTestId('print-format-contract')).toHaveAttribute('data-pagination-safe', 'false')

  await printPage.getByRole('button', { name: /Exportar/ }).click()
  const manualPrintButton = printPage.getByRole('button', { name: 'Impresión nativa (compatibilidad)' })
  await manualPrintButton.click()

  await expect
    .poll(async () => printPage.evaluate(() => (window as Window & { __printCalls?: number }).__printCalls ?? 0))
    .toBe(1)
})
