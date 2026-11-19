import type { Request, Response } from "express";
import { supplierAData, supplierBData } from "./data";

function cityOffers(data: typeof supplierAData, city: unknown) {
  if (typeof city !== "string") return data;
  const normalized = city.trim().toLocaleLowerCase();
  return data.filter((offer) => offer.city === normalized);
}

export function supplierAHandler(req: Request, res: Response) {
  if (process.env.SUPPLIER_A_FAIL === "true") return res.status(503).json({ error: "Supplier A temporarily unavailable" });
  return res.json(cityOffers(supplierAData, req.query.city));
}

export function supplierBHandler(req: Request, res: Response) {
  if (process.env.SUPPLIER_B_FAIL === "true") return res.status(503).json({ error: "Supplier B temporarily unavailable" });
  return res.json(cityOffers(supplierBData, req.query.city));
}
