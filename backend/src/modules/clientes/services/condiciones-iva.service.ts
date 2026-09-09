import { Inject, Injectable } from '@nestjs/common';
import {
  CONDICIONES_IVA_REPOSITORY,
  ICondicionesIvaRepository,
} from '../repositories/interfaces/condiciones-iva-repository.interface';

@Injectable()
export class CondicionesIvaService {
  constructor(
    @Inject(CONDICIONES_IVA_REPOSITORY)
    private readonly repository: ICondicionesIvaRepository,
  ) {}

  async findAll() {
    const condiciones = await this.repository.findAll();
    return condiciones.map((condicion) => ({
      idCondicionIva: condicion.idCondicionIva,
      codigo: condicion.codigo,
      nombre: condicion.nombre,
    }));
  }
}
