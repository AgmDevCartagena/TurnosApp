import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CatalogService, CartService, CheckoutService } from './services';
import { CatalogController, CartController } from './controllers';

@Module({
  controllers: [CatalogController, CartController],
  providers: [PrismaService, CatalogService, CartService, CheckoutService],
  exports: [CatalogService, CartService, CheckoutService],
})
export class CatalogoModule {}
