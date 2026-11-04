// @vitest-environment jsdom
import { isModalDialogOpen } from './useTablePointer';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('isModalDialogOpen', () => {
  it('shouldBeFalseWithoutAnOpenDialog', () => {
    document.body.innerHTML = '<dialog></dialog>';
    expect(isModalDialogOpen()).toBe(false);
  });

  it('shouldBeTrueWhileADialogIsOpen', () => {
    document.body.innerHTML = '<dialog open></dialog>';
    expect(isModalDialogOpen()).toBe(true);
  });
});
