import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'isMap', async: false })
export class IsMapConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    return value instanceof Map;
  }

  defaultMessage(): string {
    return 'Value must be a valid Map';
  }
}

export function IsMap(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsMapConstraint,
    });
  };
}
