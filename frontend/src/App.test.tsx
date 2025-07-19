import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the main heading', () => {
    render(<App />)
    const heading = screen.getByRole('heading', { name: /AI TRPG Platform/i })
    expect(heading).toBeInTheDocument()
  })

  it('renders the action input form', () => {
    render(<App />)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeInTheDocument()
  })
})