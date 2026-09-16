import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { Persona } from '../../usuarios/entities/persona.entity';
import { CuentaCorriente } from '../../cuentas-corrientes/entities/cuenta-corriente.entity';
import { CreateClienteEmpresaDto, CreateClientePersonaDto, QueryClientesDto } from '../dto/cliente.dto';
import { ClienteEmpresa } from '../entities/cliente-empresa.entity';
import { ClientePersona } from '../entities/cliente-persona.entity';
import { Cliente, TipoCliente } from '../entities/cliente.entity';
import { CondicionIva } from '../entities/condicion-iva.entity';
import { IClientesRepository } from './interfaces/clientes-repository.interface';

@Injectable()
export class TypeOrmClientesRepository implements IClientesRepository {
  constructor(
    @InjectRepository(Cliente)
    private readonly ormRepository: Repository<Cliente>,
    @InjectRepository(ClientePersona)
    private readonly personasRepository: Repository<ClientePersona>,
    @InjectRepository(ClienteEmpresa)
    private readonly empresasRepository: Repository<ClienteEmpresa>,
    private readonly dataSource: DataSource,
  ) {}

  async findAndCount(query: QueryClientesDto): Promise<[Cliente[], number]> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const builder = this.ormRepository
      .createQueryBuilder('cliente')
      .leftJoinAndSelect('cliente.condicionIva', 'condicionIva')
      .leftJoinAndSelect('cliente.persona', 'persona')
      .leftJoinAndSelect('cliente.empresa', 'empresa')
      .leftJoinAndSelect('cliente.cuentaCorriente', 'cuentaCorriente')
      .orderBy('cliente.idCliente', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const buscar = query.buscar?.trim();
    if (buscar) {
      const documento = buscar.replace(/[.\s-]/g, '');
      builder.andWhere(
        new Brackets((where) => {
          where
            .where('persona.dni ILIKE :documento', { documento: `%${documento}%` })
            .orWhere('persona.cuil ILIKE :documento', { documento: `%${documento}%` })
            .orWhere('empresa.cuit ILIKE :documento', { documento: `%${documento}%` })
            .orWhere('persona.nombre ILIKE :buscar', { buscar: `%${buscar}%` })
            .orWhere('persona.apellido ILIKE :buscar', { buscar: `%${buscar}%` })
            .orWhere('empresa.razonSocial ILIKE :buscar', { buscar: `%${buscar}%` });
        }),
      );
    }

    return builder.getManyAndCount();
  }

  async findById(id: number): Promise<Cliente | null> {
    return this.ormRepository
      .createQueryBuilder('cliente')
      .leftJoinAndSelect('cliente.condicionIva', 'condicionIva')
      .leftJoinAndSelect('cliente.persona', 'persona')
      .leftJoinAndSelect('cliente.empresa', 'empresa')
      .leftJoinAndSelect('cliente.cuentaCorriente', 'cuentaCorriente')
      .where('cliente.idCliente = :id', { id })
      .getOne();
  }

  async existsPersonaByDni(dni: string): Promise<boolean> {
    return this.personasRepository.exists({ where: { dni } });
  }

  async existsPersonaByCuil(cuil: string): Promise<boolean> {
    return this.personasRepository.exists({ where: { cuil } });
  }

  async existsEmpresaByCuit(cuit: string): Promise<boolean> {
    return this.empresasRepository.exists({ where: { cuit } });
  }

  async createPersona(dto: CreateClientePersonaDto, condicionIva: CondicionIva): Promise<Cliente> {
    const clienteId = await this.dataSource.transaction(async (manager) => {
      const personasRepository = manager.getRepository(Persona);
      let personaRegistro = await personasRepository.findOne({
        where: { dni: dto.dni, cuil: dto.cuil },
      });
      if (!personaRegistro) {
        personaRegistro = await personasRepository.save(personasRepository.create({
          nombre: dto.nombre.trim(),
          apellido: dto.apellido.trim(),
          dni: dto.dni,
          cuil: dto.cuil,
        }));
      }
      const cliente = await manager.getRepository(Cliente).save(manager.getRepository(Cliente).create({
        tipo: TipoCliente.PERSONA,
        telefono: dto.telefono ?? null,
        correo: dto.correo ?? null,
        direccion: dto.direccion ?? null,
        condicionIva,
      }));
      await manager.getRepository(ClientePersona).save(manager.getRepository(ClientePersona).create({
        nombre: dto.nombre.trim(),
        apellido: dto.apellido.trim(),
        dni: dto.dni,
        cuil: dto.cuil,
        cliente,
        personaRegistro,
      }));
      if (dto.cuentaCorrienteHabilitada) {
        await this.createCuentaCorriente(manager, cliente, dto.limiteCredito ?? 0);
      }
      return cliente.idCliente;
    });

    const cliente = await this.findById(clienteId);
    if (!cliente) throw new Error('No se pudo recuperar el cliente particular creado.');
    return cliente;
  }

  async createEmpresa(dto: CreateClienteEmpresaDto, condicionIva: CondicionIva): Promise<Cliente> {
    const clienteId = await this.dataSource.transaction(async (manager) => {
      const cliente = await manager.getRepository(Cliente).save(manager.getRepository(Cliente).create({
        tipo: TipoCliente.EMPRESA,
        telefono: dto.telefono ?? null,
        correo: dto.correo ?? null,
        direccion: dto.direccion ?? null,
        condicionIva,
      }));
      await manager.getRepository(ClienteEmpresa).save(manager.getRepository(ClienteEmpresa).create({
        cuit: dto.cuit,
        razonSocial: dto.razonSocial.trim(),
        personaContacto: dto.personaContacto.trim(),
        cliente,
      }));
      if (dto.cuentaCorrienteHabilitada) {
        await this.createCuentaCorriente(manager, cliente, dto.limiteCredito ?? 0);
      }
      return cliente.idCliente;
    });

    const cliente = await this.findById(clienteId);
    if (!cliente) throw new Error('No se pudo recuperar el cliente empresa creado.');
    return cliente;
  }

  async save(cliente: Cliente): Promise<Cliente> {
    return this.ormRepository.save(cliente);
  }

  async softRemove(cliente: Cliente): Promise<Cliente> {
    return this.ormRepository.softRemove(cliente);
  }

  private async createCuentaCorriente(
    manager: import('typeorm').EntityManager,
    cliente: Cliente,
    limiteCredito: number,
  ): Promise<void> {
    const result = await manager.query<Array<{ nextval: string }>>(
      "SELECT nextval('cuenta_corriente_numero_seq') AS nextval",
    );
    const numeroCuenta = `CC-${String(result[0]?.nextval ?? '1').padStart(6, '0')}`;
    await manager.getRepository(CuentaCorriente).save(manager.getRepository(CuentaCorriente).create({
      numeroCuenta,
      saldo: 0,
      saldoFavor: 0,
      limiteCredito,
      activa: true,
      fechaBaja: null,
      cliente,
    }));
  }
}
