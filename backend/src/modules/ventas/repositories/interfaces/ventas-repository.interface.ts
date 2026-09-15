import { QueryVentasDto } from '../../dto/query-ventas.dto';
import { Venta } from '../../entities/venta.entity';
import { MetodoCobro } from '../../enums/metodo-cobro.enum';
import { ModalidadPago } from '../../enums/modalidad-pago.enum';

export const VENTAS_REPOSITORY = Symbol('VENTAS_REPOSITORY');

export interface IRegistroVentaDatos {
  idUsuario: number;
  idCliente: number;
  modalidadPago: ModalidadPago;
  metodoCobro?: MetodoCobro;
  referenciaPago?: string;
  items: Array<{
    idProducto: number;
    cantidad: number;
  }>;
}

export interface IVentasRepository {
  findAndCount(query: QueryVentasDto): Promise<[Venta[], number]>;
  findById(id: number): Promise<Venta | null>;
  registrarVentaTransaccional(datos: IRegistroVentaDatos): Promise<Venta>;
}
