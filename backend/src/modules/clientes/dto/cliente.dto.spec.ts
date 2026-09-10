import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateClienteEmpresaDto, CreateClientePersonaDto, UpdateClienteDto } from './cliente.dto';

describe('DTOs de clientes', () => {
  it('normaliza y acepta DNI y CUIL válidos para una persona', async () => {
    const dto = plainToInstance(CreateClientePersonaDto, {
      nombre: 'Ana',
      apellido: 'Pérez',
      dni: '12.345.678',
      cuil: '20-12345678-6',
      condicionIvaId: 1,
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.dni).toBe('12345678');
    expect(dto.cuil).toBe('20123456786');
  });

  it('rechaza un CUIL con dígito verificador inválido', async () => {
    const dto = plainToInstance(CreateClientePersonaDto, {
      nombre: 'Ana',
      apellido: 'Pérez',
      dni: '12345678',
      cuil: '20-12345678-0',
      condicionIvaId: 1,
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toContain('cuil');
  });

  it('acepta un CUIT empresarial válido y rechaza correo inválido', async () => {
    const dto = plainToInstance(CreateClienteEmpresaDto, {
      cuit: '30-12345678-1',
      razonSocial: 'Repuestos Centro SRL',
      personaContacto: 'Juan Gómez',
      condicionIvaId: 3,
      correo: 'correo-invalido',
    });

    const errors = await validate(dto);
    expect(dto.cuit).toBe('30123456781');
    expect(errors.map((error) => error.property)).toContain('correo');
  });

  it('no admite modificar datos fiscales mediante el DTO de contacto', async () => {
    const dto = plainToInstance(UpdateClienteDto, { telefono: '3515550000', cuit: '30123456781' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.map((error) => error.property)).toContain('cuit');
  });
});
