import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryVentasDto } from '../dto/venta.dto';
import { Venta } from '../entities/venta.entity';
import { IVentasRepository } from './interfaces/ventas-repository.interface';

const RELACIONES_COMPLETAS = {
  cliente: { persona: true, empresa: true },
  empleado: { persona: true },
  detalles: { producto: true },
} as const;

@Injectable()
export class TypeOrmVentasRepository implements IVentasRepository {
  constructor(
    @InjectRepository(Venta)
    private readonly ormRepository: Repository<Venta>,
  ) {}

  async findAndCount(query: QueryVentasDto): Promise<[Venta[], number]> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const builder = this.ormRepository
      .createQueryBuilder('venta')
      .leftJoinAndSelect('venta.cliente', 'cliente')
      .leftJoinAndSelect('cliente.persona', 'clientePersona')
      .leftJoinAndSelect('cliente.empresa', 'clienteEmpresa')
      .leftJoinAndSelect('venta.empleado', 'empleado')
      .leftJoinAndSelect('empleado.persona', 'persona')
      .leftJoinAndSelect('venta.detalles', 'detalles')
      .leftJoinAndSelect('detalles.producto', 'producto')
      .orderBy('venta.idVenta', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const comprobante = query.comprobante?.trim();
    if (comprobante) {
      builder.andWhere('venta.numeroComprobante ILIKE :comprobante', { comprobante: `%${comprobante}%` });
    }
    if (query.idCliente !== undefined) {
      builder.andWhere('cliente.idCliente = :idCliente', { idCliente: query.idCliente });
    }

    return builder.getManyAndCount();
  }

  async findById(id: number): Promise<Venta | null> {
    return this.ormRepository.findOne({
      where: { idVenta: id },
      relations: RELACIONES_COMPLETAS,
    });
  }

  async findByNumeroComprobante(numeroComprobante: string): Promise<Venta | null> {
    return this.ormRepository.findOne({
      where: { numeroComprobante },
      relations: RELACIONES_COMPLETAS,
    });
  }
}
