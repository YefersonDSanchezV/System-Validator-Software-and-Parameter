import { useCallback } from "react";
export function useFileToBase64() {
  return useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }, []);
}
export function filesToBase64(files: FileList): Promise<string[]> {
  return Promise.all(Array.from(files).map(f => new Promise<string>((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(f);
  })));
}
