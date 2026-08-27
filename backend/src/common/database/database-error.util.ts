import { BadRequestException, ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

interface PostgresError {
  code?: string;
  detail?: string;
}

export function throwFriendlyDatabaseError(error: unknown): never {
  if (error instanceof QueryFailedError) {
    const driverError = error.driverError as PostgresError;
    if (driverError.code === '23505') {
      throw new ConflictException('Ya existe un registro con esos datos.');
    }
    if (driverError.code === '23503') {
      throw new ConflictException('El registro está relacionado con otros datos y no puede modificarse.');
    }
    if (driverError.code === '23514') {
      throw new BadRequestException('Los valores ingresados no cumplen las reglas del negocio.');
    }
  }
  throw error;
}
