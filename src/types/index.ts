export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  email: string;
  role: string;
  userId: string;
  firstName: string;
  lastName: string;
  user?: User; // Opsiyonel, eski format desteği için
}

export enum OrderStatus {
  Atanmadi = 0, // Atanmadı
  Islemde = 1, // İşlemde
  IptalEdildi = 2, // İptal Edildi
  Tamamlandi = 3, // Tamamlandı
}

export enum OrderUnit {
  Adet = 0,
  Metre = 1,
  Takim = 2,
}

export interface ExchangeRate {
  exchangeRateId: string;
  currencyCode: string;
  currencyName: string;
  forexBuying: number;
  forexSelling: number;
  banknoteBuying: number;
  banknoteSelling: number;
  rateDate: string;
  unit: number;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
  isActive: boolean;
}

export interface Currency {
  code: string;
  name: string;
}

export interface Firm {
  firmId: string;
  firmCode: string;
  firmName: string;
  description?: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
  taxOffice?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
  isActive: boolean;
}
export interface User {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface Model {
  modelId: string;
  modelCode: string;
  modelName: string;
  description?: string;
  category?: string;
  season?: string;
  color?: string;
  size?: string;
  fabric?: string;
  estimatedPrice?: number;
  estimatedProductionTime?: number;
  imageUrl?: string;
}

export interface Workshop {
  workshopId: string;
  name: string;
  description?: string;
  location?: string;
  contactPerson?: string;
  phone?: string;
}

export interface Operator {
  operatorId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  specialization?: string;
  workshopId?: string;
  workshop?: Workshop;
}

export interface Technic {
  technicId: string;
  name: string;
  description?: string;
  category?: string;
}

export interface OrderImage {
  orderImageId: string;
  orderId: string;
  imageUrl: string;
  description?: string;
  displayOrder: number;
}

export interface OrderTechnic {
  orderTechnicId?: string;
  orderId: string;
  technicId: string;
  technic?: Technic;
}

export interface Order {
  orderId: string;
  acceptanceDate: string; // Backend: AcceptanceDate
  completionDate?: string; // Backend: CompletionDate (nullable)
  firmId: string; // Backend: FirmId
  firm?: Firm; // Navigation property
  modelId: string; // Backend: ModelId
  model?: Model;
  quantity: number; // Backend: Quantity
  unit?: OrderUnit; // Backend: Unit (enum: Adet=0, Metre=1, Takim=2)
  pieceCount?: number; // Backend: PieceCount (Takım seçiliyse takımda kaç parça var)
  price?: number; // Backend: Price (nullable decimal)
  priceCurrency?: string; // Backend: PriceCurrency (döviz kodu: USD, EUR, TRY, vb.)
  currency?: string; // Eski alan - geriye dönük uyumluluk için
  workshopId?: string; // Backend: WorkshopId (nullable)
  workshop?: Workshop;
  operatorId?: string; // Backend: OperatorId (nullable)
  operator?: Operator;
  priority?: string; // Backend: Priority (nullable, max 50)
  deadline?: string; // Backend: Deadline (nullable DateTime)
  note?: string; // Backend: Note (nullable, max 500)
  invoice?: string; // Backend: Invoice (nullable, max 100)
  invoiceNumber?: string; // Backend: InvoiceNumber (nullable, max 50)
  status?: OrderStatus; // Backend: Status (enum)
  images?: OrderImage[];
  orderTechnics?: OrderTechnic[];
  // AuditableEntity fields
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
  isActive: boolean;
}
