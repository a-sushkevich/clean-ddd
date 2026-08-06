import { Injectable } from '@nestjs/common';
import { CustomerRepositoryPort } from 'src/customers/application/ports/customer.repository.port';

@Injectable()
export class DrizzleCustomerRepository implements CustomerRepositoryPort {}
