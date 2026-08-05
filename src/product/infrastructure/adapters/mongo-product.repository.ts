import { Inject } from '@nestjs/common';
import { Collection, Db } from 'mongodb';
import {
  ProductFilters,
  ProductRepository,
} from 'src/product/application/ports/product.repository.port';
import { Product } from 'src/product/domain/entities/product.entity';
import { ProductId } from 'src/product/domain/value-objects/product-id.vo';
import { Sku } from 'src/product/domain/value-objects/sku.vo';
import { Money } from 'src/shared/domain/value-objects/money.vo';
import { MONGO_DB } from 'src/shared/infrastructure/database/mongodb/mongo.provider';

interface ProductDocument {
  _id: string;
  name: string;
  description: string;
  sku: string;
  priceAmount: number;
  priceCurrency: string;
  stock: number;
  isActive: boolean;
  lowStockTreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

export class MongoProductRepository implements ProductRepository {
  private readonly collection: Collection<ProductDocument>;

  constructor(@Inject(MONGO_DB) private readonly db: Db) {
    this.collection = this.db.collection<ProductDocument>('products');
  }

  async save(product: Product): Promise<void> {
    const doc = MongoProductRepository.toPersistance(product);

    await this.collection.updateOne(
      { _id: doc._id },
      { $set: doc },
      { upsert: true },
    );
  }

  async findById(id: ProductId): Promise<Product | null> {
    const doc = await this.collection.findOne({ _id: id.getValue() });

    if (!doc) return null;

    return MongoProductRepository.toDomain(doc);
  }

  async findByName(name: string): Promise<Product | null> {
    const doc = await this.collection.findOne({ name });

    if (!doc) return null;

    return MongoProductRepository.toDomain(doc);
  }

  async findBySku(sku: Sku): Promise<Product | null> {
    const doc = await this.collection.findOne({ sku: sku.getValue() });

    if (!doc) return null;

    return MongoProductRepository.toDomain(doc);
  }

  async findAll(filters: ProductFilters): Promise<Product[]> {
    const query: Record<string, unknown> = {};

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters?.maxPrice !== undefined || filters.maxPrice !== undefined) {
      query.priceAmount = {};
      if (filters?.minPrice !== undefined) {
        query.priceAmount.$gte = Math.round(filters.minPrice * 100);
      }
      if (filters?.maxPrice !== undefined) {
        query.priceAmount.$lte = Math.round(filters.maxPrice * 100);
      }
    }

    const docs = await this.collection.find(query).toArray();

    return docs.map((doc) => MongoProductRepository.toDomain(doc));
  }

  async delete(id: ProductId): Promise<void> {
    await this.collection.deleteOne({ _id: id.getValue() });
  }

  private static toDomain(doc: ProductDocument): Product {
    return Product.reconstitute({
      id: new ProductId(doc._id),
      name: doc.name,
      description: doc.description,
      sku: Sku.create(doc.sku),
      price: Money.create(doc.priceAmount / 100, doc.priceCurrency),
      stock: doc.stock,
      isActive: doc.isActive,
      lowStockThreshold: doc.lowStockTreshold,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  private static toPersistance(product: Product): ProductDocument {
    return {
      _id: product.id.getValue(),
      name: product.name,
      description: product.description,
      sku: product.sku.getValue(),
      priceAmount: product.price.toCents(),
      priceCurrency: product.price.getCurrency(),
      stock: product.stock,
      isActive: product.isActive,
      lowStockTreshold: product.lowStockThreshold,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
