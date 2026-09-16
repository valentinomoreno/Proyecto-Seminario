import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmActionModal } from './ConfirmActionModal';

describe('ConfirmActionModal', () => {
  it('exige una segunda acción explícita antes de confirmar', async () => {
    const confirmar = vi.fn();
    const cancelar = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmActionModal
        open
        title="¿Confirmar operación?"
        message="La acción modificará datos."
        confirmLabel="Sí, confirmar"
        onConfirm={confirmar}
        onCancel={cancelar}
      />,
    );

    expect(confirmar).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Sí, confirmar' }));
    expect(confirmar).toHaveBeenCalledTimes(1);
  });
});
