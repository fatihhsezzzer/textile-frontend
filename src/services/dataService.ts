import api from "./api";
import {
  Order,
  Model,
  Workshop,
  Operator,
  Technic,
  Firm,
  OrderImage,
  OrderTechnic,
  OrderStatus,
  ExchangeRate,
  Currency,
  User,
  Settings,
} from "../types";

// Cost service'ini import edelim
export { costService } from "./costService";

// Test servisi - authentication gerektirmez
export const testService = {
  testBackend: async () => {
    const response = await api.get("/Order/test");
    return response.data;
  },
};

// Firm servisleri ekleyin
export const firmService = {
  // Tüm firmaları getir
  getFirms: async (): Promise<Firm[]> => {
    const response = await api.get("/firm");
    return response.data;
  },

  // ID ile firma getir
  getFirm: async (id: string): Promise<Firm> => {
    const response = await api.get(`/firm/${id}`);
    return response.data;
  },

  // Firma kodu ile firma getir
  getFirmByCode: async (firmCode: string): Promise<Firm> => {
    const response = await api.get(`/firm/code/${firmCode}`);
    return response.data;
  },

  // Yeni firma oluştur
  createFirm: async (
    firm: Omit<Firm, "firmId" | "createdAt" | "createdBy" | "isActive">
  ): Promise<Firm> => {
    const response = await api.post("/firm", firm);
    return response.data;
  },

  // Firma güncelle
  updateFirm: async (id: string, firm: Partial<Firm>): Promise<Firm> => {
    const response = await api.put(`/firm/${id}`, firm);
    return response.data;
  },

  // Firma sil
  deleteFirm: async (id: string): Promise<void> => {
    await api.delete(`/firm/${id}`);
  },

  // Firma siparişlerini getir
  getFirmOrders: async (firmId: string): Promise<Order[]> => {
    const response = await api.get(`/firm/${firmId}/orders`);
    return response.data;
  },
};

// Utility: Backend'den gelen sayısal status'u enum'a çevir
const normalizeOrderStatus = (status: any): OrderStatus => {
  // Eğer undefined veya null ise varsayılan değer döndür
  if (status === undefined || status === null) {
    return OrderStatus.Atanmadi;
  }

  // Sayısal değeri enum'a çevir
  const statusMap: { [key: number]: OrderStatus } = {
    1: OrderStatus.Atanmadi,
    2: OrderStatus.Islemde,
    3: OrderStatus.IptalEdildi,
    4: OrderStatus.Tamamlandi,
  };

  return statusMap[status] || OrderStatus.Atanmadi;
};

// Utility: Frontend'deki string enum'u backend için sayısal değere çevir
const denormalizeOrderStatus = (status: OrderStatus): number => {
  const statusMap: { [key in OrderStatus]: number } = {
    [OrderStatus.Atanmadi]: 1,
    [OrderStatus.Islemde]: 2,
    [OrderStatus.IptalEdildi]: 3,
    [OrderStatus.Tamamlandi]: 4,
  };

  return statusMap[status];
};

