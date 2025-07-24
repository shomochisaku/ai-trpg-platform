import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the main heading', () => {
    render(<App />)
    const heading = screen.getByRole('heading', { name: /AI TRPG Platform/i })
    expect(heading).toBeInTheDocument()
  })

  it('renders the create campaign button', () => {
    render(<App />)
    const button = screen.getByRole('button', { name: /詳細設定でキャンペーン作成/i })
    expect(button).toBeInTheDocument()
  })

  it('renders the join campaign button', () => {
    render(<App />)
    const button = screen.getByRole('button', { name: /Join Campaign/i })
    expect(button).toBeInTheDocument()
  })

  it('renders the action input form', () => {
    render(<App />)
    const textarea = screen.getByPlaceholderText(/Describe what you want to do in the game/i)
    expect(textarea).toBeInTheDocument()
  })
})