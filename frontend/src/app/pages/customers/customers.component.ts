import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ModalService } from '../../core/modal.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="page-head">
  <div><h2>Customers</h2><p>Customer profiles, history and value.</p></div>
  <div class="page-actions">
    <span class="live">● Live data · {{customers.length}} customers</span>
    <button class="primary" type="button" (click)="add()">+ Add Customer</button>
  </div>
</div>

<div class="panel">
  <input class="search" [(ngModel)]="search" placeholder="Search by name or phone...">
  <div class="table">
    <div class="tr th"><span>Customer</span><span>Phone</span><span>Orders</span><span>Total spent</span><span>Type</span><span></span></div>
    <div class="tr" *ngFor="let c of filtered()">
      <span><strong>{{c.name}}</strong><small>{{c.address}}</small></span>
      <span>{{c.phone}}</span>
      <span>{{c.totalOrders}}</span>
      <span>{{c.totalSpent|number}} EGP</span>
      <span><em>{{c.customerType}}</em></span>
      <span>
        <button class="link" type="button" (click)="edit(c)">Edit</button>
        <button class="danger" type="button" (click)="remove(c)">Delete</button>
      </span>
    </div>
  </div>
  <div class="empty-table" *ngIf="!loading&&customers.length===0">No customers yet.</div>
  <div class="empty-table" *ngIf="loading">Loading customers...</div>
</div>`
})
export class CustomersComponent implements OnInit {
  private api = inject(ApiService);
  private modal = inject(ModalService);

  customers: any[] = [];
  search = '';
  loading = false;

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.get<any[]>('/customers').subscribe({
      next: r => {
        this.customers = r.map(c => ({
          ...c,
          totalOrders: Number(c.total_orders ?? 0),
          totalSpent: Number(c.total_spent ?? 0),
          customerType: c.customer_type ?? 'New Customer'
        }));
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  filtered() {
    const q = this.search.trim().toLowerCase();
    return this.customers.filter(c =>
      !q || c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }

  async add() {
    const result = await this.modal.form('Add Customer', [
      { key: 'name', label: 'Customer name', placeholder: 'e.g. Ahmed Mohamed', required: true },
      { key: 'phone', label: 'Phone', placeholder: '01xxxxxxxxx', required: true },
      { key: 'address', label: 'Address', placeholder: 'Delivery address', required: false }
    ], { submitText: 'Create Customer' });

    if (!result) return;
    const name = String(result['name'] || '').trim();
    const phone = String(result['phone'] || '').trim();
    const address = String(result['address'] || '').trim();

    if (name.length < 2 || phone.length < 8) {
      await this.modal.alert('Please enter a valid customer name and phone.');
      return;
    }

    this.api.post<any>('/customers', {
      name, phone, address: address || null
    }).subscribe({
      next: c => this.customers.unshift({
        ...c,
        totalOrders: Number(c.total_orders ?? 0),
        totalSpent: Number(c.total_spent ?? 0),
        customerType: c.customer_type ?? 'New Customer'
      }),
      error: e => this.modal.alert(e.error?.message || 'Could not add customer.', 'Could not add customer')
    });
  }

  async edit(c: any) {
    const result = await this.modal.form('Edit Customer', [
      { key: 'name', label: 'Customer name', value: c.name, required: true },
      { key: 'phone', label: 'Phone', value: c.phone, required: true },
      { key: 'address', label: 'Address', value: c.address || '', required: false }
    ], { submitText: 'Save Changes' });

    if (!result) return;
    const name = String(result['name'] || '').trim();
    const phone = String(result['phone'] || '').trim();
    if (name.length < 2 || phone.length < 8) {
      await this.modal.alert('Please enter a valid customer name and phone.');
      return;
    }

    this.api.put<any>(`/customers/${c.id}`, {
      name, phone, address: String(result['address'] || '').trim() || null
    }).subscribe({
      next: updated => {
        c.name = updated.name;
        c.phone = updated.phone;
        c.address = updated.address;
      },
      error: e => this.modal.alert(e.error?.message || 'Could not update customer.', 'Could not update customer')
    });
  }

  async remove(c: any) {
    const ok = await this.modal.confirm(
      'Delete Customer',
      `Delete ${c.name}? This also deletes this customer's orders.`,
      { confirmText: 'Delete Customer', danger: true }
    );
    if (!ok) return;

    this.api.delete<any>(`/customers/${c.id}`).subscribe({
      next: () => this.customers = this.customers.filter(x => x.id !== c.id),
      error: e => this.modal.alert(e.error?.message || 'Could not delete customer.', 'Could not delete customer')
    });
  }
}
