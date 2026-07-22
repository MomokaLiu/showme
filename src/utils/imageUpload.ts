const MAX_IMAGE_FILE_BYTES = 15 * 1024 * 1024;
const MAX_STORED_DATA_URL_LENGTH = 350_000;

const COMPRESSION_VARIANTS = [
  { maxDimension: 1280, quality: 0.82 },
  { maxDimension: 1024, quality: 0.72 },
  { maxDimension: 800, quality: 0.65 },
  { maxDimension: 640, quality: 0.58 },
];

export function getImageValidationError(file: Pick<File, "size" | "type">): string | undefined {
  if (file.type && !file.type.startsWith("image/")) return "请选择图片文件。";
  if (file.size > MAX_IMAGE_FILE_BYTES) return "图片不能超过 15 MB。";
  return undefined;
}

export function getScaledImageDimensions(width: number, height: number, maxDimension: number) {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function optimizeImageFile(file: File): Promise<string> {
  const validationError = getImageValidationError(file);
  if (validationError) throw new Error(validationError);

  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);

  for (const variant of COMPRESSION_VARIANTS) {
    const dataUrl = renderCompressedImage(image, variant.maxDimension, variant.quality);
    if (dataUrl.length <= MAX_STORED_DATA_URL_LENGTH) return dataUrl;
  }

  throw new Error("图片压缩后仍然过大，请选择内容更简单或尺寸更小的图片。");
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("无法读取图片，请重新选择。"));
    };
    reader.onerror = () => reject(new Error("无法读取图片，请重新选择。"));
    reader.readAsDataURL(file);
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("无法解析图片，请选择 JPG、PNG 或 WebP 图片。"));
    image.src = source;
  });
}

function renderCompressedImage(image: HTMLImageElement, maxDimension: number, quality: number): string {
  const dimensions = getScaledImageDimensions(image.naturalWidth, image.naturalHeight, maxDimension);
  if (!dimensions.width || !dimensions.height) throw new Error("图片尺寸无效，请重新选择。");

  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前设备无法处理图片，请更换图片后重试。");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}
