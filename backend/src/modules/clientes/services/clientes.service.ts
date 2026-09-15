import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { throwFriendlyDatabaseError } from '../../../common/database/database-error.util';
import { CreateClienteDto } from '../dto/create-cliente.dto';
import { QueryClientesDto } from '../dto/query-clientes.dto';
import { Cliente } from '../entities/cliente.entity';
import {
  CLIENTES_REPOSITORY,
  IClientesRepository,
} from '../repositories/interfaces/clientes-repository.interface';

@Injectable()
export class ClientesService {
  constructor(
    @Inject(CLIENTES_REPOSITORY)
    private readonly repository: IClientesRepository,
  ) {}

  async findAll(query: QueryClientesDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const [clientes, total] = await this.repository.findAndCount(query);

    return {
      data: clientes,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<Cliente> {
    const cliente = await this.repository.findById(id);
    if (!cliente) {
      throw new NotFoundException(`Cliente #${id} no encontrado.`);
    }
    return cliente;
  }

  async create(dto: CreateClienteDto): Promise<Cliente> {
    const dni = dto.dni.trim();
    const cuil = dto.cuil.trim();

    const existingCliente = await this.repository.findByDniOrCuil(dni, cuil);
    if (existingCliente) {
      throw new ConflictException('Ya existe un cliente registrado con ese DNI o CUIL.');
    }

    try {
      let persona = await this.repository.findPersonaByDniOrCuil(dni, cuil);
      if (!persona) {
        persona = this.repository.createPersona({
          nombre: dto.nombre.trim(),
          apellido: dto.apellido.trim(),
          dni,
          cuil,
        });
        persona = await this.repository.savePersona(persona);
      }

      const tieneCuentaCorriente = Boolean(dto.cuentaCorrienteHabilitada);
      const limiteCredito = dto.limiteCredito ?? 0;

      const cliente = this.repository.create({
        condicionIva: dto.condicionIva,
        cuentaCorrienteHabilitada: tieneCuentaCorriente,
        limiteCredito,
        persona,
      });

      const savedCliente = await this.repository.save(cliente);

      if (tieneCuentaCorriente) {
        const cuentaCorriente = this.repository.createCuentaCorriente({
          cliente: savedCliente,
          saldo: 0,
          limiteCredito,
          activo: true,
        });
        savedCliente.cuentaCorriente = await this.repository.saveCuentaCorriente(cuentaCorriente);
      }

      return savedCliente;
    } catch (error) {
      throwFriendlyDatabaseError(error);
    }
  }
}