// Order objelerindeki status'u normalize et (backend -> frontend)
const normalizeOrder = (order: any): Order => {
  // Backend'den flat yapıda gelen veriyi nested yapıya çevir
  const normalized: Order = {
    orderId: order.orderId,
    acceptanceDate: order.acceptanceDate,
    modelistUserId: order.modelistUserId,
    completionDate: order.completionDate,
    deadline: order.deadline,
    firmId: order.firmId,
    firm:
      order.firm ||
      (order.firmName
        ? {
            firmId: order.firmId,
            firmName: order.firmName,
            firmCode: order.firmCode || "",
            contactPerson: order.firmContactPerson || "",
            phone: order.firmPhone || "",
            email: order.firmEmail || "",
            address: order.firmAddress || "",
            taxNumber: order.firmTaxNumber || "",
            taxOffice: order.firmTaxOffice || "",
            description: order.firmDescription || "",
            createdAt: order.firmCreatedAt || "",
            createdBy: order.firmCreatedBy || "",
            updatedAt: order.firmUpdatedAt,
            updatedBy: order.firmUpdatedBy,
            isActive:
              order.firmIsActive !== undefined ? order.firmIsActive : true,
          }
        : undefined),
    modelId: order.modelId,
    model:
      order.model ||
      (order.modelName
        ? {
            modelId: order.modelId,
            modelName: order.modelName,
            modelCode: order.modelCode || "",
            description: order.modelDescription || "",
            season: order.modelSeason || "",
            category: order.modelCategory || "",
            color: order.modelColor || "",
            size: order.modelSize || "",
            fabric: order.modelFabric || "",
            imageUrl: order.modelImageUrl || "",
            estimatedPrice: order.modelEstimatedPrice,
            estimatedProductionTime: order.modelEstimatedProductionTime,
          }
        : undefined),
    quantity: order.quantity,
    unit: order.orderUnitId !== undefined ? order.orderUnitId : undefined,
    pieceCount: order.pieceCount,
    price: order.price,
    priceCurrency: order.priceCurrency,
    currency: order.priceCurrency, // Geriye dönük uyumluluk
    workshopId: order.workshopId,
    workshop:
      order.workshop ||
      (order.workshopName
        ? {
            workshopId: order.workshopId,
            name: order.workshopName,
            description: order.workshopDescription || "",
            location: order.workshopLocation || "",
            contactPerson: order.workshopContactPerson || "",
            phone: order.workshopPhone || "",
          }
        : undefined),
    operatorId: order.operatorId,
    operator:
      order.operator ||
      (order.operatorName
        ? {
            operatorId: order.operatorId,
            firstName:
              order.operatorFirstName ||
              order.operatorName.split(" ")[0] ||
              order.operatorName,
            lastName:
              order.operatorLastName ||
              order.operatorName.split(" ").slice(1).join(" ") ||
              "",
            phone: order.operatorPhone || "",
            email: order.operatorEmail || "",
            specialization: order.operatorSpecialization || "",
            workshopId: order.workshopId,
            workshop: order.workshop,
          }
        : undefined),
    modelistUser:
      order.modelistUser ||
      (order.modelistUserName
        ? {
            userId: order.modelistUserId || "",
            firstName:
              order.modelistUserName.split(" ")[0] || order.modelistUserName,
            lastName:
              order.modelistUserName.split(" ").slice(1).join(" ") || "",
            email: "",
            role: "Modelist",
            workshopId: undefined,
            workshop: undefined,
          }
        : undefined),
    priority: order.priority,
    note: order.note,
    invoice: order.invoice,
    invoiceNumber: order.invoiceNumber,
    status:
      order.orderStatusId !== undefined
        ? normalizeOrderStatus(order.orderStatusId)
        : order.status !== undefined
        ? normalizeOrderStatus(order.status)
        : OrderStatus.Atanmadi,
    qrCodeUrl: order.qrCodeUrl,
    qrCode: order.qrCodeUrl, // Geriye dönük uyumluluk
    images:
      order.images ||
      (order.imageUrls
        ? order.imageUrls.map((url: string, index: number) => ({
            orderImageId: `${order.orderId}-${index}`,
            orderId: order.orderId,
            imageUrl: url,
            description: "",
            displayOrder: index,
          }))
        : []),
    orderTechnics:
      order.orderTechnics ||
      (order.technicNames
        ? order.technicNames.map((name: string, index: number) => ({
            orderTechnicId: `${order.orderId}-technic-${index}`,
            orderId: order.orderId,
            technicId: "",
            technic: {
              technicId: "",
              name: name,
              description: "",
              category: "",
            },
          }))
        : []),
    createdAt: order.createdAt || new Date().toISOString(),
    createdBy: order.createdBy || "",
    updatedAt: order.updatedAt,
    updatedBy: order.updatedBy,
    isActive:
      order.isActive !== undefined
        ? order.isActive
        : order.IsActive !== undefined
        ? order.IsActive
        : true,
  };

  return normalized;
};

