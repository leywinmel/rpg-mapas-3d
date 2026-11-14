// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MODEL_CREDITS } from '../credits';
import CreditsPage from './CreditsPage';

function renderPage() {
  render(
    <MemoryRouter>
      <CreditsPage />
    </MemoryRouter>,
  );
}

describe('CreditsPage', () => {
  it('shouldCreditEveryModelPackWithAuthorAndLicense', () => {
    renderPage();
    for (const credit of MODEL_CREDITS) {
      expect(screen.getByRole('link', { name: new RegExp(credit.work) })).toHaveAttribute(
        'href',
        credit.url,
      );
    }
    expect(screen.getAllByText(/por Quaternius/)).toHaveLength(5);
    expect(screen.getByText(/por Kenney/)).toBeInTheDocument();
    expect(screen.getByText(/por papptimus/)).toBeInTheDocument();
    expect(screen.getByText(/CC BY 4.0/)).toBeInTheDocument();
  });

  it('shouldOpenOutsideLinksSafelyInAnotherTab', () => {
    renderPage();
    const outside = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('http'));
    expect(outside.length).toBeGreaterThan(0);
    for (const link of outside) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });
});
