import { useState, type ChangeEvent, type FormEvent } from "react";
import { useCategoryStore } from "../store/categoryStore";
import { useLocationStore } from "../store/locationStore";
import type { RecognitionResult } from "../services/barcodeService";
import { recognizeItemImage } from "../services/imageRecognitionService";
import { optimizeImageFile } from "../utils/imageUpload";
import { MAX_ITEM_IMAGES, normalizeItemImageUrls } from "../utils/itemImages";
import { loadRecentLocationIds, rememberLocationId } from "../services/recentLocationStorage";
import { isAiRecognitionConfigured, loadAiRecognitionConfig } from "../services/aiRecognitionStorage";
import type { ItemMode } from "../types/item";
import { getLocationGroups, getLocationPath } from "../utils/locations";

export type QuickItemFormData = {
  name: string;
  imageUrls: string[];
  categoryId?: string;
  brand?: string;
  model?: string;
  purchaseChannel?: string;
  tags?: string[];
  totalPrice?: number;
  locationId?: string;
  quantity?: number;
  unit?: string;
  mode?: ItemMode;
};

type QuickItemFormProps = {
  onSubmit: (data: QuickItemFormData) => Promise<void>;
  initialData?: Partial<QuickItemFormData>;
};

export function QuickItemForm({ onSubmit, initialData }: QuickItemFormProps) {
  const { categories } = useCategoryStore();
  const { locations } = useLocationStore();
  const [form, setForm] = useState<QuickItemFormData>({ name: "", imageUrls: [], mode: "regular", ...initialData });
  const [suggestion, setSuggestion] = useState<RecognitionResult>();
  const [isSuggestionApplied, setIsSuggestionApplied] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const activeLocations = locations
    .filter((location) => !location.isArchived)
    .sort((left, right) => (left.sortOrder ?? 999) - (right.sortOrder ?? 999) || left.name.localeCompare(right.name));
  const locationGroups = getLocationGroups(locations);
  const aiConfig = loadAiRecognitionConfig();
  const aiEnabled = isAiRecognitionConfigured(aiConfig);
  const recentLocationIds = loadRecentLocationIds();
  const quickLocations = recentLocationIds
    .map((id) => activeLocations.find((location) => location.id === id))
    .filter((location): location is (typeof activeLocations)[number] => Boolean(location));

  function selectLocation(locationId: string) {
    setForm((current) => ({ ...current, locationId: locationId || undefined }));
    if (locationId) rememberLocationId(locationId);
  }

  async function handleRegularImages(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    const available = MAX_ITEM_IMAGES - form.imageUrls.length;
    if (files.length > available) {
      setMessage(`最多上传 ${MAX_ITEM_IMAGES} 张图片，当前还可添加 ${available} 张。`);
      input.value = "";
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const imageUrls = await Promise.all(files.map(optimizeImageFile));
      setForm((current) => ({
        ...current,
        imageUrls: normalizeItemImageUrls([...current.imageUrls, ...imageUrls]),
      }));
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "图片处理失败，请重试。");
    } finally {
      setBusy(false);
      input.value = "";
    }
  }

  async function handleRecognitionImage(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (form.imageUrls.length >= MAX_ITEM_IMAGES) {
      setMessage("已达到 5 张图片上限，删除一张后再拍照识别。");
      input.value = "";
      return;
    }
    setBusy(true);
    setMessage("正在分析图片，识别结果不会自动保存。");
    setSuggestion(undefined);
    setIsSuggestionApplied(false);
    try {
      const imageUrl = await optimizeImageFile(file);
      setForm((current) => ({
        ...current,
        imageUrls: normalizeItemImageUrls([...current.imageUrls, imageUrl]),
      }));
      const result = await recognizeItemImage(imageUrl, categories);
      if (!Object.values(result).some((value) => value !== undefined)) {
        setMessage("没有识别到可靠信息，请换一张清晰图片或手动填写。");
      } else {
        setSuggestion(result);
        setMessage("识别完成，请确认后再应用到草稿。");
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "AI 识别失败，图片已保留。");
    } finally {
      setBusy(false);
      input.value = "";
    }
  }

  function applySuggestion() {
    if (!suggestion) return;
    setForm((current) => ({
      ...current,
      name: suggestion.name ?? current.name,
      categoryId: suggestion.categoryId ?? current.categoryId,
      brand: suggestion.brand ?? current.brand,
      model: suggestion.model ?? current.model,
      purchaseChannel: suggestion.purchaseChannel ?? current.purchaseChannel,
      tags: suggestion.tags ?? current.tags,
      totalPrice: suggestion.totalPrice ?? current.totalPrice,
    }));
    setIsSuggestionApplied(true);
    setMessage("已应用到草稿；你仍可修改名称，点击创建后才会入库。");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy || submitting) return;
    setSubmitting(true);
    setMessage("");
    try {
      await onSubmit({ ...form, name: form.name.trim() });
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "保存失败，请重试。");
      setSubmitting(false);
    }
  }

  return (
    <form className="form-stack quick-create" onSubmit={handleSubmit}>
      <section className="form-section">
        <div className="form-section__title">
          <div>
            <h2>名称和位置</h2>
            <span>10 秒记下来，其他资料以后再补</span>
          </div>
        </div>
        <label className="field">
          <span>物品名称</span>
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="例如 AirPods Pro"
            required
          />
        </label>
        <div className="quick-location-field">
          <div className="quick-location-field__title">
            <span>放在哪里</span>
            <small>可跳过，稍后会提醒完善</small>
          </div>
          {quickLocations.length ? (
            <div className="quick-location-chips" aria-label="最近使用的位置">
              {quickLocations.map((location) => (
                <button
                  key={location.id}
                  type="button"
                  className={form.locationId === location.id ? "is-active" : ""}
                  onClick={() => selectLocation(location.id)}
                >
                  {getLocationPath(locations, location.id)}
                </button>
              ))}
            </div>
          ) : null}
          <select value={form.locationId ?? ""} onChange={(event) => selectLocation(event.target.value)} aria-label="存放位置">
            <option value="">暂不设置，加入待归位</option>
            {locationGroups.map(({ area, containers }) => (
              <optgroup key={area.id} label={area.name}>
                <option value={area.id}>{area.name}</option>
                {containers.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      </section>

      <details className="quick-extras">
        <summary>
          <span><strong>{aiEnabled ? "照片与智能识别" : "照片与更多选项"}</strong><small>{form.imageUrls.length ? `已添加 ${form.imageUrls.length} 张` : "可选"}</small></span>
        </summary>
        <div className="quick-extras__body">
          {aiEnabled ? <div className="quick-extras__intro">
            <strong>拍照自动填写</strong>
            <span>识别结果只会填入草稿，由你确认后保存。</span>
          </div> : null}
          {aiEnabled ? <div className="ai-recognition-actions">
            <label className={busy ? "primary-button is-disabled" : "primary-button"}>
              {busy ? "正在识别..." : "拍照识别"}
              <input
                className="visually-hidden"
                type="file"
                accept="image/*"
                capture="environment"
                disabled={busy}
                onChange={handleRecognitionImage}
              />
            </label>
            <label className={busy ? "secondary-button is-disabled" : "secondary-button"}>
              从相册识别
              <input
                className="visually-hidden"
                type="file"
                accept="image/*"
                disabled={busy}
                onChange={handleRecognitionImage}
              />
            </label>
          </div> : null}
          {suggestion ? (
            <div className="ai-suggestion">
              <div className="ai-suggestion__fields">
                {suggestion.name ? <Suggestion label="名称" value={suggestion.name} /> : null}
                {suggestion.brand ? <Suggestion label="品牌" value={suggestion.brand} /> : null}
                {suggestion.model ? <Suggestion label="型号" value={suggestion.model} /> : null}
                {suggestion.categoryId ? (
                  <Suggestion
                    label="分类"
                    value={categories.find((category) => category.id === suggestion.categoryId)?.name ?? suggestion.categoryId}
                  />
                ) : null}
                {suggestion.purchaseChannel ? <Suggestion label="渠道" value={suggestion.purchaseChannel} /> : null}
                {suggestion.totalPrice !== undefined ? <Suggestion label="参考价格" value={`¥${suggestion.totalPrice}`} /> : null}
                {suggestion.tags?.length ? <Suggestion label="标签" value={suggestion.tags.join("、")} /> : null}
              </div>
              <button className="secondary-button" type="button" onClick={applySuggestion} disabled={isSuggestionApplied}>
                {isSuggestionApplied ? "已应用到草稿" : "确认并应用识别结果"}
              </button>
            </div>
          ) : null}

          <section className="image-upload" aria-label="物品图片（可选）">
            <div className="image-upload__header">
              <span>物品图片</span>
              <small>{form.imageUrls.length}/{MAX_ITEM_IMAGES}</small>
            </div>
            {form.imageUrls.length ? (
              <div className="image-upload__grid">
                {form.imageUrls.map((imageUrl, index) => (
                  <div className="image-upload__item" key={`${imageUrl}-${index}`}>
                    <img src={imageUrl} alt={`物品图片预览 ${index + 1}`} />
                    <button
                      type="button"
                      aria-label={`删除第 ${index + 1} 张图片`}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          imageUrls: current.imageUrls.filter((_, imageIndex) => imageIndex !== index),
                        }))
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            {form.imageUrls.length < MAX_ITEM_IMAGES ? (
              <label className={busy ? "secondary-button is-disabled" : "secondary-button"}>
                ＋ 添加普通图片
                <input
                  className="visually-hidden"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={busy}
                  onChange={handleRegularImages}
                />
              </label>
            ) : (
              <p className="image-upload__limit">已达到 5 张上限，删除图片后可继续添加。</p>
            )}
          </section>
          <label className="privacy-toggle quick-mode-toggle">
            <input
              type="checkbox"
              checked={form.mode === "consumable"}
              onChange={(event) => setForm((current) => ({ ...current, mode: event.target.checked ? "consumable" : "regular" }))}
            />
            <span>
              <strong>按消耗品管理</strong>
              <small>开启后可记录数量、补充、用完和到期提醒。</small>
            </span>
          </label>
        </div>
      </details>

      {message ? <p className={suggestion ? "form-message" : "form-message"} role="status">{message}</p> : null}
      <button className="primary-button" type="submit" disabled={busy || submitting}>
        {submitting ? "正在保存..." : "保存物品"}
      </button>
      <small className="quick-create__skip">保存后可继续完善分类、价格和提醒。</small>
    </form>
  );
}

function Suggestion({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <b>{label}</b>
      {value}
    </span>
  );
}
