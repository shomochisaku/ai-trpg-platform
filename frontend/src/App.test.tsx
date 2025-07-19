import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the main heading', () => {
    render(<App />)
    const heading = screen.getByRole('heading', { name: /AI TRPG Platform/i })
    expect(heading).toBeInTheDocument()
  })

  it('renders the sample message button', () => {
    render(<App />)
    const button = screen.getByRole('button', { name: /Add Sample Message/i })
    expect(button).toBeInTheDocument()
  })
})