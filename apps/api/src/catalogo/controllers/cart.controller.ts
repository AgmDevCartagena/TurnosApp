import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../autenticacion/guards';
import { CartService, CheckoutService } from '../services';
import { AddToCartDto, UpdateCartItemDto, CheckoutDto } from '../dto';

@ApiTags('Carrito')
@ApiBearerAuth()
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly checkoutService: CheckoutService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obtener carrito actual' })
  async getCart(@Req() req: any) {
    const usuarioId = req.user.id;
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.cartService.getOrCreateCart(usuarioId, empresaId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Agregar producto al carrito' })
  async addToCart(@Req() req: any, @Body() data: AddToCartDto) {
    const usuarioId = req.user.id;
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.cartService.addToCart(usuarioId, empresaId, data);
  }

  @Put('items/:itemId')
  @ApiOperation({ summary: 'Actualizar item del carrito' })
  async updateCartItem(
    @Req() req: any,
    @Param('itemId') itemId: string,
    @Body() data: UpdateCartItemDto,
  ) {
    const usuarioId = req.user.id;
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.cartService.updateCartItem(usuarioId, empresaId, itemId, data);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Eliminar item del carrito' })
  async removeCartItem(@Req() req: any, @Param('itemId') itemId: string) {
    const usuarioId = req.user.id;
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.cartService.removeCartItem(usuarioId, empresaId, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Vaciar carrito' })
  async clearCart(@Req() req: any) {
    const usuarioId = req.user.id;
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.cartService.clearCart(usuarioId, empresaId);
  }

  @Get('validate')
  @ApiOperation({ summary: 'Validar carrito antes de checkout' })
  async validateCheckout(@Req() req: any) {
    const usuarioId = req.user.id;
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.checkoutService.validateCheckout(usuarioId, empresaId);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Convertir carrito en solicitud de compra' })
  async checkout(@Req() req: any, @Body() data: CheckoutDto) {
    const usuarioId = req.user.id;
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.checkoutService.convertCartToRequisition(usuarioId, empresaId, data);
  }
}
