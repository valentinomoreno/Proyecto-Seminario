export interface Categoria {
  idCategoria: number;
  nombre: string;
  descripcion?: string | null;
}

export interface Marca {
  idMarca: number;
  nombre: string;
}

export interface Deposito {
  idDeposito: number;
  nombre: string;
  direccion?: string | null;
}

export interface Sector {
  idSector: number;
  nombre: string;
  deposito: Deposito;
}

export interface Estante {
  idEstante: number;
  codigo: string;
  descripcion?: string | null;
  sector: Sector;
}

export interface Producto {
  idProducto: number;
  sku: string;
  nombre: string;
  descripcion: string;
  stock: number;
  precioUnitario: number;
  costo: number | null;
  categoria: Categoria;
  marca: Marca;
  ubicacion: {
    deposito: Deposito;
    sector: Pick<Sector, 'idSector' | 'nombre'>;
    estante: Pick<Estante, 'idEstante' | 'codigo'>;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface ProductoPayload {
  sku: string;
  nombre: string;
  descripcion: string;
  stock: number;
  precioUnitario: number;
  costo: number | null;
  categoriaId: number;
  marcaId: number;
  estanteId: number;
}