// Order objelerindeki status'u denormalize et (frontend -> backend)
const denormalizeOrder = (order: Order): any => {
  const { status, ...rest } = order;
  return {
    ...rest,
    orderStatusId:
      status !== undefined && status !== null
        ? denormalizeOrderStatus(status)
        : 1, // Default: Atanmadi = 1
  };
};

export const orderService = {
  getAll: async (): Promise<Order[]> => {
    const response = await api.get<Order[]>("/Order");
    return response.data.map(normalizeOrder);
  },

  getInvoiced: async (): Promise<Order[]> => {
    const response = await api.get<Order[]>("/Order/invoiced");
    return response.data.map(normalizeOrder);
  },

  getById: async (id: string): Promise<Order> => {
    const response = await api.get<Order>(`/Order/${id}`);
    return normalizeOrder(response.data);
  },

  create: async (
    order: Omit<Order, "orderId" | "createdAt" | "updatedAt">
  ): Promise<Order> => {
    // Status'u numeric'e çevir ve gönder
    const backendOrder = {
      ...order,
      orderStatusId: order.status ? denormalizeOrderStatus(order.status) : 0,
    };
    // status alanını gönderme
    delete backendOrder.status;
    const response = await api.post<any>("/Order", backendOrder);
    // Response'u normalize et
    return normalizeOrder(response.data);
  },

  update: async (id: string, order: Order): Promise<void> => {
    // Status'u numeric'e çevir ve gönder
    const backendOrder = denormalizeOrder(order);
    await api.put(`/Order/${id}`, backendOrder);
  },

  // Fatura bilgilerini güncelle
  updateInvoice: async (
    id: string,
    data: { invoice: string; invoiceNumber: string }
  ): Promise<void> => {
    await api.put(`/Order/${id}/invoice`, data);
  },

  // Yeni atama endpointi (workshop/operator/status)
  assign: async (
    id: string,
    data: {
      workshopId?: string | null;
      operatorId?: string | null;
      orderStatusId?: number | null;
    }
  ): Promise<void> => {
    await api.put(`/Order/${id}/assign`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/Order/${id}`);
  },

  // Yeni file upload endpoint'i
  uploadImages: async (
    orderId: string,
    files: File[]
  ): Promise<{ message: string; images: any[] }> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await api.post(
      `/Order/${orderId}/upload-images`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // Sipariş resimlerini getir
  getImages: async (orderId: string): Promise<OrderImage[]> => {
    const response = await api.get<OrderImage[]>(`/Order/${orderId}/images`);
    return response.data;
  },

  // Resim sil - yeni endpoint yapısı
  deleteImage: async (imageId: string): Promise<void> => {
    await api.delete(`/Order/image/${imageId}`);
  },

  // Eski addImage metodu - backward compatibility için kalsın
  addImage: async (
    orderId: string,
    image: Omit<
      OrderImage,
      "orderImageId" | "orderId" | "createdAt" | "createdBy"
    >
  ): Promise<OrderImage> => {
    const response = await api.post<OrderImage>(
      `/Order/${orderId}/images`,
      image
    );
    return response.data;
  },

  // Order log'larını getir
  getOrderLogs: async (orderId: string): Promise<any[]> => {
    const response = await api.get(`/Order/${orderId}/logs`);
    return response.data;
  },

  // Son N değişikliği getir (tüm order'lar)
  getRecentLogs: async (count: number = 50): Promise<any[]> => {
    const response = await api.get(`/Order/logs/recent?count=${count}`);
    return response.data;
  },

  addTechnic: async (
    orderId: string,
    technicId: string
  ): Promise<OrderTechnic> => {
    const response = await api.post<OrderTechnic>(
      `/Order/${orderId}/technics`,
      { technicId }
    );
    return response.data;
  },

  deleteTechnic: async (orderId: string, technicId: string): Promise<void> => {
    await api.delete(`/Order/${orderId}/technics/${technicId}`);
  },

  // Yeni API endpoint'leri
  // Status filtreli sipariş getirme
  getAllByStatus: async (status?: OrderStatus): Promise<Order[]> => {
    // Backend numeric enum bekliyor, string enum'u sayıya çevir
    let statusParam = "";
    if (status) {
      const statusMap: { [key in OrderStatus]: number } = {
        [OrderStatus.Atanmadi]: 1,
        [OrderStatus.Islemde]: 2,
        [OrderStatus.IptalEdildi]: 3,
        [OrderStatus.Tamamlandi]: 4,
      };
      statusParam = statusMap[status].toString();
    }

    const url = statusParam ? `/Order?status=${statusParam}` : "/Order";
    console.log(
      `🔍 Fetching orders with filter URL: ${url} (${status} = ${statusParam})`
    );
    const response = await api.get<Order[]>(url);
    return response.data.map(normalizeOrder);
  },

  // Sipariş status'ını güncelle
  updateStatus: async (
    orderId: string,
    status: OrderStatus
  ): Promise<{
    message: string;
    orderId: string;
    newStatus: string;
    completionDate?: string;
  }> => {
    // String enum'u sayısal değere çevir (backend numeric enum bekliyor)
    const statusMap: { [key in OrderStatus]: number } = {
      [OrderStatus.Atanmadi]: 1,
      [OrderStatus.Islemde]: 2,
      [OrderStatus.IptalEdildi]: 3,
      [OrderStatus.Tamamlandi]: 4,
    };

    const numericStatus = statusMap[status];
    console.log(`📤 Sending numeric status:`, numericStatus, `(${status})`);

    // Log if status is Tamamlandı (backend will handle completionDate automatically)
    if (status === OrderStatus.Tamamlandi) {
    }

    try {
      // Backend endpoint: PUT /Order/{id}/status beklenen body: [FromBody] OrderStatus status
      // Sadece sayısal enum değerini gönder (primitive value olarak)
      const response = await api.put(
        `/Order/${orderId}/status`,
        numericStatus,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("❌ Status update failed:", error.response?.status);
      console.error("❌ Error details:", error.response?.data);
      throw error;
    }
  },

  // Status'a göre siparişleri getir
  getByStatus: async (status: OrderStatus): Promise<any[]> => {
    const response = await api.get(`/Order/by-status/${status}`);
    return response.data.map(normalizeOrder);
  },

  // Status özeti
  getStatusSummary: async (): Promise<
    { Status: string; Count: number; TotalValue: number }[]
  > => {
    const response = await api.get("/Order/status-summary");
    return response.data;
  },
};

export const modelService = {
  getAll: async (): Promise<Model[]> => {
    const response = await api.get<Model[]>("/Model");
    return response.data;
  },

  getById: async (id: string): Promise<Model> => {
    const response = await api.get<Model>(`/Model/${id}`);
    return response.data;
  },

  getPriceHistory: async (id: string) => {
    const response = await api.get(`/Model/${id}/prices`);
    return response.data;
  },

  create: async (model: Omit<Model, "modelId">): Promise<Model> => {
    const response = await api.post<Model>("/Model", model);
    return response.data;
  },
};

export const workshopService = {
  getAll: async (): Promise<Workshop[]> => {
    const response = await api.get<Workshop[]>("/Workshop");
    return response.data;
  },

  getConnections: async (workshopId: string): Promise<any[]> => {
    const response = await api.get(`/Workshop/${workshopId}/connections`);
    console.log("🔌 Is array:", Array.isArray(response.data));
    return response.data;
  },

  addConnection: async (
    workshopId: string,
    data: { targetWorkshopId: string; notes?: string }
  ): Promise<any> => {
    const response = await api.post(
      `/Workshop/${workshopId}/connections`,
      data
    );
    return response.data;
  },

  removeConnection: async (
    workshopId: string,
    connectionId: string
  ): Promise<void> => {
    await api.delete(`/Workshop/${workshopId}/connections/${connectionId}`);
  },

  create: async (workshop: Omit<Workshop, "workshopId">): Promise<Workshop> => {
    const response = await api.post<Workshop>("/Workshop", workshop);
    return response.data;
  },

  update: async (
    id: string,
    workshop: Partial<Workshop>
  ): Promise<Workshop> => {
    const response = await api.put<Workshop>(`/Workshop/${id}`, workshop);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/Workshop/${id}`);
  },
};

