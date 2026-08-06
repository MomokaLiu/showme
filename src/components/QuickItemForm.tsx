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
import { getLocationSymbol } from "../utils/locationPresentation";

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
  const [step, setStep] = useState<1 | 2>(1);
  const [aiOpen, setAiOpen] = useState(false);
  const [showModeHelp, setShowModeHelp] = useState(false);
  const [suggestion, setSuggestion] = useState<RecognitionResult>();
  const [isSuggestionApplied, setIsSuggestionApplied] = useState(false);
  const [message, setMessage] = useState("");
  const [processingImages, setProcessingImages] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
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
  const selectedLocation = activeLocations.find((location) => location.id === form.locationId);
  const locationOptions = [
    ...(selectedLocation ? [selectedLocation] : []),
    ...quickLocations,
    ...activeLocations.filter((location) => !location.parentId),
  ].filter((location, index, source) => source.findIndex((candidate) => candidate.id === location.id) === index).slice(0, 8);
  const busy = processingImages || recognizing;

  function selectLocation(locationId: string) {
    setForm((current) => ({ ...current, locationId: locationId || undefined }));
    if (locationId) rememberLocationId(locationId);
  }

  function resetFlowViewport() {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.requestAnimationFrame(() => window.scrollTo({ top: 0 }));
  }

  function goToLocationStep() {
    if (!form.name.trim()) {
      setMessage("先写下物品名称，再选择存放位置。");
      return;
    }
    setMessage("");
    setStep(2);
    resetFlowViewport();
  }

  async function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    const available = MAX_ITEM_IMAGES - form.imageUrls.length;
    if (available <= 0) {
      setMessage(`最多添加 ${MAX_ITEM_IMAGES} 张图片。`);
      input.value = "";
      return;
    }
    const acceptedFiles = files.slice(0, available);
    setProcessingImages(true);
    setMessage(files.length > available ? `已选择前 ${available} 张图片，最多可添加 ${MAX_ITEM_IMAGES} 张。` : "正在整理图片…");
    try {
      const imageUrls = await Promise.all(acceptedFiles.map(optimizeImageFile));
      setForm((current) => ({
        ...current,
        imageUrls: normalizeItemImageUrls([...current.imageUrls, ...imageUrls]),
      }));
      setSuggestion(undefined);
      setIsSuggestionApplied(false);
      setMessage(`已选好 ${form.imageUrls.length + imageUrls.length} 张图片；需要时再点击 AI 识别。`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "图片处理失败，请重试。");
    } finally {
      setProcessingImages(false);
      input.value = "";
    }
  }

  async function handleAiRecognition() {
    if (!form.imageUrls.length || recognizing) return;
    if (!aiEnabled) {
      setMessage("AI 识别尚未配置；图片会正常保留，可在设置中开启后再识别。");
      return;
    }
    setRecognizing(true);
    setMessage("AI 正在综合分析已选图片，结果不会自动保存。");
    setSuggestion(undefined);
    setIsSuggestionApplied(false);
    try {
      const result = await recognizeItemImage(form.imageUrls, categories);
      if (!Object.values(result).some((value) => value !== undefined)) {
        setMessage("没有识别到可靠信息，请换一组清晰图片或手动填写。");
      } else {
        setSuggestion(result);
        setMessage("识别完成，请确认后应用到物品草稿。");
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "AI 识别失败，已选图片仍会保留。");
    } finally {
      setRecognizing(false);
    }
  }

  function removeImage(index: number) {
    setForm((current) => ({
      ...current,
      imageUrls: current.imageUrls.filter((_, imageIndex) => imageIndex !== index),
    }));
    setSuggestion(undefined);
    setIsSuggestionApplied(false);
    setMessage("");
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
    setMessage("识别结果已应用到草稿，你仍可继续修改。");
    if (suggestion.name) setStep(2);
    setAiOpen(false);
    resetFlowViewport();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy || submitting) return;
    if (!form.name.trim()) {
      setAiOpen(false);
      setStep(1);
      setMessage("请先填写物品名称。");
      return;
    }
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
    <form className="form-stack quick-create quick-create--staged" onSubmit={handleSubmit}>
      {aiOpen ? (
        <section className="new-item-ai-panel" aria-label="照片与 AI 识别">
          <header className="new-item-ai-panel__header">
            <button type="button" onClick={() => { setAiOpen(false); resetFlowViewport(); }} aria-label="返回名称与位置">←</button>
            <span className="new-item-ai-icon"><AiSparkIcon /></span>
            <div><small>可选步骤</small><h2>照片与 AI 识别</h2><p>先选图片，确认后再主动识别。</p></div>
          </header>

          <div className="new-item-image-sources">
            <label className={busy || form.imageUrls.length >= MAX_ITEM_IMAGES ? "is-disabled" : ""}>
              <span className="new-item-source-icon"><CameraIcon /></span>
              <strong>拍照</strong>
              <small>拍下物品细节</small>
              <input className="visually-hidden" type="file" accept="image/*" capture="environment" multiple disabled={busy || form.imageUrls.length >= MAX_ITEM_IMAGES} onChange={handleImageSelection} />
            </label>
            <label className={busy || form.imageUrls.length >= MAX_ITEM_IMAGES ? "is-disabled" : ""}>
              <span className="new-item-source-icon"><AlbumIcon /></span>
              <strong>从相册选择</strong>
              <small>一次可选多张</small>
              <input className="visually-hidden" type="file" accept="image/*" multiple disabled={busy || form.imageUrls.length >= MAX_ITEM_IMAGES} onChange={handleImageSelection} />
            </label>
          </div>

          <section className="new-item-image-selection" aria-label="已选物品图片">
            <div className="new-item-image-selection__heading"><strong>已选图片</strong><small>{form.imageUrls.length}/{MAX_ITEM_IMAGES}</small></div>
            {form.imageUrls.length ? (
              <div className="image-upload__grid">
                {form.imageUrls.map((imageUrl, index) => (
                  <div className="image-upload__item" key={`${imageUrl}-${index}`}>
                    <img src={imageUrl} alt={`物品图片预览 ${index + 1}`} />
                    <button type="button" aria-label={`删除第 ${index + 1} 张图片`} onClick={() => removeImage(index)}>×</button>
                  </div>
                ))}
              </div>
            ) : <p>还没有图片。可拍照或从相册一次选择多张。</p>}
          </section>

          <button className="ai-recognition-trigger" type="button" onClick={handleAiRecognition} disabled={!form.imageUrls.length || busy || !aiEnabled}>
            {recognizing ? <span className="ai-recognition-loading" aria-hidden="true"><i /><i /><i /></span> : <span className="new-item-ai-icon"><AiSparkIcon /></span>}
            <span><strong>{recognizing ? "AI 正在识别…" : "开始 AI 识别"}</strong><small>{aiEnabled ? `综合分析已选的 ${form.imageUrls.length} 张图片` : "请先在设置中配置 AI 服务"}</small></span>
          </button>

          {suggestion ? (
            <div className="ai-suggestion new-item-ai-suggestion">
              <div className="ai-suggestion__fields">
                {suggestion.name ? <Suggestion label="名称" value={suggestion.name} /> : null}
                {suggestion.brand ? <Suggestion label="品牌" value={suggestion.brand} /> : null}
                {suggestion.model ? <Suggestion label="型号" value={suggestion.model} /> : null}
                {suggestion.categoryId ? <Suggestion label="分类" value={categories.find((category) => category.id === suggestion.categoryId)?.name ?? suggestion.categoryId} /> : null}
                {suggestion.purchaseChannel ? <Suggestion label="渠道" value={suggestion.purchaseChannel} /> : null}
                {suggestion.totalPrice !== undefined ? <Suggestion label="参考价格" value={`¥${suggestion.totalPrice}`} /> : null}
                {suggestion.tags?.length ? <Suggestion label="标签" value={suggestion.tags.join("、")} /> : null}
              </div>
              <button className="secondary-button" type="button" onClick={applySuggestion} disabled={isSuggestionApplied}>{isSuggestionApplied ? "已应用到草稿" : "应用识别结果"}</button>
            </div>
          ) : null}
          {message ? <p className="form-message" role="status">{message}</p> : null}
          <button className="text-button new-item-ai-back" type="button" onClick={() => { setAiOpen(false); resetFlowViewport(); }}>返回名称与位置</button>
        </section>
      ) : (
        <>
          <div className="new-item-flow-header">
            <div className="new-item-progress" aria-label="添加物品进度">
              <button className={step === 1 ? "is-active" : "is-complete"} type="button" onClick={() => setStep(1)}><span>1</span><small>物品</small></button>
              <i aria-hidden="true" />
              <button className={step === 2 ? "is-active" : ""} type="button" disabled={!form.name.trim()} onClick={goToLocationStep}><span>2</span><small>位置</small></button>
            </div>
            <button className="ai-entry-button" type="button" onClick={() => { setMessage(""); setAiOpen(true); resetFlowViewport(); }}>
              <span className="new-item-ai-icon"><AiSparkIcon /></span>
              <small>{form.imageUrls.length ? `${form.imageUrls.length} 张` : "AI"}</small>
            </button>
          </div>

          {step === 1 ? (
            <section className="form-section new-item-stage new-item-stage--name">
              <div className="form-section__title"><div><small>第一步</small><h2>这是什么物品？</h2><span>先记名称，其他资料以后再补。</span></div></div>
              <label className="field new-item-name-field">
                <span>物品名称</span>
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="例如 AirPods Pro" required />
              </label>
              <div className="new-item-basic-consumable">
                <label>
                  <input type="checkbox" checked={form.mode === "consumable"} onChange={(event) => setForm((current) => ({ ...current, mode: event.target.checked ? "consumable" : "regular" }))} />
                  <span>按消耗品管理</span>
                </label>
                <button type="button" aria-label="什么是消耗品管理" aria-expanded={showModeHelp} onClick={() => setShowModeHelp((value) => !value)}>?</button>
                {showModeHelp ? <p>适合食品、清洁用品等会逐渐用完的物品，可记录数量、补货和到期提醒。</p> : null}
              </div>
              <button className="primary-button new-item-next" type="button" onClick={goToLocationStep} disabled={!form.name.trim()}>下一步 · 选择位置</button>
            </section>
          ) : (
            <section className="form-section new-item-stage new-item-stage--location">
              <div className="form-section__title"><div><small>第二步</small><h2>放在哪里？</h2><span>选择常用位置，也可以暂时加入待归位。</span></div></div>
              <div className="new-item-location-options" aria-label="常用存放位置">
                <button className={!form.locationId ? "is-active" : ""} type="button" onClick={() => selectLocation("")}><span aria-hidden="true">📍</span><strong>待归位</strong></button>
                {locationOptions.map((location) => (
                  <button className={form.locationId === location.id ? "is-active" : ""} key={location.id} type="button" onClick={() => selectLocation(location.id)}>
                    <span aria-hidden="true">{getLocationSymbol(location.id, location.name)}</span>
                    <strong>{location.name}</strong>
                  </button>
                ))}
              </div>
              <label className="new-item-more-location"><span>更多位置</span><select value={form.locationId ?? ""} onChange={(event) => selectLocation(event.target.value)} aria-label="全部存放位置"><option value="">暂不设置，加入待归位</option>{locationGroups.map(({ area, containers }) => <optgroup key={area.id} label={area.name}><option value={area.id}>{area.name}</option>{containers.map((location) => <option key={location.id} value={location.id}>{getLocationPath(locations, location.id)}</option>)}</optgroup>)}</select></label>
              <button className="text-button" type="button" onClick={() => setStep(1)}>← 修改物品名称</button>
            </section>
          )}

          {message ? <p className="form-message" role="status">{message}</p> : null}
          {step === 2 ? <button className="primary-button new-item-save" type="submit" disabled={busy || submitting}>{submitting ? "正在保存…" : "保存物品"}</button> : null}
          {step === 2 ? <small className="quick-create__skip">保存后可继续完善分类、价格和提醒。</small> : null}
        </>
      )}
    </form>
  );
}

function Suggestion({ label, value }: { label: string; value: string }) {
  return <span><b>{label}</b>{value}</span>;
}

function AiSparkIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3.5c.6 4.1 2.4 5.9 6.5 6.5-4.1.6-5.9 2.4-6.5 6.5-.6-4.1-2.4-5.9-6.5-6.5 4.1-.6 5.9-2.4 6.5-6.5Z" /><path d="M18.5 15.5c.25 1.7 1.05 2.5 2.75 2.75-1.7.25-2.5 1.05-2.75 2.75-.25-1.7-1.05-2.5-2.75-2.75 1.7-.25 2.5-1.05 2.75-2.75Z" /></svg>;
}

function CameraIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 8.5h3l1.5-2h7l1.5 2h3v10H4Z" /><circle cx="12" cy="13.5" r="3.25" /></svg>;
}

function AlbumIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="9" cy="9" r="1.5" /><path d="m6.5 17 4-4 2.5 2.5 2-2 2.5 3.5" /></svg>;
}
