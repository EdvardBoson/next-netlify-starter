describe('Styrkeloggen', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.visit('/')
  })

  it('displays the app title', () => {
    cy.get('h1').contains('Styrkeloggen')
  })

  it('renders the Netlify logo image', () => {
    cy.get('footer img')
      .should('be.visible')
      .and(($img) => {
        expect($img[0].naturalWidth).to.be.greaterThan(0)
      })
  })

  it('logs a workout and shows it in history and records', () => {
    cy.contains('button', 'Nytt pass').click()
    cy.get('input[placeholder^="t.ex. Ben"]').type('Ben')
    cy.get('input[aria-label="Namn på övning 1"]').type('Knäböj')
    cy.get('input[aria-label="Vikt set 1"]').type('100')
    cy.get('input[aria-label="Reps set 1"]').type('5')
    cy.contains('button', 'Lägg till set').click()
    cy.get('input[aria-label="Vikt set 2"]').should('have.value', '100')
    cy.contains('button', 'Spara pass').click()

    cy.contains('Historik (1)')
    cy.contains('.workout', 'Knäböj')
    cy.contains('.workout', '2 set')

    cy.reload()
    cy.contains('Historik (1)')

    cy.contains('button', 'Personbästa').click()
    cy.contains('.records td', 'Knäböj')
    cy.contains('.records td', '116,7 kg')
  })
})
