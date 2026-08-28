import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type ModalField = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'textarea' | 'select';
  value?: any;
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
};

export type ModalRequest =
  | { kind: 'form'; title: string; message?: string; fields: ModalField[]; submitText?: string; cancelText?: string; resolve: (value: Record<string, any> | null) => void }
  | { kind: 'confirm'; title: string; message: string; confirmText?: string; cancelText?: string; danger?: boolean; resolve: (value: boolean) => void }
  | { kind: 'alert'; title: string; message: string; buttonText?: string; resolve: () => void };

@Injectable({ providedIn: 'root' })
export class ModalService {
  readonly requests = new Subject<ModalRequest>();

  form(title: string, fields: ModalField[], options?: { message?: string; submitText?: string; cancelText?: string }): Promise<Record<string, any> | null> {
    return new Promise(resolve => this.requests.next({
      kind: 'form', title, fields,
      message: options?.message,
      submitText: options?.submitText || 'Save',
      cancelText: options?.cancelText || 'Cancel',
      resolve
    }));
  }

  confirm(title: string, message: string, options?: { confirmText?: string; cancelText?: string; danger?: boolean }): Promise<boolean> {
    return new Promise(resolve => this.requests.next({
      kind: 'confirm', title, message,
      confirmText: options?.confirmText || 'Confirm',
      cancelText: options?.cancelText || 'Cancel',
      danger: options?.danger ?? true,
      resolve
    }));
  }

  alert(message: string, title = 'Notice', buttonText = 'OK'): Promise<void> {
    return new Promise(resolve => this.requests.next({
      kind: 'alert', title, message, buttonText, resolve
    }));
  }
}