export const operatorService = {
  getAll: async (): Promise<Operator[]> => {
    const response = await api.get<Operator[]>("/Operator");
    return response.data;
  },

  create: async (operator: Omit<Operator, "operatorId">): Promise<Operator> => {
    const response = await api.post<Operator>("/Operator", operator);
    return response.data;
  },
};

export const technicService = {
  getAll: async (): Promise<Technic[]> => {
    const response = await api.get<Technic[]>("/Technic");
    return response.data;
  },

  create: async (technic: Omit<Technic, "technicId">): Promise<Technic> => {
    const response = await api.post<Technic>("/Technic", technic);
    return response.data;
  },
};

export const exchangeRateService = {
  // En güncel kur bilgilerini getir
  getLatest: async (): Promise<ExchangeRate[]> => {
    const response = await api.get<ExchangeRate[]>("/ExchangeRate/latest");
    return response.data;
  },

  // Belirli bir para birimi için kur bilgisi
  getByCurrency: async (currencyCode: string): Promise<ExchangeRate> => {
    const response = await api.get<ExchangeRate>(
      `/ExchangeRate/latest/${currencyCode}`
    );
    return response.data;
  },

  // Desteklenen para birimlerini getir
  getCurrencies: async (): Promise<Currency[]> => {
    const response = await api.get<Currency[]>("/ExchangeRate/currencies");
    return response.data;
  },
};

