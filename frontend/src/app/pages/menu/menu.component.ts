import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ModalService } from '../../core/modal.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-head">
      <div>
        <h2>Menu</h2>
        <p>Manage products, categories and menu images used by the AI.</p>
      </div>
      <span class="live">● Live data</span>
    </div>

    <div class="panel">
      <div class="panel-title">
        <div>
          <h3>Products</h3>
          <small class="muted">
            {{items.length}} products · {{availableCount()}} available
          </small>
        </div>

        <button class="primary" type="button" (click)="add()">
          + Add Product
        </button>
      </div>

      <div class="filters">
        <input
          class="search"
          [(ngModel)]="search"
          placeholder="Search product..."
        >

        <select [(ngModel)]="category">
          <option value="">All categories</option>

          <option
            *ngFor="let c of categories"
            [value]="c.id"
          >
            {{c.name}}
          </option>
        </select>
      </div>

      <div class="table">
        <div class="tr th">
          <span>Product</span>
          <span>Category</span>
          <span>Price</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        <div
          class="tr"
          *ngFor="let x of filtered()"
        >
          <span>
            <strong>{{x.name}}</strong>
            <small>{{x.description}}</small>
          </span>

          <span>
            {{x.category_name}}
          </span>

          <span>
            {{x.price | number}} EGP
          </span>

          <span>
            <em [class.off]="!x.available">
              {{x.available ? 'Available' : 'Unavailable'}}
            </em>
          </span>

          <span>
            <button
              class="link"
              type="button"
              (click)="edit(x)"
            >
              Edit
            </button>

            <button
              class="link"
              type="button"
              (click)="toggle(x)"
            >
              {{x.available ? 'Disable' : 'Enable'}}
            </button>

            <button
              class="danger"
              type="button"
              (click)="remove(x)"
            >
              Delete
            </button>
          </span>
        </div>
      </div>

      <div
        class="empty-table"
        *ngIf="!loading && items.length === 0"
      >
        No products yet. Add your first product.
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">
        <div>
          <h3>Categories</h3>
          <small class="muted">
            Categories are stored in PostgreSQL.
          </small>
        </div>

        <button
          class="secondary"
          type="button"
          (click)="addCategory()"
        >
          + Add Category
        </button>
      </div>

      <div class="chips">
        <span
          class="chip"
          *ngFor="let c of categories"
        >
          {{c.name}}

          <button
            type="button"
            (click)="removeCategory(c)"
          >
            ×
          </button>
        </span>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">
        <div>
          <h3>Menu Images</h3>
          <small class="muted">
            Upload menu images directly from your device.
          </small>
        </div>

        <input
          #imageInput
          type="file"
          hidden
          accept="image/png,image/jpeg,image/webp"
          (change)="onImageSelected($event)"
        >

        <button
          class="secondary"
          type="button"
          (click)="imageInput.click()"
        >
          + Upload Menu Image
        </button>
      </div>

      <div class="image-list">

        <div
          class="menu-image"
          *ngFor="let x of images"
        >
          <img
            [src]="x.image_url"
            [alt]="x.title || 'Menu image'"
          >

          <div>
            <strong>
              {{x.title || 'Menu image'}}
            </strong>

            <small>
              Display order: {{x.display_order}}
            </small>
          </div>

          <button
            class="danger"
            type="button"
            (click)="deleteImage(x)"
          >
            Delete
          </button>
        </div>

        <div
          class="empty-image"
          *ngIf="images.length === 0"
        >
          <div>
            <div class="empty-image-icon">
              ＋
            </div>

            <strong>
              No menu images yet
            </strong>

            <small>
              Click “Upload Menu Image” to choose an image from your device.
            </small>
          </div>
        </div>

      </div>
    </div>
  `
})
export class MenuComponent implements OnInit {

  @ViewChild('imageInput')
  imageInput?: ElementRef<HTMLInputElement>;

  private api = inject(ApiService);
  private modal = inject(ModalService);

  items: any[] = [];
  categories: any[] = [];
  images: any[] = [];

  search = '';
  category = '';
  loading = false;

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;

    this.api.get<any[]>('/menu/items').subscribe({
      next: r => {
        this.items = r;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });

    this.api.get<any[]>('/menu/categories').subscribe({
      next: r => {
        this.categories = r;
      }
    });

    this.api.get<any[]>('/menu/images').subscribe({
      next: r => {
        this.images = r;
      }
    });
  }

  filtered() {
    const q = this.search.trim().toLowerCase();

    return this.items.filter(
      x =>
        (!q || String(x.name || '').toLowerCase().includes(q)) &&
        (!this.category || x.category_id === this.category)
    );
  }

  availableCount() {
    return this.items.filter(x => x.available).length;
  }

  async addCategory() {

    const result = await this.modal.form(
      'Add Category',
      [
        {
          key: 'name',
          label: 'Category name',
          placeholder: 'e.g. Burgers',
          required: true
        },
        {
          key: 'description',
          label: 'Description',
          type: 'textarea',
          placeholder: 'Optional description',
          required: false
        }
      ],
      {
        submitText: 'Create Category'
      }
    );

    if (!result) {
      return;
    }

    const name = String(
      result['name'] || ''
    ).trim();

    const description = String(
      result['description'] || ''
    ).trim();

    if (!name) {
      await this.modal.alert(
        'Category name is required.'
      );
      return;
    }

    this.api.post<any>(
      '/menu/categories',
      {
        name,
        description: description || null
      }
    ).subscribe({
      next: c => {
        this.categories.unshift(c);
      },

      error: e => {
        this.modal.alert(
          e.error?.message || 'Could not add category.',
          'Could not add category'
        );
      }
    });
  }

  async removeCategory(c: any) {

    if (
      this.items.some(
        x => x.category_id === c.id
      )
    ) {
      await this.modal.alert(
        'Delete or move the products in this category first.'
      );

      return;
    }

    const ok = await this.modal.confirm(
      'Delete Category',
      `Delete category ${c.name}?`,
      {
        confirmText: 'Delete Category',
        danger: true
      }
    );

    if (!ok) {
      return;
    }

    this.api.delete<any>(
      `/menu/categories/${c.id}`
    ).subscribe({
      next: () => {
        this.categories =
          this.categories.filter(
            x => x.id !== c.id
          );
      },

      error: e => {
        this.modal.alert(
          e.error?.message || 'Could not delete category.',
          'Could not delete category'
        );
      }
    });
  }

  async add() {

    if (!this.categories.length) {

      await this.modal.alert(
        'Create a category first.'
      );

      return;
    }

    const result = await this.modal.form(
      'Add Product',
      [
        {
          key: 'name',
          label: 'Product name',
          placeholder: 'e.g. Classic Burger',
          required: true
        },

        {
          key: 'description',
          label: 'Description',
          type: 'textarea',
          placeholder: 'Product description',
          required: false
        },

        {
          key: 'price',
          label: 'Price (EGP)',
          type: 'number',
          value: 100,
          required: true
        },

        {
          key: 'categoryId',
          label: 'Category',
          type: 'select',
          value: this.categories[0].id,

          options: this.categories.map(
            c => ({
              value: c.id,
              label: c.name
            })
          ),

          required: true
        }
      ],

      {
        submitText: 'Create Product'
      }
    );

    if (!result) {
      return;
    }

    const name = String(
      result['name'] || ''
    ).trim();

    const description = String(
      result['description'] || ''
    ).trim();

    const price = Number(
      result['price']
    );

    const categoryId =
      result['categoryId'];

    if (
      !name ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !categoryId
    ) {

      await this.modal.alert(
        'Please enter a valid product name, price and category.'
      );

      return;
    }

    const cat = this.categories.find(
      c => c.id === categoryId
    );

    this.api.post<any>(
      '/menu/items',
      {
        name,
        price,
        description: description || null,
        categoryId,
        available: true
      }
    ).subscribe({

      next: x => {

        this.items.unshift({
          ...x,
          category_name:
            cat?.name || ''
        });

      },

      error: e => {

        this.modal.alert(
          e.error?.message || 'Could not add product.',
          'Could not add product'
        );

      }
    });
  }

  async edit(x: any) {

    const result = await this.modal.form(
      'Edit Product',
      [
        {
          key: 'name',
          label: 'Product name',
          value: x.name,
          required: true
        },

        {
          key: 'description',
          label: 'Description',
          type: 'textarea',
          value: x.description || '',
          required: false
        },

        {
          key: 'price',
          label: 'Price (EGP)',
          type: 'number',
          value: Number(x.price),
          required: true
        },

        {
          key: 'categoryId',
          label: 'Category',
          type: 'select',
          value: x.category_id,

          options: this.categories.map(
            c => ({
              value: c.id,
              label: c.name
            })
          ),

          required: true
        }
      ],

      {
        submitText: 'Save Changes'
      }
    );

    if (!result) {
      return;
    }

    const name = String(
      result['name'] || ''
    ).trim();

    const description = String(
      result['description'] || ''
    ).trim();

    const price = Number(
      result['price']
    );

    const categoryId =
      result['categoryId'];

    if (
      !name ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !categoryId
    ) {

      await this.modal.alert(
        'Please enter a valid product name, price and category.'
      );

      return;
    }

    this.api.put<any>(
      `/menu/items/${x.id}`,
      {
        name,
        description: description || null,
        price,
        categoryId
      }
    ).subscribe({

      next: updated => {

        const cat =
          this.categories.find(
            c => c.id === updated.category_id
          );

        Object.assign(
          x,
          updated,
          {
            category_name:
              cat?.name ||
              x.category_name
          }
        );
      },

      error: e => {

        this.modal.alert(
          e.error?.message || 'Could not update product.',
          'Could not update product'
        );

      }
    });
  }

  toggle(x: any) {

    const next = !x.available;

    this.api.put<any>(
      `/menu/items/${x.id}`,
      {
        available: next
      }
    ).subscribe({

      next: r => {
        x.available = r.available;
      },

      error: e => {

        this.modal.alert(
          e.error?.message || 'Could not update product.',
          'Could not update product'
        );

      }
    });
  }

  async remove(x: any) {

    const ok = await this.modal.confirm(
      'Delete Product',
      `Delete ${x.name}?`,
      {
        confirmText: 'Delete Product',
        danger: true
      }
    );

    if (!ok) {
      return;
    }

    this.api.delete<any>(
      `/menu/items/${x.id}`
    ).subscribe({

      next: () => {
        this.items =
          this.items.filter(
            i => i.id !== x.id
          );
      },

      error: e => {

        this.modal.alert(
          e.error?.message || 'Could not delete product.',
          'Could not delete product'
        );

      }
    });
  }

  onImageSelected(event: Event) {

    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {

      this.modal.alert(
        'Please select a valid image.'
      );

      input.value = '';

      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {

      this.api.post<any>(
        '/menu/images',
        {
          imageUrl: String(
            reader.result
          ),

          title: file.name,

          displayOrder:
            this.images.length + 1,

          isActive: true
        }
      ).subscribe({

        next: x => {

          this.images = [
            ...this.images,
            x
          ];

          input.value = '';
        },

        error: e => {

          this.modal.alert(
            e.error?.message || 'Could not upload image.',
            'Could not upload image'
          );

        }
      });
    };

    reader.readAsDataURL(file);
  }

  async deleteImage(x: any) {

    const ok =
      await this.modal.confirm(
        'Delete Menu Image',
        'Delete this menu image?',
        {
          confirmText: 'Delete Image',
          danger: true
        }
      );

    if (!ok) {
      return;
    }

    this.api.delete<any>(
      `/menu/images/${x.id}`
    ).subscribe({

      next: () => {

        this.images =
          this.images.filter(
            i => i.id !== x.id
          );

      },

      error: e => {

        this.modal.alert(
          e.error?.message || 'Could not delete image.',
          'Could not delete image'
        );

      }
    });
  }
}