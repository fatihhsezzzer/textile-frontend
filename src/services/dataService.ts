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
} from "../types";

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
    const response = await api.get(`/firm/by-code/${firmCode}`);
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
    0: OrderStatus.Atanmadi,
    1: OrderStatus.Islemde,
    2: OrderStatus.IptalEdildi,
    3: OrderStatus.Tamamlandi,
  };

  return statusMap[status] || OrderStatus.Atanmadi;
};

// Utility: Frontend'deki string enum'u backend için sayısal değere çevir
const denormalizeOrderStatus = (status: OrderStatus): number => {
  const statusMap: { [key in OrderStatus]: number } = {
    [OrderStatus.Atanmadi]: 0,
    [OrderStatus.Islemde]: 1,
    [OrderStatus.IptalEdildi]: 2,
    [OrderStatus.Tamamlandi]: 3,
  };

  return statusMap[status];
};

// Order objelerindeki status'u normalize et (backend -> frontend)
const normalizeOrder = (order: any): Order => {
  return {
    ...order,
    status:
      order.status !== undefined
        ? normalizeOrderStatus(order.status)
        : OrderStatus.Atanmadi,
  };
};

// Order objelerindeki status'u denormalize et (frontend -> backend)
const denormalizeOrder = (order: Order): any => {
  return {
    ...order,
    status: order.status ? denormalizeOrderStatus(order.status) : 0,
  };
};

export const orderService = {
  getAll: async (): Promise<Order[]> => {
    const response = await api.get<Order[]>("/Order");
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
      status: order.status ? denormalizeOrderStatus(order.status) : 0,
    };
    const response = await api.post<any>("/Order", backendOrder);
    // Response'u normalize et
    return normalizeOrder(response.data);
  },

  update: async (id: string, order: Order): Promise<void> => {
    // Status'u numeric'e çevir ve gönder
    const backendOrder = denormalizeOrder(order);
    await api.put(`/Order/${id}`, backendOrder);
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
        [OrderStatus.Atanmadi]: 0,
        [OrderStatus.Islemde]: 1,
        [OrderStatus.IptalEdildi]: 2,
        [OrderStatus.Tamamlandi]: 3,
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
    console.log(
      `🔄 DataService: Updating order ${orderId} with status:`,
      status
    );

    // String enum'u sayısal değere çevir (backend numeric enum bekliyor)
    const statusMap: { [key in OrderStatus]: number } = {
      [OrderStatus.Atanmadi]: 0,
      [OrderStatus.Islemde]: 1,
      [OrderStatus.IptalEdildi]: 2,
      [OrderStatus.Tamamlandi]: 3,
    };

    const numericStatus = statusMap[status];
    console.log(`📤 Sending numeric status:`, numericStatus, `(${status})`);

    // Log if status is Tamamlandı (backend will handle completionDate automatically)
    if (status === OrderStatus.Tamamlandi) {
      console.log(
        `🎯 Status is Done - backend will set completion date automatically`
      );
    }

    try {
      // Backend endpoint: PUT /Order/{id}/status beklenen body: [FromBody] OrderStatus status
      // Sadece sayısal enum değerini gönder (primitive value olarak)
      console.log(
        `🔄 Calling: PUT /Order/${orderId}/status with numeric status: ${numericStatus}`
      );
      const response = await api.put(
        `/Order/${orderId}/status`,
        numericStatus,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log("✅ Status update response:", response.data);
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

  create: async (workshop: Omit<Workshop, "workshopId">): Promise<Workshop> => {
    const response = await api.post<Workshop>("/Workshop", workshop);
    return response.data;
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
