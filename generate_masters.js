const fs = require('fs');

const masters = {
  company: {
    title: 'Company',
    desc: 'Manage all operating companies in PostgreSQL.',
    apiKey: 'Company',
    apiGet: 'getCompanies',
    apiSave: 'createCompany',
    apiDelete: 'deleteCompany',
    fields: [
      { key: 'name', label: 'Company Name', type: 'text' },
      { key: 'contact', label: 'Contact', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] }
    ]
  },
  branch: {
    title: 'Branch',
    desc: 'Manage company branches in PostgreSQL.',
    apiKey: 'Branch',
    apiGet: 'getBranches',
    apiSave: 'createBranch',
    apiDelete: 'deleteBranch',
    fields: [
      { key: 'name', label: 'Branch Name', type: 'text' },
      { key: 'company', label: 'Company', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] }
    ]
  },
  location: {
    title: 'Location',
    desc: 'Manage specific locations in PostgreSQL.',
    apiKey: 'Location',
    apiGet: 'getLocations',
    apiSave: 'createLocation',
    apiDelete: 'deleteLocation',
    fields: [
      { key: 'name', label: 'Location Name', type: 'text' },
      { key: 'branch', label: 'Branch', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] }
    ]
  },
  'car-model': {
    title: 'Car Model',
    desc: 'Manage car models and seating capacities in PostgreSQL.',
    apiKey: 'CarModel',
    apiGet: 'getCarModels',
    apiSave: 'createCarModel',
    apiDelete: 'deleteCarModel',
    fields: [
      { key: 'name', label: 'Model Name', type: 'text' },
      { key: 'seats', label: 'Seats', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] }
    ]
  },
  car: {
    title: 'Car Number',
    desc: 'Manage individual cars and fleet in PostgreSQL.',
    apiKey: 'Car',
    apiGet: 'getCars',
    apiSave: 'createCar',
    apiDelete: 'deleteCar',
    fields: [
      { key: 'carNo', label: 'Car No', type: 'text' },
      { key: 'model', label: 'Model', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: ['Available', 'Rented', 'Maintenance'] }
    ]
  },
  rate: {
    title: 'Rate Setup',
    desc: 'Manage rental rates based on duration in PostgreSQL.',
    apiKey: 'Rate',
    apiGet: 'getRates',
    apiSave: 'createRate',
    apiDelete: 'deleteRate',
    fields: [
      { key: 'model', label: 'Model', type: 'text' },
      { key: 'duration', label: 'Duration (Mins)', type: 'number' },
      { key: 'amount', label: 'Amount (KWD)', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] }
    ]
  },
  'grace-period': {
    title: 'Grace Period',
    desc: 'Manage allowable grace periods for rentals in PostgreSQL.',
    apiKey: 'GracePeriod',
    apiGet: 'getGracePeriods',
    apiSave: 'createGracePeriod',
    apiDelete: 'deleteGracePeriod',
    fields: [
      { key: 'minutes', label: 'Minutes', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] }
    ]
  },
  user: {
    title: 'User',
    desc: 'Manage system users, employee names, passwords, and access roles in PostgreSQL.',
    apiKey: 'User',
    apiGet: 'getUsers',
    apiSave: 'createUser',
    apiDelete: 'deleteUser',
    fields: [
      { key: 'username', label: 'Username', type: 'text' },
      { key: 'employeeName', label: 'Employee Name', type: 'text' },
      { key: 'password', label: 'Password', type: 'text' },
      { key: 'role', label: 'Role', type: 'select', options: ['ADMIN', 'MANAGER', 'STAFF'] },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] }
    ]
  }
};

