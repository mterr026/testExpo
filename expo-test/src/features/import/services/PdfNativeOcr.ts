import { NativeModules, Platform } from "react-native";

export type PdfNativeOcrResult = {
  pageCount: number;
  recognizedPageCount: number;
  text: string;
};

type BudgetFlowOcrModule = {
  recognizePdfText: (fileUri: string) => Promise<PdfNativeOcrResult>;
};

export async function recognizePdfTextWithNativeOcr(
  fileUri: string
): Promise<PdfNativeOcrResult> {
  if (Platform.OS !== "ios") {
    throw new Error("PDF OCR is currently available on iPhone only.");
  }

  const module = NativeModules.BudgetFlowOcr as BudgetFlowOcrModule | undefined;

  if (!module?.recognizePdfText) {
    throw new Error(
      "PDF OCR needs a rebuilt iOS development app because it uses native on-device OCR."
    );
  }

  return module.recognizePdfText(fileUri);
}
