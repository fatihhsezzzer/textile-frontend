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
  workshopId?: string;
  workshop?: Workshop;
  isFirstLogin?: boolean;
  user?: User; // Opsiyonel, eski format desteği için
}

export enum OrderStatus {
  Atanmadi = 1, // Atanmadı
  Islemde = 2, // İşlemde
  IptalEdildi = 3, // İptal Edildi
  Tamamlandi = 4, // Tamamlandı
}

export enum OrderUnit {
  Adet = 1, // Database ID: 1
  Metre = 2, // Database ID: 2
  Takim = 3, // Database ID: 3 (Takım birimi)
}

// Maliyet hesaplama tipleri
export enum CalculationType {
  Simple = 0, // Basit hesaplama - Quantity × UnitPrice
  TwoDimensional = 1, // İki boyutlu - Quantity × Quantity2 × UnitPrice
  PieceFitting = 2, // Varak/Sticker - (MaterialWidth/En) × (MaterialHeight/Boy) = adet/metre
  MeterBased = 3, // Metre bazlı hesaplama
  AreaBased = 4, // Alan bazlı (m²) hesaplama
  PaintBased = 5, // Boya hesaplama - Litre × Çeşit Sayısı × Kat Sayısı
  CustomCost = 6, // Özel Maliyet - TotalCost direkt girilir (Fason üretim, sabit maliyetler)
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
  workshopId?: string;
  workshop?: Workshop;
  isActive: boolean;
}

