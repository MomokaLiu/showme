import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useCategoryStore } from "../store/categoryStore";
import { useLocationStore } from "../store/locationStore";
import type { Item, ItemMode } from "../types/item";
import { optimizeImageFile } from "../utils/imageUpload";
import { getItemImageUrls, MAX_ITEM_IMAGES, normalizeItemImageUrls } from "../utils/itemImages";
import { calculateFinalExpireDate } from "../utils/itemCalculations";
import { DatePickerField } from "./DatePickerField";
import { NumberInputField } from "./NumberInputField";
import { getLocationGroups, getLocationPath } from "../utils/locations";

export type ItemFormData = {
  name: string;
  mode: ItemMode;
  categoryId: string;
  quantity: number;
  unit: string;
  purchaseDate?: string;
  shelfLifeDays?: number;
  expireDate?: string;
  totalPrice?: number;
  locationId?: string;
  note?: string;
  brand?: string;
  model?: string;
  purchaseChannel?: string;
  isPrivate?: boolean;
  status?: Item["status"];
  openDate?: string;
  afterOpenDays?: number;
  expiryReminderEnabled?: boolean;
  expiryReminderDays?: number;
  imageUrls?: string[];
  /** Clears the legacy single-image field when an existing item is saved. */
  imageUrl?: string;
  tags?: string[];
};

type ItemFormProps = {
  initialItem?: Item;
  submitLabel: string;
  onSubmit: (data: ItemFormData) => Promise<void> | void;
};

