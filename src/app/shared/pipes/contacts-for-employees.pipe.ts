import { Pipe, PipeTransform } from '@angular/core';

/**
 *
 */
@Pipe({
  name: 'contactsForEmployees'
})
export class ContactsForEmployeesPipe implements PipeTransform {

  /**
   * Transform format text fopr contacts
   */
  transform(value: string | null | undefined): string {
    switch (value) {
    case 'PHONE':
      return 'Teléfono';
    case 'EMAIL':
      return 'E-mail';
    case 'WHATSAPP':
      return 'Whatsapp';
    default:
      return value ?? '';
    }
  }

}
