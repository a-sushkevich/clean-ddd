import { Inject, Injectable } from '@nestjs/common';
import { ProductRepository } from 'src/product/application/ports/product.repository.port';
import { DRIZZLE } from 'src/shared/infrastructure/database/postgres/drizzle.provider';
import type { DrizzleDB } from 'src/shared/infrastructure/database/postgres/drizzle.provider';

@Injectable()
export class DrizzleProductRepository implements ProductRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}
}
