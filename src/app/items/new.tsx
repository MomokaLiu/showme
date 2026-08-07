import { useMemo, useState } from "react";
import { QuickItemForm, type QuickItemFormData } from "../../components/QuickItemForm";
import { useInventoryStore } from "../../store/itemStore";
import type { ShoppingItem } from "../../types/shopping";
import { navigate } from "../router";

const CONVERSION_STORAGE_KEY = "buwangwu.shoppingConversion";

export default function NewItemPage() {
  const { createItem, completeShoppingConversion } = useInventoryStore();
  const [createdItemId, setCreatedItemId] = useState<string>();
  const conversion = useMemo(loadShoppingConversion, []);
  const queryName = useMemo(() => {
    const [, query = ""] = window.location.hash.split("?", 2);
    return new URLSearchParams(query).get("name") ?? "";
  }, []);
  const queryLocationId = useMemo(() => {
    const [, query = ""] = window.location.hash.split("?", 2);
    return new URLSearchParams(query).get("location") ?? undefined;
  }, []);

  async function handleSubmit(data: QuickItemFormData) {
    const quantity = data.quantity ?? conversion?.quantity ?? 1;
    const id = await createItem({
      name: data.name,
      mode: data.mode ?? (conversion ? "consumable" : "regular"),
      imageUrls: data.imageUrls,
      categoryId: data.categoryId ?? "other",
      locationId: data.locationId,
      quantity,
      initialQuantity: quantity,
      unit: data.unit ?? conversion?.unit ?? "件",
      brand: data.brand,
      model: data.model,
      purchaseChannel: data.purchaseChannel,
      tags: data.tags,
      totalPrice: data.totalPrice ?? conversion?.estimatedPrice,
    });
    window.sessionStorage.setItem("buwangwu.quickCreatedItemId", id);
    if (conversion) {
      await completeShoppingConversion(conversion.id, id);
      window.sessionStorage.removeItem(CONVERSION_STORAGE_KEY);
    }
    setCreatedItemId(id);
  }

  if (createdItemId) {
    return (
      <div className="page-stack quick-create-success">
        <section className="quick-create-success__card">
          <span className="success-mark" aria-hidden="true">✓</span>
          <div><small>保存成功</small><h2>已经记下</h2></div>
        </section>
        <button className="primary-button" type="button" onClick={() => navigate(`/items/edit/${createdItemId}`)}>完善资料</button>
        <button className="quick-create-success__search" type="button" onClick={() => navigate("/search")}>去找东西</button>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <QuickItemForm
        initialData={{
          name: conversion?.name ?? queryName,
          locationId: queryLocationId,
          quantity: conversion?.quantity,
          unit: conversion?.unit,
          totalPrice: conversion?.estimatedPrice,
          mode: conversion ? "consumable" : "regular",
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function loadShoppingConversion(): ShoppingItem | undefined {
  try {
    const raw = window.sessionStorage.getItem(CONVERSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) as ShoppingItem : undefined;
  } catch {
    return undefined;
  }
}
