export interface RecognitionResult {
  name?: string;
  brand?: string;
  categoryId?: string;
  quantity?: number;
  unit?: string;
  totalPrice?: number;
  expireDate?: string;
}

export async function recognizeBarcode(_barcode: string): Promise<RecognitionResult> {
  return {};
}
