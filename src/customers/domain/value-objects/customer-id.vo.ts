import { UniqueId } from 'src/shared/domain/value-objects/unique-id.vo';

export class CustomerId extends UniqueId {
  constructor(id?: string) {
    super(id);
  }
}
