// /utils/ors.js
export const ORIGEM = { nome: "São Ludgero", uf: "SC", latitude: -28.3247, longitude: -49.1806 };

// Calcula distância via API interna (proxy)
export async function calcularDistanciaORS(destino) {
  if (!destino.latitude || !destino.longitude) return 0;

  try {
    const res = await fetch("/api/ors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: destino.latitude,
        longitude: destino.longitude,
      }),
    });

    const data = await res.json();
    return data.km || 0;
  } catch (err) {
    console.error("Erro ao calcular distância:", err);
    return 0;
  }
}
