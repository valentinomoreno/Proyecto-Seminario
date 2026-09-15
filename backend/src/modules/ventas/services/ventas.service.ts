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
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number): Promise<Venta> {
    const venta = await this.repository.findById(id);
    if (!venta) throw new NotFoundException(`Venta #${id} no encontrada.`);
    return venta;
  }

  async registrarVenta(idUsuario: number, dto: CreateVentaDto): Promise<Venta> {
    const cliente = await this.clientesRepository.findById(dto.idCliente);
    if (!cliente) {
      throw new NotFoundException(`El cliente con ID ${dto.idCliente} no existe.`);
    }

    if (dto.modalidadPago === ModalidadPago.CUENTA_CORRIENTE) {
      if (!cliente.cuentaCorriente?.activa) {
        throw new BadRequestException(
          'El cliente seleccionado no tiene una cuenta corriente activa.',
        );
      }
      if (dto.metodoCobro || dto.referenciaPago) {
        throw new BadRequestException(
          'Una venta a cuenta corriente no debe incluir datos de cobro.',
        );
      }
    }

    if (dto.modalidadPago === ModalidadPago.CONTADO && !dto.metodoCobro) {
      throw new BadRequestException(
        'Debe especificar un método de cobro para ventas de contado.',
      );
    }

    const ids = dto.items.map((item) => item.idProducto);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'Cada producto debe aparecer una sola vez en la venta.',
      );
    }

    return this.repository.registrarVentaTransaccional({
      idUsuario,
      idCliente: cliente.idCliente,
      modalidadPago: dto.modalidadPago,
      metodoCobro: dto.metodoCobro,
      referenciaPago: dto.referenciaPago?.trim() || undefined,
      items: dto.items,
    });
  }
}