// User servisi - Modelist yönetimi
export const userService = {
  // Tüm kullanıcıları getir
  getAll: async (): Promise<User[]> => {
    const response = await api.get<User[]>("/User");
    return response.data;
  },

  // Aktif modelistleri getir
  getModelists: async (): Promise<User[]> => {
    const response = await api.get<User[]>("/User/modelists");
    return response.data;
  },

  // Kullanıcı güncelle
  update: async (
    id: string,
    userData: {
      email?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
      workshopId?: string | null;
      isActive?: boolean;
      password?: string;
    }
  ): Promise<User> => {
    const response = await api.put<User>(`/User/${id}`, userData);
    return response.data;
  },
};

// Modelist Order servisi - Modeliste atanan siparişler
export const modelistOrderService = {
  // Giriş yapan modeliste atanmış tüm siparişleri listeler
  getMyOrders: async (status?: OrderStatus): Promise<Order[]> => {
    const params = status !== undefined ? { status } : {};
    const response = await api.get<Order[]>("/ModelistOrder", { params });
    return response.data.map(normalizeOrder);
  },

  // Belirli bir sipariş detayını getirir (sadece kendi siparişi ise)
  getOrderById: async (id: string): Promise<Order> => {
    const response = await api.get<Order>(`/ModelistOrder/${id}`);
    return normalizeOrder(response.data);
  },

  // Modelist için istatistikler
  getStats: async (): Promise<{
    total: number;
    pending: number;
    completed: number;
    unassigned: number;
  }> => {
    const response = await api.get("/ModelistOrder/stats");
    return response.data;
  },

  // Sipariş durumunu güncelle
  updateStatus: async (orderId: string, status: OrderStatus): Promise<void> => {
    await api.put(`/Order/${orderId}/assign`, {
      orderStatusId: status,
    });
  },
};

// Settings servisi
export const settingsService = {
  getAll: async (): Promise<Settings[]> => {
    const response = await api.get<Settings[]>("/Settings");
    return response.data;
  },

  getById: async (id: string): Promise<Settings> => {
    const response = await api.get<Settings>(`/Settings/${id}`);
    return response.data;
  },

  getDefault: async (): Promise<Settings> => {
    const response = await api.get<Settings>("/Settings/default");
    return response.data;
  },

  create: async (
    settings: Omit<
      Settings,
      "settingsId" | "createdAt" | "createdBy" | "isActive"
    >
  ): Promise<Settings> => {
    const response = await api.post<Settings>("/Settings", settings);
    return response.data;
  },

  update: async (id: string, settings: Partial<Settings>): Promise<void> => {
    await api.put(`/Settings/${id}`, settings);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/Settings/${id}`);
  },
};
