import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useCategoryStore } from "../store/categoryStore";
import { useLocationStore } from "../store/locationStore";
import type { Item } from "../types/item";
import { toDateInputValue } from "../utils/dateUtils";
import { optimizeImageFile } from "../utils/imageUpload";
import { calculateFinalExpireDate } from "../utils/itemCalculations";
import { DatePickerField } from "./DatePickerField";
import { NumberInputField } from "./NumberInputField";

export type ItemFormData = {
  name: string;
  categoryId: string;
  quantity: number;
  unit: string;
  purchaseDate: string;
  shelfLifeDays?: number;
  expireDate?: string;
  totalPrice?: number;
  locationId?: string;
  note?: string;
  brand?: string;
  purchaseChannel?: string;
  openDate?: string;
  afterOpenDays?: number;
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
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(Boolean(initialItem?.brand || initialItem?.note));
  const [form, setForm] = useState<ItemFormData>({
    name: initialItem?.name ?? "",
    categoryId: initialItem?.categoryId ?? categories[0]?.id ?? "other",
    quantity: initialItem?.quantity ?? 1,
    unit: initialItem?.unit ?? "件",
    purchaseDate: initialItem?.purchaseDate ?? toDateInputValue(),
    shelfLifeDays: initialItem?.shelfLifeDays,
    expireDate: initialItem?.expireDate,
    totalPrice: initialItem?.totalPrice,
    locationId: initialItem?.locationId ?? locations[0]?.id,
    note: initialItem?.note,
    brand: initialItem?.brand,
    purchaseChannel: initialItem?.purchaseChannel,
    openDate: initialItem?.openDate,
    afterOpenDays: initialItem?.afterOpenDays,
    imageUrl: initialItem?.imageUrl,
    tags: initialItem?.tags,
  });
  const [tagText, setTagText] = useState(initialItem?.tags?.join(", ") ?? "");
  const [imageError, setImageError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const file = input.files?.[0];
    if (!file) return;

    setImageError(undefined);
    setIsImageProcessing(true);
    try {
      const imageUrl = await optimizeImageFile(file);
      updateField("imageUrl", imageUrl);
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
        purchaseChannel: form.purchaseChannel?.trim() || undefined,
        openDate: form.openDate || undefined,
        imageUrl: form.imageUrl?.trim() || undefined,
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
    <form className="form-stack" onSubmit={handleSubmit}>
      <label className="field">
        <span>物品名称</span>
        <input
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
          placeholder="例如 牛奶、牙膏、感冒药"
          required
        />
      </label>

      <section className="image-upload" aria-label="物品图片">
        <div className="image-upload__header">
          <span>物品图片</span>
          <small>可选</small>
        </div>
        {form.imageUrl ? (
          <img className="image-upload__preview" src={form.imageUrl} alt="物品图片预览" />
        ) : (
          <div className="image-upload__empty">选择一张图片，保存后可在库存和详情中查看</div>
        )}
        <div className="image-upload__actions">
          <label className={isImageProcessing ? "secondary-button is-disabled" : "secondary-button"}>
            {isImageProcessing ? "正在处理..." : form.imageUrl ? "更换图片" : "选择图片"}
            <input
              className="visually-hidden"
              type="file"
              accept="image/*"
              disabled={isImageProcessing}
              onChange={handleImageChange}
            />
          </label>
          {form.imageUrl ? (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                updateField("imageUrl", undefined);
                setImageError(undefined);
              }}
            >
              移除图片
            </button>
          ) : null}
        </div>
        <small className="image-upload__hint">图片会压缩后保存在当前设备，不会自动上传到云端。</small>
        {imageError ? <p className="form-error" role="alert">{imageError}</p> : null}
      </section>

      <div className="field-grid">
        <label className="field">
          <span>分类</span>
          <select value={form.categoryId} onChange={(event) => updateField("categoryId", event.target.value)}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>存放位置</span>
          <select value={form.locationId ?? ""} onChange={(event) => updateField("locationId", event.target.value)}>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="field-grid">
        <NumberInputField
          label="数量"
          value={form.quantity}
          min={0}
          step={0.1}
          required
          onChange={(value) => updateField("quantity", value ?? 0)}
        />
        <label className="field">
          <span>单位</span>
          <input value={form.unit} onChange={(event) => updateField("unit", event.target.value)} required />
        </label>
      </div>

      <DatePickerField
        label="购入日期"
        value={form.purchaseDate}
        required
        onChange={(value) => updateField("purchaseDate", value)}
      />

      <div className="field-grid">
        <NumberInputField
          label="有效期天数"
          value={form.shelfLifeDays}
          min={0}
          onChange={(value) => updateField("shelfLifeDays", value)}
        />
        <DatePickerField label="过期日期" value={form.expireDate} onChange={(value) => updateField("expireDate", value)} />
      </div>

      <NumberInputField
        label="总价格"
        value={form.totalPrice}
        min={0}
        step={0.01}
        onChange={(value) => updateField("totalPrice", value)}
      />

      <div className="expire-preview">
        <span>最终过期日期</span>
        <strong>{finalExpireDate ?? "未设置"}</strong>
      </div>

      <button type="button" className="text-button" onClick={() => setIsAdvancedOpen((open) => !open)}>
        {isAdvancedOpen ? "收起高级字段" : "展开高级字段"}
      </button>

      {isAdvancedOpen ? (
        <div className="advanced-panel">
          <div className="field-grid">
            <label className="field">
              <span>品牌</span>
              <input value={form.brand ?? ""} onChange={(event) => updateField("brand", event.target.value)} />
            </label>
            <label className="field">
              <span>购买渠道</span>
              <input
                value={form.purchaseChannel ?? ""}
                onChange={(event) => updateField("purchaseChannel", event.target.value)}
              />
            </label>
          </div>
          <div className="field-grid">
            <DatePickerField label="开封日期" value={form.openDate} onChange={(value) => updateField("openDate", value)} />
            <NumberInputField
              label="开封后有效天数"
              value={form.afterOpenDays}
              min={0}
              onChange={(value) => updateField("afterOpenDays", value)}
            />
          </div>
          <label className="field">
            <span>网络图片地址</span>
            <input
              value={form.imageUrl?.startsWith("data:") ? "" : form.imageUrl ?? ""}
              onChange={(event) => updateField("imageUrl", event.target.value)}
              placeholder="https://..."
            />
            {form.imageUrl?.startsWith("data:") ? <small>填写网址将替换已选择的本地图片。</small> : null}
          </label>
          <label className="field">
            <span>标签</span>
            <input value={tagText} onChange={(event) => setTagText(event.target.value)} placeholder="逗号分隔" />
          </label>
          <label className="field">
            <span>备注</span>
            <textarea value={form.note ?? ""} onChange={(event) => updateField("note", event.target.value)} rows={3} />
          </label>
        </div>
      ) : null}

      {submitError ? <p className="form-error" role="alert">{submitError}</p> : null}

      <button className="primary-button" type="submit" disabled={isImageProcessing || isSubmitting}>
        {isSubmitting ? "正在保存..." : submitLabel}
      </button>
    </form>
  );
}