export interface Model {
  modelId: string;
  modelCode: string;
  modelName: string;
  firmId?: string; // Firma ID'si
  patternCode?: string; // Desen kodu
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

export interface ModelPriceHistoryItem {
  orderId: string;
  acceptanceDate: string;
  price: number;
  priceCurrency: string;
  quantity: number;
  orderUnitName: string;
  firmName: string;
  firmId: string;
}

export interface ModelPriceHistory {
  modelId: string;
  modelCode: string;
  modelName: string;
  currentPrice?: number;
  currentPriceCurrency?: string;
  priceHistory: ModelPriceHistoryItem[];
}

export interface Workshop {
  workshopId: string;
  name: string;
  description?: string;
  location?: string;
  contactPerson?: string;
  phone?: string;
  displayOrder?: number;
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
  modelistUserId?: string; // Modelist assignment for digital/sticket orders
  modelistUser?: User; // Navigation property for modelist user
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
  qrCodeUrl?: string; // Backend: QrCodeUrl (nullable)
  qrCode?: string; // Eski alan - geriye dönük uyumluluk için
  images?: OrderImage[];
  orderTechnics?: OrderTechnic[];
  // AuditableEntity fields
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
  isActive: boolean;
}

// Cost Management Types
export interface CostCategory {
  costCategoryId: string;
  category: string; // Backend expects 'category' field
  categoryName: string; // Keep for frontend compatibility
  description?: string;
  displayOrder?: number;
  isActive: boolean;
}

export interface CostSubCategory {
  costSubCategoryId: string; // GUID
  costCategoryId: string; // GUID
  subCategory: string; // Backend expects 'subCategory'
  subCategoryName: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  costCategory?: CostCategory;
}

export interface CostItem {
  costItemId: string; // GUID
  costCategoryId: string; // GUID
  costUnitId?: string; // GUID - Yeni format
  costUnitId2?: string; // GUID - İkinci birim (opsiyonel)
  costUnitId3?: string; // GUID - Üçüncü birim (opsiyonel, sadece referans)
  itemName: string;
  description?: string;
  unit?: string; // String format (unitCode) - Opsiyonel, hesaplama tipine göre belirlenir
  unitName?: string; // Birim adı (Metre, Kilogram, Litre vb.) - Backend'den geliyor
  unit2?: string; // İkinci birim adı (opsiyonel, çoklu boyut için) - DEPRECATED: costUnit2.unitName kullan
  unitPrice: number;
  currency: string;
  supplier?: string;
  wastagePercentage?: number; // Fire yüzdesi (0-100)
  minimumOrderQuantity?: number;
  discountPercentage?: number;
  lastPriceUpdate: string;
  isActive: boolean;
  // Hesaplama tipi ve ilgili alanlar
  calculationType?: CalculationType; // Hesaplama tipi (Simple, PieceFitting vb.)
  materialWidth?: number; // Malzeme eni (Varak: 150, Sticker: 59)
  materialHeight?: number; // Malzeme boyu per metre (100)
  quantity1Label?: string; // 1. miktar başlığı ("En", "Miktar", "Kişi")
  quantity2Label?: string; // 2. miktar başlığı ("Boy", "Süre", "Saat")
  quantity3Label?: string; // 3. miktar başlığı ("Sipariş Adedi", "Adet")
  // Navigation properties
  costCategory?: CostCategory;
}

export interface ModelCost {
  modelCostId: string;
  modelId: string;
  modelName?: string; // Backend'den flat DTO
  modelCode?: string; // Backend'den flat DTO
  orderId?: string; // Sipariş ID'si (opsiyonel - genel model maliyetleri için null olabilir)
  orderAcceptanceDate?: string; // Backend'den flat DTO
  firmId?: string; // Firma ID'si (flat DTO)
  firmName?: string; // Firma adı (flat DTO)
  oldWorkshopId?: string; // Atölye ID'si (flat DTO)
  oldWorkshopName?: string; // Atölye adı (flat DTO)
  costItemId: string;
  costItemName?: string; // Backend'den flat DTO
  costCategoryName?: string; // Backend'den flat DTO
  quantity: number;
  unit?: string;
  quantity2?: number; // İkinci miktar (boy, kişi sayısı, süre vb.)
  unit2?: string; // İkinci birim adı
  quantity3?: number; // Üçüncü miktar (opsiyonel, referans)
  unit3?: string; // Üçüncü birim adı (opsiyonel, referans)
  costUnitId2?: string; // İkinci birim referansı
  costUnitId3?: string; // Üçüncü birim referansı (opsiyonel, referans)
  unitPrice?: number;
  totalCost?: number;
  currency?: string;
  actualQuantityNeeded?: number;
  wastagePercentage?: number; // Fire yüzdesi (0-100)
  usage?: string;
  notes?: string; // Backend'den flat DTO
  priority?: number;
  isActive: boolean;
  usdRate?: number; // USD kuru (maliyet kaydedildiği andaki kur)
  eurRate?: number; // EUR kuru (maliyet kaydedildiği andaki kur)
  gbpRate?: number; // GBP kuru (maliyet kaydedildiği andaki kur)
  exchangeRateDate?: string; // Kur tarihi
  createdAt?: string; // Kayıt oluşturulma tarihi
  // Settings-based pricing calculations
  overheadCostRate?: number; // Genel gider oranı (%)
  profitMargin?: number; // Kar marjı (%)
  costWithOverhead?: number; // Genel gider eklenmiş maliyet
  finalCostWithProfit?: number; // Kar marjı eklenmiş nihai maliyet
  // PaintBased calculation type için özel alanlar
  layerCount?: number; // Kat sayısı (PaintBased için)
  applicationMethod?: string; // Uygulama yöntemi (PaintBased için)
  // AreaBased calculation type için özel alan
  coverageArea?: number; // Kaplama alanı (AreaBased için)
  model?: Model; // Geriye dönük uyumluluk için
  order?: Order; // Geriye dönük uyumluluk için
  costItem?: CostItem; // Geriye dönük uyumluluk için
}

export interface ModelCostSummary {
  modelId: string;
  modelName: string;
  totalItems: number;
  totalCost: number;
  currency: string;
  costsByCategory: {
    categoryName: string;
    itemCount: number;
    totalCost: number;
    items: {
      itemName: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      totalCost: number;
      usage?: string;
    }[];
  }[];
}

export interface WorkshopCostItem {
  workshopCostItemId: string;
  workshopId: string;
  workshopName?: string;
  costItemId: string;
  costItemName?: string;
  costItemDescription?: string;
  categoryName?: string;
  costUnitId?: string;
  unitName?: string;
  unitCode?: string;
  costUnitId2?: string;
  unitName2?: string;
  unitCode2?: string;
  costUnitId3?: string;
  unitName3?: string;
  unitCode3?: string;
  // Hesaplama tipi ve özel miktar etiketleri (CostItem'dan gelen)
  calculationType?: CalculationType;
  materialWidth?: number; // Malzeme eni (Varak: 150, Sticker: 59)
  materialHeight?: number; // Malzeme boyu per metre (100)
  quantity1Label?: string;
  quantity2Label?: string;
  quantity3Label?: string;
  standardPrice?: number;
  standardCurrency?: string;
  workshopSpecificPrice?: number;
  workshopCurrency?: string;
  workshopDiscountPercentage?: number;
  effectivePrice: number;
  effectiveCurrency?: string;
  priority?: number;
  isPreferred: boolean;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
  workshop?: Workshop;
  costItem?: CostItem; // Geriye dönük uyumluluk için
}

export interface OrderWorkshopCost {
  orderWorkshopCostId: string;
  orderId: string;
  workshopId: string;
  costItemId: string;
  quantityUsed: number;
  quantity2?: number; // İkinci boyut (opsiyonel)
  quantity3?: number; // Üçüncü boyut (opsiyonel, referans)
  unit?: string; // Birim (required by backend ModelCost)
  unit2?: string; // İkinci birim (opsiyonel)
  unit3?: string; // Üçüncü birim (opsiyonel, referans)
  costUnitId3?: string; // Üçüncü birim ID (opsiyonel, referans)
  wastagePercentage?: number; // Fire yüzdesi (0-100)
  actualPrice: number;
  currency: string;
  totalCost: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
  order?: Order;
  workshop?: Workshop;
  costItem?: CostItem;
}

export interface Settings {
  settingsId: string;
  settingsName: string;
  profitMargin: number; // Kar marjı (%)
  overheadCostRate: number; // Genel gider oranı (%)
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}
