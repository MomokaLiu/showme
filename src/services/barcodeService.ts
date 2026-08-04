export interface RecognitionResult {
  name?: string;
  brand?: string;
  categoryId?: string;
  model?: string;
  purchaseChannel?: string;
  tags?: string[];
  quantity?: number;
  unit?: string;
  totalPrice?: number;
  expireDate?: string;
}

export async function recognizeBarcode(_barcode: string): Promise<RecognitionResult> {
  return {};
}
