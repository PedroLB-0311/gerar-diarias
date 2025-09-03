import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: "Latitude e longitude são obrigatórios" });
  }

  try {
    const response = await axios.post(
      "https://api.openrouteservice.org/v2/directions/driving-car",
      {
        coordinates: [
          [-49.1806, -28.3247], // origem fixa: São Ludgero
          [longitude, latitude], // destino recebido do frontend
        ],
      },
      {
        headers: {
          Authorization: process.env.ORS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const distanciaMetros = response.data.routes[0].summary.distance;
    res.status(200).json({ km: distanciaMetros / 1000 });
  } catch (error) {
    console.error("Erro ORS:", error.response?.data || error.message);
    res.status(500).json({ error: "Erro ao calcular distância" });
  }
}
