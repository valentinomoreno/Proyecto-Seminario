import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CLIENTES_REPOSITORY,
  IClientesRepository,
} from '../../clientes/repositories/interfaces/clientes-repository.interface';
import { CreateVentaDto } from '../dto/create-venta.dto';
import { QueryVentasDto } from '../dto/query-ventas.dto';
import { Venta } from '../entities/venta.entity';
import { ModalidadPago } from '../enums/modalidad-pago.enum';
import {
  IVentasRepository,
  VENTAS_REPOSITORY,
} from '../repositories/interfaces/ventas-repository.interface';

@Injectable()
export class VentasService {
  constructor(
    @Inject(VENTAS_REPOSITORY)
    private readonly repository: IVentasRepository,
    @Inject(CLIENTES_REPOSITORY)
    private readonly clientesRepository: IClientesRepository,
  ) {}

  async findAll(query: QueryVentasDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const [ventas, total] = await this.repository.findAndCount(query);

    return {
      data: ventas,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<Venta> {
    const venta = await this.repository.findById(id);
    if (!venta) {
      throw new NotFoundException(`Venta #${id} no encontrada.`);
    }
    return venta;
  }

  async registrarVenta(idUsuario: number, dto: CreateVentaDto): Promise<Venta> {
    const cliente = await this.clientesRepository.findById(dto.idCliente);
    if (!cliente) {
      throw new NotFoundException(`El cliente con ID ${dto.idCliente} no existe.`);
    }

    if (dto.modalidadPago === ModalidadPago.CUENTA_CORRIENTE) {
      if (!cliente.cuentaCorrienteHabilitada) {
        throw new BadRequestException(
          'El cliente seleccionado no tiene cuenta corriente habilitada.',
        );
      }
    }

    if (dto.modalidadPago === ModalidadPago.CONTADO && !dto.metodoCobro) {
      throw new BadRequestException(
        'Debe especificar un método de cobro para ventas de contado.',
      );
    }

    return this.repository.registrarVentaTransaccional({
      idUsuario,
      idCliente: cliente.idCliente,
      condicionIva: cliente.condicionIva,
      cuentaCorrienteHabilitada: cliente.cuentaCorrienteHabilitada,
      limiteCredito: Number(cliente.limiteCredito) || 0,
      modalidadPago: dto.modalidadPago,
      metodoCobro: dto.metodoCobro,
      referenciaPago: dto.referenciaPago,
      items: dto.items,
    });
  }
}
