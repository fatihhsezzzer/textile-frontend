import {
  CostCategory,
  CostItem,
  CostUnit,
  ModelCost,
  ModelCostSummary,
  WorkshopCostItem,
  OrderWorkshopCost,
} from "../types";
import { apiRequest } from "./api";

const API_BASE = "/Cost";

export const costService = {
  // Cost Units - GET /api/Cost/units, POST /api/Cost/units
  getCostUnits: async (): Promise<CostUnit[]> => {
    return apiRequest(`${API_BASE}/units`);
  },

  createCostUnit: async (
    unit: Omit<
      CostUnit,
      "costUnitId" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy"
    >
  ): Promise<CostUnit> => {
    return apiRequest(`${API_BASE}/units`, {
      method: "POST",
      body: JSON.stringify(unit),
      headers: {
        "Content-Type": "application/json",
      },
    });
  },

  // Cost Categories - GET /api/Cost/categories, POST /api/Cost/categories
  getCostCategories: async (): Promise<CostCategory[]> => {
    return apiRequest(`${API_BASE}/categories`);
  },

  createCostCategory: async (
    category: Omit<CostCategory, "costCategoryId">
  ): Promise<CostCategory> => {
    return apiRequest(`${API_BASE}/categories`, {
      method: "POST",
      body: JSON.stringify(category),
      headers: {
        "Content-Type": "application/json",
      },
    });
  },

  // Cost Items - GET /api/Cost/items, POST /api/Cost/items, GET /api/Cost/items/category/{categoryId}
  getCostItems: async (): Promise<CostItem[]> => {
    return apiRequest(`${API_BASE}/items`);
  },

  getCostItemsByCategory: async (categoryId: string): Promise<CostItem[]> => {
    return apiRequest(`${API_BASE}/items/category/${categoryId}`);
  },

  createCostItem: async (
    costItem: Omit<CostItem, "costItemId" | "lastPriceUpdate">
  ): Promise<CostItem> => {
    return apiRequest(`${API_BASE}/items`, {
      method: "POST",
      body: JSON.stringify(costItem),
      headers: {
        "Content-Type": "application/json",
      },
    });
  },

  // PUT /api/Cost/items/{id}/price
  updateCostItemPrice: async (
    itemId: string,
    newPrice: number
  ): Promise<{ message: string; itemId: string; newPrice: number }> => {
    return apiRequest(`${API_BASE}/items/${itemId}/price`, {
      method: "PUT",
      body: JSON.stringify(newPrice),
      headers: {
        "Content-Type": "application/json",
      },
    });
  },

  // Model Costs - CRUD operations
  getOrderModelCosts: async (
    orderId: string,
    modelId: string
  ): Promise<ModelCost[]> => {
    return apiRequest(`${API_BASE}/order/${orderId}/model/${modelId}`);
  },

  getModelCosts: async (modelId: string): Promise<ModelCost[]> => {
    return apiRequest(`${API_BASE}/model/${modelId}`);
  },

  getModelCostById: async (id: string): Promise<ModelCost> => {
    return apiRequest(`${API_BASE}/model/cost/${id}`);
  },

  addModelCost: async (
    modelCost: Omit<ModelCost, "modelCostId">
  ): Promise<ModelCost> => {
    return apiRequest(`${API_BASE}/model`, {
      method: "POST",
      body: JSON.stringify(modelCost),
      headers: {
        "Content-Type": "application/json",
      },
    });
  },

  updateModelCost: async (
    id: string,
    modelCost: Partial<ModelCost>
  ): Promise<ModelCost> => {
    return apiRequest(`${API_BASE}/model/cost/${id}`, {
      method: "PUT",
      body: JSON.stringify(modelCost),
      headers: {
        "Content-Type": "application/json",
      },
    });
  },

  deleteModelCost: async (id: string): Promise<void> => {
    return apiRequest(`${API_BASE}/model/cost/${id}`, {
      method: "DELETE",
    });
  },

  // Cost Summaries - GET /api/Cost/order/{orderId}/summary, GET /api/Cost/model/{modelId}/summary, POST /api/Cost/model/{modelId}/recalculate
  getOrderCostSummary: async (orderId: string): Promise<ModelCostSummary> => {
    return apiRequest(`${API_BASE}/order/${orderId}/summary`);
  },

  getModelCostSummary: async (modelId: string): Promise<ModelCostSummary> => {
    return apiRequest(`${API_BASE}/model/${modelId}/summary`);
  },

  recalculateModelCosts: async (
    modelId: string
  ): Promise<{ message: string; modelId: string; updatedCount: number }> => {
    return apiRequest(`${API_BASE}/model/${modelId}/recalculate`, {
      method: "POST",
    });
  },

  // Workshop Items - GET /api/Cost/workshop/{workshopId}/items, GET /api/Cost/item/{costItemId}/workshops
  getWorkshopCostItems: async (
    workshopId: string
  ): Promise<WorkshopCostItem[]> => {
    return apiRequest(`${API_BASE}/workshop/${workshopId}/items`);
  },

  getCostItemWorkshops: async (
    costItemId: string
  ): Promise<WorkshopCostItem[]> => {
    return apiRequest(`${API_BASE}/item/${costItemId}/workshops`);
  },

  // Workshop Item Management - POST /api/Cost/workshop/items, PUT /api/Cost/workshop/items/{id}, DELETE /api/Cost/workshop/items/{id}
  createWorkshopItem: async (
    workshopItem: Omit<
      WorkshopCostItem,
      | "workshopCostItemId"
      | "effectivePrice"
      | "createdAt"
      | "createdBy"
      | "updatedAt"
      | "updatedBy"
    >
  ): Promise<WorkshopCostItem> => {
    return apiRequest(`${API_BASE}/workshop/items`, {
      method: "POST",
      body: JSON.stringify(workshopItem),
      headers: {
        "Content-Type": "application/json",
      },
    });
  },

  updateWorkshopItem: async (
    id: string,
    workshopItem: Partial<WorkshopCostItem>
  ): Promise<WorkshopCostItem> => {
    return apiRequest(`${API_BASE}/workshop/items/${id}`, {
      method: "PUT",
      body: JSON.stringify(workshopItem),
      headers: {
        "Content-Type": "application/json",
      },
    });
  },

  deleteWorkshopItem: async (id: string): Promise<void> => {
    return apiRequest(`${API_BASE}/workshop/items/${id}`, {
      method: "DELETE",
    });
  },

  // GET /api/Cost/workshop/{workshopId}/summary
  getWorkshopCostSummary: async (
    workshopId: string
  ): Promise<ModelCostSummary> => {
    return apiRequest(`${API_BASE}/workshop/${workshopId}/summary`);
  },

  // Backward compatibility methods (for existing frontend code)
  getCostCategoryById: async (id: string): Promise<CostCategory> => {
    const categories = await costService.getCostCategories();
    const category = categories.find((cat) => cat.costCategoryId === id);
    if (!category) {
      throw new Error(`Category with id ${id} not found`);
    }
    return category;
  },

  updateCostCategory: async (
    id: string,
    category: CostCategory
  ): Promise<CostCategory> => {
    throw new Error("Category update not supported by backend");
  },

  deleteCostCategory: async (id: string): Promise<void> => {
    throw new Error("Category delete not supported by backend");
  },

  deleteCostSubCategory: async (id: string): Promise<void> => {
    throw new Error("SubCategory delete not supported by backend");
  },

  getCostItemById: async (id: string): Promise<CostItem> => {
    const items = await costService.getCostItems();
    const item = items.find((item) => item.costItemId === id);
    if (!item) {
      throw new Error(`Cost item with id ${id} not found`);
    }
    return item;
  },

  updateCostItem: async (id: string, costItem: CostItem): Promise<CostItem> => {
    throw new Error("Cost item update not supported by backend");
  },

  deleteCostItem: async (id: string): Promise<void> => {
    return apiRequest(`${API_BASE}/items/${id}`, {
      method: "DELETE",
    });
  },

  // Order Workshop Costs - Sipariş için atölyede kullanılan maliyetler
  getOrderWorkshopCosts: async (
    orderId: string,
    workshopId?: string
  ): Promise<OrderWorkshopCost[]> => {
    const url = workshopId
      ? `${API_BASE}/order/${orderId}/workshop/${workshopId}/costs`
      : `${API_BASE}/order/${orderId}/costs`;
    return apiRequest(url);
  },

  addOrderWorkshopCost: async (
    data: Omit<
      OrderWorkshopCost,
      | "orderWorkshopCostId"
      | "createdAt"
      | "createdBy"
      | "updatedAt"
      | "updatedBy"
      | "order"
      | "workshop"
      | "costItem"
    >
  ): Promise<OrderWorkshopCost> => {
    return apiRequest(`${API_BASE}/order/workshop`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    });
  },

  updateOrderWorkshopCost: async (
    id: string,
    data: Partial<OrderWorkshopCost>
  ): Promise<OrderWorkshopCost> => {
    return apiRequest(`${API_BASE}/order/workshop/cost/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    });
  },

  deleteOrderWorkshopCost: async (id: string): Promise<void> => {
    return apiRequest(`${API_BASE}/order/workshop/cost/${id}`, {
      method: "DELETE",
    });
  },
};
