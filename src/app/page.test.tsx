import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Page from './page'

describe('Page', () => {
    it('renders a Next.js initial page content loosely', () => {
        const { container } = render(<Page />)
        expect(container).toBeInTheDocument()
    })
})
