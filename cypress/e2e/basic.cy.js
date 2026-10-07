describe('Arena', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
  })

  it('visar översikten med nyckeltal', () => {
    cy.visit('/')
    cy.get('h1').contains('Översikt')
    cy.contains('Aktiva medlemmar')
  })

  it('checkar in en medlem med medlemsnummer', () => {
    cy.visit('/incheckning')
    cy.get('#checkin-input').type('1002{enter}')
    cy.contains(/Välkommen|redan incheckad/)
  })

  it('registrerar en ny medlem', () => {
    cy.visit('/medlemmar')
    cy.contains('+ Ny medlem').click()
    cy.get('.modal input').first().type('Test')
    cy.get('.modal input').eq(1).type('Testsson')
    cy.contains('button', 'Spara').click()
    cy.contains('Test Testsson')
  })
})