export function ItemForm({ initialItem, submitLabel, onSubmit }: ItemFormProps) {
  const { categories } = useCategoryStore();
  const { locations } = useLocationStore();
  const [form, setForm] = useState<ItemFormData>({
    name: initialItem?.name ?? "",
    mode: initialItem?.mode ?? "regular",
    categoryId: initialItem?.categoryId ?? categories[0]?.id ?? "other",
    quantity: initialItem?.quantity ?? 1,
    unit: initialItem?.unit ?? "件",
    purchaseDate: initialItem?.purchaseDate,
    shelfLifeDays: initialItem?.shelfLifeDays,
    expireDate: initialItem?.expireDate,
    totalPrice: initialItem?.totalPrice,
    locationId: initialItem?.locationId,
    note: initialItem?.note,
    brand: initialItem?.brand,
    model: initialItem?.model,
    purchaseChannel: initialItem?.purchaseChannel,
    isPrivate: initialItem?.isPrivate ?? false,
    status: initialItem?.status ?? "normal",
    openDate: initialItem?.openDate,
    afterOpenDays: initialItem?.afterOpenDays,
    expiryReminderEnabled: initialItem?.expiryReminderEnabled ?? Boolean(initialItem?.finalExpireDate),
    expiryReminderDays: initialItem?.expiryReminderDays ?? 7,
    imageUrls: initialItem ? getItemImageUrls(initialItem) : [],
    tags: initialItem?.tags,
  });
  const [tagText, setTagText] = useState(initialItem?.tags?.join(", ") ?? "");
  const [imageError, setImageError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const locationGroups = getLocationGroups(locations);
  const isConsumable = form.mode === "consumable";
  const categorySummary = categories.find((category) => category.id === form.categoryId)?.name ?? "未分类";
  const locationSummary = form.locationId ? getLocationPath(locations, form.locationId) : "待归位";

  const finalExpireDate = useMemo(() => {
    const previewItem = {
      id: "preview",
      ...form,
      initialQuantity: initialItem?.initialQuantity ?? form.quantity,
      status: initialItem?.status ?? "normal",
      createdAt: initialItem?.createdAt ?? "",
      updatedAt: initialItem?.updatedAt ?? "",
      tags: tagText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    } satisfies Item;
    return calculateFinalExpireDate(previewItem);
  }, [form, initialItem, tagText]);

  function updateField<Key extends keyof ItemFormData>(key: Key, value: ItemFormData[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;

    const availableSlots = MAX_ITEM_IMAGES - (form.imageUrls?.length ?? 0);
    if (files.length > availableSlots) {
      setImageError(`单个物品最多上传 ${MAX_ITEM_IMAGES} 张图片，当前还可添加 ${availableSlots} 张。`);
      input.value = "";
      return;
    }

    setImageError(undefined);
    setIsImageProcessing(true);
    try {
      const imageUrls = await Promise.all(files.map((file) => optimizeImageFile(file)));
      setForm((current) => ({
        ...current,
        imageUrls: normalizeItemImageUrls([...(current.imageUrls ?? []), ...imageUrls]),
      }));
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "图片处理失败，请重新选择。");
    } finally {
      setIsImageProcessing(false);
      input.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isImageProcessing || isSubmitting) return;
    setSubmitError(undefined);
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        unit: form.unit.trim() || "件",
        locationId: form.locationId || undefined,
        expireDate: form.expireDate || undefined,
        note: form.note?.trim() || undefined,
        brand: form.brand?.trim() || undefined,
        model: form.model?.trim() || undefined,
        purchaseChannel: form.purchaseChannel?.trim() || undefined,
        openDate: form.openDate || undefined,
        imageUrls: normalizeItemImageUrls(form.imageUrls ?? []),
        imageUrl: undefined,
        tags: tagText
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
    } catch {
      setSubmitError("保存失败，本机存储空间可能不足。请移除图片或更换较小的图片后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-stack item-edit-form" onSubmit={handleSubmit}>
      <details className="item-edit-details item-edit-core item-edit-core-details">
        <summary><span><strong>{form.name || "未命名物品"}</strong><small>{locationSummary} · {categorySummary}</small></span><DisclosureChevron /></summary>
        <div className="item-edit-details__body">
          <label className="field"><span>物品名称</span><input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="例如 AirPods Pro" required /></label>
          <div className="field-grid item-edit-core-grid">
            <label className="field"><span>存放位置</span><select value={form.locationId ?? ""} onChange={(event) => updateField("locationId", event.target.value)}><option value="">未设置 · 加入待归位</option>{locationGroups.map(({ area, containers }) => <optgroup key={area.id} label={area.name}><option value={area.id}>{area.name}</option>{containers.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</optgroup>)}</select></label>
            <label className="field"><span>分类</span><select value={form.categoryId} onChange={(event) => updateField("categoryId", event.target.value)}>{categories.filter((category) => !category.isArchived || category.id === form.categoryId).sort((left, right) => (left.sortOrder ?? 999) - (right.sortOrder ?? 999) || left.name.localeCompare(right.name)).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          </div>
          <label className="item-edit-choice single-check-option"><input type="checkbox" checked={isConsumable} onChange={(event) => updateField("mode", event.target.checked ? "consumable" : "regular")} /><span><strong>消耗品</strong><small>记录数量、补充和到期提醒</small></span></label>
          {isConsumable ? <div className="field-grid item-edit-consumable-row"><NumberInputField label="数量" value={form.quantity} min={0} step={0.1} required onChange={(value) => updateField("quantity", value ?? 0)} /><label className="field"><span>单位</span><input value={form.unit} onChange={(event) => updateField("unit", event.target.value)} required /></label><label className="field"><span>状态</span><select value={form.status ?? "normal"} onChange={(event) => updateField("status", event.target.value as Item["status"])}><option value="normal">正常</option><option value="long_term">长期保存</option><option value="finished">已用完</option><option value="discarded">已丢弃</option><option value="transferred">已转让</option></select></label></div> : null}
        </div>
      </details>

      <section className="form-section item-edit-purchase">
        <div className="form-section__title item-edit-purchase__title"><div><span>重点补充</span><h2>品牌与购买</h2><small>完善这些信息，之后查找和整理会更方便</small></div></div>
        <div className="field-grid item-edit-purchase__grid"><label className="field"><span>品牌</span><input value={form.brand ?? ""} onChange={(event) => updateField("brand", event.target.value)} placeholder="例如 Apple、小米" /></label><label className="field"><span>型号</span><input value={form.model ?? ""} onChange={(event) => updateField("model", event.target.value)} placeholder="例如 A2698" /></label></div>
        <div className="field-grid item-edit-purchase__grid"><NumberInputField label="购买价格" value={form.totalPrice} min={0} step={0.01} onChange={(value) => updateField("totalPrice", value)} /><DatePickerField label="购买日期" value={form.purchaseDate} onChange={(value) => updateField("purchaseDate", value || undefined)} /></div>
        <label className="field"><span>购买渠道</span><input value={form.purchaseChannel ?? ""} onChange={(event) => updateField("purchaseChannel", event.target.value)} placeholder="例如 京东、线下门店" /></label>
      </section>

      <details className="item-edit-details">
        <summary><span><strong>标签、备注与隐私</strong><small>{tagText || form.note || form.isPrivate ? "已有信息" : "可选"}</small></span><DisclosureChevron /></summary>
        <div className="item-edit-details__body">
          <label className="field"><span>标签</span><input value={tagText} onChange={(event) => setTagText(event.target.value)} placeholder="旅行、办公、收藏（逗号分隔）" /></label>
          <label className="field"><span>备注</span><textarea value={form.note ?? ""} onChange={(event) => updateField("note", event.target.value)} rows={3} placeholder="补充保养、保修或使用说明" /></label>
          <label className="item-edit-choice single-check-option"><input type="checkbox" checked={form.isPrivate ?? false} onChange={(event) => updateField("isPrivate", event.target.checked)} /><span><strong>私密物品</strong><small>仅在验证后的私密库存中查看</small></span></label>
        </div>
      </details>

      {isConsumable ? <details className="item-edit-details">
        <summary><span><strong>保质期与提醒</strong><small>{finalExpireDate ?? "按需填写"}</small></span><DisclosureChevron /></summary>
        <div className="item-edit-details__body advanced-panel">
          <div className="field-grid"><NumberInputField label="有效期天数" value={form.shelfLifeDays} min={0} onChange={(value) => updateField("shelfLifeDays", value)} /><DatePickerField label="过期日期" value={form.expireDate} onChange={(value) => updateField("expireDate", value)} /></div>
          <div className="field-grid"><DatePickerField label="开封日期" value={form.openDate} onChange={(value) => updateField("openDate", value)} /><NumberInputField label="开封后有效天数" value={form.afterOpenDays} min={0} onChange={(value) => updateField("afterOpenDays", value)} /></div>
          <div className="expire-preview"><span>最终过期日期</span><strong>{finalExpireDate ?? "未设置"}</strong></div>
          <label className="item-edit-choice single-check-option reminder-toggle"><input type="checkbox" checked={form.expiryReminderEnabled ?? false} onChange={(event) => updateField("expiryReminderEnabled", event.target.checked)} /><span><strong>开启到期提醒</strong><small>按设定天数发送设备通知。</small></span></label>
          {form.expiryReminderEnabled ? <NumberInputField label="提前提醒天数" value={form.expiryReminderDays} min={0} onChange={(value) => updateField("expiryReminderDays", value ?? 7)} /> : null}
        </div>
      </details> : null}

      <details className="item-edit-details item-edit-details--images">
        <summary><span><strong>物品图片</strong><small>{form.imageUrls?.length ?? 0}/{MAX_ITEM_IMAGES}</small></span><DisclosureChevron /></summary>
        <div className="item-edit-details__body item-edit-image-workspace">
          {form.imageUrls?.length ? <div className="image-upload__grid">{form.imageUrls.map((imageUrl, index) => <div className="image-upload__item" key={`${imageUrl}-${index}`}><img src={imageUrl} alt={`物品图片预览 ${index + 1}`} /><button type="button" aria-label={`删除第 ${index + 1} 张图片`} onClick={() => { updateField("imageUrls", form.imageUrls?.filter((_, imageIndex) => imageIndex !== index)); setImageError(undefined); }}>×</button></div>)}</div> : null}
          {(form.imageUrls?.length ?? 0) < MAX_ITEM_IMAGES ? <label className={isImageProcessing ? "item-edit-image-picker is-disabled" : "item-edit-image-picker"}><span className="item-edit-image-picker__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 8.5h3l1.5-2h7l1.5 2h3v10H4Z" /><circle cx="12" cy="13.5" r="3.2" /></svg></span><span><strong>{isImageProcessing ? "正在处理图片" : form.imageUrls?.length ? "继续添加图片" : "选择物品图片"}</strong><small>可一次选择多张，最多 5 张</small></span><input className="visually-hidden" type="file" accept="image/*" multiple disabled={isImageProcessing} onChange={handleImageChange} /></label> : <p className="image-upload__limit">已达到 5 张上限。</p>}
          <small className="image-upload__hint">图片压缩后仅保存在当前设备。</small>
          {imageError ? <p className="form-error" role="alert">{imageError}</p> : null}
        </div>
      </details>

      {submitError ? <p className="form-error" role="alert">{submitError}</p> : null}
      <button className="primary-button item-edit-save" type="submit" disabled={isImageProcessing || isSubmitting}>{isSubmitting ? "正在保存..." : submitLabel}</button>
    </form>
  );
}

function DisclosureChevron() {
  return <b className="item-edit-disclosure" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="m5 7.5 5 5 5-5" /></svg></b>;
}
