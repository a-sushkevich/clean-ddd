import { Inject, Injectable } from '@nestjs/common';
import { CustomerRepositoryPort } from 'src/customers/application/ports/customer.repository.port';
import { Customer } from 'src/customers/domain/entities/customer.entity';
import { CustomerId } from 'src/customers/domain/value-objects/customer-id.vo';
import { Email } from 'src/customers/domain/value-objects/email.vo';
import {
  DRIZZLE,
  type DrizzleDB,
} from 'src/shared/infrastructure/database/postgres/drizzle.provider';
import { customers } from 'src/shared/infrastructure/database/postgres/schema';
import { eq } from 'drizzle-orm';

type CustomerRow = typeof customers.$inferSelect;

@Injectable()
export class DrizzleCustomerRepository implements CustomerRepositoryPort {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDB,
  ) {}

  async save(customer: Customer): Promise<void> {
    const data = DrizzleCustomerRepository.toPersistence(customer);

    await this.db
      .insert(customers)
      .values(data)
      .onConflictDoUpdate({
        target: customers.id,
        set: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          isActive: data.isActive,
          updatedAt: data.updatedAt,
        },
      });
  }

  async findById(id: CustomerId): Promise<Customer | null> {
    const rows = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, id.getValue()));

    if (rows.length === 0) return null;

    return DrizzleCustomerRepository.toDomain(rows[0]);
  }

  async findAll(): Promise<Customer[]> {
    const rows = await this.db.select().from(customers);
    return rows.map((row) => DrizzleCustomerRepository.toDomain(row));
  }

  async delete(id: CustomerId): Promise<void> {
    await this.db.delete(customers).where(eq(customers.id, id.getValue()));
  }

  async findByEmail(email: Email): Promise<Customer | null> {
    const rows = await this.db
      .select()
      .from(customers)
      .where(eq(customers.email, email.getValue()));

    if (rows.length === 0) return null;

    return DrizzleCustomerRepository.toDomain(rows[0]);
  }

  private static toPersistence(
    customer: Customer,
  ): typeof customers.$inferSelect {
    return {
      id: customer.getId().getValue(),
      email: customer.getEmail().getValue(),
      firstName: customer.getFirstName(),
      lastName: customer.getLastName(),
      phone: customer.getPhone(),
      isActive: customer.getIsActive(),
      createdAt: customer.getCreatedAt(),
      updatedAt: customer.getUpdatedAt(),
    };
  }

  private static toDomain(row: CustomerRow) {
    return Customer.reconstitute({
      id: new CustomerId(row.id),
      email: Email.create(row.email),
      firstName: row.firstName,
      lastName: row.lastName,
      isActive: row.isActive,
      phone: row.phone,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
