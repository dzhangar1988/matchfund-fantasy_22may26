import { base44 } from "@/api/base44Client";

export async function updatePrediction(data) {
  return base44.functions.invoke("updatePrediction", data);
}