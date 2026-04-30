import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../autenticacion/guards';
import { CatalogService } from '../services';
import { CreateProductoDto, UpdateProductoDto, CatalogQueryDto } from '../dto';

@ApiTags('Catálogo')
@ApiBearerAuth()
@Controller('catalog')
@UseGuards(JwtAuthGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('products')
  @ApiOperation({ summary: 'Listar productos del catálogo' })
  async getProducts(@Req() req: any, @Query() query: CatalogQueryDto) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.catalogService.findAllProducts(empresaId, query);
  }

  @Get('products/:slug')
  @ApiOperation({ summary: 'Obtener detalle de producto por slug' })
  async getProductBySlug(@Req() req: any, @Param('slug') slug: string) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.catalogService.findProductBySlug(slug, empresaId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Listar categorías' })
  async getCategories() {
    return this.catalogService.getCategorias();
  }

  @Get('brands')
  @ApiOperation({ summary: 'Listar marcas disponibles' })
  async getBrands() {
    return this.catalogService.getMarcas();
  }

  @Post('admin/products')
  @ApiOperation({ summary: 'Crear producto (Admin)' })
  async createProduct(@Body() data: CreateProductoDto) {
    return this.catalogService.createProduct(data);
  }

  @Put('admin/products/:id')
  @ApiOperation({ summary: 'Actualizar producto (Admin)' })
  async updateProduct(@Param('id') id: string, @Body() data: UpdateProductoDto) {
    return this.catalogService.updateProduct(id, data);
  }

  @Delete('admin/products/:id')
  @ApiOperation({ summary: 'Eliminar producto (Admin)' })
  async deleteProduct(@Param('id') id: string) {
    return this.catalogService.deleteProduct(id);
  }
}
