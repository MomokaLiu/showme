import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useCategoryStore } from "../store/categoryStore";
import { useLocationStore } from "../store/locationStore";
import type { Item } from "../types/item";
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
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(
    Boolean(initialItem?.shelfLifeDays || initialItem?.expireDate || initialItem?.openDate),
  );
  const [form, setForm] = useState<ItemFormData>({
    name: initialItem?.name ?? "",
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
    <form className="form-stack" onSubmit={handleSubmit}>
      <section className="form-section">
        <div className="form-section__title">
          <div>
            <span>基础信息</span>
            <h2>这是什么物品</h2>
          </div>
        </div>
        <label className="field">
          <span>物品名称</span>
          <input
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="例如 AirPods Pro"
            required
          />
        </label>
        <div className="field-grid">
          <label className="field">
            <span>分类</span>
            <select value={form.categoryId} onChange={(event) => updateField("categoryId", event.target.value)}>
              {categories.filter((category) => !category.isArchived || category.id === form.categoryId).sort((left, right) => (left.sortOrder ?? 999) - (right.sortOrder ?? 999) || left.name.localeCompare(right.name)).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>品牌</span>
            <input
              value={form.brand ?? ""}
              onChange={(event) => updateField("brand", event.target.value)}
              placeholder="例如 Apple、Nike、小米"
            />
          </label>
        </div>
        <label className="field">
          <span>型号</span>
          <input
            value={form.model ?? ""}
            onChange={(event) => updateField("model", event.target.value)}
            placeholder="例如 A2698、WH-1000XM5"
          />
        </label>
      </section>

      <section className="form-section">
        <div className="form-section__title">
          <div>
            <span>购买信息</span>
            <h2>记录价格和来源</h2>
          </div>
          <small>均可选</small>
        </div>
        <div className="field-grid">
          <NumberInputField
            label="购买价格"
            value={form.totalPrice}
            min={0}
            step={0.01}
            onChange={(value) => updateField("totalPrice", value)}
          />
          <DatePickerField
            label="购买日期"
            value={form.purchaseDate}
            onChange={(value) => updateField("purchaseDate", value || undefined)}
          />
        </div>
        <label className="field">
          <span>购买渠道</span>
          <input
            value={form.purchaseChannel ?? ""}
            onChange={(event) => updateField("purchaseChannel", event.target.value)}
            placeholder="例如 淘宝、京东、线下门店、朋友转让"
          />
        </label>
      </section>

      <section className="form-section">
        <div className="form-section__title">
          <div>
            <span>管理信息</span>
            <h2>数量、位置与状态</h2>
          </div>
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
        <div className="field-grid">
          <label className="field">
            <span>存放位置</span>
            <select value={form.locationId ?? ""} onChange={(event) => updateField("locationId", event.target.value)}>
              <option value="">未设置</option>
              {locations.filter((location) => !location.isArchived || location.id === form.locationId).sort((left, right) => (left.sortOrder ?? 999) - (right.sortOrder ?? 999) || left.name.localeCompare(right.name)).map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>状态</span>
            <select
              value={form.status ?? "normal"}
              onChange={(event) => updateField("status", event.target.value as Item["status"])}
            >
              <option value="normal">正常</option>
              <option value="long_term">长期保存</option>
              <option value="finished">已用完</option>
              <option value="discarded">已丢弃</option>
              <option value="transferred">已转让</option>
            </select>
          </label>
        </div>
        <label className="field">
          <span>标签</span>
          <input
            value={tagText}
            onChange={(event) => setTagText(event.target.value)}
            placeholder="例如 电子产品、旅行、办公、收藏（逗号分隔）"
          />
        </label>
        <label className="privacy-toggle">
          <input
            type="checkbox"
            checked={form.isPrivate ?? false}
            onChange={(event) => updateField("isPrivate", event.target.checked)}
          />
          <span>
            <strong>设为私密物品</strong>
            <small>从普通库存隐藏，只能在验证后的私密库存查看。</small>
          </span>
        </label>
        <label className="field">
          <span>备注</span>
          <textarea
            value={form.note ?? ""}
            onChange={(event) => updateField("note", event.target.value)}
            rows={3}
            placeholder="补充保养、保修或使用说明"
          />
        </label>
      </section>

      <section className="form-section">
        <button type="button" className="form-section__toggle" onClick={() => setIsAdvancedOpen((open) => !open)}>
          <span>
            <b>保质期与开封信息</b>
            <small>食品、药品等需要时再填写</small>
          </span>
          <strong aria-hidden="true">{isAdvancedOpen ? "−" : "＋"}</strong>
        </button>
        {isAdvancedOpen ? (
          <div className="advanced-panel">
            <div className="field-grid">
              <NumberInputField
                label="有效期天数"
                value={form.shelfLifeDays}
                min={0}
                onChange={(value) => updateField("shelfLifeDays", value)}
              />
              <DatePickerField
                label="过期日期"
                value={form.expireDate}
                onChange={(value) => updateField("expireDate", value)}
              />
            </div>
            <div className="field-grid">
              <DatePickerField
                label="开封日期"
                value={form.openDate}
                onChange={(value) => updateField("openDate", value)}
              />
              <NumberInputField
                label="开封后有效天数"
                value={form.afterOpenDays}
                min={0}
                onChange={(value) => updateField("afterOpenDays", value)}
              />
            </div>
            <div className="expire-preview">
              <span>最终过期日期</span>
              <strong>{finalExpireDate ?? "未设置"}</strong>
            </div>
            <label className="privacy-toggle reminder-toggle">
              <input
                type="checkbox"
                checked={form.expiryReminderEnabled ?? false}
                onChange={(event) => updateField("expiryReminderEnabled", event.target.checked)}
              />
              <span>
                <strong>开启到期提醒</strong>
                <small>Android 通知权限开启后，会按下方天数提醒。</small>
              </span>
            </label>
            {form.expiryReminderEnabled ? (
              <NumberInputField
                label="提前提醒天数"
                value={form.expiryReminderDays}
                min={0}
                onChange={(value) => updateField("expiryReminderDays", value ?? 7)}
              />
            ) : null}
          </div>
        ) : null}
      </section>

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
