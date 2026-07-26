import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useCategoryStore } from "../store/categoryStore";
import { useLocationStore } from "../store/locationStore";
import type { Item } from "../types/item";
import { toDateInputValue } from "../utils/dateUtils";
import { optimizeImageFile } from "../utils/imageUpload";
import { getItemImageUrls, MAX_ITEM_IMAGES, normalizeItemImageUrls } from "../utils/itemImages";
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
    imageUrls: initialItem ? getItemImageUrls(initialItem) : [],
    tags: initialItem?.tags,
  });
  const [tagText, setTagText] = useState(initialItem?.tags?.join(", ") ?? "");
  const [networkImageUrl, setNetworkImageUrl] = useState("");
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

  function handleAddNetworkImage() {
    const imageUrl = networkImageUrl.trim();
    if (!imageUrl) return;
    if ((form.imageUrls?.length ?? 0) >= MAX_ITEM_IMAGES) {
      setImageError(`单个物品最多上传 ${MAX_ITEM_IMAGES} 张图片。`);
      return;
    }

    try {
      const parsedUrl = new URL(imageUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error();
    } catch {
      setImageError("请输入以 http:// 或 https:// 开头的有效图片网址。");
      return;
    }

    updateField("imageUrls", normalizeItemImageUrls([...(form.imageUrls ?? []), imageUrl]));
    setNetworkImageUrl("");
    setImageError(undefined);
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
            <span>标签</span>
            <input value={tagText} onChange={(event) => setTagText(event.target.value)} placeholder="逗号分隔" />
          </label>
          <label className="field">
            <span>备注</span>
            <textarea value={form.note ?? ""} onChange={(event) => updateField("note", event.target.value)} rows={3} />
          </label>
        </div>
      ) : null}

      <section className="image-upload" aria-label="物品图片（可选）">
        <div className="image-upload__header">
          <span>物品图片</span>
          <small>可选 · {form.imageUrls?.length ?? 0}/{MAX_ITEM_IMAGES}</small>
        </div>

        {form.imageUrls?.length ? (
          <div className="image-upload__grid">
            {form.imageUrls.map((imageUrl, index) => (
              <div className="image-upload__item" key={`${imageUrl}-${index}`}>
                <img src={imageUrl} alt={`物品图片预览 ${index + 1}`} />
                <button
                  type="button"
                  aria-label={`删除第 ${index + 1} 张图片`}
                  onClick={() => {
                    updateField(
                      "imageUrls",
                      form.imageUrls?.filter((_, imageIndex) => imageIndex !== index),
                    );
                    setImageError(undefined);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="image-upload__empty">无需上传图片也可以保存物品</div>
        )}

        {(form.imageUrls?.length ?? 0) < MAX_ITEM_IMAGES ? (
          <>
            <div className="image-upload__actions">
              <label className={isImageProcessing ? "secondary-button is-disabled" : "secondary-button"}>
                {isImageProcessing ? "正在处理..." : "＋ 添加图片"}
                <input
                  className="visually-hidden"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isImageProcessing}
                  onChange={handleImageChange}
                />
              </label>
              <small>可一次选择多张</small>
            </div>
            <div className="image-upload__url">
              <input
                type="text"
                inputMode="url"
                value={networkImageUrl}
                onChange={(event) => setNetworkImageUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  handleAddNetworkImage();
                }}
                placeholder="或粘贴图片网址 https://..."
                aria-label="网络图片地址"
              />
              <button type="button" onClick={handleAddNetworkImage} disabled={!networkImageUrl.trim()}>
                添加网址
              </button>
            </div>
          </>
        ) : (
          <p className="image-upload__limit">已达到 5 张上限，删除图片后可继续添加。</p>
        )}

        <small className="image-upload__hint">本地图片会压缩后保存在当前设备，不会自动上传到云端。</small>
        {imageError ? <p className="form-error" role="alert">{imageError}</p> : null}
      </section>

      {submitError ? <p className="form-error" role="alert">{submitError}</p> : null}

      <button className="primary-button" type="submit" disabled={isImageProcessing || isSubmitting}>
        {isSubmitting ? "正在保存..." : submitLabel}
      </button>
    </form>
  );
}
