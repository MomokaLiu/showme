import { useMemo, useState } from "react";
import { QuickItemForm, type QuickItemFormData } from "../../components/QuickItemForm";
import { useInventoryStore } from "../../store/itemStore";
import type { ShoppingItem } from "../../types/shopping";
import { navigate } from "../router";

const CONVERSION_STORAGE_KEY = "buwangwu.shoppingConversion";

export default function NewItemPage() {
  const { createItem, completeShoppingConversion } = useInventoryStore();
  const [createdItemId, setCreatedItemId] = useState<string>();
  const [batchLocationId, setBatchLocationId] = useState<string>();
  const [formVersion, setFormVersion] = useState(0);
  const conversion = useMemo(loadShoppingConversion, [formVersion]);
  const queryName = useMemo(() => {
    const [, query = ""] = window.location.hash.split("?", 2);
    return new URLSearchParams(query).get("name") ?? "";
  }, [formVersion]);
  const queryLocationId = useMemo(() => {
    const [, query = ""] = window.location.hash.split("?", 2);
    return new URLSearchParams(query).get("location") ?? undefined;
  }, [formVersion]);

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
    setBatchLocationId(data.locationId);
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
        <div className="success-mark" aria-hidden="true">✓</div>
        <h2>已经记下来了</h2>
        <p>位置已经记住；价格、图片和其他资料随时再补充。</p>
        <button className="primary-button" type="button" onClick={() => navigate("/")}>完成并去找东西</button>
        <button className="secondary-button" type="button" onClick={() => navigate(`/items/edit/${createdItemId}`)}>继续完善资料</button>
        <button type="button" className="text-button" onClick={() => { setCreatedItemId(undefined); setFormVersion((value) => value + 1); }}>
          {batchLocationId ? "继续在这个位置添加" : "再记一件"}
        </button>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <QuickItemForm
        key={formVersion}
        initialData={{
          name: conversion?.name ?? queryName,
          locationId: batchLocationId ?? queryLocationId,
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
