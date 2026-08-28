import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ModalService } from '../../core/modal.service';

type OrderStatus = 'Pending' | 'Confirmed' | 'In Kitchen' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
interface OrderItem { productId: string; name: string; quantity: number; price: number; total?: number; }

@Component({
  standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <div class="page-head"><div><h2>Orders</h2><p>Track and manage every order.</p></div><div class="page-actions"><span class="live">● Live data</span><button class="primary" type="button" (click)="openAddOrder()">+ Add Order</button></div></div>
    <div class="panel"><div class="filters"><input placeholder="Search order ID or customer..." [(ngModel)]="search"><select [(ngModel)]="status"><option value="">All statuses</option><option *ngFor="let s of statuses" [value]="s">{{s}}</option></select></div>
      <div class="table orders-table"><div class="tr th order-row"><span>Order</span><span>Customer</span><span>Items</span><span>Total</span><span>Status</span><span></span></div>
        <ng-container *ngFor="let o of filtered()"><div class="tr order-row order-main-row" [class.order-expanded]="expandedOrderId===o.id">
          <span><button class="order-link" type="button" (click)="toggleDetails(o.id)">#{{o.orderId}}</button><small>{{o.createdAt | date:'dd MMM, h:mm a'}}</small><small>Automation code</small></span>
          <span>{{o.customerName}}<small>{{o.customerPhone}}</small></span><span><strong>{{totalItemCount(o.items)}}</strong> item(s)<button class="view-items" type="button" (click)="toggleDetails(o.id)">{{expandedOrderId===o.id?'Hide details':'View order'}}</button></span>
          <span><strong>{{o.total | number}} EGP</strong></span>
          <span><select class="status-select" [ngClass]="statusClass(o.status)" [ngModel]="o.status" (ngModelChange)="onStatusChange(o,$event)" (click)="$event.stopPropagation()"><option *ngFor="let s of statuses" [value]="s">{{s}}</option></select></span>
          <span><button class="danger" type="button" (click)="deleteOrder(o);$event.stopPropagation()">Delete</button></span>
        </div>
        <div class="order-details" *ngIf="expandedOrderId===o.id"><div class="order-details-header"><div><strong>Order #{{o.orderId}}</strong><small>{{o.customerName}} · {{o.customerPhone}}</small><small>Give this code to the automation: <b>{{o.orderId}}</b></small></div><span class="order-status" [ngClass]="statusClass(o.status)">{{o.status}}</span></div>
          <div class="ordered-items"><div class="ordered-item" *ngFor="let item of o.items"><span class="item-qty">{{item.quantity}}×</span><span>{{item.name}}</span><span class="item-price">{{(item.total ?? (item.price*item.quantity)) | number}} EGP</span></div></div>
          <div class="order-total-line"><span>Total</span><strong>{{o.total | number}} EGP</strong></div></div></ng-container>
        <div class="empty-table" *ngIf="!loading && filtered().length===0">No orders match your search.</div><div class="empty-table" *ngIf="loading">Loading orders...</div>
      </div></div>
    <div class="modal-backdrop" *ngIf="showAddOrder" (click)="closeAddOrder()"><div class="modal-card order-modal" (click)="$event.stopPropagation()"><div class="modal-head"><div><h3>Add Order</h3><p>Create an order manually from the CRM.</p></div><button class="modal-close" type="button" (click)="closeAddOrder()">×</button></div>
      <div class="form-grid order-form-grid"><label>Customer name<input [(ngModel)]="newOrder.customerName" placeholder="e.g. Ahmed Mohamed"></label><label>Phone<input [(ngModel)]="newOrder.phone" placeholder="01xxxxxxxxx"></label><label class="full-input-label">Address<input [(ngModel)]="newOrder.address" placeholder="Delivery address"></label></div>
      <div class="order-builder"><div class="builder-head"><strong>Order items</strong><button class="secondary" type="button" (click)="addItem()">+ Add item</button></div><div class="builder-row" *ngFor="let item of newOrder.items;let i=index"><select [(ngModel)]="item.productId" (ngModelChange)="onProductChange(i)"><option value="">Select product</option><option *ngFor="let product of menuItems" [value]="product.id" [disabled]="!product.available">{{product.name}} — {{product.price}} EGP{{product.available?'':' (unavailable)'}}</option></select><input class="qty-input" type="number" min="1" [(ngModel)]="item.quantity" (ngModelChange)="recalculate()"><span class="line-total">{{itemTotal(item)|number}} EGP</span><button class="remove-item" type="button" (click)="removeItem(i)" [disabled]="newOrder.items.length===1">×</button></div></div>
      <div class="order-form-total"><span>Order total</span><strong>{{newOrder.total|number}} EGP</strong></div><div class="modal-actions"><button class="secondary" type="button" (click)="closeAddOrder()">Cancel</button><button class="primary" type="button" (click)="createOrder()" [disabled]="!canCreateOrder() || saving">{{saving?'Creating...':'Create Order'}}</button></div></div></div>`
})
export class OrdersComponent implements OnInit {
  private api=inject(ApiService); private modal=inject(ModalService); orders:any[]=[]; menuItems:any[]=[]; search=''; status=''; expandedOrderId:string|null=null; showAddOrder=false; loading=false; saving=false;
  statuses:OrderStatus[]=['Pending','Confirmed','In Kitchen','Out for Delivery','Delivered','Cancelled'];
  newOrder:any=this.emptyOrder();
  ngOnInit(){this.load();}
  load(){this.loading=true; this.api.get<any[]>('/orders').subscribe({next:r=>{this.orders=r.map(x=>this.normalizeOrder(x));this.loading=false;},error:()=>this.loading=false}); this.api.get<any[]>('/menu/items').subscribe({next:r=>this.menuItems=r});}
  normalizeOrder(o:any){return {...o,id:o.id,orderId:String(o.order_id??o.orderId),customerName:o.customer_name??o.customerId?.name??'',customerPhone:o.customer_phone??o.customerId?.phone??'',createdAt:o.created_at??o.createdAt,total:Number(o.total||0),status:o.status,items:(o.items||[]).map((i:any)=>({...i,quantity:Number(i.quantity??i.qty??0),price:Number(i.price||0),total:Number(i.total??(i.price||0)*(i.quantity??i.qty??0))}))};}
  filtered(){const q=this.search.trim().toLowerCase();return this.orders.filter(o=>(!this.status||o.status===this.status)&&(!q||o.orderId.toLowerCase().includes(q)||o.customerName.toLowerCase().includes(q)||o.customerPhone.includes(q)));}
  totalItemCount(items:OrderItem[]){return items.reduce((s,i)=>s+Number(i.quantity||0),0);}
  toggleDetails(id:string){this.expandedOrderId=this.expandedOrderId===id?null:id;}
  onStatusChange(o:any,next:OrderStatus){if(o.status===next)return; const previous=o.status; o.status=next; this.api.patch<any>(`/orders/${o.id}/status`,{status:next}).subscribe({error:e=>{o.status=previous;this.modal.alert(e.error?.message||'Status update failed.', 'Status update failed')}});}
  async deleteOrder(o:any){
    const ok=await this.modal.confirm('Delete Order',`Delete order #${o.orderId}?`,{confirmText:'Delete Order',danger:true});
    if(!ok)return;
    this.api.delete<any>(`/orders/${o.id}`).subscribe({
      next:()=>{this.orders=this.orders.filter(x=>x.id!==o.id);if(this.expandedOrderId===o.id)this.expandedOrderId=null;},
      error:e=>this.modal.alert(e.error?.message||'Could not delete order.','Could not delete order')
    });
  }
  openAddOrder(){this.newOrder=this.emptyOrder();this.showAddOrder=true;} closeAddOrder(){this.showAddOrder=false;}
  emptyOrder(){return {customerName:'',phone:'',address:'',items:[{productId:'',quantity:1,price:0,name:''}],total:0};}
  addItem(){this.newOrder.items.push({productId:'',quantity:1,price:0,name:''});} removeItem(i:number){if(this.newOrder.items.length>1){this.newOrder.items.splice(i,1);this.recalculate();}}
  onProductChange(i:number){const row=this.newOrder.items[i],p=this.menuItems.find(x=>x.id===row.productId);row.price=Number(p?.price||0);row.name=p?.name||'';this.recalculate();}
  itemTotal(i:any){return Number(i.price||0)*Math.max(1,Number(i.quantity||1));} recalculate(){this.newOrder.total=this.newOrder.items.reduce((s:number,i:any)=>s+this.itemTotal(i),0);}
  canCreateOrder(){return this.newOrder.customerName.trim().length>1&&this.newOrder.phone.trim().length>=8&&this.newOrder.items.length>0&&this.newOrder.items.every((i:any)=>i.productId&&i.price>0&&i.quantity>0)&&this.newOrder.total>0;}
  createOrder(){
    if(!this.canCreateOrder()||this.saving)return;
    this.saving=true;
    const customer={name:this.newOrder.customerName.trim(),phone:this.newOrder.phone.trim(),address:this.newOrder.address.trim()||null};
    this.api.post<any>('/customers',customer).subscribe({
      next:(c:any)=>{
        const body={customerId:c.id,address:customer.address,items:this.newOrder.items.map((i:any)=>({productId:i.productId,quantity:Number(i.quantity)})),source:'CRM'};
        this.api.post<any>('/orders',body).subscribe({
          next:(o:any)=>{
            this.orders.unshift(this.normalizeOrder(o));
            this.expandedOrderId=o.id;
            this.saving=false;
            this.closeAddOrder();
          },
          error:(e:any)=>{
            this.saving=false;
            this.modal.alert(e.error?.message||'Could not create order.','Could not create order');
          }
        });
      },
      error:(e:any)=>{
        this.saving=false;
        this.modal.alert(e.error?.message||'Could not save customer.','Could not save customer');
      }
    });
  }
  statusClass(status:string){const m:any={Delivered:'order-status delivered','In Kitchen':'order-status kitchen',Pending:'order-status pending','Out for Delivery':'order-status delivery',Confirmed:'order-status confirmed',Cancelled:'order-status cancelled'};return m[status]||'order-status';}
}
