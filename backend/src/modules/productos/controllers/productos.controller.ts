import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Roles } from '../../../common/decorators/roles.decorator';
import { NombreRol } from '../../../common/enums/nombre-rol.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateProductoDto, QueryProductosDto, UpdateProductoDto } from '../dto/producto.dto';
import { ProductosService } from '../services/productos.service';

const UPLOADS_DEST = join(process.cwd(), 'uploads', 'productos');
if (!existsSync(UPLOADS_DEST)) {
  mkdirSync(UPLOADS_DEST, { recursive: true });
}

@Controller('productos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductosController {
  constructor(private readonly service: ProductosService) {}

  @Get()
  findAll(@Query() query: QueryProductosDto) { return this.service.findAll(query); }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  @Roles(NombreRol.ADMINISTRADOR)
  create(@Body() dto: CreateProductoDto) { return this.service.create(dto); }

  @Post('upload-foto')
  @Roles(NombreRol.ADMINISTRADOR)
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(UPLOADS_DEST)) mkdirSync(UPLOADS_DEST, { recursive: true });
          cb(null, UPLOADS_DEST);
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix = randomBytes(16).toString('hex');
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedMimes.includes(file.mimetype)) {
          return cb(new BadRequestException('Solo se admiten imágenes JPG, PNG, WebP o GIF.'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadFoto(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Debe proporcionar un archivo de imagen.');
    return { url: `/uploads/productos/${file.filename}` };
  }

  @Put(':id')
  @Roles(NombreRol.ADMINISTRADOR)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(NombreRol.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
