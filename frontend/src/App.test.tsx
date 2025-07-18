import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the main heading', () => {
    render(<App />)
    const heading = screen.getByRole('heading', { name: /AI TRPG Platform/i })
    expect(heading).toBeInTheDocument()
  })

  it('renders the create session button', () => {
    render(<App />)
    const button = screen.getByRole('button', { name: /Create Session/i })
    expect(button).toBeInTheDocument()
  })

  it('renders the action input form', () => {
    render(<App />)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeInTheDocument()
  })
})