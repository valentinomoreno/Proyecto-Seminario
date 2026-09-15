import { esIdentificadorFiscalArgentinoValido, normalizarDocumento } from './documento.util';

describe('documento.util', () => {
  it('elimina puntos, espacios y guiones', () => {
    expect(normalizarDocumento('20-12.345.678  -6')).toBe('20123456786');
  });

  it('valida el dígito verificador argentino', () => {
    expect(esIdentificadorFiscalArgentinoValido('20123456786')).toBe(true);
    expect(esIdentificadorFiscalArgentinoValido('30123456781')).toBe(true);
    expect(esIdentificadorFiscalArgentinoValido('30123456780')).toBe(false);
    expect(esIdentificadorFiscalArgentinoValido('123')).toBe(false);
  });
});
