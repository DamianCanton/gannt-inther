import { test, expect } from '@playwright/test'

test.describe('gantt smoke', () => {
  test('open obra, select task, edit intent, open print', async ({ page }) => {
    await page.goto('/obras')

    const firstObra = page.locator('a[href^="/obra/"]').first()
    await firstObra.click()

    await expect(page.getByText('Editor de tarea')).toBeVisible()
    await page.getByRole('button', { name: 'Estructura' }).first().click()
    await expect(page.getByText('Estructura ·')).toBeVisible()

    await page.getByLabel('Tarea').selectOption({ index: 1 })
    await page.getByLabel('Duración (días hábiles)').fill('4')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(page.getByText('Cronograma')).toBeVisible()

    await page.goto(`${page.url()}/print`)
    await expect(page.locator('table.print-gantt-table')).toBeVisible()
  })
})
