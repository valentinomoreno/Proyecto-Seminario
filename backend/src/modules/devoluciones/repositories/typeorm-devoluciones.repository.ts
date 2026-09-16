import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { QueryDevolucionesDto } from '../dto/devolucion.dto';
import { Devolucion } from '../entities/devolucion.entity';
import { IDevolucionesRepository } from './interfaces/devoluciones-repository.interface';

@Injectable()
export class TypeOrmDevolucionesRepository implements IDevolucionesRepository {
  constructor(
    @InjectRepository(Devolucion)
    private readonly ormRepository: Repository<Devolucion>,
  ) {}

  async findAndCount(query: QueryDevolucionesDto): Promise<[Devolucion[], number]> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);

    const builder = this.baseQuery()
      .orderBy('devolucion.idDevolucion', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.clienteId) {
      builder.andWhere('cliente.idCliente = :clienteId', { clienteId: query.clienteId });
    }

    const buscar = query.buscar?.trim();
    if (buscar) {
      const documento = buscar.replace(/[.\s-]/g, '');
      builder.andWhere(new Brackets((where) => {
        where
          .where('venta.numeroVenta ILIKE :buscar', { buscar: `%${buscar}%` })
          .orWhere('notaCredito.numero ILIKE :buscar', { buscar: `%${buscar}%` })
          .orWhere('producto.sku ILIKE :buscar', { buscar: `%${buscar}%` })
          .orWhere('producto.nombre ILIKE :buscar', { buscar: `%${buscar}%` })
          .orWhere('persona.nombre ILIKE :buscar', { buscar: `%${buscar}%` })
          .orWhere('persona.apellido ILIKE :buscar', { buscar: `%${buscar}%` })
          .orWhere('empresa.razonSocial ILIKE :buscar', { buscar: `%${buscar}%` })
          .orWhere('persona.dni ILIKE :documento', { documento: `%${documento}%` })
          .orWhere('persona.cuil ILIKE :documento', { documento: `%${documento}%` })
          .orWhere('empresa.cuit ILIKE :documento', { documento: `%${documento}%` });
      }));
    }

    return builder.getManyAndCount();
  }

  async findById(id: number): Promise<Devolucion | null> {
    return this.baseQuery()
      .where('devolucion.idDevolucion = :id', { id })
      .getOne();
  }

  private baseQuery() {
    return this.ormRepository
      .createQueryBuilder('devolucion')
      .innerJoinAndSelect('devolucion.detalleVenta', 'detalleVenta')
      .innerJoinAndSelect('detalleVenta.venta', 'venta')
      .innerJoinAndSelect('venta.cliente', 'cliente')
      .leftJoinAndSelect('cliente.persona', 'persona')
      .leftJoinAndSelect('cliente.empresa', 'empresa')
      .innerJoinAndSelect('detalleVenta.producto', 'producto')
      .innerJoinAndSelect('devolucion.empleadoAutoriza', 'empleadoAutoriza')
      .leftJoinAndSelect('empleadoAutoriza.persona', 'empleadoPersona')
      .leftJoinAndSelect('devolucion.notaCredito', 'notaCredito');
  }
}