for (const [key, data] of Object.entries(masters)) {
  const className = key.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('') + 'Component';
  
  const formHtml = `
      <div *ngIf="isFormOpen()" class="bg-slate-50 p-6 border-b border-slate-200">
        <h3 class="text-sm font-bold text-slate-800 mb-4">{{ editingId() ? 'Edit' : 'Add' }} ${data.title}</h3>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          ${data.fields.map(f => {
            if (f.type === 'select') {
              return `
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-bold text-slate-500 uppercase">${f.label}</label>
            <select [(ngModel)]="formData.${f.key}" class="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              ${f.options.map(o => `<option value="${o}">${o}</option>`).join('')}
            </select>
          </div>`;
            } else {
              return `
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-bold text-slate-500 uppercase">${f.label}</label>
            <input type="${f.type}" [(ngModel)]="formData.${f.key}" placeholder="Enter ${f.label}" class="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          </div>`;
            }
          }).join('')}
        </div>
        <div class="flex gap-2 justify-end">
          <button (click)="closeForm()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded">Cancel</button>
          <button (click)="save()" [disabled]="saving()" class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm flex items-center gap-2">
            <span *ngIf="saving()" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Save to PostgreSQL
          </button>
        </div>
      </div>
  `;

  const thead = data.fields.map(f => `<th class="px-6 py-4">${f.label}</th>`).join('');
  const tbody = data.fields.map(f => {
    if (f.key === 'status') {
      return `<td class="px-6 py-4"><span class="px-2 py-1 rounded text-[10px] font-bold" [ngClass]="item.status === 'ACTIVE' || item.status === 'Available' ? 'bg-green-100 text-green-700' : (item.status === 'Rented' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700')">{{ item.${f.key} }}</span></td>`;
    }
    if (f.key === 'password') {
      return `<td class="px-6 py-4"><span class="font-mono text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-2.5 py-1 font-semibold">{{ item.password || '******' }}</span></td>`;
    }
    if (f.key === 'employeeName') {
      return `<td class="px-6 py-4 font-bold text-slate-900">{{ item.employeeName || item.employee_name || item.username }}</td>`;
    }
    return `<td class="px-6 py-4 font-semibold text-slate-800">{{ item.${f.key} }}</td>`;
  }).join('');

  const template = `
    <div class="p-8 flex-1 overflow-y-auto">
      <div class="flex items-center justify-between mb-8">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-2xl font-bold text-slate-800">${data.title} Master</h2>
            <span class="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span class="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span> PostgreSQL Live
            </span>
          </div>
          <p class="text-slate-500 text-sm mt-1">${data.desc}</p>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="load()" class="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 shadow-sm" title="Refresh data">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
          <button (click)="openForm()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 shadow-sm flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            Add ${data.title}
          </button>
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        ${formHtml}
        <table class="w-full text-left text-sm text-slate-600">
          <thead class="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th class="px-6 py-4">ID</th>
              ${thead}
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr *ngFor="let item of items()" class="hover:bg-slate-50 transition-colors">
              <td class="px-6 py-4 font-mono font-medium text-slate-900">{{ item.id }}</td>
              ${tbody}
              <td class="px-6 py-4 text-right">
                <button (click)="edit(item)" class="text-indigo-600 hover:text-indigo-800 font-medium mr-3">Edit</button>
                <button (click)="remove(item.id)" class="text-red-500 hover:text-red-700 font-medium">Delete</button>
              </td>
            </tr>
            <tr *ngIf="items().length === 0 && !loading()">
               <td colspan="10" class="px-6 py-8 text-center text-slate-400">No records found in PostgreSQL database.</td>
            </tr>
            <tr *ngIf="loading()">
               <td colspan="10" class="px-6 py-8 text-center text-slate-400">
                 <div class="inline-flex items-center gap-2">
                   <div class="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                   Loading records from PostgreSQL...
                 </div>
               </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  const tsCode = `import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';

@Component({
  selector: 'app-${key}',
  imports: [CommonModule, FormsModule],
  template: \`${template}\`
})
export class ${className} implements OnInit {
  private api = inject(ApiService);

  items = signal<any[]>([]);
  isFormOpen = signal(false);
  editingId = signal<string | null>(null);
  loading = signal(false);
  saving = signal(false);
  
  formData: any = {};
  
  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.${data.apiGet}().subscribe({
      next: (data) => {
        this.items.set(data || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching ${key} data:', err);
        this.loading.set(false);
      }
    });
  }

  openForm() {
    this.formData = { status: '${data.fields.find(f => f.key === 'status')?.options[0] || 'ACTIVE'}' };
    this.editingId.set(null);
    this.isFormOpen.set(true);
  }
  
  edit(item: any) {
    this.formData = { 
      ...item,
      employeeName: item.employeeName || item.employee_name || ''
    };
    this.editingId.set(item.id);
    this.isFormOpen.set(true);
  }
  
  closeForm() {
    this.isFormOpen.set(false);
    this.formData = {};
  }
  
  save() {
    this.saving.set(true);
    const payload = this.editingId() 
      ? { ...this.formData, id: this.editingId() } 
      : { ...this.formData };

    this.api.${data.apiSave}(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.load();
      },
      error: (err) => {
        console.error('Error saving record to PostgreSQL:', err);
        alert('Error saving record to PostgreSQL: ' + (err.error?.error || err.message));
        this.saving.set(false);
      }
    });
  }
  
  remove(id: string) {
    if (confirm('Are you sure you want to delete this record from PostgreSQL?')) {
      this.api.${data.apiDelete}(id).subscribe({
        next: () => {
          this.load();
        },
        error: (err) => {
          console.error('Error deleting record from PostgreSQL:', err);
          alert('Error deleting record from PostgreSQL: ' + (err.error?.error || err.message));
        }
      });
    }
  }
}
`;

  fs.writeFileSync('src/app/' + key + '.ts', tsCode);
}
console.log('All master components including Employee Name updated successfully!');
